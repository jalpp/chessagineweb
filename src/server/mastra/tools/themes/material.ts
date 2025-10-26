import { MaterialInfo, PIECE_VALUES } from "../types";
import { Chess, Color, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, WHITE, BLACK } from "chess.js";
import { getPiecePlacement } from "./piecePlacement";

export function getMaterialInfo(chess: Chess, side: Color): MaterialInfo {

  const pieces = getPiecePlacement(chess, side);
  
  const counts = {
    pawns: pieces.pawnplacement.length,
    knights: pieces.knightplacement.length,
    bishops: pieces.bishopplacement.length,
    rooks: pieces.rookplacement.length,
    queens: pieces.queenplacement.length,
  };

  const materialValue = 
    counts.pawns * PIECE_VALUES[PAWN] +
    counts.knights * PIECE_VALUES[KNIGHT] +
    counts.bishops * PIECE_VALUES[BISHOP] +
    counts.rooks * PIECE_VALUES[ROOK] +
    counts.queens * PIECE_VALUES[QUEEN];

  // Calculate opponent's material for advantage calculation
  const enemySide = side === WHITE ? BLACK : WHITE;
  const enemyPieces = getPiecePlacement(chess, enemySide);
  
  const enemyCounts = {
    pawns: enemyPieces.pawnplacement.length,
    knights: enemyPieces.knightplacement.length,
    bishops: enemyPieces.bishopplacement.length,
    rooks: enemyPieces.rookplacement.length,
    queens: enemyPieces.queenplacement.length,
  };

  const enemyMaterialValue = 
    enemyCounts.pawns * PIECE_VALUES[PAWN] +
    enemyCounts.knights * PIECE_VALUES[KNIGHT] +
    enemyCounts.bishops * PIECE_VALUES[BISHOP] +
    enemyCounts.rooks * PIECE_VALUES[ROOK] +
    enemyCounts.queens * PIECE_VALUES[QUEEN];

  // Material advantage: positive = we have more, negative = opponent has more
  const materialAdvantage = materialValue - enemyMaterialValue;
  
  // Add bonus for bishop pair (bishops work better together)
  const bishopPairBonus = counts.bishops >= 2 ? 0.5 : 0;
  const enemyBishopPairBonus = enemyCounts.bishops >= 2 ? 0.5 : 0;
  
  const adjustedAdvantage = materialAdvantage + bishopPairBonus - enemyBishopPairBonus;

  return {
    materialcount: counts.rooks + counts.bishops + counts.pawns + counts.knights + counts.queens,
    materialvalue: materialValue,
    piececount: counts,
    bishoppair: counts.bishops >= 2,
    materialadvantage: adjustedAdvantage // Add this new field for normalized scoring
  };
}