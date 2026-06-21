/**
 * @file study.ts
 * @description Exports an Agine Analyzer puzzle pack to Lichess studies.
 *
 * Lichess's only programmatic way to add positions to a study is
 * `POST /api/study/{studyId}/import-pgn` (requires the `study:write` OAuth
 * scope) — it imports one chapter per PGN game, and a study can hold at
 * most 64 chapters. There is currently no public endpoint to create a
 * brand-new study, so the caller must point each batch at a study they
 * already own (an empty one created via https://lichess.org/study works
 * fine — see `LICHESS_NEW_STUDY_URL`).
 *
 * This module turns each verified puzzle (a {@link KeyPosition}) into a
 * single-game PGN "chapter": the pre-blunder FEN as the starting position,
 * plus the verified best move as the chapter's only mainline move, so
 * opening the chapter on Lichess shows the puzzle with the solution one
 * click away. Packs are split into batches of `STUDY_CHAPTER_CHUNK_SIZE`
 * (60) chapters each, safely under Lichess's 64-chapter ceiling, so a
 * 200-puzzle pack becomes up to four studies.
 *
 * Reference: https://lichess.org/api#tag/Studies/operation/apiStudyImportPGN
 */

import { Chess, type Square } from "chess.js";
import type { KeyPosition } from "@/libs/batchreview/types";
import { MAX_PUZZLE_PACK_SIZE } from "@/libs/batchreview/types";

const LICHESS_BASE = "https://lichess.org";

/** Where to send a user with no Lichess study to import into yet. */
export const LICHESS_NEW_STUDY_URL = "https://lichess.org/study";

/**
 * Chapters per study batch. Lichess hard-caps a study at 64 chapters
 * (confirmed by the official `berserk` client's `import_pgn` docs), so 60
 * leaves headroom for the study's own "Chapter X" placeholder or a manual
 * addition without tripping the limit.
 */
export const STUDY_CHAPTER_CHUNK_SIZE = 60;

/** Lichess's hard ceiling on chapters in a single study. */
export const STUDY_MAX_CHAPTERS = 64;

// ─── PGN building ───────────────────────────────────────────────────────────

/** Strips characters that would break PGN tag-pair quoting. */
function pgnEscape(value: string): string {
  return value.replace(/["\\]/g, "");
}

/**
 * Resolves a puzzle's stored best move to a SAN string playable from its
 * FEN. `KeyPosition.bestMove` is already validated SAN by the time it
 * reaches the puzzle pack (see useBatchReview's `validatePuzzleCandidates`),
 * but this also accepts UCI defensively in case the position is built
 * from unvalidated data.
 */
function resolveBestMoveSan(fen: string, bestMove?: string): string | null {
  if (!bestMove) return null;

  try {
    const move = new Chess(fen).move(bestMove);
    if (move) return move.san;
  } catch {
    // Not parseable as SAN — fall through to the UCI shape below
  }

  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(bestMove)) {
    try {
      const move = new Chess(fen).move({
        from: bestMove.slice(0, 2) as Square,
        to: bestMove.slice(2, 4) as Square,
        promotion: bestMove.slice(4) || undefined,
      });
      if (move) return move.san;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Builds a single-game PGN "chapter" for one verified puzzle.
 *
 * Lichess names an imported chapter "<White> - <Black>" when both tags are
 * present, so the puzzle's quality/rank and win-rate drop are encoded in
 * those tags to double as a readable chapter title. The `Site` tag points
 * back at the source Lichess game so the chapter links to it.
 *
 * @param puzzle        - The verified puzzle (pre-move FEN + best move)
 * @param indexInPack   - 1-based position of this puzzle within the full pack
 */
export function buildPuzzleChapterPgn(
  puzzle: KeyPosition,
  indexInPack: number
): string {
  const san = resolveBestMoveSan(puzzle.fen, puzzle.bestMove);
  const today = new Date();
  const pgnDate = `${today.getFullYear()}.${String(
    today.getMonth() + 1
  ).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const tags = [
    `[Event "Agine Puzzle Pack"]`,
    `[Site "https://lichess.org/${puzzle.gameId}"]`,
    `[Date "${pgnDate}"]`,
    `[White "${indexInPack}. ${pgnEscape(puzzle.quality)}"]`,
    `[Black "${puzzle.winRateDrop}% win rate lost"]`,
    `[Result "*"]`,
    `[Variant "Standard"]`,
    `[SetUp "1"]`,
    `[FEN "${puzzle.fen}"]`,
  ].join("\n");

  const comment = `{ ${pgnEscape(puzzle.playedSan)} was played in the game here, losing ${puzzle.winRateDrop}% win rate. Find the engine's move. }`;
  const movetext = san
    ? `${puzzle.moveLabel} ${san} ${comment} *`
    : `${comment} *`;

  return `${tags}\n\n${movetext}\n`;
}

// ─── Batching ───────────────────────────────────────────────────────────────

/** One Lichess-study-sized slice of a puzzle pack. */
export interface StudyBatch {
  /** 1-based batch number. */
  batchNumber: number;
  /** Human label, e.g. "Puzzles 1–60". */
  label: string;
  /** 1-based index of this batch's first puzzle within the full pack. */
  startIndex: number;
  puzzles: KeyPosition[];
}

/**
 * Splits a puzzle pack into Lichess-study-sized batches.
 *
 * Caps the pack at MAX_PUZZLE_PACK_SIZE (200) puzzles, then chunks it into
 * groups of `chunkSize` (default STUDY_CHAPTER_CHUNK_SIZE = 60) so each
 * batch fits comfortably under Lichess's 64-chapter-per-study limit.
 */
export function buildStudyBatches(
  keyPositions: KeyPosition[],
  chunkSize: number = STUDY_CHAPTER_CHUNK_SIZE
): StudyBatch[] {
  const capped = keyPositions.slice(0, MAX_PUZZLE_PACK_SIZE);
  const batches: StudyBatch[] = [];

  for (let i = 0; i < capped.length; i += chunkSize) {
    const slice = capped.slice(i, i + chunkSize);
    const start = i + 1;
    const end = i + slice.length;
    batches.push({
      batchNumber: batches.length + 1,
      label: start === end ? `Puzzle ${start}` : `Puzzles ${start}–${end}`,
      startIndex: start,
      puzzles: slice,
    });
  }

  return batches;
}

/** Joins a batch's puzzles into the multi-game PGN text Lichess expects. */
export function buildBatchPgn(batch: StudyBatch): string {
  return batch.puzzles
    .map((puzzle, i) => buildPuzzleChapterPgn(puzzle, batch.startIndex + i))
    .join("\n\n");
}

// ─── Lichess API ────────────────────────────────────────────────────────────

/** Lichess's StudyUserSelection enum — who gets a given permission. */
export type StudyUserSelection =
  | "nobody"
  | "owner"
  | "contributor"
  | "member"
  | "everyone";

export type StudyVisibility = "public" | "unlisted" | "private";

export interface CreatedStudy {
  id: string;
}

/**
 * Creates a brand-new Lichess study via `POST /api/study` — confirmed live
 * on the current API docs (https://lichess.org/api#tag/Studies/POST/api/study),
 * even though it predates the public OpenAPI spec snapshots and isn't yet
 * wrapped by the official `berserk` client. Requires `study:write`.
 *
 * Lichess caps this at 30 new studies per account per day. A 200-puzzle
 * pack needs at most MAX_PUZZLE_PACK_SIZE / STUDY_CHAPTER_CHUNK_SIZE = 4,
 * comfortably under that limit.
 *
 * Defaults lock the study down to the owner (no outside cloning or chat)
 * but leave computer analysis and the opening explorer enabled for the
 * owner, since these packs are meant to be explored further afterwards.
 */
export async function createStudy(
  token: string,
  name: string,
  visibility: StudyVisibility = "unlisted"
): Promise<CreatedStudy> {
  const body = new URLSearchParams({
    name,
    visibility,
    chat: "nobody",
    cloneable: "nobody",
    shareable: "owner",
    computer: "owner",
    explorer: "owner",
  });

  const res = await fetch(`${LICHESS_BASE}/api/study`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to create Lichess study (${res.status}): ${text}`);
  }

  return res.json();
}

/** Suggests a readable study name for a batch, e.g. for a pre-filled field. */
export function suggestStudyName(
  batch: StudyBatch,
  totalBatches: number
): string {
  return totalBatches === 1
    ? "Agine Puzzle Pack"
    : `Agine Puzzle Pack ${batch.batchNumber}/${totalBatches} — ${batch.label}`;
}

/** One chapter created by an import-pgn call. */
export interface ImportedChapter {
  id: string;
  name: string;
}

/**
 * Imports a batch's PGN into an existing Lichess study, creating one new
 * chapter per puzzle.
 *
 * @param token   - Lichess OAuth token with the `study:write` scope
 * @param studyId - Target study's 8-character ID (owned or contributed to)
 * @param pgn     - Multi-game PGN text, e.g. from {@link buildBatchPgn}
 * @throws Error with the Lichess response body when the import is rejected
 *   (insufficient scope, missing/forbidden study, or chapter cap exceeded)
 */
export async function importPgnToStudy(
  token: string,
  studyId: string,
  pgn: string
): Promise<ImportedChapter[]> {
  const body = new URLSearchParams({
    pgn,
    orientation: "white",
    variant: "standard",
  });

  const res = await fetch(
    `${LICHESS_BASE}/api/study/${studyId}/import-pgn`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Lichess import failed (${res.status}): ${text}`);
  }

  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    // Import succeeded even if the response body wasn't parseable JSON
    return [];
  }
}

/** Minimal metadata for one of the user's existing Lichess studies. */
export interface LichessStudySummary {
  id: string;
  name: string;
}

/**
 * Lists the authenticated user's own Lichess studies (NDJSON endpoint), so
 * the save dialog can offer a "pick an existing study" shortcut instead of
 * requiring everyone to paste a study URL.
 *
 * @param token    - Lichess OAuth token (study:read scope sees private studies too)
 * @param username - The connected Lichess username
 */
export async function fetchUserStudies(
  token: string,
  username: string
): Promise<LichessStudySummary[]> {
  const res = await fetch(`${LICHESS_BASE}/api/study/by/${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/x-ndjson",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to list Lichess studies: ${res.status}`);
  }

  const text = await res.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const obj = JSON.parse(line) as { id?: string; name?: string };
        return obj.id && obj.name ? { id: obj.id, name: obj.name } : null;
      } catch {
        return null;
      }
    })
    .filter((s): s is LichessStudySummary => s !== null);
}

/**
 * Extracts an 8-character Lichess study ID from either a bare ID or a
 * full study URL (e.g. pasted from the browser address bar).
 */
export function parseStudyId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const idPattern = /^[A-Za-z0-9]{8}$/;
  if (idPattern.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const studyIndex = parts.indexOf("study");
    const candidate = studyIndex >= 0 ? parts[studyIndex + 1] : undefined;
    return candidate && idPattern.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
