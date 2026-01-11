import { useState, useCallback } from 'react';
import { GameReviewTheme } from '@/libs/themes/helper';
import { useSessionStorage } from 'usehooks-ts';

interface UseGameThemeReturn {
  gameReviewTheme: GameReviewTheme | null;
  isLoading: boolean;
  error: string | null;
  analyzeGameTheme: (moveList: string[], customFen?: string, criticalMomentThreshold?: number) => Promise<void>;
  reset: () => void;
}

export function useGameTheme(): UseGameThemeReturn {
  const [gameReviewTheme, setGameReviewTheme] = useSessionStorage<GameReviewTheme | null>("agine_themes_game_review",null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeGameTheme = useCallback(async (
    moveList: string[],
    customFen?: string, 
  ) => {
  
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gametheme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moveList: moveList,
          customFen: customFen,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        reset();
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
