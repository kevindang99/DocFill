# sdk/python/examples/basic_usage.py
"""Example: Fill a DOCX template using the DocFill Python SDK."""

import os
from docfill import DocFill

def main():
    # 1. Initialize the SDK
    wf = DocFill(
        api_key=os.environ.get("OPENAI_API_KEY"),  # or hardcode: "sk-..."
        model="gpt-4o",  # optional: override model
    )

    # 2. Fill a template
    result = wf.fill(
        file="../../test-template.docx",
        prompt="""
            Fill this contract with the following information:
            - Client: Acme Corporation
            - Date: February 17, 2026
            - Address: 123 Main St, New York, NY
        """,
        on_progress=lambda event: print(f"  [{event['type']}] {event['message']}"),
    )

    # 3. Save the result
    result.save("filled-contract.docx")

    # 4. Print summary
    print(f"\n--- Result ---")
    print(f"Document: {result.document_summary}")
    print(f"Slots: {result.metadata['filledSlots']}/{result.metadata['totalSlots']} filled")
    print(f"Time: {result.metadata['processingTimeMs']}ms")
    print(f"\nChanges:")
    for change in result.changes:
        print(f'  {change.id}: "{change.original_text}" → "{change.filled_value}" ({change.source}, {round(change.confidence * 100)}%)')


if __name__ == "__main__":
    main()
