import { openDB } from "idb";

const DB_NAME = "chessDB";
const STORE_NAME = "positions";
const DB_VERSION = 1;

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function getChessDbCache(fen: string) {
  const db = await getDb();
  return db.get(STORE_NAME, fen);
}

export async function setChessDbCache(fen: string, data: any) {
  const db = await getDb();
  return db.put(STORE_NAME, data, fen);
}
