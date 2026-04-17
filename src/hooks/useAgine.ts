import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";
import {
  MasterGames,
  getOpeningStats,
  getLichessOpeningStats,
} from "@/libs/openingdatabase/helper";
import { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { useChessDB } from "./useChessDb";
import useGameReview from "./useGameReview";

import {
  MAX_PV_MOVES,
  ANALYSIS_DELAY,
} from "@/libs/setting/helper";
import {
  AgineState,
  isValidFEN,
} from "@/libs/agine/helper";
import { useThemeScore } from "./useThemeScore";
import { useNets } from "./useNets";
import {
  getReverseStockfishCacheKey,
  getStockfishCacheKey,
  readStockfishCache,
  writeStockfishCache,
} from "@/stockfish/engine/cache";
import { useSettings } from "@/context/SettingContext";

export default function useAgine(fen: string, analysisType: 'position' | 'game' | "unsupported" | "puzzle") {
  const [state, setState] = useState<AgineState>({
    stockfishAnalysisResult: null,
    reverseStockfishAnalysisResult: null,
    openingData: null,
    lichessOpeningData: null,
    llmLoading: false,
    stockfishLoading: false,
    openingLoading: false,
    lichessOpeningLoading: false,
    moveSquares: {},
    analysisTab: 0,
  });

  const { saveSettings, engineDepth, engineLines, enginePicked: enginePickedRaw } = useSettings();
  const setEngineDepth = (v: number) => saveSettings({ engine_depth: v });
  const setEngineLines = (v: number) => saveSettings({ engine_lines: v });
  const enginePicked = enginePickedRaw as EngineName;

  const { evaluations, sanEvaluations, isLoading: isNetLoading, evaluationsFen } = useNets({ fen, supported: analysisType !== "puzzle" });

  const engine = useEngine(true, enginePicked);
  const [stockfishFen, setStockfishFen] = useState<string | null>(null);
  const [stockfishDone, setStockfishDone] = useState(false);

  useEffect(() => {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("stockfish:"))
      .forEach((k) => sessionStorage.removeItem(k));
  }, [engine]);

  const { data: chessdbdata, loading, error, queueing, refetch, requestAnalysis } = useChessDB(fen);
  const {
    gameReview,
    setGameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReviewLoading,
    generateGameReview,
    rootCurrentMove,
    setRootCurrentMove,
  } = useGameReview(engine, engineDepth);

  const colorside = isValidFEN(fen) ? new Chess(fen).turn() : "w";
  const { scores, loading: themeScoreLoading, error: themeScoreError } = useThemeScore(fen, colorside);

  const currentFenRef = useRef(fen);

  useEffect(() => {
    currentFenRef.current = fen;
  }, [fen]);

  const updateState = useCallback((updates: Partial<AgineState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // ==================== FORMATTING UTILS ====================
  // Kept because stockfish result display in the UI still needs these

  const formatEvaluation = useCallback((line: LineEval): string => {
    if (line.mate !== undefined) return `M${line.mate}`;
    if (line.cp !== undefined) {
      const eval1 = line.cp / 100;
      return eval1 > 0 ? `+${eval1.toFixed(2)}` : eval1.toFixed(2);
    }
    return "0.00";
  }, []);

  const formatPrincipalVariation = useCallback(
    (pv: string[], startFen: string): string => {
      const tempGame = new Chess(startFen);
      const moves: string[] = [];
      for (const uciMove of pv.slice(0, MAX_PV_MOVES)) {
        try {
          const move = tempGame.move({
            from: uciMove.slice(0, 2),
            to: uciMove.slice(2, 4),
            promotion: uciMove.length > 4 ? (uciMove[4] as string) : undefined,
          });
          if (move) moves.push(move.san);
          else break;
        } catch {
          break;
        }
      }
      return moves.join(" ");
    },
    []
  );

  const formatLineForLLM = useCallback(
    (line: LineEval, lineIndex: number): string => {
      const evaluation = formatEvaluation(line);
      const moves = formatPrincipalVariation(line.pv, line.fen);
      let formattedLine = `Line ${lineIndex + 1}: ${evaluation} - ${moves}`;
      if (line.resultPercentages) {
        formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
      }
      return formattedLine;
    },
    [formatEvaluation, formatPrincipalVariation]
  );

  // ==================== STOCKFISH ====================

  const analyzeThreatsInBackground = useCallback(
    async (currentFen: string) => {
      if (!engine) return;
      try {
        const chess = new Chess(currentFen);
        const nullMoveFen = currentFen.replace(
          chess.turn() === "w" ? " w " : " b ",
          chess.turn() === "w" ? " b " : " w "
        );
        const cacheKey = getReverseStockfishCacheKey(nullMoveFen, 12, 4);
        const cached = readStockfishCache(cacheKey);
        if (cached) {
          if (currentFenRef.current === currentFen) {
            updateState({ reverseStockfishAnalysisResult: cached });
          }
          return;
        }
        const result = await engine.evaluatePositionWithUpdate({
          fen: nullMoveFen,
          depth: 12,
          multiPv: 4,
          setPartialEval: (partialEval) => {
            if (currentFenRef.current === currentFen) {
              updateState({ reverseStockfishAnalysisResult: partialEval });
            }
          },
        });
        if (currentFenRef.current === currentFen) {
          writeStockfishCache(cacheKey, result);
          updateState({ reverseStockfishAnalysisResult: result });
        }
      } catch (err) {
        console.error("[analyzeThreatsInBackground] failed:", err);
        if (currentFenRef.current === currentFen) {
          updateState({ reverseStockfishAnalysisResult: null });
        }
      }
    },
    [engine, updateState]
  );

  const analyzeWithStockfish = useCallback(async () => {
    if (!engine || !fen) return;
    const currentFen = currentFenRef.current;
    const cacheKey = getStockfishCacheKey(currentFen, engineDepth, engineLines);
    const cached = readStockfishCache(cacheKey);
    if (cached) {
      updateState({ stockfishAnalysisResult: cached, stockfishLoading: false });
      setStockfishFen(currentFen);
      setStockfishDone(true);
      await analyzeThreatsInBackground(currentFen);
      return;
    }
    updateState({ stockfishLoading: true });
    setStockfishFen(null);
    setStockfishDone(false);
    try {
      const result = await engine.evaluatePositionWithUpdate({
        fen: currentFen,
        depth: engineDepth,
        multiPv: engineLines,
        setPartialEval: (partialEval) => {
          if (currentFenRef.current === currentFen) {
            updateState({ stockfishAnalysisResult: partialEval });
            setStockfishFen(currentFen);
            setStockfishDone(false);
          }
        },
      });
      if (currentFenRef.current === currentFen) {
        writeStockfishCache(cacheKey, result);
        updateState({ stockfishAnalysisResult: result, stockfishLoading: false });
        setStockfishFen(currentFen);
        setStockfishDone(true);
        await analyzeThreatsInBackground(currentFen);
      }
    } catch (err) {
      console.error("Stockfish analysis failed:", err);
      if (currentFenRef.current === currentFen) {
        updateState({ stockfishAnalysisResult: null, stockfishLoading: false });
        setStockfishFen(null);
        setStockfishDone(true);
      }
    }
  }, [engine, fen, engineDepth, engineLines, updateState, analyzeThreatsInBackground]);

  // ==================== OPENING DATA ====================

  const fetchOpeningData = useCallback(async (): Promise<void> => {
    if(analysisType === "puzzle") return;
    const currentFen = currentFenRef.current;
    updateState({ openingLoading: true });
    try {
      const data = await getOpeningStats(currentFen, analysisType);
      if (currentFenRef.current === currentFen && data !== null) {
        updateState({ openingData: data, openingLoading: false });
      }
    } catch {
      if (currentFenRef.current === currentFen) {
        updateState({ openingData: null, openingLoading: false });
      }
    }
  }, [updateState, analysisType]);

  const fetchLichessOpeningData = useCallback(async (): Promise<void> => {
    if(analysisType === "puzzle") return;
    const currentFen = currentFenRef.current;
    updateState({ lichessOpeningLoading: true });
    try {
      const data = await getLichessOpeningStats(currentFen, analysisType);
      if (currentFenRef.current === currentFen && data !== null) {
        updateState({ lichessOpeningData: data, lichessOpeningLoading: false });
      }
    } catch {
      if (currentFenRef.current === currentFen) {
        updateState({ lichessOpeningData: null, lichessOpeningLoading: false });
      }
    }
  }, [updateState, analysisType]);

  // ==================== EFFECTS ====================

useEffect(() => {
  if (!engine || !fen || analysisType === "unsupported" || analysisType === "puzzle") return;
  updateState({
    stockfishAnalysisResult: null,
    reverseStockfishAnalysisResult: null,
  });
  const timeoutId = setTimeout(() => {
    if (currentFenRef.current === fen) {
      analyzeWithStockfish();
    }
  }, ANALYSIS_DELAY);
  return () => clearTimeout(timeoutId);

}, [fen, engine, engineDepth, engineLines, analysisType]);


useEffect(() => {
  if (!fen || analysisType === "unsupported" || analysisType === "puzzle") return;
  updateState({ openingData: null });
  const timeoutId = setTimeout(() => {
    if (currentFenRef.current === fen) {
      fetchOpeningData();
      fetchLichessOpeningData();
    }
  }, ANALYSIS_DELAY);
  return () => clearTimeout(timeoutId);
}, [fen, analysisType]);

  return {
    // Stockfish
    stockfishAnalysisResult: state.stockfishAnalysisResult,
    stockfishDone,
    stockfishFen,
    setStockfishAnalysisResult: (result: PositionEval | null) =>
      updateState({ stockfishAnalysisResult: result }),
    reverseStockfishAnalysisResult: state.reverseStockfishAnalysisResult,

    // Opening
    openingData: state.openingData,
    setOpeningData: (data: MasterGames | null) => updateState({ openingData: data }),
    lichessOpeningData: state.lichessOpeningData,

    // ChessDB
    chessdbdata,
    loading,
    error,
    queueing,
    refetch,
    requestAnalysis,

    // Nets
    sanEvaluations,
    evaluations,
    isNetLoading,
    evaluationsFen,

    // Themes
    scores,
    themeScoreLoading,
    themeScoreError,

    // Loading States
    stockfishLoading: state.stockfishLoading,
    setStockfishLoading: (loading: boolean) => updateState({ stockfishLoading: loading }),
    openingLoading: state.openingLoading,
    lichessOpeningLoading: state.lichessOpeningLoading,
    llmLoading: state.llmLoading,
    setLlmLoading: (loading: boolean) => updateState({ llmLoading: loading }),

    // UI State
    moveSquares: state.moveSquares,
    setMoveSquares: (squares: { [square: string]: string }) =>
      updateState({ moveSquares: squares }),
    analysisTab: state.analysisTab,
    setAnalysisTab: (tab: number) => updateState({ analysisTab: tab }),

    // Engine Settings
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,

    // Game Review
    gameReview,
    setGameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReviewLoading,
    generateGameReview,
    rootCurrentMove,
    setRootCurrentMove,

    // Functions
    fetchOpeningData,
    fetchLichessOpeningData,
    analyzeWithStockfish,

    // Formatting utils (still used by board UI components to display engine lines)
    formatEvaluation,
    formatPrincipalVariation,
    formatLineForLLM,
  };
}