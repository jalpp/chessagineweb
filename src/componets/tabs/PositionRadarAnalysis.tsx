import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
} from "@mui/material";
import {
  MonetizationOn,
  DirectionsRun,
  GridOn,
  Place,
  Shield,
  Bolt,
} from "@mui/icons-material";
import { RadarChart } from "@mui/x-charts";
import { MoveAnalysis, MoveQuality } from "@/hooks/useGameReview";
import { getMoveClassificationStyle } from "./GameReviewTab";
import { ThemeScore, GameReviewTheme, getThemeLabelColor } from "@/libs/themes/helper";


interface CurrentPositionAnalysisProps {
  gameReview: GameReviewTheme;
  currentMoveIndex: number;
  moveAnalysis: MoveAnalysis[];
}

const themeColors = {
  material: '#bb86fc',
  mobility: '#81c784',
  space: '#64b5f6',
  positional: '#ffb74d',
  kingSafety: '#e57373',
  tactical: '#ffd54f'
};

const formatThemeName = (theme: string) =>
  theme
    .split(/(?=[A-Z])/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getThemeIcon = (theme: keyof ThemeScore) => {
  switch (theme) {
    case 'material': return <MonetizationOn />;
    case 'mobility': return <DirectionsRun />;
    case 'space': return <GridOn />;
    case 'positional': return <Place />;
    case 'kingSafety': return <Shield />;
    case 'tactical': return <Bolt />;
    default: return null;
  }
};

const getMoveQualityColor = (quality: string) => {
  return getMoveClassificationStyle(quality as MoveQuality).color
};

export const PositionRadarAnalysis: React.FC<CurrentPositionAnalysisProps> = ({
  gameReview,
  currentMoveIndex,
  moveAnalysis
}) => {
  if (!moveAnalysis || moveAnalysis.length === 0 || currentMoveIndex < 0) {
    return (
      <Alert severity="info">
        No position data available. Please make a move to see position analysis.
      </Alert>
    );
  }

  const currentMove = moveAnalysis[currentMoveIndex];
  if (!currentMove) {
    return (
      <Alert severity="warning">
        Position data not found for current move.
      </Alert>
    );
  }

  // Get theme scores for current position
  const allScores = gameReview.whiteAnalysis.overallThemes.moveByMoveScores;
  if (!allScores || allScores.length === 0 || currentMoveIndex >= allScores.length) {
    return (
      <Alert severity="info">
        Theme analysis not available for this position.
      </Alert>
    );
  }

  const currentThemeScores = allScores[currentMoveIndex];
  const themes = Object.keys(currentThemeScores) as (keyof ThemeScore)[];
  
  // Each series should only show its own value at its position and 0 elsewhere
  const radarSeries = themes.map(theme => {
    const data = themes.map(t => t === theme ? currentThemeScores[t] : 0);
    return {
      label: formatThemeName(theme),
      data: data,
      valueFormatter: (v: number | null) => v !== null ? v.toFixed(2) : 'N/A',
      color: getThemeLabelColor(theme),
      fillArea: true,
      hideMark: true
    };
  });
  
  // Create metrics with individual max/min for each theme
  const metrics = themes.map(theme => {
    const data = themes.map(t => t === theme ? currentThemeScores[t] : 0);
    const max = data.reduce((a, b) => Math.max(a, b));
    const min = data.reduce((a, b) => Math.min(a, b));
    const range = max - min;
    const padding = range === 0 ? Math.abs(max) * 0.2 || 1 : range * 0.2;
    return {
      name: formatThemeName(theme),
      max: Math.ceil(max + padding),
      min: Math.floor(min - padding)
    };
  });

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip 
              label={`Move ${Math.floor(currentMove.plyNumber / 2) + 1}`}
              color="primary"
              size="medium"
            />
            <Chip 
              label={currentMove.sanNotation || currentMove.notation}
              variant="outlined"
              size="medium"
            />
            <Chip 
              label={currentMove.quality.charAt(0).toUpperCase() + currentMove.quality.slice(1)}
              sx={{ 
                backgroundColor: getMoveQualityColor(currentMove.quality),
                color: '#090909ff',
                fontWeight: 'bold'
              }}
              size="medium"
            />
            <Chip 
              label={`${currentMove.player === 'w' ? 'White' : 'Black'} to move`}
              color={currentMove.player === 'w' ? 'info' : 'default'}
              size="medium"
            />
            <Chip 
              label={`Eval: ${(currentMove.evalMove / 100) > 0 ? '+' : ''}${(currentMove.evalMove / 100).toFixed(2)}`}
              color={(currentMove.evalMove / 100) > 0 ? 'success' : (currentMove.evalMove / 100) < 0 ? 'error' : 'default'}
              size="medium"
            />
          </Stack>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Position Theme Analysis
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart
              height={400}
              highlight="series"
              series={radarSeries}
              radar={{
                metrics: metrics,
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {themes.map((theme) => (
          <Grid sx={{xs: 12, sm: 6, md: 4}} key={theme}>
            <Card sx={{ 
              borderLeft: 4, 
              borderColor: getThemeLabelColor(theme),
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ color: getThemeLabelColor(theme) }}>
                    {getThemeIcon(theme)}
                  </Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    {formatThemeName(theme)}
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ color: getThemeLabelColor(theme) }}>
                  {currentThemeScores[theme].toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};