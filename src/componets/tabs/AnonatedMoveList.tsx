"use client";

/**
 * AnnotatedMoveList — Lichess/Chess-Dojo style interactive move list.
 *
 * Features:
 *  - Full variation tree (nested branches rendered inline, indented)
 *  - Click any move to jump to that board position
 *  - Right-click / long-press menu: Add comment, Set NAG, Promote variation,
 *    Delete variation, Set as main line
 *  - Inline comment editor (click pencil icon on a node)
 *  - NAG symbols shown inline (!, !!, ?, ??, ?!, !?)
 *  - Download annotated PGN
 *  - AI-auto-annotate current move
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Chip,
  Stack,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from "@mui/material";
import {
  Comment as CommentIcon,
  Download as DownloadIcon,
  ArrowUpward as PromoteIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ViewList as ViewListIcon,
  Notes as NotesIcon,
} from "@mui/icons-material";

import {
  MoveNode,
  VariationTree,
  NAG,
  findNode,
  setComment,
  setNag,
  deleteVariation,
  promoteVariation,
  treeToPGN,
  pathTo,
} from "@/lib/variationTree";
import { MoveAnalysis, getMoveAnnotation, MoveQuality } from "@/libs/agine/helper";

// ── NAG helpers ──────────────────────────────────────────────────────────────

const NAG_SYMBOLS: Record<string, string> = {
  "!": "!",
  "!!": "‼",
  "?": "?",
  "??": "⁇",
  "?!": "⁈",
  "!?": "⁉",
};

const NAG_COLORS: Record<string, string> = {
  "!": "#4caf50",
  "!!": "#00e676",
  "?": "#ff9800",
  "??": "#f44336",
  "?!": "#ffb74d",
  "!?": "#29b6f6",
};

// ── Review quality → auto-colour ─────────────────────────────────────────────

const REVIEW_QUALITY_COLORS: Record<MoveQuality, string> = {
  Best:        "#81C784",   // green
  "Very Good": "#4FC3F7",   // light blue
  Good:        "#AED581",   // light green
  Dubious:     "#FFB74D",   // amber
  Mistake:     "#FF8A65",   // orange
  Blunder:     "#E57373",   // red
  Book:        "#FFD54F",   // yellow
};

/** Map game-review quality to the NAG that should be auto-applied. */
function qualityToAutoNag(quality: MoveQuality): NAG {
  const raw = getMoveAnnotation(quality);
  // getMoveAnnotation returns "" for Best/VeryGood/Good/Book — keep empty
  return (raw as NAG) ?? "";
}

// ── Types ────────────────────────────────────────────────────────────────────

interface AnnotatedMoveListProps {
  tree: VariationTree;
  onTreeChange: (newTree: VariationTree) => void;
  onNavigate: (fen: string, nodeId: string) => void;
  /** PGN headers for export */
  headers?: Record<string, string>;
  gameResult?: string;
  /** Game-review data used for auto-colour + auto-NAG */
  gameReview?: MoveAnalysis[];
}

// ── Context menu state ───────────────────────────────────────────────────────

interface CtxMenu {
  anchorEl: HTMLElement;
  node: MoveNode;
}

// ── Main component ───────────────────────────────────────────────────────────

const AnnotatedMoveList: React.FC<AnnotatedMoveListProps> = ({
  tree,
  onTreeChange,
  onNavigate,
  headers,
  gameResult,
  gameReview,
}) => {
  // Build a fast fen→MoveAnalysis lookup (currenFen = FEN after the move)
  const reviewByFen = useMemo(() => {
    if (!gameReview || gameReview.length === 0) return new Map<string, MoveAnalysis>();
    const m = new Map<string, MoveAnalysis>();
    for (const r of gameReview) {
      m.set(r.currenFen, r);
    }
    return m;
  }, [gameReview]);

  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [commentDialog, setCommentDialog] = useState<{
    open: boolean;
    node: MoveNode | null;
    text: string;
  }>({ open: false, node: null, text: "" });
  const [nagDialog, setNagDialog] = useState<{
    open: boolean;
    node: MoveNode | null;
  }>({ open: false, node: null });
  const [viewMode, setViewMode] = useState<"inline" | "list">("list");

  const activeMoveRef = useRef<HTMLButtonElement | null>(null);

  // Scroll active move into view whenever cursor changes
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [tree.cursor]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMoveClick = useCallback(
    (node: MoveNode) => {
      onNavigate(node.fen, node.id);
    },
    [onNavigate]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLElement>, node: MoveNode) => {
      e.preventDefault();
      setCtxMenu({ anchorEl: e.currentTarget, node });
    },
    []
  );

  const closeCtxMenu = () => setCtxMenu(null);

  // Comment
  const openCommentDialog = (node: MoveNode) => {
    setCommentDialog({ open: true, node, text: node.comment });
    closeCtxMenu();
  };

  const saveComment = () => {
    if (!commentDialog.node) return;
    onTreeChange(setComment(tree, commentDialog.node.id, commentDialog.text));
    setCommentDialog({ open: false, node: null, text: "" });
  };

  // NAG
  const openNagDialog = (node: MoveNode) => {
    setNagDialog({ open: true, node });
    closeCtxMenu();
  };

  const selectNag = (nag: NAG) => {
    if (!nagDialog.node) return;
    onTreeChange(setNag(tree, nagDialog.node.id, nag));
    setNagDialog({ open: false, node: null });
  };

  // Promote variation
  const handlePromote = (node: MoveNode) => {
    onTreeChange(promoteVariation(tree, node.id));
    closeCtxMenu();
  };

  // Delete variation
  const handleDelete = (node: MoveNode) => {
    onTreeChange(deleteVariation(tree, node.id));
    closeCtxMenu();
  };


  // PGN download
  const handleDownload = useCallback(() => {
    const pgn = treeToPGN(tree, headers);
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "annotated_game.pgn";
    a.click();
    URL.revokeObjectURL(url);
  }, [tree, headers]);

  // ── Renderers ──────────────────────────────────────────────────────────────

  /**
   * Render a single move button with optional NAG + comment indicator.
   * If a game review is available and the node has no user-set NAG, the
   * review quality is used to (a) colour the move token and (b) show an
   * auto-NAG symbol.  A user-assigned NAG always takes precedence.
   */
  const renderMoveBtn = (node: MoveNode, showMoveNum: boolean) => {
    const isActive = node.id === tree.cursor;

    // ── Review lookup for this node ──────────────────────────────────────────
    const reviewData = reviewByFen.get(node.fen);
    const reviewQuality = reviewData?.quality as MoveQuality | undefined;

    // User NAG wins; fall back to auto-NAG from review
    const effectiveNag: NAG = node.nag
      ? node.nag
      : reviewQuality
      ? qualityToAutoNag(reviewQuality)
      : "";

    const nagSym = effectiveNag ? NAG_SYMBOLS[effectiveNag] ?? effectiveNag : "";
    // NAG colour: user NAG → NAG_COLORS, auto → review quality colour
    const nagColor = node.nag
      ? NAG_COLORS[node.nag] ?? "inherit"
      : reviewQuality
      ? REVIEW_QUALITY_COLORS[reviewQuality]
      : "inherit";

    // Move token colour: active overrides, then review quality, then default
    const moveColor = isActive
      ? undefined
      : reviewQuality
      ? REVIEW_QUALITY_COLORS[reviewQuality]
      : "#ccc";

    // Tooltip shows review quality label as reference
    const reviewLabel = reviewQuality
      ? `Agine review: ${reviewQuality}${node.nag ? " (NAG overridden by user)" : ""}`
      : undefined;

    const moveNum = Math.ceil(node.ply / 2);
    const isBlack = node.ply % 2 === 0;

    return (
      <React.Fragment key={node.id}>
        {/* Move number label */}
        {showMoveNum && (
          <Typography
            component="span"
            sx={{
              fontFamily: "monospace",
              fontSize: "12px",
              color: "text.secondary",
              mr: 0.3,
              userSelect: "none",
            }}
          >
            {moveNum}.{isBlack ? ".." : ""}
          </Typography>
        )}

        {/* The move button — wrapped in Tooltip to show Agine review reference */}
        <Tooltip
          title={reviewLabel ?? ""}
          placement="top"
          arrow
          disableHoverListener={!reviewLabel}
        >
          <Button
            ref={isActive ? (activeMoveRef as React.Ref<HTMLButtonElement>) : undefined}
            size="small"
            variant={isActive ? "contained" : "text"}
            onContextMenu={(e) => handleContextMenu(e, node)}
            onClick={() => handleMoveClick(node)}
            sx={{
              minWidth: "auto",
              px: "4px",
              py: "1px",
              mx: "1px",
              height: "22px",
              textTransform: "none",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: isActive ? 700 : 400,
              color: isActive ? undefined : moveColor,
              backgroundColor: isActive
                ? "primary.main"
                : reviewQuality
                ? `${REVIEW_QUALITY_COLORS[reviewQuality]}18`
                : "transparent",
              border: reviewQuality && !isActive
                ? `1px solid ${REVIEW_QUALITY_COLORS[reviewQuality]}55`
                : "1px solid transparent",
              borderRadius: "3px",
              "&:hover": {
                backgroundColor: isActive ? "primary.dark" : "action.hover",
              },
            }}
          >
            {node.san}
            {nagSym && (
              <Typography
                component="span"
                sx={{ ml: "2px", fontSize: "11px", color: nagColor, fontWeight: 700 }}
              >
                {nagSym}
              </Typography>
            )}
            {node.comment && (
              <CommentIcon
                sx={{ ml: "2px", fontSize: "9px", color: "#4FC3F7", mb: "1px" }}
              />
            )}
          </Button>
        </Tooltip>
      </React.Fragment>
    );
  };

  /**
   * Recursively render a move node and all its continuations / variations.
   * `isVariationStart` = true when this is the first node of an alternative branch
   */
  const renderNode = (
    node: MoveNode,
    isVariationStart: boolean = false,
    depth: number = 0
  ): React.ReactNode => {
    const isBlackMove = node.ply % 2 === 0;
    // Show move number before white moves, or at variation start
    const showMoveNum = !isBlackMove || isVariationStart;

    return (
      <React.Fragment key={node.id}>
        {/* The move itself */}
        {renderMoveBtn(node, showMoveNum)}

        {/* Comment block */}
        {node.comment && (
          <Typography
            component="span"
            sx={{
              display: "inline",
              fontSize: "11px",
              color: "text.secondary",
              fontStyle: "italic",
              mx: 1,
            }}
          >
            {node.comment}
          </Typography>
        )}

        {/* Inline sub-variations */}
        {node.variations.map((varNode) => (
          <Box
            key={varNode.id}
            component="span"
            sx={{
              display: "inline-block",
              mx: "3px",
              px: "4px",
              py: "1px",
              borderLeft: `2px solid ${depth === 0 ? "rgba(124,58,237,0.4)" : "rgba(79,195,247,0.4)"}`,
              borderRadius: "0 3px 3px 0",
              backgroundColor: "action.hover",
              verticalAlign: "top",
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: "10px", color: "text.disabled", mr: "2px", fontFamily: "monospace" }}
            >
              (
            </Typography>
            {renderSubVariation(varNode, depth + 1)}
            <Typography
              component="span"
              sx={{ fontSize: "10px", color: "text.disabled", ml: "2px", fontFamily: "monospace" }}
            >
              )
            </Typography>
          </Box>
        ))}

        {/* Main line continuation */}
        {node.next && renderNode(node.next, false, depth)}
      </React.Fragment>
    );
  };

  /** Render a variation branch (first node treated as variation start) */
  const renderSubVariation = (node: MoveNode, depth: number): React.ReactNode => {
    return renderNode(node, true, depth);
  };

  /**
   * List-view renderer: move pairs on rows, with variations indented below.
   */
  const renderListView = (): React.ReactNode => {
    const rows: React.ReactNode[] = [];

    function renderRowNode(node: MoveNode, isVarStart: boolean, depth: number) {
      const isWhite = node.ply % 2 === 1;
      const isBlack = !isWhite;
      const moveNum = Math.ceil(node.ply / 2);
      const showNum = isWhite || isVarStart;

      // White move opens a new row
      if (isWhite) {
        const blackSibling = node.next;

        rows.push(
          <Box
            key={`row-${node.id}`}
            sx={{
              display: "flex",
              alignItems: "center",
              minHeight: "26px",
              pl: depth * 2,
              borderBottom: "1px solid", borderColor: "divider",
              "&:last-child": { borderBottom: "none" },
            }}
          >
            {/* Move number */}
            <Typography
              sx={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: "text.disabled",
                width: "28px",
                textAlign: "right",
                mr: 1,
                flexShrink: 0,
              }}
            >
              {moveNum}.
            </Typography>

            {/* White move */}
            {renderMoveBtn(node, false)}

            {/* Black move (if it's the main line black and NOT a variation) */}
            {blackSibling &&
              blackSibling.ply % 2 === 0 &&
              blackSibling.variations.length === 0
              ? renderMoveBtn(blackSibling, false)
              : null}

            {/* Comment */}
            {node.comment && (
              <Typography sx={{ fontSize: "10px", color: "text.secondary", fontStyle: "italic", ml: 1 }}>
                {node.comment}
              </Typography>
            )}
          </Box>
        );

        // Variations of white move
        node.variations.forEach((v) => {
          renderRowNode(v, true, depth + 1);
        });

        // Continue with black's move (if we didn't already render it above)
        if (blackSibling) {
          if (blackSibling.variations.length > 0) {
            // Black move with variations needs its own handling
            rows.push(
              <Box
                key={`row-b-${blackSibling.id}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: "26px",
                  pl: (depth + 1) * 2,
                  borderBottom: "1px solid",
                }}
              >
                <Box sx={{ width: "28px", mr: 1 }} />
                <Typography sx={{ fontFamily: "monospace", fontSize: "11px", color: "text.disabled", mr: 0.5 }}>
                  {moveNum}...
                </Typography>
                {renderMoveBtn(blackSibling, false)}
                {blackSibling.comment && (
                  <Typography sx={{ fontSize: "10px", color: "text.secondary", fontStyle: "italic", ml: 1 }}>
                    {blackSibling.comment}
                  </Typography>
                )}
              </Box>
            );
            blackSibling.variations.forEach((v) => {
              renderRowNode(v, true, depth + 1);
            });
          }
          // Continue to next pair
          if (blackSibling.next) renderRowNode(blackSibling.next, false, depth);
        }
      } else {
        // Black starting a variation — show with "..."
        rows.push(
          <Box
            key={`row-${node.id}`}
            sx={{
              display: "flex",
              alignItems: "center",
              minHeight: "26px",
              pl: depth * 2,
              borderBottom: "1px solid", borderColor: "divider",
            }}
          >
            <Box sx={{ width: "28px", mr: 1 }} />
            <Typography sx={{ fontFamily: "monospace", fontSize: "11px", color: "text.disabled", mr: 0.5 }}>
              {moveNum}...
            </Typography>
            {renderMoveBtn(node, false)}
            {node.comment && (
              <Typography sx={{ fontSize: "10px", color: "text.secondary", fontStyle: "italic", ml: 1 }}>
                {node.comment}
              </Typography>
            )}
          </Box>
        );
        node.variations.forEach((v) => {
          renderRowNode(v, true, depth + 1);
        });
        if (node.next) renderRowNode(node.next, false, depth);
      }
    }

    if (tree.root.next) {
      renderRowNode(tree.root.next, false, 0);
    }

    if (gameResult) {
      rows.push(
        <Box key="result" sx={{ display: "flex", justifyContent: "center", py: 1, borderTop: "1px solid" }}>
          <Typography sx={{ fontFamily: "monospace", fontSize: "13px", color: "warning.main", fontWeight: 700 }}>
            {gameResult}
          </Typography>
        </Box>
      );
    }

    return rows;
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1,
          py: 0.5,
          borderBottom: "1px solid",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px", fontWeight: 600 }}>
            MOVES
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="list" sx={{ py: 0.3, px: 0.8 }}>
              <Tooltip title="List view">
                <ViewListIcon sx={{ fontSize: 14 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="inline" sx={{ py: 0.3, px: 0.8 }}>
              <Tooltip title="Inline PGN view">
                <NotesIcon sx={{ fontSize: 14 }} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="Download annotated PGN">
            <IconButton size="small" onClick={handleDownload} sx={{ p: 0.5 }}>
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Move tree */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          p: 1,
          "&::-webkit-scrollbar": { width: "5px" },
          "&::-webkit-scrollbar-thumb": { backgroundColor: "action.selected", borderRadius: "3px" },
        }}
      >
        {!tree.root.next ? (
          <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "11px" }}>
            No moves yet. Play a move on the board to begin.
          </Typography>
        ) : viewMode === "inline" ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.2, lineHeight: 1.6 }}>
            {renderNode(tree.root.next)}
            {gameResult && (
              <Typography
                component="span"
                sx={{ fontFamily: "monospace", fontSize: "12px", color: "warning.main", fontWeight: 700, ml: 1 }}
              >
                {gameResult}
              </Typography>
            )}
          </Box>
        ) : (
          <Box>{renderListView()}</Box>
        )}
      </Box>

      {/* Keyboard hint */}
      <Box sx={{ px: 1, py: 0.5, borderTop: 1, borderColor: "divider", flexShrink: 0 }}>
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px" }}>
          Right-click a move to annotate · Variations shown in brackets
        </Typography>
      </Box>

      {/* ── Context menu ── */}
      <Menu
        open={!!ctxMenu}
        anchorEl={ctxMenu?.anchorEl}
        onClose={closeCtxMenu}
        PaperProps={{ sx: { minWidth: 180, bgcolor: "background.paper", border: "1px solid" } }}
      >
        <MenuItem
          dense
          onClick={() => ctxMenu && openCommentDialog(ctxMenu.node)}
          sx={{ fontSize: "13px" }}
        >
          <CommentIcon sx={{ fontSize: 16, mr: 1, color: "#4FC3F7" }} />
          Add / Edit Comment
        </MenuItem>
        <MenuItem
          dense
          onClick={() => ctxMenu && openNagDialog(ctxMenu.node)}
          sx={{ fontSize: "13px" }}
        >
          <EditIcon sx={{ fontSize: 16, mr: 1, color: "#ffb74d" }} />
          Set Annotation Symbol
        </MenuItem>
        <Divider sx={{ borderColor: "#333" }} />
        {ctxMenu?.node.parent?.variations.includes(ctxMenu.node) && (
          <MenuItem
            dense
            onClick={() => ctxMenu && handlePromote(ctxMenu.node)}
            sx={{ fontSize: "13px" }}
          >
            <PromoteIcon sx={{ fontSize: 16, mr: 1, color: "#4caf50" }} />
            Promote to Main Line
          </MenuItem>
        )}
        <MenuItem
          dense
          onClick={() => ctxMenu && handleDelete(ctxMenu.node)}
          sx={{ fontSize: "13px", color: "#f44336" }}
        >
          <DeleteIcon sx={{ fontSize: 16, mr: 1 }} />
          Delete Variation
        </MenuItem>
      </Menu>

      {/* ── Comment dialog ── */}
      <Dialog
        open={commentDialog.open}
        onClose={() => setCommentDialog({ open: false, node: null, text: "" })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "background.paper" } }}
      >
        <DialogTitle sx={{ fontSize: "14px" }}>
          Comment on{" "}
          <Typography component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
            {commentDialog.node?.san}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={commentDialog.text}
            onChange={(e) => setCommentDialog((s) => ({ ...s, text: e.target.value }))}
            placeholder="Your thoughts on this move..."
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": { color: "#ccc", "& fieldset": { borderColor: "#444" } },
              "& .MuiInputLabel-root": { color: "text.secondary" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCommentDialog({ open: false, node: null, text: "" })}
            sx={{ color: "text.disabled" }}
          >
            Cancel
          </Button>
          <Button onClick={saveComment} sx={{ color: "#4FC3F7" }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── NAG picker dialog ── */}
      <Dialog
        open={nagDialog.open}
        onClose={() => setNagDialog({ open: false, node: null })}
        PaperProps={{ sx: { bgcolor: "background.paper", minWidth: 280 } }}
      >
        <DialogTitle sx={{ fontSize: "14px" }}>Annotation Symbol</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            {(["", "!", "!!", "?", "??", "?!", "!?"] as NAG[]).map((nag) => (
              <Button
                key={nag || "none"}
                variant={nagDialog.node?.nag === nag ? "contained" : "outlined"}
                size="small"
                onClick={() => selectNag(nag)}
                sx={{
                  minWidth: 48,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: nag ? NAG_COLORS[nag] : "#666",
                  borderColor: nag ? NAG_COLORS[nag] + "88" : "#444",
                  backgroundColor: nagDialog.node?.nag === nag ? (NAG_COLORS[nag] ?? "#555") + "33" : "transparent",
                }}
              >
                {nag ? NAG_SYMBOLS[nag] : "∅"}
              </Button>
            ))}
          </Box>
          <Box sx={{ mt: 2 }}>
            {Object.entries(NAG_SYMBOLS).map(([key, sym]) => (
              <Typography key={key} variant="caption" sx={{ display: "block", color: "text.disabled", fontSize: "10px" }}>
                {sym} = {key}
              </Typography>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AnnotatedMoveList;