import { Chess } from "chess.js"
import Maia from "./maia"

export type MaiaStatus =
  | 'loading'
  | 'no-cache'
  | 'downloading'
  | 'ready'
  | 'error'

export interface MaiaEngine {
  maia?: Maia
  status: MaiaStatus
  progress: number
  downloadModel: () => void
}

export const MAIA_MODELS = [
  'maia_kdd_1100',
  'maia_kdd_1200',
  'maia_kdd_1300',
  'maia_kdd_1400',
  'maia_kdd_1500',
  'maia_kdd_1600',
  'maia_kdd_1700',
  'maia_kdd_1800',
  'maia_kdd_1900',
]

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