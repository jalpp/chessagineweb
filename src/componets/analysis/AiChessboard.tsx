import React, { CSSProperties } from "react";
import {
  Stack, Button, TextField, Paper, Switch, Slider, Box, Divider,
  Typography, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, FormControl, InputLabel, Select, MenuItem,
  useTheme, useMediaQuery,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  NavigateBefore, NavigateNext,
  SkipPrevious, SkipNext,
  RotateLeft, Upload,
} from "@mui/icons-material";
import { Chessboard, PieceRenderObject, Arrow } from "react-chessboard";
import { UciEngine } from "@jalpp/stockfishts";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Chess, Square } from "chess.js";
import { PositionEval } from "@jalpp/stockfishts";
import { MasterGames } from "../../libs/openingdatabase/helper";
import { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import { MoveAnalysis } from "@/libs/agine/helper";
import { getMoveClassificationStyle } from "../tabs/GameReviewTab";
import { Board } from "../../libs/tacticalboard/board";
import {
  BOARD_THEMES, DEFAULT_BOARD_PANEL_DIMENSIONS,
  getCurrentThemeColors, is3DSet, PIECE_STYLE_TYPES,
} from "@/libs/setting/helper";
import PlayerInfoBar from "../tabs/PlayerInfoTab";
import { EvalBar } from "./EvalBar";
import { HumanEvalBar } from "./HumanEvalBar";
import { MaiaEngineAnalysis, SanMaiaEvaluation, MAIA3_RATING_VALUES } from "@/libs/nets/types";
import { maiaModelKey, clampToNearestMaiaRating } from "@/libs/nets/humanEvalBar";
import { useSettings } from "@/context/SettingContext";

export type BoardOrientation = "white" | "black";

interface AiChessboardPanelProps {
  fen: string;
  moveSquares: { [square: string]: string };
  llmLoading: boolean;
  engine: UciEngine | undefined;
  analyzeWithStockfish: () => void;
  stockfishLoading: boolean;
  fetchOpeningData?: () => void;
  openingLoading: boolean;
  setGame: (chess: Chess) => void;
  setFen: (fen: string) => void;
  setStockfishAnalysisResult: (result: PositionEval | null) => void;
  setOpeningData?: (result: MasterGames | null) => void;
  puzzleMode?: boolean;
  playMode?: boolean;
  gameReviewMode?: boolean;
  autoAnalysis?: boolean;
  onDropPuzzle?: (args: PieceDropHandlerArgs) => boolean;
  handleSquarePuzzleClick?: ({ piece, square }: SquareHandlerArgs) => void;
  reviewMove?: MoveAnalysis;
  puzzleCustomSquareStyle?: { [square: string]: CSSProperties };
  game: Chess;
  side?: BoardOrientation;
  moves?: string[];
  stockfishAnalysisResult?: PositionEval | null;
  gameInfo?: Record<string, string>;
  setMoveSquares: (square: { [square: string]: string }) => void;
  gameStatus?: string;
  playerSide?: "white" | "black";
  engineThinking?: boolean;
  evaluations?: MaiaEngineAnalysis;
  sanEvaluations?: { bigLeela?: SanMaiaEvaluation | null; elitemaia?: SanMaiaEvaluation | null; maia3?: { [key: string]: SanMaiaEvaluation } | null };
  /** True while Maia/neural nets are loading for this position */
  maiaLoading?: boolean;
  /** Called by nav buttons to walk to the previous node in the variation tree */
  onTreePrevious?: () => void;
  /** Called by nav buttons to walk to the next node in the variation tree */
  onTreeNext?: () => void;
  /** Walk to the very first position in the tree */
  onTreeStart?: () => void;
  /** Walk to the last position on the current line */
  onTreeEnd?: () => void;
  /** When true, nav buttons use onTree* callbacks (variation-aware navigation) */
  hideBuiltInMoveList?: boolean;
  /** Current ply depth — used for the move counter display */
  treePly?: number;
  /** Total plies in the current line — used for nav disabled states */
  treeMaxPly?: number;
}

export default function AiChessboardPanel({
  fen, moveSquares, setGame, setFen, setStockfishAnalysisResult, setOpeningData,
  game, moves, stockfishAnalysisResult, evaluations, sanEvaluations, puzzleMode, onDropPuzzle,
  handleSquarePuzzleClick, setMoveSquares, puzzleCustomSquareStyle, reviewMove,
  side, playMode, gameStatus = "waiting", playerSide = "white",
  gameReviewMode, gameInfo, engineThinking = false, autoAnalysis = true,
  stockfishLoading, maiaLoading,
  onTreePrevious, onTreeNext, onTreeStart, onTreeEnd,
  hideBuiltInMoveList = false, treePly, treeMaxPly,
}: AiChessboardPanelProps) {

  const {
    saveSettings, boardFlipped: isFlipped, boardSize,
    boardPieceType: pieceType, boardShowCoords: showCoordinates,
    boardTheme, boardAnimDuration: animationDuration,
    boardShowEvalBar: showEvalBar, boardShowFen: showFen,
    boardShowHanging: showHangingPieces,
    boardShowSemiProtected: showSemiProtectedPieces,
    humanEvalBarRating,
  } = useSettings();

  const setIsFlipped = (v: boolean) => saveSettings({ board_ui_flipped: v });
  const setPieceType = (v: string) => saveSettings({ board_piece_type: v });
  const setShowCoordinates = (v: boolean) => saveSettings({ board_show_coordinates: v });
  const setBoardTheme = (v: string) => saveSettings({ board_theme: v });
  const setAnimationDuration = (v: number) => saveSettings({ board_ui_animation_duration: v });
  const setEvalBar = (v: boolean) => saveSettings({ board_ui_show_eval_bar: v });
  const setShowFen = (v: boolean) => saveSettings({ board_ui_show_fen: v });
  const setShowHangingPieces = (v: boolean) => saveSettings({ board_ui_show_hanging_piece: v });
  const setShowSemiProtectedPieces = (v: boolean) => saveSettings({ board_ui_show_semiprotected: v });
  const setHumanEvalBarRating = (v: number) => saveSettings({ human_eval_bar_rating: v });
  const evalBarRating = clampToNearestMaiaRating(humanEvalBarRating ?? 2600);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customFen, setCustomFen] = useState("");

  // Flat move history — used only when no tree nav is supplied (standalone/puzzle/play)
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [internalMoveIndex, setInternalMoveIndex] = useState(-1);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [showArrows, setShowArrows] = useState(puzzleMode || playMode ? false : true);

  // ── Arrow stability: track which FEN the current results belong to ─────────
  //
  // The flicker problem:
  //   1. User navigates → fen changes immediately
  //   2. stockfishAnalysisResult / evaluations are STILL from the previous fen
  //   3. customArrows renders stale arrows briefly, then they disappear
  //   4. New results arrive → arrows re-appear = flicker
  //
  // Fix: maintain a "results fen" ref. When fen changes, we immediately clear
  // arrows (resultsFen !== fen). Arrows only render when resultsFen === fen
  // AND engines are not loading. No stale arrows, no flicker.
  //
  // resultsFen is updated when stockfish or evaluations settle for a position.
  const [resultsFen, setResultsFen] = useState<string>("");

  // When stockfish finishes for a position, record which fen it's for.
  // We use the fact that stockfishLoading goes false → result is ready.
  const prevStockfishLoading = useRef(stockfishLoading);
  useEffect(() => {
    if (prevStockfishLoading.current && !stockfishLoading) {
      // Stockfish just finished — results now belong to the current fen
      setResultsFen(fen);
    }
    prevStockfishLoading.current = stockfishLoading;
  }, [stockfishLoading, fen]);

  // When maia/neural nets finish, also update resultsFen
  const prevMaiaLoading = useRef(maiaLoading);
  useEffect(() => {
    if (prevMaiaLoading.current && !maiaLoading) {
      setResultsFen(fen);
    }
    prevMaiaLoading.current = maiaLoading;
  }, [maiaLoading, fen]);

  // When the position changes (navigation), immediately invalidate arrows
  // so we never show stale arrows from the previous position.
  const prevFenRef = useRef(fen);
  useEffect(() => {
    if (prevFenRef.current !== fen) {
      prevFenRef.current = fen;
      setResultsFen(""); // clears arrows until engines settle
    }
  }, [fen]);

  // ── Piece analysis ─────────────────────────────────────────────────────────
  const boardAnalysis = useMemo(() => {
    if (!fen || (!showHangingPieces && !showSemiProtectedPieces)) return null;
    try { return new Board(fen); } catch { return null; }
  }, [fen, showHangingPieces, showSemiProtectedPieces]);

  const pieceHighlightStyles = useMemo(() => {
    const styles: { [sq: string]: React.CSSProperties } = {};
    if (!boardAnalysis) return styles;
    if (showHangingPieces && !puzzleMode && !playMode) {
      boardAnalysis.HangingPieceCoordinates.forEach(coord => {
        styles[coord] = { backgroundColor: "rgba(244,67,54,0.6)", boxShadow: "inset 0 0 0 3px rgba(244,67,54,0.8)" };
      });
    }
    if (showSemiProtectedPieces && !puzzleMode && !playMode) {
      boardAnalysis.SemiProtectedPieceCoordinates.forEach(coord => {
        if (!styles[coord]) styles[coord] = { backgroundColor: "rgba(255,235,59,0.6)", boxShadow: "inset 0 0 0 3px rgba(255,235,59,0.8)" };
      });
    }
    return styles;
  }, [boardAnalysis, showHangingPieces, showSemiProtectedPieces, puzzleMode, playMode]);

  // ── Flat history (fallback when no tree nav) ───────────────────────────────
  const gameHistory = useMemo(() => {
    const base = new Chess();
    const history: string[] = [base.fen()];
    if (moves && moves.length > 0) {
      for (const move of moves) {
        try { base.move(move); history.push(base.fen()); } catch { break; }
      }
    }
    return history;
  }, [moves]);

  useEffect(() => {
    // In puzzleMode/playMode the parent fully owns game/fen (it sets the
    // puzzle's or game's actual starting position and applies moves itself
    // via onDropPuzzle/handlePlayerMove) — this history-navigation state is
    // only for standalone game/position review. Resetting to the default
    // starting position here would stomp the puzzle/play FEN the parent just
    // set, especially now that puzzle boards remount per puzzle (see the
    // per-puzzle `key` on the puzzle page).
    if (puzzleMode || playMode) return;
    const start = new Chess(gameHistory[0]);
    setGame(start); setFen(gameHistory[0]);
    setMoveHistory(gameHistory);
    setInternalMoveIndex(gameHistory.length - 1);
  }, [gameHistory, setGame, setFen, puzzleMode, playMode]);

  const safeGameMutate = useCallback((modify: (g: Chess) => void) => {
    if (!fen) return;
    try {
      const ng = new Chess(fen);
      modify(ng);
      const nFen = ng.fen();
      const nHist = [...moveHistory.slice(0, internalMoveIndex + 1), nFen];
      setGame(ng); setFen(nFen);
      setMoveHistory(nHist); setInternalMoveIndex(nHist.length - 1);
    } catch (err) {
      // Illegal move in free-analysis mode — silently ignore
      console.warn("Illegal move (analysis):", err);
    }
  }, [fen, moveHistory, internalMoveIndex, setGame, setFen]);

  const clearAnalysis = useCallback(() => setStockfishAnalysisResult(null), [setStockfishAnalysisResult]);

  const canPlayerMove = useCallback(() => {
    if (!playMode || gameStatus !== "playing") return true;
    const turn = game.turn();
    return ((side === "white" && turn === "w") || (side === "black" && turn === "b")) && !engineThinking;
  }, [playMode, gameStatus, game, side, engineThinking]);

  const handlePlayerMove = useCallback((args: PieceDropHandlerArgs) => {
    const { sourceSquare: src, targetSquare: tgt } = args;
    if (!src || !tgt) return false;
    if (playMode) {
      if (!canPlayerMove()) return false;
      try {
        const move = game.move({ from: src, to: tgt, promotion: "q" });
        if (move) {
          const ng = new Chess(game.fen()); ng.loadPgn(game.pgn());
          setGame(ng); setFen(ng.fen()); setSelectedSquare(null); setLegalMoves([]); setMoveSquares({});
          return true;
        }
      } catch (err) {
        // Illegal move in play mode — snap piece back silently
        console.warn("Illegal move (play):", err);
      }
      return false;
    }
    let moveMade = false;
    safeGameMutate(gi => {
      const m = gi.move({ from: src, to: tgt, promotion: "q" });
      if (m) { moveMade = true; clearAnalysis(); }
    });
    setMoveSquares({});
    return moveMade;
  }, [playMode, canPlayerMove, game, setGame, setFen, setMoveSquares, safeGameMutate, clearAnalysis]);

  const handleSquareClick = useCallback(({ piece, square }: SquareHandlerArgs) => {
    if (selectedSquare === square) { setSelectedSquare(null); setLegalMoves([]); return; }
    if (selectedSquare && legalMoves.includes(square)) {
      const mp = game.get(selectedSquare as Square);
      try {
        handlePlayerMove({
          piece: { isSparePiece: false, position: selectedSquare, pieceType: mp ? `${mp.color}${mp.type.toUpperCase()}` : "wP" },
          sourceSquare: selectedSquare,
          targetSquare: square,
        });
      } catch (err) {
        console.warn("Illegal square-click move:", err);
      }
      setSelectedSquare(null); setLegalMoves([]); return;
    }
    const cp = game.get(square as Square);
    if (!cp || cp.color !== game.turn()) { setSelectedSquare(null); setLegalMoves([]); return; }
    if (playMode && cp.color !== (side === "white" ? "w" : "b")) { setSelectedSquare(null); setLegalMoves([]); return; }
    setSelectedSquare(square);
    setLegalMoves(game.moves({ square: square as Square, verbose: true }).map(m => m.to));
  }, [playMode, selectedSquare, legalMoves, game, side, handlePlayerMove]);

  // ── Arrows ─────────────────────────────────────────────────────────────────
  //
  // Arrows are only shown when:
  //   1. showArrows is enabled
  //   2. Not in play mode
  //   3. resultsFen === fen (engines have settled for THIS position — no stale results)
  //   4. Engines are not currently loading (no mid-computation flicker)
  //
  // This means: navigate → arrows instantly gone → engines finish → arrows appear.
  // No intermediate flicker with arrows from the wrong position.
  const customArrows = useMemo<Arrow[]>(() => {
    if (!showArrows || playMode) return [];

    // Don't show arrows while engines are running or results are for a different position
    const enginesSettled = resultsFen === fen && !stockfishLoading && !maiaLoading;

    // For reviewMove arrows we always show them immediately (they come from the
    // game review which is position-independent / pre-computed)
    const reviewArrows: Arrow[] = [];
    if (reviewMove) {
      try {
        reviewArrows.push({
          startSquare: reviewMove.arrowMove.from as Square,
          endSquare: reviewMove.arrowMove.to as Square,
          color: getMoveClassificationStyle(reviewMove.quality).color,
        });
      } catch { /* invalid square — skip */ }
    }

    if (!enginesSettled) {
      // Only show review arrows while engines are computing
      return reviewArrows;
    }

    const arrows: Arrow[] = [...reviewArrows];
    const seen = new Set<string>(reviewArrows.map(a => `${a.startSquare}-${a.endSquare}`));

    const addArrow = (a: Arrow) => {
      const k = `${a.startSquare}-${a.endSquare}`;
      if (!seen.has(k)) { seen.add(k); arrows.push(a); }
    };

    // Stockfish best move
    if (stockfishAnalysisResult?.lines?.length) {
      const pv = stockfishAnalysisResult.lines[0].pv?.[0];
      if (pv?.length >= 4) {
        // If review says it was the best move, skip (review arrow already covers it)
        if (!reviewMove || reviewMove.quality !== "Best") {
          try {
            addArrow({ startSquare: pv.slice(0, 2) as Square, endSquare: pv.slice(2, 4) as Square, color: "#4caf50" });
          } catch { /* invalid square */ }
        }
      }
    }

    // Neural net policy arrows
    // UCI regex: [a-h][1-8][a-h][1-8] with optional promotion char
    // Needed because SAN captures like "dxe4" are also length 4 and would break the slice approach
    const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
    const addPolicy = (policy?: Record<string, number>, color?: string) => {
      if (!policy || !color) return;
      const top = Object.entries(policy).sort(([, a], [, b]) => b - a)[0]?.[0];
      if (!top) return;
      try {
        if (UCI_RE.test(top)) {
          // Valid UCI — slice directly (e.g. "d5e4" → from d5, to e4)
          addArrow({ startSquare: top.slice(0, 2) as Square, endSquare: top.slice(2, 4) as Square, color });
        } else {
          // SAN fallback — parse via chess.js to get from/to (e.g. "dxe4", "Nf3", "O-O")
          const move = new Chess(fen).move(top);
          if (move) addArrow({ startSquare: move.from as Square, endSquare: move.to as Square, color });
        }
      } catch { /* invalid move for this position */ }
    };

    addPolicy(evaluations?.bigLeela?.policy, "#400ac8ff");
    addPolicy(evaluations?.elitemaia?.policy, "rgb(235,49,154)");
    addPolicy(sanEvaluations?.maia3?.["maia_kdd_2600"]?.policy, "#b71c1c");

    return arrows;
  }, [
    showArrows, playMode,
    resultsFen, fen,           // stability gate
    stockfishLoading, maiaLoading,
    reviewMove,
    stockfishAnalysisResult,
    evaluations,
    sanEvaluations,
  ]);

  // ── Square styles ──────────────────────────────────────────────────────────
  const customSquareStyles = useMemo(() => {
    const s: { [sq: string]: React.CSSProperties } = {};
    Object.entries(pieceHighlightStyles).forEach(([sq, st]) => { s[sq] = { ...st }; });
    Object.entries(moveSquares).forEach(([sq, color]) => { s[sq] = { ...s[sq], backgroundColor: color }; });
    if (selectedSquare) s[selectedSquare] = { backgroundColor: "rgba(156,39,176,0.6)", ...s[selectedSquare] };
    legalMoves.forEach(sq => {
      const p = game.get(sq as Square);
      s[sq] = { background: p ? "radial-gradient(circle,rgba(156,39,176,0.8) 85%,transparent 85%)" : "radial-gradient(circle,rgba(156,39,176,0.4) 25%,transparent 25%)", ...s[sq] };
    });
    return s;
  }, [pieceHighlightStyles, moveSquares, selectedSquare, legalMoves, game]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const useTreeNav = hideBuiltInMoveList && !!onTreePrevious;

  const handlePrev = useCallback(() => {
    if (useTreeNav && onTreePrevious) { onTreePrevious(); return; }
    if (internalMoveIndex > 0) {
      const ni = internalMoveIndex - 1;
      const ng = new Chess(moveHistory[ni]);
      setGame(ng); setFen(moveHistory[ni]); setInternalMoveIndex(ni); setSelectedSquare(null); setLegalMoves([]);
    }
  }, [useTreeNav, onTreePrevious, internalMoveIndex, moveHistory, setGame, setFen]);

  const handleNext = useCallback(() => {
    if (useTreeNav && onTreeNext) { onTreeNext(); return; }
    if (internalMoveIndex < moveHistory.length - 1) {
      const ni = internalMoveIndex + 1;
      const ng = new Chess(moveHistory[ni]);
      setGame(ng); setFen(moveHistory[ni]); setInternalMoveIndex(ni); setSelectedSquare(null); setLegalMoves([]);
    }
  }, [useTreeNav, onTreeNext, internalMoveIndex, moveHistory, setGame, setFen]);

  const handleStart = useCallback(() => {
    if (useTreeNav && onTreeStart) { onTreeStart(); return; }
    if (moveHistory.length > 0) {
      const ng = new Chess(moveHistory[0]);
      setGame(ng); setFen(moveHistory[0]); setInternalMoveIndex(0); setSelectedSquare(null); setLegalMoves([]);
    }
  }, [useTreeNav, onTreeStart, moveHistory, setGame, setFen]);

  const handleEnd = useCallback(() => {
    if (useTreeNav && onTreeEnd) { onTreeEnd(); return; }
    const last = moveHistory.length - 1;
    const ng = new Chess(moveHistory[last]);
    setGame(ng); setFen(moveHistory[last]); setInternalMoveIndex(last); setSelectedSquare(null); setLegalMoves([]);
  }, [useTreeNav, onTreeEnd, moveHistory, setGame, setFen]);

  const loadCustomFen = useCallback(() => {
    try {
      const ng = new Chess(customFen);
      setGame(ng); setFen(ng.fen()); setMoveHistory([ng.fen()]); setInternalMoveIndex(0); clearAnalysis(); setCustomFen("");
    } catch { alert("Invalid FEN string."); }
  }, [customFen, setGame, setFen, clearAnalysis]);

  const flipBoard = () => setIsFlipped(!isFlipped);

  // ── Disabled states for nav buttons ───────────────────────────────────────
  const isPrevDisabled = useTreeNav
    ? (treePly !== undefined ? treePly <= 0 : false)
    : internalMoveIndex <= 0;
  const isNextDisabled = useTreeNav
    ? (treeMaxPly !== undefined && treePly !== undefined ? treePly >= treeMaxPly : false)
    : internalMoveIndex >= moveHistory.length - 1;

  // ── Move counter display ───────────────────────────────────────────────────
  const moveCounter = useTreeNav
    ? `${treePly ?? 0} / ${treeMaxPly ?? 0}`
    : `${Math.max(0, internalMoveIndex)} / ${Math.max(0, moveHistory.length - 1)}`;

  // ── Orientation / mode ─────────────────────────────────────────────────────
  const getBoardOrientation = useCallback(() => {
    if (puzzleMode || playMode) return side;
    return isFlipped ? "black" : "white";
  }, [puzzleMode, playMode, side, isFlipped]);

  const getModeInfo = () => {
    if (puzzleMode) return { label: "Puzzle Mode" };
    if (playMode) return { label: "Play Mode" };
    if (gameReviewMode) return { label: "Game Analysis" };
    return { label: "Analysis Mode" };
  };

  // ── Pieces ─────────────────────────────────────────────────────────────────
  const getCustomPieces = (pieceSet: string): PieceRenderObject => {
    const pieces = ["P", "N", "B", "R", "Q", "K"];
    const colors = ["w", "b"];
    const cp: PieceRenderObject = {};
    if (is3DSet(pieceSet)) {
      const heights: Record<string, number> = { P: 1, N: 1.2, B: 1.2, R: 1.2, Q: 1.5, K: 1.6 };
      colors.forEach(color => pieces.forEach(piece => {
        const key = `${color}${piece}`;
        cp[key] = () => {
          const w = document.querySelector(`[data-column="a"][data-row="1"]`)?.getBoundingClientRect()?.width ?? 80;
          return <div style={{ width: w, height: w, position: "relative", pointerEvents: "none" }}>
            <img src={`/static/pieces/${pieceSet}/${key}.png`} width={w} height={heights[piece] * w}
              style={{ position: "absolute", bottom: `${0.2 * w}px`, objectFit: piece === "K" ? "contain" : "cover" }} alt={key} />
          </div>;
        };
      }));
    } else {
      colors.forEach(color => pieces.forEach(piece => {
        const key = `${color}${piece}`;
        const src = pieceSet.toLowerCase() === "cburnett" || !pieceSet ? `/static/pieces/Cburnett/${key}.svg` : `/static/pieces/${pieceSet}/${key}.png`;
        cp[key] = () => <img src={src} style={{ width: "100%", height: "100%", display: "block" }} alt={key} />;
      }));
    }
    return cp;
  };

  const get3DBoardStyle = (ps: string) => !is3DSet(ps) ? {} : {
    transform: "rotateX(27.5deg)", transformOrigin: "center",
    border: "16px solid #2b1e19ff", borderStyle: "outset",
    borderRightColor: getCurrentThemeColors(boardTheme).darkSquareColor,
    borderRadius: "4px", boxShadow: "rgba(0,0,0,0.5) 2px 24px 24px 8px",
    borderRightWidth: "2px", borderLeftWidth: "2px", borderTopWidth: "0px", borderBottomWidth: "18px",
    borderTopLeftRadius: "8px", borderTopRightRadius: "8px",
    padding: "8px 8px 12px",
    background: getCurrentThemeColors(boardTheme).lightSquareColor,
    backgroundSize: "cover", overflow: "visible",
  };

  const { TopPlayerBar, BottomPlayerBar } = PlayerInfoBar({ gameInfo, boardOrientation: getBoardOrientation() });
  const modeInfo = getModeInfo();

  // ── Responsive board size ──────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const safeBoardSize = Number.isFinite(boardSize) ? boardSize : 480;
  const [boardPx, setBoardPx] = useState(Math.floor(safeBoardSize / 8) * 8);
  const evalBarsShown = showEvalBar && !puzzleMode && !playMode;
  // Two 20px bars (human eval + Stockfish) plus their gaps, reserved out of
  // the container width so the board shrinks to leave room for them instead
  // of the row overflowing its container (the mobile "bar doesn't fit" bug).
  const evalBarOverheadPx = evalBarsShown ? 40 : 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const overhead = gameInfo ? 140 : 80;
      const available = Math.min(entry.contentRect.width - evalBarOverheadPx, entry.contentRect.height - overhead);
      // Round DOWN to nearest multiple of 8 so the 8×8 CSS grid columns divide
      // evenly into whole pixels — prevents sub-pixel rounding gaps (white lines)
      // that appear between rows/columns on Safari and high-DPI displays.
      const raw = Math.max(240, Math.min(safeBoardSize, available > 0 ? available : safeBoardSize));
      setBoardPx(Math.floor(raw / 8) * 8);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [safeBoardSize, gameInfo, evalBarOverheadPx]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box ref={containerRef} sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%" }}>
      {/* Compact header */}
      <Stack direction="row" alignItems="center" sx={{ width: "100%", maxWidth: boardPx + 40, mb: 0.75, px: 0.5 }}>
        <Chip label={modeInfo.label} size="small" sx={{ fontSize: "0.6rem", fontWeight: 600, height: 20 }} />
        {(puzzleMode || playMode) && (
          <Typography variant="caption" sx={{ ml: 1, fontSize: "10px", color: "text.secondary" }}>
            {getBoardOrientation()} to play
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={() => setSettingsOpen(true)} size="small" sx={{ p: 0.4 }}>
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {gameInfo && <Box sx={{ width: "100%", maxWidth: boardPx + 40 }}><TopPlayerBar /></Box>}

      {/* Board + eval bars. On mobile the human eval bar moves to the right
          of the board (SF stays left) instead of stacking both bars on the
          left, since two 20px bars plus gaps can otherwise crowd a narrow
          screen more on one side than the layout has room for. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: boardPx + evalBarOverheadPx }}>
        {evalBarsShown && !isMobile && (
          <HumanEvalBar evaluation={evaluations?.maia3?.[maiaModelKey(evalBarRating)]} fen={fen} rating={evalBarRating} boardOrientation={getBoardOrientation()} height={boardPx} disabled={!autoAnalysis} />
        )}
        {evalBarsShown && (
          <EvalBar lineEval={stockfishAnalysisResult?.lines[0]} boardOrientation={getBoardOrientation()} height={boardPx} disabled={!autoAnalysis} />
        )}
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: puzzleMode ? onDropPuzzle : handlePlayerMove,
            onSquareClick: puzzleMode ? handleSquarePuzzleClick : handleSquareClick,
            allowDragOffBoard: false,
            animationDurationInMs: animationDuration,
            showNotation: showCoordinates,
            squareStyles: puzzleMode ? puzzleCustomSquareStyle : customSquareStyles,
            darkSquareStyle: { backgroundColor: getCurrentThemeColors(boardTheme).darkSquareColor },
            lightSquareStyle: { backgroundColor: getCurrentThemeColors(boardTheme).lightSquareColor },
            arrows: customArrows,
            boardOrientation: getBoardOrientation(),
            pieces: getCustomPieces(pieceType),
            boardStyle: { width: boardPx, height: boardPx, ...get3DBoardStyle(pieceType) },
            id: "ai-chessboard",
          }}
        />
        {evalBarsShown && isMobile && (
          <HumanEvalBar evaluation={evaluations?.maia3?.[maiaModelKey(evalBarRating)]} fen={fen} rating={evalBarRating} boardOrientation={getBoardOrientation()} height={boardPx} disabled={!autoAnalysis} />
        )}
      </Box>

      {gameInfo && <Box sx={{ width: "100%", maxWidth: boardPx + 40 }}><BottomPlayerBar /></Box>}

      {/* Navigation bar */}
      {!playMode && !puzzleMode && (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}
          sx={{ mt: 0.75, width: "100%", maxWidth: boardPx + 40 }}>
          <IconButton size="small" onClick={handleStart} disabled={isPrevDisabled}
            sx={{ p: 0.5, color: isPrevDisabled ? "action.disabled" : "text.secondary", "&:hover": { color: "text.primary" } }}>
            <SkipPrevious sx={{ fontSize: 19 }} />
          </IconButton>
          <IconButton size="small" onClick={handlePrev} disabled={isPrevDisabled}
            sx={{ p: 0.5, color: isPrevDisabled ? "action.disabled" : "text.secondary", "&:hover": { color: "text.primary" } }}>
            <NavigateBefore sx={{ fontSize: 19 }} />
          </IconButton>
          <Typography sx={{ fontSize: "10px", color: "text.disabled", fontFamily: "monospace", mx: 0.75, minWidth: 44, textAlign: "center" }}>
            {moveCounter}
          </Typography>
          <IconButton size="small" onClick={handleNext} disabled={isNextDisabled}
            sx={{ p: 0.5, color: isNextDisabled ? "action.disabled" : "text.secondary", "&:hover": { color: "text.primary" } }}>
            <NavigateNext sx={{ fontSize: 19 }} />
          </IconButton>
          <IconButton size="small" onClick={handleEnd} disabled={isNextDisabled}
            sx={{ p: 0.5, color: isNextDisabled ? "action.disabled" : "text.secondary", "&:hover": { color: "text.primary" } }}>
            <SkipNext sx={{ fontSize: 19 }} />
          </IconButton>
        </Stack>
      )}

      {/* FEN display */}
      {showFen && !puzzleMode && !playMode && (
        <Paper sx={{ p: 1, borderRadius: 1.5, mt: 1, width: "100%", maxWidth: boardPx + 40 }}>
          <Typography sx={{ fontFamily: "monospace", fontSize: "9px", wordBreak: "break-all", color: "text.disabled" }}>{fen}</Typography>
        </Paper>
      )}

      {/* Piece analysis overlay */}
      {boardAnalysis && (showHangingPieces || showSemiProtectedPieces) && !puzzleMode && !playMode && (
        <Paper sx={{ p: 1, borderRadius: 1.5, mt: 1, width: "100%", maxWidth: boardPx + 40 }}>
          {showHangingPieces && boardAnalysis.HangingPieceDescriptions.length > 0 && (
            <Box sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: "10px", color: "#f44336", fontWeight: 600 }}>Hanging:</Typography>
              {boardAnalysis.HangingPieceDescriptions.map((d, i) => (
                <Typography key={i} sx={{ fontSize: "10px", ml: 1 }}>• {d} @ {boardAnalysis.HangingPieceCoordinates[i]}</Typography>
              ))}
            </Box>
          )}
          {showSemiProtectedPieces && boardAnalysis.SemiProtectedPieceDescriptions.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: "10px", color: "#ffeb3b", fontWeight: 600 }}>Contested:</Typography>
              {boardAnalysis.SemiProtectedPieceDescriptions.map((d, i) => (
                <Typography key={i} sx={{ fontSize: "10px", ml: 1 }}>• {d} @ {boardAnalysis.SemiProtectedPieceCoordinates[i]}</Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {(puzzleMode || playMode) && <Divider sx={{ mt: 1.5, width: "100%" }} />}

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}
        fullScreen={isMobile}
        PaperProps={{ sx: { minWidth: isMobile ? "auto" : 420, maxHeight: "90vh" } }}>
        <DialogTitle>Board Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Board Theme</InputLabel>
              <Select value={boardTheme} onChange={e => setBoardTheme(e.target.value)} label="Board Theme">
                {Object.entries(BOARD_THEMES).map(([k, t]) => <MenuItem key={k} value={k}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Piece Style</InputLabel>
              <Select value={pieceType} onChange={e => setPieceType(e.target.value)} label="Piece Style">
                {Object.entries(PIECE_STYLE_TYPES).map(([k, p]) => <MenuItem key={k} value={k}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>Animation: {animationDuration}ms</Typography>
              <Slider value={animationDuration} onChange={(_, v) => setAnimationDuration(v as number)} min={0} max={1000} step={50} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1.5 }}>Display</Typography>
              <Stack spacing={1.5}>
                {([
                  ["Show Coordinates", showCoordinates, setShowCoordinates],
                  ...(!puzzleMode && !playMode ? [
                    ["Show FEN", showFen, setShowFen],
                    ["Show Arrows", showArrows, (v: boolean) => setShowArrows(v)],
                    ["Show Eval Bar", showEvalBar, setEvalBar],
                  ] : []),
                ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
                  <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{label}</Typography>
                    <Switch checked={val} onChange={e => setter(e.target.checked)} size="small" />
                  </Stack>
                ))}
              </Stack>
            </Box>
            {showEvalBar && !puzzleMode && !playMode && (
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Human Eval Bar Model (Maia)</Typography>
                  <Typography variant="body2" fontWeight={700}>{evalBarRating} Elo</Typography>
                </Box>
                <Slider
                  value={MAIA3_RATING_VALUES.indexOf(evalBarRating as typeof MAIA3_RATING_VALUES[number])}
                  min={0}
                  max={MAIA3_RATING_VALUES.length - 1}
                  step={1}
                  onChange={(_, idx) => setHumanEvalBarRating(MAIA3_RATING_VALUES[idx as number])}
                  marks={[
                    { value: 0, label: "600" },
                    { value: 5, label: "1100" },
                    { value: 10, label: "1600" },
                    { value: 15, label: "2100" },
                    { value: 20, label: "2600" },
                  ]}
                />
              </Box>
            )}
            {!puzzleMode && !playMode && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1.5 }}>Piece Highlights</Typography>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">Hanging Pieces</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#888" }}>Undefended pieces</Typography>
                    </Box>
                    <Switch checked={showHangingPieces} onChange={e => setShowHangingPieces(e.target.checked)} size="small"
                      sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#f44336" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#f44336" } }} />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">Semi-Protected</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#888" }}>Equal attackers/defenders</Typography>
                    </Box>
                    <Switch checked={showSemiProtectedPieces} onChange={e => setShowSemiProtectedPieces(e.target.checked)} size="small"
                      sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#ffeb3b" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#ffeb3b" } }} />
                  </Stack>
                </Stack>
              </Box>
            )}
            <Divider />
            <Button variant="outlined" onClick={flipBoard} startIcon={<RotateLeft />} fullWidth>Flip Board</Button>
            {!puzzleMode && !playMode && (
              <Stack spacing={1}>
                <TextField label="Load FEN" variant="outlined" value={customFen}
                  onChange={e => setCustomFen(e.target.value)} size="small" fullWidth
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" />
                <Button variant="contained" onClick={loadCustomFen} startIcon={<Upload />} disabled={!customFen.trim()} fullWidth>
                  Load Position
                </Button>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>Done</Button></DialogActions>
      </Dialog>
    </Box>
  );
}