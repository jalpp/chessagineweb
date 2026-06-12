import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { TrackChanges as TrackChangesIcon } from "@mui/icons-material";
import { BarChart, PieChart, RadarChart } from "@mui/x-charts";
import { Color } from "chess.js";
import { KeyPosition } from "@/libs/batchreview/types";
import { parallelLimit } from "@/libs/batchreview/chessdb";
import {
  ThemeScore,
  themeColors,
  themeLabels,
} from "@/libs/themes/helper";
import { getThemeScoreCache, setThemeScoreCache } from "@/libs/themes/cache";

interface BatchThemeAnalysisProps {
  /** Blunder/mistake positions to profile, worst drops first. */
  keyPositions: KeyPosition[];
}

/** Maximum positions sent to the themes API per run, to bound cost. */
const MAX_THEME_POSITIONS = 30;

/**
 * Fetches a theme score for one FEN via the themes API, with the same
 * IndexedDB cache keys used by useThemeScore.
 */
async function fetchThemeScoreFast(
  fen: string,
  color: Color
): Promise<ThemeScore | null> {
  const cacheKey = `${fen}|${color}`;
  try {
    const cached = await getThemeScoreCache(cacheKey);
    if (cached) return cached;

    const response = await fetch("/api/themescore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, color }),
    });
    if (!response.ok) return null;

    const data: ThemeScore = await response.json();
    await setThemeScoreCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

const formatThemeName = (theme: keyof ThemeScore) =>
  themeLabels[theme] ||
  theme
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());

/**
 * Theme profile across the user's mistake positions, powered by the themes
 * API. Averages each theme score at the moments right before the user went
 * wrong, surfacing recurring weaknesses (e.g. king safety, dark squares).
 */
const BatchThemeAnalysis: React.FC<BatchThemeAnalysisProps> = React.memo(
  ({ keyPositions }) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [averages, setAverages] = useState<ThemeScore | null>(null);
    const [sampled, setSampled] = useState(0);

    const positions = useMemo(
      () => keyPositions.slice(0, MAX_THEME_POSITIONS),
      [keyPositions]
    );

    const handleGenerate = useCallback(async () => {
      setLoading(true);
      setProgress(0);

      let completed = 0;
      const scores = await parallelLimit(
        positions.map((position) => async () => {
          const sideToMove = position.fen.split(" ")[1] as Color;
          const score = await fetchThemeScoreFast(position.fen, sideToMove);
          completed++;
          setProgress(Math.round((completed / positions.length) * 100));
          return score;
        }),
        4
      );

      const valid = scores.filter((s): s is ThemeScore => s !== null);
      setSampled(valid.length);

      if (valid.length > 0) {
        const keys = Object.keys(valid[0]) as (keyof ThemeScore)[];
        const sums = keys.reduce(
          (acc, key) => ({ ...acc, [key]: 0 }),
          {} as ThemeScore
        );
        for (const score of valid) {
          for (const key of keys) sums[key] += score[key];
        }
        for (const key of keys) {
          sums[key] = Math.round((sums[key] / valid.length) * 100) / 100;
        }
        setAverages(sums);
      } else {
        setAverages(null);
      }
      setLoading(false);
    }, [positions]);

    const { weakest, strongest, themeKeys, chartData, pieData } = useMemo(() => {
      if (!averages) {
        return {
          weakest: [],
          strongest: [],
          themeKeys: [] as (keyof ThemeScore)[],
          chartData: [],
          pieData: [],
        };
      }

      const entries = (Object.keys(averages) as (keyof ThemeScore)[])
        .map((theme) => [theme, averages[theme]] as const)
        .sort((a, b) => a[1] - b[1]);

      const themeKeys = Object.keys(averages) as (keyof ThemeScore)[];
      const chartData = themeKeys.map((theme) => ({
        theme,
        label: formatThemeName(theme),
        score: averages[theme],
        color: themeColors[theme] || "#bb86fc",
      }));

      const total = chartData.reduce((sum, item) => sum + item.score, 0);
      const pieData = chartData.map((item) => ({
        id: item.theme,
        label: item.label,
        value: total > 0 ? (item.score / total) * 100 : 0,
        color: item.color,
      }));

      return {
        weakest: entries.slice(0, 3),
        strongest: entries.slice(-3).reverse(),
        themeKeys,
        chartData,
        pieData,
      };
    }, [averages]);

    if (keyPositions.length === 0) {
      return (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Theme Analysis
          </Typography>
          <Typography color="text.secondary">
            No mistake positions to profile in these games.
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Theme Analysis
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Profiles the positions right before your blunders and mistakes with
          the Agine themes engine — low scores point at recurring weaknesses
        </Typography>

        {!averages && !loading && (
          <Box mt={2}>
            <Button
              variant="contained"
              startIcon={<TrackChangesIcon />}
              onClick={() => void handleGenerate()}
            >
              Generate Theme Profile ({positions.length} positions)
            </Button>
          </Box>
        )}

        {loading && (
          <Box mt={2}>
            <Typography fontSize="0.85rem" gutterBottom>
              Scoring positions… {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {averages && !loading && (
          <Box mt={2}>
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Theme score radar
                </Typography>
                <RadarChart
                  height={360}
                  series={[
                    {
                      label: "Avg score at mistakes",
                      data: themeKeys.map((theme) => averages[theme]),
                      color: "#bb86fc",
                      fillArea: true,
                    },
                  ]}
                  radar={{
                    metrics: themeKeys.map((theme) => ({
                      name: formatThemeName(theme),
                    })),
                  }}
                />
              </Paper>

              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                useFlexGap
              >
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Theme score bars
                  </Typography>
                  <BarChart
                    xAxis={[
                      {
                        dataKey: "label",
                        scaleType: "band",
                        label: "Theme",
                      },
                    ]}
                    series={[
                      {
                        dataKey: "score",
                        label: "Average score",
                        color: "#bb86fc",
                      },
                    ]}
                    dataset={chartData}
                    height={280}
                    margin={{ left: 60, right: 20, bottom: 70 }}
                    grid={{ horizontal: true }}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Theme mix
                  </Typography>
                  <PieChart
                    series={[
                      {
                        data: pieData,
                        innerRadius: 56,
                        outerRadius: 110,
                        arcLabel: (item) => `${item.label}`,
                        arcLabelMinAngle: 18,
                      },
                    ]}
                    height={280}
                  />
                </Paper>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              mt={2}
              justifyContent="center"
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Weakest themes when you err
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {weakest.map(([theme, score]) => (
                    <Chip
                      key={theme}
                      label={`${formatThemeName(theme)}: ${score.toFixed(2)}`}
                      color="error"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Holding up well
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {strongest.map(([theme, score]) => (
                    <Chip
                      key={theme}
                      label={`${formatThemeName(theme)}: ${score.toFixed(2)}`}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mt={1}
              textAlign="center"
            >
              Based on {sampled} scored positions
            </Typography>
          </Box>
        )}

        {!averages && !loading && sampled === 0 && progress === 100 && (
          <Typography color="text.secondary" mt={2}>
            Theme scoring is unavailable right now — try again later.
          </Typography>
        )}
      </Paper>
    );
  }
);

BatchThemeAnalysis.displayName = "BatchThemeAnalysis";

export default BatchThemeAnalysis;
