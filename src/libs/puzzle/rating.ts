export const DEFAULT_USER_PUZZLE_RATING = 1500;

export function normalizeUserPuzzleRating(value: unknown): number {
  const rating = typeof value === "number" ? value : Number(value);
  return Number.isFinite(rating) ? rating : DEFAULT_USER_PUZZLE_RATING;
}

/** Expected score for the user against a puzzle of the given rating, Elo-style. */
export function calculateExpectedScore(
  userRating: number,
  puzzleRating: number,
): number {
  const ratingDifference = puzzleRating - userRating;
  const denominator = 1 + Math.pow(10, ratingDifference / 400);
  return 1 / denominator;
}

/**
 * New user puzzle rating after attempting a puzzle. Uses a higher K-factor
 * until the user has moved off the default rating (provisional period).
 */
export function calculateNewUserRating(
  userRating: number,
  puzzleRating: number,
  isCompleted: boolean,
): number {
  const actualScore = isCompleted ? 1 : 0;
  const kFactor = userRating === DEFAULT_USER_PUZZLE_RATING ? 40 : 100;
  const expectedScore = calculateExpectedScore(userRating, puzzleRating);
  return Math.round(userRating + kFactor * (actualScore - expectedScore));
}
