"use client";

import { Box, CircularProgress, Fade } from "@mui/material";
import { useNavigation } from "@/context/NavigationContext";

export default function PageLoader() {
  const { isNavigating } = useNavigation();

  return (
    <Fade in={isNavigating} unmountOnExit timeout={{ enter: 60, exit: 250 }}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress size={48} thickness={3} color="primary" />
      </Box>
    </Fade>
  );
}