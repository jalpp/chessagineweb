"use client";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Chessboard } from "react-chessboard";
import { Box, Typography, CircularProgress, Chip } from "@mui/material";
import { GridOn as BoardIcon } from "@mui/icons-material";


type DisplayChessboardArgs = {
  fen: string;
  caption?: string;
  orientation?: "white" | "black";
};

type DisplayChessboardResult = {
  fen: string;
  caption?: string;
  orientation?: "white" | "black";
};


export const DisplayChessboardToolUI = makeAssistantToolUI<
  DisplayChessboardArgs,
  DisplayChessboardResult
>({
  toolName: "display_chessboard_for_fen",

  render: function ChessboardUI({ args, result, status }) {

    if (status.type === "running") {
      return (
        <Box
          display="flex"
          alignItems="center"
          gap={1.5}
          sx={{ py: 1, color: "text.secondary" }}
        >
          <CircularProgress size={16} />
          <Typography variant="caption">Setting up chessboard…</Typography>
        </Box>
      );
    }

    if (status.type === "incomplete") {
      return (
        <Typography variant="caption" color="error">
          Failed to load chessboard.
        </Typography>
      );
    }


    const fen = result?.fen ?? args.fen;
    const caption = result?.caption ?? args.caption;
    const orientation = result?.orientation ?? args.orientation ?? "white";

    if (!fen) return null;

    return (
      <Box
        sx={{
          my: 1.5,
          display: "inline-flex",
          flexDirection: "column",
          gap: 1,
          maxWidth: 420,
          width: "100%",
        }}
      >
      
        <Box display="flex" alignItems="center" gap={0.75}>
          <BoardIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Chessboard
          </Typography>
          <Chip
            label={orientation === "black" ? "Black's view" : "White's view"}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: "0.65rem" }}
          />
        </Box>

        <Box
          sx={{
            borderRadius: 1,
            overflow: "hidden",
            boxShadow: 2,
            width: "100%",
            maxWidth: 400,
          }}
        >
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
            }}
          />
        </Box>

        {caption && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic", textAlign: "center" }}
          >
            {caption}
          </Typography>
        )}

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.65rem",
            wordBreak: "break-all",
          }}
        >
          {fen}
        </Typography>
      </Box>
    );
  },
});
