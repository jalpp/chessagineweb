/**
 * @file themes.ts
 * @description Batch theme analysis helpers for the Agine Analyzer.
 *
 * Wraps the /api/gametheme proxy (Agine themes engine game review) to fetch
 * per-game theme profiles, plus pure aggregation helpers used by the Themes
 * tab. Responses are cached in the shared themes IndexedDB cache keyed by
 * game id, so re-running an analysis is free.
 *
 * The upstream themes service wraps payloads as { success, data }. Flat
 * score objects are normalized via normalizeThemeScores from
 * @/libs/themes/helper (the themes wrapper fix); the game-review envelope is
 * unwrapped here before its nested scores are normalized.
 */

import {
  GameReviewTheme,
  normalizeThemeScores,
  ThemeScore,
} from "@/libs/themes/helper";
import { getThemeScoreCache, setThemeScoreCache } from "@/libs/themes/cache";

/** All ThemeScore keys, used for validation and zeroed accumulators. */
export const THEME_KEYS: (keyof ThemeScore)[] = [
  "material",
  "mobility",
  "space",
  "positional",
  "kingSafety",
  "tactical",
  "darksqaureControl",
  "lightsqaureControl",
  "tempo",
];

/**
 * Unwraps a themes-service body that may arrive as the payload itself or as
 * a { success, data } envelope. @returns The inner payload, or null.
 */
function unwrapThemesResponse<T>(body: unknown): T | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if ("data" in record && record.data && typeof record.data === "object") {
    return record.data as T;
  }
  if ("error" in record) return null;
  return body as T;
}

/**
 * Fetches the Agine themes game review for one game, IndexedDB cached.
 *
 * @param pgn - Full PGN of the game
 * @param gameId - Stable cache key (Lichess game id)
 * @returns The game review theme payload, or null on failure
 */
export async function fetchGameThemeReview(
  pgn: string,
  gameId: string
): Promise<GameReviewTheme | null> {
  const cacheKey = `gametheme|${gameId}`;
  try {
    console.debug(`[themes] fetchGameThemeReview start`, { gameId, cacheKey });
    const cached = await getThemeScoreCache(cacheKey);
    if (cached) {
      console.debug(`[themes] cache hit`, { gameId });
      return cached as GameReviewTheme;
    }
    console.debug(`[themes] cache miss`, { gameId });

    const response = await fetch("/api/gametheme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pgn, format: "json" }),
    });
    if (!response.ok) {
      console.warn(`[themes] fetch failed`, { gameId, status: response.status });
      return null;
    }

    const review = unwrapThemesResponse<GameReviewTheme>(
      await response.json()
    );
    if (!review?.whiteAnalysis || !review?.blackAnalysis) {
      console.warn(`[themes] invalid review payload`, { gameId, review });
      return null;
    }

    try {
      await setThemeScoreCache(cacheKey, review);
      console.debug(`[themes] cached review`, { gameId });
    } catch (cacheErr) {
      console.error(`[themes] cache set failed`, { gameId, error: cacheErr });
    }

    console.debug(`[themes] fetchGameThemeReview success`, { gameId });
    return review;
  } catch {
    // capture exception with as much context as possible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = (arguments && (arguments[0] as any)) || null;
    console.error(`[themes] unexpected error fetching theme review`, { gameId, error: err });
    return null;
  }
}

/**
 * Extracts the reviewed user's average theme profile from a game review.
 * @returns Sanitized average scores for the user's color, or null
 */
export function getUserThemeProfile(
  review: GameReviewTheme,
  userColor: "white" | "black"
): ThemeScore | null {
  const side =
    userColor === "white" ? review.whiteAnalysis : review.blackAnalysis;
  // normalizeThemeScores (themes wrapper fix) handles {data} envelopes and
  // coerces every theme key to a finite number
  return normalizeThemeScores(side?.averageThemeScores ?? null);
}

/**
 * Averages a list of theme profiles key-by-key.
 * @returns The mean ThemeScore, or null for an empty list
 */
export function averageThemeProfiles(
  profiles: ThemeScore[]
): ThemeScore | null {
  if (profiles.length === 0) return null;
  const sums = THEME_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as ThemeScore
  );
  for (const profile of profiles) {
    for (const key of THEME_KEYS) sums[key] += profile[key];
  }
  for (const key of THEME_KEYS) {
    sums[key] = Math.round((sums[key] / profiles.length) * 100) / 100;
  }
  return sums;
}
