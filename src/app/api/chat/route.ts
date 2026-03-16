import { createUIMessageStreamResponse } from "ai";
import { toAISdkStream } from "@mastra/ai-sdk";
import { mastra } from "@/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  const { messages, apiSettings } = await req.json();

  if (!apiSettings?.provider || !apiSettings?.model) {
    return Response.json(
      { error: "API settings are required (provider, model)" },
      { status: 400 }
    );
  }

  if (apiSettings.provider === "agineCloud" && !isAuthenticated) {
    return Response.json(
      { error: "Please sign up to use agineCloud models. You need an account because agineCloud models run on community donated resources. You can optionally direct insert an API key for Google, OpenAI, Anthropic in chat settings or run models locally via Ollama. You can read more about set up in docs page." },
      { status: 401 }
    );
  }

  if (
    ["anthropic", "google", "openai"].includes(apiSettings.provider) &&
    !apiSettings.apiKey
  ) {
    return Response.json(
      { error: "API key is required for this provider" },
      { status: 400 }
    );
  }

  if (
    apiSettings.provider === "ollama" &&
    (!apiSettings.ollamaBaseUrl ||
      !/^http:\/\/.+/i.test(apiSettings.ollamaBaseUrl))
  ) {
    return Response.json(
      { error: "Ollama base ngrok endpoint required and must be a valid http:// URL. Please set up the URL by reading chessAgine docs" },
      { status: 400 }
    );
  }

  const requestContext = new RequestContext();
  requestContext.set("provider", apiSettings.provider);
  requestContext.set("model", apiSettings.model);
  requestContext.set("apiKey", apiSettings.apiKey || "");
  requestContext.set("mode", "question");
  requestContext.set("isRouted", apiSettings.isRouted ?? false);
  requestContext.set("lang", apiSettings.language || "English");

  if (apiSettings.provider === "ollama" && apiSettings.ollamaBaseUrl) {
    requestContext.set("ollamaBaseUrl", apiSettings.ollamaBaseUrl);
  }

  const agent = mastra.getAgent("chessAgine");

  const stream = await agent.stream(messages, {
    requestContext,
  });

  return createUIMessageStreamResponse({
    stream: toAISdkStream(stream, { from: "agent" }) as any,
  });
}