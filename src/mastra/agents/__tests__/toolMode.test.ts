import {
  filterMcpTools,
  wrapToolsWithAuth,
  shouldIncludeLocalTool,
  PANEL_EXCLUDED_LOCAL_TOOL_IDS,
} from "../toolMode";

function fakeMcpTools(ids: string[]): Record<string, any> {
  return Object.fromEntries(ids.map((id) => [id, { id, execute: async () => ({}) }]));
}

describe("filterMcpTools — full vs panel ToolMode", () => {
  const allIds = [
    "render_chess_board",
    "render_pgn_viewer",
    "get-lichess-username",
    "parse-pgn-into-move-fens",
    "get-fen-map-lookup",
    "parse-moves-for-boardstate",
    "get-boardstate-for-fen",
    "get-boardstate-for-move",
    "is-legal-move",
    "search_tools",
    "load_tools",
    "get-stockfish-analysis",
    "get-leela-analysis",
    "get-chessdb-analysis",
    "fetch-lichess-studies",
  ];

  it("in full mode, keeps board-state/parse tools (the standalone chat page has no pre-supplied context)", () => {
    const result = filterMcpTools(fakeMcpTools(allIds), undefined, "full");
    expect(result).toHaveProperty("get-boardstate-for-fen");
    expect(result).toHaveProperty("parse-pgn-into-move-fens");
    expect(result).toHaveProperty("is-legal-move");
  });

  it("in panel mode, drops board-state/parse tools that only re-derive context already supplied", () => {
    const result = filterMcpTools(fakeMcpTools(allIds), undefined,  "panel");
    expect(result).not.toHaveProperty("get-boardstate-for-fen");
    expect(result).not.toHaveProperty("get-boardstate-for-move");
    expect(result).not.toHaveProperty("parse-pgn-into-move-fens");
    expect(result).not.toHaveProperty("get-fen-map-lookup");
    expect(result).not.toHaveProperty("parse-moves-for-boardstate");
    expect(result).not.toHaveProperty("is-legal-move");
  });

  it("in panel mode, still keeps engines and heavy analysis tools", () => {
    const result = filterMcpTools(fakeMcpTools(allIds), undefined, "panel");
    expect(result).toHaveProperty("get-stockfish-analysis");
    expect(result).toHaveProperty("get-leela-analysis");
    expect(result).toHaveProperty("get-chessdb-analysis");
  });

  it("in panel mode, still keeps internal tool-search infra tools", () => {
    const result = filterMcpTools(fakeMcpTools(allIds), undefined, "panel");
    expect(result).toHaveProperty("search_tools");
    expect(result).toHaveProperty("load_tools");
  });

  it("keeps the render-tool and lichess-auth exclusions in both modes", () => {
    const full = filterMcpTools(fakeMcpTools(allIds), undefined, "full");
    const panel = filterMcpTools(fakeMcpTools(allIds), undefined, "panel");
    for (const result of [full, panel]) {
      expect(result).not.toHaveProperty("render_chess_board");
      expect(result).not.toHaveProperty("render_pgn_viewer");
      expect(result).not.toHaveProperty("get-lichess-username");
      // no lichess token supplied, so the auth-gated tool stays excluded
      expect(result).not.toHaveProperty("fetch-lichess-studies");
    }
  });

  it("keeps lichess-auth-gated tools when a lichess token is supplied, in both modes", () => {
    const result = filterMcpTools(fakeMcpTools(["fetch-lichess-studies"]), { lichessToken: "abc" },  "panel");
    expect(result).toHaveProperty("fetch-lichess-studies");
  });

  it("defaults to full mode when toolMode is omitted", () => {
    const withDefault = filterMcpTools(fakeMcpTools(allIds), undefined);
    const explicitFull = filterMcpTools(fakeMcpTools(allIds), undefined, "full");
    expect(Object.keys(withDefault).sort()).toEqual(Object.keys(explicitFull).sort());
  });
});

describe("shouldIncludeLocalTool — full vs panel ToolMode", () => {
  it("includes the board/game-loading render tools in full mode", () => {
    expect(shouldIncludeLocalTool("display_chessboard_for_fen", "full")).toBe(true);
    expect(shouldIncludeLocalTool("load_chess_game", "full")).toBe(true);
  });

  it("excludes the board/game-loading render tools in panel mode — the panel already has a board on screen", () => {
    expect(shouldIncludeLocalTool("display_chessboard_for_fen", "panel")).toBe(false);
    expect(shouldIncludeLocalTool("load_chess_game", "panel")).toBe(false);
  });

  it("does not exclude unrelated local tools in panel mode", () => {
    expect(shouldIncludeLocalTool("fetch_chess_puzzle", "panel")).toBe(true);
  });

  it("defaults to full mode when toolMode is omitted", () => {
    expect(shouldIncludeLocalTool("display_chessboard_for_fen")).toBe(true);
  });

  it("PANEL_EXCLUDED_LOCAL_TOOL_IDS covers exactly the render/load tools", () => {
    expect([...PANEL_EXCLUDED_LOCAL_TOOL_IDS].sort()).toEqual(
      ["display_chessboard_for_fen", "load_chess_game"].sort(),
    );
  });
});

describe("wrapToolsWithAuth", () => {
  it("injects the lichess token into auth-gated tool args", async () => {
    const tools = fakeMcpTools(["fetch-lichess-studies"]);
    const wrapped = wrapToolsWithAuth(tools, { lichessToken: "abc123" });
    const spy = jest.spyOn(tools["fetch-lichess-studies"], "execute");
    await wrapped["fetch-lichess-studies"].execute({ username: "someone" }, {});
    expect(spy).toHaveBeenCalledWith({ username: "someone", token: "abc123" }, {});
  });

  it("leaves args untouched for tools with no matching auth rule", async () => {
    const tools = fakeMcpTools(["get-stockfish-analysis"]);
    const wrapped = wrapToolsWithAuth(tools, { lichessToken: "abc123" });
    const spy = jest.spyOn(tools["get-stockfish-analysis"], "execute");
    await wrapped["get-stockfish-analysis"].execute({ fen: "startpos" }, {});
    expect(spy).toHaveBeenCalledWith({ fen: "startpos" }, {});
  });
});
