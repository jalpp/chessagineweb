/**
 * Background + text color pairs for the white/draw/black segments of the
 * opening explorer's result bars (per-move rows and the "Total" row).
 *
 * Kept as a single source of truth so the light "white" segment always
 * pairs with dark text and the dark "draw"/"black" segments always pair
 * with light text — the earlier bug was the white segment's text having no
 * explicit color, so it inherited the app's light theme text color and
 * became unreadable against its own light background.
 */
export const RESULT_BAR_COLORS = {
  white: { background: "#f0f0f0", text: "#000000" },
  draw: { background: "#888888", text: "#ffffff" },
  black: { background: "#000000", text: "#ffffff" },
} as const;

export type ResultBarSegment = keyof typeof RESULT_BAR_COLORS;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

// Relative luminance per WCAG, used to check text/background contrast.
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const channel = c / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1 = no contrast, 21 = max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when text drawn in `text` over `background` meets a basic readability bar (WCAG's 3:1 threshold for large/bold text, which fits this bold result-bar text). */
export function hasReadableContrast(background: string, text: string): boolean {
  return contrastRatio(background, text) >= 3;
}
