import { Box, Typography, Button, TextField } from "@mui/material";
import { useState } from "react";
import { CircularProgress } from "@mui/material";
import { Gamepad } from "@mui/icons-material";
import {
  getValidGameId,
  fetchLichessGame,
  extractMovesWithComments,
  extractGameInfo,
} from "@/libs/game/helper";
import { Chess } from "chess.js";
import { MoveAnalysis } from "@/libs/agine/helper";

export interface ParsedComment {
  move: string;
  comment?: string;
  clock?: string;   // [%clk] remaining time e.g. "1:29:00"
  emt?: string;     // [%emt] elapsed move time e.g. "3.2"
  eval?: string;    // [%eval] engine eval e.g. "+0.34"
  nags?: string[];  // NAG symbols e.g. ["!", "?!"]
}

interface LoadLichessGameUrlProp {
  setPgnText: (pgn: string) => void;
  setMoves: (moves: string[]) => void;
  setParsedMovesWithComments: (comments: ParsedComment[]) => void;
  setGameInfo: (info: Record<string, string>) => void;
  setCurrentMoveIndex: (index: number) => void;
  setGame: (game: Chess) => void;
  setFen: (fen: string) => void;
  setComment: (comment: string) => void;
  setGameReview: (review: MoveAnalysis[]) => void;
  generateGameReview: (moves: string[]) => void;
  analyzeGameTheme: (moveList: string[]) => void;
  setInputsVisible: (view: boolean) => void;
  autoAnalysis?: boolean;
}

function LoadLichessGameUrl({
  setPgnText,
  setMoves,
  setParsedMovesWithComments,
  setGame,
  setGameInfo,
  setGameReview,
  setComment,
  setCurrentMoveIndex,
  setFen,
  setInputsVisible,
  generateGameReview,
  analyzeGameTheme,
  autoAnalysis = false,
}: LoadLichessGameUrlProp) {
  const [loadingGame, setLoadingGame] = useState(false);
  const [gameUrl, setGameUrl] = useState("");

  const handleLoadLichessGame = async () => {
    if (!gameUrl.trim()) {
      alert("Please enter a Lichess game URL");
      return;
    }

    const gameId = getValidGameId(gameUrl);
    if (!gameId) {
      alert(
        "Invalid Lichess game URL. Please use a URL like: https://lichess.org/abcdefgh"
      );
      return;
    }

    setLoadingGame(true);
    try {
      const fetchedPgn = await fetchLichessGame(gameId);
      console.log("Fetched PGN:", fetchedPgn);

      try {
        const tempGame = new Chess();
        tempGame.loadPgn(fetchedPgn);
        const moveList = tempGame.history();
        const parsed = extractMovesWithComments(fetchedPgn);
        const info = extractGameInfo(fetchedPgn);

        setPgnText(fetchedPgn);
        setMoves(moveList);
        setParsedMovesWithComments(parsed);
        setGameInfo(info);
        setCurrentMoveIndex(0);

        const resetGame = new Chess();
        setGame(resetGame);
        setFen(resetGame.fen());
        setComment("");
        setGameReview([]);
        if (autoAnalysis) {
          generateGameReview(moveList);
          analyzeGameTheme(moveList);
        }
        setInputsVisible(false);

      } catch (pgnError) {
        console.error("Error parsing PGN:", pgnError);
        alert("Invalid PGN data received from Lichess");
      }
    } catch (error) {
      console.error("Error loading Lichess game:", error);
      alert(
        `Could not load game from Lichess: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoadingGame(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Gamepad sx={{ mr: 1 }} />
        Lichess Game
      </Typography>
      <TextField
        fullWidth
        label="Paste Lichess Game URL"
        value={gameUrl}
        onChange={(e) => setGameUrl(e.target.value)}
        placeholder="https://lichess.org/abcdefgh or https://lichess.org/abcdefgh1234"
        sx={{
         
          borderRadius: 2,
          mb: 2,
        }}
      
      />
      <Button
        variant="contained"
        fullWidth
        onClick={handleLoadLichessGame}
        disabled={loadingGame}
        startIcon={loadingGame ? <CircularProgress size={20} /> : null}
        sx={{
          borderRadius: 2,
          py: 1.5,
          textTransform: "none",
          fontSize: "1rem",
        }}
      >
        {loadingGame ? "Loading Game..." : "Load Game"}
      </Button>
    </Box>
  );
}

export default LoadLichessGameUrl;