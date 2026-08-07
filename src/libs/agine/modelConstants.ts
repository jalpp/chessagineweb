

export const BYO_ANTHROPIC_MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
];


export const BYO_GEMINI_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];


export const BYO_OPENROUTER_MODELS = [
  "google/gemini-3.1-pro-preview:user",
  "anthropic/claude-sonnet-5:user",
  "nvidia/nemotron-3-super-120b-a12b:user",
  "meta-llama/llama-4-scout:user",
  "openai/gpt-5.6-sol:user",
];


export const BYO_MODELS = [
  ...BYO_ANTHROPIC_MODELS,
  ...BYO_GEMINI_MODELS,
  ...BYO_OPENROUTER_MODELS,
];


export const PREMIUM_MODELS = [
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-5",
  "nvidia/nemotron-3-super-120b-a12b",
  "meta-llama/llama-4-scout",
  "openai/gpt-5.6-sol",
];


export const FREE_ROUTER_MODEL = "openrouter/free";


export const GIFT_MODEL = "qwen/qwen3-coder-next";

/** Models selectable by free-tier users without any key or upgrade. */
export const FREE_TIER_MODELS = [GIFT_MODEL, FREE_ROUTER_MODEL];
