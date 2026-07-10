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

  const bestMove = lineEval?.pv?.[0] ?? "N/A";
  const evalText = getEvalText();

  if (disabled) {
    return (
      <Tooltip title="Auto-analysis is off — enable it to see engine evaluation" placement="right">
        <Box
          sx={{
            width: 20,
            height,
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
    );
  }

  return (
    <Box
      sx={{
        width: 20,
        height,
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
            top: isFlipped
              ? (whitePercentage < 50 ? 8 : "auto")
              : (whitePercentage > 50 ? 8 : "auto"),
            bottom: isFlipped
              ? (whitePercentage >= 50 ? 8 : "auto")
              : (whitePercentage <= 50 ? 8 : "auto"),
            left: "50%",
            transform: "translateX(-50%) rotate(-90deg)",
            transformOrigin: "center",
            minWidth: "60px",
            textAlign: "center",
            zIndex: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "10px",
              fontWeight: "bold",
              color: whitePercentage > 75 || whitePercentage < 25 ? "#fff" : "#000",
              textShadow:
                whitePercentage > 75 || whitePercentage < 25
                  ? "1px 1px 2px rgba(0,0,0,0.7)"
                  : "none",
            }}
          >
            {evalText}
          </Typography>
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
  );
};