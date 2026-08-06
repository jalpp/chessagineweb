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

/**
 * Wires up an assistant-ui chat runtime for the embedded "Chat" analysis
 * panel (see AnalysisChatPanel). Reuses the same /api/chat route and
 * model/token settings as the full chat page, but additionally sends a
 * `boardContext` string built from whatever FEN/PGN/engine-line state the
 * host page (game or position) currently has — so the agent can answer
 * questions about "this move" or "this position" without first having to
 * call an MCP tool to find out what it is.
 *
 * `contextInput` is read via a ref so the transport (created once) always
 * sees the latest board state at send-time without needing to be torn
 * down and recreated on every engine tick.
 */
export function useAnalysisChatRuntime(contextInput: AnalysisChatContextInput) {
  const contextRef = useRef(contextInput);
  contextRef.current = contextInput;

  const [savedModel] = useLocalStorage<string>("selected-model", "openrouter/free");
  const [lichessToken] = useLocalStorage<string>("lichess-token", "");
  const [openrouterToken] = useLocalStorage<string>("openrouter-token", "");
  const [anthropicToken] = useLocalStorage<string>("anthropic-token", "");
  const [geminiToken] = useLocalStorage<string>("gemini-token", "");

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat",
        body: async () => {
          const boardContext = buildAnalysisChatContext(contextRef.current);
          const tokens = {
            ...(lichessToken ? { lichessToken } : {}),
            ...(openrouterToken ? { openrouterToken } : {}),
            ...(anthropicToken ? { anthropicToken } : {}),
            ...(geminiToken ? { geminiToken } : {}),
          };
          return {
            apiSettings: { model: savedModel || "openrouter/free" },
            ...(boardContext ? { boardContext } : {}),
            ...(Object.keys(tokens).length > 0 ? { tokens } : {}),
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedModel, lichessToken, openrouterToken, anthropicToken, geminiToken],
  );

  return useChatRuntime({ transport });
}
