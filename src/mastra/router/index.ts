export type QueryTier = "light" | "medium" | "heavy";

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "minimax/minimax-m2.7": { inputPer1M: 0.8, outputPer1M: 2.2 },
  "google/gemini-3-flash-preview": { inputPer1M: 0.1, outputPer1M: 0.4 },
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

const IS_DEV = false;

function routerLog(label: string, data: Record<string, unknown>): void {
  if (!IS_DEV) return;
  const lines = Object.entries(data)
    .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join("\n");
  console.log(`\n[router:${label}]\n${lines}`);
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

export async function recordActualSpend(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  const cost = calculateCost(model, promptTokens, completionTokens);
  const prev = spendMap.get(userId) ?? 0;
  const next = prev + cost;
  spendMap.set(userId, next);

  routerLog("recordActualSpend", {
    userId,
    model,
    promptTokens,
    completionTokens,
    cost: `$${cost.toFixed(6)}`,
    totalSpend: `$${next.toFixed(6)}`,
  });
}

export async function getEstimatedSpend(userId: string): Promise<number> {
  const spend = spendMap.get(userId) ?? 0;
  routerLog("getEstimatedSpend", {
    userId,
    spend: `$${spend.toFixed(6)}`,
  });
  return spend;
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
  /\b(review|check|look at)\b.{0,30}\b(my|this|the)\b.{0,10}\bgame\b/i,
  /\bwhat (did i do|went) wrong\b/i,
  /\bwhere did i (go wrong|blunder|miss)\b/i,
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

function extractPartsText(parts: unknown[]): string {
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part !== null &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as Record<string, unknown>).text === "string"
      ) {
        return (part as { text: string }).text;
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function extractTextFromMessage(msg: Record<string, unknown>): string {
  if (Array.isArray(msg.parts) && msg.parts.length > 0) {
    return extractPartsText(msg.parts);
  }
  if (typeof msg.content === "string") {
    return msg.content;
  }
  if (Array.isArray(msg.content)) {
    return extractPartsText(msg.content);
  }
  return "";
}

export function classifyQuery(
  messages: Array<Record<string, unknown>>,
): QueryTier {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  if (!lastUser) {
    routerLog("classifyQuery", {
      result: "light",
      reason: "no user message found in history",
      messageCount: messages.length,
    });
    return "light";
  }

  const text = extractTextFromMessage(lastUser);
  const preview = text.length > 120 ? text.slice(0, 120) + "…" : text;

  for (const re of HEAVY_PATTERNS) {
    if (re.test(text)) {
      routerLog("classifyQuery", {
        result: "heavy",
        matchedPattern: re.toString(),
        messageCount: messages.length,
        lastMessagePreview: preview,
      });
      return "heavy";
    }
  }

  for (const re of MEDIUM_PATTERNS) {
    if (re.test(text)) {
      routerLog("classifyQuery", {
        result: "medium",
        matchedPattern: re.toString(),
        messageCount: messages.length,
        lastMessagePreview: preview,
      });
      return "medium";
    }
  }

  routerLog("classifyQuery", {
    result: "light",
    reason: "no pattern matched",
    messageCount: messages.length,
    lastMessagePreview: preview,
  });
  return "light";
}

export const LIGHT_MODEL = "minimax/minimax-m2.7";
export const MEDIUM_MODEL = "google/gemini-3-flash-preview";
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
  const baseCtx = {
    userSelectedModel,
    classifiedTier: tier,
    estimatedSpend: `$${estimatedSpend.toFixed(4)}`,
    budgetWarn: `$${BUDGET_WARN_USD}`,
    budgetHard: `$${BUDGET_HARD_USD}`,
  };

  const isFreeChoice =
    userSelectedModel.endsWith(":free") || userSelectedModel === LIGHT_MODEL;
  if (isFreeChoice) {
    const result = { model: userSelectedModel, tier: "light" as QueryTier, reason: "user-free-choice" };
    routerLog("resolveModel", { ...baseCtx, ...result, decision: "bypassed — free choice" });
    return result;
  }

  if (estimatedSpend >= BUDGET_HARD_USD) {
    const result = { model: LIGHT_MODEL, tier: "light" as QueryTier, reason: "budget-hard-cap" };
    routerLog("resolveModel", { ...baseCtx, ...result, decision: "hard cap hit — forced to light model" });
    return result;
  }

  let effectiveTier = tier;
  if (estimatedSpend >= BUDGET_WARN_USD && tier === "heavy") {
    effectiveTier = "medium";
    routerLog("resolveModel", {
      ...baseCtx,
      decision: "budget warn — downgraded heavy → medium",
    });
  }

  const isRoutingModel =
    userSelectedModel === LIGHT_MODEL ||
    userSelectedModel === MEDIUM_MODEL ||
    userSelectedModel === HEAVY_MODEL;

  if (!isRoutingModel) {
    const result = { model: userSelectedModel, tier: effectiveTier, reason: "user-explicit-choice" };
    routerLog("resolveModel", { ...baseCtx, ...result, decision: "non-routing model — honouring user pick" });
    return result;
  }

  let result: ResolveModelResult;
  if (effectiveTier === "light") {
    result = { model: LIGHT_MODEL, tier: "light", reason: "query-is-light" };
  } else if (effectiveTier === "medium") {
    result = { model: MEDIUM_MODEL, tier: "medium", reason: "query-is-medium" };
  } else {
    result = { model: HEAVY_MODEL, tier: "heavy", reason: "query-is-heavy" };
  }

  routerLog("resolveModel", {
    ...baseCtx,
    effectiveTier,
    ...result,
    decision: `routing model slot → ${result.model}`,
  });
  return result;
}