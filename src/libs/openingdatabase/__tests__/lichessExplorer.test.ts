import {
  buildExplorerUrl,
  getBearerToken,
  normalizeExplorerResponse,
  parseExplorerSource,
} from "../lichessExplorer";

const FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("parseExplorerSource", () => {
  it("defaults to masters", () => {
    expect(parseExplorerSource(null)).toBe("masters");
  });

  it("rejects unknown sources", () => {
    expect(parseExplorerSource("posira")).toBeNull();
  });
});

describe("buildExplorerUrl", () => {
  it("builds a masters url and caps topGames at 15", () => {
    const url = new URL(buildExplorerUrl("masters", FEN, { moves: 12, topGames: 50, speeds: "blitz" }));
    expect(url.origin + url.pathname).toBe("https://explorer.lichess.org/masters");
    expect(url.searchParams.get("fen")).toBe(FEN);
    expect(url.searchParams.get("topGames")).toBe("15");
    expect(url.searchParams.has("speeds")).toBe(false);
  });

  it("builds a lichess url with filters and caps topGames at 4", () => {
    const url = new URL(
      buildExplorerUrl("lichess", FEN, { topGames: 10, recentGames: 0, speeds: "rapid,classical", ratings: "1600,1800" }),
    );
    expect(url.pathname).toBe("/lichess");
    expect(url.searchParams.get("variant")).toBe("standard");
    expect(url.searchParams.get("topGames")).toBe("4");
    expect(url.searchParams.get("recentGames")).toBe("0");
    expect(url.searchParams.get("speeds")).toBe("rapid,classical");
    expect(url.searchParams.get("ratings")).toBe("1600,1800");
  });
});

describe("getBearerToken", () => {
  it("extracts the token from a bearer header", () => {
    expect(getBearerToken("Bearer lip_abc")).toBe("lip_abc");
  });

  it("returns null for missing or malformed headers", () => {
    expect(getBearerToken(null)).toBeNull();
    expect(getBearerToken("Basic abc")).toBeNull();
    expect(getBearerToken("Bearer ")).toBeNull();
  });
});

describe("normalizeExplorerResponse", () => {
  it("fills defaults for an empty response", () => {
    expect(normalizeExplorerResponse(null)).toEqual({
      opening: { eco: "", name: "Unknown" },
      white: 0,
      draws: 0,
      black: 0,
      moves: [],
      topGames: [],
    });
  });

  it("gives moves the position opening when lichess sends none", () => {
    const opening = { eco: "B00", name: "King's Pawn" };
    const result = normalizeExplorerResponse({
      opening,
      white: 3,
      draws: 2,
      black: 1,
      moves: [{ uci: "c7c5", san: "c5", averageRating: 2400, white: 3, draws: 2, black: 1 } as never],
    });
    expect(result.moves[0].opening).toEqual(opening);
    expect(result.topGames).toEqual([]);
  });
});
