import type { NextApiRequest, NextApiResponse } from "next";

const POSIRA_BASE = "https://api.posira.dev";

interface PosiraResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PosiraResponse>,
) {
  const apiKey = process.env.POSIRA_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };

  try {
    // GET /api/posira?endpoint=explorer&fen=...&top_n=12&speeds=...&ratings=...
    if (req.method === "GET") {
      const { endpoint = "explorer", fen, moves, top_n, speeds, ratings, titled } = req.query;

      if (endpoint !== "explorer") {
        return res.status(400).json({ success: false, error: "Unknown GET endpoint" });
      }

      if (!fen && !moves) {
        return res.status(400).json({ success: false, error: "fen or moves is required" });
      }

      const params = new URLSearchParams();
      if (fen && typeof fen === "string") params.set("fen", fen);
      if (moves && typeof moves === "string") params.set("moves", moves);
      if (top_n && typeof top_n === "string") params.set("top_n", top_n);
      if (speeds && typeof speeds === "string") params.set("speeds", speeds);
      if (ratings && typeof ratings === "string") params.set("ratings", ratings);
      if (titled === "true") params.set("titled", "true");

      const response = await fetch(
        `${POSIRA_BASE}/api/v1/explorer?${params.toString()}`,
        { headers },
      );

      if (!response.ok) {
        throw new Error(`Posira explorer error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json({ success: true, data });
    }

    // POST /api/posira  body: { endpoint: "analyze", fen, move?, movetime?, multiPv? }
    if (req.method === "POST") {
      const { endpoint = "analyze", fen, move, movetime, multiPv } = req.body ?? {};

      if (endpoint !== "analyze") {
        return res.status(400).json({ success: false, error: "Unknown POST endpoint" });
      }

      if (!fen) {
        return res.status(400).json({ success: false, error: "fen is required" });
      }

      const body: Record<string, unknown> = { fen };
      if (move) body.move = move;
      if (movetime) body.movetime = Number(movetime);
      if (multiPv) body.multiPv = Number(multiPv);

      const response = await fetch(`${POSIRA_BASE}/api/v1/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Posira analyze error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Posira API error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to call Posira API",
    });
  }
}