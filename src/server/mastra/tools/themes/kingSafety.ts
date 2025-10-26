import { Color, Chess, PAWN, WHITE, BLACK, Square, KING, QUEEN } from "chess.js";
import { KingSafety } from "../types";

export function getKingSafety(chess: Chess, side: Color): KingSafety {
  const enemySide = side === WHITE ? BLACK : WHITE;
  const kingSquare = chess.findPiece({type: KING, color: side})[0] as Square;
  
  if (!kingSquare) {
    return {
      kingsquare: '',
      attackerscount: 0,
      defenderscount: 0,
      pawnshield: 0,
      kingsafetysadvantage: 0,
      cancastle: false,
      hascastled: false
    };
  }
  
  const attackers = chess.attackers(kingSquare, enemySide);
  const defenders = chess.attackers(kingSquare, side);
  const pawnShield = calculatePawnShield(chess, kingSquare, side);
  const castlingRights = chess.getCastlingRights(side);
  const canCastle = castlingRights[KING] || castlingRights[QUEEN];
  const hascastled = hasKingCastled(chess, side);
  
  // Calculate our king safety score
  const ourBaseSafety = defenders.length * 5 + pawnShield * 2;
  const ourDanger = attackers.length * 10;
  const ourCastlingBonus = (canCastle ? 1 : 0) + (hascastled ? 2 : 0);
  const ourSafetyScore = ourBaseSafety - ourDanger + ourCastlingBonus;
  
  // Calculate enemy king safety score for comparison
  const enemyKingSquare = chess.findPiece({type: KING, color: enemySide})[0] as Square;
  let enemySafetyScore = 0;
  
  if (enemyKingSquare) {
    const enemyAttackers = chess.attackers(enemyKingSquare, side);
    const enemyDefenders = chess.attackers(enemyKingSquare, enemySide);
    const enemyPawnShield = calculatePawnShield(chess, enemyKingSquare, enemySide);
    const enemyCastlingRights = chess.getCastlingRights(enemySide);
    const enemyCanCastle = enemyCastlingRights[KING] || enemyCastlingRights[QUEEN];
    const enemyHasCastled = hasKingCastled(chess, enemySide);
    
    const enemyBaseSafety = enemyDefenders.length * 5 + enemyPawnShield * 2;
    const enemyDanger = enemyAttackers.length * 10;
    const enemyCastlingBonus = (enemyCanCastle ? 1 : 0) + (enemyHasCastled ? 2 : 0);
    enemySafetyScore = enemyBaseSafety - enemyDanger + enemyCastlingBonus;
  }
  
  // King safety advantage: our safety minus enemy safety
  // Positive = our king is safer
  // Negative = enemy king is safer
  const safetyAdvantage = ourSafetyScore - enemySafetyScore;
  
  return {
    kingsquare: kingSquare,
    attackerscount: attackers.length,
    defenderscount: defenders.length,
    pawnshield: pawnShield,
    kingsafetysadvantage: safetyAdvantage,
    cancastle: canCastle,
    hascastled: hascastled
  };
}

export function calculatePawnShield(chess: Chess, kingSquare: Square, side: Color): number {
  const kingFile = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
  const kingRank = parseInt(kingSquare[1]) - 1;
  const direction = side === WHITE ? 1 : -1;
  
  let pawnShield = 0;
  
  // Check squares in front of king
  for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
    const file = kingFile + fileOffset;
    if (file < 0 || file > 7) continue;
    
    for (let rankOffset = 1; rankOffset <= 2; rankOffset++) {
      const rank = kingRank + direction * rankOffset;
      if (rank < 0 || rank > 7) continue;
      
      const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1) as Square;
      const piece = chess.get(square);
      
      if (piece && piece.type === PAWN && piece.color === side) {
        pawnShield += rankOffset === 1 ? 2 : 1; // Closer pawns worth more
      }
    }
  }
  
  return pawnShield;
}

function hasKingCastled(chess: Chess, side: Color): boolean {
  const kingSquare = chess.findPiece({type: KING, color: side})[0];
  if (!kingSquare) return false;
  
  const expectedSquare = side === WHITE ? 'e1' : 'e8';
  return kingSquare !== expectedSquare;
}