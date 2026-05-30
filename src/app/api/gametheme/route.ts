import { NextRequest, NextResponse } from "next/server";


export function respondWithError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const endpoint = process.env.THEMES_API_ENDPOINT;
  if (!endpoint) {
    return respondWithError("Missing THEMES_API_ENDPOINT environment variable", 500);
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

  const threshold = Number(body?.criticalMomentThreshold ?? body?.threshold ?? 0.5);
  const reviewFormat = body?.format === "text" ? "text" : "json";
  const is960 = Boolean(body?.is960);

  const payload = {
    pgn,
    criticalMomentThreshold: Number.isFinite(threshold) ? threshold : 0.5,
    format: reviewFormat,
    is960,
  };

  try {
    const upstream = await fetch(`${endpoint.replace(/\/+$/, "")}/themes/game-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await parseUpstreamResponse(upstream);
    return new NextResponse(JSON.stringify(data), {
      status: upstream.ok ? 200 : upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return respondWithError(
      error instanceof Error ? error.message : "Game theme proxy error",
      500,
    );
  }
}


async function parseUpstreamResponse(upstream: Response) {
  const text = await upstream.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || upstream.statusText };
  }
}
