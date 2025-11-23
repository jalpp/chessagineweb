import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { MoveAnalysis } from "@/hooks/useGameReview";

interface EvalGraphProps {
  moves: MoveAnalysis[];
}

const EvalGraph: React.FC<EvalGraphProps> = ({ moves }) => {

  const theme = useTheme();

  const allData = moves.map((m, idx) => {
  
    const evalm = Number(( m.evalMove / 100).toFixed(2));
    
    return {
      moveNumber: Math.floor((m.plyNumber + 1) / 2),
      eval: evalm,
      player: m.player,
      quality: m.quality,
      notation: m.notation,
      rawEval: m.evalMove,
      index: idx,
    };
  });

  const xData = allData.map((d) => d.moveNumber);
  const yData = allData.map((d) => d.eval);

  const getCriticalY = (label: string) =>
    allData.map((d) => (d.quality === label ? d.eval : null));

  const criticalBlunderY = getCriticalY("Blunder");
  const criticalMistakeY = getCriticalY("Mistake");
  const criticalDubiousY = getCriticalY("Dubious");


  const minEval = Math.min(...yData);
  const maxEval = Math.max(...yData);
  const padding = (maxEval - minEval) * 0.1 || 1;

  return (
    <Box sx={{ width: "100%", height: 500, mt: 2 }}>
      <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
        Game Evaluation Graph
      </Typography>
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
        label: "Evaluation (White's Perspective)",
        min: Math.max(-10, minEval - padding),
        max: Math.min(10, maxEval + padding),
          },
        ]}
        series={[
          {
        data: yData,
        label: "Eval per Move",
        color: theme.palette.text.primary,
        showMark: false,
        connectNulls: true,
        curve: "linear",
        valueFormatter: (value, context) => {
              if (value !== null && context.dataIndex !== undefined) {
                const move = allData[context.dataIndex];
                const prefix = move.eval > 0 ? "+" : "";
                return `${move.player === "w" ? "White" : "Black"}: ${
                  move.notation
                } (${move.quality}): ${prefix}${move.eval.toFixed(2)}`;
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
  );
};

export default EvalGraph;