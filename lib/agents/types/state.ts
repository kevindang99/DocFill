// lib/agents/types/state.ts
// Shared TypeScript types for agent operations
// Aligned with wrag/lib/agents/types/state.ts (template filler subset)

// ===========================
// TEMPLATE FILLER TYPES
// ===========================

export interface AnalyzedSlot {
    id: string;
    originalText: string;
    context: string;
    suggestedType: "name" | "date" | "number" | "text" | "address" | "custom";
    suggestedLabel: string;
    suggestedQuery?: string;
}

export interface FilledSlot {
    id: string;
    originalText: string;
    filledValue: string;
    source: "user_prompt" | "rag" | "generated" | "skipped";
    confidence: number;
    ragQuery?: string;
    reasoning?: string;
}

export interface TemplateFillerOutput {
    filledDocxBuffer: Buffer;
    changes: FilledSlot[];
    documentSummary: string;
    metadata: {
        totalSlots: number;
        filledSlots: number;
        skippedSlots: number;
        ragQueries: number;
        processingTimeMs: number;
    };
}

// ===========================
// SLOT ANALYZER TYPES
// ===========================

export interface SlotAnalyzerInput {
    documentContent: string;
    model?: string;
    maxRetries?: number;
    maxOutputTokens?: number;
}

export interface SlotAnalyzerOutput {
    slots: AnalyzedSlot[];
    documentSummary: string;
}

// ===========================
// SLOT FILLER TYPES
// ===========================

export interface SlotFillerInput {
    slots: AnalyzedSlot[];
    userPrompt: string;
    firmId: string;
    documentSummary?: string;
    model?: string;
    maxRetries?: number;
    maxOutputTokens?: number;
}

export interface SlotFillerOutput {
    filledSlots: FilledSlot[];
    ragQueriesCount: number;
}

// ===========================
// WORKFLOW PROGRESS
// ===========================

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
    data?: any;
}

export type ProgressCallback = (event: WorkflowEvent) => void;
