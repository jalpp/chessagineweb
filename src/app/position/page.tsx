"use client";

import { useState } from "react";
import { Box, Stack } from "@mui/material";
import { Chess } from "chess.js";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/hooks/useAgine";
import { useSession } from "@clerk/nextjs";
import Loader from "@/componets/loading/Loader";
import Warning from "@/componets/loading/SignUpWarning";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";

export default function PositionPage() {
  const session = useSession();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());

  const {
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    openingLoading,
    legalMoves,
    handleFutureMoveLegalClick,
    moveSquares,
    setMoveSquares,
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    sessionMode,
    lichessOpeningData,
    lichessOpeningLoading,
    setSessionMode,
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,
    fetchOpeningData,
    sendChatMessage,
    handleChatKeyPress,
    clearChatHistory,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    handleEngineLineClick,
    abortChatMessage,
    handleOpeningMoveClick,
    handleMoveClick,
    chessdbdata,
    loading,
    queueing,
    error,
    refetch,
    requestAnalysis,
    evaluations,
    sanEvaluations,
    maiaError,
    maiaIsLoading,
    scores,
    themeScoreLoading,
    themeScoreError
  } = useAgine(fen);

  if (!session.isLoaded) {
    return <Loader />;
  }

  if (!session.isSignedIn) {
    return <Warning />;
  }

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 4 }, 
        minHeight: "100vh",
      }}
    >
      <Stack 
        direction={{ xs: "column", lg: "row" }} 
        spacing={{ xs: 2, sm: 3, md: 4 }}
        sx={{
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden' 
        }}
      >
        {/* Chessboard Section */}
        <Box 
          sx={{ 
            flex: { xs: "1 1 auto", lg: "0 0 auto" },
            width: { xs: '100%', lg: 'auto' },
            maxWidth: '100%',
            display: 'flex',
            justifyContent: { xs: 'center', lg: 'flex-start' },
            px: { xs: 0, sm: 1 }
          }}
        >
          <AiChessboardPanel
            game={game}
            fen={fen}
            moveSquares={moveSquares}
            setMoveSquares={setMoveSquares}
            engine={engine}
            setFen={setFen}
            setGame={setGame}
            setLlmAnalysisResult={setLlmAnalysisResult}
            setOpeningData={setOpeningData}
            evaluations={evaluations}
            setStockfishAnalysisResult={setStockfishAnalysisResult}
            fetchOpeningData={fetchOpeningData}
            analyzeWithStockfish={analyzeWithStockfish}
            llmLoading={llmLoading}
            stockfishLoading={stockfishLoading}
            stockfishAnalysisResult={stockfishAnalysisResult}
            openingLoading={openingLoading}
          />
        </Box>

        {/* Analysis Section */}
        <Box 
          sx={{ 
            flex: 1,
            width: { xs: '100%', lg: 'auto' },
            maxWidth: '100%',
            minWidth: 0 // Important for flex child overflow
          }}
        >
          <AgineAnalysisView
            isGameReviewMode={false}
            stockfishAnalysisResult={stockfishAnalysisResult}
            stockfishLoading={stockfishLoading}
            handleEngineLineClick={handleEngineLineClick}
            engineDepth={engineDepth}
            fen={fen}
            engineLines={engineLines}
            engine={engine}
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
            gameReviewTheme={null}
            setSessionMode={setSessionMode}
            llmLoading={llmLoading}
            evaluations={sanEvaluations}
            isMaiaLoading={maiaIsLoading}
            maiaerror={maiaError}
            scores={scores}
            ThemeScoreerror={themeScoreError}
            ThemeScoreloading={themeScoreLoading}
          />
        </Box>
      </Stack>
    </Box>
  );
}