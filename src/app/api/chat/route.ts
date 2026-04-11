import { createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { resetAgineMcpClient } from "@/mastra/mcp/agineClient";
import { createChessAgineAgent } from "@/mastra/agents";
import { RequestContext } from "@mastra/core/request-context";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { calculateCost, FREE_FALLBACK_MODEL } from "@/mastra/router";
import {
  getDailyUsage,
  incrementDailyUsage,
  isDailyLimitHit,
} from "@/lib/usage";

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

  const { messages, apiSettings, knowledgeContext, tokens } = await req.json();

  apiSettings.provider = "agineCloud";

  if (!apiSettings?.model) {
    return Response.json(
      { error: "API settings are required (model)" },
      { status: 400 }
    );
  }

  const selectedModel = apiSettings.model.replace(/^"|"$/g, "");

  if (!isAuthenticated) {
    return Response.json(
      {
        error:
          "Please sign up to use Agine Chat. agineCloud models run on community donated resources. " +
          "You can read more about setup on the docs page.",
      },
      { status: 401 }
    );
  }

  if (PREMIUM_MODELS.includes(selectedModel) && !isPaidTier) {
    return Response.json(
      {
        error:
          `The model "${selectedModel}" is only available on the paid tier. ` +
          "Please upgrade your plan at /pricing to access premium models.",
      },
      { status: 403 }
    );
  }

  
  const lichessToken =
    typeof tokens?.lichessToken === "string" && tokens.lichessToken.trim()
      ? tokens.lichessToken.trim()
      : undefined;

 
  const chessboardmagicToken =
    isPaidTier &&
    typeof tokens?.chessboardmagicToken === "string" &&
    tokens.chessboardmagicToken.trim()
      ? tokens.chessboardmagicToken.trim()
      : undefined;


  const personalOpenRouterKey =
    isPaidTier &&
    typeof tokens?.openrouterToken === "string" &&
    tokens.openrouterToken.trim()
      ? tokens.openrouterToken.trim()
      : undefined;

  if (knowledgeContext) {
    if (!isPaidTier) {
      return Response.json(
        {
          error:
            "Chess Knowledge Cards are a paid feature. " +
            "Please upgrade your plan at /pricing.",
        },
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

  let resolvedModel = selectedModel;
  let dailyLimitHit = false;

  if (isPaidTier && userId) {
    const usage = await getDailyUsage(userId);
    dailyLimitHit = isDailyLimitHit(usage);

    if (dailyLimitHit && PREMIUM_MODELS.includes(selectedModel)) {
      // If user has a personal OpenRouter key, keep their chosen model;
      // otherwise fall back to the free fallback model
      resolvedModel = personalOpenRouterKey ? selectedModel : FREE_FALLBACK_MODEL;
    }
  } else if (!isPaidTier) {
    if (!selectedModel.endsWith(":free")) {
      resolvedModel = selectedModel + ":free";
    }
  }

  // Fetch the Lichess username from Clerk public metadata (set during OAuth connect)
  let lichessUsername: string | undefined;
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const raw = user.publicMetadata?.lichessUsername;
      if (typeof raw === "string" && raw.trim()) {
        lichessUsername = raw.trim();
      }
    } catch {
      // Non-critical — agent still works without it
    }
  }

  const requestContext = new RequestContext();
  requestContext.set("model", resolvedModel);
  requestContext.set("resolvedModel", resolvedModel);
  requestContext.set("dailyLimitHit", dailyLimitHit);
  if (personalOpenRouterKey) {
    requestContext.set("personalOpenRouterKey", personalOpenRouterKey);
  }
  const systemParts: string[] = [];

  if (lichessUsername) {
    systemParts.push(
      "## Lichess Username",
      `The user's Lichess username is "${lichessUsername}". Use this automatically when fetching their games, studies, or any Lichess data, do not ask them for their username.`
    );
  }

  if (knowledgeContext) {
    systemParts.push(
      "## Chess Knowledge Cards",
      "The user has provided the following reference material. Use it to inform your responses where relevant.",
      "",
      knowledgeContext
    );
  }

  const augmentedMessages =
    systemParts.length > 0
      ? [{ role: "system" as const, content: systemParts.join("\n") }, ...messages]
      : messages;

 
  const agent = await createChessAgineAgent(
    { lichessToken, chessboardmagicToken },
    isPaidTier
  );

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
          const cost = calculateCost(
            capturedModel,
            usage.inputTokens ?? 0,
            usage.outputTokens ?? 0
          );
          const totalTokens =
            (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
          return incrementDailyUsage(capturedUserId, totalTokens, cost);
        })
        .catch(() => {
          // Usage unavailable — skip recording
        });
    }

    const responseHeaders: Record<string, string> = {};
    if (dailyLimitHit) {
      responseHeaders["X-Daily-Limit-Hit"] = "true";
      responseHeaders["X-Resolved-Model"] = resolvedModel;
    }

    return createUIMessageStreamResponse({
      stream: toAISdkStream(stream, { from: "agent" }) as any,
      headers: responseHeaders,
    });
  } catch (err: any) {
    const isMcpError =
      err?.name === "McpError" ||
      /^MCP (connection|protocol|transport) error/i.test(err?.message ?? "");

    if (isMcpError) {
      resetAgineMcpClient();
    }

    throw err;
  }
}