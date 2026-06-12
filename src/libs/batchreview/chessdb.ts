/**
 * @file chessdb.ts
 * @description Standalone ChessDB cloud-eval fetch and concurrency helper
 * shared by the Agine Analyzer hook and components.
 *
 * Mirrors the private helpers in useGameReview — kept hook-free here so the
 * puzzle pack can resolve best moves without instantiating the review hook.
 */

import { validateFen } from "chess.js";
import { CandidateMove } from "@/libs/agine/helper";
import {
  getChessDbCache,
  setChessDbCache,
} from "@/stockfish/engine/chessdbCache";

/** Fetches ChessDB candidate moves for a FEN (IndexedDB cached, concurrency safe). */
export async function fetchChessDBFast(fen: string): Promise<CandidateMove[]> {
  if (!fen.trim() || !validateFen(fen)) return [];
  try {
    const cached = await getChessDbCache(fen);
    if (cached) return cached as CandidateMove[];

    const res = await fetch(
      `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodeURIComponent(fen)}&json=1`
    );
    if (!res.ok) return [];

    const json = await res.json();
    if (json.status !== "ok" || !Array.isArray(json.moves) || json.moves.length === 0)
      return [];

    const moves: CandidateMove[] = json.moves.map((m: CandidateMove) => {
      const scoreNum = Number(m.score);
      return {
        uci: m.uci || "N/A",
        san: m.san || "N/A",
        score: isNaN(scoreNum) ? "N/A" : (scoreNum / 100).toFixed(2),
        winrate: m.winrate || "N/A",
        rank: m.rank,
        note: m.note,
        rawEval: scoreNum,
      };
    });

    await setChessDbCache(fen, moves);
    return moves;
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
