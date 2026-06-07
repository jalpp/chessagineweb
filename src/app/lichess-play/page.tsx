import type { Metadata } from "next";
import LichessPlayClient from "./LichessPlayClient";

export const metadata: Metadata = {
  title: "Play on Lichess – Live Board with ChessAgine",
  description:
    "Play rated or casual games on Lichess via your connected account. Stream live board state, make moves, and track clocks in real time — all from ChessAgine.",
  alternates: { canonical: "https://www.chessagine.com/lichess-play" },
  openGraph: {
    title: "Play on Lichess | ChessAgine",
    description:
      "Seek a game on Lichess directly from ChessAgine. Live move streaming, real-time clocks, resign/draw controls.",
    url: "https://www.chessagine.com/lichess-play",
  },
};

export default function LichessPlayPage() {
  return <LichessPlayClient />;
}
