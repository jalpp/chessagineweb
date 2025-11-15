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
} from '@mui/material';
import { useTheme, ThemeType } from '@/context/ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import WavesIcon from '@mui/icons-material/Waves';
import ForestIcon from '@mui/icons-material/Forest';
import NaturePeopleIcon from '@mui/icons-material/NaturePeople';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DiamondIcon from '@mui/icons-material/Diamond';
import FlashOnIcon from '@mui/icons-material/FlashOn';

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
    { value: 'wooden', label: 'Wooden Chess', icon: <NaturePeopleIcon />, color: '#8B4513' },
    { value: 'disco', label: 'Disco', icon: <MusicNoteIcon />, color: '#FF1493' },
    { value: 'classicChess', label: 'Classic Chess', icon: <CheckBoxIcon />, color: '#FFFFFF' },
    { value: 'marble', label: 'Marble', icon: <DiamondIcon />, color: '#757575' },
    { value: 'neonCyber', label: 'Neon Cyber', icon: <FlashOnIcon />, color: '#00FFFF' },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        GUI Color Settings
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
    </Box>
  );
};

export default ThemeSelector;