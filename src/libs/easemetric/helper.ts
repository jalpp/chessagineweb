import { PositionEval } from "@/stockfish/engine/engine";
import { CandidateMove } from "../agine/helper";
import { MaiaEvaluation } from "../nets/types";


export function findMaxQ(engineEval: PositionEval): number {
   const maxQs = []; 
   for(let i = 0; i < engineEval.lines.length; i++){
      const cp = engineEval.lines[i].cp;
      maxQs.push(rawWinningChanceQ(cp || 0));
   }

    return Math.max(...maxQs);
}

const rawWinningChanceQ = (cp: number): number => {
  const MULTIPLIER = -0.00368208; // https://github.com/lichess-org/lila/pull/11148
  return 2 / (1 + Math.exp(MULTIPLIER * cp)) - 1;
};


export function calculateEaseMetric(netEvals: MaiaEvaluation, engineEval: PositionEval | null): number {
    if (!engineEval) {
        console.info("calculateEaseMetric: No engine evaluation provided");
        return 0;
    }

    const Qmax = findMaxQ(engineEval);
    console.info(`calculateEaseMetric: Qmax=${Qmax}, analyzing ${engineEval.lines.length} lines`);
    
    const metrics: number[] = [];

    for (let i = 0; i < engineEval.lines.length; i++) {
        const move = engineEval.lines[i].pv[0];
        const policyValue = netEvals.policy[move];
        
        const P = policyValue > 1 ? policyValue / 100 : policyValue;
        const Qi = rawWinningChanceQ(engineEval.lines[i].cp || 0);
        
        if (isNaN(Qi) || isNaN(P)) {
            console.info(`calculateEaseMetric: Invalid values for move ${move}: P=${P}, Qi=${Qi}`);
            continue;
        }

        const PiCal = Math.pow(P, 1.5);
        const Qdiff = Math.max(0, Qmax - Qi);
        const component = (PiCal * Qdiff) / 2;
        const emetrici = Math.pow(component, 1/3);
        
        if (isNaN(emetrici)) {
            console.info(`calculateEaseMetric: NaN metric for move ${move}: component=${component}`);
            continue;
        }

        console.info(`calculateEaseMetric: move=${move}, P=${P.toFixed(4)}, Qi=${Qi.toFixed(4)}, metric=${emetrici.toFixed(4)}`);
        metrics.push(emetrici);
    }

    if (metrics.length === 0) {
        console.info("calculateEaseMetric: No valid metrics calculated");
        return 0;
    }

    const metricMinusSum = metrics.reduce((acc, val) => acc + val, 0);

    const result = 1 - metricMinusSum;
    console.info(`calculateEaseMetric: Final result=${result.toFixed(4)}`);
    
    return result;
}
