import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  LinearProgress,
  Divider,
  ButtonGroup,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useChessDB } from "@/hooks/useChessDb";
import { useNets } from "@/hooks/useNets";
import { useNetStatus } from "@/context/NetContext";
import { CandidateMove } from "@/libs/agine/helper";
import { ChessDBEaseMetricCalculator } from "@/libs/easemetric/chessDbEaseMetric";
import { ModelType } from "@/libs/nets/types";
import { useSessionStorage } from "usehooks-ts";

/* ----------------------------- Types ----------------------------- */

interface TreeNodeData {
  fen: string;
  move: CandidateMove | null;
  depth: number;
  path: string;
  easeMetric?: number;
  moveNotation?: string;
}

interface TreeNodeInfo {
  path: string;
  children: string[];
  easeMetric?: number;
  moveNotation: string;
}

interface TreeNodeProps {
  fen: string;
  move: CandidateMove | null;
  depth: number;
  maxDepth: number;
  breadth: number;
  onNodeClick: (data: TreeNodeData) => void;
  selectedPath: string | null;
  path: string;
  level: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  modelType: ModelType;
  calculator: ChessDBEaseMetricCalculator;
  showEaseMetric: boolean;
  moveNotation: string;
  highlightedPath: string | null;
  onEaseMetricCalculated?: (path: string, easeMetric: number) => void;
}

/* ----------------------------- Tree Node ----------------------------- */

const TreeNode: React.FC<TreeNodeProps> = ({
  fen,
  move,
  depth,
  maxDepth,
  breadth,
  onNodeClick,
  selectedPath,
  path,
  level,
  expandedPaths,
  onToggleExpand,
  modelType,
  calculator,
  showEaseMetric,
  moveNotation,
  highlightedPath,
  onEaseMetricCalculated,
}) => {
  const [childFen, setChildFen] = useState<string | null>(null);
  const [easeMetric, setEaseMetric] = useState<number | null>(null);

  const isExpanded = expandedPaths.has(path);
  const shouldFetch = isExpanded && depth < maxDepth;
  const isLeafNode = depth === maxDepth;

  const { data: childMoves, loading: chessDbLoading } = useChessDB(
    shouldFetch && childFen ? childFen : "",
    !shouldFetch,
  );

  // For leaf nodes, fetch data when ease metrics are enabled
  const { data: leafMoves, loading: leafChessDbLoading } = useChessDB(
    isLeafNode && showEaseMetric && childFen ? childFen : "",
    !isLeafNode || !showEaseMetric || !childFen,
  );

  const { evaluations, isLoading: netsLoading } = useNets({
    fen: childFen || "",
    useLichessBook: false,
    enabledModels: showEaseMetric && childFen ? [modelType] : [],
  });

  useEffect(() => {
    let nextFen: string | null = null;

    if (move && fen) {
      try {
        const chess = new Chess(fen);
        const result = chess.move(move.san);
        if (result) nextFen = chess.fen();
      } catch {
        nextFen = null;
      }
    } else {
      nextFen = fen;
    }

    setChildFen((prev) => (prev === nextFen ? prev : nextFen));
  }, [fen, move]);

  // Calculate ease metric when data is available
  useEffect(() => {
    if (!showEaseMetric || !childFen) {
      return;
    }

    const moves = isLeafNode ? leafMoves : childMoves;
    const loading = isLeafNode ? leafChessDbLoading : chessDbLoading;

    if (loading || netsLoading) {
      return;
    }

    if (!moves || moves.length === 0) {
      setEaseMetric(null);
      return;
    }

    let netEval = null;
    if (modelType === "bigLeela" && evaluations.bigLeela) {
      netEval = evaluations.bigLeela;
    } else if (modelType === "elitemaia" && evaluations.elitemaia) {
      netEval = evaluations.elitemaia;
    }

    if (!netEval) {
      setEaseMetric(null);
      return;
    }

    try {
      const metric = calculator.calculateEaseMetric(netEval, moves);
      if (!isNaN(metric) && isFinite(metric)) {
        setEaseMetric(metric);
        onEaseMetricCalculated?.(path, metric);
      } else {
        setEaseMetric(null);
      }
    } catch (err) {
      console.error("Error calculating ease metric:", err);
      setEaseMetric(null);
    }
  }, [
    showEaseMetric,
    childFen,
    childMoves,
    leafMoves,
    evaluations,
    modelType,
    calculator,
    chessDbLoading,
    leafChessDbLoading,
    netsLoading,
    isLeafNode,
    path,
    onEaseMetricCalculated,
  ]);

  const hasChildren = depth < maxDepth;
  const canExpand = hasChildren && childMoves.length > 0;
  const isSelected = selectedPath === path;
  const isHighlighted = highlightedPath?.startsWith(path) || false;
  const isCalculating =
    showEaseMetric &&
    ((isLeafNode ? leafChessDbLoading : chessDbLoading) || netsLoading);

  const limitedMoves = useMemo(
    () => childMoves.slice(0, breadth),
    [childMoves, breadth],
  );

  const handleToggle = () => {
    if (canExpand) onToggleExpand(path);
  };

  const handleNodeClick = () => {
    onNodeClick({
      fen: childFen || fen,
      move,
      depth,
      path,
      easeMetric: easeMetric ?? undefined,
      moveNotation,
    });
  };

  const noteColor = (note: string) =>
    note === "Best" ? "success" : note === "Good" ? "info" : "warning";

  const getEaseMetricColor = (metric: number) => {
    if (metric >= 0.7) return "success";
    if (metric >= 0.4) return "warning";
    return "error";
  };

  return (
    <Box sx={{ ml: level > 0 ? 3 : 0 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.75,
          px: 1.5,
          cursor: "pointer",
          borderRadius: 1,
          bgcolor: isSelected
            ? "action.selected"
            : isHighlighted
              ? "primary.light"
              : "transparent",
          "&:hover": { bgcolor: "action.hover" },
          borderLeft: level > 0 ? 2 : 0,
          borderColor: isHighlighted ? "primary.main" : "divider",
        }}
      >
        {hasChildren && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            disabled={!canExpand && !chessDbLoading}
            sx={{ mr: 1, p: 0.5 }}
          >
            {chessDbLoading ? (
              <CircularProgress size={16} />
            ) : isExpanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>
        )}

        <Box
          onClick={handleNodeClick}
          sx={{ flex: 1, display: "flex", gap: 1, alignItems: "center" }}
        >
          {move ? (
            <>
              <Typography
                variant="body2"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {move.san}
              </Typography>
              <Chip
                label={move.note}
                size="small"
                color={noteColor(move.note)}
              />
              <Typography variant="caption">Eval: {move.score}</Typography>
              <Typography variant="caption">WR: {move.winrate}%</Typography>

              {showEaseMetric && (
                <>
                  {isCalculating ? (
                    <CircularProgress size={12} sx={{ ml: 1 }} />
                  ) : easeMetric !== null ? (
                    <Chip
                      label={`EM: ${easeMetric.toFixed(3)}`}
                      size="small"
                      color={getEaseMetricColor(easeMetric)}
                      variant="outlined"
                    />
                  ) : null}
                </>
              )}
            </>
          ) : (
            <Typography fontWeight="bold">Starting Position</Typography>
          )}
        </Box>
      </Box>

      <Collapse in={isExpanded && canExpand} unmountOnExit>
        <Box sx={{ mt: 0.5 }}>
          {limitedMoves.map((m, i) => (
            <TreeNode
              key={`${path}-${m.uci}-${i}`}
              fen={childFen || fen}
              move={m}
              depth={depth + 1}
              maxDepth={maxDepth}
              breadth={breadth}
              onNodeClick={onNodeClick}
              selectedPath={selectedPath}
              path={`${path}-${m.uci}`}
              level={level + 1}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              modelType={modelType}
              calculator={calculator}
              showEaseMetric={showEaseMetric}
              moveNotation={moveNotation ? `${moveNotation} ${m.san}` : m.san}
              highlightedPath={highlightedPath}
              onEaseMetricCalculated={onEaseMetricCalculated}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

/* ----------------------------- Main View ----------------------------- */

interface ChessTreeViewProps {
  initialFen: string;
  defaultDepth?: number;
  defaultBreadth?: number;
}

interface NodeMetrics {
  path: string;
  easeMetric: number;
  moveNotation: string;
}

export const ChessTreeView: React.FC<ChessTreeViewProps> = ({
  initialFen,
  defaultDepth = 3,
  defaultBreadth = 3,
}) => {
  const [fen, setFen] = useState(initialFen);
  const [depth, setDepth] = useSessionStorage("tree-depth", defaultDepth);
  const [breadth, setBreadth] = useSessionStorage(
    "tree-breadth",
    defaultBreadth,
  );
  const [replaceRoot, setReplaceRoot] = useSessionStorage(
    "tree-replace-root",
    false,
  );
  const [showEaseMetric, setShowEaseMetric] = useSessionStorage(
    "tree-show-ease",
    false,
  );
  const [modelType, setModelType] = useSessionStorage<ModelType>(
    "tree-model",
    "bigLeela",
  );
  const [expandedPaths, setExpandedPaths] = useState(new Set(["root"]));
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [nodeMetrics, setNodeMetrics] = useState<Map<string, number>>(
    new Map(),
  );
  const [foundPath, setFoundPath] = useState<{
    path: string;
    variation: string;
    type: "easy" | "hard";
  } | null>(null);

  const calculator = useMemo(() => new ChessDBEaseMetricCalculator(false), []);
  const { status } = useNetStatus();

  const { data: rootMoves, loading, error, refetch } = useChessDB(fen, false);

  const currentModelStatus = status[modelType];
  const isModelReady = currentModelStatus === "ready";
  const isModelDownloading =
    currentModelStatus === "downloading" || currentModelStatus === "loading";

  const handleEaseMetricCalculated = useCallback(
    (path: string, easeMetric: number) => {
      setNodeMetrics((prev) => {
        const next = new Map(prev);
        next.set(path, easeMetric);
        return next;
      });
    },
    [],
  );

  const buildFullTree = useCallback(() => {
    const tree = new Map<string, TreeNodeInfo>();

    const ensureNode = (path: string, notation = "") => {
      if (!tree.has(path)) {
        tree.set(path, {
          path,
          children: [],
          easeMetric: nodeMetrics.get(path),
          moveNotation: notation,
        });
      }
      return tree.get(path)!;
    };

    rootMoves.forEach((move) => {
      const rootPath = `root-${move.uci}`;
      ensureNode(rootPath, move.san);
    });

    nodeMetrics.forEach((_, path) => {
      const parts = path.split("-");
      if (parts.length < 3) return;

      const parentPath = parts.slice(0, -1).join("-");
      const parent = ensureNode(parentPath);
      ensureNode(path);

      if (!parent.children.includes(path)) {
        parent.children.push(path);
      }
    });

    return tree;
  }, [rootMoves, nodeMetrics]);

  const findEasiestPath = useCallback(() => {
    const tree = buildFullTree();
    let bestScore = -Infinity;
    let bestPath: string[] = [];

    const dfs = (path: string, current: string[], minSoFar: number) => {
      const node = tree.get(path);
      if (!node || node.easeMetric === undefined) return;

      const nextMin = Math.min(minSoFar, node.easeMetric);
      const nextPath = [...current, path];

      if (nextPath.length === depth) {
        if (nextMin > bestScore) {
          bestScore = nextMin;
          bestPath = nextPath;
        }
        return;
      }

      node.children.forEach((child) => dfs(child, nextPath, nextMin));
    };

    rootMoves.forEach((move) => dfs(`root-${move.uci}`, [], Infinity));

    if (!bestPath.length) return null;

    return {
      path: bestPath.at(-1)!,
      variation: bestPath
        .map((p) => tree.get(p)?.moveNotation)
        .filter(Boolean)
        .join(" "),
      score: bestScore,
    };
  }, [buildFullTree, rootMoves, depth]);

  const findHardestPath = useCallback(() => {
    const tree = buildFullTree();
    let bestScore = Infinity;
    let bestPath: string[] = [];

    const dfs = (path: string, current: string[], maxSoFar: number) => {
      const node = tree.get(path);
      if (!node || node.easeMetric === undefined) return;

      const nextMax = Math.max(maxSoFar, node.easeMetric);
      const nextPath = [...current, path];

      if (nextPath.length === depth) {
        if (nextMax < bestScore) {
          bestScore = nextMax;
          bestPath = nextPath;
        }
        return;
      }

      node.children.forEach((child) => dfs(child, nextPath, nextMax));
    };

    rootMoves.forEach((move) => dfs(`root-${move.uci}`, [], -Infinity));

    if (!bestPath.length) return null;

    return {
      path: bestPath.at(-1)!,
      variation: bestPath
        .map((p) => tree.get(p)?.moveNotation)
        .filter(Boolean)
        .join(" "),
      score: bestScore,
    };
  }, [buildFullTree, rootMoves, depth]);

  const handleSearchEasy = () => {
    const result = findEasiestPath();
    console.log(result);
    if (result) {
      setFoundPath({
        path: result.path,
        variation: result.variation,
        type: "easy",
      });
    } else {
      setFoundPath(null);
    }
  };

  const handleSearchHard = () => {
    const result = findHardestPath();
    console.log(result);
    if (result) {
      setFoundPath({
        path: result.path,
        variation: result.variation,
        type: "hard",
      });
    } else {
      setFoundPath(null);
    }
  };

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const handleNodeClick = useCallback(
    (node: TreeNodeData) => {
      setSelectedNode(node);

      if (node.move && replaceRoot && node.fen !== fen) {
        setFen(node.fen);
        setExpandedPaths(new Set(["root"]));
        setFoundPath(null);
      } else if (!expandedPaths.has(node.path)) {
        handleToggleExpand(node.path);
      }
    },
    [fen, replaceRoot, expandedPaths, handleToggleExpand],
  );

  const displayFen = selectedNode?.fen || fen;

  const getModelStatusMessage = () => {
    switch (currentModelStatus) {
      case "loading":
        return "Model is initializing...";
      case "no-cache":
        return "Model not downloaded. Please download the model to use ease metrics.";
      case "downloading":
        return "Model is downloading...";
      case "error":
        return "Error loading model. Please try again.";
      default:
        return null;
    }
  };

  const modelStatusMessage = getModelStatusMessage();

  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Tree Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography>Depth: {depth}</Typography>
            <Slider
              min={1}
              max={6}
              value={depth}
              onChange={(_, v) => setDepth(v as number)}
            />

            <Typography>Breadth: {breadth}</Typography>
            <Slider
              min={1}
              max={5}
              value={breadth}
              onChange={(_, v) => setBreadth(v as number)}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={replaceRoot}
                  onChange={(e) => setReplaceRoot(e.target.checked)}
                />
              }
              label="Replace root on click"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showEaseMetric}
                  onChange={(e) => setShowEaseMetric(e.target.checked)}
                  disabled={!isModelReady}
                />
              }
              label="Show ease metrics"
            />

            {showEaseMetric && (
              <>
                <Typography variant="caption">Model Type</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant={
                      modelType === "bigLeela" ? "contained" : "outlined"
                    }
                    onClick={() => setModelType("bigLeela")}
                  >
                    T1-256 Leela
                  </Button>
                  <Button
                    size="small"
                    variant={
                      modelType === "elitemaia" ? "contained" : "outlined"
                    }
                    onClick={() => setModelType("elitemaia")}
                  >
                    Elite Leela
                  </Button>
                </Stack>

                <Divider />

                <Typography variant="caption">Path Search</Typography>
                <ButtonGroup fullWidth>
                  <Button
                    startIcon={<SearchIcon />}
                    onClick={handleSearchEasy}
                    variant="outlined"
                    color="success"
                  >
                    Find Easiest
                  </Button>
                  <Button
                    startIcon={<SearchIcon />}
                    onClick={handleSearchHard}
                    variant="outlined"
                    color="error"
                  >
                    Find Hardest
                  </Button>
                </ButtonGroup>

                {modelStatusMessage && (
                  <Alert severity={isModelDownloading ? "info" : "warning"}>
                    {modelStatusMessage}
                  </Alert>
                )}
              </>
            )}

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refetch}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Chessboard
          options={{
            position: displayFen,
            allowDragging: false,
          }}
        />

        {selectedNode?.easeMetric !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption">
              Ease Metric: {selectedNode.easeMetric.toFixed(4)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={selectedNode.easeMetric * 100}
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          rootMoves
            .slice(0, breadth)
            .map((move, i) => (
              <TreeNode
                key={`root-${move.uci}-${i}`}
                fen={fen}
                move={move}
                depth={1}
                maxDepth={depth}
                breadth={breadth}
                onNodeClick={handleNodeClick}
                selectedPath={selectedNode?.path || null}
                path={`root-${move.uci}`}
                level={0}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
                modelType={modelType}
                calculator={calculator}
                showEaseMetric={showEaseMetric}
                moveNotation={move.san}
                highlightedPath={foundPath?.path || null}
                onEaseMetricCalculated={handleEaseMetricCalculated}
              />
            ))
        )}
      </Paper>
    </Box>
  );
};

export default ChessTreeView;
