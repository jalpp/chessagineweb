export function parsePgnChapters(pgnText: string) {
  const chapterBlocks = pgnText.split(/\n\n(?=\[Event)/);
  return chapterBlocks.map((block) => {
    const title = block.match(/\[ChapterName "(.*)"\]/)?.[1] || "Untitled";
    const url = block.match(/\[ChapterURL "(.*)"\]/)?.[1] || "";
    return { title, url, pgn: block.trim() };
  });
}

// ── NAG number → human-readable symbol ────────────────────────────────────
const NAG_SYMBOLS: Record<number, string> = {
  1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!",
  7: "□", 10: "=", 13: "∞", 14: "⩲", 15: "⩱", 16: "±", 17: "∓",
  18: "+−", 19: "−+", 22: "⊙", 32: "⟳", 36: "→", 40: "↑", 132: "⇆",
  136: "?/!", 138: "⊕", 139: "⊕",
};

export interface ParsedMoveData {
  move: string;
  comment?: string;
  clock?: string;    // [%clk H:MM:SS] – remaining time
  emt?: string;      // [%emt S.s]     – elapsed move time
  eval?: string;     // [%eval +0.34]  – engine evaluation
  nags?: string[];   // e.g. ["!", "?!"]
}

/**
 * Robust PGN mainline parser.
 *
 * Handles the full range of annotated PGN found in the wild:
 *   • Lichess / chess.com clock annotations  [%clk H:MM:SS] / [%clk H:MM:SS.s]
 *   • Elapsed move time                       [%emt S.s]
 *   • Engine evaluation                       [%eval +0.34]
 *   • Board markers / arrows                  [%csl ...] / [%cal ...] (stripped)
 *   • Custom engine annotations               [%dojoEngine ...] (stripped)
 *   • Any unknown [%tag ...] annotation       (stripped silently)
 *   • chess.com %timestamp                    (stripped)
 *   • NAGs  $1–$255  and inline !/?/!!/??/!?/?! suffixes
 *   • RAVs (recursive annotation variations)  – skipped entirely
 *   • Semicolon line comments                 – treated same as { } comments
 *   • Move-number tokens  1. / 1... / 37.     – skipped
 *   • Game termination markers 1-0/0-1/½-½/*  – skipped
 *
 * Only mainline moves are returned; variations are ignored.
 */
export function extractMovesWithComments(pgn: string): ParsedMoveData[] {
  // Strip PGN tag headers [Key "Value"]
  const strippedHeaders = pgn.replace(/\[\w+\s+"[^"]*"\]\s*/g, "");

  // Tokenise: brace comments, semicolons, everything else (no nesting in PGN)
  const tokenRegex = /(\{[^}]*\})|(;[^\n]*)|(\S+)/g;
  const tokens = [...strippedHeaders.matchAll(tokenRegex)].map((m) => m[0]);

  const result: ParsedMoveData[] = [];
  let depth = 0; // RAV nesting depth; >0 ⟹ inside a variation
  let pendingComment: string | undefined;
  let pendingClock: string | undefined;
  let pendingEmt: string | undefined;
  let pendingEval: string | undefined;
  let pendingNags: string[] = [];

  /** Parse a { ... } comment block, extracting % commands. */
  function parseCommentBlock(raw: string): void {
    // raw is the full token including braces
    let inner = raw.slice(1, -1);

    // Extract [%clk H:MM:SS] or [%clk H:MM:SS.s]
    const clkMatch = inner.match(/\[%clk\s+([\d:]+(?:\.\d+)?)\s*\]/);
    if (clkMatch) pendingClock = clkMatch[1];

    // Extract [%emt S.s]
    const emtMatch = inner.match(/\[%emt\s+([\d:]+(?:\.\d+)?)\s*\]/);
    if (emtMatch) pendingEmt = emtMatch[1];

    // Extract [%eval score]
    const evalMatch = inner.match(/\[%eval\s+([+-]?[\d.]+)\s*\]/);
    if (evalMatch) pendingEval = evalMatch[1];

    // Strip ALL [%tag ...] commands (clk, emt, eval, csl, cal, timestamp, dojoEngine, etc.)
    inner = inner.replace(/\[%\w+[^\]]*\]/g, "").trim();

    // Whatever prose remains is the human comment
    if (inner) {
      pendingComment = pendingComment ? pendingComment + " " + inner : inner;
    }
  }

  /** Strip inline NAG suffixes appended to move tokens (!, ?, !!, ??, !?, ?!) */
  function stripInlineSuffixes(token: string): { clean: string; nags: string[] } {
    const suffixNags: Record<string, string> = {
      "!!": "!!", "??": "??", "!?": "!?", "?!": "?!",
      "!": "!", "?": "?",
    };
    const nags: string[] = [];
    let clean = token;
    // Repeatedly strip known suffix pairs from the right
    let changed = true;
    while (changed) {
      changed = false;
      for (const [suffix, label] of Object.entries(suffixNags)) {
        if (clean.endsWith(suffix)) {
          nags.unshift(label);
          clean = clean.slice(0, -suffix.length);
          changed = true;
          break;
        }
      }
    }
    return { clean, nags };
  }

  /** Flush any accumulated annotation state onto the last pushed move */
  function flush(): void {
    pendingComment = undefined;
    pendingClock   = undefined;
    pendingEmt     = undefined;
    pendingEval    = undefined;
    pendingNags    = [];
  }

  for (const token of tokens) {
    // ── Brace comments ───────────────────────────────────────────────────
    if (token.startsWith("{")) {
      if (depth === 0) parseCommentBlock(token);
      continue;
    }

    // ── Semicolon comments ───────────────────────────────────────────────
    if (token.startsWith(";")) {
      if (depth === 0) {
        const prose = token.slice(1).trim();
        if (prose) pendingComment = pendingComment ? pendingComment + " " + prose : prose;
      }
      continue;
    }

    // ── RAV open/close ───────────────────────────────────────────────────
    if (token === "(") { depth++; continue; }
    if (token === ")") { if (depth > 0) depth--; continue; }

    // Skip everything inside a variation
    if (depth > 0) continue;

    // ── NAG tokens  $N ──────────────────────────────────────────────────
    if (/^\$\d+$/.test(token)) {
      const n = parseInt(token.slice(1));
      const sym = NAG_SYMBOLS[n];
      if (sym) pendingNags.push(sym);
      continue;
    }

    // ── Game termination tokens ──────────────────────────────────────────
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;

    // ── Move-number tokens  e.g. "1." "1..." "37." ──────────────────────
    if (/^\d+\.+$/.test(token)) continue;

    // ── Move token (SAN + optional inline suffixes) ──────────────────────
    // SAN characters: piece letters, file a-h, rank 1-8, x, +, #, =, O, -
    // We also need to tolerate suffixes !, ?, !!, ??, !?, ?! immediately attached.
    if (/^[a-hRNBQKO0-9][a-hRNBQKO0-9+#=x\-!?]*$/.test(token)) {
      const { clean: move, nags: inlineNags } = stripInlineSuffixes(token);

      // Validate that the cleaned move still looks like SAN
      if (!/^[a-hRNBQKO0-9][a-hRNBQKO0-9+#=x\-]*$/.test(move)) continue;

      const allNags = [...pendingNags, ...inlineNags];

      result.push({
        move,
        comment:  pendingComment,
        clock:    pendingClock,
        emt:      pendingEmt,
        eval:     pendingEval,
        nags:     allNags.length > 0 ? allNags : undefined,
      });

      flush();
      continue;
    }
  }

  return result;
}

export function extractGameInfo(pgn: string) {
  const info: Record<string, string> = {};
  const lines = pgn.split("\n");

  for (const line of lines) {
    const match = line.match(/\[(\w+)\s+"(.*)"\]/);
    if (match) {
      info[match[1]] = match[2];
    }
  }

  return info;
}

export function getValidGameId(url: string): string {
  if (!url) return "";

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const gameIdMatch = pathname.match(/^\/([a-zA-Z0-9]{8,12})(?:\/|$)/);

    if (gameIdMatch) {
      let gameId = gameIdMatch[1];
      if (gameId.length > 8) {
        gameId = gameId.substring(0, 8);
      }
      return gameId;
    }

    return "";
  } catch (error) {
    console.log(error);
    const parts = url.split("/");
    if (parts.length >= 4) {
      const gameId = parts[3];
      const cleanGameId = gameId.split(/[?#]/)[0];
      return cleanGameId.substring(0, 8);
    }

    return "";
  }
}

export async function fetchLichessGame(gameId: string): Promise<string> {
  const response = await fetch(`https://lichess.org/game/export/${gameId}`, {
    headers: {
      Accept: "application/x-chess-pgn",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch game: ${response.status} ${response.statusText}`
    );
  }

  const pgnText = await response.text();

  if (!pgnText || pgnText.trim() === "") {
    throw new Error("Empty PGN received from Lichess");
  }

  return pgnText;
}