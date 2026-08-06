/**
 * Integration tests for AnalysisChatPanel — the compact, toggleable
 * "Chat" section in AgineAnalysisView (game review + position pages).
 *
 * Runs through the REAL @assistant-ui/react + @assistant-ui/react-ai-sdk
 * stack against a mocked fetch (see helpers.ts), same approach as
 * chatIntegration.test.tsx, so it exercises the actual runtime wiring —
 * not just the component in isolation.
 *
 * @/context/ThemeContext and @/context/KnowledgeContext are mocked
 * rather than rendered for real: the real ThemeProvider does its own
 * localStorage/MUI-theme/settings-fetch dance that's orthogonal to what
 * this file tests, and the real KnowledgeProvider hits /api/knowledge-cards
 * on mount. Mocking both keeps these tests focused on AnalysisChatPanel's
 * own behavior instead of re-testing those providers.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { buildTextResponse } from "./helpers";
import AnalysisChatPanel from "@/componets/chat/AnalysisChatPanel";
import { chatThemeVars } from "@/libs/setting/helper";

jest.mock("@clerk/nextjs", () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
}));

jest.mock("@/componets/tabs/ModelSetting", () => ({
  __esModule: true,
  default: () => <div data-testid="model-setting" />,
}));

jest.mock("@/componets/tabs/KnowledgePanel", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="knowledge-panel" /> : null,
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@/context/KnowledgeContext", () => ({
  KnowledgeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKnowledge: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth, useClerk } = require("@clerk/nextjs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTheme } = require("@/context/ThemeContext");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useKnowledge } = require("@/context/KnowledgeContext");

const START_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const noKnowledge = {
  selectedIds: new Set<string>(),
  buildKnowledgeContext: () => null,
};

function mockFetchOnce(handler: (url: string, init: any) => Response) {
  const fetchMock = jest.fn(async (url: any, init: any) => handler(String(url), init));
  (global as any).fetch = fetchMock;
  return fetchMock;
}

/** Fetch mock that only answers /api/chat — anything else 404s, so a stray
 *  call to e.g. /api/usage or /api/settings fails loudly instead of being
 *  silently absorbed by a catch-all mock. */
function mockChatFetch(reply: () => Response) {
  return mockFetchOnce((url) => {
    if (url.includes("/api/chat")) return reply();
    return new Response("not mocked", { status: 404 });
  });
}

beforeEach(() => {
  window.localStorage.clear();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true });
  (useClerk as jest.Mock).mockReturnValue({ openSignIn: jest.fn() });
  (useTheme as jest.Mock).mockReturnValue({ currentTheme: "dark", setTheme: jest.fn() });
  (useKnowledge as jest.Mock).mockReturnValue(noKnowledge);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("shows a sign-in gate and no composer when signed out", () => {
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: false });
  render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

  expect(screen.getByText(/sign in to chat with agine/i)).toBeInTheDocument();
  expect(screen.queryByPlaceholderText(/ask agine about this/i)).not.toBeInTheDocument();
});

it("sends the board context (FEN + engine lines) alongside a typed message, and marks the request as panel mode", async () => {
  const user = userEvent.setup();
  const fetchMock = mockChatFetch(() => buildTextResponse("Central pawn tension, good square for the knight."));

  render(
    <AnalysisChatPanel
      mode="position"
      fen={START_FEN}
      stockfishLines={["Line 1: +0.32 - e4 e5 Nf3"]}
    />,
  );

  const input = screen.getByPlaceholderText(/ask agine about this/i);
  await user.click(input);
  await user.type(input, "what's the plan here?");
  await user.keyboard("{Enter}");

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body as string);

  expect(body.boardContext).toContain(START_FEN);
  expect(body.boardContext).toContain("Line 1: +0.32 - e4 e5 Nf3");
  expect(body.apiSettings.model).toBeTruthy();
  // Tells the API route to build the agent with the restricted "panel"
  // ToolMode (no board/game-loading render tools — see
  // src/mastra/agents/toolMode.ts) instead of the standalone chat page's
  // full tool set.
  expect(body.panelMode).toBe(true);

  await waitFor(() => {
    expect(screen.getByText(/central pawn tension/i)).toBeInTheDocument();
  });
});

it("includes game-mode context (PGN, move history) only when in game mode", async () => {
  const user = userEvent.setup();
  const fetchMock = mockChatFetch(() => buildTextResponse("Nf3 develops and prepares to castle."));

  render(
    <AnalysisChatPanel
      mode="game"
      fen={START_FEN}
      pgn="1. e4 e5 2. Nf3"
      moveHistorySan={["e4", "e5"]}
      currentPly={2}
      currentMoveSan="e5"
      currentMoveQuality="Book"
    />,
  );

  const input = screen.getByPlaceholderText(/ask agine about this/i);
  await user.click(input);
  await user.type(input, "why is Nf3 good?");
  await user.keyboard("{Enter}");

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body as string);

  expect(body.boardContext).toContain("Reviewing a game");
  expect(body.boardContext).toContain("1. e4 e5 2. Nf3");
  expect(body.boardContext).toContain("Moves so far: e4 e5");
  expect(body.boardContext).toContain("Move just played: e5 (Book)");
});

it("shows an 'Add to notation' action on assistant replies when onInsertAnnotation is provided, and calls it with the reply text", async () => {
  const user = userEvent.setup();
  mockChatFetch(() => buildTextResponse("Nf3 develops toward the center."));
  const onInsertAnnotation = jest.fn();

  render(
    <AnalysisChatPanel
      mode="game"
      fen={START_FEN}
      pgn="1. e4 e5 2. Nf3"
      onInsertAnnotation={onInsertAnnotation}
    />,
  );

  const input = screen.getByPlaceholderText(/ask agine about this/i);
  await user.click(input);
  await user.type(input, "why Nf3?");
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(screen.getByText(/nf3 develops toward the center/i)).toBeInTheDocument();
  });

  const addButton = await screen.findByRole("button", { name: /add this to the move's notation/i });
  await user.click(addButton);

  expect(onInsertAnnotation).toHaveBeenCalledWith(
    expect.stringContaining("Nf3 develops toward the center."),
  );
});

it("does not show an 'Add to notation' action when onInsertAnnotation is not provided (e.g. position page)", async () => {
  const user = userEvent.setup();
  mockChatFetch(() => buildTextResponse("This is an isolated queen's pawn structure."));

  render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

  const input = screen.getByPlaceholderText(/ask agine about this/i);
  await user.click(input);
  await user.type(input, "what's the pawn structure?");
  await user.keyboard("{Enter}");

  await waitFor(() => {
    expect(screen.getByText(/isolated queen's pawn structure/i)).toBeInTheDocument();
  });

  expect(
    screen.queryByRole("button", { name: /add this to the move's notation/i }),
  ).not.toBeInTheDocument();
});

describe("theme adaptation", () => {
  it("applies the dark theme's CSS variables so message text isn't black-on-dark", () => {
    (useTheme as jest.Mock).mockReturnValue({ currentTheme: "dark", setTheme: jest.fn() });
    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

    const themeRoot = screen.getByTestId("chat-theme-root");
    const darkVars = chatThemeVars.dark as Record<string, string>;
    expect(themeRoot).toHaveStyle({ "--foreground": darkVars["--foreground"] });
    expect(themeRoot).toHaveStyle({ "--background": darkVars["--background"] });
  });

  it("applies the light theme's CSS variables when that's the active theme", () => {
    (useTheme as jest.Mock).mockReturnValue({ currentTheme: "light", setTheme: jest.fn() });
    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

    const themeRoot = screen.getByTestId("chat-theme-root");
    const lightVars = chatThemeVars.light as Record<string, string>;
    expect(themeRoot).toHaveStyle({ "--foreground": lightVars["--foreground"] });
  });
});

describe("usage progress (paid tier parity with the chat page)", () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => true });
  });

  it("shows the daily usage bar for paid-tier users", async () => {
    mockFetchOnce((url) => {
      if (url.includes("/api/usage")) {
        return new Response(
          JSON.stringify({ tokens: 500, costUSD: 1.5, limitHit: false, warning: false, budgetUSD: 5 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not mocked", { status: 404 });
    });

    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

    await waitFor(() => {
      expect(screen.getByText(/30% daily/i)).toBeInTheDocument();
    });
  });

  it("shows a limit-hit message once the daily budget is exhausted", async () => {
    mockFetchOnce((url) => {
      if (url.includes("/api/usage")) {
        return new Response(
          JSON.stringify({ tokens: 900, costUSD: 5, limitHit: true, warning: true, budgetUSD: 5 }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not mocked", { status: 404 });
    });

    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

    await waitFor(() => {
      expect(screen.getByText(/daily limit reached/i)).toBeInTheDocument();
    });
  });

  it("does not show the usage bar for free-tier users", () => {
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);
    expect(screen.queryByText(/% daily/i)).not.toBeInTheDocument();
  });
});

describe("knowledge card picker (paid tier parity with the chat page)", () => {
  it("shows the knowledge icon with a selection badge for paid-tier users, and opens the picker on click", async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => true });
    (useKnowledge as jest.Mock).mockReturnValue({
      selectedIds: new Set(["card-1", "card-2"]),
      buildKnowledgeContext: () => "card 1 content\n\ncard 2 content",
    });

    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);

    expect(screen.getByText("2")).toBeInTheDocument(); // badge count
    expect(screen.queryByTestId("knowledge-panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /chess knowledge cards/i }));
    expect(screen.getByTestId("knowledge-panel")).toBeInTheDocument();
  });

  it("sends selected knowledge card content as knowledgeContext for paid-tier users", async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => true });
    (useKnowledge as jest.Mock).mockReturnValue({
      selectedIds: new Set(["card-1"]),
      buildKnowledgeContext: () => "The Sicilian Defense: 1.e4 c5, sharp and combative.",
    });
    const fetchMock = mockChatFetch(() => buildTextResponse("Good line against the Sicilian."));

    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);
    const input = screen.getByPlaceholderText(/ask agine about this/i);
    await user.click(input);
    await user.type(input, "what should I play?");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      const chatCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/chat"));
      expect(chatCall).toBeDefined();
    });
    const chatCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/chat"))!;
    const body = JSON.parse(chatCall[1].body as string);
    expect(body.knowledgeContext).toContain("Sicilian Defense");
  });  it("does not show the knowledge icon for free-tier users", () => {
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
    (useKnowledge as jest.Mock).mockReturnValue({
      selectedIds: new Set(["card-1"]),
      buildKnowledgeContext: () => "should not be used on free tier",
    });
    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);
    expect(screen.queryByRole("button", { name: /chess knowledge cards/i })).not.toBeInTheDocument();
  });

  it("does not send knowledgeContext for free-tier users even if cards are selected", async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
    (useKnowledge as jest.Mock).mockReturnValue({
      selectedIds: new Set(["card-1"]),
      buildKnowledgeContext: () => "should not be sent on free tier",
    });
    const fetchMock = mockChatFetch(() => buildTextResponse("Sure, here's an idea."));

    render(<AnalysisChatPanel mode="position" fen={START_FEN} />);
    const input = screen.getByPlaceholderText(/ask agine about this/i);
    await user.click(input);
    await user.type(input, "what should I play?");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.knowledgeContext).toBeUndefined();
  });
});
