import React, { useState } from "react";
import {
  Stack,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tooltip,
} from "@mui/material";
import { Settings as SettingsIcon, Memory as CpuIcon, Bolt as GpuIcon } from "@mui/icons-material";
import { LineEval, PositionEval, UciEngine } from "@jalpp/stockfishts";
import Slider from "../Slider";
import PvLineViewer from "../analysis/PvLineViewer";
import { LC0_DEPTH, LC0_LINES } from "@/hooks/useLc0Panel";
import type { Lc0Provider } from "@/libs/engine/lc0Worker";

export interface Lc0AnalysisProps {
  lc0AnalysisResult: PositionEval | null;
  lc0Loading: boolean;
  lc0Depth: number;
  setLc0Depth: (depth: number) => void;
  lc0Lines: number;
  setLc0Lines: (lines: number) => void;
  engine: UciEngine | undefined;
  analyzeWithLc0: () => void;
  /** Nodes visited so far in the current search (resets to 0 at the start of each analysis). */
  nodesVisited?: number;
  /** Which onnxruntime-web execution provider the engine actually initialized with. */
  provider?: Lc0Provider;
  gpuAdapterAvailable?: boolean;
  /** Set if the engine failed to start (e.g. a cross-origin isolation problem). */
  engineError?: string;
  formatEvaluation: (line: LineEval) => string;
  formatPrincipalVariation: (pv: string[], fen: string) => string;
  /**
   * Called with the move prefix (in UCI, inclusive) when the person clicks
   * a move within a line's PV, so the whole sequence up to that move can be
   * appended onto the main board.
   */
  onAppendMoves?: (uciMoves: string[]) => void;
}

function formatNodes(nodes: number): string {
  return nodes.toLocaleString();
}

function winPercent(line: LineEval): string {
  if (line.resultPercentages) {
    return `${line.resultPercentages.win.toFixed(1)}%`;
  }
  if (line.cp !== undefined) {
    return `${Math.max(0, Math.min(100, 50 + (line.cp / 100) * 10)).toFixed(1)}%`;
  }
  if (line.mate !== undefined) {
    return line.mate > 0 ? "100%" : "0%";
  }
  return "50.0%";
}

export const Lc0AnalysisTab: React.FC<Lc0AnalysisProps> = ({
  lc0AnalysisResult,
  lc0Loading,
  lc0Depth,
  setLc0Depth,
  lc0Lines,
  setLc0Lines,
  analyzeWithLc0,
  nodesVisited = 0,
  provider,
  gpuAdapterAvailable,
  engineError,
  formatEvaluation,
  onAppendMoves,
}) => {
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleDepthChange = (newDepth: number) => {
    setIsTransitioning(true);
    setLc0Depth(newDepth);
    setSettingsOpen(false);
    setTimeout(() => {
      if (engineEnabled) analyzeWithLc0();
      setIsTransitioning(false);
    }, 300);
  };

  const handleLinesChange = (newLines: number) => {
    setIsTransitioning(true);
    setLc0Lines(newLines);
    setSettingsOpen(false);
    setTimeout(() => {
      if (engineEnabled) analyzeWithLc0();
      setIsTransitioning(false);
    }, 300);
  };

  const handleEngineToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsTransitioning(true);
    setEngineEnabled(event.target.checked);
    if (event.target.checked) {
      setTimeout(() => {
        analyzeWithLc0();
        setIsTransitioning(false);
      }, 300);
    } else {
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleSettingsClose = () => setSettingsOpen(false);

  const settingsDialog = (
    <Dialog open={settingsOpen} onClose={handleSettingsClose}>
      <DialogTitle>lc0 Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Analysis Depth: {lc0Depth}
            </Typography>
            <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
              lc0 is a neural/MCTS engine -- depth grows much more slowly
              than in Stockfish, so higher values take noticeably longer.
            </Typography>
            <Slider
              value={lc0Depth}
              setValue={handleDepthChange}
              min={LC0_DEPTH.Min}
              max={LC0_DEPTH.Max}
              disable={lc0Loading || isTransitioning}
            />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Number of Lines: {lc0Lines}
            </Typography>
            <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
              Show multiple best move candidates
            </Typography>
            <Slider
              value={lc0Lines}
              setValue={handleLinesChange}
              min={LC0_LINES.Min}
              max={LC0_LINES.Max}
              disable={lc0Loading || isTransitioning}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSettingsClose} sx={{ color: "#9c27b0" }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );

  const header = (on: boolean) => (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: on ? 2 : 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          lc0 {on ? "On" : "Off"}
        </Typography>
      </Box>
      <Switch checked={engineEnabled} onChange={handleEngineToggle} disabled={isTransitioning} />
      <Box sx={{ flexGrow: 1 }} />
      <IconButton onClick={() => setSettingsOpen(true)} sx={{ p: 0.5 }} size="small">
        <SettingsIcon fontSize="small" />
      </IconButton>
    </Stack>
  );

  if (!engineEnabled) {
    return (
      <Paper sx={{ p: 2, borderRadius: 2, transition: "all 0.3s ease" }}>
        {header(false)}
        {settingsDialog}
      </Paper>
    );
  }

  if (engineError) {
    return (
      <Box>
        <Paper sx={{ p: 2, borderRadius: 2, mb: 2, transition: "all 0.3s ease" }}>
          {header(true)}
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600, mb: 1 }}>
            lc0 couldn&apos;t start
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {engineError}
          </Typography>
        </Paper>
        {settingsDialog}
      </Box>
    );
  }

  if (
    isTransitioning ||
    !lc0AnalysisResult ||
    (lc0Loading && (!lc0AnalysisResult.lines || lc0AnalysisResult.lines.length === 0))
  ) {
    return (
      <Box>
        <Paper sx={{ p: 2, borderRadius: 2, mb: 2, transition: "all 0.3s ease" }}>
          {header(true)}
        </Paper>
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} />
            <Typography variant="body2">
              {isTransitioning ? "Applying settings..." : "Starting analysis..."}
            </Typography>
          </Stack>
        </Box>
        {settingsDialog}
      </Box>
    );
  }

  return (
    <Box sx={{ transition: "all 0.3s ease" }}>
      <Paper sx={{ p: 2, borderRadius: 2, mb: 2, transition: "all 0.3s ease" }}>
        {header(true)}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            lc0 (T1-256x10 distilled)
          </Typography>
          <Chip label={`${lc0Depth}`} size="small" sx={{ fontSize: "0.7rem", fontWeight: 600 }} />
          <Typography variant="caption">for</Typography>
          <Chip label={`${lc0Lines}`} size="small" sx={{ fontSize: "0.7rem", fontWeight: 600 }} />
          <Typography variant="caption">lines.</Typography>
          {provider && (
            <Tooltip
              title={
                provider === "webgpu"
                  ? "Running on your GPU via WebGPU."
                  : gpuAdapterAvailable === false
                    ? "No WebGPU-capable GPU detected in this browser -- running on CPU (wasm)."
                    : "WebGPU didn't initialize -- running on CPU (wasm) instead."
              }
            >
              <Chip
                icon={provider === "webgpu" ? <GpuIcon sx={{ fontSize: 14 }} /> : <CpuIcon sx={{ fontSize: 14 }} />}
                label={provider === "webgpu" ? "GPU" : "CPU"}
                size="small"
                color={provider === "webgpu" ? "success" : "default"}
                sx={{ fontSize: "0.7rem", fontWeight: 600 }}
              />
            </Tooltip>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
            {formatNodes(nodesVisited)} nodes
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ minWidth: "60px" }}>Eval</Typography>
          <Typography variant="caption" sx={{ minWidth: "60px" }}>Win %</Typography>
          <Typography variant="caption" sx={{ flex: 1 }}>Moves</Typography>
        </Stack>
      </Paper>

      <Stack spacing={0} sx={{ transition: "all 0.3s ease" }}>
        {lc0AnalysisResult?.lines?.map((line, index) => (
          <Paper
            key={`lc0-line-${index}-${line.depth}-${line.cp ?? line.mate}`}
            sx={{
              p: 2,
              borderRadius: 0,
              borderBottom:
                index < lc0AnalysisResult.lines.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
              transition: "all 0.3s ease",
              opacity: isTransitioning ? 0.5 : 1,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography
                variant="body2"
                sx={{ fontWeight: "bold", minWidth: "60px", fontFamily: "monospace", fontSize: "0.85rem" }}
              >
                {formatEvaluation(line)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ minWidth: "60px", fontFamily: "monospace", fontSize: "0.85rem" }}
              >
                {winPercent(line)}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PvLineViewer fen={line.fen} uciMoves={line.pv} onAppendMoves={onAppendMoves} />
              </Box>
              {lc0Loading && index === 0 && <CircularProgress size={14} />}
            </Stack>
          </Paper>
        ))}
      </Stack>

      {settingsDialog}
    </Box>
  );
};

export default Lc0AnalysisTab;
