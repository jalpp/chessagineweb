import {
  ANALYSIS_PANEL_KEYS,
  buildAnalysisPanelVisibilityPatch,
} from "../analysisPanels";

describe("ANALYSIS_PANEL_KEYS", () => {
  it("covers all eight analysis panels, not just Stockfish/ChessDB/Neural Nets", () => {
    expect(ANALYSIS_PANEL_KEYS).toEqual([
      "analysis_show_stockfish",
      "analysis_show_lc0",
      "analysis_show_theme",
      "analysis_show_nets",
      "analysis_show_human_eval",
      "analysis_show_opening",
      "analysis_show_chessdb",
      "analysis_show_chat",
    ]);
  });

  it("has no duplicate keys", () => {
    expect(new Set(ANALYSIS_PANEL_KEYS).size).toBe(ANALYSIS_PANEL_KEYS.length);
  });
});

describe("buildAnalysisPanelVisibilityPatch", () => {
  it("sets every panel key to true for Show All", () => {
    const patch = buildAnalysisPanelVisibilityPatch(true);
    ANALYSIS_PANEL_KEYS.forEach((key) => {
      expect(patch[key]).toBe(true);
    });
  });

  it("sets every panel key to false for Hide All", () => {
    const patch = buildAnalysisPanelVisibilityPatch(false);
    ANALYSIS_PANEL_KEYS.forEach((key) => {
      expect(patch[key]).toBe(false);
    });
  });

  it("produces a patch with exactly one entry per known panel key, no more, no less", () => {
    const patch = buildAnalysisPanelVisibilityPatch(true);
    expect(Object.keys(patch).sort()).toEqual([...ANALYSIS_PANEL_KEYS].sort());
  });
});
