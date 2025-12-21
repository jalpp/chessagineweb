import { MaiaStatus } from './types'
import { InferenceSession, Tensor } from 'onnxruntime-web'

import {
  mirrorMove,
  preprocess,
  preprocessLeela,
  allPossibleMovesReversed,
  allPossibleMovesReversedMaia,
} from './tensor'

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
  private readonly modelUrl: string
  private readonly options: MaiaOptions
  private readonly storage = new MaiaModelStorage()
  private readonly modelType: 'maia2' | 'leela'

  constructor(options: MaiaOptions) {
    this.modelUrl = options.model
    this.options = options
    this.modelType = options.modelType ?? 'maia2'

    this.options.setStatus('loading')
    this.initialize()
  }

  private async initialize() {
    try {
      await this.storage.requestPersistentStorage()

      const cached = await this.storage.getModel(this.modelUrl)
      if (!cached) {
        this.options.setStatus('no-cache')
        return
      }

      await this.initializeModel(cached)
      this.options.setStatus('ready')
    } catch (err) {
      console.error(err)
      await this.storage.clearAllStorage()
      this.options.setError('Failed to load model')
      this.options.setStatus('no-cache')
    }
  }

  async downloadModel() {
    try {
      this.options.setStatus('downloading')
      this.options.setProgress(0)

      const res = await fetch(this.modelUrl)
      if (!res.ok || !res.body) throw new Error('Download failed')

      const reader = res.body.getReader()
      const len = Number(res.headers.get('Content-Length') ?? 0)

      const chunks: Uint8Array[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (len) this.options.setProgress(Math.floor((received / len) * 100))
      }

      const buffer = new Uint8Array(received)
      let offset = 0
      for (const c of chunks) {
        buffer.set(c, offset)
        offset += c.length
      }

      await this.storage.storeModel(this.modelUrl, buffer.buffer)
      await this.initializeModel(buffer.buffer)

      this.options.setStatus('ready')
    } catch (e) {
      console.error(e)
      this.options.setError('Download failed')
      this.options.setStatus('error')
    }
  }

  private async initializeModel(buffer: ArrayBuffer) {
    this.model = await InferenceSession.create(buffer)
    console.log('ONNX inputs:', this.model.inputNames)
    console.log('ONNX outputs:', this.model.outputNames)
  }

  /* ======================================================
     Single evaluation
  ====================================================== */

  async evaluate(fen: string, eloSelf: number, eloOppo: number) {
    if (!this.model) throw new Error('Model not ready')

    if (this.modelType === 'leela') {
      const { boardInput, legalMoves } = preprocessLeela(fen)

      const inputTensor = new Tensor('float32', boardInput, [1, 112, 8, 8])
      
      const outputs = await this.model.run({
        '/input/planes': inputTensor,
      })

      const policyTensor = pickOutput(outputs, ['policy', '/output/policy'])
      const wdlTensor = pickOutput(outputs, ['wdl', '/output/wdl'])

    // console.log('=== LEELA SINGLE EVAL DEBUG ===')
    // console.log('FEN:', fen)
    // console.log('Policy tensor size:', policyTensor.size)
    // console.log('Policy tensor dims:', policyTensor.dims)
    // console.log('WDL tensor size:', wdlTensor.size)
    // console.log('WDL tensor dims:', wdlTensor.dims)
    // console.log('Legal moves count:', legalMoves.filter(m => m > 0).length)
    // console.log('allPossibleMovesReversed length:', Object.keys(allPossibleMovesReversed || {}).length)
    // console.log('================================')

      const value = wdlToWinProb(wdlTensor, fen)
      const policy = processLeelaPolicy(fen, policyTensor, legalMoves)

      // Dispose tensors
      inputTensor.dispose()
      policyTensor.dispose()
      wdlTensor.dispose()

      return { policy, value }
    }

    // Maia 2
    const { boardInput, legalMoves, eloSelfCategory, eloOppoCategory } =
      preprocess(fen, eloSelf, eloOppo)

    const boardTensor = new Tensor('float32', boardInput, [1, 18, 8, 8])
    const eloSelfTensor = new Tensor('int64', BigInt64Array.from([BigInt(eloSelfCategory)]))
    const eloOppoTensor = new Tensor('int64', BigInt64Array.from([BigInt(eloOppoCategory)]))

    const outputs = await this.model.run({
      boards: boardTensor,
      elo_self: eloSelfTensor,
      elo_oppo: eloOppoTensor,
    })


    console.log(outputs.logits_maia.size)
    console.log(outputs, "maia");
    const result = processMaiaPolicy(
      fen,
      outputs.logits_maia,
      outputs.logits_value,
      legalMoves,
    )

    // Dispose tensors
    boardTensor.dispose()
    eloSelfTensor.dispose()
    eloOppoTensor.dispose()
    outputs.logits_maia.dispose()
    outputs.logits_value.dispose()

    return result
  }

  
async batchEval(
  positions: {
    fen: string
    eloSelf: number
    eloOppo: number
  }[],
) {
  if (!this.model) throw new Error('Model not ready')

  // ---------- LEELA ----------
  if (this.modelType === 'leela') {
    const boards: Float32Array[] = []
    const legalMovesList: Float32Array[] = []
    const fens: string[] = []

    for (const p of positions) {
      const { boardInput, legalMoves } = preprocessLeela(p.fen)
      boards.push(boardInput)
      legalMovesList.push(legalMoves)
      fens.push(p.fen)
    }

    const batch = boards.length
    const input = new Float32Array(batch * 112 * 8 * 8)
    boards.forEach((b, i) => input.set(b, i * b.length))

    const inputTensor = new Tensor('float32', input, [batch, 112, 8, 8])

    const outputs = await this.model.run({
      '/input/planes': inputTensor,
    })

    const policyTensor = pickOutput(outputs, ['policy', '/output/policy'])
    const wdlTensor = pickOutput(outputs, ['wdl', '/output/wdl'])

    const policyData = policyTensor.data as Float32Array
    const wdlData = wdlTensor.data as Float32Array

     // DEBUG: Log tensor information for Leela
    // console.log('=== LEELA BATCH DEBUG ===')
    // console.log('Batch size:', batch)
    // console.log('Policy tensor size:', policyTensor.size)
    // console.log('Policy tensor dims:', policyTensor.dims)
    // console.log('Policy data length:', policyData.length)
    // console.log('WDL tensor size:', wdlTensor.size)
    // console.log('WDL data length:', wdlData.length)
    // console.log('allPossibleMovesReversed length:', Object.keys(allPossibleMovesReversed || {}).length)
    // console.log('Calculated policy size per item:', policyTensor.size / batch)
    // console.log('Expected policy size (hardcoded): 1858')
    // console.log('========================')

    const results = []

    for (let i = 0; i < batch; i++) {
      const policySlice = policyData.subarray(i * 1858, (i + 1) * 1858)
      const wdlSlice = wdlData.subarray(i * 3, (i + 1) * 3)

      const value = wdlToWinProb({ data: wdlSlice } as Tensor, fens[i])

      const policy = processLeelaPolicy(
        fens[i],
        { data: policySlice } as Tensor,
        legalMovesList[i],
      )

      results.push({ policy, value })
    }

    // Dispose tensors
    inputTensor.dispose()
    policyTensor.dispose()
    wdlTensor.dispose()

    return results
  }

  // ---------- MAIA 2 ----------
  const boards: Float32Array[] = []
  const legalMovesList: Float32Array[] = []
  const eloSelfArr: bigint[] = []
  const eloOppoArr: bigint[] = []
  const fens: string[] = []

  for (const p of positions) {
    const { boardInput, legalMoves, eloSelfCategory, eloOppoCategory } =
      preprocess(p.fen, p.eloSelf, p.eloOppo)

    boards.push(boardInput)
    legalMovesList.push(legalMoves)
    eloSelfArr.push(BigInt(eloSelfCategory))
    eloOppoArr.push(BigInt(eloOppoCategory))
    fens.push(p.fen)
  }

  const batch = boards.length
  const boardTensor = new Float32Array(batch * 18 * 8 * 8)
  boards.forEach((b, i) => boardTensor.set(b, i * b.length))

  const boardsTensor = new Tensor('float32', boardTensor, [batch, 18, 8, 8])
  const eloSelfTensor = new Tensor('int64', BigInt64Array.from(eloSelfArr))
  const eloOppoTensor = new Tensor('int64', BigInt64Array.from(eloOppoArr))

  const outputs = await this.model.run({
    boards: boardsTensor,
    elo_self: eloSelfTensor,
    elo_oppo: eloOppoTensor,
  })

  const policyData = outputs.logits_maia.data as Float32Array
  const valueData = outputs.logits_value.data as Float32Array

  const results = []
  
 
  const MAIA_POLICY_SIZE = 1880

  for (let i = 0; i < batch; i++) {
    const policySlice = policyData.subarray(i * MAIA_POLICY_SIZE, (i + 1) * MAIA_POLICY_SIZE)
    const valueSlice = valueData.subarray(i, i + 1)

    const res = processMaiaPolicy(
      fens[i],
      { data: policySlice } as Tensor,
      { data: valueSlice } as Tensor,
      legalMovesList[i],
    )

    results.push(res)
  }

  // Dispose tensors
  boardsTensor.dispose()
  eloSelfTensor.dispose()
  eloOppoTensor.dispose()
  outputs.logits_maia.dispose()
  outputs.logits_value.dispose()

  return results
}
}

/* ======================================================
   Helpers
====================================================== */

function pickOutput(
  outputs: Record<string, Tensor>,
  names: string[],
): Tensor {
  for (const n of names) if (outputs[n]) return outputs[n]
  throw new Error(`Missing output: ${names.join(', ')}`)
}

/**
 * Convert WDL (Win/Draw/Loss) tensor to win probability for the side to move
 */
function wdlToWinProb(wdl: Tensor, fen: string): number {
  const data = wdl.data as Float32Array
  
  // Apply softmax to get probabilities
  const max = Math.max(...data)
  const exp = Array.from(data).map((v) => Math.exp(v - max))
  const sum = exp.reduce((a, b) => a + b, 0)
  const probs = exp.map((v) => v / sum)
  
  // LC0 WDL format: [loss, draw, win] from white's perspective
  const whiteLoss = probs[0]
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

function processLeelaPolicy(
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
function processMaiaPolicy(
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

export default Maia