"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  Drawer,
  Fab,
  useMediaQuery,
  useTheme,
  Typography,
  Button,
} from "@mui/material";
import {
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/hooks/useAgine";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import { useNets } from "@/hooks/useNets";
import { useSessionStorage } from "usehooks-ts";

export default function PositionPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());

  const {
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    openingLoading,
    moveSquares,
    setMoveSquares,
    lichessOpeningData,
    lichessOpeningLoading,
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,
    fetchOpeningData,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    chessdbdata,
    loading,
    queueing,
    error,
    refetch,
    requestAnalysis,
    scores,
    themeScoreLoading,
    themeScoreError,
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

  const [activeAnalysisTab, setActiveAnalysisTab] = useSessionStorage(
    "agine_position_act_tab",
    0,
  );

  const AnalysisContent = () => (
    <AgineAnalysisView
      activeAnalysisTab={activeAnalysisTab}
      setActiveAnalysisTab={setActiveAnalysisTab}
      isGameReviewMode={false}
      fen={fen}
      stockfishAnalysisResult={stockfishAnalysisResult}
      stockfishLoading={stockfishLoading}
      lichessData={lichessData}
      isInBook={isInBook}
      sanEvaluations={sanEvaluations}
      engineLines={engineLines}
      engine={engine}
      engineDepth={engineDepth}
      chessdbdata={chessdbdata}
      analyzeWithStockfish={analyzeWithStockfish}
      formatEvaluation={formatEvaluation}
      formatPrincipalVariation={formatPrincipalVariation}
      setEngineDepth={setEngineDepth}
      setEngineLines={setEngineLines}
      openingLoading={openingLoading}
      openingData={openingData}
      lichessOpeningData={lichessOpeningData}
      lichessOpeningLoading={lichessOpeningLoading}
      queueing={queueing}
      error={error}
      loading={loading}
      refetch={refetch}
      requestAnalysis={requestAnalysis}
      gameReviewTheme={null}
      evaluations={evaluations}
      isLoading={maiaIsLoading}
      Maiaerror={maiaError}
      scores={scores}
      ThemeScoreerror={themeScoreError}
      ThemeScoreloading={themeScoreLoading}
    />
  );

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 4 },
        minHeight: "100vh",
        height: "100%",
        overflowY: "auto",
        overflowX: "auto",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 2, sm: 3, md: 4 }}
        sx={{
          width: "100%",
          maxWidth: "100%",
          overflow: "visible",
        }}
      >
        {/* Chessboard Section */}
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
            setMoveSquares={setMoveSquares}
            engine={engine}
            setFen={setFen}
            setGame={setGame}
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
      </Stack>
    </Box>
  );
}
