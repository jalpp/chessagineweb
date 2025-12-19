import { MaiaStatus } from './types';
import { InferenceSession, Tensor } from 'onnxruntime-web'

import { mirrorMove, preprocess, allPossibleMovesReversed, preprocessLeela } from "./tensor";
import { MaiaModelStorage } from './storage'

interface MaiaOptions {
  model: string
  setStatus: (status: MaiaStatus) => void
  setProgress: (progress: number) => void
  setError: (error: string) => void
  modelType?: 'maia2' | 'leela'
}

class Maia {
  private model!: InferenceSession
  private modelUrl: string
  private options: MaiaOptions
  private storage: MaiaModelStorage
  private modelType: 'maia2' | 'leela'

  constructor(options: MaiaOptions) {
    this.modelUrl = options.model
    this.options = options
    this.storage = new MaiaModelStorage()
    this.modelType = options.modelType || 'maia2'
    // Set initial status to loading to prevent popup
    this.options.setStatus('loading')
    this.initialize()
  }

  private async initialize() {
    try {
      await this.storage.requestPersistentStorage()

      console.log('Checking for cached model...')
      const buffer = await this.storage.getModel(this.modelUrl)

      if (buffer) {
        console.log('Cached model found, initializing...')
        try {
          await this.initializeModel(buffer)
          console.log('Model initialized from cache successfully')
          this.options.setStatus('ready')
        } catch (e) {
          console.error('Failed to initialize cached model:', e)
          // If cached model fails, clear it and prompt for download
          await this.storage.deleteModel()
          this.options.setError('Cached model corrupted. Please re-download.')
          this.options.setStatus('no-cache')
        }
      } else {
        console.log('No cached model found')
        this.options.setStatus('no-cache')
      }
    } catch (error) {
      console.error('Initialization error:', error)
      this.options.setError('Failed to initialize storage')
      this.options.setStatus('error')
    }
  }

  public async downloadModel() {
    try {
      this.options.setStatus('downloading')
      this.options.setProgress(0)

      const response = await fetch(this.modelUrl)
      if (!response.ok) throw new Error('Failed to fetch model')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const contentLength = +(response.headers.get('Content-Length') ?? 0)
      const chunks: Uint8Array[] = []
      let received = 0
      let lastProgress = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        
        const progress = Math.floor((received / contentLength) * 100)
        if (progress >= lastProgress + 10) {
          this.options.setProgress(progress)
          lastProgress = progress
        }
      }

      const buffer = new Uint8Array(received)
      let offset = 0
      for (const chunk of chunks) {
        buffer.set(chunk, offset)
        offset += chunk.length
      }

      console.log('Download complete, storing model...')
      await this.storage.storeModel(this.modelUrl, buffer.buffer)
      
      console.log('Model stored, initializing...')
      await this.initializeModel(buffer.buffer)
      
      console.log('Model ready')
      this.options.setStatus('ready')
    } catch (error) {
      console.error('Download failed:', error)
      this.options.setError(error instanceof Error ? error.message : 'Download failed')
      this.options.setStatus('error')
    }
  }

  public async getStorageInfo() {
    return await this.storage.getStorageInfo()
  }

  public async clearStorage() {
    return await this.storage.clearAllStorage()
  }

  public async initializeModel(buffer: ArrayBuffer) {
    this.model = await InferenceSession.create(buffer)
    console.log('Model inputs:', this.model.inputNames)
    console.log('Model outputs:', this.model.outputNames)
  }

  /**
   * Evaluates a given chess position using the Maia model.
   */
  async evaluate(board: string, eloSelf: number, eloOppo: number) {
    if (!this.model) throw new Error('Model not initialized')

    if (this.modelType === 'leela') {
      const { boardInput, legalMoves } = preprocessLeela(board)

      const outputs = await this.model.run({
        '/input/planes': new Tensor('float32', boardInput, [1, 112, 8, 8]),
      })

      const policyTensor = pickOutput(outputs, ['policy', '/output/policy'], 0)
      const wdlTensor = outputs['/output/wdl']

      const value = wdlToWinProb(wdlTensor, board)
      const { policy } = processOutputsLeela(
        board,
        policyTensor,
        legalMoves,
      )

      return { policy, value }
    }

    // MAIA 2 (unchanged)
    const { boardInput, legalMoves, eloSelfCategory, eloOppoCategory } =
      preprocess(board, eloSelf, eloOppo)

    const outputs = await this.model.run({
      boards: new Tensor('float32', boardInput, [1, 18, 8, 8]),
      elo_self: new Tensor('int64', BigInt64Array.from([BigInt(eloSelfCategory)])),
      elo_oppo: new Tensor('int64', BigInt64Array.from([BigInt(eloOppoCategory)])),
    })

    return processOutputsMaia2(board, outputs.logits_maia, outputs.logits_value, legalMoves)
  }

  /**
   * Evaluates a batch of chess positions.
   */
  async batchEvaluate(boards: string[], eloSelfs: number[], eloOppos: number[]) {
    if (!this.model) throw new Error('Model not initialized')

    const batchSize = boards.length
    const boardInputs: Float32Array[] = []
    const legalMoves: Float32Array[] = []
    const eloSelfCats: number[] = []
    const eloOppoCats: number[] = []

    // Preprocess all boards
    for (let i = 0; i < batchSize; i++) {
      if (this.modelType === 'leela') {
        const r = preprocessLeela(boards[i])
        boardInputs.push(r.boardInput)
        legalMoves.push(r.legalMoves)
      } else {
        const r = preprocess(boards[i], eloSelfs[i], eloOppos[i])
        boardInputs.push(r.boardInput)
        legalMoves.push(r.legalMoves)
        eloSelfCats.push(r.eloSelfCategory)
        eloOppoCats.push(r.eloOppoCategory)
      }
    }

    // Combine board inputs
    const planes = this.modelType === 'leela' ? 112 : 18
    const combined = new Float32Array(batchSize * planes * 64)
    boardInputs.forEach((b, i) => combined.set(b, i * planes * 64))

    const start = performance.now()

    // Run model
    const outputs =
      this.modelType === 'leela'
        ? await this.model.run({
            '/input/planes': new Tensor('float32', combined, [batchSize, planes, 8, 8]),
          })
        : await this.model.run({
            boards: new Tensor('float32', combined, [batchSize, planes, 8, 8]),
            elo_self: new Tensor('int64', BigInt64Array.from(eloSelfCats.map(BigInt)), [batchSize]),
            elo_oppo: new Tensor('int64', BigInt64Array.from(eloOppoCats.map(BigInt)), [batchSize]),
          })

    const end = performance.now()

    // Process outputs
    const results = []

    if (this.modelType === 'leela') {
      const policyTensor = pickOutput(outputs, ['policy', '/output/policy'], 0)
      const wdlTensor = outputs['/output/wdl']

      for (let i = 0; i < batchSize; i++) {
        const logitsPer = policyTensor.data.length / batchSize
        const policySlice = policyTensor.data.slice(
          i * logitsPer,
          (i + 1) * logitsPer,
        ) as Float32Array

        const { policy } = processOutputsLeela(
          boards[i],
          new Tensor('float32', policySlice, [logitsPer]),
          legalMoves[i],
        )

        // Extract WDL for this position
        const wdlSlice = (wdlTensor.data as Float32Array).slice(i * 3, (i + 1) * 3)
        const wdlSingleTensor = new Tensor('float32', wdlSlice, [3])
        const value = wdlToWinProb(wdlSingleTensor, boards[i])

        results.push({ policy, value })
      }
    } else {
      // Maia2 batch processing
      const policyTensor = outputs.logits_maia
      const valueTensor = outputs.logits_value

      for (let i = 0; i < batchSize; i++) {
        const logitsPer = policyTensor.data.length / batchSize
        const policySlice = policyTensor.data.slice(
          i * logitsPer,
          (i + 1) * logitsPer,
        ) as Float32Array

        const valueLogit = valueTensor.data[i] as number

        const { policy, value } = processOutputsMaia2(
          boards[i],
          new Tensor('float32', policySlice, [logitsPer]),
          new Tensor('float32', [valueLogit], [1]),
          legalMoves[i],
        )

        results.push({ policy, value })
      }
    }

    return {
      result: results,
      time: end - start,
    }
  }
}

/**
 * Pick the first available output tensor from a list of possible names
 */
function pickOutput(
  outputs: Record<string, Tensor>,
  names: string[],
  fallback: number,
): Tensor {
  for (const n of names) {
    if (outputs[n]) return outputs[n]
  }
  return Object.values(outputs)[fallback]
}

/**
 * Convert WDL (Win-Draw-Loss) logits to win probability
 */
function wdlToWinProb(wdlTensor: Tensor, fen: string): number {
  const logits = wdlTensor.data as Float32Array
  
  // Softmax over WDL
  const max = Math.max(...logits)
  const exps = Array.from(logits).map((v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  const probs = exps.map((v) => v / sum)
  
  // WDL format: [loss, draw, win] from white's perspective
  const winWhite = probs[2] + 0.5 * probs[1]
  
  // Flip for black
  return fen.split(' ')[1] === 'b' ? 1 - winWhite : winWhite
}

/**
 * Process Leela model outputs (NO MIRRORING)
 */
function processOutputsLeela(
  fen: string,
  logitsTensor: Tensor,
  legalMoves: Float32Array,
) {
  const logits = logitsTensor.data as Float32Array
  const isBlack = fen.split(' ')[1] === 'b'

  // Get legal move indices
  const legalIdx: number[] = []
  for (let i = 0; i < legalMoves.length; i++) {
    if (legalMoves[i] > 0) legalIdx.push(i)
  }

  // Get moves (apply mirroring for black to match board representation)
  const moves: string[] = legalIdx.map((i) => {
    const move = allPossibleMovesReversed[i] as string
    return isBlack ? mirrorMove(move) : move
  })

  // Extract legal logits and compute softmax
  const legalLogits = legalIdx.map((i) => logits[i])
  const max = Math.max(...legalLogits)
  const exps = legalLogits.map((l) => Math.exp(l - max))
  const sum = exps.reduce((a, b) => a + b, 0)

  // Build policy
  const policy: Record<string, number> = {}
  for (let i = 0; i < moves.length; i++) {
    policy[moves[i]] = exps[i] / sum
  }

  // Sort policy by probability
  const sortedPolicy = Object.keys(policy)
    .sort((a, b) => policy[b] - policy[a])
    .reduce((acc, key) => {
      acc[key] = policy[key]
      return acc
    }, {} as Record<string, number>)

  return { policy: sortedPolicy }
}

/**
 * Process Maia2 model outputs (WITH MIRRORING)
 */
function processOutputsMaia2(
  fen: string,
  logits_maia: Tensor,
  logits_value: Tensor,
  legalMoves: Float32Array,
) {
  const logits = logits_maia.data as Float32Array
  const value = logits_value.data as Float32Array

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
    let move = allPossibleMovesReversed[moveIndex] as string
    if (black_flag) {
      move = mirrorMove(move)
    }

    legalMovesMirrored.push(move)
  }

  // Extract logits for legal moves
  const legalLogits = legalMoveIndices.map((idx) => logits[idx])

  // Compute softmax over the legal logits
  const maxLogit = Math.max(...legalLogits)
  const expLogits = legalLogits.map((logit) => Math.exp(logit - maxLogit))
  const sumExp = expLogits.reduce((a, b) => a + b, 0)
  const probs = expLogits.map((expLogit) => expLogit / sumExp)

  // Map the probabilities back to their move indices
  const moveProbs: Record<string, number> = {}
  for (let i = 0; i < legalMoveIndices.length; i++) {
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

export default Maia;