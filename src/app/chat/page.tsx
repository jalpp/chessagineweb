"use client";
import { usePageReady } from "@/hooks/usePageReady";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { generateId } from "ai";
import type { AttachmentAdapter } from "@assistant-ui/core";
import { Thread } from "@/components/thread";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";
import { chatThemeVars } from "@/libs/setting/helper";
import { useAuth, useClerk } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Button,
  Typography,
  Box,
  Badge,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Star as StarIcon,
  Psychology as BrainIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import ModelSetting from "@/componets/tabs/ModelSetting";
import { DisplayChessboardToolUI } from "@/componets/uitools/DisplayChessBoard";
import { LoadGameToolUI } from "@/componets/uitools/LoadGameUi";
import KnowledgePanel from "@/componets/tabs/KnowledgePanel";
import { KnowledgeProvider, useKnowledge } from "@/context/KnowledgeContext";
import { useTokenLimit } from "@/hooks/useTokenLimit";
import { useLocalStorage } from "usehooks-ts";
import { LoadPuzzleToolUI } from "@/componets/uitools/LoadPuzzleUi";
import { ThreadSidebar, MobileThreadDrawer } from "@/components/threadSidebar";



const MAX_ATTACHMENT_BYTES = 1 * 1024 * 1024; 
const ALLOWED_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const ALLOWED_EXTENSIONS = /\.(md|txt)$/i;

const chessAttachmentAdapter: AttachmentAdapter = {
  accept: ".md,.txt,text/plain,text/markdown",
  async add({ file }) {
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.test(file.name)) {
      throw new Error(
        `Only .md and .txt files are supported. "${file.name}" is not allowed.`,
      );
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `File "${file.name}" exceeds the 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      );
    }
    return {
      id: generateId(),
      type: "file" as const,
      name: file.name,
      file,
      contentType: file.type || "text/plain",
      content: [],
      status: { type: "requires-action" as const, reason: "composer-send" as const },
    };
  },
  async send(attachment) {
    const text = await attachment.file.text();
    return {
      ...attachment,
      status: { type: "complete" as const },
      content: [
        {
          type: "file" as const,
          mimeType: attachment.contentType ?? "text/plain",
          filename: attachment.name,
          data: `data:${attachment.contentType ?? "text/plain"};base64,${btoa(unescape(encodeURIComponent(text)))}`,
        },
      ],
    };
  },
  async remove() {
  },
};

function ChatPageInner() {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  const {openSignIn} = useClerk();
 
  const { currentTheme } = useTheme();
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [savedModel] = useLocalStorage<string>(
      "selected-model",
      "openrouter/free",
    );
 
  const [lichessToken] = useLocalStorage<string>("lichess-token", "");
  const [chessboardmagicToken] = useLocalStorage<string>("chessboardmagic-token", "");
  const [openrouterToken] = useLocalStorage<string>("openrouter-token", "");
  const [anthropicToken] = useLocalStorage<string>("anthropic-token", "");
  const [geminiToken] = useLocalStorage<string>("gemini-token", "");
  const isPersonalTokenSet = !!openrouterToken && openrouterToken.length > 0;
  const isPersonalGeminiTokenSet = !!geminiToken && geminiToken.length > 0;
  const isPersonalClaudeTokenSet = !!anthropicToken && anthropicToken.length > 0;
 
  const { buildKnowledgeContext, selectedIds } = useKnowledge();
 
  const dailyUsage = useTokenLimit(isPaidTier);
 
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
      body: async () => {
        const model =
          savedModel ||
          "openrouter/free";
 
        const knowledgeContext =
          isPaidTier ? buildKnowledgeContext() : null;
 
        const tokens = {
          ...(lichessToken ? { lichessToken } : {}),
          ...(isPaidTier && chessboardmagicToken ? { chessboardmagicToken } : {}),
          ...(isPaidTier && openrouterToken ? { openrouterToken } : {}),
          ...(anthropicToken ? { anthropicToken } : {}),
          ...(geminiToken ? { geminiToken } : {}),
        };
 
        return {
          apiSettings: { model },
          ...(knowledgeContext ? { knowledgeContext } : {}),
          ...(Object.keys(tokens).length > 0 ? { tokens } : {}),
        };
      },
    }),
    adapters: {
      attachments: chessAttachmentAdapter,
    },
  });
 
  const vars = chatThemeVars[currentTheme];
 
  if (!isSignedIn) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={3}
        py={4}
      >
        <Typography variant="body1" color="text.secondary">
          Please sign in or sign up to use Agine Chat.
        </Typography>
         <Box
            onClick={() => openSignIn()}
            sx={{
  
              "&:hover": { opacity: 0.75 },
              transition: "opacity 0.15s",
            }}
          >
            <Typography sx={{ lineHeight: 1, color: "text.secondary" }}>Sign In</Typography>
          </Box>
      </Box>
    );
  }
 
 
  const usagePct =
    isPaidTier && dailyUsage.budgetUSD
      ? Math.min(100, (dailyUsage.costUSD / dailyUsage.budgetUSD) * 100)
      : 0;
 
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DisplayChessboardToolUI />
      <LoadGameToolUI />
      <LoadPuzzleToolUI/>
 
      <TooltipProvider>
        <div style={vars} className="h-screen flex flex-col overflow-hidden">
 
          {/* ── Top header bar ── */}
          <Box
            display="flex"
            alignItems="center"
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              minHeight: 40,
              px: 1,
              gap: 1,
            }}
          >
            {/* Free plan upgrade nudge */}
            {!isPaidTier ? (
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                flex={1}
                sx={{ overflow: "hidden" }}
              >
                <StarIcon
                  fontSize="small"
                  sx={{ color: "info.main", flexShrink: 0 }}
                />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: "text.secondary",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  You&apos;re on the free plan. Upgrade to unlock premium models
                  and Chess Knowledge Cards.
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: "text.secondary",
                    display: { xs: "block", sm: "none" },
                  }}
                >
                  Free plan — limited models.
                </Typography>
                <Button
                  color="info"
                  size="small"
                  variant="outlined"
                  href="/pricing"
                  sx={{ whiteSpace: "nowrap", flexShrink: 0, ml: 0.5 }}
                >
                  Upgrade
                </Button>
              </Box>
            ) : (
              /* Paid: show usage progress inline */
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                flex={1}
                sx={{ overflow: "hidden", minWidth: 0 }}
              >
                {!dailyUsage.loading && (
                  <>
                    <Tooltip
                      title={`Daily usage: $${dailyUsage.costUSD.toFixed(4)} / $${dailyUsage.budgetUSD?.toFixed(2)} — resets at midnight UTC`}
                    >
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={0.75}
                        sx={{ minWidth: 0, flexShrink: 1 }}
                      >
                        <LinearProgress
                          variant="determinate"
                          value={usagePct}
                          color={
                            dailyUsage.limitHit
                              ? "error"
                              : dailyUsage.warning
                              ? "warning"
                              : "primary"
                          }
                          sx={{ width: 80, height: 6, borderRadius: 3, flexShrink: 0 }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: dailyUsage.limitHit
                              ? "error.main"
                              : dailyUsage.warning
                              ? "warning.main"
                              : "text.secondary",
                            whiteSpace: "nowrap",
                            display: { xs: "none", sm: "block" },
                          }}
                        >
                          {usagePct.toFixed(0)}% daily
                        </Typography>
                      </Box>
                    </Tooltip>
                  </>
                )}
              </Box>
            )}
 
            {/* Knowledge Cards button — paid only */}
            {isPaidTier && (
              <Tooltip title="Chess Knowledge Cards">
                <IconButton
                  onClick={() => setKnowledgeOpen(true)}
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  <Badge
                    badgeContent={selectedIds.size}
                    color="primary"
                    max={99}
                    invisible={selectedIds.size === 0}
                  >
                    <BrainIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
 
            {/* Thread drawer — shown on mobile where sidebar is hidden */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <MobileThreadDrawer />
            </Box>
 
            <Tooltip title="Model Settings">
              <IconButton
                onClick={() => setModelDialogOpen(true)}
                size="small"
                sx={{ flexShrink: 0 }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
 
          
          {isPaidTier && dailyUsage.limitHit && (
            <Alert
              severity={isPersonalTokenSet ? "info" : "error"}
              icon={isPersonalTokenSet ? <CheckCircleIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
              sx={{ 
                borderRadius: 0, 
                py: 0.75,
                backgroundColor: isPersonalTokenSet 
                  ? "rgba(33, 150, 243, 0.08)" 
                  : "rgba(244, 67, 54, 0.08)",
                borderLeft: `4px solid ${isPersonalTokenSet ? "#2196F3" : "#f44336"}`,
              }}
              action={
                <Typography variant="caption" sx={{ alignSelf: "center", pr: 1, color: "text.secondary" }}>
                  Resets at midnight UTC
                </Typography>
              }
            >
              {isPersonalTokenSet || isPersonalGeminiTokenSet || isPersonalClaudeTokenSet ? (
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#1976D2" }}>
                    ✓ Using your personal API token
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    AgineCloud daily limit reached, but you can continue using premium models with your personal account.
                  </Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#d32f2f" }}>
                    ⚠ Daily limit reached
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Premium models are paused — you&apos;re using the free model. Add your own OpenRouter token in settings to continue with premium models.
                  </Typography>
                </Box>
              )}
            </Alert>
          )}
 
 
          {isPaidTier && !dailyUsage.limitHit && dailyUsage.warning && (
            <Alert
              severity="warning"
              icon={<WarningIcon fontSize="small" />}
              sx={{ borderRadius: 0, py: 0.5 }}
            >
              <Typography variant="caption">
                <strong>Heads up:</strong> You&apos;ve used 80% of today&apos;s
                budget (${dailyUsage.costUSD.toFixed(3)} / $
                {dailyUsage.budgetUSD?.toFixed(2)}). AgineCloud's Premium models will pause
                at the daily limit.
              </Typography>
            </Alert>
          )}
 
          {/* Main area: sidebar left + thread right */}
          <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "200px 1fr" }, overflow: "hidden", minHeight: 0 }}>
            {/* Thread sidebar — desktop only */}
            <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", overflow: "hidden" }}>
              <ThreadSidebar />
            </Box>
            {/* Chat thread */}
            <Box sx={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Thread />
            </Box>
          </Box>
 
          <Dialog
            open={modelDialogOpen}
            onClose={() => setModelDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              Model Settings
              <IconButton
                onClick={() => setModelDialogOpen(false)}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
 
              {isPaidTier && dailyUsage.limitHit && !isPersonalTokenSet && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Daily limit hit, premium models will fall back to the free
                  model until midnight UTC.
                </Alert>
              )}
              <ModelSetting />
            </DialogContent>
          </Dialog>
 
          {isPaidTier && (
            <KnowledgePanel
              open={knowledgeOpen}
              onClose={() => setKnowledgeOpen(false)}
            />
          )}
        </div>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}
 
export default function ChatPage() {
  usePageReady();
  return (
    <KnowledgeProvider>
      <ChatPageInner />
    </KnowledgeProvider>
  );
}