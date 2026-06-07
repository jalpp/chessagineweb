"use client";

/**
 * @file LichessPlayClient.tsx
 * @description Main orchestration component for the Lichess Board API live play page.
 *
 * Responsibilities:
 * - Manages all local game state (phase, clocks, moves, FEN, players)
 * - Drives three Lichess SSE streams: event stream, seek drain, game stream
 * - Handles click-to-move and drag-and-drop board interaction
 * - Coordinates the navigation guard (prevents leaving mid-game)
 * - Passes derived props down to memoised sub-components
 *
 * All network calls are delegated to @/libs/lichess/api.
 * All chess utility functions are in @/libs/lichess/chess.
 * All TypeScript types are in @/libs/lichess/types.
 * Sub-components live in @/componets/lichess/play/.
 */

import { usePageReady } from "@/hooks/usePageReady";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, Drawer, Fab, FormControl, IconButton, InputLabel,
  MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup,
  Typography, useMediaQuery, useTheme,
} from "@mui/material";
import {
  AnalyticsOutlined as ReviewIcon,
  Close as CloseIcon,
  Handshake as DrawIcon,
  Flag as ResignIcon,
  LinkOutlined as LinkIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  SportsEsports as PlayIcon,
  SyncOutlined as ReconnectIcon,
  Tune as TuneIcon,
  WifiTethering as LiveIcon,
  SelfImprovement as ZenIcon,
} from "@mui/icons-material";
import { Menu as MenuIcon } from "lucide-react";
import { Chess, type Square } from "chess.js";
import {
  Chessboard,
  PieceDropHandlerArgs,
  PieceRenderObject,
  SquareHandlerArgs,
} from "react-chessboard";
import { useRouter } from "next/navigation";
import { useSessionStorage } from "usehooks-ts";

// Settings
import { useSettings } from "@/context/SettingContext";
import { getCurrentThemeColors, is3DSet } from "@/libs/setting/helper";

// Lichess OAuth
import {
  getLichessToken,
  getLichessUsername,
  startLichessOAuth,
} from "@/lib/lichessOAuth";

// Navigation guard
import { useLichessGuard } from "@/context/LichessGuardContext";

// Lichess Board API layer
import {
  postSeek,
  postMove,
  postResign,
  postAbort,
  postDrawOffer,
  postDrawDecline,
  streamEventStream,
  streamBoardGame,
} from "@/libs/lichess/api";

// Chess utilities and constants
import {
  SEEK_TIME_CONTROLS,
  TERMINAL_STATUSES,
  LAST_MOVE_COLOR,
  uciToSan,
  fenAfterMoves,
  buildGamePgn,
  buildGameInfo,
  statusToResultMessage,
} from "@/libs/lichess/chess";

// Types
import type {
  DrawPendingState,
  GameFullEvent,
  GamePhase,
  GamePlayer,
  GameStartEvent,
  GameStateEvent,
  LiveClock,
  OpponentGoneEvent,
  SeekColor,
  SeekRated,
} from "@/libs/lichess/types";

// Sub-components
import LichessPlayerRow from "@/componets/lichess/play/LichessPlayerRow";
import LichessMoveList from "@/componets/lichess/play/LichessMoveList";
import LichessBoardSettings from "@/componets/lichess/play/LichessBoardSettings";
import LichessLeaveDialog from "@/componets/lichess/play/LichessLeaveDialog";
import LichessResignDialog from "@/componets/lichess/play/LichessResignDialog";
import LichessDrawDialog from "@/componets/lichess/play/LichessDrawDialog";
import LichessAbortDialog from "@/componets/lichess/play/LichessAbortDialog";

// ─── Lichess logo ─────────────────────────────────────────────────────────────

/** Renders the Lichess brand logo from local public assets. */
const LichessIcon = ({ size = 22 }: { size?: number }) => (
  <Box
    component="img"
    src="/static/images/lichess-logo.png"
    alt="Lichess"
    sx={{ width: size, height: size, display: "block", imageRendering: "crisp-edges" }}
  />
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function LichessPlayClient() {
  usePageReady();

  const router   = useRouter();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const {
    boardTheme, boardPieceType: pieceType, boardSize,
    boardAnimDuration: animDuration, boardShowCoords: showCoords,
    saveSettings,
  } = useSettings();

  const setThemeSetting = useCallback(
    (v: string) => saveSettings({ board_theme: v }), [saveSettings]
  );
  const setPieceSetting = useCallback(
    (v: string) => saveSettings({ board_piece_type: v }), [saveSettings]
  );

  // ── Navigation guard ──────────────────────────────────────────────────────
  const {
    registerGuard, unregisterGuard,
    pendingHref, confirmNavigation, cancelNavigation,
  } = useLichessGuard();

  // ── Lichess credentials (localStorage, no Clerk required) ────────────────
  const [token,          setToken]          = useState("");
  const [username,       setUsername]       = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    setToken(getLichessToken());
    setUsername(getLichessUsername());
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "lichess-token" || e.key === "lichess-username") {
        setToken(getLichessToken());
        setUsername(getLichessUsername());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleConnectLichess = useCallback(async () => {
    setConnectLoading(true);
    try { await startLichessOAuth(); }
    catch { setConnectLoading(false); }
  }, []);

  // ── Seek settings ─────────────────────────────────────────────────────────
  const [tcIdx,  setTcIdx]  = useState(1);
  const [rated,  setRated]  = useState<SeekRated>("rated");
  const [color,  setColor]  = useState<SeekColor>("random");

  // ── Game state ────────────────────────────────────────────────────────────
  const [phase,        setPhase]       = useState<GamePhase>("idle");
  const [gameId,       setGameId]      = useState<string | null>(null);
  const [game,         setGame]        = useState(() => new Chess());
  const [fen,          setFen]         = useState(() => new Chess().fen());
  const [myColor,      setMyColor]     = useState<"white" | "black">("white");
  const [players,      setPlayers]     = useState<{ white: GamePlayer | null; black: GamePlayer | null }>({ white: null, black: null });
  const [clock,        setClock]       = useState<LiveClock>({ white: 0, black: 0 });
  const [activeClock,  setActiveClock] = useState<"white" | "black" | null>(null);
  const [result,       setResult]      = useState("");
  const [uciMoves,     setUciMoves]    = useState<string[]>([]);
  const [sanMoves,     setSanMoves]    = useState<string[]>([]);
  const [lastMove,     setLastMove]    = useState<{ from: string; to: string } | null>(null);
  const [drawPending,  setDrawPending] = useState<DrawPendingState>("none");
  const [viewingMove,  setViewingMove] = useState<number | null>(null);
  const [viewFen,      setViewFen]     = useState<string | null>(null);
  const [oppGone,      setOppGone]     = useState(false);
  const [claimInSecs,  setClaimInSecs] = useState<number | null>(null);
  const [error,        setError]       = useState("");
  const [connected,    setConnected]   = useState(false);
  const [drawerOpen,   setDrawerOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen]= useState(false);
  const [finalPgn,     setFinalPgn]    = useState("");
  const [isAborted,    setIsAborted]   = useState(false);

  // Zen mode — hides ratings and simplifies the seek setup UI
  const [zenMode, setZenMode] = useState(false);

  // Confirmation dialogs — prevent accidental resign/draw/abort
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [drawDialogOpen,   setDrawDialogOpen]   = useState(false);
  const [drawIsAccepting,  setDrawIsAccepting]  = useState(false);
  const [abortDialogOpen,  setAbortDialogOpen]  = useState(false);

  // Board resize via drag — stores the user-chosen px size
  const [boardPxOverride, setBoardPxOverride] = useState<number | null>(null);
  const resizeDragRef = useRef<{ startX: number; startY: number; startSize: number } | null>(null);

  // Click-to-move selection
  const [selectedSq,   setSelectedSq]  = useState<string | null>(null);
  const [legalTargets, setLegalTargets]= useState<string[]>([]);

  // ── Session storage handoff to game review page ───────────────────────────
  const [, setReviewPgn]   = useSessionStorage("agine_game_page_pgn", "");
  const [, setReviewMoves] = useSessionStorage<string[]>("agine_game_moves", []);
  const [, setReviewInfo]  = useSessionStorage<Record<string, string>>("agine_game_info", {});

  // ── Stream abort controllers ──────────────────────────────────────────────
  const seekRef  = useRef<AbortController | null>(null);
  const eventRef = useRef<AbortController | null>(null);
  const gameRef  = useRef<AbortController | null>(null);

  // Stable refs so callbacks never capture stale values
  const myColorRef  = useRef(myColor);
  const uciMovesRef = useRef(uciMoves);
  useEffect(() => { myColorRef.current  = myColor;  }, [myColor]);
  useEffect(() => { uciMovesRef.current = uciMoves; }, [uciMoves]);

  // ── Register / unregister navigation guard as game phase changes ──────────
  useEffect(() => {
    if (phase === "playing") {
      registerGuard();
    } else {
      unregisterGuard();
    }
    return () => { unregisterGuard(); };
  }, [phase, registerGuard, unregisterGuard]);

  // ── Browser tab close / refresh warning during game ───────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "You have a game in progress. If you leave, your game data will be lost. " +
        "You can continue the game on Lichess.org.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  /** Aborts all streams and navigates to the confirmed pending href. */
  const handleConfirmLeave = useCallback(() => {
    const href = pendingHref;
    gameRef.current?.abort();
    eventRef.current?.abort();
    seekRef.current?.abort();
    confirmNavigation();
    if (href) router.push(href);
  }, [pendingHref, confirmNavigation, router]);

  // ── 100ms local clock ticker ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !activeClock) return;
    const id = setInterval(() => {
      setClock(prev => ({ ...prev, [activeClock]: Math.max(0, prev[activeClock] - 100) }));
    }, 100);
    return () => clearInterval(id);
  }, [phase, activeClock]);

  // ── Custom piece renderer ─────────────────────────────────────────────────
  const buildCustomPieces = useCallback((ps: string): PieceRenderObject => {
    const pieces = ["P", "N", "B", "R", "Q", "K"];
    const colors = ["w", "b"];
    const result: PieceRenderObject = {};
    if (is3DSet(ps)) {
      const heightScale: Record<string, number> = { P: 1, N: 1.2, B: 1.2, R: 1.2, Q: 1.5, K: 1.6 };
      colors.forEach(c => pieces.forEach(p => {
        const key = `${c}${p}`;
        result[key] = () => {
          const w = document.querySelector('[data-column="a"][data-row="1"]')
            ?.getBoundingClientRect()?.width ?? 80;
          return (
            <div style={{ width: w, height: w, position: "relative", pointerEvents: "none" }}>
              <img
                src={`/static/pieces/${ps}/${key}.png`}
                width={w}
                height={heightScale[p] * w}
                style={{ position: "absolute", bottom: `${0.2 * w}px`, objectFit: p === "K" ? "contain" : "cover" }}
                alt={key}
              />
            </div>
          );
        };
      }));
    } else {
      colors.forEach(c => pieces.forEach(p => {
        const key = `${c}${p}`;
        const src = !ps || ps.toLowerCase() === "cburnett"
          ? `/static/pieces/Cburnett/${key}.svg`
          : `/static/pieces/${ps}/${key}.png`;
        result[key] = () => (
          <img src={src} style={{ width: "100%", height: "100%", display: "block" }} alt={key} />
        );
      }));
    }
    return result;
  }, []);

  const customPieces = useMemo(
    () => buildCustomPieces(pieceType), [pieceType, buildCustomPieces]
  );

  // ── Square highlight styles ───────────────────────────────────────────────
  const displayFen  = viewFen ?? fen;
  const themeColors = getCurrentThemeColors(boardTheme);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Last-move / review-move highlight (Lichess yellow — visible on all board themes)
    const hlMove = viewingMove !== null && viewingMove < uciMoves.length
      ? { from: uciMoves[viewingMove].slice(0, 2), to: uciMoves[viewingMove].slice(2, 4) }
      : lastMove;
    if (hlMove) {
      styles[hlMove.from] = { backgroundColor: LAST_MOVE_COLOR };
      styles[hlMove.to]   = { backgroundColor: LAST_MOVE_COLOR };
    }

    // Click-to-move highlights — only in live mode
    if (viewingMove === null) {
      if (selectedSq) {
        styles[selectedSq] = { backgroundColor: themeColors.selectedSquareColor };
      }
      legalTargets.forEach(sq => {
        const hasPiece = !!game.get(sq as Square);
        styles[sq] = hasPiece
          ? {
              backgroundColor: themeColors.squareClickLegalColor,
              boxShadow: `inset 0 0 0 3px ${themeColors.darkSquareColor}`,
            }
          : {
              background: `radial-gradient(circle, ${themeColors.squareClickLegalColor} 28%, transparent 28%)`,
            };
      });
    }
    return styles;
  }, [lastMove, viewingMove, uciMoves, selectedSq, legalTargets, themeColors, game]);

  // ── Apply incoming game state from stream ─────────────────────────────────
  const applyGameState = useCallback((
    moves: string, wtime: number, btime: number,
    wdraw?: boolean, bdraw?: boolean,
  ) => {
    const uciArr = moves ? moves.split(" ").filter(Boolean) : [];
    const ng = new Chess();
    for (const m of uciArr) {
      try {
        ng.move({
          from: m.slice(0, 2) as Square,
          to:   m.slice(2, 4) as Square,
          promotion: m[4] as ("q" | "r" | "b" | "n" | undefined),
        });
      } catch { break; }
    }
    setGame(ng); setFen(ng.fen());
    setUciMoves(uciArr); setSanMoves(uciToSan(uciArr));
    setClock({ white: wtime, black: btime });
    setActiveClock(ng.turn() === "w" ? "white" : "black");
    setSelectedSq(null); setLegalTargets([]);
    setViewingMove(null); setViewFen(null); // snap back to live on any new move
    if (uciArr.length > 0) {
      const last = uciArr[uciArr.length - 1];
      setLastMove({ from: last.slice(0, 2), to: last.slice(2, 4) });
    }
    // Draw offers detected from wdraw/bdraw fields (GameStateEvent schema)
    const myC = myColorRef.current;
    if      (myC === "white" && bdraw) setDrawPending("theyOffered");
    else if (myC === "black" && wdraw) setDrawPending("theyOffered");
    else if (myC === "white" && wdraw) setDrawPending("iOffered");
    else if (myC === "black" && bdraw) setDrawPending("iOffered");
    else                               setDrawPending("none");
  }, []);

  const handleGameEnd = useCallback((status: string, winner?: string) => {
    setPhase("finished");
    setActiveClock(null);
    setConnected(false);
    setSelectedSq(null);
    setLegalTargets([]);
    setIsAborted(status === "aborted" || status === "noStart");
    setResult(statusToResultMessage(status, winner));
  }, []);

  // ── Board resize via drag on bottom-right corner ──────────────────────────

  /** Starts tracking a board resize drag from the corner handle. */
  const onResizeDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const currentSize = boardPxOverride ?? Math.min(
      boardSize,
      isMobile ? (typeof window !== "undefined" ? window.innerWidth - 32 : 380) : 600
    );
    resizeDragRef.current = { startX: e.clientX, startY: e.clientY, startSize: currentSize };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [boardPxOverride, boardSize, isMobile]);

  const onResizeDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDragRef.current) return;
    const { startX, startY, startSize } = resizeDragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const delta  = (Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY);
    const newSize = Math.max(240, Math.min(800, startSize + delta));
    setBoardPxOverride(newSize);
  }, []);

  const onResizeDragEnd = useCallback(() => {
    resizeDragRef.current = null;
  }, []);

  // ── Board API game stream ─────────────────────────────────────────────────
  const startGameStream = useCallback(async (t: string, gid: string) => {
    const ctrl = new AbortController();
    gameRef.current = ctrl;
    try {
      for await (const ev of streamBoardGame(t, gid, ctrl.signal)) {
        if (ctrl.signal.aborted) break;
        if (ev.type === "gameFull") {
          const gf = ev as unknown as GameFullEvent;
          setPlayers({ white: gf.white ?? null, black: gf.black ?? null });
          if (gf.state) {
            applyGameState(gf.state.moves, gf.state.wtime, gf.state.btime, gf.state.wdraw, gf.state.bdraw);
            if (TERMINAL_STATUSES.has(gf.state.status)) handleGameEnd(gf.state.status, gf.state.winner);
          }
        } else if (ev.type === "gameState") {
          const gs = ev as unknown as GameStateEvent;
          applyGameState(gs.moves, gs.wtime, gs.btime, gs.wdraw, gs.bdraw);
          if (TERMINAL_STATUSES.has(gs.status)) handleGameEnd(gs.status, gs.winner);
        } else if (ev.type === "opponentGone") {
          const og = ev as unknown as OpponentGoneEvent;
          setOppGone(og.gone);
          setClaimInSecs(og.gone && og.claimWinInSeconds != null ? og.claimWinInSeconds : null);
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Game stream disconnected");
    }
  }, [applyGameState, handleGameEnd]);

  // ── Lichess event stream (catches gameStart) ──────────────────────────────
  const startEventStream = useCallback(async (t: string) => {
    const ctrl = new AbortController();
    eventRef.current = ctrl;
    setConnected(true);
    try {
      for await (const ev of streamEventStream(t, ctrl.signal)) {
        if (ctrl.signal.aborted) break;
        if (ev.type === "gameStart") {
          const { game: g } = ev as unknown as GameStartEvent;
          if (g.compat && g.compat.board === false) continue;
          const side: "white" | "black" = g.color === "black" ? "black" : "white";
          setMyColor(side);
          myColorRef.current = side;
          setGameId(g.gameId);
          setPhase("playing");
          seekRef.current?.abort();
          startGameStream(t, g.gameId);
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setConnected(false);
    }
  }, [startGameStream]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = useCallback(async () => {
    if (!token) return;
    setError(""); setResult(""); setFinalPgn("");
    setOppGone(false); setClaimInSecs(null);
    setPhase("seeking");
    startEventStream(token); // open event stream FIRST so gameStart is never missed
    const ctrl = new AbortController();
    seekRef.current = ctrl;
    try {
      await postSeek(token, SEEK_TIME_CONTROLS[tcIdx], rated, color, ctrl.signal);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError((e as Error).message);
        setPhase("idle");
      }
    }
  }, [token, tcIdx, rated, color, startEventStream]);

  const handleCancelSeek = useCallback(() => {
    seekRef.current?.abort();
    eventRef.current?.abort();
    setPhase("idle");
    setConnected(false);
  }, []);

  // ── Move execution ────────────────────────────────────────────────────────

  /** Validates and optimistically applies a move; sends it to Lichess. */
  const executeMove = useCallback((from: Square, to: Square): boolean => {
    const piece = game.get(from);
    let uci = `${from}${to}`;
    if (piece?.type === "p" && (
      (myColor === "white" && to[1] === "8") ||
      (myColor === "black" && to[1] === "1")
    )) uci += "q";

    const ng = new Chess(); ng.loadPgn(game.pgn());
    const mv = ng.move({ from, to, promotion: "q" });
    if (!mv) return false;

    setGame(ng); setFen(ng.fen()); setLastMove({ from, to });
    setSelectedSq(null); setLegalTargets([]);

    if (gameId && token) {
      postMove(token, gameId, uci).catch(err => setError((err as Error).message));
    }
    return true;
  }, [game, myColor, gameId, token]);

  const isMyTurn = useCallback((): boolean => {
    if (phase !== "playing" || viewingMove !== null) return false;
    const turn = game.turn();
    return (myColor === "white" && turn === "w") || (myColor === "black" && turn === "b");
  }, [phase, game, myColor, viewingMove]);

  const onSquareClick = useCallback(({ square }: SquareHandlerArgs) => {
    if (!isMyTurn()) return;
    const sq     = square as Square;
    const piece  = game.get(sq);
    const myChar = myColor === "white" ? "w" : "b";
    if (selectedSq) {
      if (legalTargets.includes(square)) { executeMove(selectedSq as Square, sq); return; }
      if (piece?.color === myChar) {
        setSelectedSq(square);
        setLegalTargets(game.moves({ square: sq, verbose: true }).map(m => m.to));
        return;
      }
      setSelectedSq(null); setLegalTargets([]);
      return;
    }
    if (piece?.color === myChar) {
      setSelectedSq(square);
      setLegalTargets(game.moves({ square: sq, verbose: true }).map(m => m.to));
    }
  }, [isMyTurn, selectedSq, legalTargets, game, myColor, executeMove]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (!isMyTurn() || !sourceSquare || !targetSquare) return false;
    const piece = game.get(sourceSquare as Square);
    if (!piece || piece.color !== (myColor === "white" ? "w" : "b")) return false;
    return executeMove(sourceSquare as Square, targetSquare as Square);
  }, [isMyTurn, game, myColor, executeMove]);

  // ── Move list navigation ──────────────────────────────────────────────────

  /**
   * Navigates the board to a historical position.
   * Reads uciMovesRef (stable) so this callback never goes stale.
   */
  const goToMove = useCallback((moveIdx: number) => {
    const moves = uciMovesRef.current;
    if (!moves.length || moveIdx < 0 || moveIdx >= moves.length) {
      setViewingMove(null); setViewFen(null);
      return;
    }
    setViewingMove(moveIdx);
    setViewFen(fenAfterMoves(moves, moveIdx + 1));
    setSelectedSq(null); setLegalTargets([]);
  }, []); // intentionally empty — reads ref

  const returnToLive = useCallback(() => {
    setViewingMove(null); setViewFen(null);
    setSelectedSq(null); setLegalTargets([]);
  }, []);

  // ── Game actions ──────────────────────────────────────────────────────────

  // ── Game actions — open confirm dialogs instead of acting directly ────────

  const handleResignClick  = useCallback(() => setResignDialogOpen(true),  []);
  const handleAbortClick   = useCallback(() => setAbortDialogOpen(true),   []);

  /** Open draw dialog: accepting = true when opponent offered, false when we're offering */
  const handleOfferDrawClick  = useCallback(() => { setDrawIsAccepting(false); setDrawDialogOpen(true); }, []);
  const handleAcceptDrawClick = useCallback(() => { setDrawIsAccepting(true);  setDrawDialogOpen(true); }, []);

  /** Confirmed resign */
  const handleResign = useCallback(() => {
    setResignDialogOpen(false);
    if (gameId && token) postResign(token, gameId).catch(() => {});
  }, [gameId, token]);

  /** Confirmed abort */
  const handleAbort = useCallback(() => {
    setAbortDialogOpen(false);
    if (gameId && token) postAbort(token, gameId).catch(() => {});
  }, [gameId, token]);

  /** Confirmed draw offer or acceptance */
  const handleDrawConfirm = useCallback(() => {
    setDrawDialogOpen(false);
    if (!gameId || !token) return;
    postDrawOffer(token, gameId).then(() => setDrawPending("iOffered")).catch(() => {});
  }, [gameId, token]);

  const handleDeclineDraw = useCallback(() => {
    if (!gameId || !token) return;
    postDrawDecline(token, gameId).then(() => setDrawPending("none")).catch(() => {});
  }, [gameId, token]);

  // ── PGN + review ──────────────────────────────────────────────────────────

  const getPgnOptions = useCallback(() => ({
    uciMoves, players, tc: SEEK_TIME_CONTROLS[tcIdx], rated, gameId, result,
  }), [uciMoves, players, tcIdx, rated, gameId, result]);

  const handleReviewGame = useCallback(() => {
    const opts = getPgnOptions();
    const pgn  = finalPgn || buildGamePgn(opts);
    if (!pgn) return;
    setReviewPgn(pgn);
    setReviewMoves(sanMoves);
    setReviewInfo(buildGameInfo(opts));
    router.push("/game");
  }, [finalPgn, getPgnOptions, sanMoves, setReviewPgn, setReviewMoves, setReviewInfo, router]);

  // Persist PGN when game ends so the Review button has data immediately
  useEffect(() => {
    if (phase === "finished" && sanMoves.length > 0) {
      setFinalPgn(buildGamePgn(getPgnOptions()));
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = useCallback(() => {
    gameRef.current?.abort(); eventRef.current?.abort(); seekRef.current?.abort();
    setPhase("idle"); setGameId(null);
    setGame(new Chess()); setFen(new Chess().fen());
    setPlayers({ white: null, black: null });
    setClock({ white: 0, black: 0 }); setActiveClock(null);
    setResult(""); setUciMoves([]); setSanMoves([]); setLastMove(null);
    setDrawPending("none"); setError(""); setConnected(false);
    setSelectedSq(null); setLegalTargets([]); setFinalPgn("");
    setViewingMove(null); setViewFen(null); setOppGone(false); setClaimInSecs(null);
    setIsAborted(false);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const oppSide    = myColor === "white" ? "black" : "white";
  const boardPx    = boardPxOverride ?? Math.min(
    boardSize,
    isMobile ? (typeof window !== "undefined" ? window.innerWidth - 32 : 380) : 600
  );
  const inReview   = viewingMove !== null;
  const oppClockMs = myColor === "white" ? clock.black : clock.white;
  const myClockMs  = myColor === "white" ? clock.white : clock.black;
  const oppActive  = activeClock === oppSide  && phase === "playing" && !inReview;
  const myActive   = activeClock === myColor  && phase === "playing" && !inReview;

  // ── Control panel ─────────────────────────────────────────────────────────
  // Kept as inline JSX (not extracted to a component) so it shares the parent
  // closure without introducing stale-closure issues from memo + prop drilling.
  const controlPanelContent = (
    <Stack spacing={2.5} sx={{ pb: 2 }}>

      {/* Status indicator + settings + zen toggles */}
      <Stack direction="row" spacing={1} alignItems="center">
        {phase === "playing" && gameId ? (
          <Chip label="LIVE" size="small" color="error"
            icon={<LiveIcon sx={{ fontSize: "14px !important" }} />}
            sx={{ fontWeight: 700 }} />
        ) : connected ? (
          <Chip label="Connected" size="small" color="success" variant="outlined"
            icon={<LiveIcon sx={{ fontSize: "12px !important" }} />} />
        ) : null}
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          title={zenMode ? "Exit Zen Mode" : "Zen Mode — hide ratings"}
          onClick={() => setZenMode(p => !p)}
          color={zenMode ? "primary" : "default"}
        >
          <ZenIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" title="Board appearance settings"
          onClick={() => setSettingsOpen(p => !p)}
          color={settingsOpen ? "primary" : "default"}>
          <TuneIcon fontSize="small" />
        </IconButton>
      </Stack>

      <LichessBoardSettings
        open={settingsOpen}
        boardTheme={boardTheme}
        pieceType={pieceType}
        onSetTheme={setThemeSetting}
        onSetPiece={setPieceSetting}
      />

      {/* Lichess account row */}
      {!token ? (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ color: "text.secondary", pt: 0.25, flexShrink: 0 }}>
                <LichessIcon size={20} />
              </Box>
              <Stack spacing={1} flex={1}>
                <Typography variant="body2" fontWeight={600}>Connect your Lichess account</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  Link your free Lichess account to play rated &amp; casual games here in ChessAgine.
                  Your token is stored locally — ChessAgine never stores credentials on a server.
                </Typography>
                <Button size="small" variant="contained" color="primary"
                  startIcon={connectLoading ? <CircularProgress size={13} color="inherit" /> : <LinkIcon fontSize="small" />}
                  onClick={handleConnectLichess} disabled={connectLoading}
                  sx={{ textTransform: "none", fontWeight: 600, alignSelf: "flex-start", mt: 0.5 }}>
                  {connectLoading ? "Redirecting to Lichess…" : "Connect Lichess"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={username} size="small" color="success" variant="outlined" clickable
            icon={<Box sx={{ display: "flex", alignItems: "center", pl: 0.5, color: "success.main" }}><LichessIcon size={14} /></Box>}
            component="a" href={`https://lichess.org/@/${username}`} target="_blank" rel="noopener noreferrer"
            sx={{ fontWeight: 600 }} />
          <Button size="small" variant="text" color="inherit"
            startIcon={connectLoading ? <CircularProgress size={13} color="inherit" /> : <ReconnectIcon fontSize="small" />}
            onClick={handleConnectLichess} disabled={connectLoading}
            sx={{ textTransform: "none", fontSize: "0.72rem", opacity: 0.6, "&:hover": { opacity: 1 } }}>
            {connectLoading ? "Redirecting…" : "Reconnect"}
          </Button>
        </Stack>
      )}

      {/* Seek setup (idle / finished) */}
      {(phase === "idle" || phase === "finished") && token && (
        <>
          {phase === "finished" && result && (
            <Alert severity={
              (result.includes("White wins") && myColor === "white") ||
              (result.includes("Black wins") && myColor === "black") ? "success" : "info"
            }>{result}</Alert>
          )}
          {!zenMode && (
            <>
              <FormControl fullWidth size="small">
                <InputLabel>Time Control</InputLabel>
                <Select value={tcIdx} label="Time Control" onChange={e => setTcIdx(Number(e.target.value))}>
                  {SEEK_TIME_CONTROLS.map((t, i) => <MenuItem key={i} value={i}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Alert severity="info" sx={{ fontSize: "0.75rem", py: 0.5 }}>
                Seek pool: <strong>Rapid &amp; Classical only</strong>. Bullet/Blitz require a direct challenge.
              </Alert>
              <Stack direction="row" spacing={1}>
                <Box flex={1}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Rating</Typography>
                  <ToggleButtonGroup value={rated} exclusive fullWidth size="small" onChange={(_, v) => v && setRated(v)}>
                    <ToggleButton value="rated">Rated</ToggleButton>
                    <ToggleButton value="casual">Casual</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box flex={1}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Color</Typography>
                  <ToggleButtonGroup value={color} exclusive fullWidth size="small" onChange={(_, v) => v && setColor(v)}>
                    <ToggleButton value="random">Any</ToggleButton>
                    <ToggleButton value="white">White</ToggleButton>
                    <ToggleButton value="black">Black</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </>
          )}
          <Button variant="contained" fullWidth size="large" startIcon={<PlayIcon />}
            onClick={handleSeek} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {phase === "finished" ? "New Game" : "Find Game on Lichess"}
          </Button>
          {phase === "finished" && finalPgn && !isAborted && (
            <Button variant="outlined" fullWidth startIcon={<ReviewIcon />} onClick={handleReviewGame}>
              Review This Game
            </Button>
          )}
          {phase === "finished" && (
            <Button variant="outlined" fullWidth startIcon={<RefreshIcon />} onClick={handleReset}>Reset</Button>
          )}
        </>
      )}

      {/* Seeking */}
      {phase === "seeking" && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center" py={1}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" textAlign="center">Looking for an opponent…</Typography>
              <Typography variant="caption" color="text.disabled">{SEEK_TIME_CONTROLS[tcIdx].label} · {rated}</Typography>
              <Button variant="outlined" color="error" size="small" onClick={handleCancelSeek}>Cancel</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* In-game controls */}
      {phase === "playing" && gameId && (
        <>
          <Divider />
          {drawPending === "theyOffered" && (
            <Alert severity="info" action={
              <Stack direction="row" spacing={0.5}>
                <Button size="small" color="success" onClick={handleAcceptDrawClick}>Accept</Button>
                <Button size="small" color="error"   onClick={handleDeclineDraw}>Decline</Button>
              </Stack>
            }>Opponent offers a draw</Alert>
          )}
          {oppGone && (
            <Alert severity="warning">
              Opponent disconnected{claimInSecs != null ? ` — claim win in ${claimInSecs}s` : " — you can claim a win"}
            </Alert>
          )}
          <Stack spacing={1}>
            {uciMoves.length < 2 && (
              <Button variant="outlined" color="warning" fullWidth size="small" onClick={handleAbortClick}>Abort Game</Button>
            )}
            <Button variant="outlined" color="secondary" fullWidth size="small"
              startIcon={<DrawIcon />} onClick={handleOfferDrawClick} disabled={drawPending === "iOffered"}>
              {drawPending === "iOffered" ? "Draw Offered…" : "Offer Draw"}
            </Button>
            <Button variant="contained" color="error" fullWidth size="small"
              startIcon={<ResignIcon />} onClick={handleResignClick}>Resign</Button>
          </Stack>
          <Divider />
          <Button variant="text" size="small" fullWidth endIcon={<OpenIcon fontSize="small" />}
            href={`https://lichess.org/${gameId}`} target="_blank" rel="noopener noreferrer">
            Open on Lichess.org
          </Button>
        </>
      )}

      {/* Move list */}
      <LichessMoveList
        sanMoves={sanMoves}
        viewingMove={viewingMove}
        onGoToMove={goToMove}
        onReturnToLive={returnToLive}
      />
    </Stack>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 4 }, minHeight: "100vh" }}>

      <Stack direction="row" alignItems="center" spacing={1.5} mb={3} flexWrap="wrap">
        <Box sx={{ color: "text.primary", display: "flex", alignItems: "center" }}>
          <LichessIcon size={26} />
        </Box>
        <Typography variant="h5" fontWeight={700}>Play on Lichess</Typography>
        {inReview && (
          <Chip label="Reviewing" size="small" color="warning" variant="outlined"
            onDelete={returnToLive} deleteIcon={<CloseIcon />} />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
      )}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2, md: 3 }}>

        {/* Board column */}
        <Box sx={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: { xs: "center", lg: "flex-start" } }}>
          <Box sx={{ width: boardPx, maxWidth: "100%", mb: 1 }}>
            <LichessPlayerRow side={oppSide} player={players[oppSide]} clockMs={oppClockMs} isActive={oppActive} phase={phase} zenMode={zenMode} />
          </Box>
          <Box sx={{
            width: boardPx, maxWidth: "100%", borderRadius: 2, overflow: "hidden",
            boxShadow: phase === "playing" ? "0 0 0 3px #3a86ff44, 0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.12)",
            transition: "box-shadow 0.3s",
            position: "relative",
          }}>
            <Chessboard options={{
              position:            displayFen,
              boardOrientation:    myColor,
              onPieceDrop:         onDrop,
              onSquareClick:       onSquareClick,
              allowDragging:       isMyTurn(),
              squareStyles:        squareStyles,
              darkSquareStyle:     { backgroundColor: themeColors.darkSquareColor },
              lightSquareStyle:    { backgroundColor: themeColors.lightSquareColor },
              pieces:              customPieces,
              animationDurationInMs: animDuration,
              showNotation:        showCoords,
              boardStyle:          { width: boardPx, height: boardPx },
            }} />
            {/* Drag handle — bottom-right corner for board resizing */}
            <Box
              onPointerDown={onResizeDragStart}
              onPointerMove={onResizeDragMove}
              onPointerUp={onResizeDragEnd}
              onPointerCancel={onResizeDragEnd}
              sx={{
                position: "absolute", bottom: 0, right: 0,
                width: 18, height: 18,
                cursor: "nwse-resize",
                touchAction: "none",
                display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                p: "3px",
                zIndex: 10,
              }}
            >
              <Box sx={{
                width: 10, height: 10,
                borderRight: "2px solid", borderBottom: "2px solid",
                borderColor: "rgba(255,255,255,0.45)",
                borderRadius: "0 0 2px 0",
              }} />
            </Box>
          </Box>
          <Box sx={{ width: boardPx, maxWidth: "100%", mt: 1 }}>
            <LichessPlayerRow side={myColor} player={players[myColor]} clockMs={myClockMs} isActive={myActive} phase={phase} zenMode={zenMode} />
          </Box>
        </Box>

        {/* Desktop control panel */}
        {!isMobile && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Card sx={{ borderRadius: 3, boxShadow: "0 8px 32px rgba(138,43,226,0.08)",
              height: { lg: "calc(100vh - 140px)" }, maxHeight: { lg: "calc(100vh - 140px)" }, overflow: "auto" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {phase === "idle"     && "Game Setup"}
                  {phase === "seeking"  && "Seeking…"}
                  {phase === "playing"  && "In Game"}
                  {phase === "finished" && "Game Over"}
                </Typography>
                {controlPanelContent}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Mobile FAB + drawer */}
        {isMobile && (
          <>
            <Fab color="primary" onClick={() => setDrawerOpen(true)}
              sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
              <MenuIcon />
            </Fab>
            <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}
              sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" fontWeight={600}>
                  {phase === "playing" ? "In Game" : "Game Setup"}
                </Typography>
                <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>{controlPanelContent}</Box>
            </Drawer>
          </>
        )}
      </Stack>

      {/* Confirmation dialogs — prevent accidental actions */}
      <LichessResignDialog
        open={resignDialogOpen}
        onCancel={() => setResignDialogOpen(false)}
        onConfirm={handleResign}
      />
      <LichessDrawDialog
        open={drawDialogOpen}
        isAccepting={drawIsAccepting}
        onCancel={() => setDrawDialogOpen(false)}
        onConfirm={handleDrawConfirm}
      />
      <LichessAbortDialog
        open={abortDialogOpen}
        onCancel={() => setAbortDialogOpen(false)}
        onConfirm={handleAbort}
      />

      {/* Leave-game confirmation modal */}
      <LichessLeaveDialog
        open={!!pendingHref}
        onCancel={cancelNavigation}
        onConfirm={handleConfirmLeave}
      />
    </Box>
  );
}
