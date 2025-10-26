"use client";

import { useState } from "react";
import { Box, Stack } from "@mui/material";
import { Chess } from "chess.js";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/hooks/useAgine";
import { useSession } from "@clerk/nextjs";
import { purpleTheme } from "@/theme/theme";
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
        p: 4,
        backgroundColor: purpleTheme.background.main,
        minHeight: "100vh",
      }}
    >
      <Stack direction={{ xs: "column", lg: "row" }} spacing={4}>
        {/* Chessboard Section */}
        <Box sx={{ flex: "0 0 auto" }}>
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
            setStockfishAnalysisResult={setStockfishAnalysisResult}
            fetchOpeningData={fetchOpeningData}
            analyzeWithStockfish={analyzeWithStockfish}
            llmLoading={llmLoading}
            stockfishLoading={stockfishLoading}
            stockfishAnalysisResult={stockfishAnalysisResult}
            openingLoading={openingLoading}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
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
          />
        </Box>
      </Stack>
    </Box>
  );
}
