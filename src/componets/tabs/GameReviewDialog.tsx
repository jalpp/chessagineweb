import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Stack,
  Alert,
  Button,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import {
  Close as CloseIcon,
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Warning,
  Flag,
  Analytics,
} from "@mui/icons-material";
import { BarChart, LineChart, RadarChart } from "@mui/x-charts";
import { MoveAnalysis } from "@/hooks/useGameReview";
import { PositionRadarAnalysis } from "./PositionRadarAnalysis";
import { darkGreyTheme } from "@/theme/theme";
import { GameReviewTheme, getThemeLabelColor, themeColors } from "@/libs/themes/helper";
import { ThemeScore } from "@/libs/themes/helper";


interface GameReviewDialogProps {
  gameReview: GameReviewTheme | null;
  currentMoveIndex: number;
  moveAnalysis: MoveAnalysis[];
}



export const GameReviewDialog: React.FC<GameReviewDialogProps> = ({
  gameReview,
  currentMoveIndex,
  moveAnalysis,
}) => {
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  if (!gameReview) return null;

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) =>
    setTabValue(newValue);

  const formatThemeName = (theme: string) =>
    theme
      .split(/(?=[A-Z])/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  

  const getThemeColor = (value: number) =>
    value > 0 ? "success" : value < 0 ? "error" : "default";

  const renderBarChart = (scores: ThemeScore) => {
    const data = Object.entries(scores).map(([theme, score]) => ({
      theme: formatThemeName(theme),
      score,
    }));

    return (
      <BarChart
        xAxis={[{ dataKey: "theme", scaleType: "band", label: "Theme" }]}
        series={[{ dataKey: "score", label: "Score", color: "#bb86fc" }]}
        dataset={data}
        height={300}
        margin={{ left: 60, right: 20, bottom: 50 }}
        grid={{ horizontal: true }}
      />
    );
  };

  const renderMoveByMoveChart = (scores: ThemeScore[]) => {
    // Group scores by full moves (White + Black = 1 move)
    const fullMoveScores: ThemeScore[] = [];
    for (let i = 0; i < scores.length; i += 2) {
      if (i + 1 < scores.length) {
        // Average White and Black scores for this move
        const themes = Object.keys(scores[i]) as (keyof ThemeScore)[];
        const avgScore = {} as ThemeScore;
        themes.forEach((theme) => {
          avgScore[theme] = (scores[i][theme] + scores[i + 1][theme]) / 2;
        });
        fullMoveScores.push(avgScore);
      } else {
        // Odd number of half-moves, include the last one
        fullMoveScores.push(scores[i]);
      }
    }

    const moveNumbers = fullMoveScores.map((_, i) => i + 1);
    const themes = Object.keys(fullMoveScores[0]);

    return (
      <LineChart
        xAxis={[{ data: moveNumbers, label: "Move Number" }]}
        series={themes.map((t) => ({
          data: fullMoveScores.map((s) => s[t as keyof ThemeScore]),
          label: formatThemeName(t),
          color: getThemeLabelColor(t  as keyof ThemeScore)
        }))}
        height={300}
        margin={{ left: 60, right: 20, bottom: 50 }}
        grid={{ horizontal: true }}
      />
    );
  };

  const renderRadarComparison = (
    whiteScores: ThemeScore,
    blackScores: ThemeScore
  ) => {
    const themes = Object.keys(whiteScores) as (keyof ThemeScore)[];
    const whiteData = themes.map((theme) => whiteScores[theme]);
    const blackData = themes.map((theme) => blackScores[theme]);

    // Find the max and min values for each theme
    const metrics = themes.map((theme, index) => {
      const maxVal = Math.max(whiteData[index], blackData[index]);
      const minVal = Math.min(whiteData[index], blackData[index]);
      const range = maxVal - minVal;
      const padding = range * 0.2;

      return {
        name: formatThemeName(theme),
        max: Math.ceil(maxVal + padding),
        min: Math.floor(minVal - padding),
      };
    });

    return (
      <RadarChart
        height={400}
        series={[
          {
            label: "White",
            data: whiteData,
            color: "#adeaf9ff",
            fillArea: true
          },
          {
            label: "Black",
            data: blackData,
            color: "#f4aff2ff",
            fillArea: true
          },
        ]}
        radar={{
          metrics: metrics,
        }}
      />
    );
  };

  const renderPlayerAnalysis = (
    analysis:
      | GameReviewTheme["whiteAnalysis"]
      | GameReviewTheme["blackAnalysis"],
    bestTheme: string,
    worstTheme: string
  ) => (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          icon={<EmojiEvents />}
          label={`Best: ${formatThemeName(bestTheme)}`}
          color="success"
        />
        <Chip
          icon={<Warning />}
          label={`Worst: ${formatThemeName(worstTheme)}`}
          color="error"
        />
      </Stack>

      <Grid>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Theme Changes
            </Typography>
            {analysis.overallThemes.themeChanges.map((change, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="body2">
                  {formatThemeName(change.theme)}
                </Typography>
                <Chip
                  size="small"
                  icon={change.change > 0 ? <TrendingUp /> : <TrendingDown />}
                  label={`${
                    change.change > 0 ? "+" : ""
                  }${change.change.toFixed(2)} (${change.percentChange.toFixed(
                    1
                  )}%)`}
                  color={getThemeColor(change.change)}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Average Theme Scores
          </Typography>
          {renderBarChart(analysis.averageThemeScores)}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Move-by-Move Theme Trends
          </Typography>
          {renderMoveByMoveChart(analysis.overallThemes.moveByMoveScores)}
        </CardContent>
      </Card>

      
    </Box>
  );

  return (
    <ThemeProvider theme={darkGreyTheme}>
      <Button
        variant="contained"
        startIcon={<Analytics />}
        onClick={handleOpen}
      >
        Game Theme Analysis
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Typography variant="h5">Game Theme Analysis</Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{gameReview.gameInfo.white}</strong> vs{" "}
              <strong>{gameReview.gameInfo.black}</strong> • Result:{" "}
              <strong>{gameReview.gameInfo.result}</strong>
            </Typography>
          </Alert>

          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="Current Position" />
            <Tab label="Game Analysis" />
            <Tab label="Game Insights" />
          </Tabs>

          {tabValue === 0 && (
            <PositionRadarAnalysis
              gameReview={gameReview}
              currentMoveIndex={currentMoveIndex}
              moveAnalysis={moveAnalysis}
            />
          )}

          {tabValue === 1 &&
            renderPlayerAnalysis(
              gameReview.whiteAnalysis,
              gameReview.insights.whiteBestTheme,
              gameReview.insights.whiteWorstTheme
            )}


          {tabValue === 3 && (
            <Box>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    White vs Black Theme Comparison
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    {renderRadarComparison(
                      gameReview.whiteAnalysis.averageThemeScores,
                      gameReview.blackAnalysis.averageThemeScores
                    )}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Flag /> Turning Points
                  </Typography>
                  {gameReview.insights.turningPoints.map((tp, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 1.5,
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: "#2A2A2A",
                        borderLeft: 4,
                        borderColor:
                          tp.player === "White"
                            ? "primary.main"
                            : "secondary.main",
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        Move {tp.moveNumber} • {tp.player}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>{tp.move}</strong>
                      </Typography>
                      <Chip
                        size="small"
                        label={tp.impact}
                        sx={{ mt: 1 }}
                        color={tp.impact.includes("+") ? "success" : "error"}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
};
