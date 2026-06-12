import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { BatchReviewResult } from "@/libs/batchreview/types";

interface BatchStatsOverviewProps {
  result: BatchReviewResult;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

/** Single headline stat card. */
const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  valueColor,
}) => (
  <Paper elevation={2} sx={{ p: 2, height: "100%", textAlign: "center" }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={700} sx={{ color: valueColor }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    )}
  </Paper>
);

/** @returns "W-D-L" score percent for a record bucket. */
const scorePercent = (r: { wins: number; draws: number; losses: number }) => {
  const games = r.wins + r.draws + r.losses;
  if (games === 0) return "—";
  return `${Math.round(((r.wins + r.draws * 0.5) / games) * 100)}%`;
};

/**
 * Headline stat cards for a batch review: record, score by color,
 * average accuracy and total blunders/mistakes.
 */
const BatchStatsOverview: React.FC<BatchStatsOverviewProps> = React.memo(
  ({ result }) => {
    const { record, recordAsWhite, recordAsBlack, totalQualityCounts } = result;
    const totalGames = result.games.length;
    const blunders = totalQualityCounts["Blunder"];
    const mistakes = totalQualityCounts["Mistake"];

    return (
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)",
          },
        }}
      >
        <StatCard
          label="Games"
          value={String(totalGames)}
          sub={`for ${result.username}`}
        />
        <StatCard
          label="Record (W-D-L)"
          value={`${record.wins}-${record.draws}-${record.losses}`}
          sub={`score ${scorePercent(record)}`}
        />
        <StatCard
          label="As White"
          value={scorePercent(recordAsWhite)}
          sub={`${recordAsWhite.wins}-${recordAsWhite.draws}-${recordAsWhite.losses}`}
        />
        <StatCard
          label="As Black"
          value={scorePercent(recordAsBlack)}
          sub={`${recordAsBlack.wins}-${recordAsBlack.draws}-${recordAsBlack.losses}`}
        />
        <StatCard
          label="Avg Accuracy"
          value={`${result.avgAccuracy}%`}
          sub="across your moves"
        />
        <StatCard
          label="Blunders / Mistakes"
          value={`${blunders} / ${mistakes}`}
          valueColor={blunders > 0 ? "#E57373" : undefined}
          sub={`${(blunders / Math.max(totalGames, 1)).toFixed(1)} blunders per game`}
        />
      </Box>
    );
  },
);

BatchStatsOverview.displayName = "BatchStatsOverview";

export default BatchStatsOverview;
