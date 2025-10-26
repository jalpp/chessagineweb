import { deepPurple, indigo, purple } from "@mui/material/colors";
import { createTheme } from "@mui/material";
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
    success: { main: "#81c784" },
    error: { main: "#e57373" },
    divider: "#333",
  },
  components: {
    MuiCard: { styleOverrides: { root: { backgroundColor: "#1E1E1E" } } },
    MuiDialog: { styleOverrides: { paper: { backgroundColor: "#1E1E1E" } } },
  },
});