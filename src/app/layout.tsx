import { Box } from "@mui/material";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import SideNav from "@/componets/SideNav";
import GlobalFooter from "@/componets/Globalfooter";
import { NavigationProvider } from "@/context/NavigationContext";
import { LichessGuardProvider } from "@/context/LichessGuardContext";
import PageLoader from "@/componets/PageLoader";
import { SIDEBAR_WIDTH } from "@/componets/SideNav";
import { ThemeProvider } from "@/context/ThemeContext";
import BodyWrapper from "@/componets/BodyWrapper";
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

const BASE_URL = "https://www.chessagine.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ChessAgine",
    template: "%s | ChessAgine",
  },
  description:
    "Modern FOSS Chess analysis platform that has free game reviews, neural nets analysis and more",

  alternates: {
    canonical: BASE_URL,
  },

  openGraph: {
    title: "ChessAgine",
    description:
      "Modern FOSS Chess analysis platform that has free game reviews, neural nets analysis and more",
    url: BASE_URL,
    siteName: "ChessAgine",
    images: [
      {
        url: "/static/images/agine-gui.png",
        width: 1200,
        height: 630,
        alt: "ChessAgine",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "ChessAgine",
    description:
      "Modern FOSS Chess analysis platform that has free game reviews, neural nets analysis and more",
    images: ["/static/images/agineowl-og.png"],
  },

  keywords: [
    "chess companion",
    "AI chess",
    "chess analysis",
    "Stockfish browser",
    "Maia chess",
    "chess puzzles",
    "chess game review",
    "opening explorer",
    "chess position analysis",
    "free chess tools",
    "open source chess",
    "chess MCP",
    "nnedb",
    "chessagine",
    "agine gui",
    "chess neural network",
    "chessagine",
    "agine chat",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ChessAgine",
  url: BASE_URL,
  description:
    "Modern FOSS Chess analysis platform that has free game reviews, neural nets analysis and more",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Agine Chat – chat about chess with LLMs",
    "Stockfish 11/16/17/18 browser-based analysis",
    "Maia & Maia2 neural network analysis",
    "Game analysis with PGN import and Lichess integration",
    "Position board and theme analysis",
    "Puzzle training from Lichess database",
    "Play vs engines and neural networks",
    "Opening explorer with master and player databases",
    "ChessAgine MCP server for Claude Desktop",
    "No installs – runs entirely in your browser",
  ],
  creator: {
    "@type": "Organization",
    name: "ChessAgine",
    url: BASE_URL,
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
          <link rel="canonical" href={BASE_URL} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <BodyWrapper>
              <LichessGuardProvider>
              <NavigationProvider>
                <PageLoader />
                <Box sx={{
                  display: { xs: "block", md: "flex" },
                  flexDirection: "row",
                  minHeight: "100vh",
                  width: "100%",
                }}>
                  <SideNav />
                    <SettingsProvider>
                      <Box
                        component="main"
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          width: { xs: "100%", md: `calc(100vw - ${SIDEBAR_WIDTH}px)` },
                          overflowX: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "100vh",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>{children}</Box>
                        <GlobalFooter />
                      </Box>
                    </SettingsProvider>
                    <SpeedInsights />
                    <Analytics />
                </Box>
              </NavigationProvider>
              </LichessGuardProvider>
            </BodyWrapper>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
