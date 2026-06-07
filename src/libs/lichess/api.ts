/**
 * @file api.ts
 * @description Lichess Board API client functions.
 *
 * Wraps all network calls to the Lichess Board API. Every function:
 * - Accepts an `AbortController.signal` where relevant for stream cleanup
 * - Returns typed results or throws on non-OK responses
 * - Never touches React state — pure async I/O
 *
 * Official API reference: https://lichess.org/api#tag/Board
 */

import type { SeekColor, SeekRated, TimeControl } from "./types";

const LICHESS_BASE = "https://lichess.org";

// ─── NDJSON streaming ─────────────────────────────────────────────────────────

/**
 * Async generator that reads an NDJSON (newline-delimited JSON) response body
 * and yields each parsed JSON object.
 *
 * Lichess streams (event stream, game stream, seek) use this format.
 * Empty keep-alive lines are silently skipped.
 *
 * @param response - A fetch Response with a readable body
 * @yields Each parsed JSON object from the stream
 */
export async function* streamNdJson(
  response: Response
): AsyncGenerator<Record<string, unknown>> {
  const reader  = response.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try { yield JSON.parse(trimmed); } catch { /* skip malformed */ }
    }
  }
}

// ─── Seek ─────────────────────────────────────────────────────────────────────

/**
 * Posts a game seek to the Lichess Board API seek pool and keeps the
 * response body open (via reader drain) to stay in the seek pool.
 *
 * IMPORTANT: The /api/board/seek endpoint returns an NDJSON stream of
 * empty lines while waiting for an opponent. Closing the connection
 * cancels the seek. This function drains the body until the abort signal
 * fires (seek accepted → gameStart on event stream) or the caller aborts.
 *
 * Seek pool restriction: only Rapid & Classical are accepted
 * (estimated duration = time*60 + 40*increment >= 480s).
 *
 * @param token  - Lichess OAuth token (board:play scope required)
 * @param tc     - Time control (time in minutes, increment in seconds)
 * @param rated  - Whether the seek is rated or casual
 * @param color  - Preferred color for the seek
 * @param signal - AbortSignal to cancel the seek
 * @throws Error with message if Lichess returns a non-OK status
 */
export async function postSeek(
  token:  string,
  tc:     TimeControl,
  rated:  SeekRated,
  color:  SeekColor,
  signal: AbortSignal
): Promise<void> {
  const body = new URLSearchParams({
    rated:     String(rated === "rated"),
    time:      String(tc.time),       // minutes
    increment: String(tc.increment),  // seconds
    variant:   "standard",
    color,
  });

  const res = await fetch(`${LICHESS_BASE}/api/board/seek`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal,
  });

  if (!res.ok && !signal.aborted) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Seek failed (${res.status}): ${text}`);
  }

  // Drain the response body to keep the seek alive in the pool.
  if (res.body) {
    const reader = res.body.getReader();
    try {
      while (true) {
        const { done } = await reader.read();
        if (done || signal.aborted) break;
      }
    } catch {
      // AbortError is expected when the seek is accepted or cancelled
    }
  }
}

// ─── Event stream ─────────────────────────────────────────────────────────────

/**
 * Opens the Lichess event stream (/api/stream/event) and yields each event.
 *
 * The event stream carries gameStart, gameFinish, and challenge events.
 * It must be opened BEFORE posting the seek so the gameStart event is not missed.
 *
 * @param token  - Lichess OAuth token
 * @param signal - AbortSignal to close the stream
 * @yields Raw NDJSON event objects from the stream
 * @throws Error if the stream returns a non-OK status
 */
export async function* streamEventStream(
  token:  string,
  signal: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(`${LICHESS_BASE}/api/stream/event`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) throw new Error(`Event stream error: ${res.status}`);
  yield* streamNdJson(res);
}

// ─── Game stream ──────────────────────────────────────────────────────────────

/**
 * Opens the Lichess Board API game stream for a specific game.
 *
 * Yields events in this order:
 * 1. One gameFull event (full initial state with player info)
 * 2. One gameState event per move (moves, clocks, draw offers, status)
 * 3. Occasional opponentGone events
 *
 * @param token  - Lichess OAuth token
 * @param gameId - Lichess game ID (from the gameStart event)
 * @param signal - AbortSignal to close the stream
 * @yields Raw NDJSON event objects from the game stream
 * @throws Error if the stream returns a non-OK status
 */
export async function* streamBoardGame(
  token:  string,
  gameId: string,
  signal: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(`${LICHESS_BASE}/api/board/game/stream/${gameId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) throw new Error(`Game stream error: ${res.status}`);
  yield* streamNdJson(res);
}

// ─── In-game actions ──────────────────────────────────────────────────────────

/**
 * Sends a move to Lichess for the given game.
 *
 * The move must be in UCI format (e.g. "e2e4", "e7e8q" for promotion).
 *
 * @param token  - Lichess OAuth token
 * @param gameId - Active Lichess game ID
 * @param uci    - Move in UCI format
 * @throws Error with Lichess error message if the move is rejected
 */
export async function postMove(
  token:  string,
  gameId: string,
  uci:    string
): Promise<void> {
  const res = await fetch(`${LICHESS_BASE}/api/board/game/${gameId}/move/${uci}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Move rejected: ${text}`);
  }
}

/**
 * Resigns the current game on behalf of the authenticated user.
 *
 * @param token  - Lichess OAuth token
 * @param gameId - Active Lichess game ID
 */
export async function postResign(token: string, gameId: string): Promise<void> {
  await fetch(`${LICHESS_BASE}/api/board/game/${gameId}/resign`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Aborts a game that has fewer than 2 moves played.
 *
 * @param token  - Lichess OAuth token
 * @param gameId - Active Lichess game ID
 */
export async function postAbort(token: string, gameId: string): Promise<void> {
  await fetch(`${LICHESS_BASE}/api/board/game/${gameId}/abort`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Offers or accepts a draw for the current game.
 *
 * Calling this endpoint when the opponent has already offered a draw
 * accepts their offer. Calling it first sends an offer.
 *
 * @param token  - Lichess OAuth token
 * @param gameId - Active Lichess game ID
 */
export async function postDrawOffer(token: string, gameId: string): Promise<void> {
  await fetch(`${LICHESS_BASE}/api/board/game/${gameId}/draw/yes`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Declines a draw offer from the opponent.
 *
 * @param token  - Lichess OAuth token
 * @param gameId - Active Lichess game ID
 */
export async function postDrawDecline(token: string, gameId: string): Promise<void> {
  await fetch(`${LICHESS_BASE}/api/board/game/${gameId}/draw/no`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
