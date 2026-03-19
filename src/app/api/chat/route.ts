import { createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { mastra } from "@/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 30;

const PREMIUM_MODELS = [
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "meta-llama/llama-3.1-8b-instruct",
];

export async function POST(req: Request) {
  const { userId, has } = await auth();
  const isAuthenticated = !!userId;
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const { messages, apiSettings } = await req.json();

  
  apiSettings.provider = "agineCloud";

  
  if (!apiSettings?.model) {
    return Response.json(
      { error: "API settings are required (model)" },
      { status: 400 },
    );
  }


  if (!isAuthenticated) {
    return Response.json(
      {
        error:
          "Please sign up to use Agine Chat. agineCloud models run on community donated resources. " +
          "You can read more about setup on the docs page.",
      },
      { status: 401 },
    );
  }

  
  if (PREMIUM_MODELS.includes(apiSettings.model) && !isPaidTier) {
    return Response.json(
      {
        error:
          `The model "${apiSettings.model}" is only available on the paid tier. ` +
          "Please upgrade your plan at /pricing to access premium models.",
      },
      { status: 403 },
    );
  }

  const requestContext = new RequestContext();
  requestContext.set("model", apiSettings.model);

  const agent = mastra.getAgent("chessAgine");

  const stream = await agent.stream(messages, {
    requestContext,
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }) as any,
  });
}