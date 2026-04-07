"use client";
import React from "react";
import { Box, Typography, Tooltip } from "@mui/material";

interface HumanEvalBarProps {
  /**
   * Win probability in [0, 1] from white's perspective.
   * This is the raw value returned by all neural nets (Maia3, Leela, Maia2).
   */
  winProb: number;
  label?: string;
  height?: number;
  /** Show Eval= and Q= labels below the bar */
  showLabels?: boolean;
}

/**
 * Converts a neural net win probability [0, 1] to Q in [-1, 1].
 * All models return value in [0, 1] (white win probability).
 * Q = winProb * 2 - 1  →  0 = equal, +1 = white wins, -1 = black wins.
 */
export function winProbToQ(winProb: number): number {
  return winProb * 2 - 1;
}

/**
 * Converts a Q value ([-1, 1], white-relative) to centipawns using the
 * inverse of the Lichess win probability sigmoid:
 *   Q(cp) = 2 / (1 + e^(-0.00368208 * cp)) - 1
 *
 * Solving for cp:
 *   cp = ln((1 - Q) / (1 + Q)) / -0.00368208
 */
export function qToCp(q: number): number {
  const MULTIPLIER = -0.00368208;
  // Clamp to avoid ±Infinity at the boundaries
  const clamped = Math.max(-0.9999, Math.min(0.9999, q));
  return Math.log((1 - clamped) / (1 + clamped)) / MULTIPLIER;
}

/**
 * Maps a cp value to a [0, 100] percentage for the eval bar.
 * Caps at ±10 pawns (±1000 cp) like Stockfish visual bars.
 */
function cpToBarPercent(cp: number): number {
  const pawns = Math.max(-10, Math.min(10, cp / 100));
  return 50 + pawns * 5;
}

function formatCp(cp: number): string {
  const pawns = cp / 100;
  return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

export const HumanEvalBar: React.FC<HumanEvalBarProps> = ({
  winProb,
  label,
  height = 380,
  showLabels = false,
}) => {
  const q = winProbToQ(winProb);
  const cp = qToCp(q);
  const whitePercent = cpToBarPercent(cp);
  const evalText = formatCp(cp);
  const qText = q >= 0 ? `+${q.toFixed(4)}` : q.toFixed(4);

  return (
    <Tooltip title={`Q: ${qText} | CP: ${evalText}`} placement="right" arrow>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        {label && (
          <Typography
            variant="caption"
            sx={{
              fontSize: "9px",
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
        )}

        {/* The bar */}
        <Box
          sx={{
            width: 24,
            height,
            position: "relative",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            backgroundColor: "#1a1a1a",
            cursor: "default",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${whitePercent}%`,
              backgroundColor: "#f0ede8",
              transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: whitePercent > 50 ? 6 : "auto",
              bottom: whitePercent <= 50 ? 6 : "auto",
              left: "50%",
              transform: "translateX(-50%) rotate(-90deg)",
              transformOrigin: "center",
              minWidth: "52px",
              textAlign: "center",
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: "9px",
                fontWeight: 700,
                color: whitePercent > 70 || whitePercent < 30 ? "#fff" : "#111",
                textShadow:
                  whitePercent > 70 || whitePercent < 30
                    ? "0 1px 3px rgba(0,0,0,0.8)"
                    : "none",
              }}
            >
              {evalText}
            </Typography>
          </Box>
        </Box>

        {/* Eval= and Q= labels below the bar */}
        {showLabels && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.15, mt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{ fontSize: "10px", fontWeight: 700, color: "text.primary", whiteSpace: "nowrap" }}
            >
              Eval {evalText}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "10px",
                color: "text.secondary",
                whiteSpace: "nowrap",
                fontFamily: "monospace",
              }}
            >
              Q = {q.toFixed(4)}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

export default HumanEvalBar;