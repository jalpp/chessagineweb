import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { Box, Typography, CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Chip, Tabs, Tab } from "@mui/material";
import { BarChart } from '@mui/x-charts/BarChart';
import { MaiaEngineContext } from '@/context/MaiaEngineContext';
import { categorizeMove, CATEGORY_COLORS, CATEGORY_LABELS, MAIA_MODELS, MaiaEvaluation, MoveWithProbability, uciToSan, ModelType, MODEL_CONFIGS } from '@/libs/maia/types';
import { MoveAnalysis } from "@/hooks/useGameReview";

interface MaiaProbabilityChartProps {
  moves: MoveAnalysis[];
}

export const MaiaProbabilityChart: React.FC<MaiaProbabilityChartProps> = ({ moves }) => {
  const { maia2, maia2200, elitemaia, status, activeModels } = useContext(MaiaEngineContext);
  
  // State for evaluations from different models
  const [maia2Evaluations, setMaia2Evaluations] = useState<Array<{
    [key: string]: MaiaEvaluation;
  } | null>>([]);
  const [maia2200Evaluations, setMaia2200Evaluations] = useState<Array<MaiaEvaluation | null>>([]);
  const [elitemaiaEvaluations, setElitemaiaEvaluations] = useState<Array<MaiaEvaluation | null>>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedModelType, setSelectedModelType] = useState<ModelType>('maia2');
  const [selectedMaia2Level, setSelectedMaia2Level] = useState<string>('maia_kdd_1900');
  const [improbableThreshold, setImprobableThreshold] = useState<number>(0.1);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract move data
  const moveData = useMemo(() => {
    return moves.map((move) => ({
      fen: move.fen,
      notation: move.notation,
      plyNumber: move.plyNumber,
      quality: move.quality,
      isBook: move.quality === 'Book',
    }));
  }, [moves]);

  // Set default model type to first active model
  useEffect(() => {
    if (activeModels.length > 0 && !activeModels.includes(selectedModelType)) {
      setSelectedModelType(activeModels[0]);
    }
  }, [activeModels, selectedModelType]);

  // Analyze all positions with all active models
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    const analyzeAllMoves = async () => {
      if (moveData.length === 0 || activeModels.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        // Analyze with Maia 2
        if (activeModels.includes('maia2') && maia2 && status.maia2 === 'ready') {
          const allMaia2Evals: Array<{ [key: string]: MaiaEvaluation } | null> = [];

          for (const move of moveData) {
            if (currentAbortController.signal.aborted) return;

           

            const { result } = await maia2.batchEvaluate(
              Array(9).fill(move.fen),
              [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
              [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]
            );

            const sanEvaluations: { [key: string]: MaiaEvaluation } = {};

            MAIA_MODELS.forEach((model, index) => {
              const uciEval = result[index];
              const sanPolicy: { [key: string]: number } = {};
              Object.entries(uciEval.policy).forEach(([uciMove, probability]) => {
                const sanMove = uciToSan(uciMove, move.fen);
                sanPolicy[sanMove] = probability;
              });

              sanEvaluations[model] = {
                value: uciEval.value,
                policy: sanPolicy,
              };
            });

            allMaia2Evals.push(sanEvaluations);
          }

          if (!currentAbortController.signal.aborted) {
            setMaia2Evaluations(allMaia2Evals);
          }
        }

        // Analyze with Maia 2200
        if (activeModels.includes('maia2200') && maia2200 && status.maia2200 === 'ready') {
          const allMaia2200Evals: Array<MaiaEvaluation | null> = [];

          for (const move of moveData) {
            if (currentAbortController.signal.aborted) return;

         

            const uciEval = await maia2200.evaluate(move.fen, 2200, 2200);
            const sanPolicy: { [key: string]: number } = {};
            Object.entries(uciEval.policy).forEach(([uciMove, probability]) => {
              const sanMove = uciToSan(uciMove, move.fen);
              sanPolicy[sanMove] = probability;
            });

            allMaia2200Evals.push({
              value: uciEval.value,
              policy: sanPolicy,
            });
          }

          if (!currentAbortController.signal.aborted) {
            setMaia2200Evaluations(allMaia2200Evals);
          }
        }

        // Analyze with Elite Maia
        if (activeModels.includes('elitemaia') && elitemaia && status.elitemaia === 'ready') {
          const allElitemaiaEvals: Array<MaiaEvaluation | null> = [];

          for (const move of moveData) {
            if (currentAbortController.signal.aborted) return;

            const uciEval = await elitemaia.evaluate(move.fen, 2500, 2500);
            const sanPolicy: { [key: string]: number } = {};
            Object.entries(uciEval.policy).forEach(([uciMove, probability]) => {
              const sanMove = uciToSan(uciMove, move.fen);
              sanPolicy[sanMove] = probability;
            });

            allElitemaiaEvals.push({
              value: uciEval.value,
              policy: sanPolicy,
            });
          }

          if (!currentAbortController.signal.aborted) {
            setElitemaiaEvaluations(allElitemaiaEvals);
          }
        }

      } catch (err) {
        if (!currentAbortController.signal.aborted) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          console.error('Maia analysis error:', error);
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    analyzeAllMoves();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [moveData, activeModels, maia2, maia2200, elitemaia, status]);

  // Get current evaluations based on selected model
  const currentEvaluations = useMemo(() => {
    if (selectedModelType === 'maia2') {
      return maia2Evaluations.map(eval1 => eval1 ? eval1[selectedMaia2Level] : null);
    } else if (selectedModelType === 'maia2200') {
      return maia2200Evaluations;
    } else {
      return elitemaiaEvaluations;
    }
  }, [selectedModelType, selectedMaia2Level, maia2Evaluations, maia2200Evaluations, elitemaiaEvaluations]);

  // Prepare chart data
  const { chartData, movesWithCategories } = useMemo(() => {
    const movesWithCategories: MoveWithProbability[] = [];
    
    const chartData = moveData.map((move, index) => {
      const evaluation = currentEvaluations[index];
      const moveNumber = Math.floor((move.plyNumber + 1) / 2);
      
      if (!evaluation) {
        // Book moves
        movesWithCategories.push({
          moveNumber,
          notation: move.notation,
          quality: move.quality,
          probability: 0,
          category: 'book',
          isGoodMove: false,
        });
        return {
          move: moveNumber,
          probability: 0,
          category: 'book',
        };
      }
      
      const probability = evaluation.policy[move.notation] || 0;
      const isGoodMove = ['Best', 'Very Good', 'Good'].includes(move.quality);
      const category = categorizeMove(probability, move.quality, improbableThreshold);
      
      movesWithCategories.push({
        moveNumber,
        notation: move.notation,
        quality: move.quality,
        probability,
        category,
        isGoodMove,
      });
      
      return {
        move: moveNumber,
        probability,
        category,
      };
    });
    
    return { chartData, movesWithCategories };
  }, [moveData, currentEvaluations, improbableThreshold]);

  // Count interesting moves
  const brilliantCount = movesWithCategories.filter(m => m.category === 'brilliant').length;
  const trickyCount = movesWithCategories.filter(m => m.category === 'tricky').length;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400} flexDirection="column">
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography color="text.secondary">Analyzing move probabilities with Maia...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">
          Error analyzing moves: {error.message}
        </Alert>
      </Box>
    );
  }

  if (activeModels.length === 0) {
    return (
      <Box p={2}>
        <Alert severity="info">
          Please download at least one Maia model to see move probability analysis.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Maia Move Probability Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shows predicted human move probabilities (0 = unlikely, 1 = very likely)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {brilliantCount > 0 && (
            <Chip 
              label={`${brilliantCount} Brilliant`} 
              sx={{ bgcolor: CATEGORY_COLORS.brilliant, color: 'white' }} 
              size="small"
            />
          )}
          {trickyCount > 0 && (
            <Chip 
              label={`${trickyCount} Tricky`} 
              sx={{ bgcolor: CATEGORY_COLORS.tricky, color: 'white' }} 
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* Model Selection Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={selectedModelType}
          onChange={(_, value) => setSelectedModelType(value)}
          variant="fullWidth"
        >
          {activeModels.map((modelType) => (
            <Tab
              key={modelType}
              label={MODEL_CONFIGS[modelType].name}
              value={modelType}
            />
          ))}
        </Tabs>
      </Box>

      {/* Maia 2 Rating Level Selector */}
      {selectedModelType === 'maia2' && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2">Rating Level:</Typography>
          <ToggleButtonGroup
            value={selectedMaia2Level}
            exclusive
            onChange={(e, value) => value && setSelectedMaia2Level(value)}
            size="small"
          >
            {MAIA_MODELS.map(model => (
              <ToggleButton key={model} value={model}>
                {model.replace('maia_kdd_', '')}
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
          onChange={(e) => setImprobableThreshold(parseFloat(e.target.value))}
          style={{ width: '300px' }}
        />
      </Box>

      <BarChart
        xAxis={[
          {
            scaleType: 'band',
            data: chartData.map(d => d.move.toString()),
            label: 'Move Number',
          },
        ]}
        yAxis={[
          {
            min: 0,
            max: 1,
            label: 'Maia Probability',
          },
        ]}
        series={[
          {
            data: chartData.map(d => d.probability),
            label: 'Move Probability',
            valueFormatter: (value, context) => {
              if (value !== null && context.dataIndex !== undefined) {
                const move = movesWithCategories[context.dataIndex];
                return `${move.notation} (${move.quality}): ${(value * 100).toFixed(1)}% - ${CATEGORY_LABELS[move.category]}`;
              }
              return `${((value ?? 0) * 100).toFixed(1)}%`;
            },
          },
        ]}
        height={500}
        margin={{ left: 70, right: 20, top: 20, bottom: 70 }}
        grid={{ vertical: true, horizontal: true }}
      />

      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: CATEGORY_COLORS.brilliant, borderRadius: 0.5 }} />
          <Typography variant="body2">{CATEGORY_LABELS.brilliant}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: CATEGORY_COLORS.tricky, borderRadius: 0.5 }} />
          <Typography variant="body2">{CATEGORY_LABELS.tricky}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: CATEGORY_COLORS.normal, borderRadius: 0.5 }} />
          <Typography variant="body2">{CATEGORY_LABELS.normal}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: CATEGORY_COLORS.book, borderRadius: 0.5 }} />
          <Typography variant="body2">{CATEGORY_LABELS.book}</Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {selectedModelType === 'maia2' && `Analyzing from ${selectedMaia2Level.replace('maia_kdd_', '')} rating perspective. `}
          {selectedModelType === 'maia2200' && 'Analyzing from 2200-2299 rating perspective. '}
          {selectedModelType === 'elitemaia' && 'Analyzing from elite player (2500+) perspective. '}
          Brilliant moves are objectively good but improbable for humans to find. 
          Tricky positions show probable moves that are objectively bad - great for finding opponent traps in your opening repertoire!
        </Typography>
      </Box>

      {/* Summary Report */}
      {(brilliantCount > 0 || trickyCount > 0) && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Move Analysis Summary
          </Typography>

          {brilliantCount > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: CATEGORY_COLORS.brilliant, mb: 1, fontWeight: 'bold' }}>
                💎 Brilliant Moves ({brilliantCount})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                These moves are objectively strong but humans at this level rarely find them:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {movesWithCategories
                  .filter(m => m.category === 'brilliant')
                  .map((move, idx) => (
                    <Box 
                      key={idx}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        p: 1,
                        bgcolor: 'rgba(74, 222, 128, 0.1)',
                        borderRadius: 1,
                        borderLeft: 3,
                        borderColor: CATEGORY_COLORS.brilliant
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 60 }}>
                        Move {move.moveNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 60 }}>
                        {move.notation}
                      </Typography>
                      <Chip label={move.quality} size="small" sx={{ minWidth: 80 }} />
                      <Typography variant="body2" color="text.secondary">
                        Only {(move.probability * 100).toFixed(1)}% probability
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}

          {trickyCount > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: CATEGORY_COLORS.tricky, mb: 1, fontWeight: 'bold' }}>
                ⚠️ Tricky Positions ({trickyCount})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                These moves are objectively bad but humans at this level often play them - great positions to exploit!
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {movesWithCategories
                  .filter(m => m.category === 'tricky')
                  .map((move, idx) => (
                    <Box 
                      key={idx}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        p: 1,
                        bgcolor: 'rgba(248, 113, 113, 0.1)',
                        borderRadius: 1,
                        borderLeft: 3,
                        borderColor: CATEGORY_COLORS.tricky
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 60 }}>
                        Move {move.moveNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 60 }}>
                        {move.notation}
                      </Typography>
                      <Chip label={move.quality} size="small" color="error" sx={{ minWidth: 80 }} />
                      <Typography variant="body2" color="text.secondary">
                        {(move.probability * 100).toFixed(1)}% of players fall for this
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};