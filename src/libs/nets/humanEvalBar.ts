import { MAIA3_RATING_VALUES } from "./types";

export interface EstimatedWdl {
  win: number;
  draw: number;
  loss: number;
}

/**
 * Estimate an approximate White Win/Draw/Loss percentage breakdown from a
 * White-perspective win probability (0-1).
 *
 * This is a heuristic, not an exact model — Maia's `value` alone doesn't
 * distinguish "how" a position is favored (a safe, drawish edge vs. sharp,
 * decisive complications). Draw likelihood is modeled as highest at an even
 * position (p = 0.5) and shrinking as either side's advantage grows, split
 * symmetrically so win/draw/loss always sum to exactly 100.
 */
export function estimateWdlFromWinProbability(
  whiteWinProbability: number,
): EstimatedWdl {
  const p = Math.max(0, Math.min(1, whiteWinProbability));
  const advantage = Math.abs(p - 0.5) * 2; // 0 (even) .. 1 (fully decisive)
  const drawShare = 0.5 - 0.42 * advantage; // 0.5 at even, ~0.08 at decisive
  const decisiveShare = 1 - drawShare;
  const winShare = decisiveShare * p;
  const lossShare = decisiveShare * (1 - p);

  const win = Math.round(winShare * 100);
  const loss = Math.round(lossShare * 100);
  const draw = 100 - win - loss; // remainder, so the three always sum to 100

  return { win, draw, loss };
}

/**
 * Snap an arbitrary rating to the nearest rating Maia 3 actually has a
 * model for (600-2600 in steps of 100), clamping to that range first.
 */
export function clampToNearestMaiaRating(rating: number): number {
  if (!Number.isFinite(rating)) return MAIA3_RATING_VALUES[MAIA3_RATING_VALUES.length - 1];
  const min = MAIA3_RATING_VALUES[0];
  const max = MAIA3_RATING_VALUES[MAIA3_RATING_VALUES.length - 1];
  const clamped = Math.max(min, Math.min(max, rating));
  return MAIA3_RATING_VALUES.reduce((closest, candidate) =>
    Math.abs(candidate - clamped) < Math.abs(closest - clamped) ? candidate : closest,
  );
}

/** Build the `evaluations.maia3` lookup key for a given rating, e.g. 2600 -> "maia_kdd_2600". */
export function maiaModelKey(rating: number): string {
  return `maia_kdd_${clampToNearestMaiaRating(rating)}`;
}

/** Find the batch-eval entry matching a rating, if present. */
export function findRatingEval<T extends { rating: number }>(
  results: T[] | undefined | null,
  rating: number,
): T | undefined {
  if (!results) return undefined;
  const target = clampToNearestMaiaRating(rating);
  return results.find((entry) => entry.rating === target);
}
