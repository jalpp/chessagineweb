import { openDB, IDBPDatabase } from "idb";
import { PositionEval } from "@jalpp/stockfishts";

const MEM_MAX = 150;
const IDB_MAX = 1500;
const DB_NAME = "sf-cache-v1";
const STORE = "evals";

const mem = new Map<string, { value: unknown; ts: number }>();

function memGet(key: string): unknown | undefined {
  const e = mem.get(key);
  if (!e) return undefined;
  e.ts = Date.now();
  mem.delete(key);
  mem.set(key, e);
  return e.value;
}

function memSet(key: string, value: unknown): void {
  if (mem.has(key)) mem.delete(key);
  mem.set(key, { value, ts: Date.now() });
  if (mem.size > MEM_MAX) mem.delete(mem.keys().next().value!);
}

interface IDBEntry { key: string; value: unknown; ts: number }
let _db: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") return Promise.reject("SSR");
  if (!_db) _db = openDB(DB_NAME, 1, {
    upgrade(db) {
      const s = db.createObjectStore(STORE, { keyPath: "key" });
      s.createIndex("ts", "ts");
    },
  }).catch(e => { _db = null; throw e; });
  return _db;
}

async function idbGet(key: string): Promise<unknown | undefined> {
  try {
    const db = await getDB();
    const e: IDBEntry | undefined = await db.get(STORE, key);
    if (!e) return undefined;
    db.put(STORE, { ...e, ts: Date.now() }).catch(() => {});
    return e.value;
  } catch { return undefined; }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE, { key, value, ts: Date.now() } satisfies IDBEntry);
    const count = await db.count(STORE);
    if (count > IDB_MAX) {
      const tx = db.transaction(STORE, "readwrite");
      let cur = await tx.store.index("ts").openCursor();
      let n = 0;
      while (cur && n < count - IDB_MAX) { await cur.delete(); cur = await cur.continue(); n++; }
      await tx.done;
    }
  } catch { }
}

const pending = new Map<string, Promise<unknown>>();

export function getStockfishCacheKey(fen: string, depth: number, lines: number): string {
  return `sf:${fen}|d=${depth}|pv=${lines}`;
}

export async function cacheGet(key: string): Promise<unknown | undefined> {
  const m = memGet(key);
  if (m !== undefined) return m;
  const i = await idbGet(key);
  if (i !== undefined) { memSet(key, i); return i; }
  return undefined;
}

export function cachePut(key: string, value: unknown): void {
  memSet(key, value);
  idbSet(key, value);
}

export async function cachedStockfish(
  key: string,
  fetcher: () => Promise<PositionEval>
): Promise<PositionEval> {
  const hit = await cacheGet(key);
  if (hit !== undefined) return hit as PositionEval;
  const inf = pending.get(key);
  if (inf) return inf as Promise<PositionEval>;
  const p = fetcher()
    .then(r => { cachePut(key, r); pending.delete(key); return r; })
    .catch(e => { pending.delete(key); throw e; });
  pending.set(key, p);
  return p;
}
