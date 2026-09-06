"use client";

import { useCallback, useMemo, useState } from "react";
import { Box, Chip, IconButton, Tooltip, Stack } from "@mui/material";
import { Chess, Square } from "chess.js";
import { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import { Lightbulb, Eye, RotateCcw, Star, SkipBack, SkipForward } from "lucide-react";
import type { PuzzleData } from "@/libs/puzzle/helper";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/hooks/useAgine";

interface PuzzleFeedCardProps {
  puzzle: PuzzleData;
  active: boolean;
  onSolved: (success: boolean) => void;
}

export default function PuzzleFeedCard({ puzzle, active, onSolved }: PuzzleFeedCardProps) {
  const [game, setGame] = useState(() => new Chess(puzzle.FEN));
  const [fen, setFen] = useState(puzzle.FEN);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>({});

  const [solutionMoves] = useState(() => puzzle.moves.split(" "));
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  const [showingSolution, setShowingSolution] = useState(false);
  const [solutionViewIndex, setSolutionViewIndex] = useState(0);
  const [solutionGameState, setSolutionGameState] = useState<Chess | null>(null);

  const side = puzzle.FEN.split(" ")[1] === "w" ? "white" : "black";

  // Engine only needs to be live for the card currently in view — the feed
  // can hold several fetched-ahead puzzles at once and puzzle mode doesn't
  // render an analysis panel, so there's no reason to spin up a Stockfish
  // instance per card.
  const {
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    llmLoading,
    stockfishLoading,
    openingLoading,
    engine,
    analyzeWithStockfish,
  } = useAgine(fen, "puzzle", false, undefined, "play", active);

  // ── Solving logic — ported from the classic puzzle page so scroll and
  // classic mode share identical move validation / hint / solution behavior.
  const onDrop = useCallback(
    (args: PieceDropHandlerArgs) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return false;
      try {
        const gameCopy = new Chess(fen);
        const source = args.sourceSquare;
        const target = args.targetSquare;
        if (!source || !target) return false;

        const move = gameCopy.move({ from: source, to: target, promotion: "q" });
        if (!move) return false;
        const moveNotation = move.from + move.to + (move.promotion || "");
        const expectedMove = solutionMoves[currentSolutionIndex];

        if (moveNotation === expectedMove) {
          setGame(gameCopy);
          setFen(gameCopy.fen());
          setMoveSquares({
            [source]: "rgba(155, 199, 0, 0.41)",
            [target]: "rgba(155, 199, 0, 0.41)",
          });

          if (currentSolutionIndex === solutionMoves.length - 1) {
            setPuzzleComplete(true);
            onSolved(true);
          } else {
            setTimeout(() => {
              const nextMove = solutionMoves[currentSolutionIndex + 1];
              if (nextMove) {
                const opponentMove = gameCopy.move({
                  from: nextMove.substring(0, 2),
                  to: nextMove.substring(2, 4),
                  promotion: nextMove.substring(4) || undefined,
                });
                if (opponentMove) {
                  setGame(new Chess(gameCopy.fen()));
                  setFen(gameCopy.fen());
                  setCurrentSolutionIndex(currentSolutionIndex + 2);
                }
              }
            }, 500);
          }
        } else {
          setPuzzleFailed(true);
          setMoveSquares({
            [source]: "rgba(255, 0, 0, 0.41)",
            [target]: "rgba(255, 0, 0, 0.41)",
          });
          onSolved(false);
        }
        return true;
      } catch {
        return false;
      }
    },
    [fen, solutionMoves, currentSolutionIndex, puzzleComplete, puzzleFailed, showingSolution, onSolved],
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return;
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      if (selectedSquare && legalMoves.includes(square)) {
        const chessPiece = game.get(selectedSquare as Square);
        onDrop({
          piece: {
            isSparePiece: false,
            position: selectedSquare,
            pieceType: chessPiece ? `${chessPiece.color}${chessPiece.type.toUpperCase()}` : "wP",
          },
          sourceSquare: selectedSquare,
          targetSquare: square,
        });
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      const chessPiece = game.get(square as Square);
      if (!chessPiece || chessPiece.color !== game.turn()) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      const moves = game.moves({ square: square as Square, verbose: true });
      setSelectedSquare(square);
      setLegalMoves(moves.map((m) => m.to));
    },
    [selectedSquare, legalMoves, game, onDrop, puzzleComplete, puzzleFailed, showingSolution],
  );

  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {};
    Object.entries(moveSquares).forEach(([square, color]) => {
      styles[square] = { backgroundColor: color };
    });
    if (selectedSquare && !showingSolution) {
      styles[selectedSquare] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    }
    if (!showingSolution) {
      legalMoves.forEach((square) => {
        const piece = game.get(square as Square);
        const backgroundImage = piece
          ? "radial-gradient(circle, rgba(255,0,0,0.8) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)";
        styles[square] = { ...styles[square], backgroundImage };
      });
    }
    return styles;
  }, [moveSquares, selectedSquare, legalMoves, game, showingSolution]);

  const showHintMove = useCallback(() => {
    if (!solutionMoves[currentSolutionIndex] || showingSolution) return;
    const move = solutionMoves[currentSolutionIndex];
    setMoveSquares({
      [move.substring(0, 2)]: "rgba(255, 215, 0, 0.6)",
      [move.substring(2, 4)]: "rgba(255, 215, 0, 0.6)",
    });
    setHintUsed(true);
    setTimeout(() => {
      setMoveSquares({});
    }, 3000);
  }, [solutionMoves, currentSolutionIndex, showingSolution]);

  const showSolution = useCallback(() => {
    setShowingSolution(true);
    setSolutionViewIndex(0);
    const solutionGame = new Chess(puzzle.FEN);
    setSolutionGameState(solutionGame);
    setGame(solutionGame);
    setFen(solutionGame.fen());
    setMoveSquares({});
  }, [puzzle.FEN]);

  const navigateSolution = useCallback(
    (direction: "prev" | "next") => {
      if (!solutionGameState) return;
      if (direction === "next" && solutionViewIndex < solutionMoves.length) {
        const move = solutionMoves[solutionViewIndex];
        const newGame = new Chess(solutionGameState.fen());
        try {
          const moveObj = newGame.move({
            from: move.substring(0, 2),
            to: move.substring(2, 4),
            promotion: move.substring(4) || undefined,
          });
          if (moveObj) {
            setSolutionGameState(newGame);
            setGame(newGame);
            setFen(newGame.fen());
            setSolutionViewIndex(solutionViewIndex + 1);
            setMoveSquares({
              [moveObj.from]: "rgba(155, 199, 0, 0.41)",
              [moveObj.to]: "rgba(155, 199, 0, 0.41)",
            });
          }
        } catch {
          // Ignore malformed solution moves — stop advancing.
        }
      } else if (direction === "prev" && solutionViewIndex > 0) {
        const newGame = new Chess(puzzle.FEN);
        const targetIndex = solutionViewIndex - 1;
        for (let i = 0; i < targetIndex; i++) {
          const move = solutionMoves[i];
          try {
            newGame.move({
              from: move.substring(0, 2),
              to: move.substring(2, 4),
              promotion: move.substring(4) || undefined,
            });
          } catch {
            break;
          }
        }
        setSolutionGameState(newGame);
        setGame(newGame);
        setFen(newGame.fen());
        setSolutionViewIndex(targetIndex);
        if (targetIndex > 0) {
          const lastMove = solutionMoves[targetIndex - 1];
          setMoveSquares({
            [lastMove.substring(0, 2)]: "rgba(155, 199, 0, 0.41)",
            [lastMove.substring(2, 4)]: "rgba(155, 199, 0, 0.41)",
          });
        } else {
          setMoveSquares({});
        }
      }
    },
    [puzzle.FEN, solutionGameState, solutionViewIndex, solutionMoves],
  );

  const exitSolutionView = useCallback(() => {
    setShowingSolution(false);
    setSolutionViewIndex(0);
    setSolutionGameState(null);
    const newGame = new Chess(puzzle.FEN);
    setGame(newGame);
    setFen(puzzle.FEN);
    setMoveSquares({});
  }, [puzzle.FEN]);

  const resetPuzzle = useCallback(() => {
    const newGame = new Chess(puzzle.FEN);
    setGame(newGame);
    setFen(puzzle.FEN);
    setCurrentSolutionIndex(0);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveSquares({});
    setPuzzleComplete(false);
    setPuzzleFailed(false);
    setHintUsed(false);
    setShowingSolution(false);
    setSolutionViewIndex(0);
    setSolutionGameState(null);
  }, [puzzle.FEN]);

  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100%",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Centered, capped-width column so the layout is identical on mobile
          and desktop — just larger on desktop instead of a different
          treatment. The group (board + row) sizes to its own content and
          is centered as a block, so the row always sits directly under
          wherever the board actually ends instead of trailing behind
          leftover flex space. */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 560,
          mx: "auto",
        }}
      >
        {/* aspectRatio gives this box a real, immediately-known height
            (derived from its width) instead of an auto/content-sized one.
            AiChessboardPanel's own root sets height:"100%" internally to
            size the board via ResizeObserver — without a definite height
            here for that to resolve against, it collapses to auto and
            shrinks every measurement cycle (converging on the floor size)
            instead of landing on the actual Board Size setting. */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 560,
            aspectRatio: "1",
            mx: "auto",
          }}
        >
          <AiChessboardPanel
            key={puzzle.lichessId}
            boardId={`puzzle-feed-${puzzle.lichessId}`}
            interactive={active}
            game={game}
            fen={fen}
            moveSquares={moveSquares}
            setMoveSquares={setMoveSquares}
            engine={engine}
            puzzleMode={true}
            onDropPuzzle={onDrop}
            handleSquarePuzzleClick={handleSquareClick}
            setFen={setFen}
            setGame={setGame}
            setStockfishAnalysisResult={setStockfishAnalysisResult}
            analyzeWithStockfish={analyzeWithStockfish}
            puzzleCustomSquareStyle={customSquareStyles}
            llmLoading={llmLoading}
            side={side}
            stockfishLoading={stockfishLoading}
            stockfishAnalysisResult={stockfishAnalysisResult}
            openingLoading={openingLoading}
          />
        </Box>

        {/* Just the rating and the puzzle controls, directly below the
            board — nothing else in the feed card. */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%", px: 2, py: 1.5 }}
        >
          <Chip icon={<Star size={16} />} label={`Rating ${puzzle.rating}`} size="small" color="primary" />

          <Stack direction="row" spacing={0.5}>
            {showingSolution ? (
              <>
                <Tooltip title="Previous">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => navigateSolution("prev")}
                      disabled={solutionViewIndex === 0}
                    >
                      <SkipBack size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Next">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => navigateSolution("next")}
                      disabled={solutionViewIndex >= solutionMoves.length}
                    >
                      <SkipForward size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Exit solution">
                  <IconButton size="small" onClick={exitSolutionView} sx={{ color: "warning.main" }}>
                    <RotateCcw size={18} />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Hint">
                  <span>
                    <IconButton size="small" onClick={showHintMove} disabled={puzzleComplete || hintUsed}>
                      <Lightbulb size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                {puzzleFailed && (
                  <Tooltip title="Solution">
                    <IconButton size="small" onClick={showSolution}>
                      <Eye size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Reset">
                  <IconButton size="small" onClick={resetPuzzle}>
                    <RotateCcw size={18} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
