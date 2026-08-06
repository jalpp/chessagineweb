"use client";

import { useMemo, useRef } from "react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useLocalStorage } from "usehooks-ts";
import {
  AnalysisChatContextInput,
  buildAnalysisChatContext,
} from "@/libs/agine/chatContext";

export interface UseAnalysisChatRuntimeOptions {
  isPaidTier?: boolean;
  getKnowledgeContext?: () => string | null;
}


export function useAnalysisChatRuntime(
  contextInput: AnalysisChatContextInput,
  options: UseAnalysisChatRuntimeOptions = {},
) {
  const contextRef = useRef(contextInput);
  contextRef.current = contextInput;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [savedModel] = useLocalStorage<string>("selected-model", "openrouter/free");
  const [lichessToken] = useLocalStorage<string>("lichess-token", "");
  const [chessboardmagicToken] = useLocalStorage<string>("chessboardmagic-token", "");
  const [openrouterToken] = useLocalStorage<string>("openrouter-token", "");
  const [anthropicToken] = useLocalStorage<string>("anthropic-token", "");
  const [geminiToken] = useLocalStorage<string>("gemini-token", "");

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat",
        body: async () => {
          const boardContext = buildAnalysisChatContext(contextRef.current);
          const { isPaidTier, getKnowledgeContext } = optionsRef.current;
          const knowledgeContext = isPaidTier ? getKnowledgeContext?.() ?? null : null;
          const tokens = {
            ...(lichessToken ? { lichessToken } : {}),
            ...(isPaidTier && chessboardmagicToken ? { chessboardmagicToken } : {}),
            ...(isPaidTier && openrouterToken ? { openrouterToken } : {}),
            ...(anthropicToken ? { anthropicToken } : {}),
            ...(geminiToken ? { geminiToken } : {}),
          };
          return {
            apiSettings: { model: savedModel || "openrouter/free" },
            panelMode: true,
            ...(boardContext ? { boardContext } : {}),
            ...(knowledgeContext ? { knowledgeContext } : {}),
            ...(Object.keys(tokens).length > 0 ? { tokens } : {}),
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedModel, lichessToken, chessboardmagicToken, openrouterToken, anthropicToken, geminiToken],
  );

  return useChatRuntime({ transport });
}

