import { NextApiRequest, NextApiResponse } from 'next';
import { Color } from 'chess.js';
import { getThemeScores } from '@/server/mastra/tools/protocol/ovp';

interface ThemeScoreRequest {
    fen: string;
    color: Color;
}

interface ThemeScoreResponse {
    material: number;
    mobility: number;
    space: number;
    positional: number;
    kingSafety: number;
    tactical: number;
}

interface ErrorResponse {
    error: string;
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<ThemeScoreResponse | ErrorResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fen, color } = req.body as ThemeScoreRequest;

        // Validation
        if (!fen || typeof fen !== 'string') {
            return res.status(400).json({ error: 'Invalid or missing FEN string' });
        }

        if (!color || (color !== 'w' && color !== 'b')) {
            return res.status(400).json({ error: 'Invalid or missing color (must be "w" or "b")' });
        }

        // Get theme scores
        const scores = getThemeScores(fen, color);

        return res.status(200).json(scores);
    } catch (error) {
        console.error('Error calculating theme scores:', error);
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Internal server error' 
        });
    }
}