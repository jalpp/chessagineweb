import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Download as DownloadIcon,
  Lightbulb as LightbulbIcon,
  OpenInNew as OpenIcon,
  Replay as ReplayIcon,
} from "@mui/icons-material";
import { Chess, type Square } from "chess.js";
import { Chessboard, PieceDropHandlerArgs } from "react-chessboard";
import { KeyPosition } from "@/libs/batchreview/types";
import { fetchChessDBFast } from "@/libs/batchreview/chessdb";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useSettings } from "@/context/SettingContext";
import { getCurrentThemeColors } from "@/libs/setting/helper";

interface BatchPuzzlePackProps {
  /** Blunder/mistake positions, worst drops first. */
  keyPositions: KeyPosition[];
  /** Engine used to resolve best moves when ChessDB has no entry. */
  engine: UciEngine | undefined;
  /** Opens the puzzle's source game in the full analyzer. */
  onOpenGame: (gameId: string) => void;
}

/** Resolved puzzle solution in both notations. */
interface PuzzleSolution {
  uci: string;
  san: string;
}

type PuzzleStatus = "loading" | "solving" | "correct" | "revealed";

function escapeCsvValue(value: string | number | undefined): string {
  const text = String(value ?? "").replace(/\r\n/g, "\n");
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Parses a best-move hint (SAN from Lichess judgments or bare UCI) into a
 * solution. @returns null when the hint doesn't produce a legal move.
 */
function parseSolutionHint(fen: string, hint: string): PuzzleSolution | null {
  const board = new Chess(fen);
  // Try SAN first (Lichess `variation` tokens are SAN)
  try {
    const move = board.move(hint);
    if (move) {
      return {
        uci: move.from + move.to + (move.promotion || ""),
        san: move.san,
      };
    }
  } catch {
    // Fall through to UCI parsing
  }
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(hint)) {
    try {
      const move = new Chess(fen).move({
        from: hint.slice(0, 2) as Square,
        to: hint.slice(2, 4) as Square,
        promotion: hint.slice(4) || undefined,
      });
      if (move) {
        return {
          uci: move.from + move.to + (move.promotion || ""),
          san: move.san,
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

function isSameMoveAsPlayed(
  fen: string,
  playedSan: string,
  candidate: PuzzleSolution
): boolean {
  const actualMove = parseSolutionHint(fen, playedSan);
  return Boolean(
    actualMove &&
      (candidate.uci === actualMove.uci || candidate.san === actualMove.san)
  );
}

/**
 * Puzzle pack built from the user's own blunders and mistakes.
 * Each puzzle shows the position before the bad move — the user must find
 * the move that avoids it. Solutions come from Lichess judgments when
 * available, then ChessDB, then a local engine search.
 */
const BatchPuzzlePack: React.FC<BatchPuzzlePackProps> = React.memo(
  ({ keyPositions, engine, onOpenGame }) => {
    const [index, setIndex] = useState(0);
    const [status, setStatus] = useState<PuzzleStatus>("loading");
    const [solution, setSolution] = useState<PuzzleSolution | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [displayFen, setDisplayFen] = useState<string | null>(null);
    const [solved, setSolved] = useState<Set<number>>(new Set());

    const { boardTheme } = useSettings();
    const themeColors = getCurrentThemeColors(boardTheme);

    const puzzle = keyPositions[index];
    const sideToMove = useMemo(
      () => (puzzle ? (puzzle.fen.split(" ")[1] === "b" ? "black" : "white") : "white"),
      [puzzle]
    );

    /** Resolves the best move for the current puzzle: hint → ChessDB → engine. */
    const resolveSolution = useCallback(
      async (position: KeyPosition): Promise<PuzzleSolution | null> => {
        const returnIfValid = (candidate: PuzzleSolution | null) => {
          if (!candidate) return null;
          return isSameMoveAsPlayed(position.fen, position.playedSan, candidate)
            ? null
            : candidate;
        };

        if (position.bestMove) {
          const parsed = parseSolutionHint(position.fen, position.bestMove);
          const valid = returnIfValid(parsed);
          if (valid) return valid;
        }

        const dbMoves = await fetchChessDBFast(position.fen);
        if (dbMoves.length > 0 && dbMoves[0].uci !== "N/A") {
          const parsed = parseSolutionHint(position.fen, dbMoves[0].uci);
          const valid = returnIfValid(parsed);
          if (valid) return valid;
        }

        if (engine) {
          const analysis = await engine.evaluatePositionWithUpdate({
            fen: position.fen,
            depth: 16,
            multiPv: 1,
          });
          if (analysis.bestMove) {
            const parsed = parseSolutionHint(position.fen, analysis.bestMove);
            const valid = returnIfValid(parsed);
            if (valid) return valid;
          }
        }
        return null;
      },
      [engine]
    );

    // Resolve the solution whenever the puzzle changes
    useEffect(() => {
      if (!puzzle) return;
      let cancelled = false;
      setStatus("loading");
      setSolution(null);
      setFeedback(null);
      setDisplayFen(puzzle.fen);

      void resolveSolution(puzzle).then((resolved) => {
        if (cancelled) return;
        setSolution(resolved);
        setStatus("solving");
        if (!resolved) {
          setFeedback("Couldn't determine a clear best move — explore freely");
        }
      });

      return () => {
        cancelled = true;
      };
    }, [puzzle, resolveSolution]);

    const goTo = useCallback(
      (next: number) => {
        if (next < 0 || next >= keyPositions.length) return;
        setIndex(next);
      },
      [keyPositions.length]
    );

    const handleDownloadCsv = useCallback(() => {
      if (keyPositions.length === 0) return;

      const rows = [
        [
          "gameId",
          "moveLabel",
          "quality",
          "playedSan",
          "bestMove",
          "winRateDrop",
          "fen",
        ],
        ...keyPositions.map((position) => [
          position.gameId,
          position.moveLabel,
          position.quality,
          position.playedSan,
          position.bestMove ?? "",
          position.winRateDrop,
          position.fen,
        ]),
      ];

      const csv = rows
        .map((row) => row.map((value) => escapeCsvValue(String(value))).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `puzzle-pack-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }, [keyPositions]);

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

        const playedUci = move.from + move.to + (move.promotion || "");

        if (solution && (playedUci === solution.uci || move.san === solution.san)) {
          const playedMove = parseSolutionHint(puzzle.fen, puzzle.playedSan);
          const isSameAsPlayed =
            playedMove &&
            (playedUci === playedMove.uci || move.san === playedMove.san);

          if (isSameAsPlayed) {
            setFeedback(
              "The analysis does not show a better move here — this entry appears to be a non-blunder or a mate line."
            );
            return false;
          }

          setDisplayFen(board.fen());
          setStatus("correct");
          setFeedback(`${solution.san} avoids the ${puzzle.quality.toLowerCase()}!`);
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
      [status, puzzle, solution, index]
    );

    const handleReveal = useCallback(() => {
      if (!puzzle || !solution) return;
      const board = new Chess(puzzle.fen);
      try {
        board.move(solution.san);
        setDisplayFen(board.fen());
      } catch {
        // Keep the pre-move position if the SAN somehow fails
      }
      setStatus("revealed");
      setFeedback(`Best was ${solution.san} — you played ${puzzle.playedSan}`);
    }, [puzzle, solution]);

    const handleRetry = useCallback(() => {
      if (!puzzle) return;
      setDisplayFen(puzzle.fen);
      setStatus("solving");
      setFeedback(null);
    }, [puzzle]);

    if (keyPositions.length === 0) {
      return (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Puzzle Pack
          </Typography>
          <Typography color="text.secondary">
            No blunders or mistakes found in these games — clean play!
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
          mb={1}
        >
          <Box>
            <Typography variant="h6" color="text.primary">
              Puzzle Pack
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Positions from your games, worst drops first — find the move
              that avoids your {keyPositions[0].quality.toLowerCase()}s
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCsv}
            >
              Download CSV
            </Button>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${solved.size} / ${keyPositions.length} solved`}
              color={solved.size === keyPositions.length ? "success" : "default"}
              variant="outlined"
            />
          </Stack>
        </Box>

        <LinearProgress
          variant="determinate"
          value={(solved.size / keyPositions.length) * 100}
          sx={{ mb: 2, borderRadius: 2 }}
        />

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 440px) 1fr" },
            alignItems: "start",
          }}
        >
          <Box sx={{ position: "relative" }}>
            <Chessboard
              options={{
                position: displayFen ?? puzzle.fen,
                boardOrientation: sideToMove,
                onPieceDrop: onDrop,
                allowDragging: status === "solving",
                darkSquareStyle: {
                  backgroundColor: themeColors.darkSquareColor,
                },
                lightSquareStyle: {
                  backgroundColor: themeColors.lightSquareColor,
                },
                id: "agine-puzzle-pack",
              }}
            />
            {status === "loading" && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(0,0,0,0.4)",
                }}
              >
                <CircularProgress size={32} />
              </Box>
            )}
          </Box>

          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                label={puzzle.quality}
                color={puzzle.quality === "Blunder" ? "error" : "warning"}
                size="small"
              />
              <Typography fontWeight={700}>
                {sideToMove === "white" ? "White" : "Black"} to move
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Puzzle {index + 1} of {keyPositions.length}
              </Typography>
            </Box>

            <Typography fontSize="0.9rem" color="text.secondary">
              In the game you played{" "}
              <strong>
                {puzzle.moveLabel} {puzzle.playedSan}
              </strong>
              , losing {puzzle.winRateDrop}% win rate. Find the better move.
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
                sx={{ py: 0.5 }}
              >
                {feedback}
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {status === "solving" && solution && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LightbulbIcon />}
                  onClick={handleReveal}
                >
                  Show solution
                </Button>
              )}
              {(status === "correct" || status === "revealed") && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ReplayIcon />}
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              )}
              <Tooltip title="Open this game in the full analyzer">
                <Button
                  size="small"
                  startIcon={<OpenIcon />}
                  onClick={() => onOpenGame(puzzle.gameId)}
                >
                  Open game
                </Button>
              </Tooltip>
            </Stack>

            <Box display="flex" alignItems="center" gap={1}>
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
              {status === "correct" && index < keyPositions.length - 1 && (
                <Button
                  size="small"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => goTo(index + 1)}
                >
                  Next puzzle
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
      </Paper>
    );
  }
);

BatchPuzzlePack.displayName = "BatchPuzzlePack";

export default BatchPuzzlePack;
