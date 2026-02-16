// lib/agents/config/models.ts
// Centralized model factory using Vercel AI SDK

import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { MODEL_CONFIG } from "./constants";

export function createModel(modelName?: string): LanguageModel {
    return openai(modelName ?? MODEL_CONFIG.DEFAULT_MODEL) as LanguageModel;
}

export const ModelPresets = {
    default: {
        model: createModel(MODEL_CONFIG.DEFAULT_MODEL),
        modelName: MODEL_CONFIG.DEFAULT_MODEL,
        maxRetries: MODEL_CONFIG.DEFAULT_MAX_RETRIES,
        maxOutputTokens: MODEL_CONFIG.DEFAULT_MAX_OUTPUT_TOKENS,
    },
    deterministic: {
        model: createModel(MODEL_CONFIG.DEFAULT_MODEL),
        modelName: MODEL_CONFIG.DEFAULT_MODEL,
        maxRetries: MODEL_CONFIG.DEFAULT_MAX_RETRIES,
        maxOutputTokens: MODEL_CONFIG.DEFAULT_MAX_OUTPUT_TOKENS,
    },
    advanced: {
        model: createModel(MODEL_CONFIG.ADVANCED_MODEL),
        modelName: MODEL_CONFIG.ADVANCED_MODEL,
        maxRetries: MODEL_CONFIG.DEFAULT_MAX_RETRIES,
        maxOutputTokens: MODEL_CONFIG.ADVANCED_MAX_OUTPUT_TOKENS,
    },
} as const;
