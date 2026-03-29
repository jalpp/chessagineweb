/**
 * Maia3Model — Maia 3 ONNX inference using onnxruntime-web on the main thread.
 * Extends NetModel exactly like MaiaModel does — no custom worker needed.
 *
 * Maia 3 covers 600–2600 Elo via continuous rating conditioning.
 * Model inputs:  tokens [batch, 64, 12], elo_self [batch], elo_oppo [batch]
 * Model outputs: logits_move [batch, 4352], logits_value [batch, 3]
 */

import { Tensor } from 'onnxruntime-web'
import NetModel from './NetModel'
import { preprocessMaia3, processOutputsMaia3 } from './tensorMaia3'
import { MaiaEvaluation } from './types'

export class Maia3Model extends NetModel {
  /**
   * Evaluates a single position at the given self/opponent Elo ratings.
   * eloSelf and eloOppo accept any value in 600–2600.
   */
  async evaluate(fen: string, eloSelf: number, eloOppo: number): Promise<MaiaEvaluation> {
    await this.waitUntilReady()
    if (!this.isReady()) throw new Error('Maia3 model not ready')

    const { boardTokens, legalMoves } = preprocessMaia3(fen)

    const tokensTensor = new Tensor('float32', boardTokens, [1, 64, 12])
    const eloSelfTensor = new Tensor('float32', Float32Array.from([eloSelf]), [1])
    const eloOppoTensor = new Tensor('float32', Float32Array.from([eloOppo]), [1])

    const outputs = await this.getModel.run({
      tokens: tokensTensor,
      elo_self: eloSelfTensor,
      elo_oppo: eloOppoTensor,
    })

    const logitsMove = outputs.logits_move.data as Float32Array
    const logitsValue = outputs.logits_value.data as Float32Array

    const result = processOutputsMaia3(fen, logitsMove, logitsValue, legalMoves)

    tokensTensor.dispose()
    eloSelfTensor.dispose()
    eloOppoTensor.dispose()
    outputs.logits_move.dispose()
    outputs.logits_value.dispose()

    return result
  }

  /**
   * Batch evaluates multiple (fen, eloSelf, eloOppo) positions in one inference call.
   * Used to evaluate all 21 rating levels (600–2600) at once.
   */
  async batchEvaluate(
    positions: { fen: string; eloSelf: number; eloOppo: number }[],
  ): Promise<MaiaEvaluation[]> {
    await this.waitUntilReady()
    if (!this.isReady()) throw new Error('Maia3 model not ready')

    const batch = positions.length
    const boardInputs: Float32Array[] = []
    const legalMovesArr: Float32Array[] = []

    for (const p of positions) {
      const { boardTokens, legalMoves } = preprocessMaia3(p.fen)
      boardInputs.push(boardTokens)
      legalMovesArr.push(legalMoves)
    }

    // Combine into flat batched arrays
    const combinedTokens = new Float32Array(batch * 64 * 12)
    boardInputs.forEach((b, i) => combinedTokens.set(b, i * 64 * 12))

    const eloSelfs = Float32Array.from(positions.map((p) => p.eloSelf))
    const eloOppos = Float32Array.from(positions.map((p) => p.eloOppo))

    const tokensTensor = new Tensor('float32', combinedTokens, [batch, 64, 12])
    const eloSelfTensor = new Tensor('float32', eloSelfs, [batch])
    const eloOppoTensor = new Tensor('float32', eloOppos, [batch])

    const outputs = await this.getModel.run({
      tokens: tokensTensor,
      elo_self: eloSelfTensor,
      elo_oppo: eloOppoTensor,
    })

    const policyData = outputs.logits_move.data as Float32Array
    const valueData = outputs.logits_value.data as Float32Array

    const MOVE_LOGITS = 4352
    const VALUE_LOGITS = 3

    const results: MaiaEvaluation[] = positions.map((p, i) => {
      const moveSlice = policyData.subarray(i * MOVE_LOGITS, (i + 1) * MOVE_LOGITS)
      const valueSlice = valueData.subarray(i * VALUE_LOGITS, (i + 1) * VALUE_LOGITS)
      return processOutputsMaia3(p.fen, moveSlice, valueSlice, legalMovesArr[i])
    })

    tokensTensor.dispose()
    eloSelfTensor.dispose()
    eloOppoTensor.dispose()
    outputs.logits_move.dispose()
    outputs.logits_value.dispose()

    return results
  }
}