import { useEffect, useState, useRef, useCallback } from "react";
import {
  convertToSanEvaluation,
  MAIA3_MODELS,
  MaiaEvaluation,
  ModelType,
  SanMaiaEvaluation,
  UseMaiaEngineOptions,
  UseMaiaEngineResult,
  MaiaEngineAnalysis,
  NNData,
  BatchEntry,
} from "@/libs/nets/types";
import { cachedFetch, makeCacheKey } from "@/libs/nets/nnCache";

const ALL_MODELS: ModelType[] = ["bigLeela", "elitemaia", "maia3"];

const EMPTY_STATE: UseMaiaEngineResult = {
  evaluations: {},
  sanEvaluations: {},
  isLoading: false,
  Maiaerror: null,
  evaluationsFen: null,
  analyzePositionNet: async () => undefined,
};


/**
 * Fetch Maia3 batch analysis across all rating levels
 * @param fen - Chess position in FEN format
 * @returns Dictionary mapping model names (e.g., 'maia_kdd_600') to evaluations
 * @throws Error if the API request fails
 */
async function fetchBatch(fen: string): Promise<Record<string, MaiaEvaluation>> {
  const res = await fetch("/api/nn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: "batch-maia3", fen }),
  });
  
  if (!res.ok) {
    throw new Error(`batch-maia3 failed: ${res.status}`);
  }
  
  const json = await res.json();
  const evaluations: Record<string, MaiaEvaluation> = {};
  
  for (const entry of (json.results ?? []) as BatchEntry[]) {
    const { topMoves, uciEval } = entry.analysis;
    
    const policy: Record<string, number> = {};
    for (const { move, probability } of topMoves) {
      policy[move] = probability;
    }
    
    evaluations[`maia_kdd_${entry.rating}`] = {
      value: uciEval?.value ?? 0.5,
      policy,
    };
  }
  
  return evaluations;
}

/**
 * Fetch single-model neural network analysis (Leela or Elite Leela)
 * @param fen - Chess position in FEN format
 * @param engine - Neural network engine ('leela' or 'elite-leela')
 * @returns Evaluation with UCI-keyed policy
 * @throws Error if the API request fails
 */
async function fetchSingleEngine(
  fen: string,
  engine: "leela" | "elite-leela",
): Promise<MaiaEvaluation> {
  const res = await fetch("/api/nn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: "analyze", fen, engine }),
  });
  
  if (!res.ok) {
    throw new Error(`${engine} failed: ${res.status}`);
  }
  
  const json = await res.json();
  const { uciEval, topMoves } = json.data as NNData;
  
  // Prefer uciEval if available (already has UCI-keyed policy)
  if (uciEval) {
    return { value: uciEval.value, policy: uciEval.policy };
  }
  
  // Fallback: convert top moves to policy dictionary
  const policy: Record<string, number> = {};
  for (const { move, probability } of topMoves) {
    policy[move] = probability;
  }
  
  return { value: 0.5, policy };
}

/**
 * Fetch Maia3 batch with caching
 * @param fen - Chess position in FEN format
 * @returns Cached or fresh batch analysis
 */
function fetchBatchCached(fen: string) {
  return cachedFetch(makeCacheKey("batch-maia3", fen), () => fetchBatch(fen));
}

/**
 * Fetch Leela analysis with caching
 * @param fen - Chess position in FEN format
 * @returns Cached or fresh Leela evaluation
 */
function fetchLeelaCached(fen: string) {
  return cachedFetch(makeCacheKey("leela", fen), () => fetchSingleEngine(fen, "leela"));
}

/**
 * Fetch Elite Leela analysis with caching
 * @param fen - Chess position in FEN format
 * @returns Cached or fresh Elite Leela evaluation
 */
function fetchEliteCached(fen: string) {
  return cachedFetch(makeCacheKey("elite-leela", fen), () => fetchSingleEngine(fen, "elite-leela"));
}


/**
 * React hook for analyzing chess positions with neural networks
 *
 * Provides evaluations from multiple neural networks (Leela, Elite Leela, Maia3).
 * All evaluations are cached to prevent duplicate requests. Returns both UCI-keyed
 * evaluations (for calculations) and SAN-keyed evaluations (for UI display).
 *
 * @param options - Configuration options
 * @returns Hook result with evaluations, loading state, and analysis function
 *
 * @example
 * const { evaluations, sanEvaluations, isLoading, analyzePositionNet } = useNets({
 *   fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
 *   enabledModels: ["maia3", "bigLeela"],
 *   supported: true,
 * });
 *
 * // Manual analysis for game review
 * const results = await analyzePositionNet(customFen);
 */
export const useNets = ({
  fen,
  enabledModels,
  gameReviewMode = false,
  supported = true,
}: UseMaiaEngineOptions): UseMaiaEngineResult => {

  const [evaluations, setEvaluations] = useState<MaiaEngineAnalysis>({});
  const [sanEvaluations, setSanEvaluations] = useState<UseMaiaEngineResult["sanEvaluations"]>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [evaluationsFen, setEvaluationsFen] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const models = enabledModels ?? ALL_MODELS;


  /**
   * Manually analyze a position (for game review or custom positions)
   *
   * Fetches evaluations from all enabled networks. No internal abort controller —
   * safe for concurrent calls. All fetches use L1/L2 cache, so duplicate requests
   * are free.
   *
   * @param customFen - Optional FEN to analyze instead of the hook's fen
   * @returns UCI-keyed evaluations or undefined on error
   */
  const analyzePosition = useCallback(
    async (customFen?: string): Promise<MaiaEngineAnalysis | undefined> => {
      if (!supported) return undefined;
      
      const targetFen = customFen || fen;
      if (!targetFen) return undefined;

      try {
        const evaluations: MaiaEngineAnalysis = {};
        const sanEvals: UseMaiaEngineResult["sanEvaluations"] = {};

        // Fetch all models in parallel
        const [batch, leelaEval, eliteEval] = await Promise.all([
          models.includes("maia3") ? fetchBatchCached(targetFen) : Promise.resolve(null),
          models.includes("bigLeela") ? fetchLeelaCached(targetFen) : Promise.resolve(null),
          models.includes("elitemaia") ? fetchEliteCached(targetFen) : Promise.resolve(null),
        ]);

        // Process Maia3 batch
        if (batch) {
          const maia3Evaluations: Record<string, MaiaEvaluation> = {};
          const maia3SanEvaluations: Record<string, SanMaiaEvaluation> = {};
          
          MAIA3_MODELS.forEach((modelName) => {
            const evaluation = batch[modelName];
            if (evaluation) {
              maia3Evaluations[modelName] = evaluation;
              maia3SanEvaluations[modelName] = evaluation; // Maia3 topMoves already in SAN from server
            }
          });
          
          evaluations.maia3 = maia3Evaluations;
          sanEvals.maia3 = maia3SanEvaluations;
        }

        // Process Leela evaluation
        if (leelaEval) {
          evaluations.bigLeela = leelaEval; // UCI — for ease metric calculations
          sanEvals.bigLeela = convertToSanEvaluation(leelaEval, targetFen); // SAN — for UI arrows
        }

        // Process Elite Leela evaluation
        if (eliteEval) {
          evaluations.elitemaia = eliteEval;
          sanEvals.elitemaia = convertToSanEvaluation(eliteEval, targetFen);
        }

        return evaluations;
      } catch (err) {
        console.error("[useNets]", err);
        return undefined;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, JSON.stringify(models), supported],
  );

  /**
   * Auto-analyze position on FEN change (unless in game review mode)
   * Cancels previous requests when FEN changes or component unmounts
   */
  useEffect(() => {
    if (!supported || gameReviewMode) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsLoading(true);
    setError(null);

    analyzePosition(fen)
      .then((result) => {
        if (abort.signal.aborted || !result) return;

        const sanEvals: UseMaiaEngineResult["sanEvaluations"] = {};
        if (result.maia3) sanEvals.maia3 = result.maia3;
        if (result.bigLeela) sanEvals.bigLeela = convertToSanEvaluation(result.bigLeela, fen);
        if (result.elitemaia) sanEvals.elitemaia = convertToSanEvaluation(result.elitemaia, fen);

        setEvaluations(result);
        setSanEvaluations(sanEvals);
        setEvaluationsFen(fen);
      })
      .catch((err) => {
        if (!abort.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setIsLoading(false);
      });

    return () => {
      abort.abort();
    };
  }, [fen, gameReviewMode, supported, analyzePosition]);


  if (!supported) {
    return EMPTY_STATE;
  }

  return {
    evaluations,
    sanEvaluations,
    isLoading,
    Maiaerror: error,
    evaluationsFen,
    analyzePositionNet: analyzePosition,
  };
};
