import { createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { mastra } from "@/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 200;

const MAX_KNOWLEDGE_BYTES = 160 * 1024;

const PREMIUM_MODELS = [
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "nvidia/nemotron-3-super-120b-a12b",
  "meta-llama/llama-3.1-8b-instruct",
];

export async function POST(req: Request) {
  const { userId, has } = await auth();
  const isAuthenticated = !!userId;
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const { messages, apiSettings, knowledgeContext } = await req.json();

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

  if (knowledgeContext) {
    if (!isPaidTier) {
      return Response.json(
        {
          error:
            "Chess Knowledge Cards are a paid feature. " +
            "Please upgrade your plan at /pricing.",
        },
        { status: 403 },
      );
    }

    const contextBytes = new TextEncoder().encode(knowledgeContext).length;
    if (contextBytes > MAX_KNOWLEDGE_BYTES) {
      return Response.json(
        { error: "Knowledge context exceeds the maximum allowed size." },
        { status: 400 },
      );
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  const requestContext = new RequestContext();
  requestContext.set("model", apiSettings.model);

  // Prepend knowledge as a system message when present
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

  const agent = mastra.getAgent("chessAgine");

  const stream = await agent.stream(augmentedMessages, {
    requestContext,
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }) as any,
  });
}