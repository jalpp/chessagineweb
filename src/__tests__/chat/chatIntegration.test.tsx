
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { ChatHarness } from "./harness";
import { buildTextResponse, buildAgentResponse, buildErrorResponse } from "./helpers";

function mockFetchOnce(handler: (url: string, init: any) => Response) {
  const fetchMock = jest.fn(async (url: any, init: any) => handler(String(url), init));
  (global as any).fetch = fetchMock;
  return fetchMock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("composer text input", () => {
  it("accepts typed keystrokes into the message textarea", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() => buildTextResponse("unused"));
    render(<ChatHarness />);

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "what's the best move here?");

    expect(input.value).toBe("what's the best move here?");
  });

  it("clears the composer once a message is sent", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() => buildTextResponse("A reply."));
    render(<ChatHarness />);

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "hello");
    await user.click(screen.getByTestId("composer-send"));

    await waitFor(() => expect(input.value).toBe(""));
  });
});

describe("send -> stream -> render round trip", () => {
  it("renders the streamed assistant text after a typed send", async () => {
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

  it("re-enables the composer (isRunning clears) once the stream finishes", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() => buildTextResponse("Done."));
    render(<ChatHarness />);

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "hi");
    await user.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      expect(screen.getByTestId("assistant-msg")).toHaveTextContent("Done.");
    });

    // Send is disabled while the composer is empty regardless of run
    // state, so prove the run really finished (isRunning cleared) by
    // typing a follow-up and confirming Send becomes clickable again
    // instead of staying stuck from the previous run.
    await user.type(input, "follow up");
    await waitFor(() => {
      const sendBtn = screen.getByTestId("composer-send") as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(false);
    });
  });

  it("sends the request body assembled by the transport's body() callback", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchOnce(() => buildTextResponse("ok"));
    render(
      <ChatHarness
        body={() => ({
          apiSettings: { model: "anthropic/claude-sonnet-5" },
          tokens: { lichessToken: "test-token" },
        })}
      />,
    );

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "review my last game");
    await user.click(screen.getByTestId("composer-send"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.apiSettings).toEqual({ model: "anthropic/claude-sonnet-5" });
    expect(body.tokens).toEqual({ lichessToken: "test-token" });
    expect(body.messages[0].parts[0]).toEqual({
      type: "text",
      text: "review my last game",
    });
  });
});

describe("MCP / agent tool-call rendering", () => {
  it("renders a tool call's input and output when the agent invokes an MCP tool", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() =>
      buildAgentResponse([
        {
          type: "tool-call",
          toolName: "get-stockfish-analysis",
          input: { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
          output: { bestMove: "e4", evaluation: 0.3 },
        },
        { type: "text", text: "Stockfish likes 1.e4 here." },
      ]),
    );
    render(<ChatHarness />);

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "/stockfish");
    await user.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      expect(
        screen.getByTestId("tool-call-get-stockfish-analysis"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("tool-result")).toHaveTextContent("e4");

    await waitFor(() => {
      expect(screen.getByTestId("assistant-msg")).toHaveTextContent(
        "Stockfish likes 1.e4 here.",
      );
    });
  });
});

describe("error responses from /api/chat", () => {
  it("surfaces a 401 (not signed in) response as a run error, not a silent hang", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() =>
      buildErrorResponse(401, "Please sign up to use Agine Chat."),
    );
    render(<ChatHarness />);

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "hello");
    await user.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      expect(screen.getByTestId("assistant-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("assistant-error-message")).toHaveTextContent(
      "Please sign up to use Agine Chat.",
    );

    // The composer must recover so the person can try again — it
    // must not stay stuck in the "run in progress" state.
    await user.type(input, "retry");
    await waitFor(() => {
      const sendBtn = screen.getByTestId("composer-send") as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(false);
    });
  });

  it("surfaces a 403 (premium model gate) response as a run error", async () => {
    const user = userEvent.setup();
    mockFetchOnce(() =>
      buildErrorResponse(
        403,
        'The model "anthropic/claude-opus-4-8" is only available on the paid tier.',
      ),
    );
    render(<ChatHarness />);

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.click(input);
    await user.type(input, "hello");
    await user.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      expect(screen.getByTestId("assistant-error")).toBeInTheDocument();
    });
  });
});
