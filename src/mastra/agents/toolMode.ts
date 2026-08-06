export type ToolMode = "full" | "panel";

export interface AgineTokens {
  lichessToken?: string;
  chessboardmagicToken?: string;
}

export const MCP_RENDER_TOOL_IDS = new Set([
  "render_chess_board",
  "render_pgn_viewer",
]);

export const LICHESS_AUTH_TOOL_IDS = new Set([
  "fetch-lichess-studies",
  "fetch-lichess-study-pgn",
]);

export const IGNORE_TOOL_IDS = new Set([
  "get-lichess-username",
  "fetch_chess_puzzle",
]);

export const PINNED_MCP_TOOL_IDS = new Set([
  "parse-pgn-into-move-fens",
  "get-fen-map-lookup",
  "parse-moves-for-boardstate",
  "get-boardstate-for-fen",
  "get-boardstate-for-move",
  "is-legal-move",
  "search_tools",
  "load_tools",
]);

export const PANEL_EXCLUDED_MCP_TOOL_IDS = new Set([
  "parse-pgn-into-move-fens",
  "get-fen-map-lookup",
  "parse-moves-for-boardstate",
  "get-boardstate-for-fen",
  "get-boardstate-for-move",
  "is-legal-move",
]);

export const PANEL_EXCLUDED_LOCAL_TOOL_IDS = new Set([
  "display_chessboard_for_fen",
  "load_chess_game",
]);

export function wrapToolsWithAuth(
  tools: Record<string, any>,
  tokens?: AgineTokens,
  isPaidTier?: boolean,
) {
  return Object.fromEntries(
    Object.entries(tools).map(([id, tool]) => {
      return [
        id,
        {
          ...tool,

          async execute(args: any, context: any) {
            let newArgs = { ...args };

            if (LICHESS_AUTH_TOOL_IDS.has(id) && tokens?.lichessToken) {
              newArgs = {
                ...newArgs,
                token: tokens.lichessToken,
              };
            }

            if (
              id.includes("chessboardmagic") &&
              isPaidTier &&
              tokens?.chessboardmagicToken
            ) {
              newArgs = {
                ...newArgs,
                token: tokens.chessboardmagicToken,
              };
            }

            return tool.execute(newArgs, context);
          },
        },
      ];
    }),
  );
}

export function filterMcpTools(
  mcpTools: Record<string, any>,
  tokens?: AgineTokens,
  isPaidTier?: boolean,
  toolMode: ToolMode = "full",
) {
  return Object.fromEntries(
    Object.entries(mcpTools).filter(([id]) => {
      // Ignore render tools
      if (MCP_RENDER_TOOL_IDS.has(id)) return false;

      if (IGNORE_TOOL_IDS.has(id)) return false;

      if (toolMode === "panel" && PANEL_EXCLUDED_MCP_TOOL_IDS.has(id)) return false;

      if (LICHESS_AUTH_TOOL_IDS.has(id)) {
        return !!tokens?.lichessToken;
      }

      if (id.includes("chessboardmagic")) {
        return !!(isPaidTier && tokens?.chessboardmagicToken);
      }

      return true;
    }),
  );
}

export function shouldIncludeLocalTool(id: string, toolMode: ToolMode = "full"): boolean {
  if (toolMode === "panel" && PANEL_EXCLUDED_LOCAL_TOOL_IDS.has(id)) return false;
  return true;
}
