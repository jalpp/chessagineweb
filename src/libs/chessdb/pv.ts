import { Chess } from "chess.js";
import type { ChessDbPvResult } from "@jalpp/stockfishts";

export interface FormattedChessDbPv {
  /** Depth ChessDB reached for this line. */
  depth: number;
  /** Raw centipawn score from White's perspective, as returned by ChessDB. */
  scoreCp: number;
  /** Score formatted in pawns with an explicit sign, e.g. "+0.35" / "-1.20" / "0.00". */
  scoreFormatted: string;
  /** The principal variation in SAN, as far as it could be resolved. */
  sanMoves: string[];
  /** The principal variation in UCI, as returned by ChessDB. */
  uciMoves: string[];
}

/**
 * Convert a UCI move sequence starting from `fen` into SAN, stopping at the
 * first illegal/unresolvable move rather than throwing.
 */
export function uciLineToSan(fen: string, uciMoves: string[]): string[] {
  if (!fen || !uciMoves || uciMoves.length === 0) return [];
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) break;
    try {
      const move = chess.move({
        from: uci.substring(0, 2),
        to: uci.substring(2, 4),
        promotion: uci.length > 4 ? uci.substring(4) : undefined,
      });
      if (!move) break;
      san.push(move.san);
    } catch {
      break;
    }
  }
  return san;
}

/**
 * Normalize a ChessDB `queryPv` result into UI-friendly fields: depth, a
 * formatted score, and the PV in SAN. Uses ChessDB's own `pvSAN` when it's
 * present and matches `pv` in length, and otherwise derives SAN from `pv` +
 * `fen` via chess.js so the UI still gets readable moves.
 */
export function formatChessDbPv(
  fen: string,
  result: ChessDbPvResult,
): FormattedChessDbPv {
  const uciMoves = result.pv ?? [];
  const sanMoves =
    result.pvSAN && result.pvSAN.length === uciMoves.length
      ? result.pvSAN
      : uciLineToSan(fen, uciMoves);

  const scoreCp = result.score ?? 0;
  const scorePawns = scoreCp / 100;
  const scoreFormatted =
    scorePawns > 0
      ? `+${scorePawns.toFixed(2)}`
      : scorePawns < 0
        ? scorePawns.toFixed(2)
        : "0.00";

  return {
    depth: result.depth,
    scoreCp,
    scoreFormatted,
    sanMoves,
    uciMoves,
  };
}
