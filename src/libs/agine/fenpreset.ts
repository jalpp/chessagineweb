export type FenPresetCategory = "opening" | "endgame" | "custom";

export interface FenPreset {
  id: string;
  name: string;
  fen: string;
  category: FenPresetCategory;
  description?: string;
}

export const FEN_PRESETS: FenPreset[] = [
  // OPENINGS
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
  },
  {
    id: "sicilian",
    name: "Sicilian Defense",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
    category: "opening",
  },

  // ENDGAMES
  {
    id: "kpk",
    name: "King & Pawn vs King",
    fen: "8/8/8/4k3/4P3/4K3/8/8 w - - 0 1",
    category: "endgame",
  },
  {
    id: "rook-endgame",
    name: "Rook Endgame",
    fen: "8/8/8/4k3/8/4K3/4R3/8 w - - 0 1",
    category: "endgame",
  },
];
