# sdk/python/docfill/client.py
"""
DocFill — Python client for AI-powered DOCX template filling.

Supports two modes:
  - LOCAL mode:  Processes documents locally using OpenAI API + python-docx.
  - REMOTE mode: Sends documents to a deployed DocFill API server.
"""

import os
import json
import re
import zipfile
import io
from dataclasses import dataclass, field
from typing import Optional, Callable, Literal
from xml.etree import ElementTree as ET

from openai import OpenAI


# ===========================
# PUBLIC TYPES
# ===========================

@dataclass
class SlotChange:
    """A single slot change made during template filling."""
    id: str
    original_text: str
    filled_value: str
    source: Literal["user_prompt", "rag", "generated", "skipped"]
    confidence: float
    reasoning: Optional[str] = None


@dataclass
class FillResult:
    """Result of a template filling operation."""
    buffer: bytes
    document_summary: str
    changes: list[SlotChange]
    metadata: dict

    def save(self, output_path: str) -> str:
        """Save the filled document to a file."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(self.buffer)
        return os.path.abspath(output_path)


# ===========================
# INTERNAL TYPES
# ===========================

@dataclass
class _AnalyzedSlot:
    id: str
    original_text: str
    context: str
    suggested_type: str
    suggested_label: str
    suggested_query: Optional[str] = None


@dataclass
class _TextNode:
    element: ET.Element
    text_attr: str  # "text" or "tail"
    text: str
    index: int


# ===========================
# MAIN CLASS
# ===========================

class DocFill:
    """
    AI-powered DOCX template filler.

    Usage (local mode):
        wf = DocFill(api_key="sk-...")
        result = wf.fill("template.docx", "Fill client name as Acme Corp")
        result.save("filled.docx")

    Usage (remote mode):
        wf = DocFill(mode="remote", api_base="http://localhost:3000")
        result = wf.fill("template.docx", "Fill client name as Acme Corp")
        result.save("filled.docx")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-5.1",
        mode: Literal["local", "remote"] = "local",
        api_base: Optional[str] = None,
        on_progress: Optional[Callable[[dict], None]] = None,
        max_retries: int = 3,
        max_output_tokens: Optional[int] = None,
    ):
        self.mode = mode
        self.model = model
        self.on_progress = on_progress
        self.api_base = api_base
        self.max_retries = max_retries
        self.max_output_tokens = max_output_tokens

        if mode == "local":
            self.client = OpenAI(
                api_key=api_key or os.environ.get("OPENAI_API_KEY"),
                max_retries=max_retries
            )
        elif mode == "remote":
            if not api_base:
                raise ValueError("api_base is required for remote mode")
            self.client = None

    def fill(
        self,
        file: "str | bytes",
        prompt: str,
        on_progress: Optional[Callable[[dict], None]] = None,
        max_retries: Optional[int] = None,
        max_output_tokens: Optional[int] = None,
    ) -> FillResult:
        """
        Fill a DOCX template using AI.

        Args:
            file: Path to a .docx file, or raw bytes.
            prompt: Natural-language instructions for filling the template.
            on_progress: Optional callback for progress events.
            max_retries: Optional override for max retries.
            max_output_tokens: Optional override for max output tokens.

        Returns:
            FillResult with the filled document buffer and metadata.
        """
        if self.mode == "remote":
            return self._fill_remote(file, prompt, on_progress, max_retries, max_output_tokens)
        else:
            return self._fill_local(file, prompt, on_progress, max_retries, max_output_tokens)

    # ===========================
    # LOCAL MODE
    # ===========================

    def _fill_local(
        self,
        file: "str | bytes",
        prompt: str,
        on_progress: Optional[Callable[[dict], None]] = None,
        max_retries: Optional[int] = None,
        max_output_tokens: Optional[int] = None,
    ) -> FillResult:
        emit = on_progress or self.on_progress or (lambda e: None)
        import time
        start_time = time.time()

        n_retries = max_retries if max_retries is not None else self.max_retries
        n_tokens_analyzer = max_output_tokens if max_output_tokens is not None else (self.max_output_tokens or 2000)
        n_tokens_filler = max_output_tokens if max_output_tokens is not None else (self.max_output_tokens or 4000)

        # Step 1: Read file
        # ... rest of steps updated below ...
        if isinstance(file, str):
            with open(file, "rb") as f:
                file_bytes = f.read()
        else:
            file_bytes = file

        # Step 2: Extract text from DOCX
        emit({"type": "phase", "message": "Extracting document content..."})
        plain_text, namespaces = self._extract_docx_text(file_bytes)

        # Step 3: Analyze slots with AI
        emit({"type": "phase", "message": "Analyzing document structure and detecting placeholders..."})
        analysis = self._analyze_slots(plain_text, max_retries=n_retries, max_tokens=n_tokens_analyzer)
        document_summary = analysis.get("documentSummary", "Document template")
        slots = [
            _AnalyzedSlot(
                id=s["id"],
                original_text=s["originalText"],
                context=s["context"],
                suggested_type=s["suggestedType"],
                suggested_label=s["suggestedLabel"],
                suggested_query=s.get("suggestedQuery"),
            )
            for s in analysis.get("slots", [])
        ]

        emit({"type": "thought", "message": f"Detected {len(slots)} placeholders"})

        # Step 4: Fill slots with AI
        emit({"type": "phase", "message": "Analyzing your instructions and filling fields..."})
        filled = self._fill_slots(slots, prompt, document_summary, max_retries=n_retries, max_tokens=n_tokens_filler)

        changes = []
        for fs_item in filled:
            changes.append(
                SlotChange(
                    id=fs_item["id"],
                    original_text=fs_item["originalText"],
                    filled_value=fs_item["filledValue"],
                    source=fs_item.get("source", "generated"),
                    confidence=fs_item.get("confidence", 0.5),
                    reasoning=fs_item.get("reasoning"),
                )
            )
            emit({
                "type": "slot_filled",
                "message": f"Filled: {fs_item.get('id')}",
                "data": {"slot": fs_item},
            })

        # Step 5: Apply edits to DOCX
        emit({"type": "phase", "message": "Applying edits to document..."})
        replacements = {
            c.original_text: c.filled_value
            for c in changes
            if c.source != "skipped" and c.original_text != c.filled_value
        }
        filled_bytes = self._apply_replacements(file_bytes, replacements)

        elapsed = int((time.time() - start_time) * 1000)

        filled_count = sum(1 for c in changes if c.source != "skipped")
        skipped_count = sum(1 for c in changes if c.source == "skipped")

        emit({"type": "phase", "message": "Complete!"})

        return FillResult(
            buffer=filled_bytes,
            document_summary=document_summary,
            changes=changes,
            metadata={
                "totalSlots": len(changes),
                "filledSlots": filled_count,
                "skippedSlots": skipped_count,
                "ragQueries": 0,
                "processingTimeMs": elapsed,
            },
        )

    def _extract_docx_text(self, file_bytes: bytes) -> tuple[str, dict]:
        """Extract plain text from DOCX by parsing word/document.xml."""
        zf = zipfile.ZipFile(io.BytesIO(file_bytes))
        xml_content = zf.read("word/document.xml")
        root = ET.fromstring(xml_content)

        namespaces = {
            "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        }

        texts = []
        for elem in root.iter():
            tag = elem.tag
            if tag.endswith("}t") or tag == "w:t":
                if elem.text:
                    texts.append(elem.text)

        return " ".join(texts), namespaces

    def _analyze_slots(self, plain_text: str, max_retries: int = 3, max_tokens: int = 2000) -> dict:
        """Use OpenAI to analyze document and detect fillable slots."""
        system_prompt = """You are a document analysis expert. Your job is to identify ALL fillable placeholders in a document template.

TASK:
1. Analyze the document and identify its type/purpose
2. Find ALL placeholders that need to be filled in
3. For each placeholder, determine what type of value it expects

COMMON PLACEHOLDER PATTERNS TO LOOK FOR:
- Explicit markers: "[…]", "[...]", "[INSERT X]", "{{x}}", "_____", "________"
- Empty spaces with labels: "Name: ________", "Date: __/__/____"
- Bracketed instructions: "[Enter company name]"
- Vietnamese placeholders: "[…]" is very common

IMPORTANT:
- Include ALL placeholders, even repeated ones
- Extract the EXACT original text so it can be found and replaced
- For context, provide the FULL SENTENCE containing the placeholder

Return valid JSON with this structure:
{
  "documentSummary": "Brief description of the document",
  "slots": [
    {
      "id": "slot_1",
      "originalText": "exact placeholder text",
      "context": "full sentence containing the placeholder",
      "suggestedType": "name|date|number|text|address|custom",
      "suggestedLabel": "human-readable label",
      "suggestedQuery": "optional search query"
    }
  ]
}"""

        response = self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": plain_text},
            ],
        )

        return json.loads(response.choices[0].message.content)

    def _fill_slots(
        self,
        slots: list[_AnalyzedSlot],
        user_prompt: str,
        document_summary: str,
        max_retries: int = 3,
        max_tokens: int = 4000
    ) -> list[dict]:
        """Use OpenAI to fill detected slots based on user instructions."""
        slots_description = "\n".join(
            f'- {s.id}: "{s.suggested_label}" (type: {s.suggested_type}, '
            f'placeholder: "{s.original_text}", context: "{s.context[:100]}")'
            for s in slots
        )

        system_prompt = f"""You are a document filling assistant.

Document: {document_summary}

Slots to fill:
{slots_description}

Fill all slots with appropriate values based on the user's instructions.
For slots without explicit instructions, generate reasonable values or mark as skipped.

Return valid JSON with this structure:
{{
  "filledSlots": [
    {{
      "id": "slot_1",
      "originalText": "exact original placeholder",
      "filledValue": "the value to fill in",
      "source": "user_prompt|generated|skipped",
      "confidence": 0.95,
      "reasoning": "brief explanation"
    }}
  ]
}}"""

        response = self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User's instructions: {user_prompt}"},
            ],
        )

        result = json.loads(response.choices[0].message.content)
        return result.get("filledSlots", [])

    def _apply_replacements(
        self,
        file_bytes: bytes,
        replacements: dict[str, str],
    ) -> bytes:
        """Apply text replacements to the DOCX at the XML level, preserving formatting."""
        zf_in = zipfile.ZipFile(io.BytesIO(file_bytes))
        buf_out = io.BytesIO()

        with zipfile.ZipFile(buf_out, "w", zipfile.ZIP_DEFLATED) as zf_out:
            for item in zf_in.infolist():
                data = zf_in.read(item.filename)

                if item.filename == "word/document.xml":
                    xml_str = data.decode("utf-8")
                    for find, replace in replacements.items():
                        xml_str = xml_str.replace(find, replace)
                    data = xml_str.encode("utf-8")

                zf_out.writestr(item, data)

        return buf_out.getvalue()

    # ===========================
    # REMOTE MODE
    # ===========================

    def _fill_remote(
        self,
        file: "str | bytes",
        prompt: str,
        on_progress: Optional[Callable[[dict], None]] = None,
        max_retries: Optional[int] = None,
        max_output_tokens: Optional[int] = None,
    ) -> FillResult:
        """Fill template via a deployed DocFill API."""
        import base64
        try:
            import requests
        except ImportError:
            raise ImportError("Remote mode requires the 'requests' package: pip install requests")

        emit = on_progress or self.on_progress or (lambda e: None)

        if isinstance(file, str):
            with open(file, "rb") as f:
                file_bytes = f.read()
            filename = os.path.basename(file)
        else:
            file_bytes = file
            filename = "template.docx"

        emit({"type": "phase", "message": "Sending document to server..."})

        url = f"{self.api_base.rstrip('/')}/api/template-filler"
        files_payload = {"file": (filename, file_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        data_payload = {"prompt": prompt}
        if max_retries is not None: data_payload["maxRetries"] = str(max_retries)
        if max_output_tokens is not None: data_payload["maxOutputTokens"] = str(max_output_tokens)

        response = requests.post(url, files=files_payload, data=data_payload, stream=True)
        response.raise_for_status()

        changes = []
        result_data = None

        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue

            try:
                payload = json.loads(line[6:])
                event_type = payload.get("type", "")

                emit({"type": event_type, "message": payload.get("message", "")})

                if event_type == "slot_filled" and payload.get("data", {}).get("slot"):
                    slot = payload["data"]["slot"]
                    changes.append(
                        SlotChange(
                            id=slot["id"],
                            original_text=slot.get("originalText", ""),
                            filled_value=slot.get("filledValue", ""),
                            source=slot.get("source", "generated"),
                            confidence=slot.get("confidence", 0.5),
                            reasoning=slot.get("reasoning"),
                        )
                    )

                if event_type == "complete" and payload.get("success"):
                    result_data = payload

            except json.JSONDecodeError:
                continue

        if not result_data:
            raise RuntimeError("Server did not return a complete result")

        download = result_data.get("download", {})
        filled_bytes = base64.b64decode(download.get("base64", ""))

        return FillResult(
            buffer=filled_bytes,
            document_summary=result_data.get("documentSummary", ""),
            changes=changes,
            metadata=result_data.get("metadata", {}),
        )
