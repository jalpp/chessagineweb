import { CandidateMove } from "../agine/helper";
import { EaseMetricStrategy } from "./easeMetricStrategy";
import { MaiaEvaluation } from "../nets/types";

export class ChessDBEaseMetricCalculator extends EaseMetricStrategy {
  constructor(log: boolean) {
    super(log, "calculateEaseMetricDB");
  }

  public findMaxQ(chessDbEval: CandidateMove[]): number {
    const maxQs = [];
    for (let i = 0; i < chessDbEval.length; i++) {
      const cp = chessDbEval[i].rawEval || 0;
      maxQs.push(this.calculateRawWinningChanceQ(cp));
    }

    return Math.max(...maxQs);
  }

  public calculateEaseMetric(
    netEvals: MaiaEvaluation,
    chessDbEval: CandidateMove[] | null,
  ): number {
    try {
      if (!chessDbEval || chessDbEval.length === 0) {
        this.doLog("No engine evaluation provided");
        return 0.5;
      }

      const limitedMoves = chessDbEval.slice(0, 4);

      const Qmax = this.findMaxQ(limitedMoves);
      this.doLog(
        `calculateEaseMetricDB: Qmax=${Qmax}, analyzing ${chessDbEval.length} moves`,
      );

      const metrics: number[] = [];

      for (let i = 0; i < limitedMoves.length; i++) {
        const currNode = limitedMoves[i];
        const move = currNode.uci;
        const policyValue = netEvals.policy[move];

        const P = policyValue > 1 ? policyValue / 100 : policyValue;
        const Qi = this.calculateRawWinningChanceQ(currNode.rawEval || 0);

        if (isNaN(Qi) || isNaN(P)) {
          this.doLog(
            `calculateEaseMetricDB: Invalid values for move ${move}: P=${P}, Qi=${Qi}`,
          );

          continue;
        }

        const { easeMetric, component } = this.calculateNodeEaseMetric(
          P,
          Qmax,
          Qi,
        );

        if (isNaN(easeMetric)) {
          this.doLog(
            `calculateEaseMetricDB: NaN metric for move ${move}: component=${component}`,
          );

          continue;
        }

        this.doLog(
          `calculateEaseMetricDB: move=${move}, P=${P.toFixed(4)}, Qi=${Qi.toFixed(4)}, metric=${easeMetric.toFixed(4)}`,
        );

        metrics.push(easeMetric);
      }

      if (metrics.length === 0) {
        this.doLog("calculateEaseMetricDB: No valid metrics calculated");

        return 0;
      }

      const metricMinusSum = this.calculateSumOfMetrics(metrics);

      const result = 1 - metricMinusSum;

      return result;
    } catch (err: unknown) {
      return 0.5;
    }
  }
}
