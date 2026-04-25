"use client";

import { useState } from "react";
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
} from "@assistant-ui/react";
import { useAuiState } from "@assistant-ui/store";
import {
  Box,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ChatBubbleOutline as ChatIcon,
  MenuOpen as ThreadsIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// ── Thread title with ID-based fallback ─────────────────────────────────────
function ThreadListItemTitle() {
  const title = useAuiState((s) => s.threadListItem.title);
  const id = useAuiState((s) => s.threadListItem.id);
  // Use last 4 chars of ID for a short unique label
  const shortId = id ? id.slice(-4).toUpperCase() : "????";
  return <>{title || `Chat #${shortId}`}</>;
}

// ── Single thread row ────────────────────────────────────────────────────────
// Delete must be INSIDE Trigger's parent so layout stays as one row.
// We use a flex row on Root, with Trigger taking flex:1 and Delete on the end.
function ThreadItem() {
  return (
    <ThreadListItemPrimitive.Root>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 0.75,
          py: 0.5,
          borderRadius: "8px",
          mb: 0.25,
          border: "1px solid transparent",
          transition: "background-color 0.15s",
          cursor: "pointer",
          "&:hover": {
            bgcolor: "action.hover",
            "& .delete-btn": { opacity: 1 },
          },
          '&:has([data-active="true"])': {
            bgcolor: "action.selected",
            borderColor: "primary.main",
          },
        }}
      >
        {/* Trigger wraps the label area only */}
        <ThreadListItemPrimitive.Trigger
          style={{ all: "unset", display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}
        >
          <ChatIcon sx={{ fontSize: 13, color: "text.disabled", flexShrink: 0 }} />
          <Typography
            sx={{
              flex: 1,
              fontSize: "12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "text.secondary",
              lineHeight: 1.5,
            }}
          >
<ThreadListItemTitle />
          </Typography>
        </ThreadListItemPrimitive.Trigger>

        {/* Delete — always in the row, hidden until hover */}
        <Tooltip title="Delete" placement="right">
          <ThreadListItemPrimitive.Delete
            style={{ all: "unset" }}
          >
            <Box
              className="delete-btn"
              sx={{
                opacity: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 0.25,
                borderRadius: "4px",
                color: "text.disabled",
                transition: "opacity 0.15s, color 0.15s",
                "&:hover": { color: "error.main" },
              }}
            >
              <DeleteIcon sx={{ fontSize: 13 }} />
            </Box>
          </ThreadListItemPrimitive.Delete>
        </Tooltip>
      </Box>
    </ThreadListItemPrimitive.Root>
  );
}

// ── Inner sidebar content (shared between desktop + mobile drawer) ────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.paper",
        overflow: "hidden",
        width: { xs: 240, md: "100%" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.25,
          py: 1,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", fontSize: "10px" }}
        >
          CHATS
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="New chat" placement="right">
            <ThreadListPrimitive.New
              style={{
                all: "unset",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "6px",
              }}
            >
              <AddIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </ThreadListPrimitive.New>
          </Tooltip>

          {/* Close button — mobile drawer only */}
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Thread list */}
      <Box
        component={ThreadListPrimitive.Root}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 0.75,
          py: 0.75,
          "&::-webkit-scrollbar": { width: "3px" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
        }}
      >
        <ThreadListPrimitive.Items>
          {() => <ThreadItem />}
        </ThreadListPrimitive.Items>
      </Box>

      <Divider />

      <Box sx={{ px: 1.25, py: 1, flexShrink: 0 }}>
        <Typography variant="caption" sx={{ fontSize: "10px", color: "text.disabled", lineHeight: 1.3 }}>
          Session only — cleared on refresh.
        </Typography>
      </Box>
    </Box>
  );
}

// ── Desktop sidebar ──────────────────────────────────────────────────────────
export function ThreadSidebar() {
  return (
    <Box sx={{ height: "100%", borderRight: 1, borderColor: "divider", overflow: "hidden" }}>
      <SidebarContent />
    </Box>
  );
}

// ── Mobile: toggle button + drawer ──────────────────────────────────────────
export function MobileThreadDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Chat threads">
        <IconButton size="small" onClick={() => setOpen(true)} sx={{ flexShrink: 0 }}>
          <ThreadsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { bgcolor: "background.paper" } }}
      >
        <SidebarContent onClose={() => setOpen(false)} />
      </Drawer>
    </>
  );
}