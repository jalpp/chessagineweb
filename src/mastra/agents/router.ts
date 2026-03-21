
import { RequestContext } from "@mastra/core/request-context";

export const PAID_DAILY_CAP = 200_000;

export const PREMIUM_MODELS = new Set([
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "meta-llama/llama-3.1-8b-instruct",
]);


const FREE_CHAIN = [
  "arcee-ai/trinity-large-preview:free",
  "openrouter/cypher-alpha:free",
];

const ECONOMY_CHAIN = [
  "qwen/qwen3.5-9b:floor",
  "meta-llama/llama-3.1-8b-instruct:floor",
  "arcee-ai/trinity-large-preview:free",
];

function buildPremiumChain(primary: string): string[] {
  return [
    primary,
    "google/gemini-flash-1.5:floor",
    "qwen/qwen3.5-9b:floor",
    "arcee-ai/trinity-large-preview:free",
  ];
}

interface BudgetEntry { tokens: number; resetAt: number }
const BUDGET_MAP = new Map<string, BudgetEntry>();
const BUDGET_MAX_ENTRIES = 10_000;

export function getDailyTokens(userId: string): number {
  const now = Date.now();
  const entry = BUDGET_MAP.get(userId);
  if (!entry || now > entry.resetAt) return 0;
  return entry.tokens;
}

export function recordTokenUsage(userId: string, tokens: number): void {
  const now = Date.now();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  const resetAt = midnight.getTime();
  const entry = BUDGET_MAP.get(userId);
  if (!entry || now > entry.resetAt) {
    if (BUDGET_MAP.size >= BUDGET_MAX_ENTRIES) {
      const firstKey = BUDGET_MAP.keys().next().value;
      if (firstKey) BUDGET_MAP.delete(firstKey);
    }
    BUDGET_MAP.set(userId, { tokens, resetAt });
  } else {
    entry.tokens += tokens;
  }
}


export type Complexity = "simple" | "medium" | "complex";

const SIMPLE_RE = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it)[.!?]?$/i,
  /^what('?s| is) (the )?best (opening|move)\??$/i,
];

const COMPLEX_RE = [
  /\[Event\s+"/i,                              
  /\[White\s+"/i,
  /rnbqkbnr|[rnbqkRNBQK][1-8\/]{6,}/,           
  /\d+\.\s+[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8]/, 
  /review (my|this|the) game/i,
  /analys[ie]/i,
  /improve my (chess|game|play)/i,
  /explain (why|how|the|this)/i,
  /walk me through/i,
  /what (went|was) wrong/i,
  /opening prep|repertoire|study/i,
];

export function classifyComplexity(
  messages: Array<{ role: string; content: string | any[] }> | undefined | null
): Complexity {
  if (!messages || messages.length === 0) return "simple";
  if (messages.length > 16) return "complex";

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "simple";

  let text = "";
  if (typeof lastUser.content === "string") {
    text = lastUser.content;
  } else if (Array.isArray(lastUser.content)) {
    text = lastUser.content
      .filter((p) => p != null && p.type === "text")
      .map((p) => p.text ?? "")
      .join(" ");
  }

  if (!text.trim()) return "simple";

  const words = text.trim().split(/\s+/).length;

  if (words <= 6 && SIMPLE_RE.some((r) => r.test(text))) return "simple";
  if (COMPLEX_RE.some((r) => r.test(text))) return "complex";
  if (words > 80) return "complex";
  if (words > 25) return "medium";
  return "simple";
}

export type BudgetTier = "free" | "economy" | "premium";

export function decideBudgetTier(opts: {
  isPaidTier: boolean;
  userId: string | null;
  complexity: Complexity;
  requestedModel: string;
}): BudgetTier {
  const { isPaidTier, userId, complexity, requestedModel } = opts;
  if (!isPaidTier) return "free";

  const spentToday = userId ? getDailyTokens(userId) : 0;
  if (spentToday >= PAID_DAILY_CAP) return "economy";

  if (complexity === "simple") return "economy";
  if (complexity === "medium") return "economy";

  if (PREMIUM_MODELS.has(requestedModel)) return "premium";

  return "economy";
}


export interface RoutingDecision {
  resolvedModel: string;
  extraBody: Record<string, unknown>;
  budgetTier: BudgetTier;
  complexity: Complexity;
}

export function resolveRouting(opts: {
  requestContext: RequestContext;
  isPaidTier: boolean;
  userId: string | null;
  messages: Array<{ role: string; content: any }> | undefined | null;
}): RoutingDecision {
  const { requestContext, isPaidTier, userId, messages } = opts;

  const rawModel = (requestContext.get("model") as string) ?? "";
  const requestedModel = rawModel.replace(/^"|"$/g, "");

  const complexity = classifyComplexity(messages);
  const budgetTier = decideBudgetTier({ isPaidTier, userId, complexity, requestedModel });

  let chain: string[];
  if (budgetTier === "free") {
    chain = FREE_CHAIN;
  } else if (budgetTier === "economy") {
    chain = ECONOMY_CHAIN;
  } else {
    const primary = PREMIUM_MODELS.has(requestedModel)
      ? requestedModel
      : requestedModel || ECONOMY_CHAIN[0];
    chain = buildPremiumChain(primary);
  }

  const [resolvedModel, ...fallbacks] = chain;

  const extraBody: Record<string, unknown> = {
    ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
    ...(budgetTier !== "premium" ? { provider: { sort: "price" } } : {}),
  };

  return { resolvedModel, extraBody, budgetTier, complexity };
}