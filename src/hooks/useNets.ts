import { useEffect, useState, useRef, useCallback } from "react";
import {
  convertToSanEvaluation,
  MAIA3_MODELS,
  MaiaEvaluation,
  ModelType,
  SanMaiaEvaluation,
} from "@/libs/nets/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseMaiaEngineOptions {
  fen: string;
  enabledModels?: ModelType[];
  gameReviewMode?: boolean;
  supported?: boolean;
}

export interface MaiaEngineAnalysis {
  bigLeela?: MaiaEvaluation | null;
  elitemaia?: MaiaEvaluation | null;
  maia3?: { [key: string]: MaiaEvaluation } | null;
}

export interface UseMaiaEngineResult {
  evaluations: MaiaEngineAnalysis;
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
  evaluations: {},
  sanEvaluations: {},
  isLoading: false,
  Maiaerror: null,
  evaluationsFen: null,
  analyzePositionNet: async () => undefined,
};

// ── API helpers ───────────────────────────────────────────────────────────────

interface TopMove { move: string; probability: number }
interface UciEval { policy: Record<string, number>; value: number }
interface NNData { topMoves: TopMove[]; uciEval?: UciEval }
interface BatchEntry {
  rating: number;
  analysis: {
    topMoves: { move: string; probability: number }[];
    uciEval?: { value: number; policy: Record<string, number> };
    HumanEstimateEval?: string;
  };
}

async function nnPost(body: object, signal?: AbortSignal): Promise<Response> {
  return fetch("/api/nn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

async function fetchBatchMaia3(
  fen: string,
  signal?: AbortSignal
): Promise<Record<string, MaiaEvaluation>> {
  const res = await nnPost({ endpoint: "batch-maia3", fen }, signal);
  if (!res.ok) throw new Error(`batch-maia3 failed: ${res.status}`);
  const json = await res.json();
  const out: Record<string, MaiaEvaluation> = {};
  for (const entry of (json.results ?? []) as BatchEntry[]) {
    const { topMoves, uciEval } = entry.analysis;
    // topMoves are already SAN from the server
    const policy: Record<string, number> = {};
    for (const { move, probability } of topMoves) policy[move] = probability;
    out[`maia_kdd_${entry.rating}`] = { value: uciEval?.value ?? 0.5, policy };
  }
  return out;
}

async function fetchSingleEngine(
  fen: string,
  engine: "leela" | "elite-leela",
  signal?: AbortSignal
): Promise<MaiaEvaluation> {
  const res = await nnPost({ endpoint: "analyze", fen, engine }, signal);
  if (!res.ok) throw new Error(`${engine} failed: ${res.status}`);
  const json = await res.json();
  const { uciEval, topMoves } = json.data as NNData;
  if (uciEval) return { value: uciEval.value, policy: uciEval.policy };
  const policy: Record<string, number> = {};
  for (const { move, probability } of topMoves) policy[move] = probability;
  return { value: 0.5, policy };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

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

  const analyzePosition = useCallback(
    async (customFen?: string): Promise<MaiaEngineAnalysis | undefined> => {
      if (!supported) return undefined;
      const f = customFen || fen;
      if (!f) return undefined;

      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      const sig = abort.signal;

      setIsLoading(true);
      setError(null);

      try {
        const evals: MaiaEngineAnalysis = {};
        const sanEvals: UseMaiaEngineResult["sanEvaluations"] = {};

        // ── Maia3 batch ───────────────────────────────────────────────────
        if (models.includes("maia3")) {
          if (sig.aborted) return undefined;
          const batch = await fetchBatchMaia3(f, sig);
          const m3e: Record<string, MaiaEvaluation> = {};
          const m3s: Record<string, SanMaiaEvaluation> = {};
          MAIA3_MODELS.forEach((m) => {
            const ev = batch[m];
            if (ev) { m3e[m] = ev; m3s[m] = convertToSanEvaluation(ev, f); }
          });
          evals.maia3 = m3e;
          sanEvals.maia3 = m3s;
        }

        // ── Leela + EliteLeela in parallel ────────────────────────────────
        if (sig.aborted) return undefined;
        const [leelaEv, eliteEv] = await Promise.all([
          models.includes("bigLeela") ? fetchSingleEngine(f, "leela", sig) : Promise.resolve(null),
          models.includes("elitemaia") ? fetchSingleEngine(f, "elite-leela", sig) : Promise.resolve(null),
        ]);

        if (leelaEv) { evals.bigLeela = leelaEv; sanEvals.bigLeela = convertToSanEvaluation(leelaEv, f); }
        if (eliteEv) { evals.elitemaia = eliteEv; sanEvals.elitemaia = convertToSanEvaluation(eliteEv, f); }

        if (!sig.aborted) {
          setEvaluations(evals);
          setSanEvaluations(sanEvals);
          setEvaluationsFen(f);
          return evals;
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          const e = err instanceof Error ? err : new Error("Unknown error");
          setError(e);
          console.error("[useNets]", e);
        }
      } finally {
        if (!abort.signal.aborted) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, JSON.stringify(models), supported]
  );

  useEffect(() => {
    if (!supported || gameReviewMode) return;
    analyzePosition();
    return () => { abortRef.current?.abort(); };
  }, [fen, gameReviewMode, supported, analyzePosition]);

  if (!supported) return EMPTY;

  return {
    evaluations,
    sanEvaluations,
    isLoading,
    Maiaerror: error,
    evaluationsFen,
    analyzePositionNet: analyzePosition,
  };
};
