"use client";

import React, { useCallback, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  CompareArrows as CompareIcon,
  ExpandMore as ExpandMoreIcon,
  InfoOutlined as InfoIcon,
  Person as PersonIcon,
  Replay as ReplayIcon,
  Remove as TieIcon,
  Tune as TuneIcon,
  TrendingDown,
  TrendingUp,
} from "@mui/icons-material";
import { RadarChart } from "@mui/x-charts";

import { useEngine } from "@/stockfish/hooks/useEngine";
import { useSettings } from "@/context/SettingContext";
import { EngineName } from "@/stockfish/engine/engine";
import useBatchReview from "@/hooks/useBatchReview";
import TutorSegmentBar from "./TutorSegmentBar";
import { formatThemeName } from "./BatchThemeAnalysis";
import {
  THEME_KEYS,
  averageThemeProfiles,
  fetchGameThemeReview,
  getUserThemeProfile,
} from "@/libs/batchreview/themes";
import { ThemeScore } from "@/libs/themes/helper";
import {
  GameSummary,
  OpeningStat,
  BATCH_BLUNDER_THRESHOLD_DEFAULT,
  BATCH_LOCAL_DEPTH_DEFAULT,
  BATCH_MISTAKE_THRESHOLD_DEFAULT,
} from "@/libs/batchreview/types";
import { parallelLimit } from "@/libs/batchreview/chessdb";

const COMPARE_GAME_PRESETS = [5, 10, 20, 50];
const PERF_OPTIONS = ["bullet", "blitz", "rapid", "classical", "correspondence"];

// ─── MetricRow ────────────────────────────────────────────────────────────────
//
// Renders a two-sided bar comparison with a winner chip in the centre.
//
// For "lower is better" metrics (blunders/game, mistakes/game):
//   • The bar fill still represents the raw value so you can see the magnitude,
//     but the bar of the WORSE player is coloured red/orange and the BETTER
//     player's bar is coloured with their player colour.
//   • A "⚠ fewer is better" label clarifies the direction to the reader.

interface MetricRowProps {
  label: string;
  a: number;
  b: number;
  nameA: string;
  nameB: string;
  /** When false, the player with the LOWER value wins. Default: true. */
  higherIsBetter?: boolean;
  format?: (v: number) => string;
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  a,
  b,
  nameA,
  nameB,
  higherIsBetter = true,
  format = (v) => v.toFixed(1),
}) => {
  const aWins = higherIsBetter ? a > b : a < b;
  const bWins = higherIsBetter ? b > a : b < a;
  const tie = Math.abs(a - b) < 0.001;
  const max = Math.max(a, b, 0.01);

  // For lower-is-better metrics the "bad" player's bar is red/orange so the
  // visual immediately communicates that a longer bar is worse.
  const colorA = tie
    ? "text.secondary"
    : aWins
    ? "#7c4dff"
    : higherIsBetter
    ? "action.disabled"
    : "#E57373"; // red = more blunders/mistakes = bad

  const colorB = tie
    ? "text.secondary"
    : bWins
    ? "#f50057"
    : higherIsBetter
    ? "action.disabled"
    : "#E57373";

  return (
    <Box sx={{ mb: 2.5 }}>
      {!higherIsBetter && (
        <Typography fontSize="0.7rem" color="text.disabled" sx={{ mb: 0.25 }}>
          ↓ fewer is better
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        {/* ── Player A (right-justified bar, grows left) ── */}
        <Box sx={{ flex: 1, textAlign: "right" }}>
          <Typography
            fontSize="0.82rem"
            fontWeight={aWins ? 700 : 400}
            sx={{ color: aWins ? "#7c4dff" : "text.primary", mb: 0.4 }}
          >
            {format(a)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(a / max) * 100}
            sx={{
              height: 7,
              borderRadius: 4,
              transform: "scaleX(-1)",
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { bgcolor: colorA, borderRadius: 4 },
            }}
          />
        </Box>

        {/* ── Centre winner chip ── */}
        <Box sx={{ minWidth: 112, textAlign: "center" }}>
          <Typography fontSize="0.72rem" color="text.secondary" noWrap sx={{ mb: 0.5 }}>
            {label}
          </Typography>
          {tie ? (
            <Chip
              label="Tied"
              size="small"
              variant="outlined"
              icon={<TieIcon sx={{ fontSize: "0.8rem !important" }} />}
              sx={{ fontSize: "0.68rem" }}
            />
          ) : aWins ? (
            <Chip
              label={nameA}
              size="small"
              icon={<TrendingUp sx={{ fontSize: "0.8rem !important", color: "#7c4dff !important" }} />}
              sx={{ fontSize: "0.68rem", bgcolor: "#7c4dff22", color: "#7c4dff", border: "1px solid #7c4dff44" }}
            />
          ) : (
            <Chip
              label={nameB}
              size="small"
              icon={<TrendingUp sx={{ fontSize: "0.8rem !important", color: "#f50057 !important" }} />}
              sx={{ fontSize: "0.68rem", bgcolor: "#f5005722", color: "#f50057", border: "1px solid #f5005744" }}
            />
          )}
        </Box>

        {/* ── Player B bar ── */}
        <Box sx={{ flex: 1 }}>
          <Typography
            fontSize="0.82rem"
            fontWeight={bWins ? 700 : 400}
            sx={{ color: bWins ? "#f50057" : "text.primary", mb: 0.4 }}
          >
            {format(b)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(b / max) * 100}
            sx={{
              height: 7,
              borderRadius: 4,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { bgcolor: colorB, borderRadius: 4 },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};

// ─── OpeningComparison ────────────────────────────────────────────────────────

const OpeningComparison: React.FC<{
  statsA: OpeningStat[];
  statsB: OpeningStat[];
  nameA: string;
  nameB: string;
}> = ({ statsA, statsB, nameA, nameB }) => {
  const topA = [...statsA].sort((x, y) => y.games - x.games).slice(0, 5);
  const topB = [...statsB].sort((x, y) => y.games - x.games).slice(0, 5);

  const OpeningCol = ({
    stats,
    name,
    color,
  }: {
    stats: OpeningStat[];
    name: string;
    color: string;
  }) => (
    <Box sx={{ flex: 1 }}>
      <Typography fontWeight={700} fontSize="0.9rem" sx={{ color, mb: 1 }}>
        {name}
      </Typography>
      {stats.length === 0 && (
        <Typography fontSize="0.8rem" color="text.secondary">
          No opening data yet.
        </Typography>
      )}
      {stats.map((s) => (
        <Paper
          key={s.eco}
          elevation={0}
          sx={{ p: 1.5, mb: 1, border: 1, borderColor: "divider", borderRadius: 2 }}
        >
          <Typography fontSize="0.8rem" fontWeight={600} noWrap>
            {s.eco} · {s.name.split(":")[0].trim()}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
            <Chip label={`${s.games} games`} size="small" variant="outlined" />
            <Chip
              label={`${s.scorePercent}% score`}
              size="small"
              color={s.scorePercent >= 50 ? "success" : "error"}
            />
            <Chip label={`${s.avgAccuracy.toFixed(0)}% acc`} size="small" variant="outlined" />
          </Stack>
        </Paper>
      ))}
    </Box>
  );

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <OpeningCol stats={topA} name={nameA} color="#7c4dff" />
      <Divider orientation="vertical" flexItem />
      <OpeningCol stats={topB} name={nameB} color="#f50057" />
    </Stack>
  );
};



// ─── Main component ───────────────────────────────────────────────────────────

export interface PlayerComparisonDashboardProps {
  onBack: () => void;
}

type ComparePhase = "idle" | "running" | "done" | "error";

const PlayerComparisonDashboard: React.FC<PlayerComparisonDashboardProps> = ({ onBack }) => {
  const { enginePicked } = useSettings();
  const engineA = useEngine(true, enginePicked as EngineName);
  const engineB = useEngine(true, enginePicked as EngineName);

  const hookA = useBatchReview(engineA);
  const hookB = useBatchReview(engineB);

  // ── Form state ────────────────────────────────────────────────────────────
  const [usernameA, setUsernameA] = useState("");
  const [usernameB, setUsernameB] = useState("");
  const [maxGames, setMaxGames] = useState(10);
  const [perfTypes, setPerfTypes] = useState<string[]>([]);
  const [ratedFilter, setRatedFilter] = useState<"both" | "rated" | "casual">("both");
  const [localDepth, setLocalDepth] = useState(BATCH_LOCAL_DEPTH_DEFAULT);
  const [blunderThreshold, setBlunderThreshold] = useState(BATCH_BLUNDER_THRESHOLD_DEFAULT);
  const [mistakeThreshold, setMistakeThreshold] = useState(BATCH_MISTAKE_THRESHOLD_DEFAULT);

  const togglePerf = (perf: string) =>
    setPerfTypes((prev) =>
      prev.includes(perf) ? prev.filter((p) => p !== perf) : [...prev, perf]
    );

  // ── Run state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<ComparePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [profileA, setProfileA] = useState<ThemeScore | null>(null);
  const [profileB, setProfileB] = useState<ThemeScore | null>(null);
  const [themeLoading, setThemeLoading] = useState(false);

  const resultA = hookA.result;
  const resultB = hookB.result;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCompare = useCallback(async () => {
    if (!usernameA.trim() || !usernameB.trim()) return;
    setPhase("running");
    setError(null);
    hookA.setResult(null);
    hookB.setResult(null);
    setProfileA(null);
    setProfileB(null);

    const sharedOpts = {
      maxGames,
      perfTypes,
      rated: ratedFilter === "both" ? undefined : ratedFilter === "rated",
      localDepth,
      blunderThreshold,
      mistakeThreshold,
    };

    try {
      await Promise.all([
        hookA.generateBatchReview({ ...sharedOpts, username: usernameA.trim() }),
        hookB.generateBatchReview({ ...sharedOpts, username: usernameB.trim() }),
      ]);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setPhase("error");
    }
  }, [
    usernameA, usernameB, maxGames, perfTypes, ratedFilter,
    localDepth, blunderThreshold, mistakeThreshold, hookA, hookB,
  ]);

  const handleTabChange = useCallback(
    async (_: React.SyntheticEvent, tab: number) => {
      setActiveTab(tab);
    },
    [resultA, resultB, profileA, profileB]
  );

  const handleReset = useCallback(() => {
    hookA.setResult(null);
    hookB.setResult(null);
    hookA.cancelBatchReview();
    hookB.cancelBatchReview();
    setPhase("idle");
    setError(null);
    setProfileA(null);
    setProfileB(null);
    setActiveTab(0);
  }, [hookA, hookB]);

  // ── Setup / running view ──────────────────────────────────────────────────
  if (phase !== "done" || !resultA || !resultB) {
    const combinedProgress = (hookA.progress + hookB.progress) / 2;

    return (
      <Paper elevation={3} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: "16px", maxWidth: 640 }}>
        <Stack spacing={3}>
          {/* Header + info banner */}
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Compare Two Players
            </Typography>
            <Alert
              severity="info"
              icon={<InfoIcon fontSize="small" />}
              sx={{ fontSize: "0.82rem", borderRadius: 2 }}
            >
              This compares the <strong>latest games trend</strong> for two Lichess players,
              accuracy, error rates, openings across their most recent
              games. It reflects current form, not lifetime stats. Puzzle packs are not
              generated in comparison mode.
            </Alert>
          </Box>

          {/* Usernames */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Player A"
              placeholder="Lichess username"
              value={usernameA}
              onChange={(e) => setUsernameA(e.target.value)}
              fullWidth
              disabled={phase === "running"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" sx={{ color: "#7c4dff" }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Player B"
              placeholder="Lichess username"
              value={usernameB}
              onChange={(e) => setUsernameB(e.target.value)}
              fullWidth
              disabled={phase === "running"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" sx={{ color: "#f50057" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          {/* Game count */}
          <Box>
            <Typography
              fontSize="0.8rem"
              fontWeight={600}
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}
            >
              Games to compare (each player)
            </Typography>
            <ToggleButtonGroup
              value={maxGames}
              exclusive
              onChange={(_, v) => v !== null && setMaxGames(v)}
              disabled={phase === "running"}
              fullWidth
              size="small"
              color="primary"
            >
              {COMPARE_GAME_PRESETS.map((n) => (
                <ToggleButton key={n} value={n} sx={{ fontWeight: 700 }}>
                  {n}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Filters accordion — same options as single-player */}
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: "10px !important",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <TuneIcon fontSize="small" color="action" />
                <Typography fontSize="0.9rem" fontWeight={600}>
                  Filters & engine
                </Typography>
                {(perfTypes.length > 0 || ratedFilter !== "both") && (
                  <Chip
                    label={`${perfTypes.length + (ratedFilter !== "both" ? 1 : 0)} active`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2.5}>
                {/* Time controls */}
                <Box>
                  <Typography gutterBottom color="text.secondary" fontSize="0.8rem">
                    Time controls (none = all)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {PERF_OPTIONS.map((perf) => (
                      <Chip
                        key={perf}
                        label={perf}
                        color={perfTypes.includes(perf) ? "primary" : "default"}
                        variant={perfTypes.includes(perf) ? "filled" : "outlined"}
                        onClick={() => togglePerf(perf)}
                        disabled={phase === "running"}
                        sx={{ textTransform: "capitalize" }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Rated filter + depth */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Rated filter</InputLabel>
                    <Select
                      value={ratedFilter}
                      label="Rated filter"
                      onChange={(e) =>
                        setRatedFilter(e.target.value as "both" | "rated" | "casual")
                      }
                      disabled={phase === "running"}
                    >
                      <MenuItem value="both">Rated + Casual</MenuItem>
                      <MenuItem value="rated">Rated only</MenuItem>
                      <MenuItem value="casual">Casual only</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Local engine depth</InputLabel>
                    <Select
                      value={localDepth}
                      label="Local engine depth"
                      onChange={(e) => setLocalDepth(Number(e.target.value))}
                      disabled={phase === "running"}
                    >
                      <MenuItem value={8}>8 — fastest</MenuItem>
                      <MenuItem value={10}>10 — fast</MenuItem>
                      <MenuItem value={12}>12 — balanced</MenuItem>
                      <MenuItem value={14}>14 — slower, sharper</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {/* Blunder threshold */}
                <Box>
                  <Typography fontSize="0.8rem" color="text.secondary" gutterBottom>
                    Blunder threshold — win-rate drop to count as a blunder
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Slider
                      value={blunderThreshold}
                      onChange={(_, v) => {
                        const val = v as number;
                        setBlunderThreshold(val);
                        if (mistakeThreshold >= val) setMistakeThreshold(Math.max(1, val - 1));
                      }}
                      min={5}
                      max={40}
                      step={1}
                      disabled={phase === "running"}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}%`}
                      sx={{ flex: 1, color: "#E57373" }}
                    />
                    <Typography
                      fontSize="0.85rem"
                      fontWeight={700}
                      sx={{ minWidth: 36, color: "#E57373" }}
                    >
                      {blunderThreshold}%
                    </Typography>
                  </Stack>
                </Box>

                {/* Mistake threshold */}
                <Box>
                  <Typography fontSize="0.8rem" color="text.secondary" gutterBottom>
                    Mistake threshold — win-rate drop to count as a mistake
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Slider
                      value={mistakeThreshold}
                      onChange={(_, v) => {
                        const val = v as number;
                        setMistakeThreshold(Math.min(val, blunderThreshold - 1));
                      }}
                      min={1}
                      max={blunderThreshold - 1}
                      step={1}
                      disabled={phase === "running"}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v}%`}
                      sx={{ flex: 1, color: "#FF8A65" }}
                    />
                    <Typography
                      fontSize="0.85rem"
                      fontWeight={700}
                      sx={{ minWidth: 36, color: "#FF8A65" }}
                    >
                      {mistakeThreshold}%
                    </Typography>
                  </Stack>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Lichess-analysed games use server evals (free). Other games fall back to
                  ChessDB then the local engine at the chosen depth.
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Progress */}
          {phase === "running" && (
            <Box>
              <Typography fontSize="0.85rem" color="text.secondary" gutterBottom>
                Analyzing {usernameA} & {usernameB}…
              </Typography>
              <LinearProgress variant="determinate" value={combinedProgress} sx={{ mb: 1 }} />
              <Stack direction="row" spacing={3}>
                <Typography fontSize="0.75rem" sx={{ color: "#7c4dff" }}>
                  {usernameA}: {hookA.progressLabel}
                </Typography>
                <Typography fontSize="0.75rem" sx={{ color: "#f50057" }}>
                  {usernameB}: {hookB.progressLabel}
                </Typography>
              </Stack>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {/* Actions */}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={
                phase === "running" ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CompareIcon />
                )
              }
              onClick={handleCompare}
              disabled={phase === "running" || !usernameA.trim() || !usernameB.trim()}
              sx={{ fontWeight: 700, borderRadius: "10px" }}
            >
              {phase === "running" ? "Analyzing…" : "Compare Players"}
            </Button>
            <Button variant="outlined" onClick={onBack} disabled={phase === "running"}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  // ── Results view ──────────────────────────────────────────────────────────
  const nameA = resultA.username;
  const nameB = resultB.username;

  const blundersPerGameA = resultA.totalQualityCounts["Blunder"] / resultA.games.length;
  const blundersPerGameB = resultB.totalQualityCounts["Blunder"] / resultB.games.length;
  const mistakesPerGameA = resultA.totalQualityCounts["Mistake"] / resultA.games.length;
  const mistakesPerGameB = resultB.totalQualityCounts["Mistake"] / resultB.games.length;
  const inaccPerGameA = resultA.totalQualityCounts["Dubious"] / resultA.games.length;
  const inaccPerGameB = resultB.totalQualityCounts["Dubious"] / resultB.games.length;
  const scoreA =
    ((resultA.record.wins + resultA.record.draws * 0.5) / resultA.games.length) * 100;
  const scoreB =
    ((resultB.record.wins + resultB.record.draws * 0.5) / resultB.games.length) * 100;

  return (
    <Box>
      {/* Results header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>
          <Box component="span" sx={{ color: "#7c4dff" }}>
            {nameA}
          </Box>
          {" "}
          <CompareIcon sx={{ verticalAlign: "middle", color: "text.secondary", fontSize: "1.2rem" }} />
          {" "}
          <Box component="span" sx={{ color: "#f50057" }}>
            {nameB}
          </Box>
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" size="small" startIcon={<ReplayIcon />} onClick={handleReset}>
          New Comparison
        </Button>
        <Button variant="text" size="small" onClick={onBack}>
          Back
        </Button>
      </Stack>

      {/* Context banner */}
      <Alert
        severity="info"
        icon={<InfoIcon fontSize="small" />}
        sx={{ mb: 2, fontSize: "0.82rem", borderRadius: 2 }}
      >
        Showing latest games trend — last{" "}
        <strong>{resultA.games.length}</strong> games for {nameA} and{" "}
        <strong>{resultB.games.length}</strong> games for {nameB}. Reflects
        current form using blunder threshold {blunderThreshold}% / mistake
        threshold {mistakeThreshold}%.
      </Alert>

      {/* Player legend chips */}
      <Stack direction="row" spacing={2} mb={2}>
        <Chip
          label={nameA}
          sx={{ bgcolor: "#7c4dff22", color: "#7c4dff", fontWeight: 700 }}
          size="small"
        />
        <Chip
          label={nameB}
          sx={{ bgcolor: "#f5005722", color: "#f50057", fontWeight: 700 }}
          size="small"
        />
      </Stack>

      <Card sx={{ borderRadius: 3, boxShadow: "0 8px 32px rgba(138,43,226,0.08)" }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Overview" />
            <Tab label="Openings" />
          </Tabs>

          {/* ── Overview ───────────────────────────────────────────────── */}
          {activeTab === 0 && (
            <Stack spacing={3}>
              {/* Hero stat cards */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {[
                  { res: resultA, name: nameA, color: "#7c4dff" },
                  { res: resultB, name: nameB, color: "#f50057" },
                ].map(({ res, name, color }) => {
                  const rec = res.record;
                  return (
                    <Paper
                      key={name}
                      elevation={0}
                      sx={{ flex: 1, p: 2, border: 2, borderColor: color, borderRadius: 3 }}
                    >
                      <Typography fontWeight={700} sx={{ color }}>
                        {name}
                      </Typography>
                      <Typography fontSize="0.82rem" color="text.secondary">
                        {res.games.length} games · {rec.wins}W {rec.draws}D {rec.losses}L
                      </Typography>
                      <Typography fontSize="1.5rem" fontWeight={800} mt={0.5}>
                        {res.avgAccuracy.toFixed(1)}%
                      </Typography>
                      <Typography fontSize="0.78rem" color="text.secondary">
                        avg accuracy
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>

              {/* Head-to-head metric bars */}
              <Box>
                <MetricRow
                  label="Accuracy"
                  a={resultA.avgAccuracy}
                  b={resultB.avgAccuracy}
                  nameA={nameA}
                  nameB={nameB}
                  format={(v) => `${v.toFixed(1)}%`}
                />
                <MetricRow
                  label="Score %"
                  a={scoreA}
                  b={scoreB}
                  nameA={nameA}
                  nameB={nameB}
                  format={(v) => `${v.toFixed(1)}%`}
                />
                <MetricRow
                  label="Blunders / game"
                  a={blundersPerGameA}
                  b={blundersPerGameB}
                  nameA={nameA}
                  nameB={nameB}
                  higherIsBetter={false}
                  format={(v) => v.toFixed(2)}
                />
                <MetricRow
                  label="Mistakes / game"
                  a={mistakesPerGameA}
                  b={mistakesPerGameB}
                  nameA={nameA}
                  nameB={nameB}
                  higherIsBetter={false}
                  format={(v) => v.toFixed(2)}
                />
                <MetricRow
                  label="Inaccuracies / game"
                  a={inaccPerGameA}
                  b={inaccPerGameB}
                  nameA={nameA}
                  nameB={nameB}
                  higherIsBetter={false}
                  format={(v) => v.toFixed(2)}
                />
              </Box>

              {/* Accuracy segment bars */}
              <Divider />
              <Box>
                <Typography fontWeight={600} mb={1.5} fontSize="0.9rem">
                  Accuracy breakdown
                </Typography>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography fontSize="0.8rem" sx={{ color: "#7c4dff" }} fontWeight={600} mb={0.5}>
                      {nameA}
                    </Typography>
                    <TutorSegmentBar
                      label="Accuracy"
                      fraction={resultA.avgAccuracy / 100}
                      detail={`${resultA.avgAccuracy.toFixed(1)}% average`}
                      valueLabel={`${resultA.avgAccuracy.toFixed(1)}%`}
                    />
                  </Box>
                  <Box>
                    <Typography fontSize="0.8rem" sx={{ color: "#f50057" }} fontWeight={600} mb={0.5}>
                      {nameB}
                    </Typography>
                    <TutorSegmentBar
                      label="Accuracy"
                      fraction={resultB.avgAccuracy / 100}
                      detail={`${resultB.avgAccuracy.toFixed(1)}% average`}
                      valueLabel={`${resultB.avgAccuracy.toFixed(1)}%`}
                    />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}

          {/* ── Openings ───────────────────────────────────────────────── */}
          {activeTab === 1 && (
            <OpeningComparison
              statsA={resultA.openingStats}
              statsB={resultB.openingStats}
              nameA={nameA}
              nameB={nameB}
            />
          )}

    
        </CardContent>
      </Card>
    </Box>
  );
};

export default PlayerComparisonDashboard;
