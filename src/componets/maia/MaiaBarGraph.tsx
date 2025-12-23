import React, { useState, useMemo, useRef, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  categorizeMove,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MAIA_MODELS,
  MaiaEvaluation,
  uciToSan,
} from "@/libs/maia/types";
import { MoveAnalysis } from "@/hooks/useGameReview";
import Maia from "@/libs/maia/maia";
import { MaiaEngineContext } from "@/context/MaiaEngineContext";

interface MaiaProbabilityChartProps {
  moves: MoveAnalysis[];
}

const modelToElo = (model: string) =>
  Number(model.replace("maia_kdd_", ""));

type EngineType = "maia2" | "bigLeela" | "eliteLeela";

export const MaiaProbabilityChart: React.FC<MaiaProbabilityChartProps> = ({
  moves,

}) => {

  const { maia2, bigLeela, elitemaia } = useContext(MaiaEngineContext);
  const [maia2Evaluations, setMaia2Evaluations] = useState<
    Array<{ [key: string]: MaiaEvaluation } | null>
  >([]);
  const [bigLeelaEvaluations, setBigLeelaEvaluations] = useState<
    Array<MaiaEvaluation | null>
  >([]);
  const [eliteLeelaEvaluations, setEliteLeelaEvaluations] = useState<
    Array<MaiaEvaluation | null>
  >([]);
  
  const [isLoadingMaia2, setIsLoadingMaia2] = useState(false);
  const [isLoadingBigLeela, setIsLoadingBigLeela] = useState(false);
  const [isLoadingEliteLeela, setIsLoadingEliteLeela] = useState(false);
  
  const [error, setError] = useState<Error | null>(null);
  const [selectedMaia2Level, setSelectedMaia2Level] =
    useState<string>("maia_kdd_1900");
  const [improbableThreshold, setImprobableThreshold] = useState(0.1);
  
  const [hasAnalyzedMaia2, setHasAnalyzedMaia2] = useState(false);
  const [hasAnalyzedBigLeela, setHasAnalyzedBigLeela] = useState(false);
  const [hasAnalyzedEliteLeela, setHasAnalyzedEliteLeela] = useState(false);
  
  const [activeTab, setActiveTab] = useState<EngineType>("maia2");

  const abortControllerRef = useRef<AbortController | null>(null);

  const moveData = useMemo(
    () =>
      moves.map((m) => ({
        fen: m.fen,
        notation: m.notation,
        plyNumber: m.plyNumber,
        quality: m.quality,
        isBook: m.quality === "Book",
      })),
    [moves]
  );

  useEffect(() => {
    setHasAnalyzedMaia2(false);
    setHasAnalyzedBigLeela(false);
    setHasAnalyzedEliteLeela(false);
    setMaia2Evaluations([]);
    setBigLeelaEvaluations([]);
    setEliteLeelaEvaluations([]);
  }, [moves]);

  const analyzeMaia2 = async () => {
    if (!maia2 || moveData.length === 0 || isLoadingMaia2) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;

    setIsLoadingMaia2(true);
    setError(null);

    try {
      const batchInputs = moveData.flatMap((move) =>
        move.isBook
          ? []
          : MAIA_MODELS.map((model) => {
              const elo = modelToElo(model);
              return {
                fen: move.fen,
                eloSelf: elo,
                eloOppo: elo,
              };
            })
      );

      const rawResults = await maia2.batchEval(batchInputs);
      if (controller.signal.aborted) return;

      const evaluations: Array<{ [key: string]: MaiaEvaluation } | null> = [];
      let cursor = 0;

      for (const move of moveData) {
        if (move.isBook) {
          evaluations.push(null);
          continue;
        }

        const perMove: Record<string, MaiaEvaluation> = {};

        for (let i = 0; i < MAIA_MODELS.length; i++) {
          const evalUci = rawResults[cursor++];
          const sanPolicy: Record<string, number> = {};

          for (const [uci, prob] of Object.entries(evalUci.policy)) {
            sanPolicy[uciToSan(uci, move.fen)] = prob;
          }

          perMove[MAIA_MODELS[i]] = {
            value: evalUci.value,
            policy: sanPolicy,
          };
        }

        evaluations.push(perMove);
      }

      setMaia2Evaluations(evaluations);
      setHasAnalyzedMaia2(true);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMaia2(false);
      }
    }
  };

  const analyzeBigLeela = async () => {
    if (!bigLeela || moveData.length === 0 || isLoadingBigLeela) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;

    setIsLoadingBigLeela(true);
    setError(null);

    try {
      const batchInputs = moveData
        .filter((move) => !move.isBook)
        .map((move) => ({
          fen: move.fen,
          eloSelf: 3000,
          eloOppo: 3000,
        }));

      const rawResults = await bigLeela.batchEval(batchInputs);
      if (controller.signal.aborted) return;

      const results: Array<MaiaEvaluation | null> = [];
      let cursor = 0;

      for (const move of moveData) {
        if (move.isBook) {
          results.push(null);
          continue;
        }

        const evalUci = rawResults[cursor++];
        const sanPolicy: Record<string, number> = {};
        
        for (const [uci, prob] of Object.entries(evalUci.policy)) {
          sanPolicy[uciToSan(uci, move.fen)] = prob;
        }
        
        results.push({
          value: evalUci.value,
          policy: sanPolicy,
        });
      }

      setBigLeelaEvaluations(results);
      setHasAnalyzedBigLeela(true);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingBigLeela(false);
      }
    }
  };

  const analyzeEliteLeela = async () => {
    if (!elitemaia || moveData.length === 0 || isLoadingEliteLeela) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;

    setIsLoadingEliteLeela(true);
    setError(null);

    try {
      const batchInputs = moveData
        .filter((move) => !move.isBook)
        .map((move) => ({
          fen: move.fen,
          eloSelf: 2800,
          eloOppo: 2800,
        }));

      const rawResults = await elitemaia.batchEval(batchInputs);
      if (controller.signal.aborted) return;

      const results: Array<MaiaEvaluation | null> = [];
      let cursor = 0;

      for (const move of moveData) {
        if (move.isBook) {
          results.push(null);
          continue;
        }

        const evalUci = rawResults[cursor++];
        const sanPolicy: Record<string, number> = {};
        
        for (const [uci, prob] of Object.entries(evalUci.policy)) {
          sanPolicy[uciToSan(uci, move.fen)] = prob;
        }
        
        results.push({
          value: evalUci.value,
          policy: sanPolicy,
        });
      }

      setEliteLeelaEvaluations(results);
      setHasAnalyzedEliteLeela(true);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingEliteLeela(false);
      }
    }
  };

  const { chartData, movesWithCategories } = useMemo(() => {
    const movesWithCategories: Array<{
      moveNumber: number;
      notation: string;
      quality: string;
      probability: number;
      category: string;
      isGoodMove: boolean;
    }> = [];

    const chart = moveData.map((move, idx) => {
      const moveNumber = Math.floor((move.plyNumber + 1) / 2);
      
      let evalForMove: MaiaEvaluation | undefined;
      
      if (activeTab === "maia2") {
        evalForMove = maia2Evaluations[idx]?.[selectedMaia2Level];
      } else if (activeTab === "bigLeela") {
        evalForMove = bigLeelaEvaluations[idx] ?? undefined;
      } else if (activeTab === "eliteLeela") {
        evalForMove = eliteLeelaEvaluations[idx] ?? undefined;
      }

      if (!evalForMove) {
        movesWithCategories.push({
          moveNumber,
          notation: move.notation,
          quality: move.quality,
          probability: 0,
          category: "book",
          isGoodMove: false,
        });
        return { move: moveNumber, probability: 0, category: "book" };
      }

      const probability = evalForMove.policy[move.notation] ?? 0;
      const isGoodMove = ["Best", "Very Good", "Good"].includes(move.quality);
      const category = categorizeMove(
        probability,
        move.quality,
        improbableThreshold
      );

      movesWithCategories.push({
        moveNumber,
        notation: move.notation,
        quality: move.quality,
        probability,
        category,
        isGoodMove,
      });

      return { move: moveNumber, probability, category };
    });

    return { chartData: chart, movesWithCategories };
  }, [moveData, maia2Evaluations, bigLeelaEvaluations, eliteLeelaEvaluations, selectedMaia2Level, improbableThreshold, activeTab]);

  const brilliantCount = movesWithCategories.filter(
    (m) => m.category === "brilliant"
  ).length;
  const trickyCount = movesWithCategories.filter(
    (m) => m.category === "tricky"
  ).length;

  const isLoading = isLoadingMaia2 || isLoadingBigLeela || isLoadingEliteLeela;
  const hasAnalyzed = 
    (activeTab === "maia2" && hasAnalyzedMaia2) ||
    (activeTab === "bigLeela" && hasAnalyzedBigLeela) ||
    (activeTab === "eliteLeela" && hasAnalyzedEliteLeela);

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      {/* Header with Chips */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            Move Probability Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shows predicted move probabilities (0 = unlikely, 1 = very likely)
          </Typography>
        </Box>
        {hasAnalyzed && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {brilliantCount > 0 && (
              <Chip
                label={`${brilliantCount} Brilliant`}
                sx={{ bgcolor: CATEGORY_COLORS.brilliant, color: "white" }}
                size="small"
              />
            )}
            {trickyCount > 0 && (
              <Chip
                label={`${trickyCount} Tricky`}
                sx={{ bgcolor: CATEGORY_COLORS.tricky, color: "white" }}
                size="small"
              />
            )}
          </Box>
        )}
      </Box>

      {/* Engine Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="Maia 2" value="maia2" />
        <Tab label="Elite Leela (2800)" value="eliteLeela" />
        <Tab label="Leela (3000) T1-256" value="bigLeela" />
      </Tabs>

      {/* Analyze Buttons */}
      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          color="primary"
          disabled={isLoadingMaia2 || hasAnalyzedMaia2}
          onClick={analyzeMaia2}
          startIcon={isLoadingMaia2 ? <CircularProgress size={18} /> : null}
        >
          {isLoadingMaia2 ? "Analyzing Maia 2…" : hasAnalyzedMaia2 ? "Maia 2 Analyzed ✓" : "Analyze with Maia 2"}
        </Button>
        
        <Button
          variant="contained"
          color="secondary"
          disabled={isLoadingBigLeela || hasAnalyzedBigLeela}
          onClick={analyzeBigLeela}
          startIcon={isLoadingBigLeela ? <CircularProgress size={18} /> : null}
        >
          {isLoadingBigLeela ? "Analyzing Big Leela…" : hasAnalyzedBigLeela ? "Big Leela Analyzed ✓" : "Analyze with Big Leela"}
        </Button>
        
        <Button
          variant="contained"
          color="secondary"
          disabled={isLoadingEliteLeela || hasAnalyzedEliteLeela}
          onClick={analyzeEliteLeela}
          startIcon={isLoadingEliteLeela ? <CircularProgress size={18} /> : null}
        >
          {isLoadingEliteLeela ? "Analyzing Elite Leela…" : hasAnalyzedEliteLeela ? "Elite Leela Analyzed ✓" : "Analyze with Elite Leela"}
        </Button>
      </Box>

      {/* Loading Overlay */}
      {isLoading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={300}
          flexDirection="column"
        >
          <CircularProgress />
          <Typography sx={{ mt: 1 }}>
            Analyzing with {activeTab === "maia2" ? "Maia 2" : activeTab === "bigLeela" ? "Big Leela" : "Elite Leela"}…
          </Typography>
        </Box>
      )}

      {/* Results */}
      {!isLoading && hasAnalyzed && (
        <>
          {/* Maia 2 specific controls */}
          {activeTab === "maia2" && (
            <Box
              sx={{
                mb: 2,
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2">Rating Level:</Typography>
              <ToggleButtonGroup
                value={selectedMaia2Level}
                exclusive
                onChange={(_, v) => v && setSelectedMaia2Level(v)}
                size="small"
              >
                {MAIA_MODELS.map((m) => (
                  <ToggleButton key={m} value={m}>
                    {m.replace("maia_kdd_", "")}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Improbable Threshold: {(improbableThreshold * 100).toFixed(0)}%
            </Typography>
            <input
              type="range"
              min="0.01"
              max="0.3"
              step="0.01"
              value={improbableThreshold}
              onChange={(e) =>
                setImprobableThreshold(parseFloat(e.target.value))
              }
              style={{ width: "300px" }}
            />
          </Box>

          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: chartData.map((d) => d.move.toString()),
                label: "Move Number",
              },
            ]}
            yAxis={[
              {
                min: 0,
                max: 1,
                label: "Move Probability",
              },
            ]}
            series={[
              {
                data: chartData.map((d) => d.probability),
                label: "Move Probability",
                valueFormatter: (value, context) => {
                  if (value !== null && context.dataIndex !== undefined) {
                    const move = movesWithCategories[context.dataIndex];
                    return `${move.notation} (${move.quality}): ${(
                      value * 100
                    ).toFixed(1)}%`;
                  }
                  return `${((value ?? 0) * 100).toFixed(1)}%`;
                },
              },
            ]}
            height={500}
            margin={{ left: 70, right: 20, top: 20, bottom: 70 }}
            grid={{ vertical: true, horizontal: true }}
          />

          <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <Box
                key={k}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor:
                      CATEGORY_COLORS[k as keyof typeof CATEGORY_COLORS],
                    borderRadius: 0.5,
                  }}
                />
                <Typography variant="body2">{v}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              {activeTab === "maia2" 
                ? "Brilliant moves are objectively good but improbable for humans to find. Tricky positions show probable moves that are objectively bad - great for finding opponent traps in your opening repertoire!"
                : "Brilliant moves are objectively good but have low engine probability. Tricky positions show high probability moves that are objectively bad."}
            </Typography>
          </Box>

          {/* Summary Report */}
          {(brilliantCount > 0 || trickyCount > 0) && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: "background.paper",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Move Analysis Summary
              </Typography>

              {brilliantCount > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: CATEGORY_COLORS.brilliant,
                      mb: 1,
                      fontWeight: "bold",
                    }}
                  >
                    💎 Brilliant Moves ({brilliantCount})
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ mb: 1 }}
                  >
                    {activeTab === "maia2"
                      ? "These moves are objectively strong but humans at this rating level rarely find them:"
                      : "These moves are objectively strong but have low engine probability:"}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {movesWithCategories
                      .filter((m) => m.category === "brilliant")
                      .map((move, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 1,
                            bgcolor: "rgba(74, 222, 128, 0.1)",
                            borderRadius: 1,
                            borderLeft: 3,
                            borderColor: CATEGORY_COLORS.brilliant,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold", minWidth: 60 }}
                          >
                            Move {move.moveNumber}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold", minWidth: 60 }}
                          >
                            {move.notation}
                          </Typography>
                          <Chip
                            label={move.quality}
                            size="small"
                            sx={{ minWidth: 80 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Only {(move.probability * 100).toFixed(1)}%
                            probability
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}

              {trickyCount > 0 && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: CATEGORY_COLORS.tricky,
                      mb: 1,
                      fontWeight: "bold",
                    }}
                  >
                    ⚠️ Tricky Positions ({trickyCount})
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ mb: 1 }}
                  >
                    {activeTab === "maia2"
                      ? "These moves are objectively bad but humans at this rating level often play them, great positions to exploit:"
                      : "These moves are objectively bad but have high engine probability:"}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {movesWithCategories
                      .filter((m) => m.category === "tricky")
                      .map((move, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 1,
                            bgcolor: "rgba(248, 113, 113, 0.1)",
                            borderRadius: 1,
                            borderLeft: 3,
                            borderColor: CATEGORY_COLORS.tricky,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold", minWidth: 60 }}
                          >
                            Move {move.moveNumber}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold", minWidth: 60 }}
                          >
                            {move.notation}
                          </Typography>
                          <Chip
                            label={move.quality}
                            size="small"
                            color="error"
                            sx={{ minWidth: 80 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {(move.probability * 100).toFixed(1)}%{" "}
                            {activeTab === "maia2" ? "of players fall for this" : "engine probability"}
                          </Typography>
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