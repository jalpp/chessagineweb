import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useChessDB } from '@/hooks/useChessDb';
import { CandidateMove } from '@/libs/agine/helper';
import { useSessionStorage } from 'usehooks-ts';

/* ----------------------------- Types ----------------------------- */

interface TreeNodeData {
  fen: string;
  move: CandidateMove | null;
  depth: number;
  path: string;
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
}) => {
  const [childFen, setChildFen] = useState<string | null>(null);

  const isExpanded = expandedPaths.has(path);
  const shouldFetch = isExpanded && depth < maxDepth;

  const { data: childMoves, loading } = useChessDB(
    shouldFetch && childFen ? childFen : '',
    !shouldFetch
  );

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

  const hasChildren = depth < maxDepth;
  const canExpand = hasChildren && childMoves.length > 0;
  const isSelected = selectedPath === path;

  const limitedMoves = useMemo(
    () => childMoves.slice(0, breadth),
    [childMoves, breadth]
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
    });
  };

  const noteColor = (note: string) =>
    note === 'Best' ? 'success' : note === 'Good' ? 'info' : 'warning';

  return (
    <Box sx={{ ml: level > 0 ? 3 : 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 0.75,
          px: 1.5,
          cursor: 'pointer',
          borderRadius: 1,
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
          borderLeft: level > 0 ? 2 : 0,
          borderColor: 'divider',
        }}
      >
        {hasChildren && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            disabled={!canExpand && !loading}
            sx={{ mr: 1, p: 0.5 }}
          >
            {loading ? (
              <CircularProgress size={16} />
            ) : isExpanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>
        )}

        <Box onClick={handleNodeClick} sx={{ flex: 1, display: 'flex', gap: 1 }}>
          {move ? (
            <>
              <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                {move.san}
              </Typography>
              <Chip
                label={move.note}
                size="small"
                color={noteColor(move.note)}
              />
              <Typography variant="caption">Eval: {move.score}</Typography>
              <Typography variant="caption">WR: {move.winrate}%</Typography>
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

export const ChessTreeView: React.FC<ChessTreeViewProps> = ({
  initialFen,
  defaultDepth = 3,
  defaultBreadth = 3,
}) => {
  const [fen, setFen] = useState(initialFen);
  const [depth, setDepth] = useSessionStorage('tree-depth', defaultDepth);
  const [breadth, setBreadth] = useSessionStorage('tree-breadth', defaultBreadth);
  const [replaceRoot, setReplaceRoot] = useSessionStorage('tree-replace-root', false);
  const [expandedPaths, setExpandedPaths] = useState(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);

  const {
    data: rootMoves,
    loading,
    error,
    refetch,
  } = useChessDB(fen, false);

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
        setExpandedPaths(new Set(['root']));
      } else if (!expandedPaths.has(node.path)) {
        handleToggleExpand(node.path);
      }
    },
    [fen, replaceRoot, expandedPaths, handleToggleExpand]
  );

  const displayFen = selectedNode?.fen || fen;

  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Tree Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography>Depth: {depth}</Typography>
            <Slider min={1} max={6} value={depth} onChange={(_, v) => setDepth(v as number)} />

            <Typography>Breadth: {breadth}</Typography>
            <Slider min={1} max={5} value={breadth} onChange={(_, v) => setBreadth(v as number)} />

            <FormControlLabel
              control={<Switch checked={replaceRoot} onChange={(e) => setReplaceRoot(e.target.checked)} />}
              label="Replace root on click"
            />

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
        <Chessboard options={{
            position: displayFen,
            allowDragging: false
        }}/>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          rootMoves.slice(0, breadth).map((move, i) => (
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
            />
          ))
        )}
      </Paper>
    </Box>
  );
};

export default ChessTreeView;
