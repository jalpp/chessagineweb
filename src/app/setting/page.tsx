"use client";

import { usePageReady } from "@/hooks/usePageReady";
import { useState } from "react";
import {
  Box, Container, Paper, Typography, Divider, Stack, Chip,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Slider, Tooltip, Button, Alert, Card, CardContent,
} from "@mui/material";
import {
  Palette as PaletteIcon,
  ViewQuilt as BoardIcon,
  Memory as EngineIcon,
  Extension as PgnIcon,
  Storage as ChessdbIcon,
  EmojiEvents as PuzzleIcon,
  Link as LinkIcon,
  SmartToy as ModelIcon,
  VpnKey as KeyIcon,
  LockOutlined as LockIcon,
  StarOutlined as StarIcon,
  CheckCircleOutline as FreeIcon,
} from "@mui/icons-material";
import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { useSettings } from "@/context/SettingContext";
import { useTheme as useAppTheme, ThemeType } from "@/context/ThemeContext";
import {
  BOARD_THEMES, PIECE_STYLE_TYPES,
} from "@/libs/setting/helper";
import { EngineName } from "@/stockfish/engine/engine";
import IntegrationSettings from "@/componets/tabs/IntegrationSetting";
import ModelSetting from "@/componets/tabs/ModelSetting";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import WavesIcon from "@mui/icons-material/Waves";
import ForestIcon from "@mui/icons-material/Forest";
import NaturePeopleIcon from "@mui/icons-material/NaturePeople";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import DiamondIcon from "@mui/icons-material/Diamond";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { CardGiftcard } from "@mui/icons-material";
import React from "react";

// ─── GUI Themes ───────────────────────────────────────────────────────────────
const GUI_THEMES = [
  { value: "light",        label: "Light",        icon: <LightModeIcon />,      color: "#1976d2" },
  { value: "dark",         label: "Dark Grey",    icon: <DarkModeIcon />,       color: "#bb86fc" },
  { value: "purple",       label: "Purple",       icon: <ColorLensIcon />,      color: "#9c27b0" },
  { value: "darkBlue",     label: "Dark Blue",    icon: <WavesIcon />,          color: "#1e88e5" },
  { value: "forest",       label: "Forest",       icon: <ForestIcon />,         color: "#388e3c" },
  { value: "wooden",       label: "Wooden Chess", icon: <NaturePeopleIcon />,   color: "#8B4513" },
  { value: "disco",        label: "Disco",        icon: <MusicNoteIcon />,      color: "#FF1493" },
  { value: "classicChess", label: "Classic Chess",icon: <CheckBoxIcon />,       color: "#FFFFFF" },
  { value: "marble",       label: "Marble",       icon: <DiamondIcon />,        color: "#757575" },
  { value: "neonCyber",    label: "Neon Cyber",   icon: <FlashOnIcon />,        color: "#00FFFF" },
  { value: "christmas",    label: "Christmas",    icon: <CardGiftcard />,       color: "#C41E3A" },
];

const ENGINE_OPTIONS = [
  { value: EngineName.Stockfish18,      label: "Stockfish 18 NNUE (recommended)" },
  { value: EngineName.Stockfish17Point, label: "Stockfish 17.1 NNUE" },
  { value: EngineName.Stockfish17,      label: "Stockfish 17 NNUE" },
  { value: EngineName.Stockfish16,      label: "Stockfish 16 NNUE" },
];

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon, title, badge, children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: "free" | "paid" | "all";
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {badge === "free" && (
          <Chip icon={<FreeIcon sx={{ fontSize: 14 }} />} label="Free" size="small"
            color="success" variant="outlined" sx={{ fontSize: "0.7rem", height: 22 }} />
        )}
        {badge === "paid" && (
          <Chip icon={<StarIcon sx={{ fontSize: 14 }} />} label="Paid" size="small"
            color="warning" variant="outlined" sx={{ fontSize: "0.7rem", height: 22 }} />
        )}
      </Stack>
      {children}
    </Box>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────
function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} py={1.5}
      sx={{ borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: "none" } }}>
      <Box>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        {description && <Typography variant="caption" color="text.secondary">{description}</Typography>}
      </Box>
      <Box sx={{ minWidth: { sm: 200 }, width: { xs: "100%", sm: "auto" } }}>{children}</Box>
    </Stack>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  usePageReady();
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  const { currentTheme, setTheme } = useAppTheme();

  const {
    saveSettings,
    boardTheme, boardPieceType, boardSize, boardAnimDuration,
    boardShowCoords, boardFlipped, boardShowEvalBar, boardShowFen,
    boardShowHanging, boardShowSemiProtected,
    engineDepth, engineLines, enginePicked,
    pgnViewMode, chessdbShowScores, chessdbShowWinrates,
    puzzleLevel, userPuzzleRating,
  } = useSettings();

  // Board theme preview
  const boardThemeColors = BOARD_THEMES[boardTheme as keyof typeof BOARD_THEMES] ?? BOARD_THEMES.blue;

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="md">

        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight={800} gutterBottom>Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure ChessAgine to your preferences. Board and engine settings apply everywhere across the app.
            {!isSignedIn && " Settings are stored locally in your browser."}
            {isSignedIn && " Your settings sync across devices."}
          </Typography>
        </Box>

        <Stack spacing={4}>

          {/* ── 1. App Appearance ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<PaletteIcon />} title="App Appearance" badge="free">
              <SettingRow label="GUI Theme" description="Color theme for the entire ChessAgine interface">
                <FormControl fullWidth size="small">
                  <Select value={currentTheme} onChange={e => setTheme(e.target.value as ThemeType)}>
                    {GUI_THEMES.map(t => (
                      <MenuItem key={t.value} value={t.value}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {React.cloneElement(t.icon, { sx: { color: t.color, fontSize: 18 } })}
                          <span>{t.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>
            </Section>
          </Paper>

          {/* ── 2. Board Appearance ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<BoardIcon />} title="Board Appearance" badge="free">

              <SettingRow label="Board Theme" description="Color scheme for chess squares">
                <FormControl fullWidth size="small">
                  <Select value={boardTheme} onChange={e => saveSettings({ board_theme: e.target.value })}>
                    {Object.entries(BOARD_THEMES).map(([key, val]) => (
                      <MenuItem key={key} value={key}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box sx={{
                            width: 28, height: 14, borderRadius: 0.5, flexShrink: 0,
                            background: `linear-gradient(90deg, ${val.lightSquareColor} 50%, ${val.darkSquareColor} 50%)`,
                          }} />
                          <span>{val.name}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>

              <SettingRow label="Piece Set" description="Visual style for chess pieces">
                <FormControl fullWidth size="small">
                  <Select value={boardPieceType} onChange={e => saveSettings({ board_piece_type: e.target.value })}>
                    {Object.entries(PIECE_STYLE_TYPES).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>

              <SettingRow label={`Board Size: ${boardSize}px`} description="Width and height of the board in pixels">
                <Slider value={boardSize} min={300} max={800} step={20}
                  onChange={(_, v) => saveSettings({ board_ui_size: v as number })}
                  marks={[{value:300,label:"300"},{value:550,label:"550"},{value:800,label:"800"}]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

              <SettingRow label={`Animation: ${boardAnimDuration}ms`} description="Piece move animation speed (0 = instant)">
                <Slider value={boardAnimDuration} min={0} max={800} step={50}
                  onChange={(_, v) => saveSettings({ board_ui_animation_duration: v as number })}
                  marks={[{value:0,label:"Off"},{value:300,label:"300"},{value:800,label:"800"}]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

              <SettingRow label="Show Coordinates" description="Display rank/file labels on the board">
                <Switch checked={boardShowCoords}
                  onChange={e => saveSettings({ board_show_coordinates: e.target.checked })} />
              </SettingRow>

              <SettingRow label="Flip Board" description="View the board from Black's perspective by default">
                <Switch checked={boardFlipped}
                  onChange={e => saveSettings({ board_ui_flipped: e.target.checked })} />
              </SettingRow>

            </Section>
          </Paper>

          {/* ── 3. Board Analysis UI ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<BoardIcon />} title="Analysis Board Overlays" badge="free">
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                These overlays appear in the Analyze Position and Analyze Game pages.
              </Typography>

              <SettingRow label="Evaluation Bar" description="Show the engine evaluation bar on the side of the board">
                <Switch checked={boardShowEvalBar}
                  onChange={e => saveSettings({ board_ui_show_eval_bar: e.target.checked })} />
              </SettingRow>

              <SettingRow label="Show FEN" description="Display the current FEN string below the board">
                <Switch checked={boardShowFen}
                  onChange={e => saveSettings({ board_ui_show_fen: e.target.checked })} />
              </SettingRow>

              <SettingRow label="Highlight Hanging Pieces" description="Visually flag pieces that are undefended">
                <Switch checked={boardShowHanging}
                  onChange={e => saveSettings({ board_ui_show_hanging_piece: e.target.checked })} />
              </SettingRow>

              <SettingRow label="Highlight Semi-Protected Pieces" description="Flag pieces defended only once but attacked">
                <Switch checked={boardShowSemiProtected}
                  onChange={e => saveSettings({ board_ui_show_semiprotected: e.target.checked })} />
              </SettingRow>

            </Section>
          </Paper>

          {/* ── 4. Engine ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<EngineIcon />} title="Stockfish Engine" badge="free">
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Settings for computer analysis in Position, Game Review, and Play Bot pages.
              </Typography>

              <SettingRow label="Engine Version" description="Which Stockfish build to use for analysis">
                <FormControl fullWidth size="small">
                  <Select value={enginePicked} onChange={e => saveSettings({ engine_picked: e.target.value })}>
                    {ENGINE_OPTIONS.map(e => (
                      <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>

              <SettingRow label={`Analysis Depth: ${engineDepth}`} description="Higher depth = stronger but slower analysis">
                <Slider value={engineDepth} min={5} max={30} step={1}
                  onChange={(_, v) => saveSettings({ engine_depth: v as number })}
                  marks={[{value:5,label:"5"},{value:18,label:"18"},{value:30,label:"30"}]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

              <SettingRow label={`Analysis Lines: ${engineLines}`} description="Number of best move lines shown simultaneously">
                <Slider value={engineLines} min={1} max={5} step={1}
                  onChange={(_, v) => saveSettings({ engine_lines: v as number })}
                  marks={[{value:1,label:"1"},{value:3,label:"3"},{value:5,label:"5"}]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

            </Section>
          </Paper>

          {/* ── 5. PGN & Opening Book ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<PgnIcon />} title="Game Viewer" badge="free">

              <SettingRow label="Move List Display" description="How moves are shown in the game review panel">
                <FormControl fullWidth size="small">
                  <Select value={pgnViewMode} onChange={e => saveSettings({ pgn_view_mode: e.target.value })}>
                    <MenuItem value="pgn">PGN Format</MenuItem>
                    <MenuItem value="movelist">Move List</MenuItem>
                  </Select>
                </FormControl>
              </SettingRow>

              <SettingRow label="ChessDB — Show Scores" description="Display win/draw/loss scores in the opening book panel">
                <Switch checked={chessdbShowScores}
                  onChange={e => saveSettings({ chessdb_show_scores: e.target.checked })} />
              </SettingRow>

              <SettingRow label="ChessDB — Show Win Rates" description="Display percentage win rates alongside opening moves">
                <Switch checked={chessdbShowWinrates}
                  onChange={e => saveSettings({ chessdb_show_winrates: e.target.checked })} />
              </SettingRow>

            </Section>
          </Paper>

          {/* ── 6. Puzzles ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<PuzzleIcon />} title="Puzzles" badge="free">
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Your puzzle rating updates automatically as you solve puzzles.
              </Typography>

              <SettingRow label={`Starting Puzzle Rating: ${puzzleLevel}`} description="Initial difficulty level for new puzzle sessions">
                <Slider value={puzzleLevel} min={500} max={2800} step={100}
                  onChange={(_, v) => saveSettings({ puzzle_level: v as number })}
                  marks={[{value:500,label:"500"},{value:1500,label:"1500"},{value:2800,label:"2800"}]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

              <SettingRow label={`Your Puzzle Rating: ${Math.round(userPuzzleRating)}`} description="Current ELO-style rating based on your puzzle performance">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={Math.round(userPuzzleRating)} color={userPuzzleRating >= 1800 ? "success" : userPuzzleRating >= 1200 ? "primary" : "default"} size="small" />
                  <Button size="small" variant="outlined" color="warning"
                    onClick={() => saveSettings({ user_puzzle_rating: 1500 })}>
                    Reset
                  </Button>
                </Stack>
              </SettingRow>

            </Section>
          </Paper>

          {/* ── 7. Lichess Account ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<LinkIcon />} title="Lichess Account" badge="free">
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Connect your Lichess account to play live games, access your studies, and import your game history. Your token is stored only in your browser — never on our servers.
              </Typography>
              {/* IntegrationSettings renders only the Lichess card for guests */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                  <IntegrationSettings lichessOnly />
                </CardContent>
              </Card>
            </Section>
          </Paper>

          {/* ── 8. AI Model & API Keys — sign-in required ── */}
          {isSignedIn ? (
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
              <Section icon={<ModelIcon />} title="AI Model & API Keys" badge={isPaidTier ? "paid" : undefined}>
                <ModelSetting />
              </Section>
            </Paper>
          ) : (
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, opacity: 0.9 }}>
              <Section icon={<ModelIcon />} title="AI Model & API Keys">
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>Sign in to configure AI models</Typography>
                  <Typography variant="caption">
                    Create a free ChessAgine account to choose your AI model, configure BYO API keys (Claude, Gemini, GPT), and sync settings across devices.
                  </Typography>
                </Alert>
                <Box display="flex" justifyContent="center">
                  <SignIn routing="hash" />
                </Box>
              </Section>
            </Paper>
          )}

        </Stack>
      </Container>
    </Box>
  );
}
