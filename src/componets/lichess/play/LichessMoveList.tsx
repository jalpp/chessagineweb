"use client";

/**
 * @file LichessMoveList.tsx
 * @description Scrollable, clickable SAN move list for the Lichess play page.
 *
 * Clicking any move navigates the board to that position (review mode).
 * Auto-scrolls to the latest move when in live mode.
 * Must be defined outside the main component to avoid remounting on clock ticks.
 */

import { memo, useEffect, useRef } from "react";
import React from "react";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

export interface LichessMoveListProps {
  /** SAN-formatted move strings (e.g. ["e4", "e5", "Nf3"]) */
  sanMoves:     string[];
  /** Currently viewed move index (null = live position) */
  viewingMove:  number | null;
  /** Called when user clicks a move to review that position */
  onGoToMove:   (moveIndex: number) => void;
  /** Called to return to the live board position */
  onReturnToLive: () => void;
}

/**
 * Renders the move list as a compact scrollable panel with clickable moves.
 *
 * - Moves highlighted in primary colour when selected
 * - "↩ Live" button appears when reviewing a past move
 * - Auto-scrolls to the bottom when new moves arrive (live mode only)
 * - Returns null when no moves have been played yet
 */
const LichessMoveList = memo(
  ({ sanMoves, viewingMove, onGoToMove, onReturnToLive }: LichessMoveListProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest move only when live (not reviewing)
    useEffect(() => {
      if (viewingMove === null && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [sanMoves.length, viewingMove]);

    if (!sanMoves.length) return null;

    return (
      <>
        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            letterSpacing={1}
          >
            MOVES
          </Typography>
          {viewingMove !== null && (
            <Button
              size="small"
              variant="text"
              color="primary"
              sx={{ fontSize: "0.7rem", py: 0, minWidth: 0 }}
              onClick={onReturnToLive}
            >
              ↩ Live
            </Button>
          )}
        </Stack>

        <Box
          ref={scrollRef}
          sx={{
            maxHeight: 200,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.78rem",
            lineHeight: 1.9,
            px: 0.5,
          }}
        >
          {sanMoves.reduce<React.ReactElement[]>((acc, san, i) => {
            if (i % 2 !== 0) return acc; // black moves are rendered in the same span as white

            const blackSan  = sanMoves[i + 1];
            const whiteIdx  = i;
            const blackIdx  = i + 1;
            const whiteActive = viewingMove === whiteIdx;
            const blackActive = blackSan != null && viewingMove === blackIdx;

            acc.push(
              <span
                key={i}
                style={{ display: "inline-block", marginRight: 8, userSelect: "none" }}
              >
                {/* Move number */}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.disabled"
                  sx={{ mr: 0.5 }}
                >
                  {Math.floor(i / 2) + 1}.
                </Typography>

                {/* White move */}
                <Typography
                  component="span"
                  variant="caption"
                  fontWeight={600}
                  onClick={() => onGoToMove(whiteIdx)}
                  sx={{
                    mr: 0.75,
                    px: 0.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor: whiteActive ? "primary.main" : "transparent",
                    color: whiteActive ? "primary.contrastText" : "text.primary",
                    "&:hover": {
                      bgcolor: whiteActive ? "primary.dark" : "action.hover",
                    },
                  }}
                >
                  {san}
                </Typography>

                {/* Black move */}
                {blackSan && (
                  <Typography
                    component="span"
                    variant="caption"
                    onClick={() => onGoToMove(blackIdx)}
                    sx={{
                      mr: 0.75,
                      px: 0.5,
                      borderRadius: 1,
                      cursor: "pointer",
                      bgcolor: blackActive ? "primary.main" : "transparent",
                      color: blackActive ? "primary.contrastText" : "text.primary",
                      "&:hover": {
                        bgcolor: blackActive ? "primary.dark" : "action.hover",
                      },
                    }}
                  >
                    {blackSan}
                  </Typography>
                )}
              </span>
            );

            return acc;
          }, [])}
        </Box>
      </>
    );
  }
);

LichessMoveList.displayName = "LichessMoveList";
export default LichessMoveList;
