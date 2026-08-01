import type { EngineWorker } from "@jalpp/stockfishts";
import { getLc0Net, LC0_DEFAULT_NET_ID } from "./lc0Nets";

const WORKER_PATH = "/static/engine/lc0/lc0-bridge.worker.mjs";
export const LC0_DEFAULT_NET = getLc0Net(LC0_DEFAULT_NET_ID).path;

// lc0's banner/log lines include ANSI color escape codes.
// eslint-disable-next-line no-control-regex
const stripAnsi = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, "");

export interface Lc0EngineWorkerOptions {
  /** Path to the network file (.pb or .pb.gz) to fetch and hand to the worker. */
  netPath?: string;
  lc0WasmPath?: string;
  ortWasmPaths?: string;
  executionProviders?: string[];
  ortNumThreads?: number;
}

/**
 * Adapts the lc0 wasm bridge worker (see public/static/engine/lc0/) to
 * stockfishts's {@link EngineWorker} contract, so lc0 can be driven through
 * the same {@link UciEngine} API (and UI) as the Stockfish engines -- via
 * `new CustomUciEngine(new Lc0EngineWorker(), "lc0")`.
 *
 * Unlike a plain Stockfish worker, lc0's worker needs a network file handed
 * to it before it can process UCI commands, so this class fetches the net
 * and performs that handshake internally, queuing any `uci()` calls made
 * before the handshake completes.
 */
export type Lc0Provider = "webgpu" | "wasm";

export class Lc0EngineWorker implements EngineWorker {
  private readonly worker: Worker;
  private readonly commandQueue: string[] = [];
  private ready = false;

  listen: (data: string) => void = () => {};
  onError: (err: unknown) => void = () => {};
  /** Called with the running node count parsed out of each "info ..." line. */
  onNodes: (nodes: number) => void = () => {};
  /**
   * Called once the engine has resolved which onnxruntime-web execution
   * provider it actually initialized with -- "webgpu" only if a GPU adapter
   * was detected AND session creation with it succeeded; "wasm" (CPU)
   * otherwise, including as an automatic fallback if WebGPU init failed for
   * a reason adapter detection alone couldn't catch.
   */
  onProvider: (provider: Lc0Provider, gpuAdapterAvailable: boolean) => void = () => {};

  constructor(options: Lc0EngineWorkerOptions = {}) {
    const netPath = options.netPath ?? LC0_DEFAULT_NET;
    this.worker = new Worker(WORKER_PATH, { type: "module" });

    this.worker.addEventListener("message", ({ data }) => {
      if (data?.type === "ready") {
        fetch(netPath)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch lc0 net ${netPath}: ${res.status}`);
            return res.arrayBuffer();
          })
          .then(network => {
            this.worker.postMessage({
              network,
              lc0WasmPath: options.lc0WasmPath,
              ortWasmPaths: options.ortWasmPaths,
              executionProviders: options.executionProviders,
              ortNumThreads: options.ortNumThreads,
            });
            this.ready = true;
            for (const command of this.commandQueue.splice(0)) {
              this.worker.postMessage(command);
            }
          })
          .catch(err => this.onError(err));
        return;
      }
      if (data?.type === "stdout") {
        const text = stripAnsi(data.text);
        const nodesMatch = /\bnodes (\d+)\b/.exec(text);
        if (nodesMatch) this.onNodes(Number(nodesMatch[1]));
        this.listen(text);
        return;
      }
      if (data?.type === "provider") {
        this.onProvider(data.provider, data.gpuAdapterAvailable);
        return;
      }
      if (data?.type === "stderr") {
        // lc0 writes non-fatal diagnostics/warnings to stderr too, not just
        // errors, so this is logged rather than routed through onError
        // (which stockfishts only expects for actual Worker exceptions).
        console.warn("[lc0]", stripAnsi(data.text));
      }
    });

    this.worker.addEventListener("error", err => this.onError(err));
  }

  uci(command: string): void {
    if (this.ready) this.worker.postMessage(command);
    else this.commandQueue.push(command);
  }

  terminate(): void {
    this.worker.terminate();
  }
}
