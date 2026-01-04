"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Stack,
  Drawer,
  Fab,
  useMediaQuery,
  useTheme,
  Typography,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  TextField,
  CircularProgress,
} from "@mui/material";
import {
  SmartToy as BotIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  RestartAlt as RestartIcon,
  Chat as ChatIcon,
  CloudDownload,
  Flag as ResignIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import ChatTab from "@/componets/tabs/ChatTab";
import useAgine from "@/hooks/useAgine";
import { TabPanel } from "@/componets/tabs/tab";
import { useNetStatus, useNetModels } from "@/context/NetContext";
import { MODEL_CONFIGS } from "@/libs/nets/types";
import PGNView from "@/componets/tabs/PgnView";
import SaveGameReviewDialog, { SavedGameReview } from "@/componets/game/SaveGameReviewDialog";
import { SaveIcon } from "lucide-react";
import {
  BotType,
  BOT_CONFIGS,
  MaiaRating,
  TIME_CONTROLS,
  TimeControl,
} from "@/libs/agine/bothelper";
import { TimerDisplay } from "@/componets/game/TimerDisplay";
import { FenSelector } from "@/componets/game/FenSelector";


export default function PlayVsBotsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [selectedBot, setSelectedBot] = useState<BotType>("maia2");
  const [maiaRating, setMaiaRating] = useState<MaiaRating>(1500);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [gameStatus, setGameStatus] = useState<
    "setup" | "playing" | "finished"
  >("setup");
  const [result, setResult] = useState<string>("");
  const [botThinking, setBotThinking] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [controlDrawerOpen, setControlDrawerOpen] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [startingFen, setStartingFen] = useState<string>(new Chess().fen());

  const [timeControl, setTimeControl] = useState<TimeControl>("10+0");
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customIncrement, setCustomIncrement] = useState<number>(0);
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const [activeTimer, setActiveTimer] = useState<"white" | "black" | null>(
    null
  );

  const { status, progress } = useNetStatus();
  const { downloadModel } = useNetModels();
  

  const gameStatusRef = useRef(gameStatus);
  const playerColorRef = useRef(playerColor);

  const getActiveTimeControl = () => {
    if (timeControl === "custom") {
      return {
        minutes: customMinutes,
        increment: customIncrement,
        label: `${customMinutes}+${customIncrement}`,
      };
    }
    return TIME_CONTROLS[timeControl];
  };

  useEffect(() => {
    gameStatusRef.current = gameStatus;
    playerColorRef.current = playerColor;
  }, [gameStatus, playerColor]);

  const {
    moveSquares,
    setMoveSquares,
    engine,
    sendChatMessage,
    handleChatKeyPress,
    abortChatMessage,
    setLlmAnalysisResult,
    setOpeningData,
    setStockfishAnalysisResult,
    fetchOpeningData,
    analyzeWithStockfish,
    llmLoading,
    stockfishLoading,
    stockfishAnalysisResult,
    openingLoading,
    evaluations,
    sanEvaluations,
    isNetLoading,
    evaluationsFen,
    stockfishDone,
    stockfishFen,
  } = useAgine(fen);

  useEffect(() => {
    if (gameStatus !== "playing" || !activeTimer) return;

    const interval = setInterval(() => {
      if (activeTimer === "white") {
        setWhiteTime((t) => {
          if (t <= 1) {
            handleTimerExpire("white");
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            handleTimerExpire("black");
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer, gameStatus]);

  useEffect(() => {
    if (gameStatus !== "playing") return;

    const turn = game.turn();
    setActiveTimer(turn === "w" ? "white" : "black");
  }, [fen]);

  useEffect(() => {
    if (gameStatus !== "playing" || timeControl !== "custom" || getActiveTimeControl().increment === 0) return;
    const movedColor = getColorThatJustMoved(game);
    applyIncrement(movedColor);
  }, [fen]);

  useEffect(() => {
    if (gameStatus !== "playing") return;
    checkGameEnd(game);
  }, [fen]);

  // Bot move trigger
  useEffect(() => {
    if (gameStatus !== "playing" || botThinking || game.isGameOver()) return;

    const currentTurn = game.turn();
    const isBotTurn =
      (playerColor === "white" && currentTurn === "b") ||
      (playerColor === "black" && currentTurn === "w");

    if (!isBotTurn) return;

    if (selectedBot === "stockfish") {
      if (!stockfishDone || stockfishFen !== fen) {
        return;
      }
    } else {
      if (evaluationsFen !== fen) return;
    }

    const id = setTimeout(makeBotMove, 200);
    return () => clearTimeout(id);
  }, [
    fen,
    evaluationsFen,
    stockfishFen,
    stockfishDone,
    gameStatus,
    botThinking,
    playerColor,
  ]);

  const handleTimerExpire = (color: "white" | "black") => {
    if (gameStatusRef.current === "playing") {
      const winner = color === "white" ? "Black" : "White";
      setGameStatus("finished");
      setResult(`Time out! ${winner} wins!`);
    }
  };

  const initializeTimers = () => {
    const tc = getActiveTimeControl();
    const baseSeconds = tc.minutes * 60;

    setWhiteTime(baseSeconds);
    setBlackTime(baseSeconds);
    setActiveTimer("white");
  };

  const applyIncrement = (color: "white" | "black") => {
    const inc = getActiveTimeControl().increment;
    if (!inc) return;

    if (color === "white") {
      setWhiteTime((t) => t + inc);
    } else {
      setBlackTime((t) => t + inc);
    }
  };

  const getColorThatJustMoved = (g: Chess): "white" | "black" =>
  g.turn() === "w" ? "black" : "white";


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentMoveIndex > 0) {
        goToMove(currentMoveIndex - 1);
      }
      if (e.key === "ArrowRight" && currentMoveIndex < game.history().length) {
        goToMove(currentMoveIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIndex, game.history()]);

  const goToMove = (index: number) => {
    const tempGame = new Chess();
    tempGame.loadPgn(game.pgn());
    const moves = game.history();

    // Reset to starting position and replay moves up to index
    const resetGame = new Chess();
    for (let i = 0; i < index; i++) {
      resetGame.move(moves[i]);
    }

    setFen(resetGame.fen());
    setCurrentMoveIndex(index);
    setLlmAnalysisResult(null);
    setStockfishAnalysisResult(null);
  };

  const buildPlayGameInfo = (): Record<string, string> => {
    const info: Record<string, string> = {
      White: playerColor === "white" ? "You" : BOT_CONFIGS[selectedBot].name,
      Black: playerColor === "black" ? "You" : BOT_CONFIGS[selectedBot].name,
      Result: result || "*",
      Date: new Date().toISOString().split("T")[0],
      Event: "Play vs Bot",
      Site: "https://www.chessagine.com/",
      TimeControl: getActiveTimeControl().label,
    };

    if (startingFen && startingFen !== new Chess().fen()) {
      info.SetUp = "1";
      info.FEN = startingFen;
    }

    return info;
  };

  const startGame = () => {
    const newGame = new Chess();

    if (startingFen) {
      newGame.load(startingFen);
    }

    setGame(newGame);
    setFen(newGame.fen());
    setGameStatus("playing");
    setResult("");
    setMoveSquares({});
    setBotThinking(false);
    initializeTimers();
  };

  const resetToSetup = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameStatus("setup");
    setResult("");
    setMoveSquares({});
    setBotThinking(false);
    setActiveTimer(null);
  };

  const resignGame = () => {
    if (gameStatus !== "playing") return;

    const winner = playerColor === "white" ? "Black" : "White";
    setGameStatus("finished");
    setResult(
      `${
        playerColor.charAt(0).toUpperCase() + playerColor.slice(1)
      } resigned. ${winner} wins!`
    );
  };

  const calculateBotThinkTime = (): number => {
    const moveNumber = game.history().length;
    const botTimeRemaining = playerColor === "white" ? blackTime : whiteTime;
    const baseGameSeconds = getActiveTimeControl().minutes * 60;

    const inPanicMode =
      botTimeRemaining <= 20 || botTimeRemaining <= baseGameSeconds * 0.08;

    if (inPanicMode) {
      return 0.4 + Math.random() * 0.8;
    }

    const estimatedMovesLeft = Math.max(40 - moveNumber, 20);
    const avgTimePerMove = botTimeRemaining / estimatedMovesLeft;

    let baseTime = 0;

    if (moveNumber < 8) {
      baseTime = 0.5 + Math.random() * 1.0;
    } else if (moveNumber < 15) {
      // Early middlegame: slightly more thought
      baseTime = 1.0 + Math.random() * 1.5;
    } else if (moveNumber < 30) {
      // Middlegame: variable thinking
      baseTime = 1.2 + Math.random() * 2.3;
    } else {
      // Endgame: careful calculation
      baseTime = 1.5 + Math.random() * 2.0;
    }

    // --- OCCASIONAL DEEP THINK (10% chance) ---
    if (Math.random() < 0.1) {
      baseTime *= 1.8; // Think 80% longer
    }

    // --- CAPS based on time control ---
    let minThink = 0.3;
    let maxThink = 0;

    switch (timeControl) {
      case "5+0":
        maxThink = Math.min(8, avgTimePerMove * 2.5); // Max ~8s or 2.5x avg
        break;
      case "10+0":
        maxThink = Math.min(12, avgTimePerMove * 2.5); // Max ~12s or 2.5x avg
        break;
      case "30+0":
        maxThink = Math.min(20, avgTimePerMove * 3); // Max ~20s or 3x avg
        break;
    
    }

    // --- FINAL CLAMP ---
    const thinkTime = Math.max(minThink, Math.min(maxThink, baseTime));

    return Math.round(thinkTime * 10) / 10;
  };

  const makeBotMove = async () => {
    if (isNetLoading && selectedBot !== "stockfish") {
      return;
    }

    if (evaluationsFen !== game.fen() && selectedBot !== "stockfish") {
      return;
    }

    if (selectedBot === "stockfish") {
      if (stockfishLoading || !stockfishDone || stockfishFen !== game.fen()) {
        return;
      }
    }

    if (botThinking || game.isGameOver()) {
      return;
    }

    setBotThinking(true);

    try {
      const moves = game.moves();
      if (moves.length === 0) {
        setBotThinking(false);
        return;
      }

      let move: string | undefined;

      if (selectedBot === "stockfish") {
        const pvMove = stockfishAnalysisResult?.lines?.[0]?.pv?.[0];
        if (pvMove) move = pvMove;
      } else if (selectedBot === "maia2") {
        const maiaKey = `maia_kdd_${maiaRating}`;
        const maiaEval = sanEvaluations.maia2?.[maiaKey];
        if (maiaEval?.policy) {
          const sorted = Object.entries(maiaEval.policy).sort(
            ([, a], [, b]) => b - a
          );
          if (sorted[0]) move = sorted[0][0];
        }
      } else if (selectedBot === "bigLeela") {
        const leelaEval = sanEvaluations.bigLeela;
        if (leelaEval?.policy) {
          const sorted = Object.entries(leelaEval.policy).sort(
            ([, a], [, b]) => b - a
          );
          if (sorted[0]) move = sorted[0][0];
        }
      } else if (selectedBot === "elitemaia") {
        const eliteEval = sanEvaluations.elitemaia;
        if (eliteEval?.policy) {
          const sorted = Object.entries(eliteEval.policy).sort(
            ([, a], [, b]) => b - a
          );
          if (sorted[0]) move = sorted[0][0];
        }
      }

      if (!move) {
        move = moves[Math.floor(Math.random() * moves.length)];
      }

      const thinkTime = calculateBotThinkTime();
      const thinkTimeMs = thinkTime * 1000;

      await new Promise((resolve) => setTimeout(resolve, thinkTimeMs));

      const newGame = new Chess(game.fen());
      newGame.loadPgn(game.pgn());
      const moveResult = newGame.move(move);

      if (moveResult) {
        setGame(newGame);
        setFen(newGame.fen());
        checkGameEnd(newGame);
      
      }
    } catch (error) {
      console.error("[BOT] makeBotMove error:", error);
    } finally {
      setBotThinking(false);
    }
  };

  const checkGameEnd = (currentGame: Chess): boolean => {
    if (currentGame.isGameOver()) {
      setGameStatus("finished");

      if (currentGame.isCheckmate()) {
        const winner = currentGame.turn() === "w" ? "Black" : "White";
        setResult(`Checkmate! ${winner} wins!`);
      } else if (currentGame.isDraw()) {
        setResult("Draw!");
      } else if (currentGame.isStalemate()) {
        setResult("Stalemate - Draw!");
      } else if (currentGame.isThreefoldRepetition()) {
        setResult("Draw by threefold repetition!");
      } else if (currentGame.isInsufficientMaterial()) {
        setResult("Draw by insufficient material!");
      } else {
        setResult("Game Over!");
      }

      return true;
    }
    return false;
  };

  const getPgn = () => {
    // Start from correct initial position
    const pgnGame =
      startingFen && startingFen !== new Chess().fen()
        ? new Chess(startingFen)
        : new Chess();

    // Replay moves
    game.history().forEach((move) => {
      pgnGame.move(move);
    });

    // Apply headers from shared builder
    const headers = buildPlayGameInfo();
    Object.entries(headers).forEach(([key, value]) => {
      pgnGame.setHeader(key, value);
    });

    const pgn = pgnGame.pgn({ newline: "\n" });

    return pgn;
  };

  const downloadPGN = () => {
    const pgn = getPgn();

    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `game-vs-${selectedBot}-${new Date()}.pgn`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ControlPanel = () => {
    const botConfig = BOT_CONFIGS[selectedBot];
    const requiresModel = botConfig.requiresModel;
    const modelType = botConfig.modelType;
    const isModelReady = modelType ? status[modelType] === "ready" : true;
    const isModelDownloading = modelType
      ? status[modelType] === "downloading"
      : false;
    const modelProgress = modelType ? progress[modelType] || 0 : 0;

    const showConfigMenus = gameStatus === "setup" || gameStatus === "finished";

    // Show loading state if model is downloading
    if (isModelDownloading) {
      return (
        <Stack spacing={3} sx={{ pb: 2 }}>
          <Card>
            <CardContent>
              <Stack spacing={3} alignItems="center" py={4}>
                <CircularProgress size={60} />
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Downloading {MODEL_CONFIGS[modelType!].name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please wait while the model is being downloaded...
                  </Typography>
                </Box>
                <Box sx={{ width: "100%" }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {Math.round(modelProgress)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={modelProgress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      );
    }

 

    return (
      <Stack spacing={3} sx={{ pb: 2 }}>
        {/* Show Config Menus only in setup or finished states */}
        {showConfigMenus && (
          <>
            {/* Bot Selection */}
            <Box>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Challenge a Bot
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Bot</InputLabel>
                <Select
                  value={selectedBot}
                  label="Select Bot"
                  onChange={(e) => setSelectedBot(e.target.value as BotType)}
                >
                  {Object.entries(BOT_CONFIGS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BotIcon sx={{ color: config.color }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {config.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {config.strength}
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 2 }}>
                <Chip
                  label={BOT_CONFIGS[selectedBot].description}
                  size="small"
                  sx={{
                    backgroundColor: BOT_CONFIGS[selectedBot].color + "20",
                    color: BOT_CONFIGS[selectedBot].color,
                  }}
                />
              </Box>
            </Box>

            {/* Time Control Selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Time Control
              </Typography>

              <Stack direction="row" spacing={1} mb={1}>
              {(Object.keys(TIME_CONTROLS) as TimeControl[]).map((tc) => (
                <Button
                key={tc}
                variant={timeControl === tc ? "contained" : "outlined"}
                onClick={() => setTimeControl(tc)}
                fullWidth
                >
                {TIME_CONTROLS[tc].label}
                </Button>
              ))}
              </Stack>

              {timeControl === "custom" && (
              <Stack direction="row" spacing={2}>
                <TextField
                label="Minutes"
                type="number"
                slotProps={{ htmlInput: { min: 1, max: 180 } }}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(+e.target.value)}
                fullWidth
                />
                <TextField
                label="Increment (sec)"
                type="number"
                slotProps={{ htmlInput: { min: 0, max: 60 } }}
                value={customIncrement}
                onChange={(e) => setCustomIncrement(+e.target.value)}
                fullWidth
                />
              </Stack>
              )}
            </Box>

            {/* Maia2 Rating Selection */}
            {selectedBot === "maia2" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Maia Rating Level
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Rating</InputLabel>
                  <Select
                    value={maiaRating}
                    label="Rating"
                    onChange={(e) =>
                      setMaiaRating(e.target.value as MaiaRating)
                    }
                  >
                    {[1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900].map(
                      (rating) => (
                        <MenuItem key={rating} value={rating}>
                          Maia {rating}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Color Selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Your Color
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={playerColor === "white" ? "contained" : "outlined"}
                  onClick={() => setPlayerColor("white")}
                  fullWidth
                >
                  White
                </Button>
                <Button
                  variant={playerColor === "black" ? "contained" : "outlined"}
                  onClick={() => setPlayerColor("black")}
                  fullWidth
                >
                  Black
                </Button>
              </Stack>
            </Box>
            <Box>
              <FenSelector
                value={startingFen}
                onChange={setStartingFen}
                disabled={gameStatus !== "setup"}
              />
            </Box>
          </>
        )}

        {/* Model Download Section */}
        {requiresModel && !isModelReady && gameStatus === "setup" && (
          <Card>
            <CardContent>
              <Stack spacing={2} alignItems="center">
                <CloudDownload sx={{ fontSize: 40 }} />
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  textAlign="center"
                >
                  {MODEL_CONFIGS[modelType!].name} Not Downloaded
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  {MODEL_CONFIGS[modelType!].description}
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadModel(modelType!)}
                  fullWidth
                >
                  Download Model ({MODEL_CONFIGS[modelType!].size})
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Game Controls */}
        <Box>
          {gameStatus === "setup" && (
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={startGame}
              startIcon={<BotIcon />}
              disabled={requiresModel && !isModelReady}
            >
              {requiresModel && !isModelReady
                ? "Download Model First"
                : "Start Game"}
            </Button>
          )}

          {gameStatus === "playing" && (
            <Stack spacing={1}>
              <Button
                variant="contained"
                color="error"
                fullWidth
                onClick={resignGame}
                startIcon={<ResignIcon />}
                sx={{ mb: 1 }}
              >
                Resign
              </Button>

              {botThinking && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  {BOT_CONFIGS[selectedBot].name} is thinking...
                </Alert>
              )}

              <Button
                variant="outlined"
                fullWidth
                onClick={resetToSetup}
                startIcon={<RestartIcon />}
              >
                New Game (Change Settings)
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={startGame}
                startIcon={<RestartIcon />}
              >
                Restart (Same Settings)
              </Button>
            </Stack>
          )}

          {gameStatus === "finished" && (
            <Stack spacing={1}>
              <Alert severity="success">{result}</Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={downloadPGN}
                startIcon={<DownloadIcon />}
              >
                Download PGN
              </Button>
              <Button
                variant="contained"
                onClick={() => setSaveDialogOpen(true)}
                startIcon={<SaveIcon />}
                fullWidth
              >
                Save Game & View
              </Button>
              <SaveGameReviewDialog
                saveDialogOpen={saveDialogOpen}
                setSaveDialogOpen={setSaveDialogOpen}
                gameInfo={buildPlayGameInfo()}
                gameReview={[]}
                gameReviewTheme={null}
                isBotGame={true}
                moves={game.history()}
                pgnText={getPgn()}
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={resetToSetup}
                startIcon={<RestartIcon />}
              >
                New Game (Change Settings)
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={startGame}
                startIcon={<RestartIcon />}
              >
                Rematch (Same Settings)
              </Button>
            </Stack>
          )}
        </Box>

        {gameStatus !== "setup" && (
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Game Info
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                White:{" "}
                {playerColor === "white"
                  ? "You"
                  : BOT_CONFIGS[selectedBot].name}
                {selectedBot === "maia2" &&
                  playerColor === "black" &&
                  ` (${maiaRating})`}
              </Typography>
              <Typography variant="body2">
                Black:{" "}
                {playerColor === "black"
                  ? "You"
                  : BOT_CONFIGS[selectedBot].name}
                {selectedBot === "maia2" &&
                  playerColor === "white" &&
                  ` (${maiaRating})`}
              </Typography>
              <Typography variant="body2">
                Time Control: {timeControl}
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Game Moves - Show when game has moves */}
        {game.history().length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Game Moves
            </Typography>
            <PGNView
              moves={game.history()}
              moveAnalysis={null}
              goToMove={goToMove}
              currentMoveIndex={currentMoveIndex}
              gamePgn={game.pgn()}
              gameResult={result}
            />
          </Box>
        )}
      </Stack>
    );
  };

  const InteractionPanel = () => (
    <Card
      sx={{
        borderRadius: { xs: 2, md: 3 },
        boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
        height: { xs: "auto", md: "calc(100vh - 120px)" },
        maxHeight: { xs: "none", md: "calc(100vh - 120px)" },
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Controls" />
          {gameStatus !== "playing" && <Tab label="Chat" />}
        </Tabs>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3, overflowY: "auto", height: "100%" }}>
            <ControlPanel />
          </Box>
        </TabPanel>

        {gameStatus !== "playing" && (
          <TabPanel value={activeTab} index={1}>
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <ChatTab
                playMode={true}
                sendChatMessage={sendChatMessage}
                handleChatKeyPress={handleChatKeyPress}
                abortChatMessage={abortChatMessage}
                gameInfo={game.pgn()}
                currentMove={game.history().slice(-1)[0]}
                currentMoveIndex={game.history().length}
              />
            </Box>
          </TabPanel>
        )}
      </Box>
    </Card>
  );



  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 4 },
        minHeight: "100vh",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 2, sm: 3, md: 4 }}
        sx={{ width: "100%", maxWidth: "100%" }}
      >
        <Box
          sx={{
            flex: { xs: "1 1 auto", lg: "0 0 auto" },
            width: { xs: "100%", lg: "auto" },
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "center", lg: "flex-start" },
            px: { xs: 0, sm: 1 },
          }}
        >
          <AiChessboardPanel
            game={game}
            fen={fen}
            moveSquares={moveSquares}
            setMoveSquares={setMoveSquares}
            engine={engine}
            setFen={setFen}
            side={playerColor}
            setGame={setGame}
            setLlmAnalysisResult={setLlmAnalysisResult}
            setOpeningData={setOpeningData}
            evaluations={evaluations}
            setStockfishAnalysisResult={setStockfishAnalysisResult}
            fetchOpeningData={fetchOpeningData}
            analyzeWithStockfish={analyzeWithStockfish}
            llmLoading={llmLoading}
            stockfishLoading={stockfishLoading}
            stockfishAnalysisResult={stockfishAnalysisResult}
            openingLoading={openingLoading}
            playMode={gameStatus === "playing"}
          />

          {/* Timer Display below chessboard */}
          {gameStatus !== "setup" && (
            <Box
              sx={{
                mt: 2,
                width: { xs: "100%", sm: "600px", md: "650px" },
                maxWidth: "100%",
              }}
            >
              <TimerDisplay
                whiteTime={whiteTime}
                blackTime={blackTime}
                selectedBot={selectedBot}
                activeTimer={activeTimer}
                playerColor={playerColor}
              />
            </Box>
          )}
        </Box>

        {/* Desktop Interaction Panel */}
        {!isMobile && (
          <Box
            sx={{
              flex: 1,
              width: { xs: "100%", lg: "auto" },
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <InteractionPanel />
          </Box>
        )}

        {/* Mobile Floating Action Button */}
        {isMobile && (
          <Fab
            color="primary"
            aria-label="controls"
            onClick={() => setControlDrawerOpen(true)}
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
          >
            <ChatIcon />
          </Fab>
        )}

        {/* Mobile Drawer */}
        <Drawer
          anchor="bottom"
          open={controlDrawerOpen}
          onClose={() => setControlDrawerOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              height: "85vh",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              overflow: "hidden",
            },
          }}
        >
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Drawer Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Play vs Bot
              </Typography>
              <Button
                onClick={() => setControlDrawerOpen(false)}
                startIcon={<CloseIcon />}
                size="small"
              >
                Close
              </Button>
            </Box>

            {/* Drawer Content */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
              }}
            >
              <InteractionPanel />
            </Box>
          </Box>
        </Drawer>
      </Stack>
    </Box>
  );
}
