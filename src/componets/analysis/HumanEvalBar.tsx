"use client";
import { useState } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import type { MaiaEvaluation } from "@/libs/nets/types";
import { getWhiteWinProbability } from "@/libs/nets/types";
import { estimateWdlFromWinProbability, findRatingEval } from "@/libs/nets/humanEvalBar";
import { useMaiaBatchEval } from "@/hooks/useMaiaBatchEval";
import { BoardOrientation } from "./AiChessboard";

interface HumanEvalBarProps {
  /** Maia evaluation for the position at the chosen rating (e.g. evaluations.maia3?.["maia_kdd_2600"]). */
  evaluation?: MaiaEvaluation | null;
  /** FEN of the position — used to fetch WDL/HEE/LCE detail on hover. */
  fen: string;
  /** Which Maia rating level (600-2600) this bar represents. */
  rating: number;
  boardOrientation?: BoardOrientation;
  height?: number;
  /** When true, renders the bar as greyed-out (analysis not available for this position) */
  disabled?: boolean;
}

// Reserved space (within the total `height` budget) for the "M" label
// beneath the bar, mirroring EvalBar's "SF" label.
const LABEL_HEIGHT = 14;

export const HumanEvalBar: React.FC<HumanEvalBarProps> = ({
  evaluation,
  fen,
  rating,
  boardOrientation,
  height = 400,
  disabled = false,
}) => {
  const isFlipped = boardOrientation === "black";
  const barHeight = Math.max(0, height - LABEL_HEIGHT);

  const [isHovering, setIsHovering] = useState(false);
  // Only fetch the (heavier, 21-rating) batch detail while the bar is
  // actually hovered — the bar itself renders from `evaluation`, which is
  // already available with no extra request.
  const { results: batchResults } = useMaiaBatchEval(fen, isHovering);
  const ratingDetail = findRatingEval(batchResults, rating);

  const whiteWinProbability = getWhiteWinProbability(evaluation?.value);
  const whitePercentage = whiteWinProbability * 100;
  const displayWhitePercentage = isFlipped ? 100 - whitePercentage : whitePercentage;
  const evalText = `${Math.round(whitePercentage)}%`;
  const wdl = estimateWdlFromWinProbability(whiteWinProbability);

  const label = (
    <Typography
      variant="caption"
      sx={{ fontSize: "9px", fontWeight: 700, color: disabled || !evaluation ? "text.disabled" : "text.secondary" }}
    >
      M
    </Typography>
  );

  const tooltipContent = (
    <Box sx={{ textAlign: "center", py: 0.25 }}>
      <Typography variant="caption" sx={{ display: "block", fontSize: "10px" }}>
        WDL {wdl.win}% / {wdl.draw}% / {wdl.loss}%
      </Typography>
      <Typography variant="body2" sx={{ display: "block", fontWeight: "bold", fontSize: "11px", my: "2px" }}>
        HEE {ratingDetail?.humanEval ?? "—"}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", fontSize: "10px" }}>
        LCE {ratingDetail?.lc0Eval ?? "—"}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", fontSize: "9px", color: "text.disabled", mt: "2px" }}>
        Maia {rating}
      </Typography>
    </Box>
  );

  if (disabled || !evaluation) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Tooltip
          title={
            disabled
              ? "Auto-analysis is off — enable it to see the Maia human eval"
              : `Maia ${rating} human eval not available for this position`
          }
          placement="right"
        >
          <Box
            sx={{
              width: 20,
              height: barHeight,
              position: "relative",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
              backgroundColor: "action.disabledBackground",
              opacity: 0.45,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ width: "100%", height: "50%", backgroundColor: "text.disabled" }} />
          </Box>
        </Tooltip>
        {label}
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          width: 20,
          height: barHeight,
          position: "relative",
          border: "1px solid #ccc",
          borderRadius: 1,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            ...(isFlipped
              ? { top: 0, left: 0, right: 0, height: `${100 - displayWhitePercentage}%` }
              : { bottom: 0, left: 0, right: 0, height: `${displayWhitePercentage}%` }),
            backgroundColor: "#fff",
            transition: "height 0.3s ease-in-out",
          }}
        />

        <Tooltip
          title={tooltipContent}
          placement="right"
          onOpen={() => setIsHovering(true)}
          onClose={() => setIsHovering(false)}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-90deg)",
                transformOrigin: "center",
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <Box
                sx={{
                  bgcolor: "rgba(0,0,0,0.72)",
                  borderRadius: "3px",
                  px: 0.5,
                  py: "1px",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {evalText}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Tooltip>
      </Box>
      {label}
    </Box>
  );
};

export default HumanEvalBar;
