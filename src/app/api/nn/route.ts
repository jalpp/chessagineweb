import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const NN_SERVER = "https://nn-analyze-service-717993082875.us-central1.run.app";
const AUTH_TOKEN = process.env.NN_SERVER_AUTH_TOKEN; 

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});


const CACHE_TTL = 3 * 7 * 24 * 60 * 60; 

function generateCacheKey(endpoint: string, body: Record<string, any>): string {
  const bodyStr = JSON.stringify(body);
  const hash = crypto.createHash("sha256").update(bodyStr).digest("hex");
  return `nn-cache:${endpoint}:${hash}`;
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip);

    const response = NextResponse.json(
      { success: false, error: "Rate limit exceeded" },
      { status: 429, headers: CORS_HEADERS }
    );
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    if (!success) {
      return response;
    }

    const body = await req.json();
    const { endpoint, ...rest } = body;

    if (endpoint !== "analyze" && endpoint !== "batch-maia3") {
      return NextResponse.json(
        { success: false, error: "endpoint must be 'analyze' or 'batch-maia3'" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const cacheKey = generateCacheKey(endpoint, rest);
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[/api/nn] Cache hit for ${endpoint}`);
        return NextResponse.json(cachedData, { headers: CORS_HEADERS });
      }
    } catch (cacheError) {
      console.warn("[/api/nn] Cache retrieval error:", cacheError);
    }

    const serverPath =
      endpoint === "batch-maia3" ? "/nn-batch-maia3" : "/nn-analyze";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    if (AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }

    const upstream = await fetch(`${NN_SERVER}${serverPath}`, {
      method: "POST",
      headers,
      body: JSON.stringify(rest),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => upstream.statusText);
      return NextResponse.json(
        { success: false, error: `NN server error [${upstream.status}]: ${text}` },
        { status: upstream.status, headers: CORS_HEADERS }
      );
    }

    const data = await upstream.json();

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
      console.log(`[/api/nn] Cached response for ${endpoint} (TTL: ${CACHE_TTL}s)`);
    } catch (cacheError) {
      console.warn("[/api/nn] Cache storage error:", cacheError);
    }

    return NextResponse.json(data, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[/api/nn] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}