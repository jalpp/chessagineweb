import { useState, useCallback } from "react";
import { Chess, Move, Color } from "chess.js";
import { isFenInAllDatabases } from "../libs/openingdatabase/ecoDatabase";
import { useSessionStorage } from "usehooks-ts";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useNets } from "./useNets";
import {
  isVeryGoodMove,
  evaluationToWinRate,
  percentToNumber,
  getMoveBasicClassification,
} from "@/libs/game/gamereview";
import { StockfishEaseMetricCalculator } from "@/libs/easemetric/stockfishEaseMetric";
import { ChessDBEaseMetricCalculator } from "@/libs/easemetric/chessDbEaseMetric";
import { MoveAnalysis, CandidateMove } from "@/libs/agine/helper";
import { getChessDbCache, setChessDbCache } from "@/stockfish/engine/chessdbCache";
import { validateFen } from "chess.js";

/**
 * Some of move classification logic is taken from ChessKit devs
 * https://github.com/GuillaumeSD/Chesskit/blob/main/src/lib/engine/helpers/moveClassification.ts
 *
 * Performance rewrite: all ChessDB fetches run in parallel (8 concurrent),
 * BigLeela net evals fire non-blocking while Stockfish runs serially only
 * for positions ChessDB missed.
 *
 * @author jalpp, ChessKit devs
 */

// ---------------------------------------------------------------------------
// Clamp centipawn values to ±1100 to prevent mate scores (e.g. 30000cp)
// from distorting the y-axis scale on the eval graph.
// ---------------------------------------------------------------------------
function clampEvalCp(cp: number): number {
  return Math.max(-1100, Math.min(1100, cp));
}

// ---------------------------------------------------------------------------
// Standalone ChessDB fetch (no hook state, safe to call concurrently)
// ---------------------------------------------------------------------------
async function fetchChessDBFast(fen: string): Promise<CandidateMove[]> {
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
async function parallelLimit<T>(
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
const useGameReview = (stockfishEngine: UciEngine | undefined, searchDepth: number = 15) => {
  const [gameReview, setGameReview] = useSessionStorage<MoveAnalysis[]>(
    "agine_current_game_review",
    []
  );
  const [gameReviewLoading, setGameReviewLoading] = useState(false);
  const [gameReviewProgress, setGameReviewProgress] = useState(0);
  const [rootCurrentMove, setRootCurrentMove] = useState(0);

  const { analyzePositionNet } = useNets({
    fen: "",
    gameReviewMode: true,
    useLichessBook: false,
    maxRetries: 1,
    enabledModels: ["bigLeela"],
  });

  const stockfishEmCalc = new StockfishEaseMetricCalculator(false);
  const chessDbEmCalc = new ChessDBEaseMetricCalculator(false);

  const generateGameReview = useCallback(
    async (gameNotation: string[], customFen?: string): Promise<void> => {
      setGameReviewLoading(true);
      setGameReviewProgress(0);

      if (!stockfishEngine) {
        console.warn("Chess engine unavailable");
        setGameReviewLoading(false);
        return;
      }

      try {
        // ── Phase 0: build ply list (sync) ──────────────────────────────────
        interface PlyInfo {
          plyIndex: number;
          preMovefen: string;
          postMovefen: string;
          activePlayer: Color;
          moveNotation: string;
          arrowMove: Move;
          uciMove: string;
          openingMatch: boolean;
          /** UCI moves from the game start up to (not including) this ply.
           *  Used as "position startpos moves <...>" to warm Stockfish's TT
           *  with ancestor positions before searching preMovefen.
           *  Mirrors the Lichess/fishnet reverse-order analysis technique. */
          movesUpToPre: string[];
          /** UCI moves from game start through this ply (post-move position). */
          movesUpToPost: string[];
        }

        const gameBoard = new Chess(customFen);
        const plyInfos: PlyInfo[] = [];
        const moveHistory: string[] = [];

        for (let ply = 0; ply < gameNotation.length; ply++) {
          const preMovefen = gameBoard.fen();
          const activePlayer = gameBoard.turn();
          const moveNotation = gameNotation[ply];
          const moveObject = gameBoard.move(moveNotation);
          if (!moveObject) {
            console.error(`Illegal move: ${moveNotation} at ply ${ply}`);
            continue;
          }
          const uciMove =
            moveObject.from + moveObject.to + (moveObject.promotion || "");
          // Snapshot the move list BEFORE pushing this move — these are the
          // ancestor moves up to (not including) the current ply.
          const movesUpToPre = [...moveHistory];
          moveHistory.push(uciMove);
          plyInfos.push({
            plyIndex: ply,
            preMovefen,
            postMovefen: gameBoard.fen(),
            activePlayer,
            moveNotation,
            arrowMove: moveObject,
            uciMove,
            openingMatch: isFenInAllDatabases(gameBoard.fen()),
            movesUpToPre,
            movesUpToPost: [...moveHistory],
          });
        }

        const total = plyInfos.length;
        setGameReviewProgress(5);

        // ── Phase 1: parallel ChessDB (8 concurrent, pre+post together) ─────
        const nonBook = plyInfos.filter((p) => !p.openingMatch);

        const [preResults, postResults] = await Promise.all([
          parallelLimit(
            nonBook.map((p) => () => fetchChessDBFast(p.preMovefen)),
            8
          ),
          parallelLimit(
            nonBook.map((p) => () => fetchChessDBFast(p.postMovefen)),
            8
          ),
        ]);

        const preDB = new Map<number, CandidateMove[]>();
        const postDB = new Map<number, CandidateMove[]>();
        nonBook.forEach((p, i) => {
          preDB.set(p.plyIndex, preResults[i]);
          postDB.set(p.plyIndex, postResults[i]);
        });

        setGameReviewProgress(45);

        // ── Phase 2: Stockfish — only positions ChessDB missed ───────────────
        interface SfCache {
          preMoveWinRate: number;
          secondBestWinRate: number | undefined;
          postMoveWinRate: number;
          bestMove: string | undefined;
          sanBestMove: string | undefined;
          evalMove: number; // centipawns from White's perspective, AFTER the move
          sfAnalysis?: any; // for ease metric
        }

        const sfCache = new Map<number, SfCache>();
        const sfNeeded = nonBook.filter(
          (p) =>
            preDB.get(p.plyIndex)!.length === 0 ||
            postDB.get(p.plyIndex)!.length === 0
        );

        // ── Reverse-order analysis (Lichess/fishnet technique) ────────────────
        // Process from the LAST position backwards to the first.  When Stockfish
        // evaluates a position it loads its entire search tree into the
        // transposition table (TT).  Positions closer to the end of the game
        // share many sub-trees with positions a few moves earlier.  By starting
        // from the end, each earlier evaluation benefits from hash hits left by
        // the later one — exactly how Lichess fishnet workers analyse games.
        //
        // We also pass `moves` so the engine uses:
        //   "position startpos moves e2e4 d7d5 ..."
        // instead of a bare FEN.  Stockfish replays the whole move sequence
        // internally, populating the TT with all ancestor nodes before it even
        // begins the search.  For custom starting positions (customFen) the move
        // list is passed as null so we fall back to the bare FEN path.
        const isStartPos = !customFen; // true  → can use "position startpos moves"
        const sfReversed = [...sfNeeded].reverse();

        let sfDone = 0;
        for (const p of sfReversed) {
          const preData = preDB.get(p.plyIndex)!;
          const postData = postDB.get(p.plyIndex)!;

          let preMoveWinRate = 0;
          let secondBestWinRate: number | undefined;
          let postMoveWinRate = 0;
          let bestMove: string | undefined;
          let sanBestMove: string | undefined;
          let evalMove = 0;
          let sfAnalysis: any;

          if (preData.length === 0) {
            const analysis = await stockfishEngine.evaluatePositionWithUpdate({
              fen: p.preMovefen,
              depth: searchDepth,
              multiPv: 3,
              moves: isStartPos ? p.movesUpToPre : null,
            });
            sfAnalysis = analysis;

            const wwr = evaluationToWinRate(analysis.lines?.[0]);
            preMoveWinRate = p.activePlayer === "w" ? wwr : 100 - wwr;

            const s2 = analysis.lines?.[1];
            const wwr2 = s2 ? evaluationToWinRate(s2) : undefined;
            secondBestWinRate = wwr2
              ? p.activePlayer === "w" ? wwr2 : 100 - wwr2
              : undefined;

            bestMove = analysis.bestMove;
            // evalMove is assigned from the POST-move position below

            const tmp = new Chess(p.preMovefen);
            const mo = bestMove ? tmp.move(bestMove) : undefined;
            sanBestMove = mo?.san;
          } else {
            preMoveWinRate = percentToNumber(preData[0].winrate);
            // Use rawEval (centipawns) from ChessDB, not the pre-divided score string
            secondBestWinRate = preData[1]
              ? percentToNumber(preData[1].winrate)
              : undefined;
            bestMove = preData[0].uci;
            sanBestMove = preData[0].san;
          }

          // ── Evaluate the position AFTER the move (fixes 1-ply lag) ─────────
          if (postData.length === 0) {
            const postAnalysis = await stockfishEngine.evaluatePositionWithUpdate({
              fen: p.postMovefen,
              depth: searchDepth,
              multiPv: 1,
              moves: isStartPos ? p.movesUpToPost : null,
            });
            const pwwr = evaluationToWinRate(postAnalysis.lines?.[0]);
            postMoveWinRate = p.activePlayer === "w" ? pwwr : 100 - pwwr;
            // Post-move cp from White's perspective (Stockfish always returns from side-to-move;
            // after the move, the side-to-move is the opponent, so negate)
            const postCp = postAnalysis.lines?.[0]?.cp ?? 0;
            evalMove = clampEvalCp(-postCp); // negate: opponent's good position is bad for White
          } else {
            postMoveWinRate = 100 - percentToNumber(postData[0].winrate);
            // ChessDB rawEval is from the side-to-move's perspective at postMovefen;
            // negate to convert to White's perspective
            const postRaw = Number(postData[0].rawEval ?? 0);
            evalMove = clampEvalCp(p.activePlayer === "w" ? -postRaw : postRaw);
          }

          sfCache.set(p.plyIndex, {
            preMoveWinRate,
            secondBestWinRate,
            postMoveWinRate,
            bestMove,
            sanBestMove,
            evalMove,
            sfAnalysis,
          });

          sfDone++;
          // SF occupies 45–85 of progress
          setGameReviewProgress(
            45 + Math.round((sfDone / Math.max(sfNeeded.length, 1)) * 40)
          );
        }

        setGameReviewProgress(85);

        // ── Phase 3: fire ALL net evals concurrently (non-blocking) ─────────
        // These run while classification happens below; by the time we await
        // each promise the net will usually already be done.
        const netPromises = new Map<number, Promise<number | undefined>>();

        for (const p of nonBook) {
          const preData = preDB.get(p.plyIndex)!;
          const sf = sfCache.get(p.plyIndex);

          netPromises.set(
            p.plyIndex,
            (async (): Promise<number | undefined> => {
              try {
                const netResult = await analyzePositionNet?.(p.preMovefen);
                if (!netResult?.bigLeela) return undefined;
                if (preData.length > 0)
                  return chessDbEmCalc.calculateEaseMetric(netResult.bigLeela, preData);
                if (sf?.sfAnalysis)
                  return stockfishEmCalc.calculateEaseMetric(netResult.bigLeela, sf.sfAnalysis);
                return undefined;
              } catch {
                return undefined;
              }
            })()
          );
        }

        // ── Phase 4: classify ────────────────────────────────────────────────
        const moveEvaluations: MoveAnalysis[] = [];

        for (let i = 0; i < plyInfos.length; i++) {
          const p = plyInfos[i];
          setGameReviewProgress(85 + Math.round(((i + 1) / total) * 15));

          if (p.openingMatch) {
            moveEvaluations.push({
              plyNumber: p.plyIndex,
              fen: p.preMovefen,
              notation: p.moveNotation,
              sanNotation: p.arrowMove.san,
              evalMove: 0,
              currenFen: p.postMovefen,
              arrowMove: p.arrowMove,
              quality: "Book",
              easeMetric: 0.9,
              player: p.activePlayer,
            });
            continue;
          }

          const preData = preDB.get(p.plyIndex)!;
          const postData = postDB.get(p.plyIndex)!;
          const sf = sfCache.get(p.plyIndex);

          let preMoveWinRate: number;
          let secondBestWinRate: number | undefined;
          let postMoveWinRate: number;
          let bestMove: string | undefined;
          let sanBestMove: string | undefined;
          let evalMove: number;

          if (sf) {
            ({
              preMoveWinRate,
              secondBestWinRate,
              postMoveWinRate,
              bestMove,
              sanBestMove,
              evalMove,
            } = sf);
          } else {
            preMoveWinRate = percentToNumber(preData[0].winrate);
            secondBestWinRate = preData[1]
              ? percentToNumber(preData[1].winrate)
              : undefined;
            bestMove = preData[0].uci;
            sanBestMove = preData[0].san;
            postMoveWinRate = 100 - percentToNumber(postData[0].winrate);
            // Use post-move rawEval (centipawns) for correct graph scale and no 1-ply lag.
            // ChessDB rawEval is from the side-to-move at postMovefen (the opponent after the move);
            // negate to convert to White's perspective.
            const postRaw = Number(postData[0].rawEval ?? 0);
            evalMove = clampEvalCp(p.activePlayer === "w" ? -postRaw : postRaw);
          }

          // Await net — typically already resolved
          const easeMetric = await (
            netPromises.get(p.plyIndex) ?? Promise.resolve(undefined)
          );

          const playedMove = moveHistory[i];
          let quality: MoveAnalysis["quality"];

          if (isVeryGoodMove(preMoveWinRate, postMoveWinRate, secondBestWinRate)) {
            quality = "Very Good";
          } else if (playedMove === bestMove) {
            quality = "Best";
          } else {
            quality = getMoveBasicClassification(preMoveWinRate, postMoveWinRate);
          }

          moveEvaluations.push({
            plyNumber: p.plyIndex,
            notation: p.moveNotation,
            sanNotation: sanBestMove,
            quality,
            arrowMove: p.arrowMove,
            fen: p.preMovefen,
            evalMove,
            easeMetric,
            currenFen: p.postMovefen,
            player: p.activePlayer,
          });
        }

        console.log("Analysis Complete:", moveEvaluations);
        setGameReview(moveEvaluations);
        setGameReviewProgress(100);
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setGameReviewLoading(false);
      }
    },
    [stockfishEngine, searchDepth, analyzePositionNet]
  );

  return {
    gameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReview,
    setGameReviewLoading,
    generateGameReview,
    setRootCurrentMove,
    rootCurrentMove,
  };
};

export default useGameReview;