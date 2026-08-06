import {
  buildAnalysisChatContext,
  MAX_BOARD_CONTEXT_CHARS,
} from "../chatContext";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("buildAnalysisChatContext", () => {
  it("returns an empty string when there is no FEN", () => {
    expect(buildAnalysisChatContext({ mode: "position", fen: "" })).toBe("");
  });

  it("includes the FEN and mode for a bare position", () => {
    const ctx = buildAnalysisChatContext({ mode: "position", fen: START_FEN });
    expect(ctx).toContain("Analyzing a position");
    expect(ctx).toContain(START_FEN);
  });

  it("omits game-only fields (moves, PGN, review) in position mode", () => {
    const ctx = buildAnalysisChatContext({
      mode: "position",
      fen: START_FEN,
      moveHistorySan: ["e4", "e5"],
      pgn: "1. e4 e5",
    });
    expect(ctx).not.toContain("Moves so far");
    expect(ctx).not.toContain("PGN");
  });

  it("includes move history, PGN, and game info in game mode", () => {
    const ctx = buildAnalysisChatContext({
      mode: "game",
      fen: START_FEN,
      gameInfo: { White: "Alice", Black: "Bob" },
      moveHistorySan: ["e4", "e5", "Nf3"],
      pgn: "1. e4 e5 2. Nf3",
      currentPly: 3,
    });
    expect(ctx).toContain("Reviewing a game");
    expect(ctx).toContain("White: Alice, Black: Bob");
    expect(ctx).toContain("Moves so far: e4 e5 Nf3");
    expect(ctx).toContain("Currently viewing ply: 3");
    expect(ctx).toContain("1. e4 e5 2. Nf3");
  });

  it("drops empty gameInfo values instead of printing 'Key: '", () => {
    const ctx = buildAnalysisChatContext({
      mode: "game",
      fen: START_FEN,
      gameInfo: { White: "Alice", Black: "" },
    });
    expect(ctx).toContain("White: Alice");
    expect(ctx).not.toContain("Black:");
  });

  it("includes the current move's quality and SAN when provided", () => {
    const ctx = buildAnalysisChatContext({
      mode: "game",
      fen: START_FEN,
      gameReview: { currentMoveSan: "Nf3", currentMoveQuality: "Best" },
    });
    expect(ctx).toContain("Move just played: Nf3 (Best)");
  });

  it("includes non-zero game review quality counts, skipping zeros", () => {
    const ctx = buildAnalysisChatContext({
      mode: "game",
      fen: START_FEN,
      gameReview: {
        qualityCounts: { Blunder: 1, Mistake: 0, Best: 5 },
      },
    });
    expect(ctx).toContain("Blunder: 1");
    expect(ctx).toContain("Best: 5");
    expect(ctx).not.toContain("Mistake: 0");
  });

  it("omits the game review summary line entirely when all counts are zero", () => {
    const ctx = buildAnalysisChatContext({
      mode: "game",
      fen: START_FEN,
      gameReview: { qualityCounts: { Blunder: 0, Mistake: 0 } },
    });
    expect(ctx).not.toContain("Game review summary");
  });

  it("includes formatted Stockfish and lc0 lines", () => {
    const ctx = buildAnalysisChatContext({
      mode: "position",
      fen: START_FEN,
      stockfishLines: ["Line 1: +0.32 - e4 e5 Nf3"],
      lc0Lines: ["Line 1: +0.28 - e4 e5 Nc3"],
    });
    expect(ctx).toContain("Stockfish lines:");
    expect(ctx).toContain("Line 1: +0.32 - e4 e5 Nf3");
    expect(ctx).toContain("lc0 lines:");
    expect(ctx).toContain("Line 1: +0.28 - e4 e5 Nc3");
  });

  it("truncates output beyond MAX_BOARD_CONTEXT_CHARS", () => {
    const hugePgn = "1. e4 e5 ".repeat(2000);
    const ctx = buildAnalysisChatContext({
      mode: "game",
      fen: START_FEN,
      pgn: hugePgn,
    });
    expect(ctx.length).toBeLessThanOrEqual(MAX_BOARD_CONTEXT_CHARS + "\n…(truncated)".length);
    expect(ctx.endsWith("…(truncated)")).toBe(true);
  });
});
