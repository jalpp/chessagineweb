"use client";

import { useCallback, useState } from "react";
import { Box, Typography, Chip, IconButton, Tooltip, Stack } from "@mui/material";
import { Chess, Square } from "chess.js";
import { Chessboard, PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import { Lightbulb, Eye, RotateCcw, Star } from "lucide-react";
import type { PuzzleData } from "@/libs/puzzle/helper";

interface PuzzleFeedCardProps {
  puzzle: PuzzleData;
  active: boolean;
  boardSizePx: number;
  onSolved: (success: boolean) => void;
}

export default function PuzzleFeedCard({
  puzzle,
  boardSizePx,
  onSolved,
}: PuzzleFeedCardProps) {
  const [game, setGame] = useState(() => new Chess(puzzle.FEN));
  const [fen, setFen] = useState(puzzle.FEN);
  const [solutionMoves] = useState(() => puzzle.moves.split(" "));
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveSquares, setMoveSquares] = useState<Record<string, { background: string }>>({});
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showingSolution, setShowingSolution] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const orientation = puzzle.FEN.split(" ")[1] === "w" ? "white" : "black";

  const highlightMove = useCallback((from: string, to: string) => {
    setMoveSquares({
      [from]: { background: "rgba(255, 200, 0, 0.4)" },
      [to]: { background: "rgba(255, 200, 0, 0.6)" },
    });
  }, []);

  const playExpectedMove = useCallback(
    (from: string, to: string) => {
      const promotion = solutionMoves[currentSolutionIndex][4];
      try {
        const newGame = new Chess(game.fen());
        newGame.move({ from, to, promotion: promotion || "q" });
        setGame(newGame);
        setFen(newGame.fen());
        highlightMove(from, to);
        setSelectedSquare(null);
        setLegalMoves([]);

        const nextIndex = currentSolutionIndex + 1;
        if (nextIndex >= solutionMoves.length) {
          setPuzzleComplete(true);
          onSolved(true);
          return;
        }
        setCurrentSolutionIndex(nextIndex);
        setTimeout(() => {
          const opp = solutionMoves[nextIndex];
          try {
            const g2 = new Chess(newGame.fen());
            g2.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] || "q" });
            setGame(g2);
            setFen(g2.fen());
            highlightMove(opp.slice(0, 2), opp.slice(2, 4));
            const afterOpponentIndex = nextIndex + 1;
            setCurrentSolutionIndex(afterOpponentIndex);
            if (afterOpponentIndex >= solutionMoves.length) {
              setPuzzleComplete(true);
              onSolved(true);
            }
          } catch {
            // Opponent reply failed to apply — leave the board as-is.
          }
        }, 400);
      } catch {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 600);
        setPuzzleFailed(true);
        onSolved(false);
      }
    },
    [game, currentSolutionIndex, solutionMoves, highlightMove, onSolved],
  );

  const flagWrongMove = useCallback(() => {
    setWrongFlash(true);
    setTimeout(() => setWrongFlash(false), 600);
    setPuzzleFailed(true);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveSquares({});
    onSolved(false);
  }, [onSolved]);

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return;

      if (selectedSquare) {
        const expected = solutionMoves[currentSolutionIndex];
        const from = expected.slice(0, 2);
        const to = expected.slice(2, 4);
        if (selectedSquare === from && square === to) {
          playExpectedMove(selectedSquare, square);
        } else {
          flagWrongMove();
        }
        return;
      }

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
    },
    [
      puzzleComplete,
      puzzleFailed,
      showingSolution,
      selectedSquare,
      solutionMoves,
      currentSolutionIndex,
      game,
      playExpectedMove,
      flagWrongMove,
    ],
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (puzzleComplete || puzzleFailed || showingSolution || !targetSquare) return false;
      const expected = solutionMoves[currentSolutionIndex];
      const from = expected.slice(0, 2);
      const to = expected.slice(2, 4);
      if (sourceSquare === from && targetSquare === to) {
        playExpectedMove(sourceSquare, targetSquare);
        return true;
      }
      flagWrongMove();
      return false;
    },
    [puzzleComplete, puzzleFailed, showingSolution, solutionMoves, currentSolutionIndex, playExpectedMove, flagWrongMove],
  );

  const handleHint = () => {
    if (puzzleComplete || hintUsed) return;
    setHintUsed(true);
    setShowHint(true);
    const from = solutionMoves[currentSolutionIndex].slice(0, 2);
    setMoveSquares((prev) => ({ ...prev, [from]: { background: "rgba(255, 165, 0, 0.7)" } }));
    setTimeout(() => setShowHint(false), 3000);
  };

  const handleShowSolution = () => {
    setShowingSolution(true);
    const g = new Chess(puzzle.FEN);
    solutionMoves.forEach((mv) => {
      try {
        g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || "q" });
      } catch {
        // Ignore malformed solution moves — best-effort replay.
      }
    });
    setGame(g);
    setFen(g.fen());
    setMoveSquares({});
  };

  const handleReset = () => {
    setGame(new Chess(puzzle.FEN));
    setFen(puzzle.FEN);
    setCurrentSolutionIndex(0);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveSquares({});
    setPuzzleComplete(false);
    setPuzzleFailed(false);
    setHintUsed(false);
    setShowHint(false);
    setShowingSolution(false);
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100%",
        flexShrink: 0,
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 12, left: 12 }}>
        <Chip icon={<Star size={16} />} label={`Rating ${puzzle.rating}`} size="small" color="primary" />
        {puzzle.themes.slice(0, 2).map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Stack>

      <Box
        sx={{
          border: "2px solid",
          borderColor: wrongFlash ? "error.main" : puzzleComplete ? "success.main" : "divider",
          borderRadius: 2,
          overflow: "hidden",
          transition: "border-color 0.2s",
          width: boardSizePx,
          height: boardSizePx,
        }}
      >
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            squareStyles: moveSquares,
            onSquareClick: handleSquareClick,
            onPieceDrop: handlePieceDrop,
            allowDragging: !puzzleComplete && !showingSolution,
          }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        {showingSolution
          ? "Viewing solution"
          : puzzleComplete
            ? hintUsed
              ? "Solved (hint used) — scroll for the next one"
              : "Solved! Scroll for the next one"
            : puzzleFailed
              ? "Wrong move — view the solution or scroll on"
              : `${orientation === "white" ? "White" : "Black"} to move`}
      </Typography>

      <Stack
        direction="column"
        spacing={1.5}
        sx={{ position: "absolute", right: 12, bottom: "18%" }}
      >
        <Tooltip title="Hint" placement="left">
          <span>
            <IconButton
              size="large"
              onClick={handleHint}
              disabled={puzzleComplete || hintUsed}
              sx={{ bgcolor: "action.hover" }}
            >
              <Lightbulb size={22} />
            </IconButton>
          </span>
        </Tooltip>
        {(puzzleFailed || puzzleComplete) && !showingSolution && (
          <Tooltip title="Solution" placement="left">
            <IconButton size="large" onClick={handleShowSolution} sx={{ bgcolor: "action.hover" }}>
              <Eye size={22} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Reset" placement="left">
          <IconButton size="large" onClick={handleReset} sx={{ bgcolor: "action.hover" }}>
            <RotateCcw size={22} />
          </IconButton>
        </Tooltip>
      </Stack>

      {showHint && (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ position: "absolute", bottom: "10%" }}
        >
          Hint: start from the highlighted square
        </Typography>
      )}
    </Box>
  );
}
