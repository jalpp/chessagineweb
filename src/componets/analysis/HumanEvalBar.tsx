import { Box, Typography, Tooltip } from "@mui/material";
import type { MaiaEvaluation } from "@/libs/nets/types";
import { getWhiteWinProbability } from "@/libs/nets/types";
import { BoardOrientation } from "./AiChessboard";

interface HumanEvalBarProps {
  /** Maia evaluation for the position (e.g. evaluations.maia3?.["maia_kdd_2600"]). */
  evaluation?: MaiaEvaluation | null;
  boardOrientation?: BoardOrientation;
  height?: number;
  /** When true, renders the bar as greyed-out (analysis not available for this position) */
  disabled?: boolean;
  /** Rating level shown in the tooltip, e.g. "2600". */
  ratingLabel?: string;
}

// Reserved space (within the total `height` budget) for the "M" label
// beneath the bar, mirroring EvalBar's "SF" label.
const LABEL_HEIGHT = 14;

export const HumanEvalBar: React.FC<HumanEvalBarProps> = ({
  evaluation,
  boardOrientation,
  height = 400,
  disabled = false,
  ratingLabel = "2600",
}) => {
  const isFlipped = boardOrientation === "black";
  const barHeight = Math.max(0, height - LABEL_HEIGHT);

  const whiteWinProbability = getWhiteWinProbability(evaluation?.value);
  const whitePercentage = whiteWinProbability * 100;
  const displayWhitePercentage = isFlipped ? 100 - whitePercentage : whitePercentage;
  const evalText = `${Math.round(whitePercentage)}%`;

  const label = (
    <Typography
      variant="caption"
      sx={{ fontSize: "9px", fontWeight: 700, color: disabled || !evaluation ? "text.disabled" : "text.secondary" }}
    >
      M
    </Typography>
  );

  if (disabled || !evaluation) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Tooltip
          title={
            disabled
              ? "Auto-analysis is off — enable it to see the Maia human eval"
              : `Maia ${ratingLabel} human eval not available for this position`
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
          title={`Maia ${ratingLabel} — White win probability: ${whitePercentage.toFixed(1)}%`}
          placement="right"
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
        </Tooltip>
      </Box>
      {label}
    </Box>
  );
};

export default HumanEvalBar;
