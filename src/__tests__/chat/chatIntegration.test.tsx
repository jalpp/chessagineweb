/**
 * Integration tests for the assistant-ui <-> AI SDK wiring used by
 * src/app/chat/page.tsx and src/components/thread.tsx.
 *
 * Kept intentionally small — this project transforms assistant-ui's
 * ESM dependency tree through ts-jest, which is inherently slower
 * than the plain Node `unit` project. Run with:
 *   npx jest --selectProjects chat-integration
 *
 * These render through the REAL installed `@assistant-ui/react`,
 * `@assistant-ui/react-ai-sdk`, and `ai` packages against a mocked
 * `fetch` that returns a genuine `ai`-package UI-message stream (see
 * helpers.ts), so a dependency-version mismatch in this stack shows
 * up here the same way it would in the browser.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";

import { ChatHarness } from "./harness";
import { buildTextResponse } from "./helpers";
import { ThreadSidebar } from "@/components/threadSidebar";

function mockFetchOnce(handler: (url: string, init: any) => Response) {
  const fetchMock = jest.fn(async (url: any, init: any) => handler(String(url), init));
  (global as any).fetch = fetchMock;
  return fetchMock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

// Regression test for the v0.7.9.2 "typing/sending doesn't work"
// break: a nested @assistant-ui/react-ai-sdk@1.4.2 pulled ai@7 into
// a project still on ai@6, and the client-side stream reader
// silently failed to consume the server's response — fetch fired, a
// run started, but the assistant bubble never filled in.
it("sends a typed message and renders the streamed assistant reply", async () => {
  const user = userEvent.setup();
  const fetchMock = mockFetchOnce(() =>
    buildTextResponse("The knight fork wins material."),
  );
  render(<ChatHarness />);

  const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
  await user.click(input);
  await user.type(input, "analyze this position");
  await user.click(screen.getByTestId("composer-send"));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("user-msg")).toHaveTextContent(
    "analyze this position",
  );
  await waitFor(() => {
    expect(screen.getByTestId("assistant-msg")).toHaveTextContent(
      "The knight fork wins material.",
    );
  });
});

// Regression test for the "requires an AuiProvider" crash caused by
// a dual @assistant-ui/core install (@assistant-ui/react-markdown's
// floating "^0.14.0" range silently resolved to a patch that raised
// its peer requirement to @assistant-ui/react@^0.15.0). Renders the
// real ThreadSidebar component — the exact component/stack from the
// bug report — inside AssistantRuntimeProvider.
it("renders ThreadSidebar without an AuiProvider context error", () => {
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

  expect(() => render(<SidebarHarness />)).not.toThrow();
  expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
});
