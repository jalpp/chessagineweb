/**
 * @file chess.ts
 * @description Chess utility functions and constants for the Lichess play feature.
 *
 * All functions are pure (no side effects) and can be used in both
 * client components and server-side code.
 */

import { Chess, type Square } from "chess.js";
import type { GamePlayer, TimeControl } from "./types";

// ─── Time controls ────────────────────────────────────────────────────────────

/**
 * Available time controls for the Lichess Board API seek pool.
 *
 * The seek pool only accepts Rapid & Classical.
 * Estimated duration = time*60 + 40*increment must be >= 480s (8 min).
 * Bullet and Blitz require a direct challenge — they are NOT accepted via seek.
 *
 * @see https://lichess.org/api#tag/Board/operation/apiBoardSeek
 */
export const SEEK_TIME_CONTROLS: TimeControl[] = [
  { label: "8+0 Rapid",        time: 8,  increment: 0  },
  { label: "10+0 Rapid",       time: 10, increment: 0  },
  { label: "10+5 Rapid",       time: 10, increment: 5  },
  { label: "15+0 Rapid",       time: 15, increment: 0  },
  { label: "15+10 Rapid",      time: 15, increment: 10 },
  { label: "20+0 Rapid",       time: 20, increment: 0  },
  { label: "25+0 Rapid",       time: 25, increment: 0  },
  { label: "30+0 Classical",   time: 30, increment: 0  },
  { label: "30+20 Classical",  time: 30, increment: 20 },
  { label: "45+45 Classical",  time: 45, increment: 45 },
  { label: "60+0 Classical",   time: 60, increment: 0  },
];

// ─── Terminal statuses ────────────────────────────────────────────────────────

/**
 * Set of all terminal game status strings from the GameStatusName schema.
 * When a gameState event carries one of these, the game is over.
 *
 * @see https://lichess.org/api — GameStatusName enum
 */
export const TERMINAL_STATUSES = new Set<string>([
  "aborted", "mate", "resign", "stalemate", "timeout",
  "draw", "outoftime", "cheat", "noStart", "unknownFinish",
  "insufficientMaterialClaim", "variantEnd",
]);

// ─── Last-move highlight ──────────────────────────────────────────────────────

/**
 * Universal last-move square highlight colour.
 * Lichess yellow (rgba(246,246,105,0.5)) is visible on every board theme
 * because yellow contrasts against both light and dark squares regardless of hue.
 */
export const LAST_MOVE_COLOR = "rgba(246,246,105,0.5)";

// ─── UCI helpers ──────────────────────────────────────────────────────────────

/**
 * Converts an array of UCI move strings to SAN notation.
 *
 * Replays moves from the starting position using chess.js.
 * Stops at the first illegal move to avoid throwing.
 *
 * @param uciMoves - Space-split UCI moves from a Lichess game stream (e.g. ["e2e4","e7e5"])
 * @returns Array of SAN strings (e.g. ["e4","e5"])
 */
export function uciToSan(uciMoves: string[]): string[] {
  const chess = new Chess();
  const san: string[] = [];
  for (const uci of uciMoves) {
    try {
      const result = chess.move({
        from: uci.slice(0, 2) as Square,
        to:   uci.slice(2, 4) as Square,
        promotion: uci[4] as ("q" | "r" | "b" | "n" | undefined),
      });
      if (result) san.push(result.san);
    } catch {
      break;
    }
  }
  return san;
}

/**
 * Returns the FEN position after replaying the first `count` UCI moves.
 *
 * Used to display historical board positions when the user clicks a move
 * in the move list during review mode.
 *
 * @param uciMoves - Full array of UCI moves for the game
 * @param count    - How many moves to replay (1-indexed: count=1 → after move 1)
 * @returns FEN string of the resulting position
 */
export function fenAfterMoves(uciMoves: string[], count: number): string {
  const chess = new Chess();
  const limit = Math.min(count, uciMoves.length);
  for (let i = 0; i < limit; i++) {
    const m = uciMoves[i];
    try {
      chess.move({
        from: m.slice(0, 2) as Square,
        to:   m.slice(2, 4) as Square,
        promotion: m[4] as ("q" | "r" | "b" | "n" | undefined),
      });
    } catch {
      break;
    }
  }
  return chess.fen();
}

// ─── Clock formatter ──────────────────────────────────────────────────────────

/**
 * Formats a clock value in milliseconds to a human-readable string.
 *
 * Shows tenths of a second when under 20 seconds, matching Lichess's own UI.
 *
 * @param ms - Clock time in milliseconds
 * @returns Formatted string, e.g. "5:00", "0:19.3"
 */
export function fmtMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (ms < 20_000) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m}:${String(s).padStart(2, "0")}.${tenths}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── PGN builder ─────────────────────────────────────────────────────────────

interface BuildPgnOptions {
  uciMoves:   string[];
  players:    { white: GamePlayer | null; black: GamePlayer | null };
  tc:         TimeControl;
  rated:      "rated" | "casual";
  gameId:     string | null;
  result:     string;
}

/**
 * Builds a complete PGN string with standard headers from a finished game.
 *
 * The PGN is written to sessionStorage before navigating to the game
 * review page so the game page can auto-load it.
 *
 * @param opts - Game data needed to construct the PGN
 * @returns Full PGN string with headers and moves, or "" if no moves
 */
export function buildGamePgn(opts: BuildPgnOptions): string {
  const { uciMoves, players, tc, rated, gameId, result } = opts;
  if (!uciMoves.length) return "";

  const chess = new Chess();
  for (const m of uciMoves) {
    try {
      chess.move({
        from: m.slice(0, 2) as Square,
        to:   m.slice(2, 4) as Square,
        promotion: m[4] as ("q" | "r" | "b" | "n" | undefined),
      });
    } catch {
      break;
    }
  }

  chess.setHeader("White",       players.white?.name     ?? "?");
  chess.setHeader("Black",       players.black?.name     ?? "?");
  chess.setHeader("WhiteElo",    players.white?.rating != null ? String(players.white.rating) : "?");
  chess.setHeader("BlackElo",    players.black?.rating != null ? String(players.black.rating) : "?");
  chess.setHeader("Event",       rated === "rated" ? "Rated game" : "Casual game");
  chess.setHeader("TimeControl", `${tc.time * 60}+${tc.increment}`);
  chess.setHeader("Site",        `https://lichess.org/${gameId ?? ""}`);
  chess.setHeader("Date",        new Date().toISOString().split("T")[0]);

  if (result) {
    const pgn_result = result.includes("White wins") ? "1-0"
      : result.includes("Black wins") ? "0-1"
      : "1/2-1/2";
    chess.setHeader("Result", pgn_result);
  }

  return chess.pgn();
}

/**
 * Builds the gameInfo object that the /game review page reads from sessionStorage.
 * Keys match what extractGameInfo() produces from PGN headers.
 *
 * @param opts - Same options as buildGamePgn
 * @returns Key-value map of PGN headers
 */
export function buildGameInfo(opts: BuildPgnOptions): Record<string, string> {
  const { players, tc, rated, gameId, result } = opts;
  const info: Record<string, string> = {
    White:       players.white?.name     ?? "?",
    Black:       players.black?.name     ?? "?",
    WhiteElo:    players.white?.rating != null ? String(players.white.rating) : "?",
    BlackElo:    players.black?.rating != null ? String(players.black.rating) : "?",
    Event:       rated === "rated" ? "Rated game" : "Casual game",
    Site:        `https://lichess.org/${gameId ?? ""}`,
    Date:        new Date().toISOString().split("T")[0],
    TimeControl: `${tc.time * 60}+${tc.increment}`,
  };
  if (result) {
    info.Result = result.includes("White wins") ? "1-0"
      : result.includes("Black wins") ? "0-1"
      : "1/2-1/2";
  }
  return info;
}

/**
 * Maps a Lichess terminal game status string to a human-readable result message.
 *
 * @param status - GameStatusName from the official enum
 * @param winner - "white" | "black" | undefined
 * @returns Display string shown to the user after the game ends
 */
export function statusToResultMessage(status: string, winner?: string): string {
  const w = winner === "white" ? "White" : "Black";
  switch (status) {
    case "mate":                     return `Checkmate! ${w} wins`;
    case "resign":                   return `${w} wins by resignation`;
    case "outoftime":                return `${w} wins on time`;
    case "timeout":                  return `${w} wins on timeout`;
    case "draw":                     return "Draw";
    case "stalemate":                return "Stalemate — Draw";
    case "insufficientMaterialClaim":return "Draw — Insufficient material";
    case "aborted":                  return "Game aborted";
    case "noStart":                  return "Game cancelled — no moves made";
    case "cheat":                    return "Game ended — cheat detected";
    default:                         return `Game over (${status})`;
  }
}
