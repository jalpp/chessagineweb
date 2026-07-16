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
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { LineEval, PositionEval, UciEngine, EngineName } from "@jalpp/stockfishts";
import Slider from "../Slider";
import { useSettings } from "@/context/SettingContext";
import PvLineViewer from "../analysis/PvLineViewer";

export interface StockfishAnalysisProps {
  stockfishAnalysisResult: PositionEval | null;
  stockfishLoading: boolean;
  engineDepth: number;
  setEngineDepth: (depth: number) => void;
  engineLines: number;
  setEngineLines: (lines: number) => void;
  engine: UciEngine | undefined;
  analyzeWithStockfish: () => void;
  formatEvaluation: (line: LineEval) => string;
  formatPrincipalVariation: (pv: string[], fen: string) => string;
  /**
   * Called with the move prefix (in UCI, inclusive) when the person clicks
   * a move within a line's PV, so the whole sequence up to that move can be
   * appended onto the main board.
   */
  onAppendMoves?: (uciMoves: string[]) => void;
}

// Engine display names mapping
const ENGINE_DISPLAY_NAMES = {
  [EngineName.Stockfish17]: "Stockfish 17 Lite NNUE",
  [EngineName.Stockfish17Point]: "Stockfish 17.1 Lite NNUE",
  [EngineName.Stockfish18]: "Stockfish 18 Lite NNUE",
  [EngineName.Stockfish16]: "Stockfish 16 Lite NNUE",
  [EngineName.Stockfish11]: "Stockfish 11 HCE",
};

// Engine descriptions
const ENGINE_DESCRIPTIONS = {
  [EngineName.Stockfish17]: "Latest 17 version with NNUE evaluation",
  [EngineName.Stockfish17Point]: "Latest 17.1 version with NNUE evaluation",
  [EngineName.Stockfish18]: "Latest 18 version with NNUE evaluation",
  [EngineName.Stockfish16]: "16.1 NNUE stable version, well-tested",
  [EngineName.Stockfish11]: "Older version, faster on weaker hardware",
};

export const StockfishAnalysisTab: React.FC<StockfishAnalysisProps> = ({
  stockfishAnalysisResult,
  stockfishLoading,
  engineDepth,
  setEngineDepth,
  engineLines,
  setEngineLines,
  analyzeWithStockfish,
  formatEvaluation,
  formatPrincipalVariation,
  onAppendMoves,
}) => {
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { saveSettings, enginePicked: enginePickedRaw } = useSettings();
  const enginePicked = enginePickedRaw as EngineName;
  const setEnginePicked = (v: EngineName) => saveSettings({ engine_picked: v });

  // Handle settings changes with smooth transitions
  const handleDepthChange = (newDepth: number) => {
    setIsTransitioning(true);
    setEngineDepth(newDepth);
    setSettingsOpen(false);

    // Restart analysis with new settings
    setTimeout(() => {
      if (engineEnabled) {
        analyzeWithStockfish();
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleLinesChange = (newLines: number) => {
    setIsTransitioning(true);
    setEngineLines(newLines);
    setSettingsOpen(false);

    // Restart analysis with new settings
    setTimeout(() => {
      if (engineEnabled) {
        analyzeWithStockfish();
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleEngineChange = (newEngine: EngineName) => {
    setIsTransitioning(true);
    setEnginePicked(newEngine);
    setSettingsOpen(false);

    // Restart analysis with new engine
    setTimeout(() => {
      if (engineEnabled) {
        analyzeWithStockfish();
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleEngineToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsTransitioning(true);
    setEngineEnabled(event.target.checked);

    if (event.target.checked) {
      setTimeout(() => {
        analyzeWithStockfish();
        setIsTransitioning(false);
      }, 300);
    } else {
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  // Get current engine display name
  const getCurrentEngineDisplayName = () => {
    const baseName = ENGINE_DISPLAY_NAMES[enginePicked] || "Unknown Engine";
    return `${baseName}`;
  };

  // Show loading state when enabled but no results yet or transitioning
  if (
    engineEnabled &&
    (isTransitioning ||
      !stockfishAnalysisResult ||
      (stockfishLoading &&
        (!stockfishAnalysisResult.lines ||
          stockfishAnalysisResult.lines.length === 0)))
  ) {
    return (
      <Box>
        {/* Header */}
        <Paper
          sx={{
            p: 2,

            borderRadius: 2,
            mb: 2,
            transition: "all 0.3s ease",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Stockfish On
              </Typography>
            </Box>
            <Switch
              checked={engineEnabled}
              onChange={handleEngineToggle}
              disabled={isTransitioning}
            />
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{ p: 0.5 }}
              size="small"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>

        {/* Loading State */}
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} />
            <Typography variant="body2">
              {isTransitioning
                ? "Applying settings..."
                : "Starting analysis..."}
            </Typography>
          </Stack>
        </Box>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={handleSettingsClose}>
          <DialogTitle>Stockfish Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Engine Version
                </Typography>
                <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                  Choose which Stockfish version to use for analysis
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={enginePicked}
                    onChange={(e) =>
                      handleEngineChange(e.target.value as EngineName)
                    }
                    disabled={stockfishLoading || isTransitioning}
                  >
                    {Object.values(EngineName).map((engine) => (
                      <MenuItem key={engine} value={engine}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {ENGINE_DISPLAY_NAMES[engine]}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: "block" }}
                          >
                            {ENGINE_DESCRIPTIONS[engine]}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Analysis Depth: {engineDepth}
                </Typography>
                <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                  Higher depth provides more accurate analysis but takes longer
                </Typography>
                <Slider
                  value={engineDepth}
                  setValue={handleDepthChange}
                  min={10}
                  max={25}
                  disable={stockfishLoading || isTransitioning}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Number of Lines: {engineLines}
                </Typography>
                <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                  Show multiple best move candidates (AI will analyze all lines)
                </Typography>
                <Slider
                  value={engineLines}
                  setValue={handleLinesChange}
                  min={1}
                  max={4}
                  disable={stockfishLoading || isTransitioning}
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
      </Box>
    );
  }

  // Show disabled state
  if (!engineEnabled) {
    return (
      <Paper
        sx={{
          p: 2,

          borderRadius: 2,
          transition: "all 0.3s ease",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Stockfish Off
            </Typography>
          </Box>
          <Switch
            checked={engineEnabled}
            onChange={handleEngineToggle}
            disabled={isTransitioning}
          />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ p: 0.5 }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={handleSettingsClose}>
          <DialogTitle>Stockfish Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Engine Version
                </Typography>
                <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                  Choose which Stockfish version to use for analysis
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={enginePicked}
                    onChange={(e) =>
                      handleEngineChange(e.target.value as EngineName)
                    }
                    disabled={stockfishLoading || isTransitioning}
                  >
                    {Object.values(EngineName).map((engine) => (
                      <MenuItem key={engine} value={engine}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {ENGINE_DISPLAY_NAMES[engine]}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: "block" }}
                          >
                            {ENGINE_DESCRIPTIONS[engine]}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Analysis Depth: {engineDepth}
                </Typography>
                <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                  Higher depth provides more accurate analysis but takes longer
                </Typography>
                <Slider
                  value={engineDepth}
                  setValue={handleDepthChange}
                  min={10}
                  max={25}
                  disable={stockfishLoading || isTransitioning}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Number of Lines: {engineLines}
                </Typography>
                <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                  Show multiple best move candidates (AI will analyze all lines)
                </Typography>
                <Slider
                  value={engineLines}
                  setValue={handleLinesChange}
                  min={1}
                  max={4}
                  disable={stockfishLoading || isTransitioning}
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
      </Paper>
    );
  }

  return (
    <Box sx={{ transition: "all 0.3s ease" }}>
      <Paper
        sx={{
          p: 2,

          borderRadius: 2,
          mb: 2,
          transition: "all 0.3s ease",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Stockfish On
            </Typography>
          </Box>
          <Switch
            checked={engineEnabled}
            onChange={handleEngineToggle}
            disabled={isTransitioning}
          />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ p: 0.5 }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Engine Info */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {getCurrentEngineDisplayName()}
          </Typography>
          <Chip
            label={`${engineDepth}`}
            size="small"
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
          />
          <Typography variant="caption">for</Typography>
          <Chip
            label={`${engineLines}`}
            size="small"
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
          />
          <Typography variant="caption">lines.</Typography>
        </Stack>

        {/* Column Headers */}
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ minWidth: "60px" }}>
            Eval
          </Typography>
          <Typography variant="caption" sx={{ minWidth: "60px" }}>
            Win %
          </Typography>
          <Typography variant="caption" sx={{ flex: 1 }}>
            Moves
          </Typography>
        </Stack>
      </Paper>

      {/* Analysis Lines */}
      <Stack spacing={0} sx={{ transition: "all 0.3s ease" }}>
        {stockfishAnalysisResult?.lines?.map((line, index) => (
          <Paper
            key={`line-${index}-${line.depth}-${line.cp || line.mate}`}
            sx={{
              p: 2,

              borderRadius: 0,
              borderBottom:
                index < stockfishAnalysisResult.lines.length - 1
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "none",
              transition: "all 0.3s ease",
              opacity: isTransitioning ? 0.5 : 1,
              filter: "none",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* Evaluation */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "bold",
                  minWidth: "60px",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  transition: "color 0.3s ease",
                }}
              >
                {formatEvaluation(line)}
              </Typography>

              {/* Win Percentage */}
              <Typography
                variant="body2"
                sx={{
                  minWidth: "60px",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  transition: "color 0.3s ease",
                }}
              >
                {line.cp !== undefined
                  ? `${Math.max(0, Math.min(100, 50 + (line.cp / 100) * 10)).toFixed(1)}%`
                  : line.mate !== undefined
                    ? line.mate > 0
                      ? "100%"
                      : "0%"
                    : "50.0%"}
              </Typography>

              {/* Principal Variation — scrollable, hover for a mini-board
                  preview of each move, click a move to append the line up
                  to it onto the main board. */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PvLineViewer
                  fen={line.fen}
                  uciMoves={line.pv}
                  onAppendMoves={onAppendMoves}
                />
              </Box>

              {/* Loading indicator for incomplete lines */}
              {(stockfishLoading || isTransitioning) &&
                line.depth < engineDepth && (
                  <CircularProgress size={16} sx={{ color: "#9c27b0" }} />
                )}
            </Stack>
          </Paper>
        ))}

        {/* Placeholder lines while loading */}
        {(stockfishLoading || isTransitioning) &&
          stockfishAnalysisResult?.lines &&
          stockfishAnalysisResult.lines.length < engineLines &&
          Array.from({
            length: engineLines - stockfishAnalysisResult.lines.length,
          }).map((_, index) => (
            <Paper
              key={`placeholder-${index}`}
              sx={{
                p: 2,

                borderRadius: 0,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                opacity: 0.5,
                transition: "all 0.3s ease",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <CircularProgress size={16} />
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                >
                  {isTransitioning
                    ? "Restarting analysis..."
                    : `Calculating line ${stockfishAnalysisResult.lines.length + index + 1}...`}
                </Typography>
              </Stack>
            </Paper>
          ))}
      </Stack>

      {/* Footer Info */}
      {stockfishAnalysisResult && (
        <Paper
          sx={{
            p: 1.5,

            borderRadius: 0,
            mt: 0,
            transition: "all 0.3s ease",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="caption">
              Reached Depth:{" "}
              {stockfishAnalysisResult.lines?.[0]?.depth || engineDepth}
            </Typography>
            <Typography variant="caption">
              Speed:{" "}
              {stockfishAnalysisResult.lines?.[0]?.nps
                ? `${(stockfishAnalysisResult.lines[0].nps / 1000000).toFixed(2)} Mn/s`
                : "1.35 Mn/s"}
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            minWidth: 450,
          },
        }}
      >
        <DialogTitle>Stockfish Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Engine Version
              </Typography>
              <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                Choose which Stockfish version to use for analysis
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={enginePicked}
                  onChange={(e) =>
                    handleEngineChange(e.target.value as EngineName)
                  }
                  disabled={stockfishLoading || isTransitioning}
                >
                  {Object.values(EngineName).map((engine) => (
                    <MenuItem key={engine} value={engine}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {ENGINE_DISPLAY_NAMES[engine]}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block" }}>
                          {ENGINE_DESCRIPTIONS[engine]}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Analysis Depth: {engineDepth}
              </Typography>
              <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                Higher depth provides more accurate analysis but takes longer
              </Typography>
              <Slider
                value={engineDepth}
                setValue={handleDepthChange}
                min={10}
                max={25}
                disable={stockfishLoading || isTransitioning}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Number of Lines: {engineLines}
              </Typography>
              <Typography variant="caption" sx={{ mb: 2, display: "block" }}>
                Show multiple best move candidates (AI will analyze all lines)
              </Typography>
              <Slider
                value={engineLines}
                setValue={handleLinesChange}
                min={1}
                max={4}
                disable={stockfishLoading || isTransitioning}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockfishAnalysisTab;
