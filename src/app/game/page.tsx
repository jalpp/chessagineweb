"use client";

/**
 * Game Analysis Page — Three-panel layout (mirroring position page).
 *
 *  ┌──────────────────┬──────────────────┬──────────────────┐
 *  │  AI Analysis     │   Chessboard     │  Move List       │
 *  │  (left panel)    │   (center)       │  (right panel)   │
 *  │                  │                  │  – variation     │
 *  │  Stockfish       │  react-chess-    │    tree support  │
 *  │  Game review     │  board           │  – annotations   │
 *  │  Opening exp.    │                  │  – NAG symbols   │
 *  └──────────────────┴──────────────────┴──────────────────┘
 *
 * Key change: The old flat PGNView is replaced by AnnotatedMoveList,
 * which supports full branching variations and inline comments/NAGs.
 * When a PGN is loaded, its main-line moves are hydrated into the
 * VariationTree so existing annotations are preserved.
 * The board still drives move navigation — clicking a node in the
 * move list navigates the board.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Divider,
  Card,
  CardContent,
  Drawer,
  Fab,
  useMediaQuery,
  useTheme,
  Paper,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  FormatListBulleted as MoveListIcon,
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
import SaveGameReviewDialog, {
  SavedGameReview,
} from "@/componets/game/SaveGameReviewDialog";
import GamereviewHistory from "@/componets/game/GameReviewHistory";
import LoadStudy, { Chapter } from "@/componets/game/LoadStudy";
import LoadLichessGameUrl, {
  ParsedComment,
} from "@/componets/game/LoadLichessGameUrl";
import LoadPGNGame from "@/componets/game/LoadPGNGame";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import MultiGameNavigator from "@/componets/game/MultiGameNavigator";
import { ParsedPGN } from "@/libs/game/pgn";
import { useNets } from "@/hooks/useNets";
import { useLocalStorage, useSessionStorage } from "usehooks-ts";
import {
  VariationTree,
  makeTree,
  movesToTree,
  addMove,
  MoveNode,
  findNode,
} from "@/lib/variationTree";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSAN(
  prevFen: string,
  nextFen: string
): { san: string; uci: string } | null {
  try {
    const chess = new Chess(prevFen);
    for (const m of chess.moves({ verbose: true })) {
      const test = new Chess(prevFen);
      test.move(m);
      if (test.fen() === nextFen) {
        return { san: m.san, uci: m.from + m.to + (m.promotion ?? "") };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GamePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ── Drawer state (mobile) ──────────────────────────────────────────────────
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);
  const [moveListDrawerOpen, setMoveListDrawerOpen] = useState(false);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [pgnText, setPgnText] = useSessionStorage("agine_game_page_pgn", "");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [customPlayFen, setCustomPlayFen] = useState("");
  const [moves, setMoves] = useSessionStorage<string[]>("agine_game_moves", []);
  const [parsedMovesWithComments, setParsedMovesWithComments] =
    useSessionStorage<ParsedComment[]>("agine_parsed_comments", []);
  const [currentMoveIndex, setCurrentMoveIndex] = useSessionStorage(
    "agine_game_current_move",
    0
  );
  const [inputsVisible, setInputsVisible] = useSessionStorage(
    "agine_show_game",
    true
  );
  const [chapters, setChapters] = useSessionStorage<Chapter[]>(
    "agine_chapters",
    []
  );
  const [comment, setComment] = useSessionStorage("agine_comment", "");
  const [gameInfo, setGameInfo] = useSessionStorage<Record<string, string>>(
    "agine_game_info",
    {}
  );
  const [multiGameList, setMultiGameList] = useState<ParsedPGN[]>([]);
  const [currentGameHash, setCurrentGameHash] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const [gameReviewHistory] = useLocalStorage<SavedGameReview[]>(
    "chess-game-review-history",
    []
  );

  // ── Variation tree ─────────────────────────────────────────────────────────
  const [tree, setTree] = useState<VariationTree>(() => makeTree());
  const [prevFen, setPrevFen] = useState<string>(new Chess().fen());

  // ── Engine / AI hooks ──────────────────────────────────────────────────────
  const {
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    lichessOpeningData,
    lichessOpeningLoading,
    openingLoading,
    moveSquares,
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,
    gameReview,
    gameReviewProgress,
    setGameReview,
    generateGameReview,
    gameReviewLoading,
    fetchOpeningData,
    setMoveSquares,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    chessdbdata,
    loading,
    queueing,
    error,
    refetch,
    requestAnalysis,
    setRootCurrentMove,
    scores,
    themeScoreError,
    themeScoreLoading,
  } = useAgine(fen, "game");

  const {
    evaluations,
    sanEvaluations,
    isLoading: maiaIsLoading,
    Maiaerror: maiaError,
    lichessData,
    isInBook,
  } = useNets({ fen });

  const [activeAnalysisTab, setActiveAnalysisTab] = useSessionStorage(
    "agine_game_act_tab",
    0
  );
  const { gameReviewTheme, analyzeGameTheme } = useGameTheme();

  // ── Sync tree when moves are loaded externally (LoadLichessGameUrl etc) ───
  // We detect this when moves changes but the tree is still at root (empty).
  useEffect(() => {
    if (moves.length > 0 && !tree.root.next) {
      const startingFen = extractStartingFen(pgnText) ?? undefined;
      const newTree = movesToTree(moves, startingFen);
      setTree(newTree);
      const startFen = new Chess(startingFen).fen();
      setPrevFen(startFen);
    }
  }, [moves]);


  // ── Load history on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const loadGameId = sessionStorage.getItem("loadGameId");
    if (loadGameId) {
      sessionStorage.removeItem("loadGameId");
      setTimeout(() => {
        const savedGame = gameReviewHistory.find((g) => g.id === loadGameId);
        if (savedGame) loadFromHistory(savedGame);
      }, 100);
    }
  }, []);

  // ── Intercept board moves → variation tree ─────────────────────────────────
  useEffect(() => {
    if (fen === prevFen) return;
    const result = getSAN(prevFen, fen);
    if (!result) { setPrevFen(fen); return; }
    const { san, uci } = result;
    const { newTree, newCursorId } = addMove(tree, tree.cursor, san, uci, fen);
    setTree({ ...newTree, cursor: newCursorId });
    setPrevFen(fen);
  }, [fen]);

  // ── Navigate board to a tree node ─────────────────────────────────────────
  const handleNavigate = useCallback(
    (nodeFen: string, nodeId: string) => {
      // Find index in main-line moves for review sync
      const node = findNode(tree.root, nodeId);
      const idx = node ? node.ply : 0;

      const newGame = new Chess(nodeFen);
      setGame(newGame);
      setFen(nodeFen);
      setTree((prev) => ({ ...prev, cursor: nodeId }));
      setPrevFen(nodeFen);
      setCurrentMoveIndex(idx);
      setRootCurrentMove(idx);
      setComment(parsedMovesWithComments[idx - 1]?.comment || "");
      setStockfishAnalysisResult(null);
    },
    [tree, parsedMovesWithComments, setRootCurrentMove, setStockfishAnalysisResult]
  );

  // ── AI annotation helper ───────────────────────────────────────────────────
  const handleAIAnnotation = useCallback(
    async (node: MoveNode): Promise<string> => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: node.fen,
            move: node.san,
            prompt: `Briefly annotate the chess move ${node.san} from position ${node.fen}. One sentence max.`,
          }),
        });
        return res.ok ? (await res.text()).trim() : "";
      } catch { return ""; }
    },
    []
  );

  // ── PGN helpers (unchanged from original) ─────────────────────────────────
  const cleanPGN = (pgnText: string): string => {
    const lines = pgnText.split("\n");
    const headers: string[] = [];
    const moveLines: string[] = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        headers.push(trimmedLine);
      } else if (trimmedLine !== "" && !trimmedLine.startsWith("[")) {
        moveLines.push(trimmedLine);
      }
    }
    let movesText = moveLines.join(" ");
    movesText = movesText.replace(/\{[^}]*\}/g, "");
    movesText = movesText.replace(/\([^)]*\)/g, "");
    movesText = movesText.replace(/\s+/g, " ").trim();
    return headers.length > 0
      ? headers.join("\n") + "\n\n" + movesText
      : movesText;
  };

  const extractStartingFen = (pgnText: string): string | undefined => {
    const fenMatch = pgnText.match(/\[FEN "([^"]+)"\]/);
    return fenMatch ? fenMatch[1] : undefined;
  };

  const parsePGNMoves = (
    pgnText: string,
    startingFen?: string
  ): { game: Chess; moveList: string[] } => {
    const cleanedPGN = cleanPGN(pgnText);
    const tempGame = new Chess(startingFen);
    const pgnWithoutHeaders = cleanedPGN
      .split("\n")
      .filter((line) => !line.trim().startsWith("["))
      .join(" ")
      .trim();

    if (startingFen && pgnWithoutHeaders) {
      const moveText = pgnWithoutHeaders
        .replace(/\d+\./g, "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
        .replace(/White resigned.*?!/g, "")
        .replace(/Black resigned.*?!/g, "")
        .replace(/\s+/g, " ")
        .trim();
      for (const move of moveText.split(/\s+/).filter((m) => m.length > 0)) {
        try { tempGame.move(move); } catch (e) {
          throw new Error(`Invalid move: ${move}`);
        }
      }
    } else if (!startingFen && pgnWithoutHeaders) {
      tempGame.loadPgn(pgnWithoutHeaders);
    }
    return { game: tempGame, moveList: tempGame.history() };
  };

  // ── Initialize game state and variation tree ───────────────────────────────
  const initializeGameState = (
    pgn: string,
    startingFen?: string,
    moveList?: string[]
  ) => {
    const parsed = extractMovesWithComments(pgn);
    const info = extractGameInfo(pgn);
    const ml = moveList || [];

    setMoves(ml);
    setParsedMovesWithComments(parsed);
    setGameInfo(info);
    setCurrentMoveIndex(0);

    const resetGame = new Chess(startingFen);
    setGame(resetGame);
    setFen(resetGame.fen());
    setComment("");
    setGameReview([]);

    // Build variation tree from main-line moves
    const newTree = movesToTree(ml, startingFen);
    // Cursor at last move so review starts at end
    setTree(newTree);
    setPrevFen(resetGame.fen());
  };

  const loadPGN = () => {
    try {
      const cleanedPGN = cleanPGN(pgnText);
      const startingFen = extractStartingFen(cleanedPGN);
      const { moveList } = parsePGNMoves(pgnText, startingFen);
      initializeGameState(pgnText, startingFen, moveList);
      generateGameReview(moveList, startingFen);
      analyzeGameTheme(moveList, startingFen);
    } catch (err) {
      alert(`Invalid PGN: ${err instanceof Error ? err.message : err}`);
      setInputsVisible(false);
    }
  };

  const loadUserPGN = (pgn: string, gameHash?: string) => {
    try {
      setPgnText(pgn);
      const cleanPgn = cleanPGN(pgn);
      const startingFen = extractStartingFen(cleanPgn);
      const { moveList } = parsePGNMoves(pgn, startingFen);
      initializeGameState(pgn, startingFen, moveList);
      if (gameHash) setCurrentGameHash(gameHash);
      generateGameReview(moveList, startingFen);
      analyzeGameTheme(moveList, startingFen);
      setInputsVisible(false);
    } catch (err) {
      alert(`Invalid PGN: ${err instanceof Error ? err.message : err}`);
      setInputsVisible(false);
    }
  };

  const loadFromHistory = (savedGame: SavedGameReview) => {
    try {
      const cleanPgn = cleanPGN(savedGame.pgn);
      const startingFen = extractStartingFen(cleanPgn);
      setPgnText(cleanPgn);
      setMoves(savedGame.moves);
      setGameInfo(savedGame.gameInfo);
      setGameReview(savedGame.gameReview);
      const parsed = extractMovesWithComments(savedGame.pgn);
      setParsedMovesWithComments(parsed);
      setCurrentMoveIndex(0);
      const resetGame = new Chess(startingFen);
      setGame(resetGame);
      setFen(resetGame.fen());
      setCustomPlayFen(startingFen || resetGame.fen());
      setComment("");
      // Rebuild tree from saved moves
      const newTree = movesToTree(savedGame.moves, startingFen);
      setTree(newTree);
      setPrevFen(resetGame.fen());
      setHistoryDialogOpen(false);
      setInputsVisible(false);
    } catch (err) {
      alert("Error loading saved game");
    }
  };

  // This still drives currentMoveIndex for the legacy game review
  const goToMove = (index: number) => {
    const startingFen = extractStartingFen(pgnText);
    const tempGame = new Chess(startingFen);
    for (let i = 0; i < index; i++) tempGame.move(moves[i]);
    setGame(tempGame);
    setFen(tempGame.fen());
    setCurrentMoveIndex(index);
    setRootCurrentMove(index);
    setComment(parsedMovesWithComments[index - 1]?.comment || "");
    setStockfishAnalysisResult(null);
    setPrevFen(tempGame.fen());

    // Sync tree cursor to the matching main-line node
    // Walk tree to find the node at this ply on the main line
    let node = tree.root;
    for (let i = 0; i < index; i++) {
      if (node.next) node = node.next;
      else break;
    }
    setTree((prev) => ({ ...prev, cursor: node.id }));
  };

  const handleMultiGameSelect = (g: ParsedPGN) => {
    loadUserPGN(g.pgn, g.hash);
  };

  // ── Tree navigation callbacks (used by board nav buttons + arrow keys) ─────
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

  const treePly = useMemo(() => {
    const cur = findNode(tree.root, tree.cursor);
    return cur?.ply ?? 0;
  }, [tree]);

  const treeMaxPly = useMemo(() => {
    let n = tree.root; let d = 0;
    while (n.next) { n = n.next; d++; }
    return d;
  }, [tree]);

  const saveGameReview = () => {
    if (!gameReview.length) {
      alert("No game review to save. Please generate a review first.");
      return;
    }
    setSaveDialogOpen(true);
  };

  const resetAll = () => {
    setInputsVisible(true);
    setMoves([]);
    setPgnText("");
    setGameInfo({});
    setComment("");
    setMultiGameList([]);
    setGameReview([]);
    setCurrentGameHash("");
    setTree(makeTree());
    const reset = new Chess();
    setGame(reset);
    setFen(reset.fen());
    setPrevFen(reset.fen());
  };

    // ── Arrow key navigation (uses tree nav for variation-awareness) ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleTreePrevious();
      if (e.key === "ArrowRight") handleTreeNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTreePrevious, handleTreeNext]);


  // ── Panel JSX variables (NOT component functions — avoids remount loop) ───

  const analysisPanel = moves.length > 0 ? (
    <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
      <AgineAnalysisView
        activeAnalysisTab={activeAnalysisTab}
        setActiveAnalysisTab={setActiveAnalysisTab}
        isGameReviewMode={true}
        stockfishAnalysisResult={stockfishAnalysisResult}
        stockfishLoading={stockfishLoading}
        engineDepth={engineDepth}
        engineLines={engineLines}
        engine={engine}
        Maiaerror={maiaError}
        isLoading={maiaIsLoading}
        evaluations={evaluations}
        analyzeWithStockfish={analyzeWithStockfish}
        formatEvaluation={formatEvaluation}
        fen={fen}
        formatPrincipalVariation={formatPrincipalVariation}
        setEngineDepth={setEngineDepth}
        setEngineLines={setEngineLines}
        openingLoading={openingLoading}
        openingData={openingData}
        lichessOpeningData={lichessOpeningData}
        lichessOpeningLoading={lichessOpeningLoading}
        chessdbdata={chessdbdata}
        queueing={queueing}
        error={error}
        lichessData={lichessData}
        loading={loading}
        refetch={refetch}
        requestAnalysis={requestAnalysis}
        moves={moves}
        currentMoveIndex={currentMoveIndex}
        goToMove={goToMove}
        comment={comment}
        gameInfo={gameInfo}
        gameReviewTheme={gameReviewTheme}
        generateGameReview={generateGameReview}
        gameReviewLoading={gameReviewLoading}
        gameReviewProgress={gameReviewProgress}
        gameReview={gameReview}
        pgnText={pgnText}
        currentMove={moves[currentMoveIndex]}
        Customfen={customPlayFen}
        sanEvaluations={sanEvaluations}
        isInBook={isInBook}
        scores={scores}
        ThemeScoreerror={themeScoreError}
        ThemeScoreloading={themeScoreLoading}
      />
      {chapters.length > 0 && (
        <ResizableChapterSelector
          chapters={chapters}
          onChapterSelect={(pgn) => {
            setPgnText(pgn);
            setTimeout(() => loadPGN(), 0);
          }}
        />
      )}
    </Stack>
  ) : null;

  const moveListPanel = (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      backgroundColor: "#0d0d0d", borderRadius: 2, border: "1px solid #2a2a2a",
      overflow: "hidden",
    }}>
      <Box sx={{
        px: 1.5, py: 1, borderBottom: "1px solid #1e1e1e",
        display: "flex", alignItems: "center", gap: 1, flexShrink: 0,
      }}>
        <MoveListIcon sx={{ fontSize: 15, color: "#7c3aed" }} />
        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#999", letterSpacing: "0.08em" }}>
          MOVES & VARIATIONS
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <AnnotatedMoveList
          tree={tree}
          onTreeChange={setTree}
          onNavigate={handleNavigate}
          onRequestAIAnnotation={handleAIAnnotation}
          gameResult={gameInfo.Result}
        />
      </Box>
    </Box>
  );

  const boardPanel = (
    <AiChessboardPanel
      game={game}
      fen={fen}
      moveSquares={moveSquares}
      engine={engine}
      setMoveSquares={setMoveSquares}
      setFen={setFen}
      evaluations={evaluations}
      gameInfo={gameInfo}
      setGame={setGame}
      reviewMove={gameReview[currentMoveIndex]}
      gameReviewMode={true}
      setOpeningData={setOpeningData}
      setStockfishAnalysisResult={setStockfishAnalysisResult}
      stockfishAnalysisResult={stockfishAnalysisResult}
      fetchOpeningData={fetchOpeningData}
      analyzeWithStockfish={analyzeWithStockfish}
      llmLoading={llmLoading}
      stockfishLoading={stockfishLoading}
      openingLoading={openingLoading}
      onTreePrevious={handleTreePrevious}
      onTreeNext={handleTreeNext}
      onTreeStart={handleTreeStart}
      onTreeEnd={handleTreeEnd}
      hideBuiltInMoveList
      treePly={treePly}
      treeMaxPly={treeMaxPly}
    />
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: "100vh", height: "100%", overflowY: "auto", overflowX: "hidden" }}>
      {/* ── Load game card ── */}
      {inputsVisible && (
        <Box sx={{ p: { xs: 1, sm: 2, md: 4 } }}>
          <Card sx={{
            mb: { xs: 2, sm: 3, md: 4 }, borderRadius: { xs: 2, md: 3 },
            boxShadow: "0 8px 32px rgba(138,43,226,0.15)",
            maxHeight: { xs: "70vh", sm: "75vh", md: "80vh" }, overflowY: "auto",
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Box sx={{ textAlign: "center", mb: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h3" gutterBottom sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
                  backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  Chess Analysis with Agine
                </Typography>
                <Typography variant="h6" sx={{
                  mb: 3, fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" },
                  maxWidth: 600, mx: "auto", px: { xs: 2, sm: 0 },
                }}>
                  Get detailed AI insights on your games! Paste your PGN, Lichess game URL, or study URL to begin analysis.
                </Typography>
              </Box>
              <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                <GamereviewHistory setHistoryDialogOpen={setHistoryDialogOpen} />
                <LoadStudy setChapters={setChapters} setInputsVisible={setInputsVisible} />
                <Divider />
                <LoadLichessGameUrl
                  setComment={setComment}
                  setCurrentMoveIndex={setCurrentMoveIndex}
                  setFen={setFen}
                  setGame={setGame}
                  setGameInfo={setGameInfo}
                  setGameReview={setGameReview}
                  setInputsVisible={setInputsVisible}
                  setMoves={setMoves}
                  setParsedMovesWithComments={setParsedMovesWithComments}
                  setPgnText={setPgnText}
                  generateGameReview={generateGameReview}
                  analyzeGameTheme={analyzeGameTheme}
                />
                <Divider />
                <LoadPGNGame
                  pgnText={pgnText}
                  setPgnText={setPgnText}
                  loadPGN={loadPGN}
                  setInputsVisible={setInputsVisible}
                />
                <Divider />
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: "1rem", sm: "1.15rem", md: "1.25rem" } }}>
                    Your Lichess Games
                  </Typography>
                  <UserGameSelect loadPGN={loadUserPGN} />
                  <Box sx={{ mt: 2 }}>
                    <UserPGNUploader loadPGN={(pgn) => loadUserPGN(pgn)} setMultiGameList={setMultiGameList} />
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Three-panel analysis layout (desktop) ── */}
      {!inputsVisible && !isMobile && (
        <Box sx={{
          display: "grid",
          gridTemplateColumns: "290px 1fr 270px",
          height: "calc(100vh - 64px)",
          gap: 1.5, px: 1.5, py: 1.5,
          overflow: "hidden", boxSizing: "border-box",
        }}>
          {/* Left: AI Analysis */}
          <Paper sx={{
            backgroundColor: "#0d0d0d", border: "1px solid #2a2a2a",
            borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <Box sx={{
              px: 1.5, py: 1, borderBottom: "1px solid #1e1e1e",
              display: "flex", alignItems: "center", gap: 1, flexShrink: 0,
            }}>
              <AnalyticsIcon sx={{ fontSize: 15, color: "#7c3aed" }} />
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#999", letterSpacing: "0.08em" }}>
                AI ANALYSIS
              </Typography>
            </Box>
            <Box sx={{
              flex: 1, overflowY: "auto", p: 1,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#333", borderRadius: "2px" },
            }}>
              {analysisPanel}
            </Box>
          </Paper>

          {/* Center: Board + controls */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 1 }}>
            {boardPanel}
            {multiGameList.length > 1 && (
              <MultiGameNavigator
                games={multiGameList}
                currentGameHash={currentGameHash}
                onGameSelect={handleMultiGameSelect}
              />
            )}
            <Stack direction="row" spacing={1} sx={{ width: "100%", maxWidth: 520, px: 1 }}>
              <Button variant="contained" onClick={saveGameReview}
                startIcon={<SaveIcon />} disabled={!gameReview.length}
                fullWidth size="small" sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem" }}>
                Save Game
              </Button>
              <Button variant="outlined" onClick={resetAll}
                startIcon={<RefreshIcon />}
                fullWidth size="small" sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem" }}>
                Load New Game
              </Button>
            </Stack>
          </Box>

          {/* Right: Move list + variations */}
          {moveListPanel}
        </Box>
      )}

      {/* ── Mobile layout ── */}
      {!inputsVisible && isMobile && (
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            {boardPanel}
          </Box>

          {multiGameList.length > 1 && (
            <MultiGameNavigator
              games={multiGameList}
              currentGameHash={currentGameHash}
              onGameSelect={handleMultiGameSelect}
            />
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2, px: 1 }}>
            <Button variant="contained" onClick={saveGameReview}
              startIcon={<SaveIcon />} disabled={!gameReview.length}
              fullWidth size="small" sx={{ borderRadius: 2, textTransform: "none" }}>
              Save
            </Button>
            <Button variant="outlined" onClick={resetAll}
              startIcon={<RefreshIcon />}
              fullWidth size="small" sx={{ borderRadius: 2, textTransform: "none" }}>
              New Game
            </Button>
          </Stack>

          {/* FAB: Analysis */}
          <Fab color="primary" aria-label="analysis"
            onClick={() => setAnalysisDrawerOpen(true)}
            sx={{ position: "fixed", bottom: 84, right: 24, zIndex: 1000 }}>
            <AnalyticsIcon />
          </Fab>

          {/* FAB: Move list */}
          <Fab aria-label="moves" onClick={() => setMoveListDrawerOpen(true)}
            sx={{
              position: "fixed", bottom: 24, right: 24, zIndex: 1000,
              backgroundColor: "#7c3aed", "&:hover": { backgroundColor: "#6d28d9" },
            }}>
            <MoveListIcon />
          </Fab>

          {/* Analysis drawer */}
          <Drawer anchor="bottom" open={analysisDrawerOpen}
            onClose={() => setAnalysisDrawerOpen(false)}
            sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <Typography variant="h6" fontWeight={600}>Analysis</Typography>
                <Button onClick={() => setAnalysisDrawerOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>{analysisPanel}</Box>
            </Box>
          </Drawer>

          {/* Move list drawer */}
          <Drawer anchor="bottom" open={moveListDrawerOpen}
            onClose={() => setMoveListDrawerOpen(false)}
            sx={{ "& .MuiDrawer-paper": { height: "75vh", borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: "#0d0d0d" } }}>
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ p: 2, borderBottom: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <Typography variant="h6" fontWeight={600} sx={{ color: "#ccc" }}>Moves & Variations</Typography>
                <Button onClick={() => setMoveListDrawerOpen(false)} startIcon={<CloseIcon />} size="small" sx={{ color: "#888" }}>Close</Button>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <AnnotatedMoveList
                  tree={tree}
                  onTreeChange={setTree}
                  onNavigate={(f, id) => { handleNavigate(f, id); setMoveListDrawerOpen(false); }}
                  onRequestAIAnnotation={handleAIAnnotation}
                  gameResult={gameInfo.Result}
                />
              </Box>
            </Box>
          </Drawer>
        </Box>
      )}

      <SaveGameReviewDialog
        saveDialogOpen={saveDialogOpen}
        setSaveDialogOpen={setSaveDialogOpen}
        historyDialogOpen={historyDialogOpen}
        setHistoryDialogOpen={setHistoryDialogOpen}
        gameInfo={gameInfo}
        isBotGame={false}
        gameReviewTheme={gameReviewTheme!}
        gameReview={gameReview}
        moves={moves}
        pgnText={pgnText}
        loadFromHistory={loadFromHistory}
      />
    </Box>
  );
}