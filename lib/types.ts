// lib/types.ts
// Shared types for DocFill

export interface FilledSlot {
    id: string;
    originalText: string;
    filledValue: string;
    source: "user_prompt" | "rag" | "generated" | "skipped";
    confidence: number;
    ragQuery?: string;
    reasoning?: string;
}

export type WorkflowEventType =
    | "start"
    | "thought"
    | "phase"
    | "slot_detected"
    | "slot_filling"
    | "slot_filled"
    | "plan_complete"
    | "edit_progress"
    | "edit_success"
    | "edit_failed"
    | "rebuild"
    | "warning"
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
        ragQueries: number;
        processingTimeMs: number;
    };
    download: {
        filename: string;
        mime: string;
        base64: string;
    };
}

export type AppView = "upload" | "generating" | "result";
