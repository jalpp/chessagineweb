import { Paper, Stack, Typography } from "@mui/material";
import { TimerIcon } from "lucide-react";



export function PlayerTimer({
  seconds,
  isActive,
  playerName,
}: {
  seconds: number;
  isActive: boolean;
  playerName: string;
}) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <Paper
      elevation={isActive ? 2 : 0}
      sx={{
        p: 1.5,
        backgroundColor: isActive ? "primary.main" : "background.paper",
        color: isActive ? "white" : "text.primary",
        transition: "background-color 0.3s, color 0.3s",
        border: "1px solid",
        borderColor: isActive ? "primary.light" : "divider",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" fontWeight={600}>
          {playerName}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {isActive && <TimerIcon fontSize="small" />}
          <Typography variant="h6" fontFamily="monospace" fontWeight={700}>
            {mins}:{secs.toString().padStart(2, "0")}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}