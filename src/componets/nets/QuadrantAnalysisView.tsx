import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import { QuadrantMove, QuadrantCandidateMoves } from '@/libs/nets/types';
import { QUADRANT_CONFIG, groupMovesByQuadrant } from '@/libs/nets/classifyMoves';

export interface QuadrantAnalysisViewProps {
  quadrantMoves: QuadrantMove[];
  improbableThreshold: number;
}

export const QuadrantAnalysisView: React.FC<QuadrantAnalysisViewProps> = ({ 
  quadrantMoves, 
  improbableThreshold 
}) => {
  const grouped = React.useMemo(
    () => groupMovesByQuadrant(quadrantMoves),
    [quadrantMoves]
  );

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Candidate Move Analysis
        </Typography>
        <Typography variant="body2" >
          Comparing human neural net probability vs. Objective quality (ChessDb Win % & ChessDB Notes) (threshold: {(improbableThreshold * 100).toFixed(0)}%)
        </Typography>
      </Box>

   
      <Box 
        display="grid" 
        gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" 
        gap={2} 
        mb={3}
      >
        {(Object.keys(QUADRANT_CONFIG) as QuadrantCandidateMoves[]).map(quadrant => {
          const config = QUADRANT_CONFIG[quadrant];
          const moves = grouped[quadrant];

          return (
            <Card 
              key={quadrant} 
              sx={{ 
                border: `2px solid ${config.color}`,
                bgcolor: `${config.color}15`
              }}
            >
              <CardContent>
                {/* Card Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: config.color }}>
                    {config.label}
                  </Typography>
                  <Chip 
                    label={moves.length} 
                    size="small" 
                    sx={{ 
                      bgcolor: config.color, 
                      color: 'white', 
                      fontWeight: 600 
                    }} 
                  />
                </Box>

                {/* Description */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)', 
                    display: 'block', 
                    mb: 2 
                  }}
                >
                  {config.description}
                </Typography>
                
                {/* Move List */}
                {moves.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {moves.slice(0, 3).map(move => (
                      <Box 
                        key={move.notation} 
                        display="flex" 
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ 
                          p: 1, 
                          borderRadius: 1, 
                          bgcolor: 'rgba(255, 255, 255, 0.05)' 
                        }}
                      >
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {move.notation}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {(move.probability * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    ))}
                    {moves.length > 3 && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.5)', 
                          textAlign: 'center',
                          mt: 0.5
                        }}
                      >
                        +{moves.length - 3} more
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    No moves in this category
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};