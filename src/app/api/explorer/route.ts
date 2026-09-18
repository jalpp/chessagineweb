import { NextRequest, NextResponse } from "next/server";
import type { MasterGames } from "@/libs/openingdatabase/helper";
import {
  buildExplorerUrl,
  getBearerToken,
  normalizeExplorerResponse,
  parseExplorerSource,
} from "@/libs/openingdatabase/lichessExplorer";

interface ExplorerResponse {
  success: boolean;
  data?: MasterGames;
  error?: string;
}

const toInt = (value: string | null): number | undefined => {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function GET(req: NextRequest): Promise<NextResponse<ExplorerResponse>> {
  const token = getBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Connect your Lichess account to use the opening explorer" },
      { status: 401 },
    );
  }

  const { searchParams } = req.nextUrl;
  const fen = searchParams.get("fen");
  const source = parseExplorerSource(searchParams.get("source"));

  if (!fen) {
    return NextResponse.json({ success: false, error: "fen is required" }, { status: 400 });
  }
  if (!source) {
    return NextResponse.json({ success: false, error: "Unknown source" }, { status: 400 });
  }

  try {
    const url = buildExplorerUrl(source, fen, {
      moves: toInt(searchParams.get("moves")),
      topGames: toInt(searchParams.get("topGames")),
      recentGames: toInt(searchParams.get("recentGames")),
      speeds: searchParams.get("speeds") ?? undefined,
      ratings: searchParams.get("ratings") ?? undefined,
    });

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Lichess explorer error: ${response.status}` },
        { status: response.status === 401 || response.status === 429 ? response.status : 502 },
      );
    }

    const data = normalizeExplorerResponse(await response.json());
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Lichess explorer error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load opening data" },
      { status: 500 },
    );
  }
}
