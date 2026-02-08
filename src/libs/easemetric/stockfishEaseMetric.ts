import { MaiaEvaluation } from "../nets/types";
import { EaseMetricStrategy } from "./easeMetricStrategy";
import { PositionEval } from "@/stockfish/engine/engine";

export class StockfishEaseMetricCalculator extends EaseMetricStrategy {
  constructor(log: boolean) {
    super(log, "calculateEaseMetricFish");
  }

  public findMaxQ(engineEval: PositionEval): number {
    const maxQs = [];
    for (let i = 0; i < engineEval.lines.length; i++) {
      const cp = engineEval.lines[i].cp;
      maxQs.push(this.calculateRawWinningChanceQ(cp || 0));
    }

    return Math.max(...maxQs);
  }

  public calculateEaseMetric(
    netEvals: MaiaEvaluation,
    engineEval: PositionEval | null,
  ): number {
    if (!engineEval) {
      this.doLog("ChessDB candidate move for this move not found!");
      return 0.5;
    }

    try {
      const Qmax = this.findMaxQ(engineEval);
      console.info(`Qmax=${Qmax}, analyzing ${engineEval.lines.length} lines`);

      const metrics: number[] = [];

      for (let i = 0; i < engineEval.lines.length; i++) {
        const move = engineEval.lines[i].pv[0];
        const policyValue = netEvals.policy[move];

        const P = policyValue > 1 ? policyValue / 100 : policyValue;
        const Qi = this.calculateRawWinningChanceQ(engineEval.lines[i].cp || 0);

        if (isNaN(Qi) || isNaN(P)) {
          this.doLog(`Invalid values for move ${move}: P=${P}, Qi=${Qi}`);
          continue;
        }

        const { easeMetric, component } = this.calculateNodeEaseMetric(
          P,
          Qmax,
          Qi,
        );

        if (isNaN(easeMetric)) {
          this.doLog(`NaN metric for move ${move}: component=${component}`);
          continue;
        }
        this.doLog(
          `move=${move}, P=${P.toFixed(4)}, Qi=${Qi.toFixed(4)}, metric=${easeMetric.toFixed(4)}`,
        );
        metrics.push(easeMetric);
      }

      if (metrics.length === 0) {
        this.doLog("calculateEaseMetric: No valid metrics calculated");
        return 0;
      }

      const metricMinusSum = this.calculateSumOfMetrics(metrics);

      const result = 1 - metricMinusSum;

      return result;
    } catch (err) {
      console.log(err);
      return 0.5;
    }
  }
}
