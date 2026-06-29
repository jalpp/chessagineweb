"use client";

/**
 * @file AgineAnalyzerClient.tsx
 * @description Orchestration component for the Agine Analyzer page.
 *
 * Layout follows the Lichess play page standard: a responsive
 * column/row Stack where the analysis card (scrollable, tabbed) sits on
 * the left and the big puzzle board column sits on the right. The board
 * column can be hidden to give the analysis full width.
 *
 * Responsibilities:
 * - Hosts the setup form and kicks off useBatchReview runs
 * - Renders download/analysis/puzzle-validation progress
 * - Lays out analysis tabs: Overview, Openings, Themes, Games
 * - Hands a clicked game off to the full /game analyzer via the same
 *   sessionStorage keys used by the Lichess live-play review flow
 *
 * All network calls live in @/libs/batchreview/api and themes.
 * All analysis math lives in @/libs/batchreview/analysis.
 * Sub-components live in @/componets/batchreview/.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  BarChart as OverviewIcon,
  Extension as PuzzleIcon,
  MenuBook as OpeningIcon,
  HelpOutline as HelpOutlineIcon,
  Replay as ReplayIcon,
  SportsEsports as GamesIcon,
  TrackChanges as ThemeIcon,
  VisibilityOff as HideBoardIcon,
  Visibility as ShowBoardIcon,
  Person as PersonIcon,
  CompareArrows as CompareIcon,
} from "@mui/icons-material";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStorage } from "usehooks-ts";
import { Chess } from "chess.js";

import { usePageReady } from "@/hooks/usePageReady";
import { useSettings } from "@/context/SettingContext";
import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName } from "@/stockfish/engine/engine";
import useBatchReview from "@/hooks/useBatchReview";

import BatchReviewSetup from "@/componets/batchreview/BatchReviewSetup";
import AnalysisPreviewPanel from "@/componets/batchreview/AnalysisPreviewPanel";
import BatchStatsOverview from "@/componets/batchreview/BatchStatsOverview";
import BatchCharts from "@/componets/batchreview/BatchCharts";
import BatchOpeningStats from "@/componets/batchreview/BatchOpeningStats";
import BatchPuzzlePack from "@/componets/batchreview/BatchPuzzlePack";
import BatchThemeAnalysis from "@/componets/batchreview/BatchThemeAnalysis";
import BatchGameList from "@/componets/batchreview/BatchGameList";
import PlayerComparisonDashboard from "@/componets/batchreview/PlayerComparisonDashboard";

import {
  BatchReviewOptions,
  BATCH_MAX_GAMES,
  BATCH_MIN_GAMES,
  GameSummary,
} from "@/libs/batchreview/types";

type AnalyzerMode = "single" | "compare";

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
  const [showPuzzleBoard, setShowPuzzleBoard] = useState(true);
  const [analyzerMode, setAnalyzerMode] = useState<AnalyzerMode>("single");

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
      setShowPuzzleBoard(true);
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

  // ── Setup / progress view ───────────────────────────────────────────────
  if (!result) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          mb={1}
          flexWrap="wrap"
        >
          <Box
            component="img"
            src="/static/images/agineowl.png"
            alt="ChessAgine"
            sx={{ width: 52, height: 52 }}
          />
          <Typography variant="h4" fontWeight={700}>
            Agine Analyzer
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            component={NextLink}
            href="/agine-analyzer/themes"
            size="small"
            startIcon={<HelpOutlineIcon />}
          >
            What do these scores mean?
          </Button>
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Batch-review your last {BATCH_MIN_GAMES}–{BATCH_MAX_GAMES} Lichess
          games results, opening performance, accuracy trends, theme
          analysis and puzzles built from your own blunders. You can save the generated puzzle packs in to Lichess studies
        </Typography>

        {/* Mode selector */}
        <Box sx={{ mb: 3 }}>
          <Typography
            fontSize="0.8rem"
            fontWeight={600}
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}
          >
            Analysis mode
          </Typography>
          <ToggleButtonGroup
            value={analyzerMode}
            exclusive
            onChange={(_, v) => v !== null && setAnalyzerMode(v)}
            disabled={isRunning}
            size="small"
            color="primary"
          >
            <ToggleButton value="single" sx={{ gap: 0.75, px: 2.5 }}>
              <PersonIcon fontSize="small" />
              1 Player Report
            </ToggleButton>
            <ToggleButton value="compare" sx={{ gap: 0.75, px: 2.5 }}>
              <CompareIcon fontSize="small" />
              Compare 2 Players
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Compare mode */}
        {analyzerMode === "compare" && (
          <PlayerComparisonDashboard onBack={() => setAnalyzerMode("single")} />
        )}

        {/* Single player mode */}
        {analyzerMode === "single" && (
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 480px) 1fr" },
              alignItems: "start",
            }}
          >
            <Box>
              <BatchReviewSetup onStart={handleStart} disabled={isRunning} />

              {isRunning && (
                <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
                  <Stack spacing={2}>
                    <Typography fontSize="0.9rem">{progressLabel}</Typography>
                    <LinearProgress variant="determinate" value={progress} />
                    <Button
                      onClick={cancelBatchReview}
                      color="inherit"
                      size="small"
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Paper>
              )}

              {phase === "error" && error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}
            </Box>

            <AnalysisPreviewPanel result={null} isRunning={isRunning} />
          </Box>
        )}
      </Container>
    );
  }

  // ── Results view: analysis card left, puzzle board right ───────────────
  const hasPuzzles = result.keyPositions.length > 0;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 4 }, minHeight: "100vh" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        mb={3}
        flexWrap="wrap"
      >
        <Box
          component="img"
          src="/static/images/agineowl.png"
          alt="ChessAgine"
          sx={{ width: 44, height: 44 }}
        />
        <Typography variant="h5" fontWeight={700}>
          Agine Analyzer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {result.games.length} games for {result.username}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {hasPuzzles && (
          <Button
            variant="text"
            size="small"
            startIcon={showPuzzleBoard ? <HideBoardIcon /> : <ShowBoardIcon />}
            onClick={() =>
              setShowPuzzleBoard((v) => {
                // The Puzzles tab disappears when the board returns
                if (!v && activeTab === 4) setActiveTab(0);
                return !v;
              })
            }
          >
            {showPuzzleBoard ? "Hide puzzle mode" : "Show puzzle mode"}
          </Button>
        )}
        <Button
          component={NextLink}
          href="/agine-analyzer/themes"
          variant="text"
          size="small"
          startIcon={<HelpOutlineIcon />}
        >
          What do these scores mean?
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ReplayIcon />}
          onClick={handleNewReview}
        >
          New Review
        </Button>
      </Stack>

      <Stack
        direction={{ xs: "column-reverse", lg: "row" }}
        spacing={{ xs: 2, md: 3 }}
        alignItems="flex-start"
      >
        {/* Analysis card (left on desktop, below the board on mobile) */}
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: "0 8px 32px rgba(138,43,226,0.08)",
              height: { lg: "calc(100vh - 160px)" },
              maxHeight: { lg: "calc(100vh - 160px)" },
              overflow: "auto",
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
              >
                <Tab icon={<OverviewIcon />} iconPosition="start" label="Overview" />
                <Tab icon={<OpeningIcon />} iconPosition="start" label="Openings" />
                <Tab icon={<ThemeIcon />} iconPosition="start" label="Themes" />
                <Tab icon={<GamesIcon />} iconPosition="start" label="Games" />
                {!showPuzzleBoard && hasPuzzles && (
                  <Tab icon={<PuzzleIcon />} iconPosition="start" label="Puzzles" />
                )}
              </Tabs>

              {activeTab === 0 && (
                <Stack spacing={3}>
                  <BatchStatsOverview result={result} />
                  <BatchCharts result={result} />
                </Stack>
              )}

              {activeTab === 1 && (
                <BatchOpeningStats openingStats={result.openingStats} />
              )}

              {activeTab === 2 && <BatchThemeAnalysis games={result.games} />}

              {activeTab === 3 && (
                <BatchGameList
                  games={result.games}
                  onReviewGame={handleReviewGame}
                />
              )}

              {activeTab === 4 && !showPuzzleBoard && hasPuzzles && (
                <Stack spacing={2}>
                  <Alert severity="info">
                    Puzzle mode is hidden — show it to solve on the big board.
                  </Alert>
                  <Button
                    variant="contained"
                    startIcon={<PuzzleIcon />}
                    onClick={() => {
                      setShowPuzzleBoard(true);
                      setActiveTab(0);
                    }}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Show puzzle mode
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Puzzle board column (right on desktop, on top on mobile) */}
        {showPuzzleBoard && hasPuzzles && (
          <Box
            sx={{
              flex: "0 0 auto",
              width: { xs: "100%", sm: 480, lg: 460, xl: 520 },
              maxWidth: "100%",
              mx: { xs: "auto", lg: 0 },
            }}
          >
            <BatchPuzzlePack
              keyPositions={result.keyPositions}
              onOpenGame={handleOpenGameById}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
