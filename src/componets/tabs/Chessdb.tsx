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
import { Settings as SettingsIcon, Storage, Refresh, Queue } from "@mui/icons-material";
import { validateFen } from "chess.js";
import { useLocalStorage } from "usehooks-ts";

export interface CandidateMove {
  uci: string;
  san: string;
  score: string;
  winrate: string;
  rank: string;
  note: string;
}

// Custom hook for fetching ChessDB data
export function useChessDB(fen: string) {
  const [data, setData] = useState<CandidateMove[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [queueing, setQueueing] = useState<boolean>(false);

  const fetchChessDBData = useCallback(async (fenString: string) => {
    if (!fenString.trim()) {
      setData([]);
      setError(null);
      return;
    }

    if (!validateFen(fenString)) {
      setError("Invalid FEN provided");
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const encodedFen = encodeURIComponent(fenString);
      const apiUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodedFen}&json=1`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch data`);
      }

      const responseData = await response.json();

      if (responseData.status !== "ok") {
        throw new Error(
          `Position evaluation not available: ${responseData.status}`
        );
      }

      const moves = responseData.moves;
      if (!Array.isArray(moves)) {
        throw new Error("Invalid response format: moves not found");
      }

      if (moves.length === 0) {
        setData([]);
        return;
      }

      const processedMoves = moves.map((move: CandidateMove) => {
        const scoreNum = Number(move.score);
        // Convert centipawns to pawns and format to 2 decimal places
        const scoreStr = isNaN(scoreNum) ? "N/A" : (scoreNum / 100).toFixed(2);
        return {
          uci: move.uci || "N/A",
          san: move.san || "N/A",
          score: scoreStr,
          winrate: move.winrate || "N/A",
          rank: move.rank,
          note: getChessDbNoteWord(move.note.split(" ")[0]),
        };
      });

      setData(processedMoves);
    } catch (err) {
      console.log('error!', err)
      setData([]);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  const queueAnalysis = useCallback(async (fenString: string) => {
    if (!fenString.trim() || !validateFen(fenString)) {
      return;
    }

    setQueueing(true);
    try {
      const encodedFen = encodeURIComponent(fenString);
      const queueUrl = `https://www.chessdb.cn/cdb.php?action=queue&board=${encodedFen}&json=1`;

      const response = await fetch(queueUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to queue analysis`);
      }

      const responseData = await response.json();
      
      if (responseData.status !== "ok") {
        throw new Error(`Failed to queue position: ${responseData.status}`);
      }

      // Optionally show success message or handle response
      console.log('Position queued successfully');
      
    } catch (err) {
      console.error('Failed to queue analysis:', err);
      setError(err instanceof Error ? err.message : "Failed to queue analysis");
    } finally {
      setQueueing(false);
    }
  }, []);

  useEffect(() => {
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  const refetch = useCallback(() => {
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  const requestAnalysis = useCallback(() => {
    queueAnalysis(fen);
  }, [fen, queueAnalysis]);

  return {
    data,
    loading,
    error,
    queueing,
    refetch,
    requestAnalysis,
  };
}

// Component props interface
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

function getChessDbNoteWord(note: string): string {
  switch(note){
    case "!":
      return "Best";
    case "*": 
      return "Good";
    case "?": 
      return "Bad"; 
    default:
      return "unknown";     
  }
}

export function getChessDBSpeech(data: CandidateMove[]): string {
   let query = 'Candidate Moves \n\n'

   for(let i = 0; i < data.length; i++){
     query += `Move: ${data[i].san} Eval ${data[i].score} WinRate ${data[i].winrate} Note: ${data[i].note}\n`;
   }

   return query;
}

// Component for displaying ChessDB information
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [chessDBEnabled, setChessDBEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showScores, setShowScores] = useLocalStorage<boolean>(
    "chessdb_ui_show_scores",
    true
  )
  const [showWinrates, setShowWinrates] = useLocalStorage<boolean>(
    "chessdb_ui_show_winrate",
    true
  )

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
    const numScore = parseFloat(score) / 100; // Convert centipawns to pawns
    if (numScore > 0.5) return "#4caf50";   // Green for advantage > 0.5 pawns
    if (numScore < -0.5) return "#f44336";  // Red for disadvantage > 0.5 pawns
    return "#ff9800";                       // Orange for roughly equal
  };

  const getWinrateColor = (winrate: string) => {
    if (winrate === "N/A") return "grey.400";
    const rate = parseFloat(winrate);
    if (rate >= 60) return "#4caf50";
    if (rate <= 40) return "#f44336";
    return "#ff9800";
  };

  // Show disabled state
  if (!chessDBEnabled) {
    return (
      <Paper
        sx={{
          p: isMobile ? 1.5 : 2,
          backgroundColor: "#1a1a1a",
          borderRadius: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 2} flexWrap="wrap">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "grey.600",
              }}
            />
            <Typography variant="subtitle2" sx={{ color: "grey.400", fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              ChessDB Off
            </Typography>
          </Box>
          <Switch
            checked={chessDBEnabled}
            onChange={handleChessDBToggle}
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#9c27b0',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#9c27b0',
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ color: "grey.400", p: 0.5 }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              backgroundColor: "#1a1a1a",
              color: "white",
              minWidth: isMobile ? 'auto' : 400
            }
          }}
        >
          <DialogTitle>ChessDB Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "grey.400", mb: 1, display: "block" }}>
                  Available moves in this position: {actualMaxMoves}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Scores
                </Typography>
                <Switch
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Win Rates
                </Typography>
                <Switch
                  checked={showWinrates}
                  onChange={(e) => setShowWinrates(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
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

  // Show loading state
  if (loading || (!data && chessDBEnabled)) {
    return (
      <Box>
        {/* Header */}
        <Paper
          sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: "#1a1a1a",
            borderRadius: 2,
            mb: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 2} flexWrap="wrap">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#9c27b0",
                }}
              />
              <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                ChessDB On
              </Typography>
            </Box>
            <Switch
              checked={chessDBEnabled}
              onChange={handleChessDBToggle}
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#9c27b0',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#9c27b0',
                },
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{ color: "white", p: 0.5 }}
              size="small"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>

        {/* Loading State */}
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress 
              size={40} 
              sx={{ color: "#9c27b0" }} 
            />
            <Typography variant="body2" sx={{ color: "grey.400", fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              Querying ChessDB...
            </Typography>
          </Stack>
        </Box>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              backgroundColor: "#1a1a1a",
              color: "white",
              minWidth: isMobile ? 'auto' : 400
            }
          }}
        >
          <DialogTitle>ChessDB Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "grey.400", mb: 1, display: "block" }}>
                  Available moves in this position: {actualMaxMoves}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Scores
                </Typography>
                <Switch
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Win Rates
                </Typography>
                <Switch
                  checked={showWinrates}
                  onChange={(e) => setShowWinrates(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
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

  // Show no data state with request analysis and refresh buttons
  if (!data || data.length === 0) {
    return (
      <Box>
        {/* Header */}
        <Paper
          sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: "#1a1a1a",
            borderRadius: 2,
            mb: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 2} flexWrap="wrap">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#9c27b0",
                }}
              />
              <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                ChessDB On
              </Typography>
            </Box>
            <Switch
              checked={chessDBEnabled}
              onChange={handleChessDBToggle}
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#9c27b0',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#9c27b0',
                },
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{ color: "white", p: 0.5 }}
              size="small"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>

        {/* No Data State with Action Buttons */}
        <Paper
          sx={{
            p: isMobile ? 2 : 4,
            backgroundColor: "#1a1a1a",
            borderRadius: 2,
            textAlign: "center"
          }}
        >
          <Typography variant="body2" sx={{ color: "grey.400", mb: 3, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
            {error ? `Error: ${error}` : "No ChessDB data found for this position."}
          </Typography>
          
          <Stack direction={isMobile ? "column" : "row"} spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              startIcon={queueing ? <CircularProgress size={16} /> : <Queue />}
              onClick={onRequestAnalysis}
              disabled={queueing}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
              sx={{
                borderColor: "#9c27b0",
                color: "#9c27b0",
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                "&:hover": {
                  borderColor: "#7b1fa2",
                  backgroundColor: "rgba(156, 39, 176, 0.1)",
                },
                "&:disabled": {
                  borderColor: "grey.600",
                  color: "grey.600",
                },
              }}
            >
              {queueing ? "Queueing..." : "Request Analysis"}
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRefresh}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
              sx={{
                backgroundColor: "#9c27b0",
                color: "white",
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                "&:hover": {
                  backgroundColor: "#7b1fa2",
                },
              }}
            >
              Refresh
            </Button>
          </Stack>
          
          <Typography variant="caption" sx={{ color: "grey.500", mt: 2, display: "block", fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
            Request analysis to queue this position for evaluation, then refresh to check for results.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: isMobile ? 1.5 : 2,
          backgroundColor: "#1a1a1a",
          borderRadius: 2,
          mb: 2
        }}
      >
        <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 2} sx={{ mb: 2 }} flexWrap="wrap">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#9c27b0",
              }}
            />
            <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              ChessDB On
            </Typography>
          </Box>
          <Switch
            checked={chessDBEnabled}
            onChange={handleChessDBToggle}
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#9c27b0',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#9c27b0',
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          {!isMobile && (
            <IconButton
              onClick={onRefresh}
              sx={{ color: "white", p: 0.5, mr: 1 }}
              size="small"
              title="Refresh data"
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ color: "white", p: 0.5 }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Database Info */}
        <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 2} sx={{ mb: 2 }} flexWrap="wrap">
          <Typography variant="body2" sx={{ color: "white", fontWeight: 500, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
            ChessDB Database
          </Typography>
          <Chip 
            label={`${data.length}`} 
            size="small" 
            sx={{ 
              backgroundColor: "rgba(156, 39, 176, 0.2)", 
              color: "#9c27b0",
              fontSize: isMobile ? '0.65rem' : '0.7rem',
              fontWeight: 600,
              height: isMobile ? 20 : 24
            }} 
          />
          <Typography variant="body2" sx={{ color: "white", fontWeight: 500, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
            Moves present
          </Typography>
          {isMobile && (
            <IconButton
              onClick={onRefresh}
              sx={{ color: "white", p: 0.5, ml: 'auto !important' }}
              size="small"
              title="Refresh data"
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {/* Column Headers - Hide on mobile */}
        {!isMobile && (
          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: "grey.400", minWidth: "80px" }}>
              Move
            </Typography>
            {showScores && (
              <Typography variant="caption" sx={{ color: "grey.400", minWidth: "60px" }}>
                Score
              </Typography>
            )}
            {showWinrates && (
              <Typography variant="caption" sx={{ color: "grey.400", minWidth: "60px" }}>
                Win %
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "grey.400", flex: 1 }}>
              Rank
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.400", flex: 1 }}>
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
              backgroundColor: "#1a1a1a",
              borderRadius: 0,
              borderLeft: index === 0 ? "3px solid #9c27b0" : "3px solid transparent",
              cursor: llmLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              "&:hover": {
                backgroundColor: llmLoading ? "#1a1a1a" : "rgba(156, 39, 176, 0.1)",
              },
              filter: llmLoading ? "grayscale(50%)" : "none",
            }}
          >
            {isMobile ? (
              // Mobile Layout - Stacked
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#9c27b0",
                      fontWeight: "bold",
                      fontFamily: "monospace",
                      fontSize: "0.85rem"
                    }}
                  >
                    {index + 1}. {move.san}
                  </Typography>
                  <Chip 
                    label={move.note}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(156, 39, 176, 0.2)",
                      color: "#9c27b0",
                      fontSize: "0.65rem",
                      height: 20
                    }}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {showScores && (
                    <Box>
                      <Typography variant="caption" sx={{ color: "grey.500", fontSize: "0.65rem" }}>
                        Score
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getScoreColor(move.score),
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          fontWeight: 500
                        }}
                      >
                        {move.score === "N/A" ? "—" : `${parseFloat(move.score) >= 0 ? '+' : ''}${move.score}`}
                      </Typography>
                    </Box>
                  )}
                  {showWinrates && (
                    <Box>
                      <Typography variant="caption" sx={{ color: "grey.500", fontSize: "0.65rem" }}>
                        Win %
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getWinrateColor(move.winrate),
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          fontWeight: 500
                        }}
                      >
                        {move.winrate === "N/A" ? "—" : `${move.winrate}%`}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: "grey.500", fontSize: "0.65rem" }}>
                      Rank
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "grey.400",
                        fontFamily: "monospace",
                        fontSize: "0.75rem"
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
                    color: "#9c27b0",
                    fontWeight: "bold",
                    minWidth: "80px",
                    fontFamily: "monospace",
                    fontSize: "0.9rem"
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
                      fontWeight: 500
                    }}
                  >
                    {move.score === "N/A" ? "—" : `${parseFloat(move.score) >= 0 ? '+' : ''}${move.score}`}
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
                      fontWeight: 500
                    }}
                  >
                    {move.winrate === "N/A" ? "—" : `${move.winrate}%`}
                  </Typography>
                )}

                {/* Rank */}
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    flex: 1
                  }}
                >
                  {move.rank}
                </Typography>

                {/* Note */}
                <Typography
                  variant="body2"
                  sx={{
                    color: "grey.400",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    flex: 1
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
          backgroundColor: "#1a1a1a",
          borderRadius: 0,
          mt: 0
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={isMobile ? 1 : 0}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Storage fontSize="small" sx={{ color: "#9c27b0" }} />
            <Typography variant="caption" sx={{ color: "grey.400", fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
              Data from ChessDB
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: "grey.400", fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
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
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: isMobile ? 'auto' : 400
          }
        }}
      >
        <DialogTitle>ChessDB Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "grey.400", mb: 1, display: "block" }}>
                Available moves in this position: {actualMaxMoves}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                Display Options
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show Scores
                  </Typography>
                  <Switch
                    checked={showScores}
                    onChange={(e) => setShowScores(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show Win Rates
                  </Typography>
                  <Switch
                    checked={showWinrates}
                    onChange={(e) => setShowWinrates(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose} sx={{ color: "#9c27b0" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hint */}
      <Box sx={{ mt: 2, px: isMobile ? 0.5 : 0 }}>
        <Typography
          variant="caption"
          sx={{ color: "grey.500", fontStyle: "italic", fontSize: isMobile ? '0.7rem' : '0.75rem' }}
        >
          💡 Click on any move above to get AI analysis of that candidate
        </Typography>
      </Box>
    </Box>
  );
}

export default ChessDBDisplay;