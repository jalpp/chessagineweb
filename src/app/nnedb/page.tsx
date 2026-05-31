import type { Metadata } from "next";
import NnedbClient from "./NnedbClient";

export const metadata: Metadata = {
  title: "NNEDB Docs – Neural Network Evaluation Database",
  description:
    "Explore ChessAgine's NNEDB API docs",
  alternates: { canonical: "https://www.chessagine.com/nnedb" },
  openGraph: {
    title: "Neural Network Evaluation Database | ChessAgine",
    description:
      "Explore ChessAgine's NNEDB API docss",
    url: "https://www.chessagine.com/nnedb",
  },
};

export default function NnedbPage() {
  return <NnedbClient />;
}
