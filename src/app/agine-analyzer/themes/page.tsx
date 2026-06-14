import type { Metadata } from "next";
import ThemesGuideClient from "./ThemesGuideClient";

export const metadata: Metadata = {
  title: "How Agine Theme Analysis Works – ChessAgine",
  description:
    "A plain-language guide to the nine Agine themes (material, mobility, space, positional, king safety, tactical, square control, tempo): what each one means, how it's calculated, what example values mean, and how the Agine Analyzer uses them.",
  alternates: { canonical: "https://www.chessagine.com/agine-analyzer/themes" },
  openGraph: {
    title: "How Agine Theme Analysis Works | ChessAgine",
    description:
      "What each Agine theme means in plain chess language, how it's computed, and how to read the Agine Analyzer's theme charts.",
    url: "https://www.chessagine.com/agine-analyzer/themes",
  },
};

export default function ThemesGuidePage() {
  return <ThemesGuideClient />;
}
