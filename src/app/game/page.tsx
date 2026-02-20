"use client";
import { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import useAgine from "@/hooks/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import UserGameSelect from "@/componets/lichess/UserGameSelect";
import UserPGNUploader from "@/componets/game/UserPGNUpload";
import PGNView from "@/componets/tabs/PgnView";
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

export default function PGNUploaderPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);

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

  // Multi-game navigation state
  const [multiGameList, setMultiGameList] = useState<ParsedPGN[]>([]);
  const [currentGameHash, setCurrentGameHash] = useState<string>("");

  // Game review history state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

   const [gameReviewHistory] = useLocalStorage<
      SavedGameReview[]
    >("chess-game-review-history", []);
  



  const {
    setLlmAnalysisResult,
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
    sendChatMessage,
    handleMoveAnnontateClick,
    handleChatKeyPress,
    setMoveSquares,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    handleEngineLineClick,
    handleOpeningMoveClick,
    handleMoveClick,
    abortChatMessage,
    handleMoveCoachClick,
    handleGameReviewSummaryClick,
    handleMovePGNAnnotateClick,
    chessdbdata,
    loading,
    queueing,
    error,
    refetch,
    requestAnalysis,
    legalMoves,
    handleFutureMoveLegalClick,
    setRootCurrentMove,
    scores,
    themeScoreError,
    themeScoreLoading,
  } = useAgine(fen);

  const {
    evaluations,
    sanEvaluations,
    isLoading: maiaIsLoading,
    Maiaerror: maiaError,
    lichessData,
    isInBook,
  } = useNets({
    fen: fen,
  });

    useEffect(() => {
    console.log("found game id")
    const loadGameId = sessionStorage.getItem("loadGameId");
    console.log(loadGameId)
    if (loadGameId) {
      // Clear the flag immediately
      sessionStorage.removeItem("loadGameId");
      
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        const savedGame = gameReviewHistory.find((g) => g.id === loadGameId);
        console.log("saving");
        if (savedGame) {
          loadFromHistory(savedGame);
        }
      }, 100);
    }
  }, []);

  const [activeAnalysisTab, setActiveAnalysisTab] = useSessionStorage(
    "agine_game_act_tab",
    0
  );

  const { gameReviewTheme, analyzeGameTheme } = useGameTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentMoveIndex > 0) {
        goToMove(currentMoveIndex - 1);
      }
      if (e.key === "ArrowRight" && currentMoveIndex < moves.length) {
        goToMove(currentMoveIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIndex, moves]);

  const saveGameReview = () => {
    if (!gameReview.length) {
      alert("No game review to save. Please generate a review first.");
      return;
    }
    setSaveDialogOpen(true);
  };

  // ==================== HELPER FUNCTIONS ====================

  const cleanPGN = (pgnText: string): string => {
    const lines = pgnText.split("\n");
    const headers: string[] = [];
    const moveLines: string[] = [];

    // Separate headers from moves
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        headers.push(trimmedLine);
      } else if (trimmedLine !== "" && !trimmedLine.startsWith("[")) {
        moveLines.push(trimmedLine);
      }
    }

    // Clean the move text (remove comments, normalize spacing)
    let movesText = moveLines.join(" ");
    movesText = movesText.replace(/\{[^}]*\}/g, ""); // Remove comments
    movesText = movesText.replace(/\([^)]*\)/g, ""); // Remove variations
    movesText = movesText.replace(/\s+/g, " "); // Normalize whitespace
    movesText = movesText.trim();

    // Reconstruct PGN: headers, blank line, then moves
    if (headers.length > 0) {
      return headers.join("\n") + "\n\n" + movesText;
    }
    return movesText;
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

    // Extract just the moves (without headers)
    const pgnWithoutHeaders = cleanedPGN
      .split("\n")
      .filter((line) => !line.trim().startsWith("["))
      .join(" ")
      .trim();

    if (startingFen && pgnWithoutHeaders) {
      // Manual move parsing for custom positions
      const moveText = pgnWithoutHeaders
        .replace(/\d+\./g, "") // Remove move numbers
        .replace(/\{[^}]*\}/g, "") // Remove comments
        .replace(/\([^)]*\)/g, "") // Remove variations
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "") // Remove result
        .replace(/White resigned.*?!/g, "")
        .replace(/Black resigned.*?!/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const moves = moveText.split(/\s+/).filter((m) => m.length > 0);

      for (const move of moves) {
        try {
          tempGame.move(move);
        } catch (e) {
          console.error(`Failed to play move: ${move}`, e);
          throw new Error(`Invalid move: ${move}`);
        }
      }
    } else if (!startingFen && pgnWithoutHeaders) {
      // Standard position - use loadPgn
      tempGame.loadPgn(pgnWithoutHeaders);
    }

    return { game: tempGame, moveList: tempGame.history() };
  };

  const initializeGameState = (
    pgn: string,
    startingFen?: string,
    moveList?: string[]
  ) => {
    const parsed = extractMovesWithComments(pgn);
    const info = extractGameInfo(pgn);

    setMoves(moveList || []);
    setParsedMovesWithComments(parsed);
    setGameInfo(info);
    setCurrentMoveIndex(0);

    const resetGame = new Chess(startingFen);
    setGame(resetGame);
    setFen(resetGame.fen());
    setLlmAnalysisResult(null);
    setComment("");
    setGameReview([]);
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
      console.error("Error loading PGN:", err);
      console.error("PGN text:", pgnText);
      alert(
        `Invalid PGN input: ${err instanceof Error ? err.message : "Unknown error"}`
      );
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

      if (gameHash) {
        setCurrentGameHash(gameHash);
      }

      generateGameReview(moveList, startingFen);
      analyzeGameTheme(moveList, startingFen);
      setInputsVisible(false);
    } catch (err) {
      console.error("Error loading user PGN:", err);
      console.error("PGN text:", pgn);
      alert(
        `Invalid PGN input: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setInputsVisible(false);
    }
  };

  const loadFromHistory = (savedGame: SavedGameReview) => {
  try {
    console.log(savedGame);
    
    const cleanPgn = cleanPGN(savedGame.pgn);
    console.log(cleanPgn);
    const startingFen = extractStartingFen(cleanPgn);
    console.log(startingFen);

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
    setLlmAnalysisResult(null);
    setComment("");

    setHistoryDialogOpen(false);
    setInputsVisible(false);
  } catch (err) {
    console.error("Error loading game from history:", err);
    alert("Error loading saved game");
  }
};

  const goToMove = (index: number) => {
    const startingFen = extractStartingFen(pgnText);
    const tempGame = new Chess(startingFen);

    for (let i = 0; i < index; i++) {
      tempGame.move(moves[i]);
    }

    setGame(tempGame);
    setFen(tempGame.fen());
    setCurrentMoveIndex(index);
    setRootCurrentMove(index);
    setComment(parsedMovesWithComments[index - 1]?.comment || "");
    setLlmAnalysisResult(null);
    setStockfishAnalysisResult(null);
  };

  const handleMultiGameSelect = (game: ParsedPGN) => {
    loadUserPGN(game.pgn, game.hash);
  };

  const AnalysisContent = () => (
    <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
      {moves.length > 0 && (
      <AgineAnalysisView
        activeAnalysisTab={activeAnalysisTab}
        setActiveAnalysisTab={setActiveAnalysisTab}
        isGameReviewMode={true}
        stockfishAnalysisResult={stockfishAnalysisResult}
        stockfishLoading={stockfishLoading}
        handleEngineLineClick={handleEngineLineClick}
        engineDepth={engineDepth}
        engineLines={engineLines}
        sendChatMessage={sendChatMessage}
        abortChatMessage={abortChatMessage}
        handleChatKeyPress={handleChatKeyPress}
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
        handleOpeningMoveClick={handleOpeningMoveClick}
        chessdbdata={chessdbdata}
        handleMoveClick={handleMoveClick}
        queueing={queueing}
        error={error}
        lichessData={lichessData}
        loading={loading}
        refetch={refetch}
        requestAnalysis={requestAnalysis}
        legalMoves={legalMoves}
        handleFutureMoveLegalClick={handleFutureMoveLegalClick}
        llmLoading={llmLoading}
        moves={moves}
        currentMoveIndex={currentMoveIndex}
        goToMove={goToMove}
        comment={comment}
        gameInfo={gameInfo}
        gameReviewTheme={gameReviewTheme}
        generateGameReview={generateGameReview}
        gameReviewLoading={gameReviewLoading}
        gameReviewProgress={gameReviewProgress}
        handleGameReviewSummaryClick={handleGameReviewSummaryClick}
        handleMoveAnnontateClick={handleMoveAnnontateClick}
        handleMoveCoachClick={handleMoveCoachClick}
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
      )}
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
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        p: { xs: 1, sm: 2, md: 4 },
      }}
    >
      {inputsVisible && (
        <Card
          sx={{
            mb: { xs: 2, sm: 3, md: 4 },
            borderRadius: { xs: 2, md: 3 },
            boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
            maxHeight: { xs: "70vh", sm: "75vh", md: "80vh" },
            overflowY: "auto",
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ textAlign: "center", mb: { xs: 2, sm: 3, md: 4 } }}>
              <Typography
                variant="h3"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Chess Analysis with Agine
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" },
                  maxWidth: 600,
                  mx: "auto",
                  px: { xs: 2, sm: 0 },
                }}
              >
                Get detailed AI insights on your games! Paste your PGN, Lichess
                game URL, or study URL to begin analysis.
              </Typography>
            </Box>

            <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
              <GamereviewHistory setHistoryDialogOpen={setHistoryDialogOpen} />

              <LoadStudy
                setChapters={setChapters}
                setInputsVisible={setInputsVisible}
              />

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
                setLlmAnalysisResult={setLlmAnalysisResult}
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
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontSize: { xs: "1rem", sm: "1.15rem", md: "1.25rem" },
                  }}
                >
                  Your Lichess Games
                </Typography>
                <UserGameSelect loadPGN={loadUserPGN} />
                <Box sx={{ mt: 2 }}>
                  <UserPGNUploader
                    loadPGN={(pgn) => loadUserPGN(pgn)}
                    setMultiGameList={setMultiGameList}
                  />
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 2, sm: 3, md: 4 }}
        sx={{
          width: "100%",
          maxWidth: "100%",
          overflow: "visible",
        }}
      >
        {!inputsVisible && (
          <Box
            sx={{
              flex: { xs: "1 1 auto", lg: "0 0 auto" },
              width: { xs: "100%", lg: "auto" },
              maxWidth: "100%",
            }}
          >
            <Stack
              spacing={{ xs: 2, sm: 2.5, md: 3 }}
              alignItems="center"
              sx={{
                width: "100%",
                px: { xs: 0, sm: 1 },
              }}
            >
              <Box
                sx={{
                  flex: { xs: "1 1 auto", lg: "0 0 auto" },
                  width: { xs: "100%", lg: "auto" },
                  maxWidth: "100%",
                  display: "flex",
                  justifyContent: { xs: "center", lg: "flex-start" },
                  px: { xs: 0, sm: 1 },
                }}
              >
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
                  setLlmAnalysisResult={setLlmAnalysisResult}
                  setOpeningData={setOpeningData}
                  setStockfishAnalysisResult={setStockfishAnalysisResult}
                  stockfishAnalysisResult={stockfishAnalysisResult}
                  fetchOpeningData={fetchOpeningData}
                  analyzeWithStockfish={analyzeWithStockfish}
                  llmLoading={llmLoading}
                  stockfishLoading={stockfishLoading}
                  openingLoading={openingLoading}
                />
              </Box>

              <Box
                sx={{ width: "100%", maxWidth: { xs: "100%", lg: "600px" } }}
              >
                <PGNView
                  moves={moves}
                  moveAnalysis={gameReview}
                  onAnnotateMove={handleMovePGNAnnotateClick}
                  gamePgn={pgnText}
                  goToMove={goToMove}
                  gameResult={gameInfo.Result}
                  currentMoveIndex={currentMoveIndex}
                />
              </Box>

              {multiGameList.length > 1 && (
                <MultiGameNavigator
                  games={multiGameList}
                  currentGameHash={currentGameHash}
                  onGameSelect={handleMultiGameSelect}
                />
              )}

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  width: "100%",
                  maxWidth: { xs: "100%", lg: "600px" },
                  px: { xs: 2, sm: 0 },
                }}
              >
                <Button
                  variant="contained"
                  onClick={saveGameReview}
                  startIcon={<SaveIcon />}
                  disabled={!gameReview.length}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: { xs: 1.25, sm: 1.5 },
                    fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                    textTransform: "none",
                  }}
                >
                  Save Game
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => {
                    setInputsVisible(true);
                    setMoves([]);
                    setPgnText("");
                    setGameInfo({});
                    setLlmAnalysisResult(null);
                    setComment("");
                    setMultiGameList([]);
                    setGameReview([]);
                    setCurrentGameHash("");
                    const reset = new Chess();
                    setGame(reset);
                    setFen(reset.fen());
                  }}
                  startIcon={<RefreshIcon />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: { xs: 1.25, sm: 1.5 },
                    fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                    textTransform: "none",
                  }}
                >
                  Load New Game
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {!inputsVisible && (
          <>
            {/* Desktop Analysis View */}
            {!isMobile && (
              <Box
                sx={{
                  flex: 1,
                  width: { xs: "100%", lg: "auto" },
                  maxWidth: "100%",
                  minWidth: 0,
                  overflowY: "auto",
                  maxHeight: "calc(100vh - 100px)",
                }}
              >
                <AnalysisContent />
              </Box>
            )}

            {/* Mobile Floating Action Button */}
            {isMobile && (
              <Fab
                color="primary"
                aria-label="analysis"
                onClick={() => setAnalysisDrawerOpen(true)}
                sx={{
                  position: "fixed",
                  bottom: 24,
                  right: 24,
                  zIndex: 1000,
                }}
              >
                <AnalyticsIcon />
              </Fab>
            )}

            {/* Mobile Analysis Drawer */}
            <Drawer
              anchor="bottom"
              open={analysisDrawerOpen}
              onClose={() => setAnalysisDrawerOpen(false)}
              sx={{
                "& .MuiDrawer-paper": {
                  height: "85vh",
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  overflow: "hidden",
                },
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Drawer Header */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    Analysis
                  </Typography>
                  <Button
                    onClick={() => setAnalysisDrawerOpen(false)}
                    startIcon={<CloseIcon />}
                    size="small"
                  >
                    Close
                  </Button>
                </Box>

                {/* Drawer Content */}
                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    p: 2,
                  }}
                >
                  <AnalysisContent />
                </Box>
              </Box>
            </Drawer>
          </>
        )}
      </Stack>

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
