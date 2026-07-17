import { Box, Typography, Tooltip } from "@mui/material";
import { LineEval } from "@jalpp/stockfishts";
import { BoardOrientation } from "./AiChessboard";

interface EvalBarProps {
  lineEval?: LineEval;
  boardOrientation?: BoardOrientation;
  height?: number;
  /** When true, renders the bar as greyed-out (analysis not available for this position) */
  disabled?: boolean;
}

// Reserved space (within the total `height` budget) for the "SF" label
// beneath the bar, so the bar + label column still fits the height the
// caller allotted for it (matching the chessboard's height).
const LABEL_HEIGHT = 14;

export const EvalBar: React.FC<EvalBarProps> = ({
  lineEval,
  boardOrientation,
  height = 400,
  disabled = false,
}) => {
  
  const getEvalPercentage = (): number => {
    if (!lineEval) return 50;

    if (lineEval.mate !== undefined) {
     
      return lineEval.mate > 0 ? 100 : 0;
    }

    if (lineEval.cp !== undefined) {
      const evalInPawns = Math.max(-10, Math.min(10, lineEval.cp / 100));
      return 50 + evalInPawns * 5;
    }

    return 50;
  };

  const getEvalText = (): string => {
    if (!lineEval) return "0.00";

    if (lineEval.mate !== undefined) {
      return lineEval.mate > 0
        ? `M${lineEval.mate}`
        : `M${Math.abs(lineEval.mate)}`;
    }

    if (lineEval.cp !== undefined) {
      const evalInPawns = lineEval.cp / 100;
      return evalInPawns >= 0
        ? `+${evalInPawns.toFixed(2)}`
        : evalInPawns.toFixed(2);
    }

    return "0.00";
  };

  const isFlipped = boardOrientation === "black";
  const evalPercentage = getEvalPercentage();
  const whitePercentage = isFlipped ? 100 - evalPercentage : evalPercentage;
  const barHeight = Math.max(0, height - LABEL_HEIGHT);

  const bestMove = lineEval?.pv?.[0] ?? "N/A";
  const evalText = getEvalText();

  const label = (
    <Typography
      variant="caption"
      sx={{ fontSize: "9px", fontWeight: 700, color: disabled ? "text.disabled" : "text.secondary" }}
    >
      SF
    </Typography>
  );

  if (disabled) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Tooltip title="Auto-analysis is off — enable it to see engine evaluation" placement="right">
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
              ? { top: 0, left: 0, right: 0, height: `${100 - whitePercentage}%` }
              : { bottom: 0, left: 0, right: 0, height: `${whitePercentage}%` }),
            backgroundColor: "#fff",
            transition: "height 0.3s ease-in-out",
          }}
        />

       
        <Tooltip
          title={`Depth: ${lineEval?.depth || 0} | Best move: ${bestMove}${
            lineEval?.nps ? ` | NPS: ${lineEval.nps.toLocaleString()}` : ""
          }`}
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

        
        {lineEval?.resultPercentages && (
          <Tooltip
            title={`Win: ${lineEval.resultPercentages.win}% | Draw: ${lineEval.resultPercentages.draw}% | Loss: ${lineEval.resultPercentages.loss}%`}
            placement="left"
          >
            <Box
              sx={{
                position: "absolute",
                left: -8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 6,
                height: 6,
                borderRadius: "50%",
                border: "1px solid white",
                cursor: "pointer",
                zIndex: 2,
              }}
            />
          </Tooltip>
        )}
      </Box>
      {label}
    </Box>
  );
};