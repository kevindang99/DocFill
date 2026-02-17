# DocFill 📄

> **Fill DOCX templates using OpenAI — Preserve Format**

DocFill is a powerful and intelligent tool for filling Microsoft Word document templates (.docx) using OpenAI API while preserving the original formatting, structure, and layout completely.

## 🚀 Installation

### System Requirements
- Node.js 18+ / Python 3.10+
- OpenAI API key

### Install from npm (TypeScript)

```bash
npm install docfill
```

```typescript
import { DocFill } from "docfill";
import * as fs from "fs";

// Sample configuration
const wf = new DocFill({
    apiKey: "sk-your-openai-api-key-here",
    model: "gpt-5.1",                       
});

// Step-by-step processing
const result = await wf.fill({
    file: "contract-template.docx",        // Accepts file path (string) or Buffer
    prompt: "Fill client name as 'Acme Corp', date as today, address as '123 Main St'",
    onProgress: (event) => {
        if (event.type === "phase") console.log(`📋 ${event.message}`);
        if (event.type === "slot_filled") console.log(`✅ ${event.message}`);
    },
});

// Save the result
fs.writeFileSync("contract-filled.docx", result.buffer);
console.log(`Filled ${result.metadata.filledSlots} fields in ${result.metadata.processingTimeMs}ms`);
```

### Install from pip (Python)

```bash
pip install docfill
```

```python
from docfill import DocFill

# Sample configuration
wf = DocFill(
    api_key="sk-your-openai-api-key-here",
    model="gpt-5.1",                        
)

# Step-by-step processing
result = wf.fill(
    file="contract-template.docx",         # Accepts file path (string) or bytes
    prompt="Fill client name as 'Acme Corp', date as today, address as '123 Main St'",
    on_progress=lambda e: print(f"  [{e['type']}] {e['message']}"),
)

# Save the result
result.save("contract-filled.docx")
print(f"Filled {result.metadata['filledSlots']} fields")
```

### Install from source

```bash
# Clone repository
git clone https://github.com/quocthinh861/docfill.git
cd docfill

# Install dependencies
npm install
```

### Python SDK from source

```bash
cd sdk/python
pip install -e .
```

## 🔑 API Key Setup

After installation, you need to set up your OpenAI API key.

Create a `.env.local` file in the root directory:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🌐 Web App

DocFill also ships with a full **Web UI** built on Next.js:

```bash
npm run dev
```

Open `http://localhost:3000` — upload a `.docx`, describe what to fill, and download the result.

## 📁 Project Structure

```
docfill/
├── 📄 app/                        # Next.js web application
│   ├── api/template-filler/       # SSE streaming API endpoint
│   ├── components/                # React UI components
│   │   ├── UploadZone.tsx         # Drag & drop file upload
│   │   ├── GeneratingView.tsx     # Real-time progress view
│   │   └── ResultView.tsx         # Results with download
│   └── globals.css                # Design system (OKLCH themes)
├── 📦 lib/                        # Core engine
│   ├── agents/
│   │   ├── 🔧 core/
│   │   │   ├── slot-analyzer.ts   # AI slot detection
│   │   │   └── slot-filler.ts     # AI slot filling
│   │   ├── 🔨 workflows/
│   │   │   └── template-filler.ts # 5-phase orchestration
│   │   └── 🛠️ utils/
│   │       └── docx-xml.ts        # DOCX XML manipulation
│   └── hooks/
│       └── useTemplateFiller.ts   # React state management
├── 📦 sdk/                        # SDK packages
│   ├── typescript/
│   │   ├── src/index.ts           # TypeScript SDK entry
│   │   └── examples/              # Usage examples
│   └── python/
│       ├── docfill/              # Python SDK package
│       ├── examples/              # Usage examples
│       └── pyproject.toml         # Package config
├── ⚙️ .env.example                # Environment template
├── 📋 package.json                # Project metadata
├── 📝 CHANGELOG.md                # Release history
└── 📖 README.md                   # This documentation
```

## 📄 License

This project is distributed under the MIT License. See the `LICENSE` file for more information.

## 👨‍💻 Author

**Quoc Thinh**
- 🐙 GitHub: [@quocthinh861](https://github.com/quocthinh861)

## 🙏 Acknowledgments

- OpenAI API for powerful document understanding capabilities
- Vercel AI SDK for structured output integration
- JSZip & fast-xml-parser for DOCX XML processing
- Next.js community for the web framework

---

**DocFill** — Smart document filling with perfect formatting preservation! 📄✨
