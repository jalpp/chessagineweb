"use client";

/**
 * @file LichessLeaveDialog.tsx
 * @description Confirmation dialog shown when the user tries to navigate away
 * from an active Lichess game via the SideNav or any router.push call.
 *
 * The dialog is triggered by LichessGuardContext when isGameActive=true and
 * a navigation is requested. The user must explicitly confirm to leave.
 */

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { WarningAmber as WarningIcon } from "@mui/icons-material";

export interface LichessLeaveDialogProps {
  /** Whether the dialog is open (true when pendingHref is set) */
  open:       boolean;
  /** Called when the user clicks "Stay in Game" */
  onCancel:   () => void;
  /** Called when the user clicks "Leave Anyway" */
  onConfirm:  () => void;
}

/**
 * Modal dialog that warns the user their game will be lost if they leave.
 *
 * - "Stay in Game" (primary, auto-focused) cancels the navigation
 * - "Leave Anyway" (outlined, error color) proceeds with the pending route
 *
 * The dialog informs the user that:
 * 1. Board state and move history in ChessAgine will be lost
 * 2. Their clock keeps running on Lichess (risk of time forfeit)
 * 3. They can continue the game on Lichess.org directly
 */
export default function LichessLeaveDialog({
  open,
  onCancel,
  onConfirm,
}: LichessLeaveDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <WarningIcon color="warning" />
          <Typography variant="h6" fontWeight={700}>
            Leave game in progress?
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body1">
            You have a live Lichess game in progress. If you navigate away now:
          </Typography>

          <Box
            component="ul"
            sx={{ m: 0, pl: 2.5, "& li": { mb: 0.75 } }}
          >
            <Typography component="li" variant="body2" color="text.secondary">
              All current board state and move history in ChessAgine will be lost.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Your clock will keep running on Lichess — time loss may result in a forfeit.
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              To continue, go to your{" "}
              <Box
                component="a"
                href="https://lichess.org"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "primary.main", textDecoration: "underline" }}
              >
                Lichess account
              </Box>{" "}
              and resume the game there.
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ fontSize: "0.85rem" }}>
            <strong>Your clock is still running.</strong> Return to this page
            to keep playing, or resign on Lichess before leaving.
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          variant="contained"
          onClick={onCancel}
          autoFocus
          sx={{ fontWeight: 700 }}
        >
          Stay in Game
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={onConfirm}
        >
          Leave Anyway
        </Button>
      </DialogActions>
    </Dialog>
  );
}
