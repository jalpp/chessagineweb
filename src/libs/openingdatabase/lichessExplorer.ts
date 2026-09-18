import type { MasterGames } from "./helper";

export const LICHESS_EXPLORER_HOST = "https://explorer.lichess.org";

export type ExplorerSource = "masters" | "lichess";

export interface ExplorerOptions {
  moves?: number;
  topGames?: number;
  recentGames?: number;
  speeds?: string;
  ratings?: string;
}

const MAX_TOP_GAMES: Record<ExplorerSource, number> = { masters: 15, lichess: 4 };

export function parseExplorerSource(value: string | null): ExplorerSource | null {
  if (value === null || value === "masters") return "masters";
  if (value === "lichess") return "lichess";
  return null;
}

export function buildExplorerParams(
  source: ExplorerSource,
  fen: string,
  options: ExplorerOptions = {},
): URLSearchParams {
  const params = new URLSearchParams({ fen });
  if (options.moves !== undefined) params.set("moves", String(options.moves));
  if (options.topGames !== undefined) {
    params.set("topGames", String(Math.min(options.topGames, MAX_TOP_GAMES[source])));
  }
  if (source === "lichess") {
    params.set("variant", "standard");
    if (options.recentGames !== undefined) params.set("recentGames", String(options.recentGames));
    if (options.speeds) params.set("speeds", options.speeds);
    if (options.ratings) params.set("ratings", options.ratings);
  }
  return params;
}

export function buildExplorerUrl(
  source: ExplorerSource,
  fen: string,
  options: ExplorerOptions = {},
): string {
  return `${LICHESS_EXPLORER_HOST}/${source}?${buildExplorerParams(source, fen, options)}`;
}

export function getBearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

export function normalizeExplorerResponse(data: Partial<MasterGames> | null | undefined): MasterGames {
  const opening = data?.opening ?? { eco: "", name: "Unknown" };
  return {
    opening,
    white: data?.white ?? 0,
    draws: data?.draws ?? 0,
    black: data?.black ?? 0,
    moves: (data?.moves ?? []).map((m) => ({ ...m, opening: m.opening ?? opening })),
    topGames: data?.topGames ?? [],
  };
}
