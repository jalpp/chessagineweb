import { Box, Typography, Button, Divider } from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";

import { SavedGameReview } from "./SaveGameReviewDialog";
import { useLocalStorage } from "usehooks-ts";

interface GameReviewHistoryProp {
  setHistoryDialogOpen: (save: boolean) => void;
}

function GamereviewHistory({ setHistoryDialogOpen }: GameReviewHistoryProp) {
  const [gameReviewHistory] = useLocalStorage<SavedGameReview[]>(
    "chess-game-review-history",
    []
  );

  return (
    <>
      {gameReviewHistory.length > 0 && (
        <>
          <Box>
            <Typography
              variant="h6"
              sx={{
                
                mb: 2,
                display: "flex",
                alignItems: "center",
              }}
            >
              <HistoryIcon sx={{ mr: 1 }} />
              Saved Game Reviews
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setHistoryDialogOpen(true)}
              startIcon={<HistoryIcon />}
              sx={{
                
                borderRadius: 2,
                py: 1.5,
                textTransform: "none",
                fontSize: "1rem",
              }}
            >
              Load from History ({gameReviewHistory.length} saved)
            </Button>
          </Box>
          <Divider />
        </>
      )}
    </>
  );
}

export default GamereviewHistory;
