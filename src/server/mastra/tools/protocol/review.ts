import { Chess } from "chess.js";
import { analyzeVariationThemes, findCriticalMoments, VariationAnalysis, ThemeChange } from "./ovp";

interface GameReview {
    gameInfo: {
        white: string;
        black: string;
        result: string;
    };
    whiteAnalysis: {
        overallThemes: VariationAnalysis;
        criticalMoments: Array<{moveIndex: number, move: string, themeChanges: ThemeChange[]}>;
        averageThemeScores: {
            material: number;
            mobility: number;
            space: number;
            positional: number;
            kingSafety: number;
            tactical: number;
        };
    };
    blackAnalysis: {
        overallThemes: VariationAnalysis;
        criticalMoments: Array<{moveIndex: number, move: string, themeChanges: ThemeChange[]}>;
        averageThemeScores: {
            material: number;
            mobility: number;
            space: number;
            positional: number;
            kingSafety: number;
            tactical: number;
        };
    };
    insights: {
        whiteBestTheme: string;
        whiteWorstTheme: string;
        blackBestTheme: string;
        blackWorstTheme: string;
        turningPoints: Array<{
            moveNumber: number;
            player: string;
            move: string;
            impact: string;
        }>;
    };
}

export function generateGameReview(pgn: string, criticalMomentThreshold: number = 0.5): GameReview {
    const chess = new Chess();
    
    // Load and parse PGN
    chess.loadPgn(pgn);
    
    // Extract game headers
    const headers = chess.header();
    const gameInfo = {
        white: headers.White || "Unknown",
        black: headers.Black || "Unknown",
        result: headers.Result || "*",
        event: headers.Event,
        date: headers.Date
    };
    
    // Get move history
    const history = chess.history();
    
    // Reset to starting position
    chess.reset();
    const startingFen = chess.fen();
    
    // Analyze for both colors
    const whiteAnalysis = analyzeVariationThemes(startingFen, history, "w");
    const blackAnalysis = analyzeVariationThemes(startingFen, history, "b");
    
    // Find critical moments
    const whiteCriticalMoments = findCriticalMoments(startingFen, history, "w", criticalMomentThreshold);
    const blackCriticalMoments = findCriticalMoments(startingFen, history, "b", criticalMomentThreshold);
    
    // Calculate average theme scores throughout the game
    const whiteAvgScores = calculateAverageScores(whiteAnalysis.moveByMoveScores);
    const blackAvgScores = calculateAverageScores(blackAnalysis.moveByMoveScores);
    
    // Generate insights
    const insights = generateInsights(
        whiteAnalysis,
        blackAnalysis,
        whiteCriticalMoments,
        blackCriticalMoments,
    );
    
    return {
        gameInfo,
        whiteAnalysis: {
            overallThemes: whiteAnalysis,
            criticalMoments: whiteCriticalMoments,
            averageThemeScores: whiteAvgScores
        },
        blackAnalysis: {
            overallThemes: blackAnalysis,
            criticalMoments: blackCriticalMoments,
            averageThemeScores: blackAvgScores
        },
        insights
    };
}

function calculateAverageScores(scores: Array<{
    material: number;
    mobility: number;
    space: number;
    positional: number;
    kingSafety: number;
    tactical: number;
}>) {
    const sum = scores.reduce((acc, score) => ({
        material: acc.material + score.material,
        mobility: acc.mobility + score.mobility,
        space: acc.space + score.space,
        positional: acc.positional + score.positional,
        kingSafety: acc.kingSafety + score.kingSafety,
        tactical: acc.tactical + score.tactical
    }), { material: 0, mobility: 0, space: 0, positional: 0, kingSafety: 0, tactical: 0 });
    
    const count = scores.length;
    return {
        material: sum.material / count,
        mobility: sum.mobility / count,
        space: sum.space / count,
        positional: sum.positional / count,
        kingSafety: sum.kingSafety / count,
        tactical: sum.tactical / count
    };
}

function generateInsights(
    whiteAnalysis: ReturnType<typeof analyzeVariationThemes>,
    blackAnalysis: ReturnType<typeof analyzeVariationThemes>,
    whiteCriticalMoments: ReturnType<typeof findCriticalMoments>,
    blackCriticalMoments: ReturnType<typeof findCriticalMoments>,

) {
    // Find best and worst themes for each player
    const whiteBest = whiteAnalysis.strongestImprovement?.theme || "none";
    const whiteWorst = whiteAnalysis.biggestDecline?.theme || "none";
    const blackBest = blackAnalysis.strongestImprovement?.theme || "none";
    const blackWorst = blackAnalysis.biggestDecline?.theme || "none";
    
    // Identify turning points (critical moments with largest absolute changes)
    const turningPoints: Array<{
        moveNumber: number;
        player: string;
        move: string;
        impact: string;
    }> = [];
    
    // Combine and sort all critical moments
    const allCritical = [
        ...whiteCriticalMoments.map(cm => ({ ...cm, player: "White" })),
        ...blackCriticalMoments.map(cm => ({ ...cm, player: "Black" }))
    ].sort((a, b) => {
        const aMax = Math.max(...a.themeChanges.map(tc => Math.abs(tc.change)));
        const bMax = Math.max(...b.themeChanges.map(tc => Math.abs(tc.change)));
        return bMax - aMax;
    });
    
    // Take top 5 turning points
    allCritical.slice(0, 10).forEach(cm => {
        const maxChange = cm.themeChanges.reduce((max, tc) => 
            Math.abs(tc.change) > Math.abs(max.change) ? tc : max
        );
        
        turningPoints.push({
            moveNumber: Math.floor(cm.moveIndex / 2) + 1,
            player: cm.player,
            move: cm.move,
            impact: `${maxChange.theme}: ${maxChange.change > 0 ? '+' : ''}${maxChange.change.toFixed(2)}`
        });
    });
    
    return {
        whiteBestTheme: whiteBest,
        whiteWorstTheme: whiteWorst,
        blackBestTheme: blackBest,
        blackWorstTheme: blackWorst,
        turningPoints
    };
}