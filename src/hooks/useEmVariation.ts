import { StockfishVEaseMetricCalculator } from "@/libs/easemetric/stockfishVariationEaseMetric";
import { PositionEval } from "@/stockfish/engine/engine";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { Chess } from "chess.js";
import { useEffect, useState } from "react";
import { useNets } from "./useNets";
import { MaiaEvaluation } from "@/libs/nets/types";
import { easeMetricVariationCache } from "@/libs/easemetric/cache";
import { DEFAULT_ENGINE_DEPTH, DEFAULT_ENGINE_LINES, MAX_PV_MOVES } from "@/libs/setting/helper";
import { useLocalStorage } from "usehooks-ts";

export function useEaseMetricVariation(
  supportsEM: boolean,
  Rfen: string,
  engine: UciEngine | null,
  RnetEval: MaiaEvaluation,
  RPositionEval: PositionEval | null,
  Max_PV: number
) {
  const [variations, setVariations] = useState<PositionEval | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [engineDepth] = useLocalStorage<number>(
      "engineDepth",
      DEFAULT_ENGINE_DEPTH
    );
  const [engineLines] = useLocalStorage<number>(
      "engineLines",
      DEFAULT_ENGINE_LINES
  );
  const { analyzePositionNet } = useNets({
    fen: Rfen,
    maxRetries: 1,
    gameReviewMode: true,
    useLichessBook: false,
  });
  const stockfishVariationCal = new StockfishVEaseMetricCalculator(true);

  const computeEmVariation = async () => {

    if(!supportsEM){
      return;
    }

    if (!RPositionEval) {
      console.log("useEaseMetricV: Root positionEval not present, exiting");
      return;
    }

    setIsLoading(true);

    try {

      const cacheKey = `${Rfen}:${Max_PV}`
 
      const cached = await easeMetricVariationCache.get(cacheKey);
      if (cached) {
        console.log("Using cached EaseMetricVariation");
        setVariations(cached);
        setIsLoading(false);
        return;
      }

      console.log("Starting variation computation for", RPositionEval.lines.length, "lines");

      const updatedPositionEval = JSON.parse(JSON.stringify(RPositionEval)) as PositionEval;

      for (let i = 0; i < updatedPositionEval.lines.length; i++) {
        console.log(`Processing line ${i + 1}/${updatedPositionEval.lines.length}`);

        const board = new Chess(Rfen);
        const pv = updatedPositionEval.lines[i].pv;
        const maxLineMoves = Max_PV > pv.length ? pv.length : Math.min(Max_PV, pv.length);
        for (let j = 0; j < maxLineMoves; j++) {
          board.move(pv[j]);
        }
        const viEndFen = board.fen();
        console.log(`Line ${i}: End FEN = ${viEndFen}`);

        const viNetEval = await analyzePositionNet?.(viEndFen);
        console.log(`Line ${i}: Net evaluation retrieved`, viNetEval);

        const viEval = await engine?.evaluatePositionWithUpdate({
          fen: viEndFen,
          depth: engineDepth,
          multiPv: engineLines,
        });
        console.log(`Line ${i}: Engine evaluation retrieved`, viEval);

        const viEm = stockfishVariationCal.calculatePvEaseMetric(
          RnetEval,
          RPositionEval,
          viNetEval?.bigLeela!,
          viEval
        );
        console.log(`Line ${i}: Ease metric calculated = ${viEm}`);

        updatedPositionEval.lines[i].endingEM = viEm;
      }

      console.log("Variation computation completed");

      await easeMetricVariationCache.set(cacheKey, updatedPositionEval);

      setVariations(updatedPositionEval);
    } catch (error) {
      console.error("Error computing ease metric variation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    computeEmVariation();
  }, [Rfen, engine, Max_PV]);


  return {
    variations,
    setVariations,
    isLoading,
    clearCache: () => easeMetricVariationCache.clear(),
    deleteCacheEntry: (fen: string) => easeMetricVariationCache.delete(fen),
  };
}