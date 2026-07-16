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
