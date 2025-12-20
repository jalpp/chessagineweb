import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  categorizeMove,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MAIA_MODELS,
  MaiaEvaluation,
  MoveWithProbability,
  uciToSan,
} from "@/libs/maia/types";
import { MoveAnalysis } from "@/hooks/useGameReview";
import Maia from "@/libs/maia/maia";

interface MaiaProbabilityChartProps {
  moves: MoveAnalysis[];
  maia2: Maia | undefined;
}

/** maia_kdd_1100 → 1100 */
const modelToElo = (model: string) =>
  Number(model.replace("maia_kdd_", ""));

export const MaiaProbabilityChart: React.FC<MaiaProbabilityChartProps> = ({
  moves,
  maia2,
}) => {
  const [maia2Evaluations, setMaia2Evaluations] = useState<
    Array<{ [key: string]: MaiaEvaluation } | null>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedMaia2Level, setSelectedMaia2Level] =
    useState<string>("maia_kdd_1900");
  const [improbableThreshold, setImprobableThreshold] = useState(0.1);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

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
    setHasAnalyzed(false);
    setMaia2Evaluations([]);
  }, [moves]);

  const analyzeAllMoves = async () => {
    if (!maia2 || moveData.length === 0 || isLoading) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;

    setIsLoading(true);
    setError(null);

    try {
      /** Build correct batch inputs: 1100 → 1900 per model */
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
      setHasAnalyzed(true);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const { chartData } = useMemo(() => {
    const chart = moveData.map((move, idx) => {
      const evalForMove = maia2Evaluations[idx]?.[selectedMaia2Level];
      const moveNumber = Math.floor((move.plyNumber + 1) / 2);

      if (!evalForMove) {
        return { move: moveNumber, probability: 0, category: "book" };
      }

      const probability = evalForMove.policy[move.notation] ?? 0;
      const category = categorizeMove(
        probability,
        move.quality,
        improbableThreshold
      );

      return { move: moveNumber, probability, category };
    });

    return { chartData: chart };
  }, [moveData, maia2Evaluations, selectedMaia2Level, improbableThreshold]);

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      {/* Analyze Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={isLoading || hasAnalyzed}
          onClick={analyzeAllMoves}
          startIcon={isLoading ? <CircularProgress size={18} /> : null}
        >
          {isLoading ? "Analyzing…" : "Analyze Move Probabilities"}
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
            Analyzing with Maia…
          </Typography>
        </Box>
      )}

      {/* Results */}
      {!isLoading && hasAnalyzed && (
        <>
          <ToggleButtonGroup
            value={selectedMaia2Level}
            exclusive
            onChange={(_, v) => v && setSelectedMaia2Level(v)}
            size="small"
            sx={{ mb: 2 }}
          >
            {MAIA_MODELS.map((m) => (
              <ToggleButton key={m} value={m}>
                {m.replace("maia_kdd_", "")}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: chartData.map((d) => d.move.toString()),
              },
            ]}
            yAxis={[{ min: 0, max: 1 }]}
            series={[
              {
                data: chartData.map((d) => d.probability),
                label: "Maia Probability",
              },
            ]}
            height={500}
          />

          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <Box
                key={k}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    bgcolor:
                      CATEGORY_COLORS[k as keyof typeof CATEGORY_COLORS],
                  }}
                />
                <Typography variant="body2">{v}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};
