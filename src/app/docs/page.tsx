"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Container,
  Tab,
  Tabs,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";

import { PROVIDERS } from "@/libs/docs/helper";
import { TabPanel } from "@/componets/tabs/tab";
import { renderProviderSetup } from "@/componets/docs/RenderProviderSetup";
import { renderIntegrations } from "@/componets/docs/RenderIntegrations";
import { renderModelRecommendations } from "@/componets/docs/RenderModelRecommendations";
import { renderCostsAnalysis } from "@/componets/docs/RenderCostBreakdown";
import { renderFAQ } from "@/componets/docs/RenderFaq";
import { renderHeader } from "@/componets/docs/RenderChessAgineHeader";
import { renderSupportedProvider } from "@/componets/docs/RenderSupportedProvider";
import { renderFeatures } from "@/componets/docs/RenderFeatures";
import { agineTheme as docsTheme} from "@/theme/theme";
import MCPdocs from "@/componets/docs/RenderMCPDocs";

const ChessAgineDocumentation = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <ThemeProvider theme={docsTheme}>
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
              <Tab label="Setup Guides" />
              <Tab label="Features" />
              <Tab label="Model Recommendations" />
              <Tab label="Costs Analysis" />
              <Tab label="Supported Providers" />
              <Tab label="Integrations" />
              <Tab label="FAQ" />
              <Tab label="ChessAgine MCP"/>
            </Tabs>
          </Box>

          <TabPanel value={selectedTab} index={0}>
            <Typography variant="h4" gutterBottom color="primary.text">
              API Setup Guides
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Follow these step-by-step guides to set up your API key with any
              supported provider.
            </Typography>

            {Object.values(PROVIDERS).map((provider) => (
              <Box key={provider.name}>{renderProviderSetup(provider)}</Box>
            ))}
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            {renderFeatures()}
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            {renderModelRecommendations()}
          </TabPanel>

          <TabPanel value={selectedTab} index={3}>
            {renderCostsAnalysis()}
          </TabPanel>

          <TabPanel value={selectedTab} index={4}>
            {renderSupportedProvider()}
          </TabPanel>

          <TabPanel value={selectedTab} index={5}>
            {renderIntegrations()}
          </TabPanel>

          <TabPanel value={selectedTab} index={6}>
            {renderFAQ()}
          </TabPanel>

          <TabPanel value={selectedTab} index={7}>
            <MCPdocs/>
          </TabPanel>

          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom color="primary.text">
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you encounter any issues during setup, please create an issue on Github
            </Typography>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default ChessAgineDocumentation;