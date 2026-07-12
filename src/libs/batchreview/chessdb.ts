/**
 * @file chessdb.ts
 * @description Shared ChessDB cloud-eval fetch and concurrency helpers
 * backed by the stockfishts ChessDbApi.
 */

import { validateFen } from "chess.js";
import type { CandidateMove } from "@/libs/agine/helper";
import { getChessDbCache, setChessDbCache } from "@/stockfish/engine/chessdbCache";
import { ChessDbApi } from "@jalpp/stockfishts";

const chessDbApi = new ChessDbApi();

/** Fetches ChessDB candidate moves for a FEN (IndexedDB cached, concurrency safe). */
export async function fetchChessDBFast(fen: string): Promise<CandidateMove[]> {
  if (!fen.trim() || !validateFen(fen)) return [];

  try {
    const cached = await getChessDbCache(fen);
    if (cached) return cached;

    const result = await chessDbApi.queryAll(fen);
    if (!result.success) {
      if (result.error === "unknown") {
        void chessDbApi.queue(fen);
      }
      return [];
    }

    await setChessDbCache(fen, result.data);
    return result.data;
  } catch {
    return [];
  }
}

/** Run up to `concurrency` async tasks at a time, preserving result order */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  );
  return results;
}
