import { StockfishVEaseMetricCalculator } from "@/libs/easemetric/stockfishVariationEaseMetric";
import { PositionEval } from "@/stockfish/engine/engine";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";
import { useNets } from "./useNets";
import { MaiaEvaluation } from "@/libs/nets/types";
import { easeMetricVariationCache } from "@/libs/easemetric/cache";
import { DEFAULT_ENGINE_DEPTH, DEFAULT_ENGINE_LINES } from "@/libs/setting/helper";
import { useLocalStorage } from "usehooks-ts";

// The exact error object thrown by async-mutex when a lock is canceled.
// Importing from async-mutex itself to avoid string-matching.
const E_CANCELED_MESSAGE = "request for lock canceled";

function isMutexCanceled(err: unknown): boolean {
  return err instanceof Error && err.message === E_CANCELED_MESSAGE;
}

export function useEaseMetricVariation(
  Rfen: string,
  engine: UciEngine | null,
  RnetEval: MaiaEvaluation,
  RPositionEval: PositionEval | null,
  Max_PV: number
) {
  const [variations, setVariations] = useState<PositionEval | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [engineDepth] = useLocalStorage<number>("engineDepth", DEFAULT_ENGINE_DEPTH);
  const [engineLines] = useLocalStorage<number>("engineLines", DEFAULT_ENGINE_LINES);

  const { analyzePositionNet } = useNets({
    fen: Rfen,
    maxRetries: 1,
    gameReviewMode: true,
    useLichessBook: false,
  });

  const stockfishVariationCal = new StockfishVEaseMetricCalculator(true);

  const computeEmVariation = async (signal: AbortSignal) => {
    if (!RPositionEval) {
      console.log("useEaseMetricV: Root positionEval not present, exiting");
      return;
    }

    setIsLoading(true);

    try {
      const cacheKey = `${Rfen}:${Max_PV}`;
      const cached = await easeMetricVariationCache.get(cacheKey);
      if (cached) {
        console.log("Using cached EaseMetricVariation");
        if (!signal.aborted) setVariations(cached);
        return;
      }

      console.log(
        "Starting variation computation for",
        RPositionEval.lines.length,
        "lines"
      );

      const updatedPositionEval = JSON.parse(
        JSON.stringify(RPositionEval)
      ) as PositionEval;

      for (let i = 0; i < updatedPositionEval.lines.length; i++) {
        // Bail out early if a newer position was requested
        if (signal.aborted) {
          console.log("useEaseMetricV: aborted before line", i);
          return;
        }

        console.log(
          `Processing line ${i + 1}/${updatedPositionEval.lines.length}`
        );

        const board = new Chess(Rfen);
        const pv = updatedPositionEval.lines[i].pv;
        const maxLineMoves = Math.min(Max_PV, pv.length);
        for (let j = 0; j < maxLineMoves; j++) {
          board.move(pv[j]);
        }
        const viEndFen = board.fen();

        // Net evaluation
        let viNetEval: MaiaEvaluation | undefined;
        try {
          const result = await analyzePositionNet?.(viEndFen);
          viNetEval = result?.bigLeela ?? undefined;
        } catch (err) {
          if (isMutexCanceled(err) || signal.aborted) {
            console.log(`Line ${i}: net eval canceled/aborted, skipping`);
            return;
          }
          throw err;
        }

        if (signal.aborted) return;

        // Engine evaluation — the most likely source of E_CANCELED
        let viEval: PositionEval | undefined;
        try {
          viEval = await engine?.evaluatePositionWithUpdate({
            fen: viEndFen,
            depth: engineDepth,
            multiPv: engineLines,
          });
        } catch (err) {
          if (isMutexCanceled(err) || signal.aborted) {
            // Normal: a new position preempted this evaluation.
            console.log(`Line ${i}: engine eval canceled (new position requested), stopping`);
            return;
          }
          throw err;
        }

        if (signal.aborted) return;

        const viEm = stockfishVariationCal.calculatePvEaseMetric(
          RnetEval,
          RPositionEval,
          viNetEval!,
          viEval
        );
        console.log(`Line ${i}: Ease metric = ${viEm}`);
        updatedPositionEval.lines[i].endingEM = viEm;
      }

      if (signal.aborted) return;

      console.log("Variation computation completed");
      await easeMetricVariationCache.set(cacheKey, updatedPositionEval);
      setVariations(updatedPositionEval);
    } catch (error) {
      if (isMutexCanceled(error) || signal.aborted) {
        // Silently swallow — expected when engine moves to a new position
        console.log("useEaseMetricV: suppressed mutex cancel/abort error");
        return;
      }
      console.error("Error computing ease metric variation:", error);
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Cancel any in-flight computation for the previous fen
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    computeEmVariation(controller.signal);

    return () => {
      controller.abort();
    };
  }, [Rfen, engine, Max_PV]);

  return {
    variations,
    setVariations,
    isLoading,
    clearCache: () => easeMetricVariationCache.clear(),
    deleteCacheEntry: (fen: string) => easeMetricVariationCache.delete(fen),
  };
}