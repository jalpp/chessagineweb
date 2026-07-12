import type { PositionEval } from "@jalpp/stockfishts";

interface CachedEntry {
  fen: string;
  data: PositionEval;
  timestamp: number;
}

export class EaseMetricVariationCache {
  private dbName = "easeMetricCache";
  private storeName = "variationEvals";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "fen" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async get(fen: string): Promise<PositionEval | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fen);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedEntry | undefined;
        if (result) {
          console.log(`EaseMetricVariation Cache HIT for FEN: ${fen}`);
          resolve(result.data);
        } else {
          console.log(`EaseMetricVariation Cache MISS for FEN: ${fen}`);
          resolve(null);
        }
      };
    });
  }

  async set(fen: string, data: PositionEval): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const entry: CachedEntry = {
        fen,
        data,
        timestamp: Date.now(),
      };
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`Cached EaseMetricVariation for FEN: ${fen}`);
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log("EaseMetricVariation cache cleared");
        resolve();
      };
    });
  }

  async deleteOldEntries(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) return;

    const cutoffTime = Date.now() - maxAgeMs;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("timestamp");
      const request = index.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          console.log(`Deleted EaseMetricVariation entries older than ${maxAgeMs}ms`);
          resolve();
        }
      };
    });
  }

  async delete(fen: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(fen);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`Deleted EaseMetricVariation cache entry for FEN: ${fen}`);
        resolve();
      };
    });
  }
}

export const easeMetricVariationCache = new EaseMetricVariationCache();
