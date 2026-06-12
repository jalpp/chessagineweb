import React, { useMemo } from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { BatchReviewResult } from "@/libs/batchreview/types";

interface BatchChartsProps {
  result: BatchReviewResult;
}

const QUALITY_ORDER = [
  "Best",
  "Very Good",
  "Good",
  "Dubious",
  "Mistake",
  "Blunder",
  "Book",
] as const;

const QUALITY_COLORS: Record<(typeof QUALITY_ORDER)[number], string> = {
  Best: "#64B5F6",
  "Very Good": "#81C784",
  Good: "#AED581",
  Dubious: "#FFB74D",
  Mistake: "#FF8A65",
  Blunder: "#E57373",
  Book: "#90A4AE",
};

/**
 * Plot analysis for a batch review:
 * - Bar chart of the user's move-quality distribution across all games
 * - Line chart of per-game accuracy and rating over time (oldest → newest)
 */
const BatchCharts: React.FC<BatchChartsProps> = React.memo(({ result }) => {
  const theme = useTheme();

  // Games arrive newest-first from the API; plot oldest → newest
  const chronological = useMemo(
    () => [...result.games].reverse(),
    [result.games]
  );

  const qualityData = useMemo(
    () =>
      QUALITY_ORDER.map((q) => ({
        quality: q,
        count: result.totalQualityCounts[q],
      })),
    [result.totalQualityCounts]
  );

  const { gameLabels, accuracyData, ratingData, hasRatings } = useMemo(() => {
    const gameLabels = chronological.map((_, i) => i + 1);
    const accuracyData = chronological.map((g) => g.accuracy);
    const ratingData = chronological.map((g) => g.userRating ?? null);
    return {
      gameLabels,
      accuracyData,
      ratingData,
      hasRatings: ratingData.some((r) => r !== null),
    };
  }, [chronological]);

  const accuracyFormatter = (value: number | null, ctx: { dataIndex?: number }) => {
    if (value === null || ctx.dataIndex === undefined) return "";
    const g = chronological[ctx.dataIndex];
    return `vs ${g.opponentName} (${g.outcome}): ${value}% accuracy`;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Move Quality Distribution
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Your moves across all {result.games.length} games
        </Typography>
        <BarChart
          xAxis={[
            {
              dataKey: "quality",
              scaleType: "band" as const,
              label: "Quality",
              colorMap: {
                type: "ordinal" as const,
                values: QUALITY_ORDER as unknown as string[],
                colors: QUALITY_ORDER.map((q) => QUALITY_COLORS[q]),
              },
            },
          ]}
          series={[{ dataKey: "count", label: "Moves" }]}
          dataset={qualityData}
          height={260}
          margin={{ left: 60, right: 20, bottom: 50 }}
          grid={{ horizontal: true }}
        />
      </Paper>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Accuracy Trend
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Per-game accuracy, oldest game on the left
        </Typography>
        <LineChart
          xAxis={[
            { data: gameLabels, label: "Game", scaleType: "linear" as const },
          ]}
          series={[
            {
              data: accuracyData,
              label: "Accuracy %",
              color: theme.palette.primary.main,
              showMark: true,
              curve: "linear" as const,
              valueFormatter: accuracyFormatter,
            },
          ]}
          yAxis={[{ min: 0, max: 100, label: "Accuracy %" }]}
          height={280}
        />
      </Paper>

      {hasRatings && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Rating Trend
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Your rating at game time, oldest game on the left
          </Typography>
          <LineChart
            xAxis={[
              { data: gameLabels, label: "Game", scaleType: "linear" as const },
            ]}
            series={[
              {
                data: ratingData,
                label: "Rating",
                color: theme.palette.text.primary,
                showMark: true,
                connectNulls: true,
                curve: "linear" as const,
              },
            ]}
            height={240}
          />
        </Paper>
      )}
    </Box>
  );
});

BatchCharts.displayName = "BatchCharts";

export default BatchCharts;
