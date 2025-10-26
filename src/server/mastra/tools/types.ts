import { Square, PAWN, KING, KNIGHT, QUEEN, BISHOP, ROOK } from "chess.js";

export const BOARD_CENTRE: Square[] = ["c4","c5","d4","d5","e4","e5","f4","f5"];
export const BOARD_FLANK: Square[] = ["a4", "a5", "b4", "b5", "h4", "h5", "g4", "g5"];

export const PIECE_VALUES = {
  [PAWN]: 1,
  [KNIGHT]: 3,
  [BISHOP]: 3,
  [ROOK]: 5,
  [QUEEN]: 9,
  [KING]: 0
};

export interface CastleRights {
  queenside: boolean;
  kingside: boolean;
}

export interface PositionalPawn {
  doublepawncount: number;
  isolatedpawncount: number;
  backwardpawncount: number;
  passedpawncount: number;
  positionalAdvatange: number;
}

export interface SpaceControl {
  centerspacecontrolscore: number;
  flankspacecontrolscore: number;
  totalspacecontrolscore: number;
  spaceadvantage: number;
}

export interface SidePiecePlacement {
  kingplacement: string[];
  queenplacement: string[];
  bishopplacement: string[];
  knightplacement: string[];
  rookplacement: string[];
  pawnplacement: string[];
}


export interface PieceAttackDefendInfo{
  attackerscount: number;
  defenderscount: number;
  attackers: string[];
  defenders: string[];
}

export interface KingSafety {
  kingsquare: string;
  attackerscount: number;
  defenderscount: number;
  pawnshield: number;
  kingsafetysadvantage: number;
  cancastle: boolean;
  hascastled: boolean;
}

export interface SideAttackerDefenders {
  pawnInfo: PieceAttackDefendInfo,
  knightInfo: PieceAttackDefendInfo,
  bishopInfo: PieceAttackDefendInfo,
  rookInfo: PieceAttackDefendInfo,
  queenInfo: PieceAttackDefendInfo,
  kingInfo: undefined
}

export interface PieceMobility {
  queenmobility: number;
  rookmobility: number;
  bishopmobility: number;
  knightmobility: number;
  totalmobility: number;
  mobilityadvantage: number;
}

export interface SideSquareControl{
  lightSquares: string[],
  darkSquares: string[],
  lightSquareControl: number,
  darkSqaureControl: number
  lightSquareAdvantage: number,
  darkSqaureAdvantage: number,
  totalSqaureAdvantage: number;
}

export interface MaterialInfo {
  materialcount: number;
  materialvalue: number;
  piececount: {
    pawns: number;
    knights: number;
    bishops: number;
    rooks: number;
    queens: number;
  };
  bishoppair: boolean;
  materialadvantage: number;
}

export enum STATE_THEMES {
    CASTLE,
    MATERIAL,
    SPACE,
    PLACEMENT,
    POSITIONAL,
    SQAURE_CONTROL_LIGHT,
    SQAURE_CONTROL_DARK,
    KING_SAFETY,
    MOBILITY,
    TACTICAL
}

export interface SideStateScores{
    castlingScore: CastleRights,
    materialScore: MaterialInfo,
    spaceScore: SpaceControl
    pieceplacementScore: SidePiecePlacement,
    positionalScore: PositionalPawn,
    squareControlScore: SideSquareControl,
    kingSafetyScore: KingSafety,
    pieceMobilityScore: PieceMobility
}

export interface BoardState {
  fen: string;
  validfen: boolean;
  legalMoves: string[];
  white: SideStateScores;
  black: SideStateScores;
  whitepieceattackerdefenderinfo: SideAttackerDefenders,
  blackpieceattackerdefenderinfo: SideAttackerDefenders,
  isCheckmate: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  moveNumber: number;
  sidetomove: string;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
}

