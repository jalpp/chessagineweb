"use client";
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
} from "@mui/material";
import ModelSetting from "@/componets/tabs/ModelSetting";
import IntegrationSettings from "@/componets/tabs/IntegrationSetting";
import ThemeSelector from "@/componets/ThemeSelector";
import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";

const SettingsPage = () => {
  const { isSignedIn} = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Theme — public */}
          <ThemeSelector />

          <Divider sx={{ my: 4 }} />

          {isSignedIn ? (
            <Box>
              <ModelSetting />
              <Divider sx={{ my: 4 }} />
              <IntegrationSettings />
            </Box>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={3}
              py={4}
            >
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