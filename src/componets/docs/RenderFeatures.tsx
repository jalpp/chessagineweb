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
  Paper,
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
  Speed as SpeedIcon,
  EmojiEvents as TrophyIcon,
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
    name: "Position Theme Analysis",
    icon: <CalculateIcon />,
    description: "Mathematical estimation of chess position themes using advanced algorithms",
    capabilities: [
      "Material evaluation and balance",
      "Mobility analysis for all pieces",
      "Space control calculation",
      "Positional advantage assessment",
      "King safety evaluation",
      "Tactical pattern detection",
      "Dark square control measurement",
      "Light square control measurement",
      "Tempo advantage tracking",
    ],
    highlights: [
      "Guess the Eval: Test your evaluation skills by guessing Stockfish's eval",
      "Theme Scores: Compare your estimation with calculated theme scores",
    ],
  },
  {
    name: "Stockfish Analysis",
    icon: <SettingsIcon />,
    description: "Comprehensive chess engine analysis with multiple Stockfish versions",
    capabilities: [
      "Multiple engine versions: Stockfish 17.1, 17, 16.1, and 11",
      "Browser-based engine execution (no server needed)",
      "Adjustable engine depth (12-30 ply)",
      "Multi-PV analysis (1-5 lines)",
      "Detailed move variations",
      "Real-time evaluation updates",
      "Tactical analysis and best move suggestions",
    ],
    highlights: [
      "Run powerful chess engines directly in your browser",
      "Customize analysis depth and number of variations",
    ],
  },
  {
    name: "Variation Tree Viewer",
    icon: <TreeIcon />,
    description: "Visualize and explore chess variations as an interactive tree structure",
    capabilities: [
      "Configurable tree depth and breadth",
      "ChessDB integration for move data",
      "Ease metric calculation for positions",
      "Visual representation of move paths",
      "Position difficulty assessment",
      "Branch exploration and navigation",
    ],
    highlights: [
      "Ease Metric: Shows how easy or hard each position is to play",
      "Interactive tree navigation through variations",
    ],
  },
  {
    name: "Neural Network Analysis",
    icon: <PsychologyIcon />,
    description: "Advanced AI analysis using multiple neural network models",
    capabilities: [
      "Maia2 (1100-1900 rating range): Human-like play trained on actual player games",
      "Leela T1-256: Self-play trained neural network for objective evaluation",
      "Elite Maia: Specialized network trained on 2500+ rated Lichess master games",
      "Policy network visualization (move probabilities)",
      "Value network evaluation (position assessment)",
      "Download and run networks locally in browser",
      "No external API calls required",
    ],
    highlights: [
      "Choose the right network for your skill level",
      "See how human players vs. engines evaluate positions differently",
    ],
  },
  {
    name: "Opening Explorer",
    icon: <SearchIcon />,
    description: "Comprehensive opening database with master and player game statistics",
    capabilities: [
      "Lichess master database integration",
      "Lichess player database statistics",
      "Move occurrence frequency",
      "Win/Draw/Loss percentages for each move",
      "Number of games reaching each position",
      "Top master games featuring the position",
      "Opening name and ECO code identification",
    ],
    highlights: [
      "Compare how masters vs. regular players handle positions",
      "Study actual games from the position",
    ],
  },
  {
    name: "Chess Database (ChessDB)",
    icon: <StorageIcon />,
    description: "Query extensive chess database for position evaluations and move rankings",
    capabilities: [
      "Position evaluation (centipawn score)",
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
    name: "Agine Chat",
    icon: <ChatIcon />,
    description: "Interactive AI-powered chess companion for learning and analysis",
    capabilities: [
      "Access to Chess engines like Stockfish",
      "Position-specific analysis",
      "Game review related PGN input analysis",
    ],
  },
  {
    name: "Game Analysis",
    icon: <TimelineIcon />,
    description: "Comprehensive game import and analysis with multiple data sources",
    capabilities: [
      "Lichess study import",
      "Lichess game URL import",
      "Direct PGN input (copy/paste)",
      "Search and import Lichess user games",
      "PGN file upload (1 to 5000 games)",
      "Bulk game analysis support",
      "Automatic game review with move classification",
      "Evaluation graph with move annotations",
    ],
    highlights: [
      "Move Classification: Blunder, Mistake, Dubious, Good, Brilliant, Best, Book",
      "Neural Network Move Probability: See how likely each move was (0-1 scale)",
      "Improbable Move Detection: Graph showing probability changes with adjustable threshold",
      "Candidate Move Analysis: Compare human move probability vs. objective quality (ChessDB Win% & Notes)",
      "Move Categories: Expected Strong, Common Mistake, Hidden Gem, Rare Blunder (5% threshold)",
    ],
  },
  {
    name: "Play Bot",
    icon: <GameIcon />,
    description: "Practice against neural networks and Stockfish at various difficulty levels",
    capabilities: [
      "Play against multiple neural networks",
      "Stockfish opponents at different strengths",
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
    description: "Tactical puzzle practice with comprehensive Lichess puzzle database",
    capabilities: [
      "Filter by puzzle themes",
      "Rating-based puzzle selection",
      "Start at 1500 rating and progress",
      "Lichess puzzle database integration",
      "Theme-based training (forks, pins, etc.)",
      "Rating-adjusted difficulty",
    ],
    highlights: [
      "Guess the Eval Mode: Estimate Stockfish evaluation and theme scores for each puzzle",
      "Track your puzzle rating progress",
    ],
  },
];

export const renderFeatures = () => (
  <Box>
    <Typography variant="h4" gutterBottom color="primary.text" sx={{ mb: 3 }}>
      ChessAgine Features Overview
    </Typography>


    <Grid container spacing={3}>
      {FEATURES.map((feature, index) => (
        <Grid sx={{xs: 12}} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Box sx={{ color: "primary.main" }}>{feature.icon}</Box>
                <Typography variant="h5" color="primary.text">
                  {feature.name}
                </Typography>
              </Box>

              <Typography variant="body1" color="text.secondary" paragraph>
                {feature.description}
              </Typography>

              {feature.highlights && feature.highlights.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {feature.highlights.map((highlight, idx) => (
                      <Chip
                        key={idx}
                        label={highlight}
                        size="small"
                        color="success"
                        icon={<AutoAwesomeIcon />}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom color="primary.text">
                Key Capabilities:
              </Typography>
              <List dense>
                {feature.capabilities.map((capability, idx) => (
                  <ListItem key={idx} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon sx={{ fontSize: 18 }} color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={capability}
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