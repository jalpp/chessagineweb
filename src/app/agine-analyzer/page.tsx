import type { Metadata } from "next";
import AgineAnalyzerClient from "./AgineAnalyzerClient";

export const metadata: Metadata = {
  title: "Agine Analyzer – Batch Review Your Recent Lichess Games",
  description:
    "Analyze your last 5 to 200 Lichess games in one pass. Win/loss stats, opening performance, accuracy trends, a puzzle pack built from your own blunders and a theme profile of your weaknesses.",
  alternates: { canonical: "https://www.chessagine.com/agine-analyzer" },
  openGraph: {
    title: "Agine Analyzer | ChessAgine",
    description:
      "Batch-analyze your recent Lichess games — opening stats, accuracy trends, puzzles from your blunders and theme analysis.",
    url: "https://www.chessagine.com/agine-analyzer",
  },
};

export default function AgineAnalyzerPage() {
  return <AgineAnalyzerClient />;
}
