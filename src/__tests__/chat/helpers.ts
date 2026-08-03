
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  createUIMessageStream,
  createUIMessageStreamResponse,
} = require("ai");

export type FakeChunk =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolName: string; input: unknown; output: unknown }
  | { type: "error"; errorText: string };

/**
 * Builds a real ai-package UI-message-stream Response, in the shape
 * the mastra `toAISdkStream` + `createUIMessageStreamResponse` pipeline
 * in src/app/api/chat/route.ts actually produces.
 */
export function buildAgentResponse(chunks: FakeChunk[]): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }: any) => {
      writer.write({ type: "start" });
      let textId = 0;
      let toolCallId = 0;
      for (const chunk of chunks) {
        if (chunk.type === "text") {
          const id = String(textId++);
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: chunk.text });
          writer.write({ type: "text-end", id });
        } else if (chunk.type === "tool-call") {
          const id = `call_${toolCallId++}`;
          writer.write({
            type: "tool-input-available",
            toolCallId: id,
            toolName: chunk.toolName,
            input: chunk.input,
          });
          writer.write({
            type: "tool-output-available",
            toolCallId: id,
            output: chunk.output,
          });
        } else if (chunk.type === "error") {
          writer.write({ type: "error", errorText: chunk.errorText });
        }
      }
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/** A single plain-text assistant reply, for the common-case tests. */
export function buildTextResponse(text: string): Response {
  return buildAgentResponse([{ type: "text", text }]);
}

/**
 * A 400/401/403-style JSON error response, matching the shape
 * src/app/api/chat/route.ts returns for auth/plan/limit failures
 * (Response.json({ error: "..." }, { status })).
 */
export function buildErrorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
