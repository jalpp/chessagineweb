import { auth } from "@clerk/nextjs/server";
import {
  getDailyUsage,
  isDailyLimitHit,
  isDailyLimitWarning,
  DAILY_BUDGET_USD,
} from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, has } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  if (!isPaidTier) {
    return Response.json({
      tokens: 0,
      costUSD: 0,
      limitHit: false,
      warning: false,
      budgetUSD: null,
    });
  }

  const usage = await getDailyUsage(userId);
  return Response.json({
    tokens: usage.tokens,
    costUSD: Number(usage.costUSD.toFixed(6)),
    limitHit: isDailyLimitHit(usage),
    warning: isDailyLimitWarning(usage),
    budgetUSD: DAILY_BUDGET_USD,
  });
}