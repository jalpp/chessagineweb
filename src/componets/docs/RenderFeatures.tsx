import { JSX } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  Psychology as PsychologyIcon,
  AccountTree as TreeIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  Chat as ChatIcon,
  SportsEsports as GameIcon,
  Extension as PuzzleIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";

interface FeatureDetail {
  name: string;
  icon: JSX.Element;
  description: string;
  capabilities: string[];
  highlights?: string[];
}

const FEATURES: FeatureDetail[] = [
  {
    name: "Agine Chat",
    icon: <ChatIcon />,
    description:
      "Interactive AI-powered chess companion for learning and analysis. Free models available on all accounts; premium models on paid tier.",
    capabilities: [
      "Stockfish engine integration for precise move evaluation",
      "Position-specific analysis from the board to brainstorm ideas",
      "Call external chess engines like Stockfish and Maia on demand",
      "PGN game review via chat",
      "access your opening repertoire via Lichess Study and ChessBoardMagic integration",
      "Free tier: access to random smaller models for quick analysis",
      "Paid tier: 6 premium models + more tool calls + extended chess context",
    ],
    highlights: [
      "No setup — start chatting instantly",
      "Paid tier unlocks Gemini Pro, Claude Sonnet, Qwen, Llama & GPT-5.6",
      "Paid tier unlocks external integrations like Chessboardmagic and using personal OpenRouter account"
    ],
  },
  {
    name: "Position Theme Analysis",
    icon: <CalculateIcon />,
    description:
      "Mathematical estimation of chess position themes using advanced algorithms.",
    capabilities: [
      "Material evaluation and balance",
      "Mobility analysis for all pieces",
      "Space control calculation",
      "Positional advantage assessment",
      "King safety evaluation",
      "Tactical pattern detection",
      "Dark & light square control measurement",
      "Tempo advantage tracking",
    ],
    highlights: [
      "Guess the Eval: test your evaluation skills vs. Stockfish",
      "Theme Scores: compare your estimate with calculated theme scores",
    ],
  },
  {
    name: "Stockfish Analysis",
    icon: <SettingsIcon />,
    description:
      "Comprehensive chess engine analysis with multiple Stockfish versions, running entirely in the browser.",
    capabilities: [
      "Stockfish 18, 17.1, 17, 16.1, and 11 support",
      "Browser-based execution — no server required",
      "Adjustable depth (12–30 ply)",
      "Multi-PV analysis (1–5 lines)",
      "Detailed move variations",
      "Real-time evaluation updates",
    ],
    highlights: [
      "Runs directly in your browser — no installs",
      "Customize depth and number of variations",
    ],
  },
  {
    name: "Neural Network Analysis",
    icon: <PsychologyIcon />,
    description:
      "Advanced AI analysis using multiple neural network models — runs locally in your browser.",
    capabilities: [
      "Maia2 (1100–1900): human-like play trained on real player games",
      "Maia3 (600-2600): human like play and analysis, trained on real player games and improvement over maia2",
      "Leela T1-256: self-play trained for objective evaluation",
      "Elite Maia: trained on 2500+ rated Lichess master games",
      "Policy network visualization (move probabilities)",
      "Value network evaluation (position assessment)",
      "Download and run networks locally — no API calls",
    ],
    highlights: [
      "Choose the right network for your skill level",
      "Human Estimated Eval (HEE) Eval bar to see human level eval using Maia3",
      "See how humans vs. engines evaluate positions differently",
    ],
  },
  {
    name: "Opening Explorer",
    icon: <SearchIcon />,
    description:
      "Comprehensive opening database with master and player game statistics.",
    capabilities: [
      "Lichess master database integration",
      "Lichess player database statistics",
      "Move occurrence frequency",
      "Win/Draw/Loss percentages per move",
      "Top master games from each position",
      "Opening name and ECO code identification",
    ],
    highlights: [
      "Compare how masters vs. regular players handle positions",
      "Study actual games from any position",
    ],
  },
  {
    name: "Chess Database (ChessDB)",
    icon: <StorageIcon />,
    description:
      "Query an extensive chess database for position evaluations and move rankings.",
    capabilities: [
      "Position evaluation in centipawns",
      "Move win percentage calculations",
      "Move ranking and popularity",
      "ChessDB expert notes and annotations",
      "All available moves from database",
      "Historical game references",
    ],
    highlights: [
      "Access millions of analyzed positions",
      "Expert annotations and insights",
    ],
  },
  {
    name: "Game Analysis",
    icon: <TimelineIcon />,
    description:
      "Comprehensive game import and analysis with multiple data sources and detailed move classification.",
    capabilities: [
      "Lichess study & game URL import",
      "Direct PGN input (copy/paste)",
      "Search and import Lichess user games",
      "PGN file upload (1–5000 games)",
      "Automatic game review with move classification",
      "Evaluation graph with move annotations",
      "Neural Network Move Probability (0–1 scale)",
      "Improbable Move Detection with adjustable threshold",
      "Candidate Move Analysis: ChessDB Win% & Notes",
    ],
    highlights: [
      "Move Classification: Blunder, Mistake, Dubious, Good, Brilliant, Best, Book",
      "Move Categories: Expected Strong, Common Mistake, Hidden Gem, Rare Blunder",
    ],
  },
  {
    name: "Play Bot",
    icon: <GameIcon />,
    description:
      "Practice against neural networks and Stockfish at various difficulty levels.",
    capabilities: [
      "Multiple neural network opponents",
      "Stockfish at adjustable strength",
      "Custom position setup",
      "Time control configuration",
      "Rating-based difficulty levels",
      "Dojo sparring positions",
      "Hand-picked training positions",
      "Rating-specific position sets",
    ],
    highlights: [
      "Train specific positions from curated collections",
      "Adjust opponent strength to match your level",
    ],
  },
  {
    name: "Puzzle Training",
    icon: <PuzzleIcon />,
    description:
      "Tactical puzzle practice with the full Lichess puzzle database.",
    capabilities: [
      "Filter by puzzle themes (forks, pins, skewers, etc.)",
      "Rating-based puzzle selection",
      "Lichess puzzle database integration",
      "Rating-adjusted difficulty",
      "Track puzzle rating progress",
    ],
    highlights: [
      "Guess the Eval Mode: estimate Stockfish eval and theme scores per puzzle",
      "Progress tracking across sessions",
    ],
  },
];

export const renderFeatures = () => (
  <Box>
    <Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 3 }}>
      ChessAgine Features
    </Typography>

    <Grid container spacing={3}>
      {FEATURES.map((feature, index) => (
        <Grid
          key={index}
          size={{ xs: 12, md: 6 }}
          sx={{ display: "flex" }}
        >
          <Card variant="outlined" sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <CardContent sx={{ flex: 1 }}>
              {/* Header */}
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box sx={{ color: "primary.main", display: "flex" }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  {feature.name}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={2}>
                {feature.description}
              </Typography>

              {/* Highlights */}
              {feature.highlights && feature.highlights.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={0.75} mb={2}>
                  {feature.highlights.map((h, i) => (
                    <Chip
                      key={i}
                      label={h}
                      size="small"
                      color="success"
                      icon={<AutoAwesomeIcon />}
                      sx={{ fontSize: "0.7rem", height: 24 }}
                    />
                  ))}
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Capabilities */}
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Capabilities
              </Typography>
              <List dense disablePadding>
                {feature.capabilities.map((c, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={c}
                      primaryTypographyProps={{
                        variant: "body2",
                        color: "text.secondary",
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
);