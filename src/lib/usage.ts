import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export interface DailyUsage {
  tokens: number;
  costUSD: number;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}


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

export async function getDailyUsage(userId: string): Promise<DailyUsage> {
  try {
    const raw = await redis.get<DailyUsage>(buildKey(userId));
    return raw ?? { tokens: 0, costUSD: 0 };
  } catch {
    return { tokens: 0, costUSD: 0 };
  }
}


export async function incrementDailyUsage(
  userId: string,
  tokens: number,
  costUSD: number
): Promise<DailyUsage> {
  const key = buildKey(userId);
  const ttl = secondsUntilEndOfDayUTC();

  try {
  
    const current = await getDailyUsage(userId);
    const updated: DailyUsage = {
      tokens: current.tokens + tokens,
      costUSD: current.costUSD + costUSD,
    };
    await redis.set(key, updated, { ex: ttl });
    return updated;
  } catch {
    return { tokens: 0, costUSD: 0 };
  }
}

export const DAILY_BUDGET_USD = 0.5;

/** Warn once a paid user has burned through this fraction of their daily budget. */
export const DAILY_WARN_PERCENT = 0.65;
export const DAILY_WARN_USD = DAILY_BUDGET_USD * DAILY_WARN_PERCENT;

export function isDailyLimitHit(usage: DailyUsage): boolean {
  return usage.costUSD >= DAILY_BUDGET_USD;
}

export function isDailyLimitWarning(usage: DailyUsage): boolean {
  return usage.costUSD >= DAILY_WARN_USD;
}