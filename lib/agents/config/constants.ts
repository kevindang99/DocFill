// lib/agents/config/constants.ts
// Centralized constants for agent configuration

export const MODEL_CONFIG = {
    /** Default model for most operations */
    DEFAULT_MODEL: process.env.AGENT_MODEL_NAME ?? "gpt-5.1",

    /** Advanced model for complex reasoning */
    ADVANCED_MODEL: process.env.AGENT_ADVANCED_MODEL ?? "gpt-5.1",

    /** Default temperature */
    DEFAULT_TEMPERATURE: 0.1,

    /** Zero temperature for deterministic tasks */
    DETERMINISTIC_TEMPERATURE: 0,

    /** Default max retries for API calls */
    DEFAULT_MAX_RETRIES: 3,

    /** Maximum output tokens for default model */
    DEFAULT_MAX_OUTPUT_TOKENS: 2000,

    /** Maximum output tokens for advanced model */
    ADVANCED_MAX_OUTPUT_TOKENS: 4000,
} as const;

export type ModelConfig = typeof MODEL_CONFIG;
