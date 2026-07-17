import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Tabs,
  Tab,
  Button,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  Calculate,
} from "@mui/icons-material";
import { MaiaEvaluation, ModelType, MODEL_CONFIGS } from "@/libs/nets/types";
import { CandidateMove } from "@/libs/agine/helper";
import { QuadrantClassification } from "@/libs/nets/classifyMoves";
import { QuadrantAnalysisView } from "./QuadrantAnalysisView";
import { PositionEval } from "@jalpp/stockfishts";
import { StockfishEaseMetricCalculator } from "@/libs/easemetric/stockfishEaseMetric";
import { UciEngine } from "@jalpp/stockfishts";
import { Chess } from "chess.js";
import { MAIA3_MODELS, MAIA3_RATING_VALUES, getValueColor, formatModelName, formatValue, getEMColor } from "@/libs/nets/types";
import { sanToUci } from "@/lib/moveUtils";

export interface MaiaResultsProps {
  evaluations: {
    bigLeela?: MaiaEvaluation | null;
    elitemaia?: MaiaEvaluation | null;
    maia3?: { [key: string]: MaiaEvaluation } | null;
  };
  ucievaluations: {
    bigLeela?: MaiaEvaluation | null;
    elitemaia?: MaiaEvaluation | null;
    maia3?: { [key: string]: MaiaEvaluation } | null;
  };
  isMaiaLoading: boolean;
  chessDbMoves: CandidateMove[] | null;
  engine?: UciEngine | null;
  chessDbLoading: boolean;
  stockfishAnalysisResult: PositionEval | null;
  maiaerror: Error | null;
  fen: string;
  /** Called with a move's UCI when the person clicks it to play it on the board. */
  onPlayMove?: (uci: string) => void;
}




const getValueIcon = (value: number) => {
  if (value > 0.55) return <TrendingUp sx={{ fontSize: 16 }} />;
  if (value < 0.3) return <TrendingDown sx={{ fontSize: 16 }} />;
  return null;
};


const formatPrincipalVariation = (
  pv: string[],
  startFen: string,
  MAX_PV_MOVES: number,
): string => {
  const tempGame = new Chess(startFen);
  const moves: string[] = [];

  for (const uciMove of pv.slice(0, MAX_PV_MOVES)) {
    try {
      const move = tempGame.move({
        from: uciMove.slice(0, 2),
        to: uciMove.slice(2, 4),
        promotion: uciMove.length > 4 ? (uciMove[4] as string) : undefined,
      });
      if (move) {
        moves.push(move.san);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return moves.join(" ");
};

const MovesList: React.FC<{
  policy: { [key: string]: number };
  onMoveClick?: (san: string) => void;
}> = ({
  policy,
  onMoveClick,
}) => {
  const topMoves = Object.entries(policy)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {topMoves.map(([move, probability], index) => (
        <Box
          key={move}
          display="flex"
          alignItems="center"
          gap={2}
          onClick={onMoveClick ? () => onMoveClick(move) : undefined}
          sx={{
            cursor: onMoveClick ? "pointer" : "default",
            borderRadius: 1,
            px: onMoveClick ? 0.5 : 0,
            "&:hover": onMoveClick ? { bgcolor: "action.hover" } : undefined,
          }}
        >
          <Chip
            label={index + 1}
            size="small"
            sx={{
              fontWeight: 600,
              minWidth: 28,
            }}
          />
          <Typography
            sx={{
              fontWeight: 500,
              fontFamily: "monospace",
              fontSize: "1rem",
            }}
          >
            {move}
          </Typography>
          <Box flex={1} mx={2}>
            <LinearProgress
              variant="determinate"
              value={probability * 100}
              sx={{
                height: 6,
                borderRadius: 3,
              }}
            />
          </Box>
          <Typography
            sx={{
              fontWeight: 600,
              minWidth: 50,
              textAlign: "right",
            }}
          >
            {(probability * 100).toFixed(1)}%
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const EvaluationDisplay: React.FC<{
  evaluation: MaiaEvaluation;
  supportsem: boolean;
  ucievaluation?: MaiaEvaluation | null;
  candidateMoves?: CandidateMove[] | null;
  stockfishAnalysisResult: PositionEval | null;
  engine?: UciEngine | null;
  fen: string;
  showQuadrantAnalysis?: boolean;
  onPlayMove?: (uci: string) => void;
}> = ({
  ucievaluation,
  evaluation,
  supportsem,
  candidateMoves,
  showQuadrantAnalysis = true,
  stockfishAnalysisResult,
  engine,
  fen,
  onPlayMove,
}) => {
  const [viewMode, setViewMode] = useState<"evaluation" | "quadrant" | "ease">("evaluation");
  const [improbableThreshold, setImprobableThreshold] = useState(0.05);

  const quadrantMoves = React.useMemo(() => {
    if (!candidateMoves || candidateMoves.length === 0) return [];
    return QuadrantClassification(
      evaluation,
      candidateMoves,
      improbableThreshold,
    );
  }, [evaluation, candidateMoves, improbableThreshold]);

  const easeMetric = React.useMemo(() => {
    if (!candidateMoves || candidateMoves.length === 0 || !ucievaluation || !supportsem)
      return null;
    const easeMetricCalculator = new StockfishEaseMetricCalculator(true);
    try {
      return easeMetricCalculator.calculateEaseMetric(
        ucievaluation,
        stockfishAnalysisResult,
      );
    } catch {
      return null;
    }
  }, [ucievaluation, stockfishAnalysisResult]);

  const hasQuadrantData = quadrantMoves.length > 0;
  const hasEaseData = easeMetric !== null;
  const handleThresholdChange = (event: Event, newValue: number | number[]) => {
    setImprobableThreshold(newValue as number);
  };



  return (
    <>
      {(hasQuadrantData || hasEaseData) &&
        showQuadrantAnalysis && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={viewMode}
              onChange={(_, newValue) => setViewMode(newValue)}
            >
              <Tab label="Position Evaluation" value="evaluation" />
              {hasQuadrantData && (
                <Tab label="Candidate Analysis" value="quadrant" />
              )}
              {hasEaseData && supportsem && <Tab label="Ease Metric Analysis" value="ease" />}
            </Tabs>
          </Box>
        )}

      {viewMode === "evaluation" ? (
        <>
          <Box mb={3}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
            >
              <Typography variant="subtitle2">Position Evaluation</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {getValueIcon(evaluation.value)}
                <Chip
                  label={formatValue(evaluation.value)}
                  size="small"
                  sx={{
                    bgcolor: getValueColor(evaluation.value),
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={evaluation.value * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                "& .MuiLinearProgress-bar": {
                  bgcolor: getValueColor(evaluation.value),
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Top Moves
            </Typography>
            <MovesList
              policy={evaluation.policy}
              onMoveClick={
                onPlayMove
                  ? (san) => {
                      const uci = sanToUci(fen, san);
                      if (uci) onPlayMove(uci);
                    }
                  : undefined
              }
            />
          </Box>

        </>
      ) : viewMode === "quadrant" ? (
        <>
          <Box mb={3} px={2}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
            >
              <Typography variant="subtitle2">
                Improbability Threshold
              </Typography>
              <Chip
                label={`${(improbableThreshold * 100).toFixed(0)}%`}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Slider
              value={improbableThreshold}
              onChange={handleThresholdChange}
              min={0.01}
              max={0.5}
              step={0.01}
              marks={[
                { value: 0.01, label: "1%" },
                { value: 0.05, label: "5%" },
                { value: 0.1, label: "10%" },
                { value: 0.15, label: "15%" },
                { value: 0.2, label: "20%" },
                { value: 0.25, label: "25%" },
                { value: 0.35, label: "35%" },
                { value: 0.45, label: "45%" },
                { value: 0.5, label: "50%" },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
              sx={{
                "& .MuiSlider-markLabel": {
                  fontSize: "0.75rem",
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.6)",
                display: "block",
                mt: 1,
              }}
            >
              Moves below this threshold are considered "unlikely" by the neural
              network
            </Typography>
          </Box>

          <QuadrantAnalysisView
            quadrantMoves={quadrantMoves}
            improbableThreshold={improbableThreshold}
          />
        </>
      ) : viewMode === "ease" ? (
        <>
          {easeMetric !== null && (
            <Box>
              <Box mb={4}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <Typography variant="h6">Position Difficulty</Typography>
                  <Chip
                    label={easeMetric.toFixed(3)}
                    size="medium"
                    sx={{
                      bgcolor:
                        easeMetric > 0.7
                          ? "#4caf50"
                          : easeMetric > 0.4
                            ? "#ff9800"
                            : "#f44336",
                      fontWeight: 700,
                      fontSize: "1rem",
                    }}
                  />
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={easeMetric * 100}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    "& .MuiLinearProgress-bar": {
                      bgcolor:
                        easeMetric > 0.7
                          ? "#4caf50"
                          : easeMetric > 0.4
                            ? "#ff9800"
                            : "#f44336",
                    },
                  }}
                />

                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography
                    variant="caption"
                    sx={{ color: "#f44336", fontWeight: 600 }}
                  >
                    Hard (0.0)
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#4caf50", fontWeight: 600 }}
                  >
                    Easy (1.0)
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Interpretation
                </Typography>

                {easeMetric > 0.7 ? (
                  <Box>
                    <Typography sx={{ mb: 1 }}>
                      ✅ <strong>Easy Position</strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      The neural network strongly prefers moves that are also
                      objectively strong. There's clear alignment between human
                      intuition and engine evaluation.
                    </Typography>
                  </Box>
                ) : easeMetric > 0.4 ? (
                  <Box>
                    <Typography sx={{ mb: 1 }}>
                      ⚠️ <strong>Moderate Difficulty</strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Some discrepancy between intuitive moves and objectively
                      best moves. Careful calculation may be needed to find the
                      optimal continuation.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ mb: 1 }}>
                      🔴 <strong>Difficult Position</strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      The most intuitive moves may not be the best. This
                      position requires deep analysis to find the optimal moves,
                      as human pattern recognition diverges from engine
                      evaluation.
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  How It's Calculated
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1 }}
                >
                  The ease metric combines neural network move probabilities
                  with engine evaluations:
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    pl: 3,
                    "& li": { mb: 0.5, color: "rgba(255, 255, 255, 0.7)" },
                  }}
                >
                  <Typography component="li" variant="body2">
                    Higher values (→ 1.0) = Neural net strongly favors
                    objectively best moves
                  </Typography>
                  <Typography component="li" variant="body2">
                    Lower values (→ 0.0) = Neural net favors moves that differ
                    from engine's top choices
                  </Typography>
                  <Typography component="li" variant="body2">
                    Considers both move probability and quality gap from the
                    best move
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </>
      ) : null}
    </>
  );
};


// ── Maia 3 Display Component ──────────────────────────────────────────────────

interface Maia3DisplayProps {
  evaluations: { [key: string]: MaiaEvaluation };
  stockfishAnalysisResult: PositionEval | null;
  chessDbMoves: CandidateMove[] | null;
  engine?: UciEngine | null;
  fen: string;
  selectedModel: number;
  onModelChange: (idx: number) => void;
  onPlayMove?: (uci: string) => void;
}

const Maia3Display: React.FC<Maia3DisplayProps> = ({
  evaluations,
  stockfishAnalysisResult,
  chessDbMoves,
  engine,
  fen,
  selectedModel,
  onModelChange,
  onPlayMove,
}) => {
  const currentModelKey = MAIA3_MODELS[selectedModel];
  const currentEval = evaluations[currentModelKey];
  const currentRating = MAIA3_RATING_VALUES[selectedModel];

  // Build win probability curve data across all rating levels
  const winProbData = MAIA3_MODELS.map((model, idx) => ({
    rating: MAIA3_RATING_VALUES[idx],
    winProb: evaluations[model]?.value ?? null,
  })).filter((d) => d.winProb !== null);

  const getRatingColor = (rating: number) => {
    if (rating <= 800) return "#9c27b0";
    if (rating <= 1000) return "#673ab7";
    if (rating <= 1200) return "#3f51b5";
    if (rating <= 1400) return "#2196f3";
    if (rating <= 1600) return "#03a9f4";
    if (rating <= 1800) return "#009688";
    if (rating <= 2000) return "#4caf50";
    if (rating <= 2200) return "#ff9800";
    if (rating <= 2400) return "#f44336";
    return "#b71c1c";
  };

  return (
    <Box>
      {/* Rating range badge */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Chip
          label="600–2600 Elo"
          size="small"
          sx={{
            background: "linear-gradient(90deg, #9c27b0, #b71c1c)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.7rem",
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Single unified model with continuous rating conditioning
        </Typography>
      </Box>

      {/* Rating slider */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Rating Level
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: getRatingColor(currentRating) }}
          >
            {currentRating} Elo
          </Typography>
        </Box>
        <Slider
          value={selectedModel}
          min={0}
          max={MAIA3_MODELS.length - 1}
          step={1}
          onChange={(_, val) => onModelChange(val as number)}
          marks={[
            { value: 0, label: "600" },
            { value: 5, label: "1100" },
            { value: 10, label: "1600" },
            { value: 15, label: "2100" },
            { value: 20, label: "2600" },
          ]}
          sx={{
            "& .MuiSlider-thumb": {
              bgcolor: getRatingColor(currentRating),
            },
            "& .MuiSlider-track": {
              bgcolor: getRatingColor(currentRating),
            },
          }}
        />
      </Box>

      {/* Win probability across all ratings */}
      {winProbData.length > 0 && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Win Probability by Rating Level
          </Typography>
          <Box display="flex" gap={0.5} alignItems="flex-end" height={48}>
            {winProbData.map((d) => {
              const isSelected = d.rating === currentRating;
              const pct = Math.round((d.winProb ?? 0) * 100);
              return (
                <Box
                  key={d.rating}
                  onClick={() =>
                    onModelChange(MAIA3_RATING_VALUES.indexOf(d.rating))
                  }
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    gap: 0.25,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: `${Math.max(4, pct * 0.44)}px`,
                      bgcolor: isSelected
                        ? getRatingColor(d.rating)
                        : "rgba(255,255,255,0.15)",
                      borderRadius: "2px 2px 0 0",
                      transition: "all 0.2s",
                      border: isSelected
                        ? `1px solid ${getRatingColor(d.rating)}`
                        : "none",
                    }}
                  />
                </Box>
              );
            })}
          </Box>
          <Box display="flex" justifyContent="space-between" mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              600
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Win % at {currentRating}: {Math.round((currentEval?.value ?? 0) * 100)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              2600
            </Typography>
          </Box>
        </Box>
      )}

      {/* Main evaluation display */}
      {currentEval && (
        <EvaluationDisplay
          evaluation={currentEval}
          supportsem={false}
          stockfishAnalysisResult={stockfishAnalysisResult}
          candidateMoves={chessDbMoves}
          engine={engine}
          fen={fen}
          onPlayMove={onPlayMove}
        />
      )}
    </Box>
  );
};

export const NetResults: React.FC<MaiaResultsProps> = ({
  evaluations,
  stockfishAnalysisResult,
  ucievaluations,
  chessDbMoves,
  isMaiaLoading,
  maiaerror,
  engine,
  fen,
  onPlayMove,
}) => {
  const [selectedMaia3Model, setSelectedMaia3Model] = useState(10); // default 1600
  const [selectedTab, setSelectedTab] = useState<ModelType>("maia3");


  
  if (isMaiaLoading) {
    return (
      <Card sx={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <CardContent>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
            py={4}
          >
            <CircularProgress size={40} />
            <Typography>Analyzing position...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  
  if (maiaerror) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{maiaerror.message}</Alert>
        </CardContent>
      </Card>
    );
  }

  const currentTab = selectedTab;
  const isCurrentModelReady = true;

  return (
    <Card sx={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Typography variant="h6">Human Moves Analysis</Typography>
        </Box>

       
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            variant="fullWidth"
          >
            {(Object.keys(MODEL_CONFIGS) as ModelType[]).map((modelType) => {
              return (
                <Tab
                  key={modelType}
                  label={MODEL_CONFIGS[modelType].name}
                  value={modelType}
                />
              );
            })}
          </Tabs>
        </Box>

        {isCurrentModelReady &&
          currentTab === "bigLeela" &&
          evaluations.bigLeela &&
          ucievaluations.bigLeela && (
            <EvaluationDisplay
              evaluation={evaluations.bigLeela}
              candidateMoves={chessDbMoves}
              supportsem={true}
              stockfishAnalysisResult={stockfishAnalysisResult}
              ucievaluation={ucievaluations.bigLeela}
              engine={engine}
              fen={fen}
              onPlayMove={onPlayMove}
            />
          )}

        {isCurrentModelReady &&
          currentTab === "elitemaia" &&
          evaluations.elitemaia &&
          ucievaluations.elitemaia && (
            <EvaluationDisplay
              evaluation={evaluations.elitemaia}
              candidateMoves={chessDbMoves}
              supportsem={false}
              stockfishAnalysisResult={stockfishAnalysisResult}
              ucievaluation={ucievaluations.elitemaia}
              engine={engine}
              fen={fen}
              onPlayMove={onPlayMove}
            />
          )}

        {/* ── Maia 3: 600–2600 Elo ── */}
        {isCurrentModelReady && currentTab === "maia3" && evaluations.maia3 && ucievaluations.maia3 &&(
          <Maia3Display
            evaluations={evaluations.maia3}
            stockfishAnalysisResult={stockfishAnalysisResult}
            chessDbMoves={chessDbMoves}
            engine={engine}
            fen={fen}
            selectedModel={selectedMaia3Model}
            onModelChange={setSelectedMaia3Model}
            onPlayMove={onPlayMove}
          />
        )}
      </CardContent>
    </Card>
  );
};