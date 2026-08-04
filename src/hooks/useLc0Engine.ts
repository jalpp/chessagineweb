'use client';

import { useEffect, useState } from 'react';

import { CustomUciEngine, type UciEngine } from '@jalpp/stockfishts';

import { Lc0EngineWorker, type Lc0EngineWorkerOptions, type Lc0Provider } from '@/libs/engine/lc0Worker';

const CROSS_ORIGIN_ISOLATION_ERROR =
    "A error has occured with lc0.js. " +
    "A page reload usually fixes this, if it " +
    "open the page in a real, separate browser " +
    "tab instead.";


const RELOAD_ATTEMPTED_KEY = 'lc0_coi_reload_attempted';

function tryRecoverCrossOriginIsolation(): 'reloading' | 'already-tried' {
    if (typeof window === 'undefined') return 'already-tried';
    const path = window.location.pathname;
    let alreadyTried = false;
    try {
        alreadyTried = window.sessionStorage.getItem(RELOAD_ATTEMPTED_KEY) === path;
    } catch {
        return 'already-tried';
    }
    if (alreadyTried) return 'already-tried';
    try {
        window.sessionStorage.setItem(RELOAD_ATTEMPTED_KEY, path);
    } catch {
        return 'already-tried';
    }
    window.location.reload();
    return 'reloading';
}

/**
 * Runs lc0 (via the static wasm bridge worker under public/static/engine/lc0/)
 * through the same {@link UciEngine} API used for the Stockfish engines --
 * see src/hooks/useEngine.ts. This lets lc0 reuse the existing analysis UI
 * (StockfishTab-style rendering, evaluatePositionWithUpdate, etc.) instead of
 * needing its own bespoke protocol handling in every consumer.
 *
 * Requires the page to be cross-origin isolated (COOP/COEP -- see
 * next.config.ts) since lc0.wasm uses SharedArrayBuffer for its pthread pool.
 */
export const useLc0Engine = (
    enabled: boolean,
    options?: Lc0EngineWorkerOptions,
    onNodes?: (nodes: number) => void,
    onProvider?: (provider: Lc0Provider, gpuAdapterAvailable: boolean) => void,
) => {
    const [engine, setEngine] = useState<UciEngine>();
    const [error, setError] = useState<string>();

    // Re-init whenever any option that affects how the worker is
    // constructed changes -- not just netPath. Previously this only
    // watched netPath, so flipping executionProviders/ortNumThreads (e.g.
    // toggling light mode) silently had no effect until the net also
    // happened to change.
    const optionsKey = JSON.stringify({
        netPath: options?.netPath,
        lc0WasmPath: options?.lc0WasmPath,
        ortWasmPaths: options?.ortWasmPaths,
        executionProviders: options?.executionProviders,
        ortNumThreads: options?.ortNumThreads,
    });

    useEffect(() => {
        if (!enabled) return;

        setError(undefined);

        if (typeof window !== 'undefined' && window.crossOriginIsolated === false) {
            if (tryRecoverCrossOriginIsolation() === 'reloading') return;
            setError(CROSS_ORIGIN_ISOLATION_ERROR);
            return;
        }

        // Isolation is fine (or this reload attempt fixed it) -- clear the
        // guard so a future genuine loss of isolation gets one fresh retry.
        if (typeof window !== 'undefined') {
            try {
                window.sessionStorage.removeItem(RELOAD_ATTEMPTED_KEY);
            } catch {
                // ignore -- see tryRecoverCrossOriginIsolation
            }
        }

        let cancelled = false;
        const worker = new Lc0EngineWorker(options);
        if (onNodes) worker.onNodes = onNodes;
        if (onProvider) worker.onProvider = onProvider;
        const lc0Engine = new CustomUciEngine(worker, 'lc0', { checkWasmSupport: true });

        lc0Engine
            .init()
            .then(() => {
                if (!cancelled) setEngine(lc0Engine);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                }
            });

        return () => {
            cancelled = true;
            lc0Engine.shutdown();
            setEngine(undefined);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, optionsKey]);

    return { engine, error };
};
