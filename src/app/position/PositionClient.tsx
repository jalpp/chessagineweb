"use client";
import { usePageReady } from "@/hooks/usePageReady";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box, Typography, IconButton, Tooltip, Divider,
  Drawer, Fab, Button, useMediaQuery, useTheme,
  List, ListItemButton, ListItemIcon, ListItemText, Switch, FormControlLabel,
} from "@mui/material";
import {
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  GridOn as FenIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";

import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";
import AnnotatedMoveList from "@/componets/tabs/AnonatedMoveList";
import { FenSelector } from "@/componets/game/FenSelector";

import useAgine from "@/hooks/useAgine";
import { useNets } from "@/hooks/useNets";
import { useSessionStorage } from "usehooks-ts";

import {
  VariationTree, makeTree, addMove, findNode, MoveNode, pathTo,
} from "@/lib/variationTree";
import { applyUciMove, buildMoveChain } from "@/lib/moveUtils";

// ── helpers ────────────────────────────────────────────────────────────────

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

type LeftTab = "analysis" | "position";

// ── page ───────────────────────────────────────────────────────────────────

export default function PositionPage() {
  usePageReady();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [leftTab, setLeftTab] = useState<LeftTab>("analysis");
  const [analysisDrawerOpen, setAnalysisDrawerOpen] = useState(false);

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [tree, setTree] = useState<VariationTree>(() => makeTree());
  const [prevFen, setPrevFen] = useState<string>(new Chess().fen());
  const [startFen, setStartFen] = useState<string>(new Chess().fen());
  // Auto-analysis mode: when false, engines/neural nets do not auto-fire on FEN changes
  const [autoAnalysis, setAutoAnalysis] = useState(false);

  const {
    stockfishAnalysisResult, setStockfishAnalysisResult,
    openingData, setOpeningData, llmLoading, stockfishLoading,
    openingLoading, moveSquares, setMoveSquares, lichessOpeningData,
    lichessOpeningLoading, engineDepth, setEngineDepth, engineLines,
    setEngineLines, engine, fetchOpeningData, analyzeWithStockfish,
    formatEvaluation, formatPrincipalVariation, chessdbdata, loading,
    queueing, error, refetch, requestAnalysis, scores, themeScoreLoading,
    themeScoreError, pvResult, pvLoading, pvError, requestPv,
  } = useAgine(fen, "position", autoAnalysis);

  const {
    evaluations, sanEvaluations, isLoading: maiaIsLoading,
    Maiaerror: maiaError,
  } = useNets({ fen, gameReviewMode: !autoAnalysis });

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

  // ── navigation ────────────────────────────────────────────────────────────
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

  // SAN move sequence from the tree's root to the currently viewed
  // position, so the chat panel can tell the model exactly which moves
  // led here — instead of it only seeing a bare FEN and having to guess
  // (and sometimes guessing wrong, deviating into a known opening line
  // this position doesn't actually belong to).
  const positionMoveHistorySan = useMemo(
    () => pathTo(tree.root, tree.cursor).slice(1).map((n) => n.san),
    [tree],
  );

  

  // Play a move suggested by Stockfish, ChessDB, or a neural net (clicking
  // one of those rows applies its move to the board, same as a drag/drop).
  const handlePlayMove = useCallback((uci: string) => {
    const newFen = applyUciMove(fen, uci);
    if (!newFen) return;
    setGame(new Chess(newFen));
    setFen(newFen);
  }, [fen]);

  // Append a whole move sequence (e.g. clicking the 3rd move of a
  // Stockfish/ChessDB PV) onto the board as a chain of tree nodes from the
  // current position, in one step — used instead of the fen-watching effect
  // above since that only handles a single move at a time.
  const handlePlayMoveSequence = useCallback((uciMoves: string[]) => {
    const chain = buildMoveChain(fen, uciMoves);
    if (chain.length === 0) return;

    let currentTree = tree;
    let cursor = tree.cursor;
    for (const step of chain) {
      const result = addMove(currentTree, cursor, step.san, step.uci, step.fen);
      currentTree = result.newTree;
      cursor = result.newCursorId;
    }

    const finalFen = chain[chain.length - 1].fen;
    setTree({ ...currentTree, cursor });
    setGame(new Chess(finalFen));
    setFen(finalFen);
    setPrevFen(finalFen);
    setStockfishAnalysisResult(null);
  }, [fen, tree, setStockfishAnalysisResult]);

  const resetPosition = useCallback(() => {
    const chess = new Chess();
    setStartFen(chess.fen());
    setGame(chess);
    setFen(chess.fen());
    setPrevFen(chess.fen());
    setTree(makeTree());
    setStockfishAnalysisResult(null);
  }, [setStockfishAnalysisResult]);

  // ── panels ────────────────────────────────────────────────────────────────
  const analysisPanel = (
    <Box sx={{
      height: "100%", overflowY: "auto", p: 1,
      "&::-webkit-scrollbar": { width: "4px" },
      "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
    }}>
      {/* ── Auto-analysis mode toggle ───────────────────────────── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1, mb: 1, borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={autoAnalysis}
              onChange={(e) => setAutoAnalysis(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600 }}>
              Auto-Analysis {autoAnalysis ? "ON" : "OFF"}
            </Typography>
          }
          sx={{ m: 0 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px", lineHeight: 1.4 }}>
          {autoAnalysis
            ? "Engines & neural nets run automatically on every position."
            : "Analysis is paused. Toggle on to activate engines for this position."}
        </Typography>
      </Box>
      <AgineAnalysisView
        activeAnalysisTab={activeAnalysisTab}
        setActiveAnalysisTab={setActiveAnalysisTab}
        isGameReviewMode={false}
        positionMoveHistorySan={positionMoveHistorySan}
        stockfishAnalysisResult={stockfishAnalysisResult}
        stockfishLoading={stockfishLoading}
        engineDepth={engineDepth}
        engineLines={engineLines}
        engine={engine}
        Maiaerror={maiaError}
        isLoading={maiaIsLoading}
        evaluations={evaluations}
        sanEvaluations={sanEvaluations}
        analyzeWithStockfish={analyzeWithStockfish}
        formatEvaluation={formatEvaluation}
        fen={fen}
        formatPrincipalVariation={formatPrincipalVariation}
        setEngineDepth={setEngineDepth}
        setEngineLines={setEngineLines}
        openingLoading={openingLoading}
        openingData={openingData}
        lichessOpeningData={lichessOpeningData}
        lichessOpeningLoading={lichessOpeningLoading}
        chessdbdata={chessdbdata}
        queueing={queueing}
        error={error}
        loading={loading}
        refetch={refetch}
        requestAnalysis={requestAnalysis}
        gameReviewTheme={null}
        scores={scores}
        ThemeScoreerror={themeScoreError}
        ThemeScoreloading={themeScoreLoading}
        autoAnalysis={autoAnalysis}
        onPlayMove={handlePlayMove}
        onAppendMoves={handlePlayMoveSequence}
        pvResult={pvResult}
        pvLoading={pvLoading}
        pvError={pvError}
        requestPv={requestPv}
      />
    </Box>
  );


  const boardPanel = (
    <AiChessboardPanel
      game={game}
      fen={fen}
      moveSquares={autoAnalysis ? moveSquares : {}}
      setMoveSquares={setMoveSquares}
      engine={engine}
      setFen={setFen}
      setGame={setGame}
      evaluations={autoAnalysis ? evaluations : {}}
      sanEvaluations={autoAnalysis ? sanEvaluations : {}}
      setOpeningData={setOpeningData}
      setStockfishAnalysisResult={setStockfishAnalysisResult}
      stockfishAnalysisResult={autoAnalysis ? stockfishAnalysisResult : null}
      fetchOpeningData={fetchOpeningData}
      analyzeWithStockfish={analyzeWithStockfish}
      llmLoading={llmLoading}
      stockfishLoading={autoAnalysis ? stockfishLoading : false}
      maiaLoading={autoAnalysis ? maiaIsLoading : false}
      openingLoading={openingLoading}
      autoAnalysis={autoAnalysis}
      onTreePrevious={handleTreePrevious}
      onTreeNext={handleTreeNext}
      onTreeStart={handleTreeStart}
      onTreeEnd={handleTreeEnd}
      hideBuiltInMoveList
      treePly={treePly}
      treeMaxPly={treeMaxPly}
    />
  );

  const moveListPanel = (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      <Box sx={{
        px: 2, py: 0.75, flexShrink: 0,
        borderBottom: 1, borderColor: "divider", bgcolor: "background.paper",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
          
        </Typography>
        <Tooltip title="Reset position">
          <IconButton size="small" onClick={resetPosition} sx={{ p: 0.4 }}>
            <RefreshIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
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

  // ── desktop ───────────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        height: "100vh",
        overflow: "hidden",
      }}>
        {/* LEFT: Analysis | Position tabs */}
        <Box sx={{ borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", flexShrink: 0, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            {([
              { id: "analysis" as LeftTab, label: "Analysis", icon: <AnalyticsIcon sx={{ fontSize: 13 }} /> },
            ]).map(tab => (
              <Box
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                sx={{
                  flex: 1, py: 1, textAlign: "center", cursor: "pointer",
                  fontSize: "12px", fontWeight: leftTab === tab.id ? 700 : 400,
                  color: leftTab === tab.id ? "primary.main" : "text.secondary",
                  borderBottom: 2, borderColor: leftTab === tab.id ? "primary.main" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5,
                  "&:hover": { bgcolor: "action.hover" }, userSelect: "none",
                }}
              >
                {tab.icon}
                {tab.label}
              </Box>
            ))}
          </Box>
          <Box sx={{
            flex: 1, overflowY: "auto",
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
          }}>
            {leftTab === "analysis" && analysisPanel}
          </Box>
        </Box>

        {/* CENTER: board */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRight: 1, borderColor: "divider" }}>
          {boardPanel}
        </Box>

        {/* RIGHT: move list */}
        {moveListPanel}
      </Box>
    );
  }

  // ── mobile ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 1, minHeight: "100vh", pb: 12 }}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {boardPanel}
      </Box>

      {/* Inline move list */}
      <Box sx={{
        mt: 1.5, border: 1, borderColor: "divider", borderRadius: 1,
        overflow: "hidden", maxHeight: 240, display: "flex", flexDirection: "column",
      }}>
        <Box sx={{
          px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, bgcolor: "background.paper",
        }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
            MOVES
          </Typography>
          <Tooltip title="Reset position">
            <IconButton size="small" onClick={resetPosition} sx={{ p: 0.4 }}>
              <RefreshIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <AnnotatedMoveList tree={tree} onTreeChange={setTree} onNavigate={handleNavigate} />
        </Box>
      </Box>

      {/* Position (FEN) quick panel */}
      <Box sx={{ mt: 1.5 }}>
        <List dense disablePadding>
          <ListItemButton
            onClick={() => setLeftTab(leftTab === "position" ? "analysis" : "position")}
            sx={{ borderRadius: 1, border: 1, borderColor: "divider", mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <FenIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary="Set Position / FEN"
              slotProps={{ primary: { sx: { fontSize: 13 } } }}
            />
          </ListItemButton>
        </List>
      </Box>

      {/* FAB: Analysis */}
      <Fab
        color="primary"
        onClick={() => setAnalysisDrawerOpen(true)}
        sx={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}
      >
        <AnalyticsIcon />
      </Fab>

      {/* Analysis drawer */}
      <Drawer
        anchor="bottom"
        open={analysisDrawerOpen}
        onClose={() => setAnalysisDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Typography variant="h6" fontWeight={600}>Analysis</Typography>
            <Button onClick={() => setAnalysisDrawerOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {analysisPanel}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}