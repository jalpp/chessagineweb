/**
 * Covers two things:
 *  - "free tier now supports BYOK": free-tier users can select and save
 *    BYO-key models (given their key is configured) but are still locked
 *    out of AgineCloud PREMIUM_MODELS.
 *  - "gift model" (qwen/qwen3-coder-next): free on every tier, no key or
 *    upgrade needed, and the default model for new users.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import ModelSetting from "@/componets/tabs/ModelSetting";
import { PREMIUM_MODELS, GIFT_MODEL, FREE_ROUTER_MODEL } from "@/libs/agine/modelConstants";

jest.mock("@clerk/nextjs", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/context/SettingContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/componets/lichess/LichessConnectButton", () => ({
  __esModule: true,
  default: () => <div data-testid="lichess-connect" />,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require("@clerk/nextjs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useSettings } = require("@/context/SettingContext");

function mockSettings(selectedModel: string) {
  const saveSettings = jest.fn();
  (useSettings as jest.Mock).mockReturnValue({
    selectedModel,
    saveSettings,
  });
  return saveSettings;
}

/** The model's exact-text option in the open Select listbox — scoped to the
 *  listbox itself (not the whole document), since the same model slug can
 *  also appear in the IntegrationSettings copy rendered below the Select
 *  (e.g. "claude-sonnet-5" in the Anthropic key field description). MUI
 *  renders the model name as its own Typography leaf, with any
 *  lock/premium/BYO chip as a sibling, so exact-text lookup within the
 *  listbox avoids matching a chip label or a different model that happens
 *  to share a prefix (e.g. "qwen/qwen3-coder-next" vs "qwen/qwen3-coder-next:user"). */
function findOption(model: string) {
  const listbox = screen.getByRole("listbox");
  const label = within(listbox).getByText(model, { exact: true });
  const option = label.closest('[role="option"]');
  if (!option) throw new Error(`No option ancestor found for "${model}"`);
  return option as HTMLElement;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("defaults a signed-in free-tier user to the gift model (qwen3-coder-next), not a locked one", () => {
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  mockSettings(GIFT_MODEL);

  render(<ModelSetting />);

  expect(screen.getByRole("combobox")).toHaveTextContent(GIFT_MODEL);
});

it.each([
  { tier: "free", has: () => false },
  { tier: "paid", has: () => true },
])("shows the gift model as selectable (not disabled) on the $tier tier", async ({ has }) => {
  const user = userEvent.setup();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has });
  mockSettings(GIFT_MODEL);

  render(<ModelSetting />);
  await user.click(screen.getByRole("combobox"));

  expect(findOption(GIFT_MODEL)).not.toHaveAttribute("aria-disabled", "true");
});

it("lets a free-tier user save the gift model with no key and no upgrade needed", async () => {
  const user = userEvent.setup();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  const saveSettings = mockSettings(FREE_ROUTER_MODEL);

  render(<ModelSetting />);

  await user.click(screen.getByRole("combobox"));
  await user.click(findOption(GIFT_MODEL));
  await user.click(screen.getAllByRole("button", { name: /^save$/i })[0]);

  await waitFor(() => {
    expect(saveSettings).toHaveBeenCalledWith({ selected_model: GIFT_MODEL });
  });
  expect(screen.queryByText(/only available on the paid tier/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/requires your own/i)).not.toBeInTheDocument();
});

it("lets a free-tier user save a BYO-key model once their key is configured (no upgrade required)", async () => {
  const user = userEvent.setup();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  const saveSettings = mockSettings(GIFT_MODEL);
  window.localStorage.setItem("anthropic-token", JSON.stringify("sk-ant-my-own-key"));

  render(<ModelSetting />);

  await user.click(screen.getByRole("combobox"));
  await user.click(findOption("claude-sonnet-5"));
  await user.click(screen.getAllByRole("button", { name: /^save$/i })[0]);

  await waitFor(() => {
    expect(saveSettings).toHaveBeenCalledWith({ selected_model: "claude-sonnet-5" });
  });
  expect(screen.queryByText(/only available on the paid tier/i)).not.toBeInTheDocument();
});

it("blocks saving a BYO-key model on the free tier when no key is configured yet", async () => {
  const user = userEvent.setup();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  mockSettings(GIFT_MODEL);

  render(<ModelSetting />);

  await user.click(screen.getByRole("combobox"));
  await user.click(findOption("claude-sonnet-5"));
  await user.click(screen.getAllByRole("button", { name: /^save$/i })[0]);

  await waitFor(() => {
    expect(screen.getByText(/requires your own anthropic key/i)).toBeInTheDocument();
  });
});

it.each(PREMIUM_MODELS)(
  "still keeps the AgineCloud premium model %s locked behind the paid tier",
  async (model) => {
    (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
    mockSettings(GIFT_MODEL);

    render(<ModelSetting />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));

    expect(findOption(model)).toHaveAttribute("aria-disabled", "true");
  },
);

it("shows a BYO-key model as selectable (not disabled) for a free-tier user", async () => {
  const user = userEvent.setup();
  (useAuth as jest.Mock).mockReturnValue({ isSignedIn: true, has: () => false });
  mockSettings(GIFT_MODEL);

  render(<ModelSetting />);
  await user.click(screen.getByRole("combobox"));

  expect(findOption("claude-sonnet-5")).not.toHaveAttribute("aria-disabled", "true");
});
