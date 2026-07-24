/**
 * Every analysis panel that can be individually shown/hidden from the
 * "Analysis Panels" settings gear, keyed by its PersistedSettings field.
 * Single source of truth so "Show All" / "Hide All" and the panel list
 * itself can't drift apart.
 */
export const ANALYSIS_PANEL_KEYS = [
  "analysis_show_stockfish",
  "analysis_show_lc0",
  "analysis_show_theme",
  "analysis_show_nets",
  "analysis_show_human_eval",
  "analysis_show_opening",
  "analysis_show_chessdb",
] as const;

export type AnalysisPanelKey = (typeof ANALYSIS_PANEL_KEYS)[number];

/** Build a settings patch that sets every analysis panel to the same visibility. */
export function buildAnalysisPanelVisibilityPatch(
  visible: boolean,
): Record<AnalysisPanelKey, boolean> {
  return ANALYSIS_PANEL_KEYS.reduce(
    (patch, key) => {
      patch[key] = visible;
      return patch;
    },
    {} as Record<AnalysisPanelKey, boolean>,
  );
}
