import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as ReadyIcon,
} from "@mui/icons-material";

import { MoveAnalysis } from "@/libs/agine/helper";
import { GameReviewTheme } from "@/libs/themes/helper";
import { useRouter } from "next/navigation";
import { useGameStorage } from "@/hooks/useGameStorage";
import { SerializedTree } from "@/lib/variationTree";

export interface SavedGameReview {
  id: string;
  gameInfo: Record<string, string>;
  pgn: string;
  /**
   * Compact flat-serialized variation tree.
   * Written on every save so re-saves correctly update the tree.
   */
  treeData?: SerializedTree;
  /** Legacy only: annotated PGN for old documents that pre-date treeData */
  annotatedPgn?: string;
  gameReview: MoveAnalysis[];
  gameReviewTheme: GameReviewTheme | null;
  moves: string[];
  savedAt: string;
  title?: string;
}

interface SaveGameReviewProp {
  loadFromHistory?: (savedGame: SavedGameReview) => void;
  historyDialogOpen?: boolean;
  setHistoryDialogOpen?: (open: boolean) => void;
  saveDialogOpen: boolean;
  setSaveDialogOpen: (open: boolean) => void;
  gameInfo: Record<string, string>;
  pgnText: string;
  /**
   * Stable id for this game session — generated once when the game is loaded
   * and passed in from the page. Using a stable id means re-saving the same
   * game updates the existing document (tree refresh) rather than creating a
   * new one.
   */
  gameId: string;
  /** Compact serialized tree — updated on every save */
  treeData?: SerializedTree;
  /** Legacy fallback only */
  annotatedPgn?: string;
  isBotGame: boolean;
  gameReview: MoveAnalysis[];
  /** True while the AI game review is still generating */
  gameReviewLoading: boolean;
  gameReviewTheme: GameReviewTheme | null;
  moves: string[];
}

function SaveGameReviewDialog({
  loadFromHistory,
  saveDialogOpen,
  setSaveDialogOpen,
  historyDialogOpen,
  setHistoryDialogOpen,
  gameInfo,
  gameReview,
  gameReviewLoading,
  moves,
  isBotGame,
  gameReviewTheme,
  pgnText,
  gameId,
  treeData,
  annotatedPgn,
}: SaveGameReviewProp) {
  const { games: gameReviewHistory, saveGame, deleteGame } = useGameStorage();
  const router = useRouter();
  const [saveTitle, setSaveTitle] = useState("");

  // Save is only allowed when review is fully generated
  const reviewReady = !gameReviewLoading && gameReview.length > 0;

  const generateGameTitle = () => {
    const white = gameInfo.White || "Unknown";
    const black = gameInfo.Black || "Unknown";
    const date = gameInfo.Date || new Date().toLocaleDateString();
    return `${white} vs ${black} - ${date}`;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSaveConfirm = async () => {
    if (!reviewReady) return;

    const gameTitle = saveTitle.trim() || generateGameTitle();

    // Use the stable gameId passed from the page — NOT Date.now().
    // This ensures re-saving the same game updates the existing record
    // (the server does $set on treeData, $setOnInsert on immutable fields).
    const savedGame: SavedGameReview = {
      id: gameId,
      gameInfo,
      pgn: pgnText,
      treeData,
      annotatedPgn: annotatedPgn || pgnText,
      gameReview,
      moves,
      gameReviewTheme,
      savedAt: new Date().toISOString(),
      title: gameTitle,
    };

    try {
      await saveGame(savedGame);
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    setSaveDialogOpen(false);
    setSaveTitle("");

    if (isBotGame) {
      sessionStorage.setItem("loadGameId", gameId);
      router.push("/game");
      setTimeout(() => setSaveDialogOpen(false), 500);
    } else {
      alert("Saved game successfully!");
    }
  };

  return (
    <>
      {/* ── Save dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Save Game Review</DialogTitle>
        <DialogContent>
          {/* Review-ready status banner */}
          {moves.length > 0 && (
            <Alert
              severity={reviewReady ? "success" : "warning"}
              icon={reviewReady
                ? <ReadyIcon fontSize="inherit" />
                : <PendingIcon fontSize="inherit" />}
              sx={{ mb: 2 }}
            >
              {reviewReady
                ? `Game review ready — ${gameReview.length} moves analysed.`
                : gameReviewLoading
                ? "Game review is generating… please wait before saving."
                : "No game review yet. Load a game and wait for the review to complete."}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 2 }}>
            Give your game review a title for easy identification.
            Re-saving the same game will update your annotations and variations.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label="Game Title"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder={generateGameTitle()}
            disabled={!reviewReady}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Tooltip
            title={
              !reviewReady
                ? gameReviewLoading
                  ? "Wait for game review to finish"
                  : "Game review must be generated before saving"
                : ""
            }
          >
            <span>
              <Button
                onClick={handleSaveConfirm}
                variant="contained"
                disabled={!reviewReady}
              >
                Save Review
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* ── History dialog ───────────────────────────────────────────────── */}
      {historyDialogOpen !== undefined &&
        setHistoryDialogOpen &&
        loadFromHistory && (
          <Dialog
            open={historyDialogOpen}
            onClose={() => setHistoryDialogOpen(false)}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "80vh" } } }}
          >
            <DialogTitle>Saved Game Reviews</DialogTitle>
            <DialogContent>
              {gameReviewHistory.length === 0 ? (
                <Alert severity="info">No saved game reviews yet.</Alert>
              ) : (
                <List sx={{ width: "100%" }}>
                  {gameReviewHistory.map((saved) => (
                    <ListItem
                      key={saved.id}
                      sx={{ borderRadius: 2, mb: 1 }}
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <IconButton onClick={() => loadFromHistory(saved)}>
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => deleteGame(saved.id)}
                            sx={{ color: "#f44336" }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography variant="h6" fontWeight={600}>
                            {saved.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Saved: {formatDate(saved.savedAt)}
                            </Typography>
                            <Stack direction="row" spacing={1} mt={1}>
                              <Chip
                                label={`${saved.gameInfo.White} vs ${saved.gameInfo.Black}`}
                                size="small"
                              />
                              {saved.gameInfo.Result && (
                                <Chip
                                  label={`Result: ${saved.gameInfo.Result}`}
                                  size="small"
                                />
                              )}
                              <Chip
                                label={`${saved.moves.length} moves`}
                                size="small"
                              />
                            </Stack>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
    </>
  );
}

export default SaveGameReviewDialog;