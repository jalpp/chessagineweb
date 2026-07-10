import { useEffect, useState } from 'react';

import {
    EngineName,
    parseEngineName,
    StockfishSimpleEngine,
    StockfishWasmEngine,
    type UciEngine,
} from '@jalpp/stockfishts';

const ENGINE_PATHS: Record<EngineName, string> = {
    [EngineName.Stockfish18]: '/static/engine/stockfish-18/stockfish-18-lite-single.js#/static/engine/stockfish-18/stockfish-18-lite-single.wasm',
    [EngineName.Stockfish17Point]: '/static/engine/stockfish-17/stockfish-17.1-lite-single-03e3232.js#/static/engine/stockfish-17/stockfish-17.1-lite-single-03e3232.wasm',
    [EngineName.Stockfish17]: '/static/engine/stockfish-17/stockfish-17-lite.js#/static/engine/stockfish-17/stockfish-17-lite.wasm',
    [EngineName.Stockfish16]: '/static/engine/stockfish-16.1-lite.js#/static/engine/stockfish-16.1-lite.wasm',
    [EngineName.Stockfish11]: '/static/engine/stockfish-11.js',
};

export const useEngine = (enabled: boolean, engineName: EngineName | undefined) => {
    const [engine, setEngine] = useState<UciEngine>();
    const normalizedEngine = parseEngineName(engineName);

    useEffect(() => {
        if (!enabled || !normalizedEngine) return;

        const engine = pickEngine(normalizedEngine);
        console.log('Initializing engine');

        void engine.init().then(() => {
            console.log('Engine initialized');
            setEngine(engine);
        });

        return () => {
            engine.shutdown();
            setEngine(undefined);
        };
    }, [enabled, normalizedEngine]);

    return engine;
};

const pickEngine = (engine: EngineName): UciEngine => {
    const path = ENGINE_PATHS[engine];

    if (engine === EngineName.Stockfish11) {
        return new StockfishSimpleEngine(path, engine);
    }

    return new StockfishWasmEngine(path, engine);
};
