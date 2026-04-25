import { MaiaEngineAnalysis } from "@/hooks/useNets";
import { openDB } from "idb";

export const DB_NAME = "chess-analysis-db";
export const DB_VERSION = 1;

export const STORES = {
  MAIA: "maia-evals",
};

export async function getAnalysisDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.MAIA)) {
        db.createObjectStore(STORES.MAIA);
      }
    },
  });
}

export interface MaiaCacheEntry {
  evaluations: MaiaEngineAnalysis;
  sanEvaluations: any;
  lichessData: any;
  isInBook: boolean;
  timestamp: number;
}

export const getMaiaCacheKey = ({
  fen,
  models,
  useLichessBook,
  bookThreshold,
}: {
  fen: string;
  models: string[];
  useLichessBook: boolean;
  bookThreshold: number;
}) =>
  [
    fen,
    `models=${models.sort().join(",")}`,
    `book=${useLichessBook}`,
    `th=${bookThreshold}`,
  ].join("|");

// ── Tier 1: In-memory cache ────────────────────────────────────────────────

const MAX_MEM_ENTRIES = 1000;

// Stores resolved MaiaCacheEntry values (not Promises — entries are only
// added after a successful inference so we never cache failed attempts)
const memCache = new Map<string, MaiaCacheEntry>();

export function readMemCache(key: string): MaiaCacheEntry | undefined {
  return memCache.get(key);
}

export function writeMemCache(key: string, value: MaiaCacheEntry): void {
  if (memCache.size >= MAX_MEM_ENTRIES) {
    // Evict oldest (Map preserves insertion order)
    memCache.delete(memCache.keys().next().value!);
  }
  memCache.set(key, value);
}

export function clearMemCache(): void {
  memCache.clear();
}

// ── Tier 2: IndexedDB cache ────────────────────────────────────────────────

export async function readMaiaCache(key: string): Promise<MaiaCacheEntry | undefined> {
  // Check memory first — avoids IndexedDB round-trip entirely
  const mem = readMemCache(key);
  if (mem) return mem;

  try {
    const db = await getAnalysisDb();
    const entry = await db.get(STORES.MAIA, key);
    if (entry) {
      // Warm the memory cache so future reads are synchronous
      writeMemCache(key, entry);
    }
    return entry;
  } catch {
    return undefined;
  }
}

export async function writeMaiaCache(key: string, value: MaiaCacheEntry): Promise<void> {
  // Always write memory first (synchronous, never fails)
  writeMemCache(key, value);
  // Then persist to IndexedDB in the background
  try {
    const db = await getAnalysisDb();
    await db.put(STORES.MAIA, value, key);
  } catch (err) {
    // IndexedDB write failure is non-fatal — memory cache still works
    console.warn("IndexedDB write failed (non-fatal):", err);
  }
}