"use server";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { calculateDeep, getBoardState } from "./protocol/state";
import { generateChessAnalysis, getChessEvaluation } from "./fish";
import { searchWebAnswer } from "./search";
import { getKnowledgeBase } from "../agents/knowlegebase";
import {
  getThemeProgression,
  getThemeScores,
  analyzeVariationThemes,
  findCriticalMoments,
  compareVariations,
} from "./protocol/ovp";
import { Color } from "chess.js";
import { PositionPrompter } from "./protocol/positionPrompter";

const fenSchema = z
  .string()
  .regex(
    /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [bw] [KQkq-]+ [a-h][1-8]|[a-h][1-8]|[a-h][1-8]|[a-h][1-8]|- \d+ \d+$/,
    "Invalid FEN format"
  );

const moveSchema = z
  .string()
  .min(2)
  .max(7)
  .describe("Algebraic chess move like 'e4', 'Nf3', 'O-O'");

const colorSchema = z.enum(["w", "b"]).describe("Side to evaluate from");

// ThemeScore schema
const themeScoreSchema = z.object({
  material: z.number(),
  mobility: z.number(),
  space: z.number(),
  positional: z.number(),
  kingSafety: z.number(),
});

// ThemeChange schema
const themeChangeSchema = z.object({
  theme: z.string(),
  initialScore: z.number(),
  finalScore: z.number(),
  change: z.number(),
  percentChange: z.number(),
});

// VariationAnalysis schema
const variationAnalysisSchema = z.object({
  themeChanges: z.array(themeChangeSchema),
  overallChange: z.number(),
  strongestImprovement: themeChangeSchema.nullable(),
  biggestDecline: themeChangeSchema.nullable(),
  moveByMoveScores: z.array(themeScoreSchema),
});

/* ---------------- TOOLS ---------------- */

// 1. Get Theme Scores
export const getThemeScoresTool = createTool({
  id: "get-theme-scores",
  description:
    "Get chess theme scores (material, mobility, space, positional, king safety, tactics, light/dark square) for a given position fen and the side to eval from",
  inputSchema: z.object({
    fen: fenSchema,
    color: colorSchema,
  }),
  outputSchema: themeScoreSchema,
  execute: async ({ context }) => {
    return getThemeScores(context.fen, context.color as Color);
  },
});

// 2. Analyze Variation Themes
export const analyzeVariationThemesTool = createTool({
  id: "analyze-variation-themes",
  description: "Analyze how chess themes change across a sequence of moves",
  inputSchema: z.object({
    rootFen: fenSchema,
    moves: z.array(moveSchema),
    color: colorSchema,
  }),
  outputSchema: variationAnalysisSchema,
  execute: async ({ context }) => {
    return analyzeVariationThemes(
      context.rootFen,
      context.moves,
      context.color as Color
    );
  },
});

// 3. Get Theme Progression
export const getThemeProgressionTool = createTool({
  id: "get-theme-progression",
  description: "Get the progression of a specific chess theme over a variation",
  inputSchema: z.object({
    rootFen: fenSchema,
    moves: z.array(moveSchema),
    color: colorSchema,
    theme: z.enum([
      "material",
      "mobility",
      "space",
      "positional",
      "kingSafety",
    ]),
  }),
  outputSchema: z.array(z.number()),
  execute: async ({ context }) => {
    return getThemeProgression(
      context.rootFen,
      context.moves,
      context.color as Color,
      context.theme
    );
  },
});

// 4. Compare Variations
export const compareVariationsTool = createTool({
  id: "compare-variations",
  description:
    "Compare multiple chess variations and return their theme analyses",
  inputSchema: z.object({
    rootFen: fenSchema,
    variations: z.array(
      z.object({
        name: z.string(),
        moves: z.array(moveSchema),
      })
    ),
    color: colorSchema,
  }),
  outputSchema: z.array(
    z.object({
      name: z.string(),
      analysis: variationAnalysisSchema,
    })
  ),
  execute: async ({ context }) => {
    return compareVariations(
      context.rootFen,
      context.variations,
      context.color as Color
    );
  },
});

// 5. Find Critical Moments
export const findCriticalMomentsTool = createTool({
  id: "find-critical-moments",
  description:
    "Find moves in a chess variation where there are significant theme changes",
  inputSchema: z.object({
    rootFen: fenSchema,
    moves: z.array(moveSchema),
    color: colorSchema,
    threshold: z.number().optional().default(0.5),
  }),
  outputSchema: z.array(
    z.object({
      moveIndex: z.number(),
      move: moveSchema,
      themeChanges: z.array(themeChangeSchema),
    })
  ),
  execute: async ({ context }) => {
    return findCriticalMoments(
      context.rootFen,
      context.moves,
      context.color as Color,
      context.threshold
    );
  },
});

export const searchWeb = createTool({
  id: "search-web",
  description: "search the web for answer for given search query",
  inputSchema: z.object({
    searchQuery: z.string().describe("the query to search the web"),
  }),
  outputSchema: z.object({
    answer: z.string().optional().describe("the answer for the search query"),
  }),
  execute: async ({ context }) => {
    const answer = await searchWebAnswer(context.searchQuery);
    console.log(context.searchQuery);
    console.log(answer);
    return { answer: answer };
  },
});

export const getStockfishAnalysisTool = createTool({
  id: "get-stockfish-",
  description:
    "Analyze a given chess position using Stockfish and provide best move, reasoning, and varition, speech Eval and number Eval",
  inputSchema: z.object({
    fen: fenSchema.describe("FEN string representing the board position"),
    depth: z
      .number()
      .min(12)
      .max(15)
      .describe("Search depth for Stockfish engine"),
  }),
  outputSchema: z.object({
    bestMove: z.string().describe("the best move for current side"),
    reasoning: z
      .string()
      .describe(
        "the board state information in text form, gives valuable reasoning"
      ),
    numberEval: z.number().describe("the engine eval in number form"),
    topLine: z
      .string()
      .describe(
        "The top varation that would play out according to Stockfish in UCI format"
      ),
  }),
  execute: async ({ context }) => {
    const evaluation = await getChessEvaluation(context.fen, context.depth);
    return generateChessAnalysis(evaluation, context.fen);
  },
});

export const getStockfishMoveAnalysisTool = createTool({
  id: "get-stockfish-move-analysis",
  description:
    "Analyze a given chess position after a specific move using Stockfish and provide best move, reasoning, variation, speech eval, and number eval.",
  inputSchema: z.object({
    fen: fenSchema.describe(
      "FEN string representing the current board position"
    ),
    move: moveSchema.describe("The move to be played in UCI or SAN format"),
  }),
  outputSchema: z.object({
    bestMove: z.string().describe("The best move for the new position"),
    reasoning: z
      .string()
      .describe(
        "the board state information in text form, gives valuable reasoning"
      ),
    numberEval: z.number().describe("The engine eval in number form"),
    topLine: z
      .string()
      .describe(
        "The top variation that would play out according to Stockfish in UCI format"
      ),
  }),
  execute: async ({ context }) => {
    const { fen, move } = context;
    // calculateDeep returns the new FEN after the move
    const newFen = calculateDeep(fen, move)?.fen || fen;
    const evaluation = await getChessEvaluation(newFen, 15);
    return generateChessAnalysis(evaluation, newFen);
  },
});

export const isLegalMoveTool = createTool({
  id: "is-legal-move",
  description: "Check if a given move is legal for the provided FEN position.",
  inputSchema: z.object({
    fen: fenSchema.describe(
      "FEN string representing the board position, the fen must be in full form containing which side to move"
    ),
    move: z.string().describe("Move to check (in SAN or UCI format)"),
  }),
  outputSchema: z.object({
    isLegal: z
      .boolean()
      .describe("Whether the move is legal in the given position"),
    message: z
      .string()
      .optional()
      .describe("Optional message about legality or errors"),
  }),
  execute: async ({ context }) => {
    try {
      const boardState = getBoardState(context.fen);
      if (!boardState) {
        return { isLegal: false, message: "Invalid FEN string" };
      }
      const legalMoves = boardState.legalMoves || [];
      const move = context.move.trim();
      const isLegal =
        legalMoves.includes(move) ||
        legalMoves.map((m) => m.toLowerCase()).includes(move.toLowerCase());
      return {
        isLegal,
        message: isLegal
          ? "Move is legal."
          : "Move is not legal in this position.",
      };
    } catch (error) {
      return { isLegal: false, message: "Error checking move legality." };
    }
  },
});

export const boardStateToPromptTool = createTool({
  id: "boardstate-to-prompt",
  description:
    "Given a FEN and a move, returns a string describing the resulting board state after the move.",
  inputSchema: z.object({
    fen: fenSchema.describe(
      "FEN string representing the current board position"
    ),
    move: z.string().describe("The move to be played (in SAN or UCI format)"),
  }),
  outputSchema: z.object({
    prompt: z
      .string()
      .describe("A prompt string describing the board state after the move"),
  }),
  execute: async ({ context }) => {
    const { fen, move } = context;
    const boardState = calculateDeep(fen, move);
    if (!boardState || !boardState.validfen) {
      return {
        prompt: "Invalid move or FEN. Cannot generate board state prompt.",
      };
    }
    
    const prompt = new PositionPrompter(boardState).generatePrompt();
    return { prompt };
  },
});

export const chessKnowledgeBaseTool = createTool({
  id: "get-chess-knowledgebase",
  description:
    "Returns a comprehensive chess knowledgebase including Silman Imbalances, Fine's 30 chess principles, endgame principles, and practical checklists.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    knowledgebase: z
      .string()
      .describe("Comprehensive chess knowledgebase as a formatted string"),
  }),
  execute: async () => {
    const knowledge = getKnowledgeBase();
    return { knowledgebase: knowledge };
  },
});

export const AgineTools = {
  searchWeb,
  isLegalMoveTool,
  chessKnowledgeBaseTool,
  getStockfishAnalysisTool,
  getStockfishMoveAnalysisTool,
  getThemeProgressionTool,
  getThemeScoresTool,
  analyzeVariationThemesTool,
  compareVariationsTool,
  findCriticalMomentsTool
};

export const AgineCloudTools = {
  isLegalMoveTool,
  getThemeProgressionTool,
  getThemeScoresTool,
}
