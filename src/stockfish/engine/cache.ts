import { PositionEval } from "./engine";

const STOCKFISH_CACHE_PREFIX = "stockfish:";

export function getStockfishCacheKey(
  fen: string,
  depth: number,
  lines: number
) {
  return `${STOCKFISH_CACHE_PREFIX}${fen}|d=${depth}|pv=${lines}`;
}

export function getReverseStockfishCacheKey(fen: string, depth: number, lines: number){
  return `reverse-${getStockfishCacheKey(fen, depth, lines)}`;
}

export function readStockfishCache(key: string): PositionEval | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed.result ?? null;
  } catch {
    return null;
  }
}

export function writeStockfishCache(key: string, result: PositionEval) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        result,
        timestamp: Date.now(), // optional, useful for debugging
      })
    );
  } catch {
    // storage full / disabled → ignore
  }
}
