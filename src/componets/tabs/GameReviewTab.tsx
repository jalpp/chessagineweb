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
import { MoveAnalysis, MoveQuality } from "../../hooks/useGameReview";
import EvalGraph from "./EvalGraph";
import { GameReviewDialog} from "./GameReviewDialog";
import { GameReviewTheme } from "@/libs/themes/helper";
export interface MoveStats {
  Best: number;
  "Very Good": number;
  Good: number;
  Dubious: number;
  Mistake: number;
  Blunder: number;
  Book: number;
}

interface GameReviewTabProps {
  gameReview: MoveAnalysis[] | null;
  generateGameReview: (moves: string[]) => Promise<void>;
  gameReviewTheme: GameReviewTheme | null;
  moves: string[];
  gameReviewLoading: boolean;
  gameReviewProgress: number;
  goToMove: (index: number) => void;
  currentMoveIndex: number;
  handleMoveCoachClick: (gameReview: MoveAnalysis) => void;
  gameInfo: string;
  whiteTitle: string;
  blackTitle: string;
  whitePlayer: string;
  blackPlayer: string;
  handleMoveAnnontateClick: (review: MoveAnalysis, customQuery?: string) => void;
  handleGameReviewClick: (review: MoveAnalysis[], gameInfo: string) => void;
  chatLoading: boolean;
  comment: string;
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
  moves,
  gameReviewLoading,
  currentMoveIndex,
  handleMoveCoachClick,
  handleMoveAnnontateClick,
  handleGameReviewClick,
  gameReviewTheme,
  chatLoading,
  comment,
  whiteTitle,
  blackTitle,
  whitePlayer,
  blackPlayer,
  gameReviewProgress,
  gameInfo
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

  useEffect(() => {
    if (!chatLoading) {
      setLoadingStates({
        chat: {},
        annotate: {},
        gameReport: false,
      });
    }
  }, [chatLoading]);

  const handleChatClick = (review: MoveAnalysis) => {
    setLoadingStates(prev => ({
      ...prev,
      chat: { ...prev.chat, [review.plyNumber]: true }
    }));
    handleMoveCoachClick(review);
  };

  const handleAnnotateClick = (review: MoveAnalysis, customQuery?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      annotate: { ...prev.annotate, [review.plyNumber]: true }
    }));
    handleMoveAnnontateClick(review, customQuery);
  };

  const handleGameReportClick = () => {
    setLoadingStates(prev => ({
      ...prev,
      gameReport: true
    }));
    
    const stats = getStatistics();
    let newGameInfo = gameInfo;
    if (stats) {
      const { whiteStats, blackStats } = stats;
      const whiteStatsStr = `White Stats: Best: ${whiteStats.Best}, Very Good: ${whiteStats["Very Good"]}, Good: ${whiteStats.Good}, Dubious: ${whiteStats.Dubious}, Mistake: ${whiteStats.Mistake}, Blunder: ${whiteStats.Blunder}, Book: ${whiteStats.Book}, accuracy: ${calculateAccuracy(whiteStats)}`;
      const blackStatsStr = `Black Stats: Best: ${blackStats.Best}, Very Good: ${blackStats["Very Good"]}, Good: ${blackStats.Good}, Dubious: ${blackStats.Dubious}, Mistake: ${blackStats.Mistake}, Blunder: ${blackStats.Blunder}, Book: ${blackStats.Book}, accuracy: ${calculateAccuracy(blackStats)}`;
      newGameInfo = `${gameInfo}\nGAME REVIEW DETAILS\n${whiteStatsStr}\n${blackStatsStr}`;
    }
    handleGameReviewClick(gameReview!, newGameInfo);
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
    if (!gameReview || currentMoveIndex <= 0 || currentMoveIndex > gameReview.length) return null;
    
    // Use direct array access since gameReview is ordered by moves
    // currentMoveIndex is 1-based, so subtract 1 for 0-based array access
    return gameReview[currentMoveIndex - 1];
  }, [gameReview, currentMoveIndex]);

  if (!gameReview || gameReview.length === 0) {
    return (
      <Box sx={{ bgcolor: "#000", p: 2 }}>
        <Stack spacing={2} alignItems="center">
          <Sparkles size={32} color="#666" />
          <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
            AI Game Analysis
          </Typography>
          <Typography variant="body2" sx={{ color: "#999", textAlign: "center" }}>
            Generate detailed move-by-move analysis with AI insights
          </Typography>

          <Button
            variant="contained"
            onClick={() => generateGameReview(moves)}
            disabled={gameReviewLoading || moves.length === 0}
            startIcon={!gameReviewLoading && <PlayCircle size={18} />}
            sx={{
              bgcolor: "#333",
              color: "#fff",
              px: 3,
              py: 1,
              "&:hover": { bgcolor: "#444" },
              "&:disabled": { bgcolor: "#222", color: "#666" },
            }}
          >
            {gameReviewLoading ? "Analyzing..." : "Generate Analysis"}
          </Button>

          {gameReviewLoading && (
            <Box sx={{ width: "100%", maxWidth: 300 }}>
              <LinearProgress
                variant="determinate"
                value={gameReviewProgress}
                sx={{
                  bgcolor: "#333",
                  "& .MuiLinearProgress-bar": { bgcolor: "#666" },
                }}
              />
              <Typography variant="caption" sx={{ color: "#999", mt: 1, display: "block", textAlign: "center" }}>
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
    <Box sx={{ bgcolor: "#000", p: 2 }}>
      <Stack spacing={2}>
        {/* Current Move Classification */}
        {currentMove && (
          <Card sx={{ bgcolor: "#111", border: "1px solid #333" }}>
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="subtitle1" sx={{ color: "#fff" }}>
                    {currentMove.notation}
                  </Typography>
                  <Chip
                    label={currentMove.quality}
                    size="small"
                    icon={getMoveClassificationStyle(currentMove.quality).icon}
                    sx={{
                      bgcolor: getMoveClassificationStyle(currentMove.quality).bgColor,
                      color: getMoveClassificationStyle(currentMove.quality).color,
                      border: `1px solid ${getMoveClassificationStyle(currentMove.quality).color}40`,
                    }}
                  />
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      loadingStates.chat[currentMove.plyNumber] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <MessageCircle size={16} />
                      )
                    }
                    onClick={() => handleChatClick(currentMove)}
                    disabled={chatLoading}
                    sx={{
                      borderColor: "#333",
                      color: "#fff",
                      "&:hover": { borderColor: "#555", bgcolor: "#222" },
                      "&:disabled": { borderColor: "#222", color: "#666" },
                    }}
                  >
                    Ask AI
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      loadingStates.annotate[currentMove.plyNumber] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Pen size={16} />
                      )
                    }
                    onClick={() => handleAnnotateClick(currentMove, userThoughts)}
                    disabled={chatLoading}
                    sx={{
                      borderColor: "#333",
                      color: "#fff",
                      "&:hover": { borderColor: "#555", bgcolor: "#222" },
                      "&:disabled": { borderColor: "#222", color: "#666" },
                    }}
                  >
                    Annotate
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Analysis Notes */}
        <Card sx={{ bgcolor: "#111", border: "1px solid #333" }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ color: "#fff", mb: 1 }}>
              Your Analysis Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              placeholder="Add your thoughts about the position..."
              value={userThoughts}
              onChange={(e) => setUserThoughts(e.target.value)}
              disabled={chatLoading}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#000",
                  color: "#fff",
                  "& fieldset": { borderColor: "#333" },
                  "&:hover fieldset": { borderColor: "#555" },
                  "&.Mui-focused fieldset": { borderColor: "#666" },
                },
                "& .MuiInputBase-input::placeholder": { color: "#666" },
              }}
            />
            
            <Button
              variant="contained"
              startIcon={
                loadingStates.gameReport ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Sparkles size={18} />
                )
              }
              onClick={handleGameReportClick}
              disabled={!gameReview || gameReview.length === 0 || chatLoading}
              sx={{
                mt: 2,
                bgcolor: "#333",
                color: "#fff",
                py: 1,
                "&:hover": { bgcolor: "#444" },
                "&:disabled": { bgcolor: "#222", color: "#666" },
              }}
            >
              {loadingStates.gameReport ? "Generating Report..." : "Generate Game Report"}
            </Button>
          </CardContent>
        </Card>

        {/* Game Statistics */}
        {stats && (
          <Card sx={{ bgcolor: "#111", border: "1px solid #333" }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 2 }}>
                Game Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid >
                  <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 1 }}>
                    {whiteTitle} {whitePlayer} (White) - {calculateAccuracy(stats.whiteStats)}% Accuracy
                  </Typography>
                  <Stack spacing={0.5}>
                    {Object.entries(stats.whiteStats).map(([classification, count]) => {
                      if (count === 0) return null;
                      const style = getMoveClassificationStyle(classification as MoveQuality);
                      return (
                        <Box key={classification} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ color: style.color, display: "flex", alignItems: "center" }}>
                            {style.icon}
                          </Box>
                          <Typography variant="caption" sx={{ color: style.color }}>
                            {classification}: {count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Grid>
                <Grid >
                  <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 1 }}>
                    {blackTitle} {blackPlayer} (Black) - {calculateAccuracy(stats.blackStats)}% Accuracy
                  </Typography>
                  <Stack spacing={0.5}>
                    {Object.entries(stats.blackStats).map(([classification, count]) => {
                      if (count === 0) return null;
                      const style = getMoveClassificationStyle(classification as MoveQuality);
                      return (
                        <Box key={classification} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ color: style.color, display: "flex", alignItems: "center" }}>
                            {style.icon}
                          </Box>
                          <Typography variant="caption" sx={{ color: style.color }}>
                            {classification}: {count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <EvalGraph moves={gameReview}/>
        <GameReviewDialog gameReview={gameReviewTheme} currentMoveIndex={currentMoveIndex} moveAnalysis={gameReview}/>
      </Stack>
    </Box>
  );
};

export default GameReviewTab;