import { Dispatch, SetStateAction } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  TravelExplore as OpeningIcon,
  Storage as DbIcon,
  Psychology as NetsIcon,
  BarChart as ThemeIcon,
  SportsEsports as ReviewIcon,
  AccountTree as TreeIcon,
} from "@mui/icons-material";

import StockfishAnalysisTab from "../tabs/StockfishTab";
import GameInfoTab from "../tabs/GameInfoTab";
import OpeningExplorer from "../tabs/OpeningTab";
import ChessDBDisplay from "../tabs/Chessdb";
import { PositionEval, LineEval } from "@/stockfish/engine/engine";
import { MasterGames } from "@/libs/openingdatabase/helper";
import { CandidateMove, MoveAnalysis } from "@/libs/agine/helper";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { GameReviewTheme, ThemeScore } from "@/libs/themes/helper";
import { PositionRadarAnalysis } from "../tabs/PositionRadarAnalysis";
import { PositionFenThemeAnalysis } from "../tabs/PositionalFenThemeAnalysis";
import { UseMaiaEngineResult } from "@/hooks/useNets";
import { NetResults } from "../nets/NetResults";
import { NetProbabilityChart } from "../nets/NetBarGraph";
import ChessTreeView from "../tabs/ChessTreeView";

interface BaseAnalysisViewProps {
  stockfishAnalysisResult: PositionEval | null;
  stockfishLoading: boolean;
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
  chessdbdata: CandidateMove[] | null;
  queueing: boolean;
  error: string | null | undefined;
  loading: boolean;
  refetch: () => void;
  requestAnalysis: () => void;
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
  setActiveAnalysisTab: Dispatch<SetStateAction<number>>;
  fen: string;
}

// Compact collapsible section for the left panel
function Section({
  id, title, icon, badge, activeTab, setActiveTab, children,
}: {
  id: number; title: string; icon: React.ReactNode; badge?: string;
  activeTab: number; setActiveTab: Dispatch<SetStateAction<number>>; children: React.ReactNode;
}) {
  const expanded = activeTab === id;
  return (
    <Accordion
      expanded={expanded}
      onChange={() => setActiveTab(expanded ? -1 : id)}
      disableGutters elevation={0}
      sx={{
        backgroundColor: "transparent",
        "&:before": { display: "none" },
        border: "1px solid",
        borderColor: expanded ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)",
        borderRadius: "8px !important",
        overflow: "hidden",
        transition: "border-color 0.2s",
        mb: 0.75,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 15, color: "#555" }} />}
        sx={{
          minHeight: 34, px: 1.25, py: 0,
          backgroundColor: expanded ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.025)",
          "&:hover": { backgroundColor: "rgba(124,58,237,0.07)" },
          "& .MuiAccordionSummary-content": { my: "5px", alignItems: "center", gap: 0.75 },
        }}
      >
        <Box sx={{ color: expanded ? "#a78bfa" : "#555", display: "flex", alignItems: "center" }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: "11px", fontWeight: 600, color: expanded ? "#d4bbff" : "#888", letterSpacing: "0.05em", flex: 1 }}>
          {title.toUpperCase()}
        </Typography>
        {badge && (
          <Chip label={badge} size="small" sx={{
            height: 15, fontSize: "9px", maxWidth: 80,
            backgroundColor: "rgba(124,58,237,0.25)", color: "#c4b5fd",
            "& .MuiChip-label": { px: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          }} />
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ p: 1.25, pt: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

function AgineAnalysisView({
  stockfishAnalysisResult, stockfishLoading, sanEvaluations,
  engineDepth, engineLines, engine, Customfen,
  analyzeWithStockfish, formatEvaluation, formatPrincipalVariation,
  setEngineDepth, setEngineLines,
  openingLoading, openingData, lichessOpeningData, lichessOpeningLoading,
  chessdbdata, queueing, error, loading, refetch, requestAnalysis,
  isGameReviewMode = false, moves, currentMoveIndex, goToMove, comment,
  gameInfo, gameReviewTheme, generateGameReview, gameReviewLoading,
  gameReviewProgress, gameReview, evaluations, Maiaerror, isLoading,
  scores, ThemeScoreerror, ThemeScoreloading,
  activeAnalysisTab, fen, setActiveAnalysisTab,
  lichessData: _lichessData, isInBook: _isInBook, // accepted but used by EmbedGameReview directly
}: AgineAnalysisViewProps) {

  const stockfishBadge = stockfishAnalysisResult
    ? formatEvaluation(stockfishAnalysisResult.lines[0])
    : stockfishLoading ? "…" : undefined;

  const reviewBadge =
    isGameReviewMode && gameReview && currentMoveIndex !== undefined && gameReview[currentMoveIndex]
      ? gameReview[currentMoveIndex].quality
      : undefined;

  const openingName =
    openingData?.opening?.name ?? lichessOpeningData?.opening?.name;

  return (
    <Box sx={{ py: 0.5 }}>
      {isGameReviewMode && (
        <Section id={0} title="Game Review" icon={<ReviewIcon sx={{ fontSize: 14 }} />}
          badge={reviewBadge} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          <GameInfoTab
            moves={moves!} currentMoveIndex={currentMoveIndex!} goToMove={goToMove!}
            fen={Customfen} comment={comment!} gameInfo={gameInfo!}
            gameReviewTheme={gameReviewTheme!} generateGameReview={generateGameReview!}
            gameReviewLoading={gameReviewLoading!} gameReviewProgress={gameReviewProgress!}
            gameReview={gameReview!} stockfishAnalysisResult={stockfishAnalysisResult}
          />
        </Section>
      )}

      <Section id={2} title="Stockfish" icon={<AnalyticsIcon sx={{ fontSize: 14 }} />}
        badge={stockfishBadge} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
        <StockfishAnalysisTab
          stockfishAnalysisResult={stockfishAnalysisResult} stockfishLoading={stockfishLoading}
          engineDepth={engineDepth} engineLines={engineLines} engine={engine}
          analyzeWithStockfish={analyzeWithStockfish} formatEvaluation={formatEvaluation}
          formatPrincipalVariation={formatPrincipalVariation}
          setEngineDepth={setEngineDepth} setEngineLines={setEngineLines}
        />
      </Section>

      <Section id={1} title="Theme Analysis" icon={<ThemeIcon sx={{ fontSize: 14 }} />}
        activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
        {isGameReviewMode ? (
          gameReviewTheme !== null && gameReview !== undefined && currentMoveIndex !== undefined ? (
            <PositionRadarAnalysis moveAnalysis={gameReview} stockfishAnalysisResult={stockfishAnalysisResult}
              currentMoveIndex={currentMoveIndex} gameReview={gameReviewTheme} />
          ) : (
            <Typography sx={{ color: "#555", fontSize: "11px" }}>
              Generate a review to see theme analysis.
            </Typography>
          )
        ) : (
          <PositionFenThemeAnalysis stockfishAnalysisResult={stockfishAnalysisResult}
            scores={scores} loading={ThemeScoreloading} error={ThemeScoreerror} />
        )}
      </Section>

      <Section id={4} title="Neural Nets" icon={<NetsIcon sx={{ fontSize: 14 }} />}
        activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
        <NetResults evaluations={sanEvaluations} ucievaluations={evaluations}
          isMaiaLoading={isLoading} fen={fen} engine={engine}
          stockfishAnalysisResult={stockfishAnalysisResult} chessDbLoading={loading}
          chessDbMoves={chessdbdata} maiaerror={Maiaerror} />
        {gameReview && gameReview.length > 0 && (
          <>
            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.06)" }} />
            <NetProbabilityChart moves={gameReview} />
          </>
        )}
      </Section>

      <Section id={5} title="Opening Explorer" icon={<OpeningIcon sx={{ fontSize: 14 }} />}
        badge={openingName ? openingName.split(":")[0].trim().slice(0, 18) : undefined}
        activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
        <OpeningExplorer openingLoading={openingLoading} openingData={openingData}
          lichessOpeningData={lichessOpeningData} lichessOpeningLoading={lichessOpeningLoading} />
      </Section>

      <Section id={6} title="Chess Database" icon={<DbIcon sx={{ fontSize: 14 }} />}
        activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
        <ChessDBDisplay data={chessdbdata} queueing={queueing} error={error}
          loading={loading} onRefresh={refetch} onRequestAnalysis={requestAnalysis} />
      </Section>

      <Section id={3} title="Variation Tree" icon={<TreeIcon sx={{ fontSize: 14 }} />}
        activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
        <ChessTreeView initialFen={fen} />
      </Section>
    </Box>
  );
}

export default AgineAnalysisView;