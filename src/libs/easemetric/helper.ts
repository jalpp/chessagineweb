import { CandidateMove } from "../agine/helper";
import { MaiaEvaluation } from "../nets/types";

export function findMaxQ(candidateMoves: CandidateMove[]): number {
    return Math.max(...candidateMoves.map(move => Number(move.score)));
}

export function calculateEaseMetric(netEvals: MaiaEvaluation, candidateMoves: CandidateMove[]): number {
    // Handle edge cases
    if (!candidateMoves || candidateMoves.length === 0) {
        return 0;
    }

    const Qmax = findMaxQ(candidateMoves);
    const metrics: number[] = [];

    for (let i = 0; i < candidateMoves.length; i++) {
        const move = candidateMoves[i];
        
        // Get policy value (already in 0-100 range from your API)
        const policyValue = netEvals.policy[move.san];
        
        // Skip moves not in the policy (shouldn't happen, but defensive)
        if (policyValue === undefined || policyValue === null) {
            console.warn(`Move ${move.san} not found in policy, skipping`);
            continue;
        }

        // Convert to 0-1 range if needed
        const P = policyValue > 1 ? policyValue / 100 : policyValue;
        const Qi = Number(move.score);
        
        // Validate numbers
        if (isNaN(Qi) || isNaN(P)) {
            console.warn(`Invalid values for move ${move.san}: P=${P}, Qi=${Qi}`);
            continue;
        }

        // Calculate components
        const PiCal = Math.pow(P, 1.5); // β = 1.5
        const Qdiff = Math.max(0, Qmax - Qi); // Ensure non-negative
        
        // Calculate metric component with α = 1/3
        const component = (PiCal * Qdiff) / 2;
        const emetrici = Math.pow(component, 1/3);
        
        // Validate result
        if (isNaN(emetrici)) {
            console.warn(`NaN metric for move ${move.san}: component=${component}`);
            continue;
        }

        metrics.push(emetrici);
    }

    // Handle case where no valid metrics were calculated
    if (metrics.length === 0) {
        return 0;
    }

    // Calculate: first metric minus sum of rest
    const metricMinusSum = metrics.reduce((acc, val, idx) => 
        idx === 0 ? val : acc - val, 
        0
    );

    // Clamp result between 0 and 1
    const result = 1 - metricMinusSum;
    return result;
}