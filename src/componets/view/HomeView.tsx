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
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ViewBoardIcon from "@mui/icons-material/Bolt";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FaPuzzlePiece, FaQuestion } from "react-icons/fa6";


export default function HomeView() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Dashboard for logged-in users
  if (isSignedIn && isLoaded) {
    const features = [
      {
        icon: <ViewBoardIcon sx={{ fontSize: { xs: 40, md: 48 } }} />,
        title: "Position Board",
        description: "Set up any position and analyze it with Agine.",
        path: "/position",
        color: theme.palette.primary.main,
      },
      {
        icon: <AnalyticsIcon sx={{ fontSize: { xs: 40, md: 48 } }} />,
        title: "Game Analysis",
        description: "Upload your games or paste PGN to get detailed analysis.",
        path: "/game",
        color: theme.palette.secondary.main,
      },
      {
        icon: <FaPuzzlePiece style={{ fontSize: isMobile ? 40 : 48 }} />,
        title: "Interactive Puzzles",
        description: "Solve chess puzzles interactively with Agine's guidance.",
        path: "/puzzle",
        color: theme.palette.success.main,
      },
      {
        icon: <FaQuestion style={{ fontSize: isMobile ? 40 : 48 }} />,
        title: "Documentation",
        description: "Learn how to use ChessAgine and set up your API key.",
        path: "/docs",
        color: theme.palette.info?.main || '#2196f3',
      },
    ];

    return (
      <main>
        {/* Hero Section */}
        <Box 
          sx={{ 
            py: { xs: 4, sm: 6, md: 8 },
            background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          }}
        >
          <Container maxWidth="lg">
            <Stack spacing={{ xs: 2, md: 3 }} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "#f5deb3",
                  color: "#7c3aed",
                  width: { xs: 56, sm: 64, md: 72 },
                  height: { xs: 56, sm: 64, md: 72 },
                }}
                src="/static/images/agineowl.png"
              />
              <Typography 
                variant={isMobile ? "h5" : isTablet ? "h4" : "h3"} 
                fontWeight="bold" 
                textAlign="center"
              >
                Welcome back, {user?.firstName || "Chess Player"}!
              </Typography>
              <Typography 
                variant={isMobile ? "body1" : "h6"} 
                sx={{ opacity: 0.85 }} 
                textAlign="center"
                px={{ xs: 2, sm: 4 }}
              >
                Ready to improve your chess with AI-powered analysis?
              </Typography>
            </Stack>
          </Container>
        </Box>

        {/* Features Grid */}
        <Box sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <Grid 
              container 
              spacing={{ xs: 2, sm: 3, md: 4 }}
              justifyContent="center"
            >
              {features.map((feature) => (
                <Grid 
                  
                  sx={{xs: 12, sm: 6, md: 6, lg: 3}}
                  key={feature.title}
                >
                  <Card
                    elevation={3}
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      borderRadius: { xs: 2, md: 3 },
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "4px",
                        background: feature.color,
                        transform: "scaleX(0)",
                        transformOrigin: "left",
                        transition: "transform 0.3s ease",
                      },
                      "&:hover": {
                        transform: { xs: "translateY(-4px)", md: "translateY(-8px)" },
                        boxShadow: theme.shadows[8],
                        "&::before": {
                          transform: "scaleX(1)",
                        },
                      },
                      "&:active": {
                        transform: "translateY(-2px)",
                      },
                    }}
                    onClick={() => router.push(feature.path)}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 3, md: 4 },
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: { xs: 1.5, md: 2 },
                        textAlign: "center",
                      }}
                    >
                      <Box 
                        sx={{ 
                          color: feature.color,
                          mb: { xs: 1, md: 2 },
                          transition: "transform 0.3s ease",
                          ".MuiCard-root:hover &": {
                            transform: "scale(1.1)",
                          }
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant={isMobile ? "h6" : "h5"}
                        fontWeight="bold"
                        gutterBottom
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ 
                          opacity: 0.85,
                          mb: { xs: 1, md: 2 },
                          minHeight: { xs: "auto", md: "48px" },
                        }}
                      >
                        {feature.description}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: feature.color,
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          mt: "auto",
                        }}
                      >
                        Get Started
                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Quick Tips Section */}
        <Box 
          sx={{ 
            py: { xs: 4, sm: 6, md: 8 },
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Container maxWidth="lg">
            <Paper
              elevation={2}
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
                borderRadius: { xs: 2, md: 3 },
                textAlign: "center",
              }}
            >
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                fontWeight="bold" 
                gutterBottom
              >
                💡 Getting Started
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ opacity: 0.85, mb: 3 }}
                px={{ xs: 0, sm: 4 }}
              >
                New to ChessAgine? Start with the Position Board to explore how AI analysis works, 
                or jump into Game Analysis to review your recent games.
              </Typography>
              <Stack 
                direction={{ xs: "column", sm: "row" }} 
                spacing={2}
                justifyContent="center"
              >
                <Button
                  variant="contained"
                  size={isMobile ? "medium" : "large"}
                  onClick={() => router.push("/position")}
                  sx={{ 
                    borderRadius: 2,
                    px: { xs: 3, md: 4 },
                  }}
                >
                  Start Analyzing
                </Button>
                <Button
                  variant="outlined"
                  size={isMobile ? "medium" : "large"}
                  onClick={() => router.push("/docs")}
                  sx={{ 
                    borderRadius: 2,
                    px: { xs: 3, md: 4 },
                  }}
                >
                  View Documentation
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Box>
      </main>
    );
  }
}