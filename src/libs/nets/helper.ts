/* ======================================================
   Helpers
====================================================== */

import { Tensor } from "onnxruntime-web"
import { allPossibleMovesReversed, allPossibleMovesReversedMaia, mirrorMove } from "./tensor"

export function pickOutput(
  outputs: Record<string, Tensor>,
  names: string[],
): Tensor {
  for (const n of names) if (outputs[n]) return outputs[n]
  throw new Error(`Missing output: ${names.join(', ')}`)
}

/**
 * Convert WDL (Win/Draw/Loss) tensor to win probability for the side to move
 */
export function wdlToWinProb(wdl: Tensor, fen: string): number {
  const data = wdl.data as Float32Array
  
  // Apply softmax to get probabilities
  const max = Math.max(...data)
  const exp = Array.from(data).map((v) => Math.exp(v - max))
  const sum = exp.reduce((a, b) => a + b, 0)
  const probs = exp.map((v) => v / sum)
  
  // LC0 WDL format: [loss, draw, win] from white's perspective
  const draw = probs[1]
  const whiteWin = probs[2]
  
  // Calculate white's win probability
  const whiteWinProb = whiteWin + 0.5 * draw
  
  // If it's black's turn, invert the probability
  const turn = fen.split(' ')[1]
  return turn === 'b' ? 1 - whiteWinProb : whiteWinProb
}

/* ======================================================
   Leela policy processing
====================================================== */

export function processLeelaPolicy(
  fen: string,
  logitsTensor: Tensor,
  legalMoves: Float32Array,
): Record<string, number> {
  const logits = logitsTensor.data as Float32Array
  const isBlack = fen.split(' ')[1] === 'b'

  // Get indices of legal moves
  const legalIndices: number[] = []
  for (let i = 0; i < legalMoves.length; i++) {
    if (legalMoves[i] > 0) {
      legalIndices.push(i)
    }
  }

  // Map to UCI moves (mirror if black)
  const moves = legalIndices.map((i) => {
    const move = allPossibleMovesReversed[i]
    return isBlack ? mirrorMove(move) : move
  })

  // Apply softmax over legal moves only
  const legalLogits = legalIndices.map((i) => logits[i])
  const max = Math.max(...legalLogits)
  const exp = legalLogits.map((v) => Math.exp(v - max))
  const sum = exp.reduce((a, b) => a + b, 0)

  // Build policy dictionary
  const policy: Record<string, number> = {}
  for (let i = 0; i < moves.length; i++) {
    policy[moves[i]] = exp[i] / sum
  }

  return policy
}

/* ======================================================
   Maia 2 policy + value
====================================================== */

// Helper function for processMaiaPolicy
export function processMaiaPolicy(
  fen: string,
  policyTensor: Tensor,
  valueTensor: Tensor,
  legalMoves: Float32Array,
) {
  const logits = policyTensor.data as Float32Array
  const value = valueTensor.data as Float32Array

  let winProb = Math.min(Math.max((value[0] as number) / 2 + 0.5, 0), 1)

  let black_flag = false
  if (fen.split(' ')[1] === 'b') {
    black_flag = true
    winProb = 1 - winProb
  }

  winProb = Math.round(winProb * 10000) / 10000

  // Get indices of legal moves
  const legalMoveIndices = legalMoves
    .map((value, index) => (value > 0 ? index : -1))
    .filter((index) => index !== -1)

  const legalMovesMirrored = []
  for (const moveIndex of legalMoveIndices) {
    const move = allPossibleMovesReversedMaia[moveIndex]
    if (!move) {
      console.warn(`Move index ${moveIndex} not found in allPossibleMovesReversedMaia`)
      continue
    }
    
    if (black_flag) {
      legalMovesMirrored.push(mirrorMove(move))
    } else {
      legalMovesMirrored.push(move)
    }
  }

  // Extract logits for legal moves (only for moves that were found)
  const legalLogits = []
  for (let i = 0; i < legalMoveIndices.length; i++) {
    if (i < legalMovesMirrored.length) {
      legalLogits.push(logits[legalMoveIndices[i]])
    }
  }

  if (legalLogits.length === 0) {
    console.error('No valid legal moves found for position:', fen)
    return { policy: {}, value: winProb }
  }

  // Compute softmax over the legal logits
  const maxLogit = Math.max(...legalLogits)
  const expLogits = legalLogits.map((logit) => Math.exp(logit - maxLogit))
  const sumExp = expLogits.reduce((a, b) => a + b, 0)
  const probs = expLogits.map((expLogit) => expLogit / sumExp)

  // Map the probabilities back to their move indices
  const moveProbs: Record<string, number> = {}
  for (let i = 0; i < legalMovesMirrored.length; i++) {
    moveProbs[legalMovesMirrored[i]] = probs[i]
  }

  const sortedMoveProbs = Object.keys(moveProbs)
    .sort((a, b) => moveProbs[b] - moveProbs[a])
    .reduce(
      (acc, key) => {
        acc[key] = moveProbs[key]
        return acc
      },
      {} as Record<string, number>,
    )

  return { policy: sortedMoveProbs, value: winProb }
}

