import React, { useMemo, useState, useCallback } from "react";
import { Box, Typography, useTheme, ToggleButtonGroup, ToggleButton, Alert, AlertTitle } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { MoveAnalysis } from "@/libs/agine/helper";
import { useNetStatus } from "@/context/NetContext";

interface EvalGraphProps {
  moves: MoveAnalysis[];
  goToMove?: (index: number) => void;   
  currentMoveIndex?: number;             
}

type GraphMode = "eval" | "ease";

const EvalGraph: React.FC<EvalGraphProps> = React.memo(({ moves, goToMove, currentMoveIndex = 0 }) => {
  const theme = useTheme();
  const [graphMode, setGraphMode] = useState<GraphMode>("eval");
  const { status } = useNetStatus();
  const leelaT1Status = status['bigLeela'];

  const allData = useMemo(() => {
    return moves.map((m, idx) => {
      const evalm = Number((m.evalMove / 100).toFixed(2));
      
      return {
        moveNumber: Math.floor((m.plyNumber + 1) / 2),
        eval: evalm,
        easeMetric: m.easeMetric,
        player: m.player,
        quality: m.quality,
        notation: m.notation,
        rawEval: m.evalMove,
        index: idx,
      };
    });
  }, [moves]);

  const { xData, yData, easeData, criticalBlunderY, criticalMistakeY, criticalDubiousY, easeDubiousY, easeMistakeY, easeBlunderY, minEval, maxEval, minEase, maxEase, undefinedEaseCount } = useMemo(() => {
    const xData = allData.map((d) => d.moveNumber);
    const yData = allData.map((d) => d.eval);
    const easeData = allData.map((d) => d.easeMetric ?? null);

    const getCriticalEval = (label: string) =>
      allData.map((d) => (d.quality === label ? d.eval : null));

    const getCriticalEase = (label: string) =>
      allData.map((d) => (d.quality === label && d.easeMetric != null ? d.easeMetric : null));

    const criticalBlunderY = getCriticalEval("Blunder");
    const criticalMistakeY = getCriticalEval("Mistake");
    const criticalDubiousY = getCriticalEval("Dubious");

    const easeBlunderY = getCriticalEase("Blunder");
    const easeMistakeY = getCriticalEase("Mistake");
    const easeDubiousY = getCriticalEase("Dubious");

    const minEval = Math.min(...yData);
    const maxEval = Math.max(...yData);

    const validEaseData = easeData.filter((e): e is number => e !== null);
    const undefinedEaseCount = easeData.filter((e) => e === null).length;
    const minEase = validEaseData.length > 0 ? Math.min(...validEaseData) : 0;
    const maxEase = validEaseData.length > 0 ? Math.max(...validEaseData) : 1;

    return { xData, yData, easeData, criticalBlunderY, criticalMistakeY, criticalDubiousY, easeDubiousY, easeMistakeY, easeBlunderY, minEval, maxEval, minEase, maxEase, undefinedEaseCount };
  }, [allData]);

  const evalPadding = useMemo(() => (maxEval - minEval) * 0.1 || 1, [maxEval, minEval]);
  const easePadding = useMemo(() => (maxEase - minEase) * 0.1 || 0.1, [maxEase, minEase]);

  const shouldShowLeelaWarning = undefinedEaseCount >= 5 || leelaT1Status !== "ready";
  const showEaseMetricWarning = graphMode === "ease" && shouldShowLeelaWarning;

  const handleModeChange = useCallback((_event: React.MouseEvent<HTMLElement>, newMode: GraphMode | null) => {
    if (newMode !== null) {
      setGraphMode(newMode);
    }
  }, []);

  const seriesConfig = useMemo(() => {
    const evalSeries = {
      id: "eval-main",
      data: yData,
      label: "Eval per Move",
      color: theme.palette.text.primary,
      showMark: true,
      connectNulls: true,
      curve: "linear" as const,
      yAxisKey: "eval",
      valueFormatter: (value: number | null, context: { dataIndex?: number }) => {
        if (value !== null && context.dataIndex !== undefined) {
          const move = allData[context.dataIndex];
          const prefix = move.eval > 0 ? "+" : "";
          return `${move.player === "w" ? "White" : "Black"}: ${
            move.notation
          } (${move.quality}): ${prefix}${move.eval.toFixed(2)}`;
        }
        return "";
      },
    };

    const easeSeries = {
      id: "ease-main",
      data: easeData,
      label: "Ease Metric",
      color: "#4CAF50",
      showMark: true,
      connectNulls: true,
      curve: "linear" as const,
      yAxisKey: "eval",
      valueFormatter: (value: number | null, context: { dataIndex?: number }) => {
        if (value !== null && context.dataIndex !== undefined) {
          const move = allData[context.dataIndex];
          const difficulty =
            value >= 0.8 ? "Very Easy" :
            value >= 0.6 ? "Easy" :
            value >= 0.4 ? "Moderate" :
            value >= 0.2 ? "Hard" :
            "Very Hard";
          return `${move.player === "w" ? "White" : "Black"}: ${move.notation} — ${difficulty} (${value.toFixed(2)})`;
        }
        return "";
      },
    };

    // Eval-mode overlays: blunder/mistake/dubious dots on the eval line
    const evalCriticalSeries = [
      {
        id: "eval-blunder",
        data: criticalBlunderY,
        label: "Blunders",
        color: "#E57373",
        showMark: true,
        type: "line" as const,
        curve: "linear" as const,
        connectNulls: false,
        yAxisKey: "eval",
      },
      {
        id: "eval-mistake",
        data: criticalMistakeY,
        label: "Mistakes",
        color: "#FF8A65",
        showMark: true,
        type: "line" as const,
        curve: "linear" as const,
        connectNulls: false,
        yAxisKey: "eval",
      },
      {
        id: "eval-dubious",
        data: criticalDubiousY,
        label: "Dubious",
        color: "#FFB74D",
        showMark: true,
        type: "line" as const,
        curve: "linear" as const,
        connectNulls: false,
        yAxisKey: "eval",
      },
    ];

    // Ease-mode overlays: blunder/mistake/dubious dots on the ease line
    const easeCriticalSeries = [
      {
        id: "ease-blunder",
        data: easeBlunderY,
        label: "Blunders",
        color: "#E57373",
        showMark: true,
        type: "line" as const,
        curve: "linear" as const,
        connectNulls: false,
        yAxisKey: "eval",
      },
      {
        id: "ease-mistake",
        data: easeMistakeY,
        label: "Mistakes",
        color: "#FF8A65",
        showMark: true,
        type: "line" as const,
        curve: "linear" as const,
        connectNulls: false,
        yAxisKey: "eval",
      },
      {
        id: "ease-dubious",
        data: easeDubiousY,
        label: "Dubious",
        color: "#FFB74D",
        showMark: true,
        type: "line" as const,
        curve: "linear" as const,
        connectNulls: false,
        yAxisKey: "eval",
      },
    ];

    if (graphMode === "eval") {
      return [evalSeries, ...evalCriticalSeries];
    } else {
      return [easeSeries, ...easeCriticalSeries];
    }
  }, [yData, easeData, criticalBlunderY, criticalMistakeY, criticalDubiousY, easeBlunderY, easeMistakeY, easeDubiousY, graphMode, allData, theme.palette.text.primary]);

  const yAxisConfig = useMemo(() => {
    if (graphMode === "ease") {
      return [
        {
          id: "eval",
          label: "Ease Metric (0 = Hard, 1 = Easy)",
          min: Math.max(0, minEase - easePadding),
          max: Math.min(1, maxEase + easePadding),
        },
      ];
    } else {
      return [
        {
          id: "eval",
          label: "Evaluation (White's Perspective)",
          min: minEval - evalPadding,
          max: maxEval + evalPadding,
        },
      ];
    }
  }, [graphMode, minEval, maxEval, minEase, maxEase, evalPadding, easePadding]);

  const xAxisConfig = useMemo(() => [
    {
      data: xData,
      label: "Move Number",
      scaleType: "linear" as const,
    },
  ], [xData]);

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" color="text.primary">
          Game Analysis Graph
        </Typography>
        <ToggleButtonGroup
          value={graphMode}
          exclusive
          onChange={handleModeChange}
          size="small"
          aria-label="graph mode"
        >
          <ToggleButton value="eval" aria-label="evaluation only">
            Evaluation
          </ToggleButton>
          <ToggleButton value="ease" aria-label="ease metric only">
            Ease Metric
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {showEaseMetricWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Leela T1-256 Required</AlertTitle>
          Ease metric data is unavailable or incomplete. Please download the Leela T1-256 neural network to enable ease metric analysis.
          {undefinedEaseCount > 0 && ` (${undefinedEaseCount} move${undefinedEaseCount !== 1 ? 's' : ''} missing ease data)`}
        </Alert>
      )}

      {/* ── NEW: hint text when navigation is enabled ── */}
      {goToMove && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontSize: "10px" }}>
          Click on any point or line to jump to that position
        </Typography>
      )}

      {/* ── NEW: pointer cursor + reduced height (550→400) ── */}
      <Box sx={{ width: "100%", height: 400, cursor: goToMove ? "pointer" : "default" }}>
        <LineChart
          xAxis={xAxisConfig}
          skipAnimation
          yAxis={yAxisConfig}
          series={seriesConfig}
          height={400}
          margin={{ left: 70, right: 20, top: 20, bottom: 70 }}
          grid={{ vertical: true, horizontal: true }}
         
          onMarkClick={goToMove ? (_event, identifier) => {
            if (identifier.dataIndex !== undefined) {
              goToMove(identifier.dataIndex + 1);
            }
          } : undefined}
          onLineClick={goToMove ? (_event, identifier) => {
            if (identifier.dataIndex !== undefined) {
              goToMove(identifier.dataIndex + 1);
            }
          } : undefined}
        
          sx={{
            // Main line marks: tiny, grow on hover
            '& .MuiMarkElement-root[data-series="eval-main"]': {
              r: 2, strokeWidth: 0, transition: "r 0.1s ease",
              "&:hover": { r: 5 },
            },
            '& .MuiMarkElement-root[data-series="ease-main"]': {
              r: 2, strokeWidth: 0, transition: "r 0.1s ease",
              "&:hover": { r: 5 },
            },
            // Overlay dots: large, clearly visible
            '& .MuiMarkElement-root[data-series="eval-blunder"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="eval-mistake"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="eval-dubious"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="ease-blunder"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="ease-mistake"]': { r: 6, strokeWidth: 1.5 },
            '& .MuiMarkElement-root[data-series="ease-dubious"]': { r: 6, strokeWidth: 1.5 },
            // Current move — purple highlight, overrides all
            [`& .MuiMarkElement-root[data-index="${currentMoveIndex - 1}"]`]: {
              r: 7,
              stroke: "#bb86fc",
              fill: "#bb86fc",
              strokeWidth: 2,
            },
          }}
        />
      </Box>
    </Box>
  );

}, (prevProps, nextProps) => {
  return prevProps.moves.length === nextProps.moves.length &&
    prevProps.moves.every((move, idx) => move === nextProps.moves[idx]) &&
    prevProps.currentMoveIndex === nextProps.currentMoveIndex;
});

export default EvalGraph;