"use client";
import { Box, Container, Paper } from "@mui/material";
import ModelSetting from "@/componets/tabs/ModelSetting";
import ThemeSelector from "@/componets/ThemeSelector";

const SettingsPage = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            p: 4,
          }}
        >
          <ThemeSelector />
          <Box mt={4}>
            <ModelSetting />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SettingsPage;
