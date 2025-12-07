import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Slider,
  Button,
  Paper,
  Alert,
  Chip,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { ThemeScore } from '@/libs/themes/helper';
import { PositionEval} from '@/stockfish/engine/engine';

interface GuessThemeProps {
  stockfishAnalysisResult: PositionEval | null;
  scores: ThemeScore | null;
  loading: boolean;
  error: string | null;
}

interface GuessState extends ThemeScore {
  overallEval: number;
}

const themeLabels: Record<keyof ThemeScore, string> = {
  material: 'Material',
  mobility: 'Mobility',
  space: 'Space',
  positional: 'Positional',
  kingSafety: 'King Safety',
  tactical: 'Tactical',
  darksqaureControl: 'Dark Square Control',
  lightsqaureControl: 'Light Square Control',
  tempo: 'Tempo',
};

const GuessTheme: React.FC<GuessThemeProps> = ({ 
  scores,
  loading,
  error, 
  stockfishAnalysisResult 
}) => {
 
  
  const [guesses, setGuesses] = useState<GuessState>({
    material: 0,
    mobility: 0,
    space: 0,
    positional: 0,
    kingSafety: 0,
    tactical: 0,
    darksqaureControl: 0,
    lightsqaureControl: 0,
    tempo: 0,
    overallEval: 0,
  });

  const [submitted, setSubmitted] = useState(false);
  const [correctGuesses, setCorrectGuesses] = useState<Set<keyof GuessState>>(new Set());

  // Parse Stockfish evaluation
  const stockfishEval = useMemo(() => {
    if (!stockfishAnalysisResult?.lines?.[0]) return null;
    
    const line = stockfishAnalysisResult.lines[0];
    
    if (line.mate !== undefined) {
      return { type: 'mate' as const, value: line.mate };
    }
    
    if (line.cp !== undefined) {
      return { type: 'cp' as const, value: line.cp / 100 };
    }
    
    return null;
  }, [stockfishAnalysisResult]);

  // Calculate min/max for sliders with padding
  const sliderRange = useMemo(() => {
    if (!scores) return { min: -15, max: 15 };
    
    const allScores = Object.values(scores);
    const minScore = Math.min(...allScores);
    const maxScore = Math.max(...allScores);
    
    // Add padding of 5 to prevent easy guessing
    const padding = 5;
    return {
      min: Math.floor(minScore - padding),
      max: Math.ceil(maxScore + padding),
    };
  }, [scores]);

  // Calculate eval slider range
  const evalSliderRange = useMemo(() => {
    if (!stockfishEval) return { min: -10, max: 10 };
    
    if (stockfishEval.type === 'mate') {
      // For mate, range from 1 to max(10, abs(mate) + 5)
      const maxMate = Math.max(10, Math.abs(stockfishEval.value) + 5);
      return { min: 1, max: maxMate };
    }
    
    // For centipawn eval, add padding
    const padding = 5;
    return {
      min: Math.floor(stockfishEval.value - padding),
      max: Math.ceil(stockfishEval.value + padding),
    };
  }, [stockfishEval]);

  const isGuessCorrect = (guess: number, actual: number): boolean => {
    // For scores above 10 (absolute value), anything above 10 is correct
    if (Math.abs(actual) > 10 && Math.abs(guess) > 10) {
      return true;
    }

    // For other scores, check if within 0.5 bound
    const difference = Math.abs(guess - actual);
    return difference <= 0.5;
  };

  const isEvalGuessCorrect = (guess: number): boolean => {
    if (!stockfishEval) return false;
    
    if (stockfishEval.type === 'mate') {
      // For mate, guess must match the mate number exactly (within 0.5)
      return Math.abs(guess - Math.abs(stockfishEval.value)) <= 0.5;
    }
    
    // For centipawn, within ±0.5
    return Math.abs(guess - stockfishEval.value) <= 0.5;
  };

  const handleSliderChange = (theme: keyof GuessState) => (
    _event: Event,
    value: number | number[]
  ) => {
    setGuesses((prev) => ({
      ...prev,
      [theme]: value as number,
    }));
  };

  const handleSubmit = () => {
    if (!scores || !stockfishEval) return;

    const correct = new Set<keyof GuessState>();

    // Check theme scores
    (Object.keys(scores) as Array<keyof ThemeScore>).forEach((theme) => {
      if (isGuessCorrect(guesses[theme], scores[theme])) {
        correct.add(theme);
      }
    });

    // Check overall eval
    if (isEvalGuessCorrect(guesses.overallEval)) {
      correct.add('overallEval');
    }

    setCorrectGuesses(correct);
    setSubmitted(true);
  };

  const handleReset = () => {
    setGuesses({
      material: 0,
      mobility: 0,
      space: 0,
      positional: 0,
      kingSafety: 0,
      tactical: 0,
      darksqaureControl: 0,
      lightsqaureControl: 0,
      tempo: 0,
      overallEval: 0,
    });
    setSubmitted(false);
    setCorrectGuesses(new Set());
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!scores) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Please provide a valid FEN position to start guessing.
      </Alert>
    );
  }

  if (!stockfishEval) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Waiting for Stockfish analysis...
      </Alert>
    );
  }

  const totalThemes = Object.keys(scores).length + 1; // +1 for overall eval
  const correctCount = correctGuesses.size;

  const getEvalDisplay = () => {
    if (!stockfishEval) return '0.00';
    
    if (stockfishEval.type === 'mate') {
      const mateValue = stockfishEval.value;
      return `M${Math.abs(mateValue)}${mateValue < 0 ? ' (Black)' : ''}`;
    }
    
    const value = stockfishEval.value;
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  };

  return (
    <Paper elevation={3} >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          Guess the Theme Eval Score
        </Typography>
        {submitted && (
          <Chip
            icon={<TrophyIcon />}
            label={`${correctCount}/${totalThemes} Correct`}
            color={correctCount === totalThemes ? 'success' : 'primary'}
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" mb={3}>
        Guess each theme's evaluation score. Positive means White is better, negative means Black
        is better. You get a point if you're within ±0.5 of the actual score (or above 10 for
        scores greater than 10).
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Overall Stockfish Evaluation */}
      <Box mb={3} p={2} sx={{ backgroundColor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Overall Position Evaluation
        </Typography>
        
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" fontWeight="medium">
            {stockfishEval.type === 'mate' ? 'Mate in (moves)' : 'Stockfish Eval'}
          </Typography>
          {submitted && (
            <Box display="flex" alignItems="center" gap={1}>
              {correctGuesses.has('overallEval') ? (
                <CheckCircleIcon color="success" />
              ) : (
                <CancelIcon color="error" />
              )}
              <Typography
                variant="body2"
                color={correctGuesses.has('overallEval') ? 'success.main' : 'error.main'}
                fontWeight="bold"
              >
                Actual: {getEvalDisplay()}
              </Typography>
            </Box>
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
            {evalSliderRange.min}
          </Typography>
          <Slider
            value={guesses.overallEval}
            onChange={handleSliderChange('overallEval')}
            min={evalSliderRange.min}
            max={evalSliderRange.max}
            step={0.1}
            marks={stockfishEval.type === 'cp' ? [{ value: 0, label: '0' }] : undefined}
            valueLabelDisplay="on"
            disabled={submitted}
            sx={{
              '& .MuiSlider-valueLabel': {
                backgroundColor: submitted
                  ? correctGuesses.has('overallEval')
                    ? 'success.main'
                    : 'error.main'
                  : 'primary.main',
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
            {evalSliderRange.max}
          </Typography>
        </Box>
        
        {stockfishEval.type === 'mate' && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Guess the number of moves to mate (e.g., for M3, guess 3)
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight="bold" mb={2}>
        Theme Scores
      </Typography>

      <Stack spacing={3}>
        {(Object.keys(scores) as Array<keyof ThemeScore>).map((theme) => {
          const isCorrect = correctGuesses.has(theme);
          const actualScore = scores[theme];

          return (
            <Box key={theme}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {themeLabels[theme]}
                </Typography>
                {submitted && (
                  <Box display="flex" alignItems="center" gap={1}>
                    {isCorrect ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <CancelIcon color="error" />
                    )}
                    <Typography
                      variant="body2"
                      color={isCorrect ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      Actual: {actualScore.toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                  {sliderRange.min}
                </Typography>
                <Slider
                  value={guesses[theme]}
                  onChange={handleSliderChange(theme)}
                  min={sliderRange.min}
                  max={sliderRange.max}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0' },
                  ]}
                  valueLabelDisplay="on"
                  disabled={submitted}
                  sx={{
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: submitted
                        ? isCorrect
                          ? 'success.main'
                          : 'error.main'
                        : 'primary.main',
                    },
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                  {sliderRange.max}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Box mt={4} display="flex" gap={2}>
        {!submitted ? (
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            startIcon={<TrophyIcon />}
          >
            Submit Guesses
          </Button>
        ) : (
          <Button variant="outlined" fullWidth size="large" onClick={handleReset}>
            Try Again
          </Button>
        )}
      </Box>

      {submitted && (
        <Alert
          severity={correctCount === totalThemes ? 'success' : correctCount >= totalThemes / 2 ? 'info' : 'warning'}
          sx={{ mt: 3 }}
        >
          {correctCount === totalThemes
            ? '🎉 Perfect score! You guessed all themes correctly!'
            : correctCount >= totalThemes / 2
            ? `Good job! You got ${correctCount} out of ${totalThemes} correct.`
            : `Keep practicing! You got ${correctCount} out of ${totalThemes} correct.`}
        </Alert>
      )}
    </Paper>
  );
};

export default GuessTheme;