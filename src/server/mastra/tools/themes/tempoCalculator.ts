import { Color } from "chess.js";
import { BoardState, SideStateScores } from "../types";
import { TacticalBoard } from "./tacticalBoard";

export interface TempoScore {
  developmentTempo: number;
  initiativeTempo: number;
  attackTempo: number;
  mobilityTempo: number;
  totalTempo: number;
}

export class TempoCalculator {
  private boardstate: BoardState;
  private tactics: TacticalBoard;
  private side: Color;

  constructor(state: BoardState, tactics: TacticalBoard, side: Color) {
    this.boardstate = state;
    this.tactics = tactics;
    this.side = side;
  }

  private get currentSideState(): SideStateScores {
    return this.side === "w" ? this.boardstate.white : this.boardstate.black;
  }

  private get opponentSideState(): SideStateScores {
    return this.side === "w" ? this.boardstate.black : this.boardstate.white;
  }

  public calculateTotalTempoAdvantage(): number {
    const tempoScore = this.calculateDetailedTempo();
    return tempoScore.totalTempo;
  }

  public calculateDetailedTempo(): TempoScore {
    const gamePhase = this.boardstate.gamePhase;

    const developmentTempo = this.calculateDevelopmentTempo();
    const initiativeTempo = this.calculateInitiativeTempo();
    const attackTempo = this.calculateAttackTempo();
    const mobilityTempo = this.calculateMobilityTempo();

    let totalTempo = 0;

    // Weight tempo components based on game phase
    if (gamePhase === "opening") {
      totalTempo =
        developmentTempo * 2.0 +
        initiativeTempo * 1.0 +
        attackTempo * 0.5 +
        mobilityTempo * 1.0;
    } else if (gamePhase === "middlegame") {
      totalTempo =
        developmentTempo * 0.5 +
        initiativeTempo * 2.0 +
        attackTempo * 1.5 +
        mobilityTempo * 1.2;
    } else {
      // endgame
      totalTempo =
        developmentTempo * 0.2 +
        initiativeTempo * 1.0 +
        attackTempo * 1.0 +
        mobilityTempo * 1.5;
    }

    return {
      developmentTempo,
      initiativeTempo,
      attackTempo,
      mobilityTempo,
      totalTempo,
    };
  }

  private calculateDevelopmentTempo(): number {
    const ourState = this.currentSideState;
    const oppState = this.opponentSideState;

    // Count developed pieces (off starting squares)
    const ourDeveloped = this.countDevelopedPieces(this.side);
    const oppDeveloped = this.countDevelopedPieces(
      this.side === "w" ? "b" : "w"
    );

    // Each piece ahead in development = +1 tempo
    const developmentDiff = ourDeveloped - oppDeveloped;

    // Castling bonus: being castled is worth ~2 tempi
    const ourCastlingBonus = ourState.kingSafetyScore.hascastled ? 2 : 0;
    const oppCastlingBonus = oppState.kingSafetyScore.hascastled ? 2 : 0;
    const castlingDiff = ourCastlingBonus - oppCastlingBonus;

    // Castling rights (having the option) is worth ~0.5 tempo
    const ourCastlingRights = ourState.kingSafetyScore.cancastle ? 0.5 : 0;
    const oppCastlingRights = oppState.kingSafetyScore.cancastle ? 0.5 : 0;
    const castlingRightsDiff = ourCastlingRights - oppCastlingRights;

    return developmentDiff + castlingDiff + castlingRightsDiff;
  }

  private calculateInitiativeTempo(): number {
    // Use tactical score as proxy for initiative
    const ourTacticalScore = this.tactics.calculateTacticalScore(this.side);
    const oppTacticalScore = this.tactics.calculateTacticalScore(
      this.side === "w" ? "b" : "w"
    );

    // Normalize: every 100 centipawns of tactical advantage ≈ 1 tempo
    const tacticalDiff = (ourTacticalScore - oppTacticalScore) / 100;

    // Space control contributes to initiative
    const spaceAdvantage =
      this.currentSideState.spaceScore.spaceadvantage / 50;

    return tacticalDiff + spaceAdvantage;
  }

  private calculateAttackTempo(): number {
    const ourKingSafety = this.currentSideState.kingSafetyScore;
    const oppKingSafety = this.opponentSideState.kingSafetyScore;

    // If opponent's king is less safe, we have attack tempo
    const kingSafetyDiff =
      oppKingSafety.kingsafetysadvantage - ourKingSafety.kingsafetysadvantage;

    // Attacking opponent's king with more pieces = tempo advantage
    const attackerDiff =
      oppKingSafety.attackerscount - ourKingSafety.attackerscount;

    // Normalize
    return kingSafetyDiff / 50 + attackerDiff * 0.3;
  }

  private calculateMobilityTempo(): number {
    const mobilityAdvantage =
      this.currentSideState.pieceMobilityScore.mobilityadvantage;

    // Every 3 mobility points ≈ 1 tempo
    return mobilityAdvantage / 3;
  }

  private countDevelopedPieces(color: Color): number {
    const state = color === "w" ? this.boardstate.white : this.boardstate.black;
    const placement = state.pieceplacementScore;

    let developed = 0;
    const startingRank = color === "w" ? "1" : "8";
    const pawnRank = color === "w" ? "2" : "7";

    // Count knights developed (not on starting rank)
    developed += placement.knightplacement.filter(
      (sq) => !sq.endsWith(startingRank)
    ).length;

    // Count bishops developed
    developed += placement.bishopplacement.filter(
      (sq) => !sq.endsWith(startingRank)
    ).length;

    // Count rooks developed (off starting rank, but heavy penalty for early development)
    const developedRooks = placement.rookplacement.filter(
      (sq) => !sq.endsWith(startingRank)
    ).length;
    developed += developedRooks * 0.5; // Rooks count less until later

    // Queen developed too early can be negative in opening
    const queenDeveloped = placement.queenplacement.some(
      (sq) => !sq.endsWith(startingRank)
    );
    if (this.boardstate.gamePhase === "opening" && queenDeveloped) {
      // Early queen development can be bad
      developed -= 0.5;
    } else if (queenDeveloped) {
      developed += 0.5;
    }

    // Count pawns that have advanced (minor development factor)
    const advancedPawns = placement.pawnplacement.filter(
      (sq) => !sq.endsWith(pawnRank)
    ).length;
    developed += advancedPawns * 0.1;

    return developed;
  }

  /**
   * Get tempo advantage normalized to [-10, +10] range for easier interpretation
   */
  public getTempoAdvantage(): number {
    const tempo = this.calculateTotalTempoAdvantage();
    // Clamp to reasonable range
    return Math.max(-10, Math.min(10, tempo));
  }

  /**
   * Provides a detailed explanation of what tempo is and how it is calculated.
   * This method is designed to help LLMs or other systems understand the concept of tempo in chess.
   */
  public getTempoExplanation(): string[] {
    const tempoScore = this.calculateDetailedTempo();

    return [
      "Tempo in chess refers to the advantage or initiative a player has in terms of time and activity.",
      "It is a measure of how efficiently a player is developing their pieces, controlling the board, and",
      "putting pressure on their opponent. A higher tempo indicates a more active and advantageous position.",
      "",
      "The tempo is calculated using the following components:",
      `1. Development Tempo: ${tempoScore.developmentTempo.toFixed(2)}`,
      "   Measures how well pieces are developed off their starting squares, including",
      "   bonuses for castling and penalties for early queen development.",
      `2. Initiative Tempo: ${tempoScore.initiativeTempo.toFixed(2)}`,
      "   Evaluates the tactical advantage and space control, using tactical scores and",
      "   space advantage as proxies.",
      `3. Attack Tempo: ${tempoScore.attackTempo.toFixed(2)}`,
      "   Assesses the pressure on the opponent's king, including king safety differences and",
      "   the number of attacking pieces.",
      `4. Mobility Tempo: ${tempoScore.mobilityTempo.toFixed(2)}`,
      "   Quantifies the freedom of movement for pieces, with higher mobility contributing",
      "   to a better tempo.",
      "",
      `Total Tempo: ${tempoScore.totalTempo.toFixed(2)}`,
      "",
      "Each component is weighted differently depending on the game phase (opening, middlegame, or endgame),",
      "and the total tempo is normalized to a range of [-10, +10] for easier interpretation."
    ];
  }
}