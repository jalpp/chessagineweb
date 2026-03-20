import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { agineSystemPrompt } from "./prompt";
import { AgineCloudModel } from "./types";
import { getAgineMcpClient } from "../mcp/agineClient";
import { displayChessboardTool } from "./tools";

function createAgineCloudModel(requestContext: RequestContext) {
 
  const rawModel = requestContext.get("model") as string;
  const modelName = rawModel.replace(/^"|"$/g, "");

  const apiKey = process.env.AGINE_KEY;
  const agineCloudRouter = createOpenRouter({ apiKey });

  const premiumModels = [
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-sonnet-4.6",
    "qwen/qwen3.5-9b",
    "meta-llama/llama-3.1-8b-instruct"
  ];

  const resolvedModel = premiumModels.includes(modelName)
    ? modelName
    : `${modelName}:free`;

  return agineCloudRouter(resolvedModel as AgineCloudModel);
}

function createAgentInstruction(requestContext: RequestContext) {
  const lang = (requestContext.get("lang") as string) || "English";
  const replaceLangKey = "[ENGLISH]";

  return agineSystemPrompt.replace(replaceLangKey, lang);
}

export const chessAgine = new Agent({
  id: "chessagine-agent",
  name: "ChessAgine",
  instructions: ({ requestContext }) => createAgentInstruction(requestContext),
  model: ({ requestContext }) => createAgineCloudModel(requestContext),
  tools: async () => {
    const mcpTools = await getAgineMcpClient().listTools();
    return {
      ...mcpTools,
      display_chessboard_for_fen: displayChessboardTool,
    };
  },
});