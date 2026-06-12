"use client";

/**
 * @file AgineAnalyzerClient.tsx
 * @description Orchestration component for the Agine Analyzer page.
 *
 * Responsibilities:
 * - Hosts the setup form and kicks off useBatchReview runs
 * - Renders download/analysis progress
 * - Lays out result tabs: Overview (stats + plots), Openings, Puzzles
 *   (interactive pack from the user's blunders), Themes and Games
 * - Hands a clicked game off to the full /game analyzer via the same
 *   sessionStorage keys used by the Lichess live-play review flow
 *
 * All network calls live in @/libs/batchreview/api.
 * All analysis math lives in @/libs/batchreview/analysis.
 * Sub-components live in @/componets/batchreview/.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  BarChart as OverviewIcon,
  Extension as PuzzleIcon,
  MenuBook as OpeningIcon,
  Replay as ReplayIcon,
  SportsEsports as GamesIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useSessionStorage } from "usehooks-ts";
import { Chess } from "chess.js";

import { usePageReady } from "@/hooks/usePageReady";
import { useSettings } from "@/context/SettingContext";
import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName } from "@/stockfish/engine/engine";
import useBatchReview from "@/hooks/useBatchReview";

import BatchReviewSetup from "@/componets/batchreview/BatchReviewSetup";
import BatchStatsOverview from "@/componets/batchreview/BatchStatsOverview";
import BatchCharts from "@/componets/batchreview/BatchCharts";
import BatchOpeningStats from "@/componets/batchreview/BatchOpeningStats";
import BatchPuzzlePack from "@/componets/batchreview/BatchPuzzlePack";
import BatchGameList from "@/componets/batchreview/BatchGameList";

import {
  BatchReviewOptions,
  BATCH_MAX_GAMES,
  BATCH_MIN_GAMES,
  GameSummary,
} from "@/libs/batchreview/types";

export default function AgineAnalyzerClient() {
  usePageReady();
  const router = useRouter();

  const { enginePicked } = useSettings();
  const engine = useEngine(true, enginePicked as EngineName);

  const {
    phase,
    progress,
    progressLabel,
    result,
    error,
    generateBatchReview,
    cancelBatchReview,
    setResult,
  } = useBatchReview(engine);

  const [activeTab, setActiveTab] = useState(0);

  // Same handoff keys the Lichess live-play review flow writes for /game
  const [, setReviewPgn] = useSessionStorage("agine_game_page_pgn", "");
  const [, setReviewMoves] = useSessionStorage<string[]>("agine_game_moves", []);
  const [, setReviewInfo] = useSessionStorage<Record<string, string>>(
    "agine_game_info",
    {}
  );

  const isRunning = phase === "downloading" || phase === "analyzing";

  const handleStart = useCallback(
    (options: BatchReviewOptions) => {
      const clamped = Math.max(
        BATCH_MIN_GAMES,
        Math.min(BATCH_MAX_GAMES, options.maxGames)
      );
      setActiveTab(0);
      void generateBatchReview({ ...options, maxGames: clamped });
    },
    [generateBatchReview]
  );

  /** Opens a reviewed game in the full /game analyzer via sessionStorage. */
  const handleReviewGame = useCallback(
    (game: GameSummary) => {
      const board = new Chess();
      try {
        board.loadPgn(game.pgn);
      } catch {
        // Fall through with whatever moves loaded
      }
      setReviewPgn(game.pgn);
      setReviewMoves(board.history());
      setReviewInfo({
        Event: `Agine Analyzer vs ${game.opponentName}`,
        Site: `https://lichess.org/${game.gameId}`,
        White: game.userColor === "white" ? "You" : game.opponentName,
        Black: game.userColor === "black" ? "You" : game.opponentName,
      });
      router.push("/game");
    },
    [router, setReviewPgn, setReviewMoves, setReviewInfo]
  );

  const handleOpenGameById = useCallback(
    (gameId: string) => {
      const game = result?.games.find((g) => g.gameId === gameId);
      if (game) handleReviewGame(game);
    },
    [result, handleReviewGame]
  );

  const handleNewReview = useCallback(() => {
    setResult(null);
    cancelBatchReview();
  }, [setResult, cancelBatchReview]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Agine Analyzer
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Batch-review your last {BATCH_MIN_GAMES}–{BATCH_MAX_GAMES} Lichess
        games — results, opening performance, accuracy trends, puzzles built
        from your own blunders and a theme profile of where you go wrong.
      </Typography>

      {!result && (
        <Box sx={{ maxWidth: 560 }}>
          <BatchReviewSetup onStart={handleStart} disabled={isRunning} />
        </Box>
      )}

      {isRunning && (
        <Paper elevation={2} sx={{ p: 3, mt: 3, maxWidth: 560 }}>
          <Stack spacing={2}>
            <Typography fontSize="0.9rem">{progressLabel}</Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Button onClick={cancelBatchReview} color="inherit" size="small">
              Cancel
            </Button>
          </Stack>
        </Paper>
      )}

      {phase === "error" && error && (
        <Alert severity="error" sx={{ mt: 3, maxWidth: 560 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Stack spacing={3}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<OverviewIcon />} iconPosition="start" label="Overview" />
              <Tab icon={<OpeningIcon />} iconPosition="start" label="Openings" />
              <Tab icon={<PuzzleIcon />} iconPosition="start" label="Puzzles" />
              <Tab icon={<GamesIcon />} iconPosition="start" label="Games" />
            </Tabs>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ReplayIcon />}
              onClick={handleNewReview}
            >
              New Review
            </Button>
          </Box>

          {activeTab === 0 && (
            <Stack spacing={3}>
              <BatchStatsOverview result={result} />
              <BatchCharts result={result} />
            </Stack>
          )}

          {activeTab === 1 && (
            <BatchOpeningStats openingStats={result.openingStats} />
          )}

          {activeTab === 2 && (
            <BatchPuzzlePack
              keyPositions={result.keyPositions}
              engine={engine}
              onOpenGame={handleOpenGameById}
            />
          )}

          {activeTab === 3 && (
            <BatchGameList
              games={result.games}
              onReviewGame={handleReviewGame}
            />
          )}
        </Stack>
      )}
    </Container>
  );
}
