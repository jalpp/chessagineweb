"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useAuth } from "@clerk/nextjs";

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

  const [selectedModel,          setSelectedModel]          = useSafeLocalStorage("selected-model", "openrouter/free");
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
      };

      debouncedPost(full);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isSignedIn, selectedModel, boardFlipped, boardSize, boardPieceType, boardShowCoords,
      boardTheme, boardAnimDuration, boardShowEvalBar, boardShowFen, boardShowHanging,
      boardShowSemiProtected, engineDepth, engineLines, enginePicked, appTheme, pgnViewMode,
      chessdbShowScores, chessdbShowWinrates, puzzleLevel, userPuzzleRating
    ]
  );

  return {
    selectedModel, boardFlipped, boardSize, boardPieceType, boardShowCoords,
    boardTheme, boardAnimDuration, boardShowEvalBar, boardShowFen, boardShowHanging,
    boardShowSemiProtected, engineDepth, engineLines, enginePicked, appTheme,
    pgnViewMode, chessdbShowScores, chessdbShowWinrates, puzzleLevel, userPuzzleRating,
    saveSettings,
  };
}

