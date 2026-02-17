// lib/agents/workflows/template-filler.ts
// Main workflow that orchestrates template filling
// Ported from wrag/lib/agents/workflows/template-filler.ts

import { EventEmitter } from "events";

// Increase max listeners to prevent warnings when making concurrent API calls
// With large documents (many slots + RAG), we need a higher limit
EventEmitter.defaultMaxListeners = 100;

import { agentLog, agentError, createTimer } from "../utils/logger";
import {
    extractDocxContent,
    getPlainText,
    findAndReplaceSequential,
    rebuildDocx,
    type SlotReplacement,
} from "../utils/docx-xml";
import { slotAnalyzerAgent } from "../core/slot-analyzer";
import { slotFillerAgent } from "../core/slot-filler";
import type { TemplateFillerOutput, ProgressCallback } from "../types/state";

// ===========================
// TYPES
// ===========================

export interface TemplateFillerInput {
    fileBuffer: Buffer; // Raw DOCX file
    fileName: string; // Original file name (for logging/UI)
    userPrompt: string; // User instructions for filling
    onProgress?: ProgressCallback; // Optional callback for streaming progress
    model?: string; // Optional: specify model to use
    maxRetries?: number;
    maxOutputTokens?: number;
}

// ===========================
// MAIN WORKFLOW
// ===========================

/**
 * Template Filler Workflow
 *
 * Simple, reliable slot-based filling:
 * 1. Analyze document for placeholders
 * 2. Fill slots using AI
 * 3. Apply via direct string replacement (preserves all formatting)
 */
export async function templateFillerWorkflow(input: TemplateFillerInput): Promise<TemplateFillerOutput> {
    const workflowTimer = createTimer();
    const emit = input.onProgress || (() => { });

    agentLog("template-filler", "workflow-start", {
        promptLength: input.userPrompt.length,
        bufferSize: input.fileBuffer.length,
    });

    try {
        // ===========================
        // STEP 1: EXTRACT DOCX CONTENT
        // ===========================
        const docxContent = await extractDocxContent(input.fileBuffer);
        const plainText = getPlainText(docxContent);

        agentLog("template-filler", "step-1-extract", {
            textNodes: docxContent.textNodes.length,
            plainTextLength: plainText.length,
        });

        // ===========================
        // STEP 2: ANALYZE DOCUMENT FOR SLOTS
        // ===========================
        emit({ type: "phase", message: "Analyzing document structure and detecting placeholders..." });
        const analyzeTimer = createTimer();
        const analysis = await slotAnalyzerAgent({
            documentContent: plainText,
            onProgress: input.onProgress, // Pass through for detailed reasoning
            model: input.model,
            maxRetries: input.maxRetries,
            maxOutputTokens: input.maxOutputTokens,
        });
        emit({
            type: "slot_detected",
            message: `Found ${analysis.slots.length} fillable fields in "${analysis.documentSummary}"`,
            data: { count: analysis.slots.length, documentType: analysis.documentSummary },
        });

        agentLog(
            "template-filler",
            "step-2-analyze",
            {
                slotsFound: analysis.slots.length,
                documentType: analysis.documentSummary,
            },
            analyzeTimer.elapsed()
        );

        if (analysis.slots.length === 0) {
            agentLog("template-filler", "no-slots-found", {});
            return {
                filledDocxBuffer: input.fileBuffer,
                changes: [],
                documentSummary: analysis.documentSummary,
                metadata: {
                    totalSlots: 0,
                    filledSlots: 0,
                    skippedSlots: 0,
                    ragQueries: 0,
                    processingTimeMs: workflowTimer.elapsed(),
                },
            };
        }

        // ===========================
        // STEP 3: FILL SLOTS
        // ===========================
        emit({ type: "phase", message: "Analyzing your instructions and filling fields..." });
        const fillTimer = createTimer();
        const fillResult = await slotFillerAgent({
            slots: analysis.slots,
            userPrompt: input.userPrompt,
            documentSummary: analysis.documentSummary,
            onProgress: input.onProgress, // Pass through for detailed reasoning
            model: input.model,
            maxRetries: input.maxRetries,
            maxOutputTokens: input.maxOutputTokens,
        });
        const filledCount = fillResult.filledSlots.filter((s) => s.source !== "skipped").length;
        const skippedCount = fillResult.filledSlots.filter((s) => s.source === "skipped").length;
        emit({
            type: "slot_filling",
            message: `Filled ${filledCount} fields (${skippedCount} skipped)`,
            data: {
                filled: filledCount,
                skipped: skippedCount,
            },
        });

        agentLog(
            "template-filler",
            "step-3-fill",
            {
                filledCount: fillResult.filledSlots.filter((s) => s.source !== "skipped").length,
                ragQueries: fillResult.ragQueriesCount,
            },
            fillTimer.elapsed()
        );

        // ===========================
        // STEP 4: APPLY EDITS
        // ===========================
        const applyTimer = createTimer();

        const filledMap = new Map(fillResult.filledSlots.map((s) => [s.id, s]));
        const orderedReplacements: SlotReplacement[] = analysis.slots.map((analyzedSlot) => {
            const filled = filledMap.get(analyzedSlot.id);
            return {
                originalText: filled?.originalText ?? analyzedSlot.originalText,
                filledValue: filled?.filledValue ?? analyzedSlot.originalText,
            };
        });

        const replaceCount = findAndReplaceSequential(docxContent, orderedReplacements);
        agentLog("template-filler", "step-4-apply", { replaceCount }, applyTimer.elapsed());

        // ===========================
        // STEP 5: REBUILD DOCX
        // ===========================
        emit({ type: "phase", message: "Building final DOCX document..." });
        const rebuildTimer = createTimer();
        const filledDocxBuffer = await rebuildDocx(docxContent);

        agentLog(
            "template-filler",
            "step-5-rebuild",
            {
                originalSize: input.fileBuffer.length,
                newSize: filledDocxBuffer.length,
            },
            rebuildTimer.elapsed()
        );

        // ===========================
        // RETURN RESULT
        // ===========================
        // filledCount and skippedCount already declared above

        agentLog(
            "template-filler",
            "workflow-complete",
            {
                totalSlots: analysis.slots.length,
                filledSlots: filledCount,
                skippedSlots: skippedCount,
            },
            workflowTimer.elapsed()
        );

        return {
            filledDocxBuffer,
            changes: fillResult.filledSlots,
            documentSummary: analysis.documentSummary,
            metadata: {
                totalSlots: analysis.slots.length,
                filledSlots: filledCount,
                skippedSlots: skippedCount,
                ragQueries: fillResult.ragQueriesCount,
                processingTimeMs: workflowTimer.elapsed(),
            },
        };
    } catch (error) {
        agentError("template-filler", "workflow-failed", error);
        throw error;
    }
}
