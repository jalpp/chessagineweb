import dojoRequirements from "./dojoRequirements.json";

export type FenPresetCategory = "opening" | "endgame" | "dojo" | "custom";

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
    '0-300': '#f8d0f5',
    '300-400': '#eb92c8',
    '400-500': '#c768bc',
    '500-600': '#f1e156',
    '600-700': '#c8c71d',
    '700-800': '#a3951b',
    '800-900': '#eea44f',
    '900-1000': '#d97333',
    '1000-1100': '#9b4007',
    '1100-1200': '#70ec50',
    '1200-1300': '#71c44e',
    '1300-1400': '#0c5c03',
    '1400-1500': '#5551ec',
    '1500-1600': '#004aad',
    '1600-1700': '#003375',
    '1700-1800': '#ae03ff',
    '1800-1900': '#ac00c8',
    '1900-2000': '#6b017d',
    '2000-2100': '#fd0304',
    '2100-2200': '#c21818',
    '2200-2300': '#951313',
    '2300-2400': '#bd4804',
    '2400+': '#9e3b00',
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
];

// Convert Dojo requirements to FEN presets
function convertDojoToPresets(
  requirements: DojoRequirement[]
): FenPreset[] {
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
        description: `${req.shortName || req.category} - Position ${index + 1}/${req.positionCount}`,
        result: pos.result,
        timeControl: `${pos.limitSeconds / 60}+${pos.incrementSeconds}`,
      });
    });
  });

  return presets;
}

export function getDojoRequirements(){
    return dojoRequirements.requirements as DojoRequirement[]
}

export function getAllPresetsFens(){
    const dojoRequirements = getDojoRequirements();
    const dojoPresets = convertDojoToPresets(dojoRequirements);
    return [...BASE_FEN_PRESETS, ...dojoPresets];
}