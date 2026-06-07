"use client";

/**
 * @file LichessPlayerRow.tsx
 * @description Displays a player's name, rating, and live clock for the
 * Lichess play board. Must be defined outside the main component so React
 * does not remount it on every 100ms clock tick.
 */

import { memo } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { fmtMs } from "@/libs/lichess/chess";
import type { GamePhase, GamePlayer } from "@/libs/lichess/types";

export interface LichessPlayerRowProps {
  side:     "white" | "black";
  player:   GamePlayer | null;
  clockMs:  number;
  isActive: boolean;
  phase:    GamePhase;
  /** When true, hides the player rating for distraction-free play */
  zenMode?: boolean;
}

/**
 * Renders one player row (opponent or self) with name, rating, and clock.
 *
 * - Active clock border + background to indicate whose turn it is
 * - Clock turns red when under 30 seconds
 * - Shows tenths of a second when under 20 seconds (via fmtMs)
 * - Shows "???" while a game is in progress before player info arrives
 */
const LichessPlayerRow = memo(
  ({ side, player, clockMs, isActive, phase, zenMode = false }: LichessPlayerRowProps) => {
    const isLowOnTime = clockMs < 30_000 && phase === "playing";

    return (
      <Paper
        elevation={isActive ? 3 : 0}
        sx={{
          px: 2,
          py: 1,
          border: "1px solid",
          borderColor: isActive ? "primary.main" : "divider",
          borderRadius: 2,
          transition: "border-color 0.3s, background-color 0.3s",
          bgcolor: isActive ? "action.selected" : "transparent",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {/* Name + rating */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: side === "white" ? "#f0d9b5" : "#3d2b1f",
                border: "1px solid",
                borderColor: "divider",
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              {player?.name ?? (phase === "playing" ? "???" : "—")}
              {!zenMode && player?.rating != null && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.5 }}
                >
                  ({player.rating})
                </Typography>
              )}
            </Typography>
          </Stack>

          {/* Clock — hidden while idle or seeking */}
          {phase !== "idle" && phase !== "seeking" && (
            <Typography
              variant="h6"
              fontFamily="monospace"
              fontWeight={700}
              color={
                isLowOnTime
                  ? "error.main"
                  : isActive
                  ? "primary.main"
                  : "text.primary"
              }
              sx={{ minWidth: 70, textAlign: "right" }}
            >
              {fmtMs(clockMs)}
            </Typography>
          )}
        </Stack>
      </Paper>
    );
  }
);

LichessPlayerRow.displayName = "LichessPlayerRow";
export default LichessPlayerRow;
