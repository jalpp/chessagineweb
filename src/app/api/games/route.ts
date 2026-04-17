import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/connector";
import { NextRequest } from "next/server";

interface GameReview {
  _id: string;
  userId: string;
  title: string;
  pgnPacked: string;
  pgnRaw: string;
  white: string;
  black: string;
  result: string;
  moveCount: number;
  gameReview: unknown[];
  gameReviewTheme: unknown | null;
  moves: unknown[];
  gameInfo: Record<string, unknown>;
  savedAt: Date;
}

async function getCol() {
  const db = await getDb();
  return db.collection<GameReview>("game_reviews");
}

// Auth + plan check helper to avoid repetition
async function checkAccess() {
  const { userId, has } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 } as const;
  if (!has?.({ plan: "paid_tier" })) return { error: "Paid tier required", status: 403 } as const;
  return { userId };
}

export async function GET() {
  const access = await checkAccess();
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  const col = await getCol();
  const docs = await col
    .find({ userId: access.userId })
    .sort({ savedAt: -1 })
    .limit(200)
    .toArray();

  return Response.json(docs);
}

export async function POST(req: NextRequest) {
  const access = await checkAccess();
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const {
    id, title, pgnPacked, pgnRaw,
    white, black, result, moveCount,
    gameReview, gameReviewTheme, moves, gameInfo,
  } = body;

  if (!id || !pgnRaw) return Response.json({ error: "Missing required fields" }, { status: 400 });

  // Validate id is a plain string, not an object/injection attempt
  if (typeof id !== "string") return Response.json({ error: "Invalid id" }, { status: 400 });

  const col = await getCol();
  await col.updateOne(
    { _id: id },
    {
      $setOnInsert: {
        _id: id,
        userId: access.userId,
        title:           title          ?? "",
        pgnPacked:       pgnPacked      ?? "",
        pgnRaw,
        white:           white          ?? "",
        black:           black          ?? "",
        result:          result         ?? "",
        moveCount:       moveCount      ?? 0,
        gameReview:      gameReview     ?? [],
        gameReviewTheme: gameReviewTheme ?? null,
        moves:           moves          ?? [],
        gameInfo:        gameInfo       ?? {},
        savedAt:         new Date(),
      },
    },
    { upsert: true }
  );

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const access = await checkAccess();
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const col = await getCol();
  // userId in the filter ensures a user can only delete their own docs
  await col.deleteOne({ _id: id, userId: access.userId });

  return Response.json({ ok: true });
}