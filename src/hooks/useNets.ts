import { useEffect, useState, useRef, useCallback } from "react";
import {
  convertToSanEvaluation,
  MAIA3_MODELS,
  MaiaEvaluation,
  ModelType,
  SanMaiaEvaluation,
} from "@/libs/nets/types";
import { cachedFetch, makeCacheKey } from "@/libs/nets/nnCache";

interface UseMaiaEngineOptions {
  fen: string;
  enabledModels?: ModelType[];
  gameReviewMode?: boolean;
  supported?: boolean;
}

export interface MaiaEngineAnalysis {
  /** UCI-keyed policy — needed by ease metric calculators */
  bigLeela?: MaiaEvaluation | null;
  elitemaia?: MaiaEvaluation | null;
  maia3?: { [key: string]: MaiaEvaluation } | null;
}

export interface UseMaiaEngineResult {
  evaluations: MaiaEngineAnalysis;
  /** SAN-keyed policy — for UI arrows / NetResults display */
  sanEvaluations: {
    bigLeela?: SanMaiaEvaluation | null;
    elitemaia?: SanMaiaEvaluation | null;
    maia3?: { [key: string]: SanMaiaEvaluation } | null;
  };
  isLoading: boolean;
  Maiaerror: Error | null;
  evaluationsFen?: string | null;
  analyzePositionNet?: (customFen?: string) => Promise<MaiaEngineAnalysis | undefined>;
}

const ALL_MODELS: ModelType[] = ["bigLeela", "elitemaia", "maia3"];

const EMPTY: UseMaiaEngineResult = {
  evaluations: {}, sanEvaluations: {},
  isLoading: false, Maiaerror: null, evaluationsFen: null,
  analyzePositionNet: async () => undefined,
};

// ── Wire types ────────────────────────────────────────────────────────────────

interface TopMove { move: string; probability: number }
interface UciEval { policy: Record<string, number>; value: number }
interface NNData { topMoves: TopMove[]; uciEval?: UciEval }
interface BatchEntry {
  rating: number;
  analysis: { topMoves: TopMove[]; uciEval?: UciEval };
}

// ── Raw fetchers ──────────────────────────────────────────────────────────────

async function _fetchBatch(fen: string): Promise<Record<string, MaiaEvaluation>> {
  const res = await fetch("/api/nn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: "batch-maia3", fen }),
  });
  if (!res.ok) throw new Error(`batch-maia3 failed: ${res.status}`);
  const json = await res.json();
  const out: Record<string, MaiaEvaluation> = {};
  for (const entry of (json.results ?? []) as BatchEntry[]) {
    const { topMoves, uciEval } = entry.analysis;
    const policy: Record<string, number> = {};
    for (const { move, probability } of topMoves) policy[move] = probability;
    out[`maia_kdd_${entry.rating}`] = { value: uciEval?.value ?? 0.5, policy };
  }
  return out;
}

async function _fetchSingleEngine(
  fen: string,
  engine: "leela" | "elite-leela",
): Promise<MaiaEvaluation> {
  const res = await fetch("/api/nn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: "analyze", fen, engine }),
  });
  if (!res.ok) throw new Error(`${engine} failed: ${res.status}`);
  const json = await res.json();
  const { uciEval, topMoves } = json.data as NNData;
  // Keep UCI-keyed policy — ease metric calculators need UCI keys
  if (uciEval) return { value: uciEval.value, policy: uciEval.policy };
  const policy: Record<string, number> = {};
  for (const { move, probability } of topMoves) policy[move] = probability;
  return { value: 0.5, policy };
}

// ── Cached public fetchers ────────────────────────────────────────────────────

function fetchBatchCached(fen: string) {
  return cachedFetch(makeCacheKey("batch-maia3", fen), () => _fetchBatch(fen));
}

function fetchLeelaCached(fen: string) {
  return cachedFetch(makeCacheKey("leela", fen), () => _fetchSingleEngine(fen, "leela"));
}

function fetchEliteCached(fen: string) {
  return cachedFetch(makeCacheKey("elite-leela", fen), () => _fetchSingleEngine(fen, "elite-leela"));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useNets = ({
  fen,
  enabledModels,
  gameReviewMode = false,
  supported = true,
}: UseMaiaEngineOptions): UseMaiaEngineResult => {
  const [evaluations,    setEvaluations]    = useState<MaiaEngineAnalysis>({});
  const [sanEvaluations, setSanEvaluations] = useState<UseMaiaEngineResult["sanEvaluations"]>({});
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState<Error | null>(null);
  const [evaluationsFen, setEvaluationsFen] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const models = enabledModels ?? ALL_MODELS;

  /**
   * No internal AbortController — safe for concurrent calls (game review).
   * All fetches go through L1/L2 cache so duplicates are free.
   */
  const analyzePosition = useCallback(
    async (customFen?: string): Promise<MaiaEngineAnalysis | undefined> => {
      if (!supported) return undefined;
      const f = customFen || fen;
      if (!f) return undefined;

      try {
        const evals: MaiaEngineAnalysis = {};
        const sanEvals: UseMaiaEngineResult["sanEvaluations"] = {};

        const [batch, leelaEv, eliteEv] = await Promise.all([
          models.includes("maia3")     ? fetchBatchCached(f)  : Promise.resolve(null),
          models.includes("bigLeela")  ? fetchLeelaCached(f)  : Promise.resolve(null),
          models.includes("elitemaia") ? fetchEliteCached(f)  : Promise.resolve(null),
        ]);

        if (batch) {
          const m3e: Record<string, MaiaEvaluation> = {};
          const m3s: Record<string, SanMaiaEvaluation> = {};
          MAIA3_MODELS.forEach((m) => {
            const ev = batch[m];
            if (ev) { m3e[m] = ev; m3s[m] = ev; } // maia3 topMoves already SAN from server
          });
          evals.maia3 = m3e;
          sanEvals.maia3 = m3s;
        }

        if (leelaEv) {
          evals.bigLeela = leelaEv;                                // UCI — ease metric
          sanEvals.bigLeela = convertToSanEvaluation(leelaEv, f); // SAN — UI arrows
        }
        if (eliteEv) {
          evals.elitemaia = eliteEv;
          sanEvals.elitemaia = convertToSanEvaluation(eliteEv, f);
        }

        return evals;
      } catch (err) {
        console.error("[useNets]", err);
        return undefined;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, JSON.stringify(models), supported]
  );

  // Auto-analysis on fen change — cancelled on fen change or unmount
  useEffect(() => {
    if (!supported || gameReviewMode) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsLoading(true);
    setError(null);

    analyzePosition(fen).then((result) => {
      if (abort.signal.aborted || !result) return;
      const sanEvals: UseMaiaEngineResult["sanEvaluations"] = {};
      if (result.maia3)    sanEvals.maia3    = result.maia3;
      if (result.bigLeela) sanEvals.bigLeela = convertToSanEvaluation(result.bigLeela, fen);
      if (result.elitemaia) sanEvals.elitemaia = convertToSanEvaluation(result.elitemaia, fen);
      setEvaluations(result);
      setSanEvaluations(sanEvals);
      setEvaluationsFen(fen);
    }).catch(e => {
      if (!abort.signal.aborted) setError(e instanceof Error ? e : new Error(String(e)));
    }).finally(() => {
      if (!abort.signal.aborted) setIsLoading(false);
    });

    return () => { abort.abort(); };
  }, [fen, gameReviewMode, supported, analyzePosition]);

  if (!supported) return EMPTY;

  return {
    evaluations, sanEvaluations,
    isLoading, Maiaerror: error,
    evaluationsFen,
    analyzePositionNet: analyzePosition,
  };
};
