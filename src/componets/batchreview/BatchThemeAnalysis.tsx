import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { TrackChanges as TrackChangesIcon, HelpOutline as HelpOutlineIcon } from "@mui/icons-material";
import NextLink from "next/link";
import { LineChart, RadarChart } from "@mui/x-charts";
import { GameSummary } from "@/libs/batchreview/types";
import { parallelLimit } from "@/libs/batchreview/chessdb";
import {
  averageThemeProfiles,
  fetchGameThemeReview,
  getUserThemeProfile,
  THEME_KEYS,
} from "@/libs/batchreview/themes";
import { getThemeLabelColor, ThemeScore } from "@/libs/themes/helper";
import TutorSegmentBar from "./TutorSegmentBar";

interface BatchThemeAnalysisProps {
  /** Reviewed games, newest first (as produced by the analyzer). */
  games: GameSummary[];
}

/** One game's theme profile from the user's perspective. */
interface GameThemeProfile {
  game: GameSummary;
  profile: ThemeScore;
}

const SAMPLE_OPTIONS = [10, 20, 30];

const formatThemeName = (theme: string) =>
  theme
    .split(/(?=[A-Z])/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Batch theme analysis powered by the Agine themes engine.
 *
 * Fetches a per-game theme review (cached per game id) and shows:
 * - A radar comparing the user's average theme profile in wins vs losses
 * - A line graph of selected theme scores across games (oldest → newest)
 * - Weakest/strongest theme chips
 */
const BatchThemeAnalysis: React.FC<BatchThemeAnalysisProps> = React.memo(
  ({ games }) => {
    const [sampleSize, setSampleSize] = useState(
      SAMPLE_OPTIONS.find((n) => n >= Math.min(games.length, 10)) ?? 10
    );
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [profiles, setProfiles] = useState<GameThemeProfile[] | null>(null);
    const [selectedThemes, setSelectedThemes] = useState<(keyof ThemeScore)[]>(
      []
    );

    const handleGenerate = useCallback(async () => {
      setLoading(true);
      setProgress(0);
      // Most recent N games, processed oldest → newest for the trend chart
      const sample = games.slice(0, sampleSize).reverse();

      let completed = 0;
      const fetched = await parallelLimit(
        sample.map((game) => async () => {
          const review = await fetchGameThemeReview(game.pgn, game.gameId);
          completed++;
          setProgress(Math.round((completed / sample.length) * 100));
          if (!review) return null;
          const profile = getUserThemeProfile(review, game.userColor);
          return profile ? { game, profile } : null;
        }),
        3
      );

      const valid = fetched.filter((p): p is GameThemeProfile => p !== null);
      setProfiles(valid);

      // Default the trend chart to the user's three weakest themes
      const overall = averageThemeProfiles(valid.map((p) => p.profile));
      if (overall) {
        const weakest = (Object.entries(overall) as [keyof ThemeScore, number][])
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([theme]) => theme);
        setSelectedThemes(weakest);
      }
      setLoading(false);
    }, [games, sampleSize]);

    const overallAverage = useMemo(
      () =>
        profiles ? averageThemeProfiles(profiles.map((p) => p.profile)) : null,
      [profiles]
    );

    const winAverage = useMemo(
      () =>
        profiles
          ? averageThemeProfiles(
              profiles
                .filter((p) => p.game.outcome === "win")
                .map((p) => p.profile)
            )
          : null,
      [profiles]
    );

    const lossAverage = useMemo(
      () =>
        profiles
          ? averageThemeProfiles(
              profiles
                .filter((p) => p.game.outcome === "loss")
                .map((p) => p.profile)
            )
          : null,
      [profiles]
    );

    const { weakest, strongest } = useMemo(() => {
      if (!overallAverage)
        return { weakest: [] as [string, number][], strongest: [] as [string, number][] };
      const entries = Object.entries(overallAverage).sort((a, b) => a[1] - b[1]);
      return { weakest: entries.slice(0, 3), strongest: entries.slice(-3).reverse() };
    }, [overallAverage]);

    const toggleTheme = (theme: keyof ThemeScore) => {
      setSelectedThemes((prev) =>
        prev.includes(theme)
          ? prev.filter((t) => t !== theme)
          : [...prev, theme]
      );
    };

    /**
     * x-charts RadarChart uses a single shared 0-based scale across every
     * metric axis, but Agine theme scores are signed (roughly -1..1) and
     * each theme has its own natural range. Without normalization, an
     * extreme value on one axis (e.g. a single-loss outlier) stretches
     * every other axis, producing the "exploded star" shape.
     *
     * Fix: per metric, find the max absolute value across all series and
     * map [-max, max] -> [0, 1]. Every axis is then independently scaled
     * to its own spread, while staying on the chart's shared 0..1 scale.
     */
    const radarSeries = useMemo(() => {
      const rawSeries: { label: string; values: number[]; color: string }[] = [];
      if (winAverage) {
        rawSeries.push({
          label: "In wins",
          values: THEME_KEYS.map((key) => winAverage[key]),
          color: "#81c784",
        });
      }
      if (lossAverage) {
        rawSeries.push({
          label: "In losses",
          values: THEME_KEYS.map((key) => lossAverage[key]),
          color: "#ef6f6f",
        });
      }
      if (rawSeries.length === 0 && overallAverage) {
        rawSeries.push({
          label: "Average",
          values: THEME_KEYS.map((key) => overallAverage[key]),
          color: "#bb86fc",
        });
      }
      if (rawSeries.length === 0) return [];

      // Per-axis (per theme) max absolute value across all series
      const axisMax = THEME_KEYS.map((_, axisIndex) =>
        Math.max(
          0.0001,
          ...rawSeries.map((s) => Math.abs(s.values[axisIndex]))
        )
      );

      return rawSeries.map((s) => ({
        label: s.label,
        color: s.color,
        fillArea: true,
        data: s.values.map((value, axisIndex) =>
          // Map [-max, max] -> [0, 1] per axis
          (value / axisMax[axisIndex] + 1) / 2
        ),
        valueFormatter: (_value: number | null, ctx: { dataIndex?: number }) =>
          ctx.dataIndex !== undefined
            ? s.values[ctx.dataIndex].toFixed(2)
            : "",
      }));
    }, [winAverage, lossAverage, overallAverage]);

    if (games.length === 0) {
      return (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Theme Analysis
          </Typography>
          <Typography color="text.secondary">No games to profile.</Typography>
        </Paper>
      );
    }

    return (
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1}
          flexWrap="wrap"
        >
          <Box>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Theme Analysis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Profiles each game with the Agine themes engine from your side
              of the board — compare how your themes hold up in wins vs
              losses and track them across games
            </Typography>
          </Box>
          <Button
            component={NextLink}
            href="/agine-analyzer/themes"
            size="small"
            startIcon={<HelpOutlineIcon />}
            sx={{ flexShrink: 0 }}
          >
            What do these scores mean?
          </Button>
        </Box>

        {!profiles && !loading && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            mt={2}
            alignItems={{ sm: "center" }}
          >
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Games to profile</InputLabel>
              <Select
                value={sampleSize}
                label="Games to profile"
                onChange={(e) => setSampleSize(Number(e.target.value))}
              >
                {SAMPLE_OPTIONS.filter(
                  (n, i) => i === 0 || SAMPLE_OPTIONS[i - 1] < games.length
                ).map((n) => (
                  <MenuItem key={n} value={n}>
                    Most recent {Math.min(n, games.length)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<TrackChangesIcon />}
              onClick={() => void handleGenerate()}
            >
              Generate Theme Analysis
            </Button>
          </Stack>
        )}

        {loading && (
          <Box mt={2}>
            <Typography fontSize="0.85rem" gutterBottom>
              Profiling games with the themes engine… {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {profiles && !loading && profiles.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            The themes engine couldn&apos;t profile these games right now —
            try again later.
          </Alert>
        )}

        {profiles && !loading && profiles.length > 0 && overallAverage && (
          <Stack spacing={3} mt={2}>
            <Box>
              <Typography fontWeight={600} gutterBottom>
                Theme Strength
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={1.5}
              >
                Average Agine theme scores across your games, scaled to your
                strongest theme
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                }}
              >
                {(() => {
                  const maxScore = Math.max(
                    0.0001,
                    ...THEME_KEYS.map((key) => Math.abs(overallAverage[key]))
                  );
                  return THEME_KEYS.map((theme) => (
                    <TutorSegmentBar
                      key={theme}
                      label={formatThemeName(theme)}
                      fraction={Math.abs(overallAverage[theme]) / maxScore}
                      detail={`Average score: ${overallAverage[theme]}`}
                      color={getThemeLabelColor(theme)}
                      valueLabel={overallAverage[theme].toFixed(2)}
                    />
                  ));
                })()}
              </Box>
            </Box>

            <Box>
              <Typography fontWeight={600} gutterBottom>
                Wins vs Losses Theme Profile
              </Typography>
              <RadarChart
                height={380}
                series={radarSeries}
                radar={{
                  metrics: THEME_KEYS.map((theme) => ({
                    name: formatThemeName(theme),
                    min: 0,
                    max: 1,
                  })),
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                textAlign="center"
                mt={1}
              >
                Each axis is scaled to its own range — hover a point to see
                the actual theme score
              </Typography>
            </Box>

            <Box>
              <Typography fontWeight={600} gutterBottom>
                Theme Trend Across Games
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                mb={1}
              >
                {THEME_KEYS.map((theme) => (
                  <Chip
                    key={theme}
                    label={formatThemeName(theme)}
                    size="small"
                    onClick={() => toggleTheme(theme)}
                    variant={
                      selectedThemes.includes(theme) ? "filled" : "outlined"
                    }
                    sx={
                      selectedThemes.includes(theme)
                        ? {
                            bgcolor: getThemeLabelColor(theme),
                            color: "#fff",
                            "&:hover": { bgcolor: getThemeLabelColor(theme) },
                          }
                        : undefined
                    }
                  />
                ))}
              </Stack>
              <LineChart
                height={300}
                xAxis={[
                  {
                    data: profiles.map((_, i) => i + 1),
                    label: "Game (oldest → newest)",
                    scaleType: "linear" as const,
                    valueFormatter: (value: number) => {
                      const p = profiles[value - 1];
                      return p
                        ? `Game ${value}: vs ${p.game.opponentName} (${p.game.outcome})`
                        : `Game ${value}`;
                    },
                  },
                ]}
                series={selectedThemes.map((theme) => ({
                  data: profiles.map((p) => p.profile[theme]),
                  label: formatThemeName(theme),
                  color: getThemeLabelColor(theme),
                  showMark: true,
                  curve: "linear" as const,
                  valueFormatter: (
                    value: number | null,
                    ctx: { dataIndex?: number }
                  ) => {
                    if (value === null || ctx.dataIndex === undefined) return "";
                    const p = profiles[ctx.dataIndex];
                    return `${value.toFixed(2)} (vs ${p.game.opponentName}, ${p.game.outcome})`;
                  },
                }))}
              />
            </Box>

            <Box>
              <Typography fontWeight={600} gutterBottom>
                Per-Game Theme Scores
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={1}
              >
                Oldest game first, matching the trend chart above
              </Typography>
              <TableContainer sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Opponent</TableCell>
                      <TableCell>Result</TableCell>
                      {THEME_KEYS.map((theme) => (
                        <TableCell key={theme} align="right">
                          {formatThemeName(theme)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profiles.map((p, i) => (
                      <TableRow key={p.game.gameId} hover>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{p.game.opponentName}</TableCell>
                        <TableCell
                          sx={{
                            color:
                              p.game.outcome === "win"
                                ? "success.main"
                                : p.game.outcome === "loss"
                                ? "error.main"
                                : "text.secondary",
                            textTransform: "capitalize",
                          }}
                        >
                          {p.game.outcome}
                        </TableCell>
                        {THEME_KEYS.map((theme) => (
                          <TableCell key={theme} align="right">
                            {p.profile[theme].toFixed(2)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  gutterBottom
                >
                  Weakest themes
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {weakest.map(([theme, score]) => (
                    <Chip
                      key={theme}
                      label={`${formatThemeName(theme)}: ${score}`}
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
                  Strongest themes
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {strongest.map(([theme, score]) => (
                    <Chip
                      key={theme}
                      label={`${formatThemeName(theme)}: ${score}`}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>

            <Box display="flex" justifyContent="center" gap={1}>
              <Typography variant="caption" color="text.secondary">
                Based on {profiles.length} profiled games
              </Typography>
              <Button size="small" onClick={() => setProfiles(null)}>
                Profile different games
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>
    );
  }
);

BatchThemeAnalysis.displayName = "BatchThemeAnalysis";

export default BatchThemeAnalysis;
