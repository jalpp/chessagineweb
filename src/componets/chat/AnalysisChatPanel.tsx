"use client";

import { useMemo, useState } from "react";
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
} from "@assistant-ui/react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Badge,
  LinearProgress,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Close as CloseIcon,
  ArrowUpward as SendIcon,
  Stop as StopIcon,
  NoteAdd as NoteAddIcon,
  Check as CheckIcon,
  Psychology as BrainIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useAuth, useClerk } from "@clerk/nextjs";

import { MarkdownText } from "@/components/markdown-text";
import { ToolFallback } from "@/components/tool-fallback";
import ModelSetting from "@/componets/tabs/ModelSetting";
import KnowledgePanel from "@/componets/tabs/KnowledgePanel";
import { KnowledgeProvider, useKnowledge } from "@/context/KnowledgeContext";
import { useTheme } from "@/context/ThemeContext";
import { chatThemeVars } from "@/libs/setting/helper";
import { useTokenLimit } from "@/hooks/useTokenLimit";
import { useAnalysisChatRuntime } from "@/hooks/useAnalysisChatRuntime";
import {
  AnalysisChatContextInput,
  AnalysisChatMode,
} from "@/libs/agine/chatContext";

export interface AnalysisChatPanelProps {
  mode: AnalysisChatMode;
  fen: string;
  pgn?: string;
  gameInfo?: Record<string, string>;
  moveHistorySan?: string[];
  currentPly?: number;
  stockfishLines?: string[];
  lc0Lines?: string[];
  currentMoveQuality?: string;
  currentMoveSan?: string;
  qualityCounts?: Partial<Record<string, number>>;
  onInsertAnnotation?: (text: string) => void;
}

function extractMessageText(content: readonly { type: string; text?: string }[]): string {
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n\n")
    .trim();
}

function AnnotateButton({ onInsertAnnotation }: { onInsertAnnotation: (text: string) => void }) {
  const text = useMessage((s) => extractMessageText(s.content));
  const [added, setAdded] = useState(false);

  if (!text) return null;

  return (
    <Tooltip title={added ? "Added to notation" : "Add this to the move's notation"}>
      <span>
        <IconButton
          size="small"
          sx={{ p: 0.4 }}
          aria-label="Add this to the move's notation"
          onClick={() => {
            onInsertAnnotation(text);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          {added ? (
            <CheckIcon sx={{ fontSize: 14, color: "success.main" }} />
          ) : (
            <NoteAddIcon sx={{ fontSize: 14 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function AssistantMessage({ onInsertAnnotation }: { onInsertAnnotation?: (text: string) => void }) {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-full px-1 py-1.5" data-role="assistant">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">
          <MessagePrimitive.Parts
            components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }}
          />
        </div>
        {onInsertAnnotation && <AnnotateButton onInsertAnnotation={onInsertAnnotation} />}
      </div>
    </MessagePrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="mx-auto flex w-full max-w-full justify-end px-1 py-1.5"
      data-role="user"
    >
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-1.5 text-[13px] text-foreground">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex w-full items-end gap-1 border-t border-divider p-1.5">
      <ComposerPrimitive.Input
        placeholder="Ask Agine about this…"
        rows={1}
        className="max-h-24 min-h-8 w-full flex-1 resize-none rounded-lg border border-divider bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground/70"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <IconButton size="small" color="primary" aria-label="Send message">
            <SendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <IconButton size="small" aria-label="Stop generating">
            <StopIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
}

function ChatThread({ onInsertAnnotation }: { onInsertAnnotation?: (text: string) => void }) {
  const { currentTheme } = useTheme();
  const vars = chatThemeVars[currentTheme];

  return (
    <Box
      data-testid="chat-theme-root"
      sx={{ display: "flex", flexDirection: "column", height: 420, minHeight: 0 }}
      style={vars}
    >
      <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
        <ThreadPrimitive.Viewport className="flex-1 min-h-0 overflow-y-auto px-1 pt-1">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <Typography sx={{ fontSize: "11px", color: "text.disabled", px: 0.5, py: 1 }}>
              Ask about a move, the plan, or why the engine likes a line — Agine can see
              the current position, PGN, and engine lines already.
            </Typography>
          </AuiIf>
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage: () => (
                <AssistantMessage onInsertAnnotation={onInsertAnnotation} />
              ),
            }}
          />
        </ThreadPrimitive.Viewport>
        <Composer />
      </ThreadPrimitive.Root>
    </Box>
  );
}

function SignedOutGate() {
  const { openSignIn } = useClerk();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, py: 2 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
        Sign in to chat with Agine about this game or position.
      </Typography>
      <Button size="small" onClick={() => openSignIn()}>
        Sign In
      </Button>
    </Box>
  );
}

/** Condensed version of the usage bar shown on the standalone chat page. */
function UsageBar({ isPaidTier }: { isPaidTier: boolean }) {
  const dailyUsage = useTokenLimit(isPaidTier);

  if (!isPaidTier || dailyUsage.loading) return null;

  const usagePct = dailyUsage.budgetUSD
    ? Math.min(100, (dailyUsage.costUSD / dailyUsage.budgetUSD) * 100)
    : 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 0.5 }}>
      <Tooltip
        title={`Daily usage: $${dailyUsage.costUSD.toFixed(4)} / $${dailyUsage.budgetUSD?.toFixed(2)} — resets at midnight UTC`}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <LinearProgress
            variant="determinate"
            value={usagePct}
            color={dailyUsage.limitHit ? "error" : dailyUsage.warning ? "warning" : "primary"}
            sx={{ flex: 1, height: 5, borderRadius: 3 }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: "10px",
              color: dailyUsage.limitHit ? "error.main" : dailyUsage.warning ? "warning.main" : "text.secondary",
              whiteSpace: "nowrap",
            }}
          >
            {usagePct.toFixed(0)}% daily
          </Typography>
        </Box>
      </Tooltip>
      {dailyUsage.limitHit && (
        <Typography sx={{ fontSize: "10px", color: "error.main" }}>
          Daily limit reached — premium models fall back to the free model until midnight UTC.
        </Typography>
      )}
    </Box>
  );
}

function ChatRuntimeProvider({
  contextInput,
  isPaidTier,
  onInsertAnnotation,
}: {
  contextInput: AnalysisChatContextInput;
  isPaidTier: boolean;
  onInsertAnnotation?: (text: string) => void;
}) {
  const { buildKnowledgeContext } = useKnowledge();
  const runtime = useAnalysisChatRuntime(contextInput, {
    isPaidTier,
    getKnowledgeContext: buildKnowledgeContext,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatThread onInsertAnnotation={onInsertAnnotation} />
    </AssistantRuntimeProvider>
  );
}

function AnalysisChatPanelInner({
  mode,
  fen,
  pgn,
  gameInfo,
  moveHistorySan,
  currentPly,
  stockfishLines,
  lc0Lines,
  currentMoveQuality,
  currentMoveSan,
  qualityCounts,
  onInsertAnnotation,
}: AnalysisChatPanelProps) {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const { selectedIds } = useKnowledge();

  const contextInput: AnalysisChatContextInput = useMemo(
    () => ({
      mode,
      fen,
      pgn,
      gameInfo,
      moveHistorySan,
      currentPly,
      stockfishLines,
      lc0Lines,
      gameReview:
        currentMoveSan || currentMoveQuality || qualityCounts
          ? { currentMoveSan, currentMoveQuality, qualityCounts }
          : undefined,
    }),
    [
      mode, fen, pgn, gameInfo, moveHistorySan, currentPly,
      stockfishLines, lc0Lines, currentMoveSan, currentMoveQuality, qualityCounts,
    ],
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5, gap: 0.5 }}>
        {!isPaidTier ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: 1 }}>
            <StarIcon sx={{ fontSize: 13, color: "info.main", flexShrink: 0 }} />
            <Typography variant="caption" noWrap sx={{ fontSize: "10px", color: "text.secondary" }}>
              Free plan — limited models.
            </Typography>
            <Button size="small" href="/pricing" sx={{ fontSize: "10px", minWidth: 0, p: 0.25 }}>
              Upgrade
            </Button>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minWidth: 0 }} />
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          {isPaidTier && (
            <Tooltip title="Chess Knowledge Cards">
              <IconButton size="small" sx={{ p: 0.4 }} onClick={() => setKnowledgeOpen(true)}>
                <Badge badgeContent={selectedIds.size} color="primary" max={99} invisible={selectedIds.size === 0}>
                  <BrainIcon sx={{ fontSize: 14 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Chat settings">
            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => setSettingsOpen(true)}>
              <SettingsIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <UsageBar isPaidTier={isPaidTier} />

      {isSignedIn ? (
        <ChatRuntimeProvider
          contextInput={contextInput}
          isPaidTier={isPaidTier}
          onInsertAnnotation={onInsertAnnotation}
        />
      ) : (
        <SignedOutGate />
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Chat Settings
          <IconButton onClick={() => setSettingsOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ModelSetting />
        </DialogContent>
      </Dialog>

      {isPaidTier && (
        <KnowledgePanel open={knowledgeOpen} onClose={() => setKnowledgeOpen(false)} />
      )}
    </Box>
  );
}

export default function AnalysisChatPanel(props: AnalysisChatPanelProps) {
  return (
    <KnowledgeProvider>
      <AnalysisChatPanelInner {...props} />
    </KnowledgeProvider>
  );
}
