import {
  RESULT_BAR_COLORS,
  contrastRatio,
  hasReadableContrast,
} from "../resultBarColors";

describe("contrastRatio", () => {
  it("returns 21 for pure black vs pure white (max contrast)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colors (no contrast)", () => {
    expect(contrastRatio("#f0f0f0", "#f0f0f0")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a = contrastRatio("#f0f0f0", "#000000");
    const b = contrastRatio("#000000", "#f0f0f0");
    expect(a).toBeCloseTo(b, 5);
  });
});

describe("hasReadableContrast", () => {
  it("regression: white text on the near-white result-bar background is unreadable", () => {
    // This is the exact bug being fixed — the white-win-rate segment's
    // text had no explicit color, so in a light/inherited theme it could
    // render as white-on-white and become invisible.
    expect(hasReadableContrast("#f0f0f0", "#ffffff")).toBe(false);
  });

  it("dark text on the near-white background (the fix) is readable", () => {
    expect(hasReadableContrast(RESULT_BAR_COLORS.white.background, RESULT_BAR_COLORS.white.text)).toBe(true);
  });

  it("light text on the black background is readable", () => {
    expect(hasReadableContrast(RESULT_BAR_COLORS.black.background, RESULT_BAR_COLORS.black.text)).toBe(true);
  });

  it("light text on the gray draw background is readable", () => {
    expect(hasReadableContrast(RESULT_BAR_COLORS.draw.background, RESULT_BAR_COLORS.draw.text)).toBe(true);
  });
});

describe("RESULT_BAR_COLORS", () => {
  it("every segment's text/background pairing is readable", () => {
    (Object.keys(RESULT_BAR_COLORS) as Array<keyof typeof RESULT_BAR_COLORS>).forEach((segment) => {
      const { background, text } = RESULT_BAR_COLORS[segment];
      expect(hasReadableContrast(background, text)).toBe(true);
    });
  });

  it("the white segment does not reuse the same color for background and text", () => {
    const { background, text } = RESULT_BAR_COLORS.white;
    expect(background.toLowerCase()).not.toBe(text.toLowerCase());
  });
});
