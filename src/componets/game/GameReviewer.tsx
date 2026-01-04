"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Drawer,
  Fab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Close as CloseIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import useAgine from "@/hooks/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import PGNView from "@/componets/tabs/PgnView";
import ResizableChapterSelector from "@/componets/tabs/ChaptersTab";
import { extractMovesWithComments } from "@/libs/game/helper";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import { useNets } from "@/hooks/useNets";
import { SavedGameReview } from "@/componets/game/SaveGameReviewDialog";
import { Chapter } from "@/componets/game/LoadStudy";
import { ParsedComment } from "@/componets/game/LoadLichessGameUrl";
import { useGameTheme } from "@/hooks/useGameTheme";

interface GameReviewViewerProps {
  savedGame: SavedGameReview;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function GameReviewViewer({
  savedGame,
  onClose,
  showCloseButton = false,
}: GameReviewViewerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [parsedMovesWithComments, setParsedMovesWithComments] = useState<
    ParsedComment[]
  >([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comment, setComment] = useState("");
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(0);
  const [gameReview, setGameReview] = useState<any[]>([]);
  const [startingFen, setStartingFen] = useState<string | undefined>();

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
    gameReviewProgress,
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
    generateGameReview
  } = useAgine(fen);

  const { analyzeGameTheme } = useGameTheme();

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

  // Extract starting FEN from PGN
  const extractStartingFen = (pgnText: string): string | undefined => {
    const fenMatch = pgnText.match(/\[FEN "([^"]+)"\]/);
    return fenMatch ? fenMatch[1] : undefined;
  };

  // Initialize game from saved data
  useEffect(() => {
    if (savedGame) {
      const startFen = extractStartingFen(savedGame.pgn);
      setStartingFen(startFen);

      setMoves(savedGame.moves);
      setGameInfo(savedGame.gameInfo);
      setGameReview(savedGame.gameReview);

      const parsed = extractMovesWithComments(savedGame.pgn);
      setParsedMovesWithComments(parsed);
      setCurrentMoveIndex(0);

      const resetGame = new Chess(startFen);
      setGame(resetGame);
      setFen(resetGame.fen());

     if(savedGame.gameReview.length === 0){
        generateGameReview(savedGame.moves, startingFen);
      }

      if(savedGame.gameReviewTheme === null){
        analyzeGameTheme(savedGame.moves, startingFen);
      }
      setComment("");
    }
  }, [savedGame]);

  // Keyboard navigation
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

  const goToMove = (index: number) => {
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
          evaluations={sanEvaluations}
          analyzeWithStockfish={analyzeWithStockfish}
          formatEvaluation={formatEvaluation}
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
          gameReviewTheme={savedGame.gameReviewTheme}
          generateGameReview={() => {}}
          gameReviewLoading={gameReviewLoading}
          gameReviewProgress={gameReviewProgress}
          handleGameReviewSummaryClick={handleGameReviewSummaryClick}
          handleMoveAnnontateClick={handleMoveAnnontateClick}
          handleMoveCoachClick={handleMoveCoachClick}
          gameReview={gameReview}
          pgnText={savedGame.pgn}
          currentMove={moves[currentMoveIndex]}
          fen={fen}
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
          onChapterSelect={(pgn) => {}}
        />
      )}
    </Stack>
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
      }}
    >
      {showCloseButton && onClose && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={onClose}
          >
            Close Review
          </Button>
        </Box>
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

            <Box sx={{ width: "100%", maxWidth: { xs: "100%", lg: "600px" } }}>
              <PGNView
                moves={moves}
                moveAnalysis={gameReview}
                onAnnotateMove={handleMovePGNAnnotateClick}
                gamePgn={savedGame.pgn}
                goToMove={goToMove}
                gameResult={gameInfo.Result}
                currentMoveIndex={currentMoveIndex}
              />
            </Box>
          </Stack>
        </Box>

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
      </Stack>
    </Box>
  );
}