import { PositionEval } from "@/stockfish/engine/engine";
import { MaiaEvaluation } from "../nets/types";
import { StockfishEaseMetricCalculator } from "./stockfishEaseMetric";

export class StockfishVEaseMetricCalculator {

    private stockfishCalculator: StockfishEaseMetricCalculator;

    constructor(log: boolean){
        this.stockfishCalculator = new StockfishEaseMetricCalculator(log);
    }

    public calculatePvEaseMetric(RnetEval: MaiaEvaluation, REngineEval: PositionEval | null, ViNetEval: MaiaEvaluation, ViEngineEval: PositionEval | undefined): number {
        if(!REngineEval){
            console.log('Root Engine lines not present, exist 0');
            return 0.5;
        }
        const REase = this.stockfishCalculator.calculateEaseMetric(RnetEval, REngineEval);
        const ViEase = this.stockfishCalculator.calculateEaseMetric(ViNetEval, ViEngineEval!);

        console.log('R ease is start:', REase);
        console.log('Vi ease is end:', ViEase);
        const diff = ViEase - REase;
        console.log('diff: ', diff);

        return diff;
    }



}