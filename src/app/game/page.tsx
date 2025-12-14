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
} from "@mui/material";
import { Refresh as RefreshIcon, Save as SaveIcon } from "@mui/icons-material";
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
import MultiGameNavigator, { ParsedPGN } from "@/componets/game/MultiGameNavigator";

export default function PGNUploaderPage() {

  const [pgnText, setPgnText] = useState("");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [parsedMovesWithComments, setParsedMovesWithComments] = useState<
    ParsedComment[]
  >([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  const [inputsVisible, setInputsVisible] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comment, setComment] = useState("");
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});

  // Multi-game navigation state
  const [multiGameList, setMultiGameList] = useState<ParsedPGN[]>([]);
  const [currentGameHash, setCurrentGameHash] = useState<string>("");

  // Game review history state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

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
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    sessionMode,
    setSessionMode,
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
    clearChatHistory,
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
    evaluations,
    sanEvaluations,
    maiaError,
    maiaIsLoading,
    scores,
    themeScoreError,
    themeScoreLoading
  } = useAgine(fen);

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

  const loadFromHistory = (savedGame: SavedGameReview) => {
    try {
      setPgnText(savedGame.pgn);
      setMoves(savedGame.moves);
      setGameInfo(savedGame.gameInfo);
      setGameReview(savedGame.gameReview);

      const parsed = extractMovesWithComments(savedGame.pgn);
      setParsedMovesWithComments(parsed);
      setCurrentMoveIndex(0);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setLlmAnalysisResult(null);
      setComment("");

      setHistoryDialogOpen(false);
      setInputsVisible(false);
    } catch (err) {
      console.error("Error loading game from history:", err);
      alert("Error loading saved game");
    }
  };

  // Function to clean PGN by removing advanced annotations
  const cleanPGN = (pgnText: string) => {
    let cleaned = pgnText;

    // Remove all content within curly braces (annotations like {[%clk 1:00:00]})
    cleaned = cleaned.replace(/\{[^}]*\}/g, "");

    // Remove extra whitespace that might be left behind
    cleaned = cleaned.replace(/\s+/g, " ");

    // Clean up any double spaces around moves
    cleaned = cleaned.replace(/\s+(\d+\.)/g, " $1");

    // Remove any trailing whitespace from lines
    cleaned = cleaned
      .split("\n")
      .map((line: string) => line.trim())
      .join("\n");

    // Remove empty lines between moves (but keep header spacing)
    const lines = cleaned.split("\n");
    let inHeader = true;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we're still in the header section
      if (line.startsWith("[") && line.endsWith("]")) {
        result.push(line);
        inHeader = true;
      } else if (line.trim() === "" && inHeader) {
        // Keep empty lines in header section
        result.push(line);
      } else if (line.trim() !== "") {
        // We're in the moves section now
        inHeader = false;
        result.push(line);
      }
      // Skip empty lines in moves section
    }

    return result.join("\n").trim();
  };

  const loadPGN = () => {
    try {
      const tempGame = new Chess();
      const cleanedPGN = cleanPGN(pgnText);
      tempGame.loadPgn(cleanedPGN);
      const moveList = tempGame.history();
      const parsed = extractMovesWithComments(pgnText);
      const info = extractGameInfo(pgnText);

      setMoves(moveList);
      setParsedMovesWithComments(parsed);
      setGameInfo(info);
      setCurrentMoveIndex(0);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setLlmAnalysisResult(null);
      setComment("");
      setGameReview([]);
      generateGameReview(moveList);
      analyzeGameTheme(cleanedPGN);
    } catch (err) {
      console.log(err);
      alert("Invalid PGN input");
    }
  };

  const loadUserPGN = (pgn: string, gameHash?: string) => {
    try {
      const tempGame = new Chess();
      const cleanPgn = cleanPGN(pgn);
      tempGame.loadPgn(cleanPgn);
      const moveList = tempGame.history();
      const parsed = extractMovesWithComments(pgn);
      const info = extractGameInfo(pgn);
      setMoves(moveList);
      setParsedMovesWithComments(parsed);
      setGameInfo(info);
      setCurrentMoveIndex(0);
      setPgnText(pgn);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setLlmAnalysisResult(null);
      setComment("");
      setGameReview([]);
      
      // Set current game hash if provided
      if (gameHash) {
        setCurrentGameHash(gameHash);
      }
      
      generateGameReview(moveList);
      analyzeGameTheme(cleanPgn);
      setInputsVisible(false);
    } catch (err) {
      console.log(err);
      alert("Invalid PGN input");
    }
  };

  // Handler for multi-game navigation
  const handleMultiGameSelect = (game: ParsedPGN) => {
    loadUserPGN(game.pgn, game.hash);
  };

  const goToMove = (index: number) => {
    const tempGame = new Chess();
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

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 4 },
   
      }}
    >
      {inputsVisible && (
        <Card
          sx={{
            mb: { xs: 2, sm: 3, md: 4 },
            borderRadius: { xs: 2, md: 3 },
            boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
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
          overflow: "hidden",
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

              {/* Multi-Game Navigator */}
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
          <Box
            sx={{
              flex: 1,
              width: { xs: "100%", lg: "auto" },
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
              {moves.length > 0 && (
                <AgineAnalysisView
                  isGameReviewMode={true}
                  stockfishAnalysisResult={stockfishAnalysisResult}
                  stockfishLoading={stockfishLoading}
                  handleEngineLineClick={handleEngineLineClick}
                  engineDepth={engineDepth}
                  engineLines={engineLines}
                  engine={engine}
                  maiaerror={maiaError}
                  isMaiaLoading={maiaIsLoading}
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
                  loading={loading}
                  refetch={refetch}
                  requestAnalysis={requestAnalysis}
                  legalMoves={legalMoves}
                  handleFutureMoveLegalClick={handleFutureMoveLegalClick}
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  sendChatMessage={sendChatMessage}
                  chatLoading={chatLoading}
                  abortChatMessage={abortChatMessage}
                  handleChatKeyPress={handleChatKeyPress}
                  clearChatHistory={clearChatHistory}
                  sessionMode={sessionMode}
                  setSessionMode={setSessionMode}
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
                  fen={fen}
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
          </Box>
        )}
      </Stack>

      <SaveGameReviewDialog
        saveDialogOpen={saveDialogOpen}
        setSaveDialogOpen={setSaveDialogOpen}
        historyDialogOpen={historyDialogOpen}
        setHistoryDialogOpen={setHistoryDialogOpen}
        gameInfo={gameInfo}
        gameReviewTheme={gameReviewTheme!}
        gameReview={gameReview}
        moves={moves}
        pgnText={pgnText}
        loadFromHistory={loadFromHistory}
      />
    </Box>
  );
}