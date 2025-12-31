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
} from "@mui/material";
import {
  SmartToy as BotIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  RestartAlt as RestartIcon,
  Chat as ChatIcon,
  CloudDownload,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import ChatTab from "@/componets/tabs/ChatTab";
import useAgine from "@/hooks/useAgine";
import { TabPanel } from "@/componets/tabs/tab";
import { useNetStatus, useNetModels } from "@/context/NetContext";
import { MODEL_CONFIGS } from "@/libs/nets/types";
import PGNView from "@/componets/tabs/PgnView";

type BotType = "stockfish" | "bigLeela" | "maia2" | "elitemaia";
type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;

interface BotConfig {
  name: string;
  description: string;
  strength: string;
  color: string;
  requiresModel?: boolean;
  modelType?: "maia2" | "bigLeela" | "elitemaia";
}

const BOT_CONFIGS: Record<BotType, BotConfig> = {
  stockfish: {
    name: "Stockfish 17",
    description: "Classical engine - strongest tactical play",
    strength: "~3500 ELO",
    color: "#1976d2",
  },
  bigLeela: {
    name: "Leela Chess Zero",
    description: "Neural network - strategic positional play",
    strength: "~3400 ELO",
    color: "#9c27b0",
    requiresModel: true,
    modelType: "bigLeela",
  },
  maia2: {
    name: "Maia2",
    description: "Human-like play at selected rating level",
    strength: "1100-1900 ELO",
    color: "#2e7d32",
    requiresModel: true,
    modelType: "maia2",
  },
  elitemaia: {
    name: "Elite Leela",
    description: "Enhanced Leela trained on master games",
    strength: "~3450 ELO",
    color: "#d32f2f",
    requiresModel: true,
    modelType: "elitemaia",
  },
};

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

  // Drawer states
  const [controlDrawerOpen, setControlDrawerOpen] = useState(false);

  // Use net status and models
  const { status, progress } = useNetStatus();
  const { downloadModel } = useNetModels();

  // Use ref to track game status to avoid stale closures
  const gameStatusRef = useRef(gameStatus);
  const playerColorRef = useRef(playerColor);

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
    if (gameStatus !== "playing" || botThinking || game.isGameOver()) return;

    const currentTurn = game.turn();
    const isBotTurn =
      (playerColor === "white" && currentTurn === "b") ||
      (playerColor === "black" && currentTurn === "w");

    if (!isBotTurn) return;

    if (selectedBot === "stockfish") {
      if (!stockfishDone || stockfishFen !== fen) {
        console.log("[BOT] Waiting for Stockfish to finish");
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

  // Start new game
  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameStatus("playing");
    setResult("");
    setMoveSquares({});
    setBotThinking(false);
  };

  // Reset to setup (for new game with different settings)
  const resetToSetup = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameStatus("setup");
    setResult("");
    setMoveSquares({});
    setBotThinking(false);
  };
   
  // Make bot move using evaluations
  const makeBotMove = async () => {
    console.groupCollapsed("[BOT] makeBotMove()");
    console.log("Selected bot:", selectedBot);
    console.log("Bot thinking:", botThinking);
    console.log("Game over:", game.isGameOver());
    console.log("Current FEN:", game.fen());

    if (isNetLoading && selectedBot !== "stockfish") {
      console.log("[BOT] Waiting for nets to finish");
      return;
    }

    if (evaluationsFen !== game.fen() && selectedBot !== "stockfish") {
      console.log("[BOT] Nets out of sync with FEN");
      console.log("Expected:", game.fen());
      console.log("Got:", evaluationsFen);
      return;
    }

    if (selectedBot === "stockfish") {
      if (stockfishLoading) {
        console.log("[BOT] Stockfish still thinking");
        return;
      }

      if (!stockfishDone) {
        console.log("[BOT] Stockfish not finished yet");
        return;
      }

      if (stockfishFen !== game.fen()) {
        console.log("[BOT] Stockfish out of sync with FEN");
        console.log("Expected:", game.fen());
        console.log("Got:", stockfishFen);
        return;
      }
    }

    if (botThinking || game.isGameOver()) {
      console.warn("[BOT] Early exit: botThinking or game over");
      console.groupEnd();
      return;
    }

    setBotThinking(true);
    console.log("[BOT] Bot thinking set to TRUE");

    try {
      const moves = game.moves();
      console.log("[BOT] Legal moves:", moves);

      if (moves.length === 0) {
        console.warn("[BOT] No legal moves available");
        setBotThinking(false);
        console.groupEnd();
        return;
      }

      let move: string | undefined;

      try {
        console.group("[BOT] Evaluation selection");

        if (selectedBot === "stockfish") {
          console.log("[BOT] Using Stockfish");
          console.log("Stockfish analysis:", stockfishAnalysisResult);

          const pvMove = stockfishAnalysisResult?.lines?.[0]?.pv?.[0];
          if (pvMove) {
            move = pvMove;
            console.log("[BOT] Stockfish selected move:", move);
          } else {
            console.warn("[BOT] Stockfish PV missing");
          }
        } else if (selectedBot === "maia2") {
          console.log("[BOT] Using Maia2");
          const maiaKey = `maia_kdd_${maiaRating}`;

          const maiaEval = sanEvaluations.maia2?.[maiaKey];

          console.log("Maia key:", maiaKey);
          console.log("Maia eval:", maiaEval);

          if (maiaEval?.policy) {
            const sorted = Object.entries(maiaEval.policy).sort(
              ([, a], [, b]) => b - a
            );

            console.log(
              "[BOT] Maia sorted policy (top 5):",
              sorted.slice(0, 5)
            );

            if (sorted[0]) {
              move = sorted[0][0];
              console.log("[BOT] Maia selected move:", move);
            }
          } else {
            console.warn("[BOT] Maia policy missing");
          }
        } else if (selectedBot === "bigLeela") {
          console.log("[BOT] Using Big Leela");
          const leelaEval = sanEvaluations.bigLeela;

          console.log("Big Leela eval:", leelaEval);

          if (leelaEval?.policy) {
            const sorted = Object.entries(leelaEval.policy).sort(
              ([, a], [, b]) => b - a
            );

            console.log(
              "[BOT] Big Leela sorted policy (top 5):",
              sorted.slice(0, 5)
            );

            if (sorted[0]) {
              move = sorted[0][0];
              console.log("[BOT] Big Leela selected move:", move);
            }
          } else {
            console.warn("[BOT] Big Leela policy missing");
          }
        } else if (selectedBot === "elitemaia") {
          console.log("[BOT] Using Elite Maia");
          const eliteEval = sanEvaluations.elitemaia;

          console.log("Elite Maia eval:", eliteEval);

          if (eliteEval?.policy) {
            const sorted = Object.entries(eliteEval.policy).sort(
              ([, a], [, b]) => b - a
            );

            console.log(
              "[BOT] Elite Maia sorted policy (top 5):",
              sorted.slice(0, 5)
            );

            if (sorted[0]) {
              move = sorted[0][0];
              console.log("[BOT] Elite Maia selected move:", move);
            }
          } else {
            console.warn("[BOT] Elite Maia policy missing");
          }
        }

        console.groupEnd();
      } catch (evalErr) {
        console.error("[BOT] Evaluation error:", evalErr);
        move = moves[Math.floor(Math.random() * moves.length)];
        console.warn("[BOT] Falling back to random move:", move);
      }

      // Fallback to random move if no evaluation available
      if (!move) {
        move = moves[Math.floor(Math.random() * moves.length)];
        console.warn("[BOT] No eval move found, random fallback:", move);
      }

      console.log("[BOT] Final move chosen:", move);

      const newGame = new Chess(game.fen());
      newGame.loadPgn(game.pgn());
      const moveResult = newGame.move(move);

      if (!moveResult) {
        console.error("[BOT] Move rejected by chess.js:", move);
      } else {
        console.log("[BOT] Move applied:", moveResult);
      }

      setGame(newGame);
      setFen(newGame.fen());

      console.log("[BOT] New FEN:", newGame.fen());

      checkGameEnd(newGame);
    } catch (error) {
      console.error("[BOT] makeBotMove fatal error:", error);
    } finally {
      setBotThinking(false);
      console.log("[BOT] Bot thinking set to FALSE");
      console.groupEnd();
    }
  };

  // Check if game ended
  const checkGameEnd = (currentGame: Chess): boolean => {
    if (currentGame.isGameOver()) {
      setGameStatus("finished");

      if (currentGame.isCheckmate()) {
        const winner = currentGame.turn() === "w" ? "Black" : "White";
        setResult(`Checkmate! ${winner} wins!`);
      } else if (currentGame.isDraw()) {
        setResult("Game drawn!");
      } else if (currentGame.isStalemate()) {
        setResult("Stalemate!");
      } else if (currentGame.isThreefoldRepetition()) {
        setResult("Draw by repetition!");
      } else if (currentGame.isInsufficientMaterial()) {
        setResult("Draw by insufficient material!");
      }

      return true;
    }
    return false;
  };

  // Download PGN
  const downloadPGN = () => {
    const pgnGame = new Chess();
    game.history().forEach((move) => pgnGame.move(move));

    pgnGame.header(
      "White",
      playerColor === "white" ? "You" : BOT_CONFIGS[selectedBot].name
    );
    pgnGame.header(
      "Black",
      playerColor === "black" ? "You" : BOT_CONFIGS[selectedBot].name
    );
    pgnGame.header("Date", new Date().toISOString().split("T")[0]);
    pgnGame.header("Result", result || "*");

    const pgn = pgnGame.pgn();
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-vs-${selectedBot}-${
      new Date().toISOString().split("T")[0]
    }.pgn`;
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

    return (
      <Stack spacing={3}>
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
              disabled={gameStatus === "playing"}
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
                onChange={(e) => setMaiaRating(e.target.value as MaiaRating)}
                disabled={gameStatus === "playing"}
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

        {/* Model Download Section */}
        {requiresModel && !isModelReady && gameStatus === "setup" && (
          <Card
           
          >
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

                {isModelDownloading && (
                  <Box sx={{ width: "100%" }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Downloading...</Typography>
                      <Typography variant="body2">
                        {Math.round(modelProgress)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={modelProgress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadModel(modelType!)}
                  disabled={isModelDownloading}
                  fullWidth
                >
                  {isModelDownloading
                    ? "Downloading..."
                    : `Download Model (${MODEL_CONFIGS[modelType!].size})`}
                </Button>
              </Stack>
            </CardContent>
          </Card>
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
              disabled={gameStatus === "playing"}
              fullWidth
            >
              White
            </Button>
            <Button
              variant={playerColor === "black" ? "contained" : "outlined"}
              onClick={() => setPlayerColor("black")}
              disabled={gameStatus === "playing"}
              fullWidth
            >
              Black
            </Button>
          </Stack>
        </Box>

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
              {botThinking && (
                <Alert severity="info">
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

        {/* Game Info */}
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
            </Stack>
          </Box>
        )}

        {game.history().length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Game Moves
            </Typography>
            <PGNView
              moves={game.history()}
              moveAnalysis={null}
              currentMoveIndex={game.history().length}
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
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          px: 2,
          pt: 1,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Controls" />
          <Tab label="Chat" />
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
          <Box sx={{ p: 3 }}>
            <ControlPanel />
          </Box>
        </TabPanel>

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
        {/* Chessboard Section */}
        <Box
          sx={{
            flex: { xs: "1 1 auto", lg: "0 0 auto" },
            width: { xs: "100%", lg: "auto" },
            maxWidth: "100%",
            display: "flex",
            justifyContent: { xs: "center", lg: "flex-start" },
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
            playMode={true}
          />
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
