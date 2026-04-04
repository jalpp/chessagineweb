// app/api/chat/route.ts
import { createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { mastra } from "@/mastra";
import { resetAgineMcpClient } from "@/mastra/mcp/agineClient";
import { RequestContext } from "@mastra/core/request-context";
import { auth } from "@clerk/nextjs/server";
import {
  classifyQuery,
  resolveModel,
  recordActualSpend,
  getEstimatedSpend,
} from "@/mastra/router";

export const maxDuration = 200;

const MAX_AGENT_STEPS = 15;
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

  // BUG FIX: apiSettings.model can arrive with surrounding quotes from the
  // client (e.g. '"anthropic/claude-sonnet-4.6"'). Strip them once here so
  // every downstream consumer — PREMIUM_MODELS check, resolveModel,
  // RequestContext, cost tracking — always sees a clean model string.
  // Without this the OpenRouter modelId ends up as
  // '"anthropic/claude-sonnet-4.6"@preset/chessagine' which is invalid.
  const selectedModel = apiSettings.model.replace(/^"|"$/g, "");

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

  if (PREMIUM_MODELS.includes(selectedModel) && !isPaidTier) {
    return Response.json(
      {
        error:
          `The model "${selectedModel}" is only available on the paid tier. ` +
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

  const requestContext = new RequestContext();

  let resolvedModel = selectedModel;

  if (isPaidTier && userId) {
    const tier = classifyQuery(messages);
    const estimatedSpend = await getEstimatedSpend(userId);
    const {
      model: routedModel,
      tier: effectiveTier,
      reason,
    } = resolveModel(selectedModel, tier, estimatedSpend);

    resolvedModel = routedModel;

    requestContext.set("model", selectedModel);
    requestContext.set("resolvedModel", resolvedModel);
    requestContext.set("routingTier", effectiveTier);
    requestContext.set("routingReason", reason);
  } else {
    requestContext.set("model", selectedModel + ":free");
    requestContext.set("resolvedModel", selectedModel + ":free");
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

  const agent = mastra.getAgent("chessAgine");

  try {
    const stream = await agent.stream(augmentedMessages, {
      requestContext,
      maxSteps: MAX_AGENT_STEPS,
    });

    if (isPaidTier && userId) {
      const capturedUserId = userId;
      const capturedModel = resolvedModel;
      stream.usage
        .then((usage) => {
          return recordActualSpend(
            capturedUserId,
            capturedModel,
            usage.inputTokens ?? 0,
            usage.outputTokens ?? 0,
          );
        })
        .catch(() => {
          // usage unavailable (e.g. provider didn't return it) — skip recording
        });
    }

    return createUIMessageStreamResponse({
      stream: toAISdkStream(stream, { from: "agent" }) as any,
    });
  } catch (err: any) {
    // BUG FIX: only reset the MCP client for genuine MCP transport/protocol
    // errors, not any error whose message happens to contain "MCP error".
    const isMcpError =
      err?.name === "McpError" ||
      /^MCP (connection|protocol|transport) error/i.test(err?.message ?? "");

    if (isMcpError) {
      resetAgineMcpClient();
    }

    throw err;
  }
}