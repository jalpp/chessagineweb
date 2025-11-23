import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogContent,
} from '@mui/material'
import {
  AutoAwesome,
  Download,
  Loop,
} from '@mui/icons-material'

interface Props {
  progress: number
  download: () => void
}

export const DownloadModelModal: React.FC<Props> = ({
  progress,
  download,
}: Props) => {
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const handleDownload = async () => {
    if (isDownloading || progress >= 100) return
    setIsDownloading(true)

    try {
      await download()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Download failed:', errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

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
            Download Maia2
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" gap={2} mb={4}>
          <Typography >
            Maia 2, provides richer and more in-depth
            analysis, allowing for:
          </Typography>

          <Box component="ul" sx={{ pl: 2, color: 'rgba(255, 255, 255, 0.8)' }}>
            <Typography component="li" sx={{ mb: 1 }}>
              ✨ Detailed move evaluations tailored to different rating levels
            </Typography>
            <Typography component="li" sx={{ mb: 1 }}>
              🧠 Insights into how players of various strengths approach the
              game
            </Typography>
            <Typography component="li" sx={{ mb: 1 }}>
              ⚡ Faster, local analysis without needing to send data to a
              server
            </Typography>
          </Box>

          <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Maia 2 runs entirely on your device and requires a one-time 90mb
            download.
          </Typography>
        </Box>

        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          alignItems="end"
          justifyContent="end"
          gap={2}
        >
          {progress > 0 && (
            <Box
              sx={{
                width: '100%',
                order: { xs: 2, md: 1 },
                flex: { md: 1 },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: 32, md: 40 },
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                }}
              >
                <Typography
                  sx={{
                    position: 'relative',
                    zIndex: 10,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  {Math.round(progress)}%
                </Typography>
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progress}%`,
                    borderRadius: '4px 0 0 4px',
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </Box>
            </Box>
          )}

          <Box
            display="flex"
            gap={1}
            sx={{ order: { xs: 1, md: 2 } }}
          >
            <Button
              variant="contained"
              startIcon={isDownloading ? <Loop className="animate-spin" /> : <Download />}
              onClick={handleDownload}
              disabled={isDownloading || progress >= 100}
              sx={{
                height: { xs: 32, md: 40 },
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              {isDownloading ? 'Downloading...' : 'Download Maia 2'}{' '}
              <Typography
                component="span"
                sx={{
                  ml: 0.5,
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                (90mb)
              </Typography>
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}