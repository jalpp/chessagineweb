import { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { agineSystemPrompt } from "./prompt";
import { AgineCloudModel } from "./types";
import { getAgineMcpClient } from "../mcp/agineClient";
import { displayChessboardTool, loadGameTool } from "./tools";
import { resolveRouting } from "./router";


function createAgentInstruction(requestContext: RequestContext) {
  const lang = (requestContext.get("lang") as string) || "English";
  return agineSystemPrompt.replace("[ENGLISH]", lang);
}

function createAgineCloudModel(requestContext: RequestContext) {
  const isPaidTier = (requestContext.get("isPaidTier") as boolean) ?? false;
  const userId     = (requestContext.get("userId") as string) ?? null;
  const messages   = (requestContext.get("messages") as Array<{ role: string; content: any }>) ?? [];

  const { resolvedModel, extraBody, budgetTier, complexity } = resolveRouting({
    requestContext,
    isPaidTier,
    userId,
    messages,
  });

  console.log(
    `[router] user=${userId ?? "anon"} tier=${budgetTier} complexity=${complexity} model=${resolvedModel}`
  );

  const apiKey = process.env.AGINE_KEY;
  const agineCloudRouter = createOpenRouter({ apiKey });


  return agineCloudRouter(resolvedModel as AgineCloudModel, {
    extraBody,
  });
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
      load_chess_game: loadGameTool,
    };
  },
});