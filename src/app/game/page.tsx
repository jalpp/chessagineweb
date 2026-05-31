import type { Metadata } from "next";
import GameClient from "./GameClient";

export const metadata: Metadata = {
  title: "Chess Game Analysis – Review Games with Stockfish, Maia3 and other neural net",
  description:
    "Analyze your chess games from Lichess, generate free game review with tactics analysis, ability to annonate the game and see advanced chess stats per game",
  alternates: { canonical: "https://www.chessagine.com/game" },
  openGraph: {
    title: "Chess Game Analysis | ChessAgine",
    description:
      "Upload a PGN or import from Lichess for deep Chessagine game review",
    url: "https://www.chessagine.com/game",
  },
};

export default function GamePage() {
  return <GameClient />;
}
