import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  MenuBook,
  Close,
  ContentCopy,
  History,
  Stop,
  Settings as SettingsIcon,
  VolumeUp,
  VolumeOff,
  Visibility,
  DeleteOutline,
} from "@mui/icons-material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { BookmarkAdd } from "@mui/icons-material";
import { Bookmark } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { Chessboard } from "react-chessboard";
import {
  Stack,
  Box,
  Typography,
  Switch,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Chip,
  Avatar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Tooltip,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import ModelSetting from "./ModelSetting";
import { ChatMessage } from "@/libs/agine/helper";
import { calculateChatPrice } from "@/libs/docs/helper";
import { useLocalStorage } from "usehooks-ts";
import {
  DEFAULT_CHAT_AUTOSCROLL,
  DEFAULT_CHAT_COMPACT_VIEW,
  DEFAULT_CHAT_FONT_SIZE,
  DEFAULT_CHAT_DIMENSIONS,
  DEFAULT_CHAT_SHOW_TIMESTAMP,
  DEFAULT_CHAT_SPEECH_PITCH,
  DEFAULT_CHAT_SPEECH_RATE,
  DEFAULT_CHAT_SPEECH_VOICE,
  DEFAULT_CHAT_SPEECH_VOLUME,
  DEFAULT_CHAT_TECHNICAL_INFO,
} from "@/libs/setting/helper";

export interface ChatTabProps {
  sessionMode: boolean;
  setSessionMode: (checked: boolean) => void;
  clearChatHistory: () => void;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  gameInfo?: string;
  currentMove?: string;
  currentMoveIndex?: number;
  chatInput: string;
  puzzleMode?: boolean;
  playMode?: boolean;
  puzzleQuery?: string;
  setChatInput: (value: string) => void;
  handleChatKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendChatMessage: (gameInfo?: string | undefined, currentMove?: string | undefined, puzzleMode?: boolean | undefined, puzzleQuery?: string | undefined, playMode?: boolean | undefined, currentMoveIndex?: number | undefined) => void;
  abortChatMessage?: () => void;
}

interface SavedPosition {
  id: string;
  fen: string;
  analysis: string;
  timestamp: Date;
  title?: string;
}

const sessionPrompts = [
  "How does Silman's imbalances apply here?",
  "How does Fine's chess principles apply here?",
  "How would you play this?",
  "What catches your eye here?",
  "Is this looking good or bad?",
  "What's your gut feeling about this position?",
  "Any cool tactics you spot?",
  "How should I approach this?",
  "What would you do here?",
  "See anything interesting?",
  "Thoughts on the position?",
  "Which move feels right to you?",
  "What do you think about this position?",
];

const puzzlePrompts = [
  "Any hints you can share?",
  "How would you approach this puzzle?",
  "What do you see here?",
  "Got any ideas?",
  "What's your first thought?",
  "Can you give me a nudge in the right direction?",
];

const playPrompts = [
  "What would you play here?",
  "Should I castle or wait?",
  "Time to attack or be patient?",
  "How do I handle this threat?",
  "What's my opponent up to?",
  "Good time to trade pieces?",
  "Is this move safe enough?",
  "What's the plan here?",
  "Push the pawns or hold back?",
  "How can I coordinate better?",
  "See any tactics brewing?",
  "What piece should I develop next?",
];

const chatPrompts = [
  "Tell me about chess basics",
  "How do I get better at chess?",
  "What are your favorite tactics?",
  "Know any cool chess stories?",
  "How should I study openings?",
  "Why are endgames important?",
  "What's the difference between strategy and tactics?",
  "How do strong players think?",
  "What are the key chess principles?",
  "How do you calculate moves?",
  "Tell me about pawn structures",
  "Positional vs tactical play - what's the deal?",
  "Any time management tips?",
  "What opening mistakes should I avoid?",
  "How do I keep my king safe?",
  "How can I recognize patterns better?",
];

export const ChatTab: React.FC<ChatTabProps> = ({
  sessionMode,
  setSessionMode,
  clearChatHistory,
  chatMessages,
  chatLoading,
  chatInput,
  setChatInput,
  handleChatKeyPress,
  sendChatMessage,
  abortChatMessage,
  gameInfo,
  currentMove,
  puzzleMode = false,
  playMode = false,
  puzzleQuery,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [copyMenuAnchor, setCopyMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [chessboardModalOpen, setChessboardModalOpen] = useState(false);
  const [selectedFen, setSelectedFen] = useState<string>("");

  const [savedPositions, setSavedPositions] = useLocalStorage<SavedPosition[]>(
    "agine_position_library",
    []
  );
  const [questionMode, setQuestionMode] = useLocalStorage<boolean>(
    "agine_question_mode",
    false
  );

  const [graderMode, setGraderMode] = useLocalStorage<boolean>(
    "agine_grader_mode",
    false
  )

  const [selfEvalMode, setSelfEvalMode] = useLocalStorage<boolean>(
    "agine_selfEval_mode",
    false
  );

  const [libraryOpen, setLibraryOpen] = useState(false);

  const [autoScroll, setAutoScroll] = useLocalStorage<boolean>(
    "chat_ui_autoscroll",
    DEFAULT_CHAT_AUTOSCROLL
  );
  const [fontSize, setFontSize] = useLocalStorage<number>(
    "chat_ui_font_size",
    DEFAULT_CHAT_FONT_SIZE
  );
  const [showTimestamps, setShowTimestamps] = useLocalStorage<boolean>(
    "chat_ui_timestamp",
    DEFAULT_CHAT_SHOW_TIMESTAMP
  );
  const [showTechnicalInfo, setTechnicalInfo] = useLocalStorage<boolean>(
    "chat_ui_technical_info",
    DEFAULT_CHAT_TECHNICAL_INFO
  );
  const [compactView, setCompactView] = useLocalStorage<boolean>(
    "chat_ui_compact_view",
    DEFAULT_CHAT_COMPACT_VIEW
  );

  // Text-to-Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(
    null
  );
  const [speechRate, setSpeechRate] = useLocalStorage<number>(
    "chat_ui_speech_rate",
    DEFAULT_CHAT_SPEECH_RATE
  );
  const [speechPitch, setSpeechPitch] = useLocalStorage<number>(
    "chat_ui_speech_pitch",
    DEFAULT_CHAT_SPEECH_PITCH
  );
  const [speechVolume, setSpeechVolume] = useLocalStorage<number>(
    "chat_ui_speech_volume",
    DEFAULT_CHAT_SPEECH_VOLUME
  );
  const [selectedVoice, setSelectedVoice] = useLocalStorage<string>(
    "chat_ui_speech_voice",
    DEFAULT_CHAT_SPEECH_VOICE
  );
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Resize functionality
  const [dimensions, setDimensions] = useLocalStorage<{
    width: number;
    height: number;
  }>("chat_ui_chat_dimensions", {
    width:
      typeof window !== "undefined" && window.innerWidth < 768
        ? window.innerWidth - 32
        : DEFAULT_CHAT_DIMENSIONS.width,
    height:
      typeof window !== "undefined" && window.innerWidth < 768
        ? window.innerHeight - 100
        : DEFAULT_CHAT_DIMENSIONS.height,
  });

  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setDimensions({
          width: window.innerWidth - 32,
          height: window.innerHeight - 100,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimensionsRef = useRef({ width: 0, height: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Try to find a good default voice
        const englishVoices = voices.filter((voice) =>
          voice.lang.startsWith("en")
        );
        const preferredVoice =
          englishVoices.find((voice) => voice.name.includes("Female")) ||
          englishVoices.find((voice) => voice.name.includes("Natural")) ||
          englishVoices[0];

        if (preferredVoice && !selectedVoice) {
          setSelectedVoice(preferredVoice.name);
        }
      };

      // Load voices immediately if available
      loadVoices();

      // Also listen for the voiceschanged event (needed for some browsers)
      speechSynthesis.addEventListener("voiceschanged", loadVoices);

      return () => {
        speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      };
    } else {
      setSpeechEnabled(false);
    }
  }, [selectedVoice]);

  // Clean up speech when component unmounts
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Position Library functions
  const savePositionToLibrary = (message: ChatMessage) => {
    if (!message.fen || message.role !== "assistant") return;

    const newPosition: SavedPosition = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fen: message.fen,
      analysis: message.content,
      timestamp: message.timestamp,
      title: `Analysis from ${message.timestamp.toLocaleDateString()}`,
    };

    setSavedPositions((prev) => [newPosition, ...prev]);
  };

  const deletePositionFromLibrary = (positionId: string) => {
    setSavedPositions((prev) => prev.filter((pos) => pos.id !== positionId));
  };

  const viewPositionFromLibrary = (position: SavedPosition) => {
    setSelectedFen(position.fen);
    setChessboardModalOpen(true);
    setLibraryOpen(false);
  };

  const isPositionSaved = (fen: string) => {
    return savedPositions.some((pos) => pos.fen === fen);
  };

  // Text-to-Speech functions
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/[*_`~]/g, "") // Remove markdown formatting
      .replace(/#+\s/g, "") // Remove headers
      .replace(/>\s/g, "") // Remove blockquotes
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to just text
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .trim();
  };

  const speakMessage = (messageId: string, content: string) => {
    if (!speechEnabled || !("speechSynthesis" in window)) return;

    // Stop any current speech
    speechSynthesis.cancel();

    if (currentSpeakingId === messageId && isSpeaking) {
      // If clicking the same message that's playing, stop it
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      return;
    }

    const cleanText = stripMarkdown(content);

    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Find the selected voice
    const voice = availableVoices.find((v) => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    }
  };

  // Chessboard modal functions
  const openChessboardModal = (fen: string) => {
    setSelectedFen(fen);
    setChessboardModalOpen(true);
  };

  const openLibraryModal = () => {
    setLibraryOpen(true);
  };

  const closeLibraryModal = () => {
    setLibraryOpen(false);
  };

  const closeChessboardModal = () => {
    setChessboardModalOpen(false);
    setSelectedFen("");
  };

  // Resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startPosRef.current = { x: e.clientX, y: e.clientY };
      startDimensionsRef.current = { ...dimensions };

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startPosRef.current.x;
        const deltaY = e.clientY - startPosRef.current.y;

        // Set min and max limits
        const minWidth = 350;
        const maxWidth = 1200;
        const minHeight = 400;
        const maxHeight = 900;

        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startDimensionsRef.current.width + deltaX)
        );
        const newHeight = Math.min(
          maxHeight,
          Math.max(minHeight, startDimensionsRef.current.height + deltaY)
        );

        setDimensions({ width: newWidth, height: newHeight });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [dimensions]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && autoScroll) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [chatMessages, chatLoading, autoScroll]);

  const handlePromptSelect = (prompt: string) => {
    setChatInput(prompt);
    setDrawerOpen(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySnackbar(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const copyMessage = (content: string) => {
    copyToClipboard(content);
  };

  const copyEntireChat = () => {
    const chatHistory = chatMessages
      .map(
        (msg) =>
          `**${
            msg.role === "user" ? "You" : "Agine"
          }** (${msg.timestamp.toLocaleString()}):\n${msg.content}`
      )
      .join("\n\n---\n\n");

    copyToClipboard(chatHistory);
    setCopyMenuAnchor(null);
  };

  const handleCopyMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setCopyMenuAnchor(event.currentTarget);
  };

  const handleCopyMenuClose = () => {
    setCopyMenuAnchor(null);
  };

  const handleAbortMessage = () => {
    if (abortChatMessage) {
      abortChatMessage();
    }
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  // Determine which prompts to show based on mode
  let currentPrompts = sessionMode ? sessionPrompts : chatPrompts;
  let modeTitle = sessionMode ? "Chess Buddy Analysis" : "Chess Chat";
  let modeDescription = sessionMode
    ? "🤔 Let's look at this position together (I might miss things too!)"
    : "♟️ Just chatting about chess - no pressure, no perfect answers";

  if (puzzleMode) {
    currentPrompts = puzzlePrompts;
    modeTitle = "Puzzle Solving";
    modeDescription = "🧩 Let's figure this puzzle out together!";
  } else if (playMode) {
    currentPrompts = playPrompts;
    modeTitle = "Game Buddy";
    modeDescription = "🎮 I'm here to brainstorm moves with you";
  }

  const drawerContent = (
    <Box sx={{ width: 350, height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,

        }}
      >
        <Typography
          variant="subtitle1"
          sx={{fontWeight: 600 }}
        >
          {modeTitle}
        </Typography>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          
          size="small"
        >
          <Close />
        </IconButton>
      </Box>

      <List
        sx={{ p: 0, height: "calc(100% - 80px)" }}
      >
        {currentPrompts.map((prompt, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton
              onClick={() => handlePromptSelect(prompt)}
              sx={{
                py: 1.5,
                px: 2,
                borderBottom:
                  index < currentPrompts.length - 1
                    ? `1px solid rgba(255,255,255,0.1)`
                    : "none",
                
              }}
            >
              <ListItemText
                primary={prompt}
                sx={{
                  "& .MuiListItemText-primary": {
                 
                    fontSize: "0.9rem",
                    lineHeight: 1.4,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box
        sx={{
          p: 2,
          borderTop: `1px solid rgba(255,255,255,0.1)`,
        
        }}
      >
        <Typography
          variant="caption"
          sx={{  fontStyle: "italic" }}
        >
          💡 Click any prompt to get started
        </Typography>
      </Box>
    </Box>
  );

  const libraryContent = (
    <Box
      sx={{
        width: 800,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          // overflowY: "auto",
         
        }}
      >
        {savedPositions.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              p: 3,
              color: "#888",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              No saved positions
            </Typography>
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              Save positions with analysis to build your library
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {savedPositions.map((position, index) => (
              <Box
                key={position.id}
                sx={{
                  display: "flex",
                  minHeight: 140,
                  borderBottom:
                    index < savedPositions.length - 1
                      ? "1px solid #333"
                      : "none",
                
                }}
              >
                {/* Left side - Actual Chessboard */}
                <Box
                  sx={{
                    width: 200,
                    height: 200,
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                
                    borderRight: "1px solid #333",
                  }}
                >
                  <Box
                    onClick={() => viewPositionFromLibrary(position)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        opacity: 0.8,
                      },
                    }}
                  >
                    <Chessboard

                      options={
                        {
                          position:position.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                          allowDragging: false,
                          allowDragOffBoard: false,                          
                        }
                      }
                    />
                  </Box>
                </Box>

                {/* Right side - Position info */}
                <Box
                  sx={{
                    flex: 1,
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Title and date */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                    
                        fontWeight: 600,
                        flex: 1,
                      }}
                    >
                      {position.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#888",
                        ml: 2,
                      }}
                    >
                      {new Date(position.timestamp).toLocaleDateString()}
                    </Typography>
                  </Box>

                  {/* Analysis text */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#ccc",
                      lineHeight: 1.5,
                      flex: 1,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {position.analysis}
                  </Typography>

                  {/* Action buttons */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      mt: 1,
                      justifyContent: "flex-end",
                    }}
                  >
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        viewPositionFromLibrary(position);
                      }}
                      size="small"
                      
                    >
                      <Visibility fontSize="small" />
                    </IconButton>

                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        copyMessage(position.analysis);
                      }}
                      size="small"
                     
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>

                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePositionFromLibrary(position.id);
                      }}
                      size="small"
                      sx={{
                        color: "#aaa",
                        "&:hover": { color: "#ff6b6b" },
                      }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        maxWidth: "100vw",
        display: "flex",
        flexDirection: "column",
      
        overflow: "hidden",
        position: "relative",
        border: "1px solid #444",
        borderRadius: 1,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      {/* Header */}
      <Paper
        sx={{
          p: 1.5,
        
          borderRadius: 0,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 1.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar
              src="/static/images/agineowl.png"
              sx={{
                width: 20,
                height: 20,
              }}
            />
            <Typography
              variant="subtitle2"
              
            >
              Agine - Your Chess Buddy
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />

          {/* Action Buttons */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Conversation starters" arrow>
              <IconButton
                onClick={() => setDrawerOpen(true)}
               
                size="small"
              >
                <MenuBook fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Position Library" arrow>
              <IconButton
                onClick={openLibraryModal}
                sx={{
                  p: 0.5,
                  position: "relative",
                }}
                size="small"
              >
                <Bookmark fontSize="small" />
                {savedPositions.length > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 12,
                      height: 12,
                
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    {savedPositions.length > 9 ? "9+" : savedPositions.length}
                  </Box>
                )}
              </IconButton>
            </Tooltip>

            {chatMessages.length > 0 && (
              <Tooltip title="Chat History" arrow>
                <IconButton
                  onClick={handleCopyMenuClick}
                  sx={{p: 0.5 }}
                  size="small"
                >
                  <History fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {speechEnabled && isSpeaking && (
              <Tooltip title="Stop speaking" arrow>
                <IconButton
                  onClick={stopSpeaking}
                  sx={{ color: "#ff6b6b", p: 0.5 }}
                  size="small"
                >
                  <VolumeOff fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Settings" arrow>
              <IconButton
                onClick={() => setSettingsOpen(true)}
                sx={{ p: 0.5 }}
                size="small"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Mode Controls */}
        {!playMode && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 500 }}
              >
                Position Context
              </Typography>
              <Switch
                checked={sessionMode}
                onChange={(e) => setSessionMode(e.target.checked)}
                size="small"
               
              />
              <Typography
                variant="caption"
                sx={{  fontSize: "11px" }}
              >
                {sessionMode
                  ? "Looking at the board together"
                  : "General chess chat"}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 500 }}
              >
                Interactive Q/A
              </Typography>
              <Switch
                checked={questionMode}
                onChange={(e) => setQuestionMode(e.target.checked)}
                size="small"
             
              />
              <Typography
                variant="caption"
                sx={{  fontSize: "11px" }}
              >
                {questionMode
                  ? "Interactive question mode"
                  : "Positional Analysis"}
              </Typography>
            </Stack>
             <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <Typography
                variant="caption"
                sx={{  fontWeight: 500 }}
              >
                Self Eval
              </Typography>
              <Switch
                checked={selfEvalMode}
                onChange={(e) => setSelfEvalMode(e.target.checked)}
                size="small"
              
              />
              <Typography
                variant="caption"
                sx={{  fontSize: "11px" }}
              >
                hallucinations check
              </Typography>
            </Stack>
             <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flexWrap: "wrap" }}
            >
              <Typography
                variant="caption"
                sx={{  fontWeight: 500 }}
              >
                Grader
              </Typography>
              <Switch
                checked={graderMode}
                onChange={(e) => setGraderMode(e.target.checked)}
                size="small"
              
              />
              <Typography
                variant="caption"
                sx={{  fontSize: "11px" }}
              >
                Grade your eval
              </Typography>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            {chatMessages.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearChatHistory}
                sx={{
                
                  borderColor: "rgba(255,255,255,0.3)",
                  fontSize: "11px",
                  py: 0.5,
                  px: 1,
                 
                }}
              >
                Clear
              </Button>
            )}
          </Stack>
        )}

      </Paper>

      {/* Chat Messages */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 1,
       
          overflowAnchor: "none", 
          position: "relative",
          px: 1.5,
          py: 1,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#2a2a2a",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#555",
            borderRadius: "3px",
            "&:hover": {
              background: "#666",
            },
          },
        }}
      >
        {chatMessages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
           
              p: { xs: 1, sm: 2 },
            }}
          >
            <Avatar
              src="/static/images/agineowl.png"
              sx={{
                width: { xs: 40, sm: 50 },
                height: { xs: 40, sm: 50 },
                mb: 2,
              }}
            />

            <Paper
              sx={{
                p: 1.5,
                mb: 3,
                borderRadius: 2,
                maxWidth: { xs: "100%", sm: 350 },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                
                  textAlign: "center",
                  display: "block",
                  lineHeight: 1.4,
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                }}
              >
                ⚠️ <strong>Friendly reminder:</strong> I can make mistakes and
                miss things just like a human! Always double-check important
                moves, especially in real games. I am here to help you think
                through positions, not replace your own judgment.
              </Typography>
            </Paper>

            <Box sx={{ width: "100%" }}>
              {questionMode ? (
                <Typography
                  variant="caption"
                  sx={{
                    mb: 2,
                    display: "block",
                    opacity: 0.8,
                    textAlign: "center",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  }}
                >
                  I will question your understanding of the position.
                </Typography>
              ) : graderMode ? (
                <Typography
                  variant="caption"
                  sx={{
                    mb: 2,
                    display: "block",
                    opacity: 0.8,
                    textAlign: "center",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  }}
                >
                  I will grade your position analysis.
                </Typography>
              ) : (
                <>
                  <Typography
                    variant="caption"
                    sx={{
                      mb: 2,
                      display: "block",
                      opacity: 0.8,
                      textAlign: "center",
                      fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    }}
                  >
                    Quick start - try one of these:
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      justifyContent: "center",
                    }}
                  >
                    {currentPrompts.slice(0, 4).map((prompt, index) => (
                      <Chip
                        key={index}
                        label={prompt}
                        variant="outlined"
                        size="small"
                        onClick={() => handlePromptSelect(prompt)}
                        sx={{
                          borderColor: "rgba(156, 39, 176, 0.5)",
                          cursor: "pointer",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setDrawerOpen(true)}
                      sx={{
                        color: "#9c27b0",
                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                      }}
                    >
                      More conversation starters →
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        ) : (
          <Stack spacing={compactView ? 0.5 : 1}>
            {chatMessages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: "flex",
                  justifyContent:
                    message.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                }}
              >
                {message.role === "assistant" && (
                  <Avatar
                    src="/static/images/agineowl.png"
                    sx={{
                      width: compactView ? 24 : 28,
                      height: compactView ? 24 : 28,
                      mr: 1,
                      mt: 0.5,
                      flexShrink: 0,
                    }}
                  />
                )}

                <Paper
                  sx={{
                    p: compactView ? 1 : 1.5,
                    maxWidth: "85%",
                    borderRadius: 2,
                    position: "relative",
                    "&:hover .message-actions": {
                      opacity: 1,
                    },
                  }}
                >
                  {/* Message Actions */}
                  {message.role === "assistant" && (
                    <Box
                      className="message-actions"
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        opacity: 0,
                        transition: "opacity 0.2s",
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
                      {/* Save to Library icon - only show for assistant messages with FEN */}
                      {message.fen && (
                        <Tooltip
                          title={
                            isPositionSaved(message.fen)
                              ? "Position already saved"
                              : "Save to position library"
                          }
                          arrow
                        >
                          <IconButton
                            onClick={() => savePositionToLibrary(message)}
                            disabled={isPositionSaved(message.fen)}
                            sx={{
                              color: isPositionSaved(message.fen)
                                ? "rgba(156, 39, 176, 0.5)"
                                : "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                                color: isPositionSaved(message.fen)
                                  ? "rgba(156, 39, 176, 0.7)"
                                  : "#9c27b0",
                              },
                              "&:disabled": {
                                color: "rgba(156, 39, 176, 0.5)",
                              },
                            }}
                            size="small"
                          >
                            <BookmarkAdd fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Eye icon for viewing chessboard - only show if FEN exists */}
                      {message.fen && (
                        <Tooltip title="View position on board" arrow>
                          <IconButton
                            onClick={() => openChessboardModal(message.fen)}
                            sx={{
                              color: "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                              
                              },
                            }}
                            size="small"
                          >
                            <Visibility fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {speechEnabled && (
                        <Tooltip
                          title={
                            currentSpeakingId === message.id && isSpeaking
                              ? "Stop speaking"
                              : "Listen to message"
                          }
                          arrow
                        >
                          <IconButton
                            onClick={() =>
                              speakMessage(message.id, message.content)
                            }
                            sx={{
                              color:
                                currentSpeakingId === message.id && isSpeaking
                                  ? "#ff6b6b"
                                  : "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                               
                              },
                            }}
                            size="small"
                          >
                            {currentSpeakingId === message.id && isSpeaking ? (
                              <VolumeOff fontSize="inherit" />
                            ) : (
                              <VolumeUp fontSize="inherit" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Copy message" arrow>
                        <IconButton
                          onClick={() => copyMessage(message.content)}
                         
                          size="small"
                        >
                          <ContentCopy fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <Typography
                            variant="body2"
                            component="p"
                            sx={{
                              mb: 0.5,
                              "&:last-child": { mb: 0 },
                              fontSize: `${fontSize}px`,
                              lineHeight: compactView ? 1.2 : 1.4,
                            }}
                          >
                            {children}
                          </Typography>
                        ),
                        ul: ({ children }) => (
                          <Box component="ul" sx={{ pl: 2, mb: 0.5 }}>
                            {children}
                          </Box>
                        ),
                        li: ({ children }) => (
                          <Typography
                            component="li"
                            variant="body2"
                            sx={{
                              mb: 0.25,
                              fontSize: `${fontSize}px`,
                            }}
                          >
                            {children}
                          </Typography>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: `${fontSize}px`,
                        lineHeight: compactView ? 1.2 : 1.4,
                      }}
                    >
                      {message.content}
                    </Typography>
                  )}
                  {showTimestamps && (
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.7,
                        display: "block",
                        mt: 0.5,
                        fontSize: `${fontSize - 2}px`,
                      }}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  )}
                  {showTechnicalInfo &&
                    message.maxTokens &&
                    message.model &&
                    message.provider && (
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          display: "block",
                          mt: 0.5,
                          fontSize: `${fontSize - 2}px`,
                        }}
                      >
                        Tokens: {message.maxTokens} Cost: $
                        {calculateChatPrice(message.maxTokens, message.model)},{" "}
                        {message.provider}: {message.model}
                      </Typography>
                    )}
                </Paper>
              </Box>
            ))}
            {chatLoading && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "flex-start",
                }}
              >
                <Avatar
                  src="/static/images/agineowl.png"
                  sx={{
                    width: compactView ? 24 : 28,
                    height: compactView ? 24 : 28,
                    mr: 1,
                    mt: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Paper
                  sx={{
                    p: compactView ? 1 : 1.5,
                   
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderRadius: 2,
                  }}
                >
                  <CircularProgress size={14}  />
                  <Typography
                    variant="caption"
                    sx={{ fontSize: `${fontSize}px` }}
                  >
                    Agine is thinking...
                  </Typography>
                  {abortChatMessage && (
                    <Tooltip title="Stop response" arrow>
                      <IconButton
                        onClick={handleAbortMessage}
                        size="small"
                        sx={{
                          ml: 0.5,
                          
                        }}
                      >
                        <Stop fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Paper>
              </Box>
            )}
            {/* Invisible div for auto-scroll */}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Chat Input */}
      <Paper
        sx={{
          p: 1.5,
  
          borderRadius: 0,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            multiline
            maxRows={3}

            placeholder={
              questionMode
          ? "Write your analysis here so I can question you"
          : graderMode
          ? "Write your analysis here so I can grade your analysis"
          : playMode
          ? "What are you thinking?"
          : puzzleMode
          ? "Want to brainstorm this puzzle?"
          : sessionMode
          ? "What's on your mind about this position?"
          : "Let's talk chess..."
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyPress}
            disabled={chatLoading}
            size="small"
            slotProps={{
              input: {
          sx: {
            fontSize: `${fontSize}px`,
          },
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={() =>
              sendChatMessage(
          gameInfo,
          currentMove,
          puzzleMode,
          puzzleQuery,
          playMode,
              )
            }
            disabled={chatLoading || !chatInput.trim()}
          >
            <Send fontSize="small" />
          </Button>
        </Stack>
      </Paper>

      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "16px",
          height: "16px",
          cursor: "nw-resize",
      
          borderTopRightRadius: "3px",
          opacity: 0.7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            opacity: 1,
            backgroundColor: "#666",
          },
        }}
      >
        <OpenInFullIcon
          sx={{
            fontSize: "10px",
            transform: "rotate(180deg)",
          }}
        />
      </Box>

      {/* Library Modal */}
      <Dialog
        open={libraryOpen}
        onClose={closeLibraryModal}
        maxWidth="md"
        PaperProps={{
          sx: {
            minWidth: 450,
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          Agine Position Library
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>{libraryContent}</DialogContent>
        <DialogActions>
          <Button onClick={closeLibraryModal} >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={chessboardModalOpen}
        onClose={closeChessboardModal}
        maxWidth="md"
        PaperProps={{
          sx: {
            minWidth: 450,
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" >
            Position View
          </Typography>
          <IconButton onClick={closeChessboardModal} >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              maxWidth: 400,
              mx: "auto",
            }}
          >
            {selectedFen && (
              <Chessboard
                options={{
                  position: selectedFen,
                  allowDragOffBoard: false,
                  allowDragging: false
                }}
              />
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 2,
              fontFamily: "monospace",
            }}
          >
            FEN: {selectedFen}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => copyToClipboard(selectedFen)}

          >
            Copy FEN
          </Button>
          <Button onClick={closeChessboardModal} >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        fullScreen={window.innerWidth < 600} // Full screen on mobile
        PaperProps={{
          sx: {
            minWidth: { xs: "100%", sm: 450 },
            maxWidth: { xs: "100%", sm: 600 },
            maxHeight: { xs: "100%", sm: "90vh" },
            m: { xs: 0, sm: 2 }, // No margin on mobile
          },
        }}
      >
        <DialogTitle>Chat Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Display Options
              </Typography>
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" >
                    Auto-scroll to new messages
                  </Typography>
                  <Switch
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                   
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">
                    Show timestamps
                  </Typography>
                  <Switch
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" >
                    Show tokens, model info
                  </Typography>
                  <Switch
                    checked={showTechnicalInfo}
                    onChange={(e) => setTechnicalInfo(e.target.checked)}
                   
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" >
                    Compact view
                  </Typography>
                  <Switch
                    checked={compactView}
                    onChange={(e) => setCompactView(e.target.checked)}
                    
                  />
                </Stack>
              </Stack>
            </Box>
            <Divider  />

            {/* Text-to-Speech Settings */}
            {speechEnabled && (
              <>
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Text-to-Speech Settings
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel >Voice</InputLabel>
                      <Select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        label="Voice"
                        
                    
                      >
                        {availableVoices.map((voice) => (
                          <MenuItem key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1 }}
                      >
                        Speech Rate: {speechRate.toFixed(1)}x
                      </Typography>
                      <Box sx={{ px: 1 }}>
                        <input
                          type="range"
                          min={0.5}
                          max={2}
                          step={0.1}
                          value={speechRate}
                          onChange={(e) =>
                            setSpeechRate(Number(e.target.value))
                          }
                         
                        />
                      </Box>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1 }}
                      >
                        Pitch: {speechPitch.toFixed(1)}
                      </Typography>
                      <Box sx={{ px: 1 }}>
                        <input
                          type="range"
                          min={0.5}
                          max={2}
                          step={0.1}
                          value={speechPitch}
                          onChange={(e) =>
                            setSpeechPitch(Number(e.target.value))
                          }
                          
                        />
                      </Box>
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1 }}
                      >
                        Volume: {Math.round(speechVolume * 100)}%
                      </Typography>
                      <Box sx={{ px: 1 }}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={speechVolume}
                          onChange={(e) =>
                            setSpeechVolume(Number(e.target.value))
                          }
                          
                        />
                      </Box>
                    </Box>
                  </Stack>
                </Box>
                <Divider />
              </>
            )}

            <ModelSetting />

            <Divider />

            <Box>
              <Typography variant="body2" sx={{  mb: 1 }}>
                Font Size: {fontSize}px
              </Typography>
              <Typography
                variant="caption"
                sx={{  mb: 2, display: "block" }}
              >
                Adjust text size for better readability
              </Typography>
              <Box sx={{ px: 1 }}>
                <input
                  type="range"
                  min={12}
                  max={18}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Menu */}
      <Menu
        anchorEl={copyMenuAnchor}
        open={Boolean(copyMenuAnchor)}
        onClose={handleCopyMenuClose}
        PaperProps={{
          sx: {
           
       
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
        <MenuItem onClick={copyEntireChat}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          Copy Entire Chat History
        </MenuItem>
      </Menu>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopySnackbar(false)}
          severity="success"
          variant="filled"
      
        >
          Copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Prompts Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default ChatTab;
