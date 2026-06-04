"use client";
import { usePageReady } from "@/hooks/usePageReady";
import { Box, Container, Paper, Typography, Divider } from "@mui/material";
import ModelSetting from "@/componets/tabs/ModelSetting";
import ThemeSelector from "@/componets/ThemeSelector";
import IntegrationSettings from "@/componets/tabs/IntegrationSetting";
import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";

const SettingsPage = () => {
  usePageReady();
  const { isSignedIn } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4 }}>

          {/* Theme — always visible to all */}
          <ThemeSelector />

          <Divider sx={{ my: 4 }} />

          {/* Integrations — Lichess available to all, paid gated */}
          <IntegrationSettings />

          <Divider sx={{ my: 4 }} />

          {/* AI model settings — sign-in required */}
          {isSignedIn ? (
            <Box>
              <ModelSetting />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
              <Typography variant="body1" color="text.secondary">
                Sign in to configure ChessAgine&apos;s AI model settings.
              </Typography>
              <SignIn />
            </Box>
          )}

        </Paper>
      </Container>
    </Box>
  );
};

export default SettingsPage;
