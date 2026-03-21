import { createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { mastra } from "@/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { auth } from "@clerk/nextjs/server";
import { recordTokenUsage } from "@/mastra/agents/router";

export const maxDuration = 200;

const MAX_KNOWLEDGE_BYTES = 160 * 1024;

const PREMIUM_MODELS = new Set([
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "meta-llama/llama-3.1-8b-instruct",
]);

export async function POST(req: Request) {
  const { userId, has } = await auth();
  const isAuthenticated = !!userId;
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const { messages, apiSettings, knowledgeContext } = await req.json();

  apiSettings.provider = "agineCloud";

  if (!apiSettings?.model) {
    return Response.json(
      { error: "API settings are required (model)" },
      { status: 400 }
    );
  }

  if (!isAuthenticated) {
    return Response.json(
      {
        error:
          "Please sign up to use Agine Chat. agineCloud models run on community donated resources.",
      },
      { status: 401 }
    );
  }

  if (PREMIUM_MODELS.has(apiSettings.model) && !isPaidTier) {
    return Response.json(
      {
        error: `The model "${apiSettings.model}" is only available on the paid tier. Please upgrade at /pricing.`,
      },
      { status: 403 }
    );
  }

  if (knowledgeContext) {
    if (!isPaidTier) {
      return Response.json(
        { error: "Chess Knowledge Cards are a paid feature. Please upgrade at /pricing." },
        { status: 403 }
      );
    }
    const contextBytes = new TextEncoder().encode(knowledgeContext).length;
    if (contextBytes > MAX_KNOWLEDGE_BYTES) {
      return Response.json(
        { error: "Knowledge context exceeds the maximum allowed size." },
        { status: 400 }
      );
    }
  }

  const augmentedMessages = knowledgeContext
    ? [
        {
          role: "system" as const,
          content: [
            "## Chess Knowledge Cards",
            "The user has provided the following reference material. Use it to inform your responses where relevant.",
            "",
            knowledgeContext,
          ].join("\n"),
        },
        ...messages,
      ]
    : messages;

  const requestContext = new RequestContext();
  requestContext.set("model", apiSettings.model);
  requestContext.set("isPaidTier", isPaidTier);
  requestContext.set("userId", userId);
  requestContext.set("messages", augmentedMessages); 

  const lang = req.headers.get("Accept-Language")?.split(",")[0] ?? "English";
  requestContext.set("lang", lang);

  const agent = mastra.getAgent("chessAgine");

  const stream = await agent.stream(augmentedMessages, { requestContext });


  if (isPaidTier && userId) {
    const inputText = augmentedMessages
      .map((m: { content: any }) =>
        typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      )
      .join(" ");
    const estimatedInputTokens = Math.ceil(inputText.length / 4);
    recordTokenUsage(userId, estimatedInputTokens);
  }

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }) as any,
  });
}