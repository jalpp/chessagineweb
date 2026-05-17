import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { MoveAnalysis } from "@/libs/agine/helper";

interface EvalGraphProps {
  moves: MoveAnalysis[];
  goToMove?: (index: number) => void;
  currentMoveIndex?: number;
}

const EvalGraph: React.FC<EvalGraphProps> = React.memo(({ moves, goToMove, currentMoveIndex = 0 }) => {
  const theme = useTheme();

  const allData = useMemo(() => moves.map((m, idx) => ({
    moveNumber: Math.floor(m.plyNumber / 2) + 1,
    eval: Number((m.evalMove / 100).toFixed(2)),
    player: m.player,
    quality: m.quality,
    notation: m.notation,
    index: idx,
  })), [moves]);

  const { xData, yData, criticalBlunderY, criticalMistakeY, criticalDubiousY, minEval, maxEval } = useMemo(() => {
    const xData = allData.map((d) => d.moveNumber);
    const yData = allData.map((d) => d.eval);
    const getCritical = (label: string) => allData.map((d) => d.quality === label ? d.eval : null);
    const vals = yData.filter(v => isFinite(v));
    return {
      xData, yData,
      criticalBlunderY: getCritical("Blunder"),
      criticalMistakeY: getCritical("Mistake"),
      criticalDubiousY: getCritical("Dubious"),
      minEval: vals.length ? Math.min(...vals) : -1,
      maxEval: vals.length ? Math.max(...vals) : 1,
    };
  }, [allData]);

  const evalPadding = useMemo(() => (maxEval - minEval) * 0.1 || 1, [maxEval, minEval]);

  const makeFmt = (quality?: string) =>
    (value: number | null, ctx: { dataIndex?: number }) => {
      if (value === null || ctx.dataIndex === undefined) return "";
      const m = allData[ctx.dataIndex];
      const prefix = m.eval > 0 ? "+" : "";
      return `Move ${m.moveNumber} — ${m.player === "w" ? "White" : "Black"}: ${m.notation} (${quality ?? m.quality}): ${prefix}${m.eval.toFixed(2)}`;
    };

  const series = useMemo(() => [
    {
      id: "eval-main", data: yData, label: "Eval per Move",
      color: theme.palette.text.primary,
      showMark: true, connectNulls: true, curve: "linear" as const, yAxisKey: "eval",
      valueFormatter: makeFmt(),
    },
    { id: "eval-blunder", data: criticalBlunderY, label: "Blunders",  color: "#E57373", showMark: true, type: "line" as const, curve: "linear" as const, connectNulls: false, yAxisKey: "eval", valueFormatter: makeFmt("Blunder") },
    { id: "eval-mistake", data: criticalMistakeY, label: "Mistakes",  color: "#FF8A65", showMark: true, type: "line" as const, curve: "linear" as const, connectNulls: false, yAxisKey: "eval", valueFormatter: makeFmt("Mistake") },
    { id: "eval-dubious", data: criticalDubiousY, label: "Dubious",   color: "#FFB74D", showMark: true, type: "line" as const, curve: "linear" as const, connectNulls: false, yAxisKey: "eval", valueFormatter: makeFmt("Dubious") },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [yData, criticalBlunderY, criticalMistakeY, criticalDubiousY, allData, theme.palette.text.primary]);

  const yAxisConfig = useMemo(() => [{
    id: "eval", label: "Evaluation (White's Perspective)",
    min: minEval - evalPadding, max: maxEval + evalPadding,
  }], [minEval, maxEval, evalPadding]);

  const xAxisConfig = useMemo(() => [{ data: xData, label: "Move Number", scaleType: "linear" as const }], [xData]);

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" color="text.primary">Game Analysis Graph</Typography>
      </Box>

      {goToMove && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontSize: "10px" }}>
          Click on any point or line to jump to that position
        </Typography>
      )}

      <Box sx={{ width: "100%", height: 400, cursor: goToMove ? "pointer" : "default" }}>
        <LineChart
          xAxis={xAxisConfig}
          skipAnimation
          yAxis={yAxisConfig}
          series={series}
          height={400}
          margin={{ left: 70, right: 20, top: 20, bottom: 70 }}
          grid={{ vertical: true, horizontal: true }}
          onMarkClick={goToMove ? (_e, id) => { if (id.dataIndex !== undefined) goToMove(id.dataIndex + 1); } : undefined}
          onLineClick={goToMove ? (_e, id) => { if (id.dataIndex !== undefined) goToMove(id.dataIndex + 1); } : undefined}
          sx={{
            '& .MuiMarkElement-root[data-series="eval-main"]': { r: 2, strokeWidth: 0, transition: "r 0.1s ease", "&:hover": { r: 5 } },
            '& .MuiMarkElement-root[data-series="eval-blunder"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="eval-mistake"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="eval-dubious"]': { r: 6, strokeWidth: 1.5 },
            [`& .MuiMarkElement-root[data-index="${currentMoveIndex - 1}"]`]: {
              r: 7, stroke: "#bb86fc", fill: "#bb86fc", strokeWidth: 2,
            },
          }}
        />
      </Box>
    </Box>
  );
}, (prev, next) =>
  prev.moves.length === next.moves.length &&
  prev.moves.every((m, i) => m === next.moves[i]) &&
  prev.currentMoveIndex === next.currentMoveIndex
);

export default EvalGraph;
