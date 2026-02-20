import { Stack } from "@mui/material";
import { PlayerTimer } from "./PlayerTimer";
import { BOT_CONFIGS } from "@/libs/agine/bothelper";

type BotType = keyof typeof BOT_CONFIGS;

interface TimerDisplayProps {
  whiteTime: number;
  blackTime: number;
  activeTimer: "white" | "black" | null;
  playerColor: "white" | "black";
  selectedBot: BotType;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  whiteTime,
  blackTime,
  activeTimer,
  playerColor,
  selectedBot,
}) => {
  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      
      <PlayerTimer
        seconds={blackTime}
        isActive={activeTimer === "black"}
        playerName={
          playerColor === "black" ? "You" : BOT_CONFIGS[selectedBot].name
        }
      />

      
      <PlayerTimer
        seconds={whiteTime}
        isActive={activeTimer === "white"}
        playerName={
          playerColor === "white" ? "You" : BOT_CONFIGS[selectedBot].name
        }
      />
    </Stack>
  );
};
