"use client";

/**
 * LichessPlayClient — Board API real-time play
 *
 * KEY ARCHITECTURE NOTES:
 * - All sub-components (PlayerRow, MoveList, SettingsPanel, ControlPanel) are
 *   defined OUTSIDE this component so React doesn't remount them on every
 *   state change (100ms clock = 10 renders/sec would destroy inner components).
 * - Game state is passed via stable props / refs so sub-components only
 *   re-render when their specific props change.
 * - Last move highlight uses #f6f669 (Lichess yellow) which is universally
 *   visible on all board themes regardless of square color.
 */

import { usePageReady } from "@/hooks/usePageReady";
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import React from "react";
import {
  Box, Stack, Card, CardContent, Button, Typography, Chip, Alert,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
  ToggleButton, ToggleButtonGroup, Drawer, Fab, useMediaQuery,
  useTheme, Divider, Paper, IconButton, Collapse,
} from "@mui/material";
import {
  SportsEsports as PlayIcon, Flag as ResignIcon, Handshake as DrawIcon,
  Close as CloseIcon, WifiTethering as LiveIcon, WifiTetheringOff as DisconnectedIcon,
  OpenInNew as OpenIcon, Refresh as RefreshIcon, AnalyticsOutlined as ReviewIcon,
  Tune as TuneIcon, LinkOutlined as LinkIcon,
} from "@mui/icons-material";
import { Menu as MenuIcon } from "lucide-react";
import { Chess, type Square } from "chess.js";
import { Chessboard, PieceDropHandlerArgs, PieceRenderObject, SquareHandlerArgs } from "react-chessboard";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSessionStorage } from "usehooks-ts";
import { getLichessToken, getLichessUsername, startLichessOAuth } from "@/lib/lichessOAuth";
import { useSettings } from "@/context/SettingContext";
import { getCurrentThemeColors, is3DSet, BOARD_THEMES, PIECE_STYLE_TYPES } from "@/libs/setting/helper";

// ─── Constants ────────────────────────────────────────────────────────────────
const LICHESS = "https://lichess.org";
// Universal last-move highlight: Lichess yellow — visible on every board theme
const LAST_MOVE_COLOR = "rgba(246,246,105,0.5)";

interface TC { label: string; time: number; increment: number; }
const SEEK_TIME_CONTROLS: TC[] = [
  { label: "8+0 Rapid",       time: 8,  increment: 0  },
  { label: "10+0 Rapid",      time: 10, increment: 0  },
  { label: "10+5 Rapid",      time: 10, increment: 5  },
  { label: "15+0 Rapid",      time: 15, increment: 0  },
  { label: "15+10 Rapid",     time: 15, increment: 10 },
  { label: "20+0 Rapid",      time: 20, increment: 0  },
  { label: "25+0 Rapid",      time: 25, increment: 0  },
  { label: "30+0 Classical",  time: 30, increment: 0  },
  { label: "30+20 Classical", time: 30, increment: 20 },
  { label: "45+45 Classical", time: 45, increment: 45 },
  { label: "60+0 Classical",  time: 60, increment: 0  },
];

// ─── NDJSON ───────────────────────────────────────────────────────────────────
async function* streamNdJson(res: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = res.body!.getReader();
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
      if (t) { try { yield JSON.parse(t); } catch { /* skip */ } }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uciToSan(uciMoves: string[]): string[] {
  const chess = new Chess();
  const san: string[] = [];
  for (const uci of uciMoves) {
    try {
      const r = chess.move({ from: uci.slice(0,2) as Square, to: uci.slice(2,4) as Square, promotion: uci[4] as ("q"|"r"|"b"|"n"|undefined) });
      if (r) san.push(r.san);
    } catch { break; }
  }
  return san;
}

function fenAfterMoves(uciMoves: string[], count: number): string {
  const chess = new Chess();
  for (let i = 0; i < Math.min(count, uciMoves.length); i++) {
    const m = uciMoves[i];
    try { chess.move({ from: m.slice(0,2) as Square, to: m.slice(2,4) as Square, promotion: m[4] as ("q"|"r"|"b"|"n"|undefined) }); }
    catch { break; }
  }
  return chess.fen();
}

const TERMINAL = new Set(["aborted","mate","resign","stalemate","timeout","draw","outoftime","cheat","noStart","unknownFinish","insufficientMaterialClaim","variantEnd"]);

interface GamePlayer { id: string; name: string; title?: string|null; rating?: number; }
interface LiveClock  { white: number; black: number }
type GamePhase = "idle" | "seeking" | "playing" | "finished";

function fmtMs(ms: number) {
  const tot = Math.ceil(ms / 1000);
  const m = Math.floor(tot / 60), s = tot % 60;
  if (ms < 20000) return `${m}:${String(s).padStart(2,"0")}.${Math.floor((ms%1000)/100)}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

// ─── PlayerRow (outside component — stable reference) ─────────────────────────
interface PlayerRowProps {
  side: "white"|"black";
  player: GamePlayer|null;
  clockMs: number;
  isActive: boolean;
  phase: GamePhase;
}
const PlayerRow = memo(({ side, player, clockMs, isActive, phase }: PlayerRowProps) => {
  const low = clockMs < 30000 && phase === "playing";
  return (
    <Paper elevation={isActive ? 3 : 0} sx={{
      px: 2, py: 1, border: "1px solid",
      borderColor: isActive ? "primary.main" : "divider",
      borderRadius: 2, transition: "border-color 0.3s, background-color 0.3s",
      bgcolor: isActive ? "action.selected" : "transparent",
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width:14, height:14, borderRadius:"50%",
            bgcolor: side==="white"?"#f0d9b5":"#3d2b1f", border:"1px solid", borderColor:"divider" }} />
          <Typography variant="body2" fontWeight={600}>
            {player?.name ?? (phase==="playing" ? "???" : "—")}
            {player?.rating != null && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml:0.5 }}>
                ({player.rating})
              </Typography>
            )}
          </Typography>
        </Stack>
        {phase !== "idle" && phase !== "seeking" && (
          <Typography variant="h6" fontFamily="monospace" fontWeight={700}
            color={low ? "error.main" : isActive ? "primary.main" : "text.primary"}
            sx={{ minWidth: 70, textAlign: "right" }}>
            {fmtMs(clockMs)}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
});
PlayerRow.displayName = "PlayerRow";

// ─── MoveList (outside component — stable reference) ──────────────────────────
interface MoveListProps {
  sanMoves: string[];
  uciMoves: string[];
  viewingMove: number|null;
  onGoToMove: (idx: number) => void;
  onReturnToLive: () => void;
}
const MoveList = memo(({ sanMoves, uciMoves: _u, viewingMove, onGoToMove, onReturnToLive }: MoveListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewingMove === null && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sanMoves.length, viewingMove]);

  if (!sanMoves.length) return null;

  return (
    <>
      <Divider />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>MOVES</Typography>
        {viewingMove !== null && (
          <Button size="small" variant="text" color="primary" sx={{ fontSize:"0.7rem", py:0, minWidth:0 }} onClick={onReturnToLive}>
            ↩ Live
          </Button>
        )}
      </Stack>
      <Box ref={scrollRef} sx={{ maxHeight:200, overflowY:"auto", fontFamily:"monospace", fontSize:"0.78rem", lineHeight:1.9, px:0.5 }}>
        {sanMoves.reduce<React.ReactElement[]>((acc, san, i) => {
          if (i % 2 === 0) {
            const blackSan = sanMoves[i + 1];
            const wIdx = i, bIdx = i + 1;
            const wActive = viewingMove === wIdx;
            const bActive = blackSan != null && viewingMove === bIdx;
            acc.push(
              <span key={i} style={{ display:"inline-block", marginRight:8, userSelect:"none" }}>
                <Typography component="span" variant="caption" color="text.disabled" sx={{ mr:0.5 }}>
                  {Math.floor(i/2)+1}.
                </Typography>
                <Typography component="span" variant="caption" fontWeight={600}
                  onClick={() => onGoToMove(wIdx)}
                  sx={{ mr:0.75, px:0.5, borderRadius:1, cursor:"pointer",
                    bgcolor: wActive ? "primary.main" : "transparent",
                    color: wActive ? "primary.contrastText" : "text.primary",
                    "&:hover": { bgcolor: wActive ? "primary.dark" : "action.hover" },
                  }}>
                  {san}
                </Typography>
                {blackSan && (
                  <Typography component="span" variant="caption"
                    onClick={() => onGoToMove(bIdx)}
                    sx={{ mr:0.75, px:0.5, borderRadius:1, cursor:"pointer",
                      bgcolor: bActive ? "primary.main" : "transparent",
                      color: bActive ? "primary.contrastText" : "text.primary",
                      "&:hover": { bgcolor: bActive ? "primary.dark" : "action.hover" },
                    }}>
                    {blackSan}
                  </Typography>
                )}
              </span>
            );
          }
          return acc;
        }, [])}
      </Box>
    </>
  );
});
MoveList.displayName = "MoveList";

// ─── SettingsPanel ────────────────────────────────────────────────────────────
interface SettingsPanelProps {
  open: boolean;
  boardTheme: string;
  pieceType: string;
  onSetTheme: (v: string) => void;
  onSetPiece: (v: string) => void;
}
const SettingsPanel = memo(({ open, boardTheme, pieceType, onSetTheme, onSetPiece }: SettingsPanelProps) => (
  <Collapse in={open}>
    <Card variant="outlined" sx={{ mt:1, mb:1, borderRadius:2 }}>
      <CardContent sx={{ py:1.5, px:2, "&:last-child":{ pb:1.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}>BOARD APPEARANCE</Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Board Theme</InputLabel>
            <Select value={boardTheme} label="Board Theme" onChange={e => onSetTheme(e.target.value)}>
              {Object.entries(BOARD_THEMES).map(([key, val]) => (
                <MenuItem key={key} value={key}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width:16, height:16, borderRadius:0.5,
                      background:`linear-gradient(135deg, ${val.lightSquareColor} 50%, ${val.darkSquareColor} 50%)` }} />
                    <span>{val.name}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Piece Set</InputLabel>
            <Select value={pieceType} label="Piece Set" onChange={e => onSetPiece(e.target.value)}>
              {Object.entries(PIECE_STYLE_TYPES).map(([key, val]) => (
                <MenuItem key={key} value={key}>{val.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </CardContent>
    </Card>
  </Collapse>
));
SettingsPanel.displayName = "SettingsPanel";

// ─── Main component ───────────────────────────────────────────────────────────
export default function LichessPlayClient() {
  usePageReady();
  const router   = useRouter();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  // isSignedIn kept only for Clerk-specific features; Lichess play is open to all
  const { isSignedIn } = useAuth();

  const { boardTheme, boardPieceType: pieceType, boardSize, boardAnimDuration: animDuration, boardShowCoords: showCoords, saveSettings } = useSettings();
  const setThemeSetting = useCallback((v: string) => saveSettings({ board_theme: v }), [saveSettings]);
  const setPieceSetting = useCallback((v: string) => saveSettings({ board_piece_type: v }), [saveSettings]);

  // ── Credentials ──────────────────────────────────────────────────────────
  const [token,    setToken]    = useState("");
  const [username, setUsername] = useState("");
  useEffect(() => { setToken(getLichessToken()); setUsername(getLichessUsername()); }, []);
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === "lichess-token" || e.key === "lichess-username") {
        setToken(getLichessToken()); setUsername(getLichessUsername());
      }
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);
  const [connectLoading, setConnectLoading] = useState(false);
  const handleConnectLichess = useCallback(async () => {
    setConnectLoading(true);
    try { await startLichessOAuth(); }
    catch { setConnectLoading(false); }
  }, []);

  // ── Seek settings ────────────────────────────────────────────────────────
  const [tcIdx,  setTcIdx]  = useState(1);
  const [rated,  setRated]  = useState<"rated"|"casual">("rated");
  const [color,  setColor]  = useState<"random"|"white"|"black">("random");

  // ── Game state (minimal setState calls to avoid churn) ───────────────────
  const [phase,        setPhase]       = useState<GamePhase>("idle");
  const [gameId,       setGameId]      = useState<string|null>(null);
  const [game,         setGame]        = useState(() => new Chess());
  const [fen,          setFen]         = useState(() => new Chess().fen());
  const [myColor,      setMyColor]     = useState<"white"|"black">("white");
  const [players,      setPlayers]     = useState<{ white: GamePlayer|null; black: GamePlayer|null }>({ white: null, black: null });
  const [clock,        setClock]       = useState<LiveClock>({ white: 0, black: 0 });
  const [activeClock,  setActiveClock] = useState<"white"|"black"|null>(null);
  const [result,       setResult]      = useState("");
  const [uciMoves,     setUciMoves]    = useState<string[]>([]);
  const [sanMoves,     setSanMoves]    = useState<string[]>([]);
  const [lastMove,     setLastMove]    = useState<{ from: string; to: string }|null>(null);
  const [drawPending,  setDrawPending] = useState<"none"|"iOffered"|"theyOffered">("none");
  const [viewingMove,  setViewingMove] = useState<number|null>(null);
  const [viewFen,      setViewFen]     = useState<string|null>(null);
  const [oppGone,      setOppGone]     = useState(false);
  const [claimInSecs,  setClaimInSecs] = useState<number|null>(null);
  const [error,        setError]       = useState("");
  const [connected,    setConnected]   = useState(false);
  const [drawerOpen,   setDrawerOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen]= useState(false);
  const [finalPgn,     setFinalPgn]    = useState("");

  // ── Click-to-move ────────────────────────────────────────────────────────
  const [selectedSq,   setSelectedSq]  = useState<string|null>(null);
  const [legalTargets, setLegalTargets]= useState<string[]>([]);

  // ── Session storage for game page handoff ─────────────────────────────────
  const [, setReviewPgn]   = useSessionStorage("agine_game_page_pgn", "");
  const [, setReviewMoves] = useSessionStorage<string[]>("agine_game_moves", []);
  const [, setReviewInfo]  = useSessionStorage<Record<string,string>>("agine_game_info", {});

  // ── Stream abort controllers ──────────────────────────────────────────────
  const seekRef    = useRef<AbortController|null>(null);
  const eventRef   = useRef<AbortController|null>(null);
  const gameRef    = useRef<AbortController|null>(null);
  const myColorRef = useRef(myColor);
  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  // Stable ref to uciMoves so goToMove doesn't go stale
  const uciMovesRef = useRef(uciMoves);
  useEffect(() => { uciMovesRef.current = uciMoves; }, [uciMoves]);

  // ── 100ms local clock — only updates clock state, nothing else ───────────
  useEffect(() => {
    if (phase !== "playing" || !activeClock) return;
    const id = setInterval(() => {
      setClock(p => ({ ...p, [activeClock]: Math.max(0, p[activeClock] - 100) }));
    }, 100);
    return () => clearInterval(id);
  }, [phase, activeClock]);

  // ── Custom pieces ─────────────────────────────────────────────────────────
  const getCustomPieces = useCallback((ps: string): PieceRenderObject => {
    const pcs = ["P","N","B","R","Q","K"], cols = ["w","b"];
    const cp: PieceRenderObject = {};
    if (is3DSet(ps)) {
      const h: Record<string,number> = { P:1,N:1.2,B:1.2,R:1.2,Q:1.5,K:1.6 };
      cols.forEach(c => pcs.forEach(p => {
        const k = `${c}${p}`;
        cp[k] = () => {
          const w = document.querySelector('[data-column="a"][data-row="1"]')?.getBoundingClientRect()?.width ?? 80;
          return <div style={{ width:w, height:w, position:"relative", pointerEvents:"none" }}>
            <img src={`/static/pieces/${ps}/${k}.png`} width={w} height={h[p]*w}
              style={{ position:"absolute", bottom:`${0.2*w}px`, objectFit: p==="K"?"contain":"cover" }} alt={k} />
          </div>;
        };
      }));
    } else {
      cols.forEach(c => pcs.forEach(p => {
        const k = `${c}${p}`;
        const src = ps.toLowerCase() === "cburnett" || !ps
          ? `/static/pieces/Cburnett/${k}.svg`
          : `/static/pieces/${ps}/${k}.png`;
        cp[k] = () => <img src={src} style={{ width:"100%",height:"100%",display:"block" }} alt={k} />;
      }));
    }
    return cp;
  }, []);
  const customPieces = useMemo(() => getCustomPieces(pieceType), [pieceType, getCustomPieces]);

  // ── Square styles ─────────────────────────────────────────────────────────
  const displayFen = viewFen ?? fen;
  const tc = getCurrentThemeColors(boardTheme);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    // Last move: always use the universal yellow — visible on every board theme
    const hlMove = viewingMove !== null && viewingMove < uciMoves.length
      ? { from: uciMoves[viewingMove].slice(0,2), to: uciMoves[viewingMove].slice(2,4) }
      : lastMove;
    if (hlMove) {
      styles[hlMove.from] = { backgroundColor: LAST_MOVE_COLOR };
      styles[hlMove.to]   = { backgroundColor: LAST_MOVE_COLOR };
    }
    // Click-to-move highlights — only in live mode
    if (viewingMove === null) {
      if (selectedSq) styles[selectedSq] = { backgroundColor: tc.selectedSquareColor };
      legalTargets.forEach(sq => {
        const hasPiece = !!game.get(sq as Square);
        styles[sq] = hasPiece
          ? { backgroundColor: tc.squareClickLegalColor, boxShadow: `inset 0 0 0 3px ${tc.darkSquareColor}` }
          : { background: `radial-gradient(circle, ${tc.squareClickLegalColor} 28%, transparent 28%)` };
      });
    }
    return styles;
  }, [lastMove, viewingMove, uciMoves, selectedSq, legalTargets, tc, game]);

  // ── Apply game state from stream ──────────────────────────────────────────
  const applyGameState = useCallback((
    moves: string, wtime: number, btime: number,
    wdraw?: boolean, bdraw?: boolean,
  ) => {
    const uciArr = moves ? moves.split(" ").filter(Boolean) : [];
    const ng = new Chess();
    for (const m of uciArr) {
      try { ng.move({ from: m.slice(0,2) as Square, to: m.slice(2,4) as Square, promotion: m[4] as ("q"|"r"|"b"|"n"|undefined) }); }
      catch { break; }
    }
    setGame(ng); setFen(ng.fen());
    setUciMoves(uciArr); setSanMoves(uciToSan(uciArr));
    setClock({ white: wtime, black: btime });
    setActiveClock(ng.turn() === "w" ? "white" : "black");
    setSelectedSq(null); setLegalTargets([]);
    setViewingMove(null); setViewFen(null); // snap back to live on new move
    if (uciArr.length > 0) {
      const last = uciArr[uciArr.length - 1];
      setLastMove({ from: last.slice(0,2), to: last.slice(2,4) });
    }
    const myC = myColorRef.current;
    if      (myC === "white" && bdraw) setDrawPending("theyOffered");
    else if (myC === "black" && wdraw) setDrawPending("theyOffered");
    else if (myC === "white" && wdraw) setDrawPending("iOffered");
    else if (myC === "black" && bdraw) setDrawPending("iOffered");
    else setDrawPending("none");
  }, []);

  const handleGameEnd = useCallback((status: string, winner?: string) => {
    setPhase("finished"); setActiveClock(null); setConnected(false);
    setSelectedSq(null); setLegalTargets([]);
    const w = winner === "white" ? "White" : "Black";
    setResult(
      status === "mate"                        ? `Checkmate! ${w} wins`
      : status === "resign"                    ? `${w} wins by resignation`
      : status === "outoftime"                 ? `${w} wins on time`
      : status === "timeout"                   ? `${w} wins on timeout`
      : status === "draw"                      ? "Draw"
      : status === "stalemate"                 ? "Stalemate — Draw"
      : status === "insufficientMaterialClaim" ? "Draw — Insufficient material"
      : status === "aborted"                   ? "Game aborted"
      : status === "noStart"                   ? "Game cancelled — no moves made"
      : status === "cheat"                     ? "Game ended — cheat detected"
      : `Game over (${status})`
    );
  }, []);

  // ── Streams ───────────────────────────────────────────────────────────────
  const streamGame = useCallback(async (t: string, gid: string) => {
    const ctrl = new AbortController();
    gameRef.current = ctrl;
    try {
      const res = await fetch(`${LICHESS}/api/board/game/stream/${gid}`, {
        headers: { Authorization: `Bearer ${t}` }, signal: ctrl.signal,
      });
      if (!res.ok) { setError(`Game stream error: ${res.status}`); return; }
      for await (const ev of streamNdJson(res)) {
        if (ctrl.signal.aborted) break;
        if (ev.type === "gameFull") {
          const gf = ev as { type: "gameFull"; white: GamePlayer; black: GamePlayer;
            state: { moves: string; wtime: number; btime: number; status: string; winner?: string; wdraw?: boolean; bdraw?: boolean }; };
          setPlayers({ white: gf.white ?? null, black: gf.black ?? null });
          if (gf.state) {
            applyGameState(gf.state.moves, gf.state.wtime, gf.state.btime, gf.state.wdraw, gf.state.bdraw);
            if (TERMINAL.has(gf.state.status)) handleGameEnd(gf.state.status, gf.state.winner);
          }
        } else if (ev.type === "gameState") {
          const gs = ev as { type: "gameState"; moves: string; wtime: number; btime: number; status: string; winner?: string; wdraw?: boolean; bdraw?: boolean };
          applyGameState(gs.moves, gs.wtime, gs.btime, gs.wdraw, gs.bdraw);
          if (TERMINAL.has(gs.status)) handleGameEnd(gs.status, gs.winner);
        } else if (ev.type === "opponentGone") {
          const og = ev as { gone: boolean; claimWinInSeconds?: number };
          setOppGone(og.gone);
          setClaimInSecs(og.gone && og.claimWinInSeconds != null ? og.claimWinInSeconds : null);
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Game stream disconnected");
    }
  }, [applyGameState, handleGameEnd]);

  const streamEvents = useCallback(async (t: string) => {
    const ctrl = new AbortController();
    eventRef.current = ctrl;
    setConnected(true);
    try {
      const res = await fetch(`${LICHESS}/api/stream/event`, {
        headers: { Authorization: `Bearer ${t}` }, signal: ctrl.signal,
      });
      if (!res.ok) { setError(`Event stream error: ${res.status}`); setConnected(false); return; }
      for await (const ev of streamNdJson(res)) {
        if (ctrl.signal.aborted) break;
        if (ev.type === "gameStart") {
          const g = (ev as { type: "gameStart"; game: { gameId: string; color: "white"|"black"; compat?: { board?: boolean } } }).game;
          if (g.compat && g.compat.board === false) continue;
          const side: "white"|"black" = g.color === "black" ? "black" : "white";
          setMyColor(side); myColorRef.current = side;
          setGameId(g.gameId); setPhase("playing");
          seekRef.current?.abort();
          streamGame(t, g.gameId);
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setConnected(false);
    }
  }, [streamGame]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const seekGame = useCallback(async () => {
    if (!token) return;
    setError(""); setResult(""); setFinalPgn(""); setOppGone(false); setClaimInSecs(null);
    setPhase("seeking");
    streamEvents(token);
    const ctrl = new AbortController();
    seekRef.current = ctrl;
    const tc = SEEK_TIME_CONTROLS[tcIdx];
    try {
      const body = new URLSearchParams({
        rated: String(rated === "rated"), time: String(tc.time),
        increment: String(tc.increment), variant: "standard", color,
      });
      const res = await fetch(`${LICHESS}/api/board/seek`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body, signal: ctrl.signal,
      });
      if (!res.ok && !ctrl.signal.aborted) {
        const txt = await res.text().catch(() => res.statusText);
        setError(`Seek failed (${res.status}): ${txt}`);
        setPhase("idle"); return;
      }
      if (res.body) {
        const reader = res.body.getReader();
        try { while (true) { const { done } = await reader.read(); if (done || ctrl.signal.aborted) break; } }
        catch { /* aborted = seek accepted or cancelled */ }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Seek failed or cancelled"); setPhase("idle");
      }
    }
  }, [token, tcIdx, rated, color, streamEvents]);

  const cancelSeek = useCallback(() => {
    seekRef.current?.abort(); eventRef.current?.abort();
    setPhase("idle"); setConnected(false);
  }, []);

  // ── Move helpers ──────────────────────────────────────────────────────────
  const sendMove = useCallback(async (uci: string) => {
    if (!gameId || !token) return;
    const res = await fetch(`${LICHESS}/api/board/game/${gameId}/move/${uci}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (res && !res.ok) setError(`Move rejected: ${await res.text().catch(() => "")}`);
  }, [gameId, token]);

  const isMyTurn = useCallback(() => {
    if (phase !== "playing" || viewingMove !== null) return false;
    const t = game.turn();
    return (myColor === "white" && t === "w") || (myColor === "black" && t === "b");
  }, [phase, game, myColor, viewingMove]);

  const executeMove = useCallback((from: Square, to: Square) => {
    const piece = game.get(from);
    let uci = `${from}${to}`;
    if (piece?.type === "p" && ((myColor === "white" && to[1] === "8") || (myColor === "black" && to[1] === "1"))) uci += "q";
    const ng = new Chess(); ng.loadPgn(game.pgn());
    const mv = ng.move({ from, to, promotion: "q" });
    if (!mv) return false;
    setGame(ng); setFen(ng.fen()); setLastMove({ from, to });
    setSelectedSq(null); setLegalTargets([]);
    sendMove(uci);
    return true;
  }, [game, myColor, sendMove]);

  const onSquareClick = useCallback(({ square }: SquareHandlerArgs) => {
    if (!isMyTurn()) return;
    const sq = square as Square;
    const piece = game.get(sq);
    const myChar = myColor === "white" ? "w" : "b";
    if (selectedSq) {
      if (legalTargets.includes(square)) { executeMove(selectedSq as Square, sq); return; }
      if (piece?.color === myChar) {
        setSelectedSq(square); setLegalTargets(game.moves({ square: sq, verbose: true }).map(m => m.to)); return;
      }
      setSelectedSq(null); setLegalTargets([]); return;
    }
    if (piece?.color === myChar) {
      setSelectedSq(square); setLegalTargets(game.moves({ square: sq, verbose: true }).map(m => m.to));
    }
  }, [isMyTurn, selectedSq, legalTargets, game, myColor, executeMove]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (!isMyTurn() || !sourceSquare || !targetSquare) return false;
    const from = sourceSquare as Square, to = targetSquare as Square;
    const piece = game.get(from);
    if (!piece || piece.color !== (myColor === "white" ? "w" : "b")) return false;
    return executeMove(from, to);
  }, [isMyTurn, game, myColor, executeMove]);

  // ── Move navigation — uses ref so MoveList clicks are never stale ─────────
  const goToMove = useCallback((moveIdx: number) => {
    const moves = uciMovesRef.current;
    if (moveIdx < 0 || moves.length === 0) { setViewingMove(null); setViewFen(null); return; }
    if (moveIdx >= moves.length) { setViewingMove(null); setViewFen(null); return; }
    setViewingMove(moveIdx);
    setViewFen(fenAfterMoves(moves, moveIdx + 1));
    setSelectedSq(null); setLegalTargets([]);
  }, []); // stable — reads uciMovesRef

  const returnToLive = useCallback(() => {
    setViewingMove(null); setViewFen(null); setSelectedSq(null); setLegalTargets([]);
  }, []);

  // ── Game actions ──────────────────────────────────────────────────────────
  const lichessPost = useCallback((path: string) =>
    fetch(`${LICHESS}${path}`, { method:"POST", headers:{ Authorization:`Bearer ${token}` } }).catch(() => null)
  , [token]);
  const resign      = useCallback(() => { if (gameId) lichessPost(`/api/board/game/${gameId}/resign`); }, [gameId, lichessPost]);
  const abortGame   = useCallback(() => { if (gameId) lichessPost(`/api/board/game/${gameId}/abort`); }, [gameId, lichessPost]);
  const offerDraw   = useCallback(() => { if (gameId) lichessPost(`/api/board/game/${gameId}/draw/yes`).then(() => setDrawPending("iOffered")); }, [gameId, lichessPost]);
  const acceptDraw  = useCallback(() => { if (gameId) lichessPost(`/api/board/game/${gameId}/draw/yes`).then(() => setDrawPending("iOffered")); }, [gameId, lichessPost]);
  const declineDraw = useCallback(() => { if (gameId) lichessPost(`/api/board/game/${gameId}/draw/no`).then(() => setDrawPending("none")); }, [gameId, lichessPost]);

  // ── PGN + review ──────────────────────────────────────────────────────────
  const buildPgn = useCallback(() => {
    if (!sanMoves.length) return "";
    const tc = SEEK_TIME_CONTROLS[tcIdx];
    const chess = new Chess();
    for (const m of uciMoves) {
      try { chess.move({ from: m.slice(0,2) as Square, to: m.slice(2,4) as Square, promotion: m[4] as ("q"|"r"|"b"|"n"|undefined) }); }
      catch { break; }
    }
    chess.setHeader("White",       players.white?.name ?? "?");
    chess.setHeader("Black",       players.black?.name ?? "?");
    chess.setHeader("WhiteElo",    players.white?.rating != null ? String(players.white.rating) : "?");
    chess.setHeader("BlackElo",    players.black?.rating != null ? String(players.black.rating) : "?");
    chess.setHeader("Event",       rated === "rated" ? "Rated game" : "Casual game");
    chess.setHeader("TimeControl", `${tc.time * 60}+${tc.increment}`);
    chess.setHeader("Site",        `https://lichess.org/${gameId ?? ""}`);
    chess.setHeader("Date",        new Date().toISOString().split("T")[0]);
    if (result) chess.setHeader("Result", result.includes("White wins") ? "1-0" : result.includes("Black wins") ? "0-1" : "1/2-1/2");
    return chess.pgn();
  }, [sanMoves, uciMoves, tcIdx, players, rated, gameId, result]);

  const reviewGame = useCallback(() => {
    const pgn = finalPgn || buildPgn();
    if (!pgn) return;
    const tc = SEEK_TIME_CONTROLS[tcIdx];
    const info: Record<string,string> = {
      White: players.white?.name ?? "?", Black: players.black?.name ?? "?",
      WhiteElo: players.white?.rating != null ? String(players.white.rating) : "?",
      BlackElo: players.black?.rating != null ? String(players.black.rating) : "?",
      Event: rated === "rated" ? "Rated game" : "Casual game",
      Site: `https://lichess.org/${gameId ?? ""}`,
      Date: new Date().toISOString().split("T")[0],
      TimeControl: `${tc.time * 60}+${tc.increment}`,
      ...(result ? { Result: result.includes("White wins") ? "1-0" : result.includes("Black wins") ? "0-1" : "1/2-1/2" } : {}),
    };
    setReviewPgn(pgn); setReviewMoves(sanMoves); setReviewInfo(info);
    router.push("/game");
  }, [finalPgn, buildPgn, players, rated, gameId, result, tcIdx, sanMoves, setReviewPgn, setReviewMoves, setReviewInfo, router]);

  useEffect(() => {
    if (phase === "finished" && sanMoves.length > 0) setFinalPgn(buildPgn());
  }, [phase]); // eslint-disable-line

  const resetForNew = useCallback(() => {
    gameRef.current?.abort(); eventRef.current?.abort(); seekRef.current?.abort();
    setPhase("idle"); setGameId(null); setGame(new Chess()); setFen(new Chess().fen());
    setPlayers({ white: null, black: null }); setClock({ white: 0, black: 0 }); setActiveClock(null);
    setResult(""); setUciMoves([]); setSanMoves([]); setLastMove(null);
    setDrawPending("none"); setError(""); setConnected(false);
    setSelectedSq(null); setLegalTargets([]); setFinalPgn("");
    setViewingMove(null); setViewFen(null); setOppGone(false); setClaimInSecs(null);
  }, []);

  // ── Derived (stable — only recompute when inputs change) ──────────────────
  const oppSide  = myColor === "white" ? "black" : "white";
  const boardPx  = Math.min(boardSize, isMobile ? (typeof window !== "undefined" ? window.innerWidth - 32 : 380) : 600);
  const inReview = viewingMove !== null;

  // Memoize player props so PlayerRow only re-renders when needed
  const oppClockMs = myColor === "white" ? clock.black : clock.white;
  const myClockMs  = myColor === "white" ? clock.white : clock.black;
  const oppActive  = activeClock === oppSide && phase === "playing" && !inReview;
  const myActive   = activeClock === myColor && phase === "playing" && !inReview;

  // ─── Control panel (inline JSX, not a component — avoids stale re-definition)
  const controlPanelContent = (
    <Stack spacing={2.5} sx={{ pb: 2 }}>
      {/* Status row */}
      <Stack direction="row" spacing={1} alignItems="center">
        {connected ? <LiveIcon fontSize="small" color="success" /> : <DisconnectedIcon fontSize="small" color="disabled" />}
        <Typography variant="caption" color={connected ? "success.main" : "text.disabled"} sx={{ flex:1 }}>
          {connected ? "Live stream active" : "Not connected"}
        </Typography>
        {phase === "playing" && gameId && (
          <Chip label="LIVE" size="small" color="error" icon={<LiveIcon sx={{ fontSize:"14px !important" }} />} />
        )}
        <IconButton size="small" onClick={() => setSettingsOpen(p => !p)} color={settingsOpen ? "primary" : "default"}>
          <TuneIcon fontSize="small" />
        </IconButton>
      </Stack>

      <SettingsPanel open={settingsOpen} boardTheme={boardTheme} pieceType={pieceType}
        onSetTheme={setThemeSetting} onSetPiece={setPieceSetting} />

      {/* Lichess connection — available to ALL users (guests included) */}
      {!token && (
        <Alert severity="warning" sx={{ fontSize:"0.8rem" }}>
          <Stack spacing={1}>
            <span>Connect your Lichess account to play.</span>
            <Button size="small" variant="contained" color="warning" startIcon={
              connectLoading ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />
            } onClick={handleConnectLichess} disabled={connectLoading} sx={{ alignSelf:"flex-start", textTransform:"none" }}>
              {connectLoading ? "Redirecting to Lichess…" : "Connect Lichess Account"}
            </Button>
          </Stack>
        </Alert>
      )}

      {/* ── SEEK SETUP ── */}
      {(phase === "idle" || phase === "finished") && token && (
        <>
          {phase === "finished" && result && (
            <Alert severity={
              (result.includes("White wins") && myColor === "white") ||
              (result.includes("Black wins") && myColor === "black") ? "success" : "info"
            }>{result}</Alert>
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Time Control</InputLabel>
            <Select value={tcIdx} label="Time Control" onChange={e => setTcIdx(Number(e.target.value))}>
              {SEEK_TIME_CONTROLS.map((t, i) => <MenuItem key={i} value={i}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ fontSize:"0.75rem", py:0.5 }}>
            Seek pool: <strong>Rapid & Classical only</strong>. Bullet/Blitz require a direct challenge.
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
          <Button variant="contained" fullWidth size="large" startIcon={<PlayIcon />}
            onClick={seekGame} sx={{ borderRadius:2, fontWeight:700 }}>
            {phase === "finished" ? "New Game" : "Find Game on Lichess"}
          </Button>
          {phase === "finished" && finalPgn && (
            <Button variant="outlined" fullWidth startIcon={<ReviewIcon />} onClick={reviewGame}>Review This Game</Button>
          )}
          {phase === "finished" && (
            <Button variant="outlined" fullWidth startIcon={<RefreshIcon />} onClick={resetForNew}>Reset</Button>
          )}
        </>
      )}

      {/* ── SEEKING ── */}
      {phase === "seeking" && (
        <Card variant="outlined" sx={{ borderRadius:2 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center" py={1}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" textAlign="center">Looking for an opponent…</Typography>
              <Typography variant="caption" color="text.disabled">{SEEK_TIME_CONTROLS[tcIdx].label} · {rated}</Typography>
              <Button variant="outlined" color="error" size="small" onClick={cancelSeek}>Cancel</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── IN GAME ── */}
      {phase === "playing" && gameId && (
        <>
          <Divider />
          {drawPending === "theyOffered" && (
            <Alert severity="info" action={
              <Stack direction="row" spacing={0.5}>
                <Button size="small" color="success" onClick={acceptDraw}>Accept</Button>
                <Button size="small" color="error" onClick={declineDraw}>Decline</Button>
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
              <Button variant="outlined" color="warning" fullWidth onClick={abortGame} size="small">Abort Game</Button>
            )}
            <Button variant="outlined" color="secondary" fullWidth startIcon={<DrawIcon />}
              onClick={offerDraw} disabled={drawPending === "iOffered"} size="small">
              {drawPending === "iOffered" ? "Draw Offered…" : "Offer Draw"}
            </Button>
            <Button variant="contained" color="error" fullWidth startIcon={<ResignIcon />} onClick={resign} size="small">
              Resign
            </Button>
          </Stack>
          <Divider />
          <Button variant="text" size="small" fullWidth endIcon={<OpenIcon fontSize="small" />}
            href={`https://lichess.org/${gameId}`} target="_blank" rel="noopener noreferrer">
            Open on Lichess.org
          </Button>
        </>
      )}

      {/* Move list — stable external component, receives stable callbacks */}
      <MoveList
        sanMoves={sanMoves}
        uciMoves={uciMoves}
        viewingMove={viewingMove}
        onGoToMove={goToMove}
        onReturnToLive={returnToLive}
      />
    </Stack>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p:{ xs:1, sm:2, md:4 }, minHeight:"100vh" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3} flexWrap="wrap">
        <Box component="img" src="https://lichess1.org/assets/logo/lichess-favicon-32.png" alt="Lichess"
          sx={{ width:24, height:24 }} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
        <Typography variant="h5" fontWeight={700}>Play on Lichess</Typography>
        {username && (
          <Chip label={username} size="small" color="success" variant="outlined" clickable
            component="a" href={`https://lichess.org/@/${username}`} target="_blank" rel="noopener noreferrer" />
        )}
        {inReview && (
          <Chip label="Reviewing" size="small" color="warning" variant="outlined"
            onDelete={returnToLive} deleteIcon={<CloseIcon />} />
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError("")}>{error}</Alert>}

      <Stack direction={{ xs:"column", lg:"row" }} spacing={{ xs:2, md:3 }}>
        {/* ── Board ── */}
        <Box sx={{ flex:"0 0 auto", display:"flex", flexDirection:"column", alignItems:{ xs:"center", lg:"flex-start" } }}>
          <Box sx={{ width:boardPx, maxWidth:"100%", mb:1 }}>
            <PlayerRow side={oppSide} player={players[oppSide]} clockMs={oppClockMs} isActive={oppActive} phase={phase} />
          </Box>
          <Box sx={{
            width:boardPx, maxWidth:"100%", borderRadius:2, overflow:"hidden",
            boxShadow: phase === "playing" ? "0 0 0 3px #3a86ff44, 0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.12)",
            transition:"box-shadow 0.3s",
          }}>
            <Chessboard options={{
              position: displayFen,
              boardOrientation: myColor,
              onPieceDrop: onDrop,
              onSquareClick: onSquareClick,
              allowDragging: isMyTurn(),
              squareStyles: squareStyles,
              darkSquareStyle:  { backgroundColor: tc.darkSquareColor },
              lightSquareStyle: { backgroundColor: tc.lightSquareColor },
              pieces: customPieces,
              animationDurationInMs: animDuration,
              showNotation: showCoords,
              boardStyle: { width:boardPx, height:boardPx },
            }} />
          </Box>
          <Box sx={{ width:boardPx, maxWidth:"100%", mt:1 }}>
            <PlayerRow side={myColor} player={players[myColor]} clockMs={myClockMs} isActive={myActive} phase={phase} />
          </Box>
        </Box>

        {/* ── Desktop panel ── */}
        {!isMobile && (
          <Box sx={{ flex:1, minWidth:0 }}>
            <Card sx={{ borderRadius:3, boxShadow:"0 8px 32px rgba(138,43,226,0.08)",
              height:{ lg:"calc(100vh - 140px)" }, maxHeight:{ lg:"calc(100vh - 140px)" }, overflow:"auto" }}>
              <CardContent sx={{ p:3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {phase==="idle"&&"Game Setup"}{phase==="seeking"&&"Seeking…"}{phase==="playing"&&"In Game"}{phase==="finished"&&"Game Over"}
                </Typography>
                {controlPanelContent}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ── Mobile ── */}
        {isMobile && (
          <>
            <Fab color="primary" onClick={() => setDrawerOpen(true)} sx={{ position:"fixed", bottom:24, right:24, zIndex:1000 }}>
              <MenuIcon />
            </Fab>
            <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}
              sx={{ "& .MuiDrawer-paper": { height:"85vh", borderTopLeftRadius:16, borderTopRightRadius:16 } }}>
              <Box sx={{ p:2, borderBottom:1, borderColor:"divider", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <Typography variant="h6" fontWeight={600}>{phase==="playing"?"In Game":"Game Setup"}</Typography>
                <IconButton onClick={() => setDrawerOpen(false)} size="small"><CloseIcon /></IconButton>
              </Box>
              <Box sx={{ flex:1, overflowY:"auto", p:2 }}>{controlPanelContent}</Box>
            </Drawer>
          </>
        )}
      </Stack>
    </Box>
  );
}
