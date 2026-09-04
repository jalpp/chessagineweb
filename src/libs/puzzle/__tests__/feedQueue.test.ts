import {
  shouldPrefetchMore,
  dedupePuzzlesById,
  FEED_PREFETCH_THRESHOLD,
} from "../feedQueue";

describe("shouldPrefetchMore", () => {
  it("is false when plenty of unseen puzzles remain", () => {
    expect(shouldPrefetchMore(0, 10)).toBe(false);
  });

  it("is true once remaining puzzles hit the threshold", () => {
    expect(shouldPrefetchMore(7, 10, 3)).toBe(true);
  });

  it("is true once the queue is fully consumed", () => {
    expect(shouldPrefetchMore(10, 10)).toBe(true);
  });

  it("defaults to FEED_PREFETCH_THRESHOLD when not given one", () => {
    expect(shouldPrefetchMore(10 - FEED_PREFETCH_THRESHOLD, 10)).toBe(true);
    expect(shouldPrefetchMore(10 - FEED_PREFETCH_THRESHOLD - 1, 10)).toBe(
      false,
    );
  });
});

describe("dedupePuzzlesById", () => {
  it("appends incoming puzzles not already present", () => {
    const existing = [{ lichessId: "a" }, { lichessId: "b" }];
    const incoming = [{ lichessId: "c" }];
    expect(dedupePuzzlesById(existing, incoming)).toEqual([
      { lichessId: "a" },
      { lichessId: "b" },
      { lichessId: "c" },
    ]);
  });

  it("drops incoming puzzles that duplicate an existing lichessId", () => {
    const existing = [{ lichessId: "a" }];
    const incoming = [{ lichessId: "a" }, { lichessId: "b" }];
    expect(dedupePuzzlesById(existing, incoming)).toEqual([
      { lichessId: "a" },
      { lichessId: "b" },
    ]);
  });

  it("does not mutate the existing array", () => {
    const existing = [{ lichessId: "a" }];
    dedupePuzzlesById(existing, [{ lichessId: "b" }]);
    expect(existing).toEqual([{ lichessId: "a" }]);
  });
});
