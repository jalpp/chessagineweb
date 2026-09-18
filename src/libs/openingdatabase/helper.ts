import { explorerCache } from "@/libs/cache/explorerMemCache";
import { buildExplorerParams, ExplorerOptions, ExplorerSource } from "./lichessExplorer";

interface Opening {
  eco: string;
  name: string;
}

interface Side {
  name: string;
  rating: number;
}

interface Game {
  uci: string;
  id: string;
  black: Side;
  white: Side;
  year: number;
  month: string;
}

export interface Moves {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game: Game;
  opening: Opening;
}

export interface MasterGames {
  opening: Opening;
  white: number;
  draws: number;
  black: number;
  moves: Moves[];
  topGames: Game[];
}

type ExplorerActionType = "unsupported" | "game" | "position" | "puzzle";

export const fetchExplorerData = (
  fen: string,
  actionType: ExplorerActionType,
  token: string,
  source: ExplorerSource = "masters",
  options: ExplorerOptions = {},
): Promise<MasterGames | null> => {
  if (actionType === "unsupported" || !token) return Promise.resolve(null);

  const params = buildExplorerParams(source, fen, options);
  params.set("source", source);
  const cacheKey = params.toString();

  const cached = explorerCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async (): Promise<MasterGames | null> => {
    try {
      const response = await fetch(`/api/explorer?${cacheKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = response.ok ? await response.json() : null;
      if (!result?.success) {
        explorerCache.delete(cacheKey);
        return null;
      }
      return result.data as MasterGames;
    } catch {
      explorerCache.delete(cacheKey);
      return null;
    }
  })();

  explorerCache.set(cacheKey, promise);
  return promise;
};

export const getOpeningStats = (
  fen: string,
  actionType: ExplorerActionType,
  token: string,
): Promise<MasterGames | null> =>
  fetchExplorerData(fen, actionType, token, "masters", { moves: 12, topGames: 15 });

export const getLichessOpeningStats = (
  fen: string,
  actionType: ExplorerActionType,
  token: string,
): Promise<MasterGames | null> =>
  fetchExplorerData(fen, actionType, token, "lichess", {
    moves: 12,
    topGames: 4,
    recentGames: 0,
    speeds: "rapid,classical",
  });
