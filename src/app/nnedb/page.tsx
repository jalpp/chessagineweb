"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Container,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import {
  ExpandMore,
  Psychology as PsychologyIcon,
  Code as CodeIcon,
  ErrorOutline as ErrorIcon,
  Storage as StorageIcon,
  Dataset as DatasetIcon,
} from "@mui/icons-material";


const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box sx={{ position: "relative", mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          overflow: "auto",
          borderRadius: 1,
          bgcolor: "background.default",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{code}</pre>
      </Paper>
      <Button
        size="small"
        onClick={handleCopy}
        sx={{ position: "absolute", top: 8, right: 8, minWidth: "auto", fontSize: "0.75rem" }}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </Box>
  );
};

const MethodBadge = () => (
  <Chip
    label="POST"
    size="small"
    color="primary"
    sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem", borderRadius: 1, mr: 1 }}
  />
);

const ParamRow: React.FC<{
  name: string;
  type: string;
  required?: boolean;
  desc: string;
  values?: string[];
}> = ({ name, type, required, desc, values }) => (
  <TableRow sx={{ "&:last-child td": { border: 0 } }}>
    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem", verticalAlign: "top", color: "text.primary" }}>
      {name}
      {required && (
        <Chip
          label="required"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ ml: 1, fontSize: "0.65rem", height: 18 }}
        />
      )}
    </TableCell>
    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem", verticalAlign: "top", color: "secondary.main" }}>
      {type}
    </TableCell>
    <TableCell sx={{ fontSize: "0.85rem", verticalAlign: "top", color: "text.secondary" }}>
      {desc}
      {values && (
        <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {values.map((v) => (
            <Chip key={v} label={v} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 18 }} />
          ))}
        </Box>
      )}
    </TableCell>
  </TableRow>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 1, mt: 2.5 }}>
    {children}
  </Typography>
);

const tableHeadSx = {
  "& .MuiTableCell-head": {
    bgcolor: "action.hover",
    color: "text.secondary",
    fontWeight: 700,
    fontSize: "0.75rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  "& .MuiTableCell-root": {
    borderBottom: "1px solid",
    borderColor: "divider",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
const NNEDBDocs: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>("endpoint-analyze");
  const toggle = (panel: string) => (_: React.SyntheticEvent, isExp: boolean) =>
    setExpanded(isExp ? panel : false);

  // ── Code examples ──────────────────────────────────────────────────────────
  const analyzeRequestLeela = `POST https://www.chessagine.com/api/nn
Content-Type: application/json

{
  "endpoint": "analyze",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "engine": "leela"
}`;

  const analyzeRequestElite = `{
  "endpoint": "analyze",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "engine": "elite-leela"
}`;

  const analyzeRequestMaia = `{
  "endpoint": "analyze",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "engine": "maia3",
  "rating": 1500
}`;

  const analyzeRequestRawWDL = `{
  "endpoint": "analyze",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "engine": "maia3",
  "rating": 1500,
  "rawWDL": true
}`;

  const analyzeResponse = `{
  "success": true,
  "data": {
    "topMoves": [
      { "move": "c5", "probability": 0.418, "percentage": "42%" },
      { "move": "c6", "probability": 0.176, "percentage": "18%" },
      { "move": "e6", "probability": 0.109, "percentage": "11%" },
      { "move": "e5", "probability": 0.096, "percentage": "10%" },
      { "move": "d5", "probability": 0.074, "percentage": "8%"  }
    ],
    "uciEval": {
      "policy": {
        "c7c5": 0.418,
        "c7c6": 0.176,
        "e7e6": 0.109
        // ... all legal moves
      },
      "value": 0.425,
      "rawWdl": {
        "win":  0.256,
        "draw": 0.339,
        "loss": 0.405
      }
    },
    "HumanEstimateEval":     "-0.82",
    "LeelaZeroEstimateEval": "-0.47",
    "cacheHit": true,
    "_net": "leela"
  }
}`;

  const analyzeResponseRawWDL = `{
  "success": true,
  "data": {
    "topMoves": [
      {
        "move": "c5",
        "probability": 0.418,
        "percentage": "42%",
        "wdl":      { "win": 0.61, "draw": 0.09, "loss": 0.30 },
        "whiteWdl": { "win": 0.61, "draw": 0.09, "loss": 0.30 },
        "blackWdl": { "win": 0.30, "draw": 0.09, "loss": 0.61 }
      },
      {
        "move": "e5",
        "probability": 0.096,
        "percentage": "10%",
        "wdl":      { "win": 0.55, "draw": 0.12, "loss": 0.33 },
        "whiteWdl": { "win": 0.55, "draw": 0.12, "loss": 0.33 },
        "blackWdl": { "win": 0.33, "draw": 0.12, "loss": 0.55 }
      }
      // ... remaining top moves
    ],
    "uciEval": {
      "policy": { "c7c5": 0.418, ... },
      "value": 0.425,
      "rawWdl": {
        "win":  0.256,
        "draw": 0.339,
        "loss": 0.405,
        "whiteWdl": { "win": 0.256, "draw": 0.339, "loss": 0.405 },
        "blackWdl": { "win": 0.405, "draw": 0.339, "loss": 0.256 }
      }
    },
    "HumanEstimateEval":     "-0.82",
    "LeelaZeroEstimateEval": "-0.47",
    "cacheHit": false,
    "_net": "maia3_1500"
  }
}`;

  const batchRequest = `POST https://www.chessagine.com/api/nn
Content-Type: application/json

{
  "endpoint": "batch-maia3",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
}`;

  const batchResponse = `{
  "success": true,
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "totalLevels": 21,
  "results": [
    {
      "rating": 600,
      "analysis": {
        "topMoves": [
          { "move": "e5", "probability": 0.545 },
          { "move": "d5", "probability": 0.142 }
        ],
        "uciEval": { "policy": { "e7e5": 0.545, ... }, "value": 0.49 }
      }
    },
    { "rating": 700,  "analysis": { ... } },
    // 600, 700, 800 ... 2600  (21 entries)
    {
      "rating": 2600,
      "analysis": {
        "topMoves": [
          { "move": "c5", "probability": 0.312 },
          { "move": "e5", "probability": 0.198 }
        ],
        "uciEval": { "policy": { ... }, "value": 0.51 }
      }
    }
  ]
}`;

  const error400 = `{
  "error": "Validation failed",
  "details": ["Invalid FEN string", "engine must be one of: leela, elite-leela, maia3"]
}`;

  const error500 = `{ "error": "Internal server error" }`;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <StorageIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
              NNEDB
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Neural Net Engine Database
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" paragraph sx={{ maxWidth: 720 }}>
          Open NNEDB (Neural Net Engine Database) is ChessAgine's REST gateway for querying chess neural networks. Send a FEN and
          get back move-probability distributions and position evaluations from three distinct
          engines, this database gets build for each new fen request.
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1}>
          {["Leela T1-256", "Elite Leela", "Maia 3"].map((n) => (
            <Chip key={n} label={n} size="small" variant="outlined" color="primary" />
          ))}
        </Box>
      </Paper>

      {/* ── Base URL ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="overline" color="text.secondary" display="block" gutterBottom>
          Base URL
        </Typography>
        <CodeBlock code="https://www.chessagine.com/api/nn" />
        <Alert severity="info">
          All requests must be <strong>POST</strong> with{" "}
          <code>Content-Type: application/json</code>. The <code>endpoint</code> field in the
          body is the router — it is <strong>not</strong> a URL path segment.
        </Alert>
      </Paper>

      {/* ── Supported Engines ────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <PsychologyIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Supported Engines
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small" sx={tableHeadSx}>
            <TableHead>
              <TableRow>
                <TableCell>Engine</TableCell>
                <TableCell>engine value</TableCell>
                <TableCell>rating required</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["Leela T1-256",  '"leela"',       "No",  "Self-play neural net. Strongest pure engine."],
                ["Elite Leela",   '"elite-leela"', "No",  "Trained on 20 M Lichess Elite games (2500–3000 Elo)."],
                ["Maia 3",        '"maia3"',       "Yes", "Human-like play at a specific Elo. Supports 600–2600."],
              ].map(([name, val, ratingReq, notes]) => (
                <TableRow key={name as string}>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{name}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", color: "secondary.main" }}>{val}</TableCell>
                  <TableCell>
                    <Chip
                      label={ratingReq}
                      size="small"
                      color={ratingReq === "Yes" ? "primary" : "default"}
                      variant={ratingReq === "Yes" ? "filled" : "outlined"}
                      sx={{ fontSize: "0.7rem" }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Endpoints heading ─────────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <CodeIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Endpoints
        </Typography>
      </Box>

      {/* ── endpoint: analyze ────────────────────────────────────────────── */}
      <Accordion
        expanded={expanded === "endpoint-analyze"}
        onChange={toggle("endpoint-analyze")}
        sx={{ mb: 2, borderRadius: "12px !important", "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <MethodBadge />
            <Typography fontFamily="monospace" fontWeight={600}>/api/nn</Typography>
            <Chip
              label='endpoint: "analyze"'
              size="small"
              variant="outlined"
              sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Typography color="text.secondary" paragraph>
            Analyze a single chess position with any supported engine. For Maia engines
            (<code>maia3</code>), a <code>rating</code> field is also
            required to target a specific player strength. Pass <code>rawWDL: true</code> to
            receive per-move WDL breakdowns for all top moves.
          </Typography>

          <SectionHeading>Request body</SectionHeading>
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small" sx={tableHeadSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <ParamRow name="endpoint" type="string" required
                  desc='Must be exactly "analyze".' values={['"analyze"']} />
                <ParamRow name="fen" type="string" required
                  desc="Chess position in FEN notation." />
                <ParamRow name="engine" type="string" required
                  desc="Neural network to use."
                  values={['"leela"', '"elite-leela"', '"maia3"']} />
                <ParamRow name="rating" type="number"
                  desc='Target player Elo. Required when engine is "maia3". Must be a multiple of 100 between 600 and 2600.'
                  values={["600", "700", "...", "2600"]} />
                <ParamRow name="rawWDL" type="boolean"
                  desc="When true, each top move includes per-move WDL from the side that played it (wdl), from white's perspective (whiteWdl), and from black's perspective (blackWdl). Computed by running one additional batch inference on the resulting positions. Omit or set false for lower latency." />
              </TableBody>
            </Table>
          </TableContainer>

          <SectionHeading>Example — Leela T1-256</SectionHeading>
          <CodeBlock code={analyzeRequestLeela} />

          <SectionHeading>Example — Elite Leela</SectionHeading>
          <CodeBlock code={analyzeRequestElite} />

          <SectionHeading>Example — Maia 3 at 1500</SectionHeading>
          <CodeBlock code={analyzeRequestMaia} />

          <SectionHeading>Example — Maia 3 at 1500 with rawWDL</SectionHeading>
          <CodeBlock code={analyzeRequestRawWDL} />

          <SectionHeading>Response — 200 OK (default)</SectionHeading>
          <CodeBlock code={analyzeResponse} />

          <SectionHeading>Response — 200 OK (rawWDL: true)</SectionHeading>
          <CodeBlock code={analyzeResponseRawWDL} />

          <SectionHeading>Response fields</SectionHeading>
          <TableContainer>
            <Table size="small" sx={tableHeadSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <ParamRow name="data.topMoves" type="TopMove[]"
                  desc="Top 5 moves sorted by descending probability. Each entry: move (SAN), probability (0–1), percentage (string)." />
                <ParamRow name="data.topMoves[n].wdl" type="SideWdl"
                  desc="Present when rawWDL: true. WDL from the perspective of the side that played this move (win = good for the moving side). Computed by evaluating the resulting position after the move." />
                <ParamRow name="data.topMoves[n].whiteWdl" type="SideWdl"
                  desc="Present when rawWDL: true. WDL expressed from white's perspective after this move is played (win = white wins), regardless of who moved." />
                <ParamRow name="data.topMoves[n].blackWdl" type="SideWdl"
                  desc="Present when rawWDL: true. WDL expressed from black's perspective after this move is played (win = black wins). Mirror of whiteWdl." />
                <ParamRow name="data.uciEval.policy" type="Record<string, number>"
                  desc="Full policy vector keyed by UCI move strings (e.g. 'e2e4'). Covers every legal move." />
                <ParamRow name="data.uciEval.value" type="number"
                  desc="Win probability for the side to move (0–1). 0.5 = equal." />
                <ParamRow name="data.uciEval.rawWdl" type="RawWdl"
                  desc="Position-level WDL from the value head. win + draw + loss = 1. Always white-relative (win = white wins)." />
                <ParamRow name="data.uciEval.rawWdl.whiteWdl" type="SideWdl"
                  desc="Present when rawWDL: true. WDL from white's perspective. Identical to the top-level win/draw/loss fields." />
                <ParamRow name="data.uciEval.rawWdl.blackWdl" type="SideWdl"
                  desc="Present when rawWDL: true. WDL from black's perspective. win and loss are swapped relative to whiteWdl." />
                <ParamRow name="data.HumanEstimateEval" type="string"
                  desc="Centipawn estimate calibrated to human-game outcomes. Negative = Black is better." />
                <ParamRow name="data.LeelaZeroEstimateEval" type="string"
                  desc="Centipawn estimate derived from from lc0 centipawn to eval formula, non Leela nets like maia can also have lc0 eval." />
                <ParamRow name="data.cacheHit" type="boolean"
                  desc="True when the result was served from cache." />
                <ParamRow name="data._net" type="string"
                  desc="Identifies which network produced this result." />
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* ── endpoint: batch-maia3 ────────────────────────────────────────── */}
      <Accordion
        expanded={expanded === "endpoint-batch"}
        onChange={toggle("endpoint-batch")}
        sx={{ mb: 4, borderRadius: "12px !important", "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <MethodBadge />
            <Typography fontFamily="monospace" fontWeight={600}>/api/nn</Typography>
            <Chip
              label='endpoint: "batch-maia3"'
              size="small"
              variant="outlined"
              sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Typography color="text.secondary" paragraph>
            Analyze a position across <strong>all 21 Maia 3 rating levels simultaneously</strong>{" "}
            (600–2600 in 100-Elo steps). Returns one response with results for every level —
            useful for understanding how move preferences shift with player strength.
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <code>rawWDL</code> is not supported for this endpoint. Per-move WDL is only available
            via the <code>analyze</code> endpoint.
          </Alert>

          <SectionHeading>Request body</SectionHeading>
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small" sx={tableHeadSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <ParamRow name="endpoint" type="string" required
                  desc='Must be exactly "batch-maia3".' values={['"batch-maia3"']} />
                <ParamRow name="fen" type="string" required
                  desc="Chess position in FEN notation." />
              </TableBody>
            </Table>
          </TableContainer>

          <SectionHeading>Example request</SectionHeading>
          <CodeBlock code={batchRequest} />

          <SectionHeading>Response — 200 OK</SectionHeading>
          <CodeBlock code={batchResponse} />

          <SectionHeading>Response fields</SectionHeading>
          <TableContainer>
            <Table size="small" sx={tableHeadSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <ParamRow name="success" type="boolean" desc="true on a successful response." />
                <ParamRow name="fen" type="string" desc="The FEN that was analyzed, echoed back." />
                <ParamRow name="totalLevels" type="number" desc="Number of rating levels in results (always 21)." />
                <ParamRow name="results" type="BatchEntry[]" desc="Array of 21 entries, one per rating level." />
                <ParamRow name="results[n].rating" type="number" desc="Target Elo for this entry (600, 700, … 2600)." />
                <ParamRow name="results[n].analysis.topMoves" type="TopMove[]"
                  desc="Top moves in SAN notation with probability at this rating level." />
                <ParamRow name="results[n].analysis.uciEval" type="UciEval"
                  desc="Full UCI-keyed policy vector and value head at this rating." />
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* ── DB Details ───────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <DatasetIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Database
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          NNEDB is an open, neural net database. Every unique position queried against a given
          engine is stored permanently. the DB grows with community use.
        </Typography>

        <TableContainer sx={{ mb: 3 }}>
          <Table size="small" sx={tableHeadSx}>
            <TableHead>
              <TableRow>
                <TableCell>Concept</TableCell>
                <TableCell>Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["Cache Miss",
                  "If a position has never been queried before, the server runs live neural net inference and stores the result. cacheHit will be false."],
                ["Cache Hit",
                  "If the position was queried before, the stored result is returned immediately without re-running inference. cacheHit will be true."],
                ["_createdAt",
                  "Timestamp of when the entry was first computed and written to the database. Present on cached responses."],
                ["Open access",
                  "Any client can query any position. Results contributed by one user are available to all subsequent callers of the same position."],
              ].map(([concept, detail]) => (
                <TableRow key={concept as string}>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {concept}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="success">
          Querying an uncached position contributes it to NNEDB permanently — benefiting every
          future caller of that position.
        </Alert>
      </Paper>

      {/* ── Rate limits ──────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <ErrorIcon color="warning" />
          <Typography variant="h5" fontWeight={700}>
            Rate limits
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Rate limiting is applied per IP address. Exceeding the
          limit returns a <code>429 Too Many Requests</code> response immediately, the request is
          not queued.
        </Typography>

        <TableContainer sx={{ mb: 3 }}>
          <Table size="small" sx={tableHeadSx}>
            <TableHead>
              <TableRow>
                <TableCell>Parameter</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["Limit",       "60 requests"],
                ["Window",      "60 seconds"],
                ["Scope",       "Per IP address"],
                ["Applies to",  "All endpoints (analyze, batch-maia3)"],
              ].map(([param, value]) => (
                <TableRow key={param as string}>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{param}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <SectionHeading>Response headers</SectionHeading>
        <Typography variant="body2" color="text.secondary" paragraph>
          Every response includes rate limit headers so clients can track their current usage.
        </Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small" sx={tableHeadSx}>
            <TableHead>
              <TableRow>
                <TableCell>Header</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["X-RateLimit-Limit",     "Maximum requests allowed in the window (60)."],
                ["X-RateLimit-Remaining", "Requests remaining in the current window."],
                ["X-RateLimit-Reset",     "Unix timestamp (ms) when the window resets."],
              ].map(([header, desc]) => (
                <TableRow key={header as string}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.83rem", color: "text.primary" }}>{header}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <SectionHeading>429 — rate limit exceeded</SectionHeading>
        <CodeBlock code={`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718123456789

{ "success": false, "error": "Rate limit exceeded" }`} />

        <Alert severity="warning">
          Cache hits count toward the rate limit. If you are hitting 429s regularly, consider
          caching responses client-side, cached positions return in milliseconds and can be
          reused across sessions.
        </Alert>
      </Paper>

      {/* ── Error responses ───────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <ErrorIcon color="error" />
          <Typography variant="h5" fontWeight={700}>
            Error responses
          </Typography>
        </Box>

        <TableContainer sx={{ mb: 3 }}>
          <Table size="small" sx={tableHeadSx}>
            <TableHead>
              <TableRow>
                <TableCell>HTTP status</TableCell>
                <TableCell>Condition</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["400 Bad Request",
                  "FEN is invalid, engine is unrecognised, or rating is missing / out of range for a Maia engine"],
                ["400 Bad Request",
                  'endpoint is missing or not "analyze" / "batch-maia3"'],
                ["500 Internal Error",
                  "Unexpected runtime error in the server or upstream model loader"],
              ].map(([status, condition], i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontFamily: "monospace", color: "error.main", fontSize: "0.83rem" }}>
                    {status}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{condition}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <SectionHeading>400 — validation failure</SectionHeading>
        <CodeBlock code={error400} />

        <SectionHeading>500 — internal error</SectionHeading>
        <CodeBlock code={error500} />
      </Paper>

    </Container>
  );
};

export default NNEDBDocs;