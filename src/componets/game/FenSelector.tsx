"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Select,
  MenuItem,
  TextField,
  Alert,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Chess } from "chess.js";
import { FEN_PRESETS } from "@/libs/agine/fenpreset";

interface FenSelectorProps {
  value: string;
  onChange: (fen: string) => void;
  disabled?: boolean;
}

export const FenSelector: React.FC<FenSelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const [customFen, setCustomFen] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateAndSetFen = (fen: string) => {
    try {
      const game = new Chess();
      if (fen === "startpos") {
        onChange(game.fen());
        setError(null);
        return;
      }


      onChange(fen);
      setError(null);
    } catch {
      setError("Invalid FEN string");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" fontWeight={600}>
        Starting Position
      </Typography>

      {/* Presets */}
      <FormControl fullWidth>
        <InputLabel>Preset Positions</InputLabel>
        <Select
          label="Preset Positions"
          disabled={disabled}
          onChange={(e) => validateAndSetFen(e.target.value)}
          value=""
        >
          {FEN_PRESETS.map((preset) => (
            <MenuItem key={preset.id} value={preset.fen}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {preset.name}
                </Typography>
                {preset.description && (
                  <Typography variant="caption" color="text.secondary">
                    {preset.description}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Custom FEN */}
      <TextField
        label="Custom FEN"
        placeholder="Paste a FEN string here"
        value={customFen}
        disabled={disabled}
        onChange={(e) => {
          setCustomFen(e.target.value);
          validateAndSetFen(e.target.value);
        }}
        multiline
        minRows={2}
        fullWidth
        error={!!error}
        helperText={error || "Leave empty to use preset"}
      />

      {value && (
        <Alert severity="info">
          Game will start from the selected position.
        </Alert>
      )}
    </Stack>
  );
};
