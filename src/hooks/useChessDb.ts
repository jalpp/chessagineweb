import { useState, useCallback, useEffect } from "react";
import { CandidateMove, getChessDbNoteWord } from "@/libs/agine/helper";
import { validateFen } from "chess.js";
import { getChessDbCache, setChessDbCache} from "@/stockfish/engine/chessdbCache";


export function useChessDB(fen: string, gameReviewMode?: boolean) {
  const [data, setData] = useState<CandidateMove[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [queueing, setQueueing] = useState<boolean>(false);

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
      return;
    }

    const encodedFen = encodeURIComponent(fenString);
    const apiUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodedFen}&json=1`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch data`);
    }

    const responseData = await response.json();

    if (responseData.status !== "ok") {
      await queueAnalysis(fen);
      return [];
    }

    const moves = responseData.moves;
    if (!Array.isArray(moves) || moves.length === 0) {
      setData([]);
      return;
    }

    const processedMoves = moves.map((move: CandidateMove) => {
      const scoreNum = Number(move.score);
      const scoreStr = isNaN(scoreNum) ? "N/A" : (scoreNum / 100).toFixed(2);
      return {
        uci: move.uci || "N/A",
        san: move.san || "N/A",
        score: scoreStr,
        winrate: move.winrate || "N/A",
        rank: move.rank,
        note: getChessDbNoteWord(move.note.split(" ")[0]),
        rawEval: scoreNum
      };
    });

    await setChessDbCache(fenString, processedMoves);
    setData(processedMoves);
    return processedMoves;
  } catch (err) {
    console.error('error!', err);
    setData([]);
    setError(err instanceof Error ? err.message : "Failed to fetch data");
  } finally {
    setLoading(false);
  }
}, []);

  const queueAnalysis = useCallback(async (fenString: string) => {
    if (!fenString.trim() || !validateFen(fenString)) {
      return;
    }

    setQueueing(true);
    try {
      const encodedFen = encodeURIComponent(fenString);
      const queueUrl = `https://www.chessdb.cn/cdb.php?action=queue&board=${encodedFen}&json=1`;

      const response = await fetch(queueUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to queue analysis`);
      }

      const responseData = await response.json();
      
      if (responseData.status !== "ok") {
        throw new Error(`Failed to queue position: ${responseData.status}`);
      }
      
    } catch (err) {
      console.error('Failed to queue analysis:', err);
      setError(err instanceof Error ? err.message : "Failed to queue analysis");
    } finally {
      setQueueing(false);
    }
  }, []);

  useEffect(() => {
    if(gameReviewMode){
      return;
    }
    
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  const refetch = useCallback(() => {
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  const requestAnalysis = useCallback(() => {
    queueAnalysis(fen);
  }, [fen, queueAnalysis]);

  return {
    data,
    loading,
    error,
    queueing,
    fetchChessDBData,
    refetch,
    requestAnalysis,
  };
}