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

import { TabPanel } from "@/componets/tabs/tab";
import { renderFAQ } from "@/componets/docs/RenderFaq";
import { renderHeader } from "@/componets/docs/RenderChessAgineHeader";
import { renderFeatures } from "@/componets/docs/RenderFeatures";
import MCPdocs from "@/componets/docs/RenderMCPDocs";

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
              <Tab label="Features" />
              <Tab label="FAQ" />
              <Tab label="ChessAgine MCP" />
            </Tabs>
          </Box>

          <TabPanel value={selectedTab} index={0}>
            {renderFeatures()}
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            {renderFAQ()}
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <MCPdocs />
          </TabPanel>

          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom color="primary.text">
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you encounter any issues during setup, please create an issue
              on Github
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default ChessAgineDocumentation;
