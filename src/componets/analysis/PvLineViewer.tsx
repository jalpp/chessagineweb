"use client";
import React, { useId, useMemo, useState } from "react";
import { Box, Paper, Popper, Typography } from "@mui/material";
import { Chessboard, PieceRenderObject } from "react-chessboard";
import { useSettings } from "@/context/SettingContext";
import { getCurrentThemeColors } from "@/libs/setting/helper";
import { buildMoveChain, pvMoveLabel } from "@/lib/moveUtils";

export interface PvLineViewerProps {
  /** FEN of the position this PV starts from. */
  fen: string;
  /** The principal variation in UCI, in order. */
  uciMoves: string[];
  /**
   * Called with the move prefix (inclusive, in UCI) when a move token is
   * clicked — e.g. clicking the 3rd move of "e4 e5 Nc3" calls this with
   * ["e2e4", "e7e5", "b1c3"] so the caller can append the whole sequence
   * onto the main board.
   */
  onAppendMoves?: (uciMoves: string[]) => void;
}

const MINI_BOARD_SIZE = 148;

// A deliberately simplified piece renderer for the small hover preview —
// it respects the person's chosen piece set but skips the tilted 3D board
// styling AiChessboard applies for the full-size board, which wouldn't read
// well at this size.
function getMiniCustomPieces(pieceSet: string): PieceRenderObject {
  const pieces = ["P", "N", "B", "R", "Q", "K"];
  const colors = ["w", "b"];
  const cp: PieceRenderObject = {};
  colors.forEach((color) =>
    pieces.forEach((piece) => {
      const key = `${color}${piece}`;
      const src =
        pieceSet?.toLowerCase() === "cburnett" || !pieceSet
          ? `/static/pieces/Cburnett/${key}.svg`
          : `/static/pieces/${pieceSet}/${key}.png`;
      cp[key] = () => (
        <img
          src={src}
          style={{ width: "100%", height: "100%", display: "block" }}
          alt={key}
        />
      );
    }),
  );
  return cp;
}

export default function PvLineViewer({
  fen,
  uciMoves,
  onAppendMoves,
}: PvLineViewerProps) {
  const { boardTheme, boardPieceType, boardFlipped } = useSettings();
  const reactId = useId();

  const chain = useMemo(
    () => buildMoveChain(fen, uciMoves),
    [fen, uciMoves],
  );

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const customPieces = useMemo(
    () => getMiniCustomPieces(boardPieceType),
    [boardPieceType],
  );
  const themeColors = getCurrentThemeColors(boardTheme);

  if (chain.length === 0) return null;

  const hoveredStep = hoverIndex !== null ? chain[hoverIndex] : null;

  const handleEnter = (e: React.MouseEvent<HTMLElement>, index: number) => {
    setAnchorEl(e.currentTarget);
    setHoverIndex(index);
  };
  const handleLeave = () => {
    setHoverIndex(null);
    setAnchorEl(null);
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          gap: 0.25,
          py: 0.25,
          "&::-webkit-scrollbar": { height: "4px" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: "2px" },
        }}
      >
        {chain.map((step, index) => {
          const fenBeforeMove = index === 0 ? fen : chain[index - 1].fen;
          const label = pvMoveLabel(fenBeforeMove, index === 0);
          return (
            <Box
              key={`${reactId}-${index}-${step.uci}`}
              component="span"
              onMouseEnter={(e) => handleEnter(e, index)}
              onMouseLeave={handleLeave}
              onClick={
                onAppendMoves
                  ? () =>
                      onAppendMoves(
                        chain.slice(0, index + 1).map((s) => s.uci),
                      )
                  : undefined
              }
              sx={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: "3px",
                whiteSpace: "nowrap",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                px: 0.5,
                py: 0.25,
                borderRadius: 1,
                cursor: onAppendMoves ? "pointer" : "default",
                bgcolor: hoverIndex === index ? "action.selected" : "transparent",
                "&:hover": onAppendMoves ? { bgcolor: "action.hover" } : undefined,
              }}
            >
              {label && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ color: "text.secondary" }}
                >
                  {label}
                </Typography>
              )}
              {step.san}
            </Box>
          );
        })}
      </Box>

      <Popper
        open={hoveredStep !== null}
        anchorEl={anchorEl}
        placement="top"
        sx={{ zIndex: 2500 }}
        modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
      >
        {hoveredStep && (
          <Paper elevation={6} sx={{ p: 0.75, borderRadius: 1.5 }}>
            <Box sx={{ width: MINI_BOARD_SIZE, height: MINI_BOARD_SIZE }}>
              <Chessboard
                options={{
                  id: `pv-preview-${reactId}`,
                  position: hoveredStep.fen,
                  allowDragging: false,
                  showNotation: false,
                  boardOrientation: boardFlipped ? "black" : "white",
                  darkSquareStyle: { backgroundColor: themeColors.darkSquareColor },
                  lightSquareStyle: { backgroundColor: themeColors.lightSquareColor },
                  pieces: customPieces,
                  boardStyle: { width: MINI_BOARD_SIZE, height: MINI_BOARD_SIZE },
                }}
              />
            </Box>
          </Paper>
        )}
      </Popper>
    </Box>
  );
}
