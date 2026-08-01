// Child-process entry point used by lc0-net-smoke-test.mjs. Runs ONE net
// through the real lc0-bridge.worker.mjs bundle by shimming the
// Worker-global surface (postMessage/addEventListener/fetch) it expects,
// then reports {ok, bestmove} or {ok:false, reason} back to the parent via
// process.send. Kept in its own process because onnxruntime-web registers
// process-global backend state on import that isn't safe to reuse across
// more than one net.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker as NodeWorker } from "node:worker_threads";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_DIR = join(__dirname, "..", "public", "static", "engine", "lc0") + "/";

const [, , netPath, nodesArg] = process.argv;
const NODES = nodesArg || "50";

function report(result) {
  if (process.send) process.send(result);
  process.exit(result.ok ? 0 : 1);
}

if (!netPath) report({ ok: false, reason: "no net path given" });

// ---- shim the worker-global surface the bridge script expects ----
globalThis.Worker = NodeWorker;
const listeners = { message: [] };
globalThis.addEventListener = (type, fn) => { (listeners[type] ??= []).push(fn); };
globalThis.removeEventListener = (type, fn) => {
  listeners[type] = (listeners[type] || []).filter(f => f !== fn);
};

let readySeen = false;
let reported = false;
const safeReport = (result) => {
  if (reported) return;
  reported = true;
  report(result);
};

globalThis.postMessage = (msg) => {
  if (msg && msg.type === "ready" && !readySeen) {
    readySeen = true;
    queueMicrotask(() => {
      const netBytes = readFileSync(netPath);
      for (const fn of listeners.message.slice()) {
        fn({
          data: {
            network: netBytes,
            lc0WasmPath: join(ENGINE_DIR, "lc0.wasm"),
            ortWasmPaths: join(ENGINE_DIR, "ort/"),
            executionProviders: ["wasm"],
            ortNumThreads: 1,
          },
        });
      }
    });
    return;
  }
  if (msg && msg.type === "stdout") {
    const m = /^bestmove\s+(\S+)/.exec(msg.text);
    if (m) safeReport({ ok: true, bestmove: m[1] });
  } else if (msg && msg.type === "stderr") {
    if (/error/i.test(msg.text)) safeReport({ ok: false, reason: msg.text.slice(0, 300) });
  }
};

function sendUci(str) {
  for (const fn of listeners.message.slice()) fn({ data: str });
}

const realFetch = globalThis.fetch?.bind(globalThis);
globalThis.fetch = async (input) => {
  const url = typeof input === "string" ? input : input.url ?? String(input);
  let filePath = url;
  if (url.startsWith("/static/engine/lc0/")) {
    filePath = join(ENGINE_DIR, url.replace("/static/engine/lc0/", ""));
  } else if (url.startsWith("file://")) {
    filePath = fileURLToPath(url);
  }
  if (existsSync(filePath)) return new Response(readFileSync(filePath), { status: 200 });
  if (realFetch) return realFetch(input);
  throw new Error(`No local file for fetch(${url})`);
};

setTimeout(() => safeReport({ ok: false, reason: "timeout waiting for bestmove" }), 45000);

process.on("uncaughtException", (err) => {
  safeReport({ ok: false, reason: String(err?.message || err).slice(0, 300) });
});

try {
  await import(pathToFileURL(join(ENGINE_DIR, "lc0-bridge.worker.mjs")).href);
  setTimeout(() => {
    sendUci("uci");
    sendUci("isready");
    sendUci("position startpos");
    sendUci(`go nodes ${NODES}`);
  }, 500);
} catch (err) {
  safeReport({ ok: false, reason: String(err?.message || err).slice(0, 300) });
}
