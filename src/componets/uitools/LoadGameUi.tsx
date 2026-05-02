// components/uitools/LoadGameToolUI.tsx  (v2 — full inline render)
"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Skeleton,
} from "@mui/material";
import { ErrorOutline as ErrorIcon } from "@mui/icons-material";
import dynamic from "next/dynamic";
import type {EmbeddedGameSource} from "../tabs/EmbedGameReview";


const EmbeddedGameReview = dynamic(
  () => import("../tabs/EmbedGameReview"),
  {
    loading: () => (
      <Box p={2}>
        <Stack spacing={1}>
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="50%" />
        </Stack>
      </Box>
    ),
    ssr: false,
  }
);


type LoadGameArgs = {
  source: "lichess_url" | "lichess_study" | "pgn_text";
  value: string;
  autoReview?: boolean;
  caption?: string;
};

type LoadGameResult = {
  source: "lichess_url" | "lichess_study" | "pgn_text";
  value: string;
  autoReview: boolean;
  caption?: string;
  lichessGameId?: string;
  lichessStudyId?: string;
};



function sourceLabel(source: LoadGameArgs["source"]) {
  return (
    {
      lichess_url: "Lichess Game",
      lichess_study: "Lichess Study",
      pgn_text: "PGN",
    }[source] ?? source
  );
}

function toEmbeddedSource(result: LoadGameResult): EmbeddedGameSource {
  if (result.lichessGameId) return { type: "lichessId", value: result.lichessGameId };
  if (result.lichessStudyId) return { type: "studyId", value: result.lichessStudyId };
  return { type: "pgn", value: result.value };
}


function GameLoadingSkeleton({ caption }: { caption?: string }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        maxWidth: 900,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <CircularProgress size={16} thickness={5} />
          <Typography variant="body2" color="text.secondary">
            {caption ? `Loading "${caption}"…` : "Loading game…"}
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Skeleton
            variant="rectangular"
            width={320}
            height={320}
            sx={{ borderRadius: 2, flexShrink: 0 }}
          />
          <Stack flex={1} spacing={1}>
            {[100, 85, 70, 60, 75, 55].map((w, i) => (
              <Skeleton key={i} variant="text" width={`${w}%`} height={22} />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}


export const LoadGameToolUI = makeAssistantToolUI<LoadGameArgs, LoadGameResult>({
  toolName: "load_chess_game",

  render: ({ args, result, status }) => {
    if (status.type === "running" || !result) {
      return <GameLoadingSkeleton caption={args.caption} />;
    }

    if (status.type === "incomplete") {
      return (
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ borderRadius: 2, maxWidth: 520 }}
        >
          <Typography variant="body2" fontWeight={600}>
            Failed to load game
          </Typography>
          <Typography variant="caption">
            {args.source === "lichess_url"
              ? `Could not fetch game from: ${args.value}`
              : "The PGN could not be parsed. Please check the format."}
          </Typography>
        </Alert>
      );
    }

    return (
      <Box sx={{ width: "100%", my: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <Chip
            label={sourceLabel(result.source)}
            size="small"
            color="primary"
            variant="outlined"
          />
          {result.autoReview && (
            <Chip
              label="AI Review"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Stack>

        <EmbeddedGameReview
          source={toEmbeddedSource(result)}
          autoReview={result.autoReview}
          caption={result.caption}
        />
      </Box>
    );
  },
});