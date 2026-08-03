import { sanitizeTrailingAssistantMessage } from "../sanitizeMessages";

describe("sanitizeTrailingAssistantMessage", () => {
  it("leaves a conversation ending on a user message untouched", () => {
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "analyze this" },
    ];
    expect(sanitizeTrailingAssistantMessage(messages)).toEqual(messages);
  });

  it("appends a synthetic user 'Continue.' message when the conversation ends on assistant", () => {
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello, how can I help?" },
    ];
    const result = sanitizeTrailingAssistantMessage(messages);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ role: "user", content: "Continue." });
  });

  it("skips trailing system messages when checking the last role", () => {
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "system", content: "reminder: be concise" },
    ];
    const result = sanitizeTrailingAssistantMessage(messages);
    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ role: "user", content: "Continue." });
  });

  it("does not mutate the original messages array", () => {
    const messages = [{ role: "assistant", content: "hi" }];
    const original = [...messages];
    sanitizeTrailingAssistantMessage(messages);
    expect(messages).toEqual(original);
  });

  it("handles an empty message list without throwing", () => {
    expect(sanitizeTrailingAssistantMessage([])).toEqual([]);
  });
});
