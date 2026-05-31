import type { Metadata } from "next";
import ChatClient from "./ChatClient";

export const metadata: Metadata = {
  title: "Agine Chat – Chat About Chess with AI",
  description:
    "Chat about chess with Agine — your AI chess buddy. Brainstorm positions, get move explanations, explore openings, and review games.",
  alternates: { canonical: "https://www.chessagine.com/chat" },
  openGraph: {
    title: "Agine Chat, your chess buddy | ChessAgine",
    description:
      "Your AI chess buddy, available anytime. Brainstorm positions, explore openings, and chat about chess with LLMs.",
    url: "https://www.chessagine.com/chat",
  },
};

export default function ChatPage() {
  return <ChatClient />;
}
