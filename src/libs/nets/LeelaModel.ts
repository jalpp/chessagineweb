import { Tensor } from "onnxruntime-web";
import NetModel from "./NetModel";
import { preprocessLeela } from "./tensor";
import { pickOutput, processLeelaPolicy, wdlToWinProb } from "./helper";

export class LeelaModel extends NetModel {

  async evaluate(fen: string) {
    await this.waitUntilReady();
    if (!this.isReady()) throw new Error('Model failed to initialize');

    return this.runInference(async () => {
      const { boardInput, legalMoves } = preprocessLeela(fen);
      const inputTensor = new Tensor("float32", boardInput, [1, 112, 8, 8]);

      const outputs = await this.getModel.run({
        "/input/planes": inputTensor,
      });

      const policyTensor = pickOutput(outputs, ["policy", "/output/policy"]);
      const wdlTensor    = pickOutput(outputs, ["wdl",    "/output/wdl"]);

      const value  = wdlToWinProb(wdlTensor, fen);
      const policy = processLeelaPolicy(fen, policyTensor, legalMoves);

      inputTensor.dispose();
      policyTensor.dispose();
      wdlTensor.dispose();

      return { policy, value };
    });
  }

  async batchEval(positions: { fen: string; eloSelf: number; eloOppo: number }[]) {
    await this.waitUntilReady();
    if (!this.isReady()) throw new Error('Model failed to initialize');

    return this.runInference(async () => {
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
      const wdlTensor    = pickOutput(outputs, ["wdl",    "/output/wdl"]);

      const policyData = policyTensor.data as Float32Array;
      const wdlData    = wdlTensor.data    as Float32Array;

      const results = [];
      for (let i = 0; i < batch; i++) {
        const policySlice = policyData.subarray(i * 1858, (i + 1) * 1858);
        const wdlSlice    = wdlData.subarray(i * 3, (i + 1) * 3);
        const value  = wdlToWinProb({ data: wdlSlice } as Tensor, fens[i]);
        const policy = processLeelaPolicy(fens[i], { data: policySlice } as Tensor, legalMovesList[i]);
        results.push({ policy, value });
      }

      inputTensor.dispose();
      policyTensor.dispose();
      wdlTensor.dispose();

      return results;
    });
  }
}