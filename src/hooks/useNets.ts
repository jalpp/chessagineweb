import { useEffect, useState, useRef } from 'react'
import { Chess } from 'chess.js'
import { useNetModels, useNetStatus } from '@/context/NetContext'
import { MAIA_MODELS, MaiaEvaluation, ModelType } from '@/libs/nets/types'

interface UseMaiaEngineOptions {
  fen: string
  maxRetries?: number
  retryDelayMs?: number
  enabledModels?: ModelType[]
  useLichessBook?: boolean // Whether to use Lichess opening book
  bookThreshold?: number // Minimum games to consider position "in book"
}

interface SanMaiaEvaluation {
  value: number
  policy: { [key: string]: number }
}

interface LichessMove {
  uci: string
  san: string
  averageRating: number
  white: number
  draws: number
  black: number
}

interface LichessData {
  white: number
  draws: number
  black: number
  moves: LichessMove[]
  opening?: { eco: string; name: string }
}

export interface MaiaEngineAnalysis {
  maia2?: { [key: string]: MaiaEvaluation } | null
  bigLeela?: MaiaEvaluation | null
  elitemaia?: MaiaEvaluation | null
}

export interface UseMaiaEngineResult {
  evaluations: MaiaEngineAnalysis
  sanEvaluations: {
    maia2?: { [key: string]: SanMaiaEvaluation } | null
    bigLeela?: SanMaiaEvaluation | null
    elitemaia?: SanMaiaEvaluation | null
  }
  lichessData: {
    maia2?: { [key: string]: LichessData } | null
    bigLeela?: LichessData | null
    elitemaia?: LichessData | null
  }
  isInBook: boolean
  isLoading: boolean
  Maiaerror: Error | null
}

// Map Maia ratings to Lichess rating groups
const getRatingGroups = (maiaRating: number): number[] => {
  if (maiaRating <= 1100) return [1000, 1200]
  if (maiaRating <= 1200) return [1000, 1200]
  if (maiaRating <= 1300) return [1200, 1400]
  if (maiaRating <= 1400) return [1200, 1400]
  if (maiaRating <= 1500) return [1400, 1600]
  if (maiaRating <= 1600) return [1400, 1600, 1800]
  if (maiaRating <= 1700) return [1600, 1800]
  if (maiaRating <= 1800) return [1600, 1800, 2000]
  if (maiaRating <= 1900) return [1800, 2000]
  if (maiaRating <= 2200) return [2000, 2200]
  return [2200, 2500]
}

// Fetch Lichess Explorer data
const fetchLichessData = async (
  fen: string,
  rating: number,
  signal?: AbortSignal
): Promise<LichessData> => {
  const ratings = getRatingGroups(rating)
  const params = new URLSearchParams({
    variant: 'standard',
    fen: fen,
    speeds: 'rapid,classical',
    ratings: ratings.join(','),
    moves: '12',
  })

  const response = await fetch(
    `https://explorer.lichess.ovh/lichess?${params.toString()}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(`Lichess API error: ${response.status}`)
  }

  return response.json()
}

// Convert Lichess data to SAN evaluation format
const lichessToSanEvaluation = (data: LichessData): SanMaiaEvaluation => {
  const totalGames = data.white + data.draws + data.black
  const winRate = totalGames > 0 ? (data.white + data.draws * 0.5) / totalGames : 0.5

  const policy: { [key: string]: number } = {}
  const totalMoveGames = data.moves.reduce(
    (sum, move) => sum + move.white + move.draws + move.black,
    0
  )

  data.moves.forEach((move) => {
    const moveGames = move.white + move.draws + move.black
    policy[move.san] = totalMoveGames > 0 ? moveGames / totalMoveGames : 0
  })

  // Convert win rate to value format consistent with neural network output
  const value = (winRate - 0.5) * 2

  return { value, policy }
}

const uciToSan = (uci: string, fen: string): string => {
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined,
    })
    return move ? move.san : uci
  } catch {
    return uci
  }
}

const convertToSanEvaluation = (
  uciEval: MaiaEvaluation,
  fen: string
): SanMaiaEvaluation => {
  const sanPolicy: { [key: string]: number } = {}
  Object.entries(uciEval.policy).forEach(([uciMove, probability]) => {
    const sanMove = uciToSan(uciMove, fen)
    sanPolicy[sanMove] = probability
  })

  return {
    value: uciEval.value,
    policy: sanPolicy,
  }
}

export const useNets = ({
  fen,
  maxRetries = 30,
  retryDelayMs = 100,
  enabledModels,
  useLichessBook = true,
  bookThreshold = 21,
}: UseMaiaEngineOptions): UseMaiaEngineResult => {
  const { maia2, bigLeela, elitemaia } = useNetModels()
  const { status, activeModels} = useNetStatus()

  const [evaluations, setEvaluations] = useState<
    UseMaiaEngineResult['evaluations']
  >({})
  const [sanEvaluations, setSanEvaluations] = useState<
    UseMaiaEngineResult['sanEvaluations']
  >({})
  const [lichessData, setLichessData] = useState<
    UseMaiaEngineResult['lichessData']
  >({})
  const [isInBook, setIsInBook] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortControllerRef.current = new AbortController()
    const currentAbortController = abortControllerRef.current

    const analyzePosition = async () => {
      if (!fen) return

      const modelsToUse = enabledModels
        ? enabledModels.filter((m) => activeModels.includes(m))
        : activeModels

      if (modelsToUse.length === 0) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const newEvaluations: UseMaiaEngineResult['evaluations'] = {}
        const newSanEvaluations: UseMaiaEngineResult['sanEvaluations'] = {}
        const newLichessData: UseMaiaEngineResult['lichessData'] = {}
        let positionIsInBook = false

        // Maia 2 (all rating levels)
        if (
          modelsToUse.includes('maia2') &&
          maia2 &&
          status.maia2 === 'ready'
        ) {
          if (currentAbortController.signal.aborted) return

          const maia2Evaluations: { [key: string]: MaiaEvaluation } = {}
          const maia2SanEvaluations: { [key: string]: SanMaiaEvaluation } = {}
          const maia2LichessData: { [key: string]: LichessData } = {}

          if (useLichessBook) {
            // Fetch Lichess data for all rating levels
            const lichessPromises = MAIA_MODELS.map((model) =>
              fetchLichessData(
                fen,
                parseInt(model),
                currentAbortController.signal
              )
            )
            const lichessResults = await Promise.all(lichessPromises)

            MAIA_MODELS.forEach((model, index) => {
              const lichessResult = lichessResults[index]
              const totalGames =
                lichessResult.white +
                lichessResult.draws +
                lichessResult.black

              maia2LichessData[model] = lichessResult

              if (totalGames >= bookThreshold) {
                positionIsInBook = true
                maia2SanEvaluations[model] =
                  lichessToSanEvaluation(lichessResult)
              }
            })

            newLichessData.maia2 = maia2LichessData
          }

          // If not in book, use Maia neural network
          if (!positionIsInBook) {
            // Create batch positions array with proper structure
            const positions = [
              { fen, eloSelf: 1100, eloOppo: 1100 },
              { fen, eloSelf: 1200, eloOppo: 1200 },
              { fen, eloSelf: 1300, eloOppo: 1300 },
              { fen, eloSelf: 1400, eloOppo: 1400 },
              { fen, eloSelf: 1500, eloOppo: 1500 },
              { fen, eloSelf: 1600, eloOppo: 1600 },
              { fen, eloSelf: 1700, eloOppo: 1700 },
              { fen, eloSelf: 1800, eloOppo: 1800 },
              { fen, eloSelf: 1900, eloOppo: 1900 },
            ]

            const results = await maia2.batchEval(positions)

            if (currentAbortController.signal.aborted) return

            MAIA_MODELS.forEach((model, index) => {
              const uciEval = results[index]
              maia2Evaluations[model] = uciEval
              maia2SanEvaluations[model] = convertToSanEvaluation(uciEval, fen)
            })

            newEvaluations.maia2 = maia2Evaluations
          }

          newSanEvaluations.maia2 = maia2SanEvaluations
        }

      
        if (
          modelsToUse.includes('bigLeela') &&
          bigLeela &&
          status.bigLeela === 'ready'
        ) {
          if (currentAbortController.signal.aborted) return

        
            const uciEval = await bigLeela.evaluate(fen)
            newEvaluations.bigLeela = uciEval
            newSanEvaluations.bigLeela = convertToSanEvaluation(uciEval, fen)
          
        }

        // Elite Maia (Leela model)
        if (
          modelsToUse.includes('elitemaia') &&
          elitemaia &&
          status.elitemaia === 'ready'
        ) {
          if (currentAbortController.signal.aborted) return

            const uciEval = await elitemaia.evaluate(fen)
            newEvaluations.elitemaia = uciEval
            newSanEvaluations.elitemaia = convertToSanEvaluation(uciEval, fen)
          
        }

        if (!currentAbortController.signal.aborted) {
          setEvaluations(newEvaluations)
          setSanEvaluations(newSanEvaluations)
          setLichessData(newLichessData)
          setIsInBook(positionIsInBook)
        }
      } catch (err) {
        if (!currentAbortController.signal.aborted) {
          const error = err instanceof Error ? err : new Error('Unknown error')
          setError(error)
          console.error('Analysis error:', error)
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    const waitForModels = async () => {
      let retries = 0
      while (retries < maxRetries) {
        if (currentAbortController.signal.aborted) return

        const modelsToUse = enabledModels
          ? enabledModels.filter((m) => activeModels.includes(m))
          : activeModels

        if (modelsToUse.length > 0) {
          await analyzePosition()
          return
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        retries++
      }

      if (!currentAbortController.signal.aborted) {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (!currentAbortController.signal.aborted) {
        waitForModels()
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      abortControllerRef.current?.abort()
    }
  }, [
    fen,
    maia2,
    bigLeela,
    elitemaia,
    status.maia2,
    status.bigLeela,
    status.elitemaia,
    activeModels,
    enabledModels,
    useLichessBook,
    bookThreshold,
    maxRetries,
    retryDelayMs,
  ])

  return {
    evaluations,
    sanEvaluations,
    lichessData,
    isInBook,
    isLoading,
    Maiaerror: error,
  }
}


