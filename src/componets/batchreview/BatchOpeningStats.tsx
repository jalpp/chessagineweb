import React from "react";
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { OpeningStat } from "@/libs/batchreview/types";

interface BatchOpeningStatsProps {
  openingStats: OpeningStat[];
}

/** @returns A chip color reflecting how well the opening scored. */
const getScoreColor = (
  scorePercent: number
): "success" | "warning" | "error" => {
  if (scorePercent >= 55) return "success";
  if (scorePercent >= 45) return "warning";
  return "error";
};

/**
 * Opening performance table — one row per base opening (variations rolled up),
 * sorted by number of games played.
 */
const BatchOpeningStats: React.FC<BatchOpeningStatsProps> = React.memo(
  ({ openingStats }) => {
    if (openingStats.length === 0) {
      return (
        <Typography color="text.secondary">
          No opening data available for these games.
        </Typography>
      );
    }

    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Opening Performance
        </Typography>
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Opening</TableCell>
                <TableCell align="center">Games</TableCell>
                <TableCell align="center">W-D-L</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell align="center">White / Black</TableCell>
                <TableCell align="center">Avg Accuracy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openingStats.map((stat) => (
                <TableRow key={`${stat.eco}-${stat.name}`} hover>
                  <TableCell>
                    <Typography fontSize="0.85rem" fontWeight={600}>
                      {stat.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.eco}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{stat.games}</TableCell>
                  <TableCell align="center">
                    {stat.wins}-{stat.draws}-{stat.losses}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${stat.scorePercent}%`}
                      color={getScoreColor(stat.scorePercent)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {stat.asWhite} / {stat.asBlack}
                  </TableCell>
                  <TableCell align="center">{stat.avgAccuracy}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }
);

BatchOpeningStats.displayName = "BatchOpeningStats";

export default BatchOpeningStats;
