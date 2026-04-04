export type QueryTier = "light" | "medium" | "heavy";

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "minimax/minimax-m2.7": { inputPer1M: 0.8, outputPer1M: 2.2 },
  "minimax/minimax-m2.5": { inputPer1M: 0.2, outputPer1M: 1.1 },
  "anthropic/claude-sonnet-4.6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "google/gemini-3.1-pro-preview": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "qwen/qwen3.5-9b": { inputPer1M: 0.1, outputPer1M: 0.3 },
  "nvidia/nemotron-3-super-120b-a12b": { inputPer1M: 0.42, outputPer1M: 0.42 },
  "meta-llama/llama-3.1-8b-instruct": { inputPer1M: 0.055, outputPer1M: 0.055 },
};

const FALLBACK_PRICING: ModelPricing = { inputPer1M: 1.0, outputPer1M: 3.0 };

function getPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? FALLBACK_PRICING;
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const { inputPer1M, outputPer1M } = getPricing(model);
  return (
    (promptTokens * inputPer1M + completionTokens * outputPer1M) / 1_000_000
  );
}

const spendMap = new Map<string, number>();

export function recordActualSpend(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): void {
  const cost = calculateCost(model, promptTokens, completionTokens);
  const prev = spendMap.get(userId) ?? 0;
  spendMap.set(userId, prev + cost);
}

export function getEstimatedSpend(userId: string): number {
  return spendMap.get(userId) ?? 0;
}

const BUDGET_WARN_USD = 10.0;
const BUDGET_HARD_USD = 14.0;

const HEAVY_PATTERNS = [
  /\bgame.?review\b/i,
  /\breview.{0,20}game\b/i,
  /\banalyze.{0,20}game\b/i,
  /\banalyse.{0,20}game\b/i,
  /\bfull.{0,10}analys/i,
  /\bcompare.{0,20}(variation|line|move)/i,
  /\bvariation.{0,20}theme/i,
  /\btheme.{0,20}analysis/i,
  /\bcritical.{0,10}moment/i,
  /\bleela\b/i,
  /\bmaia\b/i,
  /\belite.{0,5}leela\b/i,
  /\bneural.{0,10}(net|engine)/i,
  /\bbatch.{0,10}analys/i,
  /\bmulti.{0,5}engine\b/i,
  /\bstockfish.{0,20}(vs|versus|compare|leela)/i,
  /\bdeep.{0,10}(analys|dive)/i,
  /\bgenerate.{0,10}review\b/i,
  /\bpgn\b.{0,40}(review|analys)/i,
  /lichess\.org\//i,
];

const MEDIUM_PATTERNS = [
  /\banalyz/i,
  /\banalyse/i,
  /\bstockfish\b/i,
  /\bbest.{0,10}move/i,
  /\bopening.{0,20}(theory|line|prep|study)/i,
  /\bsicilian\b/i,
  /\bfrench\b.{0,10}(defense|defence)/i,
  /\bcaro.{0,5}kann\b/i,
  /\bking.{0,5}indian\b/i,
  /\bqueens.{0,5}gambit\b/i,
  /\blondon.{0,5}(system|opening)\b/i,
  /\brepertoire\b/i,
  /\beval(uation)?\b/i,
  /\bposition.{0,20}(score|evaluat)/i,
  /\btactical.{0,20}(summary|pattern)\b/i,
  /\bendgame.{0,20}(theory|technique)\b/i,
  /\bmaster.{0,10}game/i,
  /\bchessdb\b/i,
];

export function classifyQuery(
  messages: Array<{ role: string; content: unknown }>,
): QueryTier {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "light";

  const text =
    typeof lastUser.content === "string"
      ? lastUser.content
      : JSON.stringify(lastUser.content);

  for (const re of HEAVY_PATTERNS) {
    if (re.test(text)) return "heavy";
  }
  for (const re of MEDIUM_PATTERNS) {
    if (re.test(text)) return "medium";
  }
  return "light";
}

export const LIGHT_MODEL = "minimax/minimax-m2.7";
export const MEDIUM_MODEL = "minimax/minimax-m2.5";
export const HEAVY_MODEL = "anthropic/claude-sonnet-4.6";

export interface ResolveModelResult {
  model: string;
  tier: QueryTier;
  reason: string;
}

export function resolveModel(
  userSelectedModel: string,
  tier: QueryTier,
  estimatedSpend: number,
): ResolveModelResult {
  // Free / always-allowed models bypass all routing logic
  const isFreeChoice =
    userSelectedModel.endsWith(":free") || userSelectedModel === LIGHT_MODEL;
  if (isFreeChoice) {
    return {
      model: userSelectedModel,
      tier: "light",
      reason: "user-free-choice",
    };
  }

  if (estimatedSpend >= BUDGET_HARD_USD) {
    return { model: LIGHT_MODEL, tier: "light", reason: "budget-hard-cap" };
  }

  let effectiveTier = tier;
  if (estimatedSpend >= BUDGET_WARN_USD && tier === "heavy") {
    effectiveTier = "medium";
  }

   const isRoutingModel =
    userSelectedModel === LIGHT_MODEL  ||
    userSelectedModel === MEDIUM_MODEL ||
    userSelectedModel === HEAVY_MODEL;
 
  if (!isRoutingModel) {
    return {
      model: userSelectedModel,
      tier: effectiveTier,
      reason: "user-explicit-choice",
    };
  }

  if (effectiveTier === "light")
    return { model: LIGHT_MODEL, tier: "light", reason: "query-is-light" };
  if (effectiveTier === "medium")
    return { model: MEDIUM_MODEL, tier: "medium", reason: "query-is-medium" };
  return { model: HEAVY_MODEL, tier: "heavy", reason: "query-is-heavy" };
}
