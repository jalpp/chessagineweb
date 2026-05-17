export type BotType = "stockfish" | "bigLeela" | "elitemaia";

export interface BotConfig {
  name: string;
  description: string;
  strength: string;
  color: string;
  requiresModel?: boolean;
  modelType?: "bigLeela" | "elitemaia";
}

export const BOT_CONFIGS: Record<BotType, BotConfig> = {
  stockfish: {
    name: "Stockfish 17",
    description: "Classical engine - strongest tactical play",
    strength: "~3000+ ELO",
    color: "#02a461ff",
  },
  bigLeela: {
    name: "Leela Chess Zero",
    description: "Neural network - strategic positional play",
    strength: "~3000+ ELO",
    color: "#9c27b0",
    requiresModel: true,
    modelType: "bigLeela",
  },
  elitemaia: {
    name: "Elite Leela",
    description: "Enhanced Leela trained on master games",
    strength: "~2500+ ELO",
    color: "#10069dff",
    requiresModel: true,
    modelType: "elitemaia",
  },
};

export type TimeControl = "5+0" | "10+0" | "30+0" | "custom";

export interface TimeControlConfig {
  minutes: number;
  increment: number;
  label: string;
  isCustom?: boolean;
}

export const TIME_CONTROLS: Record<TimeControl, TimeControlConfig> = {
  "5+0": { minutes: 5, increment: 0, label: "5 min" },
  "10+0": { minutes: 10, increment: 0, label: "10 min" },
  "30+0": { minutes: 30, increment: 0, label: "30 min" },
  custom: { minutes: 10, increment: 0, label: "Custom", isCustom: true },
};
