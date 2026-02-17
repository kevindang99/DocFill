// lib/agents/core/slot-filler.ts
// Agent that fills detected slots using user prompt
// Note: Multi-step tool execution requires upgrading to AI SDK v5.1+ with maxSteps

import { generateText, tool, stepCountIs, APICallError } from "ai";
import { z } from "zod";
import { createModel, MODEL_CONFIG } from "../config/models";
import { agentLog, agentError, createTimer } from "../utils/logger";
import type { FilledSlot, AnalyzedSlot, SlotFillerOutput, ProgressCallback } from "../types/state";

interface SlotFillerInput {
    slots: AnalyzedSlot[];
    userPrompt: string;
    documentSummary?: string;
    onProgress?: ProgressCallback;
    model?: string;
    maxRetries?: number;
    maxOutputTokens?: number;
}

// ===========================
// MAIN FUNCTION
// ===========================

/**
 * Fill detected slots using user prompt
 *
 * Uses direct text generation to fill slots. For RAG integration,
 * the slot should include suggestedQuery hints that can be processed separately.
 *
 * @param input - Slots to fill, user prompt, and firm context
 * @returns Filled slots with sources and confidence
 */
export async function slotFillerAgent(input: SlotFillerInput): Promise<SlotFillerOutput> {
    const timer = createTimer();

    const model = createModel(input.model);

    agentLog("slot-filler", "starting", {
        slotCount: input.slots.length,
        promptLength: input.userPrompt.length,
        model: input.model || "default",
    });

    const emit = input.onProgress || (() => { });

    try {
        // Build slots description for prompt
        const slotsDescription = input.slots
            .map(
                (s) =>
                    `- ${s.id}: "${s.suggestedLabel}" (type: ${s.suggestedType}, placeholder: "${s.originalText}", context: "${s.context.slice(0, 100)}")`
            )
            .join("\n");

        // Generate filled values using reasoning loop with tools
        const result = await generateText({
            model,
            maxRetries: input.maxRetries ?? MODEL_CONFIG.DEFAULT_MAX_RETRIES,
            maxOutputTokens: input.maxOutputTokens ?? MODEL_CONFIG.FILLER_MAX_TOKENS,
            stopWhen: stepCountIs(10), // 🔥 Enable multi-step reasoning loop (up to 10 steps)

            system: `You are a document filling assistant. You have access to tools to search the knowledge base and analyze document slots.

Document: ${input.documentSummary || "Document template"}

Slots to fill:
${slotsDescription}

Your task is to fill all slots with appropriate values. You can:
1. Use information directly from the user's instructions
2. Search the knowledge base for relevant information
3. Analyze individual slots to understand what's needed
4. Generate appropriate values when no specific information is available
5. Skip slots that cannot be filled confidently

After filling all slots, call the finalizeSlots tool to complete the task.`,

            prompt: `User's instructions: ${input.userPrompt}

Fill all ${input.slots.length} slots in the document using the available tools.`,

            // 🔥 Define tools for reasoning loop
            tools: {
                searchKnowledgeBase: tool({
                    description:
                        "Search the knowledge base for information to fill document slots (e.g., client info, legal data, precedents)",
                    inputSchema: z.object({
                        query: z.string().describe("What to search for"),
                    }),
                    execute: async ({ query }: { query: string }) => {
                        emit({ type: "thought", message: `🔍 Searching knowledge base: "${query}"` });

                        // Standalone app: no RAG available
                        agentLog("slot-filler:tool", "search-kb-standalone", { query });
                        return {
                            answer: "No knowledge base available in standalone mode. Use information from the user's instructions.",
                            documentCount: 0,
                            topSources: [],
                        };
                    },
                }),

                analyzeSlot: tool({
                    description: "Analyze a specific slot to understand what information is needed before filling it",
                    inputSchema: z.object({
                        slotId: z.string().describe("The slot ID to analyze"),
                    }),
                    execute: async ({ slotId }: { slotId: string }) => {
                        const slot = input.slots.find((s) => s.id === slotId);

                        if (!slot) {
                            return { error: "Slot not found" };
                        }

                        emit({
                            type: "thought",
                            message: `Analyzing slot: ${slot.suggestedLabel}`,
                        });

                        return {
                            id: slot.id,
                            label: slot.suggestedLabel,
                            type: slot.suggestedType,
                            placeholder: slot.originalText,
                            context: slot.context,
                            suggestedQuery: slot.suggestedQuery,
                        };
                    },
                }),

                finalizeSlots: tool({
                    description:
                        "Finalize and return all filled slots. Call this when you have filled (or decided to skip) all slots.",
                    inputSchema: z.object({
                        filledSlots: z
                            .array(
                                z.object({
                                    id: z.string().describe("Slot ID from the original slots list"),
                                    value: z.string().describe("The filled value for this slot"),
                                    source: z.enum(["user_prompt", "rag", "generated", "skipped"]).describe("Where the value came from"),
                                    confidence: z.number().min(0).max(1).describe("Confidence score (0-1)"),
                                    reasoning: z.string().optional().describe("Brief explanation of why this value was chosen"),
                                })
                            )
                            .describe("All slots with their filled values"),
                        summary: z.string().optional().describe("Brief summary of what was filled"),
                    }),
                    execute: async ({
                        filledSlots,
                        summary,
                    }: {
                        filledSlots: Array<{
                            id: string;
                            value: string;
                            source: "user_prompt" | "rag" | "generated" | "skipped";
                            confidence: number;
                            reasoning?: string;
                        }>;
                        summary?: string;
                    }) => {
                        emit({
                            type: "thought",
                            message: `Finalizing ${filledSlots.length} slots...`,
                        });

                        if (summary) {
                            emit({ type: "thought", message: summary });
                        }

                        return {
                            success: true,
                            count: filledSlots.length,
                            filled: filledSlots.filter((s: { source: string }) => s.source !== "skipped").length,
                            skipped: filledSlots.filter((s: { source: string }) => s.source === "skipped").length,
                        };
                    },
                }),
            },
        });

        // Extract the finalize tool call to get filled slots
        const finalizeCall = result.steps?.flatMap((step) => step.toolCalls).find((tc) => tc.toolName === "finalizeSlots");

        if (finalizeCall && "input" in finalizeCall) {
            const toolInput = finalizeCall.input as any;
            if (toolInput?.filledSlots) {
                const filledSlots: FilledSlot[] = toolInput.filledSlots.map((slot: any) => {
                    const originalSlot = input.slots.find((s) => s.id === slot.id);

                    return {
                        id: slot.id,
                        originalText: originalSlot?.originalText || "",
                        filledValue: slot.value,
                        source: slot.source || "generated",
                        confidence: slot.confidence || 0.5,
                        reasoning: slot.reasoning,
                    };
                });

                // Count RAG queries from tool calls
                const ragQueriesCount =
                    result.steps?.flatMap((step) => step.toolCalls).filter((tc) => tc.toolName === "searchKnowledgeBase")
                        .length || 0;

                agentLog(
                    "slot-filler",
                    "completed-with-reasoning",
                    {
                        totalSteps: result.steps?.length || 0,
                        toolCallsCount: result.steps?.flatMap((step) => step.toolCalls).length || 0,
                        ragQueries: ragQueriesCount,
                        filledCount: filledSlots.filter((s) => s.source !== "skipped").length,
                        skippedCount: filledSlots.filter((s) => s.source === "skipped").length,
                    },
                    timer.elapsed()
                );

                return {
                    filledSlots,
                    ragQueriesCount,
                };
            }
        }

        // Fallback: agent didn't call finalizeSlots (shouldn't happen with proper prompting)
        agentLog("slot-filler", "no-finalization", {
            toolCallsCount: result.steps?.flatMap((step) => step.toolCalls).length || 0,
        });

        // Map slots back using the original single-step approach as fallback
        const filledSlots: FilledSlot[] = input.slots.map((slot) => ({
            id: slot.id,
            originalText: slot.originalText,
            filledValue: slot.originalText,
            source: "skipped" as const,
            confidence: 0,
            reasoning: "Agent did not finalize slots properly",
        }));

        return {
            filledSlots,
            ragQueriesCount: 0,
        };
    } catch (error) {
        // Handle specific AI SDK errors
        if (APICallError.isInstance(error)) {
            agentError("slot-filler", "api-error", {
                statusCode: error.statusCode,
                isRetryable: error.isRetryable,
                message: error.message,
            });
        } else {
            agentError("slot-filler", "failed", error);
        }

        return {
            filledSlots: input.slots.map((slot) => ({
                id: slot.id,
                originalText: slot.originalText,
                filledValue: slot.originalText,
                source: "skipped" as const,
                confidence: 0,
                reasoning: `Error: ${error instanceof Error ? error.message : String(error)}`,
            })),
            ragQueriesCount: 0,
        };
    }
}
