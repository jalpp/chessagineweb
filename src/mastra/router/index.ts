export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "minimax/minimax-m2.7": { inputPer1M: 0.8, outputPer1M: 2.2 },
  "google/gemini-3-flash-preview": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "anthropic/claude-sonnet-4.6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "google/gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "qwen/qwen3.5-9b": { inputPer1M: 0.1, outputPer1M: 0.3 },
  "nvidia/nemotron-3-super-120b-a12b": { inputPer1M: 0.42, outputPer1M: 0.42 },
  "meta-llama/llama-3.1-8b-instruct": { inputPer1M: 0.055, outputPer1M: 0.055 },
  "claude-opus-4-6": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5-20251001": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "gemini-2.5-pro-preview-05-06": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "openai/gpt-5.4": { inputPer1M: 7.5, outputPer1M: 30.0 },
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


export const FREE_FALLBACK_MODEL = "openrouter/free";
