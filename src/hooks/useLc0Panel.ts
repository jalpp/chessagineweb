'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LineEval, PositionEval } from '@jalpp/stockfishts';
import { Chess } from 'chess.js';

import { useLc0Engine } from '@/hooks/useLc0Engine';
import { isLikelyMobileBrowser, LC0_LIGHT_ENGINE_OPTIONS, type Lc0Provider } from '@/libs/engine/lc0Worker';
import { getLc0Net, LC0_DEFAULT_NET_ID, LC0_MOBILE_DEFAULT_NET_ID } from '@/libs/engine/lc0Nets';
import { cachedStockfish } from '@/libs/cache/stockfishCache';
import { ANALYSIS_DELAY, MAX_PV_MOVES } from '@/libs/setting/helper';


export const LC0_DEPTH = { Default: 4, Min: 4, Max: 7 } as const;
export const LC0_LINES = { Default: 2, Min: 2, Max: 4 } as const;

const getLc0CacheKey = (fen: string, depth: number, lines: number, netId: string) =>
    `lc0:${netId}:${fen}|d=${depth}|pv=${lines}`;

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


export function useLc0Panel(fen: string, autoAnalysis: boolean, enabled: boolean) {
    const [depth, setDepth] = useState<number>(LC0_DEPTH.Default);
    const [lines, setLines] = useState<number>(LC0_LINES.Default);
    const isMobile = useState(() => isLikelyMobileBrowser())[0];
    const [netId, setNetId] = useState<string>(() => (isMobile ? LC0_MOBILE_DEFAULT_NET_ID : LC0_DEFAULT_NET_ID));
    const [lightMode, setLightMode] = useState<boolean>(isMobile);
    const [result, setResult] = useState<PositionEval | null>(null);
    const [loading, setLoading] = useState(false);
    const [nodesVisited, setNodesVisited] = useState(0);
    const [provider, setProvider] = useState<Lc0Provider | undefined>();
    const [gpuAdapterAvailable, setGpuAdapterAvailable] = useState<boolean | undefined>();

    const onProvider = useCallback((p: Lc0Provider, hasAdapter: boolean) => {
        setProvider(p);
        setGpuAdapterAvailable(hasAdapter);
    }, []);

    const netPath = getLc0Net(netId).path;
    const engineOptions = useMemo(
        () => ({ netPath, ...(lightMode ? LC0_LIGHT_ENGINE_OPTIONS : {}) }),
        [netPath, lightMode],
    );
    const { engine, error: engineError } = useLc0Engine(enabled, engineOptions, setNodesVisited, onProvider);
    const currentFenRef = useRef(fen);

    useEffect(() => {
        currentFenRef.current = fen;
    }, [fen]);

    const analyze = useCallback(async () => {
        if (!engine || !fen || !engine.isReady()) return;
        const currentFen = currentFenRef.current;
        const cacheKey = getLc0CacheKey(currentFen, depth, lines, netId);
        setLoading(true);
        setNodesVisited(0);
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
    }, [engine, fen, depth, lines, netId]);

    useEffect(() => {
        if (!enabled || !autoAnalysis || !engine || !fen) return;
        if (!engine.isReady()) return;
        setResult(null);
        const timeoutId = setTimeout(() => {
            if (currentFenRef.current === fen) analyze();
        }, ANALYSIS_DELAY);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fen, engine, depth, lines, netId, autoAnalysis, enabled]);

    return {
        engine, result, loading, depth, setDepth, lines, setLines, analyze,
        netId, setNetId,
        lightMode, setLightMode,
        nodesVisited, provider, gpuAdapterAvailable, engineError,
    };
}
