import {
  applyUciMove,
  applySanMove,
  sanToUci,
  buildMoveChain,
  pvMoveLabel,
} from "../moveUtils";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("applyUciMove", () => {
  it("applies a legal pawn push and returns the resulting FEN", () => {
    const result = applyUciMove(START_FEN, "e2e4");
    expect(result).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
  });

  it("applies a legal knight move", () => {
    const result = applyUciMove(START_FEN, "g1f3");
    expect(result).toContain("N");
    expect(result).not.toBeNull();
  });

  it("handles promotion moves", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    const result = applyUciMove(fen, "a7a8q");
    expect(result).not.toBeNull();
    expect(result).toContain("Q");
  });

  it("returns null for an illegal move", () => {
    // pawn cannot jump to the 5th rank in one move from the start position
    expect(applyUciMove(START_FEN, "e2e5")).toBeNull();
  });

  it("returns null for a malformed UCI string", () => {
    expect(applyUciMove(START_FEN, "e2")).toBeNull();
    expect(applyUciMove(START_FEN, "")).toBeNull();
  });

  it("returns null for an invalid FEN", () => {
    expect(applyUciMove("not-a-fen", "e2e4")).toBeNull();
  });

  it("does not mutate across calls (each call starts from the given FEN)", () => {
    const first = applyUciMove(START_FEN, "e2e4");
    const second = applyUciMove(START_FEN, "d2d4");
    expect(first).not.toBe(second);
    expect(second).toContain("d4".toUpperCase() === "D4" ? "P" : "P"); // sanity: second call still legal
  });
});

describe("applySanMove", () => {
  it("applies a legal SAN move", () => {
    const result = applySanMove(START_FEN, "e4");
    expect(result).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
  });

  it("applies castling", () => {
    const fen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
    const result = applySanMove(fen, "O-O");
    expect(result).not.toBeNull();
  });

  it("returns null for an illegal SAN move", () => {
    expect(applySanMove(START_FEN, "Qh5")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(applySanMove(START_FEN, "not a move")).toBeNull();
  });
});

describe("sanToUci", () => {
  it("converts a simple SAN move to UCI", () => {
    expect(sanToUci(START_FEN, "e4")).toBe("e2e4");
  });

  it("converts a knight move to UCI", () => {
    expect(sanToUci(START_FEN, "Nf3")).toBe("g1f3");
  });

  it("includes the promotion piece in the UCI string", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    expect(sanToUci(fen, "a8=Q")).toBe("a7a8q");
  });

  it("returns null for an illegal SAN move", () => {
    expect(sanToUci(START_FEN, "Qh5")).toBeNull();
  });

  it("round-trips with applyUciMove", () => {
    const uci = sanToUci(START_FEN, "Nf3");
    expect(uci).not.toBeNull();
    const fenAfter = applyUciMove(START_FEN, uci as string);
    const fenAfterSan = applySanMove(START_FEN, "Nf3");
    expect(fenAfter).toBe(fenAfterSan);
  });
});

describe("buildMoveChain", () => {
  it("applies a PV of several moves and returns a step per move", () => {
    const chain = buildMoveChain(START_FEN, ["e2e4", "e7e5", "g1f3"]);
    expect(chain).toHaveLength(3);
    expect(chain.map((s) => s.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(chain.map((s) => s.uci)).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("each step's fen reflects the position after that move (not just the last move)", () => {
    const chain = buildMoveChain(START_FEN, ["e2e4", "e7e5"]);
    expect(chain[0].fen).toBe(applyUciMove(START_FEN, "e2e4"));
    expect(chain[1].fen).toBe(applySanMove(chain[0].fen, "e5"));
  });

  it("stops at the first illegal move, keeping the legal prefix", () => {
    const chain = buildMoveChain(START_FEN, ["e2e4", "e2e4", "g1f3"]);
    expect(chain.map((s) => s.san)).toEqual(["e4"]);
  });

  it("stops at the first malformed UCI token", () => {
    const chain = buildMoveChain(START_FEN, ["e2e4", "zz", "g1f3"]);
    expect(chain.map((s) => s.san)).toEqual(["e4"]);
  });

  it("returns an empty array for an empty PV", () => {
    expect(buildMoveChain(START_FEN, [])).toEqual([]);
  });

  it("returns an empty array for an invalid starting FEN", () => {
    expect(buildMoveChain("not-a-fen", ["e2e4"])).toEqual([]);
  });

  it("handles promotion moves within the chain", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    const chain = buildMoveChain(fen, ["a7a8q"]);
    expect(chain).toHaveLength(1);
    expect(chain[0].san).toBe("a8=Q+");
    expect(chain[0].uci).toBe("a7a8q");
  });
});

describe("pvMoveLabel", () => {
  it("labels a white move with just the move number", () => {
    expect(pvMoveLabel(START_FEN, true)).toBe("1.");
  });

  it("omits the label for a black move that isn't first", () => {
    const afterE4 = applyUciMove(START_FEN, "e2e4") as string;
    expect(pvMoveLabel(afterE4, false)).toBeNull();
  });

  it("labels a black move with ellipsis when it's the first move shown", () => {
    const afterE4 = applyUciMove(START_FEN, "e2e4") as string;
    expect(pvMoveLabel(afterE4, true)).toBe("1...");
  });

  it("uses the fullmove number embedded in the FEN, not always 1", () => {
    const midGameFen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3";
    expect(pvMoveLabel(midGameFen, true)).toBe("3.");
  });

  it("returns null for an empty or malformed FEN", () => {
    expect(pvMoveLabel("", true)).toBeNull();
    expect(pvMoveLabel("garbage", true)).toBeNull();
  });
});
