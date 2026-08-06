"use client";
import { usePageReady } from "@/hooks/usePageReady";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box, Button, Stack, Typography, Divider,
  Card, CardContent, Tab, Tabs, Drawer, Fab,
  useMediaQuery, useTheme,
  List, ListItemButton, ListItemText, ListItemIcon,
  IconButton, Tooltip, Chip, TextField, CircularProgress, Switch, FormControlLabel,
  LinearProgress,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Link as LinkIcon,
  UploadFile as UploadFileIcon,
  Bookmark as BookmarkIcon,
  ArrowRight as ArrowRightIcon,
  CheckCircle as ReadyIcon,
  HourglassEmpty as PendingIcon,
  DeleteOutline as DeleteIcon,
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Warning as WarningIcon,
  Flag,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import useAgine from "@/hooks/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import UserGameSelect from "@/componets/lichess/UserGameSelect";
import UserPGNUploader from "@/componets/game/UserPGNUpload";
import AnnotatedMoveList from "@/componets/tabs/AnonatedMoveList";
import ResizableChapterSelector from "@/componets/tabs/ChaptersTab";
import { extractMovesWithComments, extractGameInfo } from "@/libs/game/helper";
import { useGameTheme } from "@/hooks/useGameTheme";
import SaveGameReviewDialog, { SavedGameReview } from "@/componets/game/SaveGameReviewDialog";
import LoadStudy, { Chapter } from "@/componets/game/LoadStudy";
import LoadLichessGameUrl, { ParsedComment } from "@/componets/game/LoadLichessGameUrl";
import LoadPGNGame from "@/componets/game/LoadPGNGame";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import MultiGameNavigator from "@/componets/game/MultiGameNavigator";
import { ParsedPGN } from "@/libs/game/pgn";
import { useNets } from "@/hooks/useNets";
import { useGameStorage } from "@/hooks/useGameStorage";
import { useSessionStorage } from "usehooks-ts";
import {
  VariationTree, makeTree, movesToTree, addMove, findNode,
  treeToPGN, parseAnnotatedPGN,
  serializeTree, deserializeTree, isMainLine,
  setComment as setNodeComment,
} from "@/lib/variationTree";
import EvalGraph from "@/componets/tabs/EvalGraph";
import { MoveAnalysis } from "@/libs/agine/helper";
import { GameReviewTheme, ThemeScore, getThemeLabelColor } from "@/libs/themes/helper";
import { BarChart, LineChart, RadarChart } from "@mui/x-charts";
import { applyUciMove, buildMoveChain } from "@/lib/moveUtils";
import { collectAllFens, queueAllPositions, QueueAllResult } from "@/libs/chessdb/queueAll";
import { ChessDbApi } from "@jalpp/stockfishts";


// ── GameReviewRightPanel ──────────────────────────────────────────────────────

function GameReviewRightPanel({
  gameReview, currentMoveIndex, goToMove, gameInfo, gameReviewTheme,
}: {
  gameReview: MoveAnalysis[];
  currentMoveIndex: number;
  goToMove: (index: number) => void;
  gameInfo: Record<string, string>;
  gameReviewTheme: GameReviewTheme | null;
}) {
  const [themeTab, setThemeTab] = useState(0);

  const formatThemeName = (theme: string) =>
    theme.split(/(?=[A-Z])/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const getThemeColor = (value: number) =>
    value > 0 ? "success" : value < 0 ? "error" : ("default" as const);

  const renderBarChart = (scores: ThemeScore) => {
    const data = Object.entries(scores).map(([theme, score]) => ({
      theme: formatThemeName(theme),
      score,
    }));
    return (
      <BarChart
        xAxis={[{ dataKey: "theme", scaleType: "band", label: "Theme" }]}
        series={[{ dataKey: "score", label: "Score", color: "#bb86fc" }]}
        dataset={data}
        height={300}
        margin={{ left: 60, right: 20, bottom: 50 }}
        grid={{ horizontal: true }}
      />
    );
  };

  const renderMoveByMoveChart = (scores: ThemeScore[]) => {
    const fullMoveScores: ThemeScore[] = [];
    for (let i = 0; i < scores.length; i += 2) {
      if (i + 1 < scores.length) {
        const themes = Object.keys(scores[i]) as (keyof ThemeScore)[];
        const avgScore = {} as ThemeScore;
        themes.forEach((theme) => {
          avgScore[theme] = (scores[i][theme] + scores[i + 1][theme]) / 2;
        });
        fullMoveScores.push(avgScore);
      } else {
        fullMoveScores.push(scores[i]);
      }
    }
    const moveNumbers = fullMoveScores.map((_, i) => i + 1);
    const themes = Object.keys(fullMoveScores[0]);
    return (
      <LineChart
        xAxis={[{ data: moveNumbers, label: "Move Number" }]}
        series={themes.map((t) => ({
          data: fullMoveScores.map((s) => s[t as keyof ThemeScore]),
          label: formatThemeName(t),
          color: getThemeLabelColor(t as keyof ThemeScore),
        }))}
        height={300}
        margin={{ left: 60, right: 20, bottom: 50 }}
        grid={{ horizontal: true }}
      />
    );
  };

  const renderRadarComparison = (whiteScores: ThemeScore, blackScores: ThemeScore) => {
    const themes = Object.keys(whiteScores) as (keyof ThemeScore)[];
    const whiteData = themes.map((theme) => whiteScores[theme]);
    const blackData = themes.map((theme) => blackScores[theme]);
    const metrics = themes.map((theme, index) => {
      const maxVal = Math.max(whiteData[index], blackData[index]);
      const minVal = Math.min(whiteData[index], blackData[index]);
      const range = maxVal - minVal;
      const padding = range * 0.2;
      return {
        name: formatThemeName(theme),
        max: Math.ceil(maxVal + padding),
        min: Math.floor(minVal - padding),
      };
    });
    return (
      <RadarChart
        height={400}
        series={[
          { label: "White", data: whiteData, color: "#adeaf9ff", fillArea: true },
          { label: "Black", data: blackData, color: "#f4aff2ff", fillArea: true },
        ]}
        radar={{ metrics }}
      />
    );
  };

  const renderPlayerAnalysis = (
    analysis: GameReviewTheme["whiteAnalysis"] | GameReviewTheme["blackAnalysis"],
    bestTheme: string,
    worstTheme: string
  ) => (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip icon={<EmojiEvents />} label={`Best: ${formatThemeName(bestTheme)}`} color="success" />
        <Chip icon={<WarningIcon />} label={`Worst: ${formatThemeName(worstTheme)}`} color="error" />
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Theme Changes</Typography>
          {analysis.overallThemes.themeChanges.map((change, idx) => (
            <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2">{formatThemeName(change.theme)}</Typography>
              <Chip
                size="small"
                icon={change.change > 0 ? <TrendingUp /> : <TrendingDown />}
                label={`${change.change > 0 ? "+" : ""}${change.change.toFixed(2)} (${change.percentChange.toFixed(1)}%)`}
                color={getThemeColor(change.change)}
              />
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Average Theme Scores</Typography>
          {renderBarChart(analysis.averageThemeScores)}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Move-by-Move Theme Trends</Typography>
          {renderMoveByMoveChart(analysis.overallThemes.moveByMoveScores)}
        </CardContent>
      </Card>
    </Box>
  );

  // Show inline theme analysis
  return (
    <Box sx={{ pb: 2 }}>
      <Tabs
        value={themeTab}
        onChange={(_e, v) => setThemeTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Eval Graph" />
        {gameReviewTheme && <Tab label="Game Analysis" />}
        {gameReviewTheme && <Tab label="Game Insights" />}
      </Tabs>

      {themeTab === 0 && (
        <EvalGraph moves={gameReview} goToMove={goToMove} currentMoveIndex={currentMoveIndex} key={`rp-graph-theme-${gameReview.length}`} />
      )}

      {themeTab === 1 && gameReviewTheme && renderPlayerAnalysis(
        gameReviewTheme.whiteAnalysis,
        gameReviewTheme.insights.whiteBestTheme,
        gameReviewTheme.insights.whiteWorstTheme
      )}

      {themeTab === 2 && gameReviewTheme && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>White vs Black Theme Comparison</Typography>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                {renderRadarComparison(
                  gameReviewTheme.whiteAnalysis.averageThemeScores,
                  gameReviewTheme.blackAnalysis.averageThemeScores
                )}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Flag /> Turning Points
              </Typography>
              {gameReviewTheme.insights.turningPoints.map((tp, idx) => (
                <Box
                  key={idx}
                  sx={{
                    mb: 1.5, p: 2, borderRadius: 1, borderLeft: 4,
                    borderColor: tp.player === "White" ? "primary.main" : "secondary.main",
                  }}
                >
                  <Typography variant="body1" fontWeight="bold">Move {tp.moveNumber} • {tp.player}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}><strong>{tp.move}</strong></Typography>
                  <Chip size="small" label={tp.impact} sx={{ mt: 1 }} color={tp.impact.includes("+") ? "success" : "error"} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSAN(prevFen: string, nextFen: string): { san: string; uci: string } | null {
  try {
    const chess = new Chess(prevFen);
    for (const m of chess.moves({ verbose: true })) {
      const test = new Chess(prevFen);
      test.move(m);
      if (test.fen() === nextFen)
        return { san: m.san, uci: m.from + m.to + (m.promotion ?? "") };
    }
    return null;
  } catch { return null; }
}

function extractStartingFen(pgn: string): string | undefined {
  return pgn.match(/\[FEN "([^"]+)"\]/)?.[1];
}

// ── Left panel tab types ──────────────────────────────────────────────────────
type LeftTab = "load" | "analysis" | "save";

// ── Load section types ────────────────────────────────────────────────────────
type LoadSection = "history" | "pgn" | "lichess" | "mygames" | "studies" | null;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GamePage() {
  usePageReady();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Drawers (mobile only)
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Left panel state
  const [leftTab, setLeftTab] = useState<LeftTab>("load");
  const [showThemeView, setShowThemeView] = useState(true);
  const [loadSection, setLoadSection] = useState<LoadSection>("history");

  // Desktop inline-save state (title field + saving indicator)
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);

  // Game state
  const [pgnText, setPgnText] = useSessionStorage("agine_game_page_pgn", "");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [customPlayFen, setCustomPlayFen] = useState("");
  const [moves, setMoves] = useSessionStorage<string[]>("agine_game_moves", []);
  const [parsedMovesWithComments, setParsedMovesWithComments] =
    useSessionStorage<ParsedComment[]>("agine_parsed_comments", []);
  const [currentMoveIndex, setCurrentMoveIndex] = useSessionStorage("agine_game_current_move", 0);
  const [chapters, setChapters] = useSessionStorage<Chapter[]>("agine_chapters", []);
  const [comment, setComment] = useSessionStorage("agine_comment", "");
  const [clock, setClock] = useSessionStorage("agine_move_clock", "");
  const [gameInfo, setGameInfo] = useSessionStorage<Record<string, string>>("agine_game_info", {});
  const [multiGameList, setMultiGameList] = useState<ParsedPGN[]>([]);
  const [currentGameHash, setCurrentGameHash] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Auto-analysis mode: when false, engine/neural-net analysis is NOT triggered
  // automatically on position changes. User must request it manually.
  const [autoAnalysis, setAutoAnalysis] = useState(false);

  // Stable id — generated once per loaded game, used for all re-saves
  const [currentSaveId, setCurrentSaveId] = useSessionStorage("agine_current_save_id", "");

  // Game storage hook
  const { games: savedGames, loading: savedGamesLoading, saveGame, deleteGame } = useGameStorage();

  // Ref to suppress the moves-sync useEffect when tree is already set by loadFromHistory
  const skipMovesSync = useRef(false);

  // Variation tree
  const [tree, setTree] = useState<VariationTree>(() => makeTree());
  const [prevFen, setPrevFen] = useState(new Chess().fen());

  // "Queue all positions" — batch-queues every FEN in the loaded game
  // (main line + variations) for background ChessDB analysis.
  const chessDbApiRef = useRef<ChessDbApi | null>(null);
  const [queueAllRunning, setQueueAllRunning] = useState(false);
  const [queueAllProgress, setQueueAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [queueAllResult, setQueueAllResult] = useState<QueueAllResult | null>(null);

  // Engine / AI hooks
  const {
    stockfishAnalysisResult, setStockfishAnalysisResult,
    openingData, setOpeningData, llmLoading, stockfishLoading,
    lichessOpeningData, lichessOpeningLoading, openingLoading,
    moveSquares, engineDepth, setEngineDepth, engineLines, setEngineLines,
    engine, gameReview, gameReviewProgress, setGameReview,
    generateGameReview, gameReviewLoading, fetchOpeningData, setMoveSquares,
    analyzeWithStockfish, formatEvaluation, formatPrincipalVariation,
    chessdbdata, loading, queueing, error, refetch, requestAnalysis,
    setRootCurrentMove, scores, themeScoreError, themeScoreLoading,
    pvResult, pvLoading, pvError, requestPv,
  } = useAgine(fen, "game", autoAnalysis);

  const {
    evaluations, sanEvaluations, isLoading: maiaIsLoading,
    Maiaerror: maiaError,
  } = useNets({ fen, gameReviewMode: !autoAnalysis });

  const [activeAnalysisTab, setActiveAnalysisTab] = useSessionStorage("agine_game_act_tab", 0);
  const { gameReviewTheme, setGameReviewTheme, analyzeGameTheme } = useGameTheme();

  // Derived: save allowed only when review is complete
  const reviewReady = !gameReviewLoading && gameReview.length > 0;

  // When a game is loaded, switch left panel to analysis
  useEffect(() => {
    if (moves.length > 0) setLeftTab("analysis");
  }, [moves]);

  // Tree sync when moves loaded externally (e.g. plain PGN paste, not loadFromHistory)
  useEffect(() => {
    if (skipMovesSync.current) {
      skipMovesSync.current = false;
      return;
    }
    if (moves.length > 0 && !tree.root.next) {
      const startFen = extractStartingFen(pgnText);
      const newTree = movesToTree(moves, startFen);
      setTree(newTree);
      setPrevFen(new Chess(startFen).fen());
    }
  }, [moves]); // eslint-disable-line

  // Load from saved game on mount (bot game redirect)
  useEffect(() => {
    const id = sessionStorage.getItem("loadGameId");
    if (id) {
      sessionStorage.removeItem("loadGameId");
      setTimeout(() => {
        const saved = savedGames.find(g => g.id === id);
        if (saved) loadFromHistory(saved);
      }, 100);
    }
  }, []); // eslint-disable-line

  // Board move → tree
  useEffect(() => {
    if (fen === prevFen) return;
    const result = getSAN(prevFen, fen);
    if (!result) { setPrevFen(fen); return; }
    const { san, uci } = result;
    const { newTree, newCursorId } = addMove(tree, tree.cursor, san, uci, fen);
    setTree({ ...newTree, cursor: newCursorId });
    setPrevFen(fen);
  }, [fen]); // eslint-disable-line

  // Navigate to tree node
  const handleNavigate = useCallback((nodeFen: string, nodeId: string) => {
    const node = findNode(tree.root, nodeId);
    const idx = node?.ply ?? 0;
    setGame(new Chess(nodeFen));
    setFen(nodeFen);
    setTree(prev => ({ ...prev, cursor: nodeId }));
    setPrevFen(nodeFen);
    setCurrentMoveIndex(idx);
    setRootCurrentMove(idx);
    // Prefer comment/clock embedded in the tree node (populated by
    // parseAnnotatedPGN from the original PGN annotations). Fall back to
    // the flat parsedMovesWithComments array for games loaded without a
    // full annotated PGN (e.g. plain move lists).
    const nodeComment = node?.comment || "";
    const nodeClk = nodeComment.match(/\[clk:([\d:]+(?:\.\d+)?)\]/)?.[1] || "";
    const cleanComment = nodeComment.replace(/\[clk:[^\]]*\]/g, "").trim();
    const fallbackComment = parsedMovesWithComments[idx - 1]?.comment || "";
    const fallbackClock   = parsedMovesWithComments[idx - 1]?.clock   || "";
    setComment(cleanComment || fallbackComment);
    setClock(nodeClk || fallbackClock);
    setStockfishAnalysisResult(null);
  }, [tree, parsedMovesWithComments, setRootCurrentMove, setStockfishAnalysisResult]);

  // Play a move suggested by Stockfish, ChessDB, or a neural net (clicking
  // one of those rows applies its move to the board as a new variation,
  // same as a drag/drop move).
  const handlePlayMove = useCallback((uci: string) => {
    const newFen = applyUciMove(fen, uci);
    if (!newFen) return;
    setGame(new Chess(newFen));
    setFen(newFen);
  }, [fen]);

  // Append a whole move sequence (e.g. clicking the 3rd move of a
  // Stockfish/ChessDB PV) onto the game as a chain of tree nodes from the
  // current position, in one step.
  const handlePlayMoveSequence = useCallback((uciMoves: string[]) => {
    const chain = buildMoveChain(fen, uciMoves);
    if (chain.length === 0) return;

    let currentTree = tree;
    let cursor = tree.cursor;
    for (const step of chain) {
      const result = addMove(currentTree, cursor, step.san, step.uci, step.fen);
      currentTree = result.newTree;
      cursor = result.newCursorId;
    }

    const finalNode = findNode(currentTree.root, cursor);
    const finalFen = chain[chain.length - 1].fen;
    setTree({ ...currentTree, cursor });
    setGame(new Chess(finalFen));
    setFen(finalFen);
    setPrevFen(finalFen);
    const idx = finalNode?.ply ?? 0;
    setCurrentMoveIndex(idx);
    setRootCurrentMove(idx);
    setComment("");
    setClock("");
    setStockfishAnalysisResult(null);
  }, [fen, tree, setRootCurrentMove, setStockfishAnalysisResult]);

  // Queue every position in the loaded game (main line + variations) for
  // background ChessDB analysis in one click.
  const handleQueueAllPositions = useCallback(async () => {
    if (queueAllRunning) return;
    const fens = collectAllFens(tree.root);
    if (fens.length === 0) return;
    if (!chessDbApiRef.current) chessDbApiRef.current = new ChessDbApi();
    const api = chessDbApiRef.current;
    setQueueAllRunning(true);
    setQueueAllResult(null);
    setQueueAllProgress({ done: 0, total: fens.length });
    try {
      const result = await queueAllPositions(
        fens,
        (fenToQueue) => api.queue(fenToQueue),
        (done, total) => setQueueAllProgress({ done, total }),
      );
      setQueueAllResult(result);
    } finally {
      setQueueAllRunning(false);
    }
  }, [tree, queueAllRunning]);

  const handleTreePrevious = useCallback(() => {
    const cur = findNode(tree.root, tree.cursor);
    if (!cur?.parent) return;
    handleNavigate(cur.parent.fen, cur.parent.id);
  }, [tree, handleNavigate]);

  const handleTreeNext = useCallback(() => {
    const cur = findNode(tree.root, tree.cursor);
    if (!cur?.next) return;
    handleNavigate(cur.next.fen, cur.next.id);
  }, [tree, handleNavigate]);

  const handleTreeStart = useCallback(() => {
    handleNavigate(tree.root.fen, tree.root.id);
  }, [tree, handleNavigate]);

  const handleTreeEnd = useCallback(() => {
    let node = findNode(tree.root, tree.cursor) ?? tree.root;
    while (node.next) node = node.next;
    handleNavigate(node.fen, node.id);
  }, [tree, handleNavigate]);

  // Appends chat discussion about the currently selected move onto that
  // move's PGN comment, so it round-trips through export/save like any
  // other annotation (see AnalysisChatPanel's "Add to notation" action).
  const annotateFromChat = useCallback((text: string) => {
    setTree(prev => {
      const node = findNode(prev.root, prev.cursor);
      const existing = node?.comment?.trim();
      const merged = existing ? `${existing}\n\n${text}` : text;
      // The "current move" comment box (GameInfoTab) is a separate piece
      // of state that's normally only refreshed by handleNavigate/goToMove
      // when a move is clicked — without this it stays showing the old
      // text until the user clicks away and back, making the annotation
      // look like it didn't take even though the tree node updated fine.
      setComment(merged);
      return setNodeComment(prev, prev.cursor, merged);
    });
  }, [setComment]);

  const treePly = useMemo(() => findNode(tree.root, tree.cursor)?.ply ?? 0, [tree]);
  // True when the cursor is inside a variation (not on the main line).
  // Used to suppress game-review arrows which only apply to the main line.
  const isInVariation = useMemo(() => !isMainLine(tree.root, tree.cursor), [tree]);
  const treeMaxPly = useMemo(() => {
    let n = tree.root; let d = 0;
    while (n.next) { n = n.next; d++; }
    return d;
  }, [tree]);

  // Arrow keys
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleTreePrevious();
      if (e.key === "ArrowRight") handleTreeNext();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleTreePrevious, handleTreeNext]);

  // PGN helpers

  /**
   * Strip ALL nested variations from a PGN movetext string.
   * A simple regex like /\([^)]*\)/g only removes one level of nesting;
   * this handles arbitrary depth (e.g. nested annotations from Dojo/chess.com).
   */
  const stripVariations = (text: string): string => {
    let result = "";
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "(") { depth++; continue; }
      if (ch === ")") { if (depth > 0) depth--; continue; }
      if (depth === 0) result += ch;
    }
    return result;
  };

  const cleanPGN = (raw: string): string => {
    const lines = raw.split("\n");
    const headers: string[] = [];
    const moveLines: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("[") && t.endsWith("]")) headers.push(t);
      else if (t && !t.startsWith("[")) moveLines.push(t);
    }
    const movesText = stripVariations(
      moveLines.join(" ").replace(/\{[^}]*\}/g, "")
    ).replace(/\s+/g, " ").trim();
    return headers.length ? headers.join("\n") + "\n\n" + movesText : movesText;
  };

  const parsePGNMoves = (raw: string, startFen?: string): string[] => {
    const cleaned = cleanPGN(raw);
    const tempGame = new Chess(startFen);
    const body = cleaned.split("\n").filter(l => !l.trim().startsWith("[")).join(" ").trim();
    if (startFen && body) {
      const moveText = stripVariations(
        body.replace(/\{[^}]*\}/g, "")
      ).replace(/\d+\.+/g, "").replace(/\$\d+/g, "")
        .replace(/[!?]+/g, "")
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "").replace(/\s+/g, " ").trim();
      for (const mv of moveText.split(/\s+/).filter(m => m.length > 0)) {
        try { tempGame.move(mv); } catch { throw new Error(`Invalid move: ${mv}`); }
      }
    } else if (!startFen && body) {
      // chess.js loadPgn handles variations and comments natively, but strip
      // unknown [%tag] annotations inside comments that can trip its parser.
      const sanitised = body.replace(/\[%[^\]]*\]/g, "");
      tempGame.loadPgn(sanitised);
    }
    return tempGame.history();
  };

  const initializeGameState = (pgn: string, startFen?: string, moveList?: string[]) => {
    const parsed = extractMovesWithComments(pgn);
    const info = extractGameInfo(pgn);
    const ml = moveList || [];
    setCurrentSaveId(Date.now().toString());
    setSaveTitle("");
    setSavedConfirm(false);
    setMoves(ml);
    setParsedMovesWithComments(parsed);
    setGameInfo(info);
    setCurrentMoveIndex(0);
    const resetGame = new Chess(startFen);
    setGame(resetGame);
    setFen(resetGame.fen());
    setComment("");
    setClock("");
    setGameReview([]);
    // Build the tree from the full annotated PGN so that comments,
    // NAGs, clock annotations and variations from Lichess/chess.com/Dojo
    // are all preserved. Fall back to flat movesToTree if parsing fails.
    let builtTree;
    try {
      builtTree = pgn.trim() ? parseAnnotatedPGN(pgn, startFen) : movesToTree(ml, startFen);
    } catch {
      builtTree = movesToTree(ml, startFen);
    }
    setTree(builtTree);
    setPrevFen(resetGame.fen());
  };

  const loadPGN = () => {
    try {
      const startFen = extractStartingFen(cleanPGN(pgnText));
      const moveList = parsePGNMoves(pgnText, startFen);
      initializeGameState(pgnText, startFen, moveList);
      if (autoAnalysis) {
        generateGameReview(moveList, startFen);
        analyzeGameTheme(pgnText, startFen);
      }
    } catch (err) {
      alert(`Invalid PGN: ${err instanceof Error ? err.message : err}`);
    }
  };

  const loadUserPGN = (pgn: string, gameHash?: string) => {
    try {
      setPgnText(pgn);
      const startFen = extractStartingFen(cleanPGN(pgn));
      const moveList = parsePGNMoves(pgn, startFen);
      initializeGameState(pgn, startFen, moveList);
      if (gameHash) setCurrentGameHash(gameHash);
      if (autoAnalysis) {
        generateGameReview(moveList, startFen);
        analyzeGameTheme(pgn, startFen);
      }
    } catch (err) {
      alert(`Invalid PGN: ${err instanceof Error ? err.message : err}`);
    }
  };

  const loadFromHistory = (saved: SavedGameReview) => {
    try {
      const cleaned = cleanPGN(saved.pgn);
      const startFen = extractStartingFen(cleaned);
      setCurrentSaveId(saved.id);
      setSaveTitle(saved.title || "");
      setSavedConfirm(false);
      setPgnText(cleaned);
      skipMovesSync.current = true;
      setMoves(saved.moves);
      setGameInfo(saved.gameInfo);
      setGameReview(saved.gameReview);
      setGameReviewTheme(saved.gameReviewTheme ?? null);
      setParsedMovesWithComments(extractMovesWithComments(saved.pgn));
      setCurrentMoveIndex(0);
      const resetGame = new Chess(startFen);
      setGame(resetGame);
      setFen(resetGame.fen());
      setCustomPlayFen(startFen || resetGame.fen());
      setComment("");
      setClock("");
      const restoredTree = saved.treeData
        ? deserializeTree(saved.treeData)
        : saved.annotatedPgn
        ? parseAnnotatedPGN(saved.annotatedPgn, startFen)
        : movesToTree(saved.moves, startFen);
      setTree(restoredTree);
      setPrevFen(resetGame.fen());
      setHistoryDialogOpen(false);
      setLeftTab("analysis");
    } catch {
      alert("Error loading saved game");
    }
  };

  const goToMove = (index: number) => {
    const startFen = extractStartingFen(pgnText);
    const tempGame = new Chess(startFen);
    for (let i = 0; i < index; i++) tempGame.move(moves[i]);
    setGame(tempGame);
    setFen(tempGame.fen());
    setCurrentMoveIndex(index);
    setRootCurrentMove(index);
    setComment(parsedMovesWithComments[index - 1]?.comment || "");
    setClock(parsedMovesWithComments[index - 1]?.clock || "");
    setStockfishAnalysisResult(null);
    setPrevFen(tempGame.fen());
    let node = tree.root;
    for (let i = 0; i < index; i++) {
      if (node.next) node = node.next; else break;
    }
    setTree(prev => ({ ...prev, cursor: node.id }));
  };

  const handleMultiGameSelect = (g: ParsedPGN) => loadUserPGN(g.pgn, g.hash);

  const resetAll = () => {
    setMoves([]); setPgnText(""); setGameInfo({}); setComment(""); setClock("");
    setMultiGameList([]); setGameReview([]); setCurrentGameHash(""); setCurrentSaveId("");
    setSaveTitle(""); setSavedConfirm(false);
    setTree(makeTree());
    const reset = new Chess();
    setGame(reset); setFen(reset.fen()); setPrevFen(reset.fen());
    setLeftTab("load");
  };

  const annotatedPgn = useMemo(() => treeToPGN(tree, gameInfo), [tree, gameInfo]);
  const treeData = useMemo(() => serializeTree(tree), [tree]);

  // ── Shared save logic — used by both desktop inline and mobile dialog ──────
  const generateGameTitle = () => {
    const white = gameInfo.White || "Unknown";
    const black = gameInfo.Black || "Unknown";
    const date = gameInfo.Date || new Date().toLocaleDateString();
    return `${white} vs ${black} - ${date}`;
  };

  const handleSave = async (titleOverride?: string) => {
    if (!reviewReady) return;
    setSaving(true);
    const gameTitle = (titleOverride ?? saveTitle).trim() || generateGameTitle();
    const savedGame: SavedGameReview = {
      id: currentSaveId || Date.now().toString(),
      gameInfo,
      pgn: pgnText,
      treeData,
      annotatedPgn,
      gameReview,
      moves,
      gameReviewTheme,
      savedAt: new Date().toISOString(),
      title: gameTitle,
    };
    try {
      await saveGame(savedGame);
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 3000);
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Load panel ────────────────────────────────────────────────────────────
  const loadMenuItems: { id: LoadSection; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: "history", icon: <HistoryIcon sx={{ fontSize: 16 }} />, label: "Saved Games", count: savedGames.length },
    { id: "pgn",     icon: <UploadFileIcon sx={{ fontSize: 16 }} />, label: "Paste PGN" },
    { id: "lichess", icon: <LinkIcon sx={{ fontSize: 16 }} />, label: "Lichess URL" },
    { id: "mygames", icon: <BookmarkIcon sx={{ fontSize: 16 }} />, label: "My Lichess Games" },
    { id: "studies", icon: <AnalyticsIcon sx={{ fontSize: 16 }} />, label: "Studies" },
  ];

  const loadPanel = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <List dense disablePadding sx={{ flexShrink: 0 }}>
        {loadMenuItems.map(item => (
          <ListItemButton
            key={item.id}
            selected={loadSection === item.id}
            onClick={() => setLoadSection(loadSection === item.id ? null : item.id)}
            sx={{
              py: 0.75, px: 1.5, borderRadius: 1, mx: 0.5,
              "&.Mui-selected": { bgcolor: "action.selected", "&:hover": { bgcolor: "action.hover" } },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: loadSection === item.id ? "primary.main" : "text.secondary" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: "13px", fontWeight: loadSection === item.id ? 600 : 400 } } }}
            />
            {item.count !== undefined && item.count > 0 && (
              <Chip label={item.count} size="small" sx={{ height: 18, fontSize: "10px", "& .MuiChip-label": { px: 0.75 } }} />
            )}
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ my: 0.5 }} />

      <Box sx={{
        flex: 1, overflowY: "auto", px: 1.5, py: 1,
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
      }}>
        {loadSection === "history" && (
          savedGamesLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4, gap: 1.5 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                Loading saved games…
              </Typography>
            </Box>
          ) : savedGames.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 1 }}>
              No saved games yet. Save a game review to see it here.
            </Typography>
          ) : (
            <List dense disablePadding>
              {savedGames.map(saved => (
                <ListItemButton
                  key={saved.id}
                  onClick={() => loadFromHistory(saved)}
                  sx={{ borderRadius: 1, mb: 0.5, border: "1px solid", borderColor: "divider", px: 1 }}
                >
                  <ListItemText
                    primary={saved.title || `${saved.gameInfo?.White ?? "?"} vs ${saved.gameInfo?.Black ?? "?"}`}
                    secondary={new Date(saved.savedAt).toLocaleDateString()}
                    slotProps={{
                      primary: { sx: { fontSize: "12px", fontWeight: 600, lineHeight: 1.3 } },
                      secondary: { sx: { fontSize: "10px" } },
                    }}
                  />
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteGame(saved.id); }}
                      sx={{ ml: 0.5, color: "text.disabled", "&:hover": { color: "error.main" } }}
                    >
                      <DeleteIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <ArrowRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </ListItemButton>
              ))}
            </List>
          )
        )}
        {loadSection === "pgn" && <LoadPGNGame pgnText={pgnText} setPgnText={setPgnText} loadPGN={loadPGN} setInputsVisible={() => {}} />}
        {loadSection === "lichess" && (
          <LoadLichessGameUrl
            setComment={setComment} setCurrentMoveIndex={setCurrentMoveIndex}
            setFen={setFen} setGame={setGame} setGameInfo={setGameInfo}
            setGameReview={setGameReview} setInputsVisible={() => {}}
            setMoves={setMoves} setParsedMovesWithComments={setParsedMovesWithComments}
            setPgnText={setPgnText} generateGameReview={generateGameReview}
            analyzeGameTheme={analyzeGameTheme} autoAnalysis={autoAnalysis}
          />
        )}
        {loadSection === "mygames" && (
          <Stack spacing={1}>
            <UserGameSelect loadPGN={loadUserPGN} />
            <UserPGNUploader loadPGN={pgn => loadUserPGN(pgn)} setMultiGameList={setMultiGameList} />
          </Stack>
        )}
        {loadSection === "studies" && <LoadStudy setChapters={setChapters} setInputsVisible={() => {}} />}
      </Box>
    </Box>
  );

  const analysisPanel = (
    <Box sx={{ height: "100%", overflowY: "auto", p: 1,
      "&::-webkit-scrollbar": { width: "4px" },
      "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
    }}>
      {moves.length > 0 ? (
        <Stack spacing={1.5}>
          {/* ── Auto-analysis mode toggle ───────────────────────────── */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1, borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={autoAnalysis}
                  onChange={(e) => setAutoAnalysis(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600 }}>
                  Auto-Analysis {autoAnalysis ? "ON" : "OFF"}
                </Typography>
              }
              sx={{ m: 0 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px", lineHeight: 1.4 }}>
              {autoAnalysis
                ? "Engines & neural nets run automatically on every position."
                : "Engines are paused. Use the button below to request analysis for the current position."}
            </Typography>
            { moves.length > 0 && gameReview.length === 0 && (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AnalyticsIcon sx={{ fontSize: 14 }} />}
                  disabled={gameReviewLoading}
                  onClick={() => {
                    const startFen = extractStartingFen(pgnText);
                    generateGameReview(moves, startFen);
                    analyzeGameTheme(pgnText, startFen);
                  }}
                  sx={{ textTransform: "none", fontSize: "11px", flex: 1 }}
                >
                  {gameReviewLoading ? "Analysing…" : "Run Game Review"}
                </Button>
              </Stack>
            )}
            {!autoAnalysis && gameReview.length > 0 && (
              <Typography variant="caption" sx={{ fontSize: "10px", color: "success.main" }}>
                ✓ Game review complete — navigate moves to see arrows.
              </Typography>
            )}
          </Box>
          <AgineAnalysisView
            activeAnalysisTab={activeAnalysisTab} setActiveAnalysisTab={setActiveAnalysisTab}
            isGameReviewMode={true} stockfishAnalysisResult={stockfishAnalysisResult}
            stockfishLoading={stockfishLoading}
            engineDepth={engineDepth} engineLines={engineLines}
            engine={engine} Maiaerror={maiaError} isLoading={maiaIsLoading}
            evaluations={evaluations}
            sanEvaluations={sanEvaluations}
            analyzeWithStockfish={analyzeWithStockfish}
            formatEvaluation={formatEvaluation} fen={fen}
            formatPrincipalVariation={formatPrincipalVariation}
            setEngineDepth={setEngineDepth} setEngineLines={setEngineLines}
            openingLoading={openingLoading} openingData={openingData}
            lichessOpeningData={lichessOpeningData} lichessOpeningLoading={lichessOpeningLoading}
            chessdbdata={chessdbdata} queueing={queueing} error={error}
            loading={loading} refetch={refetch}
            requestAnalysis={requestAnalysis} moves={moves}
            currentMoveIndex={currentMoveIndex} goToMove={goToMove}
            comment={comment} clock={clock} gameInfo={gameInfo}
            gameReviewTheme={gameReviewTheme} generateGameReview={generateGameReview}
            gameReviewLoading={gameReviewLoading} gameReviewProgress={gameReviewProgress}
            gameReview={gameReview} pgnText={pgnText}
            currentMove={moves[currentMoveIndex]} Customfen={customPlayFen}
            scores={scores} ThemeScoreerror={themeScoreError} ThemeScoreloading={themeScoreLoading}
            autoAnalysis={autoAnalysis}
            onPlayMove={handlePlayMove}
            onAppendMoves={handlePlayMoveSequence}
            onQueueAllPositions={handleQueueAllPositions}
            queueAllRunning={queueAllRunning}
            queueAllProgress={queueAllProgress}
            queueAllResult={queueAllResult}
            pvResult={pvResult}
            pvLoading={pvLoading}
            pvError={pvError}
            requestPv={requestPv}
            onInsertAnnotation={annotateFromChat}
          />
          {chapters.length > 0 && (
            <ResizableChapterSelector
              chapters={chapters}
              onChapterSelect={pgn => { setPgnText(pgn); setTimeout(() => loadPGN(), 0); }}
            />
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          Load a game to see analysis.
        </Typography>
      )}
    </Box>
  );

  // ── Desktop save panel — inline, no modal ────────────────────────────────
  const savePanel = (
    <Box sx={{ p: 1.5 }}>
      {moves.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          Load a game first to save it.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
            SAVE GAME REVIEW
          </Typography>

          {/* Review-ready status */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            {gameReviewLoading ? (
              <>
                <PendingIcon sx={{ fontSize: 14, color: "warning.main" }} />
                <Typography variant="body2" color="warning.main" sx={{ fontSize: 12 }}>
                  Review generating… wait before saving.
                </Typography>
              </>
            ) : reviewReady ? (
              <>
                <ReadyIcon sx={{ fontSize: 14, color: "success.main" }} />
                <Typography variant="body2" color="success.main" sx={{ fontSize: 12 }}>
                  Ready — {gameReview.length} moves analysed.
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                Load a game to generate a review, then save.
              </Typography>
            )}
          </Stack>

          {/* Title field */}
          <TextField
            label="Title"
            size="small"
            fullWidth
            value={saveTitle}
            onChange={e => { setSaveTitle(e.target.value); setSavedConfirm(false); }}
            placeholder={generateGameTitle()}
            disabled={!reviewReady || saving}
            slotProps={{ input: { sx: { fontSize: 13 } } }}
          />

          {/* Save button */}
          <Tooltip title={!reviewReady ? (gameReviewLoading ? "Wait for review to finish" : "Review not ready") : ""}>
            <span>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={() => handleSave()}
                fullWidth
                size="small"
                disabled={!reviewReady || saving}
                color={savedConfirm ? "success" : "primary"}
                sx={{ textTransform: "none" }}
              >
                {savedConfirm ? "Saved ✓" : saving ? "Saving…" : "Save Game Review"}
              </Button>
            </span>
          </Tooltip>

          <Divider />

          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
            START OVER
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={resetAll}
            fullWidth
            size="small"
            color="error"
            sx={{ textTransform: "none" }}
          >
            Load New Game
          </Button>
        </Stack>
      )}
    </Box>
  );

  // ── Board panel ───────────────────────────────────────────────────────────
  const boardPanel = (
    <AiChessboardPanel
      game={game} fen={fen}
      moveSquares={autoAnalysis ? moveSquares : {}} setMoveSquares={setMoveSquares}
      engine={engine} setFen={setFen} setGame={setGame}
      evaluations={autoAnalysis ? evaluations : {}}
      sanEvaluations={autoAnalysis ? sanEvaluations : {}}
      gameInfo={gameInfo}
      setOpeningData={setOpeningData}
      setStockfishAnalysisResult={setStockfishAnalysisResult}
      stockfishAnalysisResult={autoAnalysis ? stockfishAnalysisResult : null}
      fetchOpeningData={fetchOpeningData}
      analyzeWithStockfish={analyzeWithStockfish}
      llmLoading={llmLoading} stockfishLoading={autoAnalysis ? stockfishLoading : false}
      maiaLoading={autoAnalysis ? maiaIsLoading : false}
      openingLoading={openingLoading}
      reviewMove={isInVariation ? undefined : gameReview[currentMoveIndex]}
      gameReviewMode={true}
      autoAnalysis={autoAnalysis}
      onTreePrevious={handleTreePrevious} onTreeNext={handleTreeNext}
      onTreeStart={handleTreeStart} onTreeEnd={handleTreeEnd}
      hideBuiltInMoveList treePly={treePly} treeMaxPly={treeMaxPly}
    />
  );

  // ── Desktop: 3 equal columns ──────────────────────────────────────────────
  if (!isMobile) {
    return (
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        height: "100vh",
        overflow: "hidden",
      }}>
        {/* LEFT: Load | Analysis | Save tabs */}
        <Box sx={{ borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            {([
              { id: "load" as LeftTab, label: "Load Game" },
              { id: "analysis" as LeftTab, label: "Analysis" },
              { id: "save" as LeftTab, label: "Save" },
            ]).map(tab => (
              <Box key={tab.id} onClick={() => setLeftTab(tab.id)} sx={{
                flex: 1, py: 1, textAlign: "center", cursor: "pointer",
                fontSize: "12px", fontWeight: leftTab === tab.id ? 700 : 400,
                color: leftTab === tab.id ? "primary.main" : "text.secondary",
                borderBottom: 2, borderColor: leftTab === tab.id ? "primary.main" : "transparent",
                "&:hover": { bgcolor: "action.hover" }, userSelect: "none",
              }}>
                {tab.label}
              </Box>
            ))}
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" } }}>
            {leftTab === "load" && loadPanel}
            {leftTab === "analysis" && analysisPanel}
            {leftTab === "save" && savePanel}
          </Box>
        </Box>

        {/* CENTER: board */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRight: 1, borderColor: "divider" }}>
          {boardPanel}
        </Box>

        {/* RIGHT: move list + game review graph/stats */}
        <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <Box sx={{
            px: 2, py: 0.75, flexShrink: 0,
            borderBottom: 1, borderColor: "divider", bgcolor: "background.paper",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
              GAME REVIEW
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {/* Toggle theme analysis */}
              {gameReview.length > 0 && gameReviewTheme && (
                <Tooltip title={showThemeView ? "Show eval graph" : "Show theme analysis"}>
                  <IconButton size="small" onClick={() => setShowThemeView(v => !v)} sx={{ p: 0.4, color: showThemeView ? "primary.main" : "text.secondary" }}>
                    <AnalyticsIcon sx={{ fontSize: 14, opacity: showThemeView ? 1 : 0.5 }} />
                  </IconButton>
                </Tooltip>
              )}
              {moves.length > 0 && (
                <Tooltip title="Load new game">
                  <IconButton size="small" onClick={resetAll} sx={{ p: 0.4 }}>
                    <RefreshIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Move list — expands when panel is hidden */}
          <Box sx={{
            flex: showThemeView && gameReview.length > 0 ? "0 0 auto" : "1 1 auto",
            maxHeight: showThemeView && gameReview.length > 0 ? "35vh" : "100%",
            minHeight: 120,
            overflow: "hidden",
            borderBottom: showThemeView && gameReview.length > 0 ? 1 : 0,
            borderColor: "divider",
          }}>
            <AnnotatedMoveList tree={tree} onTreeChange={setTree} onNavigate={handleNavigate} gameResult={gameInfo.Result} gameReview={gameReview} />
          </Box>

          {/* Theme Analysis panel — only shown when toggled on and review ready */}
          {showThemeView && gameReview.length > 0 && !gameReviewLoading && (
            <Box sx={{
              flex: 1, overflowY: "auto", p: 1,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
            }}>
              <GameReviewRightPanel
                gameReview={gameReview}
                currentMoveIndex={currentMoveIndex}
                goToMove={goToMove}
                gameInfo={gameInfo}
                gameReviewTheme={gameReviewTheme}
              />
            </Box>
          )}

          {multiGameList.length > 1 && (
            <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider", p: 1 }}>
              <MultiGameNavigator games={multiGameList} currentGameHash={currentGameHash} onGameSelect={handleMultiGameSelect} />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", pb: moves.length > 0 ? 10 : 2 }}>
      {moves.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: "center" }}>
                Load a Game
              </Typography>
              <List dense disablePadding>
                {loadMenuItems.map(item => (
                  <ListItemButton
                    key={item.id}
                    selected={loadSection === item.id}
                    onClick={() => setLoadSection(loadSection === item.id ? null : item.id)}
                    sx={{ borderRadius: 1, mb: 0.5, border: 1, borderColor: "divider" }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 13 } } }} />
                    {item.count !== undefined && item.count > 0 && <Chip label={item.count} size="small" />}
                  </ListItemButton>
                ))}
              </List>
              <Divider sx={{ my: 1.5 }} />
              <Box>
                {loadSection === "history" && (
                  savedGamesLoading ? (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 1.5 }}>
                      <CircularProgress size={28} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                        Loading saved games…
                      </Typography>
                    </Box>
                  ) : savedGames.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>No saved games yet.</Typography>
                  ) : (
                    <List dense disablePadding>
                      {savedGames.map(saved => (
                        <ListItemButton key={saved.id} onClick={() => loadFromHistory(saved)} sx={{ borderRadius: 1, mb: 0.5, border: 1, borderColor: "divider" }}>
                          <ListItemText
                            primary={saved.title || `${saved.gameInfo?.White ?? "?"} vs ${saved.gameInfo?.Black ?? "?"}`}
                            secondary={new Date(saved.savedAt).toLocaleDateString()}
                            slotProps={{ primary: { sx: { fontSize: 12, fontWeight: 600 } }, secondary: { sx: { fontSize: 10 } } }}
                          />
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteGame(saved.id); }}
                              sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                            >
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </ListItemButton>
                      ))}
                    </List>
                  )
                )}
                {loadSection === "pgn" && <LoadPGNGame pgnText={pgnText} setPgnText={setPgnText} loadPGN={loadPGN} setInputsVisible={() => {}} />}
                {loadSection === "lichess" && <LoadLichessGameUrl setComment={setComment} setCurrentMoveIndex={setCurrentMoveIndex} setFen={setFen} setGame={setGame} setGameInfo={setGameInfo} setGameReview={setGameReview} setInputsVisible={() => {}} setMoves={setMoves} setParsedMovesWithComments={setParsedMovesWithComments} setPgnText={setPgnText} generateGameReview={generateGameReview} analyzeGameTheme={analyzeGameTheme} autoAnalysis={autoAnalysis} />}
                {loadSection === "mygames" && <Stack spacing={1}><UserGameSelect loadPGN={loadUserPGN} /><UserPGNUploader loadPGN={pgn => loadUserPGN(pgn)} setMultiGameList={setMultiGameList} /></Stack>}
                {loadSection === "studies" && <LoadStudy setChapters={setChapters} setInputsVisible={() => {}} />}
              </Box>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>{boardPanel}</Box>

          {multiGameList.length > 1 && (
            <MultiGameNavigator games={multiGameList} currentGameHash={currentGameHash} onGameSelect={handleMultiGameSelect} />
          )}

          {/* Move list inline below board — save icon opens modal on mobile */}
          <Box sx={{
            mt: 1.5, border: 1, borderColor: "divider", borderRadius: 1,
            overflow: "hidden", maxHeight: 280, display: "flex", flexDirection: "column",
          }}>
            <Box sx={{
              px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0, bgcolor: "background.paper",
            }}>
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
                MOVES
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title={!reviewReady ? (gameReviewLoading ? "Review generating…" : "Review not ready") : "Save game review"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => setSaveDialogOpen(true)}
                      disabled={!reviewReady}
                      sx={{ p: 0.4 }}
                    >
                      <SaveIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Load new game">
                  <IconButton size="small" onClick={resetAll} sx={{ p: 0.4 }}>
                    <RefreshIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <AnnotatedMoveList tree={tree} onTreeChange={setTree} onNavigate={handleNavigate} gameResult={gameInfo.Result} gameReview={gameReview} />
            </Box>
          </Box>
        </Box>
      )}

      {/* FAB: Analysis only (mobile) */}
      {moves.length > 0 && (
        <Fab color="primary" onClick={() => setAnalysisDrawerOpen(true)}
          sx={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
          <AnalyticsIcon />
        </Fab>
      )}

      {/* Analysis drawer (mobile) */}
      <Drawer anchor="bottom" open={analysisDrawerOpen} onClose={() => setAnalysisDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={600}>Analysis</Typography>
            <Button onClick={() => setAnalysisDrawerOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto" }}>{analysisPanel}</Box>
        </Box>
      </Drawer>

      {/* Save dialog — mobile only, triggered by save icon in move list header */}
      <SaveGameReviewDialog
        saveDialogOpen={saveDialogOpen}
        setSaveDialogOpen={setSaveDialogOpen}
        historyDialogOpen={historyDialogOpen}
        setHistoryDialogOpen={setHistoryDialogOpen}
        gameInfo={gameInfo}
        isBotGame={false}
        gameId={currentSaveId || Date.now().toString()}
        gameReviewTheme={gameReviewTheme!}
        gameReview={gameReview}
        gameReviewLoading={gameReviewLoading}
        moves={moves}
        pgnText={pgnText}
        annotatedPgn={annotatedPgn}
        treeData={treeData}
        loadFromHistory={loadFromHistory}
      />
    </Box>
  );
}