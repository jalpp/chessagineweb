"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  CardMedia,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import SchoolIcon from "@mui/icons-material/School";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ViewBoardIcon from "@mui/icons-material/Bolt";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import PsychologyIcon from "@mui/icons-material/Psychology";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import ApiIcon from "@mui/icons-material/Api";
import SecurityIcon from "@mui/icons-material/Security";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FaPuzzlePiece, FaQuestion } from "react-icons/fa6";
import { Cloud, SwapCallsOutlined } from "@mui/icons-material";

export default function HomePage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();

  // Dashboard for logged-in users
  if (isSignedIn && isLoaded) {
    return (
      <main>
        <Box bgcolor="#7c3aed" color="white" py={8}>
          <Container maxWidth="md">
            <Stack spacing={3} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "#f5deb3",
                  color: "#7c3aed",
                  width: 72,
                  height: 72,
                }}
                src="/static/images/agineowl.png"
              ></Avatar>
              <Typography variant="h4" fontWeight="bold" textAlign="center">
                Welcome back, {user?.firstName || "Chess Player"}!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }} textAlign="center">
                Ready to train with Agine today?
              </Typography>
            </Stack>
          </Container>
        </Box>

        <Box py={8} bgcolor="#f5deb3">
          <Container maxWidth="md">
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={4}
              alignItems="stretch"
              justifyContent="center"
            >
              {[
                {
                  icon: <ViewBoardIcon sx={{ fontSize: 48 }} />,
                  title: "Position Board",
                  description:
                    "Set up any position and analyze it with Agine. ",
                  onClick: () => router.push("/position"),
                },
                {
                  icon: <AnalyticsIcon sx={{ fontSize: 48 }} />,
                  title: "Game Analysis",
                  description:
                    "Upload your games or paste PGN to get detailed analysis .",
                  onClick: () => router.push("/game"),
                },
                {
                  icon: <FaPuzzlePiece style={{ fontSize: 48 }} />,
                  title: "Interactive Puzzles",
                  description:
                    "Do chess theme based Lichess puzzles interactivly with Agine",
                  onClick: () => router.push("/puzzle"),
                },
                {
                  icon: <FaQuestion style={{ fontSize: 48 }} />,
                  title: "Docs",
                  description:
                    "Stuck on how to use ChessAgine GUI?, read the docs to set up your API key",
                  onClick: () => router.push("/docs"),
                },
              ].map((card) => (
                <Card
                  key={card.title}
                  elevation={6}
                  sx={{
                    flex: 1,
                    minWidth: 220,
                    maxWidth: 340,
                    height: { xs: "auto", md: 320 },
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: "0 20px 40px rgba(124, 58, 237, 0.3)",
                    },
                  }}
                  onClick={card.onClick}
                >
                  <CardContent
                    sx={{
                      p: 4,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    <Box mb={2}>{card.icon}</Box>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      textAlign="center"
                      gutterBottom
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ opacity: 0.9 }}
                      textAlign="center"
                    >
                      {card.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Container>
        </Box>
      </main>
    );
  }

  return (
    <main>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
          color: "white",
          py: 16,
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center" textAlign="center">
            {/* Agine Avatar */}
            <Box sx={{ position: "relative" }}>
              <Avatar
                src="/static/images/agineowl.png"
                sx={{
                  width: 140,
                  height: 140,
                  bgcolor: "#f5deb3",
                  color: "#7c3aed",
                  fontSize: "4rem",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  bgcolor: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: "white",
                  }}
                />
              </Box>
            </Box>

            {/* Main Heading */}
            <Stack spacing={4}>
              <Box>
                <Typography
                  variant="h1"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: "3rem", md: "4rem" } }}
                >
                  Meet ChessAgine
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: "#f5deb3",
                    fontWeight: 400,
                    fontSize: { xs: "1.8rem", md: "2.5rem" },
                    mt: 2,
                  }}
                >
                  Your AI-Powered Chess buddy
                </Typography>
              </Box>

              <Typography
                variant="h5"
                sx={{
                  opacity: 0.9,
                  maxWidth: "800px",
                  lineHeight: 1.6,
                  fontSize: { xs: "1.2rem", md: "1.5rem" },
                }}
              >
                Plug-and-play chess training with your choice of AI provider.
                Convert any LLM model into chess-aware Chessbuddy, get started with ChessAgine for
                FREE using ChessAgine Cloud.
              </Typography>
            </Stack>

            {/* Feature Pills */}
            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              {[
                "OpenRouter Support",
                "Ollama Support",
                "Open Source under GPL",
                "Stockfish 17.1 Engine",
                "MCP Server",
                "Lichess Integration",
                "Free Game Reviews",
                "Interactive Puzzles",
              ].map((feature) => (
                <Chip
                  key={feature}
                  label={feature}
                  sx={{
                    bgcolor: "rgba(245, 222, 179, 0.2)",
                    color: "#f5deb3",
                    borderColor: "#f5deb3",
                    border: "1px solid",
                    fontWeight: "bold",
                    mb: 1,
                  }}
                />
              ))}
            </Stack>

            {/* CTA Buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} mt={6}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: "#f5deb3",
                  color: "#7c3aed",
                  "&:hover": {
                    bgcolor: "#f0d798",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(245, 222, 179, 0.4)",
                  },
                  px: 6,
                  py: 2,
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                }}
                onClick={() => clerk.openSignUp()}
              >
                Start Chatting with ChessAgine
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "#f5deb3",
                  color: "#f5deb3",
                  "&:hover": {
                    borderColor: "#f0d798",
                    bgcolor: "rgba(245, 222, 179, 0.1)",
                    transform: "translateY(-2px)",
                  },
                  px: 6,
                  py: 2,
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  borderRadius: 2,
                  borderWidth: 2,
                  transition: "all 0.3s ease",
                }}
                onClick={() => clerk.openSignIn()}
              >
                Sign In
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* UI Preview Section */}
      <Box py={16} bgcolor="white">
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="#7c3aed"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                See ChessAgine in Action
              </Typography>
              <Typography
                variant="h5"
                color="#5b21b6"
                sx={{ opacity: 0.8, fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                Get a glimpse of the interactive chess analysis interface
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={6}
              sx={{ width: "100%" }}
            >
              {/* Opening Analysis Preview */}
              <Card
                elevation={12}
                sx={{
                  flex: 1,
                  borderRadius: 4,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 24px 48px rgba(124, 58, 237, 0.2)",
                  },
                }}
              >
                <CardMedia
                  component="img"
                  image="/static/images/aginepreview1.png"
                  alt="Opening Position Analysis"
                  sx={{
                    objectFit: "cover",
                  }}
                />
                <CardContent sx={{ p: 4, bgcolor: "#f8f9ff" }}>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="#7c3aed"
                    gutterBottom
                  >
                    Opening Analysis
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    Analyze opening positions with Agines guidance. Get
                    explanations about opening principles, typical plans, and
                    strategic ideas backed by the Lichess master database.
                  </Typography>
                </CardContent>
              </Card>

              {/* Middlegame Analysis Preview */}
              <Card
                elevation={12}
                sx={{
                  flex: 1,
                  borderRadius: 4,
                  overflow: "hidden",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 24px 48px rgba(124, 58, 237, 0.2)",
                  },
                }}
              >
                <CardMedia
                  component="img"
                  image="/static/images/aginepreview2.png"
                  alt="Middlegame Position Analysis"
                  sx={{
                    objectFit: "cover",
                  }}
                />
                <CardContent sx={{ p: 4, bgcolor: "#f8f9ff" }}>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="#7c3aed"
                    gutterBottom
                  >
                    Middlegame Strategy
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    Dive deep into complex middlegame positions. Understand
                    tactical patterns, strategic concepts, and key moves with
                    Stockfish engine analysis and AI explanations.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        </Container>
      </Box>

        

      

      {/* Plug & Play Section */}
      <Box py={16} bgcolor="#f5deb3">
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="#7c3aed"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Plug & Play AI Integration
              </Typography>
              <Typography
                variant="h5"
                color="#5b21b6"
                sx={{ opacity: 0.8, fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                Use your own API key, or go free with ChessAgine Cloud models or Ollama local/cloud models
                (no key required!)
              </Typography>
            </Box>

            <Grid container spacing={4} justifyContent="center">
              {[
                {
                  icon: <Cloud sx={{ fontSize: 48, color: "#7c3aed" }} />,
                  title: "ChessAgine Cloud",
                  description:
                    "Start using ChessAgine with open source models run by ChessAgine for you to use it for 100% free.",
                  color: "#e0f7fa",
                },
                {
                  icon: <StorageIcon sx={{ fontSize: 48, color: "#7c3aed" }} />,
                  title: "Ollama Support",
                  description:
                    "Run models locally or via Ollama cloud. No API key required. 100% free, open source.",
                  color: "#e0f7fa",
                },
                {
                  icon: (
                    <SwapCallsOutlined
                      sx={{ fontSize: 48, color: "#7c3aed" }}
                    />
                  ),
                  title: "OpenRouter Support",
                  description: "Connect to multiple providers via OpenRouter",
                  color: "#e0f7fa",
                },

                {
                  icon: <ApiIcon sx={{ fontSize: 48, color: "#7c3aed" }} />,
                  title: "Your API, Your Control",
                  description:
                    "Connect OpenAI, Anthropic Claude, or Google Gemini with your own API key. Pay only for what you use",
                  color: "#e8f5e8",
                },
                {
                  icon: (
                    <SecurityIcon sx={{ fontSize: 48, color: "#7c3aed" }} />
                  ),
                  title: "Privacy First",
                  description:
                    "Your API keys are stored locally in your browser. We never see or store your credentials.",
                  color: "#fff3e0",
                },
                {
                  icon: (
                    <PsychologyIcon sx={{ fontSize: 48, color: "#7c3aed" }} />
                  ),
                  title: "Choose Your Model",
                  description:
                    "From free models on Ollama to premium models on Cloud - select the AI that fits your needs.",
                  color: "#f3e5f5",
                },
              ].map((card) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={card.title}>
                  <Paper
                    elevation={4}
                    sx={{
                      p: 4,
                      textAlign: "center",
                      height: "100%",
                      bgcolor: card.color,
                      borderRadius: 3,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 12px 30px rgba(124, 58, 237, 0.15)",
                      },
                    }}
                  >
                    <Box mb={2}>{card.icon}</Box>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      color="#7c3aed"
                      gutterBottom
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      {card.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={16} bgcolor="white">
        <Container maxWidth="lg">
          <Stack spacing={12}>
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="#7c3aed"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Powerful Chess Features
              </Typography>
              <Typography
                variant="h5"
                color="#5b21b6"
                sx={{ opacity: 0.8, fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                Everything you need for comprehensive chess training
              </Typography>
            </Box>

            <Grid container spacing={6}>
              {[
                 {
                  icon: (
                    <ChatIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Q/A Interactive Mode",
                  description:
                    "Just like a chess buddy, ChessAgine can ask interactive questions to make you think about chess",
                },
                {
                  icon: (
                    <SearchIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Web Chess Search",
                  description:
                    "Access real-time chess data like blogs, YouTube, notes from across the web for comprehensive position analysis.",
                },
                {
                  icon: (
                    <StorageIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Lichess Master DB",
                  description:
                    "Explore opening variations with the complete Lichess master games database and opening explorer.",
                },
                {
                  icon: (
                    <PsychologyIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Stockfish 17.1 Engine",
                  description:
                    "Powered by the latest Stockfish 17.1 engine for world-class position evaluation and tactical analysis.",
                },
                {
                  icon: (
                    <FaPuzzlePiece
                      style={{
                        fontSize: 64,
                        color: "#7c3aed",
                        marginBottom: 24,
                      }}
                    />
                  ),
                  title: "AI-Powered Puzzles",
                  description:
                    "Solve interactive puzzles with AI guidance that adapts to your skill level and explains solutions.",
                },
                {
                  icon: (
                    <FreeBreakfastIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Free Game Reviews",
                  description:
                    "Upload your games and get detailed AI analysis with explanations of key moments and improvements.",
                },
                {
                  icon: (
                    <ChatIcon sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }} />
                  ),
                  title: "Natural Conversation",
                  description:
                    "Ask questions about positions in plain language and get explanations about positions, moves, and strategies.",
                },
              ].map((card) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={card.title}>
                  <Paper
                    elevation={8}
                    sx={{
                      p: 6,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      bgcolor: "#f8f9ff",
                      borderRadius: 4,
                      height: "100%",
                      minHeight: 320,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: "0 20px 40px rgba(124, 58, 237, 0.15)",
                      },
                    }}
                  >
                    {card.icon}
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      gutterBottom
                      color="#7c3aed"
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6, flexGrow: 1 }}
                    >
                      {card.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Box>

      <Box py={16} bgcolor="#f8f9ff">
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Box textAlign="center" maxWidth="900px">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="#7c3aed"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                ChessAgine MCP
              </Typography>
              <Typography
                variant="h5"
                color="#5b21b6"
                sx={{ opacity: 0.8, fontSize: { xs: "1.2rem", md: "1.5rem" }, mb: 4 }}
              >
                Model Context Protocol server that transforms Claude AI into a chess expert
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: "1.1rem", lineHeight: 1.8, textAlign: "left" }}
              >
                ChessAgine MCP is a powerful integration that connects Claude AI directly to chess engines, databases, and analysis tools through Anthropic Model Context Protocol. Instead of using a separate web interface, you can chat with Claude in Claude.ai or the Claude desktop app and get the same professional chess analysis capabilities - all within your natural conversation with Claude.
              </Typography>
            </Box>

            <Grid container spacing={4} sx={{ mt: 2 }}>
              {[
                {
                  title: "Native Claude Integration",
                  description: "Use ChessAgine directly in Claude.ai or Claude Desktop app - no separate interface needed. Just chat naturally with Claude about chess.",
                  color: "#e8f5e9",
                },
                {
                  title: "Stockfish 17.1 Analysis",
                  description: "Access world-class engine analysis directly through Claude. Get position evaluations, best moves, and tactical insights in real-time.",
                  color: "#e3f2fd",
                },
                {
                  title: "Lichess Database Access",
                  description: "Query the Lichess master games database, fetch your recent games, and explore opening variations - all through simple conversation.",
                  color: "#f3e5f5",
                },
                {
                  title: "Interactive Puzzle Training",
                  description: "Solve Lichess puzzles with Claude as your coach. Get hints, explanations, and adaptive difficulty based on your skill level.",
                  color: "#fff3e0",
                },
                {
                  title: "Comprehensive Game Reviews",
                  description: "Upload PGN files and receive detailed analysis with theme progression tracking, critical moments identification, and improvement suggestions.",
                  color: "#fce4ec",
                },
                {
                  title: "Chess Knowledge Base",
                  description: "Access Silman's Imbalances, Fine's 30 Principles, endgame theory, and practical checklists to enhance your understanding.",
                  color: "#e0f7fa",
                },
              ].map((card) => (
                <Grid size={{ xs: 12, md: 6 }} key={card.title}>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 4,
                      height: "100%",
                      bgcolor: card.color,
                      borderRadius: 3,
                      borderLeft: "4px solid #7c3aed",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateX(8px)",
                        boxShadow: "0 8px 24px rgba(124, 58, 237, 0.15)",
                      },
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="#7c3aed"
                      gutterBottom
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      {card.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: "#f5deb3",
                color: "#7c3aed",
                "&:hover": {
                  bgcolor: "#f0d798",
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 30px rgba(245, 222, 179, 0.4)",
                },
                px: 8,
                py: 3,
                fontSize: "1.4rem",
                fontWeight: "bold",
                borderRadius: 3,
                transition: "all 0.3s ease",
              }}
              onClick={() => router.push("/docs")}
            >
              Install MCP Server
            </Button>
          </Stack>
        </Container>
      </Box>

      
      <Box py={16} bgcolor="#f5deb3">
        <Container maxWidth="lg">
          <Stack spacing={12}>
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="#7c3aed"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Why Choose ChessAgine?
              </Typography>
              <Typography
                variant="h5"
                color="#5b21b6"
               
              >
                Experience chess training that feels natural and intuitive
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={6}

            >
              {[
                {
                  icon: (
                    <SportsEsportsIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Interactive Training",
                  description:
                    "Ask for puzzle hints, answer various questions Agine asks you live",
                },
                {
                  icon: (
                    <SchoolIcon
                      sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }}
                    />
                  ),
                  title: "Learn to Think",
                  description:
                    "Develop better decision-making patterns and strategic understanding with guided analysis and explanations.",
                },
                {
                  icon: (
                    <ApiIcon sx={{ fontSize: 64, color: "#7c3aed", mb: 3 }} />
                  ),
                  title: "Cost Effective",
                  description:
                    "Use ChessAgine Cloud for free. No subscription fees or hidden costs, complete transparency.",
                },
              ].map((card) => (
                <Paper
                  key={card.title}
                  elevation={8}
                  sx={{
                    p: 6,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    bgcolor: "white",
                    borderRadius: 4,
                    flex: 1,
                    minWidth: 0,
                    minHeight: 370,
                    height: { xs: "auto", md: 370 },
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 20px 40px rgba(124, 58, 237, 0.15)",
                    },
                  }}
                >
                  {card.icon}
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    gutterBottom
                    color="#7c3aed"
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                 
                  >
                    {card.description}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Final CTA Section */}
      <Box py={16} bgcolor="#7c3aed" color="white">
        <Container maxWidth="md">
          <Stack spacing={6} alignItems="center" textAlign="center">
            <Box>
              <Typography
                variant="h2"
                fontWeight="bold"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Ready to experience the Next-gen of chess analysis?
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: "1.3rem", md: "1.5rem" },
                }}
              >
                Join players who are training smarter with ChessAgine AI
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: "#f5deb3",
                color: "#7c3aed",
                "&:hover": {
                  bgcolor: "#f0d798",
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 30px rgba(245, 222, 179, 0.4)",
                },
                px: 8,
                py: 3,
                fontSize: "1.4rem",
                fontWeight: "bold",
                borderRadius: 3,
                transition: "all 0.3s ease",
              }}
              onClick={() => clerk.openSignUp()}
            >
              Get Started Free
            </Button>
          </Stack>
        </Container>
      </Box>
    </main>
  );
}
