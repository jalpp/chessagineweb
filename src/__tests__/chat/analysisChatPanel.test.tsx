/**
 * Integration tests for AnalysisChatPanel — the compact, toggleable
 * "Chat" section in AgineAnalysisView (game review + position pages).
 *
 * Runs through the REAL @assistant-ui/react + @assistant-ui/react-ai-sdk
 * stack against a mocked fetch (see helpers.ts), same approach as
 * chatIntegration.test.tsx, so it exercises the actual runtime wiring —
 * not just the component in isolation.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { buildTextResponse } from "./helpers";
import AnalysisChatPanel from "@/componets/chat/AnalysisChatPanel";

jest.mock("@clerk/nextjs", () => ({
  useAuth: jest.fn(),
  useClerk: jest.fn(),
}));

jest.mock("@/componets/tabs/ModelSetting", () => ({
  __esModule: true,
  default: () => <div data-testid="model-setting" />,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth, useClerk } = require("@clerk/nextjs");

const START_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

function mockFetchOnce(handler: (url: string, init: any) => Response) {
  const fetchMock = jest.fn(async (url: any, init: any) => handler(String(url), init));
  (global as any).fetch = fetchMock;
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true });
  (useClerk as jest.Mock).mockReturnValue({ openSignIn: jest.fn() });
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

it("sends the board context (FEN + engine lines) alongside a typed message", async () => {
  const user = userEvent.setup();
  const fetchMock = mockFetchOnce(() => buildTextResponse("Central pawn tension, good square for the knight."));

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

  await waitFor(() => {
    expect(screen.getByText(/central pawn tension/i)).toBeInTheDocument();
  });
});

it("includes game-mode context (PGN, move history) only when in game mode", async () => {
  const user = userEvent.setup();
  const fetchMock = mockFetchOnce(() => buildTextResponse("Nf3 develops and prepares to castle."));

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
  mockFetchOnce(() => buildTextResponse("Nf3 develops toward the center."));
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
  mockFetchOnce(() => buildTextResponse("This is an isolated queen's pawn structure."));

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
