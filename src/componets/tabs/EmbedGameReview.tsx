"use client"
import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import { Drawer, Fab } from "@mui/material";

import useAgine from "@/hooks/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import PGNView from "@/componets/tabs/PgnView";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import SaveGameReviewDialog from "@/componets/game/SaveGameReviewDialog";
import { extractMovesWithComments, extractGameInfo } from "@/libs/game/helper";
import { useGameTheme } from "@/hooks/useGameTheme";
import { useNets } from "@/hooks/useNets";
import type { ParsedComment } from "@/componets/game/LoadLichessGameUrl";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmbeddedGameSource =
  | { type: "pgn"; value: string }
  | { type: "lichessId"; value: string }
  | { type: "studyId"; value: string };

interface EmbeddedGameReviewProps {
  source: EmbeddedGameSource;
  autoReview?: boolean;
  caption?: string;
}

// ─── Lichess fetch helpers ────────────────────────────────────────────────────

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

// ─── PGN helpers ─────────────────────────────────────────────────────────────

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

// ─── Shared analysis props type ───────────────────────────────────────────────

interface AnalysisViewProps {
  // All the props AgineAnalysisView needs — passed through from the hook results
  activeAnalysisTab: number;
  setActiveAnalysisTab: (v: number) => void;
  moves: string[];
  currentMoveIndex: number;
  goToMove: (i: number) => void;
  comment: string;
  gameInfo: Record<string, string>;
  pgnText: string;
  fen: string;
  customPlayFen: string;
  agine: ReturnType<typeof useAgine>;
  nets: ReturnType<typeof useNets>;
  gameReviewTheme: ReturnType<typeof useGameTheme>["gameReviewTheme"];
}

// ─── Full dialog content (board + PGN + analysis) ────────────────────────────

interface FullReviewContentProps {
  game: Chess;
  fen: string;
  moves: string[];
  currentMoveIndex: number;
  goToMove: (i: number) => void;
  pgnText: string;
  gameInfo: Record<string, string>;
  comment: string;
  customPlayFen: string;
  activeAnalysisTab: number;
  setActiveAnalysisTab: Dispatch<SetStateAction<number>>;
  saveDialogOpen: boolean;
  setSaveDialogOpen: (v: boolean) => void;
  initFromPGN: (pgn: string, review: boolean) => void;
  source: EmbeddedGameSource;
  agine: ReturnType<typeof useAgine>;
  nets: ReturnType<typeof useNets>;
  gameReview: any[];
  gameReviewTheme: any;
  isMobile: boolean;
  analysisDrawerOpen: boolean;
  setAnalysisDrawerOpen: (v: boolean) => void;
}

function FullReviewContent({
  game, fen, moves, currentMoveIndex, goToMove,
  pgnText, gameInfo, comment, customPlayFen,
  activeAnalysisTab, setActiveAnalysisTab,
  saveDialogOpen, setSaveDialogOpen,
  initFromPGN, source, agine, nets, gameReview,
  gameReviewTheme, isMobile,
  analysisDrawerOpen, setAnalysisDrawerOpen,
}: FullReviewContentProps) {
  const {
    stockfishAnalysisResult, setStockfishAnalysisResult,
    openingData, setOpeningData,
    llmLoading, stockfishLoading,
    lichessOpeningData, lichessOpeningLoading, openingLoading,
    moveSquares, engineDepth, setEngineDepth,
    engineLines, setEngineLines,
    engine, gameReviewProgress, gameReviewLoading,
    generateGameReview, fetchOpeningData, setMoveSquares,
    analyzeWithStockfish, formatEvaluation, formatPrincipalVariation,
    chessdbdata, loading, queueing, error, refetch, requestAnalysis,
    scores, themeScoreError, themeScoreLoading,
  } = agine;

  const { evaluations, sanEvaluations, isLoading: maiaIsLoading, Maiaerror: maiaError, lichessData, isInBook } = nets;

  const AnalysisPanel = () => (
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
  );

  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      spacing={{ xs: 2, sm: 3 }}
      sx={{ width: "100%", overflow: "visible" }}
    >
      {/* Left column: board + PGN + action buttons */}
      <Stack
        spacing={2}
        alignItems="center"
        sx={{ flexShrink: 0, width: { xs: "100%", lg: "auto" } }}
      >
        <AiChessboardPanel
          game={game}
          fen={fen}
          moveSquares={moveSquares}
          engine={engine}
          setMoveSquares={setMoveSquares}
          setFen={() => {}} // fen controlled by goToMove
          evaluations={evaluations}
          gameInfo={gameInfo}
          setGame={() => {}}
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

        <Box sx={{ width: "100%", maxWidth: { xs: "100%", lg: 520 } }}>
          <PGNView
            moves={moves}
            moveAnalysis={gameReview}
            gamePgn={pgnText}
            goToMove={goToMove}
            gameResult={gameInfo.Result}
            currentMoveIndex={currentMoveIndex}
          />
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ width: "100%", maxWidth: { xs: "100%", lg: 520 } }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            disabled={!gameReview.length}
            onClick={() => setSaveDialogOpen(true)}
            fullWidth
            sx={{ borderRadius: 2, textTransform: "none" }}
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
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Re-analyse
          </Button>
          {source.type === "lichessId" && (
            <Tooltip title="Open on Lichess">
              <IconButton
                size="small"
                component="a"
                href={`https://lichess.org/${source.value}`}
                target="_blank"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Right column: analysis (desktop) or FAB+drawer (mobile) */}
      {moves.length > 0 && (
        <>
          {!isMobile ? (
            <Box flex={1} minWidth={0} sx={{ overflowY: "auto" }}>
              <AnalysisPanel />
            </Box>
          ) : (
            <>
              <Fab
                color="primary"
                size="medium"
                onClick={() => setAnalysisDrawerOpen(true)}
                sx={{ position: "fixed", bottom: 80, right: 24, zIndex: 1200 }}
              >
                <AnalyticsIcon />
              </Fab>
              <Drawer
                anchor="bottom"
                open={analysisDrawerOpen}
                onClose={() => setAnalysisDrawerOpen(false)}
                sx={{
                  "& .MuiDrawer-paper": {
                    height: "85vh",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  },
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>Analysis</Typography>
                  <Button
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={() => setAnalysisDrawerOpen(false)}
                  >
                    Close
                  </Button>
                </Box>
                <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                  <AnalysisPanel />
                </Box>
              </Drawer>
            </>
          )}
        </>
      )}
    </Stack>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmbeddedGameReview({
  source,
  autoReview = true,
  caption,
}: EmbeddedGameReviewProps) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // ── Fetch / parse state ──
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
  // Stable id for this embed game — generated once on mount
  const [embedSaveId] = useState(() => Date.now().toString());

  // ── Expand dialog state ──
  const [expandOpen, setExpandOpen] = useState(false);
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);

  // ── Compact embed analysis collapse ──
  const [analysisExpanded, setAnalysisExpanded] = useState(false);

  const loadedRef = useRef(false);

  const agine = useAgine(fen, "game");
  const nets = useNets({ fen });
  const { gameReviewTheme, analyzeGameTheme } = useGameTheme();

  const {
    setStockfishAnalysisResult, setOpeningData,
    llmLoading, stockfishLoading, openingLoading,
    moveSquares, engine, gameReview, setGameReview,
    generateGameReview, gameReviewLoading,
    fetchOpeningData, setMoveSquares,
    analyzeWithStockfish, evaluations: agineEvaluations,
    stockfishAnalysisResult,
  } = agine;

  const { evaluations } = nets;

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

        const resetGame = new Chess(startingFen);
        setGame(resetGame);
        setFen(resetGame.fen());
        setCustomPlayFen(startingFen || resetGame.fen());

        if (triggerReview) {
          generateGameReview(moveList, startingFen);
          analyzeGameTheme(moveList, startingFen);
        }
      } catch (err) {
        setFetchError(
          `Failed to parse PGN: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    },
    [generateGameReview, analyzeGameTheme, setGameReview]
  );

  // ── Auto-load on mount ──
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
    },
    [moves, parsedMovesWithComments, pgnText, agine, setStockfishAnalysisResult]
  );

  // ── Shared props for FullReviewContent ──
  const sharedProps = {
    game, fen, moves, currentMoveIndex, goToMove,
    pgnText, gameInfo, comment, customPlayFen,
    activeAnalysisTab, setActiveAnalysisTab,
    saveDialogOpen, setSaveDialogOpen,
    initFromPGN, source, agine, nets,
    gameReview, gameReviewTheme,
  };

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
        <Typography variant="body2" fontWeight={600}>
          Could not load game
        </Typography>
        <Typography variant="caption">{fetchError}</Typography>
      </Alert>
    );
  }

  // ── Compact embed ──
  return (
    <>
      <Box
        sx={{
          width: "100%",
          maxWidth: 900,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box flex={1} minWidth={0}>
            {caption && (
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {caption}
              </Typography>
            )}
            {(gameInfo.White || gameInfo.Black) && (
              <Typography variant="caption" color="text.secondary" noWrap>
                ♙ {gameInfo.White ?? "?"} vs ♟ {gameInfo.Black ?? "?"}
                {gameInfo.Result && ` · ${gameInfo.Result}`}
              </Typography>
            )}
          </Box>

          {/* Expand to full dialog */}
          <Tooltip title="Expand full review">
            <IconButton
              size="small"
              onClick={() => setExpandOpen(true)}
              color="primary"
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {source.type === "lichessId" && (
            <Tooltip title="Open on Lichess">
              <IconButton
                size="small"
                component="a"
                href={`https://lichess.org/${source.value}`}
                target="_blank"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* ── Compact body: board + PGN side by side ── */}
        <Box sx={{ p: { xs: 1, sm: 2 }, overflowY: "auto", maxHeight: "80vh" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "center", md: "flex-start" }}
          >
            {/* Board */}
            <Stack spacing={1.5} alignItems="center" sx={{ flexShrink: 0, width: { xs: "100%", md: "auto" } }}>
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
                maiaLoading={nets.isLoading}
                openingLoading={openingLoading}
              />

              <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  disabled={!gameReview.length}
                  onClick={() => setSaveDialogOpen(true)}
                  fullWidth
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FullscreenIcon />}
                  onClick={() => setExpandOpen(true)}
                  fullWidth
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  Full Review
                </Button>
              </Stack>
            </Stack>

            {/* PGN move list beside board */}
            <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <PGNView
                moves={moves}
                moveAnalysis={gameReview}
                gamePgn={pgnText}
                goToMove={goToMove}
                gameResult={gameInfo.Result}
                currentMoveIndex={currentMoveIndex}
              />

              {/* Collapsible analysis preview */}
              {moves.length > 0 && (
                <Box mt={1}>
                  <Box
                    display="flex"
                    alignItems="center"
                    onClick={() => setAnalysisExpanded((v) => !v)}
                    sx={{
                      cursor: "pointer",
                      py: 0.75,
                      px: 1,
                      borderRadius: 1,
                      bgcolor: "action.hover",
                      userSelect: "none",
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} flex={1}>
                      Analysis preview
                    </Typography>
                    <IconButton size="small" tabIndex={-1}>
                      {analysisExpanded
                        ? <ExpandLessIcon fontSize="small" />
                        : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Collapse in={analysisExpanded}>
                    <Box mt={1}>
                      <AgineAnalysisView
                        activeAnalysisTab={activeAnalysisTab}
                        setActiveAnalysisTab={setActiveAnalysisTab}
                        isGameReviewMode={true}
                        stockfishAnalysisResult={stockfishAnalysisResult}
                        stockfishLoading={agine.stockfishLoading}
                        engineDepth={agine.engineDepth}
                        engineLines={agine.engineLines}
                        engine={engine}
                        Maiaerror={nets.Maiaerror}
                        isLoading={nets.isLoading}
                        evaluations={evaluations}
                        analyzeWithStockfish={analyzeWithStockfish}
                        formatEvaluation={agine.formatEvaluation}
                        fen={fen}
                        formatPrincipalVariation={agine.formatPrincipalVariation}
                        setEngineDepth={agine.setEngineDepth}
                        setEngineLines={agine.setEngineLines}
                        openingLoading={openingLoading}
                        openingData={agine.openingData}
                        lichessOpeningData={agine.lichessOpeningData}
                        lichessOpeningLoading={agine.lichessOpeningLoading}
                        chessdbdata={agine.chessdbdata}
                        queueing={agine.queueing}
                        error={agine.error}
                        lichessData={nets.lichessData}
                        loading={agine.loading}
                        refetch={agine.refetch}
                        requestAnalysis={agine.requestAnalysis}
                        moves={moves}
                        currentMoveIndex={currentMoveIndex}
                        goToMove={goToMove}
                        comment={comment}
                        gameInfo={gameInfo}
                        gameReviewTheme={gameReviewTheme}
                        generateGameReview={generateGameReview}
                        gameReviewLoading={agine.gameReviewLoading}
                        gameReviewProgress={agine.gameReviewProgress}
                        gameReview={gameReview}
                        pgnText={pgnText}
                        currentMove={moves[currentMoveIndex]}
                        Customfen={customPlayFen}
                        sanEvaluations={nets.sanEvaluations}
                        isInBook={nets.isInBook}
                        scores={agine.scores}
                        ThemeScoreerror={agine.themeScoreError}
                        ThemeScoreloading={agine.themeScoreLoading}
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* ── Full-screen expand dialog ── */}
      <Dialog
        open={expandOpen}
        onClose={() => setExpandOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: "background.default" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            py: 1.5,
            px: 2,
          }}
        >
          <Box flex={1} minWidth={0}>
            {caption && (
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {caption}
              </Typography>
            )}
            {(gameInfo.White || gameInfo.Black) && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                ♙ {gameInfo.White ?? "?"} vs ♟ {gameInfo.Black ?? "?"}
                {gameInfo.Result && ` · ${gameInfo.Result}`}
                {gameInfo.Opening && ` · ${gameInfo.Opening}`}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              disabled={!gameReview.length}
              onClick={() => setSaveDialogOpen(true)}
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Save Review
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => initFromPGN(pgnText, true)}
              disabled={agine.gameReviewLoading}
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Re-analyse
            </Button>
            {source.type === "lichessId" && (
              <Tooltip title="Open on Lichess">
                <IconButton
                  size="small"
                  component="a"
                  href={`https://lichess.org/${source.value}`}
                  target="_blank"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Close">
              <IconButton onClick={() => setExpandOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            p: { xs: 1.5, sm: 3 },
            overflowY: "auto",
          }}
        >
          <FullReviewContent
            {...sharedProps}
            isMobile={isMobile}
            analysisDrawerOpen={analysisDrawerOpen}
            setAnalysisDrawerOpen={setAnalysisDrawerOpen}
          />
        </DialogContent>
      </Dialog>

      {/* ── Save dialog ── */}
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