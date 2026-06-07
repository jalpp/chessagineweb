"use client";

/**
 * @file LichessAbortDialog.tsx
 * @description Confirmation dialog shown before the user aborts a game.
 * Only relevant when fewer than 2 moves have been played.
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import { Cancel as AbortIcon } from "@mui/icons-material";

interface LichessAbortDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Called when the user confirms the abort */
  onConfirm: () => void;
}

/**
 * Confirms aborting a game with no or minimal moves played.
 * "Keep Playing" (primary, auto-focused) dismisses. "Abort" (warning) proceeds.
 */
const LichessAbortDialog: React.FC<LichessAbortDialogProps> = ({
  open,
  onCancel,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={onCancel}
    maxWidth="xs"
    fullWidth
    PaperProps={{ sx: { borderRadius: 3 } }}
  >
    <DialogTitle>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <AbortIcon color="warning" />
        <Typography variant="h6" fontWeight={700}>Abort game?</Typography>
      </Stack>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        Abort this game? It will be cancelled with no result recorded for either player.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
      <Button variant="contained" onClick={onCancel} autoFocus sx={{ fontWeight: 700 }}>
        Keep Playing
      </Button>
      <Button variant="outlined" color="warning" onClick={onConfirm}>
        Abort
      </Button>
    </DialogActions>
  </Dialog>
);

export default LichessAbortDialog;
