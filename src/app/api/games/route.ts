import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/connector";
import { NextRequest } from "next/server";
import { decodePGN } from "pgnpack";

export const dynamic = "force-dynamic";

interface GameReview {
  _id: string;
  userId: string;
  title: string;
  pgnPacked: string;
  // pgnRaw intentionally NOT stored — decoded on read
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

  
  const decoded = await Promise.all(
    docs.map(async (doc) => {
      let pgn = "";
      try {
        pgn = await decodePGN(doc.pgnPacked);
      } catch {
        pgn = "";
      }
      const { pgnPacked, ...rest } = doc as GameReview & { pgnPacked: string };
      return { ...rest, pgn };
    })
  );

  return Response.json(decoded);
}

export async function POST(req: NextRequest) {
  const access = await checkAccess();
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const {
    id, title, pgnPacked,
    result, moveCount,
    gameReview, gameReviewTheme, moves, gameInfo,
  } = body;

  if (!id || !pgnPacked) return Response.json({ error: "Missing required fields" }, { status: 400 });
  if (typeof id !== "string") return Response.json({ error: "Invalid id" }, { status: 400 });
  if (typeof pgnPacked !== "string") return Response.json({ error: "Invalid pgnPacked" }, { status: 400 });

  const col = await getCol();

  const existing = await col.findOne({ userId: access.userId, pgnPacked });
  if (existing) {
    return Response.json({ ok: true, duplicate: true, existingId: existing._id });
  }

  await col.updateOne(
    { _id: id },
    {
      $setOnInsert: {
        _id: id,
        userId:          access.userId,
        title:           title           ?? "",
        pgnPacked,
        // pgnRaw is intentionally never stored
        result:          result          ?? "",
        moveCount:       moveCount       ?? 0,
        gameReview:      gameReview      ?? [],
        gameReviewTheme: gameReviewTheme ?? null,
        moves:           moves           ?? [],
        gameInfo:        gameInfo        ?? {},
        savedAt:         new Date(),
      },
    },
    { upsert: true }
  );

  return Response.json({ ok: true, duplicate: false });
}

export async function DELETE(req: NextRequest) {
  const access = await checkAccess();
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const col = await getCol();
  await col.deleteOne({ _id: id, userId: access.userId });

  return Response.json({ ok: true });
}