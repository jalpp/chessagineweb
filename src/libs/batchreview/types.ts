/**
 * @file types.ts
 * @description Shared TypeScript types for the batch game review feature.
 *
 * These types mirror the Lichess game export API schema:
 * - BatchGame      → {@link https://lichess.org/api#tag/Games/operation/apiGamesUser}
 * - LichessEval    → per-ply entries of the `analysis` array (evals=true)
 * - LichessJudgment → judgment object attached to bad moves by Lichess
 */

import { MoveQuality } from "@/libs/agine/helper";

// ─── Lichess export schema ────────────────────────────────────────────────────

/** A player side in an exported Lichess game. */
export interface BatchGamePlayer {
  user?: { id: string; name: string };
  rating?: number;
  ratingDiff?: number;
  /** Present when the game has server analysis and accuracy=true was requested. */
  analysis?: { inaccuracy: number; mistake: number; blunder: number; acpl: number; accuracy?: number };
  aiLevel?: number;
}

/** Lichess move judgment attached to inaccuracies/mistakes/blunders. */
export interface LichessJudgment {
  name: "Inaccuracy" | "Mistake" | "Blunder";
  comment: string;
}

/** One entry of the Lichess `analysis` array — the eval AFTER each half-move. */
export interface LichessEval {
  /** Centipawn eval from White's perspective. */
  eval?: number;
  /** Mate distance from White's perspective (negative → Black mates). */
  mate?: number;
  /** Best move in UCI, present on judged moves. */
  best?: string;
  /** Best line in SAN, present on judged moves. */
  variation?: string;
  judgment?: LichessJudgment;
}

/** A single game returned by the Lichess game export API. */
export interface BatchGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  winner?: "white" | "black";
  players: {
    white: BatchGamePlayer;
    black: BatchGamePlayer;
  };
  opening?: { eco: string; name: string; ply: number };
  /** Space separated SAN moves (moves=true). */
  moves: string;
  /** Full PGN text (pgnInJson=true). */
  pgn: string;
  /** Server analysis evals, present only when the game was analyzed on Lichess. */
  analysis?: LichessEval[];
  clock?: { initial: number; increment: number; totalTime: number };
}

// ─── Local analysis output ────────────────────────────────────────────────────

/** Outcome of a game from the reviewed user's point of view. */
export type GameOutcome = "win" | "loss" | "draw";

/** A critical position (mistake or blunder) played by the reviewed user. */
export interface KeyPosition {
  gameId: string;
  /** FEN before the bad move was played. */
  fen: string;
  /** Ply index (0-based) of the bad move. */
  plyIndex: number;
  /** Move number shown to the user, e.g. "23." or "23..." */
  moveLabel: string;
  /** SAN of the move that was played. */
  playedSan: string;
  /** Best move (SAN or UCI) when known. */
  bestMove?: string;
  quality: MoveQuality;
  /** Win-rate drop (percentage points) caused by the move. */
  winRateDrop: number;
  /** White player's display name from the source game, when known. */
  whitePlayer?: string;
  /** Black player's display name from the source game, when known. */
  blackPlayer?: string;
}

/** Per-game summary produced by the batch analyzer. */
export interface GameSummary {
  gameId: string;
  /** Color the reviewed user played. */
  userColor: "white" | "black";
  outcome: GameOutcome;
  speed: string;
  rated: boolean;
  opponentName: string;
  opponentRating?: number;
  userRating?: number;
  userRatingDiff?: number;
  openingEco?: string;
  openingName?: string;
  playedAt: number;
  /** Count of the user's moves per quality bucket. */
  qualityCounts: Record<MoveQuality, number>;
  /** Estimated accuracy (0–100) for the user's moves. */
  accuracy: number;
  /** Whether evals came from Lichess server analysis or the local engine pass. */
  evalSource: "lichess" | "local";
  keyPositions: KeyPosition[];
  pgn: string;
}

/** Aggregated stats for a single opening across the batch. */
export interface OpeningStat {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  /** Score percentage (win=1, draw=0.5) across `games`. */
  scorePercent: number;
  asWhite: number;
  asBlack: number;
  avgAccuracy: number;
}

/** The full result of a batch review run. */
export interface BatchReviewResult {
  username: string;
  generatedAt: number;
  games: GameSummary[];
  openingStats: OpeningStat[];
  /** Total user move counts per quality bucket across all games. */
  totalQualityCounts: Record<MoveQuality, number>;
  record: { wins: number; draws: number; losses: number };
  recordAsWhite: { wins: number; draws: number; losses: number };
  recordAsBlack: { wins: number; draws: number; losses: number };
  avgAccuracy: number;
  keyPositions: KeyPosition[];
}

// ─── Run options ──────────────────────────────────────────────────────────────

/** Filters and limits for a batch review run. */
export interface BatchReviewOptions {
  username: string;
  /** Number of games to review (BATCH_MIN_GAMES–BATCH_MAX_GAMES). */
  maxGames: number;
  /** Lichess perf types to include, empty → all. */
  perfTypes: string[];
  /** true → rated only, false → casual only, undefined → both. */
  rated?: boolean;
  /** Depth used by the local Stockfish pass for unanalyzed games. */
  localDepth: number;
  /**
   * Win-rate drop threshold (percentage points) for classifying a move as a Blunder.
   * Defaults to 20 if omitted.
   */
  blunderThreshold?: number;
  /**
   * Win-rate drop threshold (percentage points) for classifying a move as a Mistake.
   * Must be < blunderThreshold. Defaults to 10 if omitted.
   */
  mistakeThreshold?: number;
}

/** Progress phases reported while a batch review runs. */
export type BatchReviewPhase =
  | "idle"
  | "downloading"
  | "analyzing"
  | "done"
  | "error";

export const BATCH_MIN_GAMES = 5;
export const BATCH_MAX_GAMES = 200;
export const BATCH_LOCAL_DEPTH_DEFAULT = 12;
export const BATCH_BLUNDER_THRESHOLD_DEFAULT = 20;
export const BATCH_MISTAKE_THRESHOLD_DEFAULT = 10;

/**
 * Hard cap on verified puzzles kept in a single puzzle pack.
 *
 * Used both as the candidate cap before puzzle validation
 * (see useBatchReview's `validatePuzzleCandidates`) and as the upper bound
 * when exporting a puzzle pack to Lichess studies — see
 * `@/libs/lichess/study`, which further splits packs at this size into
 * STUDY_CHAPTER_CHUNK_SIZE-chapter studies (Lichess caps a study at 64
 * chapters).
 */
export const MAX_PUZZLE_PACK_SIZE = 200;
