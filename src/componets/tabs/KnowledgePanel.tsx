"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  Typography,
  Box,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
  Divider,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as UncheckedIcon,
  UploadFile as UploadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Psychology as BrainIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  FolderOpen as FolderIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useKnowledge } from "@/context/KnowledgeContext";
import { MAX_CONTENT_BYTES, MAX_CARDS, byteLengthOf } from "@/libs/knowledgecards/helper";

interface KnowledgePanelProps {
  open: boolean;
  onClose: () => void;
}

interface CardFormState {
  title: string;
  description: string;
  content: string;
}

const EMPTY_FORM: CardFormState = { title: "", description: "", content: "" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTextFile(file: File): boolean {
  return (
    file.type.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md")
  );
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")   // strip extension
    .replace(/[-_]/g, " ")     // dashes/underscores → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

// ── Size bar ─────────────────────────────────────────────────────────────────

function ContentSizeBar({ content }: { content: string }) {
  const bytes = byteLengthOf(content);
  const pct = Math.min(100, (bytes / MAX_CONTENT_BYTES) * 100);
  const over = bytes > MAX_CONTENT_BYTES;
  return (
    <Box sx={{ mt: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={over ? "error" : pct > 80 ? "warning" : "primary"}
        sx={{ borderRadius: 1, height: 4 }}
      />
      <Typography variant="caption" color={over ? "error" : "text.secondary"}>
        {(bytes / 1024).toFixed(1)} KB / 8 KB
      </Typography>
    </Box>
  );
}

// ── Bulk folder import ────────────────────────────────────────────────────────

interface BulkImportResult {
  filename: string;
  status: "imported" | "skipped" | "error";
  reason?: string;
}

function BulkFolderImport({ onDone }: { onDone: () => void }) {
  const { cards, addCard } = useKnowledge();
  const folderRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<BulkImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [showResults, setShowResults] = useState(true);

  const handleFolderSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // reset input so re-selecting the same folder fires again
    e.target.value = "";

    if (files.length === 0) return;

    const textFiles = files.filter(isTextFile);
    if (textFiles.length === 0) {
      setResults([{
        filename: "(folder)",
        status: "error",
        reason: "No .txt or .md files found in the selected folder.",
      }]);
      setDone(true);
      return;
    }

    setImporting(true);
    setDone(false);
    setResults([]);

    const newResults: BulkImportResult[] = [];
    // Track remaining slots as we import
    let slotsLeft = MAX_CARDS - cards.length;

    for (const file of textFiles) {
      if (slotsLeft <= 0) {
        newResults.push({
          filename: file.name,
          status: "skipped",
          reason: `Card limit (${MAX_CARDS}) reached.`,
        });
        continue;
      }

      try {
        const content = await file.text();
        const bytes = byteLengthOf(content);

        if (bytes > MAX_CONTENT_BYTES) {
          newResults.push({
            filename: file.name,
            status: "skipped",
            reason: `File too large (${(bytes / 1024).toFixed(1)} KB > 8 KB limit).`,
          });
          continue;
        }

        const result = await addCard({
          title: titleFromFilename(file.name),
          description: "",
          content: content.trim(),
        });

        if (result.error) {
          newResults.push({ filename: file.name, status: "error", reason: result.error });
        } else {
          newResults.push({ filename: file.name, status: "imported" });
          slotsLeft--;
        }
      } catch (err) {
        newResults.push({
          filename: file.name,
          status: "error",
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }

      // Stream results live
      setResults([...newResults]);
    }

    setImporting(false);
    setDone(true);
  };

  const imported = results.filter((r) => r.status === "imported").length;
  const skipped  = results.filter((r) => r.status === "skipped").length;
  const errors   = results.filter((r) => r.status === "error").length;

  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "info.main",
        borderRadius: 2,
        p: 2,
        mb: 2,
        bgcolor: "action.hover",
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <FolderIcon color="info" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          Bulk Import from Folder
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
        Select a folder — all <strong>.txt</strong> and <strong>.md</strong> files inside will be
        imported as individual knowledge cards. Files over 8 KB are skipped.
      </Typography>

      {/* Hidden folder picker */}
      <input
        ref={folderRef}
        type="file"
        // @ts-ignore — webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        multiple
        style={{ display: "none" }}
        onChange={handleFolderSelect}
      />

      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          color="info"
          startIcon={importing ? <CircularProgress size={14} /> : <FolderIcon />}
          onClick={() => folderRef.current?.click()}
          disabled={importing}
        >
          {importing ? "Importing…" : "Choose Folder"}
        </Button>

        {done && (
          <Typography variant="caption" color="text.secondary">
            {imported} imported · {skipped} skipped · {errors} errors
          </Typography>
        )}

        <Box flex={1} />

        <Button size="small" onClick={onDone} disabled={importing}>
          {done ? "Done" : "Cancel"}
        </Button>
      </Box>

      {/* Live results list */}
      {results.length > 0 && (
        <Box mt={1.5}>
          <Box
            display="flex"
            alignItems="center"
            onClick={() => setShowResults((v) => !v)}
            sx={{ cursor: "pointer", userSelect: "none" }}
          >
            <Typography variant="caption" fontWeight={700} flex={1}>
              Results ({results.length} files)
            </Typography>
            <IconButton size="small" tabIndex={-1}>
              {showResults ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>

          <Collapse in={showResults}>
            <List
              dense
              disablePadding
              sx={{
                maxHeight: 220,
                overflowY: "auto",
                mt: 0.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {results.map((r, i) => (
                <ListItem key={i} sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {r.status === "imported" ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : r.status === "skipped" ? (
                      <FileIcon fontSize="small" color="warning" />
                    ) : (
                      <ErrorIcon fontSize="small" color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="caption" noWrap fontFamily="monospace">
                        {r.filename}
                      </Typography>
                    }
                    secondary={
                      r.reason ? (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {r.reason}
                        </Typography>
                      ) : null
                    }
                  />
                  <Chip
                    label={r.status}
                    size="small"
                    color={
                      r.status === "imported"
                        ? "success"
                        : r.status === "skipped"
                        ? "warning"
                        : "error"
                    }
                    variant="outlined"
                    sx={{ fontSize: "0.6rem", height: 18, ml: 0.5 }}
                  />
                </ListItem>
              ))}
              {importing && (
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CircularProgress size={14} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="caption" color="text.secondary">
                        Processing…
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

// ── Single card add form ──────────────────────────────────────────────────────

function AddCardForm({ onDone }: { onDone: () => void }) {
  const { addCard } = useKnowledge();
  const [form, setForm] = useState<CardFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isTextFile(file)) {
      setError("Only .txt and .md files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setForm((f) => ({
        ...f,
        title: f.title || titleFromFilename(file.name),
        content: text,
      }));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const result = await addCard(form);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setForm(EMPTY_FORM);
      onDone();
    }
  };

  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        mb: 2,
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
        New Knowledge Card
      </Typography>

      <Alert severity="warning" sx={{ mb: 1.5 }}>
        Knowledge cards are stored locally in your browser's storage.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TextField
        label="Title"
        fullWidth
        size="small"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        sx={{ mb: 1.5 }}
        required
      />
      <TextField
        label="Description (optional)"
        fullWidth
        size="small"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        sx={{ mb: 1.5 }}
      />
      <TextField
        label="Content"
        fullWidth
        multiline
        rows={4}
        size="small"
        value={form.content}
        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
        placeholder="Paste text or upload a .txt / .md file…"
        required
      />
      <ContentSizeBar content={form.content} />

      <Box display="flex" gap={1} mt={1.5} alignItems="center">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
        <Button
          size="small"
          startIcon={<UploadIcon />}
          variant="outlined"
          onClick={() => fileRef.current?.click()}
        >
          Import file
        </Button>
        <Box flex={1} />
        <Button size="small" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.title.trim() || !form.content.trim()}
          startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}

// ── Card row ─────────────────────────────────────────────────────────────────

function KnowledgeCardRow({
  card,
}: {
  card: ReturnType<typeof useKnowledge>["cards"][number];
}) {
  const { selectedIds, toggleSelected, updateCard, removeCard } = useKnowledge();
  const isSelected = selectedIds.has(card.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CardFormState>({
    title: card.title,
    description: card.description,
    content: card.content,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await updateCard(card.id, form);
    setSaving(false);
    if (result.error) setError(result.error);
    else setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await removeCard(card.id);
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
        bgcolor: isSelected ? "action.selected" : "background.paper",
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {editing ? (
        <Box>
          <TextField
            label="Title"
            fullWidth
            size="small"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Description"
            fullWidth
            size="small"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Content"
            fullWidth
            multiline
            rows={4}
            size="small"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <ContentSizeBar content={form.content} />
          <Box display="flex" gap={1} mt={1} justifyContent="flex-end">
            <IconButton size="small" onClick={() => setEditing(false)} disabled={saving}>
              <CancelIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleSave} disabled={saving} color="primary">
              {saving ? <CircularProgress size={14} /> : <SaveIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="flex-start" gap={1}>
          <Tooltip title={isSelected ? "Deselect (exclude from context)" : "Select (include in context)"}>
            <IconButton
              size="small"
              onClick={() => toggleSelected(card.id)}
              color={isSelected ? "primary" : "default"}
              sx={{ mt: -0.25, flexShrink: 0 }}
            >
              {isSelected ? <CheckBoxIcon fontSize="small" /> : <UncheckedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {card.title}
              </Typography>
              <Chip
                label={`${(card.contentSize / 1024).toFixed(1)} KB`}
                size="small"
                sx={{ fontSize: "0.65rem", height: 16 }}
              />
            </Box>
            {card.description && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
                noWrap
              >
                {card.description}
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontFamily: "monospace",
                fontSize: "0.7rem",
              }}
            >
              {card.content}
            </Typography>
          </Box>

          <Box display="flex" flexDirection="column" gap={0.5} flexShrink={0}>
            <IconButton size="small" onClick={() => setEditing(true)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={handleDelete} disabled={deleting}>
              {deleting ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

type AddMode = "none" | "single" | "bulk";

export default function KnowledgePanel({ open, onClose }: KnowledgePanelProps) {
  const { cards, selectedIds, isLoading, selectAll, deselectAll } = useKnowledge();
  const [addMode, setAddMode] = useState<AddMode>("none");

  const canAdd = cards.length < MAX_CARDS;
  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <BrainIcon color="primary" />
        <Box flex={1}>
          <Typography variant="h6" component="div" fontWeight={700}>
            Chess Knowledge Cards
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cards.length}/{MAX_CARDS} cards ·{" "}
            <span style={{ fontWeight: 600 }}>{selectedCount} active</span> in context
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Toolbar */}
        <Box display="flex" gap={1} mb={2} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={selectAll}
            disabled={selectedCount === cards.length}
          >
            All
          </Button>
          <Button
            size="small"
            startIcon={<DeselectIcon />}
            onClick={deselectAll}
            disabled={selectedCount === 0}
          >
            None
          </Button>

          <Box flex={1} />

          {/* Bulk import button */}
          <Tooltip title={canAdd ? "Import a folder of .txt/.md files" : `Limit of ${MAX_CARDS} cards reached`}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={() => setAddMode(addMode === "bulk" ? "none" : "bulk")}
                disabled={!canAdd}
                color={addMode === "bulk" ? "primary" : "inherit"}
              >
                Bulk Import
              </Button>
            </span>
          </Tooltip>

          {/* Single add button */}
          <Tooltip title={canAdd ? "Add a knowledge card" : `Limit of ${MAX_CARDS} cards reached`}>
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddMode(addMode === "single" ? "none" : "single")}
                disabled={!canAdd}
              >
                Add Card
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Forms */}
        {addMode === "bulk" && (
          <BulkFolderImport onDone={() => setAddMode("none")} />
        )}
        {addMode === "single" && (
          <AddCardForm onDone={() => setAddMode("none")} />
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Cards list */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : cards.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            py={5}
            gap={1}
            color="text.secondary"
          >
            <BrainIcon sx={{ fontSize: 40, opacity: 0.3 }} />
            <Typography variant="body2">No knowledge cards yet.</Typography>
            <Typography variant="caption" textAlign="center">
              Add individual cards or bulk import a folder of .txt / .md files.
            </Typography>
          </Box>
        ) : (
          cards.map((card) => <KnowledgeCardRow key={card.id} card={card} />)
        )}

        {selectedCount > 0 && (
          <Alert severity="info" icon={<BrainIcon fontSize="small" />} sx={{ mt: 1 }}>
            Agine will have access to {selectedCount} card{selectedCount > 1 ? "s" : ""} from your knowledge cards.
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}