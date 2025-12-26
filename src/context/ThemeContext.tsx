"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { 
  agineTheme, 
  darkGreyTheme, 
  lightTheme, 
  darkBlueThemeConfig, 
  forestThemeConfig,
  woodenThemeConfig,
  discoThemeConfig,
  classicChessThemeConfig,
  marbleThemeConfig,
  neonCyberThemeConfig,
  christmasThemeConfig
} from '@/theme/theme';

export type ThemeType = 
  | 'light' 
  | 'dark' 
  | 'purple' 
  | 'darkBlue' 
  | 'forest' 
  | 'wooden' 
  | 'disco' 
  | 'classicChess' 
  | 'marble' 
  | 'neonCyber'
  | 'christmas';

interface ThemeContextType {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const themeMap = {
  light: lightTheme,
  dark: darkGreyTheme,
  purple: agineTheme,
  darkBlue: darkBlueThemeConfig,
  forest: forestThemeConfig,
  wooden: woodenThemeConfig,
  disco: discoThemeConfig,
  classicChess: classicChessThemeConfig,
  marble: marbleThemeConfig,
  neonCyber: neonCyberThemeConfig,
  christmas: christmasThemeConfig
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('app-theme') as ThemeType;
    if (savedTheme && themeMap[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  const setTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
    localStorage.setItem('app-theme', theme);
  };

  const theme = themeMap[currentTheme];

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};