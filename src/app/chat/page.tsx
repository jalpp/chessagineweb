"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/thread";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";
import { chatThemeVars } from "@/libs/setting/helper";
import { useAuth } from "@clerk/nextjs";

export default function ChatPage() {
  const { currentTheme } = useTheme();
  const { getToken } = useAuth();

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
      body: async () => {
        const apiSettings = JSON.parse(
          localStorage.getItem("api-settings") || "{}"
        );
        return {
          apiSettings: {
            provider: apiSettings.provider,
            model: apiSettings.model,
            apiKey: apiSettings.apiKey,
            language: apiSettings.language,
            isRouted: apiSettings.isRouted,
            ollamaBaseUrl: apiSettings.ollamaBaseUrl
              ? `${apiSettings.ollamaBaseUrl}/api`
              : undefined,
          },
        };
      },
      // pass clerk token in headers
      headers: async () => {
        const token = await getToken();
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  });

  const vars = chatThemeVars[currentTheme];

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <TooltipProvider>
        <div style={vars} className="h-screen flex flex-col">
          <Thread />
        </div>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}