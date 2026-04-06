"use client";
import React, { useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import { HumanEvalBar, qToCp } from "./HumanEvalBar";

interface WDL {
  win: number;
  draw: number;
  loss: number;
}

/**
 * Computes Q from WDL percentages.
 * Q = (W + 0.5 * D) / (W + D + L)
 * Values are raw percentages [0–100]; total should be 100.
 */
function wdlToQ(wdl: WDL): number {
  const total = wdl.win + wdl.draw + wdl.loss;
  if (total === 0) return 0;
  return (wdl.win + 0.5 * wdl.draw) / total;
}

/**
 * Keeps total at 100 when one slider changes by adjusting
 * the other two proportionally (or clamping to 0).
 */
function rebalance(changed: keyof WDL, value: number, prev: WDL): WDL {
  const clamped = Math.max(0, Math.min(100, value));
  const remaining = 100 - clamped;

  const others = (["win", "draw", "loss"] as (keyof WDL)[]).filter(
    (k) => k !== changed
  );

  const prevOtherTotal = prev[others[0]] + prev[others[1]];

  let a: number;
  let b: number;

  if (prevOtherTotal === 0) {
    a = remaining / 2;
    b = remaining / 2;
  } else {
    a = Math.round((prev[others[0]] / prevOtherTotal) * remaining);
    b = remaining - a;
  }

  return {
    ...prev,
    [changed]: clamped,
    [others[0]]: a,
    [others[1]]: b,
  };
}

function getQColor(q: number): string {
  // q is [0,1] here (win probability), center is 0.5
  if (q > 0.62) return "#4caf50";
  if (q < 0.38) return "#f44336";
  return "#ff9800";
}

export const SubjectiveHumanEval: React.FC = () => {
  const [wdl, setWdl] = useState<WDL>({ win: 33, draw: 34, loss: 33 });

  const handleChange = useCallback(
    (key: keyof WDL) => (_: Event, value: number | number[]) => {
      setWdl((prev) => rebalance(key, value as number, prev));
    },
    []
  );

  const q = wdlToQ(wdl);
  // Convert to white-relative [-1, 1] range (same convention as rest of app)
  // wdlToQ gives [0,1]; eval bar expects [-1,1]
  const qNormalized = q * 2 - 1;
  const cp = qToCp(qNormalized);
  const total = wdl.win + wdl.draw + wdl.loss;
  const isValid = Math.abs(total - 100) < 1;

  const sliders: { key: keyof WDL; label: string; color: string }[] = [
    { key: "win", label: "Win %", color: "#4caf50" },
    { key: "draw", label: "Draw %", color: "#ff9800" },
    { key: "loss", label: "Loss %", color: "#f44336" },
  ];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <PersonIcon sx={{ fontSize: 18, color: "secondary.main" }} />
          <Typography variant="subtitle2" fontWeight={700}>
            Subjective Human Eval
          </Typography>
          <Chip
            label="WDL → Q"
            size="small"
            variant="outlined"
            sx={{ fontSize: "10px", height: 18 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Enter the current side&apos;s estimated Win / Draw / Loss rates.
          Sliders auto-balance to 100%.
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
          {/* Sliders */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {sliders.map(({ key, label, color }) => (
              <Box key={key} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 0.25,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color, fontSize: "11px" }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, fontSize: "12px", color }}
                  >
                    {wdl[key]}%
                  </Typography>
                </Box>
                <Slider
                  value={wdl[key]}
                  onChange={handleChange(key)}
                  min={0}
                  max={100}
                  step={1}
                  size="small"
                  sx={{
                    color,
                    "& .MuiSlider-thumb": {
                      width: 14,
                      height: 14,
                    },
                    "& .MuiSlider-rail": {
                      opacity: 0.2,
                    },
                  }}
                />
              </Box>
            ))}

            {/* WDL summary bar */}
            <Box sx={{ mt: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  borderRadius: 1,
                  overflow: "hidden",
                  height: 8,
                  width: "100%",
                }}
              >
                <Box sx={{ width: `${wdl.win}%`, bgcolor: "#4caf50", transition: "width 0.2s" }} />
                <Box sx={{ width: `${wdl.draw}%`, bgcolor: "#ff9800", transition: "width 0.2s" }} />
                <Box sx={{ width: `${wdl.loss}%`, bgcolor: "#f44336", transition: "width 0.2s" }} />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 0.5,
                }}
              >
                {[
                  { label: "W", color: "#4caf50", val: wdl.win },
                  { label: "D", color: "#ff9800", val: wdl.draw },
                  { label: "L", color: "#f44336", val: wdl.loss },
                ].map(({ label, color, val }) => (
                  <Typography
                    key={label}
                    variant="caption"
                    sx={{ fontSize: "10px", color, fontWeight: 600 }}
                  >
                    {label} {val}%
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Formula display */}
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: "block", fontSize: "10px", color: "text.secondary", mb: 0.5 }}
              >
                Q = (W + 0.5 × D) / (W + D + L)
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: "block", fontSize: "10px", color: "text.secondary", mb: 0.5 }}
              >
                = ({wdl.win} + 0.5 × {wdl.draw}) / {total} ={" "}
                <strong>{q.toFixed(4)}</strong>
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: "block", fontSize: "10px", color: "text.secondary" }}
              >
                CP ≈{" "}
                <strong style={{ color: getQColor(q) }}>
                  {isValid
                    ? (cp >= 0 ? "+" : "") + (cp / 100).toFixed(2)
                    : "—"}
                </strong>
              </Typography>
            </Box>

            {!isValid && (
              <Alert severity="warning" sx={{ mt: 1, py: 0.25 }}>
                <Typography variant="caption">
                  Percentages must sum to 100 (currently {total})
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Eval bar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <HumanEvalBar winProb={isValid ? (qNormalized + 1) / 2 : 0.5} height={280} />
            <Chip
              label={isValid ? `Q = ${q.toFixed(3)}` : "—"}
              size="small"
              sx={{
                fontSize: "10px",
                height: 20,
                bgcolor: getQColor(q),
                color: "#fff",
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SubjectiveHumanEval;