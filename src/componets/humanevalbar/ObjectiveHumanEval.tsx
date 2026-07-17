"use client";
import React from "react";
import {
  Box, Card, CardContent, Typography,
  Chip, CircularProgress, Alert, Divider,
} from "@mui/material";
import { Psychology as BrainIcon } from "@mui/icons-material";
import { useMaiaBatchEval } from "@/hooks/useMaiaBatchEval";

// ── Eval bar ──────────────────────────────────────────────────────────────────

/**
 * Renders a vertical bar directly from a CP eval string like "+0.42" or "-1.30".
 * No math — just parses the float, maps ±10 pawns → 0–100% bar height.
 */
function EvalBar({ evalStr, height = 240 }: { evalStr: string; height?: number }) {
  const cp = parseFloat(evalStr) * 100; // evalStr is in pawns already e.g. "+0.42"
  const pawns = isNaN(cp / 100) ? 0 : Math.max(-10, Math.min(10, cp / 100));
  const whitePercent = 50 + pawns * 5;
  const isPositive = pawns >= 0;

  return (
    <Box
      sx={{
        width: 24,
        height,
        position: "relative",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        backgroundColor: "#1a1a1a",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${whitePercent}%`,
          backgroundColor: "#f0ede8",
          transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: isPositive ? 6 : "auto",
          bottom: isPositive ? "auto" : 6,
          left: "50%",
          transform: "translateX(-50%) rotate(-90deg)",
          transformOrigin: "center",
          minWidth: "52px",
          textAlign: "center",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: "9px",
            fontWeight: 700,
            color: whitePercent > 70 || whitePercent < 30 ? "#fff" : "#111",
          }}
        >
          {isNaN(parseFloat(evalStr)) ? "—" : evalStr}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Card header ───────────────────────────────────────────────────────────────

const CARD_HEADER = (
  <>
    <BrainIcon sx={{ fontSize: 18, color: "primary.main" }} />
    <Typography variant="subtitle2" fontWeight={700}>Objective Human Eval</Typography>
    <Chip label="Maia 3" size="small" color="primary" sx={{ fontSize: "10px", height: 18, fontWeight: 600 }} />
  </>
);

// ── Main export ───────────────────────────────────────────────────────────────

export const ObjectiveHumanEval: React.FC<{ fen: string }> = ({ fen }) => {
  const { results, isLoading, error } = useMaiaBatchEval(fen);

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>{CARD_HEADER}</Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Maia 3 computing evaluations…</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <Alert severity="error">Neural net error: {error.message}</Alert>;
  }

  // Every other level: 600, 800, 1000, … 2600
  const displayed = results.filter((_, i) => i % 2 === 0);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>{CARD_HEADER}</Box>
        <Divider sx={{ mb: 1.5 }} />
        {displayed.length > 0 ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Human Estimate Eval per rating — 600 to 2600 Elo (every 200 pts)
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5, alignItems: "flex-end", overflowX: "auto", pb: 1 }}>
              {displayed.map(({ rating, humanEval, lc0Eval }) => (
                <Box key={rating} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                  <EvalBar evalStr={humanEval} height={240} />
                  <Typography variant="caption" sx={{ fontSize: "8px", fontWeight: 700, color: "text.secondary", whiteSpace: "nowrap" }}>
                    {rating}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "8px", color: "text.primary", fontWeight: 700, whiteSpace: "nowrap" }}>
                    H: {humanEval}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "8px", color: "text.secondary", whiteSpace: "nowrap" }}>
                    L: {lc0Eval}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
            No position selected
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ObjectiveHumanEval;
