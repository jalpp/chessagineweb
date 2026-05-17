import { Chess } from "chess.js"

export type ModelType = 'bigLeela' | 'elitemaia' | 'maia3'
export type NeuralNetType = "bigLeela" | "eliteLeela" | "maia3"

export const MODEL_CONFIGS = {
  bigLeela: {
    id: 'bigLeela',
    name: 'Leela T1-256',
    description: 'Leela Chess Zero network. Strong positional evaluations via self-play neural network.',
    hasRatingLevels: false,
    modelType: 'leela' as const,
  },
  elitemaia: {
    id: 'elitemaia',
    name: 'Elite Leela',
    description: 'Leela network trained on 20M elite Lichess games. Near top-level positional understanding.',
    hasRatingLevels: false,
    modelType: 'leela' as const,
  },
  maia3: {
    id: 'maia3',
    name: 'Maia 3',
    description: 'Single unified network covering 600–2600 Elo with continuous rating conditioning.',
    hasRatingLevels: true,
    modelType: 'maia3' as const,
    ratingLevels: Array.from({ length: 21 }, (_, i) => `maia_kdd_${600 + i * 100}`),
    ratingValues: Array.from({ length: 21 }, (_, i) => 600 + i * 100),
  },
} as const

export const MAIA3_MODELS = MODEL_CONFIGS.maia3.ratingLevels
export const MAIA3_RATING_VALUES = MODEL_CONFIGS.maia3.ratingValues

export interface MaiaEvaluation {
  value: number
  policy: { [key: string]: number }
}

export interface SanMaiaEvaluation {
  value: number;
  policy: { [key: string]: number };
}

export const uciToSan = (uci: string, fen: string): string => {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined,
    });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
};

export const convertToSanEvaluation = (
  uciEval: MaiaEvaluation,
  fen: string
): SanMaiaEvaluation => {
  const sanPolicy: { [key: string]: number } = {};
  Object.entries(uciEval.policy).forEach(([uciMove, probability]) => {
    const sanMove = uciToSan(uciMove, fen);
    sanPolicy[sanMove] = probability;
  });
  return { value: uciEval.value, policy: sanPolicy };
};

export type MoveCategory = 'brilliant' | 'tricky' | 'normal' | 'book';
export type QuadrantCandidateMoves = "Likely Good" | "Likely Bad" | "Unlikely Good" | "Unlikely Bad";

export interface QuadrantMove {
  rank: number;
  notation: string;
  qclassification: QuadrantCandidateMoves;
  probability: number;
}

export interface MoveWithProbability {
  moveNumber: number;
  notation: string;
  quality: string;
  probability: number;
  category: MoveCategory;
  isGoodMove: boolean;
}

export const CATEGORY_COLORS = {
  brilliant: '#4ade80',
  tricky: '#f87171',
  normal: '#60a5fa',
  book: '#9ca3af',
};

export const CATEGORY_LABELS = {
  brilliant: 'Brilliant (Improbable + Good)',
  tricky: 'Tricky (Probable + Bad)',
  normal: 'Normal',
  book: 'Book',
};

export function getPolicyValue(evaluation: MaiaEvaluation, moveKey: string): number {
  return evaluation.policy[moveKey] ?? 0;
}

export const formatModelName = (model: string) => model.replace("maia_kdd_", "Maia ");
export const formatValue = (value: number) => `${(value * 100).toFixed(1)}%`;

export const getValueColor = (value: number) => {
  if (value > 0.55) return "#4caf50";
  if (value < 0.3) return "#f44336";
  return "#ff9800";
};

export const getEMColor = (value: number) => {
  if (value > 0.1) return "#319333";
  if (value < -0.1) return "#850e05";
  return "#5e5549";
};
