"use client";

import { type FC, useCallback } from "react";
import {
  ComposerPrimitive,
  unstable_useSlashCommandAdapter,
  useAui,
  type Unstable_SlashCommandAction,
} from "@assistant-ui/react";
import {
  Cpu,
  Search,
  Lightbulb,
  Grid3x3,
  FileText,
  Puzzle,
  BookOpen,
  Trophy,
  Zap,
  Brain,
  Target,
  History,
  BarChart2,
  Swords,
} from "lucide-react";

type TriggerItem = Parameters<Unstable_SlashCommandAction["onExecute"]>[0];

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICONS: Record<string, FC<{ className?: string }>> = {
  stockfish:  (p) => <Cpu       {...p} />,
  analyze:    (p) => <Search    {...p} />,
  brainstorm: (p) => <Lightbulb {...p} />,
  fen:        (p) => <Grid3x3   {...p} />,
  pgn:        (p) => <FileText  {...p} />,
  puzzle:     (p) => <Puzzle    {...p} />,
  opening:    (p) => <BookOpen  {...p} />,
  masters:    (p) => <Trophy    {...p} />,
  tactics:    (p) => <Zap       {...p} />,
  leela:      (p) => <Brain     {...p} />,
  endgame:    (p) => <Target    {...p} />,
  review:     (p) => <History   {...p} />,
  themes:     (p) => <BarChart2 {...p} />,
  critical:   (p) => <Swords    {...p} />,
};

// ─── Commands ─────────────────────────────────────────────────────────────────

const CHESS_COMMANDS = [
  // ── Engine analysis
  {
    id: "stockfish",
    label: "/stockfish",
    description: "Deep Stockfish engine analysis of current position",
  },
  {
    id: "leela",
    label: "/leela",
    description: "Leela Chess Zero neural-network positional evaluation",
  },
  {
    id: "analyze",
    label: "/analyze",
    description: "Full position analysis — best moves, threats, plans",
  },
  // ── Game understanding
  {
    id: "brainstorm",
    label: "/brainstorm",
    description: "Brainstorm plans and strategic ideas for this position",
  },
  {
    id: "themes",
    label: "/themes",
    description: "Break down positional themes: space, king safety, mobility",
  },
  {
    id: "critical",
    label: "/critical",
    description: "Find critical moments and turning points in the game",
  },
  // ── Training
  {
    id: "puzzle",
    label: "/puzzle",
    description: "Get a chess puzzle to solve",
  },
  {
    id: "tactics",
    label: "/tactics",
    description: "Tactical summary — hanging pieces, forks, pins",
  },
  {
    id: "endgame",
    label: "/endgame",
    description: "Endgame technique lesson for the current structure",
  },
  // ── Database / openings
  {
    id: "opening",
    label: "/opening",
    description: "Identify opening, statistics from 7.5B Lichess games",
  },
  {
    id: "masters",
    label: "/masters",
    description: "How have masters played this position?",
  },
  {
    id: "review",
    label: "/review",
    description: "Review my last Lichess game with theme analysis",
  },
  // ── Input helpers
  {
    id: "fen",
    label: "/fen",
    description: "Paste a FEN string to load a position",
  },
  {
    id: "pgn",
    label: "/pgn",
    description: "Paste a PGN to load and analyze a game",
  },
] as const;

type CommandId = (typeof CHESS_COMMANDS)[number]["id"];

// ─── Prompts ──────────────────────────────────────────────────────────────────

const PROMPTS: Partial<Record<CommandId, string>> = {
  stockfish:
    "Analyze the current position using Stockfish at high depth. Show the top 3 lines with evaluation scores, best moves, and key tactical threats.",
  leela:
    "Analyze the current position with Leela Chess Zero. Give a strategic positional evaluation — highlight long-term plans, piece activity, and structural factors.",
  analyze:
    "Analyze the current position thoroughly. Cover best moves for both sides, key threats, tactical motifs, and the overall strategic plan.",
  brainstorm:
    "Brainstorm plans and ideas for the current position. What are the strategic themes? What should each side be trying to achieve? Give concrete move ideas.",
  themes:
    "Run a full positional theme breakdown of the current position. Cover: material balance, mobility, space, king safety, pawn structure, and light/dark square control.",
  critical:
    "Find the critical moments and turning points in this game. Where did the evaluation shift most dramatically, and what were the key mistakes or brilliant moves?",
  puzzle:
    "Give me a chess puzzle to solve. Show the board position and let me work it out.",
  tactics:
    "Give me a tactical summary of the current position — identify all hanging pieces, potential forks, pins, skewers, and tactical threats for both sides.",
  endgame:
    "We're in an endgame. Explain the key technique and principles for this type of endgame structure. What is the correct plan and how should it be played?",
  opening:
    "Identify the current opening and look up statistics from master games and the Lichess database. What are the main lines, typical plans, and what do top players recommend?",
  masters:
    "How have masters and grandmasters played this position? Show statistics from master games and key example games with the main strategic ideas.",
  review:
    "Fetch and review my most recent Lichess game. Give a comprehensive game review with theme progression, critical moments, and key mistakes and improvements.",
};

const PLACEHOLDERS: Partial<Record<CommandId, string>> = {
  fen: "Analyze this position: [paste FEN here]",
  pgn: "Load and analyze this game:\n\n[paste PGN here]",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ChessSlashCommands: FC = () => {
  const aui = useAui();

  const handleExecute = useCallback(
    (item: TriggerItem) => {
      const prompt = PROMPTS[item.id as CommandId];
      const placeholder = PLACEHOLDERS[item.id as CommandId];

      if (prompt) {
        aui.composer().setText(prompt);
        setTimeout(() => aui.composer().send(), 0);
      } else if (placeholder) {
        aui.composer().setText(placeholder);
      }
    },
    [aui],
  );

  const slash = unstable_useSlashCommandAdapter({
    commands: CHESS_COMMANDS.map((cmd) => ({ ...cmd, execute: () => {} })),
    removeOnExecute: true,
  });

  return (
    <ComposerPrimitive.Unstable_TriggerPopover
      char="/"
      adapter={slash.adapter}
      className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-xl border border-border bg-background shadow-xl"
    >
      <ComposerPrimitive.Unstable_TriggerPopover.Action
        onExecute={handleExecute}
        removeOnExecute={true}
      />
      <ComposerPrimitive.Unstable_TriggerPopoverItems>
        {(items) => (
          <div className="max-h-72 overflow-y-auto p-1">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Commands
            </p>
            {items.map((item, index) => {
              const Icon = ICONS[item.id];
              return (
                <ComposerPrimitive.Unstable_TriggerPopoverItem
                  key={item.id}
                  item={item}
                  index={index}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted data-[highlighted]:bg-muted"
                >
                  {Icon && (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">
                      {item.label}
                    </span>
                    {item.description && (
                      <p className="truncate text-muted-foreground text-xs">
                        {item.description}
                      </p>
                    )}
                  </div>
                </ComposerPrimitive.Unstable_TriggerPopoverItem>
              );
            })}
          </div>
        )}
      </ComposerPrimitive.Unstable_TriggerPopoverItems>
    </ComposerPrimitive.Unstable_TriggerPopover>
  );
};