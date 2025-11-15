"use client";
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface BodyWrapperProps {
  children: ReactNode;
}

export default function BodyWrapper({ children }: BodyWrapperProps) {
  const theme = useMuiTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {children}
    </Box>
  );
}