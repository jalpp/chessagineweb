import { MasterGames } from "./helper";
import { LichessData } from "./lichessRatingOpening";

const MAX_ENTRIES = 2000;


function makeMemCache<V>() {
  const map = new Map<string, V>();

  return {
    get(key: string): V | undefined {
      return map.get(key);
    },

    set(key: string, value: V): void {
      if (map.size >= MAX_ENTRIES) {
        // Evict the oldest entry (Maps preserve insertion order)
        map.delete(map.keys().next().value!);
      }
      map.set(key, value);
    },

    has(key: string): boolean {
      return map.has(key);
    },

    size(): number {
      return map.size;
    },

    clear(): void {
      map.clear();
    },
  };
}


export const explorerCache = makeMemCache<Promise<unknown>>();


export const lichessRatingCache = makeMemCache<Promise<unknown>>();