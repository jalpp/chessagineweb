

export type AnalysisChatMode = "position" | "game";

export interface AnalysisChatGameReviewSummary {
  /** Move-quality label for the move at the currently viewed ply, if any. */
  currentMoveQuality?: string;
  /** SAN of the move at the currently viewed ply, if any. */
  currentMoveSan?: string;
  /** Counts of each move quality across the whole reviewed game, e.g. { Blunder: 1, Mistake: 2 }. */
  qualityCounts?: Partial<Record<string, number>>;
}

/** A single ChessDB candidate move for the current position. */
export interface AnalysisChatDbMove {
  san: string;
  score?: string;
  winrate?: string;
  note?: string;
}

export interface AnalysisChatContextInput {
  mode: AnalysisChatMode;
  fen: string;
  /** Annotated PGN movetext (game mode only). */
  pgn?: string;
  /** Game headers, e.g. White/Black/Event/Result. */
  gameInfo?: Record<string, string>;

  moveHistorySan?: string[];
  /** Ply the user is currently looking at, 0 = starting position. */
  currentPly?: number;
  /** Pre-formatted Stockfish lines, e.g. "Line 1: +0.32 - e4 e5 Nf3" (see formatLineForLLM in useAgine). */
  stockfishLines?: string[];
  /** Pre-formatted lc0 lines, same shape as stockfishLines. */
  lc0Lines?: string[];
  /** Game review info for the currently viewed move / whole game. */
  gameReview?: AnalysisChatGameReviewSummary;
  /** ChessDB's top candidate moves for the current position, if any. */
  chessdbMoves?: AnalysisChatDbMove[];
  /** Opening name from the master-games/Lichess opening database, if the
   *  current position matches a known opening. */
  openingName?: string;
  /** ECO code paired with openingName, if known. */
  openingEco?: string;

  openingGameCount?: number;
}

/** Hard cap on the context block sent to the API — keeps requests small and cheap. */
export const MAX_BOARD_CONTEXT_CHARS = 6000;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n…(truncated)";
}


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
  }


  if (input.moveHistorySan && input.moveHistorySan.length > 0) {
    lines.push(`Moves so far: ${input.moveHistorySan.join(" ")}`);
  } else if (input.mode === "position") {
    lines.push(
      "Moves so far: none provided — this position was set up directly " +
      "(e.g. a pasted FEN or an edited board), not reached by playing out " +
      "a specific line. Don't assume or invent a move sequence that led here."
    );
  }

  if (input.mode === "game") {
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

  const hasKnownOpening =
    !!input.openingName &&
    input.openingName.toLowerCase() !== "unknown" &&
    (input.openingGameCount === undefined || input.openingGameCount > 0);

  if (hasKnownOpening) {
    const eco = input.openingEco ? `${input.openingEco} — ` : "";
    const games =
      input.openingGameCount !== undefined
        ? ` (${input.openingGameCount.toLocaleString()} games in database)`
        : "";
    lines.push("", `Opening: ${eco}${input.openingName}${games}`);
  } else if (input.openingName !== undefined || input.openingGameCount !== undefined) {

    lines.push(
      "",
      "Opening: not found in the opening database — this is an unusual or " +
      "off-book position. Do NOT assume it matches a known named opening " +
      "or well-known game; discuss only what's actually on the board."
    );
  }

  if (input.chessdbMoves && input.chessdbMoves.length > 0) {
    lines.push("", "ChessDB candidate moves:");
    for (const m of input.chessdbMoves) {
      const parts = [m.san];
      if (m.score) parts.push(`eval ${m.score}`);
      if (m.winrate) parts.push(`winrate ${m.winrate}%`);
      if (m.note) parts.push(m.note);
      lines.push(`- ${parts.join(", ")}`);
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
