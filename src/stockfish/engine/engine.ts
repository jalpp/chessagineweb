/** The name of an available engine. */
export enum EngineName {
    Stockfish17 = 'stockfish_17',
    Stockfish17Point = 'stockfish_17_point',
    Stockfish16 = 'stockfish_16',
    Stockfish11 = 'stockfish_11',
}

export interface EngineInfo {
    /** The internal name of the engine. */
    name: EngineName;

    /** The full user-facing name of the engine. */
    fullName: string;

    /** The short user-facing name of the engine. */
    shortName: string;

    /** The extra short user-facing name of the engine. */
    extraShortName: string;

    /**
     * The user-facing description of the engine, displayed when
     * selecting between engines.
     */
    description: string;

    /** The technology used by the engine. */
    tech: string;

    /** The description of the technology used by the engine. */
    techDescription: string;

    /** A user-facing description of where the engine runs. */
    location: string;
}

/** The list of engines available for use. */
export const engines: EngineInfo[] = [
    {
        name: EngineName.Stockfish17,
        fullName: 'Stockfish 17 NNUE • 79 MB',
        shortName: 'SF 17 • 79 MB',
        extraShortName: 'SF 17',
        description: 'Best for desktop',
        tech: 'NNUE',
        techDescription: `Evaluation is performed by Stockfish's neural network.`,
        location: 'in local browser',
    },
    {
        name: EngineName.Stockfish16,
        fullName: 'Stockfish 16.1 NNUE • 6 MB',
        shortName: 'SF 16 • 6 MB',
        extraShortName: 'SF 16',
        description: 'Best for mobile and weaker desktops',
        tech: 'NNUE',
        techDescription: `Evaluation is performed by Stockfish's neural network.`,
        location: 'in local browser',
    },
    {
        name: EngineName.Stockfish11,
        fullName: 'Stockfish 11 HCE',
        shortName: 'SF 11',
        extraShortName: 'SF 11',
        description: 'Faster than NNUE but less accurate',
        tech: 'HCE',
        techDescription: `Evaluation is performed using various heuristics and rules. Faster, but much less accurate than NNUE.`,
        location: 'in local browser',
    },
];

/** Settings for the engine name. */
export const ENGINE_NAME = {
    /** Local storage key for the engine name. */
    Key: 'engine-name',
    /** The default engine name. */
    Default: EngineName.Stockfish17,
} as const;

/** Settings for the number of lines calculated/displayed by the engine. */
export const ENGINE_LINE_COUNT = {
    /** Local storage key for the number of lines. */
    Key: 'engine-multi-pv',
    /** The default number of lines. */
    Default: 3,
    /** The minimum number of lines. */
    Min: 0,
    /** The maximum number of lines. */
    Max: 5,
} as const;

/** Settings for the depth of the engine. */
export const ENGINE_DEPTH = {
    /** Local storage key for the depth. */
    Key: 'engine-depth',
    /** The default depth. */
    Default: 30,
    /** The minimum depth. */
    Min: 25,
    /** The maximum depth. */
    Max: 99,
} as const;

/** Settings for the number of threads used by the engine. */
export const ENGINE_THREADS = {
    /** Local storage key for the threads. */
    Key: 'engine-threads',
    /**
     * The default number of threads. Set to 0 here and then dynamically updated to
     * navigator.hardwareConcurrency on the client side. This avoids NextJS render
     * errors.
     */
    Default: 0,
    /** The minium number of threads. */
    Min: 2,
    /** The maximum number of threads.Set to 0 here and then dynamically updated to
     * navigator.hardwareConcurrency on the client side. This avoids NextJS render
     * errors. */
    Max: 0,
};

/** Settings for the hash memory of the engine. */
export const ENGINE_HASH = {
    /** Local storage key for the hash memory. */
    Key: 'engine-hash',
    /**
     * The default hash size as a power of 2, in MB.
     * Ex: a value of 4 means 2^4 = 16 MB. */
    Default: 4,
    /** The minimum hash size as a power of 2, in MB. */
    Min: 4,
    /** The maximum hash size as a power of 2, in MB. */
    Max: 9,
} as const;

/** The primary evaluation types for an engine. */
export enum PrimaryEvalType {
    /** The numeric eval of the position. */
    Eval = 'eval',
    /** The engine's expected win/draw/loss percentages. */
    WinDrawLoss = 'wdl',
}

/** Settings for the primary evaluation type of the engine. */
export const ENGINE_PRIMARY_EVAL_TYPE = {
    /** Local storage key for the primary evaluation type. */
    Key: 'engine-primary-eval-type',
    /** The default evaluation type. */
    Default: 'eval',
    /** The options for the primary evaluation type. */
    Options: [
        { value: PrimaryEvalType.Eval, label: 'Evaluation' },
        { value: PrimaryEvalType.WinDrawLoss, label: 'Win / Draw / Loss' },
    ],
} as const;

/** Settings for adding info on clicking the eval box. */
export const ENGINE_ADD_INFO_ON_EVAL_CLICK = {
    /** Local storage key for clicking the eval box behavior. */
    Key: 'engine-add-info-on-eval-click',
    /** The default value. */
    Default: true,
} as const;

/** Settings for adding info on clicking a move in an engine line. */
export const ENGINE_ADD_INFO_ON_MOVE_CLICK = {
    /** Local storage key for clicking a move behavior. */
    Key: 'engine-add-info-on-move-click',
    /** The default value. */
    Default: false,
} as const;

/** Settings for highlighting engine lines. */
export const HIGHLIGHT_ENGINE_LINES = {
    /** Local storage key for highlighting engine lines. */
    Key: 'highlight-engine-lines',
    /** The default value. */
    Default: true,
} as const;

/** The evaluation of a specific position. */
export interface PositionEval {
    /** The best move chosen by the engine. */
    bestMove?: string;
    /** The name of the opening of the position. */
    opening?: string;
    /** The lines evaluated by the engine. */
    lines: LineEval[];
}

/** The evaluation of a single line. */
export interface LineEval {
    /** The FEN of the starting position in the line. */
    fen: string;
    /** The moves chosen by the engine in UCI format. */
    pv: string[];
    /** The numeric evaluation of the line. */
    cp?: number;
    /** The number of moves to mate. */
    mate?: number;
    /** The depth of the line. */
    depth: number;
    /** The Multi PV value of the engine while calculating the line. */
    multiPv: number;
    /** The number of nodes per second evaluated by the engine. */
    nps?: number;
    
    /** The ending ease metric for the variation  */
    endingEM?: number;
    /** The expected percentages of different results. */
    resultPercentages?: {
        /** The expected win percentage evaluated by the engine. */
        win: number;
        /** The expected draw percentage evaluated by the engine. */
        draw: number;
        /** The expected loss percentage evaluated by the engine. */
        loss: number;
    };
}

/** A cached evaluation of a specific position. */
export type SavedEval = PositionEval & {
    /** The name of the engine that generated the evaluation. */
    engine: EngineName;
};

/** A map from FEN to saved evaluation. */
export type SavedEvals = Record<string, SavedEval | undefined>;

/** Evaluates the given position, updating the eval as the engine runs. */
export interface EvaluatePositionWithUpdateParams {
    /** The FEN to evaluate. */
    fen: string;
    /** The depth to use when evaluating. */
    depth?: number;
    /** The number of lines to analyze. */
    multiPv?: number;
    /** The number of threads to use when analyzing. */
    threads?: number;
    /** The hash size in MB. */
    hash?: number;
    /** The callback function that is sent eval updates. */
    setPartialEval?: (positionEval: PositionEval) => void;
}
