"use client";
import { useState, useEffect, useRef } from "react";

export interface RatingEval {
  rating: number;
  humanEval: string;
  lc0Eval: string;
}

interface BatchEntry {
  rating: number;
  analysis: {
    HumanEstimateEval?: string;
    LeelaZeroEstimateEval?: string;
  };
}

async function fetchBatch(fen: string, signal?: AbortSignal): Promise<RatingEval[]> {
  const res = await fetch("/api/nn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: "batch-maia3", fen }),
    signal,
  });
  if (!res.ok) throw new Error(`batch-maia3 failed: ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((entry: BatchEntry) => ({
    rating: entry.rating,
    humanEval: entry.analysis.HumanEstimateEval ?? "—",
    lc0Eval: entry.analysis.LeelaZeroEstimateEval ?? "—",
  }));
}

/**
 * Fetch Maia3's per-rating-level batch analysis (Human Estimate Eval + lc0
 * Estimate Eval, 600-2600 Elo) for a position.
 *
 * `enabled` gates the fetch — pass `false` to skip fetching entirely (e.g.
 * the eval bar only wants this data while hovered, not on every render).
 * Results reset whenever `fen` changes, and an in-flight request is
 * aborted if the position or `enabled` changes before it resolves.
 */
export function useMaiaBatchEval(fen: string, enabled: boolean = true) {
  const [results, setResults] = useState<RatingEval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setResults([]);
    setError(null);

    if (!fen || !enabled) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsLoading(true);

    fetchBatch(fen, abort.signal)
      .then((r) => { if (!abort.signal.aborted) setResults(r); })
      .catch((e) => { if (!abort.signal.aborted) setError(e instanceof Error ? e : new Error("Unknown error")); })
      .finally(() => { if (!abort.signal.aborted) setIsLoading(false); });

    return () => abort.abort();
  }, [fen, enabled]);

  return { results, isLoading, error };
}
