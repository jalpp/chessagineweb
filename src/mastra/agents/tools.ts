import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const displayChessboardTool = createTool({
  id: "display_chessboard_for_fen",
  description:
    "Display a chess position on an interactive chessboard inside a chat window. " +
    "Call this whenever you want to show a position visually — " +
    "e.g. after analysing a FEN, suggesting a move, or illustrating an opening. " +
    "Always prefer calling this over describing the board in text.",
  inputSchema: z.object({
    fen: z
      .string()
      .describe(
        "The FEN string of the position to display. " +
          "Use the starting position FEN if no specific position is given: " +
          "'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'",
      ),
    caption: z
      .string()
      .optional()
      .describe(
        "Short caption shown below the board, e.g. 'After 1.e4 e5 2.Nf3'",
      ),
    orientation: z
      .enum(["white", "black"])
      .optional()
      .default("white")
      .describe("Which side's perspective to show the board from"),
  }),
  outputSchema: z.object({
    fen: z.string(),
    caption: z.string().optional(),
    orientation: z.enum(["white", "black"]).optional(),
  }),
  execute: async ({ fen, caption, orientation }) => {
    return {
      fen: fen,
      caption: caption,
      orientation: orientation ?? "white",
    };
  },
});