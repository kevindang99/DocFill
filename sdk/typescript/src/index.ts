// sdk/typescript/src/index.ts
// DocFill — TypeScript SDK
// Programmatic API for AI-powered DOCX template filling.

import { templateFillerWorkflow } from "../../../lib/agents/workflows/template-filler";
import type { TemplateFillerOutput, ProgressCallback, WorkflowEvent } from "../../../lib/agents/types/state";
import * as fs from "fs";
import * as path from "path";

// ===========================
// PUBLIC TYPES
// ===========================

export interface DocFillOptions {
    /** OpenAI API key. Falls back to OPENAI_API_KEY env var. */
    apiKey?: string;
    /** Model to use (e.g. "gpt-5.1"). Defaults to "gpt-5.1". */
    model?: string;
    /** Progress callback for streaming events. */
    onProgress?: ProgressCallback;
    /** Max retries for API calls. Defaults to 3. */
    maxRetries?: number;
    /** Max output tokens for AI response. Defaults to 4000. */
    maxOutputTokens?: number;
}

export interface FillInput {
    /** Path to a .docx file, or a Buffer containing the file bytes. */
    file: string | Buffer;
    /** Natural-language instructions describing how to fill the template. */
    prompt: string;
    /** Optional: progress callback (overrides the one set in the constructor). */
    onProgress?: ProgressCallback;
    /** Optional: model to use (overrides the one set in the constructor). */
    model?: string;
    /** Optional: max retries (overrides the one set in the constructor). */
    maxRetries?: number;
    /** Optional: max output tokens (overrides the one set in the constructor). */
    maxOutputTokens?: number;
}

export interface FillResult {
    /** Buffer containing the filled .docx file. */
    buffer: Buffer;
    /** Brief AI-generated description of the document. */
    documentSummary: string;
    /** Details of every slot that was filled or skipped. */
    changes: Array<{
        id: string;
        originalText: string;
        filledValue: string;
        source: "user_prompt" | "rag" | "generated" | "skipped";
        confidence: number;
        reasoning?: string;
    }>;
    /** Processing metadata. */
    metadata: {
        totalSlots: number;
        filledSlots: number;
        skippedSlots: number;
        ragQueries: number;
        processingTimeMs: number;
    };
}

// ===========================
// SDK CLASS
// ===========================

/**
 * DocFill SDK
 *
 * @example
 * ```typescript
 * import { DocFill } from "docfill";
 *
 * const wf = new DocFill({ apiKey: "sk-..." });
 *
 * const result = await wf.fill({
 *   file: "contract-template.docx",
 *   prompt: "Fill client name as 'Acme Corp', set date to today",
 * });
 *
 * fs.writeFileSync("contract-filled.docx", result.buffer);
 * console.log(`Filled ${result.metadata.filledSlots} fields`);
 * ```
 */
export class DocFill {
    private options: DocFillOptions;

    constructor(options: DocFillOptions = {}) {
        this.options = options;

        // Set OpenAI API key if provided via options
        if (options.apiKey) {
            process.env.OPENAI_API_KEY = options.apiKey;
        }
    }

    /**
     * Fill a DOCX template using AI.
     *
     * @param input - The file (path or Buffer) and natural-language prompt.
     * @returns The filled document buffer, slot changes, and metadata.
     */
    async fill(input: FillInput): Promise<FillResult> {
        // Resolve file to Buffer
        let fileBuffer: Buffer;
        let fileName: string;

        if (typeof input.file === "string") {
            const filePath = path.resolve(input.file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            if (!filePath.endsWith(".docx")) {
                throw new Error("Only .docx files are supported");
            }
            fileBuffer = fs.readFileSync(filePath);
            fileName = path.basename(filePath);
        } else if (Buffer.isBuffer(input.file)) {
            fileBuffer = input.file;
            fileName = "template.docx";
        } else {
            throw new Error("file must be a file path (string) or a Buffer");
        }

        if (!input.prompt?.trim()) {
            throw new Error("prompt is required");
        }

        // Run the workflow
        const onProgress = input.onProgress || this.options.onProgress;
        const result: TemplateFillerOutput = await templateFillerWorkflow({
            fileBuffer,
            fileName,
            userPrompt: input.prompt,
            onProgress,
            model: input.model || this.options.model,
            maxRetries: input.maxRetries || this.options.maxRetries,
            maxOutputTokens: input.maxOutputTokens || this.options.maxOutputTokens,
        });

        return {
            buffer: result.filledDocxBuffer,
            documentSummary: result.documentSummary,
            changes: result.changes,
            metadata: result.metadata,
        };
    }

    /**
     * Fill a template and save the result directly to a file.
     *
     * @param input - The file (path or Buffer) and prompt.
     * @param outputPath - Where to save the filled document.
     * @returns The fill result (also saved to disk).
     */
    async fillAndSave(input: FillInput, outputPath: string): Promise<FillResult> {
        const result = await this.fill(input);
        const resolvedOutput = path.resolve(outputPath);
        fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
        fs.writeFileSync(resolvedOutput, result.buffer);
        return result;
    }
}

// ===========================
// CONVENIENCE FUNCTION
// ===========================

/**
 * One-shot convenience function — fill a template without constructing a class.
 *
 * @example
 * ```typescript
 * import { fillTemplate } from "docfill";
 *
 * const result = await fillTemplate("template.docx", "Fill all party names");
 * fs.writeFileSync("filled.docx", result.buffer);
 * ```
 */
export async function fillTemplate(
    file: string | Buffer,
    prompt: string,
    options?: DocFillOptions
): Promise<FillResult> {
    const wf = new DocFill(options);
    return wf.fill({ file, prompt });
}
