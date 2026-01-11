import { Dispatch, SetStateAction, useContext, useState } from "react";
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";

import StockfishAnalysisTab from "../tabs/StockfishTab";
import { TabPanel } from "../tabs/tab";
import GameInfoTab from "../tabs/GameInfoTab";
import OpeningExplorer from "../tabs/OpeningTab";
import ChessDBDisplay from "../tabs/Chessdb";
import LegalMoveTab from "../tabs/LegalMoveTab";
import ChatTab from "../tabs/ChatTab";
import { PositionEval, LineEval } from "@/stockfish/engine/engine";
import { MasterGames, Moves } from "@/libs/openingdatabase/helper";
import { CandidateMove } from "@/libs/agine/helper";
import { MoveAnalysis } from "@/hooks/useGameReview";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { GameReviewTheme, ThemeScore } from "@/libs/themes/helper";
import { PositionRadarAnalysis } from "../tabs/PositionRadarAnalysis";
import { PositionFenThemeAnalysis } from "../tabs/PositionalFenThemeAnalysis";

import { UseMaiaEngineResult } from "@/hooks/useNets";
import { useSessionStorage } from "usehooks-ts";
import { NetResults } from "../nets/NetResults";
import { NetProbabilityChart } from "../nets/NetBarGraph";



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
  sendChatMessage: (
    gameInfo?: string | undefined,
    currentMove?: string | undefined,
    puzzleMode?: boolean | undefined,
    puzzleQuery?: string | undefined,
    playMode?: boolean | undefined,
    currentMoveIndex?: number | undefined
  ) => Promise<void>;
  abortChatMessage: () => void;
  handleChatKeyPress: (e: React.KeyboardEvent) => void;
  llmLoading: boolean;
  scores: ThemeScore | null;
  ThemeScoreloading: boolean;
  ThemeScoreerror: string | null;
}

interface GameReviewProps {
  moves?: string[];
  currentMoveIndex?: number;
  goToMove?: (index: number) => void;
  comment?: string;
  gameInfo?: Record<string, string>;
  gameReviewTheme: GameReviewTheme | null;
  generateGameReview?: (moves: string[], customFen?: string) => void;
  Customfen?: string;
  gameReviewLoading?: boolean;
  gameReviewProgress?: number;
  handleGameReviewSummaryClick?: (
    review: MoveAnalysis[],
    gameInfo: string
  ) => Promise<void>;
  handleMoveAnnontateClick?: (
    review: MoveAnalysis,
    customQuery?: string
  ) => Promise<void>;
  handleMoveCoachClick?: (review: MoveAnalysis) => void;
  gameReview?: MoveAnalysis[];
  pgnText?: string;
  currentMove?: string;
}

interface MaiaProps extends UseMaiaEngineResult {}

interface AgineAnalysisViewProps
  extends GameReviewProps,
    BaseAnalysisViewProps,
    MaiaProps {
  isGameReviewMode: boolean;
  activeAnalysisTab: number;
  setActiveAnalysisTab: Dispatch<SetStateAction<number>>
}

function AgineAnalysisView({
  stockfishAnalysisResult,
  stockfishLoading,
  handleEngineLineClick,
  engineDepth,
  engineLines,
  engine,
  Customfen,
  analyzeWithStockfish,
  formatEvaluation,
  formatPrincipalVariation,
  setEngineDepth,
  setEngineLines,
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
  sendChatMessage,
  abortChatMessage,
  handleChatKeyPress,
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
  evaluations,
  Maiaerror,
  isLoading,
  scores,
  ThemeScoreerror,
  ThemeScoreloading,
  activeAnalysisTab,
  setActiveAnalysisTab
}: AgineAnalysisViewProps) {
  const [analysisTab, setAnalysisTab] = useSessionStorage<number>("agine_current_tab",0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  

  return (
    <Card
      sx={{
        borderRadius: { xs: 2, md: 3 },
        boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
        minHeight: isGameReviewMode ? 500 : { xs: "auto", md: 600 },
        maxHeight: isGameReviewMode ? "none" : { xs: "none", md: "80vh" },
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Box
        sx={{
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
              textTransform: "none",
              fontSize: { xs: "0.875rem", md: "1rem" },
              fontWeight: 500,
              minHeight: { xs: 48, md: 56 },
              minWidth: { xs: "auto", md: 90 },
              px: { xs: 1, sm: 2 },
            },
            "& .Mui-selected": {
              fontWeight: 600,
            },
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          <Tab
            icon={
              <AnalyticsIcon
                sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" } }}
              />
            }
            iconPosition={isSmallMobile ? "top" : "start"}
            label={isSmallMobile ? "Analysis" : "Analysis"}
          />
          <Tab
            icon={
              <ChatIcon sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" } }} />
            }
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
          maxHeight: "100%",
        }}
      >
        <TabPanel value={analysisTab} index={0}>
          <Stack spacing={{ xs: 2, md: 3 }}>
            {isGameReviewMode && (
              <Accordion
                expanded={activeAnalysisTab === 0}
                onChange={() =>
                  setActiveAnalysisTab(activeAnalysisTab === 0 ? -1 : 0)
                }
                sx={{
                  "&:before": { display: "none" },
                  borderRadius: { xs: 1.5, md: 2 },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: { xs: 48, md: 56 },

                    "& .MuiAccordionSummary-content": {
                      margin: { xs: "12px 0", md: "16px 0" },
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1rem", md: "1.25rem" },
                    }}
                  >
                    Game Review
                  </Typography>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    p: { xs: 1.5, md: 2 },
                  }}
                >
                  <GameInfoTab
                    moves={moves!}
                    currentMoveIndex={currentMoveIndex!}
                    goToMove={goToMove!}
                    fen={Customfen}
                    comment={comment!}
                    gameInfo={gameInfo!}
                    gameReviewTheme={gameReviewTheme!}
                    generateGameReview={generateGameReview!}
                    gameReviewLoading={gameReviewLoading!}
                    gameReviewProgress={gameReviewProgress!}
                    handleGameReviewClick={handleGameReviewSummaryClick!}
                    handleMoveAnnontateClick={handleMoveAnnontateClick!}
                    handleMoveCoachClick={handleMoveCoachClick!}
                    gameReview={gameReview!}
                    stockfishAnalysisResult={stockfishAnalysisResult}
                  />

                  <Divider />

                
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
                  "&:before": { display: "none" },
                  borderRadius: { xs: 1.5, md: 2 },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: { xs: 48, md: 56 },
                    "& .MuiAccordionSummary-content": {
                      margin: { xs: "12px 0", md: "16px 0" },
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1rem", md: "1.25rem" },
                    }}
                  >
                    Position Theme Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1.5, md: 2 } }}>
                  {gameReviewTheme !== null &&
                    gameReview !== undefined &&
                    currentMoveIndex !== undefined && (
                      <PositionRadarAnalysis
                        moveAnalysis={gameReview}
                        stockfishAnalysisResult={stockfishAnalysisResult}
                        currentMoveIndex={currentMoveIndex}
                        gameReview={gameReviewTheme}
                      />
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
                  "&:before": { display: "none" },
                  borderRadius: { xs: 1.5, md: 2 },
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: { xs: 48, md: 56 },
                    "& .MuiAccordionSummary-content": {
                      margin: { xs: "12px 0", md: "16px 0" },
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: "1rem", md: "1.25rem" },
                    }}
                  >
                    Position Theme Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1.5, md: 2 } }}>
                  <PositionFenThemeAnalysis
                    stockfishAnalysisResult={stockfishAnalysisResult}
                    scores={scores}
                    loading={ThemeScoreloading}
                    error={ThemeScoreerror}
                  />
                </AccordionDetails>
              </Accordion>
            )}

            <Accordion
              expanded={activeAnalysisTab === 2}
              onChange={() =>
                setActiveAnalysisTab(activeAnalysisTab === 2 ? -1 : 2)
              }
              sx={{
                "&:before": { display: "none" },
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: { xs: 48, md: 56 },
                  "& .MuiAccordionSummary-content": {
                    margin: { xs: "12px 0", md: "16px 0" },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1rem", md: "1.25rem" },
                  }}
                >
                  Stockfish Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
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

            <Accordion
              expanded={activeAnalysisTab === 3}
              onChange={() =>
                setActiveAnalysisTab(activeAnalysisTab === 3 ? -1 : 3)
              }
              sx={{
                "&:before": { display: "none" },
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: { xs: 48, md: 56 },
                  "& .MuiAccordionSummary-content": {
                    margin: { xs: "12px 0", md: "16px 0" },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1rem", md: "1.25rem" },
                  }}
                >
                  Neural Nets Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: { xs: 1.5, md: 2 },
                }}
              >
                <NetResults
                  evaluations={evaluations}
                  isMaiaLoading={isLoading}
                  chessDbLoading={loading}
                  chessDbMoves={chessdbdata}
                  maiaerror={Maiaerror}
                />
                {gameReview && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <NetProbabilityChart moves={gameReview!} />
                  </>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Opening Explorer */}
            <Accordion
              expanded={activeAnalysisTab === 4}
              onChange={() =>
                setActiveAnalysisTab(activeAnalysisTab === 4 ? -1 : 4)
              }
              
              sx={{
                "&:before": { display: "none" },
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: { xs: 48, md: 56 },

                  "& .MuiAccordionSummary-content": {
                    margin: { xs: "12px 0", md: "16px 0" },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1rem", md: "1.25rem" },
                  }}
                >
                  Opening Explorer
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
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

            <Accordion
              expanded={activeAnalysisTab === 5}
              onChange={() =>
                setActiveAnalysisTab(activeAnalysisTab === 5 ? -1 : 5)
              }
              sx={{
                "&:before": { display: "none" },
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: { xs: 48, md: 56 },

                  "& .MuiAccordionSummary-content": {
                    margin: { xs: "12px 0", md: "16px 0" },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1rem", md: "1.25rem" },
                  }}
                >
                  Chess Database
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
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

            <Accordion
              expanded={activeAnalysisTab === 6}
              onChange={() =>
                setActiveAnalysisTab(activeAnalysisTab === 6 ? -1 : 6)
              }
              sx={{
                "&:before": { display: "none" },
                borderRadius: { xs: 1.5, md: 2 },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: { xs: 48, md: 56 },

                  "& .MuiAccordionSummary-content": {
                    margin: { xs: "12px 0", md: "16px 0" },
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1rem", md: "1.25rem" },
                  }}
                >
                  Legal Move Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
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

        <TabPanel value={analysisTab} index={1} >
          <ChatTab
            currentMoveIndex={currentMoveIndex}
            abortChatMessage={abortChatMessage}
            puzzleMode={false}
            sendChatMessage={sendChatMessage}
            handleChatKeyPress={handleChatKeyPress}
            gameInfo={pgnText}
            currentMove={currentMove}
          />
        </TabPanel>
      </Box>
    </Card>
  );
}

export default AgineAnalysisView;
