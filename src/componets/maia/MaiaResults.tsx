import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { TrendingUp, TrendingDown } from '@mui/icons-material'
import { MaiaEvaluation } from '@/libs/maia/types'

export interface MaiaResultsProps {
  evaluations: { [key: string]: MaiaEvaluation } | null
  isMaiaLoading: boolean
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
  if (value > 0.55) return '#4caf50' // Green
  if (value < 0.30) return '#f44336' // Red
  return '#ff9800' // Orange
}

const getValueIcon = (value: number) => {
  if (value > 0.55) return <TrendingUp sx={{ fontSize: 16 }} />
  if (value < 0.30) return <TrendingDown sx={{ fontSize: 16 }} />
  return null
}

export const MaiaResults: React.FC<MaiaResultsProps> = ({
  evaluations,
  isMaiaLoading,
  maiaerror,
}) => {
  const [selectedModel, setSelectedModel] = useState(0)

  if (isMaiaLoading) {
    return (
      <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
          </Box>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
            <CircularProgress size={40} />
            <Typography >
              Analyzing position...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (maiaerror) {
    return (
      <Card >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
          </Box>
          <Alert severity="error" >
            {maiaerror.message}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!evaluations) {
    return (
      <Card sx={{  border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
          </Box>
          <Typography sx={{ textAlign: 'center', py: 4 }}>
            No analysis available
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const currentModel = MAIA_MODELS[selectedModel]
  const currentEvaluation = evaluations[currentModel]

  if (!currentEvaluation) {
    return null
  }

  const topMoves = Object.entries(currentEvaluation.policy)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <Card sx={{  border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Typography variant="h6" >
            Human Moves
          </Typography>
        </Box>

       
        <Box sx={{ borderBottom: 1, mb: 3 }}>
        <FormControl fullWidth variant="standard" sx={{ mb: 2 }}>
            <InputLabel id="maia-model-select-label" >
                Model
            </InputLabel>
            <Select
                labelId="maia-model-select-label"
                value={selectedModel}
                label="Model"
                onChange={(e) => setSelectedModel(Number(e.target.value))}
                
            >
                {MAIA_MODELS.map((model, idx) => (
                    <MenuItem key={model} value={idx}>
                        {formatModelName(model)}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
        </Box>

        {/* Position Evaluation */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" >
              Position Evaluation
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {getValueIcon(currentEvaluation.value)}
              <Chip
                label={formatValue(currentEvaluation.value)}
                size="small"
                sx={{
                  bgcolor: getValueColor(currentEvaluation.value),
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={currentEvaluation.value * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                bgcolor: getValueColor(currentEvaluation.value),
              },
            }}
          />
        </Box>


        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Top Moves
          </Typography>
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
        </Box>
      </CardContent>
    </Card>
  )
}