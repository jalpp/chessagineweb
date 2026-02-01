import React, { useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Chip,
  Link,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Container,
} from "@mui/material";
import {
  ExpandMore,
  Download,
  Terminal,
  Settings,
  CheckCircle,
  Code,
  Laptop,
  Description,
} from "@mui/icons-material";

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ position: "relative", mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          overflow: "auto",
          borderRadius: 1,
        }}
      >
        <pre style={{ margin: 0 }}>{code}</pre>
      </Paper>
      <Button
        size="small"
        onClick={handleCopy}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          minWidth: "auto",
          fontSize: "0.75rem",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </Box>
  );
};

const MCPdocs =  () => {
  const [expanded, setExpanded] = useState<string | false>("option1");

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          ChessAgine MCP Installation
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Choose your preferred installation method to get started with
          ChessAgine MCP
        </Typography>
        <Chip label="Node.js 20+ Required" color="primary" size="small" />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Recommended:</strong> Use Option 1 (MCPB File) for the easiest
        installation experience
      </Alert>

      {/* Skills.md Download Section */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              ChessAgine Skill for Claude Desktop
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Download the ChessAgine skill to enhance your chess analysis experience in Claude Desktop
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<Description />}
            href="https://github.com/jalpp/chessagine.skill"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Skills.md
          </Button>
        </Box>
      </Alert>

      {/* Option 1: MCPB File */}
      <Accordion
        expanded={expanded === "option1"}
        onChange={handleChange("option1")}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Download color="primary" />
            <Box>
              <Typography variant="h6">
                Option 1: MCPB File (Recommended)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Direct installation in Claude Desktop
              </Typography>
            </Box>
            <Chip
              label="Easiest"
              color="success"
              size="small"
              sx={{ ml: "auto" }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="1. Download the MCPB file"
                secondary={
                  <Link
                    href="https://github.com/jalpp/chessagine-mcp/releases"
                    target="_blank"
                    rel="noopener"
                  >
                    Get latest release from GitHub
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="2. Open Claude Desktop" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="3. Go to Settings → Extensions → Install from file" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="4. Select the chessagine-mcp.mcpb file" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText primary="5. Restart Claude Desktop" />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Option 2: Local Development */}
      <Accordion
        expanded={expanded === "option2"}
        onChange={handleChange("option2")}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Code color="action" />
            <Box>
              <Typography variant="h6">
                Option 2: Local Development Setup
              </Typography>
              <Typography variant="caption" color="text.secondary">
                For developers and contributors
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Prerequisites
          </Typography>
          <List dense sx={{ mb: 2 }}>
            <ListItem>
              <ListItemText primary="• Node.js 20+" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• npm or yarn package manager" />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Clone and Setup
          </Typography>
          <CodeBlock
            code={`git clone https://github.com/jalpp/chessagine-mcp.git
cd chessagine-mcp
npm install
npm run build:mcp`}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Configure Claude Desktop
          </Typography>
          <Typography variant="body2" paragraph>
            Add to your <code>claude_desktop_config.json</code>:
          </Typography>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            <Laptop fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
            macOS/Linux:
          </Typography>
          <CodeBlock
            language="json"
            code={`{
  "mcpServers": {
    "chessagine-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/chessagine-mcp/build/runner/stdio.js"]
    }
  }
}`}
          />

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            <Laptop fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
            Windows:
          </Typography>
          <CodeBlock
            language="json"
            code={`{
  "mcpServers": {
    "chessagine-mcp": {
      "command": "node",
      "args": ["C:\\\\absolute\\\\path\\\\to\\\\chessagine-mcp\\\\build\\\\runner\\\\stdio.js"]
    }
  }
}`}
          />
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 4, p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          <Settings sx={{ verticalAlign: "middle", mr: 1 }} />
          Quick Start
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For the easiest setup, follow Option 1 and upload the MCPB file
          directly to Claude Desktop. Download the latest MCPB file from the{" "}
          <Link
            href="https://github.com/jalpp/chessagine-mcp/releases"
            target="_blank"
            rel="noopener"
          >
            GitHub releases page
          </Link>
          .
        </Typography>
      </Box>
    </Container>
  );
};

export default MCPdocs;