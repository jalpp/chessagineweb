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
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ExtensionIcon from "@mui/icons-material/Extension";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "usehooks-ts";
import { ChatBubble } from "@mui/icons-material";

const STYLES = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseRing {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.06); }
  }
  @keyframes boardPulse {
    0%, 100% { opacity: 0.035; }
    50%       { opacity: 0.065; }
  }
  .anim-0 { animation: fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
  .anim-1 { animation: fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
  .anim-2 { animation: fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
  .anim-3 { animation: fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
  .anim-4 { animation: fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.36s both; }
  .anim-5 { animation: fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.44s both; }
  .pulse-ring { animation: pulseRing 3s ease-in-out infinite; }
  .feature-card {
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1),
                box-shadow  0.28s ease,
                border-color 0.28s ease;
  }
  .feature-card:hover { transform: translateY(-7px); }
  .card-arrow { transition: transform 0.22s ease; }
  .feature-card:hover .card-arrow { transform: translateX(4px); }
  .top-bar { transform: scaleX(0); transform-origin: left; transition: transform 0.28s ease; }
  .feature-card:hover .top-bar { transform: scaleX(1); }
`;

function ChessBoardBg() {
  const theme = useTheme();
  const cells = Array.from({ length: 64 });
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        animation: "boardPulse 6s ease-in-out infinite",
        pointerEvents: "none",
      }}
    >
      {cells.map((_, i) => {
        const light = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
        return (
          <Box
            key={i}
            sx={{
              background: light
                ? isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.04)"
                : "transparent",
            }}
          />
        );
      })}
    </Box>
  );
}

type ColorKey = "primary" | "secondary" | "success" | "warning" | "info";

const features: {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  colorKey: ColorKey;
  badge?: string;
}[] = [
  {
    icon: BoltIcon,
    title: "Position Board",
    description: "Set up any chess position",
    path: "/position",
    colorKey: "primary",
    badge: "Popular",
  },
  {
    icon: AnalyticsIcon,
    title: "Game Analysis",
    description: "Upload games or paste PGN for game analysis.",
    path: "/game",
    colorKey: "secondary",
  },
  {
    icon: ExtensionIcon,
    title: "Interactive Puzzles",
    description: "Solve puzzles for various themes and levels",
    path: "/puzzle",
    colorKey: "success",
    badge: "New",
  },
  {
    icon: ChatBubble,
    title: "Agine Chat",
    description: "Have Interactive chat about chess",
    path: "/chat",
    colorKey: "success",
    badge: "Popular",
  },
  {
    icon: SportsEsportsIcon,
    title: "Play vs Engines",
    description: "Challenge neural networks and engines in real-time.",
    path: "/play",
    colorKey: "warning",
  },
  {
    icon: HelpOutlineIcon,
    title: "Documentation",
    description:
      "Learn how to use ChessAgine and configure your own instance and learn about AgineCloud.",
    path: "/docs",
    colorKey: "info",
  },
];

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: { xs: 2.5, md: 3 },
        py: 1.5,
        borderRadius: 2,
        background: alpha(color, 0.08),
        border: `1px solid ${alpha(color, 0.22)}`,
        minWidth: 90,
      }}
    >
      <Typography
        sx={{ fontWeight: 700, fontSize: "1.3rem", color, lineHeight: 1.2 }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          mt: 0.3,
          fontSize: "0.68rem",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ─── Feature card ────────────────────────────────────────────────────────────

function FeatureCard({
  feature,
  animIdx,
  onNavigate,
}: {
  feature: (typeof features)[number];
  animIdx: number;
  onNavigate: (path: string) => void;
}) {
  const theme = useTheme();
  const color =
    theme.palette[feature.colorKey]?.main ?? theme.palette.primary.main;
  const IconComp = feature.icon;

  return (
    <Box className={`anim-${Math.min(animIdx + 1, 5)}`} sx={{ height: "100%" }}>
      <Card
        className="feature-card"
        elevation={0}
        onClick={() => onNavigate(feature.path)}
        sx={{
          height: "100%",
          cursor: "pointer",
          borderRadius: 3,
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          "&:hover": {
            borderColor: alpha(color, 0.45),
            boxShadow: `0 20px 48px ${alpha(color, 0.1)}, 0 4px 16px ${alpha(theme.palette.common.black, 0.12)}`,
          },
        }}
      >
        {/* Animated top accent bar */}
        <Box
          className="top-bar"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.35)})`,
            borderRadius: "3px 3px 0 0",
          }}
        />

        {/* Corner radial glow */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <CardContent
          sx={{
            p: 3.5,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {/* Icon + badge */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: 2,
                background: alpha(color, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color,
              }}
            >
              <IconComp sx={{ fontSize: 24 }} />
            </Box>
            {feature.badge && (
              <Chip
                label={feature.badge}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  background: alpha(color, 0.12),
                  color,
                  border: `1px solid ${alpha(color, 0.3)}`,
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}
          </Box>

          <Typography
            variant="h6"
            sx={{ mt: 0.5, fontWeight: 600, fontSize: "1rem" }}
          >
            {feature.title}
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", flex: 1, fontSize: "0.875rem" }}
          >
            {feature.description}
          </Typography>

          <Box
            className="card-arrow"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color,
              fontSize: "0.82rem",
              fontWeight: 600,
              width: "fit-content",
              mt: "auto",
            }}
          >
            Explore
            <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

// ─── Main export (no ThemeProvider wrapper — uses layout.tsx theme) ──────────

export default function HomeView() {
  const { user } = useUser();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  const [userPuzzleRating] = useLocalStorage<number>(
    "agine_user_puzzle_rating",
    1500,
  );

  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const success = theme.palette.success.main;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{STYLES}</style>

      {/* Ambient blobs — use theme palette colours so they adapt to any theme */}
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          top: "-15vw",
          left: "-10vw",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(primary, isDark ? 0.08 : 0.05)} 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          bottom: "-10vw",
          right: "-10vw",
          width: "45vw",
          height: "45vw",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(secondary, isDark ? 0.06 : 0.04)} 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      
      <Box
        sx={{
          position: "relative",
          pt: { xs: 6, md: 10 },
          pb: { xs: 5, md: 8 },
          overflow: "hidden",
        }}
      >
        <ChessBoardBg />

       
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${alpha(primary, 0.3)}, transparent)`,
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Stack spacing={3} alignItems="center">
           
            <Box
              className="anim-0"
              sx={{ position: "relative", display: "inline-flex" }}
            >
              <Box
                className="pulse-ring"
                sx={{
                  position: "absolute",
                  inset: -5,
                  borderRadius: "50%",
                  border: `1.5px solid ${alpha(primary, 0.45)}`,
                  pointerEvents: "none",
                }}
              />
              <Avatar
                src="/static/images/agineowl.png"
                sx={{
                  width: { xs: 68, md: 84 },
                  height: { xs: 68, md: 84 },
                  bgcolor: alpha(primary, 0.1),
                  border: `2px solid ${alpha(primary, 0.3)}`,
                  fontSize: 36,
                  color: primary,
                }}
              >
                
              </Avatar>
            </Box>

            
            <Box className="anim-1" sx={{ textAlign: "center" }}>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                fontWeight={700}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.text.primary} 30%, ${primary} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  mb: 1,
                }}
              >
                Welcome back, {user?.firstName ?? "Chess Player"}!
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", fontSize: "1.05rem" }}
              >
                Your chess intelligence hub is ready.
              </Typography>
            </Box>

            {/* Stat pills */}
            <Box
              className="anim-2"
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <StatPill
                label="Puzzle Rating"
                value={String(userPuzzleRating)}
                color={primary}
              />
              
            </Box>
          </Stack>
        </Container>
      </Box>

     
      <Container
        maxWidth="lg"
        sx={{ py: { xs: 5, md: 8 }, position: "relative", zIndex: 1 }}
      >
        <Box className="anim-2" sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              letterSpacing: "0.12em",
              fontWeight: 600,
              display: "block",
              mb: 0.5,
            }}
          >
            Your Tools
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            Where would you like to go?
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {features.map((feature, i) => (
            <Grid
              key={feature.title}
              size={{ xs: 12, sm: 6, md: i < 2 ? 6 : 4 }}
            >
              <FeatureCard
                feature={feature}
                animIdx={i}
                onNavigate={(path) => router.push(path)}
              />
            </Grid>
          ))}
        </Grid>
      </Container>

      
      <Container
        maxWidth="lg"
        sx={{ pb: { xs: 6, md: 10 }, position: "relative", zIndex: 1 }}
      >
        <Paper
          elevation={0}
          className="anim-5"
          sx={{
            p: { xs: 3.5, md: 5 },
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(primary, 0.07)} 0%, ${alpha(secondary, 0.04)} 100%)`,
            border: `1px solid ${alpha(primary, 0.18)}`,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            gap: 3,
            position: "relative",
            overflow: "hidden",
          }}
        >
         
          <Typography
            aria-hidden
            sx={{
              position: "absolute",
              right: { xs: 12, md: 36 },
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: { xs: "6rem", md: "9rem" },
              opacity: isDark ? 0.05 : 0.04,
              lineHeight: 1,
              userSelect: "none",
              pointerEvents: "none",
              color: "text.primary",
            }}
          >
            ♜
          </Typography>

          <Box sx={{ flex: 1, position: "relative" }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              💡 New to ChessAgine?
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", maxWidth: 520 }}
            >
              Start with the Position Board to see how Agine's analysis works,
              or jump into Game Analysis to review your most recent games with
              engine and neural nets.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} flexShrink={0}>
            <Button
              variant="contained"
              size="medium"
              endIcon={<BoltIcon />}
              onClick={() => router.push("/position")}
            >
              Start Analyzing
            </Button>
            <Button
              variant="outlined"
              size="medium"
              onClick={() => router.push("/docs")}
            >
              Docs
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
