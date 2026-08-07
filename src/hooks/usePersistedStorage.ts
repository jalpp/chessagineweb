"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useAuth } from "@clerk/nextjs";
import { GIFT_MODEL } from "@/libs/agine/modelConstants";

export interface PersistedSettings {
  selected_model: string;
  board_ui_flipped: boolean;
  board_ui_size: number;
  board_piece_type: string;
  board_show_coordinates: boolean;
  board_theme: string;
  board_ui_animation_duration: number;
  board_ui_show_eval_bar: boolean;
  board_ui_show_fen: boolean;
  board_ui_show_hanging_piece: boolean;
  board_ui_show_semiprotected: boolean;
  engine_depth: number;
  engine_lines: number;
  engine_picked: string;
  app_theme: string;
  pgn_view_mode: string;
  chessdb_show_scores: boolean;
  chessdb_show_winrates: boolean;
  puzzle_level: number;
  user_puzzle_rating: number;
  analysis_show_stockfish: boolean;
  analysis_show_chessdb: boolean;
  analysis_show_nets: boolean;
  analysis_show_theme: boolean;
  analysis_show_human_eval: boolean;
  analysis_show_opening: boolean;
  analysis_show_lc0: boolean;
  analysis_show_chat: boolean;
  human_eval_bar_rating: number;
}

// ── Safe LocalStorage Wrapper (fixes invalid JSON issues) ───────────────────

function useSafeLocalStorage<T>(key: string, defaultValue: T) {
  return useLocalStorage<T>(key, defaultValue, {
    deserializer: (value) => {
      try {
        return JSON.parse(value);
      } catch {
        // 🔧 auto-migrate bad values (like "forest" → "\"forest\"")
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {}
        return value as T;
      }
    },
  });
}

// ── debounce ───────────────────────────────────────────────────────────────

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function usePersistedSettings() {
  const { isSignedIn } = useAuth();
  const synced = useRef(false);

  // ── All keys now SAFE ─────────────────────────────────────────────────────

  const [selectedModel,          setSelectedModel]          = useSafeLocalStorage("selected-model", GIFT_MODEL);
  const [boardFlipped,           setBoardFlipped]           = useSafeLocalStorage("board_ui_flipped", false);
  const [boardSize,              setBoardSize]              = useSafeLocalStorage("board_ui_size", 480);
  const [boardPieceType,         setBoardPieceType]         = useSafeLocalStorage("board_piece_type", "Cburnett");
  const [boardShowCoords,        setBoardShowCoords]        = useSafeLocalStorage("board_show_coordinates", true);
  const [boardTheme,             setBoardTheme]             = useSafeLocalStorage("board_theme", "blue");
  const [boardAnimDuration,      setBoardAnimDuration]      = useSafeLocalStorage("board_ui_animation_duration", 200);
  const [boardShowEvalBar,       setBoardShowEvalBar]       = useSafeLocalStorage("board_ui_show_eval_bar", true);
  const [boardShowFen,           setBoardShowFen]           = useSafeLocalStorage("board_ui_show_fen", false);
  const [boardShowHanging,       setBoardShowHanging]       = useSafeLocalStorage("board_ui_show_hanging_piece", false);
  const [boardShowSemiProtected, setBoardShowSemiProtected] = useSafeLocalStorage("board_ui_show_semiprotected", false);
  const [engineDepth,            setEngineDepth]            = useSafeLocalStorage("engineDepth", 20);
  const [engineLines,            setEngineLines]            = useSafeLocalStorage("engineLines", 3);
  const [enginePicked,           setEnginePicked]           = useSafeLocalStorage("stockfish-engine-picked-v1", "stockfish_18");
  const [appTheme,               setAppTheme]               = useSafeLocalStorage("app-theme", "dark");
  const [pgnViewMode,            setPgnViewMode]            = useSafeLocalStorage("pgn_view_mode", "pgn");
  const [chessdbShowScores,      setChessdbShowScores]      = useSafeLocalStorage("chessdb_ui_show_scores", true);
  const [chessdbShowWinrates,    setChessdbShowWinrates]    = useSafeLocalStorage("chessdb_ui_show_winrate", true);
  const [puzzleLevel,            setPuzzleLevel]            = useSafeLocalStorage("puzzleLevel", 1500);
  const [userPuzzleRating,       setUserPuzzleRating]       = useSafeLocalStorage("agine_user_puzzle_rating", 1500);
  const [analysisShowStockfish,  setAnalysisShowStockfish]  = useSafeLocalStorage("analysis_ui_show_stockfish", true);
  const [analysisShowChessdb,    setAnalysisShowChessdb]    = useSafeLocalStorage("analysis_ui_show_chessdb", true);
  const [analysisShowNets,       setAnalysisShowNets]       = useSafeLocalStorage("analysis_ui_show_nets", true);
  const [analysisShowTheme,      setAnalysisShowTheme]      = useSafeLocalStorage("analysis_ui_show_theme", true);
  const [analysisShowHumanEval,  setAnalysisShowHumanEval]  = useSafeLocalStorage("analysis_ui_show_human_eval", true);
  const [analysisShowOpening,    setAnalysisShowOpening]    = useSafeLocalStorage("analysis_ui_show_opening", true);
  const [analysisShowLc0,        setAnalysisShowLc0]        = useSafeLocalStorage("analysis_ui_show_lc0", true);
  const [analysisShowChat,       setAnalysisShowChat]       = useSafeLocalStorage("analysis_ui_show_chat", true);
  const [humanEvalBarRating,     setHumanEvalBarRating]     = useSafeLocalStorage("human_eval_bar_ui_rating", 2600);

  const debouncedPost = useRef(
    debounce((body: PersistedSettings) => {
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }, 500)
  ).current;

  // ── Sync from DB once ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSignedIn || synced.current) return;
    synced.current = true;

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: PersistedSettings | null) => {
        if (!d) return;

        setSelectedModel(d.selected_model);
        setBoardFlipped(d.board_ui_flipped);
        setBoardSize(d.board_ui_size);
        setBoardPieceType(d.board_piece_type);
        setBoardShowCoords(d.board_show_coordinates);
        setBoardTheme(d.board_theme);
        setBoardAnimDuration(d.board_ui_animation_duration);
        setBoardShowEvalBar(d.board_ui_show_eval_bar);
        setBoardShowFen(d.board_ui_show_fen);
        setBoardShowHanging(d.board_ui_show_hanging_piece);
        setBoardShowSemiProtected(d.board_ui_show_semiprotected);
        setEngineDepth(d.engine_depth);
        setEngineLines(d.engine_lines);
        setEnginePicked(d.engine_picked);
        setAppTheme(d.app_theme);
        setPgnViewMode(d.pgn_view_mode);
        setChessdbShowScores(d.chessdb_show_scores);
        setChessdbShowWinrates(d.chessdb_show_winrates);
        setPuzzleLevel(d.puzzle_level);
        setUserPuzzleRating(d.user_puzzle_rating);
        setAnalysisShowStockfish(d.analysis_show_stockfish);
        setAnalysisShowChessdb(d.analysis_show_chessdb);
        setAnalysisShowNets(d.analysis_show_nets);
        setAnalysisShowTheme(d.analysis_show_theme);
        setAnalysisShowHumanEval(d.analysis_show_human_eval);
        setAnalysisShowOpening(d.analysis_show_opening);
        setAnalysisShowLc0(d.analysis_show_lc0);
        setAnalysisShowChat(d.analysis_show_chat);
        setHumanEvalBarRating(d.human_eval_bar_rating);
      })
      .catch(() => {});
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ─────────────────────────────────────────────────────────────────

  const saveSettings = useCallback(
    (patch: Partial<PersistedSettings>) => {
      if (patch.selected_model              !== undefined) setSelectedModel(patch.selected_model);
      if (patch.board_ui_flipped            !== undefined) setBoardFlipped(patch.board_ui_flipped);
      if (patch.board_ui_size               !== undefined) setBoardSize(patch.board_ui_size);
      if (patch.board_piece_type            !== undefined) setBoardPieceType(patch.board_piece_type);
      if (patch.board_show_coordinates      !== undefined) setBoardShowCoords(patch.board_show_coordinates);
      if (patch.board_theme                 !== undefined) setBoardTheme(patch.board_theme);
      if (patch.board_ui_animation_duration !== undefined) setBoardAnimDuration(patch.board_ui_animation_duration);
      if (patch.board_ui_show_eval_bar      !== undefined) setBoardShowEvalBar(patch.board_ui_show_eval_bar);
      if (patch.board_ui_show_fen           !== undefined) setBoardShowFen(patch.board_ui_show_fen);
      if (patch.board_ui_show_hanging_piece !== undefined) setBoardShowHanging(patch.board_ui_show_hanging_piece);
      if (patch.board_ui_show_semiprotected !== undefined) setBoardShowSemiProtected(patch.board_ui_show_semiprotected);
      if (patch.engine_depth                !== undefined) setEngineDepth(patch.engine_depth);
      if (patch.engine_lines                !== undefined) setEngineLines(patch.engine_lines);
      if (patch.engine_picked               !== undefined) setEnginePicked(patch.engine_picked);
      if (patch.app_theme                   !== undefined) setAppTheme(patch.app_theme);
      if (patch.pgn_view_mode               !== undefined) setPgnViewMode(patch.pgn_view_mode);
      if (patch.chessdb_show_scores         !== undefined) setChessdbShowScores(patch.chessdb_show_scores);
      if (patch.chessdb_show_winrates       !== undefined) setChessdbShowWinrates(patch.chessdb_show_winrates);
      if (patch.puzzle_level                !== undefined) setPuzzleLevel(patch.puzzle_level);
      if (patch.user_puzzle_rating          !== undefined) setUserPuzzleRating(patch.user_puzzle_rating);
      if (patch.analysis_show_stockfish     !== undefined) setAnalysisShowStockfish(patch.analysis_show_stockfish);
      if (patch.analysis_show_chessdb       !== undefined) setAnalysisShowChessdb(patch.analysis_show_chessdb);
      if (patch.analysis_show_nets          !== undefined) setAnalysisShowNets(patch.analysis_show_nets);
      if (patch.analysis_show_theme         !== undefined) setAnalysisShowTheme(patch.analysis_show_theme);
      if (patch.analysis_show_human_eval    !== undefined) setAnalysisShowHumanEval(patch.analysis_show_human_eval);
      if (patch.analysis_show_opening       !== undefined) setAnalysisShowOpening(patch.analysis_show_opening);
      if (patch.analysis_show_lc0           !== undefined) setAnalysisShowLc0(patch.analysis_show_lc0);
      if (patch.analysis_show_chat          !== undefined) setAnalysisShowChat(patch.analysis_show_chat);
      if (patch.human_eval_bar_rating       !== undefined) setHumanEvalBarRating(patch.human_eval_bar_rating);

      if (!isSignedIn) return;

      const full: PersistedSettings = {
        selected_model:               patch.selected_model              ?? selectedModel,
        board_ui_flipped:             patch.board_ui_flipped            ?? boardFlipped,
        board_ui_size:                patch.board_ui_size               ?? boardSize,
        board_piece_type:             patch.board_piece_type            ?? boardPieceType,
        board_show_coordinates:       patch.board_show_coordinates      ?? boardShowCoords,
        board_theme:                  patch.board_theme                 ?? boardTheme,
        board_ui_animation_duration:  patch.board_ui_animation_duration ?? boardAnimDuration,
        board_ui_show_eval_bar:       patch.board_ui_show_eval_bar      ?? boardShowEvalBar,
        board_ui_show_fen:            patch.board_ui_show_fen           ?? boardShowFen,
        board_ui_show_hanging_piece:  patch.board_ui_show_hanging_piece ?? boardShowHanging,
        board_ui_show_semiprotected:  patch.board_ui_show_semiprotected ?? boardShowSemiProtected,
        engine_depth:                 patch.engine_depth                ?? engineDepth,
        engine_lines:                 patch.engine_lines                ?? engineLines,
        engine_picked:                patch.engine_picked               ?? enginePicked,
        app_theme:                    patch.app_theme                   ?? appTheme,
        pgn_view_mode:                patch.pgn_view_mode               ?? pgnViewMode,
        chessdb_show_scores:          patch.chessdb_show_scores         ?? chessdbShowScores,
        chessdb_show_winrates:        patch.chessdb_show_winrates       ?? chessdbShowWinrates,
        puzzle_level:                 patch.puzzle_level                ?? puzzleLevel,
        user_puzzle_rating:           patch.user_puzzle_rating          ?? userPuzzleRating,
        analysis_show_stockfish:      patch.analysis_show_stockfish     ?? analysisShowStockfish,
        analysis_show_chessdb:        patch.analysis_show_chessdb       ?? analysisShowChessdb,
        analysis_show_nets:           patch.analysis_show_nets          ?? analysisShowNets,
        analysis_show_theme:          patch.analysis_show_theme         ?? analysisShowTheme,
        analysis_show_human_eval:     patch.analysis_show_human_eval    ?? analysisShowHumanEval,
        analysis_show_opening:        patch.analysis_show_opening       ?? analysisShowOpening,
        analysis_show_lc0:            patch.analysis_show_lc0           ?? analysisShowLc0,
        analysis_show_chat:           patch.analysis_show_chat          ?? analysisShowChat,
        human_eval_bar_rating:        patch.human_eval_bar_rating       ?? humanEvalBarRating,
      };

      debouncedPost(full);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isSignedIn, selectedModel, boardFlipped, boardSize, boardPieceType, boardShowCoords,
      boardTheme, boardAnimDuration, boardShowEvalBar, boardShowFen, boardShowHanging,
      boardShowSemiProtected, engineDepth, engineLines, enginePicked, appTheme, pgnViewMode,
      chessdbShowScores, chessdbShowWinrates, puzzleLevel, userPuzzleRating,
      analysisShowStockfish, analysisShowChessdb, analysisShowNets,
      analysisShowTheme, analysisShowHumanEval, analysisShowOpening, analysisShowLc0,
      analysisShowChat, humanEvalBarRating,
    ]
  );

  return {
    selectedModel, boardFlipped, boardSize, boardPieceType, boardShowCoords,
    boardTheme, boardAnimDuration, boardShowEvalBar, boardShowFen, boardShowHanging,
    boardShowSemiProtected, engineDepth, engineLines, enginePicked, appTheme,
    pgnViewMode, chessdbShowScores, chessdbShowWinrates, puzzleLevel, userPuzzleRating,
    analysisShowStockfish, analysisShowChessdb, analysisShowNets,
    analysisShowTheme, analysisShowHumanEval, analysisShowOpening, analysisShowLc0,
    analysisShowChat, humanEvalBarRating,
    saveSettings,
  };
}

