
import React from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ThreadPrimitive,
  MessagePrimitive,
  ErrorPrimitive,
  ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";

const GenericToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  args,
  result,
}) => (
  <div data-testid={`tool-call-${toolName}`}>
    <span data-testid="tool-args">{JSON.stringify(args)}</span>
    <span data-testid="tool-result">{JSON.stringify(result)}</span>
  </div>
);

export interface ChatHarnessProps {
  /** Mirrors the `body` callback src/app/chat/page.tsx passes to AssistantChatTransport. */
  body?: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  api?: string;
}

export function ChatHarness({ body, api = "/api/chat" }: ChatHarnessProps) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api,
      body: body ?? (() => ({ apiSettings: { model: "openrouter/free" } })),
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Messages
          components={{
            UserMessage: () => (
              <div data-testid="user-msg">
                <MessagePrimitive.Parts />
              </div>
            ),
            AssistantMessage: () => (
              <div data-testid="assistant-msg">
                <MessagePrimitive.Parts
                  components={{ tools: { Fallback: GenericToolFallback } }}
                />
                <MessagePrimitive.Error>
                  <ErrorPrimitive.Root data-testid="assistant-error">
                    <ErrorPrimitive.Message data-testid="assistant-error-message" />
                  </ErrorPrimitive.Root>
                </MessagePrimitive.Error>
              </div>
            ),
            EditComposer: () => null,
          }}
        />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input data-testid="composer-input" />
        <ComposerPrimitive.Send data-testid="composer-send">
          Send
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
