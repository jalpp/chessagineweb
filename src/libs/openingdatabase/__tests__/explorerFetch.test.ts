import { getOpeningStats } from "../helper";
import { getRatingGroups } from "../lichessRatingOpening";
import { explorerCache } from "@/libs/cache/explorerMemCache";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DATA = { opening: { eco: "", name: "Unknown" }, white: 1, draws: 1, black: 1, moves: [], topGames: [] };

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  explorerCache.clear();
});

describe("getOpeningStats", () => {
  it("does not call the api without a lichess token", async () => {
    await expect(getOpeningStats(FEN, "position", "")).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the bearer token to the explorer route", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: DATA }) });
    await expect(getOpeningStats(FEN, "position", "lip_abc")).resolves.toEqual(DATA);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/^\/api\/explorer\?.*source=masters/);
    expect(init.headers.Authorization).toBe("Bearer lip_abc");
  });

  it("retries after a failed request instead of caching the failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(getOpeningStats(FEN, "position", "lip_abc")).resolves.toBeNull();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: DATA }) });
    await expect(getOpeningStats(FEN, "position", "lip_abc")).resolves.toEqual(DATA);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("getRatingGroups", () => {
  it("maps low maia ratings to the lichess 0 bucket", () => {
    expect(getRatingGroups(600)).toEqual([0, 1000]);
  });
});
