"use client";

import { usePageReady } from "@/hooks/usePageReady";
import {
  Box, Container, Paper, Typography, Stack,
  Select, MenuItem, FormControl, Switch, Slider, Button, Alert,
  Card, CardContent, Tooltip,
} from "@mui/material";
import {
  Palette as PaletteIcon,
  ViewQuilt as BoardIcon,
  Memory as EngineIcon,
  Extension as PgnIcon,
  EmojiEvents as PuzzleIcon,
  Link as LinkIcon,
  SmartToy as ModelIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { useSettings } from "@/context/SettingContext";
import { useTheme as useAppTheme, ThemeType } from "@/context/ThemeContext";
import { BOARD_THEMES, PIECE_STYLE_TYPES, is3DSet } from "@/libs/setting/helper";
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
import React, { useMemo } from "react";

// ─── GUI Themes ───────────────────────────────────────────────────────────────
const GUI_THEMES = [
  { value: "light",        label: "Light",         icon: <LightModeIcon />,    color: "#1976d2" },
  { value: "dark",         label: "Dark Grey",     icon: <DarkModeIcon />,     color: "#bb86fc" },
  { value: "purple",       label: "Purple",        icon: <ColorLensIcon />,    color: "#9c27b0" },
  { value: "darkBlue",     label: "Dark Blue",     icon: <WavesIcon />,        color: "#1e88e5" },
  { value: "forest",       label: "Forest",        icon: <ForestIcon />,       color: "#388e3c" },
  { value: "wooden",       label: "Wooden Chess",  icon: <NaturePeopleIcon />, color: "#8B4513" },
  { value: "disco",        label: "Disco",         icon: <MusicNoteIcon />,    color: "#FF1493" },
  { value: "classicChess", label: "Classic Chess", icon: <CheckBoxIcon />,     color: "#FFFFFF" },
  { value: "marble",       label: "Marble",        icon: <DiamondIcon />,      color: "#757575" },
  { value: "neonCyber",    label: "Neon Cyber",    icon: <FlashOnIcon />,      color: "#00FFFF" },
  { value: "christmas",    label: "Christmas",     icon: <CardGiftcard />,     color: "#C41E3A" },
];

const ENGINE_OPTIONS = [
  { value: EngineName.Stockfish18,      label: "Stockfish 18 NNUE (recommended)" },
  { value: EngineName.Stockfish17Point, label: "Stockfish 17.1 NNUE" },
  { value: EngineName.Stockfish17,      label: "Stockfish 17 NNUE" },
  { value: EngineName.Stockfish16,      label: "Stockfish 16 NNUE" },
];

// Knight image src for a given piece set
function knightSrc(pieceSet: string): string {
  if (!pieceSet || pieceSet.toLowerCase() === "cburnett") {
    return "/static/pieces/Cburnett/wN.svg";
  }
  return `/static/pieces/${pieceSet}/wN.png`;
}

// ─── Mini Board Preview ───────────────────────────────────────────────────────
// A 4×4 corner of a chessboard with the current theme + a knight on d4
const MINI_SQUARES = [
  // row 0 (rank 8 visual top) — light-dark-light-dark
  [false, true,  false, true ],
  [true,  false, true,  false],
  [false, true,  false, true ],
  [true,  false, true,  false],
];
// Knight sits at row-index 2, col-index 1 (a nice center-ish position)
const KNIGHT_ROW = 2;
const KNIGHT_COL = 1;

function MiniBoardPreview({ boardTheme, pieceType }: { boardTheme: string; pieceType: string }) {
  const tc = BOARD_THEMES[boardTheme as keyof typeof BOARD_THEMES] ?? BOARD_THEMES.blue;
  const squareSize = 36;
  const totalSize = squareSize * 4;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(4, ${squareSize}px)`,
        gridTemplateRows: `repeat(4, ${squareSize}px)`,
        borderRadius: 1.5,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        width: totalSize,
        height: totalSize,
        flexShrink: 0,
      }}
    >
      {MINI_SQUARES.flatMap((row, ri) =>
        row.map((isDark, ci) => {
          const isKnight = ri === KNIGHT_ROW && ci === KNIGHT_COL;
          return (
            <Box
              key={`${ri}-${ci}`}
              sx={{
                width: squareSize,
                height: squareSize,
                bgcolor: isDark ? tc.darkSquareColor : tc.lightSquareColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {isKnight && (
                <Box
                  component="img"
                  src={knightSrc(pieceType)}
                  alt="knight"
                  sx={{
                    width: squareSize * 0.88,
                    height: squareSize * 0.88,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
}

// ─── Piece Picker ─────────────────────────────────────────────────────────────
function PiecePicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
        gap: 1,
        mt: 1,
      }}
    >
      {Object.entries(PIECE_STYLE_TYPES).map(([key, val]) => {
        const isSelected = selected === key;
        const src = knightSrc(key);
        return (
          <Tooltip key={key} title={val.name} placement="top" arrow>
            <Box
              onClick={() => onSelect(key)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                p: 1,
                borderRadius: 2,
                cursor: "pointer",
                border: "2px solid",
                borderColor: isSelected ? "primary.main" : "divider",
                bgcolor: isSelected ? "action.selected" : "transparent",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: isSelected ? "primary.main" : "text.secondary",
                  bgcolor: "action.hover",
                },
                position: "relative",
              }}
            >
              {isSelected && (
                <Box sx={{
                  position: "absolute", top: 3, right: 3,
                  color: "primary.main", display: "flex",
                }}>
                  <CheckIcon sx={{ fontSize: 12 }} />
                </Box>
              )}
              <Box
                component="img"
                src={src}
                alt={val.name}
                sx={{
                  width: 36,
                  height: 36,
                  objectFit: "contain",
                  display: "block",
                  // Slight drop shadow so white pieces show on any background
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.62rem",
                  lineHeight: 1.2,
                  textAlign: "center",
                  color: isSelected ? "primary.main" : "text.secondary",
                  fontWeight: isSelected ? 700 : 400,
                  maxWidth: 64,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {val.name}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ─── Board Theme Picker ───────────────────────────────────────────────────────
function BoardThemePicker({
  selected,
  onSelect,
  pieceType,
}: {
  selected: string;
  onSelect: (key: string) => void;
  pieceType: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
        gap: 1,
        mt: 1,
      }}
    >
      {Object.entries(BOARD_THEMES).map(([key, val]) => {
        const isSelected = selected === key;
        // Tiny 2×2 board swatch
        const swatchSquares = [false, true, true, false]; // light/dark/dark/light
        return (
          <Tooltip key={key} title={val.name} placement="top" arrow>
            <Box
              onClick={() => onSelect(key)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.75,
                p: 1,
                borderRadius: 2,
                cursor: "pointer",
                border: "2px solid",
                borderColor: isSelected ? "primary.main" : "divider",
                bgcolor: isSelected ? "action.selected" : "transparent",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: isSelected ? "primary.main" : "text.secondary",
                  bgcolor: "action.hover",
                },
                position: "relative",
              }}
            >
              {isSelected && (
                <Box sx={{
                  position: "absolute", top: 3, right: 3,
                  color: "primary.main", display: "flex",
                }}>
                  <CheckIcon sx={{ fontSize: 12 }} />
                </Box>
              )}
              {/* 2×2 color swatch */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                width: 32,
                height: 32,
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: isSelected ? `0 0 0 2px` : "none",
              }}>
                {swatchSquares.map((isDark, i) => (
                  <Box key={i} sx={{
                    bgcolor: isDark ? val.darkSquareColor : val.lightSquareColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {/* knight on top-right square */}
                    {i === 1 && (
                      <Box component="img" src={knightSrc(pieceType)} alt=""
                        sx={{ width: 13, height: 13, objectFit: "contain",
                          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }} />
                    )}
                  </Box>
                ))}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.62rem",
                  textAlign: "center",
                  color: isSelected ? "primary.main" : "text.secondary",
                  fontWeight: isSelected ? 700 : 400,
                  maxWidth: 68,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {val.name}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ─── Section wrapper (no free/paid badges) ────────────────────────────────────
function Section({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
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
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1}
      py={1.5}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Box>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        {description && (
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        )}
      </Box>
      <Box sx={{ minWidth: { sm: 200 }, width: { xs: "100%", sm: "auto" } }}>
        {children}
      </Box>
    </Stack>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  usePageReady();
  const { isSignedIn } = useAuth();
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

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="md">

        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight={800} gutterBottom>Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure ChessAgine to your preferences. Board and engine settings apply everywhere across the app.
            {isSignedIn ? " Your settings sync across devices." : " Settings are stored locally in your browser."}
          </Typography>
        </Box>

        <Stack spacing={4}>

          {/* ── 1. App Appearance ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<PaletteIcon />} title="App Appearance">
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
            <Section icon={<BoardIcon />} title="Board Appearance">

              {/* Live preview + board/piece pickers side by side */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3} mb={3} alignItems={{ xs: "center", sm: "flex-start" }}>
                {/* Preview */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <MiniBoardPreview boardTheme={boardTheme} pieceType={boardPieceType} />
                  <Typography variant="caption" color="text.secondary">Preview</Typography>
                </Box>

                {/* Quick selectors stacked */}
                <Stack spacing={1.5} flex={1} width="100%">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                      Board Theme
                    </Typography>
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
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                      Piece Set
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={boardPieceType}
                        onChange={e => saveSettings({ board_piece_type: e.target.value })}
                        renderValue={(val) => (
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box component="img" src={knightSrc(val)} alt=""
                              sx={{ width: 22, height: 22, objectFit: "contain",
                                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} />
                            <span>{PIECE_STYLE_TYPES[val as keyof typeof PIECE_STYLE_TYPES]?.name ?? val}</span>
                          </Stack>
                        )}
                      >
                        {Object.entries(PIECE_STYLE_TYPES).map(([key, val]) => (
                          <MenuItem key={key} value={key}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box component="img" src={knightSrc(key)} alt={val.name}
                                sx={{ width: 26, height: 26, objectFit: "contain",
                                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} />
                              <span>{val.name}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Stack>
              </Stack>

              {/* Board theme grid with color swatches + knight */}
              <Box mb={1}>
                <Typography variant="body2" fontWeight={600} gutterBottom>Board Themes</Typography>
                <BoardThemePicker
                  selected={boardTheme}
                  onSelect={key => saveSettings({ board_theme: key })}
                  pieceType={boardPieceType}
                />
              </Box>

              {/* Piece set grid with knight previews */}
              <Box mt={3}>
                <Typography variant="body2" fontWeight={600} gutterBottom>Piece Sets</Typography>
                <PiecePicker
                  selected={boardPieceType}
                  onSelect={key => saveSettings({ board_piece_type: key })}
                />
              </Box>

              {/* Other board options */}
              <Box mt={3}>
                <SettingRow label={`Board Size: ${boardSize}px`} description="Width and height of the board in pixels">
                  <Slider value={boardSize} min={300} max={800} step={20}
                    onChange={(_, v) => saveSettings({ board_ui_size: v as number })}
                    marks={[{ value: 300, label: "300" }, { value: 550, label: "550" }, { value: 800, label: "800" }]}
                    sx={{ width: { sm: 200 } }} />
                </SettingRow>

                <SettingRow label={`Animation: ${boardAnimDuration}ms`} description="Piece move animation speed (0 = instant)">
                  <Slider value={boardAnimDuration} min={0} max={800} step={50}
                    onChange={(_, v) => saveSettings({ board_ui_animation_duration: v as number })}
                    marks={[{ value: 0, label: "Off" }, { value: 300, label: "300" }, { value: 800, label: "800" }]}
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
              </Box>

            </Section>
          </Paper>

          {/* ── 3. Analysis Overlays ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<BoardIcon />} title="Analysis Board Overlays">
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

          {/* ── 4. Stockfish Engine ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<EngineIcon />} title="Stockfish Engine">
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
                  marks={[{ value: 5, label: "5" }, { value: 18, label: "18" }, { value: 30, label: "30" }]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

              <SettingRow label={`Analysis Lines: ${engineLines}`} description="Number of best move lines shown simultaneously">
                <Slider value={engineLines} min={1} max={5} step={1}
                  onChange={(_, v) => saveSettings({ engine_lines: v as number })}
                  marks={[{ value: 1, label: "1" }, { value: 3, label: "3" }, { value: 5, label: "5" }]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>
            </Section>
          </Paper>

          {/* ── 5. Game Viewer ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<PgnIcon />} title="Game Viewer">

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
            <Section icon={<PuzzleIcon />} title="Puzzles">
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Your puzzle rating updates automatically as you solve puzzles.
              </Typography>

              <SettingRow label={`Starting Puzzle Rating: ${puzzleLevel}`} description="Initial difficulty level for new puzzle sessions">
                <Slider value={puzzleLevel} min={500} max={2800} step={100}
                  onChange={(_, v) => saveSettings({ puzzle_level: v as number })}
                  marks={[{ value: 500, label: "500" }, { value: 1500, label: "1500" }, { value: 2800, label: "2800" }]}
                  sx={{ width: { sm: 200 } }} />
              </SettingRow>

              <SettingRow
                label={`Your Puzzle Rating: ${Math.round(userPuzzleRating)}`}
                description="Current ELO-style rating based on your puzzle performance"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="outlined" color="warning"
                    onClick={() => saveSettings({ user_puzzle_rating: 1500 })}>
                    Reset to 1500
                  </Button>
                </Stack>
              </SettingRow>
            </Section>
          </Paper>

          {/* ── 7. Lichess Account ── */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Section icon={<LinkIcon />} title="Lichess Account">
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Connect your Lichess account to play live games, access your studies, and import your game history.
                Your token is stored only in your browser — never on our servers.
              </Typography>
              <IntegrationSettings lichessOnly />
            </Section>
          </Paper>

          {/* ── 8. AI Model & API Keys ── */}
          {isSignedIn ? (
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
              <Section icon={<ModelIcon />} title="AI Model & API Keys">
                <ModelSetting />
              </Section>
            </Paper>
          ) : (
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
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
