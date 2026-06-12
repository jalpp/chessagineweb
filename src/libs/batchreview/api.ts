/**
 * @file api.ts
 * @description Lichess game export client for the batch review feature.
 *
 * Wraps the bulk game export endpoint, streaming NDJSON so download progress
 * can be reported per game instead of blocking on the full body.
 *
 * Efficiency notes:
 * - `evals=true` ships Lichess server analysis when a game already has it,
 *   so those games cost zero local engine time.
 * - `accuracy=true` ships Lichess-computed accuracy for analyzed games.
 * - Games stream newest-first; the reader yields as soon as each line lands.
 *
 * Official API reference: https://lichess.org/api#tag/Games/operation/apiGamesUser
 */

import type { BatchGame, BatchReviewOptions } from "./types";

const LICHESS_BASE = "https://lichess.org";

/**
 * Streams the user's most recent games from the Lichess export API.
 *
 * @param options - Username, game count and filters for the export request
 * @param onGame - Called with the running count each time a game finishes downloading
 * @param signal - AbortSignal to cancel the download
 * @returns All downloaded games, newest first
 * @throws Error when the user is not found or the request fails
 */
export async function fetchBatchGames(
  options: BatchReviewOptions,
  onGame?: (downloaded: number) => void,
  signal?: AbortSignal
): Promise<BatchGame[]> {
  const params = new URLSearchParams({
    max: String(options.maxGames),
    moves: "true",
    pgnInJson: "true",
    evals: "true",
    accuracy: "true",
    opening: "true",
    sort: "dateDesc",
  });

  if (options.perfTypes.length > 0) {
    params.set("perfType", options.perfTypes.join(","));
  }
  if (options.rated !== undefined) {
    params.set("rated", String(options.rated));
  }

  const response = await fetch(
    `${LICHESS_BASE}/api/games/user/${encodeURIComponent(options.username)}?${params.toString()}`,
    {
      method: "GET",
      headers: { accept: "application/x-ndjson" },
      signal,
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Lichess user "${options.username}" not found`);
    }
    if (response.status === 429) {
      throw new Error("Lichess rate limit hit — please wait a minute and try again");
    }
    throw new Error(`Failed to fetch games: ${response.statusText}`);
  }

  const games: BatchGame[] = [];
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  const pushLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      games.push(JSON.parse(trimmed) as BatchGame);
      onGame?.(games.length);
    } catch {
      // Skip malformed lines (keep-alives / truncated tails)
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) pushLine(line);
  }
  pushLine(buf);

  return games;
}
