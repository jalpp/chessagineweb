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
          Free tier includes the gift model (qwen/qwen3-coder-next — free, no daily cap) and the
          random openrouter/free router, plus support for your own Anthropic/Gemini/OpenRouter
          API key. Paid tier additionally unlocks AgineCloud premium models with a daily usage
          cap.
        </Typography>
      </Box>
    </Container>
  );
};

