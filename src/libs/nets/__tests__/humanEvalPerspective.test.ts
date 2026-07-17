import { getWhiteWinProbability } from "../types";

describe("getWhiteWinProbability", () => {
  it("returns the value unchanged (it's already White-perspective, like Stockfish's cp)", () => {
    expect(getWhiteWinProbability(0.7)).toBe(0.7);
  });

  it("does not flip a low value into a high one", () => {
    // Regression test for the original bug: White was crushing (Stockfish
    // +3.27) but the bar showed Black as favored because the value was
    // incorrectly flipped based on side-to-move. Maia's value is already
    // White-perspective, so a value like 0.85 must stay 0.85 (White
    // favored), not become 0.15.
    expect(getWhiteWinProbability(0.85)).toBe(0.85);
    expect(getWhiteWinProbability(0.15)).toBe(0.15);
  });

  it("returns 0.5 for an undefined value", () => {
    expect(getWhiteWinProbability(undefined)).toBe(0.5);
  });

  it("returns 0.5 for a null value", () => {
    expect(getWhiteWinProbability(null)).toBe(0.5);
  });

  it("returns 0.5 for a NaN value", () => {
    expect(getWhiteWinProbability(NaN)).toBe(0.5);
  });

  it("clamps a value above 1", () => {
    expect(getWhiteWinProbability(1.4)).toBe(1);
  });

  it("clamps a negative value", () => {
    expect(getWhiteWinProbability(-0.3)).toBe(0);
  });

  it("clamps exactly to the 0 and 1 boundaries", () => {
    expect(getWhiteWinProbability(0)).toBe(0);
    expect(getWhiteWinProbability(1)).toBe(1);
  });
});
