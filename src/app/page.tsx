import type { Metadata } from "next";
import HomeView from "@/componets/view/HomeView";

export const metadata: Metadata = {
  title: "ChessAgine, a modern FOSS Chess analysis platform",
  description:
    "ChessAgine, a modern, free, open-source chess app suite for playing, analyzing, and learning chess with a clean interface and powerful toolss.",
  alternates: { canonical: "https://www.chessagine.com" },
};

export default function HomePage() {
  return <HomeView />;
}
