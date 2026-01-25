import { useEffect, useState, useRef } from "react";
import { useNetModels, useNetStatus } from "@/context/NetContext";
import { convertToSanEvaluation, MAIA_MODELS, MaiaEvaluation, ModelType, SanMaiaEvaluation } from "@/libs/nets/types";
import {
  getMaiaCacheKey,
  readMaiaCache,
  writeMaiaCache,
} from "@/libs/nets/cache";
import { fetchLichessData, LichessData, lichessToEvaluation, lichessToSanEvaluation } from "@/libs/openingdatabase/lichessRatingOpening";

interface UseMaiaEngineOptions {
  fen: string;
  maxRetries?: number;
  retryDelayMs?: number;
  enabledModels?: ModelType[];
  useLichessBook?: boolean;
  bookThreshold?: number;
}


export interface MaiaEngineAnalysis {
  maia2?: { [key: string]: MaiaEvaluation } | null;
  bigLeela?: MaiaEvaluation | null;
  elitemaia?: MaiaEvaluation | null;
}

export interface UseMaiaEngineResult {
  evaluations: MaiaEngineAnalysis;
  sanEvaluations: {
    maia2?: { [key: string]: SanMaiaEvaluation } | null;
    bigLeela?: SanMaiaEvaluation | null;
    elitemaia?: SanMaiaEvaluation | null;
  };
  lichessData: {
    maia2?: { [key: string]: LichessData } | null;
    bigLeela?: LichessData | null;
    elitemaia?: LichessData | null;
  };
  isInBook: boolean;
  isLoading: boolean;
  Maiaerror: Error | null;
  evaluationsFen?: string | null;
}

export const useNets = ({
  fen,
  maxRetries = 30,
  retryDelayMs = 100,
  enabledModels,
  useLichessBook = true,
  bookThreshold = 21,
}: UseMaiaEngineOptions): UseMaiaEngineResult => {
  const { maia2, bigLeela, elitemaia } = useNetModels();
  const { status, activeModels } = useNetStatus();

  const [evaluations, setEvaluations] = useState<
    UseMaiaEngineResult["evaluations"]
  >({});
  const [sanEvaluations, setSanEvaluations] = useState<
    UseMaiaEngineResult["sanEvaluations"]
  >({});
  const [lichessData, setLichessData] = useState<
    UseMaiaEngineResult["lichessData"]
  >({});
  const [isInBook, setIsInBook] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [evaluationsFen, setEvaluationsFen] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    const analyzePosition = async () => {
      if (!fen) return;

      const modelsToUse = enabledModels
        ? enabledModels.filter((m) => activeModels.includes(m))
        : activeModels;

      const cacheKey = getMaiaCacheKey({
        fen,
        models: modelsToUse,
        useLichessBook,
        bookThreshold,
      });

      const cached = await readMaiaCache(cacheKey);
      if (cached) {
        setEvaluations(cached.evaluations);
        setSanEvaluations(cached.sanEvaluations);
        setLichessData(cached.lichessData);
        setIsInBook(cached.isInBook);
        setEvaluationsFen(fen);
        setIsLoading(false);
        return;
      }

      if (modelsToUse.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const newEvaluations: UseMaiaEngineResult["evaluations"] = {};
        const newSanEvaluations: UseMaiaEngineResult["sanEvaluations"] = {};
        const newLichessData: UseMaiaEngineResult["lichessData"] = {};
        let positionIsInBook = false;

        // Maia 2
        if (
          modelsToUse.includes("maia2") &&
          maia2 &&
          status.maia2 === "ready"
        ) {
          if (currentAbortController.signal.aborted) return;

          const maia2Evaluations: { [key: string]: MaiaEvaluation } = {};
          const maia2SanEvaluations: { [key: string]: SanMaiaEvaluation } = {};
          const maia2LichessData: { [key: string]: LichessData } = {};
          let anyLichessDataAvailable = false;

          if (useLichessBook) {
            const lichessPromises = MAIA_MODELS.map((model) =>
              fetchLichessData(
                fen,
                parseInt(model),
                currentAbortController.signal
              )
            );
            const lichessResults = await Promise.all(lichessPromises);

            MAIA_MODELS.forEach((model, index) => {
              const lichessResult = lichessResults[index];
              
              if (lichessResult) {
                const totalGames =
                  lichessResult.white + lichessResult.draws + lichessResult.black;

                maia2LichessData[model] = lichessResult;
                anyLichessDataAvailable = true;

                if (totalGames >= bookThreshold) {
                  positionIsInBook = true;
                  maia2Evaluations[model] = lichessToEvaluation(lichessResult);
                  maia2SanEvaluations[model] =
                    lichessToSanEvaluation(lichessResult);
                }
              }
            });

            if (anyLichessDataAvailable) {
              newLichessData.maia2 = maia2LichessData;
            }
          }

          // Fallback to neural network if not in book or Lichess failed
          if (!positionIsInBook) {
            const positions = [
              { fen, eloSelf: 1100, eloOppo: 1100 },
              { fen, eloSelf: 1200, eloOppo: 1200 },
              { fen, eloSelf: 1300, eloOppo: 1300 },
              { fen, eloSelf: 1400, eloOppo: 1400 },
              { fen, eloSelf: 1500, eloOppo: 1500 },
              { fen, eloSelf: 1600, eloOppo: 1600 },
              { fen, eloSelf: 1700, eloOppo: 1700 },
              { fen, eloSelf: 1800, eloOppo: 1800 },
              { fen, eloSelf: 1900, eloOppo: 1900 },
            ];

            const results = await maia2.batchEval(positions);

            if (currentAbortController.signal.aborted) return;

            MAIA_MODELS.forEach((model, index) => {
              const uciEval = results[index];
              maia2Evaluations[model] = uciEval;
              maia2SanEvaluations[model] = convertToSanEvaluation(uciEval, fen);
            });

            newEvaluations.maia2 = maia2Evaluations;
          }

          newSanEvaluations.maia2 = maia2SanEvaluations;
        }

        // BigLeela
        if (
          modelsToUse.includes("bigLeela") &&
          bigLeela &&
          status.bigLeela === "ready"
        ) {
          if (currentAbortController.signal.aborted) return;

          let usedBook = false;

          if (useLichessBook) {
            const lichessResult = await fetchLichessData(
              fen,
              2500,
              currentAbortController.signal
            );
            
            if (lichessResult) {
              const totalGames =
                lichessResult.white + lichessResult.draws + lichessResult.black;

              newLichessData.bigLeela = lichessResult;

              if (totalGames >= bookThreshold) {
                positionIsInBook = true;
                usedBook = true;
                newEvaluations.bigLeela = lichessToEvaluation(lichessResult);
                newSanEvaluations.bigLeela =
                  lichessToSanEvaluation(lichessResult);
              }
            }
          }

          if (!usedBook) {
            const uciEval = await bigLeela.evaluate(fen);
            newEvaluations.bigLeela = uciEval;
            newSanEvaluations.bigLeela = convertToSanEvaluation(uciEval, fen);
          }
        }

        // EliteMaia
        if (
          modelsToUse.includes("elitemaia") &&
          elitemaia &&
          status.elitemaia === "ready"
        ) {
          if (currentAbortController.signal.aborted) return;

          let usedBook = false;

          if (useLichessBook) {
            const lichessResult = await fetchLichessData(
              fen,
              2500,
              currentAbortController.signal
            );
            
            if (lichessResult) {
              const totalGames =
                lichessResult.white + lichessResult.draws + lichessResult.black;

              newLichessData.elitemaia = lichessResult;

              if (totalGames >= bookThreshold) {
                positionIsInBook = true;
                usedBook = true;
                newEvaluations.elitemaia = lichessToEvaluation(lichessResult);
                newSanEvaluations.elitemaia =
                  lichessToSanEvaluation(lichessResult);
              }
            }
          }

          if (!usedBook) {
            const uciEval = await elitemaia.evaluate(fen);
            newEvaluations.elitemaia = uciEval;
            newSanEvaluations.elitemaia = convertToSanEvaluation(uciEval, fen);
          }
        }

        if (!currentAbortController.signal.aborted) {
          const cacheEntry = {
            evaluations: newEvaluations,
            sanEvaluations: newSanEvaluations,
            lichessData: newLichessData,
            isInBook: positionIsInBook,
            timestamp: Date.now(),
          };

          await writeMaiaCache(cacheKey, cacheEntry);

          setEvaluations(newEvaluations);
          setSanEvaluations(newSanEvaluations);
          setLichessData(newLichessData);
          setIsInBook(positionIsInBook);
          setEvaluationsFen(fen);
        }
      } catch (err) {
        if (!currentAbortController.signal.aborted) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error);
          console.error("Analysis error:", error);
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const waitForModels = async () => {
      let retries = 0;
      while (retries < maxRetries) {
        if (currentAbortController.signal.aborted) return;

        const modelsToUse = enabledModels
          ? enabledModels.filter((m) => activeModels.includes(m))
          : activeModels;

        if (modelsToUse.length > 0) {
          await analyzePosition();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        retries++;
      }

      if (!currentAbortController.signal.aborted) {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!currentAbortController.signal.aborted) {
        waitForModels();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [
    fen,
    maia2,
    bigLeela,
    elitemaia,
    status.maia2,
    status.bigLeela,
    status.elitemaia,
    activeModels,
    enabledModels,
    useLichessBook,
    bookThreshold,
    maxRetries,
    retryDelayMs,
  ]);

  return {
    evaluations,
    sanEvaluations,
    lichessData,
    isInBook,
    evaluationsFen,
    isLoading,
    Maiaerror: error,
  };
};