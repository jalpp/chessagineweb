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

// ── Posira response types ──────────────────────────────────────────────────

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

// ── Map Posira response → MasterGames (shared format used across the app) ──

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

// ── Fetcher ────────────────────────────────────────────────────────────────

export const fetchExplorerData = async (
  fen: string,
  _source: "masters" | "lichess" = "masters",
  _topGames = 15,
  options?: { speeds?: string; ratings?: string; top_n?: number },
): Promise<MasterGames | null> => {
  try {
    const params = new URLSearchParams({ endpoint: "explorer", fen });
    if (options?.speeds) params.set("speeds", options.speeds);
    if (options?.ratings) params.set("ratings", options.ratings);
    if (options?.top_n) params.set("top_n", String(options.top_n));

    const response = await fetch(`/api/posira?${params.toString()}`);

    if (!response.ok) throw new Error(`Posira API error: ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error ?? "Unknown error");

    return posiraToMasterGames(result.data as PosiraExplorerResponse);
  } catch (error) {
    console.error("Error fetching opening stats:", error);
    return null;
  }
};

export const getOpeningStats = (fen: string): Promise<MasterGames | null> =>
  fetchExplorerData(fen, "masters", 15, { top_n: 12 });

// Kept for backward compat — now also hits Posira, filtered to rapid/classical speeds
export const getLichessOpeningStats = (fen: string): Promise<MasterGames | null> =>
  fetchExplorerData(fen, "lichess", 4, { speeds: "rapid,classical", top_n: 12 });

