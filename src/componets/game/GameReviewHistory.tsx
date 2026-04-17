import { Box, Typography, Button, Divider } from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";

import { useGameStorage } from "@/hooks/useGameStorage";

interface GameReviewHistoryProp {
  setHistoryDialogOpen: (save: boolean) => void;
}

function GameReviewHistory({ setHistoryDialogOpen }: GameReviewHistoryProp) {
  const { games, loading } = useGameStorage();

  if (loading || games.length === 0) return null;

  return (
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
          Load from History ({games.length} saved)
        </Button>
      </Box>
      <Divider />
    </>
  );
}

export default GameReviewHistory;