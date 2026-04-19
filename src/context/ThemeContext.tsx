"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useAuth } from '@clerk/nextjs';
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


function readThemeFromStorage(): ThemeType | null {
  try {
    const raw = localStorage.getItem('app-theme');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ThemeType;
      if (themeMap[parsed]) return parsed;
    } catch {
      // Legacy raw value — not JSON-encoded
      if (themeMap[raw as ThemeType]) return raw as ThemeType;
    }
  } catch {}
  return null;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
  const [mounted, setMounted] = useState(false);
  const { isSignedIn } = useAuth();

  // Read from localStorage on mount (handles both JSON and legacy raw values)
  useEffect(() => {
    setMounted(true);
    const saved = readThemeFromStorage();
    if (saved) setCurrentTheme(saved);
  }, []);

  // Sync from DB once on sign-in
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { app_theme?: string } | null) => {
        if (d?.app_theme && themeMap[d.app_theme as ThemeType]) {
          const theme = d.app_theme as ThemeType;
          setCurrentTheme(theme);
        }
      })
      .catch(() => {});
  }, [isSignedIn]);

  const setTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);

    localStorage.setItem('app-theme', JSON.stringify(theme));
   
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'app-theme',
        newValue: JSON.stringify(theme),
        storageArea: localStorage,
      })
    );

    if (isSignedIn) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_theme: theme }),
      }).catch(() => {});
    }
  };

  const theme = themeMap[currentTheme] ?? themeMap['dark'];

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};