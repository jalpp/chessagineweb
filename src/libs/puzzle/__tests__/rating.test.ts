import {
  calculateExpectedScore,
  calculateNewUserRating,
  DEFAULT_USER_PUZZLE_RATING,
} from "../rating";

describe("calculateExpectedScore", () => {
  it("returns 0.5 when user and puzzle ratings are equal", () => {
    expect(calculateExpectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  it("returns a lower expected score against a higher-rated puzzle", () => {
    expect(calculateExpectedScore(1500, 1900)).toBeLessThan(0.5);
  });

  it("returns a higher expected score against a lower-rated puzzle", () => {
    expect(calculateExpectedScore(1500, 1100)).toBeGreaterThan(0.5);
  });
});

describe("calculateNewUserRating", () => {
  it("increases rating on a solved puzzle", () => {
    const next = calculateNewUserRating(1500, 1500, true);
    expect(next).toBeGreaterThan(1500);
  });

  it("decreases rating on a failed puzzle", () => {
    const next = calculateNewUserRating(1500, 1500, false);
    expect(next).toBeLessThan(1500);
  });

  it("uses the provisional K-factor (40) only at the default rating", () => {
    const provisional = calculateNewUserRating(
      DEFAULT_USER_PUZZLE_RATING,
      1500,
      true,
    );
    const established = calculateNewUserRating(1550, 1550, true);
    expect(provisional - DEFAULT_USER_PUZZLE_RATING).toBe(20);
    expect(established - 1550).toBe(50);
  });
});
