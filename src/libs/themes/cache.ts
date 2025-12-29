import { openDB } from 'idb';

const DB_NAME = 'themeScoreDB';
const STORE_NAME = 'themeScores';
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

export async function getThemeScoreCache(key: string) {
  const db = await getDb();
  return db.get(STORE_NAME, key);
}

export async function setThemeScoreCache(key: string, value: any) {
  const db = await getDb();
  return db.put(STORE_NAME, value, key);
}
