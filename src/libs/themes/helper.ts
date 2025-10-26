
export interface ThemeScore {
    material: number;
    mobility: number;
    space: number;
    positional: number;
    kingSafety: number;
    tactical: number;
    darksqaureControl: number;
    lightsqaureControl: number;
}


interface ThemeChange {
  theme: string;
  initialScore: number;
  finalScore: number;
  change: number;
  percentChange: number;
}

interface VariationAnalysis {
  themeChanges: ThemeChange[];
  overallChange: number;
  strongestImprovement: ThemeChange | null;
  biggestDecline: ThemeChange | null;
  moveByMoveScores: ThemeScore[];
}

export interface GameReviewTheme {
  gameInfo: {
    white: string;
    black: string;
    result: string;
  };
  whiteAnalysis: {
    overallThemes: VariationAnalysis;
    criticalMoments: Array<{
      moveIndex: number;
      move: string;
      themeChanges: ThemeChange[];
    }>;
    averageThemeScores: ThemeScore;
  };
  blackAnalysis: {
    overallThemes: VariationAnalysis;
    criticalMoments: Array<{
      moveIndex: number;
      move: string;
      themeChanges: ThemeChange[];
    }>;
    averageThemeScores: ThemeScore;
  };
  insights: {
    whiteBestTheme: string;
    whiteWorstTheme: string;
    blackBestTheme: string;
    blackWorstTheme: string;
    turningPoints: Array<{
      moveNumber: number;
      player: string;
      move: string;
      impact: string;
    }>;
  };
}

export const themeColors = {
  material: '#bb86fc',
  mobility: '#81c784',
  space: '#64b5f6',
  positional: '#27b204ff',
  kingSafety: '#ef6f6fff',
  tactical: '#6f1becff',
  darksqaureControl: '#764c04ff',
  lightsqaureControl: '#e08f03ff'
};

export function getThemeLabelColor(theme: keyof ThemeScore): string {
    return themeColors[theme] || '#000000';
}


