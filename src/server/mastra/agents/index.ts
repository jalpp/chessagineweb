"use server";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { RuntimeContext } from "@mastra/core/di";
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

function createModelFromRouter(runtimeContext: RuntimeContext) {
  const provider = runtimeContext.get("provider") as string;
  const modelName = runtimeContext.get("model") as string;
  const apiKey = runtimeContext.get("apiKey") as string;

  const openRouter = createOpenRouter({
    apiKey: apiKey,
  });

  return openRouter(`${provider}/${modelName}`);
}

function createAgineCloudModel(runtimeContext: RuntimeContext) {
  const modelName = runtimeContext.get("model") as string;


  const apiKey = process.env.AGINE_KEY;

  const agineCloudRouter = createOpenRouter({
    apiKey: apiKey
  })

  if(modelName !== "google/gemini-3-pro-preview"){
      return agineCloudRouter(`${modelName}:free` as AgineCloudModel);
  }

  return agineCloudRouter(modelName as AgineCloudModel);

  
}

function createAgentInstruction(runtimeContext: RuntimeContext) {
  const lang = (runtimeContext.get("lang") as string) || "English";
  const mode = (runtimeContext.get("mode") as string) || "position";

  switch (mode) {
    case "position":
      return agineSystemPrompt.replace("ENGLISH", lang);
    case "puzzle":
      return aginePuzzleSystemPrompt.replace("ENGLISH", lang);
    case "annotation":
      return chessAgineAnnoPrompt.replace("ENGLISH", lang);
    case "question":
      return agineQuestionMode.replace("ENGLISH", lang);
    case "selfeval":
      return agineSelfEval.replace("ENGLISH", lang);
    case "grader":
      return agineEvalGraderPrompt.replace("ENGLISH", lang);  
    case "chess-gemma-commentary":
      return "Generate professional chess commentary in the specified language. For Type=standard use 30–40 words. For Type=explanation, explain the best move briefly and address the userQuery. (≤50 words). Return exactly: Commentary, Predicted ELO, Verified Classification.";   
    default:
      return agineSystemPrompt.replace("ENGLISH", lang);
  }
}

function createModelFromContext(runtimeContext: RuntimeContext) {
  const provider = runtimeContext.get("provider") as string;
  const modelName = runtimeContext.get("model") as string;
  const apiKey = runtimeContext.get("apiKey") as string;
  const isRouted = runtimeContext.get("isRouted") as boolean;
  const ollamaBaseUrl = runtimeContext.get("ollamaBaseUrl") as
    | string
    | undefined;

  if(isRouted && !provider.includes("agineCloud")){
    return createModelFromRouter(runtimeContext);
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
      return createAgineCloudModel(runtimeContext);

    default:
      return openai("gpt-4o-mini");
  }
}

function createToolsFromContext(runtimeContext: RuntimeContext) {
  const provider = runtimeContext.get("provider") as string;

  if(provider.includes("agineCloud") || provider.includes("ollama")){
    return {}
  }

  return AgineTools;
}

export const chessAgine = new Agent({
  name: "ChessAgine",
  instructions: ({ runtimeContext }) => createAgentInstruction(runtimeContext),
  model: ({ runtimeContext }) => createModelFromContext(runtimeContext),
  tools: ({runtimeContext}) => createToolsFromContext(runtimeContext)
});

