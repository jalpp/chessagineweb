import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  ToolSearchProcessor,
  UnicodeNormalizer,
  PrefillErrorHandler,
} from "@mastra/core/processors";

import { getAgineMcpClient, AgineTokens } from "../mcp/agineClient";
import { displayChessboardTool, fetchChessPuzzle, loadGameTool } from "./tools";
import {
  ToolMode,
  PINNED_MCP_TOOL_IDS,
  filterMcpTools,
  wrapToolsWithAuth,
  shouldIncludeLocalTool,
} from "./toolMode";
import {
  BYO_ANTHROPIC_MODELS,
  BYO_GEMINI_MODELS,
  BYO_OPENROUTER_MODELS,
} from "@/libs/agine/modelConstants";
import { basicSystemPrompt } from "./types";

export type { ToolMode } from "./toolMode";
export { filterMcpTools, wrapToolsWithAuth } from "./toolMode";

export function createAgineCloudModel(requestContext: RequestContext) {
  const raw = (requestContext.get("model") as string) ?? "";
  const modelName = raw.replace(/^\"|\"$/g, "");

  const resolvedName =
    (requestContext.get("resolvedModel") as string) || modelName;

  const personalAnthropicKey = requestContext.get("personalAnthropicKey") as string | undefined;
  const personalGeminiKey = requestContext.get("personalGeminiKey") as string | undefined;
  const personalOpenRouterKey = requestContext.get("personalOpenRouterKey") as string | undefined;
  const dailyLimitHit = requestContext.get("dailyLimitHit") as boolean | undefined;

  if (BYO_ANTHROPIC_MODELS.includes(resolvedName) && personalAnthropicKey) {
    const anthropic = createAnthropic({ apiKey: personalAnthropicKey });
    return anthropic(resolvedName);
  }

  if (BYO_GEMINI_MODELS.includes(resolvedName) && personalGeminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: personalGeminiKey });
    return google(resolvedName);
  }

  if (BYO_OPENROUTER_MODELS.includes(resolvedName) && personalOpenRouterKey) {
    const fixedName = resolvedName.replace(":user","");
    const openRouterByo = createOpenRouter({ apiKey: personalOpenRouterKey });
    return openRouterByo(fixedName);
  }

  const presetSlug = "@preset/chessagine";

  const apiKey = (personalOpenRouterKey && dailyLimitHit)
    ? personalOpenRouterKey
    : process.env.AGINE_KEY;

  const openRouter = createOpenRouter({ apiKey });

  if (!modelName) {
    return openRouter(`openrouter/auto${presetSlug}`);
  }

  const routerModel = (personalOpenRouterKey && dailyLimitHit)
    ? resolvedName
    : resolvedName + presetSlug;

  return openRouter(routerModel);
}

function buildInstructions(requestContext: RequestContext): string {
  const lang = (requestContext.get("lang") as string) || "English";
  return basicSystemPrompt
    .replace("[LANG]", lang);
}

async function buildTools(tokens?: AgineTokens, isPaidTier?: boolean, toolMode: ToolMode = "full") {
 
  const mcpClient = getAgineMcpClient();

  const mcpTools = await mcpClient.listTools();

  const filteredMcpTools = filterMcpTools(mcpTools, tokens, isPaidTier, toolMode);

 
  const wrappedTools = wrapToolsWithAuth(
    filteredMcpTools,
    tokens,
    isPaidTier
  );

  return {
    ...wrappedTools,
    ...buildLocalBoardTools(toolMode),
  };
}

const unicodeNormalizer = new UnicodeNormalizer({
  stripControlChars: true,
  preserveEmojis: false,
  collapseWhitespace: true,
  trim: true,
});



const prefillErrorHandler = new PrefillErrorHandler();

/** Local board/game-loading UI tools, filtered out entirely for the embedded panel (see ToolMode above). */
export function buildLocalBoardTools(toolMode: ToolMode = "full") {
  const all: Record<string, any> = {
    display_chessboard_for_fen: displayChessboardTool,
    load_chess_game: loadGameTool,
  };
  return Object.fromEntries(
    Object.entries(all).filter(([id]) => shouldIncludeLocalTool(id, toolMode)),
  );
}

async function buildToolSearchProcessor(tokens?: AgineTokens, isPaidTier?: boolean, toolMode: ToolMode = "full") {
  const tools = await buildTools(tokens, isPaidTier, toolMode);

  const searchableTools = Object.fromEntries(
    Object.entries(tools).filter(([id]) => !PINNED_MCP_TOOL_IDS.has(id)),
  );

  return new ToolSearchProcessor({
    tools: searchableTools,
    search: {
      topK: 7,
      minScore: 0.05,
    },
  });
}

function buildPinnedTools() {
  return {
    display_chessboard_for_fen: displayChessboardTool,
    load_chess_game: loadGameTool,
    fetch_chess_puzzle: fetchChessPuzzle
  };
}

const PANEL_MODE_INSTRUCTIONS = `

## Embedded Analysis Panel Mode
You are running inside the compact Chat panel on the game review / position analysis page, not the standalone chat page. The user already has a live board, move list, and (in game mode) a game-review panel open right next to you, and the current FEN/PGN/engine lines were already given to you above under "Live Board Context".
- Do NOT call display_chessboard_for_fen or load_chess_game — there is nowhere for them to render here, and the board is already on screen.
- Do NOT call tools that only re-derive the FEN/PGN/board state you were already given (parsing/board-state lookups) — trust the context above instead.
- DO feel free to call engines and other heavy analysis tools (Stockfish, Leela/Maia, ChessDB, opening databases, etc.) when the user's question needs deeper analysis than what's already in context.`;

export async function createChessAgineAgent(
  tokens?: AgineTokens,
  isPaidTier?: boolean,
  toolMode: ToolMode = "full"
) {
  const tools = await buildTools(tokens, isPaidTier, toolMode);

  const toolSearchProcessor = await buildToolSearchProcessor(tokens, isPaidTier, toolMode);

  return new Agent({
    id: "chessagine-agent",
    name: "ChessAgine",
    instructions: ({ requestContext }) =>
      buildInstructions(requestContext) + (toolMode === "panel" ? PANEL_MODE_INSTRUCTIONS : ""),
    model: ({ requestContext }) => createAgineCloudModel(requestContext),
    tools,
    inputProcessors: [unicodeNormalizer, toolSearchProcessor],
    errorProcessors: [prefillErrorHandler],
  });
}


export const chessAgine = new Agent({
  id: "chessagine-agent",
  name: "ChessAgine",
  instructions: ({ requestContext }) => buildInstructions(requestContext),
  model: ({ requestContext }) => createAgineCloudModel(requestContext),
  tools: () => buildPinnedTools(),
  inputProcessors: async () => [unicodeNormalizer, await buildToolSearchProcessor()],
  errorProcessors: [prefillErrorHandler],
});