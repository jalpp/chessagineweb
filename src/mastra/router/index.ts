import { FREE_GIFT_MODEL } from "@/libs/agine/modelConstants";

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "minimax/minimax-m2.7": { inputPer1M: 0.8, outputPer1M: 2.2 },
  "google/gemini-3-flash-preview": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "anthropic/claude-sonnet-5": { inputPer1M: 2.0, outputPer1M: 10.0 },
  "google/gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "qwen/qwen3.5-9b": { inputPer1M: 0.1, outputPer1M: 0.3 },
  "nvidia/nemotron-3-super-120b-a12b": { inputPer1M: 0.42, outputPer1M: 0.42 },
  "meta-llama/llama-4-scout": { inputPer1M: 0.11, outputPer1M: 0.34 },
  "claude-opus-4-8": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-sonnet-5": { inputPer1M: 2.0, outputPer1M: 10.0 },
  "claude-haiku-4-5-20251001": { inputPer1M: 1.0, outputPer1M: 5.0 },
  "gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-3.6-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-3.5-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "openai/gpt-5.6-sol": { inputPer1M: 5.0, outputPer1M: 30.0 },
};

const FALLBACK_PRICING: ModelPricing = { inputPer1M: 1.0, outputPer1M: 3.0 };

export function getPricing(model: string): ModelPricing {
  const baseModel = model.replace(/:free$/, "");
  return MODEL_PRICING[baseModel] ?? FALLBACK_PRICING;
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const { inputPer1M, outputPer1M } = getPricing(model);
  return (promptTokens * inputPer1M + completionTokens * outputPer1M) / 1_000_000;
}


/** Fallback once a paid user's daily AgineCloud budget is hit — the
 *  curated tool-calling free model, not the random `openrouter/free`
 *  router, so mid-conversation tool use keeps working. */
export const FREE_FALLBACK_MODEL = FREE_GIFT_MODEL;
