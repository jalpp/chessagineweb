import { deepPurple, indigo, purple, blue, green,} from "@mui/material/colors";
import { createTheme } from "@mui/material";

// Purple Theme Configuration
export const purpleTheme = {
  primary: deepPurple[500],
  primaryDark: deepPurple[700],
  secondary: purple[400],
  accent: indigo[300],
  background: {
    main: '#1a0d2e',
    paper: '#2d1b3d',
    card: '#3e2463',
    input: '#4a2c5a'
  },
  text: {
    primary: '#e1d5f0',
    secondary: '#b39ddb',
    accent: '#ce93d8'
  },
  success: "#4caf50",
};

// Dark Blue Theme Configuration
export const darkBlueTheme = {
  primary: blue[600],
  primaryDark: blue[800],
  secondary: blue[400],
  accent: blue[200],
  background: {
    main: '#0a1929',
    paper: '#132f4c',
    card: '#1e4976',
    input: '#2d5f8d'
  },
  text: {
    primary: '#e3f2fd',
    secondary: '#90caf9',
    accent: '#64b5f6'
  },
  success: "#4caf50",
};

// Forest Theme Configuration
export const forestTheme = {
  primary: green[700],
  primaryDark: green[900],
  secondary: green[500],
  accent: green[300],
  background: {
    main: '#0d1f0d',
    paper: '#1a2e1a',
    card: '#2d4a2d',
    input: '#3d5a3d'
  },
  text: {
    primary: '#e8f5e9',
    secondary: '#a5d6a7',
    accent: '#81c784'
  },
  success: "#66bb6a",
};

// Purple Theme (MUI)
export const agineTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: purpleTheme.primary,
      dark: purpleTheme.primaryDark,
    },
    secondary: {
      main: purpleTheme.secondary,
    },
    background: {
      default: purpleTheme.background.main,
      paper: purpleTheme.background.paper,
    },
    text: {
      primary: purpleTheme.text.primary,
      secondary: purpleTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.card,
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${purpleTheme.background.input}`,
          color: purpleTheme.text.primary,
        },
        head: {
          backgroundColor: purpleTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Dark Grey Theme
export const darkGreyTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1E1E1E",
    },
    text: {
      primary: "#E0E0E0",
      secondary: "#B0B0B0",
    },
    primary: { main: "#bb86fc" },
    secondary: { main: "#03dac6" },
    success: { main: "#81c784" },
    error: { main: "#e57373" },
    divider: "#333",
  },
  components: {
    MuiCard: { 
      styleOverrides: { 
        root: { 
          backgroundColor: "#1E1E1E",
          borderRadius: 12,
        } 
      } 
    },
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          backgroundColor: "#1E1E1E",
          borderRadius: 12,
        } 
      } 
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

// Light Theme
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#212121",
      secondary: "#757575",
    },
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    success: { main: "#4caf50" },
    error: { main: "#f44336" },
    divider: "#e0e0e0",
  },
  components: {
    MuiCard: { 
      styleOverrides: { 
        root: { 
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        } 
      } 
    },
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          backgroundColor: "#ffffff",
          borderRadius: 12,
        } 
      } 
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid #e0e0e0`,
        },
        head: {
          backgroundColor: "#f5f5f5",
          fontWeight: 600,
        },
      },
    },
  },
});

// Dark Blue Theme
export const darkBlueThemeConfig = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: darkBlueTheme.primary,
      dark: darkBlueTheme.primaryDark,
    },
    secondary: {
      main: darkBlueTheme.secondary,
    },
    background: {
      default: darkBlueTheme.background.main,
      paper: darkBlueTheme.background.paper,
    },
    text: {
      primary: darkBlueTheme.text.primary,
      secondary: darkBlueTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: darkBlueTheme.background.card,
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: darkBlueTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${darkBlueTheme.background.input}`,
          color: darkBlueTheme.text.primary,
        },
        head: {
          backgroundColor: darkBlueTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: darkBlueTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Forest Theme
export const forestThemeConfig = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: forestTheme.primary,
      dark: forestTheme.primaryDark,
    },
    secondary: {
      main: forestTheme.secondary,
    },
    background: {
      default: forestTheme.background.main,
      paper: forestTheme.background.paper,
    },
    text: {
      primary: forestTheme.text.primary,
      secondary: forestTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: forestTheme.background.card,
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: forestTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${forestTheme.background.input}`,
          color: forestTheme.text.primary,
        },
        head: {
          backgroundColor: forestTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: forestTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Wooden Chess Theme Configuration
export const woodenTheme = {
  primary: '#8B4513',
  primaryDark: '#654321',
  secondary: '#D2691E',
  accent: '#DEB887',
  background: {
    main: '#2C1810',
    paper: '#3E2723',
    card: '#4E342E',
    input: '#5D4037'
  },
  text: {
    primary: '#FAEBD7',
    secondary: '#D7CCC8',
    accent: '#BCAAA4'
  },
  success: "#8BC34A",
};

export const woodenThemeConfig = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: woodenTheme.primary,
      dark: woodenTheme.primaryDark,
    },
    secondary: {
      main: woodenTheme.secondary,
    },
    background: {
      default: woodenTheme.background.main,
      paper: woodenTheme.background.paper,
    },
    text: {
      primary: woodenTheme.text.primary,
      secondary: woodenTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: woodenTheme.background.card,
          borderRadius: 12,
          border: '2px solid #6D4C41',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: woodenTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${woodenTheme.background.input}`,
          color: woodenTheme.text.primary,
        },
        head: {
          backgroundColor: woodenTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: woodenTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Disco Theme Configuration (Vibrant 70s inspired)
export const discoTheme = {
  primary: '#FF1493',
  primaryDark: '#C71585',
  secondary: '#00CED1',
  accent: '#FFD700',
  background: {
    main: '#0F0F23',
    paper: '#1A1A3E',
    card: '#2D2D5F',
    input: '#3D3D6F'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#E0B0FF',
    accent: '#FFB6C1'
  },
  success: "#39FF14",
};

export const discoThemeConfig = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: discoTheme.primary,
      dark: discoTheme.primaryDark,
    },
    secondary: {
      main: discoTheme.secondary,
    },
    background: {
      default: discoTheme.background.main,
      paper: discoTheme.background.paper,
    },
    text: {
      primary: discoTheme.text.primary,
      secondary: discoTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: discoTheme.background.card,
          borderRadius: 16,
          border: '2px solid',
          borderImage: 'linear-gradient(45deg, #FF1493, #00CED1, #FFD700) 1',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: discoTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${discoTheme.background.input}`,
          color: discoTheme.text.primary,
        },
        head: {
          backgroundColor: discoTheme.background.input,
          fontWeight: 700,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: discoTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Classic Chess Theme (Black & White high contrast)
export const classicChessTheme = {
  primary: '#FFFFFF',
  primaryDark: '#E0E0E0',
  secondary: '#000000',
  accent: '#B8860B',
  background: {
    main: '#1C1C1C',
    paper: '#2A2A2A',
    card: '#363636',
    input: '#424242'
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
    accent: '#FFD700'
  },
  success: "#4caf50",
};

export const classicChessThemeConfig = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: classicChessTheme.primary,
      dark: classicChessTheme.primaryDark,
    },
    secondary: {
      main: classicChessTheme.secondary,
    },
    background: {
      default: classicChessTheme.background.main,
      paper: classicChessTheme.background.paper,
    },
    text: {
      primary: classicChessTheme.text.primary,
      secondary: classicChessTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: classicChessTheme.background.card,
          borderRadius: 12,
          border: '1px solid #B8860B',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: classicChessTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${classicChessTheme.background.input}`,
          color: classicChessTheme.text.primary,
        },
        head: {
          backgroundColor: classicChessTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: classicChessTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Marble Theme (Elegant white/grey marble)
export const marbleTheme = {
  primary: '#757575',
  primaryDark: '#424242',
  secondary: '#9E9E9E',
  accent: '#BDBDBD',
  background: {
    main: '#ECEFF1',
    paper: '#FFFFFF',
    card: '#F5F5F5',
    input: '#E0E0E0'
  },
  text: {
    primary: '#212121',
    secondary: '#616161',
    accent: '#424242'
  },
  success: "#4caf50",
};

export const marbleThemeConfig = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: marbleTheme.primary,
      dark: marbleTheme.primaryDark,
    },
    secondary: {
      main: marbleTheme.secondary,
    },
    background: {
      default: marbleTheme.background.main,
      paper: marbleTheme.background.paper,
    },
    text: {
      primary: marbleTheme.text.primary,
      secondary: marbleTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: marbleTheme.background.card,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: marbleTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${marbleTheme.background.input}`,
          color: marbleTheme.text.primary,
        },
        head: {
          backgroundColor: marbleTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: marbleTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});

// Neon Cyber Theme
export const neonCyberTheme = {
  primary: '#00FFFF',
  primaryDark: '#00CED1',
  secondary: '#FF00FF',
  accent: '#00FF00',
  background: {
    main: '#0A0E27',
    paper: '#0F1729',
    card: '#16213E',
    input: '#1A2B4A'
  },
  text: {
    primary: '#00FFFF',
    secondary: '#B0E0E6',
    accent: '#FF00FF'
  },
  success: "#00FF00",
};

export const neonCyberThemeConfig = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: neonCyberTheme.primary,
      dark: neonCyberTheme.primaryDark,
    },
    secondary: {
      main: neonCyberTheme.secondary,
    },
    background: {
      default: neonCyberTheme.background.main,
      paper: neonCyberTheme.background.paper,
    },
    text: {
      primary: neonCyberTheme.text.primary,
      secondary: neonCyberTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: neonCyberTheme.background.card,
          borderRadius: 12,
          border: '1px solid #00FFFF',
          boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: neonCyberTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${neonCyberTheme.background.input}`,
          color: neonCyberTheme.text.primary,
        },
        head: {
          backgroundColor: neonCyberTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: neonCyberTheme.background.card,
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
});