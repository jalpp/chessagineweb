import { EngineName } from './engine';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 17.1
 */
export class Stockfish17Point extends UciEngine {
    constructor() {
        if (!Stockfish17Point.isSupported()) {
            throw new Error('Stockfish 17.1 is not supported');
        }

        const enginePath =
            '/static/engine/stockfish-17/stockfish-17.1-lite-single-03e3232.js#/static/engine/stockfish-17/stockfish-17.1-lite-single-03e3232.wasm';
        const worker = UciEngine.workerFromPath(enginePath);
        super(EngineName.Stockfish17Point, worker);
    }

  
    public static isSupported() {
        return (
            typeof WebAssembly === 'object' &&
            WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
        );
    }
}

