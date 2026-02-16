// lib/types.ts
// Shared types for Smart Template Filler

export interface FilledSlot {
    id: string;
    originalText: string;
    filledValue: string;
    source: "user_prompt" | "ai_generated" | "rag" | "skipped";
    confidence: number;
    reasoning?: string;
}

export type WorkflowEventType =
    | "start"
    | "thought"
    | "phase"
    | "slot_detected"
    | "slot_filling"
    | "slot_filled"
    | "complete"
    | "error";

export interface WorkflowEvent {
    type: WorkflowEventType;
    message: string;
    data?: Record<string, unknown>;
}

export interface TemplateFillerResult {
    success: boolean;
    documentSummary: string;
    changes: FilledSlot[];
    metadata: {
        totalSlots: number;
        filledSlots: number;
        skippedSlots: number;
        processingTimeMs: number;
    };
    download: {
        filename: string;
        mime: string;
        base64: string;
    };
}

export type AppView = "upload" | "generating" | "result";
