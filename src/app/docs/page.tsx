"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Container,
  Tab,
  Tabs,
  CssBaseline,
} from "@mui/material";
import { PricingTable } from "@clerk/nextjs";

import { TabPanel } from "@/componets/tabs/tab";
import { renderFAQ } from "@/componets/docs/RenderFaq";
import { renderHeader } from "@/componets/docs/RenderChessAgineHeader";
import { renderFeatures } from "@/componets/docs/RenderFeatures";
import MCPdocs from "@/componets/docs/RenderMCPDocs";

const TABS = ["Features", "FAQ", "Pricing", "ChessAgine MCP"];

const ChessAgineDocumentation = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {renderHeader()}

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              {TABS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Box>

          <TabPanel value={selectedTab} index={0}>
            {renderFeatures()}
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            {renderFAQ()}
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <Box mb={3}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Pricing
              </Typography>
            </Box>
            
            <PricingTable newSubscriptionRedirectUrl="/chat" />

            <Box textAlign="center" mt={3}>
              <Typography variant="caption" color="text.secondary">
                Free models are from random free OpenRouter models, paid tier supports model on AgineCloud with daily cap limit.
              </Typography>
            </Box>
          </TabPanel>

          {/* MCP */}
          <TabPanel value={selectedTab} index={3}>
            <MCPdocs />
          </TabPanel>

          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you encounter any issues, please create an issue on GitHub.
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default ChessAgineDocumentation;
