import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  TrendingDown,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  PlayCircle,
  ThumbsUp,
  BookA,
  Sparkles,
} from "lucide-react";
import { MoveAnalysis } from "@/libs/agine/helper";
import { GameReviewTheme } from "@/libs/themes/helper";
import { PositionEval } from "@/stockfish/engine/engine";
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
  gameReviewLoading,
  currentMoveIndex,
  clock,
  whiteTitle,
  blackTitle,
  whitePlayer,
  blackPlayer,
  gameReviewProgress,
}) => {
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
    <Box sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>

        {/* ── Current move card — redesigned ── */}
        {currentMove && (() => {
          const style = getMoveClassificationStyle(currentMove.quality);
          return (
            <Box sx={{
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: style.color + "50",
              bgcolor: style.bgColor,
              overflow: "hidden",
            }}>
              {/* Top row: notation + badge */}
              <Box sx={{
                px: 1.5, py: 1,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: clock ? "1px solid" : "none",
                borderColor: style.color + "25",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ color: style.color, display: "flex", alignItems: "center" }}>{style.icon}</Box>
                  <Typography sx={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px" }}>
                    {currentMove.notation}
                  </Typography>
                </Box>
                <Chip
                  label={currentMove.quality}
                  size="small"
                  sx={{
                    bgcolor: "transparent",
                    border: `1px solid ${style.color}60`,
                    color: style.color,
                    fontSize: "10px",
                    fontWeight: 700,
                    height: 22,
                    letterSpacing: "0.03em",
                  }}
                />
              </Box>

              {/* Clock */}
              {clock && (
                <Box sx={{ px: 1.5, py: 0.75, display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: "10px", color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600 }}>
                    Clock
                  </Typography>
                  <Typography sx={{ fontSize: "11px", fontFamily: "monospace", color: "text.secondary" }}>
                    {clock}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })()}

        {/* ── Stats card ── */}
        {stats && (() => {
          const whiteAcc = calculateAccuracy(stats.whiteStats);
          const blackAcc = calculateAccuracy(stats.blackStats);
          const players = [
            { name: `${whiteTitle} ${whitePlayer}`, label: "White", acc: whiteAcc, stats: stats.whiteStats, isWhite: true },
            { name: `${blackTitle} ${blackPlayer}`, label: "Black", acc: blackAcc, stats: stats.blackStats, isWhite: false },
          ];
          // max count across all categories for bar scaling
          const allCounts = players.flatMap(p => Object.values(p.stats) as number[]);
          const maxCount = Math.max(...allCounts, 1);

          return (
            <Box sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>

              {/* Accuracy header with king icon + player name */}
              <Box sx={{ display: "flex", borderBottom: "1px solid", borderColor: "divider" }}>
                {players.map(({ name, label, acc, isWhite }, i) => (
                  <Box key={label} sx={{
                    flex: 1, py: 1.25, px: 1.5, textAlign: "center",
                    borderRight: i === 0 ? "1px solid" : "none", borderColor: "divider",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.6, mb: 0.5 }}>
                      <Box component="svg" viewBox="0 0 20 22" sx={{ width: 13, height: 13, flexShrink: 0 }}>
                        <rect x="8.5" y="0.5" width="3" height="2.5" rx="0.4" fill={isWhite ? "#ddd" : "#555"} stroke={isWhite ? "#999" : "#222"} strokeWidth="0.7" />
                        <rect x="9.5" y="0" width="1" height="4" rx="0.3" fill={isWhite ? "#ddd" : "#555"} stroke={isWhite ? "#999" : "#222"} strokeWidth="0.7" />
                        <path d="M5 7 Q5 5 10 5 Q15 5 15 7 L14 12 H6 Z" fill={isWhite ? "#ddd" : "#555"} stroke={isWhite ? "#999" : "#222"} strokeWidth="0.7" />
                        <rect x="4.5" y="12" width="11" height="2.5" rx="0.8" fill={isWhite ? "#ddd" : "#555"} stroke={isWhite ? "#999" : "#222"} strokeWidth="0.7" />
                        <rect x="3.5" y="14.5" width="13" height="2" rx="0.8" fill={isWhite ? "#ddd" : "#555"} stroke={isWhite ? "#999" : "#222"} strokeWidth="0.7" />
                      </Box>
                      <Typography sx={{ fontSize: "10px", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 88 }}>
                        {name}
                      </Typography>
                    </Box>
                    <Typography sx={{
                      fontSize: "22px", fontWeight: 800, lineHeight: 1,
                      color: acc >= 80 ? "#81C784" : acc >= 60 ? "#FFB74D" : "#E57373",
                    }}>
                      {acc}%
                    </Typography>
                    <Typography sx={{ fontSize: "9px", color: "text.disabled", letterSpacing: "0.8px", mt: 0.25 }}>
                      ACCURACY
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Per-player breakdown — side by side, each row: icon · label · bar · count */}
              <Box sx={{ display: "flex" }}>
                {players.map(({ label, stats: pStats }, i) => (
                  <Box key={label} sx={{
                    flex: 1, px: 1, py: 0.75,
                    borderRight: i === 0 ? "1px solid" : "none", borderColor: "divider",
                  }}>
                    {(Object.entries(pStats) as [MoveQuality, number][]).map(([q, count]) => {
                      if (count === 0) return null;
                      const style = getMoveClassificationStyle(q);
                      const barPct = Math.round((count / maxCount) * 100);
                      return (
                        <Box key={q} sx={{ mb: 0.5 }}>
                          {/* Label row */}
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Box sx={{ color: style.color, display: "flex", "& svg": { width: 10, height: 10 } }}>
                                {style.icon}
                              </Box>
                              <Typography sx={{ fontSize: "10px", color: "text.secondary", lineHeight: 1 }}>
                                {q}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: style.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                              {count}
                            </Typography>
                          </Box>
                          {/* Progress bar */}
                          <Box sx={{ height: 3, borderRadius: 2, bgcolor: style.bgColor, overflow: "hidden" }}>
                            <Box sx={{
                              height: "100%", width: `${barPct}%`,
                              bgcolor: style.color + "90",
                              borderRadius: 2,
                              transition: "width 0.4s ease",
                            }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>

            </Box>
          );
        })()}

      </Stack>
    </Box>
  );
};

export default GameReviewTab;