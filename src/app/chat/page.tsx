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
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Close as CloseIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import ModelSetting from "@/componets/tabs/ModelSetting";
import { DisplayChessboardToolUI } from "@/componets/uitools/DisplayChessBoard";

export default function ChatPage() {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const { currentTheme } = useTheme();
  const [modelDialogOpen, setModelDialogOpen] = useState(false);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
      body: async () => {
        const model =
          localStorage.getItem("selected-model") ||
          "arcee-ai/trinity-large-preview:free";
        return {
          apiSettings: { model },
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

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DisplayChessboardToolUI />

      <TooltipProvider>
        <div style={vars} className="h-screen flex flex-col">

          {/* Top bar: upsell (free users) + settings icon */}
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
                  like Gemini Pro and Claude Sonnet, for smarter chess queries.
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
              <Box flex={1} />
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

          {/* Chat thread */}
          <Box flex={1} overflow="hidden">
            <Thread />
          </Box>

          {/* Model settings modal */}
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
              <ModelSetting />
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}