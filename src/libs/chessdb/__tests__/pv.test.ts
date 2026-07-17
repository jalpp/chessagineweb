import { formatChessDbPv, uciLineToSan } from "../pv";
import type { ChessDbPvResult } from "@jalpp/stockfishts";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("uciLineToSan", () => {
  it("converts a sequence of UCI moves to SAN", () => {
    expect(uciLineToSan(START_FEN, ["e2e4", "e7e5", "g1f3"])).toEqual([
      "e4",
      "e5",
      "Nf3",
    ]);
  });

  it("stops at the first illegal move instead of throwing", () => {
    expect(uciLineToSan(START_FEN, ["e2e4", "e2e4"])).toEqual(["e4"]);
  });

  it("stops at the first malformed move", () => {
    expect(uciLineToSan(START_FEN, ["e2e4", "zz"])).toEqual(["e4"]);
  });

  it("returns an empty array for an empty PV", () => {
    expect(uciLineToSan(START_FEN, [])).toEqual([]);
  });

  it("returns an empty array for a missing/invalid FEN", () => {
    expect(uciLineToSan("", ["e2e4"])).toEqual([]);
  });

  it("handles promotion moves", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    expect(uciLineToSan(fen, ["a7a8q"])).toEqual(["a8=Q+"]);
  });
});

describe("formatChessDbPv", () => {
  it("prefers ChessDB's own pvSAN when present and matching length", () => {
    const result: ChessDbPvResult = {
      score: 35,
      depth: 24,
      pv: ["e2e4", "e7e5"],
      pvSAN: ["e4", "e5"],
    };
    const formatted = formatChessDbPv(START_FEN, result);
    expect(formatted.sanMoves).toEqual(["e4", "e5"]);
    expect(formatted.depth).toBe(24 + 22);
  });

  it("derives SAN from pv + fen when pvSAN is missing", () => {
    const result: ChessDbPvResult = {
      score: 35,
      depth: 24,
      pv: ["e2e4", "e7e5"],
      pvSAN: [],
    };
    const formatted = formatChessDbPv(START_FEN, result);
    expect(formatted.sanMoves).toEqual(["e4", "e5"]);
  });

  it("derives SAN from pv + fen when pvSAN length doesn't match pv", () => {
    const result: ChessDbPvResult = {
      score: 35,
      depth: 24,
      pv: ["e2e4", "e7e5", "g1f3"],
      pvSAN: ["e4"], // stale/mismatched
    };
    const formatted = formatChessDbPv(START_FEN, result);
    expect(formatted.sanMoves).toEqual(["e4", "e5", "Nf3"]);
  });

  it("formats a positive score with an explicit plus sign", () => {
    const result: ChessDbPvResult = { score: 235, depth: 20, pv: [], pvSAN: [] };
    expect(formatChessDbPv(START_FEN, result).scoreFormatted).toBe("+2.35");
  });

  it("formats a negative score", () => {
    const result: ChessDbPvResult = { score: -120, depth: 20, pv: [], pvSAN: [] };
    expect(formatChessDbPv(START_FEN, result).scoreFormatted).toBe("-1.20");
  });

  it("formats a zero score without a sign", () => {
    const result: ChessDbPvResult = { score: 0, depth: 20, pv: [], pvSAN: [] };
    expect(formatChessDbPv(START_FEN, result).scoreFormatted).toBe("0.00");
  });

  it("carries the raw UCI moves through unchanged", () => {
    const result: ChessDbPvResult = {
      score: 10,
      depth: 15,
      pv: ["e2e4", "c7c5"],
      pvSAN: ["e4", "c5"],
    };
    const formatted = formatChessDbPv(START_FEN, result);
    expect(formatted.uciMoves).toEqual(["e2e4", "c7c5"]);
  });

  it("handles an empty PV gracefully", () => {
    const result: ChessDbPvResult = { score: 0, depth: 0, pv: [], pvSAN: [] };
    const formatted = formatChessDbPv(START_FEN, result);
    expect(formatted.sanMoves).toEqual([]);
    expect(formatted.uciMoves).toEqual([]);
  });

  it("adds a fixed +22 offset to ChessDB's reported depth for display", () => {
    const result: ChessDbPvResult = { score: 0, depth: 18, pv: [], pvSAN: [] };
    expect(formatChessDbPv(START_FEN, result).depth).toBe(40);
  });

  it("applies the +22 depth offset even when ChessDB reports depth 0", () => {
    const result: ChessDbPvResult = { score: 0, depth: 0, pv: [], pvSAN: [] };
    expect(formatChessDbPv(START_FEN, result).depth).toBe(22);
  });
});
