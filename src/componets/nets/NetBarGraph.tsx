import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Box, Typography, CircularProgress, Alert,
  Button, Chip, Tabs, Tab,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  CATEGORY_COLORS, CATEGORY_LABELS,
  MaiaEvaluation, uciToSan, NeuralNetType,
} from "@/libs/nets/types";
import { categorizeMove } from "@/libs/nets/classifyMoves";
import { MoveAnalysis } from "@/libs/agine/helper";

interface NetProbabilityChartProps { moves: MoveAnalysis[] }

// ── API helpers ───────────────────────────────────────────────────────────────

interface TopMove { move: string; probability: number }
interface UciEval { policy: Record<string, number>; value: number }
interface NNData { topMoves: TopMove[]; uciEval?: UciEval }

function sanPolicy(data: NNData, fen: string): Record<string, number> {
  const policy: Record<string, number> = {};
  if (data.uciEval) {
    for (const [uci, prob] of Object.entries(data.uciEval.policy))
      policy[uciToSan(uci, fen)] = prob;
  } else {
    for (const { move, probability } of data.topMoves) policy[move] = probability;
  }
  return policy;
}

async function analyzeAllMoves(
  moveData: { fen: string; isBook: boolean }[],
  engine: "leela" | "elite-leela",
  signal: AbortSignal
): Promise<Array<MaiaEvaluation | null>> {
  return Promise.all(
    moveData.map(async (move) => {
      if (move.isBook) return null;
      const res = await fetch("/api/nn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "analyze", fen: move.fen, engine }),
        signal,
      });
      if (!res.ok) throw new Error(`${engine} error: ${res.status}`);
      const json = await res.json();
      const data = json.data as NNData;
      return { value: data.uciEval?.value ?? 0.5, policy: sanPolicy(data, move.fen) };
    })
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NetProbabilityChart: React.FC<NetProbabilityChartProps> = ({ moves }) => {
  const [leelaEvals, setLeelaEvals] = useState<Array<MaiaEvaluation | null>>([]);
  const [eliteEvals, setEliteEvals] = useState<Array<MaiaEvaluation | null>>([]);
  const [loadingLeela, setLoadingLeela] = useState(false);
  const [loadingElite, setLoadingElite] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [improbableThreshold, setImprobableThreshold] = useState(0.1);
  const [doneLeela, setDoneLeela] = useState(false);
  const [doneElite, setDoneElite] = useState(false);
  const [activeTab, setActiveTab] = useState<NeuralNetType>("bigLeela");
  const abortRef = useRef<AbortController | null>(null);

  const moveData = useMemo(
    () => moves.map((m) => ({
      fen: m.fen, notation: m.notation,
      plyNumber: m.plyNumber, quality: m.quality,
      isBook: m.quality === "Book",
    })),
    [moves]
  );

  useEffect(() => {
    setDoneLeela(false); setDoneElite(false);
    setLeelaEvals([]); setEliteEvals([]);
  }, [moves]);

  const analyzeEngine = async (
    engine: "leela" | "elite-leela",
    setResults: React.Dispatch<React.SetStateAction<Array<MaiaEvaluation | null>>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setDone: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (moveData.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const results = await analyzeAllMoves(moveData, engine, ctrl.signal);
      if (!ctrl.signal.aborted) { setResults(results); setDone(true); }
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  const { chartData, movesWithCategories } = useMemo(() => {
    const annotated: Array<{ moveNumber: number; notation: string; quality: string; probability: number; category: string }> = [];
    const chart = moveData.map((move, idx) => {
      const moveNumber = Math.floor((move.plyNumber + 1) / 2);
      const ev = activeTab === "bigLeela" ? leelaEvals[idx] : eliteEvals[idx];
      if (!ev) {
        annotated.push({ moveNumber, notation: move.notation, quality: move.quality, probability: 0, category: "book" });
        return { move: moveNumber, probability: 0, category: "book" };
      }
      const probability = ev.policy[move.notation] ?? 0;
      const category = categorizeMove(probability, move.quality, improbableThreshold);
      annotated.push({ moveNumber, notation: move.notation, quality: move.quality, probability, category });
      return { move: moveNumber, probability, category };
    });
    return { chartData: chart, movesWithCategories: annotated };
  }, [moveData, leelaEvals, eliteEvals, improbableThreshold, activeTab]);

  const brilliantCount = movesWithCategories.filter((m) => m.category === "brilliant").length;
  const trickyCount = movesWithCategories.filter((m) => m.category === "tricky").length;
  const isLoading = loadingLeela || loadingElite;
  const hasAnalyzed = (activeTab === "bigLeela" && doneLeela) || (activeTab === "eliteLeela" && doneElite);

  if (error) return <Box p={2}><Alert severity="error">{error.message}</Alert></Box>;

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>Move Probability Analysis</Typography>
          <Typography variant="body2" color="text.secondary">
            Shows predicted move probabilities (0 = unlikely, 1 = very likely)
          </Typography>
        </Box>
        {hasAnalyzed && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {brilliantCount > 0 && <Chip label={`${brilliantCount} Brilliant`} sx={{ bgcolor: CATEGORY_COLORS.brilliant, color: "white" }} size="small" />}
            {trickyCount > 0 && <Chip label={`${trickyCount} Tricky`} sx={{ bgcolor: CATEGORY_COLORS.tricky, color: "white" }} size="small" />}
          </Box>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="Elite Leela" value="eliteLeela" />
        <Tab label="Leela T1-256" value="bigLeela" />
      </Tabs>

      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button variant="contained" color="primary" disabled={loadingLeela || doneLeela}
          onClick={() => analyzeEngine("leela", setLeelaEvals, setLoadingLeela, setDoneLeela)}
          startIcon={loadingLeela ? <CircularProgress size={18} /> : null}>
          {loadingLeela ? "Analyzing…" : doneLeela ? "Leela Analyzed ✓" : "Analyze with Leela"}
        </Button>
        <Button variant="contained" color="secondary" disabled={loadingElite || doneElite}
          onClick={() => analyzeEngine("elite-leela", setEliteEvals, setLoadingElite, setDoneElite)}
          startIcon={loadingElite ? <CircularProgress size={18} /> : null}>
          {loadingElite ? "Analyzing…" : doneElite ? "Elite Leela Analyzed ✓" : "Analyze with Elite Leela"}
        </Button>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300} flexDirection="column">
          <CircularProgress />
          <Typography sx={{ mt: 1 }}>Analyzing with {activeTab === "bigLeela" ? "Leela T1-256" : "Elite Leela"}…</Typography>
        </Box>
      )}

      {!isLoading && hasAnalyzed && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>Improbable Threshold: {(improbableThreshold * 100).toFixed(0)}%</Typography>
            <input type="range" min="0.01" max="0.3" step="0.01" value={improbableThreshold}
              onChange={(e) => setImprobableThreshold(parseFloat(e.target.value))} style={{ width: "300px" }} />
          </Box>

          <BarChart
            xAxis={[{ scaleType: "band", data: chartData.map((d) => d.move.toString()), label: "Move Number" }]}
            yAxis={[{ min: 0, max: 1, label: "Move Probability" }]}
            series={[{
              data: chartData.map((d) => d.probability),
              label: "Move Probability",
              valueFormatter: (value, context) => {
                if (value !== null && context.dataIndex !== undefined) {
                  const m = movesWithCategories[context.dataIndex];
                  return `${m.notation} (${m.quality}): ${(value * 100).toFixed(1)}%`;
                }
                return `${((value ?? 0) * 100).toFixed(1)}%`;
              },
            }]}
            height={500} margin={{ left: 70, right: 20, top: 20, bottom: 70 }}
            grid={{ vertical: true, horizontal: true }}
          />

          <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <Box key={k} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: CATEGORY_COLORS[k as keyof typeof CATEGORY_COLORS], borderRadius: 0.5 }} />
                <Typography variant="body2">{v}</Typography>
              </Box>
            ))}
          </Box>

          {(brilliantCount > 0 || trickyCount > 0) && (
            <Box sx={{ mt: 3, p: 2, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
              <Typography variant="h6" gutterBottom>Move Analysis Summary</Typography>
              {brilliantCount > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: CATEGORY_COLORS.brilliant, mb: 1, fontWeight: "bold" }}>💎 Brilliant Moves ({brilliantCount})</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {movesWithCategories.filter((m) => m.category === "brilliant").map((move, idx) => (
                      <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1, bgcolor: "rgba(74,222,128,0.1)", borderRadius: 1, borderLeft: 3, borderColor: CATEGORY_COLORS.brilliant }}>
                        <Typography variant="body2" sx={{ fontWeight: "bold", minWidth: 60 }}>Move {move.moveNumber}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold", minWidth: 60 }}>{move.notation}</Typography>
                        <Chip label={move.quality} size="small" sx={{ minWidth: 80 }} />
                        <Typography variant="body2" color="text.secondary">Only {(move.probability * 100).toFixed(1)}% probability</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {trickyCount > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: CATEGORY_COLORS.tricky, mb: 1, fontWeight: "bold" }}>⚠️ Tricky Positions ({trickyCount})</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {movesWithCategories.filter((m) => m.category === "tricky").map((move, idx) => (
                      <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1, bgcolor: "rgba(248,113,113,0.1)", borderRadius: 1, borderLeft: 3, borderColor: CATEGORY_COLORS.tricky }}>
                        <Typography variant="body2" sx={{ fontWeight: "bold", minWidth: 60 }}>Move {move.moveNumber}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold", minWidth: 60 }}>{move.notation}</Typography>
                        <Chip label={move.quality} size="small" color="error" sx={{ minWidth: 80 }} />
                        <Typography variant="body2" color="text.secondary">{(move.probability * 100).toFixed(1)}% engine probability</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
