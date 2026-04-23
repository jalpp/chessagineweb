"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Button, Stack, Typography, Divider,
  Card, CardContent, Drawer, Fab,
  useMediaQuery, useTheme,
  List, ListItemButton, ListItemText, ListItemIcon,
  IconButton, Tooltip, Chip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  FormatListBulleted as MoveListIcon,
  History as HistoryIcon,
  Link as LinkIcon,
  UploadFile as UploadFileIcon,
  Bookmark as BookmarkIcon,
  ArrowRight as ArrowRightIcon,
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
import { useLocalStorage, useSessionStorage } from "usehooks-ts";
import {
  VariationTree, makeTree, movesToTree, addMove, findNode,
  treeToPGN, parseAnnotatedPGN,
} from "@/lib/variationTree";

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
type LeftTab = "load" | "analysis";

// ── Load section types ────────────────────────────────────────────────────────
type LoadSection = "history" | "pgn" | "lichess" | "mygames" | "studies" | null;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Drawers (mobile)
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);
  const [moveListDrawerOpen, setMoveListDrawerOpen] = useState(false);

  // Left panel state
  const [leftTab, setLeftTab] = useState<LeftTab>("load");
  const [loadSection, setLoadSection] = useState<LoadSection>("history");

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
  const [gameInfo, setGameInfo] = useSessionStorage<Record<string, string>>("agine_game_info", {});
  const [multiGameList, setMultiGameList] = useState<ParsedPGN[]>([]);
  const [currentGameHash, setCurrentGameHash] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Game storage hook (replaces useLocalStorage directly)
  const { games: savedGames } = useGameStorage();

  // Variation tree
  const [tree, setTree] = useState<VariationTree>(() => makeTree());
  const [prevFen, setPrevFen] = useState(new Chess().fen());

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
  } = useAgine(fen, "game");

  const {
    evaluations, sanEvaluations, isLoading: maiaIsLoading,
    Maiaerror: maiaError, lichessData, isInBook,
  } = useNets({ fen });

  const [activeAnalysisTab, setActiveAnalysisTab] = useSessionStorage("agine_game_act_tab", 0);
  const { gameReviewTheme, analyzeGameTheme } = useGameTheme();

  // When a game is loaded, switch left panel to analysis
  useEffect(() => {
    if (moves.length > 0) setLeftTab("analysis");
  }, [moves]);

  // Tree sync when moves loaded externally (LoadLichessGameUrl etc.)
  useEffect(() => {
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
    setComment(parsedMovesWithComments[idx - 1]?.comment || "");
    setStockfishAnalysisResult(null);
  }, [tree, parsedMovesWithComments, setRootCurrentMove, setStockfishAnalysisResult]);

  // Tree nav callbacks
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

  const treePly = useMemo(() => findNode(tree.root, tree.cursor)?.ply ?? 0, [tree]);
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
  const cleanPGN = (raw: string): string => {
    const lines = raw.split("\n");
    const headers: string[] = [];
    const moveLines: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("[") && t.endsWith("]")) headers.push(t);
      else if (t && !t.startsWith("[")) moveLines.push(t);
    }
    let movesText = moveLines.join(" ")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ").trim();
    return headers.length ? headers.join("\n") + "\n\n" + movesText : movesText;
  };

  const parsePGNMoves = (raw: string, startFen?: string): string[] => {
    const cleaned = cleanPGN(raw);
    const tempGame = new Chess(startFen);
    const body = cleaned.split("\n").filter(l => !l.trim().startsWith("[")).join(" ").trim();
    if (startFen && body) {
      const moveText = body
        .replace(/\d+\./g, "").replace(/\{[^}]*\}/g, "").replace(/\([^)]*\)/g, "")
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "").replace(/\s+/g, " ").trim();
      for (const mv of moveText.split(/\s+/).filter(m => m.length > 0)) {
        try { tempGame.move(mv); } catch { throw new Error(`Invalid move: ${mv}`); }
      }
    } else if (!startFen && body) {
      tempGame.loadPgn(body);
    }
    return tempGame.history();
  };

  const initializeGameState = (pgn: string, startFen?: string, moveList?: string[]) => {
    const parsed = extractMovesWithComments(pgn);
    const info = extractGameInfo(pgn);
    const ml = moveList || [];
    setMoves(ml);
    setParsedMovesWithComments(parsed);
    setGameInfo(info);
    setCurrentMoveIndex(0);
    const resetGame = new Chess(startFen);
    setGame(resetGame);
    setFen(resetGame.fen());
    setComment("");
    setGameReview([]);
    setTree(movesToTree(ml, startFen));
    setPrevFen(resetGame.fen());
  };

  const loadPGN = () => {
    try {
      const startFen = extractStartingFen(cleanPGN(pgnText));
      const moveList = parsePGNMoves(pgnText, startFen);
      initializeGameState(pgnText, startFen, moveList);
      generateGameReview(moveList, startFen);
      analyzeGameTheme(moveList, startFen);
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
      generateGameReview(moveList, startFen);
      analyzeGameTheme(moveList, startFen);
    } catch (err) {
      alert(`Invalid PGN: ${err instanceof Error ? err.message : err}`);
    }
  };

  const loadFromHistory = (saved: SavedGameReview) => {
    try {
      const cleaned = cleanPGN(saved.pgn);
      const startFen = extractStartingFen(cleaned);
      setPgnText(cleaned);
      setMoves(saved.moves);
      setGameInfo(saved.gameInfo);
      setGameReview(saved.gameReview);
      setParsedMovesWithComments(extractMovesWithComments(saved.pgn));
      setCurrentMoveIndex(0);
      const resetGame = new Chess(startFen);
      setGame(resetGame);
      setFen(resetGame.fen());
      setCustomPlayFen(startFen || resetGame.fen());
      setComment("");
      const restoredTree = saved.annotatedPgn
        ? parseAnnotatedPGN(saved.annotatedPgn, startFen)
        : movesToTree(saved.moves, startFen);
      setTree(restoredTree);
      setPrevFen(resetGame.fen());
      setHistoryDialogOpen(false);
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
    setMoves([]); setPgnText(""); setGameInfo({}); setComment("");
    setMultiGameList([]); setGameReview([]); setCurrentGameHash("");
    setTree(makeTree());
    const reset = new Chess();
    setGame(reset); setFen(reset.fen()); setPrevFen(reset.fen());
    setLeftTab("load");
  };

  const annotatedPgn = useMemo(() => treeToPGN(tree, gameInfo), [tree, gameInfo]);

  // ── Load panel sidebar ────────────────────────────────────────────────────
  const loadMenuItems: { id: LoadSection; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: "history", icon: <HistoryIcon sx={{ fontSize: 16 }} />, label: "Saved Games", count: savedGames.length },
    { id: "pgn",     icon: <UploadFileIcon sx={{ fontSize: 16 }} />, label: "Paste PGN" },
    { id: "lichess", icon: <LinkIcon sx={{ fontSize: 16 }} />, label: "Lichess URL" },
    { id: "mygames", icon: <BookmarkIcon sx={{ fontSize: 16 }} />, label: "My Lichess Games" },
    { id: "studies", icon: <AnalyticsIcon sx={{ fontSize: 16 }} />, label: "Studies" },
  ];

  const loadPanel = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Nav list */}
      <List dense disablePadding sx={{ flexShrink: 0 }}>
        {loadMenuItems.map(item => (
          <ListItemButton
            key={item.id}
            selected={loadSection === item.id}
            onClick={() => setLoadSection(loadSection === item.id ? null : item.id)}
            sx={{
              py: 0.75, px: 1.5, borderRadius: 1, mx: 0.5,
              "&.Mui-selected": {
                bgcolor: "action.selected",
                "&:hover": { bgcolor: "action.hover" },
              },
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

      {/* Section content */}
      <Box sx={{
        flex: 1, overflowY: "auto", px: 1.5, py: 1,
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
      }}>
        {loadSection === "history" && (
          savedGames.length === 0 ? (
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
                  <ArrowRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </ListItemButton>
              ))}
            </List>
          )
        )}

        {loadSection === "pgn" && (
          <LoadPGNGame
            pgnText={pgnText}
            setPgnText={setPgnText}
            loadPGN={loadPGN}
            setInputsVisible={() => {}}
          />
        )}

        {loadSection === "lichess" && (
          <LoadLichessGameUrl
            setComment={setComment}
            setCurrentMoveIndex={setCurrentMoveIndex}
            setFen={setFen}
            setGame={setGame}
            setGameInfo={setGameInfo}
            setGameReview={setGameReview}
            setInputsVisible={() => {}}
            setMoves={setMoves}
            setParsedMovesWithComments={setParsedMovesWithComments}
            setPgnText={setPgnText}
            generateGameReview={generateGameReview}
            analyzeGameTheme={analyzeGameTheme}
          />
        )}

        {loadSection === "mygames" && (
          <Stack spacing={1}>
            <UserGameSelect loadPGN={loadUserPGN} />
            <UserPGNUploader loadPGN={pgn => loadUserPGN(pgn)} setMultiGameList={setMultiGameList} />
          </Stack>
        )}

        {loadSection === "studies" && (
          <LoadStudy setChapters={setChapters} setInputsVisible={() => {}} />
        )}
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
          <AgineAnalysisView
            activeAnalysisTab={activeAnalysisTab}
            setActiveAnalysisTab={setActiveAnalysisTab}
            isGameReviewMode={true}
            stockfishAnalysisResult={stockfishAnalysisResult}
            stockfishLoading={stockfishLoading}
            engineDepth={engineDepth} engineLines={engineLines} engine={engine}
            Maiaerror={maiaError} isLoading={maiaIsLoading} evaluations={evaluations}
            analyzeWithStockfish={analyzeWithStockfish}
            formatEvaluation={formatEvaluation} fen={fen}
            formatPrincipalVariation={formatPrincipalVariation}
            setEngineDepth={setEngineDepth} setEngineLines={setEngineLines}
            openingLoading={openingLoading} openingData={openingData}
            lichessOpeningData={lichessOpeningData} lichessOpeningLoading={lichessOpeningLoading}
            chessdbdata={chessdbdata} queueing={queueing} error={error}
            lichessData={lichessData} loading={loading} refetch={refetch}
            requestAnalysis={requestAnalysis} moves={moves}
            currentMoveIndex={currentMoveIndex} goToMove={goToMove}
            comment={comment} gameInfo={gameInfo}
            gameReviewTheme={gameReviewTheme} generateGameReview={generateGameReview}
            gameReviewLoading={gameReviewLoading} gameReviewProgress={gameReviewProgress}
            gameReview={gameReview} pgnText={pgnText}
            currentMove={moves[currentMoveIndex]} Customfen={customPlayFen}
            sanEvaluations={sanEvaluations} isInBook={isInBook}
            scores={scores} ThemeScoreerror={themeScoreError} ThemeScoreloading={themeScoreLoading}
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

  // ── Move list + right panel ───────────────────────────────────────────────
  const moveListPanel = (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      overflow: "hidden",
    }}>
      {/* Header with save/reset */}
      <Box sx={{
        px: 1.5, py: 0.75,
        borderBottom: 1, borderColor: "divider",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, bgcolor: "background.paper",
      }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
          MOVES
        </Typography>
        {moves.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Save game review">
              <span>
                <IconButton size="small" onClick={() => setSaveDialogOpen(true)} disabled={!gameReview.length} sx={{ p: 0.4 }}>
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
        )}
      </Box>
      {/* Move tree */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <AnnotatedMoveList
          tree={tree}
          onTreeChange={setTree}
          onNavigate={handleNavigate}
          gameResult={gameInfo.Result}
        />
      </Box>
      {multiGameList.length > 1 && (
        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider", p: 0.75 }}>
          <MultiGameNavigator games={multiGameList} currentGameHash={currentGameHash} onGameSelect={handleMultiGameSelect} />
        </Box>
      )}
    </Box>
  );

  // ── Board panel ───────────────────────────────────────────────────────────
  const boardPanel = (
    <AiChessboardPanel
      game={game} fen={fen}
      moveSquares={moveSquares} setMoveSquares={setMoveSquares}
      engine={engine} setFen={setFen} setGame={setGame}
      evaluations={evaluations} gameInfo={gameInfo}
      setOpeningData={setOpeningData}
      setStockfishAnalysisResult={setStockfishAnalysisResult}
      stockfishAnalysisResult={stockfishAnalysisResult}
      fetchOpeningData={fetchOpeningData}
      analyzeWithStockfish={analyzeWithStockfish}
      llmLoading={llmLoading} stockfishLoading={stockfishLoading}
      openingLoading={openingLoading}
      reviewMove={gameReview[currentMoveIndex]}
      gameReviewMode={true}
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
        height: "calc(100vh - 56px)",
        overflow: "hidden",
      }}>
        {/* LEFT: load controls + analysis */}
        <Box sx={{
          borderRight: 1, borderColor: "divider",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <Box sx={{ display: "flex", flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            {([
              { id: "load" as LeftTab, label: "Load Game" },
              { id: "analysis" as LeftTab, label: "Analysis" },
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
            {leftTab === "load" ? loadPanel : analysisPanel}
          </Box>
        </Box>

        {/* CENTER: board */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", borderRight: 1, borderColor: "divider",
        }}>
          {boardPanel}
        </Box>

        {/* RIGHT: move list */}
        <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{
            px: 2, py: 0.75, flexShrink: 0,
            borderBottom: 1, borderColor: "divider", bgcolor: "background.paper",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
              MOVES
            </Typography>
            {moves.length > 0 && (
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Save game review">
                  <span>
                    <IconButton size="small" onClick={() => setSaveDialogOpen(true)} disabled={!gameReview.length} sx={{ p: 0.4 }}>
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
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <AnnotatedMoveList tree={tree} onTreeChange={setTree} onNavigate={handleNavigate} gameResult={gameInfo.Result} />
          </Box>
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
    <Box sx={{ minHeight: "100vh", pb: 10 }}>
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
                    {item.count !== undefined && item.count > 0 && (
                      <Chip label={item.count} size="small" />
                    )}
                  </ListItemButton>
                ))}
              </List>
              <Divider sx={{ my: 1.5 }} />
              <Box>
                {loadSection === "history" && savedGames.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>No saved games yet.</Typography>
                )}
                {loadSection === "history" && savedGames.length > 0 && (
                  <List dense disablePadding>
                    {savedGames.map(saved => (
                      <ListItemButton key={saved.id} onClick={() => loadFromHistory(saved)} sx={{ borderRadius: 1, mb: 0.5, border: 1, borderColor: "divider" }}>
                        <ListItemText
                          primary={saved.title || `${saved.gameInfo?.White ?? "?"} vs ${saved.gameInfo?.Black ?? "?"}`}
                          secondary={new Date(saved.savedAt).toLocaleDateString()}
                          slotProps={{ primary: { sx: { fontSize: 12, fontWeight: 600 } }, secondary: { sx: { fontSize: 10 } } }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
                {loadSection === "pgn" && <LoadPGNGame pgnText={pgnText} setPgnText={setPgnText} loadPGN={loadPGN} setInputsVisible={() => {}} />}
                {loadSection === "lichess" && <LoadLichessGameUrl setComment={setComment} setCurrentMoveIndex={setCurrentMoveIndex} setFen={setFen} setGame={setGame} setGameInfo={setGameInfo} setGameReview={setGameReview} setInputsVisible={() => {}} setMoves={setMoves} setParsedMovesWithComments={setParsedMovesWithComments} setPgnText={setPgnText} generateGameReview={generateGameReview} analyzeGameTheme={analyzeGameTheme} />}
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
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" onClick={() => setSaveDialogOpen(true)} startIcon={<SaveIcon />}
              disabled={!gameReview.length} fullWidth size="small" sx={{ textTransform: "none" }}>
              Save
            </Button>
            <Button variant="outlined" onClick={resetAll} startIcon={<RefreshIcon />}
              fullWidth size="small" sx={{ textTransform: "none" }}>
              New Game
            </Button>
          </Stack>
        </Box>
      )}

      {moves.length > 0 && (
        <>
          <Fab color="primary" onClick={() => setAnalysisDrawerOpen(true)}
            sx={{ position: "fixed", bottom: 84, right: 20, zIndex: 1000 }}>
            <AnalyticsIcon />
          </Fab>
          <Fab color="secondary" onClick={() => setMoveListDrawerOpen(true)}
            sx={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
            <MoveListIcon />
          </Fab>
        </>
      )}

      {/* Analysis drawer */}
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

      {/* Move list drawer */}
      <Drawer anchor="bottom" open={moveListDrawerOpen} onClose={() => setMoveListDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { height: "75vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={600}>Moves</Typography>
            <Button onClick={() => setMoveListDrawerOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <AnnotatedMoveList
              tree={tree} onTreeChange={setTree}
              onNavigate={(f, id) => { handleNavigate(f, id); setMoveListDrawerOpen(false); }}
              gameResult={gameInfo.Result}
            />
          </Box>
        </Box>
      </Drawer>

      <SaveGameReviewDialog
        saveDialogOpen={saveDialogOpen} setSaveDialogOpen={setSaveDialogOpen}
        historyDialogOpen={historyDialogOpen} setHistoryDialogOpen={setHistoryDialogOpen}
        gameInfo={gameInfo} isBotGame={false}
        gameReviewTheme={gameReviewTheme!}
        gameReview={gameReview} moves={moves}
        pgnText={pgnText} annotatedPgn={annotatedPgn}
        loadFromHistory={loadFromHistory}
      />
    </Box>
  );
}