import { Chess } from "chess.js"
import NetModel from "./NetModel"

export type NetStatus =
  | 'loading'
  | 'no-cache'
  | 'downloading'
  | 'ready'
  | 'error'

export type ModelType = 'maia2' | 'bigLeela' | 'elitemaia'

export interface MaiaEngine {
  maia2?: NetModel
  bigLeela?: NetModel
  elitemaia?: NetModel
  status: Record<ModelType, NetStatus>
  progress: Record<ModelType, number>
  downloadModel: (modelType: ModelType) => Promise<void>
  activeModels: ModelType[]
}

export const MODEL_CONFIGS = {
  maia2: {
    id: 'maia2',
    name: 'Maia 2',
    description:
      'Human-style chess analysis that mimics real players from 1100–1900 Elo. Best for understanding typical human mistakes, plans, and practical decision-making at different skill levels.',
    path: '/static/nets/maia_rapid.onnx',
    size: '90mb',
    hasRatingLevels: true,
    modelType: 'maia2' as const,
    ratingLevels: [
      'maia_kdd_1100',
      'maia_kdd_1200',
      'maia_kdd_1300',
      'maia_kdd_1400',
      'maia_kdd_1500',
      'maia_kdd_1600',
      'maia_kdd_1700',
      'maia_kdd_1800',
      'maia_kdd_1900',
    ],
  },

  bigLeela: {
    id: 'bigLeela',
    name: 'Leela T1-256',
    description:
      'A lightweight Leela Chess Zero network optimized for performance on low-resource devices. Provides strong positional evaluations with fast response times.',
    path: '/static/nets/t1-256x10.onnx',
    size: '75mb',
    hasRatingLevels: false,
    modelType: 'leela' as const,
  },

  elitemaia: {
    id: 'elitemaia',
    name: 'Elite Leela',
    description:
      'A high-skill Leela network trained on nearly 20 million elite Lichess games. Excels at precise tactics, deep positional understanding, and near–top-level play.',
    path: '/static/nets/eliteleelav2.onnx',
    size: '15mb',
    hasRatingLevels: false,
    modelType: 'leela' as const,
  },
} as const


export const MAIA_MODELS = MODEL_CONFIGS.maia2.ratingLevels

export const MAIA_MODELS_WITH_NAMES = MAIA_MODELS.map((model) => ({
  id: model,
  name: model.replace('maia_kdd_', 'Maia '),
}))

export interface MaiaEvaluation {
  value: number
  policy: { [key: string]: number }
}

export const uciToSan = (uci: string, fen: string): string => {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
};
export type MoveCategory = 'brilliant' | 'tricky' | 'normal' | 'book';

export interface MoveWithProbability {
  moveNumber: number;
  notation: string;
  quality: string;
  probability: number;
  category: MoveCategory;
  isGoodMove: boolean;
}

export const categorizeMove = (
  probability: number,
  quality: string,
  improbableThreshold: number
): MoveCategory => {
  if (quality === 'Book') return 'book';
  
  const isGoodMove = ['Best', 'Very Good', 'Good'].includes(quality);
  const isBadMove = ['Mistake', 'Blunder'].includes(quality);
  const isImprobable = probability < improbableThreshold;
  
  if (isImprobable && isGoodMove) return 'brilliant';
  
  if (!isImprobable && isBadMove) return 'tricky';
  
  return 'normal';
};

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