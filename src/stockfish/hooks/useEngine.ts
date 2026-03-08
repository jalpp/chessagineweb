import { useEffect, useState } from 'react';
import { EngineName } from '../engine/engine';
import { Stockfish11 } from '../engine/Stockfish11';
import { Stockfish16 } from '../engine/Stockfish16';
import { Stockfish17 } from '../engine/Stockfish17';
import { UciEngine } from '../engine/UciEngine';
import { Stockfish17Point } from '../engine/Stockfish17Point';
import { Stockfish18 } from '../engine/Stockfish18';

export const useEngine = (enabled: boolean, engineName: EngineName | undefined) => {
    const [engine, setEngine] = useState<UciEngine>();

    useEffect(() => {
        if (!enabled || !engineName) return;

        const engine = pickEngine(engineName);
        console.log('Initializing engine');
        void engine.init().then(() => {
            console.log('Engine initialized');
            setEngine(engine);
        });

        return () => {
            engine.shutdown();
            setEngine(undefined);
        };
    }, [engineName]);

    return engine;
};

const pickEngine = (engine: EngineName): UciEngine => {
    switch (engine) {
        case EngineName.Stockfish18:
            return new Stockfish18();
        case EngineName.Stockfish17Point:
            return new Stockfish17Point();
        case EngineName.Stockfish17:
            return new Stockfish17();
        case EngineName.Stockfish16:
            return new Stockfish16();
        case EngineName.Stockfish11:
            return new Stockfish11();
    }
};
