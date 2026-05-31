import type { Metadata } from "next";
import PuzzleClient from "./PuzzleClient";

export const metadata: Metadata = {
  title: "Chess Puzzles – Solve Tactical Puzzles from Lichess",
  description:
    "Train your chess tactics with puzzles from the full Lichess database. Filter by theme, rating, and difficulty.",
  alternates: { canonical: "https://www.chessagine.com/puzzle" },
  openGraph: {
    title: "Chess Puzzles – Lichess Puzzles Database | ChessAgine",
    description:
      "Solve tactical puzzles filtered by theme and rating.s",
    url: "https://www.chessagine.com/puzzle",
  },
};

export default function PuzzlePage() {
  return <PuzzleClient />;
}
