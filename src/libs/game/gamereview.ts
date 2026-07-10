import { MoveQuality } from "../agine/helper";
import { LineEval } from "@jalpp/stockfishts";
import { Color } from "chess.js";

export const centipawnToWinRate = (centipawn: number): number => {
  const clampedCp = Math.max(-1100, Math.min(centipawn, 1100));
  const conversionFactor = -0.0038988;
  const probability = 2 / (1 + Math.exp(conversionFactor * clampedCp)) - 1;
  return 55 + 55 * probability;
};

// Convert mate score to win percentage (from White's perspective)
export const mateToWinRate = (mateDistance: number): number => {
  if (mateDistance === 0) return 50;
  return mateDistance > 0 ? 100 : 0;
};

// Convert evaluation to win percentage (always from White's perspective)
export const evaluationToWinRate = (
  evaluation: LineEval | undefined,
): number => {
  if (!evaluation) return 50;

  if (evaluation.cp !== undefined) {
    return centipawnToWinRate(evaluation.cp);
  }

  if (evaluation.mate !== undefined) {
    return mateToWinRate(evaluation.mate);
  }

  return 50;
};

// Normalize ChessDB score based on turn
export function normalizeChessDBScore(score: number, turn: Color): number {
  if (turn === "b") {
    return -score;
  }
  return score;
}

// Convert percentage string to number
export function percentToNumber(percentStr: string): number {
  return parseFloat(percentStr.replace("%", "").trim());
}

export const getHasChangedGameOutcome = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
): boolean => {
  const winPercentageDiff = positionWinPercentage - lastPositionWinPercentage;
  return (
    winPercentageDiff > 10 &&
    ((lastPositionWinPercentage < 50 && positionWinPercentage > 50) ||
      (lastPositionWinPercentage > 50 && positionWinPercentage < 50))
  );
};

export const getIsTheOnlyGoodMove = (
  positionWinPercentage: number,
  lastPositionAlternativeLineWinPercentage: number,
): boolean => {
  const winPercentageDiff =
    positionWinPercentage - lastPositionAlternativeLineWinPercentage;
  return winPercentageDiff > 10;
};

export const isLosingOrAlternateCompletelyWinning = (
  positionWinPercentage: number,
  lastPositionAlternativeLineWinPercentage: number,
): boolean => {
  const isLosing = positionWinPercentage < 50;
  const isAlternateCompletelyWinning =
    lastPositionAlternativeLineWinPercentage > 97;

  return isLosing || isAlternateCompletelyWinning;
};

export const isVeryGoodMove = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  lastPositionAlternativeLineWinPercentage: number | undefined,
): boolean => {
  if (!lastPositionAlternativeLineWinPercentage) return false;

  const winPercentageDiff = positionWinPercentage - lastPositionWinPercentage;
  if (winPercentageDiff < -2) return false;

  if (
    isLosingOrAlternateCompletelyWinning(
      positionWinPercentage,
      lastPositionAlternativeLineWinPercentage,
    )
  ) {
    return false;
  }

  const hasChangedGameOutcome = getHasChangedGameOutcome(
    lastPositionWinPercentage,
    positionWinPercentage,
  );

  const isTheOnlyGoodMove = getIsTheOnlyGoodMove(
    positionWinPercentage,
    lastPositionAlternativeLineWinPercentage,
  );

  return hasChangedGameOutcome || isTheOnlyGoodMove;
};

export const getMoveBasicClassification = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  blunderThreshold = 20,
  mistakeThreshold = 10,
): MoveQuality => {
  const winPercentageDiff = positionWinPercentage - lastPositionWinPercentage;

  if (winPercentageDiff < -blunderThreshold) return "Blunder";
  if (winPercentageDiff < -mistakeThreshold) return "Mistake";
  if (winPercentageDiff < -5) return "Dubious";
  if (winPercentageDiff < -2) return "Good";
  return "Very Good";
};
