import { walk, type MoveNode } from "@/lib/variationTree";

export interface QueueAllResult {
  total: number;
  queued: number;
  failed: number;
}

export interface ChessDbQueueResult {
  success: boolean;
  error?: string;
}

/**
 * Collect every distinct FEN reachable in a variation tree (the main line
 * plus every variation), in traversal order, root first.
 */
export function collectAllFens(root: MoveNode): string[] {
  const fens: string[] = [];
  const seen = new Set<string>();
  walk(root, (node) => {
    if (!seen.has(node.fen)) {
      seen.add(node.fen);
      fens.push(node.fen);
    }
  });
  return fens;
}

/**
 * Queue every FEN in `fens` for background ChessDB analysis, running up to
 * `concurrency` requests at a time and reporting progress as each request
 * settles. A failed/erroring request does not stop the remaining queue.
 */
export async function queueAllPositions(
  fens: string[],
  queueFn: (fen: string) => Promise<ChessDbQueueResult>,
  onProgress?: (done: number, total: number) => void,
  concurrency: number = 3,
): Promise<QueueAllResult> {
  const total = fens.length;
  let queued = 0;
  let failed = 0;
  let done = 0;
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < fens.length) {
      const i = nextIndex++;
      try {
        const result = await queueFn(fens[i]);
        if (result.success) {
          queued++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      done++;
      onProgress?.(done, total);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, fens.length || 1));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return { total, queued, failed };
}
