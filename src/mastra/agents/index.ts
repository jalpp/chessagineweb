import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  ToolSearchProcessor,
  UnicodeNormalizer,
} from "@mastra/core/processors";

import { getAgineMcpClient } from "../mcp/agineClient";
import { displayChessboardTool, loadGameTool } from "./tools";
import { classifyQuery, recordSpend, resolveModel } from "../router";

const PREMIUM_MODELS = new Set<string>([
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "meta-llama/llama-3.1-8b-instruct",
]);

function createAgineCloudModel(requestContext: RequestContext) {
  const raw = (requestContext.get("model") as string) ?? "";
  const modelName = raw.replace(/^\"|\"$/g, "");

  const presetSlug = "@preset/chessagine";

  const openRouter = createOpenRouter({
    apiKey: process.env.AGINE_KEY,
  });

  if (!modelName) {
    return openRouter(`openrouter/auto${presetSlug}`);
  }

  const resolvedName = (requestContext.get("resolvedModel") as string) || modelName;


  return openRouter(`${resolvedName}${presetSlug}`);
}

function buildInstructions(requestContext: RequestContext): string {
  const lang = (requestContext.get("lang") as string) || "English";
  return "You are a chess agent, you speak in [LANG]".replace("[LANG]", lang);
}

const MCP_IGNORE_TOOL_IDS = new Set([
  "render_chess_board",
  "render_pgn_viewer",
  "get-lichess-username",
  "fetch-lichess-studies",
  "fetch-lichess-study-pgn",
  "get-lichess-master-games",
]);


const PINNED_MCP_TOOL_IDS = new Set([
  "parse-pgn-into-move-fens",
  "get-fen-map-lookup",
  "parse-moves-for-boardstate",
  "get-boardstate-for-fen",
  "get-boardstate-for-move",
  "is-legal-move",
]);

async function buildTools() {
  const mcpTools = await getAgineMcpClient().listTools();

  const filteredMcpTools = Object.fromEntries(
    Object.entries(mcpTools)
      .filter(([id]) => !MCP_IGNORE_TOOL_IDS.has(id))
      .filter(([id]) => !id.includes("chessboardmagic")),
  );

  return {
    ...filteredMcpTools,
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

async function buildToolSearchProcessor() {
  const tools = await buildTools();

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

export { classifyQuery, resolveModel, recordSpend };

export const chessAgine = new Agent({
  id: "chessagine-agent",
  name: "ChessAgine",
  instructions: ({ requestContext }) => buildInstructions(requestContext),
  model: ({ requestContext }) => createAgineCloudModel(requestContext),
  tools: await buildPinnedTools(),
  inputProcessors: [unicodeNormalizer, await buildToolSearchProcessor()],
});