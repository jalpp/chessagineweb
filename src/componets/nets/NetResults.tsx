import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Button,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { TrendingUp, TrendingDown, Download, CloudDownload, Calculate } from '@mui/icons-material'
import { MaiaEvaluation, ModelType, MODEL_CONFIGS } from '@/libs/nets/types'
import { useNetStatus, useNetModels } from '@/context/NetContext'
import { CandidateMove } from '@/libs/agine/helper'
import { QuadrantClassification } from '@/libs/nets/classifyMoves'
import { QuadrantAnalysisView } from './QuadrantAnalysisView'
import { PositionEval } from '@/stockfish/engine/engine'
import { StockfishEaseMetricCalculator } from '@/libs/easemetric/stockfishEaseMetric'
import { UciEngine } from '@/stockfish/engine/UciEngine'
import { useEaseMetricVariation } from '@/hooks/useEmVariation'
import { Chess } from 'chess.js'
import { MAX_PV_MOVES } from '@/libs/setting/helper'

export interface MaiaResultsProps {
  evaluations: {
    maia2?: { [key: string]: MaiaEvaluation } | null
    bigLeela?: MaiaEvaluation | null
    elitemaia?: MaiaEvaluation | null
  }
  ucievaluations: {
    maia2?: { [key: string]: MaiaEvaluation } | null
    bigLeela?: MaiaEvaluation | null
    elitemaia?: MaiaEvaluation | null
  }
  isMaiaLoading: boolean
  chessDbMoves: CandidateMove[] | null;
  engine?: UciEngine | null;
  chessDbLoading: boolean;
  stockfishAnalysisResult: PositionEval | null;
  maiaerror: Error | null
  fen: string;
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
]

const formatModelName = (model: string) => {
  return model.replace('maia_kdd_', 'Maia ')
}

const formatValue = (value: number) => {
  const percentage = (value * 100).toFixed(1)
  return `${percentage}%`
}

const getValueColor = (value: number) => {
  if (value > 0.55) return '#4caf50'
  if (value < 0.30) return '#f44336'
  return '#ff9800'
}

const getValueIcon = (value: number) => {
  if (value > 0.55) return <TrendingUp sx={{ fontSize: 16 }} />
  if (value < 0.30) return <TrendingDown sx={{ fontSize: 16 }} />
  return null
}

const getEMColor = (value: number) => {
  // Positive EM means variation gets easier
  if (value > 0.1) return '#4caf50'
  // Negative EM means variation gets harder
  if (value < -0.1) return '#f44336'
  // Near zero means similar difficulty
  return '#ff9800'
}

const formatPrincipalVariation = (pv: string[], startFen: string): string => {
      const tempGame = new Chess(startFen);
      const moves: string[] = [];

      for (const uciMove of pv.slice(0, MAX_PV_MOVES)) {
        try {
          const move = tempGame.move({
            from: uciMove.slice(0, 2),
            to: uciMove.slice(2, 4),
            promotion: uciMove.length > 4 ? (uciMove[4] as string) : undefined,
          });
          if (move) {
            moves.push(move.san);
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      return moves.join(" ");
    }

const MovesList: React.FC<{ policy: { [key: string]: number } }> = ({ policy }) => {
  const topMoves = Object.entries(policy)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {topMoves.map(([move, probability], index) => (
        <Box
          key={move}
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Chip
            label={index + 1}
            size="small"
            sx={{
              fontWeight: 600,
              minWidth: 28,
            }}
          />
          <Typography
            sx={{
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: '1rem',
            }}
          >
            {move}
          </Typography>
          <Box flex={1} mx={2}>
            <LinearProgress
              variant="determinate"
              value={probability * 100}
              sx={{
                height: 6,
                borderRadius: 3,
              }}
            />
          </Box>
          <Typography
            sx={{
              fontWeight: 600,
              minWidth: 50,
              textAlign: 'right',
            }}
          >
            {(probability * 100).toFixed(1)}%
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

const VariationEaseMetricView: React.FC<{
  variations: PositionEval | null
  isCalculating: boolean
}> = ({ variations, isCalculating }) => {
  if (isCalculating) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
        <CircularProgress size={40} />
        <Typography>Calculating variation ease metrics...</Typography>
      </Box>
    )
  }

  if (!variations || !variations.lines.length) {
    return (
      <Typography sx={{ textAlign: 'center', py: 2 }}>
        No variation data available
      </Typography>
    )
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        Variation Difficulty Analysis
      </Typography>
      
      <Box sx={{ 
        borderRadius: 2, 
        p: 2,
        mb: 3
      }}>
        <Typography variant="body2" >
          Shows how the position difficulty changes after following each engine line. 
          Positive values mean the position becomes easier, negative values mean it becomes harder.
        </Typography>
      </Box>

      <TableContainer component={Paper} >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Line</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Moves</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Eval</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">EM Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variations.lines.map((line, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Chip 
                    label={`#${index + 1}`} 
                    size="small" 
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatPrincipalVariation(line.pv, line.fen)}
                    {line.pv.length > 3 ? '...' : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {line.mate !== undefined 
                      ? `M${line.mate}` 
                      : line.cp !== undefined 
                        ? `${(line.cp / 100).toFixed(2)}`
                        : 'N/A'
                    }
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {line.endingEM !== undefined ? (
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                      <Chip
                        label={line.endingEM >= 0 ? `+${line.endingEM.toFixed(3)}` : line.endingEM.toFixed(3)}
                        size="small"
                        sx={{
                          bgcolor: getEMColor(line.endingEM),
                          fontWeight: 600,
                          fontFamily: 'monospace',
                        }}
                      />
                      {line.endingEM > 0.1 && <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />}
                      {line.endingEM < -0.1 && <TrendingDown sx={{ fontSize: 16, color: '#f44336' }} />}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      Calculating...
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{
        borderRadius: 2, 
        p: 2,
        mt: 3
      }}>``
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Interpretation Guide
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 0.5 } }}>
          <Typography component="li" variant="body2">
            🟢 Positive EM: The variation leads to a simpler position
          </Typography>
          <Typography component="li" variant="body2">
            🟠 Near Zero: Similar difficulty to current position
          </Typography>
          <Typography component="li" variant="body2">
            🔴 Negative EM: The variation leads to a more complex position
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}


const EvaluationDisplay: React.FC<{ 
  evaluation: MaiaEvaluation
  ucievaluation?: MaiaEvaluation | null
  candidateMoves?: CandidateMove[] | null
  stockfishAnalysisResult: PositionEval | null;
  engine?: UciEngine | null;
  fen: string;
  showQuadrantAnalysis?: boolean
}> = ({ ucievaluation, evaluation, candidateMoves, showQuadrantAnalysis = true, stockfishAnalysisResult, engine, fen }) => {
  const [viewMode, setViewMode] = useState<'evaluation' | 'quadrant' | 'ease' | 'variations'>('evaluation')
  const [improbableThreshold, setImprobableThreshold] = useState(0.05)
  
  const { variations, isLoading } = useEaseMetricVariation(
    fen,
    engine || null,
    ucievaluation || evaluation,
    stockfishAnalysisResult
  )

  const quadrantMoves = React.useMemo(() => {
    if (!candidateMoves || candidateMoves.length === 0) return []
    return QuadrantClassification(evaluation, candidateMoves, improbableThreshold)
  }, [evaluation, candidateMoves, improbableThreshold])

  const easeMetric = React.useMemo(() => {
    if (!candidateMoves || candidateMoves.length === 0 || !ucievaluation) return null
    const easeMetricCalculator = new StockfishEaseMetricCalculator(true);
    try {
      return easeMetricCalculator.calculateEaseMetric(ucievaluation, stockfishAnalysisResult);
    } catch {
      return null
    }
  }, [ucievaluation, stockfishAnalysisResult])

  const hasQuadrantData = quadrantMoves.length > 0
  const hasEaseData = easeMetric !== null
  const hasVariationData = stockfishAnalysisResult && stockfishAnalysisResult.lines.length > 0

  const handleThresholdChange = (event: Event, newValue: number | number[]) => {
    setImprobableThreshold(newValue as number)
  }

  const handleCalculateVariations = () => {
    setViewMode('variations')
  }

  return (
    <>
      {(hasQuadrantData || hasEaseData || hasVariationData) && showQuadrantAnalysis && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={viewMode} onChange={(_, newValue) => setViewMode(newValue)}>
            <Tab label="Position Evaluation" value="evaluation" />
            {hasQuadrantData && <Tab label="Candidate Analysis" value="quadrant" />}
            {hasEaseData && <Tab label="Ease Metric Analysis" value="ease" />}
            {hasVariationData && <Tab label="Variation Analysis" value="variations" />}
          </Tabs>
        </Box>
      )}

      {viewMode === 'evaluation' ? (
        <>
          <Box mb={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2">
                Position Evaluation
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {getValueIcon(evaluation.value)}
                <Chip
                  label={formatValue(evaluation.value)}
                  size="small"
                  sx={{
                    bgcolor: getValueColor(evaluation.value),
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={evaluation.value * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  bgcolor: getValueColor(evaluation.value),
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Top Moves
            </Typography>
            <MovesList policy={evaluation.policy} />
          </Box>

          {hasVariationData && (
            <Box mt={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Calculate />}
                onClick={handleCalculateVariations}
                disabled={isLoading}
                sx={{ textTransform: 'none' }}
              >
                {isLoading ? 'Calculating...' : 'Analyze Variations'}
              </Button>
            </Box>
          )}
        </>
      ) : viewMode === 'quadrant' ? (
        <>
          <Box mb={3} px={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2">
                Improbability Threshold
              </Typography>
              <Chip 
                label={`${(improbableThreshold * 100).toFixed(0)}%`}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Slider
              value={improbableThreshold}
              onChange={handleThresholdChange}
              min={0.01}
              max={0.50}
              step={0.01}
              marks={[
                { value: 0.01, label: '1%' },
                { value: 0.05, label: '5%' },
                { value: 0.10, label: '10%' },
                { value: 0.15, label: '15%' },
                { value: 0.20, label: '20%' },
                { value: 0.25, label: '25%' },
                { value: 0.35, label: '35%' },
                { value: 0.45, label: '45%' },
                { value: 0.50, label: '50%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
              sx={{
                '& .MuiSlider-markLabel': {
                  fontSize: '0.75rem',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mt: 1 }}>
              Moves below this threshold are considered "unlikely" by the neural network
            </Typography>
          </Box>

          <QuadrantAnalysisView
            quadrantMoves={quadrantMoves} 
            improbableThreshold={improbableThreshold}
          />
        </>
      ) : viewMode === 'ease' ? (
        <>
          {easeMetric !== null && (
            <Box>
              <Box mb={4}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">
                    Position Difficulty
                  </Typography>
                  <Chip
                    label={easeMetric.toFixed(3)}
                    size="medium"
                    sx={{
                      bgcolor: easeMetric > 0.7 ? '#4caf50' : easeMetric > 0.4 ? '#ff9800' : '#f44336',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  />
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={easeMetric * 100}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: easeMetric > 0.7 ? '#4caf50' : easeMetric > 0.4 ? '#ff9800' : '#f44336',
                    },
                  }}
                />
                
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 600 }}>
                    Hard (0.0)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                    Easy (1.0)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: 2, 
                p: 3,
                mb: 3
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Interpretation
                </Typography>
                
                {easeMetric > 0.7 ? (
                  <Box>
                    <Typography sx={{ mb: 1 }}>
                      ✅ <strong>Easy Position</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      The neural network strongly prefers moves that are also objectively strong. 
                      There's clear alignment between human intuition and engine evaluation.
                    </Typography>
                  </Box>
                ) : easeMetric > 0.4 ? (
                  <Box>
                    <Typography sx={{ mb: 1 }}>
                      ⚠️ <strong>Moderate Difficulty</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Some discrepancy between intuitive moves and objectively best moves. 
                      Careful calculation may be needed to find the optimal continuation.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ mb: 1 }}>
                      🔴 <strong>Difficult Position</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      The most intuitive moves may not be the best. This position requires deep analysis 
                      to find the optimal moves, as human pattern recognition diverges from engine evaluation.
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  How It's Calculated
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  The ease metric combines neural network move probabilities with engine evaluations:
                </Typography>
                <Box component="ul" sx={{ pl: 3, '& li': { mb: 0.5, color: 'rgba(255, 255, 255, 0.7)' } }}>
                  <Typography component="li" variant="body2">
                    Higher values (→ 1.0) = Neural net strongly favors objectively best moves
                  </Typography>
                  <Typography component="li" variant="body2">
                    Lower values (→ 0.0) = Neural net favors moves that differ from engine's top choices
                  </Typography>
                  <Typography component="li" variant="body2">
                    Considers both move probability and quality gap from the best move
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </>
      ) : (
        <VariationEaseMetricView 
          variations={variations}
          isCalculating={isLoading}
        />
      )}
    </>
  )
}

const ModelDownloadPrompt: React.FC<{ 
  modelType: ModelType
  downloadModel: (modelType: ModelType) => Promise<void>
}> = ({ modelType, downloadModel }) => {
  const { status, progress } = useNetStatus()
  const [isDownloading, setIsDownloading] = useState(false)

  const modelStatus = status[modelType]
  const modelProgress = progress[modelType] || 0
  const config = MODEL_CONFIGS[modelType]

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadModel(modelType)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const downloading = isDownloading || modelStatus === 'downloading'

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      gap={2} 
      py={4}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {config.name} Not Available
      </Typography>
      <Typography sx={{ mb: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
        {config.description}
      </Typography>
      
      {downloading && modelProgress > 0 && (
        <Box sx={{ width: '100%', maxWidth: 300, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Downloading...</Typography>
            <Typography variant="body2">{Math.round(modelProgress)}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={modelProgress}
            sx={{
              height: 8,
              borderRadius: 4,
            }}
          />
        </Box>
      )}
      
      <Button
        variant="contained"
        startIcon={<Download />}
        onClick={handleDownload}
        disabled={downloading}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        {downloading ? 'Downloading...' : `Download ${config.name}`}
      </Button>
      <Typography variant="caption" >
        Size: {config.size}
      </Typography>
    </Box>
  )
}

const DownloadAllModelsPrompt: React.FC<{
  downloadModel: (modelType: ModelType) => Promise<void>
}> = ({ downloadModel }) => {
  const { status, progress } = useNetStatus()
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)

  const allModelTypes = Object.keys(MODEL_CONFIGS) as ModelType[]
  
  
  const anyDownloading = allModelTypes.some(
    modelType => status[modelType] === 'downloading'
  )
  const downloading = isDownloadingAll || anyDownloading

  return (
    <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <CardContent>
        <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
          <CloudDownload sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ textAlign: 'center' }}>
            Download Neural Nets to Start Analysis
          </Typography>

          {/* Show progress for each model being downloaded */}
          {downloading && (
            <Box sx={{ width: '100%', maxWidth: 500 }}>
              {allModelTypes.map(modelType => {
                const modelStatus = status[modelType]
                const modelProgress = progress[modelType] || 0
                const config = MODEL_CONFIGS[modelType]
                
                if (modelStatus !== 'downloading' && modelProgress === 0) return null

                return (
                  <Box key={modelType} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{config.name}</Typography>
                      <Typography variant="body2">{Math.round(modelProgress)}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={modelProgress}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                      }}
                    />
                  </Box>
                )
              })}
            </Box>
          )}

          {/* Individual model cards */}
          <Box sx={{ width: '100%', maxWidth: 600, mt: 2 }}>
            <Box display="flex" flexDirection="column" gap={2}>
              {allModelTypes.map((modelType) => {
                const config = MODEL_CONFIGS[modelType]
                const modelStatus = status[modelType]
                const modelProgress = progress[modelType] || 0
                const isReady = modelStatus === 'ready'
                const isDownloading = modelStatus === 'downloading'

                return (
                  <Card key={modelType} >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {config.name}
                          </Typography>
                          <Typography variant="caption" >
                            {config.description}
                          </Typography>
                          <Typography variant="caption" >
                            {config.size}
                          </Typography>
                        
                        </Box>
                        
                        {isReady ? (
                          <Chip label="Ready" color="success" size="small" />
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Download />}
                            onClick={() => downloadModel(modelType)}
                            disabled={isDownloading || downloading}
                            sx={{
                              textTransform: 'none',
                              minWidth: 120,
                            }}
                          >
                            {isDownloading ? `${Math.round(modelProgress)}%` : 'Download'}
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export const NetResults: React.FC<MaiaResultsProps> = ({
  evaluations,
  stockfishAnalysisResult,
  ucievaluations,
  chessDbMoves,
  isMaiaLoading,
  maiaerror,
  engine,
  fen,
}) => {
  const { status, activeModels } = useNetStatus()
  const { downloadModel } = useNetModels()
  const [selectedMaia2Model, setSelectedMaia2Model] = useState(0)
  const [selectedTab, setSelectedTab] = useState<ModelType>('maia2')

  // Check if any model is downloading
  const isAnyModelDownloading = Object.values(status).some(
    (modelStatus) => modelStatus === 'downloading'
  )

  // Show loading if Maia is analyzing
  if (isMaiaLoading) {
    return (
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
            <CircularProgress size={40} />
            <Typography>
              Analyzing position...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // Show loading if any model is downloading
  if (isAnyModelDownloading) {
    const downloadingModel = (Object.keys(status) as ModelType[]).find(
      (key) => status[key] === 'downloading'
    )
    
    return (
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
            <Typography>
              Downloading {downloadingModel ? MODEL_CONFIGS[downloadingModel].name : 'model'}... Please wait.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (maiaerror) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            {maiaerror.message}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // If no models are active, show download all prompt
  if (activeModels.length === 0) {
    return <DownloadAllModelsPrompt downloadModel={downloadModel} />
  }

  const currentTab = selectedTab

  // Check if current tab model is ready
  const isCurrentModelReady = status[currentTab] === 'ready'

  return (
    <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Typography variant="h6">
            Human Moves Analysis
          </Typography>
        </Box>

        {/* Model Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            variant="fullWidth"
          >
            {(Object.keys(MODEL_CONFIGS) as ModelType[]).map((modelType) => {
              return (
                <Tab
                  key={modelType}
                  label={MODEL_CONFIGS[modelType].name}
                  value={modelType}
                />
              )
            })}
          </Tabs>
        </Box>

        {/* Show download prompt if selected model is not ready */}
        {!isCurrentModelReady && (
          <ModelDownloadPrompt modelType={currentTab} downloadModel={downloadModel} />
        )}

        {/* Maia 2 with Rating Level Selector */}
        {isCurrentModelReady && currentTab === 'maia2' && evaluations.maia2 && (
          <>
            <FormControl fullWidth variant="standard" sx={{ mb: 3 }}>
              <InputLabel id="maia-model-select-label">
                Rating Level
              </InputLabel>
              <Select
                labelId="maia-model-select-label"
                value={selectedMaia2Model}
                label="Rating Level"
                onChange={(e) => setSelectedMaia2Model(Number(e.target.value))}
              >
                {MAIA_MODELS.map((model, idx) => (
                  <MenuItem key={model} value={idx}>
                    {formatModelName(model)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {evaluations.maia2[MAIA_MODELS[selectedMaia2Model]] && (
              <EvaluationDisplay
                evaluation={evaluations.maia2[MAIA_MODELS[selectedMaia2Model]]}
                stockfishAnalysisResult={stockfishAnalysisResult}
                candidateMoves={chessDbMoves}
                engine={engine}
                fen={fen}
              />
            )}
          </>
        )}

        {isCurrentModelReady && currentTab === 'bigLeela' && evaluations.bigLeela && ucievaluations.bigLeela && (
          <EvaluationDisplay 
            evaluation={evaluations.bigLeela} 
            candidateMoves={chessDbMoves} 
            stockfishAnalysisResult={stockfishAnalysisResult} 
            ucievaluation={ucievaluations.bigLeela}
            engine={engine}
            fen={fen}
          />
        )}

        {isCurrentModelReady && currentTab === 'elitemaia' && evaluations.elitemaia && ucievaluations.elitemaia && (
          <EvaluationDisplay 
            evaluation={evaluations.elitemaia} 
            candidateMoves={chessDbMoves} 
            stockfishAnalysisResult={stockfishAnalysisResult} 
            ucievaluation={ucievaluations.elitemaia}
            engine={engine}
            fen={fen}
          />
        )}
      </CardContent>
    </Card>
  )
}