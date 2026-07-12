import type { MasterGames } from "@/libs/openingdatabase/helper";
import type { LichessData } from "@/libs/openingdatabase/lichessRatingOpening";

const MAX_ENTRIES = 2000;

function makeMemCache<V>() {
  const map = new Map<string, V>();

  return {
    get(key: string): V | undefined {
      return map.get(key);
    },

    set(key: string, value: V): void {
      if (map.size >= MAX_ENTRIES) {
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

export const explorerCache = makeMemCache<Promise<MasterGames | null>>();
export const lichessRatingCache = makeMemCache<Promise<LichessData | null>>();
