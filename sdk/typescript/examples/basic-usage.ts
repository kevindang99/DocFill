// sdk/typescript/examples/basic-usage.ts
// Example: Fill a DOCX template using the SDK

import { DocFill } from "../src";
import * as fs from "fs";

async function main() {
    // 1. Initialize the SDK
    const wf = new DocFill({
        apiKey: process.env.OPENAI_API_KEY, // or hardcode: "sk-..."
        // model: "gpt-4o",                 // optional: override model
    });

    // 2. Fill a template
    const result = await wf.fill({
        file: "../../test-template.docx",
        prompt: `
            Fill this contract with the following information:
            - Client: Acme Corporation
            - Date: February 17, 2026
            - Address: 123 Main St, New York, NY
        `,
        onProgress: (event) => {
            // Optional: track progress
            if (event.type === "phase") {
                console.log(`📋 ${event.message}`);
            } else if (event.type === "slot_filled") {
                console.log(`✅ Filled: ${event.message}`);
            }
        },
    });

    // 3. Save the result
    fs.writeFileSync("filled-contract.docx", result.buffer);

    // 4. Print summary
    console.log("\n--- Result ---");
    console.log(`Document: ${result.documentSummary}`);
    console.log(`Slots: ${result.metadata.filledSlots}/${result.metadata.totalSlots} filled`);
    console.log(`Time: ${result.metadata.processingTimeMs}ms`);
    console.log("\nChanges:");
    for (const change of result.changes) {
        console.log(`  ${change.id}: "${change.originalText}" → "${change.filledValue}" (${change.source}, ${Math.round(change.confidence * 100)}%)`);
    }
}

main().catch(console.error);
