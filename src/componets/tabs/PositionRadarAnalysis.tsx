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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { RadarChart } from "@mui/x-charts";
import { MoveAnalysis, MoveQuality } from "@/hooks/useGameReview";
import { getMoveClassificationStyle } from "./GameReviewTab";
import { ThemeScore, GameReviewTheme, getThemeLabelColor } from "@/libs/themes/helper";
import { getThemeIcon } from "./PositionalFenThemeAnalysis";


interface CurrentPositionAnalysisProps {
  gameReview: GameReviewTheme;
  currentMoveIndex: number;
  moveAnalysis: MoveAnalysis[];
}

const formatThemeName = (theme: string) =>
  theme
    .split(/(?=[A-Z])/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");


const getMoveQualityColor = (quality: string) => {
  return getMoveClassificationStyle(quality as MoveQuality).color
};

export const PositionRadarAnalysis: React.FC<CurrentPositionAnalysisProps> = ({
  gameReview,
  currentMoveIndex,
  moveAnalysis
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!moveAnalysis || moveAnalysis.length === 0 || currentMoveIndex < 0) {
    return (
      <Alert severity="info" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
        No position data available. Please make a move to see position analysis.
      </Alert>
    );
  }

  const currentMove = moveAnalysis[currentMoveIndex];
  if (!currentMove) {
    return (
      <Alert severity="warning" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
        Position data not found for current move.
      </Alert>
    );
  }

  // Get theme scores for current position
  const allScores = gameReview.whiteAnalysis.overallThemes.moveByMoveScores;
  if (!allScores || allScores.length === 0 || currentMoveIndex >= allScores.length) {
    return (
      <Alert severity="info" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
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
      <Card sx={{ 
        mb: { xs: 2, md: 3 },
      }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            sx={{ 
              mb: 2, 
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 0 }
            }}
          >
            <Chip 
              label={`Move ${Math.floor(currentMove.plyNumber / 2) + 1}`}
              color="primary"
              size={isMobile ? "small" : "medium"}
              sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
            />
            <Chip 
              label={currentMove.sanNotation || currentMove.notation}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
            />
            <Chip 
              label={currentMove.quality.charAt(0).toUpperCase() + currentMove.quality.slice(1)}
              sx={{ 
                backgroundColor: getMoveQualityColor(currentMove.quality),
                color: '#090909ff',
                fontWeight: 'bold',
                fontSize: { xs: '0.75rem', md: '0.875rem' }
              }}
              size={isMobile ? "small" : "medium"}
            />
            <Chip 
              label={`${currentMove.player === 'w' ? 'White' : 'Black'} to move`}
              color={currentMove.player === 'w' ? 'info' : 'default'}
              size={isMobile ? "small" : "medium"}
              sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
            />
            <Chip 
              label={`Eval: ${(currentMove.evalMove / 100) > 0 ? '+' : ''}${(currentMove.evalMove / 100).toFixed(2)}`}
              color={(currentMove.evalMove / 100) > 0 ? 'success' : (currentMove.evalMove / 100) < 0 ? 'error' : 'default'}
              size={isMobile ? "small" : "medium"}
              sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
            />
          </Stack>

          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mt: 2,
              fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' }
            }}
          >
            Position Theme Analysis
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            width: '100%',
            overflow: 'hidden'
          }}>
            <RadarChart
              height={isSmallMobile ? 300 : isMobile ? 350 : 400}
              width={isSmallMobile ? 300 : undefined}
              highlight="series"
              series={radarSeries}
              radar={{
                metrics: metrics,
              }}
              margin={
                isSmallMobile 
                  ? { top: 20, right: 20, bottom: 20, left: 20 }
                  : isMobile
                  ? { top: 30, right: 30, bottom: 30, left: 30 }
                  : { top: 50, right: 50, bottom: 50, left: 50 }
              }
              sx={{
                '& .MuiChartsLegend-root': {
                  fontSize: { xs: '0.7rem', md: '0.875rem' }
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {themes.map((theme) => (
          <Grid  sx={{xs: 12, sm: 6, md: 4}} key={theme}>
            <Card sx={{ 
              borderLeft: { xs: 3, md: 4 },
              borderColor: getThemeLabelColor(theme),
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
              height: '100%'
            }}>
              <CardContent sx={{ 
                p: { xs: 1.5, md: 2 },
                '&:last-child': { pb: { xs: 1.5, md: 2 } }
              }}>
                <Stack 
                  direction="row" 
                  spacing={{ xs: 0.5, md: 1 }}
                  alignItems="center" 
                  sx={{ mb: { xs: 0.5, md: 1 } }}
                >
                  <Box sx={{ 
                    color: getThemeLabelColor(theme),
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {getThemeIcon(theme)}
                  </Box>
                  <Typography 
                    variant="subtitle2" 
                    color="textSecondary"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                      lineHeight: 1.2
                    }}
                  >
                    {formatThemeName(theme)}
                  </Typography>
                </Stack>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: getThemeLabelColor(theme),
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                    fontWeight: 600
                  }}
                >
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