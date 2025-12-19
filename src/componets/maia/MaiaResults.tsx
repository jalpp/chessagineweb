import React, { useState } from 'react'
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
} from '@mui/material'
import { TrendingUp, TrendingDown } from '@mui/icons-material'
import { MaiaEvaluation, ModelType, MODEL_CONFIGS } from '@/libs/maia/types'

export interface MaiaResultsProps {
  evaluations: {
    maia2?: { [key: string]: MaiaEvaluation } | null
    maia2200?: MaiaEvaluation | null
    elitemaia?: MaiaEvaluation | null
  }
  isMaiaLoading: boolean
  maiaerror: Error | null
  activeModels: ModelType[]
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
  if (value > 0.55) return '#4caf50' // Green
  if (value < 0.30) return '#f44336' // Red
  return '#ff9800' // Orange
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

const EvaluationDisplay: React.FC<{ evaluation: MaiaEvaluation }> = ({ evaluation }) => {
  return (
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
  )
}

export const MaiaResults: React.FC<MaiaResultsProps> = ({
  evaluations,
  isMaiaLoading,
  maiaerror,
  activeModels,
}) => {
  const [selectedMaia2Model, setSelectedMaia2Model] = useState(0)
  const [selectedTab, setSelectedTab] = useState<ModelType>('maia2')

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

  if (!evaluations || activeModels.length === 0) {
    return (
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <CardContent>
          <Typography sx={{ textAlign: 'center', py: 4 }}>
            No models loaded. Please download a model to see analysis.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  // Ensure selectedTab is in activeModels
  const currentTab = activeModels.includes(selectedTab) ? selectedTab : activeModels[0]

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
            {activeModels.map((modelType) => (
              <Tab
                key={modelType}
                label={MODEL_CONFIGS[modelType].name}
                value={modelType}
              />
            ))}
          </Tabs>
        </Box>

        {/* Maia 2 with Rating Level Selector */}
        {currentTab === 'maia2' && evaluations.maia2 && (
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
              />
            )}
          </>
        )}

        {/* Maia 2200 */}
        {currentTab === 'maia2200' && evaluations.maia2200 && (
          <EvaluationDisplay evaluation={evaluations.maia2200} />
        )}

        {/* Elite Maia */}
        {currentTab === 'elitemaia' && evaluations.elitemaia && (
          <EvaluationDisplay evaluation={evaluations.elitemaia} />
        )}
      </CardContent>
    </Card>
  )
}