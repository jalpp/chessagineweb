
const DB_NAME = "chess-agine-knowledge";
const DB_VERSION = 1;
const STORE_NAME = "knowledge-cards";

export interface KnowledgeCard {
  id: string;
  title: string;
  description: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  /** byte length of content — enforced at creation time */
  contentSize: number;
}

/** Max content size per card: 8 KB */
export const MAX_CONTENT_BYTES = 8 * 1024;
/** Max number of cards */
export const MAX_CARDS = 20;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCards(): Promise<KnowledgeCard[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result as KnowledgeCard[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCard(card: KnowledgeCard): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(card);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCard(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function byteLengthOf(str: string): number {
  return new TextEncoder().encode(str).length;
}