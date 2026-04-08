/**
 * usage.ts — per-user daily token & cost tracking via Upstash Redis.
 *
 * Key schema:  usage:{userId}:{YYYY-MM-DD}
 * Value:       JSON { tokens: number; costUSD: number }
 * TTL:         seconds until end of UTC day (auto-resets daily)
 */

import { Redis } from "@upstash/redis";

// Upstash Redis client — env vars set in Vercel dashboard:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

export interface DailyUsage {
  tokens: number;
  costUSD: number;
}

/** Returns today's date string in UTC: "YYYY-MM-DD" */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds remaining until end of today in UTC */
function secondsUntilEndOfDayUTC(): number {
  const now = new Date();
  const endOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return Math.ceil((endOfDay.getTime() - now.getTime()) / 1000);
}

function buildKey(userId: string): string {
  return `usage:${userId}:${todayUTC()}`;
}

/** Get today's usage for a user. Returns zeros if no data yet. */
export async function getDailyUsage(userId: string): Promise<DailyUsage> {
  try {
    const raw = await redis.get<DailyUsage>(buildKey(userId));
    return raw ?? { tokens: 0, costUSD: 0 };
  } catch {
    // If Redis is unavailable, return zero so we don't block the user
    return { tokens: 0, costUSD: 0 };
  }
}

/**
 * Add tokens + cost to today's usage record.
 * The key auto-expires at the end of the UTC day.
 */
export async function incrementDailyUsage(
  userId: string,
  tokens: number,
  costUSD: number
): Promise<DailyUsage> {
  const key = buildKey(userId);
  const ttl = secondsUntilEndOfDayUTC();

  try {
    // Fetch current value, add, then set with refreshed TTL
    const current = await getDailyUsage(userId);
    const updated: DailyUsage = {
      tokens: current.tokens + tokens,
      costUSD: current.costUSD + costUSD,
    };
    await redis.set(key, updated, { ex: ttl });
    return updated;
  } catch {
    // If Redis write fails, silently skip — don't break the chat
    return { tokens: 0, costUSD: 0 };
  }
}

// ---------------------------------------------------------------------------
// Budget constants  ($15/month ÷ 30 days)
// ---------------------------------------------------------------------------

export const DAILY_BUDGET_USD = 0.5; // hard cap — fall back to free model
export const DAILY_WARN_USD = 0.4;   // soft warn — banner shows at 80%

export function isDailyLimitHit(usage: DailyUsage): boolean {
  return usage.costUSD >= DAILY_BUDGET_USD;
}

export function isDailyLimitWarning(usage: DailyUsage): boolean {
  return usage.costUSD >= DAILY_WARN_USD;
}