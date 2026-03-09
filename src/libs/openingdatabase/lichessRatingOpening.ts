import { SanMaiaEvaluation } from "../nets/types";

export interface LichessMove {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
}

export interface LichessData {
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
  opening?: { eco: string; name: string };
}

export const getRatingGroups = (maiaRating: number): number[] => {
  if (maiaRating <= 1100) return [1000, 1200];
  if (maiaRating <= 1200) return [1000, 1200];
  if (maiaRating <= 1300) return [1200, 1400];
  if (maiaRating <= 1400) return [1200, 1400];
  if (maiaRating <= 1500) return [1400, 1600];
  if (maiaRating <= 1600) return [1400, 1600, 1800];
  if (maiaRating <= 1700) return [1600, 1800];
  if (maiaRating <= 1800) return [1600, 1800, 2000];
  if (maiaRating <= 1900) return [1800, 2000];
  if (maiaRating <= 2200) return [2000, 2200];
  return [2200, 2500];
};


export const fetchLichessData = async (
  fen: string,
  rating: number,
  signal?: AbortSignal,
  retryCount = 0,
  maxRetries = 3
): Promise<LichessData | null> => {
  const ratings = getRatingGroups(rating);
  const params = new URLSearchParams({
    source: 'lichess',
    variant: 'standard',
    fen,
    speeds: 'rapid,classical',
    ratings: ratings.join(','),
    moves: '12',
  });

  try {
    const response = await fetch(`/api/explorer?${params.toString()}`, { signal });

    if (response.status === 429) {
      if (retryCount >= maxRetries) {
        console.warn(`Lichess rate limit reached after ${maxRetries} retries, falling back to neural network`);
        return null;
      }

      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Lichess rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchLichessData(fen, rating, signal, retryCount + 1, maxRetries);
    }

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error');
    }

    return result.data as LichessData;
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error('Lichess fetch error:', err);
    return null;
  }
};

export const lichessToSanEvaluation = (data: LichessData): SanMaiaEvaluation => {
  const totalGames = data.white + data.draws + data.black;
  const winRate =
    totalGames > 0 ? (data.white + data.draws * 0.5) / totalGames : 0.5;

  const policy: { [key: string]: number } = {};
  const totalMoveGames = data.moves.reduce(
    (sum, move) => sum + move.white + move.draws + move.black,
    0
  );

  data.moves.forEach((move) => {
    const moveGames = move.white + move.draws + move.black;
    policy[move.san] = totalMoveGames > 0 ? moveGames / totalMoveGames : 0;
  });

  const value = (winRate - 0.5) * 2;

  return { value, policy };
};

export const lichessToEvaluation = (data: LichessData): SanMaiaEvaluation => {
  const totalGames = data.white + data.draws + data.black;
  const winRate =
    totalGames > 0 ? (data.white + data.draws * 0.5) / totalGames : 0.5;

  const policy: { [key: string]: number } = {};
  const totalMoveGames = data.moves.reduce(
    (sum, move) => sum + move.white + move.draws + move.black,
    0
  );

  data.moves.forEach((move) => {
    const moveGames = move.white + move.draws + move.black;
    policy[move.uci] = totalMoveGames > 0 ? moveGames / totalMoveGames : 0;
  });

  const value = (winRate - 0.5) * 2;

  return { value, policy };
};
