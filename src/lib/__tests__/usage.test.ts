jest.mock("@upstash/redis", () => ({
  Redis: { fromEnv: () => ({ get: jest.fn(), set: jest.fn() }) },
}));

import {
  DAILY_BUDGET_USD,
  DAILY_WARN_USD,
  DAILY_WARN_PERCENT,
  isDailyLimitHit,
  isDailyLimitWarning,
} from "../usage";

describe("daily usage cap", () => {
  it("warns at 65% of the daily budget for paid tier users", () => {
    expect(DAILY_WARN_PERCENT).toBe(0.65);
    expect(DAILY_WARN_USD).toBeCloseTo(DAILY_BUDGET_USD * 0.65, 10);
  });

  it("does not warn just under the 65% threshold", () => {
    const usage = { tokens: 100, costUSD: DAILY_WARN_USD - 0.001 };
    expect(isDailyLimitWarning(usage)).toBe(false);
    expect(isDailyLimitHit(usage)).toBe(false);
  });

  it("warns at or above the 65% threshold", () => {
    const usage = { tokens: 100, costUSD: DAILY_WARN_USD };
    expect(isDailyLimitWarning(usage)).toBe(true);
    expect(isDailyLimitHit(usage)).toBe(false);
  });

  it("hits the hard limit only at 100% of the daily budget", () => {
    const usage = { tokens: 100, costUSD: DAILY_BUDGET_USD };
    expect(isDailyLimitHit(usage)).toBe(true);
  });
});
