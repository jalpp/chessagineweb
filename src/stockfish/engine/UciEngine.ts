
import { Mutex } from 'async-mutex';
import { EngineWorker } from './EngineWorker';
import {
    ENGINE_DEPTH,
    ENGINE_HASH,
    ENGINE_LINE_COUNT,
    ENGINE_THREADS,
    EngineName,
    EvaluatePositionWithUpdateParams,
    PositionEval,
} from './engine';
import { parseEvaluationResults } from './parseResults';



export abstract class UciEngine {
    protected worker: EngineWorker | undefined;
    private ready = false;
    private engineName: EngineName;
    private multiPv: number = ENGINE_LINE_COUNT.Default;
    private threads: number = ENGINE_THREADS.Default;
    private hash: number = Math.pow(2, ENGINE_HASH.Default);
    private _debug: boolean;
    private observers = new Set<(message: string) => void>();
    private stopMutex = new Mutex();
    private runMutex = new Mutex();

    /**
     * Gets an EngineWorker from the given stockfish.js path.
     * @param path The stockfish.js path to create an EngineWorker from.
     * @returns An EngineWorker using the given stockfish.js path.
     */
    public static workerFromPath(path: string): EngineWorker {
        const worker = new Worker(path);

        const engineWorker: EngineWorker = {
            uci(command) {
                worker.postMessage(command);
            },
            listen(data) {
                console.log(data);
            },
            onError(msg) {
                console.error(msg);
            },
            terminate() {
                worker.terminate();
            },
        };

        worker.onmessage = (event) => {
            engineWorker.listen(event.data as string);
        };
        worker.onerror = (err) => {
            engineWorker.onError(err);
        };

        return engineWorker;
    }

    /**
     * Constructs a new UciEngine instance.
     * @param engineName The name of the engine.
     * @param worker The engine worker.
     * @param debug Whether to print debug logs to the console. Defaults to true on non-prod and false on prod.
     */
    constructor(engineName: EngineName, worker?: EngineWorker, debug = false) {
        this.engineName = engineName;
        this.worker = worker;
        this._debug = debug;
        this.debug(`${engineName} created`);
    }

    /**
     * Initializes the engine. This must be called before evaluating any positions.
     */
    public async init(): Promise<void> {
        if (this.worker) {
            this.worker.listen = this.publishMessage;
            await this.sendCommands(['uci'], 'uciok');
            await this.sendCommands(
                ['setoption name UCI_ShowWDL value true', 'isready'],
                'readyok',
            );
            await this.setMultiPv(this.multiPv, true);
            await this.setThreads(this.threads, true);
            await this.setHash(this.hash, true);
            this.ready = true;
            this.debug(`${this.engineName} initialized`);
        }
    }

    /**
     * Adds an observer to be notified of UCI messages.
     * @param observer The observer to add.
     */
    private addObserver(observer: (message: string) => void) {
        this.observers.add(observer);
    }

    /**
     * Removes an observer from being notified of UCI messages.
     * @param observer The observer to remove.
     */
    private removeObserver(observer: (message: string) => void) {
        this.observers.delete(observer);
    }

    /**
     * Publishes the given message to this UciEngine's observers.
     * @param message The message to publish.
     */
    private publishMessage = (message: string) => {
        for (const observer of this.observers) {
            observer(message);
        }
    };

    /**
     * Sends the given UCI commands and resolves once the expected final message is returned.
     * @param commands The commands to send to the engine.
     * @param finalMessage The final message to wait for.
     * @param onNewMessage An optional function called with each new message from the engine.
     * @returns A Promise that resolves with all engine messages once finalMessage is detected.
     */
    protected async sendCommands(
        commands: string[],
        finalMessage: string,
        onNewMessage?: (messages: string[]) => void,
    ): Promise<string[]> {
        return new Promise((resolve) => {
            if (!this.worker) {
                return [];
            }

            const messages: string[] = [];

            const observer = (message: string) => {
                this.debug('UCI message: ', message);
                messages.push(message);
                onNewMessage?.(messages);

                if (message.startsWith(finalMessage)) {
                    this.removeObserver(observer);
                    resolve(messages);
                }
            };
            this.addObserver(observer);

            for (const command of commands) {
                this.debug('Posting message: ', command);
                this.worker.uci(command);
            }
        });
    }

    /**
     * Sets the multiPv (number of lines) option. See https://disservin.github.io/stockfish-docs/stockfish-wiki/Terminology.html#multiple-pvs.
     * @param multiPv The number of lines to set.
     * @param forceInit If true, the option is set even if multiPv is equal to this.multiPv. If false, an error is thrown if the engine is not ready.
     * @returns A Promise that resolves once the engine is ready.
     */
    private async setMultiPv(multiPv: number, forceInit = false) {
        if (!forceInit) {
            if (multiPv === this.multiPv) return;

            this.throwErrorIfNotReady();
        }

        if (multiPv > ENGINE_LINE_COUNT.Max) {
            throw new Error(`Invalid MultiPV value : ${multiPv}`);
        }
        if (multiPv < 1) {
            multiPv = 1;
        }

        await this.sendCommands([`setoption name MultiPV value ${multiPv}`, 'isready'], 'readyok');

        this.multiPv = multiPv;
    }

    /**
     * Sets the thread count for the engine.
     * @param threads The number of threads to use.
     * @param forceInit If true, the option is set even if threads is equal to this.threads.
     * @returns A Promise that resolves once the engine is ready.
     */
    private async setThreads(threads: number, forceInit = false) {
        if (!forceInit) {
            if (threads === this.threads) {
                return;
            }
            this.throwErrorIfNotReady();
        }

        if (threads < ENGINE_THREADS.Min || threads > ENGINE_THREADS.Max) {
           this.threads = ENGINE_THREADS.Min ;
        }
        await this.sendCommands([`setoption name Threads value ${threads}`, 'isready'], 'readyok');
        this.threads = threads;
    }

    /**
     * Sets the hash size in MB for the engine.
     * @param hash The hash size in MB.
     * @param forceInit If true, the option is set even if hash is equal to this.hash.
     * @returns A Promise that resolves once the engine is ready.
     */
    private async setHash(hash: number, forceInit = false) {
        if (!forceInit) {
            if (hash === this.hash) {
                return;
            }
            this.throwErrorIfNotReady();
        }

        if (hash < Math.pow(2, ENGINE_HASH.Min) || hash > Math.pow(2, ENGINE_HASH.Max)) {
            // throw new Error(
            //     `Invalid threads value (${hash}) is not in range [${Math.pow(2, ENGINE_HASH.Min)}, ${Math.pow(2, ENGINE_HASH.Max)}]`,
            // );
            this.hash = Math.pow(2, ENGINE_HASH.Min)
        }
        await this.sendCommands([`setoption name Hash value ${hash}`, 'isready'], 'readyok');
        this.hash = hash;
    }

    /**
     * Throws an error if the engine is not ready.
     */
    private throwErrorIfNotReady() {
        if (!this.ready) {
            throw new Error(`${this.engineName} is not ready`);
        }
    }

    /**
     * Shuts down the engine and terminates the worker running it.
     */
    public shutdown(): void {
        this.ready = false;
        this.publishMessage('bestmove');
        this.worker?.uci('quit');
        this.worker?.terminate?.();
        this.debug(`${this.engineName} shutdown`);
    }

    /**
     * @returns True if the engine is ready.
     */
    public isReady(): boolean {
        return this.ready;
    }

    /**
     * Stops calculating as soon as possible.
     * @returns A Promise that resolves once the engine has stopped.
     */
    public async stopSearch(): Promise<string[]> {
        return this.sendCommands(['stop', 'isready'], 'readyok');
    }

    /**
     * Evaluates the given position, updating the eval as the engine runs.
     * @param fen The FEN to evaluate.
     * @param depth The depth to use when evaluating.
     * @param multiPv The number of lines to analyze.
     * @param setPartialEval The callback function that is sent eval updates.
     * @returns The engine's final PositionEval.
     */
    public async evaluatePositionWithUpdate({
        fen,
        depth = ENGINE_DEPTH.Default,
        multiPv = this.multiPv,
        threads = ENGINE_THREADS.Default,
        hash = Math.pow(2, ENGINE_HASH.Default),
        setPartialEval,
    }: EvaluatePositionWithUpdateParams): Promise<PositionEval> {
        this.throwErrorIfNotReady();

        this.stopMutex.cancel();
        await this.stopMutex.acquire();

        // Only 1 thread can stop current position and start running SF on new position now
        await this.stopSearch();

        return this.runMutex.runExclusive(async () => {
            await this.setMultiPv(multiPv);
            await this.setThreads(threads);
            await this.setHash(hash);

            const whiteToPlay = fen.split(' ')[1] === 'w';

            const onNewMessage = (messages: string[]) => {
                const parsedResults = parseEvaluationResults(fen, messages, whiteToPlay);
                console.debug('Setting partial results: ', parsedResults);
                setPartialEval?.(parsedResults);
            };

            this.debug(`Started evaluating ${fen}`);
            const promise = this.sendCommands(
                [`position fen ${fen}`, `go depth ${depth}`],
                'bestmove',
                onNewMessage,
            );
            this.stopMutex.release(); // Other threads can now stop running this position

            const results = await promise;
            this.debug(`Stopped evaluating ${fen}`);
            return parseEvaluationResults(fen, results, whiteToPlay);
        });
    }

    /**
     * Passes the given message and params to console.debug if this._debug is true.
     * @param message The message to pass to console.debug.
     * @param optionalParams The optionalParams to pass to console.debug.
     */
    private debug(message?: unknown, ...optionalParams: unknown[]) {
        if (this._debug) {
            console.debug(message, optionalParams);
        }
    }
}
