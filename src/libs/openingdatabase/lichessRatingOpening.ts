import { SanMaiaEvaluation } from "../nets/types";
import { fetchExplorerData } from "./helper";

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

// Lichess explorer rating buckets closest to a Maia model rating

export const getRatingGroups = (maiaRating: number): number[] => {
  if (maiaRating <= 900)  return [0, 1000];
  if (maiaRating <= 1100) return [1000, 1200];
  if (maiaRating <= 1300) return [1200, 1400];
  if (maiaRating <= 1500) return [1400, 1600];
  if (maiaRating <= 1700) return [1600, 1800];
  if (maiaRating <= 1900) return [1800, 2000];
  if (maiaRating <= 2100) return [2000, 2200];
  if (maiaRating <= 2300) return [2200, 2500];
  return [2500];
};

export const fetchLichessData = async (
  fen: string,
  rating: number,
  token: string,
): Promise<LichessData | null> => {
  const data = await fetchExplorerData(fen, "position", token, "lichess", {
    moves: 12,
    topGames: 0,
    recentGames: 0,
    speeds: "rapid,classical",
    ratings: getRatingGroups(rating).join(","),
  });
  if (!data) return null;
  return {
    white: data.white,
    draws: data.draws,
    black: data.black,
    opening: data.opening,
    moves: data.moves.map(({ uci, san, averageRating, white, draws, black }) => ({
      uci, san, averageRating, white, draws, black,
    })),
  };
};

export const lichessToSanEvaluation = (data: LichessData): SanMaiaEvaluation => {
  const totalGames = data.white + data.draws + data.black;
  const winRate = totalGames > 0 ? (data.white + data.draws * 0.5) / totalGames : 0.5;

  const policy: { [key: string]: number } = {};
  const totalMoveGames = data.moves.reduce(
    (sum, move) => sum + move.white + move.draws + move.black,
    0,
  );
  data.moves.forEach(move => {
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
  data.moves.forEach(move => {
    const moveGames = move.white + move.draws + move.black;
    policy[move.uci] = totalMoveGames > 0 ? moveGames / totalMoveGames : 0;
  });

  return { value: (winRate - 0.5) * 2, policy };
};