#!/usr/bin/env node
// Headless UCI smoke test for the real lc0 engine bundle
// (public/static/engine/lc0/lc0-bridge.worker.mjs), driven directly in
// Node by shimming the Worker-global surface it expects (postMessage /
// addEventListener / fetch). This exercises the actual lc0.wasm + real
// MCTS search + onnxruntime-web NN backend against real net files --
// not a mock -- so a PASS here means the net genuinely loads and the
// engine genuinely returns a bestmove with it.
//
// Each net is tested in its own subprocess (see _lc0-net-smoke-worker.mjs):
// onnxruntime-web registers process-global backend state on import, which
// isn't safe to reuse across multiple nets in one process.
//
// Usage:
//   node scripts/lc0-net-smoke-test.mjs <net-file-or-dir> [--nodes=N]
//
// Examples:
//   node scripts/lc0-net-smoke-test.mjs public/static/engine/lc0/net/personalities
//   node scripts/lc0-net-smoke-test.mjs public/static/engine/lc0/net/personalities/maia-1500.pb.gz --nodes=200

import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_SCRIPT = join(__dirname, "_lc0-net-smoke-worker.mjs");

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const nodesArg = process.argv.find(a => a.startsWith("--nodes="));
const NODES = nodesArg ? nodesArg.split("=")[1] : "50";
const target = args[0];

if (!target) {
  console.error("Usage: node scripts/lc0-net-smoke-test.mjs <net-file-or-dir> [--nodes=N]");
  process.exit(1);
}

function collectNets(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    return readdirSync(p)
      .filter(f => f.endsWith(".pb.gz") || f.endsWith(".pb"))
      .sort()
      .map(f => join(p, f));
  }
  return [p];
}

function testOneNet(netPath) {
  return new Promise((resolve) => {
    const child = fork(WORKER_SCRIPT, [netPath, NODES], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ ok: false, reason: "timeout" });
    }, 60000);

    child.on("message", (msg) => {
      if (settled) return;
      if (msg && (msg.ok !== undefined)) {
        settled = true;
        clearTimeout(timeout);
        resolve(msg);
        child.kill();
      }
    });
    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: false, reason: `exited with code ${code} before reporting a result` });
    });
  });
}

const nets = collectNets(target);
if (nets.length === 0) {
  console.error(`No .pb/.pb.gz files found at ${target}`);
  process.exit(1);
}

console.log(`Testing ${nets.length} net(s) against the real lc0 engine...\n`);

let passed = 0, failed = 0;
for (const netPath of nets) {
  const label = netPath.split("/").pop();
  process.stdout.write(`  ${label} ... `);
  const result = await testOneNet(netPath);
  if (result.ok) {
    passed++;
    console.log(`PASS (bestmove=${result.bestmove})`);
  } else {
    failed++;
    console.log(`FAIL (${result.reason})`);
  }
}

console.log(`\n${passed}/${nets.length} nets passed the UCI smoke test.`);
process.exit(failed > 0 ? 1 : 0);
