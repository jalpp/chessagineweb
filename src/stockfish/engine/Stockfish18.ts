import { EngineName } from './engine';
import { UciEngine } from './UciEngine';

/**
 * Stockfish 18
 */
export class Stockfish18 extends UciEngine {
    constructor() {
        if (!Stockfish18.isSupported()) {
            throw new Error('Stockfish 17.1 is not supported');
        }

        const enginePath =
            '/static/engine/stockfish-18/stockfish-18-lite-single.js#/static/engine/stockfish-18/stockfish-18-lite-single.wasm';
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

