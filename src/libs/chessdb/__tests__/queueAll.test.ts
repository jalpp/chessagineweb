import { collectAllFens, queueAllPositions, ChessDbQueueResult } from "../queueAll";
import { makeTree, addMove } from "@/lib/variationTree";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2";
const AFTER_E4_C5 = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2";

describe("collectAllFens", () => {
  it("returns just the root FEN for an empty tree", () => {
    const tree = makeTree(START_FEN);
    expect(collectAllFens(tree.root)).toEqual([START_FEN]);
  });

  it("collects every FEN along the main line", () => {
    let tree = makeTree(START_FEN);
    ({ newTree: tree } = addMove(tree, tree.cursor, "e4", "e2e4", AFTER_E4));
    ({ newTree: tree } = addMove(tree, tree.root.next!.id, "e5", "e7e5", AFTER_E4_E5));

    expect(collectAllFens(tree.root)).toEqual([START_FEN, AFTER_E4, AFTER_E4_E5]);
  });

  it("includes variation branches alongside the main line", () => {
    let tree = makeTree(START_FEN);
    let result = addMove(tree, tree.cursor, "e4", "e2e4", AFTER_E4);
    tree = result.newTree;
    const afterE4Id = tree.root.next!.id;

    result = addMove(tree, afterE4Id, "e5", "e7e5", AFTER_E4_E5);
    tree = result.newTree;
    result = addMove(tree, afterE4Id, "c5", "c7c5", AFTER_E4_C5);
    tree = result.newTree;

    const fens = collectAllFens(tree.root);
    expect(fens).toContain(START_FEN);
    expect(fens).toContain(AFTER_E4);
    expect(fens).toContain(AFTER_E4_E5);
    expect(fens).toContain(AFTER_E4_C5);
    expect(fens).toHaveLength(4);
  });

  it("de-duplicates FENs reached via transposition", () => {
    let tree = makeTree(START_FEN);
    let result = addMove(tree, tree.cursor, "e4", "e2e4", AFTER_E4);
    tree = result.newTree;
    const afterE4Id = tree.root.next!.id;

    // A variation that (implausibly, but fine for this test) transposes
    // back to the same FEN already seen on the main line should only be
    // counted once.
    result = addMove(tree, afterE4Id, "e5", "e7e5", AFTER_E4_E5);
    tree = result.newTree;
    result = addMove(tree, afterE4Id, "e5-again", "e7e5", AFTER_E4_E5);
    tree = result.newTree;

    expect(collectAllFens(tree.root)).toHaveLength(3);
  });
});

describe("queueAllPositions", () => {
  it("queues every FEN and reports success counts", async () => {
    const fens = [START_FEN, AFTER_E4, AFTER_E4_E5];
    const queued: string[] = [];
    const queueFn = jest.fn(async (fen: string): Promise<ChessDbQueueResult> => {
      queued.push(fen);
      return { success: true };
    });

    const result = await queueAllPositions(fens, queueFn);

    expect(result).toEqual({ total: 3, queued: 3, failed: 0 });
    expect(queueFn).toHaveBeenCalledTimes(3);
    expect(queued.sort()).toEqual([...fens].sort());
  });

  it("counts failures reported by the queue function without stopping the batch", async () => {
    const fens = [START_FEN, AFTER_E4, AFTER_E4_E5];
    const queueFn = jest.fn(async (fen: string): Promise<ChessDbQueueResult> => {
      if (fen === AFTER_E4) return { success: false, error: "unknown" };
      return { success: true };
    });

    const result = await queueAllPositions(fens, queueFn);

    expect(result).toEqual({ total: 3, queued: 2, failed: 1 });
  });

  it("counts thrown errors as failures rather than rejecting", async () => {
    const fens = [START_FEN, AFTER_E4];
    const queueFn = jest.fn(async (fen: string): Promise<ChessDbQueueResult> => {
      if (fen === AFTER_E4) throw new Error("network error");
      return { success: true };
    });

    const result = await queueAllPositions(fens, queueFn);

    expect(result).toEqual({ total: 2, queued: 1, failed: 1 });
  });

  it("reports progress as each request settles", async () => {
    const fens = [START_FEN, AFTER_E4, AFTER_E4_E5];
    const progressCalls: Array<{ done: number; total: number }> = [];
    const queueFn = async (): Promise<ChessDbQueueResult> => ({ success: true });

    await queueAllPositions(fens, queueFn, (done, total) => {
      progressCalls.push({ done, total });
    }, 1); // concurrency 1 to keep ordering deterministic

    expect(progressCalls).toEqual([
      { done: 1, total: 3 },
      { done: 2, total: 3 },
      { done: 3, total: 3 },
    ]);
  });

  it("returns immediately with an empty result for an empty FEN list", async () => {
    const queueFn = jest.fn(async (): Promise<ChessDbQueueResult> => ({ success: true }));
    const result = await queueAllPositions([], queueFn);

    expect(result).toEqual({ total: 0, queued: 0, failed: 0 });
    expect(queueFn).not.toHaveBeenCalled();
  });

  it("respects a concurrency cap larger than the queue by only spawning as many workers as needed", async () => {
    const fens = [START_FEN];
    let concurrentCalls = 0;
    let maxConcurrent = 0;
    const queueFn = async (): Promise<ChessDbQueueResult> => {
      concurrentCalls++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrentCalls--;
      return { success: true };
    };

    await queueAllPositions(fens, queueFn, undefined, 5);

    expect(maxConcurrent).toBe(1);
  });
});
