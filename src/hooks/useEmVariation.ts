import { StockfishVEaseMetricCalculator } from "@/libs/easemetric/stockfishVariationEaseMetric";
import { PositionEval } from "@/stockfish/engine/engine";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { Chess } from "chess.js";
import { useEffect, useState } from "react";
import { useNets } from "./useNets";
import { MaiaEvaluation } from "@/libs/nets/types";
import { easeMetricVariationCache } from "@/libs/easemetric/cache";
import { DEFAULT_ENGINE_LINES, MAX_PV_MOVES } from "@/libs/setting/helper";
import { useLocalStorage } from "usehooks-ts";

export function useEaseMetricVariation(
  Rfen: string,
  engine: UciEngine | null,
  RnetEval: MaiaEvaluation,
  RPositionEval: PositionEval | null,
) {
  const [variations, setVariations] = useState<PositionEval | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!RPositionEval) {
      console.log("useEaseMetricV: Root positionEval not present, exiting");
      return;
    }

    setIsLoading(true);

    try {
 
      const cached = await easeMetricVariationCache.get(Rfen);
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
        for (let j = 0; j < MAX_PV_MOVES; j++) {
          board.move(pv[j]);
        }
        const viEndFen = board.fen();
        console.log(`Line ${i}: End FEN = ${viEndFen}`);

        const viNetEval = await analyzePositionNet?.(viEndFen);
        console.log(`Line ${i}: Net evaluation retrieved`, viNetEval);

        const viEval = await engine?.evaluatePositionWithUpdate({
          fen: viEndFen,
          depth: 15,
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

      // Cache the result
      await easeMetricVariationCache.set(Rfen, updatedPositionEval);

      setVariations(updatedPositionEval);
    } catch (error) {
      console.error("Error computing ease metric variation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    computeEmVariation();
  }, [Rfen, engine]);


  return {
    variations,
    setVariations,
    isLoading,
    clearCache: () => easeMetricVariationCache.clear(),
    deleteCacheEntry: (fen: string) => easeMetricVariationCache.delete(fen),
  };
}