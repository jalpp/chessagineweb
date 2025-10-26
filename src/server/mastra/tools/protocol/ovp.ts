import { Chess, Color } from "chess.js";
import { PositionScorer } from "./positionScorer";
import { STATE_THEMES } from "../types";

export interface ThemeScore {
    material: number;
    mobility: number;
    space: number;
    positional: number;
    kingSafety: number;
    tactical: number;
    darksqaureControl: number;
    lightsqaureControl: number;
}

export interface ThemeChange {
    theme: string;
    initialScore: number;
    finalScore: number;
    change: number;
    percentChange: number;
}

export interface VariationAnalysis {
    themeChanges: ThemeChange[];
    overallChange: number;
    strongestImprovement: ThemeChange | null;
    biggestDecline: ThemeChange | null;
    moveByMoveScores: ThemeScore[];
}

function collectFenList(rootFen: string, moves: string[]): string[] {
    const collectedFen: string[] = [];

    if(moves.length == 0){
        return [];
    }

    const chess = new Chess(rootFen);

    for(let i = 0; i < moves.length; i++){
        chess.move(moves[i]);
        collectedFen[i] = chess.fen();
    }

    return collectedFen;

}

export function getThemeScores(fen: string, color: Color): ThemeScore {
    const scorer = new PositionScorer(fen, color);
    return {
        material: scorer.getThemeScore(STATE_THEMES.MATERIAL),
        mobility: scorer.getThemeScore(STATE_THEMES.MOBILITY),
        space: scorer.getThemeScore(STATE_THEMES.SPACE),
        positional: scorer.getThemeScore(STATE_THEMES.POSITIONAL),
        kingSafety: scorer.getThemeScore(STATE_THEMES.KING_SAFETY),
        tactical: scorer.getThemeScore(STATE_THEMES.TACTICAL),
        darksqaureControl: scorer.getThemeScore(STATE_THEMES.SQAURE_CONTROL_DARK),
        lightsqaureControl: scorer.getThemeScore(STATE_THEMES.SQAURE_CONTROL_LIGHT)
        
    };
}

export function analyzeVariationThemes(rootFen: string, moves: string[], color: Color): VariationAnalysis {
    if (moves.length === 0) {
        const rootScores = getThemeScores(rootFen, color);
        return {
            themeChanges: [],
            overallChange: 0,
            strongestImprovement: null,
            biggestDecline: null,
            moveByMoveScores: [rootScores]
        };
    }

    const fens = [rootFen, ...collectFenList(rootFen, moves)];
    const moveByMoveScores: ThemeScore[] = fens.map(fen => getThemeScores(fen, color));
    
    const initialScores = moveByMoveScores[0];
    const finalScores = moveByMoveScores[moveByMoveScores.length - 1];
    
    const themeNames: (keyof ThemeScore)[] = ['material', 'mobility', 'space', 'positional', 'kingSafety', 'tactical', 'darksqaureControl', 'lightsqaureControl'];
    const themeChanges: ThemeChange[] = themeNames.map(theme => {
        const initial = initialScores[theme];
        const final = finalScores[theme];
        const change = final - initial;
        const percentChange = initial !== 0 ? (change / Math.abs(initial)) * 100 : 0;
        
        return {
            theme,
            initialScore: initial,
            finalScore: final,
            change,
            percentChange
        };
    });
    
    const overallChange = themeChanges.reduce((sum, change) => sum + change.change, 0);
    
    const strongestImprovement = themeChanges
        .filter(change => change.change > 0)
        .sort((a, b) => b.change - a.change)[0] || null;
    
    const biggestDecline = themeChanges
        .filter(change => change.change < 0)
        .sort((a, b) => a.change - b.change)[0] || null;
    
    return {
        themeChanges,
        overallChange,
        strongestImprovement,
        biggestDecline,
        moveByMoveScores
    };
}

export function getThemeProgression(rootFen: string, moves: string[], color: Color, theme: keyof ThemeScore): number[] {
    if (moves.length === 0) {
        return [getThemeScores(rootFen, color)[theme]];
    }
    
    const fens = [rootFen, ...collectFenList(rootFen, moves)];
    return fens.map(fen => getThemeScores(fen, color)[theme]);
}

export function compareVariations(rootFen: string, variations: Array<{name: string, moves: string[]}>, color: Color): Array<{name: string, analysis: VariationAnalysis}> {
    return variations.map(variation => ({
        name: variation.name,
        analysis: analyzeVariationThemes(rootFen, variation.moves, color)
    }));
}


export function findCriticalMoments(rootFen: string, moves: string[], color: Color, threshold: number = 0.5): Array<{moveIndex: number, move: string, themeChanges: ThemeChange[]}> {
    if (moves.length === 0) return [];
    
    const criticalMoments: Array<{moveIndex: number, move: string, themeChanges: ThemeChange[]}> = [];
    const fens = [rootFen, ...collectFenList(rootFen, moves)];
    
    for (let i = 1; i < fens.length; i++) {
        const previousScores = getThemeScores(fens[i - 1], color);
        const currentScores = getThemeScores(fens[i], color);
        
        const themeNames: (keyof ThemeScore)[] = ['material', 'mobility', 'space', 'positional', 'kingSafety', 'tactical', 'tactical', 'darksqaureControl', 'lightsqaureControl'];
        const moveThemeChanges: ThemeChange[] = themeNames.map(theme => {
            const initial = previousScores[theme];
            const final = currentScores[theme];
            const change = final - initial;
            const percentChange = initial !== 0 ? (change / Math.abs(initial)) * 100 : 0;
            
            return {
                theme,
                initialScore: initial,
                finalScore: final,
                change,
                percentChange
            };
        });
        
        const significantChanges = moveThemeChanges.filter(change => Math.abs(change.change) >= threshold);
        
        if (significantChanges.length > 0) {
            criticalMoments.push({
                moveIndex: i - 1,
                move: moves[i - 1],
                themeChanges: significantChanges
            });
        }
    }
    
    return criticalMoments;
}
