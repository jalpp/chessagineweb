import { useCallback, useRef, useState } from "react";
import { Chess } from "chess.js";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { centipawnToWinRate, evaluationToWinRate } from "@/libs/game/gamereview";
import { isFenInAllDatabases } from "@/libs/openingdatabase/ecoDatabase";
import { fetchChessDBFast, parallelLimit } from "@/libs/batchreview/chessdb";
import { fetchBatchGames } from "@/libs/batchreview/api";
import {
  aggregateBatchResult,
  buildGameSummary,
  classifyUserMoves,
  getUserColor,
  winRatesFromLichessEvals,
} from "@/libs/batchreview/analysis";
import type {
  BatchGame,
  BatchReviewOptions,
  BatchReviewPhase,
  BatchReviewResult,
} from "@/libs/batchreview/types";

/**
 * Batch game review orchestration hook.
 *
 * Efficiency strategy (in order of preference per game):
 * 1. Lichess server analysis (`analysis` array from evals=true) — zero local cost
 * 2. ChessDB cloud evals — 8 concurrent fetches, IndexedDB cached
 * 3. Shallow local Stockfish — only for positions ChessDB missed, run in
 *    reverse order with `position startpos moves ...` so the transposition
 *    table is warm (same fishnet technique as useGameReview)
 *
 * Opening-book plies are skipped entirely for the local pass.
 *
 * @param stockfishEngine - The initialized engine (from useEngine), may be undefined
 * @author jalpp
 */

/** One ply of a game prepared for the local eval pass. */
interface LocalPly {
  plyIndex: number;
  /** FEN after the move was played. */
  postMovefen: string;
  /** Side to move at postMovefen. */
  sideToMove: "w" | "b";
  /** UCI moves from game start through this ply, for TT warming. */
  movesUpToPost: string[];
  /** Whether the post-move position is still in the opening book. */
  openingMatch: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
const useBatchReview = (stockfishEngine: UciEngine | undefined) => {
  const [phase, setPhase] = useState<BatchReviewPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<BatchReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Computes White-perspective post-move win rates for one unanalyzed game.
   * Returns an array of length plies + 1 (index 0 = starting position).
   */
  const evaluateGameLocally = useCallback(
    async (game: BatchGame, localDepth: number): Promise<number[]> => {
      const board = new Chess();
      const sanMoves = game.moves.split(" ").filter(Boolean);
      const plies: LocalPly[] = [];
      const moveHistory: string[] = [];
      const bookPlies = game.opening?.ply ?? 0;

      for (let ply = 0; ply < sanMoves.length; ply++) {
        const moveObject = board.move(sanMoves[ply]);
        if (!moveObject) break;
        moveHistory.push(
          moveObject.from + moveObject.to + (moveObject.promotion || "")
        );
        plies.push({
          plyIndex: ply,
          postMovefen: board.fen(),
          sideToMove: board.turn(),
          movesUpToPost: [...moveHistory],
          openingMatch: ply < bookPlies || isFenInAllDatabases(board.fen()),
        });
      }

      const winRates: number[] = new Array(plies.length + 1).fill(50);
      winRates[0] = centipawnToWinRate(0);
      // Book positions stay balanced; carry the opening baseline forward
      plies
        .filter((p) => p.openingMatch)
        .forEach((p) => {
          winRates[p.plyIndex + 1] = centipawnToWinRate(0);
        });

      // ── Phase A: parallel ChessDB on non-book positions ──────────────────
      const nonBook = plies.filter((p) => !p.openingMatch);
      const dbResults = await parallelLimit(
        nonBook.map((p) => () => fetchChessDBFast(p.postMovefen)),
        8
      );

      const sfNeeded: LocalPly[] = [];
      nonBook.forEach((p, i) => {
        const data = dbResults[i];
        // ChessDB winrate is from the side-to-move's perspective at postMovefen.
        // Guard against "N/A" winrates — parseFloat would yield NaN and poison
        // every downstream accuracy average, so unparsable entries fall through
        // to the Stockfish pass instead.
        const stmWinRate =
          data.length > 0
            ? parseFloat(data[0].winrate.replace("%", "").trim())
            : NaN;
        if (Number.isFinite(stmWinRate)) {
          winRates[p.plyIndex + 1] =
            p.sideToMove === "w" ? stmWinRate : 100 - stmWinRate;
        } else {
          sfNeeded.push(p);
        }
      });

      // ── Phase B: shallow Stockfish, reverse order for TT warmth ──────────
      if (stockfishEngine && sfNeeded.length > 0) {
        const sfReversed = [...sfNeeded].reverse();
        for (const p of sfReversed) {
          const analysis = await stockfishEngine.evaluatePositionWithUpdate({
            fen: p.postMovefen,
            depth: localDepth,
            multiPv: 1,
            moves: p.movesUpToPost,
          });
          // parseEvaluationResults already normalizes cp to White's perspective
          winRates[p.plyIndex + 1] = evaluationToWinRate(analysis.lines?.[0]);
        }
      }

      return winRates;
    },
    [stockfishEngine]
  );

  /** Cancels an in-flight batch review run. */
  const cancelBatchReview = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setProgress(0);
    setProgressLabel("");
  }, []);

  /** Downloads and analyzes the user's recent games per the given options. */
  const generateBatchReview = useCallback(
    async (options: BatchReviewOptions): Promise<void> => {
      setError(null);
      setResult(null);
      setProgress(0);
      setPhase("downloading");
      setProgressLabel("Downloading games from Lichess…");

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        // ── Download (0–25% of progress) ───────────────────────────────────
        const games = await fetchBatchGames(
          options,
          (downloaded) => {
            setProgressLabel(`Downloading games from Lichess… ${downloaded}`);
            setProgress(
              Math.min(25, Math.round((downloaded / options.maxGames) * 25))
            );
          },
          abort.signal
        );

        if (games.length === 0) {
          throw new Error("No games found for this username with these filters");
        }

        // ── Analyze (25–100% of progress) ──────────────────────────────────
        setPhase("analyzing");
        const summaries = [];
        // Standard-variant games only — local eval assumes the normal start position
        const reviewable = games.filter(
          (g) => g.variant === "standard" && g.moves.trim().length > 0
        );

        for (let i = 0; i < reviewable.length; i++) {
          if (abort.signal.aborted) return;
          const game = reviewable[i];
          const userColor = getUserColor(game, options.username);
          if (!userColor) continue;

          setProgressLabel(
            `Analyzing game ${i + 1} of ${reviewable.length}${
              game.analysis ? " (Lichess analysis)" : " (local engines)"
            }`
          );

          const hasLichessAnalysis =
            !!game.analysis && game.analysis.length > 0;
          const winRates = hasLichessAnalysis
            ? winRatesFromLichessEvals(game.analysis!)
            : await evaluateGameLocally(game, options.localDepth);

          const classified = classifyUserMoves(
            game,
            userColor,
            winRates,
            game.opening?.ply ?? 0,
            hasLichessAnalysis ? game.analysis : undefined
          );

          summaries.push(
            buildGameSummary(
              game,
              userColor,
              classified,
              hasLichessAnalysis ? "lichess" : "local"
            )
          );

          setProgress(25 + Math.round(((i + 1) / reviewable.length) * 75));
        }

        if (summaries.length === 0) {
          throw new Error(
            "None of the downloaded games could be reviewed (only standard chess is supported)"
          );
        }

        setResult(aggregateBatchResult(options.username, summaries));
        setProgress(100);
        setPhase("done");
        setProgressLabel("");
      } catch (err) {
        if (abort.signal.aborted) return;
        console.error("Batch review failed:", err);
        setError(err instanceof Error ? err.message : "Batch review failed");
        setPhase("error");
      }
    },
    [evaluateGameLocally]
  );

  return {
    phase,
    progress,
    progressLabel,
    result,
    error,
    generateBatchReview,
    cancelBatchReview,
    setResult,
  };
};

export default useBatchReview;
