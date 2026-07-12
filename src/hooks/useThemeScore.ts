import { useState, useEffect, useCallback } from 'react';
import { Color } from 'chess.js';
import { ThemeScore, normalizeThemeScores } from '@/libs/themes/helper';
import { getThemeScoreCache, setThemeScoreCache } from '@/libs/cache/themeCache';

interface UseThemeScoreResult {
    scores: ThemeScore | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useThemeScore(fen: string | null, color: Color): UseThemeScoreResult {
    const [scores, setScores] = useState<ThemeScore | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const cacheKey = fen && color ? `${fen}|${color}` : null;

    const fetchThemeScore = useCallback(async () => {
        if (!fen) {
            setScores(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (cacheKey) {
                const cached = await getThemeScoreCache(cacheKey);
                const normalizedCached = normalizeThemeScores(cached);
                if (normalizedCached) {
                    setScores(normalizedCached);
                    setLoading(false);
                    return;
                }
            }

            const response = await fetch('/api/themescore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen, color }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch theme scores');
            }

            const rawData = await response.json();
            const data = normalizeThemeScores(rawData);
            if (!data) {
                throw new Error('Invalid theme score payload');
            }
            setScores(data);

            if (cacheKey) {
                await setThemeScoreCache(cacheKey, data);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setScores(null);
        } finally {
            setLoading(false);
        }
    }, [fen, color, cacheKey]);

    useEffect(() => {
        fetchThemeScore();
    }, [fetchThemeScore]);

    return {
        scores,
        loading,
        error,
        refetch: fetchThemeScore,
    };
}
