import React from "react";
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import { GameSummary } from "@/libs/batchreview/types";

interface BatchGameListProps {
  games: GameSummary[];
  /** Opens the game in the full /game analyzer. */
  onReviewGame: (game: GameSummary) => void;
}

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
 * accuracy and blunder/mistake counts. Clicking a game opens it in the
 * full game analyzer via the sessionStorage handoff.
 */
const BatchGameList: React.FC<BatchGameListProps> = React.memo(
  ({ games, onReviewGame }) => {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Games
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Click any game to open it in the full game analyzer
        </Typography>
        <List sx={{ maxHeight: 480, overflowY: "auto", px: 0.5 }}>
          {games.map((game) => {
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
        </List>
      </Paper>
    );
  }
);

BatchGameList.displayName = "BatchGameList";

export default BatchGameList;
