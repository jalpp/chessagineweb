/**
 * @file analysis.ts
 * @description Pure analysis and aggregation logic for the batch review feature.
 *
 * All functions here are side-effect free — they take downloaded games plus
 * per-ply win rates and produce summaries, opening stats and key positions.
 * Engine / network I/O lives in useBatchReview and api.ts.
 *
 * Win-rate conventions follow @/libs/game/gamereview:
 * - Win rates are computed from White's perspective via centipawnToWinRate
 * - The mover's perspective is `100 - whiteWinRate` for Black, matching
 *   the convention already used by useGameReview.
 */

import { Chess } from "chess.js";
import { MoveQuality } from "@/libs/agine/helper";
import {
  centipawnToWinRate,
  mateToWinRate,
  getMoveBasicClassification,
} from "@/libs/game/gamereview";
import type {
  BatchGame,
  BatchReviewResult,
  GameOutcome,
  GameSummary,
  KeyPosition,
  LichessEval,
  OpeningStat,
} from "./types";

/** All quality buckets, used to build zeroed counters. */
const QUALITY_KEYS: MoveQuality[] = [
  "Best",
  "Very Good",
  "Good",
  "Dubious",
  "Mistake",
  "Blunder",
  "Book",
];

/** @returns A zeroed quality counter record. */
export function emptyQualityCounts(): Record<MoveQuality, number> {
  return QUALITY_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Record<MoveQuality, number>
  );
}

/**
 * Determines which color the reviewed user played in a game.
 * @returns "white" | "black", or undefined when the username matches neither side
 */
export function getUserColor(
  game: BatchGame,
  username: string
): "white" | "black" | undefined {
  const target = username.toLowerCase();
  if (game.players.white.user?.id === target) return "white";
  if (game.players.black.user?.id === target) return "black";
  return undefined;
}

/** @returns The game outcome from the given color's point of view. */
export function getOutcome(game: BatchGame, color: "white" | "black"): GameOutcome {
  if (!game.winner) return "draw";
  return game.winner === color ? "win" : "loss";
}

/**
 * Converts a single Lichess eval entry to a White-perspective win rate.
 * Mate scores use mateToWinRate so they don't distort averages.
 */
function lichessEvalToWinRate(entry: LichessEval): number {
  if (entry.mate !== undefined) return mateToWinRate(entry.mate);
  if (entry.eval !== undefined) return centipawnToWinRate(entry.eval);
  return 50;
}

/**
 * Builds the per-position win-rate array for a Lichess-analyzed game.
 * Index 0 is the starting position; index i+1 is the position after ply i.
 */
export function winRatesFromLichessEvals(evals: LichessEval[]): number[] {
  const rates = [centipawnToWinRate(0)];
  for (const entry of evals) rates.push(lichessEvalToWinRate(entry));
  return rates;
}

/**
 * Lichess-style per-move accuracy from a win-rate loss.
 * @param winRateDrop - Win-rate points lost by the mover (>= 0)
 * @returns Accuracy in [0, 100]
 */
export function moveAccuracyFromDrop(winRateDrop: number): number {
  // Non-finite drops (missing evals) must not poison averages with NaN
  if (!Number.isFinite(winRateDrop)) return 100;
  const raw = 103.1668 * Math.exp(-0.04354 * Math.max(0, winRateDrop)) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

/** Internal classification output for one game. */
interface ClassifiedGame {
  qualityCounts: Record<MoveQuality, number>;
  accuracy: number;
  keyPositions: KeyPosition[];
}

/**
 * Classifies every move played by the reviewed user in one game.
 *
 * @param game - The downloaded game (moves are replayed with chess.js)
 * @param userColor - The color the user played
 * @param winRates - White-perspective win rates, length = plies + 1
 * @param bookPlies - Number of leading plies treated as opening book
 * @param lichessEvals - When present, Lichess judgments/best moves are reused
 * @returns Quality counts, estimated accuracy and key positions for the user
 */
export function classifyUserMoves(
  game: BatchGame,
  userColor: "white" | "black",
  winRates: number[],
  bookPlies: number,
  lichessEvals?: LichessEval[]
): ClassifiedGame {
  const qualityCounts = emptyQualityCounts();
  const keyPositions: KeyPosition[] = [];
  const accuracies: number[] = [];

  const board = new Chess();
  const sanMoves = game.moves.split(" ").filter(Boolean);
  const userIsWhite = userColor === "white";

  for (let ply = 0; ply < sanMoves.length; ply++) {
    const moverIsWhite = board.turn() === "w";
    const fenBefore = board.fen();
    const moveNumber = board.moveNumber();
    const moveObject = board.move(sanMoves[ply]);
    if (!moveObject) break;

    if (moverIsWhite !== userIsWhite) continue;

    // A move that ends the game in the user's favor is never a mistake —
    // without this, missing/neutral evals after a mating move could register
    // as a huge win-rate drop and flag the checkmate as a blunder.
    if (board.isCheckmate()) {
      qualityCounts["Best"]++;
      accuracies.push(100);
      continue;
    }

    if (ply + 1 >= winRates.length) continue;

    if (ply < bookPlies) {
      qualityCounts["Book"]++;
      accuracies.push(100);
      continue;
    }

    const beforeWhite = winRates[ply];
    const afterWhite = winRates[ply + 1];
    // Skip plies with missing/non-finite evals instead of classifying garbage
    if (!Number.isFinite(beforeWhite) || !Number.isFinite(afterWhite)) continue;
    const moverBefore = moverIsWhite ? beforeWhite : 100 - beforeWhite;
    const moverAfter = moverIsWhite ? afterWhite : 100 - afterWhite;
    const drop = Math.max(0, moverBefore - moverAfter);

    const lichessEntry = lichessEvals?.[ply];
    let quality: MoveQuality;

    if (lichessEntry?.judgment) {
      // Trust the Lichess judgment when the game has server analysis
      quality =
        lichessEntry.judgment.name === "Blunder"
          ? "Blunder"
          : lichessEntry.judgment.name === "Mistake"
          ? "Mistake"
          : "Dubious";
    } else {
      quality = getMoveBasicClassification(moverBefore, moverAfter);
    }

    qualityCounts[quality]++;
    accuracies.push(moveAccuracyFromDrop(drop));

    if (quality === "Blunder" || quality === "Mistake") {
      keyPositions.push({
        gameId: game.id,
        fen: fenBefore,
        plyIndex: ply,
        moveLabel: moverIsWhite ? `${moveNumber}.` : `${moveNumber}...`,
        playedSan: moveObject.san,
        bestMove: lichessEntry?.variation?.split(" ")[0] ?? lichessEntry?.best,
        quality,
        winRateDrop: Math.round(drop),
      });
    }
  }

  const accuracy =
    accuracies.length > 0
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : 100;

  return { qualityCounts, accuracy: Math.round(accuracy * 10) / 10, keyPositions };
}

/**
 * Builds the per-game summary for the reviewed user.
 *
 * @param game - The downloaded game
 * @param userColor - The color the user played
 * @param classified - Output of classifyUserMoves
 * @param evalSource - Where the per-ply evals came from
 */
export function buildGameSummary(
  game: BatchGame,
  userColor: "white" | "black",
  classified: ClassifiedGame,
  evalSource: "lichess" | "local"
): GameSummary {
  const userSide = game.players[userColor];
  const opponentSide = game.players[userColor === "white" ? "black" : "white"];

  // Prefer Lichess-computed accuracy when the game has server analysis;
  // fall back to the local estimate when it is missing or non-finite
  const lichessAccuracy = userSide.analysis?.accuracy;
  const accuracy = Number.isFinite(lichessAccuracy)
    ? (lichessAccuracy as number)
    : classified.accuracy;

  return {
    gameId: game.id,
    userColor,
    outcome: getOutcome(game, userColor),
    speed: game.speed,
    rated: game.rated,
    opponentName:
      opponentSide.user?.name ??
      (opponentSide.aiLevel !== undefined
        ? `Stockfish level ${opponentSide.aiLevel}`
        : "Anonymous"),
    opponentRating: opponentSide.rating,
    userRating: userSide.rating,
    userRatingDiff: userSide.ratingDiff,
    openingEco: game.opening?.eco,
    openingName: game.opening?.name,
    playedAt: game.lastMoveAt,
    qualityCounts: classified.qualityCounts,
    accuracy,
    evalSource,
    keyPositions: classified.keyPositions,
    pgn: game.pgn,
  };
}

/**
 * Aggregates per-game summaries into the final batch result.
 * Opening stats are grouped by ECO + base opening name (variation stripped).
 */
export function aggregateBatchResult(
  username: string,
  summaries: GameSummary[]
): BatchReviewResult {
  const record = { wins: 0, draws: 0, losses: 0 };
  const recordAsWhite = { wins: 0, draws: 0, losses: 0 };
  const recordAsBlack = { wins: 0, draws: 0, losses: 0 };
  const totalQualityCounts = emptyQualityCounts();
  const openingMap = new Map<
    string,
    OpeningStat & { accuracySum: number }
  >();
  const keyPositions: KeyPosition[] = [];
  let accuracySum = 0;

  for (const summary of summaries) {
    const bucket =
      summary.outcome === "win" ? "wins" : summary.outcome === "draw" ? "draws" : "losses";
    record[bucket]++;
    (summary.userColor === "white" ? recordAsWhite : recordAsBlack)[bucket]++;

    for (const key of QUALITY_KEYS) {
      totalQualityCounts[key] += summary.qualityCounts[key];
    }

    accuracySum += Number.isFinite(summary.accuracy) ? summary.accuracy : 0;
    keyPositions.push(...summary.keyPositions);

    const eco = summary.openingEco ?? "?";
    // Group by the base opening name so variations roll up together
    const baseName = (summary.openingName ?? "Unknown opening").split(":")[0].trim();
    const mapKey = `${eco} ${baseName}`;
    const entry =
      openingMap.get(mapKey) ??
      ({
        eco,
        name: baseName,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        scorePercent: 0,
        asWhite: 0,
        asBlack: 0,
        avgAccuracy: 0,
        accuracySum: 0,
      } as OpeningStat & { accuracySum: number });

    entry.games++;
    entry[bucket]++;
    if (summary.userColor === "white") entry.asWhite++;
    else entry.asBlack++;
    entry.accuracySum += summary.accuracy;
    openingMap.set(mapKey, entry);
  }

  const openingStats: OpeningStat[] = Array.from(openingMap.values())
    .map(({ accuracySum: sum, ...stat }) => ({
      ...stat,
      scorePercent: Math.round(((stat.wins + stat.draws * 0.5) / stat.games) * 100),
      avgAccuracy: Math.round((sum / stat.games) * 10) / 10,
    }))
    .sort((a, b) => b.games - a.games);

  // Worst drops first so the most instructive positions surface on top
  keyPositions.sort((a, b) => b.winRateDrop - a.winRateDrop);

  return {
    username,
    generatedAt: Date.now(),
    games: summaries,
    openingStats,
    totalQualityCounts,
    record,
    recordAsWhite,
    recordAsBlack,
    avgAccuracy:
      summaries.length > 0
        ? Math.round((accuracySum / summaries.length) * 10) / 10
        : 0,
    keyPositions,
  };
}
