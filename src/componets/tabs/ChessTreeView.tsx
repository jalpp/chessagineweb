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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useChessDB } from '@/hooks/useChessDb';
import { useNets } from '@/hooks/useNets';
import { useNetStatus } from '@/context/NetContext';
import { CandidateMove } from '@/libs/agine/helper';
import { ModelType } from '@/libs/nets/types';
import { useSessionStorage } from 'usehooks-ts';

type SourceEngine = 'chessdb' | 'maia2' | 'bigLeela' | 'elitemaia';

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
  sourceEngine: SourceEngine;
  selectedMaia2Rating: string;
}

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
  sourceEngine,
  selectedMaia2Rating,
}) => {
  const [childFen, setChildFen] = useState<string | null>(null);
  
  const isExpanded = expandedPaths.has(path);
  const shouldFetch = isExpanded && depth < maxDepth;
  
  // ChessDB hook
  const { data: chessDbMoves, loading: chessDbLoading } = useChessDB(
    shouldFetch && childFen && sourceEngine === 'chessdb' ? childFen : '',
    sourceEngine !== 'chessdb'
  );

  // Neural nets hook
  const { 
    sanEvaluations,
    evaluations, 
    isLoading: netsLoading 
  } = useNets({
    fen: shouldFetch && childFen && sourceEngine !== 'chessdb' ? childFen : '',
    enabledModels: sourceEngine !== 'chessdb' ? [sourceEngine as ModelType] : [],
  });

  // Convert neural net evaluations to CandidateMove format
  const netMoves = useMemo((): CandidateMove[] => {
    if (sourceEngine === 'chessdb' || !shouldFetch || !childFen) return [];
    
    let sanEvaluation = null;
    let uciEvaluation = null;
    
    if (sourceEngine === 'maia2' && sanEvaluations.maia2 && evaluations.maia2) {
      sanEvaluation = sanEvaluations.maia2[selectedMaia2Rating];
      uciEvaluation = evaluations.maia2[selectedMaia2Rating];
    } else if (sourceEngine === 'bigLeela' && sanEvaluations.bigLeela && evaluations.bigLeela) {
      sanEvaluation = sanEvaluations.bigLeela;
      uciEvaluation = evaluations.bigLeela;
    } else if (sourceEngine === 'elitemaia' && sanEvaluations.elitemaia && evaluations.elitemaia) {
      sanEvaluation = sanEvaluations.elitemaia;
      uciEvaluation = evaluations.elitemaia;
    }

    if (!sanEvaluation || !uciEvaluation || !sanEvaluation.policy || !uciEvaluation.policy) return [];

    // Create a mapping from UCI to SAN
    const chess = new Chess(childFen);
    const legalMoves = chess.moves({ verbose: true });
    const uciToSanMap: { [uci: string]: string } = {};
    
    legalMoves.forEach((move) => {
      const uci = move.from + move.to + (move.promotion || '');
      uciToSanMap[uci] = move.san;
    });

    // Build moves array using UCI policy and mapping to SAN
    const moves = Object.entries(uciEvaluation.policy)
       .sort(([, a], [, b]) => b - a)
      .map(([uci, probability]) => {
        const san = uciToSanMap[uci] || uci;
        return {
          uci,
          san,
          score: (probability * 100).toFixed(2),
          winrate: (sanEvaluation.value * 100).toFixed(1),
          rank: '0',
          note: 'Good',
        };
      })
      .map((move, index) => ({
        ...move,
        rank: (index + 1).toString(),
        note: index === 0 ? 'Best' : index < 3 ? 'Good' : 'Bad',
      }));

    return moves;
  }, [sourceEngine, sanEvaluations, evaluations, selectedMaia2Rating, shouldFetch, childFen]);

  const childMoves = sourceEngine === 'chessdb' ? chessDbMoves : netMoves;
  const loading = sourceEngine === 'chessdb' ? chessDbLoading : netsLoading;

  useEffect(() => {
    if (move && fen) {
      try {
        const chess = new Chess(fen);
        // For neural nets, we have UCI in the move.uci field
        // For ChessDB, move.uci might not be proper UCI format, so we use SAN
        let result;
        
        if (sourceEngine === 'chessdb') {
          // ChessDB: try SAN first
          result = chess.move(move.san);
        } else {
          // Neural nets: use UCI format
          if (move.uci && move.uci.length >= 4) {
            const from = move.uci.substring(0, 2);
            const to = move.uci.substring(2, 4);
            const promotion = move.uci.length > 4 ? move.uci[4] as 'q' | 'r' | 'b' | 'n' : undefined;
            
            result = chess.move({ from, to, promotion });
          } else {
            // Fallback to SAN if UCI is not available
            result = chess.move(move.san);
          }
        }
        
        if (result) {
          setChildFen(chess.fen());
        }
      } catch (e) {
        console.error('Invalid move:', e, 'Move:', move, 'Source:', sourceEngine);
        setChildFen(null);
      }
    } else {
      setChildFen(fen);
    }
  }, [fen, move, sourceEngine]);

  const hasChildren = depth < maxDepth;
  const canExpand = hasChildren && childMoves.length > 0;
  const isSelected = selectedPath === path;
  const limitedChildMoves = useMemo(
    () => childMoves.slice(0, breadth),
    [childMoves, breadth]
  );

  const handleToggle = () => {
    if (canExpand || (hasChildren && childFen)) {
      onToggleExpand(path);
    }
  };

  const handleNodeClick = () => {
    onNodeClick({
      fen: childFen || fen,
      move,
      depth,
      path,
    });
  };

  const getNoteColor = (note: string): 'success' | 'info' | 'warning' | 'default' => {
    switch (note) {
      case 'Best':
        return 'success';
      case 'Good':
        return 'info';
      case 'Bad':
        return 'warning';
      default:
        return 'default';
    }
  };

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
          '&:hover': {
            bgcolor: isSelected ? 'action.selected' : 'action.hover',
          },
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
            ) : canExpand ? (
              isExpanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )
            ) : (
              <Box sx={{ width: 20, height: 20 }} />
            )}
          </IconButton>
        )}

        <Box
          onClick={handleNodeClick}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {move ? (
            <>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'bold',
                  minWidth: 50,
                  fontFamily: 'monospace',
                }}
              >
                {move.san}
              </Typography>
              <Chip
                label={move.note}
                size="small"
                color={getNoteColor(move.note)}
                sx={{ minWidth: 60, height: 20, fontSize: '0.7rem' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                {sourceEngine === 'chessdb' ? 'Eval:' : 'Prob:'} {move.score}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                {sourceEngine === 'chessdb' ? 'WR:' : 'Value:'} {move.winrate}%
              </Typography>
              <Chip
                label={`#${move.rank}`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            </>
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Starting Position
            </Typography>
          )}
        </Box>
      </Box>

      <Collapse in={isExpanded && canExpand} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 0.5 }}>
          {limitedChildMoves.map((childMove, idx) => (
            <TreeNode
              key={`${path}-${childMove.uci}-${idx}`}
              fen={childFen || fen}
              move={childMove}
              depth={depth + 1}
              maxDepth={maxDepth}
              breadth={breadth}
              onNodeClick={onNodeClick}
              selectedPath={selectedPath}
              path={`${path}-${childMove.uci}`}
              level={level + 1}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              sourceEngine={sourceEngine}
              selectedMaia2Rating={selectedMaia2Rating}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

interface ChessTreeViewProps {
  initialFen: string;
  defaultDepth?: number;
  defaultBreadth?: number;
}

const MAIA_MODELS = [
  'maia_kdd_1100',
  'maia_kdd_1200',
  'maia_kdd_1300',
  'maia_kdd_1400',
  'maia_kdd_1500',
  'maia_kdd_1600',
  'maia_kdd_1700',
  'maia_kdd_1800',
  'maia_kdd_1900',
];

export const ChessTreeView: React.FC<ChessTreeViewProps> = ({
  initialFen,
  defaultDepth = 3,
  defaultBreadth = 3,
}) => {
  const [fen, setFen] = useState<string>(initialFen);
  const [depth, setDepth] = useSessionStorage<number>("tree-default-depth",defaultDepth);
  const [breadth, setBreadth] = useSessionStorage<number>("tree-default-breath",defaultBreadth);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [replaceRoot, setReplaceRoot] = useSessionStorage<boolean>("tree-replace-root", false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
  const [sourceEngine, setSourceEngine] = useSessionStorage<SourceEngine>('tree-source-engine','chessdb');
  const [selectedMaia2Rating, setSelectedMaia2Rating] = useState<string>(MAIA_MODELS[4]); 

  const { status, activeModels } = useNetStatus();

  // ChessDB hook
  const { data: rootChessDbMoves, loading: chessDbLoading, error: chessDbError, refetch: refetchChessDb } = useChessDB(fen, false);

  // Neural nets hook
  const { 
    sanEvaluations,
    evaluations, 
    isLoading: netsLoading,
    Maiaerror: netsError
  } = useNets({
    fen,
    enabledModels: sourceEngine !== 'chessdb' ? [sourceEngine as ModelType] : [],
  });

  // Convert neural net evaluations to CandidateMove format
  const rootNetMoves = useMemo((): CandidateMove[] => {
    if (sourceEngine === 'chessdb') return [];
    
    let sanEvaluation = null;
    let uciEvaluation = null;
    
    if (sourceEngine === 'maia2' && sanEvaluations.maia2 && evaluations.maia2) {
      sanEvaluation = sanEvaluations.maia2[selectedMaia2Rating];
      uciEvaluation = evaluations.maia2[selectedMaia2Rating];
    } else if (sourceEngine === 'bigLeela' && sanEvaluations.bigLeela && evaluations.bigLeela) {
      sanEvaluation = sanEvaluations.bigLeela;
      uciEvaluation = evaluations.bigLeela;
    } else if (sourceEngine === 'elitemaia' && sanEvaluations.elitemaia && evaluations.elitemaia) {
      sanEvaluation = sanEvaluations.elitemaia;
      uciEvaluation = evaluations.elitemaia;
    }

    if (!sanEvaluation || !uciEvaluation || !sanEvaluation.policy || !uciEvaluation.policy) return [];

    // Create a mapping from UCI to SAN
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    const uciToSanMap: { [uci: string]: string } = {};
    
    legalMoves.forEach((move) => {
      const uci = move.from + move.to + (move.promotion || '');
      uciToSanMap[uci] = move.san;
    });

    // Build moves array using UCI policy and mapping to SAN
    const moves = Object.entries(uciEvaluation.policy)
      .sort(([, a], [, b]) => b - a)
      .map(([uci, probability]) => {
        const san = uciToSanMap[uci] || uci;
        return {
          uci,
          san,
          score: (probability * 100).toFixed(2),
          winrate: (sanEvaluation.value * 100).toFixed(1),
          rank: '0',
          note: 'Good',
        };
      })
      .map((move, index) => ({
        ...move,
        rank: (index + 1).toString(),
        note: index === 0 ? 'Best' : index < 3 ? 'Good' : 'Bad',
      }));

    return moves;
  }, [sourceEngine, sanEvaluations, evaluations, selectedMaia2Rating, fen]);

  const rootMoves = sourceEngine === 'chessdb' ? rootChessDbMoves : rootNetMoves;
  const rootLoading = sourceEngine === 'chessdb' ? chessDbLoading : netsLoading;
  const error = sourceEngine === 'chessdb' ? chessDbError : netsError?.message || null;

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const handleNodeClick = useCallback((nodeData: TreeNodeData) => {
    setSelectedNode(nodeData);
    
    if (nodeData.move !== null) {
      if (replaceRoot) {
        if (nodeData.fen !== fen) {
          setFen(nodeData.fen);
          setExpandedPaths(new Set(['root']));
        }
      } else {
        if (!expandedPaths.has(nodeData.path)) {
          handleToggleExpand(nodeData.path);
        }
      }
    }
  }, [fen, replaceRoot, expandedPaths, handleToggleExpand]);

  const handleSourceEngineChange = (event: SelectChangeEvent<SourceEngine>) => {
    const newEngine = event.target.value as SourceEngine;
    setSourceEngine(newEngine);
    setExpandedPaths(new Set(['root']));
  };

  useEffect(() => {
    setSelectedNode({
      fen: initialFen,
      move: null,
      depth: 0,
      path: 'root',
    });
  }, [initialFen]);

  useEffect(() => {
    setFen(initialFen);
    setExpandedPaths(new Set(['root']));
  }, [initialFen]);

  useEffect(() => {
    if (!rootLoading) {
      setIsRefreshing(true);
      if (sourceEngine === 'chessdb') {
        refetchChessDb();
      }
      const timer = setTimeout(() => setIsRefreshing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [depth, breadth]);

  const displayFen = selectedNode?.fen || fen;
  const isLoading = rootLoading;

  // Check if selected neural net is available
  const isSelectedNetAvailable = sourceEngine === 'chessdb' || 
    (status[sourceEngine as ModelType] === 'ready' && activeModels.includes(sourceEngine as ModelType));

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={2}>
        <Accordion expanded={controlsExpanded} onChange={() => setControlsExpanded(!controlsExpanded)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Tree Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Source Engine</InputLabel>
                <Select
                  value={sourceEngine}
                  label="Source Engine"
                  onChange={handleSourceEngineChange}
                >
                  <MenuItem value="chessdb">ChessDB</MenuItem>
                  <MenuItem value="maia2" disabled={status.maia2 !== 'ready'}>
                    Maia 2 {status.maia2 !== 'ready' && '(Not Downloaded)'}
                  </MenuItem>
                  <MenuItem value="bigLeela" disabled={status.bigLeela !== 'ready'}>
                    T1-256 Leela {status.bigLeela !== 'ready' && '(Not Downloaded)'}
                  </MenuItem>
                  <MenuItem value="elitemaia" disabled={status.elitemaia !== 'ready'}>
                    Elite Leela {status.elitemaia !== 'ready' && '(Not Downloaded)'}
                  </MenuItem>
                </Select>
              </FormControl>

              {sourceEngine === 'maia2' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Maia Rating Level</InputLabel>
                  <Select
                    value={selectedMaia2Rating}
                    label="Maia Rating Level"
                    onChange={(e) => setSelectedMaia2Rating(e.target.value)}
                  >
                    {MAIA_MODELS.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model.replace('maia_kdd_', 'Maia ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Tree Depth: {depth} {depth === 1 ? 'ply' : 'plies'}
                </Typography>
                <Slider
                  value={depth}
                  onChange={(_, v) => setDepth(v as number)}
                  min={1}
                  max={6}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 3, label: '3' },
                    { value: 6, label: '6' },
                  ]}
                  step={1}
                  valueLabelDisplay="auto"
                  size="small"
                  disabled={isLoading}
                />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Branches per Node: {breadth}
                </Typography>
                <Slider
                  value={breadth}
                  onChange={(_, v) => setBreadth(v as number)}
                  min={1}
                  max={5}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                  ]}
                  step={1}
                  valueLabelDisplay="auto"
                  size="small"
                  disabled={isLoading}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={replaceRoot}
                    onChange={(e) => setReplaceRoot(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" color="text.secondary">
                    Replace Root on Click
                  </Typography>
                }
              />

              {sourceEngine === 'chessdb' && (
                <Button
                  variant="outlined"
                  startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={refetchChessDb}
                  size="small"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh Tree Data'}
                </Button>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {selectedNode && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Position
                </Typography>
                {selectedNode.move && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                    <Chip
                      label={`Move: ${selectedNode.move.san}`}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={selectedNode.move.note}
                      size="small"
                      color={
                        selectedNode.move.note === 'Best'
                          ? 'success'
                          : selectedNode.move.note === 'Good'
                          ? 'info'
                          : 'warning'
                      }
                    />
                    <Chip
                      label={`${sourceEngine === 'chessdb' ? 'Score' : 'Position Value'}: ${selectedNode.move.score}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${sourceEngine === 'chessdb' ? 'Win Rate' : 'Probability'}: ${selectedNode.move.winrate}%`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                )}
              </Box>

              <Box
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  mx: 'auto',
                  '& > div': { borderRadius: 1 },
                }}
              >
                <Chessboard
                  options={{
                    position: displayFen,
                    allowDragging: false
                  }}
                />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                FEN: {displayFen}
              </Typography>
            </Stack>
          </Paper>
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">Move Variations Tree</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip 
                label={sourceEngine === 'chessdb' ? 'ChessDB' : sourceEngine === 'maia2' ? 'Maia 2' : sourceEngine === 'bigLeela' ? 'Leela T1-256' : 'Elite Leela'}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {rootMoves.length} {rootMoves.length === 1 ? 'move' : 'moves'} available
              </Typography>
            </Stack>
          </Box>

          {!isSelectedNetAvailable && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Selected neural network is not available. Please download it from the Neural Nets section.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : rootMoves.length === 0 ? (
            <Alert severity="info">
              No candidate moves available for this position.
            </Alert>
          ) : (
            <Box sx={{ maxHeight: 500, overflowY: 'auto', overflowX: 'hidden' }}>
              <Box
                sx={{
                  py: 0.75,
                  px: 1.5,
                  cursor: 'pointer',
                  borderRadius: 1,
                  bgcolor: selectedNode?.path === 'root' && selectedNode?.fen === fen ? 'action.selected' : 'transparent',
                  '&:hover': {
                    bgcolor: selectedNode?.path === 'root' && selectedNode?.fen === fen ? 'action.selected' : 'action.hover',
                  },
                  mb: 1,
                }}
                onClick={() =>
                  handleNodeClick({
                    fen,
                    move: null,
                    depth: 0,
                    path: 'root',
                  })
                }
              >
              </Box>

              {rootMoves.slice(0, breadth).map((move, idx) => (
                <TreeNode
                  key={`root-${move.uci}-${idx}`}
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
                  sourceEngine={sourceEngine}
                  selectedMaia2Rating={selectedMaia2Rating}
                />
              ))}
            </Box>
          )}
        </Paper>
      </Stack>
    </Box>
  );
};

export default ChessTreeView;