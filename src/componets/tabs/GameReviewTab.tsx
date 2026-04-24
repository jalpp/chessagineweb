import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  LinearProgress,
  Chip,
  TextField,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  TrendingDown,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  PlayCircle,
  ThumbsUp,
  MessageCircle,
  BookA,
  Pen,
  Sparkles,
} from "lucide-react";
import { MoveAnalysis } from "@/libs/agine/helper";
import { GameReviewDialog } from "./GameReviewDialog";
import { GameReviewTheme } from "@/libs/themes/helper";
import { PositionEval } from "@/stockfish/engine/engine";
import EvalGraph from "./EvalGraph";
import { MoveStats, MoveQuality } from "@/libs/agine/helper";

interface GameReviewTabProps {
  gameReview: MoveAnalysis[] | null;
  generateGameReview: (moves: string[], customFen?: string) => Promise<void>;
  fen?: string;
  gameReviewTheme: GameReviewTheme | null;
  moves: string[];
  gameReviewLoading: boolean;
  gameReviewProgress: number;
  stockfishAnalysisResult: PositionEval | null;
  goToMove: (index: number) => void;
  currentMoveIndex: number;
  gameInfo: string;
  whiteTitle: string;
  blackTitle: string;
  whitePlayer: string;
  blackPlayer: string;
  comment: string;
  clock?: string;
}

export const getMoveClassificationStyle = (classification: MoveQuality) => {
  switch (classification) {
    case "Best":
      return {
        color: "#81C784",
        icon: <Target size={16} />,
        bgColor: "#81C78420",
      };
    case "Very Good":
      return {
        color: "#4FC3F7",
        icon: <ThumbsUp size={16} />,
        bgColor: "#4FC3F720",
      };
    case "Good":
      return {
        color: "#AED581",
        icon: <CheckCircle size={16} />,
        bgColor: "#AED58120",
      };
    case "Dubious":
      return {
        color: "#FFB74D",
        icon: <TrendingDown size={16} />,
        bgColor: "#FFB74D20",
      };
    case "Mistake":
      return {
        color: "#FF8A65",
        icon: <AlertTriangle size={16} />,
        bgColor: "#FF8A6520",
      };
    case "Blunder":
      return {
        color: "#E57373",
        icon: <XCircle size={16} />,
        bgColor: "#E5737320",
      };
    case "Book":
      return {
        color: "#FFD54F",
        icon: <BookA size={16} />,
        bgColor: "#FFD54F20",
      };
  }
};

const GameReviewTab: React.FC<GameReviewTabProps> = ({
  gameReview,
  generateGameReview,
  fen,
  moves,
  stockfishAnalysisResult,
  gameReviewLoading,
  currentMoveIndex,
  gameReviewTheme,
  comment,
  clock,
  whiteTitle,
  blackTitle,
  whitePlayer,
  blackPlayer,
  gameReviewProgress,
  gameInfo,
}) => {
  const [userThoughts, setUserThoughts] = useState<string>("");
  const [loadingStates, setLoadingStates] = useState<{
    chat: Record<number, boolean>;
    annotate: Record<number, boolean>;
    gameReport: boolean;
  }>({
    chat: {},
    annotate: {},
    gameReport: false,
  });

  useEffect(() => {
    setUserThoughts(comment || "");
  }, [comment]);


  const handleGameReportClick = () => {
    setLoadingStates((prev) => ({
      ...prev,
      gameReport: true,
    }));

    const stats = getStatistics();
    let newGameInfo = gameInfo;
    if (stats) {
      const { whiteStats, blackStats } = stats;
      const whiteStatsStr = `White Stats: Best: ${whiteStats.Best}, Very Good: ${whiteStats["Very Good"]}, Good: ${whiteStats.Good}, Dubious: ${whiteStats.Dubious}, Mistake: ${whiteStats.Mistake}, Blunder: ${whiteStats.Blunder}, Book: ${whiteStats.Book}, accuracy: ${calculateAccuracy(whiteStats)}`;
      const blackStatsStr = `Black Stats: Best: ${blackStats.Best}, Very Good: ${blackStats["Very Good"]}, Good: ${blackStats.Good}, Dubious: ${blackStats.Dubious}, Mistake: ${blackStats.Mistake}, Blunder: ${blackStats.Blunder}, Book: ${blackStats.Book}, accuracy: ${calculateAccuracy(blackStats)}`;
      newGameInfo = `${gameInfo}\nGAME REVIEW DETAILS\n${whiteStatsStr}\n${blackStatsStr}`;
    }
  };

  const getStatistics = () => {
    if (!gameReview) return null;

    const whiteStats: MoveStats = {
      Best: 0,
      "Very Good": 0,
      Good: 0,
      Dubious: 0,
      Mistake: 0,
      Blunder: 0,
      Book: 0,
    };
    const blackStats: MoveStats = { ...whiteStats };

    gameReview.forEach((review) => {
      const stats = review.player === "w" ? whiteStats : blackStats;
      stats[review.quality]++;
    });

    return { whiteStats, blackStats };
  };

  const calculateAccuracy = (stats: MoveStats) => {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const goodMoves = stats.Best + stats["Very Good"] + stats.Good + stats.Book;
    return Math.round((goodMoves / total) * 100);
  };

  const getCurrentMoveReview = useMemo(() => {
    if (
      !gameReview ||
      currentMoveIndex <= 0 ||
      currentMoveIndex > gameReview.length
    )
      return null;

    // Use direct array access since gameReview is ordered by moves
    // currentMoveIndex is 1-based, so subtract 1 for 0-based array access
    return gameReview[currentMoveIndex - 1];
  }, [gameReview, currentMoveIndex]);

  if (!gameReview || gameReview.length === 0) {
    return (
      <Box>
        <Stack spacing={2} alignItems="center">
          <Sparkles size={32} />
          <Typography variant="h6" sx={{ textAlign: "center" }}>
            Game Analysis
          </Typography>
          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Generate detailed move-by-move game review
          </Typography>

          <Button
            variant="contained"
            onClick={() => generateGameReview(moves, fen)}
            disabled={gameReviewLoading || moves.length === 0}
            startIcon={!gameReviewLoading && <PlayCircle size={18} />}
            sx={{
              px: 3,
              py: 1,
            }}
          >
            {gameReviewLoading ? "Analyzing..." : "Generate Analysis"}
          </Button>

          {gameReviewLoading && (
            <Box sx={{ width: "100%", maxWidth: 300 }}>
              <LinearProgress
                variant="determinate"
                value={gameReviewProgress}
              />
              <Typography
                variant="caption"
                sx={{ mt: 1, display: "block", textAlign: "center" }}
              >
                {`${Math.round(gameReviewProgress)}% Complete`}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  const stats = getStatistics();
  const currentMove = getCurrentMoveReview;

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Current Move Classification */}
        {currentMove && (
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle1">
                    {currentMove.notation}
                  </Typography>
                  <Chip
                    label={currentMove.quality}
                    size="small"
                    icon={getMoveClassificationStyle(currentMove.quality).icon}
                    sx={{
                      bgcolor: getMoveClassificationStyle(currentMove.quality)
                        .bgColor,
                      border: `1px solid ${getMoveClassificationStyle(currentMove.quality).color}40`,
                    }}
                  />
                </Box>

                <Stack direction="row" spacing={1}>
                </Stack>

                {/* PGN annotator comment */}
                {userThoughts && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block", mb: 0.5, fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}
                    >
                      Annotator Note
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "12px", fontStyle: "italic", lineHeight: 1.5 }}>
                      {userThoughts}
                    </Typography>
                  </Box>
                )}

                {/* Clock time remaining */}
                {clock && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Clock
                    </Typography>
                    <Chip
                      label={clock}
                      size="small"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        height: "20px",
                        bgcolor: "action.hover",
                        border: "1px solid",
                        borderColor: "divider",
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {stats && (
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2">Game Statistics</Typography>
              <Grid container spacing={2}>
                <Grid>
                  <Typography variant="caption" sx={{ isplay: "block", mb: 1 }}>
                    {whiteTitle} {whitePlayer} (White) -{" "}
                    {calculateAccuracy(stats.whiteStats)}% Accuracy
                  </Typography>
                  <Stack spacing={0.5}>
                    {Object.entries(stats.whiteStats).map(
                      ([classification, count]) => {
                        if (count === 0) return null;
                        const style = getMoveClassificationStyle(
                          classification as MoveQuality,
                        );
                        return (
                          <Box
                            key={classification}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                color: style.color,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {style.icon}
                            </Box>
                            <Typography variant="caption">
                              {classification}: {count}
                            </Typography>
                          </Box>
                        );
                      },
                    )}
                  </Stack>
                </Grid>
                <Grid>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mb: 1 }}
                  >
                    {blackTitle} {blackPlayer} (Black) -{" "}
                    {calculateAccuracy(stats.blackStats)}% Accuracy
                  </Typography>
                  <Stack spacing={0.5}>
                    {Object.entries(stats.blackStats).map(
                      ([classification, count]) => {
                        if (count === 0) return null;
                        const style = getMoveClassificationStyle(
                          classification as MoveQuality,
                        );
                        return (
                          <Box
                            key={classification}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                color: style.color,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {style.icon}
                            </Box>
                            <Typography variant="caption">
                              {classification}: {count}
                            </Typography>
                          </Box>
                        );
                      },
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
        {gameReview && gameReview.length > 0 && (
          <>
            <EvalGraph
              moves={gameReview}
              key={`eval-graph-${gameReview.length}`}
            />
          </>
        )}
        <GameReviewDialog
          gameReview={gameReviewTheme}
          currentMoveIndex={currentMoveIndex}
          moveAnalysis={gameReview}
          stockfishAnalysisResult={stockfishAnalysisResult}
        />
      </Stack>
    </Box>
  );
};

export default GameReviewTab;