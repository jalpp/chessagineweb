import React, { useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FilterList as FilterIcon } from "@mui/icons-material";
import { GameSummary } from "@/libs/batchreview/types";

interface BatchGameListProps {
  games: GameSummary[];
  /** Opens the game in the full /game analyzer. */
  onReviewGame: (game: GameSummary) => void;
}

type MoveFilter = "all" | "has-blunder" | "has-mistake" | "has-either" | "clean";
type OutcomeFilter = "all" | "win" | "loss" | "draw";

/** @returns The MUI chip color for a game outcome. */
const getOutcomeColor = (
  outcome: GameSummary["outcome"]
): "success" | "error" | "warning" => {
  if (outcome === "win") return "success";
  if (outcome === "loss") return "error";
  return "warning";
};

/**
 * Per-game list for the batch review — outcome, opponent, opening,
 * accuracy and blunder/mistake counts. Supports filtering by move quality
 * and game outcome. Clicking a game opens it in the full game analyzer.
 */
const BatchGameList: React.FC<BatchGameListProps> = React.memo(
  ({ games, onReviewGame }) => {
    const [moveFilter, setMoveFilter] = useState<MoveFilter>("all");
    const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");

    const filtered = games.filter((game) => {
      const blunders = game.qualityCounts["Blunder"];
      const mistakes = game.qualityCounts["Mistake"];

      const passesMove =
        moveFilter === "all" ||
        (moveFilter === "has-blunder" && blunders > 0) ||
        (moveFilter === "has-mistake" && mistakes > 0) ||
        (moveFilter === "has-either" && (blunders > 0 || mistakes > 0)) ||
        (moveFilter === "clean" && blunders === 0 && mistakes === 0);

      const passesOutcome =
        outcomeFilter === "all" || game.outcome === outcomeFilter;

      return passesMove && passesOutcome;
    });

    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Games
        </Typography>

        {/* Filter row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2} alignItems="center">
          <Box display="flex" alignItems="center" gap={0.5} sx={{ color: "text.secondary" }}>
            <FilterIcon fontSize="small" />
            <Typography fontSize="0.8rem" fontWeight={600}>Filter</Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Move quality</InputLabel>
            <Select
              value={moveFilter}
              label="Move quality"
              onChange={(e) => setMoveFilter(e.target.value as MoveFilter)}
            >
              <MenuItem value="all">All games</MenuItem>
              <MenuItem value="has-blunder">Has blunder(s)</MenuItem>
              <MenuItem value="has-mistake">Has mistake(s)</MenuItem>
              <MenuItem value="has-either">Has blunder or mistake</MenuItem>
              <MenuItem value="clean">Clean (no blunders/mistakes)</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Outcome</InputLabel>
            <Select
              value={outcomeFilter}
              label="Outcome"
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
            >
              <MenuItem value="all">All outcomes</MenuItem>
              <MenuItem value="win">Wins only</MenuItem>
              <MenuItem value="loss">Losses only</MenuItem>
              <MenuItem value="draw">Draws only</MenuItem>
            </Select>
          </FormControl>
          <Typography fontSize="0.8rem" color="text.secondary">
            {filtered.length} / {games.length} games
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Click any game to open it in the full game analyzer
        </Typography>
        <List sx={{ maxHeight: 480, overflowY: "auto", px: 0.5 }}>
          {filtered.map((game) => {
            const blunders = game.qualityCounts["Blunder"];
            const mistakes = game.qualityCounts["Mistake"];
            return (
              <ListItemButton
                key={game.gameId}
                onClick={() => onReviewGame(game)}
                sx={{ mb: 1, borderRadius: "8px" }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Chip
                        label={game.outcome.toUpperCase()}
                        color={getOutcomeColor(game.outcome)}
                        size="small"
                        sx={{ fontWeight: 700, minWidth: 56 }}
                      />
                      <Typography fontSize="0.9rem" fontWeight={600}>
                        vs {game.opponentName}
                        {game.opponentRating ? ` (${game.opponentRating})` : ""}
                      </Typography>
                      <Chip
                        label={game.userColor}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "capitalize" }}
                      />
                      <Chip
                        label={game.speed}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "capitalize" }}
                      />
                      {game.evalSource === "lichess" && (
                        <Tooltip title="Reviewed with Lichess server analysis">
                          <Chip label="lichess evals" size="small" variant="outlined" />
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box
                      component="span"
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                      flexWrap="wrap"
                    >
                      <span>{game.openingName ?? "Unknown opening"}</span>
                      <span>· accuracy {game.accuracy}%</span>
                      {blunders > 0 && (
                        <Box component="span" sx={{ color: "#E57373" }}>
                          {blunders} blunder{blunders > 1 ? "s" : ""}
                        </Box>
                      )}
                      {mistakes > 0 && (
                        <Box component="span" sx={{ color: "#FF8A65" }}>
                          {mistakes} mistake{mistakes > 1 ? "s" : ""}
                        </Box>
                      )}
                      <span>
                        · {new Date(game.playedAt).toLocaleDateString()}
                      </span>
                    </Box>
                  }
                  primaryTypographyProps={{ component: "div" }}
                  secondaryTypographyProps={{
                    component: "div",
                    fontSize: "0.8rem",
                  }}
                />
              </ListItemButton>
            );
          })}
          {filtered.length === 0 && (
            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
              <Typography fontSize="0.9rem">No games match the current filters.</Typography>
            </Box>
          )}
        </List>
      </Paper>
    );
  }
);

BatchGameList.displayName = "BatchGameList";

export default BatchGameList;
