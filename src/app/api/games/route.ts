import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/connector";
import { NextRequest } from "next/server";
import { decodePGN } from "pgnpack";
import { SerializedTree } from "@/lib/variationTree";

export const dynamic = "force-dynamic";

interface GameReview {
  _id: string;
  userId: string;
  title: string;
  pgnPacked: string;
  /** Compact flat-serialized variation tree — updated on every save */
  treeData?: SerializedTree;
  /** Legacy: annotated PGN string – present only on old documents */
  annotatedPgn?: string;
  result: string;
  moveCount: number;
  gameReview: unknown[];
  gameReviewTheme: unknown | null;
  moves: unknown[];
  gameInfo: Record<string, unknown>;
  savedAt: Date;
  /** Last time the user re-saved annotations/tree */
  updatedAt: Date;
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

// ── GET: list all saved games for the user ─────────────────────────────────
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
      // Decode compressed PGN back to readable string
      let pgn = "";
      try {
        pgn = await decodePGN(doc.pgnPacked);
      } catch {
        pgn = "";
      }
      // Strip pgnPacked (binary) from response — client gets decoded pgn instead
      // Also map MongoDB _id → id to match the SavedGameReview interface
      const { pgnPacked, _id, ...rest } = doc as GameReview & { pgnPacked: string; _id: string };
      return { ...rest, id: _id, pgn };
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
    treeData,
    result, moveCount,
    gameReview, gameReviewTheme, moves, gameInfo,
  } = body;

  if (!id || typeof id !== "string") {
    return Response.json({ error: "Missing or invalid id" }, { status: 400 });
  }
  if (!pgnPacked || typeof pgnPacked !== "string") {
    return Response.json({ error: "Missing or invalid pgnPacked" }, { status: 400 });
  }
  // Server-side guard: never save without a completed game review
  if (!Array.isArray(gameReview) || gameReview.length === 0) {
    return Response.json({ error: "Game review must be complete before saving" }, { status: 400 });
  }

  const col = await getCol();
  const now = new Date();

  await col.updateOne(
    // Match by _id scoped to the user
    { _id: id, userId: access.userId },
    {
      // On first save: write everything
      $setOnInsert: {
        _id: id,
        userId:    access.userId,
        pgnPacked,
        result:    result    ?? "",
        moveCount: moveCount ?? 0,
        moves:     moves     ?? [],
        gameInfo:  gameInfo  ?? {},
        savedAt:   now,
      },
      // On every save (insert or update): refresh tree, theme, review and metadata
      $set: {
        treeData:        treeData        ?? null,
        title:           title           ?? "",
        gameReview:      gameReview      ?? [],
        gameReviewTheme: gameReviewTheme ?? null,
        updatedAt:       now,
      },
    },
    { upsert: true }
  );

  return Response.json({ ok: true });
}

// ── DELETE: remove a saved game ────────────────────────────────────────────
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