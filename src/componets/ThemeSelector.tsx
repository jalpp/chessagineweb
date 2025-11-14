"use client";
import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { useTheme, ThemeType } from '@/context/ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import WavesIcon from '@mui/icons-material/Waves';
import ForestIcon from '@mui/icons-material/Forest';

const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();

  const handleChange = (event: SelectChangeEvent) => {
    setTheme(event.target.value as ThemeType);
  };

  const themes = [
    { value: 'light', label: 'Light', icon: <LightModeIcon />, color: '#1976d2' },
    { value: 'dark', label: 'Dark Grey', icon: <DarkModeIcon />, color: '#bb86fc' },
    { value: 'purple', label: 'Purple', icon: <ColorLensIcon />, color: '#9c27b0' },
    { value: 'darkBlue', label: 'Dark Blue', icon: <WavesIcon />, color: '#1e88e5' },
    { value: 'forest', label: 'Forest', icon: <ForestIcon />, color: '#388e3c' },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Theme Settings
      </Typography>
      
      <FormControl fullWidth sx={{ mb: 4 }}>
        <InputLabel id="theme-select-label">Select Theme</InputLabel>
        <Select
          labelId="theme-select-label"
          id="theme-select"
          value={currentTheme}
          label="Select Theme"
          onChange={handleChange}
        >
          {themes.map((theme) => (
            <MenuItem key={theme.value} value={theme.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {React.cloneElement(theme.icon, { sx: { color: theme.color } })}
                {theme.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        Theme Preview
      </Typography>
      
      <Grid container spacing={2}>
        {themes.map((theme) => (
          <Grid  sx={{xs: 12, sm: 6, md: 4}} key={theme.value}>
            <Card
              sx={{
                cursor: 'pointer',
                border: currentTheme === theme.value ? 2 : 1,
                borderColor: currentTheme === theme.value ? theme.color : 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => setTheme(theme.value as ThemeType)}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                {React.cloneElement(theme.icon, { 
                  sx: { fontSize: 40, color: theme.color, mb: 1 } 
                })}
                <Typography variant="body2">{theme.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ThemeSelector;