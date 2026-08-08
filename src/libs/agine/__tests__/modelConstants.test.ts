import {
  BYO_ANTHROPIC_MODELS,
  BYO_GEMINI_MODELS,
  BYO_OPENROUTER_MODELS,
  BYO_MODELS,
  PREMIUM_MODELS,
  FREE_ROUTER_MODEL,
  GIFT_MODEL,
  FREE_TIER_MODELS,
} from "../modelConstants";

describe("GIFT_MODEL", () => {
  it("is qwen3-coder-next, given free to every tier with no daily cap", () => {
    expect(GIFT_MODEL).toBe("qwen/qwen3-coder-next");
  });

  it("is available on the free tier alongside the random router", () => {
    expect(FREE_TIER_MODELS).toEqual([GIFT_MODEL, FREE_ROUTER_MODEL]);
  });

  it("is not gated behind the paid tier or a BYO key", () => {
    expect(PREMIUM_MODELS).not.toContain(GIFT_MODEL);
    expect(BYO_MODELS).not.toContain(GIFT_MODEL);
    expect(BYO_MODELS).not.toContain(`${GIFT_MODEL}:user`);
  });

  it("no longer occupies the old qwen3.5-9b premium/BYO slot", () => {
    const all = [...BYO_MODELS, ...PREMIUM_MODELS, ...FREE_TIER_MODELS];
    expect(all).not.toContain("qwen/qwen3.5-9b");
    expect(all).not.toContain("qwen/qwen3.5-9b:user");
    expect(all).not.toContain("qwen/qwen3-coder:free");
  });
});

describe("2026 model refresh", () => {
  it("no longer references deprecated/shut-down model slugs", () => {
    const stale = [
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "anthropic/claude-sonnet-4.6",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.5-pro-preview-05-06",
      "openai/gpt-5.4",
      "meta-llama/llama-3.1-8b-instruct",
      "qwen/qwen3.5-9b",
      "qwen/qwen3-coder:free",
    ];
    const all = [...BYO_MODELS, ...PREMIUM_MODELS, ...FREE_TIER_MODELS];
    for (const staleModel of stale) {
      expect(all).not.toContain(staleModel);
    }
  });

  it("uses the current Anthropic lineup (Opus 4.8 / Sonnet 5 / Haiku 4.5) for direct API access", () => {
    expect(BYO_ANTHROPIC_MODELS).toEqual([
      "claude-opus-4-8",
      "claude-sonnet-5",
      "claude-haiku-4-5-20251001",
    ]);
  });

  it("drops the shut-down Gemini 2.0 models in favor of the current 3.x lineup", () => {
    expect(BYO_GEMINI_MODELS).toEqual([
      "gemini-3.1-pro-preview",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
    ]);
  });

  it("keeps PREMIUM_MODELS (AgineCloud) and BYO_OPENROUTER_MODELS in sync, save for the :user suffix", () => {
    expect(BYO_OPENROUTER_MODELS.map((m) => m.replace(/:user$/, ""))).toEqual(
      PREMIUM_MODELS
    );
  });
});

describe("BYO_MODELS", () => {
  it("is the union of every BYO provider list with no duplicates", () => {
    const union = [...BYO_ANTHROPIC_MODELS, ...BYO_GEMINI_MODELS, ...BYO_OPENROUTER_MODELS];
    expect(BYO_MODELS).toEqual(union);
    expect(new Set(BYO_MODELS).size).toBe(BYO_MODELS.length);
  });
});
