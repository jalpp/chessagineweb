import React from "react";
import {
    Paper,
    Typography,
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    Collapse,
    IconButton
} from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { ChessPawnIcon } from "lucide-react";

export interface ParsedPGN {
    hash: string;
    pgn: string;
    white: string;
    black: string;
    date: string;
    result: string;
    event: string;
}

interface MultiGameNavigatorProps {
    games: ParsedPGN[];
    currentGameHash?: string;
    onGameSelect: (game: ParsedPGN) => void;
}

const getResultColor = (result: string) => {
    if (result === "1-0") return "success";
    if (result === "0-1") return "error";
    if (result === "1/2-1/2") return "warning";
    return "default";
};

const MultiGameNavigator: React.FC<MultiGameNavigatorProps> = ({ 
    games, 
    currentGameHash,
    onGameSelect 
}) => {
    const [expanded, setExpanded] = React.useState(true);

    if (games.length <= 1) return null;

    return (
        <Paper
            elevation={3}
            sx={{
                width: "100%",
                maxWidth: { xs: "100%", lg: "600px" },
                overflow: "hidden"
            }}
        >
            <Box
                sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "action.hover",
                    cursor: "pointer"
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <ChessPawnIcon/>
                    <Typography variant="h6" fontSize="1rem">
                        Game Collection ({games.length} games)
                    </Typography>
                </Box>
                <IconButton size="small">
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            <Collapse in={expanded}>
                <List 
                    sx={{ 
                        width: '100%',
                        maxHeight: 400,
                        overflow: 'auto'
                    }}
                >
                    {games.map((game, index) => {
                        const isSelected = currentGameHash === game.hash;
                        
                        return (
                            <ListItem 
                                key={game.hash} 
                                disablePadding
                                sx={{
                                    borderBottom: index < games.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    bgcolor: isSelected ? 'action.selected' : 'transparent'
                                }}
                            >
                                <ListItemButton 
                                    onClick={() => onGameSelect(game)}
                                    selected={isSelected}
                                >
                                    <Box 
                                        display="flex" 
                                        alignItems="center" 
                                        width="100%"
                                        gap={2}
                                        py={0.5}
                                    >
                                        <ChessPawnIcon style={{fontSize: 20}}/>
                                        
                                        <ListItemText
                                            primary={
                                                <Typography 
                                                    variant="body2" 
                                                    fontWeight={isSelected ? "bold" : "medium"}
                                                >
                                                    {game.white} vs {game.black}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {game.date}
                                                </Typography>
                                            }
                                        />
                                        
                                        <Chip 
                                            label={game.result}
                                            color={getResultColor(game.result)}
                                            size="small"
                                        />
                                    </Box>
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Collapse>
        </Paper>
    );
};

export default MultiGameNavigator;