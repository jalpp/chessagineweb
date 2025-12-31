import { Tensor } from "onnxruntime-web";
import NetModel from "./NetModel";
import { preprocess } from "./tensor";
import { processMaiaPolicy } from "./helper";

export class MaiaModel extends NetModel {
  async evaluate(fen: string, eloSelf: number, eloOppo: number) {
    if (!this.getModel) throw new Error("Model not ready");

    // Maia 2
    const { boardInput, legalMoves, eloSelfCategory, eloOppoCategory } =
      preprocess(fen, eloSelf, eloOppo);

    const boardTensor = new Tensor("float32", boardInput, [1, 18, 8, 8]);
    const eloSelfTensor = new Tensor(
      "int64",
      BigInt64Array.from([BigInt(eloSelfCategory)])
    );
    const eloOppoTensor = new Tensor(
      "int64",
      BigInt64Array.from([BigInt(eloOppoCategory)])
    );

    const outputs = await this.getModel.run({
      boards: boardTensor,
      elo_self: eloSelfTensor,
      elo_oppo: eloOppoTensor,
    });

    // console.log(outputs.logits_maia.size);
    // console.log(outputs, "maia");
    const result = processMaiaPolicy(
      fen,
      outputs.logits_maia,
      outputs.logits_value,
      legalMoves
    );

    // Dispose tensors
    boardTensor.dispose();
    eloSelfTensor.dispose();
    eloOppoTensor.dispose();
    outputs.logits_maia.dispose();
    outputs.logits_value.dispose();

    return result;
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
    const eloSelfArr: bigint[] = [];
    const eloOppoArr: bigint[] = [];
    const fens: string[] = [];

    for (const p of positions) {
      const { boardInput, legalMoves, eloSelfCategory, eloOppoCategory } =
        preprocess(p.fen, p.eloSelf, p.eloOppo);

      boards.push(boardInput);
      legalMovesList.push(legalMoves);
      eloSelfArr.push(BigInt(eloSelfCategory));
      eloOppoArr.push(BigInt(eloOppoCategory));
      fens.push(p.fen);
    }

    const batch = boards.length;
    const boardTensor = new Float32Array(batch * 18 * 8 * 8);
    boards.forEach((b, i) => boardTensor.set(b, i * b.length));

    const boardsTensor = new Tensor("float32", boardTensor, [batch, 18, 8, 8]);
    const eloSelfTensor = new Tensor("int64", BigInt64Array.from(eloSelfArr));
    const eloOppoTensor = new Tensor("int64", BigInt64Array.from(eloOppoArr));

    const outputs = await this.getModel.run({
      boards: boardsTensor,
      elo_self: eloSelfTensor,
      elo_oppo: eloOppoTensor,
    });

    const policyData = outputs.logits_maia.data as Float32Array;
    const valueData = outputs.logits_value.data as Float32Array;

    const results = [];

    const MAIA_POLICY_SIZE = 1880;

    for (let i = 0; i < batch; i++) {
      const policySlice = policyData.subarray(
        i * MAIA_POLICY_SIZE,
        (i + 1) * MAIA_POLICY_SIZE
      );
      const valueSlice = valueData.subarray(i, i + 1);

      const res = processMaiaPolicy(
        fens[i],
        { data: policySlice } as Tensor,
        { data: valueSlice } as Tensor,
        legalMovesList[i]
      );

      results.push(res);
    }

    // Dispose tensors
    boardsTensor.dispose();
    eloSelfTensor.dispose();
    eloOppoTensor.dispose();
    outputs.logits_maia.dispose();
    outputs.logits_value.dispose();

    return results;
  }
}
