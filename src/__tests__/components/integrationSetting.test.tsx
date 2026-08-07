/**
 * Covers the "free tier now supports BYOK ... as well as integrations api
 * keys" requirement: ChessboardMagic / OpenRouter / Anthropic / Gemini
 * fields must all be enabled (not paid-only) for signed-in free-tier users.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import IntegrationSettings from "@/componets/tabs/IntegrationSetting";

jest.mock("@clerk/nextjs", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/componets/lichess/LichessConnectButton", () => ({
  __esModule: true,
  default: () => <div data-testid="lichess-connect" />,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require("@clerk/nextjs");

afterEach(() => {
  jest.restoreAllMocks();
});

it("prompts sign-in when signed out, without showing any key fields", () => {
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: false, has: () => false });
  render(<IntegrationSettings />);

  expect(screen.getByText(/sign in for api integrations/i)).toBeInTheDocument();
  expect(screen.queryByPlaceholderText(/sk-or-/i)).not.toBeInTheDocument();
});

it.each([
  ["ChessboardMagic API Token", "enter your token"],
  ["OpenRouter API Key", "sk-or-..."],
  ["Anthropic API Key", "your own claude key."],
  ["Google Gemini API Key", "your own gemini key"],
])("enables the %s field for a signed-in free-tier user (no paid lock)", (label, placeholder) => {
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  render(<IntegrationSettings />);

  const field = screen.getByPlaceholderText(placeholder);
  expect(field).toBeEnabled();
});

it("does not show any 'Paid Only' lock chip on key fields for a free-tier user", () => {
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  render(<IntegrationSettings />);

  expect(screen.queryByText(/paid only/i)).not.toBeInTheDocument();
});
