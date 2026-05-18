import { NextRequest, NextResponse } from "next/server";

const NN_SERVER = "https://nn-analyze-service-717993082875.us-central1.run.app";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { endpoint, ...rest } = body;

    if (endpoint !== "analyze" && endpoint !== "batch-maia3") {
      return NextResponse.json(
        { success: false, error: "endpoint must be 'analyze' or 'batch-maia3'" },
        { status: 400 }
      );
    }

    const serverPath =
      endpoint === "batch-maia3" ? "/nn-batch-maia3" : "/nn-analyze";

    const upstream = await fetch(`${NN_SERVER}${serverPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rest),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => upstream.statusText);
      return NextResponse.json(
        { success: false, error: `NN server error [${upstream.status}]: ${text}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/nn] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
