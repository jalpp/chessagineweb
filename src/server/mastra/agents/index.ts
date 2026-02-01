"use server";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { RequestContext } from "@mastra/core/request-context";
import { createOpenRouter} from "@openrouter/ai-sdk-provider";
import {
  agineEvalGraderPrompt,
  aginePuzzleSystemPrompt,
  agineQuestionMode,
  agineSelfEval,
  agineSystemPrompt,
  chessAgineAnnoPrompt,
} from "./prompt";
import { OpenAIModel, GoogleModel, AnthropicModel, OllamaModel, AgineCloudModel } from "./types";
import { AgineTools } from "../tools";

function createModelFromRouter(requestContext: RequestContext) {
  const provider = requestContext.get("provider") as string;
  const modelName = requestContext.get("model") as string;
  const apiKey = requestContext.get("apiKey") as string;

  const openRouter = createOpenRouter({
    apiKey: apiKey,
  });

  let openRouterName = ''

  if(provider.toLocaleLowerCase() === "anthropic"){
    const spliter = modelName.split("-");
    openRouterName = `${provider}/${spliter[0]}-${spliter[1]}-${spliter[2]}.${spliter[3]}`
  }else{
    openRouterName = `${provider}/${modelName}`;
  }

  return openRouter(openRouterName);
}


function createAgineCloudModel(requestContext: RequestContext) {
  const modelName = requestContext.get("model") as string;


  const apiKey = process.env.AGINE_KEY;

  const agineCloudRouter = createOpenRouter({
    apiKey: apiKey
  })

  if(modelName !== "google/gemini-3-pro-preview"){
      return agineCloudRouter(`${modelName}:free` as AgineCloudModel);
  }

  return agineCloudRouter(modelName as AgineCloudModel);

  
}

function createAgentInstruction(requestContext: RequestContext) {
  const lang = (requestContext.get("lang") as string) || "English";
  const mode = (requestContext.get("mode") as string) || "position";
  const replaceLangKey = '[ENGLISH]';

  switch (mode) {
    case "position":
      return agineSystemPrompt.replace(replaceLangKey, lang);
    case "puzzle":
      return aginePuzzleSystemPrompt.replace(replaceLangKey, lang);
    case "annotation":
      return chessAgineAnnoPrompt.replace(replaceLangKey, lang);
    case "question":
      return agineQuestionMode.replace(replaceLangKey, lang);
    case "selfeval":
      return agineSelfEval.replace(replaceLangKey, lang);
    case "grader":
      return agineEvalGraderPrompt.replace(replaceLangKey, lang);  
    case "chess-gemma-commentary":
      return "Generate professional chess commentary in the specified language. For Type=standard use 30–40 words. For Type=explanation, explain the best move briefly and address the userQuery. (≤50 words). Return exactly: Commentary, Predicted ELO, Verified Classification.";   
    default:
      return agineSystemPrompt.replace(replaceLangKey, lang);
  }
}

function createModelFromContext(requestContext: RequestContext) {
  const provider = requestContext.get("provider") as string;
  const modelName = requestContext.get("model") as string;
  const apiKey = requestContext.get("apiKey") as string;
  const isRouted = requestContext.get("isRouted") as boolean;
  const ollamaBaseUrl = requestContext.get("ollamaBaseUrl") as
    | string
    | undefined;

  if(isRouted && !provider.includes("agineCloud")){
    return createModelFromRouter(requestContext);
  }     

  switch (provider) {
    case "openai":
      const openAi = createOpenAI({
        apiKey: apiKey,
        
      });
      return openAi(modelName as OpenAIModel);

    case "anthropic":
      const claude = createAnthropic({
        apiKey: apiKey,
      });
      return claude(modelName as AnthropicModel);

    case "google":
      const gemini = createGoogleGenerativeAI({
        apiKey: apiKey,
      });
      return gemini(modelName as GoogleModel);

    case "ollama":
      const ollama = createOllama({
        baseURL: ollamaBaseUrl || "http://localhost:11434/api",
      });
      return ollama(modelName as OllamaModel);
    case "agineCloud": 
      return createAgineCloudModel(requestContext);

    default:
      return openai("gpt-4o-mini");
  }
}

function createToolsFromContext(requestContext: RequestContext) {
  const provider = requestContext.get("provider") as string;

  if(provider.includes("agineCloud") || provider.includes("ollama")){
    return {}
  }

  return AgineTools;
}

/* FIXME(mastra): Add a unique `id` parameter. See: https://mastra.ai/guides/migrations/upgrade-to-v1/mastra#required-id-parameter-for-all-mastra-primitives */
export const chessAgine = new Agent({
  id: "chessagine-agent",
  name: "ChessAgine",
  instructions: ({ requestContext }) => createAgentInstruction(requestContext),
  model: ({ requestContext }) => createModelFromContext(requestContext),
  tools: ({requestContext}) => createToolsFromContext(requestContext)
});
