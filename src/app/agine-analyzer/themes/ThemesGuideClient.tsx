"use client";

/**
 * @file ThemesGuideClient.tsx
 * @description "How Agine Theme Analysis Works" page.
 *
 * A plain-language guide to the nine Agine themes (material, mobility,
 * space, positional, king safety, tactical, square control, tempo) for
 * club players reading their Agine Analyzer report — what each theme
 * means, the formula behind it, and what a high or low score means for you.
 *
 * Content lives in @/libs/themes/explainerContent so the prose can be
 * reviewed/updated independently of the layout.
 */

import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  QueryStats as QueryStatsIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { usePageReady } from "@/hooks/usePageReady";
import { getThemeLabelColor } from "@/libs/themes/helper";
import {
  ANALYZER_USAGE_NOTES,
  SCORE_ASSEMBLY_NOTES,
  THEME_EXPLAINERS,
} from "@/libs/themes/explainerContent";

export default function ThemesGuideClient() {
  usePageReady();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | false>(
    THEME_EXPLAINERS[0].key
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
        <Box
          component="img"
          src="/static/images/aginelogov2.png"
          alt="ChessAgine"
          sx={{ width: 48, height: 48 }}
        />
        <Typography variant="h4" fontWeight={700}>
          What Do My Theme Scores Mean?
        </Typography>
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The Agine Analyzer&apos;s Themes tab scores your games across nine
        themes — material, mobility, space, pawn structure, king safety,
        tactics, square control and tempo. This page explains each one in
        plain chess terms: what it measures, the formula behind it, and what
        a high or low number means for you.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Every score is from <strong>your</strong> point of view: positive
        means the edge is yours, negative means it&apos;s your
        opponent&apos;s, and 0 means it&apos;s balanced.
      </Alert>

      {/* Per-theme explainers */}
      {THEME_EXPLAINERS.map((theme) => (
        <Accordion
          key={theme.key}
          expanded={expanded === theme.key}
          onChange={(_, isExpanded) =>
            setExpanded(isExpanded ? theme.key : false)
          }
          sx={{
            mb: 1.5,
            borderRadius: "10px !important",
            border: 1,
            borderColor: "divider",
            "&:before": { display: "none" },
            overflow: "hidden",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: getThemeLabelColor(theme.key),
                  flexShrink: 0,
                }}
              />
              <Typography fontWeight={700}>{theme.displayName}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography>{theme.definition}</Typography>

              <Box>
                <Typography fontWeight={600} gutterBottom fontSize="0.9rem">
                  How it&apos;s worked out
                </Typography>
                <Stack spacing={0.75}>
                  {theme.howItsBuilt.map((line, i) => (
                    <Typography
                      key={i}
                      fontSize="0.875rem"
                      color="text.secondary"
                    >
                      • {line}
                    </Typography>
                  ))}
                </Stack>
              </Box>

              <Paper
                variant="outlined"
                sx={{ p: 1.5, bgcolor: "action.hover", overflowX: "auto" }}
              >
                <Typography
                  fontFamily="monospace"
                  fontSize="0.8rem"
                  whiteSpace="pre-wrap"
                >
                  {theme.formula}
                </Typography>
              </Paper>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "success.dark",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography fontWeight={600} fontSize="0.85rem">
                      A high (positive) score means…
                    </Typography>
                  </Box>
                  <Typography fontSize="0.85rem" color="text.secondary">
                    {theme.highMeaning}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "error.dark",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                    <TrendingDownIcon fontSize="small" color="error" />
                    <Typography fontWeight={600} fontSize="0.85rem">
                      A low (negative) score means…
                    </Typography>
                  </Box>
                  <Typography fontSize="0.85rem" color="text.secondary">
                    {theme.lowMeaning}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography fontWeight={600} gutterBottom fontSize="0.9rem">
                  Example values
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 110 }}>Score</TableCell>
                        <TableCell>What it means</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {theme.examples.map((ex) => (
                        <TableRow key={ex.value}>
                          <TableCell>
                            <Chip
                              label={ex.value}
                              size="small"
                              sx={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                bgcolor: getThemeLabelColor(theme.key),
                                color: "#fff",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {ex.meaning}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Typography fontSize="0.8rem" color="text.secondary">
                <strong>Typical range:</strong> {theme.range}
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* How to read the numbers */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          How to read these numbers
        </Typography>
        <Stack spacing={1.25}>
          {SCORE_ASSEMBLY_NOTES.map((note, i) => (
            <Typography key={i} fontSize="0.9rem" color="text.secondary">
              {note}
            </Typography>
          ))}
        </Stack>
      </Paper>

      {/* How the Analyzer uses these scores */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: 2, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          How the Agine Analyzer uses these scores
        </Typography>
        <Stack spacing={1.25}>
          {ANALYZER_USAGE_NOTES.map((note, i) => (
            <Typography key={i} fontSize="0.9rem" color="text.secondary">
              {note}
            </Typography>
          ))}
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={3}>
        <Button
          variant="contained"
          startIcon={<QueryStatsIcon />}
          onClick={() => router.push("/agine-analyzer")}
        >
          Go to Agine Analyzer
        </Button>
      </Stack>
    </Container>
  );
}
