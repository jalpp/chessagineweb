
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let lichessUsername: string;
  try {
    const body = await req.json();
    lichessUsername = body.lichessUsername;
    if (!lichessUsername || typeof lichessUsername !== "string") {
      throw new Error("invalid");
    }
  } catch {
    return NextResponse.json(
      { error: "lichessUsername is required" },
      { status: 400 }
    );
  }

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { lichessUsername },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[lichess/sync-metadata]", err);
    return NextResponse.json(
      { error: "Failed to update metadata" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lichess/sync-metadata
 *
 * Clears the Lichess username from Clerk public metadata (on disconnect).
 */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { lichessUsername: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[lichess/sync-metadata DELETE]", err);
    return NextResponse.json(
      { error: "Failed to clear metadata" },
      { status: 500 }
    );
  }
}