"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box, Drawer, Fab, useMediaQuery, useTheme,
  Typography, Button, Paper,
} from "@mui/material";
import {
  Analytics as AnalyticsIcon, Close as CloseIcon,
  FormatListBulleted as MoveListIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";

import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import AnnotatedMoveList from "@/componets/tabs/AnonatedMoveList";

import useAgine from "@/hooks/useAgine";
import { useNets } from "@/hooks/useNets";
import { useSessionStorage } from "usehooks-ts";

import {
  VariationTree, makeTree, addMove, findNode, MoveNode,
} from "@/lib/variationTree";

// ── module-level helpers (never recreated) ─────────────────────────────────

function getSAN(prevFen: string, nextFen: string): { san: string; uci: string } | null {
  try {
    const chess = new Chess(prevFen);
    for (const m of chess.moves({ verbose: true })) {
      const test = new Chess(prevFen);
      test.move(m);
      if (test.fen() === nextFen) return { san: m.san, uci: m.from + m.to + (m.promotion ?? "") };
    }
    return null;
  } catch { return null; }
}

function mainLineDepth(root: MoveNode): number {
  let n = root; let d = 0;
  while (n.next) { n = n.next; d++; }
  return d;
}

// ── page ───────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);
  const [moveListDrawerOpen, setMoveListDrawerOpen] = useState(false);

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [tree, setTree] = useState<VariationTree>(() => makeTree());
  const [prevFen, setPrevFen] = useState<string>(new Chess().fen());

  const {
    stockfishAnalysisResult, setStockfishAnalysisResult,
    openingData, setOpeningData, llmLoading, stockfishLoading,
    openingLoading, moveSquares, setMoveSquares, lichessOpeningData,
    lichessOpeningLoading, engineDepth, setEngineDepth, engineLines,
    setEngineLines, engine, fetchOpeningData, analyzeWithStockfish,
    formatEvaluation, formatPrincipalVariation, chessdbdata, loading,
    queueing, error, refetch, requestAnalysis, scores, themeScoreLoading,
    themeScoreError,
  } = useAgine(fen, "position");

  const {
    evaluations, sanEvaluations, isLoading: maiaIsLoading,
    Maiaerror: maiaError, lichessData, isInBook,
  } = useNets({ fen });

  const [activeAnalysisTab, setActiveAnalysisTab] = useSessionStorage(
    "agine_position_act_tab_v2", 0
  );

  // ── intercept board moves ─────────────────────────────────────────────────
  useEffect(() => {
    if (fen === prevFen) return;
    const result = getSAN(prevFen, fen);
    if (!result) { setPrevFen(fen); return; }
    const { san, uci } = result;
    const { newTree, newCursorId } = addMove(tree, tree.cursor, san, uci, fen);
    setTree({ ...newTree, cursor: newCursorId });
    setPrevFen(fen);
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── navigation callbacks ──────────────────────────────────────────────────
  const handleNavigate = useCallback((nodeFen: string, nodeId: string) => {
    setGame(new Chess(nodeFen));
    setFen(nodeFen);
    setTree(prev => ({ ...prev, cursor: nodeId }));
    setPrevFen(nodeFen);
    setStockfishAnalysisResult(null);
  }, [setStockfishAnalysisResult]);

  const handleTreePrevious = useCallback(() => {
    const cur = findNode(tree.root, tree.cursor);
    if (!cur?.parent) return;
    handleNavigate(cur.parent.fen, cur.parent.id);
  }, [tree, handleNavigate]);

  const handleTreeNext = useCallback(() => {
    const cur = findNode(tree.root, tree.cursor);
    if (!cur?.next) return;
    handleNavigate(cur.next.fen, cur.next.id);
  }, [tree, handleNavigate]);

  const handleTreeStart = useCallback(() => {
    handleNavigate(tree.root.fen, tree.root.id);
  }, [tree, handleNavigate]);

  const handleTreeEnd = useCallback(() => {
    let node = findNode(tree.root, tree.cursor) ?? tree.root;
    while (node.next) node = node.next;
    handleNavigate(node.fen, node.id);
  }, [tree, handleNavigate]);

  const treePly = useMemo(() => findNode(tree.root, tree.cursor)?.ply ?? 0, [tree]);
  const treeMaxPly = useMemo(() => mainLineDepth(tree.root), [tree]);

  const handleAIAnnotation = useCallback(async (node: MoveNode): Promise<string> => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: node.fen, move: node.san,
          prompt: `Briefly annotate the chess move ${node.san} played from position ${node.fen}. One sentence max, focus on idea/purpose.`,
        }),
      });
      return res.ok ? (await res.text()).trim() : "";
    } catch { return ""; }
  }, []);

  // ── shared JSX fragments (no inner component functions) ───────────────────

  const analysisPanel = (
    <AgineAnalysisView
      activeAnalysisTab={activeAnalysisTab}
      setActiveAnalysisTab={setActiveAnalysisTab}
      isGameReviewMode={false}
      fen={fen}
      stockfishAnalysisResult={stockfishAnalysisResult}
      stockfishLoading={stockfishLoading}
      lichessData={lichessData}
      isInBook={isInBook}
      sanEvaluations={sanEvaluations}
      engineLines={engineLines}
      engine={engine}
      engineDepth={engineDepth}
      chessdbdata={chessdbdata}
      analyzeWithStockfish={analyzeWithStockfish}
      formatEvaluation={formatEvaluation}
      formatPrincipalVariation={formatPrincipalVariation}
      setEngineDepth={setEngineDepth}
      setEngineLines={setEngineLines}
      openingLoading={openingLoading}
      openingData={openingData}
      lichessOpeningData={lichessOpeningData}
      lichessOpeningLoading={lichessOpeningLoading}
      queueing={queueing}
      error={error}
      loading={loading}
      refetch={refetch}
      requestAnalysis={requestAnalysis}
      gameReviewTheme={null}
      evaluations={evaluations}
      isLoading={maiaIsLoading}
      Maiaerror={maiaError}
      scores={scores}
      ThemeScoreerror={themeScoreError}
      ThemeScoreloading={themeScoreLoading}
    />
  );

  const moveListPanel = (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      backgroundColor: "#0d0d0d", borderRadius: 2, border: "1px solid #2a2a2a", overflow: "hidden",
    }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <MoveListIcon sx={{ fontSize: 15, color: "#7c3aed" }} />
        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#999", letterSpacing: "0.08em" }}>
          MOVES & VARIATIONS
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <AnnotatedMoveList
          tree={tree}
          onTreeChange={setTree}
          onNavigate={handleNavigate}
        />
      </Box>
    </Box>
  );

  const boardPanel = (
    <AiChessboardPanel
      game={game}
      fen={fen}
      moveSquares={moveSquares}
      setMoveSquares={setMoveSquares}
      engine={engine}
      setFen={setFen}
      setGame={setGame}
      setOpeningData={setOpeningData}
      evaluations={evaluations}
      setStockfishAnalysisResult={setStockfishAnalysisResult}
      fetchOpeningData={fetchOpeningData}
      analyzeWithStockfish={analyzeWithStockfish}
      llmLoading={llmLoading}
      stockfishLoading={stockfishLoading}
      maiaLoading={maiaIsLoading}
      stockfishAnalysisResult={stockfishAnalysisResult}
      openingLoading={openingLoading}
      onTreePrevious={handleTreePrevious}
      onTreeNext={handleTreeNext}
      onTreeStart={handleTreeStart}
      onTreeEnd={handleTreeEnd}
      hideBuiltInMoveList
      treePly={treePly}
      treeMaxPly={treeMaxPly}
    />
  );

  // ── desktop layout ────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "290px 1fr 270px",
        height: "calc(100vh - 64px)",
        gap: 1.5, px: 1.5, py: 1.5,
        overflow: "hidden", boxSizing: "border-box",
      }}>
        {/* Left: AI Analysis */}
        <Paper sx={{
          backgroundColor: "#0d0d0d", border: "1px solid #2a2a2a",
          borderRadius: 2, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <Box sx={{
            px: 1.5, py: 1, borderBottom: "1px solid #1e1e1e",
            display: "flex", alignItems: "center", gap: 1, flexShrink: 0,
          }}>
            <AnalyticsIcon sx={{ fontSize: 15, color: "#7c3aed" }} />
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#999", letterSpacing: "0.08em" }}>
              AI ANALYSIS
            </Typography>
          </Box>
          <Box sx={{
            flex: 1, overflowY: "auto", p: 1,
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "#333", borderRadius: "2px" },
          }}>
            {analysisPanel}
          </Box>
        </Paper>

        {/* Center: Board */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {boardPanel}
        </Box>

        {/* Right: Move list */}
        {moveListPanel}
      </Box>
    );
  }

  // ── mobile layout ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 1, minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {boardPanel}
      </Box>

      <Fab color="primary" onClick={() => setAnalysisDrawerOpen(true)}
        sx={{ position: "fixed", bottom: 84, right: 24, zIndex: 1000 }}>
        <AnalyticsIcon />
      </Fab>
      <Fab onClick={() => setMoveListDrawerOpen(true)}
        sx={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          backgroundColor: "#7c3aed", "&:hover": { backgroundColor: "#6d28d9" },
        }}>
        <MoveListIcon />
      </Fab>

      <Drawer anchor="bottom" open={analysisDrawerOpen} onClose={() => setAnalysisDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={600}>AI Analysis</Typography>
            <Button onClick={() => setAnalysisDrawerOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {analysisPanel}
          </Box>
        </Box>
      </Drawer>

      <Drawer anchor="bottom" open={moveListDrawerOpen} onClose={() => setMoveListDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { height: "75vh", borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: "#0d0d0d" } }}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={600} sx={{ color: "#ccc" }}>Moves & Variations</Typography>
            <Button onClick={() => setMoveListDrawerOpen(false)} startIcon={<CloseIcon />} size="small" sx={{ color: "#888" }}>Close</Button>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <AnnotatedMoveList
              tree={tree}
              onTreeChange={setTree}
              onNavigate={(f, id) => { handleNavigate(f, id); setMoveListDrawerOpen(false); }}
            />
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}