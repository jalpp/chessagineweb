"use client";
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Button,
  LinearProgress,
} from "@mui/material";
import { Psychology as BrainIcon, Download, CloudDownload } from "@mui/icons-material";
import {
  MaiaEvaluation,
  MAIA3_MODELS,
  MAIA3_RATING_VALUES,
  MODEL_CONFIGS,
} from "@/libs/nets/types";
import { useNetStatus, useNetModels } from "@/context/NetContext";
import { HumanEvalBar, qToCp, winProbToQ } from "./HumanEvalBar";

interface ObjectiveHumanEvalProps {
  evaluations: {
    maia2?: { [key: string]: MaiaEvaluation } | null;
    bigLeela?: MaiaEvaluation | null;
    elitemaia?: MaiaEvaluation | null;
    maia3?: { [key: string]: MaiaEvaluation } | null;
  };
  isLoading: boolean;
  error: Error | null;
}

// ── Maia 3 download card ──────────────────────────────────────────────────────
const Maia3DownloadCard: React.FC = () => {
  const { status, progress } = useNetStatus();
  const { downloadModel } = useNetModels();
  const [busy, setBusy] = React.useState(false);

  const modelStatus = status.maia3;
  const modelProgress = progress.maia3 ?? 0;
  const config = MODEL_CONFIGS.maia3;
  const isDownloading = busy || modelStatus === "downloading";

  const handleDownload = async () => {
    setBusy(true);
    try { await downloadModel("maia3"); } finally { setBusy(false); }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        py: 4,
        px: 2,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        textAlign: "center",
      }}
    >
      <CloudDownload sx={{ fontSize: 40, color: "primary.main", opacity: 0.8 }} />
      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {config.name} not downloaded
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340 }}>
          {config.description}
        </Typography>
      </Box>

      {isDownloading && modelProgress > 0 && (
        <Box sx={{ width: "100%", maxWidth: 280 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption">Downloading…</Typography>
            <Typography variant="caption" fontWeight={700}>{Math.round(modelProgress)}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={modelProgress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      )}

      <Button
        variant="contained"
        startIcon={<Download />}
        onClick={handleDownload}
        disabled={isDownloading}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        {isDownloading ? "Downloading…" : `Download Maia 3 (${config.size})`}
      </Button>
    </Box>
  );
};

// ── Bar group: Eval + Q labels under each bar ─────────────────────────────────
function EvalBarGroup({ entries, barHeight }: { entries: { label: string; winProb: number }[]; barHeight: number }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5, alignItems: "flex-end", overflowX: "auto", pb: 1 }}>
      {entries.map(({ label, winProb }) => {
        const q = winProbToQ(winProb);
        const cp = qToCp(q);
        const evalText = (cp / 100) >= 0 ? `+${(cp / 100).toFixed(2)}` : (cp / 100).toFixed(2);
        return (
          <Box key={label} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
            <HumanEvalBar winProb={winProb} height={barHeight} />
            <Typography variant="caption" sx={{ fontSize: "8px", fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap", mt: 0.25 }}>
              {label}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "8px", color: "text.primary", fontWeight: 700, whiteSpace: "nowrap" }}>
              Eval {evalText}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "8px", color: "text.secondary", fontFamily: "monospace", whiteSpace: "nowrap" }}>
              Q={q.toFixed(3)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const ObjectiveHumanEval: React.FC<ObjectiveHumanEvalProps> = ({
  evaluations,
  isLoading,
  error,
}) => {
  const { status } = useNetStatus();

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">Running Maia 3 evaluations…</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Neural net error: {error.message}</Alert>;
  }

  const hasMaia3 = status.maia3 === "ready" && !!evaluations.maia3 && Object.keys(evaluations.maia3).length > 0;

  // Every 2nd index → 600, 800, 1000, … 2600
  const maia3Entries = hasMaia3
    ? MAIA3_MODELS
        .map((model, i) => ({ model, i }))
        .filter(({ i }) => i % 2 === 0)
        .map(({ model, i }) => ({
          label: String(MAIA3_RATING_VALUES[i]),
          winProb: evaluations.maia3![model]?.value ?? 0.5,
        }))
    : [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <BrainIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" fontWeight={700}>Objective Human Eval</Typography>
          <Chip label="Maia 3" size="small" color="primary" sx={{ fontSize: "10px", height: 18, fontWeight: 600 }} />
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {hasMaia3 ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Maia 3 WDL win probabilities → CP eval — 600 to 2600 Elo (every 200 pts)
            </Typography>
            <EvalBarGroup entries={maia3Entries} barHeight={240} />
          </Box>
        ) : (
          <Maia3DownloadCard />
        )}
      </CardContent>
    </Card>
  );
};

export default ObjectiveHumanEval;