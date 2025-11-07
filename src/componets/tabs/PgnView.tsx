import React, { useState, useCallback, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DownloadIcon from '@mui/icons-material/Download';
import CommentIcon from '@mui/icons-material/Comment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ViewListIcon from '@mui/icons-material/ViewList';
import NotesIcon from '@mui/icons-material/Notes';
import { MoveQuality, MoveAnalysis, } from '../../hooks/useGameReview';
import { getMoveClassificationStyle } from './GameReviewTab';
import { AgentMessage } from '@/libs/agine/helper';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PGN_PANEL_DIMENSIONS } from '@/libs/setting/helper';

export interface Move {
  from: string;
  to: string;
  piece?: string;
  captured?: string;
  promotion?: string;
}

export interface MoveComment {
  moveIndex: number;
  comment: string;
  isAiGenerated?: boolean;
}

type ViewMode = 'pgn' | 'movelist';

interface PGNViewProps {
  moves: string[];
  gameResult?: string;
  gamePgn?: string;
  moveAnalysis: MoveAnalysis[] | null;
  goToMove: (index: number) => void;
  currentMoveIndex: number;
  onAnnotateMove?: (review: MoveAnalysis, customQuery?: string) => Promise<AgentMessage | null>;
}

// Convert move quality to PGN annotation symbols
const getMoveAnnotation = (quality: MoveQuality): string => {
  switch (quality) {
    case "Best":
      return "";
    case "Very Good":
      return "";
    case "Good":
      return "";
    case "Dubious":
      return "?!";
    case "Mistake":
      return "?";
    case "Blunder":
      return "??";
    case "Book":
      return "";
    default:
      return "";
  }
};

const shouldShowClassification = (quality: MoveQuality): boolean => {
  return quality === "Blunder" || quality === "Mistake" || quality === "Dubious" || quality === "Best" || quality === "Book" || quality === "Good" || quality === "Very Good";
};

const PGNView: React.FC<PGNViewProps> = ({
  moves,
  moveAnalysis,
  goToMove,
  gamePgn,
  gameResult,
  currentMoveIndex,
  onAnnotateMove,
}) => {
  const [dimensions, setDimensions] = useLocalStorage<{width: number, height: number}>(
    "pgn_view_ui_dimensions",
    DEFAULT_PGN_PANEL_DIMENSIONS
  );
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("pgn_view_mode", "pgn");
  const [isResizing, setIsResizing] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [moveComments, setMoveComments] = useState<MoveComment[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    moveIndex: number;
  } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimensionsRef = useRef({ width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimensionsRef.current = { ...dimensions };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      const minWidth = 550;
      const maxWidth = 715;
      const minHeight = 80;
      const maxHeight = 715;
      
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startDimensionsRef.current.width + deltaX));
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startDimensionsRef.current.height + deltaY));
      
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dimensions, setDimensions]);

  const getMoveAnalysis = (moveIndex: number): MoveAnalysis | undefined => {
    if (!moveAnalysis) return undefined;
    return moveAnalysis[moveIndex];
  };

  const getMoveComment = (moveIndex: number): MoveComment | undefined => {
    return moveComments.find(comment => comment.moveIndex === moveIndex);
  };

  const handleContextMenu = (event: React.MouseEvent, moveIndex: number) => {
    // Always allow context menu for any move, not just analyzed ones
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            moveIndex,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleOpenCommentDialog = (moveIndex: number) => {
    setSelectedMoveIndex(moveIndex);
    const existingComment = getMoveComment(moveIndex);
    setCommentText(existingComment?.comment || '');
    setCommentDialogOpen(true);
    handleCloseContextMenu();
  };

  const handleCloseCommentDialog = () => {
    setCommentDialogOpen(false);
    setSelectedMoveIndex(null);
    setCommentText('');
    setIsAnnotating(false);
  };

  const handleSubmitComment = async () => {
    if (selectedMoveIndex === null || !commentText.trim()) {
      return;
    }

    const newComment: MoveComment = {
      moveIndex: selectedMoveIndex,
      comment: commentText.trim(),
      isAiGenerated: false,
    };

    setMoveComments(prev => [
      ...prev.filter(c => c.moveIndex !== selectedMoveIndex), // Replace existing comment
      newComment
    ]);

    handleCloseCommentDialog();
  };

  const handleAnnotateWithAI = async () => {
    if (!onAnnotateMove || selectedMoveIndex === null) {
      return;
    }

    const analysis = getMoveAnalysis(selectedMoveIndex);
    
    // If there's no analysis for this move, we can't annotate with AI
    if (!analysis) {
      console.warn('No analysis data available for this move');
      return;
    }

    setIsAnnotating(true);
    try {
      const annotation = await onAnnotateMove(analysis, commentText.trim() || undefined);
      if (annotation) {
        // Add AI annotation to existing text
        const currentText = commentText.trim();
        const separator = currentText ? '\n\n' : '';
        const newText = currentText + separator + `Agine: ${annotation.message}`;
        
        setCommentText(newText);
      }
    } catch (error) {
      console.error('Error getting AI annotation:', error);
    } finally {
      setIsAnnotating(false);
    }
  };

  const generateAnnotatedPGN = useCallback((): string => {
    if (!gamePgn || !moveAnalysis) return '';

    // Split PGN into header and moves sections
    const lines = gamePgn.split('\n');
    const headerLines: string[] = [];
    let inHeader = true;

    for (const line of lines) {
      if (line.trim() === '') {
        if (inHeader) {
          headerLines.push(line);
          inHeader = false;
        }
      } else if (line.startsWith('[') && inHeader) {
        headerLines.push(line);
      } else {
        inHeader = false;
      }
    }

    
    // Create annotated moves string with comments
    let annotatedMoves = '';
    
    for (let i = 0; i < moves.length; i++) {
      const moveNumber = Math.floor(i / 2) + 1;
      const isWhiteMove = i % 2 === 0;
      const move = moves[i];
      const analysis = getMoveAnalysis(i);
      const annotation = analysis ? getMoveAnnotation(analysis.quality) : '';
      const comment = getMoveComment(i);
      
      if (isWhiteMove) {
        annotatedMoves += `${moveNumber}. ${move}${annotation}`;
      } else {
        annotatedMoves += `${move}${annotation}`;
      }

      // Add comment if present
      if (comment) {
        annotatedMoves += ` {${comment.comment}}`;
      }

      annotatedMoves += ' ';
    }

    // Add game result if present
    if (gameResult) {
      annotatedMoves += gameResult;
    }

    // Combine header and annotated moves
    const annotatedPGN = headerLines.join('\n') + '\n\n' + annotatedMoves;
    
    return annotatedPGN;
  }, [gamePgn, moveAnalysis, moves, gameResult, moveComments]);

  const generateFileName = useCallback((pgn: string): string => {
    // Extract player names from PGN headers
    const whiteMatch = pgn.match(/\[White "([^"]+)"\]/);
    const blackMatch = pgn.match(/\[Black "([^"]+)"\]/);
    
    const whiteName = whiteMatch?.[1] || 'Unknown';
    const blackName = blackMatch?.[1] || 'Unknown';
    
    // Generate a unique short string (timestamp-based)
    const now = new Date();
    const uniqueId = now.getTime().toString(36).slice(-6); // Last 6 chars of timestamp in base36
    
    // Clean names for filename (remove invalid characters)
    const cleanWhite = whiteName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    const cleanBlack = blackName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    
    return `${cleanWhite}_vs_${cleanBlack}_${uniqueId}.pgn`;
  }, []);

  const handleDownloadPGN = useCallback(() => {
    if (!gamePgn || !moveAnalysis) return;

    const annotatedPGN = generateAnnotatedPGN();
    const fileName = generateFileName(gamePgn);
    const blob = new Blob([annotatedPGN], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [generateAnnotatedPGN, generateFileName, gamePgn, moveAnalysis]);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newViewMode: ViewMode | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const renderPGNText = () => {
    const elements = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      // Move number
      elements.push(
        <Typography
          key={`num-${moveNumber}`}
          component="span"
          sx={{ 
            color: '#888',
            mr: 0.3,
            fontFamily: 'monospace',
            fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
            flexShrink: 0
          }}
        >
          {moveNumber}.
        </Typography>
      );
      
      // White move
      const whiteIndex = i;
      const whiteAnalysis = getMoveAnalysis(whiteIndex);
      const whiteStyle = whiteAnalysis ? getMoveClassificationStyle(whiteAnalysis.quality) : null;
      const isWhiteSelected = whiteIndex === currentMoveIndex - 1;
      const hasWhiteComment = getMoveComment(whiteIndex);
      const showWhiteClassification = whiteAnalysis && shouldShowClassification(whiteAnalysis.quality);
      
      elements.push(
        <Button
          key={`white-${whiteIndex}`}
          onClick={() => goToMove(whiteIndex + 1)}
          onContextMenu={(e) => handleContextMenu(e, whiteIndex)}
          variant="text"
          size="small"
          startIcon={showWhiteClassification ? whiteStyle?.icon : undefined}
          sx={{
            minWidth: 'auto',
            padding: '1px 3px',
            margin: '0 1px',
            textTransform: 'none',
            fontFamily: 'monospace',
            fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
            height: '20px',
            backgroundColor: isWhiteSelected ? '#555' : 'transparent',
            color: isWhiteSelected ? '#fff' : '#ccc',
            border: hasWhiteComment ? '1px solid #4FC3F7' : 'none',
            '&:hover': {
              backgroundColor: isWhiteSelected ? '#666' : '#333',
            },
            '& .MuiButton-startIcon': {
              marginRight: '2px',
              marginLeft: 0,
              color: whiteStyle?.color || 'inherit',
            },
          }}
        >
          {whiteMove}
        </Button>
      );
      
      // Black move (if exists)
      if (blackMove) {
        const blackIndex = i + 1;
        const blackAnalysis = getMoveAnalysis(blackIndex);
        const blackStyle = blackAnalysis ? getMoveClassificationStyle(blackAnalysis.quality) : null;
        const isBlackSelected = blackIndex === currentMoveIndex - 1;
        const hasBlackComment = getMoveComment(blackIndex);
        const showBlackClassification = blackAnalysis && shouldShowClassification(blackAnalysis.quality);
        
        elements.push(
          <Button
            key={`black-${blackIndex}`}
            onClick={() => goToMove(blackIndex + 1)}
            onContextMenu={(e) => handleContextMenu(e, blackIndex)}
            variant="text"
            size="small"
            startIcon={showBlackClassification ? blackStyle?.icon : undefined}
            sx={{
              minWidth: 'auto',
              padding: '1px 3px',
              margin: '0 1px',
              textTransform: 'none',
              fontFamily: 'monospace',
              fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
              height: '20px',
              backgroundColor: isBlackSelected ? '#555' : 'transparent',
              color: isBlackSelected ? '#fff' : '#ccc',
              border: hasBlackComment ? '1px solid #4FC3F7' : 'none',
              '&:hover': {
                backgroundColor: isBlackSelected ? '#666' : '#333',
              },
              '& .MuiButton-startIcon': {
                marginRight: '2px',
                marginLeft: 0,
                color: blackStyle?.color || 'inherit',
              },
            }}
          >
            {blackMove}
          </Button>
        );
      }
      
      elements.push(
        <Box key={`space-${moveNumber}`} component="span" sx={{ width: '4px', flexShrink: 0 }} />
      );
    }
    
    // Add game result at the end if present
    if (gameResult) {
      elements.push(
        <Typography
          key="game-result"
          component="span"
          sx={{ 
            color: '#FFD700',
            fontFamily: 'monospace',
            fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
            fontWeight: 'bold',
            ml: 1,
            px: 1,
            py: 0.5,
            backgroundColor: '#333',
            borderRadius: '3px',
            flexShrink: 0
          }}
        >
          {gameResult}
        </Typography>
      );
    }
    
    return elements;
  };

  const renderMoveList = () => {
    const elements = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      const whiteIndex = i;
      const blackIndex = i + 1;
      
      const whiteAnalysis = getMoveAnalysis(whiteIndex);
      const blackAnalysis = blackMove ? getMoveAnalysis(blackIndex) : null;
      
      const whiteStyle = whiteAnalysis ? getMoveClassificationStyle(whiteAnalysis.quality) : null;
      const blackStyle = blackAnalysis ? getMoveClassificationStyle(blackAnalysis.quality) : null;
      
      const isWhiteSelected = whiteIndex === currentMoveIndex - 1;
      const isBlackSelected = blackMove && blackIndex === currentMoveIndex - 1;
      
      const hasWhiteComment = getMoveComment(whiteIndex);
      const hasBlackComment = blackMove ? getMoveComment(blackIndex) : false;
      
      const showWhiteClassification = whiteAnalysis && shouldShowClassification(whiteAnalysis.quality);
      const showBlackClassification = blackAnalysis && shouldShowClassification(blackAnalysis.quality);
      
      elements.push(
        <Box
          key={`move-row-${moveNumber}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            minHeight: '28px',
            py: 0.5,
            borderBottom: '1px solid #333',
            '&:last-child': {
              borderBottom: 'none',
            },
            flexWrap: 'wrap', // Allow wrapping for smaller screens
          }}
        >
          {/* Move number */}
          <Typography
            sx={{
              color: '#888',
              fontFamily: 'monospace',
              fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
              width: '32px',
              textAlign: 'right',
              mr: 1,
              flexShrink: 0,
            }}
          >
            {moveNumber}.
          </Typography>
          
          {/* White move */}
          <Button
            onClick={() => goToMove(whiteIndex + 1)}
            onContextMenu={(e) => handleContextMenu(e, whiteIndex)}
            variant="text"
            size="small"
            startIcon={showWhiteClassification ? whiteStyle?.icon : undefined}
            sx={{
              minWidth: 'auto',
              width: { xs: '70px', sm: '80px' }, // Adjust width for mobile
              height: '24px',
              padding: '2px 6px',
              margin: '0 2px',
              textTransform: 'none',
              fontFamily: 'monospace',
              fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
              backgroundColor: isWhiteSelected ? '#555' : 'transparent',
              color: isWhiteSelected ? '#fff' : '#ccc',
              border: hasWhiteComment ? '1px solid #4FC3F7' : '1px solid transparent',
              justifyContent: 'flex-start',
              '&:hover': {
                backgroundColor: isWhiteSelected ? '#666' : '#333',
              },
              '& .MuiButton-startIcon': {
                marginRight: '4px',
                marginLeft: 0,
                color: whiteStyle?.color || 'inherit',
              },
            }}
          >
            {whiteMove}
          </Button>
          
          {/* Black move */}
          {blackMove ? (
            <Button
              onClick={() => goToMove(blackIndex + 1)}
              onContextMenu={(e) => handleContextMenu(e, blackIndex)}
              variant="text"
              size="small"
              startIcon={showBlackClassification ? blackStyle?.icon : undefined}
              sx={{
                minWidth: 'auto',
                width: { xs: '70px', sm: '80px' }, // Adjust width for mobile
                height: '24px',
                padding: '2px 6px',
                margin: '0 2px',
                textTransform: 'none',
                fontFamily: 'monospace',
                fontSize: { xs: '10px', sm: '12px' }, // Adjust font size for mobile
                backgroundColor: isBlackSelected ? '#555' : 'transparent',
                color: isBlackSelected ? '#fff' : '#ccc',
                border: hasBlackComment ? '1px solid #4FC3F7' : '1px solid transparent',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: isBlackSelected ? '#666' : '#333',
                },
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                  marginLeft: 0,
                  color: blackStyle?.color || 'inherit',
                },
              }}
            >
              {blackMove}
            </Button>
          ) : (
            <Box sx={{ width: { xs: '74px', sm: '84px' }, mr: '4px' }} />
          )}
          
          {/* Comments indicator */}
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            {hasWhiteComment && (
              <CommentIcon sx={{ fontSize: { xs: '10px', sm: '12px' }, color: '#4FC3F7' }} />
            )}
            {hasBlackComment && (
              <CommentIcon sx={{ fontSize: { xs: '10px', sm: '12px' }, color: '#4FC3F7' }} />
            )}
          </Box>
        </Box>
      );
    }
    
    // Add game result at the end if present
    if (gameResult) {
      elements.push(
        <Box
          key="game-result-row"
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 1,
            borderTop: '1px solid #444',
            mt: 1,
          }}
        >
          <Typography
            sx={{ 
              color: '#FFD700',
              fontFamily: 'monospace',
              fontSize: { xs: '12px', sm: '14px' }, // Adjust font size for mobile
              fontWeight: 'bold',
              px: 2,
              py: 0.5,
              backgroundColor: '#333',
              borderRadius: '4px',
            }}
          >
            {gameResult}
          </Typography>
        </Box>
      );
    }
    
    return elements;
  };

  const canDownload = moveAnalysis;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Header with controls */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* View mode toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: '#888',
              borderColor: '#555',
              '&.Mui-selected': {
                color: '#4FC3F7',
                backgroundColor: '#333',
                borderColor: '#4FC3F7',
              },
              '&:hover': {
                backgroundColor: '#333',
              },
            },
          }}
        >
          <ToggleButton value="pgn" aria-label="PGN view">
            <Tooltip title="PGN Format">
              <NotesIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="movelist" aria-label="Move list view">
            <Tooltip title="Move List">
              <ViewListIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Download button */}
        {canDownload && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPGN}
            sx={{
              color: '#ccc',
              borderColor: '#555',
              backgroundColor: '#2a2a2a',
              fontSize: '11px',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#777',
                backgroundColor: '#333',
              },
              '& .MuiButton-startIcon': {
                marginRight: '4px',
              },
            }}
          >
            Download Annotated PGN
          </Button>
        )}
      </Box>
      
      <Box 
        ref={containerRef}
        sx={{ 
          width: { xs: '100%', sm: `${dimensions.width}px` }, // Full width on mobile, fixed on desktop
          height: { xs: 'auto', sm: `${dimensions.height}px` }, // Auto height on mobile, fixed on desktop
          maxHeight: { xs: '300px', sm: `${dimensions.height}px` }, // Limit height on mobile
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: '#2a2a2a',
          borderRadius: 1,
          border: '1px solid #444',
          px: { xs: 0.5, sm: 1 }, // Adjust padding for mobile
          py: { xs: 0.5, sm: 0.5 },
          position: 'relative',
          userSelect: isResizing ? 'none' : 'auto',
          '&::-webkit-scrollbar': {
        width: '6px',
          },
          '&::-webkit-scrollbar-track': {
        background: '#1a1a1a',
        borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
        background: '#555',
        borderRadius: '3px',
        '&:hover': {
          background: '#666',
        },
          },
        }}
      >
        {moves.length > 0 ? (
          viewMode === 'pgn' ? (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.2,
                lineHeight: 1.2
              }}
            >
              {renderPGNText()}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {renderMoveList()}
            </Box>
          )
        ) : (
          <Typography variant="body2" sx={{ color: '#888', fontSize: '12px' }}>
            No moves to display
          </Typography>
        )}
        
        {/* Resize Handle */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            width: '16px',
            height: '16px',
            cursor: 'nw-resize',
            backgroundColor: '#555',
            borderTopRightRadius: '3px',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              opacity: 1,
              backgroundColor: '#666',
            },
          }}
        >
          <OpenInFullIcon 
            sx={{ 
              fontSize: '10px', 
              color: '#ccc',
              transform: 'rotate(180deg)'
            }} 
          />
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#333',
            color: '#ccc',
          },
        }}
      >
        <MenuItem onClick={() => contextMenu && handleOpenCommentDialog(contextMenu.moveIndex)}>
          <ListItemIcon>
            <CommentIcon fontSize="small" sx={{ color: '#ccc' }} />
          </ListItemIcon>
          <ListItemText>Comment & Annotate</ListItemText>
        </MenuItem>
      </Menu>

      {/* Comment Dialog */}
      <Dialog
        open={commentDialogOpen}
        onClose={handleCloseCommentDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2a2a2a',
            color: '#ccc',
          },
        }}
      >
        <DialogTitle>
          {selectedMoveIndex !== null && (
            <>
              Comment & Annotate Move: {moves[selectedMoveIndex]} 
              {getMoveAnalysis(selectedMoveIndex) && (
                <Typography variant="body2" component="span" sx={{ ml: 1, color: '#888' }}>
                  ({getMoveAnalysis(selectedMoveIndex)?.quality})
                </Typography>
              )}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Enter your comment or thoughts about this move..."
            disabled={isAnnotating}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#ccc',
                '& fieldset': {
                  borderColor: '#555',
                },
                '&:hover fieldset': {
                  borderColor: '#777',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#4FC3F7',
                },
                '&.Mui-disabled fieldset': {
                  borderColor: '#333',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#888',
                '&.Mui-focused': {
                  color: '#4FC3F7',
                },
                '&.Mui-disabled': {
                  color: '#666',
                },
              },
              '& .MuiOutlinedInput-input.Mui-disabled': {
                WebkitTextFillColor: '#999',
              },
            }}
          />
          {isAnnotating && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: '#4FC3F7' }}>
              <CircularProgress size={16} sx={{ mr: 1, color: '#4FC3F7' }} />
              <Typography variant="body2">
                Getting AI analysis...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseCommentDialog}
            disabled={isAnnotating}
            sx={{ color: '#888' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAnnotateWithAI}
            disabled={isAnnotating || selectedMoveIndex === null || !getMoveAnalysis(selectedMoveIndex)}
            startIcon={isAnnotating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            sx={{ color: '#4FC3F7' }}
          >
            {isAnnotating ? 'Analyzing...' : 'Add AI Analysis'}
          </Button>
          <Button
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || isAnnotating}
            sx={{ color: '#4FC3F7' }}
          >
            Save Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PGNView;