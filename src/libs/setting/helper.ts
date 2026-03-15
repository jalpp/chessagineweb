import { ThemeType } from "@/context/ThemeContext";

export const ANALYSIS_DELAY = 300;
export const DEFAULT_ENGINE_DEPTH = 15;
export const DEFAULT_ENGINE_LINES = 3;
export const MAX_PV_MOVES = 6;


export const DEFAULT_CHAT_DIMENSIONS = {
    width: 1200,
    height: 800
}
export const DEFAULT_CHAT_FONT_SIZE = 14;
export const DEFAULT_CHAT_SHOW_TIMESTAMP = true;
export const DEFAULT_CHAT_TECHNICAL_INFO = true;
export const DEFAULT_CHAT_COMPACT_VIEW = false;
export const DEFAULT_CHAT_SPEECH_RATE = 1;
export const DEFAULT_CHAT_SPEECH_PITCH = 1;
export const DEFAULT_CHAT_SPEECH_VOLUME = 0.8;
export const DEFAULT_CHAT_SPEECH_VOICE = '';
export const DEFAULT_CHAT_AUTOSCROLL = true;

export const DEFAULT_CHAPTER_DIMENIONS = {
    width: 900,
    height: 500
}

export const DEFAULT_BOARD_FLIPPED = false;
export const DEFAULT_BOARD_SIZE = 550;
export const DEFAULT_BOARD_SHOW_COORDINATE = true;
export const DEFAULT_BOARD_ANIMATION_DURATION = 300;
export const DEFAULT_BOARD_SHOW_FEN = false;
export const DEFAULT_BOARD_HANGING_PIECE = false;
export const DEFAULT_BOARD_SEMI_PROTECTED_PIECE = false;


export const DEFAULT_BOARD_PANEL_DIMENSIONS = {
    width: 600,
    height: 800
}

export const DEFAULT_PGN_PANEL_DIMENSIONS = {
    width: 550,
    height: 200
}

export const DEFAULT_BOARD_COLOR_SETTINGS = {
  lightSquareColor: "#f0d9b5",
  darkSquareColor: "#b58863",
}

export const BOARD_THEMES = {
  classic: {
    name: "Classic",
    lightSquareColor: "#f0d9b5",
    darkSquareColor: "#b58863",
    bestMoveArrowColor: "#2e7d32",
    squareClickLegalColor: "rgba(86, 65, 6, 0.5)",
    selectedSquareColor: "rgba(255, 215, 0, 0.6)", // golden highlight
  },
  green: {
    name: "Forest",
    lightSquareColor: "#bcbcafff",
    darkSquareColor: "#769656",
    bestMoveArrowColor: "#1b5e20",
    squareClickLegalColor: "rgba(27, 94, 32, 0.5)",
    selectedSquareColor: "rgba(255, 193, 7, 0.6)", // amber for contrast
  },
  blue: {
    name: "Ocean",
    lightSquareColor: "#bec0c2ff",
    darkSquareColor: "#8ca2ad",
    bestMoveArrowColor: "#2e7d32",
    squareClickLegalColor: "rgba(46, 125, 50, 0.5)",
    selectedSquareColor: "rgba(255, 235, 59, 0.6)", // bright yellow
  },
    christmas: {
    name: "Christmas",
    lightSquareColor: "#e81010ff",        // snowy white
    darkSquareColor: "#2e7d32",         // deep pine green
    bestMoveArrowColor: "#faf8f8ff",      // festive red
    squareClickLegalColor: "rgba(198, 40, 40, 0.5)", // soft red highlight
    selectedSquareColor: "rgba(255, 215, 0, 0.65)", // gold ornament glow
  },
  gray: {
    name: "Modern",
    lightSquareColor: "#f5f5f5bc",
    darkSquareColor: "#504d4dff",
    bestMoveArrowColor: "#4caf50",
    squareClickLegalColor: "rgba(76, 175, 80, 0.5)",
    selectedSquareColor: "rgba(255, 193, 7, 0.6)", // amber pop
  },
  wood: {
    name: "Wooden",
    lightSquareColor: "#deb887",
    darkSquareColor: "#6d4d35ff",
    bestMoveArrowColor: "#2e7d32",
    squareClickLegalColor: "rgba(46, 125, 50, 0.5)",
    selectedSquareColor: "rgba(255, 235, 59, 0.6)", // warm yellow
  },

  purple: {
    name: "Purple Dream",
    lightSquareColor: "#e1d5e7",
    darkSquareColor: "#7c4dff",
    bestMoveArrowColor: "#ab47bc",
    squareClickLegalColor: "rgba(156, 39, 176, 0.5)",
    selectedSquareColor: "rgba(255, 193, 255, 0.6)",
    },
    orange: {
    name: "Sunset",
    lightSquareColor: "#ffe0b2",
    darkSquareColor: "#ff9800",
    bestMoveArrowColor: "#f57c00",
    squareClickLegalColor: "rgba(255, 152, 0, 0.5)",
    selectedSquareColor: "rgba(255, 235, 59, 0.6)",
    },
    pink: {
    name: "Rose",
    lightSquareColor: "#f8bbd0",
    darkSquareColor: "#ad1457",
    bestMoveArrowColor: "#d81b60",
    squareClickLegalColor: "rgba(233, 30, 99, 0.5)",
    selectedSquareColor: "rgba(255, 182, 193, 0.6)",
    },
    teal: {
    name: "Teal Breeze",
    lightSquareColor: "#b2dfdb",
    darkSquareColor: "#00695c",
    bestMoveArrowColor: "#00897b",
    squareClickLegalColor: "rgba(0, 150, 136, 0.5)",
    selectedSquareColor: "rgba(178, 223, 219, 0.6)",
    },
} as const;


export const PIECE_STYLE_TYPES = {
  cburnett: { name: "Cburnett" },
  Anime: { name: "Anime" },
  Apollo: { name: "Apollo" },
  Artemis: { name: "Artemis" },
  Attack: { name: "Attack" },
  Clash: { name: "Clash" },
  Juno: { name: "Juno" },
  Junpiter: { name: "Junpiter" },
  Mars: { name: "Mars" },
  Minerva: { name: "Minerva" },
  Cyborg: {name: "Cyborg"},
  Trimmed: {name: "Trimmed-3D"},
  Glass: {name: "Glass-3D"},
  Wood: {name: "Wood-3D"}
};

export const is3DSet = (set: string) => {
  return set === "Trimmed" || set === "Glass" || set === "Wood"
}

export const getCurrentThemeColors = (themeName: string) => {
  return BOARD_THEMES[themeName as keyof typeof BOARD_THEMES] || BOARD_THEMES.classic;
};




export const chatThemeVars: Record<ThemeType, React.CSSProperties> = {
  dark: {
    "--background": "oklch(0.145 0 0)",
    "--foreground": "oklch(0.985 0 0)",
    "--muted": "oklch(0.269 0 0)",
    "--muted-foreground": "oklch(0.708 0 0)",
    "--border": "oklch(1 0 0 / 10%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.922 0 0)",
    "--primary-foreground": "oklch(0.205 0 0)",
    "--ring": "oklch(0.556 0 0)",
  } as React.CSSProperties,
  light: {
    "--background": "oklch(1 0 0)",
    "--foreground": "oklch(0.145 0 0)",
    "--muted": "oklch(0.97 0 0)",
    "--muted-foreground": "oklch(0.556 0 0)",
    "--border": "oklch(0.922 0 0)",
    "--input": "oklch(0.922 0 0)",
    "--primary": "oklch(0.205 0 0)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--ring": "oklch(0.708 0 0)",
  } as React.CSSProperties,
  purple: {
    "--background": "oklch(0.18 0.04 290)",
    "--foreground": "oklch(0.95 0.01 290)",
    "--muted": "oklch(0.25 0.05 290)",
    "--muted-foreground": "oklch(0.65 0.05 290)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.65 0.2 290)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--ring": "oklch(0.65 0.2 290)",
  } as React.CSSProperties,
  darkBlue: {
    "--background": "oklch(0.15 0.03 240)",
    "--foreground": "oklch(0.95 0.01 240)",
    "--muted": "oklch(0.22 0.04 240)",
    "--muted-foreground": "oklch(0.65 0.04 240)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.6 0.18 240)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--ring": "oklch(0.6 0.18 240)",
  } as React.CSSProperties,
  forest: {
    "--background": "oklch(0.15 0.03 150)",
    "--foreground": "oklch(0.95 0.01 150)",
    "--muted": "oklch(0.22 0.04 150)",
    "--muted-foreground": "oklch(0.65 0.04 150)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.55 0.15 150)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--ring": "oklch(0.55 0.15 150)",
  } as React.CSSProperties,
  wooden: {
    "--background": "oklch(0.25 0.04 60)",
    "--foreground": "oklch(0.95 0.02 60)",
    "--muted": "oklch(0.32 0.05 60)",
    "--muted-foreground": "oklch(0.65 0.04 60)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.6 0.12 60)",
    "--primary-foreground": "oklch(0.15 0 0)",
    "--ring": "oklch(0.6 0.12 60)",
  } as React.CSSProperties,
  disco: {
    "--background": "oklch(0.12 0.05 320)",
    "--foreground": "oklch(0.97 0.01 320)",
    "--muted": "oklch(0.2 0.07 320)",
    "--muted-foreground": "oklch(0.65 0.05 320)",
    "--border": "oklch(1 0 0 / 15%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.7 0.25 320)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--ring": "oklch(0.7 0.25 320)",
  } as React.CSSProperties,
  classicChess: {
    "--background": "oklch(0.2 0.02 80)",
    "--foreground": "oklch(0.95 0.01 80)",
    "--muted": "oklch(0.28 0.03 80)",
    "--muted-foreground": "oklch(0.65 0.02 80)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.75 0.1 80)",
    "--primary-foreground": "oklch(0.15 0 0)",
    "--ring": "oklch(0.75 0.1 80)",
  } as React.CSSProperties,
  marble: {
    "--background": "oklch(0.95 0.005 220)",
    "--foreground": "oklch(0.15 0.01 220)",
    "--muted": "oklch(0.88 0.01 220)",
    "--muted-foreground": "oklch(0.45 0.02 220)",
    "--border": "oklch(0.7 0.01 220)",
    "--input": "oklch(0.82 0.01 220)",
    "--primary": "oklch(0.35 0.05 220)",
    "--primary-foreground": "oklch(0.97 0 0)",
    "--ring": "oklch(0.5 0.05 220)",
  } as React.CSSProperties,
  neonCyber: {
    "--background": "oklch(0.1 0.02 200)",
    "--foreground": "oklch(0.95 0.05 180)",
    "--muted": "oklch(0.18 0.04 200)",
    "--muted-foreground": "oklch(0.65 0.08 180)",
    "--border": "oklch(0.6 0.2 180 / 30%)",
    "--input": "oklch(0.6 0.2 180 / 20%)",
    "--primary": "oklch(0.75 0.25 180)",
    "--primary-foreground": "oklch(0.1 0 0)",
    "--ring": "oklch(0.75 0.25 180)",
  } as React.CSSProperties,
  christmas: {
    "--background": "oklch(0.15 0.04 20)",
    "--foreground": "oklch(0.97 0.01 20)",
    "--muted": "oklch(0.22 0.05 20)",
    "--muted-foreground": "oklch(0.65 0.04 20)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--primary": "oklch(0.55 0.2 20)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--ring": "oklch(0.55 0.2 20)",
  } as React.CSSProperties,
};