import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing – Free Forever + Paid Tier for Premium Models",
  description:
    "All chess tools in ChessAgine are free forever. Upgrade to the paid tier to unlock premium AI models in chat and have the ability to save games on the cloud.",
  alternates: { canonical: "https://www.chessagine.com/pricing" },
  openGraph: {
    title: "ChessAgine Pricing – Free Tools + Premium AI Models",
    description:
      "All chess tools are free. Paid tier unlocks saving games on cloud and better AI models",
    url: "https://www.chessagine.com/pricing",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
