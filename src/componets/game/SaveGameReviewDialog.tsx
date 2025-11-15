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
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";

import { MoveAnalysis } from "@/hooks/useGameReview";
import { useLocalStorage } from "usehooks-ts";
import { GameReviewTheme } from "@/libs/themes/helper";

export interface SavedGameReview {
  id: string;
  gameInfo: Record<string, string>;
  pgn: string;
  gameReview: MoveAnalysis[];
  gameReviewTheme: GameReviewTheme,
  moves: string[];
  savedAt: string;
  title?: string;
}

interface SaveGameReviewProp {
  loadFromHistory: (savedGame: SavedGameReview) => void;
  historyDialogOpen: boolean;
  setHistoryDialogOpen: (historysave: boolean) => void;
  saveDialogOpen: boolean;
  setSaveDialogOpen: (save: boolean) => void;
  gameInfo: Record<string, string>;
  pgnText: string;
  gameReview: MoveAnalysis[];
  gameReviewTheme: GameReviewTheme;
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
  moves,
  gameReviewTheme,
  pgnText,
}: SaveGameReviewProp) {
  const [gameReviewHistory, setGameReviewHistory] = useLocalStorage<
    SavedGameReview[]
  >("chess-game-review-history", []);

const [saveTitle, setSaveTitle] = useState("");

  const generateGameTitle = () => {
    const white = gameInfo.White || "Unknown";
    const black = gameInfo.Black || "Unknown";
    const date = gameInfo.Date || new Date().toLocaleDateString();
    return `${white} vs ${black} - ${date}`;
  };

  const deleteFromHistory = (id: string) => {
    setGameReviewHistory((prev) => prev.filter((game) => game.id !== id));
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

  const handleSaveConfirm = () => {
    const gameTitle = saveTitle.trim() || generateGameTitle();
    const savedGame: SavedGameReview = {
      id: Date.now().toString(),
      gameInfo,
      pgn: pgnText,
      gameReview,
      moves,
      gameReviewTheme,
      savedAt: new Date().toISOString(),
      title: gameTitle,
    };

    setGameReviewHistory((prev) => [savedGame, ...prev]);
    setSaveDialogOpen(false);
    setSaveTitle("");
    alert("Game review saved successfully!");
  };

  return (
    <>
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
        
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle >
          Save Game Review
        </DialogTitle>
        <DialogContent>
          <div>
            <Typography
              variant="body2"
              component="div"
              sx={{ mb: 2 }}
            >
              Give your game review a title for easy identification
            </Typography>
          </div>

          <TextField
            autoFocus
            fullWidth
            label="Game Title"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder={generateGameTitle()}
            sx={{
              mt: 1,
           
            }}
            
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSaveDialogOpen(false)}
           
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
           
          >
            Save Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
             
              borderRadius: 3,
              maxHeight: "80vh",
            },
          },
        }}
      >
        <DialogTitle >
          Saved Game Reviews
        </DialogTitle>
        <DialogContent>
          {gameReviewHistory.length === 0 ? (
            <Alert
              severity="info"
              
            >
              No saved game reviews yet. Analyze a game and save the review to
              build your history!
            </Alert>
          ) : (
            <List sx={{ width: "100%" }}>
              {gameReviewHistory.map((savedGame) => (
                <ListItem
                  key={savedGame.id}
                  sx={{
                    
                    borderRadius: 2,
                    mb: 1,
                   
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        onClick={() => loadFromHistory(savedGame)}
                        
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteFromHistory(savedGame.id)}
                        sx={{
                          color: "#f44336",
                          
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <div>
                        <Typography
                          variant="h6"
                          component="div"
                          sx={{
                           
                            fontWeight: 600,
                          }}
                        >
                          {savedGame.title}
                        </Typography>
                      </div>
                    }
                    secondary={
                      <Box component="div">
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{
                            
                            display: "block",
                          }}
                        >
                          Saved: {formatDate(savedGame.savedAt)}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                         
                          <Chip
                            label={`${
                              savedGame.gameInfo.White || "unknown"
                            } vs ${savedGame.gameInfo.Black || "unknown"}`}
                            size="small"
                            sx={{
                      
                              fontSize: "0.75rem",
                            }}
                          />
                          {savedGame.gameInfo.Result && (
                            <Chip
                              label={`Result: ${savedGame.gameInfo.Result}`}
                              size="small"
                              sx={{
                              
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                          <Chip
                            label={`${savedGame.moves.length} moves`}
                            size="small"
                            sx={{
                             
                              fontSize: "0.75rem",
                            }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setHistoryDialogOpen(false)}
         
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SaveGameReviewDialog;
