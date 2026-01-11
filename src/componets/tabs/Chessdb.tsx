import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Storage,
  Refresh,
  Queue,
} from "@mui/icons-material";

import { useLocalStorage } from "usehooks-ts";
import { CandidateMove } from "@/libs/agine/helper";

export interface ChessDBDisplayProps {
  data: CandidateMove[] | null;
  loading?: boolean;
  title?: string;
  showTitle?: boolean;
  analyzeMove: (move: CandidateMove) => void;
  llmLoading?: boolean;
  error?: string | null;
  queueing?: boolean;
  onRefresh?: () => void;
  onRequestAnalysis?: () => void;
}

export function getChessDBSpeech(data: CandidateMove[]): string {
  let query = "Candidate Moves \n\n";

  for (let i = 0; i < data.length; i++) {
    query += `Move: ${data[i].san} Eval ${data[i].score} WinRate ${data[i].winrate} Note: ${data[i].note}\n`;
  }

  return query;
}

export function ChessDBDisplay({
  data,
  loading = false,
  analyzeMove,
  llmLoading = false,
  error = null,
  queueing = false,
  onRefresh,
  onRequestAnalysis,
}: ChessDBDisplayProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [chessDBEnabled, setChessDBEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showScores, setShowScores] = useLocalStorage<boolean>(
    "chessdb_ui_show_scores",
    true
  );
  const [showWinrates, setShowWinrates] = useLocalStorage<boolean>(
    "chessdb_ui_show_winrate",
    true
  );

  // Calculate maximum possible moves from current position
  const availableMoves = data ? data.length : 0;
  const actualMaxMoves = availableMoves;

  const handleChessDBToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChessDBEnabled(event.target.checked);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const getScoreColor = (score: string) => {
    if (score === "N/A") return "grey.400";
    const numScore = parseFloat(score) / 100;
    if (numScore > 0.5) return "#4caf50";
    if (numScore < -0.5) return "#f44336";
    return "#ff9800";
  };

  const getWinrateColor = (winrate: string) => {
    if (winrate === "N/A") return "grey.400";
    const rate = parseFloat(winrate);
    if (rate >= 60) return "#4caf50";
    if (rate <= 40) return "#f44336";
    return "#ff9800";
  };

  if (!chessDBEnabled) {
    return (
      <Paper
        sx={{
          p: isMobile ? 1.5 : 2,

          borderRadius: 2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={isMobile ? 1 : 2}
          flexWrap="wrap"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: isMobile ? "0.8rem" : "0.875rem",
              }}
            >
              ChessDB Off
            </Typography>
          </Box>
          <Switch
            checked={chessDBEnabled}
            onChange={handleChessDBToggle}
            size={isMobile ? "small" : "medium"}
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

        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              minWidth: isMobile ? "auto" : 400,
            },
          }}
        >
          <DialogTitle>ChessDB Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                  Available moves in this position: {actualMaxMoves}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Show Scores
                </Typography>
                <Switch
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Show Win Rates
                </Typography>
                <Switch
                  checked={showWinrates}
                  onChange={(e) => setShowWinrates(e.target.checked)}
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

  if (loading || (!data && chessDBEnabled)) {
    return (
      <Box>
        <Paper
          sx={{
            p: isMobile ? 1.5 : 2,

            borderRadius: 2,
            mb: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={isMobile ? 1 : 2}
            flexWrap="wrap"
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                }}
              >
                ChessDB On
              </Typography>
            </Box>
            <Switch
              checked={chessDBEnabled}
              onChange={handleChessDBToggle}
              size={isMobile ? "small" : "medium"}
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
            <CircularProgress size={40} sx={{ color: "#9c27b0" }} />
            <Typography
              variant="body2"
              sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }}
            >
              Querying ChessDB...
            </Typography>
          </Stack>
        </Box>

        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              minWidth: isMobile ? "auto" : 400,
            },
          }}
        >
          <DialogTitle>ChessDB Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                  Available moves in this position: {actualMaxMoves}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Show Scores
                </Typography>
                <Switch
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Show Win Rates
                </Typography>
                <Switch
                  checked={showWinrates}
                  onChange={(e) => setShowWinrates(e.target.checked)}
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

  if (!data || data.length === 0) {
    return (
      <Box>
        <Paper
          sx={{
            p: isMobile ? 1.5 : 2,

            borderRadius: 2,
            mb: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={isMobile ? 1 : 2}
            flexWrap="wrap"
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                }}
              >
                ChessDB On
              </Typography>
            </Box>
            <Switch
              checked={chessDBEnabled}
              onChange={handleChessDBToggle}
              size={isMobile ? "small" : "medium"}
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

        <Paper
          sx={{
            p: isMobile ? 2 : 4,

            borderRadius: 2,
            textAlign: "center",
          }}
        >
         

          <Stack
            direction={isMobile ? "column" : "row"}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="outlined"
              startIcon={queueing ? <CircularProgress size={16} /> : <Queue />}
              onClick={onRequestAnalysis}
              disabled={queueing}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              {queueing ? "Queueing..." : "Request Analysis"}
            </Button>

            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRefresh}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              Refresh
            </Button>
          </Stack>

          <Typography
            variant="caption"
            sx={{
              mt: 2,
              display: "block",
              fontSize: isMobile ? "0.7rem" : "0.75rem",
            }}
          >
            Request analysis to queue this position for evaluation, then refresh
            to check for results.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Paper
        sx={{
          p: isMobile ? 1.5 : 2,
          borderRadius: 2,
          mb: 2,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={isMobile ? 1 : 2}
          sx={{ mb: 2 }}
          flexWrap="wrap"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: isMobile ? "0.8rem" : "0.875rem",
              }}
            >
              ChessDB On
            </Typography>
          </Box>
          <Switch
            checked={chessDBEnabled}
            onChange={handleChessDBToggle}
            size={isMobile ? "small" : "medium"}
          />
          <Box sx={{ flexGrow: 1 }} />
          {!isMobile && (
            <IconButton
              onClick={onRefresh}
              sx={{ p: 0.5, mr: 1 }}
              size="small"
              title="Refresh data"
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ p: 0.5 }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Database Info */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={isMobile ? 1 : 2}
          sx={{ mb: 2 }}
          flexWrap="wrap"
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            ChessDB Database
          </Typography>
          <Chip
            label={`${data.length}`}
            size="small"
            sx={{
              fontSize: isMobile ? "0.65rem" : "0.7rem",
              fontWeight: 600,
              height: isMobile ? 20 : 24,
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, fontSize: isMobile ? "0.8rem" : "0.875rem" }}
          >
            Moves present
          </Typography>
          {isMobile && (
            <IconButton
              onClick={onRefresh}
              sx={{ p: 0.5, ml: "auto !important" }}
              size="small"
              title="Refresh data"
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {!isMobile && (
          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ minWidth: "80px" }}>
              Move
            </Typography>
            {showScores && (
              <Typography variant="caption" sx={{ minWidth: "60px" }}>
                Score
              </Typography>
            )}
            {showWinrates && (
              <Typography variant="caption" sx={{ minWidth: "60px" }}>
                Win %
              </Typography>
            )}
            <Typography variant="caption" sx={{ flex: 1 }}>
              Rank
            </Typography>
            <Typography variant="caption" sx={{ flex: 1 }}>
              Note
            </Typography>
          </Stack>
        )}
      </Paper>

      {/* Moves List */}
      <Stack spacing={0}>
        {data.map((move, index) => (
          <Paper
            key={`${move.uci}-${index}`}
            onClick={() => analyzeMove(move)}
            sx={{
              p: isMobile ? 1.5 : 2,

              borderRadius: 0,
              borderLeft:
                index === 0 ? "3px solid #9c27b0" : "3px solid transparent",
              cursor: llmLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              "&:hover": {
                backgroundColor: llmLoading
                  ? "#1a1a1a"
                  : "rgba(156, 39, 176, 0.1)",
              },
              filter: llmLoading ? "grayscale(50%)" : "none",
            }}
          >
            {isMobile ? (
              // Mobile Layout - Stacked
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: "bold",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    }}
                  >
                    {index + 1}. {move.san}
                  </Typography>
                  <Chip
                    label={move.note}
                    size="small"
                    sx={{
                      fontSize: "0.65rem",
                      height: 20,
                    }}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {showScores && (
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        Score
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getScoreColor(move.score),
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        {move.score === "N/A"
                          ? "—"
                          : `${parseFloat(move.score) >= 0 ? "+" : ""}${
                              move.score
                            }`}
                      </Typography>
                    </Box>
                  )}
                  {showWinrates && (
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        Win %
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getWinrateColor(move.winrate),
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        {move.winrate === "N/A" ? "—" : `${move.winrate}%`}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                      Rank
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      {move.rank}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            ) : (
              // Desktop Layout - Inline
              <Stack direction="row" alignItems="center" spacing={2}>
                {/* Move */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    minWidth: "80px",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                >
                  {index + 1}. {move.san}
                </Typography>

                {/* Score */}
                {showScores && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: getScoreColor(move.score),
                      minWidth: "60px",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    {move.score === "N/A"
                      ? "—"
                      : `${parseFloat(move.score) >= 0 ? "+" : ""}${
                          move.score
                        }`}
                  </Typography>
                )}

                {/* Win Rate */}
                {showWinrates && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: getWinrateColor(move.winrate),
                      minWidth: "60px",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    {move.winrate === "N/A" ? "—" : `${move.winrate}%`}
                  </Typography>
                )}

                {/* Rank */}
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    flex: 1,
                  }}
                >
                  {move.rank}
                </Typography>

                {/* Note */}
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    flex: 1,
                  }}
                >
                  {move.note}
                </Typography>
              </Stack>
            )}
          </Paper>
        ))}
      </Stack>

      {/* Footer Info */}
      <Paper
        sx={{
          p: isMobile ? 1 : 1.5,

          borderRadius: 0,
          mt: 0,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          spacing={isMobile ? 1 : 0}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Storage fontSize="small" />
            <Typography
              variant="caption"
              sx={{ fontSize: isMobile ? "0.7rem" : "0.75rem" }}
            >
              Data from ChessDB
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{ fontSize: isMobile ? "0.7rem" : "0.75rem" }}
          >
            Showing {data.length} moves
          </Typography>
        </Stack>
      </Paper>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            minWidth: isMobile ? "auto" : 400,
          },
        }}
      >
        <DialogTitle>ChessDB Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                Available moves in this position: {actualMaxMoves}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Display Options
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">Show Scores</Typography>
                  <Switch
                    checked={showScores}
                    onChange={(e) => setShowScores(e.target.checked)}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">Show Win Rates</Typography>
                  <Switch
                    checked={showWinrates}
                    onChange={(e) => setShowWinrates(e.target.checked)}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Hint */}
      <Box sx={{ mt: 2, px: isMobile ? 0.5 : 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontStyle: "italic",
            fontSize: isMobile ? "0.7rem" : "0.75rem",
          }}
        >
          Click on any move above to get AI analysis of that candidate
        </Typography>
      </Box>
    </Box>
  );
}

export default ChessDBDisplay;
