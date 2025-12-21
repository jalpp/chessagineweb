import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogContent,
  Card,
  CardContent,
  CardActions,
} from '@mui/material'
import {
  AutoAwesome,
  Download,
  Loop,
  CheckCircle,
} from '@mui/icons-material'
import { ModelType, MODEL_CONFIGS } from '@/libs/maia/types'

interface Props {
  progress: Record<ModelType, number>
  status: Record<ModelType, 'loading' | 'no-cache' | 'downloading' | 'ready' | 'error'>
  download: (modelType: ModelType) => Promise<void>
  onClose?: () => void
}

export const DownloadModelModal: React.FC<Props> = ({
  progress,
  status,
  download,
  onClose,
}) => {
  const [downloadingModel, setDownloadingModel] = useState<ModelType | null>(null)

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const handleDownload = async (modelType: ModelType) => {
    if (downloadingModel || status[modelType] === 'ready') return
    setDownloadingModel(modelType)

    try {
      await download(modelType)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Download failed:', errorMessage)
    } finally {
      setDownloadingModel(null)
    }
  }

  const allModelsReady = Object.values(status).every(s => s === 'ready')

  return (
    <Dialog
      open={true}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backdropFilter: 'blur(12px)',
          borderRadius: 2,
        },
      }}
      data-testid="download-modal"
    >
      <DialogContent sx={{ p: { xs: 3, md: 5 } }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <AutoAwesome sx={{ fontSize: 32 }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.5rem', md: '1.875rem' },
            }}
          >
            Download Maia Models
          </Typography>
        </Box>

        <Typography sx={{ mb: 4 }}>
          Choose which Maia models to download. Each model provides different insights:
        </Typography>

        <Box display="flex" flexDirection="column" gap={3} mb={4}>
          {(Object.keys(MODEL_CONFIGS) as ModelType[]).map((modelType) => {
            const config = MODEL_CONFIGS[modelType]
            const modelStatus = status[modelType]
            const modelProgress = progress[modelType]
            const isDownloading = downloadingModel === modelType
            const isReady = modelStatus === 'ready'

            return (
              <Card key={modelType} sx={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {config.name}
                  </Typography>
                  <Typography sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
                    {config.description}
                  </Typography>

                  {modelProgress > 0 && modelProgress < 100 && (
                    <Box
                      sx={{
                        position: 'relative',
                        height: 32,
                        borderRadius: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        mb: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <Typography
                        sx={{
                          position: 'relative',
                          zIndex: 10,
                          fontSize: '0.875rem',
                        }}
                      >
                        {Math.round(modelProgress)}%
                      </Typography>
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${modelProgress}%`,
                          bgcolor: 'primary.main',
                          borderRadius: '4px 0 0 4px',
                          transition: 'width 0.5s ease-out',
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Size: {config.size}
                  </Typography>
                  <Button
                    variant={isReady ? 'outlined' : 'contained'}
                    startIcon={
                      isDownloading ? (
                        <Loop className="animate-spin" />
                      ) : isReady ? (
                        <CheckCircle />
                      ) : (
                        <Download />
                      )
                    }
                    onClick={() => handleDownload(modelType)}
                    disabled={isDownloading || isReady}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {isReady ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </CardActions>
              </Card>
            )
          })}
        </Box>

        {allModelsReady && onClose && (
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Continue to Analysis
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}