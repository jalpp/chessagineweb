
export type QueryTier = "light" | "medium" | "heavy";


const TIER_COST_ESTIMATE: Record<QueryTier, number> = {
  light:  0.000_1,   
  medium: 0.003,     
  heavy:  0.025,     
};

const BUDGET_WARN_USD = 10.0;   
const BUDGET_HARD_USD = 14.0; 

const spendMap = new Map<string, number>();

export function recordSpend(userId: string, tier: QueryTier): void {
  const prev = spendMap.get(userId) ?? 0;
  spendMap.set(userId, prev + TIER_COST_ESTIMATE[tier]);
}

export function getEstimatedSpend(userId: string): number {
  return spendMap.get(userId) ?? 0;
}


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


export function classifyQuery(messages: Array<{ role: string; content: unknown }>): QueryTier {
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


export const LIGHT_MODEL  = "minimax/minimax-m2.7";
export const MEDIUM_MODEL = "minimax/minimax-m2.5";
export const HEAVY_MODEL  = "anthropic/claude-sonnet-4.6"; 


export function resolveModel(
  userSelectedModel: string,
  tier: QueryTier,
  estimatedSpend: number,
): { model: string; tier: QueryTier; reason: string } {

    const isFreeChoice = userSelectedModel.endsWith(":free") || userSelectedModel === LIGHT_MODEL;
  if (isFreeChoice) {
    return { model: userSelectedModel, tier: "light", reason: "user-free-choice" };
  }

  if (estimatedSpend >= BUDGET_HARD_USD) {
    return { model: LIGHT_MODEL, tier: "light", reason: "budget-hard-cap" };
  }

 
  let effectiveTier = tier;
  if (estimatedSpend >= BUDGET_WARN_USD && tier === "heavy") {
    effectiveTier = "medium";
  }

  
  if (effectiveTier === "light") {
    return { model: LIGHT_MODEL, tier: "light", reason: "query-is-light" };
  }

  if (effectiveTier === "medium") {
    return { model: MEDIUM_MODEL, tier: "medium", reason: "query-is-medium" };
  }

  return { model: HEAVY_MODEL, tier: "heavy", reason: "query-is-heavy" };
}