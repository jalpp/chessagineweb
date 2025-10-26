import { useState, useCallback } from 'react';
import { GameReviewTheme } from '@/libs/themes/helper';

interface UseGameThemeReturn {
  gameReviewTheme: GameReviewTheme | null;
  isLoading: boolean;
  error: string | null;
  analyzeGameTheme: (pgn: string, criticalMomentThreshold?: number) => Promise<void>;
  reset: () => void;
}

export function useGameTheme(): UseGameThemeReturn {
  const [gameReviewTheme, setGameReviewTheme] = useState<GameReviewTheme | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeGameTheme = useCallback(async (
    pgn: string, 
  ) => {
    // Reset previous state
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gametheme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pgn: pgn
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to analyze game');
      }

      const data: GameReviewTheme = await response.json();
      setGameReviewTheme(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setGameReviewTheme(null);
      console.error('Error analyzing game:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGameReviewTheme(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    gameReviewTheme,
    isLoading,
    error,
    analyzeGameTheme,
    reset,
  };
}
