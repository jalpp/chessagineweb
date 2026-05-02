"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Lightbulb as HintIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as EyeIcon,
  EmojiEvents as TrophyIcon,
} from "@mui/icons-material";
import { Chess, Square } from "chess.js";
import { Chessboard, PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import type { PuzzleData } from "@/libs/puzzle/helper";

interface EmbeddedPuzzleProps {
  themes?: string[];
  ratingFrom?: number;
  ratingTo?: number;
  caption?: string;
}

export default function EmbeddedPuzzle({
  themes = [],
  ratingFrom = 1400,
  ratingTo = 1900,
  caption,
}: EmbeddedPuzzleProps) {
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [sanSolutionMoves, setSanSolutionMoves] = useState<string[]>([]);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showingSolution, setShowingSolution] = useState(false);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveSquares, setMoveSquares] = useState<Record<string, { background: string }>>({});
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, { background: string }>>({});
  const [wrongFlash, setWrongFlash] = useState(false);

  const convertMovesToSAN = useCallback((moves: string[], startFEN: string): string[] => {
    const tmp = new Chess(startFEN);
    return moves.flatMap((mv) => {
      try {
        const obj = tmp.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] });
        return obj ? [obj.san] : [];
      } catch {
        return [];
      }
    });
  }, []);

  const fetchPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowingSolution(false);
    setPuzzleComplete(false);
    setPuzzleFailed(false);
    setHintUsed(false);
    setShowHint(false);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveSquares({});
    setLastMoveSquares({});

    try {
      const params = new URLSearchParams();
      if (themes.length > 0) params.append("themes", themes.join(","));
      params.append("ratingFrom", String(ratingFrom));
      params.append("ratingTo", String(ratingTo));

      const res = await fetch(`/api/puzzle?${params}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      const data: PuzzleData = result.data;
      setPuzzleData(data);

      const newGame = new Chess(data.FEN);
      setGame(newGame);
      setFen(data.FEN);

      const moves = data.moves.split(" ");
      setSolutionMoves(moves);
      setCurrentSolutionIndex(0);
      setSanSolutionMoves(convertMovesToSAN(moves, data.FEN));
    } catch (e) {
      setError("Failed to load puzzle. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [themes, ratingFrom, ratingTo, convertMovesToSAN]);

  useEffect(() => { fetchPuzzle(); }, []);

  const highlightLastMove = useCallback((from: string, to: string) => {
    setLastMoveSquares({
      [from]: { background: "rgba(255, 200, 0, 0.4)" },
      [to]: { background: "rgba(255, 200, 0, 0.6)" },
    });
  }, []);

  const handleSquareClick = useCallback(({ square }: SquareHandlerArgs) => {
    if (puzzleComplete || puzzleFailed || showingSolution || !puzzleData) return;

    if (selectedSquare) {
      const expectedMove = solutionMoves[currentSolutionIndex];
      const from = expectedMove.slice(0, 2);
      const to = expectedMove.slice(2, 4);
      const promotion = expectedMove[4];

      if (selectedSquare === from && square === to) {
        try {
          const newGame = new Chess(game.fen());
          newGame.move({ from: selectedSquare, to: square, promotion: promotion || "q" });
          setGame(newGame);
          setFen(newGame.fen());
          highlightLastMove(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoves([]);
          setMoveSquares({});

          const nextIndex = currentSolutionIndex + 1;
          if (nextIndex >= solutionMoves.length) {
            setPuzzleComplete(true);
          } else {
            setCurrentSolutionIndex(nextIndex);
            setTimeout(() => {
              const opponentMove = solutionMoves[nextIndex];
              try {
                const g2 = new Chess(newGame.fen());
                g2.move({
                  from: opponentMove.slice(0, 2),
                  to: opponentMove.slice(2, 4),
                  promotion: opponentMove[4] || "q",
                });
                setGame(g2);
                setFen(g2.fen());
                highlightLastMove(opponentMove.slice(0, 2), opponentMove.slice(2, 4));
                setCurrentSolutionIndex(nextIndex + 1);
                if (nextIndex + 1 >= solutionMoves.length) setPuzzleComplete(true);
              } catch {}
            }, 400);
          }
        } catch {
          setWrongFlash(true);
          setTimeout(() => setWrongFlash(false), 600);
          setPuzzleFailed(true);
        }
      } else {
        // Wrong move
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 600);
        setPuzzleFailed(true);
        setSelectedSquare(null);
        setLegalMoves([]);
        setMoveSquares({});
      }
    } else {
      // Select piece
      const moves = game.moves({ square: square as Square, verbose: true });
      if (moves.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(moves.map((m) => m.to));
        const highlights: Record<string, { background: string }> = {
          [square]: { background: "rgba(100, 160, 255, 0.5)" },
        };
        moves.forEach((m) => {
          highlights[m.to] = { background: "rgba(100, 160, 255, 0.3)" };
        });
        setMoveSquares(highlights);
      }
    }
  }, [
    puzzleComplete, puzzleFailed, showingSolution, puzzleData,
    selectedSquare, solutionMoves, currentSolutionIndex, game, highlightLastMove,
  ]);

  const handlePieceDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (puzzleComplete || puzzleFailed || showingSolution || !puzzleData) return false;

    const expectedMove = solutionMoves[currentSolutionIndex];
    const from = expectedMove.slice(0, 2);
    const to = expectedMove.slice(2, 4);
    const promotion = expectedMove[4];

    if (sourceSquare === from && targetSquare === to) {
      try {
        const newGame = new Chess(game.fen());
        newGame.move({ from: sourceSquare, to: targetSquare, promotion: promotion || "q" });
        setGame(newGame);
        setFen(newGame.fen());
        highlightLastMove(sourceSquare, targetSquare);
        setSelectedSquare(null);
        setLegalMoves([]);
        setMoveSquares({});

        const nextIndex = currentSolutionIndex + 1;
        if (nextIndex >= solutionMoves.length) {
          setPuzzleComplete(true);
        } else {
          setCurrentSolutionIndex(nextIndex);
          setTimeout(() => {
            const opp = solutionMoves[nextIndex];
            try {
              const g2 = new Chess(newGame.fen());
              g2.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] || "q" });
              setGame(g2);
              setFen(g2.fen());
              highlightLastMove(opp.slice(0, 2), opp.slice(2, 4));
              setCurrentSolutionIndex(nextIndex + 1);
              if (nextIndex + 1 >= solutionMoves.length) setPuzzleComplete(true);
            } catch {}
          }, 400);
        }
        return true;
      } catch {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 600);
        setPuzzleFailed(true);
        return false;
      }
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 600);
      setPuzzleFailed(true);
      return false;
    }
  }, [
    puzzleComplete, puzzleFailed, showingSolution, puzzleData,
    solutionMoves, currentSolutionIndex, game, highlightLastMove,
  ]);

  const handleHint = () => {
    if (!puzzleData || puzzleComplete) return;
    setHintUsed(true);
    setShowHint(true);
    const move = solutionMoves[currentSolutionIndex];
    const from = move.slice(0, 2);
    setMoveSquares((prev) => ({ ...prev, [from]: { background: "rgba(255, 165, 0, 0.7)" } }));
  };

  const handleShowSolution = () => {
    if (!puzzleData) return;
    setShowingSolution(true);
    // Replay all moves from start
    const g = new Chess(puzzleData.FEN);
    solutionMoves.forEach((mv) => {
      try { g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || "q" }); } catch {}
    });
    setGame(g);
    setFen(g.fen());
    setMoveSquares({});
  };

  const orientation = puzzleData
    ? (puzzleData.FEN.split(" ")[1] === "w" ? "white" : "black")
    : "white";

  const combinedSquares = { ...lastMoveSquares, ...moveSquares };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1.5} py={2} color="text.secondary">
        <CircularProgress size={16} />
        <Typography variant="caption">Loading puzzle…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button size="small" onClick={fetchPuzzle}>Retry</Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: wrongFlash ? "error.main" : puzzleComplete ? "success.main" : "divider",
        borderRadius: 2,
        overflow: "hidden",
        maxWidth: 480,
        width: "100%",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <TrophyIcon fontSize="small" sx={{ color: "warning.main" }} />
        <Typography variant="caption" fontWeight={700} flex={1}>
          {caption ?? "Chess Puzzle"}
        </Typography>
        {puzzleData && (
          <Chip label={`★ ${puzzleData.rating}`} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
        )}
        {puzzleData?.themes.slice(0, 2).map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />
        ))}
      </Box>

      {/* Board */}
      <Box sx={{ position: "relative" }}>
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            squareStyles: combinedSquares,
            onSquareClick: handleSquareClick,
            onPieceDrop: handlePieceDrop,
            allowDragging: !puzzleComplete && !showingSolution,
          }}
        />

        {/* Overlay for complete/failed */}
        {(puzzleComplete || puzzleFailed) && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: puzzleComplete
                ? "rgba(46,125,50,0.15)"
                : "rgba(211,47,47,0.15)",
              pointerEvents: "none",
            }}
          >
            {puzzleComplete
              ? <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", opacity: 0.85 }} />
              : <CancelIcon sx={{ fontSize: 64, color: "error.main", opacity: 0.85 }} />
            }
          </Box>
        )}
      </Box>

      {/* Status + controls */}
      <Box sx={{ px: 1.5, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
        {puzzleComplete && (
          <Alert severity="success" sx={{ mb: 1, py: 0.5 }} icon={<CheckCircleIcon fontSize="small" />}>
            Solved!{hintUsed ? " (with hint)" : ""}
          </Alert>
        )}
        {puzzleFailed && !showingSolution && (
          <Alert severity="error" sx={{ mb: 1, py: 0.5 }} icon={<CancelIcon fontSize="small" />}>
            Incorrect move — see the solution below.
          </Alert>
        )}
        {showHint && !puzzleComplete && (
          <Alert severity="warning" sx={{ mb: 1, py: 0.5 }} icon={<HintIcon fontSize="small" />}>
            Hint: start from the highlighted square.
          </Alert>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {!puzzleComplete && !showingSolution && (
            <Tooltip title="Highlight the starting square">
              <span>
                <Button
                  size="small"
                  startIcon={<HintIcon />}
                  onClick={handleHint}
                  disabled={hintUsed || puzzleFailed}
                >
                  Hint
                </Button>
              </span>
            </Tooltip>
          )}
          {(puzzleFailed || puzzleComplete) && !showingSolution && (
            <Button size="small" startIcon={<EyeIcon />} onClick={handleShowSolution}>
              Solution
            </Button>
          )}
          <Box flex={1} />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchPuzzle}
            variant={puzzleComplete ? "contained" : "text"}
            color={puzzleComplete ? "success" : "inherit"}
          >
            Next Puzzle
          </Button>
        </Stack>

        {/* Solution move list */}
        {showingSolution && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Solution:{" "}
            </Typography>
            <Typography variant="caption" fontFamily="monospace">
              {sanSolutionMoves.join(" ")}
            </Typography>
            {puzzleData?.gameURL && (
              <Box mt={0.5}>
                <Typography
                  variant="caption"
                  component="a"
                  href={puzzleData.gameURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "primary.main" }}
                >
                  View original game ↗
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Side to move */}
        {puzzleData && !puzzleComplete && !showingSolution && (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {orientation === "white" ? "White" : "Black"} to move
          </Typography>
        )}
      </Box>
    </Box>
  );
}