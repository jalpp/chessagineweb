import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { Box, Typography, CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Chip } from "@mui/material";
import { BarChart } from '@mui/x-charts/BarChart';
import { MaiaEngineContext } from '@/context/MaiaEngineContext';
import { categorizeMove, CATEGORY_COLORS, CATEGORY_LABELS, MAIA_MODELS, MaiaEvaluation, MoveWithProbability, uciToSan } from '@/libs/maia/types';
import { MoveAnalysis } from "@/hooks/useGameReview";


interface MaiaProbabilityChartProps {
  moves: MoveAnalysis[];
}


export const MaiaProbabilityChart: React.FC<MaiaProbabilityChartProps> = ({ moves }) => {
  const maia = useContext(MaiaEngineContext);
  const [moveEvaluations, setMoveEvaluations] = useState<Array<{
    [key: string]: MaiaEvaluation;
  } | null>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('maia_kdd_1900');
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

  // Analyze all positions with Maia
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    const analyzeAllMoves = async () => {
      if (moveData.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        let retries = 0;
        while (retries < 30 && maia.status !== 'ready') {
          if (currentAbortController.signal.aborted) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries++;
        }

        if (maia.status !== 'ready' || !maia.maia) {
          throw new Error('Maia engine not ready');
        }

        const allEvaluations: Array<{ [key: string]: MaiaEvaluation } | null> = [];

        for (const move of moveData) {
          if (currentAbortController.signal.aborted) return;

          if (move.isBook) {
            allEvaluations.push(null);
            continue;
          }

          const { result } = await maia.maia.batchEvaluate(
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

          allEvaluations.push(sanEvaluations);
        }

        if (!currentAbortController.signal.aborted) {
          setMoveEvaluations(allEvaluations);
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
  }, [moveData, maia.status, maia.maia]);

  // Prepare chart data
  const { chartData, movesWithCategories } = useMemo(() => {
    const movesWithCategories: MoveWithProbability[] = [];
    
    const chartData = moveData.map((move, index) => {
      const evaluation = moveEvaluations[index];
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
      
      const probability = evaluation[selectedModel]?.policy[move.notation] || 0;
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
  }, [moveData, moveEvaluations, selectedModel, improbableThreshold]);

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

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2">Rating Level:</Typography>
        <ToggleButtonGroup
          value={selectedModel}
          exclusive
          onChange={(e, value) => value && setSelectedModel(value)}
          size="small"
        >
          {MAIA_MODELS.map(model => (
            <ToggleButton key={model} value={model}>
              {model.replace('maia_kdd_', '')}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

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
              return `${(value ?? 0 * 100).toFixed(1)}%`;
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
                These moves are objectively strong but humans at this rating level rarely find them:
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
                Tricky Positions ({trickyCount})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                These moves are objectively bad but humans at this rating level often play them, great positions to exploit
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