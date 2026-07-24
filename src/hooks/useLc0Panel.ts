'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { LineEval, PositionEval } from '@jalpp/stockfishts';
import { Chess } from 'chess.js';

import { useLc0Engine } from '@/hooks/useLc0Engine';
import { cachedStockfish } from '@/libs/cache/stockfishCache';
import { ANALYSIS_DELAY, MAX_PV_MOVES } from '@/libs/setting/helper';

// lc0 is an MCTS engine: "depth" here means deepest extended PV, which is far
// slower to reach than in an alpha-beta engine like Stockfish at the same
// numeric depth (see evaluatePositionWithUpdate's `go depth N`), so the
// bounds are intentionally much lower than Stockfish's.
export const LC0_DEPTH = { Default: 8, Min: 4, Max: 12 } as const;
export const LC0_LINES = { Default: 2, Min: 1, Max: 4 } as const;

const getLc0CacheKey = (fen: string, depth: number, lines: number) =>
    `lc0:${fen}|d=${depth}|pv=${lines}`;

export function formatEvaluation(line: LineEval): string {
    if (line.mate !== undefined) return `M${line.mate}`;
    if (line.cp !== undefined) {
        const eval1 = line.cp / 100;
        return eval1 > 0 ? `+${eval1.toFixed(2)}` : eval1.toFixed(2);
    }
    return '0.00';
}

export function formatPrincipalVariation(pv: string[], startFen: string): string {
    const tempGame = new Chess(startFen);
    const moves: string[] = [];
    for (const uciMove of pv.slice(0, MAX_PV_MOVES)) {
        try {
            const move = tempGame.move({
                from: uciMove.slice(0, 2),
                to: uciMove.slice(2, 4),
                promotion: uciMove.length > 4 ? (uciMove[4] as string) : undefined,
            });
            if (move) moves.push(move.san);
            else break;
        } catch {
            break;
        }
    }
    return moves.join(' ');
}

/**
 * Drives lc0 analysis for a position, mirroring the Stockfish slice of
 * useAgine.ts (same PositionEval/LineEval shape, same auto-analysis-on-FEN-
 * change behavior) but self-contained -- lc0 doesn't need chessdb/opening/LLM
 * orchestration, so this doesn't route through useAgine.
 */
export function useLc0Panel(fen: string, autoAnalysis: boolean, enabled: boolean) {
    const [depth, setDepth] = useState<number>(LC0_DEPTH.Default);
    const [lines, setLines] = useState<number>(LC0_LINES.Default);
    const [result, setResult] = useState<PositionEval | null>(null);
    const [loading, setLoading] = useState(false);

    const engine = useLc0Engine(enabled);
    const currentFenRef = useRef(fen);

    useEffect(() => {
        currentFenRef.current = fen;
    }, [fen]);

    const analyze = useCallback(async () => {
        if (!engine || !fen || !engine.isReady()) return;
        const currentFen = currentFenRef.current;
        const cacheKey = getLc0CacheKey(currentFen, depth, lines);
        setLoading(true);
        try {
            const positionEval = await cachedStockfish(cacheKey, () =>
                engine.evaluatePositionWithUpdate({
                    fen: currentFen,
                    depth,
                    multiPv: lines,
                    setPartialEval: partialEval => {
                        if (currentFenRef.current === currentFen) setResult(partialEval);
                    },
                }),
            );
            if (currentFenRef.current === currentFen) {
                setResult(positionEval);
                setLoading(false);
            }
        } catch (err) {
            console.error('lc0 analysis failed:', err);
            if (currentFenRef.current === currentFen) {
                setResult(null);
                setLoading(false);
            }
        }
    }, [engine, fen, depth, lines]);

    useEffect(() => {
        if (!enabled || !autoAnalysis || !engine || !fen) return;
        if (!engine.isReady()) return;
        setResult(null);
        const timeoutId = setTimeout(() => {
            if (currentFenRef.current === fen) analyze();
        }, ANALYSIS_DELAY);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fen, engine, depth, lines, autoAnalysis, enabled]);

    return { engine, result, loading, depth, setDepth, lines, setLines, analyze };
}
