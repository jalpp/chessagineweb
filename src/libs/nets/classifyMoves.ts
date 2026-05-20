import { CandidateMove } from "../agine/helper";
import { MaiaEvaluation, QuadrantCandidateMoves, QuadrantMove } from "./types";

export const QUADRANT_CONFIG = {
  "Likely Good": {
    label: "Expected Strong",
    color: '#10b981',
    description: 'Moves frequently played by humans that are objectively strong'
  },
  "Likely Bad": {
    label: "Common Mistake",
    color: '#ef4444',
    description: 'Popular moves that are objectively weak'
  },
  "Unlikely Good": {
    label: "Hidden Gem",
    color: '#8b5cf6',
    description: 'Rare but objectively strong moves'
  },
  "Unlikely Bad": {
    label: "Rare Blunder",
    color: '#721900',
    description: 'Uncommon moves that are also weak'
  },
  "Unknown": {
    label: "Uncertain",
    color: '#646464',
    description: 'Moves without enough data to determine quality'
  }
} as const;

export type MoveCategory = 'brilliant' | 'tricky' | 'normal' | 'book';

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

function qclassifyMove(
  probability: number, 
  improbableThreshold: number, 
  chessDbNote: string
): QuadrantCandidateMoves {
  const isGoodMove = ['best', 'good', 'very good'];
  const isBad = ['bad']

  if (probability > improbableThreshold && isGoodMove.includes(chessDbNote.toLowerCase())) {
    return 'Likely Good';
  } else if (probability > improbableThreshold && isBad.includes(chessDbNote.toLowerCase())) {
    return 'Likely Bad';
  } else if (probability < improbableThreshold && isGoodMove.includes(chessDbNote.toLowerCase())) {
    return 'Unlikely Good';
  } else if (probability < improbableThreshold && isBad.includes(chessDbNote.toLowerCase())){
    return 'Unlikely Bad';
  }

  return 'Unknown';
}

export function QuadrantClassification(
  evals: MaiaEvaluation, 
  candidateMoves: CandidateMove[], 
  improbableThreshold: number
): QuadrantMove[] {
  const policies = evals.policy;

  const classifications = candidateMoves.map((move, idx) => {
    const probability = policies[move.san] || 0;
    const classification: QuadrantCandidateMoves = qclassifyMove(
      probability,
      improbableThreshold,
      move.note
    );
    
    const qMove: QuadrantMove = {
      rank: idx + 1,
      qclassification: classification,
      notation: move.san,
      probability
    };

    return qMove;
  });

  return classifications;
}

// Helper function to group moves by quadrant
export function groupMovesByQuadrant(quadrantMoves: QuadrantMove[]): Record<QuadrantCandidateMoves, QuadrantMove[]> {
  const groups: Record<QuadrantCandidateMoves, QuadrantMove[]> = {
    "Likely Good": [],
    "Likely Bad": [],
    "Unlikely Good": [],
    "Unlikely Bad": [],
    "Unknown": []
  };
  
  quadrantMoves.forEach(move => {
    groups[move.qclassification].push(move);
  });
  
  return groups;
}