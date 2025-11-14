import { deepPurple, indigo, purple, blue, green, grey } from "@mui/material/colors";
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