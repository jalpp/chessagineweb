import { useCallback, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
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
  KeyPosition,
} from "@/libs/batchreview/types";

/** Hard cap on candidate positions sent through puzzle validation. */
const MAX_PUZZLE_CANDIDATES = 60;
/** Depth for the engine fallback when validating puzzle best moves. */
const PUZZLE_VALIDATION_DEPTH = 14;

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

      const terminalRates = new Map<number, number>();

      for (let ply = 0; ply < sanMoves.length; ply++) {
        const moveObject = board.move(sanMoves[ply]);
        if (!moveObject) break;
        moveHistory.push(
          moveObject.from + moveObject.to + (moveObject.promotion || "")
        );

        // Terminal positions have no meaningful engine/ChessDB eval — pin
        // them explicitly so a delivered mate never looks like a blunder
        if (board.isCheckmate()) {
          // Side to move is the mated side
          terminalRates.set(ply, board.turn() === "b" ? 100 : 0);
        } else if (board.isGameOver()) {
          terminalRates.set(ply, 50);
        }

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
      terminalRates.forEach((rate, ply) => {
        winRates[ply + 1] = rate;
      });
      // Book positions stay balanced; carry the opening baseline forward
      plies
        .filter((p) => p.openingMatch)
        .forEach((p) => {
          winRates[p.plyIndex + 1] = centipawnToWinRate(0);
        });

      // ── Phase A: parallel ChessDB on non-book, non-terminal positions ────
      const nonBook = plies.filter(
        (p) => !p.openingMatch && !terminalRates.has(p.plyIndex)
      );
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

  /**
   * Validates puzzle candidates: a position only becomes a puzzle when the
   * move the user played was NOT the engine's top move. Resolves the best
   * move for each candidate (ChessDB first, engine fallback), stores it on
   * the position, and drops candidates whose played move matches it or whose
   * best move can't be determined.
   *
   * @param candidates - Blunder/mistake positions, worst drops first
   * @param onProgress - Called with 0–1 completion fraction
   * @returns Verified puzzles with bestMove (SAN) filled in
   */
  const validatePuzzleCandidates = useCallback(
    async (
      candidates: KeyPosition[],
      onProgress: (fraction: number) => void,
      signal: AbortSignal
    ): Promise<KeyPosition[]> => {
      const capped = candidates.slice(0, MAX_PUZZLE_CANDIDATES);
      let completed = 0;

      /** Resolves the best move SAN at a pre-move FEN, hint → ChessDB → engine. */
      const resolveBest = async (
        position: KeyPosition
      ): Promise<string | null> => {
        const tryParse = (hint: string): string | null => {
          const board = new Chess(position.fen);
          try {
            const move = board.move(hint);
            if (move) return move.san;
          } catch {
            // SAN parse failed — try UCI shape below
          }
          if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(hint)) {
            try {
              const move = new Chess(position.fen).move({
                from: hint.slice(0, 2) as Square,
                to: hint.slice(2, 4) as Square,
                promotion: hint.slice(4) || undefined,
              });
              if (move) return move.san;
            } catch {
              return null;
            }
          }
          return null;
        };

        if (position.bestMove) {
          const san = tryParse(position.bestMove);
          if (san) return san;
        }

        const dbMoves = await fetchChessDBFast(position.fen);
        if (dbMoves.length > 0 && dbMoves[0].uci !== "N/A") {
          const san = tryParse(dbMoves[0].uci);
          if (san) return san;
        }

        if (stockfishEngine && !signal.aborted) {
          const analysis = await stockfishEngine.evaluatePositionWithUpdate({
            fen: position.fen,
            depth: PUZZLE_VALIDATION_DEPTH,
            multiPv: 1,
          });
          if (analysis.bestMove) return tryParse(analysis.bestMove);
        }
        return null;
      };

      // ChessDB lookups are network bound — overlap them; the engine
      // fallback inside resolveBest serializes itself on the worker
      const resolved = await parallelLimit(
        capped.map((position) => async () => {
          const bestSan = signal.aborted ? null : await resolveBest(position);
          completed++;
          onProgress(completed / capped.length);
          return bestSan;
        }),
        4
      );

      const puzzles: KeyPosition[] = [];
      capped.forEach((position, i) => {
        const bestSan = resolved[i];
        // Keep only verified puzzles: best move known AND different from
        // what the user played
        if (bestSan && bestSan !== position.playedSan) {
          puzzles.push({ ...position, bestMove: bestSan });
        }
      });
      return puzzles;
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
              Math.min(20, Math.round((downloaded / options.maxGames) * 20))
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

          setProgress(20 + Math.round(((i + 1) / reviewable.length) * 65));
        }

        if (summaries.length === 0) {
          throw new Error(
            "None of the downloaded games could be reviewed (only standard chess is supported)"
          );
        }

        const aggregated = aggregateBatchResult(options.username, summaries);

        // ── Validate puzzles (85–100% of progress) ─────────────────────────
        setProgressLabel("Building your puzzle pack…");
        aggregated.keyPositions = await validatePuzzleCandidates(
          aggregated.keyPositions,
          (fraction) => setProgress(85 + Math.round(fraction * 15)),
          abort.signal
        );
        if (abort.signal.aborted) return;

        setResult(aggregated);
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
    [evaluateGameLocally, validatePuzzleCandidates]
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
