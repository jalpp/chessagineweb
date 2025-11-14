import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Tooltip,
  createTheme,
  ThemeProvider,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ShowChart } from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { MoveAnalysis } from "@/hooks/useGameReview";

interface EvalGraphProps {
  moves: MoveAnalysis[];
}


const EvalGraph: React.FC<EvalGraphProps> = ({ moves }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const cpToEval = (cp: number) => Math.max(-3, Math.min(4, cp / 100));

  // Prepare all data points
  const allData = moves.map((m, idx) => ({
    moveNumber: Math.floor((m.plyNumber + 1) / 2),
    eval: cpToEval(m.evalMove),
    player: m.player,
    quality: m.quality,
    notation: m.notation,
    rawEval: m.evalMove,
    index: idx,
  }));

  const xData = allData.map((d) => d.moveNumber);
  const yData = allData.map((d) => d.eval);

  const getCriticalY = (label: string) =>
    allData.map((d) => (d.quality === label ? d.eval : null));

  const criticalBlunderY = getCriticalY("Blunder");
  const criticalMistakeY = getCriticalY("Mistake");
  const criticalDubiousY = getCriticalY("Dubious");

  return (
      <>
      <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
        <Tooltip title="Eval Graph" arrow>
          <Button
            onClick={handleOpen}
            size="small"
            sx={{ minWidth: "auto", color: "primary.main" }}
          >
            <ShowChart />
            <Typography sx={{ ml: 0.5 }}>Eval Graph</Typography>
          </Button>
        </Tooltip>
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" color="text.primary">
              Game Evaluation Graph
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ width: "100%", height: 500, mt: 2 }}>
            <LineChart
              xAxis={[
                {
                  data: xData,
                  label: "Move Number",
                  scaleType: "linear",
                },
              ]}
              yAxis={[
                {
                  label: "Evaluation (Centipawns)",
                  min: -3,
                  max: 4,
                },
              ]}
              series={[
                {
                  data: yData,
                  label: "Eval per Move",
                  color: "#b2ddeaff",
                  showMark: false,

                  connectNulls: true,
                  valueFormatter: (value, context) => {
                    if (value !== null && context.dataIndex !== undefined) {
                      const move = allData[context.dataIndex];
                      const prefix = move.eval > 0 ? "+" : "";
                      return `${move.player === "w" ? "White" : "Black"}: ${
                        move.notation
                      } (${move.quality}) - ${prefix}${move.eval.toFixed(2)}`;
                    }
                    return "";
                  },
                },
                {
                  data: criticalBlunderY,
                  label: "Blunders",
                  color: "#E57373",
                  showMark: true,
                  type: "line",
                  curve: "linear",
                  connectNulls: false,
                },
                {
                  data: criticalMistakeY,
                  label: "Mistakes",
                  color: "#FF8A65",
                  showMark: true,
                  type: "line",
                  curve: "linear",
                  connectNulls: false,
                },
                {
                  data: criticalDubiousY,
                  label: "Dubious",
                  color: "#FFB74D",
                  showMark: true,
                  type: "line",
                  curve: "linear",
                  connectNulls: false,
                },
              ]}
              height={500}
              margin={{ left: 70, right: 20, top: 20, bottom: 70 }}
              grid={{ vertical: true, horizontal: true }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EvalGraph;
