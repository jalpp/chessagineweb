/**
 * @file types.ts
 * @description Shared TypeScript types for the Lichess Board API play feature.
 *
 * These types mirror the official Lichess API schemas:
 * - GameEventPlayer  → {@link https://lichess.org/api#tag/Board}
 * - GameStateEvent   → wtime/btime in ms, wdraw/bdraw booleans
 * - OpponentGoneEvent → gone: boolean, claimWinInSeconds?: number
 * - GameStatusName   → full enum of terminal game statuses
 */

// ─── Player ───────────────────────────────────────────────────────────────────

/** A player in a Lichess Board API game (GameEventPlayer schema). */
export interface GamePlayer {
  id: string;
  name: string;
  title?: string | null;
  rating?: number;
}

// ─── Clock ────────────────────────────────────────────────────────────────────

/** Current clock state in milliseconds for both sides. */
export interface LiveClock {
  white: number;
  black: number;
}

// ─── Phase ────────────────────────────────────────────────────────────────────

/**
 * The local game phase as seen by the UI.
 * - `idle`     — no game, showing seek setup
 * - `seeking`  — seek posted, waiting for opponent
 * - `playing`  — game in progress, streams active
 * - `finished` — game over, showing result
 */
export type GamePhase = "idle" | "seeking" | "playing" | "finished";

// ─── Time controls ────────────────────────────────────────────────────────────

/**
 * A seek time control option.
 * time is in minutes (for the Lichess seek API).
 * increment is in seconds (for the Lichess seek API).
 */
export interface TimeControl {
  label: string;
  /** Clock initial time in minutes — passed directly to /api/board/seek */
  time: number;
  /** Clock increment in seconds — passed directly to /api/board/seek */
  increment: number;
}

// ─── Draw offer state ─────────────────────────────────────────────────────────

/**
 * Tracks the draw offer state for UI rendering.
 * Draw offers are detected from wdraw/bdraw boolean fields on GameStateEvent
 * — NOT from a separate event.
 */
export type DrawPendingState = "none" | "iOffered" | "theyOffered";

// ─── Seek color preference ────────────────────────────────────────────────────

/** Color preference for a seek. "random" lets Lichess assign. */
export type SeekColor = "random" | "white" | "black";

// ─── Seek rated preference ────────────────────────────────────────────────────

export type SeekRated = "rated" | "casual";

// ─── Stream event payloads ────────────────────────────────────────────────────

/** Raw gameFull event from the Board API game stream. */
export interface GameFullEvent {
  type: "gameFull";
  white: GamePlayer;
  black: GamePlayer;
  state: GameStatePayload;
}

/** Raw gameState event from the Board API game stream. */
export interface GameStateEvent {
  type: "gameState";
  moves: string;
  wtime: number;
  btime: number;
  status: string;
  winner?: string;
  wdraw?: boolean;
  bdraw?: boolean;
}

/**
 * The state payload embedded in gameFull, and mirrored by gameState.
 * moves is a space-separated string of UCI moves.
 */
export interface GameStatePayload {
  moves: string;
  wtime: number;
  btime: number;
  status: string;
  winner?: string;
  wdraw?: boolean;
  bdraw?: boolean;
}

/** opponentGone event — per official OpponentGoneEvent schema. */
export interface OpponentGoneEvent {
  type: "opponentGone";
  /** true = opponent disconnected, false = opponent reconnected */
  gone: boolean;
  /** seconds until you can claim a win (only present when gone=true) */
  claimWinInSeconds?: number;
}

/** gameStart event from /api/stream/event */
export interface GameStartEvent {
  type: "gameStart";
  game: {
    gameId: string;
    color: "white" | "black";
    compat?: { board?: boolean };
  };
}
