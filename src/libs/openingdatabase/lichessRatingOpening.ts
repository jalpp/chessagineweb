import { SanMaiaEvaluation } from "../nets/types";

// Posira rating brackets that map from Maia model ratings
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

// ── Map Maia rating → nearest Posira rating bracket ───────────────────────

const POSIRA_RATING_BRACKETS = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

export const getRatingGroups = (maiaRating: number): number[] => {
  if (maiaRating <= 900) return [800, 1000];
  if (maiaRating <= 1100) return [1000, 1200];
  if (maiaRating <= 1300) return [1200, 1400];
  if (maiaRating <= 1500) return [1400, 1600];
  if (maiaRating <= 1700) return [1600, 1800];
  if (maiaRating <= 1900) return [1800, 2000];
  if (maiaRating <= 2100) return [2000, 2200];
  if (maiaRating <= 2300) return [2200, 2500];
  return [2500];
};

// ── Posira explorer response types ────────────────────────────────────────

interface PosiraMove {
  san: string;
  uci: string;
  games: number;
  white_wins: number;
  draws: number;
  black_wins: number;
}

interface PosiraExplorerResponse {
  fen: string;
  total_games: number;
  opening?: { eco: string; name: string };
  moves: PosiraMove[];
}

// ── Fetcher ───────────────────────────────────────────────────────────────

export const fetchLichessData = async (
  fen: string,
  rating: number,
  signal?: AbortSignal,
  retryCount = 0,
  maxRetries = 3,
): Promise<LichessData | null> => {
  const ratings = getRatingGroups(rating);

  const params = new URLSearchParams({
    endpoint: "explorer",
    fen,
    ratings: ratings.join(","),
    speeds: "rapid,classical",
    top_n: "12",
  });

  try {
    const response = await fetch(`/api/posira?${params.toString()}`, { signal });

    if (response.status === 429) {
      if (retryCount >= maxRetries) {
        console.warn(`Posira rate limit reached after ${maxRetries} retries, falling back to neural network`);
        return null;
      }
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchLichessData(fen, rating, signal, retryCount + 1, maxRetries);
    }

    if (!response.ok) throw new Error(`Posira API error: ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error ?? "Unknown error");

    const data = result.data as PosiraExplorerResponse;

    // Map Posira format → LichessData format (shared shape used by useNets)
    return {
      white: data.moves.reduce((s, m) => s + m.white_wins, 0),
      draws: data.moves.reduce((s, m) => s + m.draws, 0),
      black: data.moves.reduce((s, m) => s + m.black_wins, 0),
      opening: data.opening,
      moves: data.moves.map((m) => ({
        uci: m.uci,
        san: m.san,
        averageRating: 0,
        white: m.white_wins,
        draws: m.draws,
        black: m.black_wins,
      })),
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error("Posira fetch error:", err);
    return null;
  }
};

// ── Converters (unchanged — keep same shape for useNets compatibility) ─────

export const lichessToSanEvaluation = (data: LichessData): SanMaiaEvaluation => {
  const totalGames = data.white + data.draws + data.black;
  const winRate = totalGames > 0 ? (data.white + data.draws * 0.5) / totalGames : 0.5;

  const policy: { [key: string]: number } = {};
  const totalMoveGames = data.moves.reduce(
    (sum, move) => sum + move.white + move.draws + move.black,
    0,
  );
  data.moves.forEach((move) => {
    const moveGames = move.white + move.draws + move.black;
    policy[move.san] = totalMoveGames > 0 ? moveGames / totalMoveGames : 0;
  });

  return { value: (winRate - 0.5) * 2, policy };
};

export const lichessToEvaluation = (data: LichessData): SanMaiaEvaluation => {
  const totalGames = data.white + data.draws + data.black;
  const winRate = totalGames > 0 ? (data.white + data.draws * 0.5) / totalGames : 0.5;

  const policy: { [key: string]: number } = {};
  const totalMoveGames = data.moves.reduce(
    (sum, move) => sum + move.white + move.draws + move.black,
    0,
  );
  data.moves.forEach((move) => {
    const moveGames = move.white + move.draws + move.black;
    policy[move.uci] = totalMoveGames > 0 ? moveGames / totalMoveGames : 0;
  });

  return { value: (winRate - 0.5) * 2, policy };
};