"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  Skeleton,
  Chip,
} from "@mui/material";
import { EmojiEvents as TrophyIcon } from "@mui/icons-material";
import dynamic from "next/dynamic";

const EmbeddedPuzzle = dynamic(() => import("./EmbeddedPuzzle"), {
  loading: () => (
    <Box sx={{ maxWidth: 480, width: "100%" }}>
      <Stack spacing={1}>
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </Stack>
    </Box>
  ),
  ssr: false,
});

type PuzzleArgs = {
  themes?: string[];
  ratingFrom?: number;
  ratingTo?: number;
  caption?: string;
};

type PuzzleResult = {
  themes: string[];
  ratingFrom: number;
  ratingTo: number;
  caption?: string;
};

export const LoadPuzzleToolUI = makeAssistantToolUI<PuzzleArgs, PuzzleResult>({
  toolName: "load_chess_puzzle",

  render: ({ args, result, status }) => {
    if (status.type === "running" || !result) {
      return (
        <Box display="flex" alignItems="center" gap={1.5} py={1} color="text.secondary">
          <CircularProgress size={16} />
          <Typography variant="caption">Loading puzzle…</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ my: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <TrophyIcon fontSize="small" sx={{ color: "warning.main" }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Chess Puzzle
          </Typography>
          {result.themes.slice(0, 3).map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />
          ))}
          <Chip
            label={`${result.ratingFrom}–${result.ratingTo}`}
            size="small"
            sx={{ height: 18, fontSize: "0.6rem" }}
          />
        </Stack>

        <EmbeddedPuzzle
          themes={result.themes}
          ratingFrom={result.ratingFrom}
          ratingTo={result.ratingTo}
          caption={result.caption}
        />
      </Box>
    );
  },
});