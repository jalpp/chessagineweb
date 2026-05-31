import type { Metadata } from "next";
import DocsClient from "./DocsClient";

export const metadata: Metadata = {
  title: "ChessAgine Docs – Features, FAQ, Pricing & MCP Setup",
  description:
    "Full documentation for ChessAgine: all features explained, FAQ, free vs paid plan comparison, and how to set up the ChessAgine MCP server for Claude Desktop.",
  alternates: { canonical: "https://www.chessagine.com/docs" },
  openGraph: {
    title: "ChessAgine Docs – Features, Pricing & MCP Guide",
    description:
      "Everything you need to know about ChessAgine: features, plans, FAQ, and MCP server setup.",
    url: "https://www.chessagine.com/docs",
  },
};

export default function DocsPage() {
  return <DocsClient />;
}
