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

  const fen = body?.fen;
  const color = body?.color;
  const is960 = Boolean(body?.is960);

  if (typeof fen !== "string" || fen.trim() === "") {
    return respondWithError("Missing or invalid fen", 400);
  }
  if (typeof color !== "string" || color.trim() === "") {
    return respondWithError("Missing or invalid color", 400);
  }

  const payload = {
    fen,
    color,
    is960,
  };

  try {
    const upstream = await fetch(`${endpoint.replace(/\/+$/, "")}/themes/scores`, {
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
      error instanceof Error ? error.message : "Theme score proxy error",
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
