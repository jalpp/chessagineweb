import React, { useEffect, useState } from 'react'
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
} from '@mui/material'
import { TrendingUp, TrendingDown, Download, CloudDownload } from '@mui/icons-material'
import { MaiaEvaluation, ModelType, MODEL_CONFIGS } from '@/libs/nets/types'
import { useNetStatus, useNetModels } from '@/context/NetContext'
import { CandidateMove } from '@/libs/agine/helper'
import { QuadrantClassification } from '@/libs/nets/classifyMoves'
import { QuadrantAnalysisView } from './QuadrantAnalysisView'

export interface MaiaResultsProps {
  evaluations: {
    maia2?: { [key: string]: MaiaEvaluation } | null
    bigLeela?: MaiaEvaluation | null
    elitemaia?: MaiaEvaluation | null
  }
  isMaiaLoading: boolean
  chessDbMoves: CandidateMove[] | null;
  chessDbLoading: boolean;
  maiaerror: Error | null
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

const EvaluationDisplay: React.FC<{ 
  evaluation: MaiaEvaluation
  candidateMoves?: CandidateMove[] | null
  showQuadrantAnalysis?: boolean
}> = ({ evaluation, candidateMoves, showQuadrantAnalysis = true }) => {
  const [viewMode, setViewMode] = useState<'evaluation' | 'quadrant'>('evaluation')
  const [improbableThreshold, setImprobableThreshold] = useState(0.05) // Make it stateful
 
  const quadrantMoves = React.useMemo(() => {
    if (!candidateMoves || candidateMoves.length === 0) return []
    return QuadrantClassification(evaluation, candidateMoves, improbableThreshold)
  }, [evaluation, candidateMoves, improbableThreshold])

  const hasQuadrantData = quadrantMoves.length > 0

  const handleThresholdChange = (event: Event, newValue: number | number[]) => {
    setImprobableThreshold(newValue as number)
  }

  return (
    <>
      {hasQuadrantData && showQuadrantAnalysis && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={viewMode} onChange={(_, newValue) => setViewMode(newValue)}>
            <Tab label="Position Evaluation" value="evaluation" />
            <Tab label="Candidate Analysis" value="quadrant" />
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
        </>
      ) : (
        <>
          {/* Threshold Control */}
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
  
  // Check which models need downloading
  const modelsToDownload = allModelTypes.filter(
    modelType => status[modelType] !== 'ready'
  )

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true)
    try {
      // Download all models sequentially
      for (const modelType of modelsToDownload) {
        await downloadModel(modelType)
      }
    } catch (error) {
      console.error('Download all failed:', error)
    } finally {
      setIsDownloadingAll(false)
    }
  }

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
            Download Models to Start Analysis
          </Typography>
          <Typography sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', maxWidth: 500 }}>
            Download all analysis models to get comprehensive insights into chess positions
            from different skill levels and perspectives.
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

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudDownload />}
              onClick={handleDownloadAll}
              disabled={downloading || modelsToDownload.length === 0}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                px: 4,
              }}
            >
              {downloading ? 'Downloading...' : 'Download All Models'}
            </Button>
          </Box>

          {/* Individual model cards */}
          <Box sx={{ width: '100%', maxWidth: 600, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, textAlign: 'center' }}>
              Or download individual models:
            </Typography>
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
  chessDbLoading,
  chessDbMoves,
  isMaiaLoading,
  maiaerror,
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
            <CircularProgress size={40} />
            <Typography>
              Downloading {downloadingModel ? MODEL_CONFIGS[downloadingModel].name : 'model'}...
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
                candidateMoves={chessDbMoves}
              />
            )}
          </>
        )}

        {isCurrentModelReady && currentTab === 'bigLeela' && evaluations.bigLeela && (
          <EvaluationDisplay evaluation={evaluations.bigLeela} candidateMoves={chessDbMoves}/>
        )}

        {isCurrentModelReady && currentTab === 'elitemaia' && evaluations.elitemaia && (
          <EvaluationDisplay evaluation={evaluations.elitemaia} candidateMoves={chessDbMoves}/>
        )}
      </CardContent>
    </Card>
  )
}