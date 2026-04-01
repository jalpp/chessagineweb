import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { getAgineMcpClient } from "../mcp/agineClient";
import { displayChessboardTool, loadGameTool } from "./tools";


const PREMIUM_MODELS = new Set<string>([
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-sonnet-4.6",
    "qwen/qwen3.5-9b",
    "meta-llama/llama-3.1-8b-instruct"
]);

function createAgineCloudModel(requestContext: RequestContext) {
  const raw = (requestContext.get("model") as string) ?? "";
  const modelName = raw.replace(/^"|"$/g, "");

  const presetSlug = '@preset/chessagine';

  const openRouter = createOpenRouter({
    apiKey: process.env.AGINE_KEY,
  });


  if (!modelName) {
    return openRouter(`@preset/${presetSlug}`);
  }

  const resolvedModel = PREMIUM_MODELS.has(modelName)
    ? modelName
    : `${modelName}:free`;

  const presetModel = `${resolvedModel}${presetSlug}`;  
  return openRouter(presetModel);
}


function buildInstructions(requestContext: RequestContext): string {
  const lang = (requestContext.get("lang") as string) || "English";
  return "You are a chess agent, you speak in [LANG]".replace("[LANG]", lang);
}


/**
 * MCP render tool IDs replaced by client-side UI tools.
 * Removing from registration prevents the model from calling the server versions.
 */
const MCP_RENDER_TOOL_IDS = new Set([
  "render_chess_board",
  "render_pgn_viewer",
]);

async function buildTools() {
  const mcpTools = await getAgineMcpClient().listTools();

  const filteredMcpTools = Object.fromEntries(
    Object.entries(mcpTools).filter(([id]) => !MCP_RENDER_TOOL_IDS.has(id))
  );

  return {
    ...filteredMcpTools,
    display_chessboard_for_fen: displayChessboardTool,
    load_chess_game: loadGameTool,
  };
}


export const chessAgine = new Agent({
  id: "chessagine-agent",
  name: "ChessAgine",
  instructions: ({ requestContext }) => buildInstructions(requestContext),
  model: ({ requestContext }) => createAgineCloudModel(requestContext),
  tools: buildTools,
});