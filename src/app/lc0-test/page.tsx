'use client';

import { useEffect, useRef, useState } from 'react';

import { useLc0Engine } from '@/hooks/useLc0Engine';

const NETS: Record<string, string> = {
    'Maia 1100 (bundled, 1.3 MB)': '/static/engine/lc0/net/maia-1100.pb.gz',
    'T1-256x10 distilled (drop into public/static/engine/lc0/net/)':
        '/static/engine/lc0/net/t1-256x10-distilled-swa-2432500.pb.gz',
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function Lc0TestPage() {
    const [netPath, setNetPath] = useState(Object.values(NETS)[0]);
    const { status, error, lines, bestMove, start, send, stop } = useLc0Engine(netPath);
    const [fen, setFen] = useState(START_FEN);
    const [nodes, setNodes] = useState(64);
    const [custom, setCustom] = useState('');
    const consoleRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight);
    }, [lines]);

    const analyze = () => {
        send(`position fen ${fen}`);
        send(`go nodes ${nodes}`);
    };

    return (
        <main style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem', fontFamily: 'monospace' }}>
            <h1>lc0 wasm engine test</h1>
            <p>
                Status: <b>{status}</b>
                {error && <span style={{ color: 'red' }}> — {error}</span>}
                {bestMove && (
                    <span>
                        {' '}| bestmove: <b style={{ color: 'green' }}>{bestMove}</b>
                    </span>
                )}
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <select value={netPath} onChange={e => setNetPath(e.target.value)} disabled={status !== 'idle'}>
                    {Object.entries(NETS).map(([label, path]) => (
                        <option key={path} value={path}>
                            {label}
                        </option>
                    ))}
                </select>
                <button onClick={start} disabled={status !== 'idle'}>
                    Start engine
                </button>
                <button onClick={stop} disabled={status === 'idle'}>
                    Stop
                </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <input
                    style={{ flex: 1, minWidth: 320 }}
                    value={fen}
                    onChange={e => setFen(e.target.value)}
                    placeholder="FEN"
                />
                <label>
                    nodes{' '}
                    <input
                        type="number"
                        style={{ width: 80 }}
                        value={nodes}
                        onChange={e => setNodes(Number(e.target.value))}
                    />
                </label>
                <button onClick={analyze} disabled={status !== 'ready'}>
                    Analyze
                </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                    style={{ flex: 1 }}
                    value={custom}
                    onChange={e => setCustom(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && custom.trim()) {
                            send(custom.trim());
                            setCustom('');
                        }
                    }}
                    placeholder="raw UCI command (Enter to send), e.g. go movetime 5000"
                />
            </div>

            <pre
                ref={consoleRef}
                style={{
                    height: 420,
                    overflow: 'auto',
                    background: '#111',
                    color: '#ddd',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12,
                }}
            >
                {lines.map((l, i) => (
                    <div
                        key={i}
                        style={{
                            color: l.channel === 'sent' ? '#6cf' : l.channel === 'stderr' ? '#f96' : '#ddd',
                        }}
                    >
                        {l.channel === 'sent' ? '> ' : ''}
                        {l.text}
                    </div>
                ))}
            </pre>

            <p style={{ fontSize: 12, opacity: 0.7 }}>
                First inference is slow (ONNX conversion + session build). WebGPU is used when available, with
                wasm fallback. To test T1-256, download{' '}
                t1-256x10-distilled-swa-2432500.pb.gz from storage.lczero.org/files/networks-contrib/ and place
                it in public/static/engine/lc0/net/.
            </p>
        </main>
    );
}
