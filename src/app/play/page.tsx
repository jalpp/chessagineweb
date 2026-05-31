import type { Metadata } from "next";
import PlayClient from "./PlayClient";

export const metadata: Metadata = {
  title: "Play vs Engines – Challenge Stockfish & Maia Neural Networks",
  description:
    "Play chess against Stockfish or Maia — a neural network trained on real human games. Choose your rating level, set up custom positions, and practice with sparring and training sets.",
  alternates: { canonical: "https://www.chessagine.com/play" },
  openGraph: {
    title: "Play Chess vs Stockfish & Maia | ChessAgine",
    description:
      "Challenge Stockfish or Maia in the browser. Set rating difficulty, use custom positions, and train with curated position sets.",
    url: "https://www.chessagine.com/play",
  },
};

export default function PlayPage() {
  return <PlayClient />;
}
