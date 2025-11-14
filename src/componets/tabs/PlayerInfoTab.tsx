
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Chip
} from '@mui/material';
import { BoardOrientation } from 'react-chessboard/dist/chessboard/types';

interface PlayerInfoType {
    gameInfo: Record<string, string> | undefined;
    boardOrientation: BoardOrientation | undefined;
}

const PlayerInfoBar = ({ gameInfo, boardOrientation }: PlayerInfoType) => {
  const getPlayerInfo = (color: string) => {
    const name = gameInfo?.[color] || 'Unknown Player';
    const rating = gameInfo?.[`${color}Elo`] || '----';
    const title = gameInfo?.[`${color}Title`] || undefined;
    return { name, rating, title };
  };

  const getResultInfo = (color: 'white' | 'black') => {
    const result = gameInfo?.Result;
    if (!result) return { text: '', color: 'default' as const };

    if (result === '1/2-1/2') {
      return { text: '½', color: '#ff9800' }; // Yellow for draw
    } else if (
      (result === '1-0' && color === 'white') || 
      (result === '0-1' && color === 'black')
    ) {
      return { text: '1', color: '#4caf50' }; // Green for win
    } else if (
      (result === '1-0' && color === 'black') || 
      (result === '0-1' && color === 'white')
    ) {
      return { text: '0', color: '#f44336' }; // Red for loss
    }

    return { text: '', color: 'default' as const };
  };

  const whiteInfo = getPlayerInfo('White');
  const blackInfo = getPlayerInfo('Black');

  // Determine which player should be displayed on top based on board orientation
  const topPlayer = boardOrientation === 'white' ? blackInfo : whiteInfo;
  const bottomPlayer = boardOrientation === 'white' ? whiteInfo : blackInfo;
  const topPlayerColor = boardOrientation === 'white' ? 'black' : 'white';
  const bottomPlayerColor = boardOrientation === 'white' ? 'white' : 'black';

  interface PlayerBarProps {
    playerInfo: { name: string; rating: string, title: string | undefined};
    color: 'white' | 'black';
    isTop?: boolean;
  }

  const PlayerBar = ({ playerInfo, color, isTop = false }: PlayerBarProps) => {
    const resultInfo = getResultInfo(color);
   
    
    return (
      <Box
        sx={{
          width: '100%',
     
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: isTop ? '8px 8px 0 0' : '0 0 8px 8px',
          minHeight: '50px'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* Result display */}
          {resultInfo.text && (
            <Chip
              label={resultInfo.text}
              size="small"
              sx={{
                backgroundColor: resultInfo.color,
                fontWeight: 'bold',
                fontSize: '12px',
                minWidth: '50px'
              }}
            />
          )}

          {/* Player avatar/indicator */}
          <Avatar
            sx={{
              width: 32,
              height: 32,
              
              border: `2px solid ${color === 'white' ? '#aeacacff' : '#666'}`,
              fontSize: '14px',
              fontWeight: 'bold',
            
            }}
          >
          </Avatar>
         
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: '16px',
                lineHeight: 1.2
              }}
            >
              {playerInfo.title && (
                <span style={{ color: '#ff9800', marginRight: '4px' }}>
                  {playerInfo.title}
                </span>
              )}
              {playerInfo.name} {playerInfo.rating}
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  };

  return {
    TopPlayerBar: () => (
      <PlayerBar
        playerInfo={topPlayer}
        color={topPlayerColor}
        isTop={true}
      />
    ),
    BottomPlayerBar: () => (
      <PlayerBar
        playerInfo={bottomPlayer}
        color={bottomPlayerColor}
        isTop={false}
      />
    )
  };
};

export default PlayerInfoBar;