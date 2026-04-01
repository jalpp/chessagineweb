import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const displayChessboardTool = createTool({
  id: "display_chessboard_for_fen",
  description:
    "Display a chess position on an interactive chessboard inside a chat window. " +
    "Call this whenever you want to show a position visually — " +
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

export const loadGameTool = createTool({
  id: "load_chess_game",
  description: `
Load and display a full interactive chess game review panel inside the chat.
 
Use this tool whenever the user:
- Shares a Lichess game URL (e.g. https://lichess.org/abc123)
- Shares a Lichess study URL (e.g. https://lichess.org/study/abc123)
- Pastes raw PGN text
- Asks to "load", "show", "analyse", or "review" a game
 
The tool will render an embedded, fully-interactive game review panel (board,
move list, Stockfish analysis, AI review, etc.) directly in the chat window.
 
Prefer this over describing a game in text whenever a visual board makes sense.
  `.trim(),
 
  inputSchema: z.object({
    source: z
      .enum(["lichess_url", "lichess_study", "pgn_text"])
      .describe(
        "How the game will be loaded. " +
          "'lichess_url' for a single game URL, " +
          "'lichess_study' for a study/chapter URL, " +
          "'pgn_text' for raw PGN pasted by the user.",
      ),
 
    value: z
      .string()
      .describe(
        "The raw value for the chosen source: " +
          "a full Lichess URL, study URL, or PGN string.",
      ),
 
    autoReview: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Whether to automatically trigger the AI game review after loading. " +
          "Set to false if the user only wants to browse moves.",
      ),
 
    caption: z
      .string()
      .optional()
      .describe(
        "Short label shown above the embedded panel, e.g. 'Your game vs. Magnus'.",
      ),
  }),
 
  outputSchema: z.object({
    source: z.enum(["lichess_url", "lichess_study", "pgn_text"]),
    value: z.string(),
    autoReview: z.boolean(),
    caption: z.string().optional(),
    /** Resolved only for lichess_url — the short game ID extracted from the URL */
    lichessGameId: z.string().optional(),
    /** Resolved only for lichess_study */
    lichessStudyId: z.string().optional(),
  }),
 
  execute: async ({ source, value, autoReview = true, caption }) => {
    // Extract IDs server-side so the client UI doesn't have to parse URLs
    let lichessGameId: string | undefined;
    let lichessStudyId: string | undefined;
 
    if (source === "lichess_url") {
      // https://lichess.org/abc123[/white|/black]
      const match = value.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
      lichessGameId = match?.[1];
    } else if (source === "lichess_study") {
      // https://lichess.org/study/abc123[/chapter]
      const match = value.match(/lichess\.org\/study\/([a-zA-Z0-9]+)/);
      lichessStudyId = match?.[1];
    }
 
    return {
      source,
      value,
      autoReview: autoReview ?? true,
      caption,
      lichessGameId,
      lichessStudyId,
    };
  },
});