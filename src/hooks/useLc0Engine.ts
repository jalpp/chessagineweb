'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Lc0Status = 'idle' | 'loading-net' | 'starting' | 'ready' | 'error';

export interface Lc0Line {
    channel: 'stdout' | 'stderr' | 'sent';
    text: string;
}

const WORKER_PATH = '/static/engine/lc0/lc0-bridge.worker.mjs';

// lc0's banner/log lines include ANSI color escape codes
// eslint-disable-next-line no-control-regex
const stripAnsi = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, '');
const DEFAULT_NET = '/static/engine/lc0/net/maia-1100.pb.gz';

/**
 * Minimal lc0 UCI engine hook backed by the static wasm bridge worker.
 *
 * Serve requirements (already in next.config headers for the lc0-test route):
 *  - COOP: same-origin / COEP: require-corp (SharedArrayBuffer for wasm threads)
 *  - Static files under /static/engine/lc0/ (worker bundle, lc0.js, lc0.wasm,
 *    ort/*, net/*.pb.gz)
 */
export const useLc0Engine = (netPath: string = DEFAULT_NET) => {
    const workerRef = useRef<Worker | null>(null);
    const [status, setStatus] = useState<Lc0Status>('idle');
    const [error, setError] = useState<string>();
    const [lines, setLines] = useState<Lc0Line[]>([]);
    const [bestMove, setBestMove] = useState<string>();

    const appendLine = useCallback((line: Lc0Line) => {
        setLines(prev => {
            const next = [...prev, line];
            // keep the console bounded
            return next.length > 500 ? next.slice(next.length - 500) : next;
        });
    }, []);

    const start = useCallback(async () => {
        if (workerRef.current) return;
        setStatus('loading-net');
        setError(undefined);
        setLines([]);
        setBestMove(undefined);

        try {
            const res = await fetch(netPath);
            if (!res.ok) throw new Error(`Failed to fetch net ${netPath}: ${res.status}`);
            const network = await res.arrayBuffer();

            setStatus('starting');
            const worker = new Worker(WORKER_PATH, { type: 'module' });
            workerRef.current = worker;

            worker.addEventListener('message', ({ data }) => {
                if (data?.type === 'ready') {
                    worker.postMessage({ network });
                    // start the UCI handshake only after the net is delivered
                    worker.postMessage('uci');
                    return;
                }
                if (data?.type === 'stdout') {
                    appendLine({ channel: 'stdout', text: stripAnsi(data.text) });
                    if (data.text.startsWith('uciok')) setStatus('ready');
                    if (data.text.startsWith('bestmove')) {
                        setBestMove(data.text.split(' ')[1]);
                    }
                    return;
                }
                if (data?.type === 'stderr') {
                    appendLine({ channel: 'stderr', text: stripAnsi(data.text) });
                }
            });

            worker.addEventListener('error', e => {
                setError(e.message || 'Worker error');
                setStatus('error');
            });

        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
        }
    }, [netPath, appendLine]);

    const send = useCallback(
        (command: string) => {
            const worker = workerRef.current;
            if (!worker) return;
            if (command.startsWith('go')) setBestMove(undefined);
            appendLine({ channel: 'sent', text: command });
            worker.postMessage(command);
        },
        [appendLine],
    );

    const stop = useCallback(() => {
        workerRef.current?.terminate();
        workerRef.current = null;
        setStatus('idle');
    }, []);

    useEffect(() => stop, [stop]);

    return { status, error, lines, bestMove, start, send, stop };
};
