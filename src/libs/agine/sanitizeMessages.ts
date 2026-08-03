
export function sanitizeTrailingAssistantMessage(messages: any[]): any[] {
  const msgs = [...messages];
  let lastIdx = msgs.length - 1;
  // Skip trailing system messages (though uncommon at the end)
  while (lastIdx >= 0 && msgs[lastIdx].role === "system") lastIdx--;
  if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
    msgs.push({
      role: "user" as const,
      content: "Continue.",
    });
  }
  return msgs;
}
