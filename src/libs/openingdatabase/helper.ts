import { explorerCache } from "./posiraMemCache";

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

interface PosiraMove {
  san: string;
  uci: string;
  games: number;
  white_wins: number;
  draws: number;
  black_wins: number;
  white_pct: number;
  draw_pct: number;
  black_pct: number;
  score: number;
  play_rate: number;
}

interface PosiraExplorerResponse {
  fen: string;
  total_games: number;
  opening?: { eco: string; name: string };
  moves: PosiraMove[];
}

function posiraToMasterGames(data: PosiraExplorerResponse): MasterGames {
  return {
    opening: data.opening ?? { eco: "", name: "Unknown" },
    white: data.moves.reduce((s, m) => s + m.white_wins, 0),
    draws: data.moves.reduce((s, m) => s + m.draws, 0),
    black: data.moves.reduce((s, m) => s + m.black_wins, 0),
    moves: data.moves.map((m) => ({
      uci: m.uci,
      san: m.san,
      averageRating: 0,
      white: m.white_wins,
      draws: m.draws,
      black: m.black_wins,
      game: {} as Game,
      opening: data.opening ?? { eco: "", name: "Unknown" },
    })),
    topGames: [],
  };
}

// ── Core fetch with in-memory cache ──────────────────────────────────────────
//
// The cache stores the Promise itself (not the resolved value).
// This means concurrent callers that race on the same key share
// a single in-flight request — no duplicate network calls even
// if two components mount at the same time on the same FEN.
//
// Cache key encodes every parameter that affects the response so
// different call sites (master vs lichess, different options) never
// collide with each other.

export const fetchExplorerData = (
  fen: string,
  actionType: "unsupported" | "game" | "position" | "puzzle",
  _source: "masters" | "lichess" = "masters",
  _topGames = 15,
  options?: { speeds?: string; ratings?: string; top_n?: number },
): Promise<MasterGames | null> => {
  if (actionType === "unsupported") return Promise.resolve(null);

  // Build the URLSearchParams first so the cache key exactly matches
  // what gets sent to the API — no hidden variation possible.
  const params = new URLSearchParams({ endpoint: "explorer", fen });
  if (options?.speeds)  params.set("speeds",  options.speeds);
  if (options?.ratings) params.set("ratings", options.ratings);
  if (options?.top_n)   params.set("top_n",   String(options.top_n));

  const cacheKey = params.toString();

  const cached = explorerCache.get(cacheKey);
  if (cached) return cached as Promise<MasterGames | null>;

  // Create and store the promise BEFORE awaiting so concurrent callers
  // see it immediately and don't fire their own requests.
  const promise = (async (): Promise<MasterGames | null> => {
    try {
      const response = await fetch(`/api/posira?${cacheKey}`);
      if (!response.ok) throw new Error(`Posira API error: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error ?? "Unknown error");
      return posiraToMasterGames(result.data as PosiraExplorerResponse);
    } catch (error) {
      console.error("Error fetching opening stats:", error);
      // On error, evict the cache entry so the next call retries
      explorerCache.set(cacheKey, Promise.resolve(null));
      return null;
    }
  })();

  explorerCache.set(cacheKey, promise);
  return promise;
};

export const getOpeningStats = (
  fen: string,
  actionType: "unsupported" | "game" | "position" | "puzzle"
): Promise<MasterGames | null> =>
  fetchExplorerData(fen, actionType, "masters", 15, { top_n: 12 });

export const getLichessOpeningStats = (
  fen: string,
  actionType: "unsupported" | "game" | "position" | "puzzle"
): Promise<MasterGames | null> =>
  fetchExplorerData(fen, actionType, "lichess", 4, {
    speeds: "rapid,classical",
    top_n: 12,
  });