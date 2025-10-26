import { useState } from "react";
import {
  Box,
  Stack,
  Tabs,
  Tab,
  Card,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Divider,
  ThemeProvider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";

import { darkGreyTheme, purpleTheme } from "@/theme/theme";
import StockfishAnalysisTab from "../tabs/StockfishTab";
import { TabPanel } from "../tabs/tab";
import GameInfoTab from "../tabs/GameInfoTab";
import OpeningExplorer from "../tabs/OpeningTab";
import ChessDBDisplay from "../tabs/Chessdb";
import LegalMoveTab from "../tabs/LegalMoveTab";
import ChatTab from "../tabs/ChatTab";
import { PositionEval, LineEval } from "@/stockfish/engine/engine";
import { MasterGames, Moves } from "@/libs/openingdatabase/helper";
import { CandidateMove, } from "../tabs/Chessdb";

import { ChatMessage } from "@/hooks/useAgine";
import { MoveAnalysis } from "@/hooks/useGameReview";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { GameReviewTheme } from "../tabs/GameReviewDialog";
import { PositionRadarAnalysis } from "../tabs/PositionRadarAnalysis";
import { PositionFenThemeAnalysis } from "../tabs/PositionalFenThemeAnalysis";


// Base interface for common analysis view props
interface BaseAnalysisViewProps {
  // Stockfish props
  stockfishAnalysisResult: PositionEval | null;
  stockfishLoading: boolean;
  handleEngineLineClick: (line: LineEval, lineIndex: number) => void;
  engineDepth: number;
  engineLines: number;
  engine: UciEngine | undefined;
  analyzeWithStockfish: () => Promise<void>;
  formatEvaluation: (line: LineEval) => string;
  formatPrincipalVariation: (pv: string[], startFen: string) => string;
  setEngineDepth: (depth: number) => void;
  setEngineLines: (lines: number) => void;
  fen?: string;

  // Opening Explorer props
  openingLoading: boolean;
  openingData: MasterGames | null;
  lichessOpeningData: MasterGames | null;
  lichessOpeningLoading: boolean;
  handleOpeningMoveClick: (move: Moves) => void;

  // ChessDB props
  chessdbdata: CandidateMove[] | null;
  handleMoveClick: (move: CandidateMove) => void;
  queueing: boolean;
  error: string | null | undefined;
  loading: boolean;
  refetch: () => void;
  requestAnalysis: () => void;

  // Legal Moves props
  legalMoves: string[];
  handleFutureMoveLegalClick: (move: string) => Promise<void>;

  // Chat props
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  sendChatMessage: (
    gameInfo?: string,
    currentMove?: string,
    puzzleMode?: boolean,
    puzzleQuery?: string,
    playMode?: boolean
  ) => Promise<void>;
  chatLoading: boolean;
  abortChatMessage: () => void;
  handleChatKeyPress: (e: React.KeyboardEvent) => void;
  clearChatHistory: () => void;
  sessionMode: boolean;
  setSessionMode: (mode: boolean) => void;

  // Common props
  llmLoading: boolean;
}

// Game Review specific props
interface GameReviewProps {
  moves?: string[];
  currentMoveIndex?: number;
  goToMove?: (index: number) => void;
  comment?: string;
  gameInfo?: Record<string, string>;
  gameReviewTheme: GameReviewTheme | null;
  generateGameReview?: (moves: string[]) => void;
  gameReviewLoading?: boolean;
  gameReviewProgress?: number;
  handleGameReviewSummaryClick?: (review: MoveAnalysis[], gameInfo: string) => Promise<void>;
  handleMoveAnnontateClick?: (review: MoveAnalysis, customQuery?: string) => Promise<void>;
  handleMoveCoachClick?: (review: MoveAnalysis) => void;
  gameReview?: MoveAnalysis[];
  pgnText?: string;
  currentMove?: string;
}

// Conditional type: if isGameReviewMode is true, require GameReviewProps


// Main interface that combines all props
interface AgineAnalysisViewProps extends GameReviewProps, BaseAnalysisViewProps {
    isGameReviewMode: boolean;
}

function AgineAnalysisView({
  // Stockfish props
  stockfishAnalysisResult,
  stockfishLoading,
  handleEngineLineClick,
  engineDepth,
  engineLines,
  engine,
  analyzeWithStockfish,
  formatEvaluation,
  formatPrincipalVariation,
  setEngineDepth,
  setEngineLines,
  fen,

  // Opening Explorer props
  openingLoading,
  openingData,
  lichessOpeningData,
  lichessOpeningLoading,
  handleOpeningMoveClick,

  // ChessDB props
  chessdbdata,
  handleMoveClick,
  queueing,
  error,
  loading,
  refetch,
  requestAnalysis,

  // Legal Moves props
  legalMoves,
  handleFutureMoveLegalClick,

  // Chat props
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  chatLoading,
  abortChatMessage,
  handleChatKeyPress,
  clearChatHistory,
  sessionMode,
  setSessionMode,

  // Common props
  llmLoading,

  // Game Review props (optional - only for game page)
  isGameReviewMode = false,
  moves,
  currentMoveIndex,
  goToMove,
  comment,
  gameInfo,
  gameReviewTheme,
  generateGameReview,
  gameReviewLoading,
  gameReviewProgress,
  handleGameReviewSummaryClick,
  handleMoveAnnontateClick,
  handleMoveCoachClick,
  gameReview,
  pgnText,
  currentMove,
}: AgineAnalysisViewProps) {
  const [analysisTab, setAnalysisTab] = useState<number>(0);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<number>(0);

  return (
    <Card
      sx={{
        backgroundColor: purpleTheme.background.paper,
        borderRadius: 3,
        boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
        minHeight: isGameReviewMode ? 500 : 600,
        maxHeight: isGameReviewMode ? "none" : "80vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          borderBottom: `1px solid ${purpleTheme.secondary}40`,
          px: 3,
          pt: 2,
        }}
      >
        <Tabs
          value={analysisTab}
          onChange={(_, newValue: number) => setAnalysisTab(newValue)}
          sx={{
            "& .MuiTab-root": {
              color: purpleTheme.text.secondary,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 500,
              minHeight: 48,
            },
            "& .Mui-selected": {
              color: `${purpleTheme.accent} !important`,
              fontWeight: 600,
            },
            "& .MuiTabs-indicator": {
              backgroundColor: purpleTheme.accent,
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          <Tab
            icon={<AnalyticsIcon />}
            iconPosition="start"
            label="Analysis"
          />
          <Tab icon={<ChatIcon />} iconPosition="start" label="AI Chat" />
        </Tabs>
      </Box>

      <Box
        sx={{
          p: 3,
          flex: 1,
          overflow: "auto",
        }}
      >
        <TabPanel value={analysisTab} index={0}>
          <Stack spacing={3}>
            {/* Game Review Section (only for game page) */}
            {isGameReviewMode && (
              <Accordion
                expanded={activeAnalysisTab === 0}
                onChange={() =>
                  setActiveAnalysisTab(activeAnalysisTab === 0 ? -1 : 0)
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:before": { display: "none" },
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                  }
                  sx={{
                    backgroundColor: purpleTheme.background.card,
                    "&:hover": {
                      backgroundColor: `${purpleTheme.secondary}20`,
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Game Review
                  </Typography>
                </AccordionSummary>
                <AccordionDetails
                  sx={{ backgroundColor: purpleTheme.background.paper }}
                >
                  <GameInfoTab
                    moves={moves!}
                    currentMoveIndex={currentMoveIndex!}
                    goToMove={goToMove!}
                    comment={comment!}
                    gameInfo={gameInfo!}
                    gameReviewTheme={gameReviewTheme!}
                    generateGameReview={generateGameReview!}
                    gameReviewLoading={gameReviewLoading!}
                    gameReviewProgress={gameReviewProgress!}
                    handleGameReviewClick={handleGameReviewSummaryClick!}
                    handleMoveAnnontateClick={handleMoveAnnontateClick!}
                    handleMoveCoachClick={handleMoveCoachClick!}
                    chatLoading={chatLoading}
                    gameReview={gameReview!}
                  />
                  <Divider/>
                </AccordionDetails>
              </Accordion>
            )}

            {isGameReviewMode ? (
              <Accordion
                expanded={activeAnalysisTab === 1}
                onChange={() =>
                  setActiveAnalysisTab(activeAnalysisTab === 1 ? -1 : 1)
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:before": { display: "none" },
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Position Theme Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {gameReviewTheme !== null &&
                    gameReview !== undefined &&
                    currentMoveIndex !== undefined && (
                      <ThemeProvider theme={darkGreyTheme}>
                        <PositionRadarAnalysis
                          moveAnalysis={gameReview}
                          currentMoveIndex={currentMoveIndex}
                          gameReview={gameReviewTheme}
                        />
                      </ThemeProvider>
                    )}
                </AccordionDetails>
              </Accordion>
            ) : (
              <Accordion
                expanded={activeAnalysisTab === 1}
                onChange={() =>
                  setActiveAnalysisTab(activeAnalysisTab === 1 ? -1 : 1)
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:before": { display: "none" },
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Position Theme Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Replace with your actual FEN value */}
                  <ThemeProvider theme={darkGreyTheme}>
                    <PositionFenThemeAnalysis fen={fen ?? ""} />
                  </ThemeProvider>
                </AccordionDetails>
              </Accordion>
            )}


            {/* Stockfish Analysis */}
            <Accordion
              expanded={activeAnalysisTab === (isGameReviewMode ? 1 : 0)}
              onChange={() =>
                setActiveAnalysisTab(
                  activeAnalysisTab === (isGameReviewMode ? 1 : 0)
                    ? -1
                    : isGameReviewMode
                    ? 1
                    : 0
                )
              }
              sx={{
                backgroundColor: purpleTheme.background.card,
                "&:before": { display: "none" },
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Stockfish Analysis
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{ backgroundColor: purpleTheme.background.paper }}
              >
                <StockfishAnalysisTab
                  stockfishAnalysisResult={stockfishAnalysisResult}
                  stockfishLoading={stockfishLoading}
                  handleEngineLineClick={handleEngineLineClick}
                  engineDepth={engineDepth}
                  engineLines={engineLines}
                  engine={engine}
                  llmLoading={llmLoading}
                  analyzeWithStockfish={analyzeWithStockfish}
                  formatEvaluation={formatEvaluation}
                  formatPrincipalVariation={formatPrincipalVariation}
                  setEngineDepth={setEngineDepth}
                  setEngineLines={setEngineLines}
                />
              </AccordionDetails>
            </Accordion>

            {/* Opening Explorer */}
            <Accordion
              expanded={activeAnalysisTab === (isGameReviewMode ? 2 : 1)}
              onChange={() =>
                setActiveAnalysisTab(
                  activeAnalysisTab === (isGameReviewMode ? 2 : 1)
                    ? -1
                    : isGameReviewMode
                    ? 2
                    : 1
                )
              }
              sx={{
                backgroundColor: purpleTheme.background.card,
                "&:before": { display: "none" },
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Opening Explorer
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{ backgroundColor: purpleTheme.background.paper }}
              >
                <OpeningExplorer
                  openingLoading={openingLoading}
                  openingData={openingData}
                  lichessOpeningData={lichessOpeningData}
                  lichessOpeningLoading={lichessOpeningLoading}
                  llmLoading={llmLoading}
                  handleOpeningMoveClick={handleOpeningMoveClick}
                />
              </AccordionDetails>
            </Accordion>

            {/* ChessDB */}
            <Accordion
              expanded={activeAnalysisTab === (isGameReviewMode ? 3 : 2)}
              onChange={() =>
                setActiveAnalysisTab(
                  activeAnalysisTab === (isGameReviewMode ? 3 : 2)
                    ? -1
                    : isGameReviewMode
                    ? 3
                    : 2
                )
              }
              sx={{
                backgroundColor: purpleTheme.background.card,
                "&:before": { display: "none" },
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Chess Database
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{ backgroundColor: purpleTheme.background.paper }}
              >
                <ChessDBDisplay
                  data={chessdbdata}
                  analyzeMove={handleMoveClick}
                  queueing={queueing}
                  error={error}
                  loading={loading}
                  onRefresh={refetch}
                  onRequestAnalysis={requestAnalysis}
                />
              </AccordionDetails>
            </Accordion>

            {/* Legal Move Analysis */}
            <Accordion
              expanded={activeAnalysisTab === (isGameReviewMode ? 4 : 3)}
              onChange={() =>
                setActiveAnalysisTab(
                  activeAnalysisTab === (isGameReviewMode ? 4 : 3)
                    ? -1
                    : isGameReviewMode
                    ? 4
                    : 3
                )
              }
              sx={{
                backgroundColor: purpleTheme.background.card,
                "&:before": { display: "none" },
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    Legal Move Analysis
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{ backgroundColor: purpleTheme.background.paper }}
              >
                <LegalMoveTab
                  legalMoves={legalMoves}
                  handleFutureMoveLegalClick={handleFutureMoveLegalClick}
                />
              </AccordionDetails>
            </Accordion>
          </Stack>
        </TabPanel>

        <TabPanel value={analysisTab} index={1}>
          <ChatTab
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChatMessage={sendChatMessage}
            chatLoading={chatLoading}
            abortChatMessage={abortChatMessage}
            puzzleMode={false}
            handleChatKeyPress={handleChatKeyPress}
            clearChatHistory={clearChatHistory}
            sessionMode={sessionMode}
            setSessionMode={setSessionMode}
            gameInfo={pgnText}
            currentMove={currentMove}
          />
        </TabPanel>
      </Box>
    </Card>
  );
}

export default AgineAnalysisView;
