"use client";
import { Box, Container, Typography, Divider } from "@mui/material";
import { PricingTable } from "@clerk/nextjs";

const PricingPage = () => {
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
          Free models run on community-donated resources. Premium models run on
          dedicated infrastructure for faster, more reliable responses.
        </Typography>
      </Box>
    </Container>
  );
};

export default PricingPage;