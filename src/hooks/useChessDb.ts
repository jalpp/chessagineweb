import { useState, useCallback, useEffect } from "react";
import { CandidateMove } from "@/libs/agine/helper";
import { getChessDbCache, setChessDbCache } from "@/libs/cache/chessdbCache";
import { validateFen } from "chess.js";
import { ChessDbApi, type ChessDbPvResult } from "@jalpp/stockfishts";

const chessDbApi = new ChessDbApi();

export function useChessDB(fen: string, gameReviewMode?: boolean) {
  const [data, setData] = useState<CandidateMove[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [queueing, setQueueing] = useState<boolean>(false);
  const [pvResult, setPvResult] = useState<ChessDbPvResult | null>(null);
  const [pvLoading, setPvLoading] = useState<boolean>(false);
  const [pvError, setPvError] = useState<string | null>(null);

  const queueAnalysis = useCallback(async (fenString: string) => {
    if (!fenString.trim() || !validateFen(fenString)) {
      return;
    }

    setQueueing(true);
    try {
      const result = await chessDbApi.queue(fenString);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Failed to queue analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to queue analysis");
    } finally {
      setQueueing(false);
    }
  }, []);

  const fetchChessDBData = useCallback(async (fenString: string) => {
    if (!fenString.trim()) {
      setData([]);
      setError(null);
      return;
    }

    if (!validateFen(fenString)) {
      setError("Invalid FEN provided");
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cached = await getChessDbCache(fenString);
      if (cached) {
        setData(cached);
        setLoading(false);
        return cached;
      }

      const result = await chessDbApi.queryAll(fenString);
      if (!result.success) {
        if (result.error === "unknown") {
          await queueAnalysis(fenString);
        }
        setData([]);
        setError(result.error);
        return [];
      }

      await setChessDbCache(fenString, result.data);
      setData(result.data);
      return result.data;
    } catch (err) {
      console.error("error!", err);
      setData([]);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      return [];
    } finally {
      setLoading(false);
    }
  }, [queueAnalysis]);

  const queryPv = useCallback(async (fenString: string) => {
    if (!fenString.trim() || !validateFen(fenString)) {
      setPvError("Invalid FEN provided");
      return;
    }

    setPvLoading(true);
    setPvError(null);
    try {
      const result = await chessDbApi.queryPv(fenString);
      if (!result.success) {
        setPvResult(null);
        setPvError(result.error);
        return;
      }
      setPvResult(result.data);
    } catch (err) {
      console.error("Failed to query PV:", err);
      setPvResult(null);
      setPvError(err instanceof Error ? err.message : "Failed to query PV");
    } finally {
      setPvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gameReviewMode) {
      return;
    }

    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);


  useEffect(() => {
    setPvResult(null);
    setPvError(null);

    if (gameReviewMode) {
      return;
    }

    queryPv(fen);
  }, [fen, gameReviewMode, queryPv]);

  const refetch = useCallback(() => {
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  const requestAnalysis = useCallback(() => {
    queueAnalysis(fen);
  }, [fen, queueAnalysis]);

  const requestPv = useCallback(() => {
    queryPv(fen);
  }, [fen, queryPv]);

  return {
    data,
    loading,
    error,
    queueing,
    fetchChessDBData,
    refetch,
    requestAnalysis,
    pvResult,
    pvLoading,
    pvError,
    requestPv,
  };
}