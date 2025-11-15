import React, { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { UserGame, fetchUserRecentGames } from "./LichessTypes";
import {
  Box,
  CircularProgress,
  FormControl,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import TimerIcon from "@mui/icons-material/Timer";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HistoryIcon from "@mui/icons-material/History";
import CasinoIcon from "@mui/icons-material/Casino";

import {useTheme} from "@mui/material";

interface UserGameProp {
  loadPGN: (pgn: string) => void;
  setOpen: (handle: boolean) => void;
}

export default function UserLichessGames({ loadPGN, setOpen }: UserGameProp) {
  const [requestCount, setRequestCount] = useState(0);
  const [lichessUsername, setLichessUsername] = useLocalStorage(
    "lichess-username",
    ""
  );
  const [games, setGames] = useState<UserGame[]>([]);

  const theme = useTheme();

  useEffect(() => {
    if (!lichessUsername) {
      setGames([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const games = await fetchUserRecentGames(lichessUsername);
      setGames(games);
    }, requestCount === 0 ? 0 : 500);

    setRequestCount((prev) => prev + 1);
    return () => clearTimeout(timeout);
  }, [lichessUsername]);

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case "bullet":
        return <FlashOnIcon fontSize="small" sx={{ mr: 1,  }} />;
      case "blitz":
        return <TimerIcon fontSize="small" sx={{ mr: 1, }} />;
      case "rapid":
        return <RocketLaunchIcon fontSize="small" sx={{ mr: 1, }} />;
      case "classical":
        return <HistoryIcon fontSize="small" sx={{ mr: 1 }} />;
      default:
        return <CasinoIcon fontSize="small" sx={{ mr: 1 }} />;
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        maxWidth: "100%",
        mx: "auto",
        [theme.breakpoints.down("sm")]: {
          p: 2,
        },
      }}
    >
      <Box display="flex" justifyContent="center" mb={2}>
        <FormControl fullWidth>
          <TextField
            label="Lichess Username"
            variant="outlined"
            value={lichessUsername}
            onChange={(e) => setLichessUsername(e.target.value)}
           
           
          />
        </FormControl>
      </Box>

      {!lichessUsername ? (
        <Typography textAlign="center" >
          Enter a username to load recent games
        </Typography>
      ) : games.length === 0 ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress  />
        </Box>
      ) : (
        <List sx={{ maxHeight: 400, overflowY: "auto", px: 1 }}>
          {games.map((game) => (
            <ListItemButton
              key={game.id}
              onClick={() => {
                loadPGN(game.pgn);
                setOpen(false);
              }}
              sx={{
                mb: 1,
           
                borderRadius: "8px",
               
                [theme.breakpoints.down("sm")]: {
                  mb: 0.5,
                  p: 1,
                },
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" flexWrap="wrap">
                    {getSpeedIcon(game.speed)}
                    {`${game.players.white.user?.name || "white"} (${
                      game.players.white.rating || "?"
                    }) vs ${game.players.black.user?.name || "black"} (${
                      game.players.black.rating || "?"
                    })`}
                  </Box>
                }
                secondary={`Played on ${new Date(game.lastMoveAt)
                  .toLocaleString()
                  .slice(0, -3)}`}
                primaryTypographyProps={{
                  fontWeight: "bold",
                  noWrap: true,
                  fontSize: "0.9rem",
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  fontSize: "0.8rem",
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );
}