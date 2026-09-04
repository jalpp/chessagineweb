"use client";
import { usePageReady } from "@/hooks/usePageReady";

import { useState } from "react";
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Drawer,
  IconButton,
  Collapse,
  Fab,
  useMediaQuery,
  useTheme,
  Snackbar,
} from "@mui/material";

import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo } from "react";
import { Square } from "chess.js";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/hooks/useAgine";
import { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import {
  Lightbulb,
  Star,
  Eye,
  SkipForwardIcon as SkipNextIcon,
  SkipBackIcon,
  Settings,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  User2,
} from "lucide-react";
import { Refresh, SkipNext } from "@mui/icons-material";
import Slider from "@/componets/Slider";
import { useLocalStorage } from "usehooks-ts";
import {
  PuzzleData,
  PuzzleQuery,
  PUZZLE_THEMES,
  DIFFICULTY_THEMES,
} from "@/libs/puzzle/helper";
import { calculateNewUserRating } from "@/libs/puzzle/rating";
import { useSettings } from "@/context/SettingContext";
import PuzzleScrollView from "@/componets/puzzle/PuzzleScrollView";



export default function PuzzlePage() {
  usePageReady();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { puzzleViewMode, userPuzzleRating, saveSettings } = useSettings();

  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [puzzleQuery, setPuzzleQuery] = useState<PuzzleQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile UI state
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [themesSectionExpanded, setThemesSectionExpanded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");

  // Theme selection state
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [quickTheme, setQuickTheme] = useState<string>("");

  // Game state
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  // Puzzle solving state
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [sanSolutionMoves, setSanSolutionMoves] = useState<string[]>([]);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [puzzleReseted, setPuzzleReseted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [puzzleLevel, setPuzzleLevel] = useLocalStorage<number>(
    "puzzleLevel",
    1500,
  );

  // Solution viewing state
  const [showingSolution, setShowingSolution] = useState(false);
  const [solutionViewIndex, setSolutionViewIndex] = useState(0);
  const [solutionGameState, setSolutionGameState] = useState<Chess | null>(
    null,
  );

  // rating (shared with Settings/scroll feed via the normalized SettingsContext value)

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" = "info",
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const calculateUserRating = (puzzleRating: number, isCompleted: boolean) => {
    if (!puzzleReseted) {
      saveSettings({
        user_puzzle_rating: calculateNewUserRating(userPuzzleRating, puzzleRating, isCompleted),
      });
    }
  };

  const createPuzzlePrompt = useCallback(
    (query: PuzzleQuery): string => {
      const themesText =
        query.themes.length > 0
          ? `This puzzle focuses on: ${query.themes.join(", ")}. themes`
          : "";
      const solutionText =
        query.solution.length > 0
          ? `The solution is: ${query.solution.join(" ")}.`
          : "";
      let sideToMove = "";
      if (puzzleData && puzzleData.FEN) {
        const fenParts = puzzleData.FEN.split(" ");
        if (fenParts.length > 1) {
          sideToMove =
            fenParts[1] === "w"
              ? "White to move."
              : fenParts[1] === "b"
                ? "Black to move."
                : "";
        }
      }
      return `
    <puzzle_session>
     Phase: puzzle_starting
    ${themesText} 
    \n
    ${sideToMove} 
    \n
    ${solutionText}
    </puzzle_session>
    `;
    },
    [puzzleData],
  );

  const createTransitionPuzzlePrompt = useCallback(
    (query: PuzzleQuery, solution: string): string => {
      const themesText =
        query.themes.length > 0
          ? `This puzzle focuses on: ${query.themes.join(", ")}. themes`
          : "";
      let sideToMove = "";
      if (puzzleData && puzzleData.FEN) {
        const fenParts = puzzleData.FEN.split(" ");
        if (fenParts.length > 1) {
          sideToMove =
            fenParts[1] === "w"
              ? "White to move."
              : fenParts[1] === "b"
                ? "Black to move."
                : "";
        }
      }
      return `
    <puzzle_session>
    ${themesText} 
    \n
    ${sideToMove} 
    \n 
    ${solution}
    </puzzle_session>
    `;
    },
    [puzzleData],
  );

  const convertMovesToSAN = useCallback(
    (moves: string[], startingFEN: string): string[] => {
      const tempGame = new Chess(startingFEN);
      const sanMoves: string[] = [];
      moves.forEach((move) => {
        try {
          const moveObj = tempGame.move({
            from: move.substring(0, 2),
            to: move.substring(2, 4),
            promotion: move.substring(4) || undefined,
          });
          if (moveObj) {
            sanMoves.push(moveObj.san);
          }
        } catch (error) {
          console.error("Error converting move to SAN:", move, error);
        }
      });
      return sanMoves;
    },
    [],
  );

  const fetchPuzzle = useCallback(
    async (themes: string[] = [], ratingFrom?: number, ratingTo?: number) => {
      setLoading(true);
      setError(null);
      try {
        let url = "/api/puzzle";
        const params = new URLSearchParams();
        if (themes.length > 0) {
          params.append("themes", themes.join(","));
        }
        if (ratingFrom !== undefined && ratingTo !== undefined) {
          params.append("ratingFrom", Math.round(ratingFrom).toString());
          params.append("ratingTo", Math.round(ratingTo).toString());
        }
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        const response = await fetch(url);
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch puzzle");
        }
        const data: PuzzleData = result.data;
        setPuzzleData(data);
        const newGame = new Chess(data.FEN);
        setGame(newGame);
        setFen(data.FEN);
        const moves = data.moves.split(" ");
        setSolutionMoves(moves);
        setCurrentSolutionIndex(0);
        const sanMoves = convertMovesToSAN(moves, data.FEN);
        const newPuzzleQuery: PuzzleQuery = {
          themes: data.themes,
          solution: sanMoves,
        };
        setPuzzleQuery(newPuzzleQuery);
        const queryString = createPuzzlePrompt(newPuzzleQuery);
        setPuzzleComplete(false);
        setPuzzleFailed(false);
        setPuzzleReseted(false);
        setHintUsed(false);
        setShowHint(false);
        setShowingSolution(false);
        setSolutionViewIndex(0);
        setSolutionGameState(null);
        setMoveSquares({});
        setSelectedSquare(null);
        setLegalMoves([]);
      } catch (err) {
        console.error("Error fetching puzzle:", err);
        setError("Failed to load puzzle. Please try again.");
        showSnackbar("Failed to load puzzle", "error");
      } finally {
        setLoading(false);
      }
    },
    [convertMovesToSAN, createPuzzlePrompt],
  );

  useEffect(() => {
    if (puzzleViewMode === "classic") {
      fetchPuzzle([], userPuzzleRating, userPuzzleRating + 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleViewMode]);

  const {
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    llmLoading,
    stockfishLoading,
    openingLoading,
    moveSquares,
    setMoveSquares,
    setAnalysisTab,
    engine,
    analyzeWithStockfish,
  } = useAgine(fen, "puzzle", false, undefined, "play");

  const handleQuickThemeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const theme = event.target.value;
      setQuickTheme(theme);
    },
    [],
  );

  const showSolution = useCallback(() => {
    if (!puzzleData) return;
    setShowingSolution(true);
    setSolutionViewIndex(0);
    const solutionGame = new Chess(puzzleData.FEN);
    setSolutionGameState(solutionGame);
    setGame(solutionGame);
    setFen(solutionGame.fen());
    setMoveSquares({});
    showSnackbar("Viewing solution", "info");
  }, [puzzleData]);

  const navigateSolution = useCallback(
    (direction: "prev" | "next") => {
      if (!puzzleData || !solutionGameState) return;
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
        } catch (error) {
          console.error("Solution navigation error:", error);
        }
      } else if (direction === "prev" && solutionViewIndex > 0) {
        const newGame = new Chess(puzzleData.FEN);
        const targetIndex = solutionViewIndex - 1;
        for (let i = 0; i < targetIndex; i++) {
          const move = solutionMoves[i];
          try {
            newGame.move({
              from: move.substring(0, 2),
              to: move.substring(2, 4),
              promotion: move.substring(4) || undefined,
            });
          } catch (error) {
            console.error("Solution rebuild error:", error);
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
    [puzzleData, solutionGameState, solutionViewIndex, solutionMoves],
  );

  const onDrop = useCallback(
    (args: PieceDropHandlerArgs) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return false;
      try {
        const gameCopy = new Chess(fen);
        const source = args.sourceSquare;
        const target = args.targetSquare;

        if (!source || !target) return false;

        const move = gameCopy.move({
          from: source,
          to: target,
          promotion: "q",
        });
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

          const playedMove = sanSolutionMoves[currentSolutionIndex];
          const remainingMoves = sanSolutionMoves.slice(
            currentSolutionIndex + 1,
          );
          const solutionText =
            remainingMoves.length > 0
              ? `Move played: ${playedMove}. Remaining solution: ${remainingMoves.join(" ")}.`
              : `Move played: ${playedMove}. Puzzle complete!`;

          if (currentSolutionIndex === solutionMoves.length - 1) {
            setPuzzleComplete(true);
            showSnackbar(
              hintUsed
                ? "Puzzle complete! (Hint used)"
                : "Perfect! Puzzle solved!",
              "success",
            );
            calculateUserRating(puzzleData?.rating || 1500, true);
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
          showSnackbar("Wrong move! please view the solution", "error");
          calculateUserRating(puzzleData?.rating || 1500, false);
        }
        return true;
      } catch (error) {
        console.error("Move error:", error);
        return false;
      }
    },
    [
      fen,
      solutionMoves,
      sanSolutionMoves,
      currentSolutionIndex,
      puzzleComplete,
      puzzleFailed,
      showingSolution,
      hintUsed,
      puzzleQuery,
      createTransitionPuzzlePrompt,
    ],
  );

  const handleSquareClick = useCallback(
    ({ piece, square }: SquareHandlerArgs) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return;
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      if (selectedSquare && legalMoves.includes(square)) {
        // Create the args object matching PieceDropHandlerArgs
        const chessPiece = game.get(selectedSquare as Square);
        const args: PieceDropHandlerArgs = {
          piece: {
            isSparePiece: false,
            position: selectedSquare,
            pieceType: chessPiece
              ? `${chessPiece.color}${chessPiece.type.toUpperCase()}`
              : "wP",
          },
          sourceSquare: selectedSquare,
          targetSquare: square,
        };
        onDrop(args);
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
      const targetSquares = moves.map((move) => move.to);
      setSelectedSquare(square);
      setLegalMoves(targetSquares);
    },
    [
      selectedSquare,
      legalMoves,
      game,
      onDrop,
      puzzleComplete,
      puzzleFailed,
      showingSolution,
    ],
  );

  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {};
    Object.entries(moveSquares).forEach(([square, color]) => {
      styles[square] = { backgroundColor: color };
    });
    if (selectedSquare && !showingSolution) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
    }
    if (!showingSolution) {
      legalMoves.forEach((square) => {
        const piece = game.get(square as Square);
        const backgroundImage = piece
          ? "radial-gradient(circle, rgba(255,0,0,0.8) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)";
        styles[square] = {
          ...styles[square],
          backgroundImage,
        };
      });
    }
    return styles;
  }, [moveSquares, selectedSquare, legalMoves, game, showingSolution]);

  const showHintMove = useCallback(() => {
    if (!solutionMoves[currentSolutionIndex] || showingSolution) return;
    const move = solutionMoves[currentSolutionIndex];
    const from = move.substring(0, 2);
    const to = move.substring(2, 4);
    setMoveSquares({
      [from]: "rgba(255, 215, 0, 0.6)",
      [to]: "rgba(255, 215, 0, 0.6)",
    });
    setHintUsed(true);
    setShowHint(true);
    showSnackbar("Hint shown! Best move highlighted", "info");
    setTimeout(() => {
      setMoveSquares({});
      setShowHint(false);
    }, 3000);
  }, [solutionMoves, currentSolutionIndex, showingSolution]);

  const resetPuzzle = useCallback(() => {
    if (!puzzleData) return;
    const newGame = new Chess(puzzleData.FEN);
    setGame(newGame);
    setFen(puzzleData.FEN);
    setCurrentSolutionIndex(0);
    setPuzzleComplete(false);
    setPuzzleReseted(true);
    setPuzzleFailed(false);
    setHintUsed(false);
    setShowHint(false);
    setShowingSolution(false);
    setSolutionViewIndex(0);
    setSolutionGameState(null);
    setMoveSquares({});
    setSelectedSquare(null);
    setLegalMoves([]);
    showSnackbar("Puzzle reset", "info");
  }, [puzzleData]);

  const exitSolutionView = useCallback(() => {
    if (!puzzleData) return;
    setShowingSolution(false);
    setSolutionViewIndex(0);
    setSolutionGameState(null);
    const newGame = new Chess(puzzleData.FEN);
    setGame(newGame);
    setFen(puzzleData.FEN);
    setMoveSquares({});
  }, [puzzleData]);

  if (puzzleViewMode !== "classic") {
    return <PuzzleScrollView />;
  }

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          position: "relative",
          // Desktop: no padding — the grid fills 100vh edge-to-edge like game/position pages
          pb: isMobile ? 10 : 0,
          px: isMobile ? 1 : 0,
          pt: isMobile ? 2 : 0,
          width: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        {isMobile ? (
          /* Mobile Layout - Unchanged */
          <Stack spacing={2}>
            {/* Header with Rating - Mobile Only */}
            {puzzleData && (
              <Card>
                <CardContent sx={{ py: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Chip
                      icon={<User2 size={18} />}
                      label={`Your Rating: ${Math.round(userPuzzleRating)}`}
                      color="secondary"
                      size="small"
                    />
                    <Chip
                      icon={<Star size={18} />}
                      label={`Rating: ${Math.round(puzzleData.rating)}`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={
                        showingSolution
                          ? `Solution ${solutionViewIndex}/${solutionMoves.length}`
                          : `Move ${Math.floor(currentSolutionIndex / 2) + 1}`
                      }
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Chessboard - Mobile */}
            <Box sx={{ width: "100%" }}>
              <AiChessboardPanel
                key={puzzleData?.lichessId}
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
                side={
                  puzzleData
                    ? new Chess(puzzleData.FEN).turn() === "w"
                      ? "white"
                      : "black"
                    : "white"
                }
                stockfishLoading={stockfishLoading}
                stockfishAnalysisResult={stockfishAnalysisResult}
                openingLoading={openingLoading}
              />
            </Box>

            {/* Quick Puzzle Controls - directly visible below the puzzle on
                mobile so solving/navigating doesn't require opening the
                drawer first. Advanced theme/rating filters remain in the
                drawer (opened via the FAB) since they're changed far less
                often than these controls. */}
            {puzzleData && (
              <Card>
                <CardContent sx={{ py: 1.5 }}>
                  <Stack spacing={1.5}>
                    {(puzzleComplete ||
                      (puzzleFailed && !showingSolution) ||
                      showHint) && (
                      <Stack spacing={1}>
                        {puzzleComplete && (
                          <Alert severity="success" sx={{ py: 0.5 }}>
                            🎉 Solved! {hintUsed ? "(with hint)" : "Perfect!"}
                          </Alert>
                        )}
                        {puzzleFailed && !showingSolution && (
                          <Alert severity="error" sx={{ py: 0.5 }}>
                            ❌ Wrong move! Try again or view solution
                          </Alert>
                        )}
                        {showHint && (
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            💡 Highlighted squares show the best move!
                          </Alert>
                        )}
                      </Stack>
                    )}

                    {showingSolution ? (
                      <Stack spacing={1}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600 }}
                        >
                          Solution Navigation ({solutionViewIndex}/
                          {solutionMoves.length})
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            startIcon={<SkipBackIcon size={18} />}
                            onClick={() => navigateSolution("prev")}
                            disabled={solutionViewIndex === 0}
                            fullWidth
                            size="small"
                            color="info"
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<SkipNextIcon size={18} />}
                            onClick={() => navigateSolution("next")}
                            disabled={solutionViewIndex >= solutionMoves.length}
                            fullWidth
                            size="small"
                            color="info"
                          >
                            Next
                          </Button>
                          <Button
                            variant="contained"
                            onClick={exitSolutionView}
                            fullWidth
                            size="small"
                            color="warning"
                          >
                            Exit
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            startIcon={<Lightbulb size={18} />}
                            onClick={showHintMove}
                            disabled={puzzleComplete || showHint}
                            fullWidth
                            size="small"
                            color="info"
                          >
                            Hint
                          </Button>
                          {puzzleFailed && (
                            <Button
                              variant="outlined"
                              startIcon={<Eye size={18} />}
                              onClick={showSolution}
                              fullWidth
                              size="small"
                              color="secondary"
                            >
                              Solution
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={resetPuzzle}
                            fullWidth
                            size="small"
                            color="warning"
                          >
                            Reset
                          </Button>
                        </Stack>
                        <Button
                          variant="contained"
                          startIcon={<SkipNext />}
                          onClick={() =>
                            fetchPuzzle(
                              selectedThemes,
                              userPuzzleRating,
                              userPuzzleRating + 500,
                            )
                          }
                          disabled={loading}
                          fullWidth
                          size="medium"
                          color="success"
                        >
                          Next Puzzle
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        ) : (
          /* Desktop Layout — left panel + right board, matching position page */
          <Box sx={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            height: "100vh",
            overflow: "hidden",
          }}>
            {/* LEFT: Puzzle controls panel */}
            <Box sx={{ borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Header */}
              <Box sx={{ px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
                  PUZZLE INFO
                </Typography>
              </Box>

              {/* Scrollable panel content */}
              <Box sx={{ flex: 1, overflowY: "auto", p: 1.5,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
              }}>
                  <Box>
                    {loading ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 4,
                        }}
                      >
                      </Box>
                    ) : (
                      <Stack spacing={3}>
                        {/* Theme Selection */}
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Puzzle Themes</Typography>
                            <Stack spacing={2}>
                              <FormControl fullWidth>
                                <InputLabel>Quick Select</InputLabel>
                                <Select
                                  value={quickTheme}
                                  onChange={handleQuickThemeChange}
                                  label="Quick Select"
                                >
                                  <MenuItem value="">
                                    <em>Random Puzzle</em>
                                  </MenuItem>
                                  {DIFFICULTY_THEMES.map((theme) => (
                                    <MenuItem
                                      key={theme.value}
                                      value={theme.value}
                                    >
                                      {theme.label} ({theme.difficulty})
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <Button
                                variant="outlined"
                                startIcon={<Filter />}
                                onClick={() => setThemeDialogOpen(true)}
                                fullWidth
                                color="info"
                              >
                                Advanced Theme Selection
                              </Button>
                              {selectedThemes.length > 0 && (
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  flexWrap="wrap"
                                  useFlexGap
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{ width: "100%", mb: 0.5 }}
                                  >
                                    Active Themes:
                                  </Typography>
                                  {selectedThemes.map((theme) => (
                                    <Chip
                                      key={theme}
                                      label={
                                        PUZZLE_THEMES.find(
                                          (t) => t.tag === theme,
                                        )?.description || theme
                                      }
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>

                        {/* Rating Display */}
                        {puzzleData && (
                          <Card>
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="center"
                                spacing={2}
                              >
                                <Chip
                                  icon={<User2 />}
                                  label={`Your Rating: ${userPuzzleRating}`}
                                  color="secondary"
                                  sx={{
                                    fontSize: "1rem",
                                    py: 2,
                                    height: "auto",
                                  }}
                                />
                                <Chip
                                  icon={<Star />}
                                  label={`Rating: ${puzzleData.rating}`}
                                  color="primary"
                                  sx={{
                                    fontSize: "1rem",
                                    py: 2,
                                    height: "auto",
                                  }}
                                />
                                <Chip
                                  label={
                                    showingSolution
                                      ? `Solution ${solutionViewIndex}/${solutionMoves.length}`
                                      : `Move ${Math.floor(currentSolutionIndex / 2) + 1}`
                                  }
                                  variant="outlined"
                                  sx={{
                                    fontSize: "1rem",
                                    py: 2,
                                    height: "auto",
                                  }}
                                />
                              </Stack>
                            </CardContent>
                          </Card>
                        )}

                        {/* Status messages — inline below theme selector */}
                        {puzzleComplete && (
                          <Alert severity="success" sx={{ py: 0.5 }}>
                            🎉 Puzzle Complete! {hintUsed ? "(Hint used)" : "Perfect solve!"}
                          </Alert>
                        )}
                        {puzzleFailed && !showingSolution && (
                          <Alert severity="error" sx={{ py: 0.5 }}>
                            ❌ Wrong move! Use Show Solution to see correct moves.
                          </Alert>
                        )}
                        {showHint && (
                          <Alert severity="info" sx={{ py: 0.5 }}>
                            💡 Hint: The highlighted squares show the best move!
                          </Alert>
                        )}
                        {error && (
                          <Alert severity="error" sx={{ py: 0.5 }}>
                            Puzzle combo not present! Try other themes.
                          </Alert>
                        )}

                        {/* Action buttons */}
                        {showingSolution ? (
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5}>
                              <Button variant="outlined" startIcon={<SkipBackIcon />} onClick={() => navigateSolution("prev")} disabled={solutionViewIndex === 0} fullWidth color="info">Previous</Button>
                              <Button variant="outlined" startIcon={<SkipNextIcon />} onClick={() => navigateSolution("next")} disabled={solutionViewIndex >= solutionMoves.length} fullWidth color="info">Next</Button>
                              <Button variant="contained" onClick={exitSolutionView} fullWidth color="warning">Exit</Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5}>
                              <Button variant="outlined" startIcon={<Lightbulb />} onClick={showHintMove} disabled={puzzleComplete || showHint} fullWidth color="info">Hint</Button>
                              {puzzleFailed && <Button variant="outlined" startIcon={<Eye />} onClick={showSolution} fullWidth color="secondary">Solution</Button>}
                              <Button variant="outlined" startIcon={<Refresh />} onClick={resetPuzzle} fullWidth color="warning">Reset</Button>
                            </Stack>
                            <Button variant="contained" startIcon={<SkipNext />} onClick={() => fetchPuzzle(selectedThemes, userPuzzleRating, userPuzzleRating + 500)} disabled={loading} fullWidth size="large" color="success">
                              Next Puzzle
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    )}
                  </Box>
              </Box>
            </Box>

            {/* CENTER: Chessboard */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRight: 1, borderColor: "divider" }}>
              <AiChessboardPanel
                key={puzzleData?.lichessId}
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
                side={
                  puzzleData
                    ? new Chess(puzzleData.FEN).turn() === "w"
                      ? "white"
                      : "black"
                    : "white"
                }
                stockfishLoading={stockfishLoading}
                stockfishAnalysisResult={stockfishAnalysisResult}
                openingLoading={openingLoading}
              />
            </Box>

          </Box>
        )}

        {/* Mobile FAB - opens theme/difficulty settings drawer. Solving
            controls (hint/solution/reset/next) live inline below the
            board, so this FAB is only needed for less-frequent settings. */}
        {isMobile && (
          <Fab
            color="primary"
            sx={{
              position: "fixed",
              bottom: 16,
              right: 16,
              zIndex: 1000,
            }}
            onClick={() => setBottomDrawerOpen(true)}
          >
            <Settings />
          </Fab>
        )}

        {/* Mobile Bottom Drawer - theme/difficulty settings */}
        {isMobile && (
          <Drawer
            anchor="bottom"
            open={bottomDrawerOpen}
            onClose={() => setBottomDrawerOpen(false)}
            PaperProps={{
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: "90vh",
              },
            }}
          >
            <Box sx={{ p: 2 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">Puzzle Settings</Typography>
                <IconButton onClick={() => setBottomDrawerOpen(false)}>
                  <X />
                </IconButton>
              </Stack>

              <Stack spacing={2}>
                {/* Solving/navigation controls now live directly below the
                    puzzle board (see mobile layout above) so they're
                    reachable without opening this drawer. This drawer is
                    for theme filters and difficulty settings. */}

                {/* Theme Selection - Collapsible */}
                <Card>
                  <CardContent sx={{ p: 2 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      onClick={() =>
                        setThemesSectionExpanded(!themesSectionExpanded)
                      }
                      sx={{ cursor: "pointer" }}
                    >
                      <Typography variant="subtitle1">Puzzle Themes</Typography>
                      {themesSectionExpanded ? <ChevronUp /> : <ChevronDown />}
                    </Stack>
                    <Collapse in={themesSectionExpanded}>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Quick Select</InputLabel>
                          <Select
                            value={quickTheme}
                            onChange={handleQuickThemeChange}
                            label="Quick Select"
                          >
                            <MenuItem value="">
                              <em>Random</em>
                            </MenuItem>
                            {DIFFICULTY_THEMES.map((theme) => (
                              <MenuItem key={theme.value} value={theme.value}>
                                {theme.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          variant="outlined"
                          startIcon={<Filter size={18} />}
                          onClick={() => {
                            setThemeDialogOpen(true);
                            setBottomDrawerOpen(false);
                          }}
                          fullWidth
                          size="small"
                          color="info"
                        >
                          Advanced Filters
                        </Button>
                        {selectedThemes.length > 0 && (
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {selectedThemes.slice(0, 3).map((theme) => (
                              <Chip
                                key={theme}
                                label={
                                  PUZZLE_THEMES.find((t) => t.tag === theme)
                                    ?.description || theme
                                }
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {selectedThemes.length > 3 && (
                              <Chip
                                label={`+${selectedThemes.length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Collapse>
                  </CardContent>
                </Card>

                {/* Active themes summary for this puzzle */}
                {puzzleData && puzzleData.themes.length > 0 && (
                  <Alert severity="info" sx={{ fontSize: "0.875rem" }}>
                    Themes: {puzzleData.themes.slice(0, 3).join(", ")}
                    {puzzleData.themes.length > 3 && ` +${puzzleData.themes.length - 3} more`}
                  </Alert>
                )}
              </Stack>
            </Box>
          </Drawer>
        )}
      </Box>

      {(loading || !puzzleData) && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 2000,
          }}
        >
          <CircularProgress size={64} />
        </Box>
      )}

      {/* Theme Dialog - Unchanged */}
      <Dialog
        open={themeDialogOpen}
        onClose={() => setThemeDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Settings />
              <Typography variant="h6">Puzzle Filters</Typography>
            </Stack>
            {isMobile && (
              <IconButton onClick={() => setThemeDialogOpen(false)}>
                <X />
              </IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Typography variant="body2">
              Customize your puzzle practice by selecting specific themes and
              difficulty.
            </Typography>

            <Autocomplete
              multiple
              options={PUZZLE_THEMES}
              getOptionLabel={(option) => option.description}
              value={PUZZLE_THEMES.filter((theme) =>
                selectedThemes.includes(theme.tag),
              )}
              onChange={(_, newValue) => {
                setSelectedThemes(newValue.map((theme) => theme.tag));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Themes"
                  placeholder="Search themes..."
                  size={isMobile ? "small" : "medium"}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.tag}
                    label={option.description}
                    color="primary"
                    size="small"
                  />
                ))
              }
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography variant="body2">{option.description}</Typography>
                </Box>
              )}
            />

            {/* Popular Themes */}
            <Box>
              <Typography variant="subtitle2">Popular Themes:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[
                  "mateIn2",
                  "fork",
                  "pin",
                  "skewer",
                  "sacrifice",
                  "backRankMate",
                ].map((theme) => {
                  const themeObj = PUZZLE_THEMES.find((t) => t.tag === theme);
                  if (!themeObj) return null;
                  const isSelected = selectedThemes.includes(theme);
                  return (
                    <Chip
                      key={theme}
                      label={themeObj.description}
                      color={isSelected ? "primary" : "warning"}
                      variant={isSelected ? "filled" : "outlined"}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedThemes((prev) =>
                            prev.filter((t) => t !== theme),
                          );
                        } else {
                          setSelectedThemes((prev) => [...prev, theme]);
                        }
                      }}
                      size="small"
                      sx={{ cursor: "pointer" }}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2">
                Difficulty Rating: {puzzleLevel} - {puzzleLevel + 500}
              </Typography>
              <Slider
                min={1200}
                max={2800}
                value={puzzleLevel}
                setValue={(val: number) => {
                  setPuzzleLevel(val);
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!isMobile && (
            <Button onClick={() => setThemeDialogOpen(false)} color="inherit">
              Cancel
            </Button>
          )}
          <Button
            onClick={() => setSelectedThemes([])}
            color="warning"
            variant="outlined"
          >
            Clear
          </Button>
          <Button
            onClick={() => {
              fetchPuzzle(selectedThemes, puzzleLevel, puzzleLevel + 500);
              setThemeDialogOpen(false);
            }}
            color="primary"
            variant="contained"
          >
            Apply & Get Puzzle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications - Unchanged */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}