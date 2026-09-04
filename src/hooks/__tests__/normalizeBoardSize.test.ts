import { normalizeBoardSize } from "../usePersistedStorage";

describe("normalizeBoardSize", () => {
  it("passes through a valid finite number", () => {
    expect(normalizeBoardSize(600)).toBe(600);
  });

  it("falls back to 480 for undefined (e.g. a synced doc missing the field)", () => {
    expect(normalizeBoardSize(undefined)).toBe(480);
  });

  it("falls back to 480 for a non-numeric string", () => {
    expect(normalizeBoardSize("forest")).toBe(480);
  });

  it("falls back to 480 for NaN", () => {
    expect(normalizeBoardSize(NaN)).toBe(480);
  });

  it("coerces a numeric string to a number", () => {
    expect(normalizeBoardSize("550")).toBe(550);
  });
});
