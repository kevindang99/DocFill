// lib/agents/core/slot-analyzer.ts
// AI agent that analyzes a document and detects fillable sections/placeholders

import { generateText, Output, APICallError } from "ai";
import { z } from "zod";
import { createModel, MODEL_CONFIG } from "../config/models";
import { agentLog, agentError, createTimer } from "../utils/logger";
import { SLOT_ANALYZER_PROMPT } from "../prompts/templates";
import type { SlotAnalyzerOutput, AnalyzedSlot, ProgressCallback } from "../types/state";

interface SlotAnalyzerInput {
    documentContent: string;
    onProgress?: ProgressCallback;
    model?: string;
    maxRetries?: number;
    maxOutputTokens?: number;
}

// ===========================
// MAIN FUNCTION
// ===========================

/**
 * Analyze a document and detect all fillable sections
 *
 * @param input - Document content to analyze
 * @returns List of detected slots with metadata
 *
 * @example
 * const result = await slotAnalyzerAgent({
 *   documentContent: "CÔNG TY [...]\\nMã số thuế: [...]"
 * });
 * // Returns slots for company name and tax ID
 */
export async function slotAnalyzerAgent(input: SlotAnalyzerInput): Promise<SlotAnalyzerOutput> {
    const timer = createTimer();
    const emit = input.onProgress || (() => { });

    const model = createModel(input.model);

    agentLog("slot-analyzer", "starting", {
        contentLength: input.documentContent.length,
        model: input.model || "default",
    });

    try {
        // Use structured output instead of manual JSON parsing
        const { output } = await generateText({
            model,
            maxRetries: input.maxRetries ?? MODEL_CONFIG.DEFAULT_MAX_RETRIES,
            maxOutputTokens: input.maxOutputTokens ?? MODEL_CONFIG.ANALYZER_MAX_TOKENS,
            system: SLOT_ANALYZER_PROMPT.replace("{format_instructions}", ""),
            prompt: input.documentContent,
            output: Output.object({
                schema: z.object({
                    documentSummary: z.string().describe("Brief description of the document type"),
                    slots: z.array(
                        z.object({
                            id: z.string(),
                            originalText: z.string(),
                            context: z.string(),
                            suggestedType: z.enum(["name", "date", "number", "text", "address", "custom"]),
                            suggestedLabel: z.string(),
                            suggestedQuery: z.string().describe("Optional search query to find relevant information"),
                        })
                    ),
                }),
            }),
        });

        const result = {
            documentSummary: output.documentSummary,
            slots: output.slots as AnalyzedSlot[],
        };

        // Emit details about each slot category
        if (result.slots.length > 0) {
            const slotTypes = result.slots.reduce((acc: Record<string, number>, slot) => {
                acc[slot.suggestedType] = (acc[slot.suggestedType] || 0) + 1;
                return acc;
            }, {});
            const typesSummary = Object.entries(slotTypes)
                .map(([type, count]) => `${count} ${type}`)
                .join(", ");
            emit({
                type: "thought",
                message: `Detected placeholders: ${typesSummary}`,
                data: { slotTypes },
            });
        }

        agentLog(
            "slot-analyzer",
            "completed",
            {
                slotsFound: result.slots.length,
                documentType: result.documentSummary,
            },
            timer.elapsed()
        );

        return {
            slots: result.slots,
            documentSummary: result.documentSummary,
        };
    } catch (error) {
        // Handle specific AI SDK errors
        if (APICallError.isInstance(error)) {
            agentError("slot-analyzer", "api-error", {
                statusCode: error.statusCode,
                isRetryable: error.isRetryable,
                message: error.message,
            });
        } else {
            agentError("slot-analyzer", "failed", error);
        }

        // Fallback: try to find simple placeholders with regex
        const fallbackSlots = findSimplePlaceholders(input.documentContent);

        return {
            slots: fallbackSlots,
            documentSummary: "Document (analysis failed, using fallback)",
        };
    }
}

// ===========================
// FALLBACK REGEX DETECTION
// ===========================

/**
 * Simple regex-based placeholder detection as fallback
 */
function findSimplePlaceholders(content: string): AnalyzedSlot[] {
    const patterns = [
        /\[…]/g, // Vietnamese ellipsis in brackets
        /\[\.\.\.]/g, // ASCII dots in brackets
        /\[___+]/g, // Underscores in brackets
        /\{\{[^}]+}}/g, // Mustache/Handlebars style
        /___+/g, // Underscores (at least 3)
        /\[INSERT[^\]]+]/gi, // [INSERT X] style
        /\[ĐIỀN[^\]]+]/gi, // Vietnamese [ĐIỀN X] style
    ];

    const slots: AnalyzedSlot[] = [];
    const seen = new Set<number>(); // Track positions to avoid duplicates

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            if (seen.has(match.index)) continue;
            seen.add(match.index);

            // Get context (50 chars before and after)
            const start = Math.max(0, match.index - 50);
            const end = Math.min(content.length, match.index + match[0].length + 50);
            const context = content.slice(start, end).replace(/\s+/g, " ").trim();

            slots.push({
                id: `slot_${slots.length + 1}`,
                originalText: match[0],
                context,
                suggestedType: "text",
                suggestedLabel: `Placeholder ${slots.length + 1}`,
            });
        }
    }

    return slots;
}
