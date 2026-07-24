'use client';

import { useEffect, useState } from 'react';

import { CustomUciEngine, type UciEngine } from '@jalpp/stockfishts';

import { Lc0EngineWorker, type Lc0EngineWorkerOptions } from '@/libs/engine/lc0Worker';

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
export const useLc0Engine = (enabled: boolean, options?: Lc0EngineWorkerOptions) => {
    const [engine, setEngine] = useState<UciEngine>();

    useEffect(() => {
        if (!enabled) return;

        const worker = new Lc0EngineWorker(options);
        const lc0Engine = new CustomUciEngine(worker, 'lc0', { checkWasmSupport: true });

        void lc0Engine.init().then(() => {
            setEngine(lc0Engine);
        });

        return () => {
            lc0Engine.shutdown();
            setEngine(undefined);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return engine;
};
