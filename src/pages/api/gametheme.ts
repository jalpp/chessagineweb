import type { NextApiRequest, NextApiResponse } from 'next';
import { generateGameReview } from '@/server/mastra/tools/protocol/review';

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'Only POST requests are accepted'
    } as ErrorResponse);
  }

  try {
    const { moveList, customFen} = req.body;

 
    // Validate optional threshold parameter
    const threshold = 0.5; // default value
    

    // Generate the game review
    const gameReview = generateGameReview(moveList, customFen, threshold);

    // Return successful response
    return res.status(200).json(gameReview);

  } catch (error) {
    console.error('Error generating game review:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to generate game review',
        details: error.message
      } as ErrorResponse);
    }

    // Generic error response
    return res.status(500).json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while processing the game'
    } as ErrorResponse);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};