import type { Metadata } from "next";
import PositionClient from "./PositionClient";

export const metadata: Metadata = {
  title: "Position Board – Analyze Chess Positions with Advanced analysis tools",
  description:
    "Set up any chess position and analyze it with Stockfish, Maia neural networks, and position theme scoring. Measure material balance, mobility, space, king safety, and more.",
  alternates: { canonical: "https://www.chessagine.com/position" },
  openGraph: {
    title: "Chess Position Board | ChessAgine",
    description:
      "Set up positions and analyze with Stockfish, Maia, and mathematical theme scores for space, mobility, and king safety.",
    url: "https://www.chessagine.com/position",
  },
};

export default function PositionPage() {
  return <PositionClient />;
}
