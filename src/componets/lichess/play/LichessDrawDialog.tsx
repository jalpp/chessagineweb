"use client";

/**
 * @file LichessDrawDialog.tsx
 * @description Confirmation dialog shown before the user offers (or accepts) a draw.
 * Prevents accidental draw offers from a misclick.
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
import { Handshake as DrawIcon } from "@mui/icons-material";

interface LichessDrawDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /**
   * Whether this is accepting an incoming offer (true) or sending a new offer (false).
   * Changes the copy shown to the user.
   */
  isAccepting: boolean;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Called when the user confirms the draw offer or acceptance */
  onConfirm: () => void;
}

/**
 * Confirms a draw offer or acceptance.
 * "Cancel" (primary, auto-focused) dismisses. "Offer Draw" / "Accept Draw" proceeds.
 */
const LichessDrawDialog: React.FC<LichessDrawDialogProps> = ({
  open,
  isAccepting,
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
        <DrawIcon color="secondary" />
        <Typography variant="h6" fontWeight={700}>
          {isAccepting ? "Accept draw?" : "Offer draw?"}
        </Typography>
      </Stack>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        {isAccepting
          ? "Accept your opponent's draw offer? The game will end as a draw."
          : "Send a draw offer to your opponent? They can accept or decline."}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
      <Button variant="contained" onClick={onCancel} autoFocus sx={{ fontWeight: 700 }}>
        Cancel
      </Button>
      <Button variant="outlined" color="secondary" onClick={onConfirm}>
        {isAccepting ? "Accept Draw" : "Offer Draw"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default LichessDrawDialog;
