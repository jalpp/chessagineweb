"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Drawer,
  Fab,
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  Close as CloseIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import { useNets } from "@/hooks/useNets";
import { useNetStatus } from "@/context/NetContext";
import { ObjectiveHumanEval } from "@/componets/humanevalbar/ObjectiveHumanEval";
import { SubjectiveHumanEval } from "@/componets/humanevalbar/SubjectiveHumanEval";
import { HumanEvalBar } from "@/componets/humanevalbar/HumanEvalBar";
import { MAIA3_MODELS, MAIA3_RATING_VALUES } from "@/libs/nets/types";

export const dynamic = "force-dynamic";
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DEFAULT_MAIA3_IDX = 20; // 2600 Elo

function isValidFen(fen: string): boolean {
  try { new Chess(fen); return true; } catch { return false; }
}

export default function HumanEvalBarPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [fenInput, setFenInput] = useState(STARTING_FEN);
  const [game, setGame] = useState(new Chess());
  const [fenError, setFenError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeFen = game.fen();
  const sideToMove = activeFen.split(" ")[1] === "b" ? "Black" : "White";

  const { evaluations, isLoading, Maiaerror: maiaError, evaluationsFen } = useNets({ fen: activeFen, useLichessBook: false });
  const { status } = useNetStatus();

  const maia3Ready = status.maia3 === "ready";
  const isCalculating = maia3Ready && (isLoading || evaluationsFen !== activeFen);


  const sidebarWinProb = evaluations.maia3?.[MAIA3_MODELS[DEFAULT_MAIA3_IDX]]?.value ?? 0.5;
  const sidebarLabel = `Maia3 ${MAIA3_RATING_VALUES[DEFAULT_MAIA3_IDX]}`;

  // ── Board interaction ─────────────────────────────────────────────────────
  const onDrop = useCallback((args: PieceDropHandlerArgs) => {
    if (!args.targetSquare) return false;
    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: args.sourceSquare,
        to: args.targetSquare,
        promotion: "q" as const,
      });
      if (!move) return false;
      setGame(newGame);
      setFenInput(newGame.fen());
      return true;
    } catch {
      return false;
    }
  }, [game]);

  // ── FEN input ─────────────────────────────────────────────────────────────
  function handleApplyFen() {
    const trimmed = fenInput.trim();
    if (!trimmed) { resetBoard(); return; }
    if (!isValidFen(trimmed)) { setFenError("Invalid FEN — please check your input."); return; }
    setFenError(null);
    setGame(new Chess(trimmed));
  }

  function resetBoard() {
    const fresh = new Chess();
    setGame(fresh);
    setFenInput(STARTING_FEN);
    setFenError(null);
  }

  const AnalysisPanel = () => (
    <Stack spacing={2.5}>
      <ObjectiveHumanEval evaluations={evaluations} isLoading={isCalculating} error={maiaError} />
      <SubjectiveHumanEval />
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 4 }, minHeight: "100vh", overflowY: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.75 }}>
          <BarChartIcon sx={{ color: "primary.main", fontSize: 26 }} />
          <Typography variant="h5" fontWeight={700}>Human Eval Bar</Typography>
          <Chip label="Maia 3" size="small" color="primary" sx={{ fontWeight: 600 }} />
          <Chip label="Beta" size="small" variant="outlined" sx={{ fontSize: "10px" }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
          An estimated human eval bar that predicts the human objective eval using{" "}
          <strong>Maia WDL probabilities</strong>, and human estimated eval by{" "}
          <strong>subjective WDL rates</strong>.
        </Typography>
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      {/* FEN input */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flexWrap: "wrap", mb: 3 }}>
        <TextField
          label="Paste FEN"
          value={fenInput}
          onChange={(e) => { setFenInput(e.target.value); setFenError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleApplyFen(); }}
          error={!!fenError}
          helperText={fenError ?? "Paste a FEN and press Enter, or play moves on the board"}
          size="small"
          sx={{ flex: 1, minWidth: 260 }}
          inputProps={{ style: { fontFamily: "monospace", fontSize: "12px" } }}
        />
        <Button variant="contained" onClick={handleApplyFen} sx={{ mt: "2px", textTransform: "none", fontWeight: 600 }}>
          Apply
        </Button>
        <Button variant="outlined" onClick={resetBoard} sx={{ mt: "2px", textTransform: "none" }}>
          Reset
        </Button>
      </Box>

      {/* Main layout */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2, sm: 3, md: 4 }} alignItems="flex-start">

        {/* Chessboard + eval bar */}
        <Box sx={{ flex: "0 0 auto", maxWidth: "100%" }}>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5, alignItems: "flex-start" }}>

            {/* Eval bar left of board */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, pt: "1px" }}>
              <Box sx={{ position: "relative" }}>
                <HumanEvalBar
                  winProb={sidebarWinProb}
                  height={400}
                  showLabels
                />
                {/* Loading overlay on the bar while Maia is computing */}
                {isCalculating && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                      bgcolor: "rgba(0,0,0,0.45)",
                      borderRadius: 1,
                      zIndex: 3,
                    }}
                  >
                    <CircularProgress size={14} sx={{ color: "#fff" }} />
                  </Box>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "9px",
                  color: isCalculating ? "text.disabled" : "text.disabled",
                  textAlign: "center",
                  maxWidth: 52,
                  lineHeight: 1.3,
                  mt: 0.25,
                }}
              >
                {isCalculating ? "calculating…" : sidebarLabel}
              </Typography>
            </Box>

            {/* Interactive board */}
            <Box sx={{ width: { xs: "calc(100vw - 90px)", sm: 400, lg: 420 }, maxWidth: "100%" }}>
              <Box sx={{ borderRadius: 2, overflow: "hidden", boxShadow: 4, border: "1px solid", borderColor: "divider" }}>
                <Chessboard
                  options={{
                    position: activeFen,
                    boardOrientation: "white",
                    onPieceDrop: onDrop,
                  }}
                />
              </Box>

              {/* Side to move + FEN display */}
              <Box sx={{ mt: 1, p: 1.25, bgcolor: "action.hover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Side to move:</Typography>
                  <Chip
                    label={sideToMove}
                    size="small"
                    sx={{
                      bgcolor: sideToMove === "White" ? "#f0ede8" : "#1a1a1a",
                      color: sideToMove === "White" ? "#111" : "#fff",
                      fontWeight: 700,
                      fontSize: "10px",
                      height: 20,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                  {game.isGameOver() && (
                    <Chip
                      label={game.isCheckmate() ? "Checkmate" : game.isStalemate() ? "Stalemate" : "Draw"}
                      size="small"
                      color="warning"
                      sx={{ fontSize: "10px", height: 20, fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", fontSize: "10px", color: "text.disabled", wordBreak: "break-all", display: "block" }}
                >
                  {activeFen}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Desktop analysis panel */}
        {!isMobile && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AnalysisPanel />
          </Box>
        )}
      </Stack>

      {/* Mobile FAB + drawer */}
      {isMobile && (
        <>
          <Fab color="primary" onClick={() => setDrawerOpen(true)} sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
            <AnalyticsIcon />
          </Fab>
          <Drawer
            anchor="bottom"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" } }}
          >
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <Typography variant="h6" fontWeight={600}>Human Eval Analysis</Typography>
                <Button onClick={() => setDrawerOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                <AnalysisPanel />
              </Box>
            </Box>
          </Drawer>
        </>
      )}
    </Box>
  );
}