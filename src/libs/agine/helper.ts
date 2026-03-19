import { PositionEval, LineEval } from "@/stockfish/engine/engine";
import { MasterGames } from "../openingdatabase/helper";
import { Moves } from "../openingdatabase/helper";
import { Move } from "chess.js";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  maxTokens?: number;
  provider?: string;
  fen: string;
  model?: string;
  content: string;
  timestamp: Date;
}

export interface AgentMessage {
  message: string;
  maxTokens: number;
  provider: string;
  model: string;
}

export interface AgineState {
  stockfishAnalysisResult: PositionEval | null;
  reverseStockfishAnalysisResult?: PositionEval | null;
  openingData: MasterGames | null;
  lichessOpeningData: MasterGames | null;
  llmLoading: boolean;
  stockfishLoading: boolean;
  openingLoading: boolean;
  lichessOpeningLoading: boolean;
  moveSquares: { [square: string]: string };
  analysisTab: number;
}

export interface CandidateMove {
  uci: string;
  san: string;
  score: string;
  winrate: string;
  rank: string;
  note: string;
  rawEval?: number;
}

export interface TreeMoveNode {
  root: CandidateMove;
  preRootFen: string;
  postRootFen: string;
  leafs: CandidateMove[];
}

// Analysis data types
export interface EngineLineData {
  line: LineEval;
  lineIndex: number;
}

export interface MoveCoachData {
  fen: string;
  notation: string;
  quality: MoveQuality;
  player: "w" | "b";
  plyNumber: number;
  sanNotation?: string;
}

export type AnalysisData =
  | EngineLineData
  | Moves
  | CandidateMove
  | MoveCoachData
  | MoveAnalysis;

// Utility functions
export const isValidFEN = (fen: string): boolean => {
  if (!fen || typeof fen !== "string") return false;
  const parts = fen.trim().split(" ");
  return parts.length === 6;
};

export const createChatMessage = (
  role: "user" | "assistant",
  fen: string,
  content: string,
  maxTokens?: number,
  provider?: string,
  model?: string,
  id?: string,
): ChatMessage => ({
  id: id || Date.now().toString(),
  role,
  maxTokens,
  provider,
  fen,
  model,
  content,
  timestamp: new Date(),
});

export function getChessDbNoteWord(note: string): string {
  switch (note) {
    case "!":
      return "Best";
    case "*":
      return "Good";
    case "?":
      return "Bad";
    default:
      return "unknown";
  }
}

export function getChessDBSpeech(data: CandidateMove[]): string {
  let query = "Candidate Moves \n\n";

  for (let i = 0; i < data.length; i++) {
    query += `Move: ${data[i].san} Eval ${data[i].score} WinRate ${data[i].winrate} Note: ${data[i].note}\n`;
  }

  return query;
}

export interface SavedPosition {
  id: string;
  fen: string;
  analysis: string;
  timestamp: Date;
  title?: string;
}

export const sessionPrompts = [
  "How does Silman's imbalances apply here?",
  "How does Fine's chess principles apply here?",
  "How would you play this?",
  "What catches your eye here?",
  "Is this looking good or bad?",
  "What's your gut feeling about this position?",
  "Any cool tactics you spot?",
  "How should I approach this?",
  "What would you do here?",
  "See anything interesting?",
  "Thoughts on the position?",
  "Which move feels right to you?",
  "What do you think about this position?",
];

export const puzzlePrompts = [
  "Any hints you can share?",
  "How would you approach this puzzle?",
  "What do you see here?",
  "Got any ideas?",
  "What's your first thought?",
  "Can you give me a nudge in the right direction?",
];

export const playPrompts = [
  "What would you play here?",
  "Should I castle or wait?",
  "Time to attack or be patient?",
  "How do I handle this threat?",
  "What's my opponent up to?",
  "Good time to trade pieces?",
  "Is this move safe enough?",
  "What's the plan here?",
  "Push the pawns or hold back?",
  "How can I coordinate better?",
  "See any tactics brewing?",
  "What piece should I develop next?",
];

export const chatPrompts = [
  "Tell me about chess basics",
  "How do I get better at chess?",
  "What are your favorite tactics?",
  "Know any cool chess stories?",
  "How should I study openings?",
  "Why are endgames important?",
  "What's the difference between strategy and tactics?",
  "How do strong players think?",
  "What are the key chess principles?",
  "How do you calculate moves?",
  "Tell me about pawn structures",
  "Positional vs tactical play - what's the deal?",
  "Any time management tips?",
  "What opening mistakes should I avoid?",
  "How do I keep my king safe?",
  "How can I recognize patterns better?",
];

export interface TreeNodeData {
  fen: string;
  move: CandidateMove | null;
  depth: number;
  path: string;
  easeMetric?: number;
  moveNotation?: string;
}

export interface TreeNodeInfo {
  path: string;
  children: string[];
  easeMetric?: number;
  moveNotation: string;
}

export interface MoveStats {
  Best: number;
  "Very Good": number;
  Good: number;
  Dubious: number;
  Mistake: number;
  Blunder: number;
  Book: number;
}

export interface ApiSettings {
  model: string;
}

export type MoveQuality =
  | "Best"
  | "Very Good"
  | "Good"
  | "Dubious"
  | "Mistake"
  | "Blunder"
  | "Book";

export interface MoveAnalysis {
  plyNumber: number;
  notation: string;
  sanNotation: string | undefined;
  quality: MoveQuality;
  arrowMove: Move;
  evalMove: number;
  fen: string;
  easeMetric?: number;
  currenFen: string;
  player: "w" | "b";
}

export interface PgnMove {
  from: string;
  to: string;
  piece?: string;
  captured?: string;
  promotion?: string;
}

export interface MoveComment {
  moveIndex: number;
  comment: string;
  isAiGenerated?: boolean;
}

export const getMoveAnnotation = (quality: MoveQuality): string => {
  switch (quality) {
    case "Best":
      return "";
    case "Very Good":
      return "";
    case "Good":
      return "";
    case "Dubious":
      return "?!";
    case "Mistake":
      return "?";
    case "Blunder":
      return "??";
    case "Book":
      return "";
    default:
      return "";
  }
};

export const shouldShowClassification = (quality: MoveQuality): boolean => {
  return quality === "Blunder" || quality === "Mistake" || quality === "Dubious" || quality === "Best" || quality === "Book" || quality === "Good" || quality === "Very Good";
};