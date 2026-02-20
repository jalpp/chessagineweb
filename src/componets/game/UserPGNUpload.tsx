import React, { useState } from "react";
import {
    Button,
    Typography,
    Stack,
    Paper,
    Box,
    Alert,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Chip
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import { ChessPawnIcon } from "lucide-react";
import { ParsedPGN, hashPGN, splitPGNs, extractPGNInfo } from "@/libs/game/pgn";

interface PGNUploaderProps {
    loadPGN: (pgn: string) => void;
    setMultiGameList?: (games: ParsedPGN[]) => void;
}


const UserPGNUploader: React.FC<PGNUploaderProps> = ({ loadPGN, setMultiGameList }) => {
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [parsedGames, setParsedGames] = useState<ParsedPGN[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError("");
        setParsedGames([]);

        if (!file.name.endsWith(".pgn")) {
            setError("Please upload a valid .pgn file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content.trim()) {
                setError("The selected file appears to be empty");
                return;
            }

            try {
                const pgnStrings = splitPGNs(content);
                
                if (pgnStrings.length === 0) {
                    setError("No valid PGN games found in the file");
                    return;
                }

                const games: ParsedPGN[] = pgnStrings.map(pgnStr => {
                    const info = extractPGNInfo(pgnStr);
                    return {
                        hash: hashPGN(pgnStr),
                        pgn: pgnStr,
                        ...info
                    };
                });

                setFileName(file.name);
                setParsedGames(games);
                
                if (setMultiGameList) {
                    setMultiGameList(games);
                }

                if (games.length === 1) {
                    loadPGN(games[0].pgn);
                } else {
                    setDialogOpen(true);
                }
            } catch (err) {
                setError("Error parsing PGN file");
                console.error(err);
            }
        };
        
        reader.onerror = () => {
            setError("Error reading the file");
        };
        
        reader.readAsText(file);
    };

    const handleGameSelect = (game: ParsedPGN) => {
        loadPGN(game.pgn);
        setDialogOpen(false);
    };

    const getResultColor = (result: string) => {
        if (result === "1-0") return "success";
        if (result === "0-1") return "error";
        if (result === "1/2-1/2") return "warning";
        return "default";
    };

    return (
        <>
            <Paper
                elevation={3}
                sx={{
                    p: 3,
                }}
            >
                <Typography 
                    variant="h6" 
                    sx={{ 
                        mb: 2,
                        textAlign: "center"
                    }}
                >
                    Upload PGN File
                </Typography>
                
                <Typography 
                    variant="subtitle2" 
                    sx={{ 
                        mb: 3,
                        textAlign: "center"
                    }}
                >
                    Upload a PGN file with single PGN or bulk upload games
                </Typography>

                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 2 }}
                    >
                        {error}
                    </Alert>
                )}

                <Stack spacing={2} alignItems="center">
                    <Button
                        variant="contained"
                        component="label"
                        startIcon={<UploadFileIcon />}
                        sx={{
                            minWidth: 200,
                            py: 1.5,
                        }}
                    >
                        Choose PGN File
                        <input
                            type="file"
                            accept=".pgn"
                            hidden
                            onChange={handleFileChange}
                        />
                    </Button>

                    {fileName && (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                textAlign: "center",
                            }}
                        >
                            <Typography variant="body2">
                                Selected file:
                            </Typography>
                            <Typography 
                                variant="body1" 
                                sx={{ fontWeight: "medium" }}
                            >
                                {fileName}
                            </Typography>
                            {parsedGames.length > 1 && (
                                <Chip 
                                    label={`${parsedGames.length} games found`}
                                    color="primary"
                                    size="small"
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                    )}
                </Stack>
            </Paper>

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            Select a Game ({parsedGames.length} games)
                        </Typography>
                        <IconButton onClick={() => setDialogOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    <List sx={{ width: '100%' }}>
                        {parsedGames.map((game, index) => (
                            <ListItem 
                                key={game.hash} 
                                disablePadding
                                sx={{
                                    borderBottom: index < parsedGames.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider'
                                }}
                            >
                                <ListItemButton onClick={() => handleGameSelect(game)}>
                                    <Box 
                                        display="flex" 
                                        alignItems="center" 
                                        width="100%"
                                        gap={2}
                                        py={1}
                                    >
                                        <ChessPawnIcon/>
                                        
                                        <ListItemText
                                            primary={
                                                <Typography variant="body1" fontWeight="medium">
                                                    {game.white} ({game.white.match(/\((\d+)\)/)?.[1] || '?'}) vs {game.black} ({game.black.match(/\((\d+)\)/)?.[1] || '?'})
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    Played on {game.date}
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
                        ))}
                    </List>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserPGNUploader;