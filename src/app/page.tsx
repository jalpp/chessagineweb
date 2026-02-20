"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Card,
  Avatar,
  Chip,
  CardMedia,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import SchoolIcon from "@mui/icons-material/School";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import PsychologyIcon from "@mui/icons-material/Psychology";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import ApiIcon from "@mui/icons-material/Api";
import SecurityIcon from "@mui/icons-material/Security";
import CodeIcon from "@mui/icons-material/Code";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Extension,
  SmartToy,
  SwapCallsOutlined,
} from "@mui/icons-material";
import HomeView from "@/componets/view/HomeView";

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser();
  const clerk = useClerk();
  const router = useRouter();

  if (isSignedIn && isLoaded) {
    return <HomeView />;
  }

  return (
    <main>
      <Box
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "primary.contrastText",
          py: 16,
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center" textAlign="center">
            <Box sx={{ position: "relative" }}>
              <Avatar
                src="/static/images/agineowl.png"
                sx={{
                  width: 140,
                  height: 140,
                  bgcolor: "background.paper",
                  color: "primary.main",
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
                  bgcolor: "success.main",
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
                    bgcolor: "common.white",
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
                  ChessAgine
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: "primary.contrastText",
                    fontWeight: 400,
                    fontSize: { xs: "1.8rem", md: "2.5rem" },
                    mt: 2,
                    opacity: 0.95,
                  }}
                >
                  Free & Open Source AI-Powered Chess GUI
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
                A modern FOSS chess interface that combines LLMs and chess
                engines into one unified platform. Built for the community, by
                the community.
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              {[
                "GPL Licensed",
                "100% Free Forever",
                "Open Source",
                "Stockfish 17.1",
                "MCP Server",
                "Skill.md",
                "Lichess Integration",
                "AI-Powered Analysis",
                "Community Driven",
              ].map((feature) => (
                <Chip
                  key={feature}
                  label={feature}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    color: "primary.contrastText",
                    borderColor: "primary.contrastText",
                    border: "1px solid",
                    fontWeight: "bold",
                    mb: 1,
                  }}
                />
              ))}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} mt={6}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  px: 6,
                  py: 2,
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  borderRadius: 2,
                  bgcolor: "lightblue",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                  },
                }}
                onClick={() => clerk.openSignUp()}
              >
                Start Chatting with ChessAgine via AgineCloud
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "primary.contrastText",
                  color: "primary.contrastText",
                  "&:hover": {
                    borderColor: "primary.contrastText",
                    bgcolor: "rgba(255, 255, 255, 0.1)",
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

      <Box py={16} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack spacing={6} alignItems="center">
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Experience Modern Chess Analysis
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                A glimpse into the future of chess training
              </Typography>
            </Box>

            <Card
              elevation={24}
              sx={{
                width: "100%",
                borderRadius: 4,
                overflow: "hidden",
                transition: "all 0.4s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: (theme) =>
                    `0 32px 64px ${theme.palette.primary.main}40`,
                },
              }}
            >
              <CardMedia
                component="img"
                image="/static/images/aginelatestui.png"
                alt="ChessAgine Interface Preview"
                sx={{
                  width: "100%",
                  height: "auto",
                  objectFit: "cover",
                }}
              />
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* FOSS Emphasis Section */}
      <Box py={16} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Box textAlign="center" maxWidth="900px">
              <CodeIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />
              <Typography
                variant="h2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Free & Open Source Forever
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, mb: 4 }}
              >
                ChessAgine is licensed under GPL, ensuring it remains free and
                community-driven
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={4}
              sx={{ width: "100%" }}
            >
              {[
                {
                  icon: (
                    <CodeIcon sx={{ fontSize: 48, color: "primary.main" }} />
                  ),
                  title: "GPL Licensed",
                  description:
                    "Full source code available under GPL license. Fork, modify, and contribute back to the community.",
                },
                {
                  icon: (
                    <OpenInNewIcon
                      sx={{ fontSize: 48, color: "primary.main" }}
                    />
                  ),
                  title: "Transparent Development",
                  description:
                    "All development happens in the open. Track issues, propose features, and contribute on GitHub.",
                },
                {
                  icon: (
                    <StorageIcon sx={{ fontSize: 48, color: "primary.main" }} />
                  ),
                  title: "No Vendor Lock-In",
                  description:
                    "Use your own AI providers or run models locally. Your data, your rules, your infrastructure.",
                },
                {
                  icon: (
                    <SecurityIcon
                      sx={{ fontSize: 48, color: "primary.main" }}
                    />
                  ),
                  title: "Community Driven",
                  description:
                    "Features requested by players, built by contributors, and reviewed by the community.",
                },
              ].map((card) => (
                <Paper
                  key={card.title}
                  elevation={4}
                  sx={{
                    p: 4,
                    textAlign: "center",
                    flex: 1,
                    bgcolor: "background.paper",
                    borderRadius: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: (theme) =>
                        `0 12px 30px ${theme.palette.primary.main}25`,
                    },
                  }}
                >
                  <Box mb={2}>{card.icon}</Box>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary.main"
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
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Plug & Play AI Integration */}
      <Box py={16} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Plug & Play AI Integration
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                Use your own API key, or go free with ChessAgine Cloud or Ollama
                (no key required!)
              </Typography>
            </Box>

            <Stack spacing={4} sx={{ width: "100%" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                {[
                  {
                    icon: (
                      <Cloud sx={{ fontSize: 48, color: "primary.main" }} />
                    ),
                    title: "ChessAgine Cloud",
                    description:
                      "Start using ChessAgine with open source models run by ChessAgine for you to use 100% free.",
                  },
                  {
                    icon: (
                      <StorageIcon
                        sx={{ fontSize: 48, color: "primary.main" }}
                      />
                    ),
                    title: "Ollama Support",
                    description:
                      "Run models locally or via Ollama cloud. No API key required. 100% free, open source.",
                  },
                  {
                    icon: (
                      <SwapCallsOutlined
                        sx={{ fontSize: 48, color: "primary.main" }}
                      />
                    ),
                    title: "OpenRouter Support",
                    description:
                      "Connect to multiple providers via OpenRouter for flexible AI model access.",
                  },
                ].map((card) => (
                  <Paper
                    key={card.title}
                    elevation={4}
                    sx={{
                      p: 4,
                      textAlign: "center",
                      flex: 1,
                      bgcolor: "background.paper",
                      borderRadius: 3,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: (theme) =>
                          `0 12px 30px ${theme.palette.primary.main}25`,
                      },
                    }}
                  >
                    <Box mb={2}>{card.icon}</Box>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      color="primary.main"
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
                ))}
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                {[
                  {
                    icon: (
                      <ApiIcon sx={{ fontSize: 48, color: "primary.main" }} />
                    ),
                    title: "Your API, Your Control",
                    description:
                      "Connect OpenAI, Anthropic Claude, or Google Gemini with your own API key. Pay only for what you use.",
                  },
                  {
                    icon: (
                      <SecurityIcon
                        sx={{ fontSize: 48, color: "primary.main" }}
                      />
                    ),
                    title: "Privacy First",
                    description:
                      "Your API keys are stored locally in your browser. We never see or store your credentials.",
                  },
                  {
                    icon: (
                      <PsychologyIcon
                        sx={{ fontSize: 48, color: "primary.main" }}
                      />
                    ),
                    title: "Choose Your Model",
                    description:
                      "From free models on Ollama to premium models on cloud - select the AI that fits your needs.",
                  },
                ].map((card) => (
                  <Paper
                    key={card.title}
                    elevation={4}
                    sx={{
                      p: 4,
                      textAlign: "center",
                      flex: 1,
                      bgcolor: "background.paper",
                      borderRadius: 3,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: (theme) =>
                          `0 12px 30px ${theme.palette.primary.main}25`,
                      },
                    }}
                  >
                    <Box mb={2}>{card.icon}</Box>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      color="primary.main"
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
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={16} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack spacing={12}>
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Powerful Chess Features
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                Everything you need for comprehensive chess training
              </Typography>
            </Box>

            <Stack spacing={4}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={6}>
                {[
                  {
                    icon: (
                      <ChatIcon
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "Q/A Interactive Mode",
                    description:
                      "Just like a chess buddy, ChessAgine can ask interactive questions to make you think about chess.",
                  },
                  {
                    icon: (
                      <SearchIcon
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "Web Chess Search",
                    description:
                      "Access real-time chess data like blogs, YouTube, notes from across the web for comprehensive analysis.",
                  },
                  {
                    icon: (
                      <StorageIcon
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "Lichess Master DB",
                    description:
                      "Explore opening variations with the complete Lichess master games database and opening explorer.",
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
                      bgcolor: "background.paper",
                      borderRadius: 4,
                      flex: 1,
                      minHeight: 320,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: (theme) =>
                          `0 20px 40px ${theme.palette.primary.main}25`,
                      },
                    }}
                  >
                    {card.icon}
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      gutterBottom
                      color="primary.main"
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
                ))}
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={6}>
                {[
                  {
                    icon: (
                      <SmartToy
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "Stockfish 17.1 Engine",
                    description:
                      "Powered by the latest Stockfish 17.1 engine for world-class position evaluation and tactical analysis.",
                  },
                  {
                    icon: (
                      <PsychologyIcon
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "Maia 2: Human-Like Model",
                    description:
                      "Maia 2 is trained to mimic human move choices and evaluations, making it ideal for training with realistic play, learning from typical mistakes, and improving practical decision-making.",
                  },
                  {
                    icon: (
                      <Extension
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "AI-Powered Puzzles",
                    description:
                      "Solve interactive puzzles with AI guidance that adapts to your skill level and explains solutions.",
                  },
                  {
                    icon: (
                      <FreeBreakfastIcon
                        sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                      />
                    ),
                    title: "Free Game Reviews",
                    description:
                      "Upload your games and get detailed AI analysis with explanations of key moments and improvements.",
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
                      bgcolor: "background.paper",
                      borderRadius: 4,
                      flex: 1,
                      minHeight: 320,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: (theme) =>
                          `0 20px 40px ${theme.palette.primary.main}25`,
                      },
                    }}
                  >
                    {card.icon}
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      gutterBottom
                      color="primary.main"
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
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* MCP Section */}
      <Box py={16} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center">
            <Box textAlign="center" maxWidth="900px">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                ChessAgine MCP
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1.2rem", md: "1.5rem" },
                  mb: 4,
                }}
              >
                Model Context Protocol server that transforms Claude AI into a
                chess expert
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: "1.1rem", lineHeight: 1.8, textAlign: "left" }}
              >
                ChessAgine MCP is a powerful integration that connects Claude AI
                directly to chess engines, databases, and analysis tools through
                Anthropic Model Context Protocol. Instead of using a separate
                web interface, you can chat with Claude in Claude.ai or the
                Claude desktop app and get the same professional chess analysis
                capabilities - all within your natural conversation with Claude.
              </Typography>
            </Box>

            <Stack spacing={4} sx={{ width: "100%", mt: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                {[
                  {
                    title: "Native Claude Integration",
                    description:
                      "Use ChessAgine directly in Claude.ai or Claude Desktop app - no separate interface needed. Just chat naturally with Claude about chess.",
                  },
                  {
                    title: "Stockfish 17.1 Analysis",
                    description:
                      "Access world-class engine analysis directly through Claude. Get position evaluations, best moves, and tactical insights in real-time.",
                  },
                  {
                    title: "Lichess Database Access",
                    description:
                      "Query the Lichess master games database, fetch your recent games, and explore opening variations - all through simple conversation.",
                  },
                ].map((card) => (
                  <Paper
                    key={card.title}
                    elevation={3}
                    sx={{
                      p: 4,
                      flex: 1,
                      bgcolor: "background.paper",
                      borderRadius: 3,
                      borderLeft: (theme) =>
                        `4px solid ${theme.palette.primary.main}`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateX(8px)",
                        boxShadow: (theme) =>
                          `0 8px 24px ${theme.palette.primary.main}25`,
                      },
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="primary.main"
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
                ))}
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                {[
                  {
                    title: "Interactive Puzzle Training",
                    description:
                      "Solve Lichess puzzles with Claude as your coach. Get hints, explanations, and adaptive difficulty based on your skill level.",
                  },
                  {
                    title: "Comprehensive Game Reviews",
                    description:
                      "Upload PGN files and receive detailed analysis with theme progression tracking, critical moments identification, and improvement suggestions.",
                  },
                  {
                    title: "Chess Knowledge Base",
                    description:
                      "Access Silman's Imbalances, Fine's 30 Principles, endgame theory, and practical checklists to enhance your understanding.",
                  },
                ].map((card) => (
                  <Paper
                    key={card.title}
                    elevation={3}
                    sx={{
                      p: 4,
                      flex: 1,
                      bgcolor: "background.paper",
                      borderRadius: 3,
                      borderLeft: (theme) =>
                        `4px solid ${theme.palette.primary.main}`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateX(8px)",
                        boxShadow: (theme) =>
                          `0 8px 24px ${theme.palette.primary.main}25`,
                      },
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="primary.main"
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
                ))}
              </Stack>
            </Stack>

            <Button
              variant="contained"
              size="large"
              sx={{
                px: 8,
                py: 3,
                fontSize: "1.4rem",
                fontWeight: "bold",
                borderRadius: 3,
                bgcolor: "lightblue",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                },
              }}
              onClick={() => router.push("/docs")}
            >
              Install MCP Server
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box py={16} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack spacing={12}>
            <Box textAlign="center">
              <Typography
                variant="h2"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Why Choose ChessAgine?
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" } }}
              >
                Experience chess training that feels natural and intuitive
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={6}>
              {[
                {
                  icon: (
                    <SportsEsportsIcon
                      sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                    />
                  ),
                  title: "Interactive Training",
                  description:
                    "Ask for puzzle hints, answer various questions ChessAgine asks you live.",
                },
                {
                  icon: (
                    <SchoolIcon
                      sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                    />
                  ),
                  title: "Learn to Think",
                  description:
                    "Develop better decision-making patterns and strategic understanding with guided analysis and explanations.",
                },
                {
                  icon: (
                    <ApiIcon
                      sx={{ fontSize: 64, color: "primary.main", mb: 3 }}
                    />
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
                    bgcolor: "background.paper",
                    borderRadius: 4,
                    flex: 1,
                    minWidth: 0,
                    minHeight: 370,
                    height: { xs: "auto", md: 370 },
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: (theme) =>
                        `0 20px 40px ${theme.palette.primary.main}25`,
                    },
                  }}
                >
                  {card.icon}
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    gutterBottom
                    color="primary.main"
                  >
                    {card.title}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {card.description}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box
        py={16}
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "primary.contrastText",
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={6} alignItems="center" textAlign="center">
            <Box>
              <Typography
                variant="h2"
                fontWeight="bold"
                sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}
                gutterBottom
              >
                Ready to experience the next generation of chess analysis?
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
                px: 8,
                py: 3,
                fontSize: "1.4rem",
                fontWeight: "bold",
                borderRadius: 3,
                bgcolor: "lightblue",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                },
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
