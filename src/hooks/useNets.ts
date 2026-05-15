import { useEffect, useState, useRef, useCallback } from "react";
import { useNetModels, useNetStatus } from "@/context/NetContext";
import { convertToSanEvaluation, MAIA_MODELS, MAIA3_MODELS, MAIA3_RATING_VALUES, MaiaEvaluation, ModelType, SanMaiaEvaluation } from "@/libs/nets/types";
import {
  getMaiaCacheKey,
  readMemCache,
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
  gameReviewMode?: boolean;
  supported?: boolean;
}

export interface MaiaEngineAnalysis {
  maia2?: { [key: string]: MaiaEvaluation } | null;
  bigLeela?: MaiaEvaluation | null;
  elitemaia?: MaiaEvaluation | null;
  maia3?: { [key: string]: MaiaEvaluation } | null;
}

export interface UseMaiaEngineResult {
  evaluations: MaiaEngineAnalysis;
  sanEvaluations: {
    maia2?: { [key: string]: SanMaiaEvaluation } | null;
    bigLeela?: SanMaiaEvaluation | null;
    elitemaia?: SanMaiaEvaluation | null;
    maia3?: { [key: string]: SanMaiaEvaluation } | null;
  };
  lichessData: {
    maia2?: { [key: string]: LichessData } | null;
    bigLeela?: LichessData | null;
    elitemaia?: LichessData | null;
    maia3?: { [key: string]: LichessData } | null;
  };
  isInBook: boolean;
  isLoading: boolean;
  Maiaerror: Error | null;
  evaluationsFen?: string | null;
  analyzePositionNet?: (customFen?: string | undefined) => Promise<MaiaEngineAnalysis | undefined>;
}

export const useNets = ({
  fen,
  enabledModels,
  useLichessBook = true,
  bookThreshold = 21,
  supported = true,
  gameReviewMode = false,
}: UseMaiaEngineOptions): UseMaiaEngineResult => {

  if (!supported) {
    return {
      evaluations: {},
      sanEvaluations: {},
      lichessData: {},
      isInBook: false,
      isLoading: false,
      Maiaerror: null,
      evaluationsFen: null,
      analyzePositionNet: async () => undefined,
    };
  }

  const { maia2, bigLeela, elitemaia, maia3 } = useNetModels();
  const { status, activeModels } = useNetStatus();

  const [evaluations, setEvaluations] = useState<UseMaiaEngineResult["evaluations"]>({});
  const [sanEvaluations, setSanEvaluations] = useState<UseMaiaEngineResult["sanEvaluations"]>({});
  const [lichessData, setLichessData] = useState<UseMaiaEngineResult["lichessData"]>({});
  const [isInBook, setIsInBook] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [evaluationsFen, setEvaluationsFen] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const analyzePosition = useCallback(async (customFen?: string) => {
    const fenToAnalyze = customFen || fen;
    if (!fenToAnalyze) return;

    const modelsToUse = enabledModels
      ? enabledModels.filter((m) => activeModels.includes(m))
      : activeModels;

    // No models ready — the useEffect will re-trigger when activeModels changes
    if (modelsToUse.length === 0) return;

    const cacheKey = getMaiaCacheKey({
      fen: fenToAnalyze,
      models: modelsToUse,
      useLichessBook,
      bookThreshold,
    });

    const memCached = readMemCache(cacheKey);
    if (memCached) {
      setEvaluations(memCached.evaluations);
      setSanEvaluations(memCached.sanEvaluations);
      setLichessData(memCached.lichessData);
      setIsInBook(memCached.isInBook);
      setEvaluationsFen(fenToAnalyze);
      setIsLoading(false);
      return memCached.evaluations;
    }

    const cached = await readMaiaCache(cacheKey);
    if (cached) {
      setEvaluations(cached.evaluations);
      setSanEvaluations(cached.sanEvaluations);
      setLichessData(cached.lichessData);
      setIsInBook(cached.isInBook);
      setEvaluationsFen(fenToAnalyze);
      setIsLoading(false);
      return cached.evaluations;
    }

    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    setIsLoading(true);
    setError(null);

    try {
      const newEvaluations: UseMaiaEngineResult["evaluations"] = {};
      const newSanEvaluations: UseMaiaEngineResult["sanEvaluations"] = {};
      const newLichessData: UseMaiaEngineResult["lichessData"] = {};
      let positionIsInBook = false;

      // ── Maia 2 ──────────────────────────────────────────────────────────
      if (modelsToUse.includes("maia2") && maia2 && status.maia2 === "ready") {
        if (currentAbortController.signal.aborted) return;

        const maia2Evaluations: { [key: string]: MaiaEvaluation } = {};
        const maia2SanEvaluations: { [key: string]: SanMaiaEvaluation } = {};
        const maia2LichessData: { [key: string]: LichessData } = {};
        let anyLichessDataAvailable = false;

        if (useLichessBook) {
          const lichessResults = await Promise.all(
            MAIA_MODELS.map((model) =>
              fetchLichessData(fenToAnalyze, parseInt(model), currentAbortController.signal)
            )
          );

          MAIA_MODELS.forEach((model, index) => {
            const lichessResult = lichessResults[index];
            if (lichessResult) {
              const totalGames = lichessResult.white + lichessResult.draws + lichessResult.black;
              maia2LichessData[model] = lichessResult;
              anyLichessDataAvailable = true;
              if (totalGames >= bookThreshold) {
                positionIsInBook = true;
                maia2Evaluations[model] = lichessToEvaluation(lichessResult);
                maia2SanEvaluations[model] = lichessToSanEvaluation(lichessResult);
              }
            }
          });

          if (anyLichessDataAvailable) newLichessData.maia2 = maia2LichessData;
        }

        if (!positionIsInBook) {
          const positions = [
            { fen: fenToAnalyze, eloSelf: 1100, eloOppo: 1100 },
            { fen: fenToAnalyze, eloSelf: 1200, eloOppo: 1200 },
            { fen: fenToAnalyze, eloSelf: 1300, eloOppo: 1300 },
            { fen: fenToAnalyze, eloSelf: 1400, eloOppo: 1400 },
            { fen: fenToAnalyze, eloSelf: 1500, eloOppo: 1500 },
            { fen: fenToAnalyze, eloSelf: 1600, eloOppo: 1600 },
            { fen: fenToAnalyze, eloSelf: 1700, eloOppo: 1700 },
            { fen: fenToAnalyze, eloSelf: 1800, eloOppo: 1800 },
            { fen: fenToAnalyze, eloSelf: 1900, eloOppo: 1900 },
          ];

          const results = await maia2.batchEval(positions);
          if (currentAbortController.signal.aborted) return;

          MAIA_MODELS.forEach((model, index) => {
            maia2Evaluations[model] = results[index];
            maia2SanEvaluations[model] = convertToSanEvaluation(results[index], fenToAnalyze);
          });

          newEvaluations.maia2 = maia2Evaluations;
        }

        newSanEvaluations.maia2 = maia2SanEvaluations;
      }

      // ── BigLeela ─────────────────────────────────────────────────────────
      if (modelsToUse.includes("bigLeela") && bigLeela && status.bigLeela === "ready") {
        if (currentAbortController.signal.aborted) return;
        const uciEval = await bigLeela.evaluate(fenToAnalyze);
        newEvaluations.bigLeela = uciEval;
        newSanEvaluations.bigLeela = convertToSanEvaluation(uciEval, fenToAnalyze);
      }

      // ── EliteMaia ────────────────────────────────────────────────────────
      if (modelsToUse.includes("elitemaia") && elitemaia && status.elitemaia === "ready") {
        if (currentAbortController.signal.aborted) return;
        const uciEval = await elitemaia.evaluate(fenToAnalyze);
        newEvaluations.elitemaia = uciEval;
        newSanEvaluations.elitemaia = convertToSanEvaluation(uciEval, fenToAnalyze);
      }

      // ── Maia 3 ───────────────────────────────────────────────────────────
      if (modelsToUse.includes("maia3") && maia3 && status.maia3 === "ready") {
        if (currentAbortController.signal.aborted) return;

        const positions = MAIA3_RATING_VALUES.map((rating) => ({
          fen: fenToAnalyze,
          eloSelf: rating,
          eloOppo: rating,
        }));

        const results = await maia3.batchEvaluate(positions);
        if (currentAbortController.signal.aborted) return;

        const maia3Evaluations: { [key: string]: MaiaEvaluation } = {};
        const maia3SanEvaluations: { [key: string]: SanMaiaEvaluation } = {};

        MAIA3_MODELS.forEach((model, index) => {
          maia3Evaluations[model] = results[index];
          maia3SanEvaluations[model] = convertToSanEvaluation(results[index], fenToAnalyze);
        });

        newEvaluations.maia3 = maia3Evaluations;
        newSanEvaluations.maia3 = maia3SanEvaluations;
      }

      if (!currentAbortController.signal.aborted) {
        await writeMaiaCache(cacheKey, {
          evaluations: newEvaluations,
          sanEvaluations: newSanEvaluations,
          lichessData: newLichessData,
          isInBook: positionIsInBook,
          timestamp: Date.now(),
        });

        setEvaluations(newEvaluations);
        setSanEvaluations(newSanEvaluations);
        setLichessData(newLichessData);
        setIsInBook(positionIsInBook);
        setEvaluationsFen(fenToAnalyze);

        return newEvaluations;
      }
    } catch (err) {
      if (!currentAbortController.signal.aborted) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        console.error("Analysis error:", e);
      }
    } finally {
      if (!currentAbortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [
    fen,
    maia2, bigLeela, elitemaia, maia3,
    status.maia2, status.bigLeela, status.elitemaia, status.maia3,
    activeModels,
    enabledModels,
    useLichessBook,
    bookThreshold,
  ]);

  useEffect(() => {
    if (gameReviewMode) return;

    // activeModels is in the dep array — this effect re-runs automatically
    // when a download completes and a model transitions to 'ready'.
    // No polling loop needed; React handles the re-trigger.
    if (activeModels.length === 0) return;

    // Abort any in-flight analysis for a previous fen or model set
    abortControllerRef.current?.abort();

    analyzePosition();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [
    fen,
    activeModels,      // ← re-runs when any model finishes downloading
    gameReviewMode,
    analyzePosition,
  ]);

  return {
    evaluations,
    sanEvaluations,
    lichessData,
    isInBook,
    evaluationsFen,
    isLoading,
    Maiaerror: error,
    analyzePositionNet: analyzePosition,
  };
};