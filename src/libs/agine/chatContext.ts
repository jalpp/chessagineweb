/**
 * Builds a compact, plain-text "live board context" block that is sent
 * alongside chat messages from the in-panel Agine Chat (see
 * src/componets/chat/AnalysisChatPanel.tsx). The goal is to give the
 * agent everything it needs to discuss the current position/game
 * (FEN, PGN, engine lines, game review) without having to round-trip
 * through the MCP server for information the page already has in
 * memory.
 *
 * Kept as a pure function so it's cheap to unit test independent of
 * React / the chat transport.
 */

export type AnalysisChatMode = "position" | "game";

export interface AnalysisChatGameReviewSummary {
  /** Move-quality label for the move at the currently viewed ply, if any. */
  currentMoveQuality?: string;
  /** SAN of the move at the currently viewed ply, if any. */
  currentMoveSan?: string;
  /** Counts of each move quality across the whole reviewed game, e.g. { Blunder: 1, Mistake: 2 }. */
  qualityCounts?: Partial<Record<string, number>>;
}

export interface AnalysisChatContextInput {
  mode: AnalysisChatMode;
  fen: string;
  /** Annotated PGN movetext (game mode only). */
  pgn?: string;
  /** Game headers, e.g. White/Black/Event/Result. */
  gameInfo?: Record<string, string>;
  /** SAN moves from the start of the game up to (and including) the current ply. */
  moveHistorySan?: string[];
  /** Ply the user is currently looking at, 0 = starting position. */
  currentPly?: number;
  /** Pre-formatted Stockfish lines, e.g. "Line 1: +0.32 - e4 e5 Nf3" (see formatLineForLLM in useAgine). */
  stockfishLines?: string[];
  /** Pre-formatted lc0 lines, same shape as stockfishLines. */
  lc0Lines?: string[];
  /** Game review info for the currently viewed move / whole game. */
  gameReview?: AnalysisChatGameReviewSummary;
}

/** Hard cap on the context block sent to the API — keeps requests small and cheap. */
export const MAX_BOARD_CONTEXT_CHARS = 6000;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n…(truncated)";
}

/**
 * Builds the "## Live Board Context" markdown block. Returns an empty
 * string if there's nothing meaningful to report (no FEN), so callers
 * can skip sending it entirely.
 */
export function buildAnalysisChatContext(
  input: AnalysisChatContextInput
): string {
  if (!input.fen) return "";

  const lines: string[] = [];

  lines.push(`Mode: ${input.mode === "game" ? "Reviewing a game" : "Analyzing a position"}`);
  lines.push(`Current FEN: ${input.fen}`);

  if (input.mode === "game") {
    if (input.gameInfo && Object.keys(input.gameInfo).length > 0) {
      const headerLine = Object.entries(input.gameInfo)
        .filter(([, v]) => !!v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      if (headerLine) lines.push(`Game info: ${headerLine}`);
    }

    if (input.moveHistorySan && input.moveHistorySan.length > 0) {
      lines.push(`Moves so far: ${input.moveHistorySan.join(" ")}`);
    }

    if (input.currentPly !== undefined) {
      lines.push(`Currently viewing ply: ${input.currentPly}`);
    }

    if (input.gameReview?.currentMoveSan) {
      const quality = input.gameReview.currentMoveQuality
        ? ` (${input.gameReview.currentMoveQuality})`
        : "";
      lines.push(`Move just played: ${input.gameReview.currentMoveSan}${quality}`);
    }

    if (
      input.gameReview?.qualityCounts &&
      Object.values(input.gameReview.qualityCounts).some((n) => (n ?? 0) > 0)
    ) {
      const counts = Object.entries(input.gameReview.qualityCounts)
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([quality, n]) => `${quality}: ${n}`)
        .join(", ");
      lines.push(`Game review summary: ${counts}`);
    }

    if (input.pgn) {
      lines.push("", "PGN (with any existing annotations):", input.pgn.trim());
    }
  }

  if (input.stockfishLines && input.stockfishLines.length > 0) {
    lines.push("", "Stockfish lines:", ...input.stockfishLines);
  }

  if (input.lc0Lines && input.lc0Lines.length > 0) {
    lines.push("", "lc0 lines:", ...input.lc0Lines);
  }

  const block = lines.join("\n");
  return truncate(block, MAX_BOARD_CONTEXT_CHARS);
}
