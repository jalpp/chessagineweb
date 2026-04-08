"use client";
import { useState, useEffect, useCallback } from "react";

export interface DailyUsageState {
  tokens: number;
  costUSD: number;
  limitHit: boolean;
  warning: boolean;
  budgetUSD: number | null;
  loading: boolean;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useTokenLimit(enabled: boolean): DailyUsageState {
  const [state, setState] = useState<DailyUsageState>({
    tokens: 0,
    costUSD: 0,
    limitHit: false,
    warning: false,
    budgetUSD: null,
    loading: true,
  });

  const fetchUsage = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const data = await res.json();
      setState({ ...data, loading: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [enabled]);

  useEffect(() => {
    fetchUsage();
    if (!enabled) return;
    const id = setInterval(fetchUsage, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUsage, enabled]);

  return state;
}