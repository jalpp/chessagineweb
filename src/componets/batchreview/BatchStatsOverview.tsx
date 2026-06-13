import React, { useMemo } from "react";
import { Box, Paper, Typography } from "@mui/material";
import {
  Email as CorrespondenceIcon,
  HourglassBottom as ClassicalIcon,
  RocketLaunch as BulletIcon,
  Timer as RapidIcon,
  Whatshot as BlitzIcon,
} from "@mui/icons-material";
import { BatchReviewResult, GameSummary } from "@/libs/batchreview/types";
import TutorSegmentBar from "./TutorSegmentBar";

interface BatchStatsOverviewProps {
  result: BatchReviewResult;
}

/** Aggregated tutor metrics for one time control. */
interface SpeedGroup {
  speed: string;
  games: GameSummary[];
  percentOfTotal: number;
  avgRating: number | null;
  scorePercent: number;
  avgAccuracy: number;
  blundersPerGame: number;
  mistakesPerGame: number;
}

const SPEED_ICONS: Record<string, React.ReactNode> = {
  bullet: <BulletIcon sx={{ fontSize: 36 }} />,
  blitz: <BlitzIcon sx={{ fontSize: 36 }} />,
  rapid: <RapidIcon sx={{ fontSize: 36 }} />,
  classical: <ClassicalIcon sx={{ fontSize: 36 }} />,
  correspondence: <CorrespondenceIcon sx={{ fontSize: 36 }} />,
};

/** Groups reviewed games by time control with tutor-style aggregates. */
function buildSpeedGroups(games: GameSummary[]): SpeedGroup[] {
  const bySpeed = new Map<string, GameSummary[]>();
  for (const game of games) {
    bySpeed.set(game.speed, [...(bySpeed.get(game.speed) ?? []), game]);
  }

  return Array.from(bySpeed.entries())
    .map(([speed, group]) => {
      const wins = group.filter((g) => g.outcome === "win").length;
      const draws = group.filter((g) => g.outcome === "draw").length;
      const rated = group.filter((g) => g.userRating !== undefined);
      const blunders = group.reduce(
        (sum, g) => sum + g.qualityCounts["Blunder"],
        0
      );
      const mistakes = group.reduce(
        (sum, g) => sum + g.qualityCounts["Mistake"],
        0
      );
      return {
        speed,
        games: group,
        percentOfTotal: Math.round((group.length / games.length) * 1000) / 10,
        avgRating:
          rated.length > 0
            ? Math.round(
                rated.reduce((sum, g) => sum + (g.userRating ?? 0), 0) /
                  rated.length
              )
            : null,
        scorePercent: Math.round(((wins + draws * 0.5) / group.length) * 100),
        avgAccuracy:
          Math.round(
            (group.reduce((sum, g) => sum + g.accuracy, 0) / group.length) * 10
          ) / 10,
        blundersPerGame: blunders / group.length,
        mistakesPerGame: mistakes / group.length,
      };
    })
    .sort((a, b) => b.games.length - a.games.length);
}

/**
 * Lichess Tutor style overview: a summary hero (date range, game count,
 * rating) with an explanatory blurb, followed by one card per time control
 * showing segmented rating bars for accuracy, score and error avoidance.
 */
const BatchStatsOverview: React.FC<BatchStatsOverviewProps> = React.memo(
  ({ result }) => {
    const speedGroups = useMemo(
      () => buildSpeedGroups(result.games),
      [result.games]
    );

    const { rangeLabel, daysLabel } = useMemo(() => {
      const dates = result.games.map((g) => g.playedAt);
      const oldest = new Date(Math.min(...dates));
      const newest = new Date(Math.max(...dates));
      const fmt = (d: Date) =>
        `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
      const days = Math.max(
        1,
        Math.round((newest.getTime() - oldest.getTime()) / 86_400_000)
      );
      return {
        rangeLabel: `${fmt(oldest)} → ${fmt(newest)}`,
        daysLabel: `${days} day${days > 1 ? "s" : ""}`,
      };
    }, [result.games]);

    const overallRating = useMemo(() => {
      const rated = result.games.filter((g) => g.userRating !== undefined);
      if (rated.length === 0) return null;
      return Math.round(
        rated.reduce((sum, g) => sum + (g.userRating ?? 0), 0) / rated.length
      );
    }, [result.games]);

    return (
      <Box>
        {/* Summary hero */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            borderRadius: 3,
            bgcolor: "action.hover",
          }}
        >
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography fontSize="0.85rem" color="text.secondary">
                {rangeLabel}
              </Typography>
              <Typography fontWeight={700}>{daysLabel}</Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                border: 1,
                borderColor: "success.dark",
              }}
            >
              <Typography fontWeight={700}>
                {result.games.length} games
              </Typography>
              <Typography fontSize="0.85rem" color="text.secondary">
                {overallRating !== null
                  ? `Rating ${overallRating}`
                  : `for ${result.username}`}
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography fontWeight={700}>
                {result.record.wins}-{result.record.draws}-{result.record.losses}
              </Typography>
              <Typography fontSize="0.85rem" color="text.secondary">
                W-D-L record
              </Typography>
            </Box>
          </Box>
          <Typography fontSize="0.9rem" color="text.secondary">
            Each aspect of your play is measured across your reviewed games.
            It should give you some idea about what your strengths are, and
            where you have room for improvement.
          </Typography>
        </Paper>

        {/* Per time-control tutor cards */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          }}
        >
          {speedGroups.map((group) => (
            <Paper
              key={group.speed}
              elevation={2}
              sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}
            >
              <Box display="flex" gap={2} mb={2}>
                <Box sx={{ color: "text.secondary", mt: 0.5 }}>
                  {SPEED_ICONS[group.speed] ?? <RapidIcon sx={{ fontSize: 36 }} />}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {group.games.length}{" "}
                    <Box
                      component="span"
                      sx={{ textTransform: "capitalize" }}
                    >
                      {group.speed}
                    </Box>{" "}
                    game{group.games.length > 1 ? "s" : ""}
                  </Typography>
                  <Typography fontSize="0.85rem" color="text.secondary">
                    {group.speed} games represent{" "}
                    <strong>{group.percentOfTotal}%</strong> of your reviewed
                    games.
                    {group.avgRating !== null && (
                      <>
                        {" "}
                        Average rating: <strong>{group.avgRating}</strong>.
                      </>
                    )}{" "}
                    Score: <strong>{group.scorePercent}%</strong>.
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" flexDirection="column" gap={2}>
                <TutorSegmentBar
                  label="Accuracy"
                  fraction={group.avgAccuracy / 100}
                  detail={`${group.avgAccuracy}% average accuracy`}
                />
                <TutorSegmentBar
                  label="Score"
                  fraction={group.scorePercent / 100}
                  detail={`${group.scorePercent}% score across ${group.games.length} games`}
                />
                <TutorSegmentBar
                  label="Blunder Avoidance"
                  fraction={1 - Math.min(1, group.blundersPerGame / 1.5)}
                  detail={`${group.blundersPerGame.toFixed(2)} blunders per game`}
                />
                <TutorSegmentBar
                  label="Mistake Avoidance"
                  fraction={1 - Math.min(1, group.mistakesPerGame / 3)}
                  detail={`${group.mistakesPerGame.toFixed(2)} mistakes per game`}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  }
);

BatchStatsOverview.displayName = "BatchStatsOverview";

export default BatchStatsOverview;
