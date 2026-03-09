import type { NextApiRequest, NextApiResponse } from 'next';
import type { MasterGames } from '@/libs/openingdatabase/helper';

interface ExplorerResponse {
  success: boolean;
  data?: MasterGames;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExplorerResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { fen, source = 'masters', moves = '12', topGames = '15' } = req.query;

  if (!fen || typeof fen !== 'string') {
    return res.status(400).json({ success: false, error: 'FEN is required' });
  }

  const token = process.env.LICHESS_API_TOKEN;
  if (!token) {
    return res.status(500).json({ success: false, error: 'Lichess API token not configured' });
  }

  try {
    const endpoint = source === 'lichess' ? 'lichess' : 'masters';
    const params = new URLSearchParams({
      fen,
      moves: typeof moves === 'string' ? moves : '12',
      topGames: typeof topGames === 'string' ? topGames : '15',
    });

    const response = await fetch(
      `https://explorer.lichess.ovh/${endpoint}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'chessagine-web',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Lichess explorer error: ${response.status}`);
    }

    const data = (await response.json()) as MasterGames;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching opening explorer data:', error);
    return res.status(500).json({ success: false, error: 'Failed to load opening data.' });
  }
}