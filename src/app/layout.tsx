import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import NavBar from "@/componets/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";
import BodyWrapper from "@/componets/BodyWrapper";
import { NetModelContextProvider } from "@/context/NetContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SettingsProvider } from "@/context/SettingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChessAgine",
  description:
    "A modern FOSS chess interface that combines LLMs and chess engines into one unified platform. Built for the chess community",

  openGraph: {
    title: "ChessAgine - AI-Powered Chess Training",
    description:
      "A modern FOSS chess interface that combines LLMs and chess engines into one unified platform. Built for the chess community",
    url: "https://www.chessagine.com/",
    siteName: "ChessAgine",
    images: [
      {
        url: "static/images/agineowl-og.png",
        width: 1200,
        height: 1200,
        alt: "ChessAgine Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "ChessAgine",
    description:
      "A modern FOSS chess interface that combines LLMs and chess engines into one unified platform. Built for the chess community",
    images: ["static/images/agineowl-og.png"],
  },

  keywords: [
    "chess training",
    "OpenAI chess",
    "Claude chess",
    "Gemini chess",
    "Stockfish",
    "chess engine",
    "chess AI",
    "maia chess",
    "stockfish",
    "chess tutor",
    "chess learning",
    "chess engine",
    "chess MCP",
    "chessagine",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  other: {
    "theme-color": "#8209a3ff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <link rel="canonical" href="https://www.chessagine.com" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <BodyWrapper>
              <NavBar />
              <NetModelContextProvider>
                <SettingsProvider>{children}</SettingsProvider>
                <SpeedInsights />
                <Analytics />
              </NetModelContextProvider>
            </BodyWrapper>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
