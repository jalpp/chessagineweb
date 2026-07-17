import { Chess } from "chess.js";

/**
 * Apply a UCI move (e.g. "e2e4", "e7e8q") to a FEN and return the
 * resulting FEN, or null if the move is illegal or malformed.
 */
export function applyUciMove(fen: string, uci: string): string | null {
  if (!fen || !uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci.substring(4) : undefined,
    });
    return move ? chess.fen() : null;
  } catch {
    return null;
  }
}

/**
 * Apply a SAN move (e.g. "Nf3", "O-O") to a FEN and return the
 * resulting FEN, or null if the move is illegal or malformed.
 */
export function applySanMove(fen: string, san: string): string | null {
  if (!fen || !san) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    return move ? chess.fen() : null;
  } catch {
    return null;
  }
}

/**
 * Convert a SAN move to UCI notation ("e2e4") for a given FEN.
 * Returns null if the SAN move is illegal or malformed.
 */
export function sanToUci(fen: string, san: string): string | null {
  if (!fen || !san) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    if (!move) return null;
    return move.from + move.to + (move.promotion || "");
  } catch {
    return null;
  }
}

export interface MoveChainStep {
  /** SAN of this move. */
  san: string;
  /** UCI of this move (normalized, always includes promotion when present). */
  uci: string;
  /** Resulting FEN after this move. */
  fen: string;
}

/**
 * Apply a sequence of UCI moves (e.g. a Stockfish/ChessDB principal
 * variation) starting from `startFen`, one at a time, and return the
 * resulting chain of {san, uci, fen} steps. Stops at the first
 * illegal/malformed move rather than throwing, so a partially-valid PV
 * still yields whatever prefix was legal.
 */
export function buildMoveChain(
  startFen: string,
  uciMoves: string[],
): MoveChainStep[] {
  const steps: MoveChainStep[] = [];
  if (!startFen || !uciMoves || uciMoves.length === 0) return steps;

  let chess: Chess;
  try {
    chess = new Chess(startFen);
  } catch {
    return steps;
  }

  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) break;
    let move;
    try {
      move = chess.move({
        from: uci.substring(0, 2),
        to: uci.substring(2, 4),
        promotion: uci.length > 4 ? uci.substring(4) : undefined,
      });
    } catch {
      break;
    }
    if (!move) break;
    steps.push({
      san: move.san,
      uci: move.from + move.to + (move.promotion || ""),
      fen: chess.fen(),
    });
  }

  return steps;
}

/**
 * Return the move-number label to show before a PV move (e.g. "14." for a
 * white move, "14..." for a black move that starts the displayed line),
 * or null when no label is needed (a black move that isn't the first move
 * shown). `fenBeforeMove` is the FEN of the position *before* the move is
 * played. Returns null for an invalid/malformed FEN.
 */
export function pvMoveLabel(
  fenBeforeMove: string,
  isFirstMove: boolean,
): string | null {
  if (!fenBeforeMove) return null;
  const parts = fenBeforeMove.split(" ");
  const sideToMove = parts[1];
  const fullMoveNumber = parts[5];
  if (!sideToMove || !fullMoveNumber || !/^\d+$/.test(fullMoveNumber)) {
    return null;
  }
  if (sideToMove === "w") return `${fullMoveNumber}.`;
  if (sideToMove === "b" && isFirstMove) return `${fullMoveNumber}...`;
  return null;
}
