import { NextRequest, NextResponse } from "next/server";

export function respondWithError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const endpoint = process.env.THEMES_API_ENDPOINT;
  if (!endpoint) {
    return respondWithError(
      "Missing THEMES_API_ENDPOINT environment variable",
      500,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    return respondWithError("Invalid JSON body", 400);
  }

  const pgn = body?.pgn;

  if (!pgn) {
    return respondWithError("Missing pgn or moveList", 400);
  }

  const threshold = Number(
    body?.criticalMomentThreshold ?? body?.threshold ?? 0.5,
  );
  const reviewFormat = body?.format === "text" ? "text" : "json";
  const is960 = Boolean(body?.is960);

  const payload = {
    pgn,
    criticalMomentThreshold: Number.isFinite(threshold) ? threshold : 0.5,
    format: reviewFormat,
    is960,
  };

  try {
    const upstream = await fetchGameThemeReview(endpoint, payload);

    const data = await parseUpstreamResponse(upstream.response);
    return new NextResponse(JSON.stringify(data), {
      status: upstream.response.ok ? 200 : upstream.response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return respondWithError(
      error instanceof Error ? error.message : "Game theme proxy error",
      500,
    );
  }
}

async function fetchGameThemeReview(endpoint: string, payload: unknown) {
  const baseUrl = endpoint.replace(/\/+$/, "");

  let lastResponse: Response | null = null;

  const response = await fetch(`${baseUrl}/themes/game-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  lastResponse = response;

  if (response.ok) {
    return { response};
  }

  if (response.status !== 404) {
    return { response};
  }

  if (!lastResponse) {
    throw new Error("Unable to reach the themes engine");
  }

  return {
    response: lastResponse,
  };
}

async function parseUpstreamResponse(upstream: Response) {
  const text = await upstream.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || upstream.statusText };
  }
}
