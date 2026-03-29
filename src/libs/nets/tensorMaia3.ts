/**
 * Maia 3 tensor preprocessing utilities.
 * Ported from maia-platform-frontend: src/lib/engine/tensor.ts
 * Handles FEN → board token tensor and legal move mask for Maia 3 ONNX model.
 */

import { Chess } from 'chess.js'
import allPossibleMovesMaia3Dict from './data/all_moves_maia3.json'
import allPossibleMovesMaia3ReversedDict from './data/all_moves_reversed_maia3.json'

const allPossibleMovesMaia3 = allPossibleMovesMaia3Dict as Record<string, number>

export const allPossibleMovesMaia3Reversed =
  allPossibleMovesMaia3ReversedDict as Record<number, string>

/**
 * Mirrors a square on the chess board vertically (top-to-bottom flip).
 */
function mirrorSquare(square: string): string {
  const file = square.charAt(0)
  const rank = (9 - parseInt(square.charAt(1))).toString()
  return file + rank
}

/**
 * Mirrors a chess move in UCI notation vertically.
 */
export function mirrorMove(moveUci: string): string {
  const isPromotion = moveUci.length > 4
  const mirroredStart = mirrorSquare(moveUci.substring(0, 2))
  const mirroredEnd = mirrorSquare(moveUci.substring(2, 4))
  const promotionPiece = isPromotion ? moveUci.substring(4) : ''
  return mirroredStart + mirroredEnd + promotionPiece
}

function swapColorsInRank(rank: string): string {
  let swapped = ''
  for (const char of rank) {
    if (/[A-Z]/.test(char)) swapped += char.toLowerCase()
    else if (/[a-z]/.test(char)) swapped += char.toUpperCase()
    else swapped += char
  }
  return swapped
}

function swapCastlingRights(castling: string): string {
  if (castling === '-') return '-'
  const rights = new Set(castling.split(''))
  const swapped = new Set<string>()
  if (rights.has('K')) swapped.add('k')
  if (rights.has('Q')) swapped.add('q')
  if (rights.has('k')) swapped.add('K')
  if (rights.has('q')) swapped.add('Q')
  return Array.from(swapped).join('')
}

function mirrorEnPassant(ep: string): string {
  if (ep === '-') return '-'
  return ep.charAt(0) + (9 - parseInt(ep.charAt(1))).toString()
}

/**
 * Mirrors a FEN string so the side to move is always white.
 */
export function mirrorFEN(fen: string): string {
  const parts = fen.split(' ')
  const piecePlacement = parts[0]
  const castling = parts[2]
  const enPassant = parts[3]

  const ranks = piecePlacement.split('/')
  const mirroredRanks = ranks.reverse().map(swapColorsInRank)
  const mirroredPlacement = mirroredRanks.join('/')
  const mirroredCastling = swapCastlingRights(castling)
  const mirroredEnPassant = mirrorEnPassant(enPassant)

  return [
    mirroredPlacement,
    'w',
    mirroredCastling,
    mirroredEnPassant,
    parts[4],
    parts[5],
  ].join(' ')
}

/**
 * Converts a board position to Maia 3 token tensor.
 * Output shape: (64, 12) flattened — each square has 12 piece-type channels.
 */
function boardToMaia3Tokens(fen: string): Float32Array {
  const piecePlacement = fen.split(' ')[0]
  const pieceTypes = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k']
  const tensor = new Float32Array(64 * 12)

  const rows = piecePlacement.split('/')
  for (let rank = 0; rank < 8; rank++) {
    const row = 7 - rank
    let file = 0
    for (const char of rows[rank]) {
      if (isNaN(parseInt(char))) {
        const pieceIdx = pieceTypes.indexOf(char)
        if (pieceIdx >= 0) {
          const square = row * 8 + file
          tensor[square * 12 + pieceIdx] = 1.0
        }
        file += 1
      } else {
        file += parseInt(char)
      }
    }
  }

  return tensor
}

/**
 * Preprocesses a FEN for Maia 3 inference.
 * - Mirrors the board if it's black's turn (Maia 3 always sees white-to-move).
 * - Returns (64*12) board tokens and legal moves mask over 4352 moves.
 * - ELO is passed as raw float (Maia 3 uses continuous interpolation, not categories).
 */
export function preprocessMaia3(fen: string): {
  boardTokens: Float32Array
  legalMoves: Float32Array
} {
  let board = new Chess(fen)

  if (fen.split(' ')[1] === 'b') {
    board = new Chess(mirrorFEN(board.fen()))
  } else if (fen.split(' ')[1] !== 'w') {
    throw new Error(`Invalid FEN: ${fen}`)
  }

  const boardTokens = boardToMaia3Tokens(board.fen())

  const legalMoves = new Float32Array(Object.keys(allPossibleMovesMaia3).length)
  for (const move of board.moves({ verbose: true }) as { from: string; to: string; promotion?: string }[]) {
    const promotion = move.promotion ?? ''
    const moveIndex = allPossibleMovesMaia3[move.from + move.to + promotion]
    if (moveIndex !== undefined) {
      legalMoves[moveIndex] = 1.0
    }
  }

  return { boardTokens, legalMoves }
}

/**
 * Processes Maia 3 ONNX outputs.
 * Maia 3 outputs LDW (Loss/Draw/Win) logits and uses a 4352-dimensional move space.
 */
export function processOutputsMaia3(
  fen: string,
  logitsMove: Float32Array,
  logitsValue: Float32Array,
  legalMoves: Float32Array,
): { policy: Record<string, number>; value: number } {
  const wdl = logitsValue

  // Model output: index 0 = Loss, 1 = Draw, 2 = Win (for side-to-move)
  const maxWdl = Math.max(wdl[0], wdl[1], wdl[2])
  const expL = Math.exp(wdl[0] - maxWdl)
  const expD = Math.exp(wdl[1] - maxWdl)
  const expW = Math.exp(wdl[2] - maxWdl)
  const sumExp = expL + expD + expW

  let winProb = (expW + 0.5 * expD) / sumExp
  const blackToMove = fen.split(' ')[1] === 'b'
  if (blackToMove) winProb = 1 - winProb
  winProb = Math.round(winProb * 10000) / 10000

  const legalMoveIndices = Array.from(legalMoves)
    .map((v, i) => (v > 0 ? i : -1))
    .filter((i) => i !== -1)

  const legalMovesMirrored = legalMoveIndices.map((idx) => {
    let move = allPossibleMovesMaia3Reversed[idx]
    if (blackToMove) move = mirrorMove(move)
    return move
  })

  const legalLogits = legalMoveIndices.map((idx) => logitsMove[idx])
  const maxLogit = Math.max(...legalLogits)
  const expLogits = legalLogits.map((l) => Math.exp(l - maxLogit))
  const sumExpMoves = expLogits.reduce((a, b) => a + b, 0)
  const probs = expLogits.map((e) => e / sumExpMoves)

  const moveProbs: Record<string, number> = {}
  for (let i = 0; i < legalMoveIndices.length; i++) {
    moveProbs[legalMovesMirrored[i]] = probs[i]
  }

  const sortedPolicy = Object.fromEntries(
    Object.entries(moveProbs).sort(([, a], [, b]) => b - a),
  )

  return { policy: sortedPolicy, value: winProb }
}