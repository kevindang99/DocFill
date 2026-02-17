// lib/agents/config/models.ts
// Centralized model factory and default configuration

import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Global default configuration for AI agents.
 * These are used if no specific overrides are provided via the SDK.
 */
export const MODEL_CONFIG = {
    DEFAULT_MODEL: "gpt-5.1",
    DEFAULT_MAX_RETRIES: 3,
    DEFAULT_TEMPERATURE: 0.1,
    DETERMINISTIC_TEMPERATURE: 0,
    ANALYZER_MAX_TOKENS: 2000,
    FILLER_MAX_TOKENS: 4000,
} as const;

export function createModel(modelName?: string): LanguageModel {
    return openai(modelName ?? MODEL_CONFIG.DEFAULT_MODEL) as LanguageModel;
}
