"use client";
import { usePageReady } from "@/hooks/usePageReady";
import { Box, Container, Typography, Divider } from "@mui/material";
import { PricingTable } from "@clerk/nextjs";


export default function PricingPage() {
  usePageReady();
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box textAlign="center" mb={2}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          ChessAgine Pricing
        </Typography>
      </Box>

      <Divider sx={{ my: 4 }} />

      <PricingTable newSubscriptionRedirectUrl="/chat" />

      <Box textAlign="center" mt={4}>
        <Typography variant="caption" color="text.secondary">
          Free models are from random free OpenRouter models, paid tier supports model on AgineCloud with daily cap limit.
        </Typography>
      </Box>
    </Container>
  );
};

