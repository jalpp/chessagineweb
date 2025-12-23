import { Tensor } from "onnxruntime-web";
import NetModel from "./NetModel";
import { preprocessLeela } from "./tensor";
import { pickOutput, processLeelaPolicy, wdlToWinProb } from "./helper";

export class LeelaModel extends NetModel {

  async evaluate(fen: string) {
    if (!this.getModel) throw new Error("Model not ready");

    const { boardInput, legalMoves } = preprocessLeela(fen);

    const inputTensor = new Tensor("float32", boardInput, [1, 112, 8, 8]);

    const outputs = await this.getModel.run({
      "/input/planes": inputTensor,
    });

    const policyTensor = pickOutput(outputs, ["policy", "/output/policy"]);
    const wdlTensor = pickOutput(outputs, ["wdl", "/output/wdl"]);

    // console.log('=== LEELA SINGLE EVAL DEBUG ===')
    // console.log('FEN:', fen)
    // console.log('Policy tensor size:', policyTensor.size)
    // console.log('Policy tensor dims:', policyTensor.dims)
    // console.log('WDL tensor size:', wdlTensor.size)
    // console.log('WDL tensor dims:', wdlTensor.dims)
    // console.log('Legal moves count:', legalMoves.filter(m => m > 0).length)
    // console.log('allPossibleMovesReversed length:', Object.keys(allPossibleMovesReversed || {}).length)
    // console.log('================================')

    const value = wdlToWinProb(wdlTensor, fen);
    const policy = processLeelaPolicy(fen, policyTensor, legalMoves);

    // Dispose tensors
    inputTensor.dispose();
    policyTensor.dispose();
    wdlTensor.dispose();

    return { policy, value };
  }

  async batchEval(
    positions: {
      fen: string;
      eloSelf: number;
      eloOppo: number;
    }[]
  ) {
    if (!this.getModel) throw new Error("Model not ready");

    const boards: Float32Array[] = [];
    const legalMovesList: Float32Array[] = [];
    const fens: string[] = [];

    for (const p of positions) {
      const { boardInput, legalMoves } = preprocessLeela(p.fen);
      boards.push(boardInput);
      legalMovesList.push(legalMoves);
      fens.push(p.fen);
    }

    const batch = boards.length;
    const input = new Float32Array(batch * 112 * 8 * 8);
    boards.forEach((b, i) => input.set(b, i * b.length));

    const inputTensor = new Tensor("float32", input, [batch, 112, 8, 8]);

    const outputs = await this.getModel.run({
      "/input/planes": inputTensor,
    });

    const policyTensor = pickOutput(outputs, ["policy", "/output/policy"]);
    const wdlTensor = pickOutput(outputs, ["wdl", "/output/wdl"]);

    const policyData = policyTensor.data as Float32Array;
    const wdlData = wdlTensor.data as Float32Array;

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

    const results = [];

    for (let i = 0; i < batch; i++) {
      const policySlice = policyData.subarray(i * 1858, (i + 1) * 1858);
      const wdlSlice = wdlData.subarray(i * 3, (i + 1) * 3);

      const value = wdlToWinProb({ data: wdlSlice } as Tensor, fens[i]);

      const policy = processLeelaPolicy(
        fens[i],
        { data: policySlice } as Tensor,
        legalMovesList[i]
      );

      results.push({ policy, value });
    }

    // Dispose tensors
    inputTensor.dispose();
    policyTensor.dispose();
    wdlTensor.dispose();

    return results;
  }
}
