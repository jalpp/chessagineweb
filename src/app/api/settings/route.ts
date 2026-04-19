import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/connector";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const doc = await db.collection("user_settings").findOne({ userId });
  if (!doc) return Response.json(null);

  const { _id, ...settings } = doc;
  return Response.json(settings);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { anthropic_token, gemini_token, openrouter_token, chessboardmagic_token, _id, ...safe } = body;
  void anthropic_token; void gemini_token; void openrouter_token; void chessboardmagic_token; void _id;

  const db = await getDb();
  await db.collection("user_settings").updateOne(
    { userId },          
    { $set: { ...safe, updatedAt: new Date() } },
    { upsert: true }
  );

  return Response.json({ ok: true });
}