"use client";

/**
 * @file LichessBoardSettings.tsx
 * @description Collapsible board appearance settings panel for the Lichess
 * play page. Allows changing board theme and piece set without leaving the game.
 *
 * Changes are persisted globally via saveSettings() and apply across all
 * boards in the app (analysis, game review, etc.).
 */

import { memo } from "react";
import {
  Box,
  Card,
  CardContent,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { BOARD_THEMES, PIECE_STYLE_TYPES } from "@/libs/setting/helper";

export interface LichessBoardSettingsProps {
  /** Whether the settings panel is expanded */
  open:       boolean;
  /** Current board theme key (e.g. "blue", "brown") */
  boardTheme: string;
  /** Current piece set key (e.g. "Cburnett", "Anime") */
  pieceType:  string;
  /** Called when the user selects a new board theme */
  onSetTheme: (value: string) => void;
  /** Called when the user selects a new piece set */
  onSetPiece: (value: string) => void;
}

/**
 * A collapsible card with Board Theme and Piece Set dropdowns.
 *
 * Wrapped in React.memo so it only re-renders when props change — the parent
 * re-renders every 100ms due to the clock ticker, and this panel must not flicker.
 */
const LichessBoardSettings = memo(
  ({ open, boardTheme, pieceType, onSetTheme, onSetPiece }: LichessBoardSettingsProps) => (
    <Collapse in={open}>
      <Card variant="outlined" sx={{ mt: 1, mb: 1, borderRadius: 2 }}>
        <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
          <Stack spacing={1.5}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              letterSpacing={1}
            >
              BOARD APPEARANCE
            </Typography>

            {/* Board theme */}
            <FormControl size="small" fullWidth>
              <InputLabel>Board Theme</InputLabel>
              <Select
                value={boardTheme}
                label="Board Theme"
                onChange={e => onSetTheme(e.target.value)}
              >
                {Object.entries(BOARD_THEMES).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: 0.5,
                          background: `linear-gradient(135deg, ${val.lightSquareColor} 50%, ${val.darkSquareColor} 50%)`,
                        }}
                      />
                      <span>{val.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Piece set */}
            <FormControl size="small" fullWidth>
              <InputLabel>Piece Set</InputLabel>
              <Select
                value={pieceType}
                label="Piece Set"
                onChange={e => onSetPiece(e.target.value)}
              >
                {Object.entries(PIECE_STYLE_TYPES).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    {val.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>
    </Collapse>
  )
);

LichessBoardSettings.displayName = "LichessBoardSettings";
export default LichessBoardSettings;
