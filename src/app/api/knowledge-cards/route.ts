import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/connector";
import { NextRequest } from "next/server";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const COLLECTION = "knowledge_cards";
const MAX_CONTENT_BYTES = 8 * 1024;
const MAX_CARDS = 20;

async function compress(text: string): Promise<string> {
  const buf = await gzipAsync(Buffer.from(text, "utf-8"));
  return buf.toString("base64");
}

async function decompress(b64: string): Promise<string> {
  const buf = await gunzipAsync(Buffer.from(b64, "base64"));
  return buf.toString("utf-8");
}

export async function GET() {
  const { userId, has } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  if (!isPaidTier) return Response.json({ error: "Paid tier required" }, { status: 403 });

  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId }, { sort: { createdAt: 1 } })
    .toArray();

  const cards = await Promise.all(
    docs.map(async ({ _id, compressed, ...doc }) => ({
      ...doc,
      content: compressed ? await decompress(doc.content as string) : doc.content,
    }))
  );

  return Response.json(cards);
}

export async function POST(req: NextRequest) {
  const { userId, has } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  if (!isPaidTier) return Response.json({ error: "Paid tier required" }, { status: 403 });

  const body = await req.json();
  const { id, title, description, content, createdAt, updatedAt } = body;

  if (!title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!content?.trim()) return Response.json({ error: "Content is required" }, { status: 400 });

  const contentBytes = Buffer.byteLength(content, "utf-8");
  if (contentBytes > MAX_CONTENT_BYTES) {
    return Response.json(
      { error: `Content exceeds 8 KB limit (${(contentBytes / 1024).toFixed(1)} KB)` },
      { status: 400 }
    );
  }

  const db = await getDb();
  const count = await db.collection(COLLECTION).countDocuments({ userId });
  if (count >= MAX_CARDS) {
    return Response.json({ error: `Maximum of ${MAX_CARDS} cards reached` }, { status: 400 });
  }

  const compressedContent = await compress(content.trim());

  await db.collection(COLLECTION).updateOne(
    { userId, id },
    {
      $set: {
        userId,
        id,
        title: title.trim(),
        description: (description ?? "").trim(),
        content: compressedContent,
        compressed: true,
        contentSize: contentBytes,
        createdAt: createdAt ?? Date.now(),
        updatedAt: updatedAt ?? Date.now(),
      },
    },
    { upsert: true }
  );

  return Response.json({ ok: true });
}


export async function PATCH(req: NextRequest) {
  const { userId, has } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  if (!isPaidTier) return Response.json({ error: "Paid tier required" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return Response.json({ error: "Card id is required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection(COLLECTION).findOne({ userId, id });
  if (!existing) return Response.json({ error: "Card not found" }, { status: 404 });

  const newContent = updates.content ?? null;
  let contentBytes = existing.contentSize as number;
  let compressedContent: string | undefined;

  if (newContent !== null) {
    contentBytes = Buffer.byteLength(newContent, "utf-8");
    if (contentBytes > MAX_CONTENT_BYTES) {
      return Response.json(
        { error: `Content exceeds 8 KB limit (${(contentBytes / 1024).toFixed(1)} KB)` },
        { status: 400 }
      );
    }
    compressedContent = await compress(newContent.trim());
  }

  const $set: Record<string, unknown> = { updatedAt: Date.now() };
  if (updates.title !== undefined) $set.title = updates.title.trim();
  if (updates.description !== undefined) $set.description = updates.description.trim();
  if (compressedContent !== undefined) {
    $set.content = compressedContent;
    $set.compressed = true;
    $set.contentSize = contentBytes;
  }

  await db.collection(COLLECTION).updateOne({ userId, id }, { $set });
  return Response.json({ ok: true });
}


export async function DELETE(req: NextRequest) {
  const { userId, has } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  if (!isPaidTier) return Response.json({ error: "Paid tier required" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ userId, id });
  return Response.json({ ok: true });
}