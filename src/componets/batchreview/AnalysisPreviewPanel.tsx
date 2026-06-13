import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import {
  Whatshot as BlitzIcon,
  RocketLaunch as BulletIcon,
} from "@mui/icons-material";
import { BatchReviewResult } from "@/libs/batchreview/types";
import TutorSegmentBar from "./TutorSegmentBar";

interface AnalysisPreviewPanelProps {
  /** Live result once a run finishes; null shows the mocked preview. */
  result: BatchReviewResult | null;
  /** True while a run is downloading/analyzing — softens the mock further. */
  isRunning: boolean;
}

/** Static placeholder data — illustrates the shape of the real report. */
const MOCK = {
  games: 20,
  rating: 1742,
  record: "8-2-10",
  accuracy: 73.4,
  score: 45,
  blunders: 1.1,
  mistakes: 2.4,
};

/**
 * Right-hand "stats picker" panel for the Agine Analyzer setup screen.
 *
 * Before a run, this shows a greyed-out mock of the Overview report so
 * first-time users know what they're about to get. Once `result` lands,
 * the same layout renders the user's real numbers in full color — making
 * the transition from "preview" to "your report" obvious.
 */
const AnalysisPreviewPanel: React.FC<AnalysisPreviewPanelProps> = React.memo(
  ({ result, isRunning }) => {
    const live = result !== null;

    const data = live
      ? {
          games: result.games.length,
          rating:
            result.games.find((g) => g.userRating !== undefined)?.userRating ??
            null,
          record: `${result.record.wins}-${result.record.draws}-${result.record.losses}`,
          accuracy: result.avgAccuracy,
          score: Math.round(
            ((result.record.wins + result.record.draws * 0.5) /
              Math.max(1, result.games.length)) *
              100
          ),
          blunders:
            result.totalQualityCounts["Blunder"] /
            Math.max(1, result.games.length),
          mistakes:
            result.totalQualityCounts["Mistake"] /
            Math.max(1, result.games.length),
        }
      : MOCK;

    return (
      <Paper
        elevation={live ? 3 : 0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: "16px",
          opacity: live ? 1 : 0.45,
          filter: live ? "none" : "grayscale(0.6)",
          transition: "opacity 0.5s ease, filter 0.5s ease",
          border: live ? "none" : 1,
          borderColor: "divider",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!live && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
              bgcolor: "rgba(0,0,0,0.15)",
              backdropFilter: "blur(1px)",
            }}
          >
            <Typography
              variant="overline"
              fontWeight={700}
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
              }}
            >
              {isRunning ? "Analyzing your games…" : "Example report — run an analysis to see yours"}
            </Typography>
          </Box>
        )}

        <Box sx={{ opacity: !live ? 0.6 : 1 }}>
          <Box display="flex" gap={2} mb={2}>
            <Box sx={{ color: "text.secondary", mt: 0.5 }}>
              <BlitzIcon sx={{ fontSize: 36 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {data.games} games
              </Typography>
              <Typography fontSize="0.85rem" color="text.secondary">
                {data.rating !== null && data.rating !== undefined
                  ? `Average rating ${data.rating}. `
                  : ""}
                Record <strong>{data.record}</strong>. Score{" "}
                <strong>{data.score}%</strong>.
              </Typography>
            </Box>
          </Box>

          <Box display="flex" flexDirection="column" gap={2}>
            <TutorSegmentBar
              label="Accuracy"
              fraction={data.accuracy / 100}
              valueLabel={`${
                typeof data.accuracy === "number"
                  ? Math.round(data.accuracy * 10) / 10
                  : data.accuracy
              }%`}
            />
            <TutorSegmentBar
              label="Score"
              fraction={data.score / 100}
              valueLabel={`${data.score}%`}
            />
            <TutorSegmentBar
              label="Blunder Avoidance"
              fraction={1 - Math.min(1, data.blunders / 1.5)}
              valueLabel={`${data.blunders.toFixed(2)}/game`}
            />
            <TutorSegmentBar
              label="Mistake Avoidance"
              fraction={1 - Math.min(1, data.mistakes / 3)}
              valueLabel={`${data.mistakes.toFixed(2)}/game`}
            />
          </Box>
        </Box>

        {live && (
          <Box display="flex" alignItems="center" gap={1} mt={2}>
            <BulletIcon fontSize="small" color="success" />
            <Typography fontSize="0.8rem" color="success.main" fontWeight={600}>
              This is your report for {result!.username}
            </Typography>
          </Box>
        )}
      </Paper>
    );
  }
);

AnalysisPreviewPanel.displayName = "AnalysisPreviewPanel";

export default AnalysisPreviewPanel;
