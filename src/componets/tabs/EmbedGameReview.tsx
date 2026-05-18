"use client"
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
  Fab,
  Drawer,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  OpenInNew as OpenInNewIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";

import useAgine from "@/hooks/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import PGNView from "@/componets/tabs/PgnView";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import AnnotatedMoveList from "@/componets/tabs/AnonatedMoveList";
import SaveGameReviewDialog from "@/componets/game/SaveGameReviewDialog";
import { extractMovesWithComments, extractGameInfo } from "@/libs/game/helper";
import { useGameTheme } from "@/hooks/useGameTheme";
import { useNets } from "@/hooks/useNets";
import { makeTree, movesToTree, VariationTree } from "@/lib/variationTree";
import type { ParsedComment } from "@/componets/game/LoadLichessGameUrl";


export type EmbeddedGameSource =
  | { type: "pgn"; value: string }
  | { type: "lichessId"; value: string }
  | { type: "studyId"; value: string };

interface EmbeddedGameReviewProps {
  source: EmbeddedGameSource;
  autoReview?: boolean;
  caption?: string;
}


async function fetchLichessPGN(gameId: string): Promise<string> {
  const res = await fetch(
    `https://lichess.org/game/export/${gameId}?clocks=false&evals=false`,
    { headers: { Accept: "application/x-chess-pgn" } }
  );
  if (!res.ok) throw new Error(`Lichess API error: ${res.status}`);
  return res.text();
}

async function fetchLichessStudyPGN(studyId: string): Promise<string> {
  const res = await fetch(`https://lichess.org/api/study/${studyId}.pgn`, {
    headers: { Accept: "application/x-chess-pgn" },
  });
  if (!res.ok) throw new Error(`Lichess study API error: ${res.status}`);
  return res.text();
}


function cleanPGN(pgnText: string): string {
  const lines = pgnText.split("\n");
  const headers: string[] = [];
  const moveLines: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("[") && t.endsWith("]")) headers.push(t);
    else if (t !== "" && !t.startsWith("[")) moveLines.push(t);
  }
  let movesText = moveLines.join(" ");
  movesText = movesText
    .replace(/\{[^}]*\}/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return headers.length > 0 ? headers.join("\n") + "\n\n" + movesText : movesText;
}

function extractStartingFen(pgnText: string): string | undefined {
  return pgnText.match(/\[FEN "([^"]+)"\]/)?.[1];
}

function parsePGNMoves(
  pgnText: string,
  startingFen?: string
): { game: Chess; moveList: string[] } {
  const cleaned = cleanPGN(pgnText);
  const tempGame = new Chess(startingFen);
  const pgnWithoutHeaders = cleaned
    .split("\n")
    .filter((l) => !l.trim().startsWith("["))
    .join(" ")
    .trim();

  if (startingFen && pgnWithoutHeaders) {
    const moveText = pgnWithoutHeaders
      .replace(/\d+\./g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    for (const move of moveText.split(/\s+/).filter(Boolean)) {
      try { tempGame.move(move); } catch { break; }
    }
  } else if (!startingFen && pgnWithoutHeaders) {
    try { tempGame.loadPgn(pgnWithoutHeaders); } catch { /* ignore */ }
  }
  return { game: tempGame, moveList: tempGame.history() };
}

export default function EmbeddedGameReview({
  source,
  autoReview = true,
  caption,
}: EmbeddedGameReviewProps) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // ── Fetch/parse state ──
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [pgnText, setPgnText] = useState("");

  // ── Game state ──
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(new Chess().fen());
  const [customPlayFen, setCustomPlayFen] = useState("");
  const [moves, setMoves] = useState<string[]>([]);
  const [parsedMovesWithComments, setParsedMovesWithComments] = useState<ParsedComment[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [embedSaveId] = useState(() => Date.now().toString());
  const [tree, setTree] = useState<VariationTree>(() => makeTree());

  // ── Dialog / drawer state ──
  const [expandOpen, setExpandOpen] = useState(false);
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);

  // ── Left-panel tab (mirrors game page) ──
  type LeftTab = "analysis" | "info";
  const [leftTab, setLeftTab] = useState<LeftTab>("analysis");

  const loadedRef = useRef(false);

  const agine = useAgine(fen, "game", true, undefined, "play");
  const nets = useNets({ fen });
  const { gameReviewTheme, analyzeGameTheme } = useGameTheme();

  const {
    setStockfishAnalysisResult, setOpeningData,
    llmLoading, stockfishLoading, openingLoading,
    moveSquares, engine, gameReview, setGameReview,
    generateGameReview, gameReviewLoading, gameReviewProgress,
    fetchOpeningData, setMoveSquares,
    analyzeWithStockfish, stockfishAnalysisResult,
    engineDepth, setEngineDepth, engineLines, setEngineLines,
    openingData, lichessOpeningData, lichessOpeningLoading,
    chessdbdata, loading, queueing, error, refetch, requestAnalysis,
    scores, themeScoreError, themeScoreLoading, formatEvaluation,
    formatPrincipalVariation,
  } = agine;

  const { evaluations, sanEvaluations, isLoading: maiaIsLoading, Maiaerror: maiaError } = nets;

  // ── Init from PGN ──
  const initFromPGN = useCallback(
    (pgn: string, triggerReview: boolean) => {
      try {
        const cleaned = cleanPGN(pgn);
        const startingFen = extractStartingFen(cleaned);
        const { moveList } = parsePGNMoves(pgn, startingFen);
        const parsed = extractMovesWithComments(pgn);
        const info = extractGameInfo(pgn);

        setPgnText(cleaned);
        setMoves(moveList);
        setParsedMovesWithComments(parsed);
        setGameInfo(info);
        setCurrentMoveIndex(0);
        setComment("");
        setGameReview([]);
        setTree(movesToTree(moveList, startingFen));

        const resetGame = new Chess(startingFen);
        setGame(resetGame);
        setFen(resetGame.fen());
        setCustomPlayFen(startingFen || resetGame.fen());

        if (triggerReview) {
          generateGameReview(moveList, startingFen);
          analyzeGameTheme(moveList, startingFen);
        }
      } catch (err) {
        setFetchError(`Failed to parse PGN: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [generateGameReview, analyzeGameTheme, setGameReview]
  );

  
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    async function load() {
      setFetchLoading(true);
      setFetchError(null);
      try {
        let pgn: string;
        if (source.type === "pgn") pgn = source.value;
        else if (source.type === "lichessId") pgn = await fetchLichessPGN(source.value);
        else pgn = await fetchLichessStudyPGN(source.value);
        initFromPGN(pgn, autoReview);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to load game.");
      } finally {
        setFetchLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentMoveIndex > 0) goToMove(currentMoveIndex - 1);
      if (e.key === "ArrowRight" && currentMoveIndex < moves.length) goToMove(currentMoveIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentMoveIndex, moves]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToMove = useCallback(
    (index: number) => {
      const startingFen = extractStartingFen(pgnText);
      const tempGame = new Chess(startingFen);
      for (let i = 0; i < index; i++) tempGame.move(moves[i]);
      setGame(tempGame);
      setFen(tempGame.fen());
      setCurrentMoveIndex(index);
      agine.setRootCurrentMove(index);
      setComment(parsedMovesWithComments[index - 1]?.comment || "");
      setStockfishAnalysisResult(null);
      // sync tree cursor
      let node = tree.root;
      for (let i = 0; i < index; i++) {
        if (node.next) node = node.next; else break;
      }
      setTree(prev => ({ ...prev, cursor: node.id }));
    },
    [moves, parsedMovesWithComments, pgnText, agine, setStockfishAnalysisResult, tree]
  );

  // ── Shared analysis panel (reused in both compact and full-screen) ──
  const analysisPanel = (
    <Box sx={{
      height: "100%", overflowY: "auto", p: 1,
      "&::-webkit-scrollbar": { width: "4px" },
      "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
    }}>
      {moves.length > 0 ? (
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
          scores={scores}
          ThemeScoreerror={themeScoreError}
          ThemeScoreloading={themeScoreLoading}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, p: 1 }}>
          Load a game to see analysis.
        </Typography>
      )}
    </Box>
  );

  // ── Info panel (game metadata + actions) ──
  const infoPanel = (
    <Box sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        {(gameInfo.White || gameInfo.Black) && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
              PLAYERS
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              ♙ {gameInfo.White ?? "?"} {gameInfo.WhiteElo ? `(${gameInfo.WhiteElo})` : ""}
            </Typography>
            <Typography variant="body2">
              ♟ {gameInfo.Black ?? "?"} {gameInfo.BlackElo ? `(${gameInfo.BlackElo})` : ""}
            </Typography>
            {gameInfo.Result && (
              <Typography variant="caption" color="text.secondary">{gameInfo.Result}</Typography>
            )}
          </Box>
        )}
        {gameInfo.Event && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
              EVENT
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{gameInfo.Event}</Typography>
            {gameInfo.Date && <Typography variant="caption" color="text.secondary">{gameInfo.Date}</Typography>}
          </Box>
        )}
        <Stack spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            disabled={!gameReview.length}
            onClick={() => setSaveDialogOpen(true)}
            fullWidth
            sx={{ textTransform: "none" }}
          >
            Save Review
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => initFromPGN(pgnText, true)}
            disabled={gameReviewLoading}
            fullWidth
            sx={{ textTransform: "none" }}
          >
            Re-analyse
          </Button>
          {source.type === "lichessId" && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              component="a"
              href={`https://lichess.org/${source.value}`}
              target="_blank"
              fullWidth
              sx={{ textTransform: "none" }}
            >
              Open on Lichess
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );

  // ── Board panel ──
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
      maiaLoading={maiaIsLoading}
      openingLoading={openingLoading}
    />
  );

  // ── 3-column game-page layout (used inside full-screen dialog) ──
  const threeColumnLayout = (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* LEFT: Analysis | Info tabs */}
      <Box sx={{ borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box sx={{ display: "flex", flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          {([
            { id: "analysis" as LeftTab, label: "Analysis" },
            { id: "info"     as LeftTab, label: "Game Info" },
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
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          {leftTab === "analysis" && analysisPanel}
          {leftTab === "info"     && infoPanel}
        </Box>
      </Box>

      {/* CENTER: board */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRight: 1, borderColor: "divider" }}>
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
          <Tooltip title="Re-analyse">
            <IconButton size="small" onClick={() => initFromPGN(pgnText, true)} disabled={gameReviewLoading} sx={{ p: 0.4 }}>
              <RefreshIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <AnnotatedMoveList
            tree={tree}
            onTreeChange={setTree}
            onNavigate={(nodeFen, nodeId) => {
              // find ply from tree node and sync currentMoveIndex
              import("@/lib/variationTree").then(({ findNode }) => {
                const node = findNode(tree.root, nodeId);
                if (node) {
                  setGame(new Chess(nodeFen));
                  setFen(nodeFen);
                  setCurrentMoveIndex(node.ply);
                  agine.setRootCurrentMove(node.ply);
                  setStockfishAnalysisResult(null);
                  setTree(prev => ({ ...prev, cursor: nodeId }));
                }
              });
            }}
            gameResult={gameInfo.Result}
            gameReview={gameReview}
          />
        </Box>
      </Box>
    </Box>
  );

  // ── Loading ──
  if (fetchLoading) {
    return (
      <Box display="flex" alignItems="center" gap={2} py={3} px={2}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          {source.type === "lichessId"
            ? "Fetching game from Lichess…"
            : source.type === "studyId"
            ? "Fetching study from Lichess…"
            : "Loading PGN…"}
        </Typography>
      </Box>
    );
  }

  // ── Error ──
  if (fetchError) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600}>Could not load game</Typography>
        <Typography variant="caption">{fetchError}</Typography>
      </Alert>
    );
  }

  // ── Compact embed ──
  return (
    <>
      <Box sx={{
        width: "100%",
        maxWidth: 900,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}>
        {/* Header */}
        <Box sx={{
          px: 2, py: 1,
          borderBottom: "1px solid", borderColor: "divider",
          bgcolor: "action.hover",
          display: "flex", alignItems: "center", gap: 1,
        }}>
          <Box flex={1} minWidth={0}>
            {caption && (
              <Typography variant="subtitle2" fontWeight={700} noWrap>{caption}</Typography>
            )}
            {(gameInfo.White || gameInfo.Black) && (
              <Typography variant="caption" color="text.secondary" noWrap>
                ♙ {gameInfo.White ?? "?"} vs ♟ {gameInfo.Black ?? "?"}
                {gameInfo.Result && ` · ${gameInfo.Result}`}
              </Typography>
            )}
          </Box>
          <Tooltip title="Expand full review">
            <IconButton size="small" onClick={() => setExpandOpen(true)} color="primary">
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {source.type === "lichessId" && (
            <Tooltip title="Open on Lichess">
              <IconButton size="small" component="a" href={`https://lichess.org/${source.value}`} target="_blank">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Compact body: board + PGN side by side */}
        <Box sx={{ p: { xs: 1, sm: 2 }, overflowY: "auto", maxHeight: "80vh" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "center", md: "flex-start" }}
          >
            {/* Board */}
            <Stack spacing={1.5} alignItems="center" sx={{ flexShrink: 0, width: { xs: "100%", md: "auto" } }}>
              {boardPanel}
              <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                <Button
                  variant="contained" size="small"
                  startIcon={<FullscreenIcon />}
                  onClick={() => setExpandOpen(true)}
                  fullWidth sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  Full Review
                </Button>
                <Button
                  variant="outlined" size="small"
                  startIcon={<SaveIcon />}
                  disabled={!gameReview.length}
                  onClick={() => setSaveDialogOpen(true)}
                  fullWidth sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  Save
                </Button>
              </Stack>
            </Stack>

            {/* PGN move list */}
            <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <PGNView
                moves={moves}
                moveAnalysis={gameReview}
                gamePgn={pgnText}
                goToMove={goToMove}
                gameResult={gameInfo.Result}
                currentMoveIndex={currentMoveIndex}
              />
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Full-screen dialog — 3-column game-page layout */}
      <Dialog
        open={expandOpen}
        onClose={() => setExpandOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: "background.default", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{
          display: "flex", alignItems: "center", gap: 1,
          borderBottom: "1px solid", borderColor: "divider",
          py: 1, px: 2, flexShrink: 0,
        }}>
          <Box flex={1} minWidth={0}>
            {caption && (
              <Typography variant="subtitle1" fontWeight={700} noWrap>{caption}</Typography>
            )}
            {(gameInfo.White || gameInfo.Black) && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                ♙ {gameInfo.White ?? "?"} vs ♟ {gameInfo.Black ?? "?"}
                {gameInfo.Result && ` · ${gameInfo.Result}`}
              </Typography>
            )}
          </Box>
          <Tooltip title="Close">
            <IconButton onClick={() => setExpandOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
          {!isMobile ? (
            threeColumnLayout
          ) : (
            /* Mobile: board + move list + FAB drawer */
            <Box sx={{ p: 1, overflowY: "auto", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                {boardPanel}
              </Box>
              <Box sx={{
                border: 1, borderColor: "divider", borderRadius: 1,
                overflow: "hidden", maxHeight: 260, display: "flex", flexDirection: "column",
              }}>
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider", flexShrink: 0, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
                    MOVES
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <PGNView
                    moves={moves} moveAnalysis={gameReview}
                    gamePgn={pgnText} goToMove={goToMove}
                    gameResult={gameInfo.Result} currentMoveIndex={currentMoveIndex}
                  />
                </Box>
              </Box>
              <Fab
                color="primary" size="medium"
                onClick={() => setAnalysisDrawerOpen(true)}
                sx={{ position: "fixed", bottom: 80, right: 24, zIndex: 1300 }}
              >
                <AnalyticsIcon />
              </Fab>
              <Drawer
                anchor="bottom" open={analysisDrawerOpen}
                onClose={() => setAnalysisDrawerOpen(false)}
                sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
              >
                <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h6" fontWeight={600}>Analysis</Typography>
                  <Button size="small" startIcon={<CloseIcon />} onClick={() => setAnalysisDrawerOpen(false)}>Close</Button>
                </Box>
                <Box sx={{ flex: 1, overflowY: "auto" }}>{analysisPanel}</Box>
              </Drawer>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Save dialog */}
      <SaveGameReviewDialog
        saveDialogOpen={saveDialogOpen}
        setSaveDialogOpen={setSaveDialogOpen}
        historyDialogOpen={false}
        setHistoryDialogOpen={() => {}}
        gameInfo={gameInfo}
        isBotGame={false}
        gameReviewTheme={gameReviewTheme!}
        gameReview={gameReview}
        gameReviewLoading={gameReviewLoading}
        gameId={embedSaveId}
        moves={moves}
        pgnText={pgnText}
        loadFromHistory={() => {}}
      />
    </>
  );
}