"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { CheckCircle as SuccessIcon, OpenInNew as OpenIcon } from "@mui/icons-material";

import {
  clearLichessCredentials,
  getLichessToken,
  getLichessUsername,
} from "@/lib/lichessOAuth";
import {
  buildBatchPgn,
  buildStudyBatches,
  createStudy,
  fetchUserStudies,
  importPgnToStudy,
  parseStudyId,
  suggestStudyName,
  STUDY_CHAPTER_CHUNK_SIZE,
  type LichessStudySummary,
  type StudyBatch,
  type StudyVisibility,
} from "@/libs/lichess/study";
import { MAX_PUZZLE_PACK_SIZE, type KeyPosition } from "@/libs/batchreview/types";

interface SaveToLichessStudyDialogProps {
  open: boolean;
  onClose: () => void;
  keyPositions: KeyPosition[];
}

type BatchMode = "create" | "existing";

interface BatchForm {
  mode: BatchMode;
  name: string;
  visibility: StudyVisibility;
  existingInput: string;
}

type BatchStatus =
  | { state: "idle" }
  | { state: "importing" }
  | { state: "success"; studyId: string; chapters: number }
  | { state: "error"; message: string };

export default function SaveToLichessStudyDialog({
  open,
  onClose,
  keyPositions,
}: SaveToLichessStudyDialogProps) {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [existingStudies, setExistingStudies] = useState<LichessStudySummary[]>([]);
  const [forms, setForms] = useState<Record<number, BatchForm>>({});
  const [statuses, setStatuses] = useState<Record<number, BatchStatus>>({});
  const [isSaving, setIsSaving] = useState(false);

  const batches = useMemo(() => buildStudyBatches(keyPositions), [keyPositions]);
  const isConnected = !!token && !!username;

  // Pick up the connected account, and react to the connect/callback flow
  // updating localStorage (same pattern as LichessConnectButton).
  useEffect(() => {
    setToken(getLichessToken());
    setUsername(getLichessUsername());
  }, [open]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lichess-token" || e.key === "lichess-username") {
        setToken(getLichessToken());
        setUsername(getLichessUsername());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Default every batch to "create a new study" with a suggested name.
  useEffect(() => {
    if (!open) return;
    setForms((prev) => {
      const next = { ...prev };
      for (const batch of batches) {
        if (!next[batch.batchNumber]) {
          next[batch.batchNumber] = {
            mode: "create",
            name: suggestStudyName(batch, batches.length),
            visibility: "unlisted",
            existingInput: "",
          };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, batches.length]);

  const loadStudies = useCallback(async () => {
    if (!token || !username) return;
    try {
      const studies = await fetchUserStudies(token, username);
      setExistingStudies(studies);
    } catch {
      // Non-critical — "existing study" mode still works via pasted URL/ID
      setExistingStudies([]);
    }
  }, [token, username]);

  useEffect(() => {
    if (open && isConnected) void loadStudies();
  }, [open, isConnected, loadStudies]);

  const updateForm = (batchNumber: number, patch: Partial<BatchForm>) => {
    setForms((prev) => ({
      ...prev,
      [batchNumber]: { ...prev[batchNumber], ...patch },
    }));
  };

  const router = useRouter();

  const handleGoToSettings = useCallback(() => {
    // The stored token lacks study:write — drop it so the next visit to
    // Settings shows "Connect" rather than a stale "Connected" state, then
    // hand off to the Settings page's own connect flow instead of
    // re-triggering OAuth from inside this dialog.
    clearLichessCredentials();
    onClose();
    router.push("/setting");
  }, [onClose, router]);

  const importBatch = useCallback(
    async (batch: StudyBatch) => {
      const form = forms[batch.batchNumber];
      if (!form) return;

      setStatuses((prev) => ({ ...prev, [batch.batchNumber]: { state: "importing" } }));
      try {
        let studyId: string;
        if (form.mode === "create") {
          const name = form.name.trim() || suggestStudyName(batch, batches.length);
          const created = await createStudy(token, name, form.visibility);
          studyId = created.id;
        } else {
          const parsed = parseStudyId(form.existingInput);
          if (!parsed) {
            throw new Error("Enter a valid Lichess study URL or 8-character ID.");
          }
          studyId = parsed;
        }

        const pgn = buildBatchPgn(batch);
        const chapters = await importPgnToStudy(token, studyId, pgn);
        setStatuses((prev) => ({
          ...prev,
          [batch.batchNumber]: {
            state: "success",
            studyId,
            chapters: chapters.length || batch.puzzles.length,
          },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed";
        setStatuses((prev) => ({
          ...prev,
          [batch.batchNumber]: { state: "error", message },
        }));
      }
    },
    [forms, token, batches.length]
  );

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    // Sequential — Lichess asks API clients to only have one request in
    // flight at a time.
    for (const batch of batches) {
      if (statuses[batch.batchNumber]?.state === "success") continue;
      await importBatch(batch);
    }
    setIsSaving(false);
  }, [batches, importBatch, statuses]);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const needsScopeReconnect = Object.values(statuses).some(
    (s) => s.state === "error" && /403|scope/i.test(s.message)
  );
  const hitDailyStudyLimit = Object.values(statuses).some(
    (s) => s.state === "error" && /429|limit/i.test(s.message)
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle>Save Puzzle Pack to Lichess</DialogTitle>
      <DialogContent>
        {!isConnected ? (
          <Stack spacing={2}>
            <Alert severity="info">
              Connect your Lichess account to save this puzzle pack as one or
              more studies. ChessAgine will request the{" "}
              <strong>study:write</strong> permission so it can create
              studies and add chapters on your behalf — nothing else on your
              account is touched.
            </Alert>
            <Button variant="contained" onClick={handleGoToSettings} sx={{ alignSelf: "flex-start" }}>
              Go to Settings to connect Lichess
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              {Math.min(keyPositions.length, MAX_PUZZLE_PACK_SIZE)} puzzles →{" "}
              {batches.length} {batches.length === 1 ? "study" : "studies"} of
              up to {STUDY_CHAPTER_CHUNK_SIZE} chapters each. Each batch below
              creates its own new study by default — Lichess allows up to 30
              new studies per day.
            </Typography>

            {needsScopeReconnect && (
              <Alert
                severity="warning"
                action={
                  <Button color="inherit" size="small" onClick={handleGoToSettings}>
                    Go to Settings
                  </Button>
                }
              >
                Your connected Lichess account doesn&apos;t have study
                permission yet. Go to Settings to reconnect your account —
                you&apos;ll get a fresh permission prompt that includes it.
              </Alert>
            )}

            {hitDailyStudyLimit && (
              <Alert severity="warning">
                You may have hit Lichess&apos;s 30-new-studies-per-day limit.
                Switch the remaining batches to &quot;Existing study&quot; below.
              </Alert>
            )}

            {batches.map((batch) => {
              const status = statuses[batch.batchNumber] ?? { state: "idle" };
              const form = forms[batch.batchNumber];
              if (!form) return null;
              const locked = status.state === "importing" || status.state === "success";

              return (
                <Paper
                  key={batch.batchNumber}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2 }}
                >
                  <Stack spacing={1.25}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography fontWeight={700} fontSize="0.9rem">
                        Batch {batch.batchNumber} · {batch.label}
                      </Typography>
                      {status.state === "success" && (
                        <Chip
                          icon={<SuccessIcon />}
                          label={`${status.chapters} chapters saved`}
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {status.state === "importing" && <CircularProgress size={18} />}
                    </Box>

                    {!locked && (
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={form.mode}
                        onChange={(_, value: BatchMode | null) =>
                          value && updateForm(batch.batchNumber, { mode: value })
                        }
                      >
                        <ToggleButton value="create">New study</ToggleButton>
                        <ToggleButton value="existing">Existing study</ToggleButton>
                      </ToggleButtonGroup>
                    )}

                    {form.mode === "create" ? (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Study name"
                          value={form.name}
                          onChange={(e) =>
                            updateForm(batch.batchNumber, { name: e.target.value })
                          }
                          disabled={locked}
                        />
                        <TextField
                          size="small"
                          select
                          label="Visibility"
                          value={form.visibility}
                          onChange={(e) =>
                            updateForm(batch.batchNumber, {
                              visibility: e.target.value as StudyVisibility,
                            })
                          }
                          disabled={locked}
                          sx={{ minWidth: 140 }}
                        >
                          <MenuItem value="private">Private</MenuItem>
                          <MenuItem value="unlisted">Unlisted</MenuItem>
                          <MenuItem value="public">Public</MenuItem>
                        </TextField>
                      </Stack>
                    ) : (
                      <Stack spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Target study URL or ID"
                          placeholder="https://lichess.org/study/XXXXXXXX or just the ID"
                          value={form.existingInput}
                          onChange={(e) =>
                            updateForm(batch.batchNumber, { existingInput: e.target.value })
                          }
                          disabled={locked}
                        />
                        {existingStudies.length > 0 && (
                          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Your studies:
                            </Typography>
                            {existingStudies.slice(0, 6).map((study) => (
                              <Chip
                                key={study.id}
                                label={study.name}
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  updateForm(batch.batchNumber, { existingInput: study.id })
                                }
                              />
                            ))}
                          </Box>
                        )}
                      </Stack>
                    )}

                    {status.state === "error" && (
                      <Alert severity="error" sx={{ py: 0 }}>
                        {status.message}
                      </Alert>
                    )}

                    {status.state === "success" && (
                      <MuiLink
                        href={`https://lichess.org/study/${status.studyId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                      >
                        Open study on Lichess
                        <OpenIcon sx={{ fontSize: 12, verticalAlign: "middle", ml: 0.25 }} />
                      </MuiLink>
                    )}

                    {status.state === "error" && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => void importBatch(batch)}
                        sx={{ alignSelf: "flex-start" }}
                      >
                        Retry this batch
                      </Button>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isSaving}>
          Close
        </Button>
        {isConnected && (
          <Button
            variant="contained"
            onClick={() => void handleSaveAll()}
            disabled={
              isSaving ||
              batches.every((b) => statuses[b.batchNumber]?.state === "success")
            }
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSaving ? "Saving…" : "Save to Lichess"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
