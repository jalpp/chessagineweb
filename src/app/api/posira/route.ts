import { NextRequest, NextResponse } from "next/server";

const POSIRA_BASE = "https://api.posira.dev";

interface PosiraResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

function getPosiraHeaders(): Record<string, string> {
  const apiKey = process.env.POSIRA_API_KEY;
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}


export async function GET(req: NextRequest): Promise<NextResponse<PosiraResponse>> {
  try {
    const { searchParams } = req.nextUrl;

    const endpoint = searchParams.get("endpoint") ?? "explorer";
    const fen      = searchParams.get("fen");
    const moves    = searchParams.get("moves");
    const top_n    = searchParams.get("top_n");
    const speeds   = searchParams.get("speeds");
    const ratings  = searchParams.get("ratings");
    const titled   = searchParams.get("titled");

    if (endpoint !== "explorer") {
      return NextResponse.json({ success: false, error: "Unknown GET endpoint" }, { status: 400 });
    }

    if (!fen && !moves) {
      return NextResponse.json({ success: false, error: "fen or moves is required" }, { status: 400 });
    }

    const params = new URLSearchParams();
    if (fen)    params.set("fen", fen);
    if (moves)  params.set("moves", moves);
    if (top_n)  params.set("top_n", top_n);
    if (speeds) params.set("speeds", speeds);
    if (ratings) params.set("ratings", ratings);
    if (titled === "true") params.set("titled", "true");

    const response = await fetch(
      `${POSIRA_BASE}/api/v1/explorer?${params.toString()}`,
      { headers: getPosiraHeaders() },
    );

    if (!response.ok) {
      throw new Error(`Posira explorer error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Posira GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to call Posira API" },
      { status: 500 },
    );
  }
}


export async function POST(req: NextRequest): Promise<NextResponse<PosiraResponse>> {
  try {
    const body = await req.json();
    const { endpoint = "analyze", fen, move, movetime, multiPv } = body ?? {};

    if (endpoint !== "analyze") {
      return NextResponse.json({ success: false, error: "Unknown POST endpoint" }, { status: 400 });
    }

    if (!fen) {
      return NextResponse.json({ success: false, error: "fen is required" }, { status: 400 });
    }

    const requestBody: Record<string, unknown> = { fen };
    if (move)     requestBody.move = move;
    if (movetime) requestBody.movetime = Number(movetime);
    if (multiPv)  requestBody.multiPv = Number(multiPv);

    const response = await fetch(`${POSIRA_BASE}/api/v1/analyze`, {
      method: "POST",
      headers: getPosiraHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Posira analyze error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Posira POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to call Posira API" },
      { status: 500 },
    );
  }
}