import dojoRequirements from "./requirements.filtered.json";

export type FenPresetCategory = "opening" | "middlegame" | "endgame" | "dojo" | "custom";

export interface FenPreset {
  id: string;
  name: string;
  fen: string;
  category: FenPresetCategory;
  description?: string;
  dojoCategory?: string;
  cohorts?: string[];
  requirementName?: string;
  result?: string;
  timeControl?: string;
}

export const cohortColors: Record<string, string> = {
  "0-300": "#f8d0f5",
  "300-400": "#eb92c8",
  "400-500": "#c768bc",
  "500-600": "#f1e156",
  "600-700": "#c8c71d",
  "700-800": "#a3951b",
  "800-900": "#eea44f",
  "900-1000": "#d97333",
  "1000-1100": "#9b4007",
  "1100-1200": "#70ec50",
  "1200-1300": "#71c44e",
  "1300-1400": "#0c5c03",
  "1400-1500": "#5551ec",
  "1500-1600": "#004aad",
  "1600-1700": "#003375",
  "1700-1800": "#ae03ff",
  "1800-1900": "#ac00c8",
  "1900-2000": "#6b017d",
  "2000-2100": "#fd0304",
  "2100-2200": "#c21818",
  "2200-2300": "#951313",
  "2300-2400": "#bd4804",
  "2400+": "#9e3b00",
};

interface DojoRequirement {
  requirementName: string;
  shortName: string;
  category: string;
  status: string;
  cohorts: string[];
  id: string;
  positionCount: number;
  positions: DojoPosition[];
}

interface DojoPosition {
  title: string;
  fen: string;
  limitSeconds: number;
  incrementSeconds: number;
  result: string;
}

// Base presets (openings and endgames)
const BASE_FEN_PRESETS: FenPreset[] = [
  {
    id: "start",
    name: "Starting Position",
    fen: "startpos",
    category: "opening",
    description: "Standard chess starting position",
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3",
    category: "opening",
    description: "Classic Spanish opening",
  },
  {
    id: "sicilian",
    name: "Sicilian Defense",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
    category: "opening",
    description: "Sharp counter-attacking opening",
  },
  {
    id: "french",
    name: "French Defense",
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    category: "opening",
    description: "Solid pawn structure opening",
  },
  {
    id: "italian-game",
    name: "Italian Game",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    category: "opening",
    description: "Open game focused on development and kingside attacks",
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2",
    category: "opening",
    description: "Classic queen pawn opening",
  },
  {
    id: "kings-indian-defense",
    name: "King's Indian Defense",
    fen: "rnbqkb1r/pppppppp/5n2/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq - 1 2",
    category: "opening",
    description: "Hypermodern defense with kingside attacks",
  },
  {
    id: "caro-kann",
    name: "Caro-Kann Defense",
    fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    category: "opening",
    description: "Solid defense with good endgame prospects",
  },
  {
    id: "london-system",
    name: "London System",
    fen: "rnbqkbnr/pppppppp/8/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 1 1",
    category: "opening",
    description: "System-based opening popular at all levels",
  },
  {
    id: "english-opening",
    name: "English Opening",
    fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1",
    category: "opening",
    description: "Flexible flank opening",
  },
  {
    id: "isolated-queen-pawn",
    name: "Isolated Queen Pawn (IQP)",
    fen: "r2q1rk1/pp2ppbp/2np1np1/8/3PP3/2N2N2/PPQ2PPP/R1B2RK1 w - - 0 10",
    category: "middlegame",
    description: "Classic IQP structure: activity vs weakness",
  },
  {
    id: "hanging-pawns",
    name: "Hanging Pawns Structure",
    fen: "r1bq1rk1/pp2ppbp/2n3p1/3p4/2PP4/2N2N2/PP2PPPP/R1BQ1RK1 w - - 0 9",
    category: "middlegame",
    description: "Dynamic central pawn duo",
  },
  {
    id: "kingside-attack",
    name: "Kingside Attack (Opposite Castling)",
    fen: "r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/2N2Q2/PPPP1PPP/R1B1K2R w KQ - 6 6",
    category: "middlegame",
    description: "Fast attacks with opposite-side castling",
  },
  {
    id: "minor-piece-imbalance",
    name: "Bishop vs Knight Middlegame",
    fen: "r2q1rk1/ppp1bppp/2n1pn2/3p4/3P4/2PB1N2/PP3PPP/RNBQ1RK1 w - - 0 9",
    category: "middlegame",
    description: "Evaluating long-term minor piece imbalances",
  },
  {
    id: "closed-center-breakthrough",
    name: "Closed Center Breakthrough",
    fen: "rnbq1rk1/pp3ppp/2p1pn2/3p4/3P4/2NBPN2/PPQ2PPP/R1B2RK1 w - - 0 9",
   category: "middlegame",
    description: "Pawn breaks in closed positions",
  },
  {
    id: "kpk",
    name: "King & Pawn vs King",
    fen: "8/8/8/4k3/4P3/4K3/8/8 w - - 0 1",
    category: "endgame",
    description: "Fundamental pawn endgame",
  },
  {
    id: "rook-endgame",
    name: "Rook Endgame",
    fen: "8/8/8/4k3/8/4K3/4R3/8 w - - 0 1",
    category: "endgame",
    description: "Basic rook endgame position",
  },
  {
    id: "queen-vs-pawn",
    name: "Queen vs Pawn",
    fen: "8/8/8/8/8/3k4/3p4/3K1Q2 w - - 0 1",
    category: "endgame",
    description: "Queen stopping passed pawn",
  },
  {
    id: "rook-pawn-vs-king",
    name: "Rook Pawn vs King",
    fen: "8/8/8/8/8/7k/7p/7K w - - 0 1",
    category: "endgame",
    description: "Tricky theoretical draw",
  },
  {
    id: "lucena-position",
    name: "Lucena Position",
    fen: "8/8/8/8/3k4/3P4/3R4/3K4 w - - 0 1",
    category: "endgame",
    description: "Winning rook endgame technique",
  },
  {
    id: "philidor-position",
    name: "Philidor Position",
    fen: "8/8/8/3k4/8/3R4/3P4/3K4 b - - 0 1",
    category: "endgame",
    description: "Key defensive rook endgame",
  },
  {
    id: "bishop-and-wrong-rook-pawn",
    name: "Wrong Rook Pawn",
    fen: "8/8/8/8/7k/6p1/6P1/6KB w - - 0 1",
    category: "endgame",
    description: "Classic drawing mechanism",
  },
  {
    id: "queen-vs-rook",
    name: "Queen vs Rook",
    fen: "8/8/8/8/8/4k3/4r3/4KQ2 w - - 0 1",
    category: "endgame",
    description: "Practical conversion technique",
  },
  {
    id: "knight-vs-pawns",
    name: "Knight vs Pawns",
    fen: "8/8/8/2p5/3k4/3P4/3N4/3K4 w - - 0 1",
    category: "endgame",
    description: "Knight activity and pawn races",
  },
];

// Convert Dojo requirements to FEN presets
function convertDojoToPresets(requirements: DojoRequirement[]): FenPreset[] {
  const presets: FenPreset[] = [];

  requirements.forEach((req) => {
    req.positions.forEach((pos, index) => {
      presets.push({
        id: `${req.id}-${index}`,
        name: pos.title,
        fen: pos.fen,
        category: "dojo",
        dojoCategory: req.category,
        cohorts: req.cohorts,
        requirementName: req.requirementName,
        description: `${req.shortName || req.category} - Position ${
          index + 1
        }/${req.positionCount}`,
        result: pos.result,
        timeControl: `${pos.limitSeconds / 60}+${pos.incrementSeconds}`,
      });
    });
  });

  return presets;
}

export function getDojoRequirements() {
  return dojoRequirements.requirements as DojoRequirement[];
}

export function getAllPresetsFens() {
  const dojoRequirements = getDojoRequirements();
  const dojoPresets = convertDojoToPresets(dojoRequirements);
  return [...BASE_FEN_PRESETS, ...dojoPresets];
}
