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
  useMediaQuery,
  useTheme,
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
import { CandidateMove } from "../tabs/Chessdb";
import { ChatMessage } from "@/libs/agine/helper";
import { MoveAnalysis } from "@/hooks/useGameReview";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { GameReviewTheme } from "@/libs/themes/helper";
import { PositionRadarAnalysis } from "../tabs/PositionRadarAnalysis";
import { PositionFenThemeAnalysis } from "../tabs/PositionalFenThemeAnalysis";

// Base interface for common analysis view props
interface BaseAnalysisViewProps {
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
  openingLoading: boolean;
  openingData: MasterGames | null;
  lichessOpeningData: MasterGames | null;
  lichessOpeningLoading: boolean;
  handleOpeningMoveClick: (move: Moves) => void;
  chessdbdata: CandidateMove[] | null;
  handleMoveClick: (move: CandidateMove) => void;
  queueing: boolean;
  error: string | null | undefined;
  loading: boolean;
  refetch: () => void;
  requestAnalysis: () => void;
  legalMoves: string[];
  handleFutureMoveLegalClick: (move: string) => Promise<void>;
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

// Main interface that combines all props
interface AgineAnalysisViewProps extends GameReviewProps, BaseAnalysisViewProps {
  isGameReviewMode: boolean;
}

function AgineAnalysisView({
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
  openingLoading,
  openingData,
  lichessOpeningData,
  lichessOpeningLoading,
  handleOpeningMoveClick,
  chessdbdata,
  handleMoveClick,
  queueing,
  error,
  loading,
  refetch,
  requestAnalysis,
  legalMoves,
  handleFutureMoveLegalClick,
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
  llmLoading,
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
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card
      sx={{
        backgroundColor: purpleTheme.background.paper,
        borderRadius: { xs: 2, md: 3 },
        boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
        minHeight: isGameReviewMode ? 500 : { xs: 'auto', md: 600 },
        maxHeight: isGameReviewMode ? "none" : { xs: 'none', md: "80vh" },
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: '100%',
      }}
    >
      <Box
        sx={{
          borderBottom: `1px solid ${purpleTheme.secondary}40`,
          px: { xs: 1, sm: 2, md: 3 },
          pt: { xs: 1, md: 2 },
        }}
      >
        <Tabs
          value={analysisTab}
          onChange={(_, newValue: number) => setAnalysisTab(newValue)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{
            minHeight: { xs: 48, md: 56 },
            "& .MuiTab-root": {
              color: purpleTheme.text.secondary,
              textTransform: "none",
              fontSize: { xs: "0.875rem", md: "1rem" },
              fontWeight: 500,
              minHeight: { xs: 48, md: 56 },
              minWidth: { xs: 'auto', md: 90 },
              px: { xs: 1, sm: 2 },
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
            icon={<AnalyticsIcon sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }} />}
            iconPosition={isSmallMobile ? "top" : "start"}
            label={isSmallMobile ? "Analysis" : "Analysis"}
          />
          <Tab
            icon={<ChatIcon sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }} />}
            iconPosition={isSmallMobile ? "top" : "start"}
            label={isSmallMobile ? "Chat" : "AI Chat"}
          />
        </Tabs>
      </Box>

      <Box
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          flex: 1,
          overflow: "auto",
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
        <TabPanel value={analysisTab} index={0}>
          <Stack spacing={{ xs: 2, md: 3 }}>
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
                  borderRadius: { xs: 1.5, md: 2 },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                  }
                  sx={{
                    backgroundColor: purpleTheme.background.card,
                    minHeight: { xs: 48, md: 56 },
                    "&:hover": {
                      backgroundColor: `${purpleTheme.secondary}20`,
                    },
                    "& .MuiAccordionSummary-content": {
                      margin: { xs: '12px 0', md: '16px 0' },
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                      fontSize: { xs: '1rem', md: '1.25rem' },
                    }}
                  >
                    Game Review
                  </Typography>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    backgroundColor: purpleTheme.background.paper,
                    p: { xs: 1.5, md: 2 },
                  }}
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
                  <Divider />
                </AccordionDetails>
              </Accordion>
            )}

            {/* Position Theme Analysis */}
            {isGameReviewMode ? (
              <Accordion
                expanded={activeAnalysisTab === 1}
                onChange={() =>
                  setActiveAnalysisTab(activeAnalysisTab === 1 ? -1 : 1)
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:before": { display: "none" },
                  borderRadius: { xs: 1.5, md: 2 },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />}
                  sx={{
                    minHeight: { xs: 48, md: 56 },
                    "& .MuiAccordionSummary-content": {
                      margin: { xs: '12px 0', md: '16px 0' },
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                      fontSize: { xs: '1rem', md: '1.25rem' },
                    }}
                  >
                    Position Theme Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1.5, md: 2 } }}>
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
                  setActiveAnalysisTab(activeAnalysisTab === 1 ? 0 : 1)
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  "&:before": { display: "none" },
                  borderRadius: { xs: 1.5, md: 2 },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />}
                  sx={{
                    minHeight: { xs: 48, md: 56 },
                    "& .MuiAccordionSummary-content": {
                      margin: { xs: '12px 0', md: '16px 0' },
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: purpleTheme.text.primary,
                      fontWeight: 600,
                      fontSize: { xs: '1rem', md: '1.25rem' },
                    }}
                  >
                    Position Theme Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1.5, md: 2 } }}>
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
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  minHeight: { xs: 48, md: 56 },
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                  "& .MuiAccordionSummary-content": {
                    margin: { xs: '12px 0', md: '16px 0' },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: purpleTheme.text.primary,
                    fontWeight: 600,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Stockfish Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  backgroundColor: purpleTheme.background.paper,
                  p: { xs: 1.5, md: 2 },
                }}
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
              expanded={activeAnalysisTab === (isGameReviewMode ? 2 : 0)}
              onChange={() =>
                setActiveAnalysisTab(
                  activeAnalysisTab === (isGameReviewMode ? 2 : 0)
                    ? -1
                    : isGameReviewMode
                    ? 2
                    : 0
                )
              }
              sx={{
                backgroundColor: purpleTheme.background.card,
                "&:before": { display: "none" },
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  minHeight: { xs: 48, md: 56 },
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                  "& .MuiAccordionSummary-content": {
                    margin: { xs: '12px 0', md: '16px 0' },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: purpleTheme.text.primary,
                    fontWeight: 600,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Opening Explorer
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  backgroundColor: purpleTheme.background.paper,
                  p: { xs: 1.5, md: 2 },
                }}
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
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  minHeight: { xs: 48, md: 56 },
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                  "& .MuiAccordionSummary-content": {
                    margin: { xs: '12px 0', md: '16px 0' },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: purpleTheme.text.primary,
                    fontWeight: 600,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Chess Database
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  backgroundColor: purpleTheme.background.paper,
                  p: { xs: 1.5, md: 2 },
                }}
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
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ color: purpleTheme.text.primary }} />
                }
                sx={{
                  backgroundColor: purpleTheme.background.card,
                  minHeight: { xs: 48, md: 56 },
                  "&:hover": {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  },
                  "& .MuiAccordionSummary-content": {
                    margin: { xs: '12px 0', md: '16px 0' },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: purpleTheme.text.primary,
                    fontWeight: 600,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Legal Move Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  backgroundColor: purpleTheme.background.paper,
                  p: { xs: 1.5, md: 2 },
                }}
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