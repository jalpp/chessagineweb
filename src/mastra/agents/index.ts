import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  ToolSearchProcessor,
  UnicodeNormalizer,
} from "@mastra/core/processors";

import { getAgineMcpClient, AgineTokens } from "../mcp/agineClient";
import { displayChessboardTool, loadGameTool } from "./tools";
import {
  BYO_ANTHROPIC_MODELS,
  BYO_GEMINI_MODELS,
  BYO_OPENROUTER_MODELS,
} from "@/libs/agine/modelConstants";
import { basicSystemPrompt } from "./types";

function createAgineCloudModel(requestContext: RequestContext) {
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

const MCP_RENDER_TOOL_IDS = new Set([
  "render_chess_board",
  "render_pgn_viewer",
]);

const LICHESS_AUTH_TOOL_IDS = new Set([
  "fetch-lichess-studies",
  "fetch-lichess-study-pgn",
]);

const IGNORE_TOOL_IDS = new Set([
  "get-lichess-username",
]);

const PINNED_MCP_TOOL_IDS = new Set([
  "parse-pgn-into-move-fens",
  "get-fen-map-lookup",
  "parse-moves-for-boardstate",
  "get-boardstate-for-fen",
  "get-boardstate-for-move",
  "is-legal-move",
  "search_tools",
  "load_tools",
]);


function wrapToolsWithAuth(
  tools: Record<string, any>,
  tokens?: AgineTokens,
  isPaidTier?: boolean
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
    })
  );
}

async function buildTools(tokens?: AgineTokens, isPaidTier?: boolean) {
 
  const mcpClient = getAgineMcpClient();

  const mcpTools = await mcpClient.listTools();

  const filteredMcpTools = Object.fromEntries(
    Object.entries(mcpTools).filter(([id]) => {
      // Ignore render tools
      if (MCP_RENDER_TOOL_IDS.has(id)) return false;

    
      if (IGNORE_TOOL_IDS.has(id)) return false;

 
      if (LICHESS_AUTH_TOOL_IDS.has(id)) {
        return !!tokens?.lichessToken;
      }

     
      if (id.includes("chessboardmagic")) {
        return !!(isPaidTier && tokens?.chessboardmagicToken);
      }

      return true;
    })
  );

 
  const wrappedTools = wrapToolsWithAuth(
    filteredMcpTools,
    tokens,
    isPaidTier
  );

  return {
    ...wrappedTools,
    display_chessboard_for_fen: displayChessboardTool,
    load_chess_game: loadGameTool,
  };
}

const unicodeNormalizer = new UnicodeNormalizer({
  stripControlChars: true,
  preserveEmojis: false,
  collapseWhitespace: true,
  trim: true,
});

async function buildToolSearchProcessor(tokens?: AgineTokens, isPaidTier?: boolean) {
  const tools = await buildTools(tokens, isPaidTier);

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

async function buildPinnedTools() {
  return {
    display_chessboard_for_fen: displayChessboardTool,
    load_chess_game: loadGameTool,
  };
}

export async function createChessAgineAgent(
  tokens?: AgineTokens,
  isPaidTier?: boolean
) {
  const tools = await buildTools(tokens, isPaidTier);

  const toolSearchProcessor = await buildToolSearchProcessor(tokens, isPaidTier);

  return new Agent({
    id: "chessagine-agent",
    name: "ChessAgine",
    instructions: ({ requestContext }) => buildInstructions(requestContext),
    model: ({ requestContext }) => createAgineCloudModel(requestContext),
    tools,
    inputProcessors: [unicodeNormalizer, toolSearchProcessor],
  });
}

// Default agent (no auth)
export const chessAgine = new Agent({
  id: "chessagine-agent",
  name: "ChessAgine",
  instructions: ({ requestContext }) => buildInstructions(requestContext),
  model: ({ requestContext }) => createAgineCloudModel(requestContext),
  tools: await buildPinnedTools(),
  inputProcessors: [unicodeNormalizer, await buildToolSearchProcessor()],
});