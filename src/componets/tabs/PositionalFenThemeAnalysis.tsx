import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  MonetizationOn,
  DirectionsRun,
  GridOn,
  Place,
  Shield,
  Bolt,
  Square,
  Speed,
  Quiz,
  Visibility,
} from "@mui/icons-material";
import { RadarChart } from "@mui/x-charts";
import { getThemeLabelColor, ThemeScore, normalizeThemeScore } from "@/libs/themes/helper";
import { PositionEval} from "@/stockfish/engine/engine";
import GuessTheme from "../puzzle/GuessPtag";

interface PositionFenThemeAnalysisProps {
  stockfishAnalysisResult: PositionEval | null;
  scores: ThemeScore | null;
  loading: boolean;
  error: string | null;
}

const formatThemeName = (theme: string) =>
  theme
    .split(/(?=[A-Z])/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const getThemeIcon = (theme: keyof ThemeScore) => {
  switch (theme) {
    case "material":
      return <MonetizationOn />;
    case "mobility":
      return <DirectionsRun />;
    case "space":
      return <GridOn />;
    case "positional":
      return <Place />;
    case "kingSafety":
      return <Shield />;
    case "tactical":
      return <Bolt />;
    case "darksqaureControl":
      return <Square />;
    case "lightsqaureControl":
      return <Square />;
    case "tempo":
      return <Speed />;
    default:
      return null;
  }
};

export const PositionFenThemeAnalysis: React.FC<PositionFenThemeAnalysisProps> = ({
  stockfishAnalysisResult,
  scores,
  loading,
  error,
}) => {
 
  const [mode, setMode] = useState<"guess" | "show">("guess");

  const handleModeChange = (
    _event: React.SyntheticEvent,
    newMode: "guess" | "show" | null
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Analyzing position...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert
        severity="error"
      >
        Error loading theme analysis: {error}
      </Alert>
    );
  }

  // No scores available
  if (!scores) {
    return (
      <Alert severity="info">
        No theme analysis available. Please provide a valid FEN string.
      </Alert>
    );
  }

  const themes = Object.keys(scores) as (keyof ThemeScore)[];

  // Create radar chart series - each theme gets its own series
  const radarSeries = themes.map((theme) => {
    const data = themes.map((t) => (t === theme ? scores[t] : 0));
    return {
      label: formatThemeName(theme),
      data: data,
      valueFormatter: (v: number | null) => (v !== null ? v.toFixed(2) : "N/A"),
      color: getThemeLabelColor(theme),
      fillArea: true,
      hideMark: true,
    };
  });

  // Create metrics with individual max/min for each theme
  const metrics = themes.map((theme) => {
    const data = themes.map((t) => (t === theme ? scores[t] : 0));
    const max = data.reduce((a, b) => Math.max(a, b));
    const min = data.reduce((a, b) => Math.min(a, b));
    const range = max - min;
    const padding = range === 0 ? Math.abs(max) * 0.2 || 1 : range * 0.2;
    return {
      name: formatThemeName(theme),
      max: Math.ceil(max + padding),
      min: Math.floor(min - padding),
    };
  });

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack 
            direction="row" 
            spacing={2} 
            sx={{ 
              mb: 2, 
              alignItems: "center", 
              flexWrap: "wrap",
              gap: 1 
            }}
          >
             
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              size="small"
              aria-label="view mode"
              sx={{ 
                '& .MuiToggleButton-root': {
                  touchAction: 'manipulation'
                }
              }}
            >
              <ToggleButton value="guess" aria-label="guess mode">
                <Quiz sx={{ mr: 1 }} fontSize="small" />
                Guess Eval
              </ToggleButton>
              <ToggleButton value="show" aria-label="show mode">
                <Visibility sx={{ mr: 1 }} fontSize="small" />
                Show Eval
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {mode === "guess" ? (
            <GuessTheme
              stockfishAnalysisResult={stockfishAnalysisResult}
              scores={scores}
              loading={loading}
              error={error}
            />
          ) : (
            <>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <RadarChart
                  height={400}
                  highlight="series"
                  series={radarSeries}
                  radar={{
                    metrics: metrics,
                  }}
                />
              </Box>

              <Grid container spacing={2}>
                {themes.map((theme) => (
                  <Grid sx={{xs: 12, sm: 6, md: 4}} key={theme}>
                    <Card
                      sx={{
                        borderLeft: 4,
                        borderColor: getThemeLabelColor(theme),
                        transition: "transform 0.2s",
                        "&:hover": { transform: "translateY(-4px)" },
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Box sx={{ color: getThemeLabelColor(theme) }}>{getThemeIcon(theme)}</Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            {formatThemeName(theme)}
                          </Typography>
                        </Stack>
                        <Typography variant="h5" sx={{ color: getThemeLabelColor(theme) }}>
                          {normalizeThemeScore(scores[theme]).toFixed(2)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};