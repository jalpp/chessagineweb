import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Lightbulb as LightbulbIcon,
  OpenInNew as OpenIcon,
  Replay as ReplayIcon,
} from "@mui/icons-material";
import { Chess, type Square } from "chess.js";
import { Chessboard, PieceDropHandlerArgs } from "react-chessboard";
import { KeyPosition } from "@/libs/batchreview/types";
import { useSettings } from "@/context/SettingContext";
import { getCurrentThemeColors } from "@/libs/setting/helper";

interface BatchPuzzlePackProps {
  /** Verified puzzles: best move resolved and different from the played move. */
  keyPositions: KeyPosition[];
  /** Opens the puzzle's source game in the full analyzer. */
  onOpenGame: (gameId: string) => void;
}

type PuzzleStatus = "solving" | "correct" | "revealed";

/**
 * Puzzle board panel built from the user's verified blunders and mistakes.
 * Designed for the analyzer's board column: big board on top, prompt,
 * feedback and navigation beneath. Every puzzle's solution (bestMove SAN)
 * is pre-validated by useBatchReview, so solving is fully offline.
 */
const BatchPuzzlePack: React.FC<BatchPuzzlePackProps> = React.memo(
  ({ keyPositions, onOpenGame }) => {
    const [index, setIndex] = useState(0);
    const [status, setStatus] = useState<PuzzleStatus>("solving");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [displayFen, setDisplayFen] = useState<string | null>(null);
    const [solved, setSolved] = useState<Set<number>>(new Set());

    const { boardTheme } = useSettings();
    const themeColors = getCurrentThemeColors(boardTheme);

    const puzzle = keyPositions[index];
    const sideToMove = useMemo(
      () =>
        puzzle
          ? puzzle.fen.split(" ")[1] === "b"
            ? "black"
            : "white"
          : "white",
      [puzzle]
    );

    // Reset the board state whenever the puzzle changes
    useEffect(() => {
      if (!puzzle) return;
      setStatus("solving");
      setFeedback(null);
      setDisplayFen(puzzle.fen);
    }, [puzzle]);

    const goTo = useCallback(
      (next: number) => {
        if (next < 0 || next >= keyPositions.length) return;
        setIndex(next);
      },
      [keyPositions.length]
    );

    const onDrop = useCallback(
      ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
        if (status !== "solving" || !puzzle || !sourceSquare || !targetSquare)
          return false;

        const board = new Chess(puzzle.fen);
        let move;
        try {
          move = board.move({
            from: sourceSquare as Square,
            to: targetSquare as Square,
            promotion: "q",
          });
        } catch {
          return false;
        }
        if (!move) return false;

        if (move.san === puzzle.bestMove) {
          setDisplayFen(board.fen());
          setStatus("correct");
          setFeedback(
            `${move.san} avoids the ${puzzle.quality.toLowerCase()}!`
          );
          setSolved((prev) => new Set(prev).add(index));
          return true;
        }

        if (move.san === puzzle.playedSan) {
          setFeedback(
            `${move.san} is the move you played in the game — it dropped ${puzzle.winRateDrop}% win rate. Try another!`
          );
          return false;
        }

        setFeedback(`${move.san} isn't the engine's choice here — try again`);
        return false;
      },
      [status, puzzle, index]
    );

    const handleReveal = useCallback(() => {
      if (!puzzle?.bestMove) return;
      const board = new Chess(puzzle.fen);
      try {
        board.move(puzzle.bestMove);
        setDisplayFen(board.fen());
      } catch {
        // Keep the pre-move position if the SAN somehow fails
      }
      setStatus("revealed");
      setFeedback(`Best was ${puzzle.bestMove} — you played ${puzzle.playedSan}`);
    }, [puzzle]);

    const handleRetry = useCallback(() => {
      if (!puzzle) return;
      setDisplayFen(puzzle.fen);
      setStatus("solving");
      setFeedback(null);
    }, [puzzle]);

    if (keyPositions.length === 0) {
      return (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Puzzle Pack
          </Typography>
          <Typography color="text.secondary">
            No verified blunders or mistakes in these games — clean play!
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={2}
        sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, overflow: "hidden" }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          mb={1}
        >
          <Typography variant="h6" fontWeight={700}>
            Puzzle Pack
          </Typography>
          <Chip
            icon={<CheckCircleIcon />}
            label={`${solved.size} / ${keyPositions.length}`}
            color={solved.size === keyPositions.length ? "success" : "default"}
            variant="outlined"
            size="small"
          />
        </Box>

        <LinearProgress
          variant="determinate"
          value={(solved.size / keyPositions.length) * 100}
          sx={{ mb: 1.5, borderRadius: 2 }}
        />

        <Box
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <Chessboard
            options={{
              position: displayFen ?? puzzle.fen,
              boardOrientation: sideToMove,
              onPieceDrop: onDrop,
              allowDragging: status === "solving",
              darkSquareStyle: { backgroundColor: themeColors.darkSquareColor },
              lightSquareStyle: {
                backgroundColor: themeColors.lightSquareColor,
              },
              id: "agine-puzzle-pack",
            }}
          />
        </Box>

        <Stack spacing={1.5} mt={1.5}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip
              label={puzzle.quality}
              color={puzzle.quality === "Blunder" ? "error" : "warning"}
              size="small"
            />
            <Typography fontWeight={700} fontSize="0.95rem">
              {sideToMove === "white" ? "White" : "Black"} to move
            </Typography>
          </Box>

          <Typography fontSize="0.85rem" color="text.secondary">
            You played{" "}
            <strong>
              {puzzle.moveLabel} {puzzle.playedSan}
            </strong>{" "}
            here, losing {puzzle.winRateDrop}% win rate. Find the better move.
          </Typography>

          {feedback && (
            <Alert
              severity={
                status === "correct"
                  ? "success"
                  : status === "revealed"
                  ? "info"
                  : "warning"
              }
              sx={{ py: 0.25 }}
            >
              {feedback}
            </Alert>
          )}

          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconButton
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                size="small"
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                {index + 1} / {keyPositions.length}
              </Typography>
              <IconButton
                onClick={() => goTo(index + 1)}
                disabled={index === keyPositions.length - 1}
                size="small"
              >
                <ArrowForwardIcon />
              </IconButton>
            </Box>

            <Box display="flex" gap={1}>
              {status === "solving" && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LightbulbIcon />}
                  onClick={handleReveal}
                >
                  Solution
                </Button>
              )}
              {(status === "correct" || status === "revealed") &&
                (index < keyPositions.length - 1 ? (
                  <Button
                    size="small"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => goTo(index + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ReplayIcon />}
                    onClick={handleRetry}
                  >
                    Retry
                  </Button>
                ))}
              <Tooltip title="Open this game in the full analyzer">
                <IconButton size="small" onClick={() => onOpenGame(puzzle.gameId)}>
                  <OpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      </Paper>
    );
  }
);

BatchPuzzlePack.displayName = "BatchPuzzlePack";

export default BatchPuzzlePack;
