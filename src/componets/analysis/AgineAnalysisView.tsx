import { Dispatch, SetStateAction, useState } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Divider,
  Chip,
  Button,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Stack,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  TravelExplore as OpeningIcon,
  Storage as DbIcon,
  Psychology as NetsIcon,
  BarChart as ThemeIcon,
  SportsEsports as ReviewIcon,
  PersonSearch as HumanEvalIcon,
  Queue as QueueIcon,
  Settings as SettingsIcon,
  Memory as Lc0Icon,
} from "@mui/icons-material";

import StockfishAnalysisTab from "../tabs/StockfishTab";
import Lc0AnalysisTab from "../tabs/Lc0Tab";
import { useLc0Panel, formatEvaluation as formatLc0Evaluation, formatPrincipalVariation as formatLc0Pv } from "@/hooks/useLc0Panel";
import GameInfoTab from "../tabs/GameInfoTab";
import OpeningExplorer from "../tabs/OpeningTab";
import ChessDBDisplay from "../tabs/Chessdb";
import { PositionEval, LineEval } from "@jalpp/stockfishts";
import type { ChessDbPvResult } from "@jalpp/stockfishts";
import { MasterGames } from "@/libs/openingdatabase/helper";
import { CandidateMove, MoveAnalysis } from "@/libs/agine/helper";
import { UciEngine } from "@jalpp/stockfishts";
import { GameReviewTheme, ThemeScore } from "@/libs/themes/helper";
import { PositionRadarAnalysis } from "../tabs/PositionRadarAnalysis";
import { PositionFenThemeAnalysis } from "../tabs/PositionalFenThemeAnalysis";
import { UseMaiaEngineResult } from "@/libs/nets/types";
import { NetResults } from "../nets/NetResults";
import { ObjectiveHumanEval } from "../humanevalbar/ObjectiveHumanEval";
import { useSettings } from "@/context/SettingContext";
import { buildAnalysisPanelVisibilityPatch } from "@/libs/settings/analysisPanels";

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
  pvResult?: ChessDbPvResult | null;
  pvLoading?: boolean;
  pvError?: string | null;
  requestPv?: () => void;
  scores: ThemeScore | null;
  ThemeScoreloading: boolean;
  ThemeScoreerror: string | null;
  /** Called with a move's UCI when the person clicks a suggested move (Stockfish, ChessDB, or a neural net) to play it on the board. */
  onPlayMove?: (uci: string) => void;
  /** Called with a full move prefix (in UCI) when the person clicks a move within a displayed PV (Stockfish line or ChessDB PV), so the whole sequence can be appended onto the main board. */
  onAppendMoves?: (uciMoves: string[]) => void;
  /** Queues every position in the current game (main line + variations) for background ChessDB analysis. Only wired up on the game page. */
  onQueueAllPositions?: () => void;
  queueAllRunning?: boolean;
  queueAllProgress?: { done: number; total: number } | null;
  queueAllResult?: { total: number; queued: number; failed: number } | null;

}

interface GameReviewProps {
  moves?: string[];
  currentMoveIndex?: number;
  goToMove?: (index: number) => void;
  comment?: string;
  clock?: string;
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
  /** When false, engine/neural-net sections show a disabled overlay instead of stale/loading data */
  autoAnalysis?: boolean;
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
        borderColor: expanded ? "primary.main" : "divider",
        borderRadius: "8px !important",
        overflow: "hidden",
        transition: "border-color 0.2s",
        mb: 0.75,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 15, color: "text.secondary" }} />}
        sx={{
          minHeight: 34, px: 1.25, py: 0,
          bgcolor: expanded ? "action.selected" : "transparent",
          "&:hover": { bgcolor: "action.hover" },
          "& .MuiAccordionSummary-content": { my: "5px", alignItems: "center", gap: 0.75 },
        }}
      >
        <Box sx={{ color: expanded ? "primary.main" : "text.disabled", display: "flex", alignItems: "center" }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: "11px", fontWeight: 600, color: expanded ? "text.primary" : "text.secondary", letterSpacing: "0.05em", flex: 1 }}>
          {title.toUpperCase()}
        </Typography>
        {badge && (
          <Chip label={badge} size="small" sx={{
            height: 15, fontSize: "9px", maxWidth: 80,
            bgcolor: "primary.dark", color: "primary.contrastText",
            "& .MuiChip-label": { px: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          }} />
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ p: 1.25, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
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
  pvResult, pvLoading, pvError, requestPv,
  isGameReviewMode = false, moves, currentMoveIndex, goToMove, comment, clock,
  gameInfo, gameReviewTheme, generateGameReview, gameReviewLoading,
  gameReviewProgress, gameReview, evaluations, Maiaerror, isLoading,
  scores, ThemeScoreerror, ThemeScoreloading,
  activeAnalysisTab, fen, setActiveAnalysisTab,
  autoAnalysis = true,
  onPlayMove, onAppendMoves, onQueueAllPositions, queueAllRunning, queueAllProgress, queueAllResult,

}: AgineAnalysisViewProps) {

  const [panelSettingsOpen, setPanelSettingsOpen] = useState(false);
  const {
    saveSettings,
    analysisShowStockfish, analysisShowChessdb, analysisShowNets,
    analysisShowTheme, analysisShowHumanEval, analysisShowOpening, analysisShowLc0,
  } = useSettings();
  const showStockfish = analysisShowStockfish ?? true;
  const showChessdb = analysisShowChessdb ?? true;
  const showNets = analysisShowNets ?? true;
  const showTheme = analysisShowTheme ?? true;
  const showHumanEval = analysisShowHumanEval ?? true;
  const showOpening = analysisShowOpening ?? true;
  const showLc0 = analysisShowLc0 ?? true;

  const {
    result: lc0AnalysisResult, loading: lc0Loading, depth: lc0Depth, setDepth: setLc0Depth,
    lines: lc0Lines, setLines: setLc0Lines, engine: lc0Engine, analyze: analyzeWithLc0,
    netId: lc0NetId, setNetId: setLc0NetId,
    nodesVisited: lc0NodesVisited,
    provider: lc0Provider, gpuAdapterAvailable: lc0GpuAdapterAvailable, engineError: lc0EngineError,
  } = useLc0Panel(fen, autoAnalysis, showLc0);

  const panelToggles: Array<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = [
    { label: "Stockfish", checked: showStockfish, onChange: (v) => saveSettings({ analysis_show_stockfish: v }) },
    { label: "lc0", checked: showLc0, onChange: (v) => saveSettings({ analysis_show_lc0: v }) },
    { label: "Theme Analysis", checked: showTheme, onChange: (v) => saveSettings({ analysis_show_theme: v }) },
    { label: "Neural Nets", checked: showNets, onChange: (v) => saveSettings({ analysis_show_nets: v }) },
    { label: "Human Eval", checked: showHumanEval, onChange: (v) => saveSettings({ analysis_show_human_eval: v }) },
    { label: "Opening Explorer", checked: showOpening, onChange: (v) => saveSettings({ analysis_show_opening: v }) },
    { label: "Chess Database", checked: showChessdb, onChange: (v) => saveSettings({ analysis_show_chessdb: v }) },
  ];

  const setAllPanels = (visible: boolean) => {
    saveSettings(buildAnalysisPanelVisibilityPatch(visible));
  };

  const stockfishBadge = stockfishAnalysisResult?.lines?.[0]
    ? formatEvaluation(stockfishAnalysisResult.lines[0])
    : stockfishLoading ? "…" : undefined;

  const lc0Badge = lc0AnalysisResult?.lines?.[0]
    ? formatLc0Evaluation(lc0AnalysisResult.lines[0])
    : lc0Loading ? "…" : undefined;

  const reviewBadge =
    isGameReviewMode && gameReview && currentMoveIndex !== undefined && gameReview[currentMoveIndex]
      ? gameReview[currentMoveIndex].quality
      : undefined;

  const openingName =
    openingData?.opening?.name ?? lichessOpeningData?.opening?.name;

  return (
    <Box sx={{ py: 0.5 }}>
      {/* Panel visibility settings */}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setPanelSettingsOpen(true)}
          title="Analysis panel settings"
          sx={{ p: 0.4 }}
        >
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      <Dialog open={panelSettingsOpen} onClose={() => setPanelSettingsOpen(false)}>
        <DialogTitle>Analysis Panels</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1, minWidth: 260 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Choose which analysis panels render below. Turning one off
              stops it from rendering entirely, not just hiding it.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ pb: 0.5 }}>
              <Button size="small" variant="outlined" onClick={() => setAllPanels(true)}>
                Show All
              </Button>
              <Button size="small" variant="outlined" onClick={() => setAllPanels(false)}>
                Hide All
              </Button>
            </Stack>
            {panelToggles.map((toggle) => (
              <FormControlLabel
                key={toggle.label}
                control={
                  <Switch
                    checked={toggle.checked}
                    onChange={(e) => toggle.onChange(e.target.checked)}
                  />
                }
                label={toggle.label}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPanelSettingsOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {isGameReviewMode && (
        <Section id={0} title="Game Review" icon={<ReviewIcon sx={{ fontSize: 14 }} />}
          badge={reviewBadge} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          <GameInfoTab
            moves={moves!} currentMoveIndex={currentMoveIndex!} goToMove={goToMove!}
            fen={Customfen} comment={comment!} clock={clock} gameInfo={gameInfo!}
            gameReviewTheme={gameReviewTheme!} generateGameReview={generateGameReview!}
            gameReviewLoading={gameReviewLoading!} gameReviewProgress={gameReviewProgress!}
            gameReview={gameReview!} stockfishAnalysisResult={stockfishAnalysisResult}
          />
        </Section>
      )}

      {showStockfish && (
        <Section id={2} title="Stockfish" icon={<AnalyticsIcon sx={{ fontSize: 14 }} />}
          badge={autoAnalysis ? stockfishBadge : "OFF"} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          {autoAnalysis ? (
            <StockfishAnalysisTab
              stockfishAnalysisResult={stockfishAnalysisResult} stockfishLoading={stockfishLoading}
              engineDepth={engineDepth} engineLines={engineLines} engine={engine}
              analyzeWithStockfish={analyzeWithStockfish} formatEvaluation={formatEvaluation}
              formatPrincipalVariation={formatPrincipalVariation}
              setEngineDepth={setEngineDepth} setEngineLines={setEngineLines}
              onAppendMoves={onAppendMoves}
            />
          ) : (
            <Typography sx={{ color: "text.disabled", fontSize: "11px", py: 0.5 }}>
              Engine analysis is paused. Enable Auto-Analysis to activate Stockfish.
            </Typography>
          )}
        </Section>
      )}

      {showLc0 && (
        <Section id={3} title="lc0" icon={<Lc0Icon sx={{ fontSize: 14 }} />}
          badge={autoAnalysis ? lc0Badge : "OFF"} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          {autoAnalysis ? (
            <Lc0AnalysisTab
              lc0AnalysisResult={lc0AnalysisResult} lc0Loading={lc0Loading}
              lc0Depth={lc0Depth} lc0Lines={lc0Lines} engine={lc0Engine}
              lc0NetId={lc0NetId} setLc0NetId={setLc0NetId}
              analyzeWithLc0={analyzeWithLc0} formatEvaluation={formatLc0Evaluation}
              formatPrincipalVariation={formatLc0Pv} nodesVisited={lc0NodesVisited}
              provider={lc0Provider} gpuAdapterAvailable={lc0GpuAdapterAvailable} engineError={lc0EngineError}
              setLc0Depth={setLc0Depth} setLc0Lines={setLc0Lines}
              onAppendMoves={onAppendMoves}
            />
          ) : (
            <Typography sx={{ color: "text.disabled", fontSize: "11px", py: 0.5 }}>
              Engine analysis is paused. Enable Auto-Analysis to activate lc0.
            </Typography>
          )}
        </Section>
      )}

      {showTheme && (
        <Section id={1} title="Theme Analysis" icon={<ThemeIcon sx={{ fontSize: 14 }} />}
          activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          {isGameReviewMode ? (
            gameReviewTheme !== null && gameReview !== undefined && currentMoveIndex !== undefined ? (
              <PositionRadarAnalysis moveAnalysis={gameReview} stockfishAnalysisResult={stockfishAnalysisResult}
                currentMoveIndex={currentMoveIndex} gameReview={gameReviewTheme} />
            ) : (
              <Typography sx={{ color: "text.disabled", fontSize: "11px" }}>
                Generate a review to see theme analysis.
              </Typography>
            )
          ) : (
            <PositionFenThemeAnalysis stockfishAnalysisResult={stockfishAnalysisResult}
              scores={scores} loading={ThemeScoreloading} error={ThemeScoreerror} />
          )}
        </Section>
      )}

      {showNets && (
        <Section id={4} title="Neural Nets" icon={<NetsIcon sx={{ fontSize: 14 }} />}
          badge={!autoAnalysis ? "OFF" : undefined} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          {!autoAnalysis ? (
            <Typography sx={{ color: "text.disabled", fontSize: "11px", py: 0.5 }}>
              Neural net analysis is paused. Enable Auto-Analysis to see Maia and Leela evaluations.
            </Typography>
          ) : (
            <>
              <NetResults evaluations={sanEvaluations} ucievaluations={evaluations}
                isMaiaLoading={isLoading} fen={fen} engine={engine}
                stockfishAnalysisResult={stockfishAnalysisResult} chessDbLoading={loading}
                chessDbMoves={chessdbdata} maiaerror={Maiaerror} onPlayMove={onPlayMove} />
            </>
          )}
        </Section>
      )}

      {showHumanEval && (
        <Section id={7} title="Human Eval" icon={<HumanEvalIcon sx={{ fontSize: 14 }} />}
          badge={!autoAnalysis ? "OFF" : undefined} activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          {!autoAnalysis ? (
            <Typography sx={{ color: "text.disabled", fontSize: "11px", py: 0.5 }}>
              Human eval is paused. Enable Auto-Analysis to see human-like move evaluations.
            </Typography>
          ) : (
            <ObjectiveHumanEval fen={fen} />
          )}
        </Section>
      )}

      {showOpening && (
        <Section id={5} title="Opening Explorer" icon={<OpeningIcon sx={{ fontSize: 14 }} />}
          badge={openingName ? openingName.split(":")[0].trim().slice(0, 18) : undefined}
          activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          <OpeningExplorer openingLoading={openingLoading} openingData={openingData}
            lichessOpeningData={lichessOpeningData} lichessOpeningLoading={lichessOpeningLoading}
            onPlayMove={onPlayMove} />
        </Section>
      )}

      {showChessdb && (
        <Section id={6} title="Chess Database" icon={<DbIcon sx={{ fontSize: 14 }} />}
          activeTab={activeAnalysisTab} setActiveTab={setActiveAnalysisTab}>
          {onQueueAllPositions && (
            <Box sx={{ mb: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<QueueIcon sx={{ fontSize: 16 }} />}
                onClick={onQueueAllPositions}
                disabled={queueAllRunning}
                sx={{ textTransform: "none", fontSize: "11px" }}
              >
                {queueAllRunning
                  ? `Queueing all positions… (${queueAllProgress?.done ?? 0}/${queueAllProgress?.total ?? 0})`
                  : "Queue All Game Positions to ChessDB"}
              </Button>
              {queueAllRunning && queueAllProgress && queueAllProgress.total > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={(queueAllProgress.done / queueAllProgress.total) * 100}
                  sx={{ mt: 0.75, borderRadius: 1 }}
                />
              )}
              {!queueAllRunning && queueAllResult && (
                <Typography sx={{ fontSize: "10px", color: "text.secondary", mt: 0.5 }}>
                  Queued {queueAllResult.queued}/{queueAllResult.total} positions
                  {queueAllResult.failed > 0 ? ` (${queueAllResult.failed} failed)` : ""}.
                </Typography>
              )}
            </Box>
          )}
          <ChessDBDisplay data={chessdbdata} queueing={queueing} error={error}
            loading={loading} onRefresh={refetch} onRequestAnalysis={requestAnalysis}
            onPlayMove={onPlayMove} onAppendMoves={onAppendMoves} fen={fen}
            pvResult={pvResult} pvLoading={pvLoading} pvError={pvError} onRequestPv={requestPv} />
        </Section>
      )}

    </Box>
  );
}

export default AgineAnalysisView;