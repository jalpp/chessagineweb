
import { PositionEval, LineEval } from "@/stockfish/engine/engine";
import { MasterGames } from "../openingdatabase/helper";
import { MoveQuality } from "@/hooks/useGameReview";
import { Moves } from "../openingdatabase/helper";
import { CandidateMove } from "@/componets/tabs/Chessdb";
import { MoveAnalysis } from "@/hooks/useGameReview";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  maxTokens?: number,
  provider?: string,
  fen: string,
  model?: string,
  content: string;
  timestamp: Date;
}

export interface AgentMessage {
  message: string,
  maxTokens: number,
  provider: string,
  model: string,
}

export interface AgineState {
  llmAnalysisResult: string | null;
  stockfishAnalysisResult: PositionEval | null;
  openingData: MasterGames | null;
  lichessOpeningData: MasterGames | null;
  llmLoading: boolean;
  stockfishLoading: boolean;
  openingLoading: boolean;
  lichessOpeningLoading: boolean;
  moveSquares: { [square: string]: string };
  analysisTab: number;
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

export type AnalysisData = EngineLineData | Moves | CandidateMove | MoveCoachData | MoveAnalysis;


// Utility functions
export const isValidFEN = (fen: string): boolean => {
  if (!fen || typeof fen !== 'string') return false;
  const parts = fen.trim().split(' ');
  return parts.length === 6;
};

export const createChatMessage = (
  role: "user" | "assistant", 
  fen: string,
  content: string,
  maxTokens?: number,
  provider?: string,
  model?: string, 
  id?: string
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