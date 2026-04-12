/**
 * Model classification constants.
 * Centralized here to avoid circular imports between components.
 */

/** Models that use the user's own Anthropic API key (direct API) */
export const BYO_ANTHROPIC_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

/** Models that use the user's own Google Gemini API key (direct API) */
export const BYO_GEMINI_MODELS = [
  "gemini-3.1-pro-preview",  
  "gemini-2.5-pro-preview-05-06",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

/** Models routed through OpenRouter using the user's own OpenRouter key */
export const BYO_OPENROUTER_MODELS = [
  "google/gemini-3.1-pro-preview:user",
  "anthropic/claude-sonnet-4.6:user",
  "qwen/qwen3.5-9b:user",
  "nvidia/nemotron-3-super-120b-a12b:user",
  "meta-llama/llama-3.1-8b-instruct:user",  
  "openai/gpt-5.4:user",
];

/** All BYO-key models combined */
export const BYO_MODELS = [
  ...BYO_ANTHROPIC_MODELS,
  ...BYO_GEMINI_MODELS,
  ...BYO_OPENROUTER_MODELS,
];


export const PREMIUM_MODELS = [
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "nvidia/nemotron-3-super-120b-a12b",
  "meta-llama/llama-3.1-8b-instruct",
  "openai/gpt-5.4",
];