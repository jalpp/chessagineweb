"use client";
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
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
  ModelType,
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

type NetTab = "maia3" | "leela";

// ── Download prompt for a single model ───────────────────────────────────────
const ModelDownloadCard: React.FC<{ modelType: ModelType }> = ({ modelType }) => {
  const { status, progress } = useNetStatus();
  const { downloadModel } = useNetModels();
  const [busy, setBusy] = useState(false);

  const modelStatus = status[modelType];
  const modelProgress = progress[modelType] ?? 0;
  const config = MODEL_CONFIGS[modelType];
  const isDownloading = busy || modelStatus === "downloading";

  const handleDownload = async () => {
    setBusy(true);
    try { await downloadModel(modelType); } finally { setBusy(false); }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        py: 3,
        px: 2,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        textAlign: "center",
      }}
    >
      <CloudDownload sx={{ fontSize: 36, color: "primary.main", opacity: 0.8 }} />
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {config.name} not downloaded
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {config.description}
        </Typography>
      </Box>
      {isDownloading && modelProgress > 0 && (
        <Box sx={{ width: "100%", maxWidth: 260 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption">Downloading…</Typography>
            <Typography variant="caption" fontWeight={700}>{Math.round(modelProgress)}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={modelProgress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      )}
      <Button
        variant="contained"
        size="small"
        startIcon={<Download />}
        onClick={handleDownload}
        disabled={isDownloading}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        {isDownloading ? "Downloading…" : `Download (${config.size})`}
      </Button>
    </Box>
  );
};

// ── Bar group with Eval= and Q= labels ───────────────────────────────────────
function EvalBarGroup({
  entries,
  barHeight,
}: {
  entries: { label: string; winProb: number }[];
  barHeight: number;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 1.5,
        alignItems: "flex-end",
        overflowX: "auto",
        pb: 1,
      }}
    >
      {entries.map(({ label, winProb }) => {
        const q = winProbToQ(winProb);
        const cp = qToCp(q);
        const evalText = (cp / 100) >= 0
          ? `+${(cp / 100).toFixed(2)}`
          : (cp / 100).toFixed(2);

        return (
          <Box
            key={label}
            sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}
          >
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
  const { status, activeModels } = useNetStatus();
  const [tab, setTab] = useState<NetTab>("maia3");

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">Running neural net evaluations…</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Neural net error: {error.message}</Alert>;
  }

  // No nets active at all → show all download cards
  if (activeModels.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <BrainIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" fontWeight={700}>Objective Human Eval</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <ModelDownloadCard modelType="maia3" />
            <ModelDownloadCard modelType="bigLeela" />
            <ModelDownloadCard modelType="elitemaia" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const hasMaia3 = status.maia3 === "ready" && !!evaluations.maia3 && Object.keys(evaluations.maia3).length > 0;
  const hasLeela = (status.bigLeela === "ready" && !!evaluations.bigLeela) ||
                   (status.elitemaia === "ready" && !!evaluations.elitemaia);

  // Maia3: show every 200 Elo (every 2nd index) — indices 0,2,4,…20 → 600,800,…2600
  const maia3Entries = hasMaia3
    ? MAIA3_MODELS
        .map((model, i) => ({ model, i }))
        .filter(({ i }) => i % 2 === 0)
        .map(({ model, i }) => ({
          label: String(MAIA3_RATING_VALUES[i]),
          winProb: evaluations.maia3![model]?.value ?? 0.5,
        }))
    : [];

  const leelaEntries: { label: string; winProb: number }[] = [];
  if (status.bigLeela === "ready" && evaluations.bigLeela)
    leelaEntries.push({ label: "T1-256", winProb: evaluations.bigLeela.value });
  if (status.elitemaia === "ready" && evaluations.elitemaia)
    leelaEntries.push({ label: "Elite", winProb: evaluations.elitemaia.value });

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <BrainIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" fontWeight={700}>Objective Human Eval</Typography>
          <Chip label="Neural Nets" size="small" variant="outlined" sx={{ fontSize: "10px", height: 18 }} />
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 1.5, minHeight: 32 }}
          TabIndicatorProps={{ style: { height: 2 } }}
        >
          <Tab value="maia3" label="Maia 3" sx={{ minHeight: 32, fontSize: "11px", textTransform: "none", fontWeight: 600 }} />
          <Tab value="leela" label="Leela" sx={{ minHeight: 32, fontSize: "11px", textTransform: "none", fontWeight: 600 }} />
        </Tabs>

        <Divider sx={{ mb: 1.5 }} />

        {tab === "maia3" && (
          hasMaia3 ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Maia 3 — 600–2600 Elo (every 200 pts)
              </Typography>
              <EvalBarGroup entries={maia3Entries} barHeight={240} />
            </Box>
          ) : (
            <ModelDownloadCard modelType="maia3" />
          )
        )}

        {tab === "leela" && (
          hasLeela ? (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Leela networks — near top-level play
              </Typography>
              <EvalBarGroup entries={leelaEntries} barHeight={240} />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {status.bigLeela !== "ready" && <ModelDownloadCard modelType="bigLeela" />}
              {status.elitemaia !== "ready" && <ModelDownloadCard modelType="elitemaia" />}
            </Box>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default ObjectiveHumanEval;
