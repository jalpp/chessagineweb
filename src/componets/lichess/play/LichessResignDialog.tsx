"use client";

/**
 * @file LichessResignDialog.tsx
 * @description Confirmation dialog shown before the user resigns a game.
 * Prevents accidental resignation from a misclick on the Resign button.
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
import { Flag as ResignIcon } from "@mui/icons-material";

interface LichessResignDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Called when the user confirms resignation */
  onConfirm: () => void;
}

/**
 * Asks the user to confirm before resigning.
 * "Cancel" (primary, auto-focused) dismisses. "Resign" (error) proceeds.
 */
const LichessResignDialog: React.FC<LichessResignDialogProps> = ({
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
        <ResignIcon color="error" />
        <Typography variant="h6" fontWeight={700}>Resign?</Typography>
      </Stack>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        Are you sure you want to resign? This will end the game and count as a loss.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
      <Button variant="contained" onClick={onCancel} autoFocus sx={{ fontWeight: 700 }}>
        Keep Playing
      </Button>
      <Button variant="outlined" color="error" onClick={onConfirm}>
        Resign
      </Button>
    </DialogActions>
  </Dialog>
);

export default LichessResignDialog;
