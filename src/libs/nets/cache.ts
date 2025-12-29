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

export async function readMaiaCache(key: string) {
  const db = await getAnalysisDb();
  return db.get(STORES.MAIA, key);
}

export async function writeMaiaCache(key: string, value: MaiaCacheEntry) {
  const db = await getAnalysisDb();
  await db.put(STORES.MAIA, value, key);
}

