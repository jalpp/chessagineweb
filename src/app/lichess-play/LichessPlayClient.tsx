"use client";

import { usePageReady } from "@/hooks/usePageReady";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import React from "react";
import {
  Box, Stack, Card, CardContent, Button, Typography, Chip, Alert,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
  ToggleButton, ToggleButtonGroup, Drawer, Fab, useMediaQuery,
  useTheme, Divider, Paper, IconButton,
} from "@mui/material";
import {
  SportsEsports as PlayIcon,
  Flag as ResignIcon,
  Handshake as DrawIcon,
  Close as CloseIcon,
  WifiTethering as LiveIcon,
  WifiTetheringOff as DisconnectedIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  AnalyticsOutlined as ReviewIcon,
} from "@mui/icons-material";
import { Menu as MenuIcon } from "lucide-react";
import { Chess, type Square } from "chess.js";
import { Chessboard, PieceDropHandlerArgs, PieceRenderObject, SquareHandlerArgs } from "react-chessboard";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSessionStorage } from "usehooks-ts";
import { getLichessToken, getLichessUsername } from "@/lib/lichessOAuth";
import { useSettings } from "@/context/SettingContext";
import {
  getCurrentThemeColors, is3DSet,
} from "@/libs/setting/helper";

// ─── Lichess Board API ────────────────────────────────────────────────────────
const LICHESS = "https://lichess.org";

// Parse NDJSON stream — yields each non-empty JSON line
async function* streamNdJson(response: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (t) {
        try { yield JSON.parse(t); } catch { /* skip bad lines */ }
      }
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimeControlOption {
  label: string;
  time: number;      // minutes (for seek API)
  increment: number; // seconds (for seek API)
}

const TIME_CONTROL_OPTIONS: TimeControlOption[] = [
  { label: "1+0 Bullet",       time: 1,  increment: 0  },
  { label: "1+1 Bullet",       time: 1,  increment: 1  },
  { label: "2+1 Bullet",       time: 2,  increment: 1  },
  { label: "3+0 Blitz",        time: 3,  increment: 0  },
  { label: "3+2 Blitz",        time: 3,  increment: 2  },
  { label: "5+0 Blitz",        time: 5,  increment: 0  },
  { label: "5+3 Blitz",        time: 5,  increment: 3  },
  { label: "10+0 Rapid",       time: 10, increment: 0  },
  { label: "10+5 Rapid",       time: 10, increment: 5  },
  { label: "15+10 Rapid",      time: 15, increment: 10 },
  { label: "30+0 Classical",   time: 30, increment: 0  },
];

interface GamePlayer { id: string; name: string; rating?: number }
interface LiveClock  { white: number; black: number } // milliseconds
type GamePhase = "idle" | "seeking" | "playing" | "finished";

// ─── UCI → SAN converter (uses chess.js) ─────────────────────────────────────
function uciMovesToSan(uciMoves: string[]): string[] {
  const chess = new Chess();
  const san: string[] = [];
  for (const uci of uciMoves) {
    const from = uci.slice(0, 2) as Square;
    const to   = uci.slice(2, 4) as Square;
    const promo = uci[4] as ("q" | "r" | "b" | "n" | undefined);
    try {
      const result = chess.move({ from, to, promotion: promo });
      if (result) san.push(result.san);
    } catch { break; }
  }
  return san;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LichessPlayClient() {
  usePageReady();
  const router = useRouter();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const { isSignedIn } = useAuth();

  // Board/piece settings from user's global preferences
  const {
    boardTheme, boardPieceType: pieceType, boardSize,
    boardAnimDuration: animDuration, boardShowCoords: showCoords,
  } = useSettings();

  // ── Lichess credentials ──────────────────────────────────────────────────
  const [lichessToken,    setLichessToken]    = useState("");
  const [lichessUsername, setLichessUsername] = useState("");

  useEffect(() => {
    setLichessToken(getLichessToken());
    setLichessUsername(getLichessUsername());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lichess-token" || e.key === "lichess-username") {
        setLichessToken(getLichessToken());
        setLichessUsername(getLichessUsername());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Seek settings ────────────────────────────────────────────────────────
  const [tcIdx,  setTcIdx]  = useState(7); // 10+0 default
  const [rated,  setRated]  = useState<"rated" | "casual">("rated");
  const [color,  setColor]  = useState<"random" | "white" | "black">("random");

  // ── Game state ───────────────────────────────────────────────────────────
  const [phase,        setPhase]       = useState<GamePhase>("idle");
  const [gameId,       setGameId]      = useState<string | null>(null);
  const [game,         setGame]        = useState(() => new Chess());
  const [fen,          setFen]         = useState(() => new Chess().fen());
  const [playerSide,   setPlayerSide]  = useState<"white" | "black">("white");
  const [players,      setPlayers]     = useState<{ white: GamePlayer | null; black: GamePlayer | null }>({ white: null, black: null });
  const [clock,        setClock]       = useState<LiveClock>({ white: 0, black: 0 });
  const [activeClock,  setActiveClock] = useState<"white" | "black" | null>(null);
  const [result,       setResult]      = useState("");
  const [uciMoves,     setUciMoves]    = useState<string[]>([]);   // raw UCI from stream
  const [sanMoves,     setSanMoves]    = useState<string[]>([]);   // converted SAN for display
  const [lastMove,     setLastMove]    = useState<{ from: string; to: string } | null>(null);
  const [drawOffer,    setDrawOffer]   = useState<"none" | "offered" | "received">("none");
  const [statusMsg,    setStatusMsg]   = useState("");
  const [error,        setError]       = useState("");
  const [connected,    setConnected]   = useState(false);
  const [drawerOpen,   setDrawerOpen]  = useState(false);
  const [finalPgn,     setFinalPgn]    = useState("");

  // ── Legal-move highlight state ───────────────────────────────────────────
  const [selectedSq,  setSelectedSq]  = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);

  // ── Session storage for cross-page PGN hand-off ──────────────────────────
  const [, setReviewPgn] = useSessionStorage("agine_game_page_pgn", "");

  // ── Abort controllers ────────────────────────────────────────────────────
  const seekAbortRef  = useRef<AbortController | null>(null);
  const eventAbortRef = useRef<AbortController | null>(null);
  const gameAbortRef  = useRef<AbortController | null>(null);

  // ── Stable ref so stream callbacks can read current playerSide ───────────
  const playerSideRef = useRef(playerSide);
  useEffect(() => { playerSideRef.current = playerSide; }, [playerSide]);

  // ── 100 ms local clock tick ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !activeClock) return;
    const id = setInterval(() => {
      setClock(prev => ({
        ...prev,
        [activeClock]: Math.max(0, prev[activeClock] - 100),
      }));
    }, 100);
    return () => clearInterval(id);
  }, [phase, activeClock]);

  // ── Build piece render objects (respects user settings) ──────────────────
  const getCustomPieces = useCallback((pieceSet: string): PieceRenderObject => {
    const pieces = ["P","N","B","R","Q","K"];
    const colors = ["w","b"];
    const cp: PieceRenderObject = {};
    if (is3DSet(pieceSet)) {
      const heights: Record<string,number> = { P:1, N:1.2, B:1.2, R:1.2, Q:1.5, K:1.6 };
      colors.forEach(c => pieces.forEach(p => {
        const key = `${c}${p}`;
        cp[key] = () => {
          const w = document.querySelector('[data-column="a"][data-row="1"]')?.getBoundingClientRect()?.width ?? 80;
          return (
            <div style={{ width: w, height: w, position: "relative", pointerEvents: "none" }}>
              <img src={`/static/pieces/${pieceSet}/${key}.png`} width={w} height={heights[p]*w}
                style={{ position: "absolute", bottom: `${0.2*w}px`, objectFit: p === "K" ? "contain" : "cover" }}
                alt={key} />
            </div>
          );
        };
      }));
    } else {
      colors.forEach(c => pieces.forEach(p => {
        const key = `${c}${p}`;
        const src = pieceSet.toLowerCase() === "cburnett" || !pieceSet
          ? `/static/pieces/Cburnett/${key}.svg`
          : `/static/pieces/${pieceSet}/${key}.png`;
        cp[key] = () => <img src={src} style={{ width:"100%",height:"100%",display:"block" }} alt={key} />;
      }));
    }
    return cp;
  }, []);

  const customPieces = useMemo(() => getCustomPieces(pieceType), [pieceType, getCustomPieces]);

  // ── Square styles: last move + selected + legal targets ──────────────────
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    const tc = getCurrentThemeColors(boardTheme);

    // Last move highlight
    if (lastMove) {
      const moveColor = `${tc.darkSquareColor}88`;
      styles[lastMove.from] = { backgroundColor: moveColor };
      styles[lastMove.to]   = { backgroundColor: moveColor };
    }

    // Selected square
    if (selectedSq) {
      styles[selectedSq] = { backgroundColor: "rgba(156,39,176,0.55)" };
    }

    // Legal move dots
    legalTargets.forEach(sq => {
      const hasPiece = !!game.get(sq as Square);
      styles[sq] = hasPiece
        ? { backgroundColor: "rgba(156,39,176,0.35)", boxShadow: "inset 0 0 0 3px rgba(156,39,176,0.7)" }
        : {
          background: "radial-gradient(circle, rgba(156,39,176,0.55) 28%, transparent 28%)",
          borderRadius: "50%",
        };
    });

    return styles;
  }, [lastMove, selectedSq, legalTargets, boardTheme, game]);

  // ── Apply a game state from Lichess stream ────────────────────────────────
  const applyGameState = useCallback((moves: string, wtime: number, btime: number) => {
    const uciArr = moves ? moves.split(" ").filter(Boolean) : [];
    const newGame = new Chess();
    for (const m of uciArr) {
      const from  = m.slice(0, 2) as Square;
      const to    = m.slice(2, 4) as Square;
      const promo = m[4] as ("q"|"r"|"b"|"n"|undefined);
      try { newGame.move({ from, to, promotion: promo }); } catch { break; }
    }

    setGame(newGame);
    setFen(newGame.fen());
    setUciMoves(uciArr);
    setSanMoves(uciMovesToSan(uciArr));
    setClock({ white: wtime, black: btime });
    setActiveClock(newGame.turn() === "w" ? "white" : "black");
    setSelectedSq(null);
    setLegalTargets([]);

    // Track last move for highlighting
    if (uciArr.length > 0) {
      const last = uciArr[uciArr.length - 1];
      setLastMove({ from: last.slice(0,2), to: last.slice(2,4) });
    }
  }, []);

  const handleGameEnd = useCallback((status: string, winner?: string) => {
    setPhase("finished");
    setActiveClock(null);
    setConnected(false);
    setSelectedSq(null);
    setLegalTargets([]);

    const w = winner === "white" ? "White" : "Black";
    let msg = "";
    if      (status === "mate")       msg = `Checkmate! ${w} wins`;
    else if (status === "resign")     msg = `${w} wins by resignation`;
    else if (status === "outoftime")  msg = `${w} wins on time`;
    else if (status === "draw")       msg = "Draw";
    else if (status === "stalemate")  msg = "Stalemate — Draw";
    else if (status === "aborted")    msg = "Game aborted";
    else                              msg = `Game over (${status})`;

    setResult(msg);
  }, []);

  // ── Stream the incoming event stream ─────────────────────────────────────
  const streamGame = useCallback(async (token: string, gid: string) => {
    const ctrl = new AbortController();
    gameAbortRef.current = ctrl;
    try {
      const res = await fetch(`${LICHESS}/api/board/game/stream/${gid}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (!res.ok) { setError(`Game stream failed: ${res.status}`); return; }

      for await (const ev of streamNdJson(res)) {
        if (ctrl.signal.aborted) break;
        const e = ev as {
          type: string;
          white?: { id: string; name: string; rating?: number };
          black?: { id: string; name: string; rating?: number };
          state?: { moves: string; wtime: number; btime: number; status: string; winner?: string };
          moves?: string; wtime?: number; btime?: number; status?: string; winner?: string;
          byWhite?: boolean;
        };

        if (e.type === "gameFull") {
          setPlayers({
            white: e.white ? { ...e.white } : null,
            black: e.black ? { ...e.black } : null,
          });
          if (e.state) {
            applyGameState(e.state.moves, e.state.wtime, e.state.btime);
            if (e.state.status !== "started") handleGameEnd(e.state.status, e.state.winner);
          }
        } else if (e.type === "gameState") {
          applyGameState(e.moves ?? "", e.wtime ?? 0, e.btime ?? 0);
          if (e.status && e.status !== "started") handleGameEnd(e.status, e.winner);
        } else if (e.type === "opponentGone") {
          setStatusMsg("Opponent disconnected");
        } else if (e.type === "drawOffer") {
          if (e.byWhite !== undefined) setDrawOffer("received");
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Game stream disconnected");
      }
    }
  }, [applyGameState, handleGameEnd]);

  const streamEvents = useCallback(async (token: string) => {
    const ctrl = new AbortController();
    eventAbortRef.current = ctrl;
    setConnected(true);
    try {
      const res = await fetch(`${LICHESS}/api/stream/event`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (!res.ok) { setError(`Event stream failed: ${res.status}`); setConnected(false); return; }

      for await (const ev of streamNdJson(res)) {
        if (ctrl.signal.aborted) break;
        const e = ev as { type: string; game?: { id: string; color?: string; compat?: { board?: boolean } } };

        if (e.type === "gameStart" && e.game) {
          const g = e.game;
          // Determine our color
          const side: "white" | "black" = g.color === "black" ? "black" : "white";
          setPlayerSide(side);
          playerSideRef.current = side;
          setGameId(g.id);
          setPhase("playing");
          setStatusMsg("");
          seekAbortRef.current?.abort();   // stop the seek stream
          streamGame(token, g.id);
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setConnected(false);
      }
    }
  }, [streamGame]);

  // ── Seek a game ───────────────────────────────────────────────────────────
  // IMPORTANT: The /api/board/seek endpoint is an SSE stream that stays open
  // while waiting for an opponent. We must keep reading it to stay in the pool.
  // The seek resolves (stream closes) when paired; we catch gameStart via /api/stream/event.
  const seekGame = useCallback(async () => {
    if (!lichessToken) return;
    setError(""); setResult(""); setFinalPgn("");
    setPhase("seeking"); setStatusMsg("Looking for an opponent…");

    const tc = TIME_CONTROL_OPTIONS[tcIdx];

    // Start event stream FIRST so gameStart is caught
    streamEvents(lichessToken);

    // POST seek — must actively read body to keep seek alive
    const ctrl = new AbortController();
    seekAbortRef.current = ctrl;

    try {
      const params = new URLSearchParams({
        rated:     String(rated === "rated"),
        time:      String(tc.time),       // minutes
        increment: String(tc.increment),  // seconds
        variant:   "standard",
        color:     color,
      });

      const res = await fetch(`${LICHESS}/api/board/seek`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lichessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
        signal: ctrl.signal,
      });

      if (!res.ok && !ctrl.signal.aborted) {
        const text = await res.text().catch(() => res.statusText);
        setError(`Seek failed (${res.status}): ${text}`);
        setPhase("idle");
        return;
      }

      // Drain the SSE body — Lichess keeps it open while seeking.
      // Without this, some clients drop the seek immediately.
      if (res.body) {
        const reader = res.body.getReader();
        try {
          while (true) {
            const { done } = await reader.read();
            if (done || ctrl.signal.aborted) break;
          }
        } catch { /* aborted is fine */ }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Seek failed or was cancelled");
        setPhase("idle");
      }
    }
  }, [lichessToken, tcIdx, rated, color, streamEvents]);

  const cancelSeek = useCallback(() => {
    seekAbortRef.current?.abort();
    eventAbortRef.current?.abort();
    setPhase("idle"); setStatusMsg(""); setConnected(false);
  }, []);

  // ── Make a move ───────────────────────────────────────────────────────────
  const makeMove = useCallback(async (uciMove: string) => {
    if (!gameId || !lichessToken) return;
    try {
      const res = await fetch(`${LICHESS}/api/board/game/${gameId}/move/${uciMove}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${lichessToken}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`Move failed: ${text}`);
      }
    } catch { setError("Failed to send move"); }
  }, [gameId, lichessToken]);

  // ── Board interaction ─────────────────────────────────────────────────────
  const isMyTurn = useCallback(() => {
    if (phase !== "playing") return false;
    const t = game.turn();
    return (playerSide === "white" && t === "w") || (playerSide === "black" && t === "b");
  }, [phase, game, playerSide]);

  // Click handler: select piece → show legals, click legal → move
  const onSquareClick = useCallback(({ square }: SquareHandlerArgs) => {
    if (!isMyTurn()) return;

    const sq = square as Square;
    const piece = game.get(sq);

    // If a square is already selected
    if (selectedSq) {
      if (legalTargets.includes(square)) {
        // Execute the move
        const from = selectedSq as Square;
        const movePiece = game.get(from);
        let uci = `${from}${sq}`;
        // Auto-queen promotion
        if (movePiece?.type === "p" &&
          ((playerSide === "white" && sq[1] === "8") ||
           (playerSide === "black" && sq[1] === "1"))) {
          uci += "q";
        }
        // Optimistic update
        const newGame = new Chess(); newGame.loadPgn(game.pgn());
        const mv = newGame.move({ from, to: sq, promotion: "q" });
        if (mv) {
          setGame(newGame); setFen(newGame.fen());
          setLastMove({ from, to: sq });
        }
        setSelectedSq(null); setLegalTargets([]);
        makeMove(uci);
        return;
      }

      // Clicked another own piece — reselect
      if (piece && piece.color === (playerSide === "white" ? "w" : "b")) {
        const legals = game.moves({ square: sq, verbose: true }).map(m => m.to);
        setSelectedSq(square); setLegalTargets(legals);
        return;
      }

      setSelectedSq(null); setLegalTargets([]);
      return;
    }

    // Select own piece
    if (piece && piece.color === (playerSide === "white" ? "w" : "b")) {
      const legals = game.moves({ square: sq, verbose: true }).map(m => m.to);
      setSelectedSq(square); setLegalTargets(legals);
    }
  }, [isMyTurn, selectedSq, legalTargets, game, playerSide, makeMove]);

  // Drag drop handler
  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (!isMyTurn() || !sourceSquare || !targetSquare) return false;

    const from = sourceSquare as Square;
    const to   = targetSquare as Square;
    const piece = game.get(from);
    if (!piece) return false;
    if (piece.color !== (playerSide === "white" ? "w" : "b")) return false;

    let uci = `${from}${to}`;
    if (piece.type === "p" &&
      ((playerSide === "white" && to[1] === "8") ||
       (playerSide === "black" && to[1] === "1"))) {
      uci += "q";
    }

    // Validate
    const testGame = new Chess(); testGame.loadPgn(game.pgn());
    const mv = testGame.move({ from, to, promotion: "q" });
    if (!mv) return false;

    setGame(testGame); setFen(testGame.fen());
    setLastMove({ from, to });
    setSelectedSq(null); setLegalTargets([]);
    makeMove(uci);
    return true;
  }, [isMyTurn, game, playerSide, makeMove]);

  // ── Game actions ──────────────────────────────────────────────────────────
  const resign     = useCallback(async () => { if (!gameId || !lichessToken) return; await fetch(`${LICHESS}/api/board/game/${gameId}/resign`, { method:"POST", headers:{ Authorization:`Bearer ${lichessToken}` } }).catch(() => setError("Failed to resign")); }, [gameId, lichessToken]);
  const offerDraw  = useCallback(async () => { if (!gameId || !lichessToken) return; await fetch(`${LICHESS}/api/board/game/${gameId}/draw/yes`, { method:"POST", headers:{ Authorization:`Bearer ${lichessToken}` } }).then(() => setDrawOffer("offered")).catch(() => setError("Failed to offer draw")); }, [gameId, lichessToken]);
  const declineDraw = useCallback(async () => { if (!gameId || !lichessToken) return; await fetch(`${LICHESS}/api/board/game/${gameId}/draw/no`, { method:"POST", headers:{ Authorization:`Bearer ${lichessToken}` } }).then(() => setDrawOffer("none")).catch(() => setError("Failed to decline draw")); }, [gameId, lichessToken]);
  const abortGame  = useCallback(async () => { if (!gameId || !lichessToken) return; await fetch(`${LICHESS}/api/board/game/${gameId}/abort`, { method:"POST", headers:{ Authorization:`Bearer ${lichessToken}` } }).catch(() => setError("Failed to abort")); }, [gameId, lichessToken]);

  // Build PGN from played game for review
  const buildPgn = useCallback(() => {
    if (!sanMoves.length) return "";
    const tc = TIME_CONTROL_OPTIONS[tcIdx];
    const chess = new Chess();
    const arr = uciMoves;
    for (const m of arr) {
      try { chess.move({ from: m.slice(0,2) as Square, to: m.slice(2,4) as Square, promotion: m[4] as ("q"|"r"|"b"|"n"|undefined) }); }
      catch { break; }
    }
    chess.setHeader("White", players.white?.name ?? "?");
    chess.setHeader("Black", players.black?.name ?? "?");
    chess.setHeader("Event", rated === "rated" ? "Rated game" : "Casual game");
    chess.setHeader("TimeControl", `${tc.time * 60}+${tc.increment}`);
    chess.setHeader("Site", `https://lichess.org/${gameId ?? ""}`);
    chess.setHeader("Date", new Date().toISOString().split("T")[0]);
    if (result) chess.setHeader("Result", result.includes("White") ? "1-0" : result.includes("Black") ? "0-1" : "1/2-1/2");
    return chess.pgn();
  }, [sanMoves, uciMoves, tcIdx, players, rated, gameId, result]);

  // ── Navigate to game review ───────────────────────────────────────────────
  const reviewGame = useCallback(() => {
    const pgn = finalPgn || buildPgn();
    if (!pgn) return;
    setReviewPgn(pgn);
    router.push("/game");
  }, [finalPgn, buildPgn, setReviewPgn, router]);

  // Store PGN when game finishes
  useEffect(() => {
    if (phase === "finished" && sanMoves.length > 0) {
      setFinalPgn(buildPgn());
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForNew = useCallback(() => {
    gameAbortRef.current?.abort();
    eventAbortRef.current?.abort();
    seekAbortRef.current?.abort();
    setPhase("idle"); setGameId(null);
    setGame(new Chess()); setFen(new Chess().fen());
    setPlayers({ white: null, black: null });
    setClock({ white: 0, black: 0 }); setActiveClock(null);
    setResult(""); setUciMoves([]); setSanMoves([]); setLastMove(null);
    setDrawOffer("none"); setStatusMsg(""); setError(""); setConnected(false);
    setSelectedSq(null); setLegalTargets([]); setFinalPgn("");
  }, []);

  // ── Clock formatter ───────────────────────────────────────────────────────
  const fmtClock = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    // Show tenths when < 20 seconds
    if (ms < 20000) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${m}:${String(s).padStart(2,"0")}.${tenths}`;
    }
    return `${m}:${String(s).padStart(2,"0")}`;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const opponentSide = playerSide === "white" ? "black" : "white";
  const opponentPlayer = players[opponentSide];
  const myPlayer       = players[playerSide];
  const themeColors    = getCurrentThemeColors(boardTheme);

  // ── Player row (name + clock) ─────────────────────────────────────────────
  const PlayerRow = ({ side }: { side: "white" | "black" }) => {
    const player  = players[side];
    const ms      = side === "white" ? clock.white : clock.black;
    const isActive = activeClock === side && phase === "playing";
    const isLow    = ms < 30000 && phase === "playing";

    return (
      <Paper elevation={isActive ? 3 : 0} sx={{
        px: 2, py: 1,
        border: "1px solid",
        borderColor: isActive ? "primary.main" : "divider",
        borderRadius: 2,
        transition: "all 0.2s ease",
        bgcolor: isActive ? "action.selected" : "transparent",
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{
              width: 14, height: 14, borderRadius: "50%",
              bgcolor: side === "white" ? "#f0d9b5" : "#3d2b1f",
              border: "1px solid", borderColor: "divider",
            }} />
            <Typography variant="body2" fontWeight={600}>
              {player?.name ?? (phase === "playing" ? "???" : "—")}
              {player?.rating && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({player.rating})
                </Typography>
              )}
            </Typography>
          </Stack>
          {phase !== "idle" && phase !== "seeking" && (
            <Typography
              variant="h6"
              fontFamily="monospace"
              fontWeight={700}
              color={isLow ? "error.main" : isActive ? "primary.main" : "text.primary"}
            >
              {fmtClock(ms)}
            </Typography>
          )}
        </Stack>
      </Paper>
    );
  };

  // ── Control panel ─────────────────────────────────────────────────────────
  const ControlPanel = () => (
    <Stack spacing={2.5} sx={{ pb: 2 }}>
      {/* Live indicator */}
      <Stack direction="row" spacing={1} alignItems="center">
        {connected
          ? <LiveIcon fontSize="small" color="success" />
          : <DisconnectedIcon fontSize="small" color="disabled" />}
        <Typography variant="caption" color={connected ? "success.main" : "text.disabled"}>
          {connected ? "Live stream active" : "Not connected"}
        </Typography>
        {gameId && phase === "playing" && (
          <Chip label="LIVE" size="small" color="error"
            icon={<LiveIcon sx={{ fontSize:"14px !important" }} />} sx={{ ml:"auto" }} />
        )}
      </Stack>

      {/* Auth / connection gates */}
      {!isSignedIn && (
        <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>Sign in to play on Lichess.</Alert>
      )}
      {isSignedIn && !lichessToken && (
        <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
          Connect your Lichess account in{" "}
          <a href="/setting" style={{ color: "inherit" }}>Settings</a> first.
          <br />
          <Typography variant="caption" color="text.secondary">
            If you connected before, reconnect to add the <code>board:play</code> scope.
          </Typography>
        </Alert>
      )}

      {/* ── SEEK SETUP ── */}
      {(phase === "idle" || phase === "finished") && isSignedIn && lichessToken && (
        <>
          {phase === "finished" && result && (
            <Alert severity={result.includes(lichessUsername) ? "success" : "info"}>{result}</Alert>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Time Control</InputLabel>
            <Select value={tcIdx} label="Time Control" onChange={e => setTcIdx(Number(e.target.value))}>
              {TIME_CONTROL_OPTIONS.map((tc, i) => (
                <MenuItem key={i} value={i}>{tc.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Rating</Typography>
              <ToggleButtonGroup value={rated} exclusive fullWidth size="small"
                onChange={(_, v) => v && setRated(v)}>
                <ToggleButton value="rated">Rated</ToggleButton>
                <ToggleButton value="casual">Casual</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Color</Typography>
              <ToggleButtonGroup value={color} exclusive fullWidth size="small"
                onChange={(_, v) => v && setColor(v)}>
                <ToggleButton value="random">Any</ToggleButton>
                <ToggleButton value="white">White</ToggleButton>
                <ToggleButton value="black">Black</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>

          <Button variant="contained" fullWidth size="large" startIcon={<PlayIcon />}
            onClick={seekGame} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {phase === "finished" ? "New Game" : "Find Game on Lichess"}
          </Button>

          {phase === "finished" && finalPgn && (
            <>
              <Button variant="outlined" fullWidth startIcon={<ReviewIcon />} onClick={reviewGame}>
                Review This Game
              </Button>
              <Button variant="outlined" fullWidth startIcon={<RefreshIcon />} onClick={resetForNew}>
                Reset
              </Button>
            </>
          )}
        </>
      )}

      {/* ── SEEKING ── */}
      {phase === "seeking" && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center" py={1}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {statusMsg}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {TIME_CONTROL_OPTIONS[tcIdx].label} · {rated}
              </Typography>
              <Button variant="outlined" color="error" size="small" onClick={cancelSeek}>
                Cancel Seek
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── IN-GAME CONTROLS ── */}
      {phase === "playing" && gameId && (
        <>
          <Divider />
          {drawOffer === "received" && (
            <Alert severity="info" action={
              <Stack direction="row" spacing={0.5}>
                <Button size="small" color="success" onClick={offerDraw}>Accept</Button>
                <Button size="small" color="error" onClick={declineDraw}>Decline</Button>
              </Stack>
            }>Draw offered</Alert>
          )}
          <Stack spacing={1}>
            {uciMoves.length < 2 && (
              <Button variant="outlined" color="warning" fullWidth onClick={abortGame} size="small">
                Abort Game
              </Button>
            )}
            <Button variant="outlined" color="secondary" fullWidth startIcon={<DrawIcon />}
              onClick={offerDraw} disabled={drawOffer === "offered"} size="small">
              {drawOffer === "offered" ? "Draw Offered…" : "Offer Draw"}
            </Button>
            <Button variant="contained" color="error" fullWidth startIcon={<ResignIcon />}
              onClick={resign} size="small">
              Resign
            </Button>
          </Stack>
          <Divider />
          <Button variant="text" size="small" endIcon={<OpenIcon fontSize="small" />}
            href={`https://lichess.org/${gameId}`} target="_blank" rel="noopener noreferrer" fullWidth>
            Open on Lichess.org
          </Button>
        </>
      )}

      {/* ── MOVE LIST (SAN) ── */}
      {sanMoves.length > 0 && (
        <>
          <Divider />
          <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>
            MOVES
          </Typography>
          <Box sx={{
            maxHeight: 180, overflowY: "auto",
            fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.8, px: 0.5,
          }}>
            {sanMoves.reduce<React.ReactElement[]>((acc, san, i) => {
              if (i % 2 === 0) {
                acc.push(
                  <span key={i} style={{ display: "inline-block", marginRight: 8 }}>
                    <Typography component="span" variant="caption" color="text.disabled" sx={{ mr: 0.5 }}>
                      {Math.floor(i / 2) + 1}.
                    </Typography>
                    <Typography component="span" variant="caption" sx={{ mr: 0.75, fontWeight: 600 }}>
                      {san}
                    </Typography>
                    {sanMoves[i + 1] && (
                      <Typography component="span" variant="caption">
                        {sanMoves[i + 1]}
                      </Typography>
                    )}
                  </span>
                );
              }
              return acc;
            }, [])}
          </Box>
        </>
      )}
    </Stack>
  );

  // ── Board size — respect user setting ─────────────────────────────────────
  const boardPx = Math.min(boardSize, isMobile ? (typeof window !== "undefined" ? window.innerWidth - 32 : 380) : 600);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 4 }, minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3} flexWrap="wrap">
        <Box component="img"
          src="https://lichess1.org/assets/logo/lichess-favicon-32.png" alt="Lichess"
          sx={{ width: 24, height: 24 }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <Typography variant="h5" fontWeight={700}>Play on Lichess</Typography>
        {lichessUsername && (
          <Chip label={lichessUsername} size="small" color="success" variant="outlined"
            component="a" href={`https://lichess.org/@/${lichessUsername}`}
            target="_blank" rel="noopener noreferrer" clickable />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
      )}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2, md: 3 }}>
        {/* ── Board column ── */}
        <Box sx={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: { xs: "center", lg: "flex-start" } }}>
          {/* Opponent row */}
          <Box sx={{ width: boardPx, maxWidth: "100%", mb: 1 }}>
            <PlayerRow side={opponentSide} />
          </Box>

          {/* Board */}
          <Box sx={{
            width: boardPx, maxWidth: "100%",
            borderRadius: 2, overflow: "hidden",
            boxShadow: phase === "playing"
              ? "0 0 0 3px #3a86ff44, 0 8px 32px rgba(0,0,0,0.3)"
              : "0 8px 32px rgba(0,0,0,0.12)",
            transition: "box-shadow 0.3s",
          }}>
            <Chessboard
              options={{
                position: fen,
                boardOrientation: playerSide,
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                allowDragging: isMyTurn(),
                squareStyles: squareStyles,
                darkSquareStyle:  { backgroundColor: themeColors.darkSquareColor },
                lightSquareStyle: { backgroundColor: themeColors.lightSquareColor },
                pieces: customPieces,
                animationDurationInMs: animDuration,
                showNotation: showCoords,
                boardStyle: { width: boardPx, height: boardPx },
              }}
            />
          </Box>

          {/* My row */}
          <Box sx={{ width: boardPx, maxWidth: "100%", mt: 1 }}>
            <PlayerRow side={playerSide} />
          </Box>

          {/* Status message */}
          {statusMsg && (
            <Box sx={{ width: boardPx, maxWidth: "100%", mt: 1 }}>
              <Alert severity="info" sx={{ py: 0.5, fontSize: "0.8rem" }}>{statusMsg}</Alert>
            </Box>
          )}
        </Box>

        {/* ── Desktop control panel ── */}
        {!isMobile && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Card sx={{
              borderRadius: 3,
              boxShadow: "0 8px 32px rgba(138,43,226,0.08)",
              height: { lg: "calc(100vh - 140px)" },
              maxHeight: { lg: "calc(100vh - 140px)" },
              overflow: "auto",
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  { phase === "idle" && "Game Setup" }
                  { phase === "seeking" && "Seeking…" }
                  { phase === "playing" && "In Game" }
                  { phase === "finished" && "Game Over" }
                </Typography>
                <ControlPanel />
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ── Mobile FAB + drawer ── */}
        {isMobile && (
          <>
            <Fab color="primary" onClick={() => setDrawerOpen(true)}
              sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
              <MenuIcon />
            </Fab>
            <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}
              sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
              <Box sx={{ p:2, borderBottom:1, borderColor:"divider", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Typography variant="h6" fontWeight={600}>
                  {phase === "playing" ? "In Game" : "Game Setup"}
                </Typography>
                <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                <ControlPanel />
              </Box>
            </Drawer>
          </>
        )}
      </Stack>
    </Box>
  );
}
