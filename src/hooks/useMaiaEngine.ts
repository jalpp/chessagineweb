import { useEffect, useState, useContext, useRef } from 'react'
import { Chess } from 'chess.js'
import { MaiaEngineContext } from '@/context/MaiaEngineContext'
import { MAIA_MODELS, MaiaEvaluation } from '@/libs/maia/types'

interface UseMaiaEngineOptions {
  fen: string
  maxRetries?: number
  retryDelayMs?: number
}

interface SanMaiaEvaluation {
  value: number
  policy: { [key: string]: number } // SAN moves as keys
}

interface UseMaiaEngineResult {
  evaluations: { [key: string]: MaiaEvaluation } | null // Raw UCI evaluations
  sanEvaluations: { [key: string]: SanMaiaEvaluation } | null // SAN evaluations
  isLoading: boolean
  error: Error | null
}

// Convert UCI move to SAN notation
const uciToSan = (uci: string, fen: string): string => {
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    })
    return move ? move.san : uci
  } catch {
    return uci
  }
}

export const useMaiaEngine = ({
  fen,
  maxRetries = 30,
  retryDelayMs = 100,
}: UseMaiaEngineOptions): UseMaiaEngineResult => {
  const maia = useContext(MaiaEngineContext)
  const [evaluations, setEvaluations] = useState<{
    [key: string]: MaiaEvaluation
  } | null>(null)
  const [sanEvaluations, setSanEvaluations] = useState<{
    [key: string]: SanMaiaEvaluation
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Create new abort controller for this analysis
    abortControllerRef.current = new AbortController()
    const currentAbortController = abortControllerRef.current

    const analyzeMaia = async () => {
      if (!fen) return

      setIsLoading(true)
      setError(null)

      try {
        // Wait for Maia to be ready
        let retries = 0
        while (retries < maxRetries && maia.status !== 'ready') {
          if (currentAbortController.signal.aborted) return
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          retries++
        }

        if (maia.status !== 'ready') {
          throw new Error('Maia engine not ready after waiting')
        }

        if (!maia.maia) {
          throw new Error('Maia engine not initialized')
        }

        if (currentAbortController.signal.aborted) return

        // Batch evaluate all Maia models
        const { result } = await maia.maia.batchEvaluate(
          Array(9).fill(fen),
          [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
          [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
        )

        if (currentAbortController.signal.aborted) return

        const maiaEvaluations: { [key: string]: MaiaEvaluation } = {}
        const maiaSanEvaluations: { [key: string]: SanMaiaEvaluation } = {}

        MAIA_MODELS.forEach((model, index) => {
          const uciEval = result[index]
          maiaEvaluations[model] = uciEval

          // Convert UCI policy to SAN policy
          const sanPolicy: { [key: string]: number } = {}
          Object.entries(uciEval.policy).forEach(([uciMove, probability]) => {
            const sanMove = uciToSan(uciMove, fen)
            sanPolicy[sanMove] = probability
          })

          maiaSanEvaluations[model] = {
            value: uciEval.value,
            policy: sanPolicy,
          }
        })

        setEvaluations(maiaEvaluations)
        setSanEvaluations(maiaSanEvaluations)
      } catch (err) {
        if (!currentAbortController.signal.aborted) {
          const error = err instanceof Error ? err : new Error('Unknown error')
          setError(error)
          console.error('Maia analysis error:', error)
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    // Delay analysis to prevent rapid fire when FEN changes quickly
    const timeoutId = setTimeout(() => {
      if (!currentAbortController.signal.aborted) {
        analyzeMaia()
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      abortControllerRef.current?.abort()
    }
  }, [fen, maia.status, maia.maia, maxRetries, retryDelayMs])

  return {
    evaluations,
    sanEvaluations,
    isLoading,
    error,
  }
}