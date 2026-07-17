import {
  estimateWdlFromWinProbability,
  clampToNearestMaiaRating,
  maiaModelKey,
  findRatingEval,
} from "../humanEvalBar";
import { MAIA3_RATING_VALUES } from "../types";

describe("estimateWdlFromWinProbability", () => {
  it("always sums to exactly 100", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      const { win, draw, loss } = estimateWdlFromWinProbability(p);
      expect(win + draw + loss).toBe(100);
    }
  });

  it("gives an even split with the highest draw share at p = 0.5", () => {
    const { win, draw, loss } = estimateWdlFromWinProbability(0.5);
    expect(win).toBe(loss);
    expect(draw).toBeGreaterThan(win);
    expect(draw).toBeGreaterThan(loss);
  });

  it("favors White's win share as p increases", () => {
    const low = estimateWdlFromWinProbability(0.3);
    const high = estimateWdlFromWinProbability(0.8);
    expect(high.win).toBeGreaterThan(low.win);
  });

  it("is symmetric: win/loss swap when p and 1-p are compared, draw stays the same", () => {
    const a = estimateWdlFromWinProbability(0.75);
    const b = estimateWdlFromWinProbability(0.25);
    expect(a.win).toBe(b.loss);
    expect(a.loss).toBe(b.win);
    expect(a.draw).toBe(b.draw);
  });

  it("draw share shrinks as the position becomes more decisive", () => {
    const even = estimateWdlFromWinProbability(0.5);
    const slight = estimateWdlFromWinProbability(0.65);
    const decisive = estimateWdlFromWinProbability(0.95);
    expect(even.draw).toBeGreaterThan(slight.draw);
    expect(slight.draw).toBeGreaterThan(decisive.draw);
  });

  it("clamps out-of-range input before estimating", () => {
    const overOne = estimateWdlFromWinProbability(1.5);
    const atOne = estimateWdlFromWinProbability(1);
    expect(overOne).toEqual(atOne);

    const belowZero = estimateWdlFromWinProbability(-0.5);
    const atZero = estimateWdlFromWinProbability(0);
    expect(belowZero).toEqual(atZero);
  });

  it("keeps every component non-negative", () => {
    [0, 0.1, 0.5, 0.9, 1].forEach((p) => {
      const { win, draw, loss } = estimateWdlFromWinProbability(p);
      expect(win).toBeGreaterThanOrEqual(0);
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(loss).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("clampToNearestMaiaRating", () => {
  it("returns an exact rating unchanged", () => {
    expect(clampToNearestMaiaRating(1600)).toBe(1600);
  });

  it("snaps to the nearest available rating", () => {
    expect(clampToNearestMaiaRating(1560)).toBe(1600);
    expect(clampToNearestMaiaRating(1549)).toBe(1500);
  });

  it("breaks an exact tie by keeping the lower rating", () => {
    expect(clampToNearestMaiaRating(1550)).toBe(1500);
  });

  it("clamps below the minimum to 600", () => {
    expect(clampToNearestMaiaRating(200)).toBe(600);
  });

  it("clamps above the maximum to 2600", () => {
    expect(clampToNearestMaiaRating(4000)).toBe(2600);
  });

  it("falls back to the top rating for non-finite input", () => {
    expect(clampToNearestMaiaRating(NaN)).toBe(2600);
    expect(clampToNearestMaiaRating(Infinity)).toBe(2600);
  });

  it("only ever returns a value from MAIA3_RATING_VALUES", () => {
    [0, 599, 601, 1234, 2601, 999999].forEach((rating) => {
      expect(MAIA3_RATING_VALUES).toContain(clampToNearestMaiaRating(rating));
    });
  });
});

describe("maiaModelKey", () => {
  it("builds the expected lookup key", () => {
    expect(maiaModelKey(2600)).toBe("maia_kdd_2600");
    expect(maiaModelKey(600)).toBe("maia_kdd_600");
  });

  it("snaps to the nearest rating before building the key", () => {
    expect(maiaModelKey(1580)).toBe("maia_kdd_1600");
  });
});

describe("findRatingEval", () => {
  const results = [
    { rating: 600, note: "a" },
    { rating: 1600, note: "b" },
    { rating: 2600, note: "c" },
  ];

  it("finds the entry matching the (snapped) rating", () => {
    expect(findRatingEval(results, 1600)).toEqual({ rating: 1600, note: "b" });
    expect(findRatingEval(results, 1580)).toEqual({ rating: 1600, note: "b" });
  });

  it("returns undefined when no entry matches", () => {
    expect(findRatingEval(results, 2200)).toBeUndefined();
  });

  it("returns undefined for missing results", () => {
    expect(findRatingEval(undefined, 1600)).toBeUndefined();
    expect(findRatingEval(null, 1600)).toBeUndefined();
  });

  it("returns undefined for an empty results array", () => {
    expect(findRatingEval([], 1600)).toBeUndefined();
  });
});
