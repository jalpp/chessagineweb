"use client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/thread";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";
import { chatThemeVars } from "@/libs/setting/helper";
import { useAuth } from "@clerk/nextjs";
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
  Star as StarIcon,
  Psychology as BrainIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import ModelSetting from "@/componets/tabs/ModelSetting";
import { DisplayChessboardToolUI } from "@/componets/uitools/DisplayChessBoard";
import { LoadGameToolUI } from "@/componets/uitools/LoadGameUi";
import KnowledgePanel from "@/componets/tabs/KnowledgePanel";
import { KnowledgeProvider, useKnowledge } from "@/context/KnowledgeContext";
import { useTokenLimit } from "@/hooks/useTokenLimit";
import { useLocalStorage } from "usehooks-ts";


function ChatPageInner() {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const { currentTheme } = useTheme();
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [savedModel] = useLocalStorage<string>(
      "selected-model",
      "openrouter/free",
    );

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

        return {
          apiSettings: { model },
          ...(knowledgeContext ? { knowledgeContext } : {}),
        };
      },
    }),
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
        <SignIn />
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

      <TooltipProvider>
        <div style={vars} className="h-screen flex flex-col">

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

          {/* ── Daily limit banner ── */}
          {isPaidTier && dailyUsage.limitHit && (
            <Alert
              severity="error"
              icon={<BlockIcon fontSize="small" />}
              sx={{ borderRadius: 0, py: 0.5 }}
              action={
                <Typography variant="caption" sx={{ alignSelf: "center", pr: 1 }}>
                  Resets at midnight UTC
                </Typography>
              }
            >
              <Typography variant="caption">
                <strong>Daily limit reached.</strong> Premium models are paused
                — you&apos;re chatting on the free model until tomorrow.
              </Typography>
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
                {dailyUsage.budgetUSD?.toFixed(2)}). Premium models will pause
                at the daily limit.
              </Typography>
            </Alert>
          )}

          <Box flex={1} overflow="hidden">
            <Thread />
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

              {isPaidTier && dailyUsage.limitHit && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Daily limit hit — premium models will fall back to the free
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
  return (
    <KnowledgeProvider>
      <ChatPageInner />
    </KnowledgeProvider>
  );
}