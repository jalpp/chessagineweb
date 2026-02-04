import React, { useMemo, useState, useCallback } from "react";
import { Box, Typography, useTheme, ToggleButtonGroup, ToggleButton, Alert, AlertTitle } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { MoveAnalysis } from "@/hooks/useGameReview";
import { useNetStatus } from "@/context/NetContext";

interface EvalGraphProps {
  moves: MoveAnalysis[];
}

type GraphMode = "eval" | "ease" | "both";

const EvalGraph: React.FC<EvalGraphProps> = React.memo(({ moves }) => {
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

  const { xData, yData, easeData, criticalBlunderY, criticalMistakeY, criticalDubiousY, minEval, maxEval, minEase, maxEase, undefinedEaseCount } = useMemo(() => {
    const xData = allData.map((d) => d.moveNumber);
    const yData = allData.map((d) => d.eval);
    const easeData = allData.map((d) => d.easeMetric ?? null);

    const getCriticalY = (label: string) =>
      allData.map((d) => (d.quality === label ? d.eval : null));

    const criticalBlunderY = getCriticalY("Blunder");
    const criticalMistakeY = getCriticalY("Mistake");
    const criticalDubiousY = getCriticalY("Dubious");

    const minEval = Math.min(...yData);
    const maxEval = Math.max(...yData);

    const validEaseData = easeData.filter((e): e is number => e !== null);
    const undefinedEaseCount = easeData.filter((e) => e === null).length;
    const minEase = validEaseData.length > 0 ? Math.min(...validEaseData) : 0;
    const maxEase = validEaseData.length > 0 ? Math.max(...validEaseData) : 1;

    return { xData, yData, easeData, criticalBlunderY, criticalMistakeY, criticalDubiousY, minEval, maxEval, minEase, maxEase, undefinedEaseCount };
  }, [allData]);

  const evalPadding = useMemo(() => (maxEval - minEval) * 0.1 || 1, [maxEval, minEval]);
  const easePadding = useMemo(() => (maxEase - minEase) * 0.1 || 0.1, [maxEase, minEase]);

  const shouldShowLeelaWarning = undefinedEaseCount >= 5 || leelaT1Status !== "ready";
  const showEaseMetricWarning = (graphMode === "ease" || graphMode === "both") && shouldShowLeelaWarning;

  const handleModeChange = useCallback((_event: React.MouseEvent<HTMLElement>, newMode: GraphMode | null) => {
    if (newMode !== null) {
      setGraphMode(newMode);
    }
  }, []);

  // Memoize series configuration
  const seriesConfig = useMemo(() => {
    const evalSeries = {
      data: yData,
      label: "Eval per Move",
      color: theme.palette.text.primary,
      showMark: false,
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
      data: easeData,
      label: "Ease Metric",
      color: "#4CAF50",
      showMark: false,
      connectNulls: true,
      curve: "linear" as const,
      yAxisKey: graphMode === "both" ? "ease" : "eval",
      valueFormatter: (value: number | null, context: { dataIndex?: number }) => {
        if (value !== null && context.dataIndex !== undefined) {
          const move = allData[context.dataIndex];
          return `${move.player === "w" ? "White" : "Black"}: ${
            move.notation
          }: Ease ${value.toFixed(3)}`;
        }
        return "";
      },
    };

    const criticalSeries = [
      {
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

    if (graphMode === "eval") {
      return [evalSeries, ...criticalSeries];
    } else if (graphMode === "ease") {
      return [easeSeries];
    } else {
      return [evalSeries, easeSeries, ...criticalSeries];
    }
  }, [yData, easeData, criticalBlunderY, criticalMistakeY, criticalDubiousY, graphMode, allData, theme.palette.text.primary]);

  // Memoize Y-axis configuration
  const yAxisConfig = useMemo(() => {
    if (graphMode === "both") {
      return [
        {
          id: "eval",
          label: "Evaluation (White's Perspective)",
          min: Math.max(-10, minEval - evalPadding),
          max: Math.min(10, maxEval + evalPadding),
        },
        {
          id: "ease",
          label: "Ease Metric",
          min: Math.max(0, minEase - easePadding),
          max: Math.min(1, maxEase + easePadding),
        },
      ];
    } else if (graphMode === "ease") {
      return [
        {
          id: "eval",
          label: "Ease Metric (0 = Difficult, 1 = Easy)",
          min: Math.max(0, minEase - easePadding),
          max: Math.min(1, maxEase + easePadding),
        },
      ];
    } else {
      return [
        {
          id: "eval",
          label: "Evaluation (White's Perspective)",
          min: Math.max(-10, minEval - evalPadding),
          max: Math.min(10, maxEval + evalPadding),
        },
      ];
    }
  }, [graphMode, minEval, maxEval, minEase, maxEase, evalPadding, easePadding]);

  // Memoize X-axis configuration
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
          <ToggleButton value="both" aria-label="both metrics">
            Both
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

      <Box sx={{ width: "100%", height: 550 }}>
        <LineChart
          xAxis={xAxisConfig}
          skipAnimation
          yAxis={yAxisConfig}
          series={seriesConfig}
          height={550}
          margin={{ left: 70, right: graphMode === "both" ? 70 : 20, top: 20, bottom: 70 }}
          grid={{ vertical: true, horizontal: true }}
        />
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  return prevProps.moves.length === nextProps.moves.length &&
    prevProps.moves.every((move, idx) => move === nextProps.moves[idx]);
});

export default EvalGraph;