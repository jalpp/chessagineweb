import { Chess, Move } from 'chess.ts'

import allPossibleMovesDict from './data/all_moves.json'
import allPossibleMovesReversedDict from './data/all_moves_reversed.json'

const allPossibleMoves = allPossibleMovesDict as Record<string, number>
const allPossibleMovesReversed = allPossibleMovesReversedDict as Record<
  number,
  string
>
const eloDict = createEloDict()

/**
 * Converts a chess board position in FEN notation to a tensor representation.
 * The tensor includes information about piece placement, active color, castling rights, and en passant target.
 *
 * @param fen - The FEN string representing the chess board position.
 * @returns A Float32Array representing the tensor of the board position.
 */
function boardToTensor(fen: string): Float32Array {
  const tokens = fen.split(' ')
  const piecePlacement = tokens[0]
  const activeColor = tokens[1]
  const castlingAvailability = tokens[2]
  const enPassantTarget = tokens[3]

  const pieceTypes = [
    'P',
    'N',
    'B',
    'R',
    'Q',
    'K',
    'p',
    'n',
    'b',
    'r',
    'q',
    'k',
  ]
  const tensor = new Float32Array((12 + 6) * 8 * 8)

  const rows = piecePlacement.split('/')

  // Adjust rank indexing
  for (let rank = 0; rank < 8; rank++) {
    const row = 7 - rank
    let file = 0
    for (const char of rows[rank]) {
      if (isNaN(parseInt(char))) {
        const index = pieceTypes.indexOf(char)
        const tensorIndex = index * 64 + row * 8 + file
        tensor[tensorIndex] = 1.0
        file += 1
      } else {
        file += parseInt(char)
      }
    }
  }

  // Player's turn channel
  const turnChannelStart = 12 * 64
  const turnChannelEnd = turnChannelStart + 64
  const turnValue = activeColor === 'w' ? 1.0 : 0.0
  tensor.fill(turnValue, turnChannelStart, turnChannelEnd)

  // Castling rights channels
  const castlingRights = [
    castlingAvailability.includes('K'),
    castlingAvailability.includes('Q'),
    castlingAvailability.includes('k'),
    castlingAvailability.includes('q'),
  ]
  for (let i = 0; i < 4; i++) {
    if (castlingRights[i]) {
      const channelStart = (13 + i) * 64
      const channelEnd = channelStart + 64
      tensor.fill(1.0, channelStart, channelEnd)
    }
  }

  // En passant target channel
  const epChannel = 17 * 64
  if (enPassantTarget !== '-') {
    const file = enPassantTarget.charCodeAt(0) - 'a'.charCodeAt(0)
    const rank = parseInt(enPassantTarget[1], 10) - 1 // Adjust rank indexing
    const row = 7 - rank // Invert rank to match tensor indexing
    const index = epChannel + row * 8 + file
    tensor[index] = 1.0
  }

  return tensor
}

/**
 * Converts a chess board to Leela Chess Zero input format (112 planes)
 */
function boardToTensorLeela(fen: string): Float32Array {
  const chess = new Chess(fen)
  const tensor = new Float32Array(112 * 8 * 8)
  
  // For now, use simplified encoding - just copy the first 18 planes from Maia format
  // and pad the rest with zeros. This is a placeholder.
  // In production, you'd want full LC0 encoding with history planes, etc.
  const maiaTensor = boardToTensor(fen)
  tensor.set(maiaTensor)
  
  return tensor
}

/**
 * Preprocesses the input data for the Maia 2 model.
 */
function preprocess(
  fen: string,
  eloSelf: number,
  eloOppo: number,
): {
  boardInput: Float32Array
  eloSelfCategory: number
  eloOppoCategory: number
  legalMoves: Float32Array
} {
  // Handle mirroring if it's black's turn
  let board = new Chess(fen)
  if (fen.split(' ')[1] === 'b') {
    board = new Chess(mirrorFEN(board.fen()))
  } else if (fen.split(' ')[1] !== 'w') {
    throw new Error(`Invalid FEN: ${fen}`)
  }

  // Convert board to tensor
  const boardInput = boardToTensor(board.fen())

  // Map Elo to categories
  const eloSelfCategory = mapToCategory(eloSelf, eloDict)
  const eloOppoCategory = mapToCategory(eloOppo, eloDict)

  // Generate legal moves tensor
  const legalMoves = new Float32Array(Object.keys(allPossibleMoves).length)

  for (const move of board.moves({ verbose: true }) as Move[]) {
    const promotion = move.promotion ? move.promotion : ''
    const moveIndex = allPossibleMoves[move.from + move.to + promotion]

    if (moveIndex !== undefined) {
      legalMoves[moveIndex] = 1.0
    }
  }

  return {
    boardInput,
    eloSelfCategory,
    eloOppoCategory,
    legalMoves,
  }
}

/**
 * Preprocesses the input data for Leela models.
 */
function preprocessLeela(
  fen: string,
): {
  boardInput: Float32Array
  legalMoves: Float32Array
} {
  const isBlack = fen.split(' ')[1] === 'b'

  // For Leela, we mirror the FEN if black to move, so the model always sees white to move
  const processedFen = isBlack ? mirrorFEN(fen) : fen
  const boardInput = boardToTensorLeela(processedFen)

  // Create board from the PROCESSED (potentially mirrored) FEN to get correct legal moves
  const processedBoard = new Chess(processedFen)

  // Generate legal moves tensor from the processed position
  const legalMoves = new Float32Array(Object.keys(allPossibleMoves).length)

  for (const move of processedBoard.moves({ verbose: true }) as Move[]) {
    const promotion = move.promotion ? move.promotion : ''
    const moveIndex = allPossibleMoves[move.from + move.to + promotion]

    if (moveIndex !== undefined) {
      legalMoves[moveIndex] = 1.0
    }
  }

  return {
    boardInput,
    legalMoves,
  }
}

/**
 * Maps an Elo rating to a predefined category based on specified intervals.
 */
function mapToCategory(elo: number, eloDict: Record<string, number>): number {
  const interval = 100
  const start = 1100
  const end = 2000

  if (elo < start) {
    return eloDict[`<${start}`]
  } else if (elo >= end) {
    return eloDict[`>=${end}`]
  } else {
    for (let lowerBound = start; lowerBound < end; lowerBound += interval) {
      const upperBound = lowerBound + interval
      if (elo >= lowerBound && elo < upperBound) {
        return eloDict[`${lowerBound}-${upperBound - 1}`]
      }
    }
  }
  throw new Error('Elo value is out of range.')
}

/**
 * Creates a dictionary mapping Elo rating ranges to category indices.
 */
function createEloDict(): { [key: string]: number } {
  const interval = 100
  const start = 1100
  const end = 2000

  const eloDict: { [key: string]: number } = { [`<${start}`]: 0 }
  let rangeIndex = 1

  for (let lowerBound = start; lowerBound < end; lowerBound += interval) {
    const upperBound = lowerBound + interval
    eloDict[`${lowerBound}-${upperBound - 1}`] = rangeIndex
    rangeIndex += 1
  }

  eloDict[`>=${end}`] = rangeIndex

  return eloDict
}

/**
 * Mirrors a chess move in UCI notation.
 */
function mirrorMove(moveUci: string): string {
  const isPromotion: boolean = moveUci.length > 4

  const startSquare: string = moveUci.substring(0, 2)
  const endSquare: string = moveUci.substring(2, 4)
  const promotionPiece: string = isPromotion ? moveUci.substring(4) : ''

  const mirroredStart: string = mirrorSquare(startSquare)
  const mirroredEnd: string = mirrorSquare(endSquare)

  return mirroredStart + mirroredEnd + promotionPiece
}

/**
 * Mirrors a square on the chess board vertically (top-to-bottom flip).
 */
function mirrorSquare(square: string): string {
  const file: string = square.charAt(0)
  const rank: string = (9 - parseInt(square.charAt(1))).toString()

  return file + rank
}

/**
 * Swaps the colors of pieces in a rank.
 */
function swapColorsInRank(rank: string): string {
  let swappedRank = ''
  for (const char of rank) {
    if (/[A-Z]/.test(char)) {
      swappedRank += char.toLowerCase()
    } else if (/[a-z]/.test(char)) {
      swappedRank += char.toUpperCase()
    } else {
      swappedRank += char
    }
  }
  return swappedRank
}

function swapCastlingRights(castling: string): string {
  if (castling === '-') return '-'

  const rights = new Set(castling.split(''))
  const swapped = new Set<string>()

  if (rights.has('K')) swapped.add('k')
  if (rights.has('Q')) swapped.add('q')
  if (rights.has('k')) swapped.add('K')
  if (rights.has('q')) swapped.add('Q')

  let output = ''
  if (swapped.has('K')) output += 'K'
  if (swapped.has('Q')) output += 'Q'
  if (swapped.has('k')) output += 'k'
  if (swapped.has('q')) output += 'q'

  return output === '' ? '-' : output
}

/**
 * Mirrors a FEN string vertically while swapping piece colors.
 */
function mirrorFEN(fen: string): string {
  const [position, activeColor, castling, enPassant, halfmove, fullmove] =
    fen.split(' ')

  const ranks = position.split('/')
  const mirroredRanks = ranks
    .slice()
    .reverse()
    .map((rank) => swapColorsInRank(rank))
  const mirroredPosition = mirroredRanks.join('/')

  const mirroredActiveColor = activeColor === 'w' ? 'b' : 'w'
  const mirroredCastling = swapCastlingRights(castling)
  const mirroredEnPassant = enPassant !== '-' ? mirrorSquare(enPassant) : '-'

  return `${mirroredPosition} ${mirroredActiveColor} ${mirroredCastling} ${mirroredEnPassant} ${halfmove} ${fullmove}`
}

export { preprocess, preprocessLeela, mirrorMove, allPossibleMovesReversed }