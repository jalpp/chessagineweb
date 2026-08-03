
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { ThreadSidebar } from "@/components/threadSidebar";

function SidebarHarness() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadSidebar />
    </AssistantRuntimeProvider>
  );
}

test("ThreadSidebar renders without an AuiProvider context error", () => {
  // A dual @assistant-ui/core install throws synchronously during
  // render (inside useAuiState), which React surfaces by rethrowing
  // out of render() — so a clean render() call with no throw is
  // itself the assertion. We additionally assert the "New chat"
  // affordance actually rendered, so a silent empty tree can't pass.
  expect(() => render(<SidebarHarness />)).not.toThrow();
  expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
});
