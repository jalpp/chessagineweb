export class EaseMetricStrategy {

    private debugLog: boolean;
    private calculatorName: string;

    constructor(log: boolean, name: string){
        this.debugLog = log;
        this.calculatorName = name;
    }

    protected calculateRawWinningChanceQ(cp: number) {
      const MULTIPLIER = -0.00368208; // https://github.com/lichess-org/lila/pull/11148
      return 2 / (1 + Math.exp(MULTIPLIER * cp)) - 1;
    };

    protected calculateSumOfMetrics (metrics: number[]) {
        return metrics.reduce((acc, val) => acc + val, 0);
    }

    protected calculateNodeEaseMetric(P: number, Qmax: number, Qi: number) {
        const PiCal = Math.pow(P, 1.5);
        const Qdiff = Math.max(0, Qmax - Qi);
        const component = (PiCal * Qdiff) / 2;
        const easeMetric = Math.pow(component, 1/3);

        return {
            easeMetric, component
        }
    }

    protected doLog(content: string){
       if(this.debugLog){
         console.log(`${this.calculatorName}: ${content}`);
       }
    }

}