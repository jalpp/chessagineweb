import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";

interface TutorSegmentBarProps {
  /** Metric name shown above the bar, e.g. "Accuracy". */
  label: string;
  /** Fill fraction in [0, 1]. */
  fraction: number;
  /** Tooltip detail, e.g. "76.4% average accuracy". */
  detail?: string;
  /** Overrides the filled-segment color (defaults to gold/red by fraction). */
  color?: string;
}

const SEGMENTS = 7;

/** Tutor-style gold for healthy values, red for weak ones. */
const GOLD = "#c9a227";
const RED = "#d96b6b";

/**
 * Lichess Tutor style metric row: a label above a row of seven segments,
 * filled proportionally to `fraction`. Healthy values render gold, weak
 * values red, matching the Tutor visual language.
 */
const TutorSegmentBar: React.FC<TutorSegmentBarProps> = React.memo(
  ({ label, fraction, detail, color }) => {
    const clamped = Math.max(0, Math.min(1, fraction));
    const filled = Math.max(clamped > 0 ? 1 : 0, Math.round(clamped * SEGMENTS));
    const fillColor = color ?? (clamped >= 0.45 ? GOLD : RED);

    const bar = (
      <Box>
        <Typography
          fontSize="0.9rem"
          fontWeight={600}
          sx={{ color: fillColor, mb: 0.5 }}
        >
          {label}
        </Typography>
        <Box display="flex" gap={0.75}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: 16,
                borderRadius: "3px",
                bgcolor: i < filled ? fillColor : "transparent",
                border: 1,
                borderColor: i < filled ? fillColor : "divider",
                transition: "background-color 0.3s",
              }}
            />
          ))}
        </Box>
      </Box>
    );

    return detail ? (
      <Tooltip title={detail} placement="top" arrow>
        {bar}
      </Tooltip>
    ) : (
      bar
    );
  }
);

TutorSegmentBar.displayName = "TutorSegmentBar";

export default TutorSegmentBar;
