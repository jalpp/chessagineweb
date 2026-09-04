import { NextRequest, NextResponse } from "next/server";

interface PuzzleData {
  lichessId: string;
  previousFEN: string;
  FEN: string;
  moves: string;
  preMove: string;
  rating: number;
  themes: string[];
  gameURL: string;
}

interface PuzzleResponse {
  success: boolean;
  data?: PuzzleData;
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<PuzzleResponse>> {
  try {
    const { searchParams } = req.nextUrl;

    const themes     = searchParams.get("themes");
    const ratingFrom = searchParams.get("ratingFrom");
    const ratingTo   = searchParams.get("ratingTo");
    const parsedRatingFrom = ratingFrom === null ? NaN : Number(ratingFrom);
    const parsedRatingTo = ratingTo === null ? NaN : Number(ratingTo);
    const hasValidRatingRange = Number.isFinite(parsedRatingFrom) && Number.isFinite(parsedRatingTo);

    const params = new URLSearchParams();
    if (themes) params.append("themes", themes);
    if (hasValidRatingRange) {
      params.append("ratingFrom", String(Math.round(parsedRatingFrom)));
      params.append("ratingTo", String(Math.round(parsedRatingTo)));
    }else{
      params.append("ratingFrom", "1500");
      params.append("ratingTo", "1600");
    }

    const qs  = params.toString();
    const url = `https://api.chessgubbins.com/puzzles/random${qs ? `?${qs}` : ""}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }

    const data: PuzzleData = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Error fetching puzzle:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load puzzle. Please try again." },
      { status: 500 },
    );
  }
}