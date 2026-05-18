import { ModelType } from "@/libs/nets/types";

export type BotType = "stockfish" | "bigLeela" | "elitemaia" | "maia3";

export interface BotConfig {
  name: string;
  description: string;
  strength: string;
  color: string;
  requiresModel?: boolean;
  modelType?: ModelType;
  hasRatingLevels?: boolean;
}

export const BOT_CONFIGS: Record<BotType, BotConfig> = {
  stockfish: {
    name: "Stockfish 17",
    description: "Classical engine — strongest tactical play",
    strength: "~3000+ ELO",
    color: "#02a461ff",
  },
  bigLeela: {
    name: "Leela Chess Zero",
    description: "Neural network — strategic positional play",
    strength: "~3000+ ELO",
    color: "#9c27b0",
    requiresModel: true,
    modelType: "bigLeela",
  },
  elitemaia: {
    name: "Elite Leela",
    description: "Leela trained on elite master games",
    strength: "~2500+ ELO",
    color: "#10069dff",
    requiresModel: true,
    modelType: "elitemaia",
  },
  maia3: {
    name: "Maia 3",
    description: "Human-like play conditioned on your chosen rating level",
    strength: "600–2600 ELO",
    color: "#e65100",
    requiresModel: true,
    modelType: "maia3",
    hasRatingLevels: true,
  },
};

/** Returns only the models useNets needs for a given bot — no wasted API calls */
export function enabledModelsForBot(bot: BotType): ModelType[] {
  switch (bot) {
    case "stockfish":  return [];          // pure Stockfish, no NN needed
    case "bigLeela":   return ["bigLeela"];
    case "elitemaia":  return ["elitemaia"];
    case "maia3":      return ["maia3"];
    default:           return [];
  }
}

export type TimeControl = "5+0" | "10+0" | "30+0" | "custom";

export interface TimeControlConfig {
  minutes: number;
  increment: number;
  label: string;
  isCustom?: boolean;
}

export const TIME_CONTROLS: Record<TimeControl, TimeControlConfig> = {
  "5+0":  { minutes: 5,  increment: 0, label: "5 min" },
  "10+0": { minutes: 10, increment: 0, label: "10 min" },
  "30+0": { minutes: 30, increment: 0, label: "30 min" },
  custom: { minutes: 10, increment: 0, label: "Custom", isCustom: true },
};
