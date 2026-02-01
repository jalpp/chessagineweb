import {
  Card,
  CardContent,
  Typography,
  ListItem,
  List,
  ListItemIcon,
  ListItemText,
  Button,
  Box,
  Chip,
  Alert,
} from "@mui/material";
import {
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from "@mui/icons-material";


import { ProviderConfig } from "@/libs/docs/helper";

export const renderProviderSetup = (provider: ProviderConfig) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Typography
        variant="h6"
        gutterBottom
       
      >
        {provider.name} Setup Guide
      </Typography>

    
    {provider.name === "aginecloud" ? (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center',
       
          borderRadius: 2,
         
        }}>
          <CheckCircleIcon sx={{ 
            fontSize: 48, 
            mb: 2
          }} />
          <Typography variant="h6" sx={{  mb: 1 }}>
            No Setup Required!
          </Typography>
          <Typography variant="body2" >
            AgineCloud models are completely free and ready to use immediately.
            Just select a model and start analyzing your chess games.
            AgineCloud is in beta, so you might experience a few delays.
          </Typography>
        </Box>
      ) : provider.name === "Ollama" ? (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Two Options:</strong> Run ChessAgine locally with local Ollama models, or connect your Ollama instance via ngrok to use the web version.
            </Typography>
          </Alert>

          <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
            Option 1: Local ChessAgine + Local Ollama 
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Download and install Ollama" />
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<LaunchIcon />}
                href="https://ollama.com/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ml: 2 }}
              >
                Download
              </Button>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Pull models locally using terminal (e.g., ollama pull llama3)" />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Clone the ChessAgine repository" />
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<LaunchIcon />}
                href="https://github.com/jalpp/chessagineweb"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ml: 2 }}
              >
                GitHub Repo
              </Button>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Set environment variable: NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434"
                secondary="Add this to your .env.local file in the project root"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Run npm install and npm run dev" />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Access ChessAgine at localhost:3000 and select your local Ollama models" />
            </ListItem>
          </List>

          <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
            Option 2: Web ChessAgine + Ollama via Ngrok
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Download and install Ollama" />
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<LaunchIcon />}
                href="https://ollama.com/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ml: 2 }}
              >
                Download
              </Button>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Sign up for Ollama and install models (local or -cloud models via chat)" />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Download Ngrok" />
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<LaunchIcon />}
                href="https://ngrok.com/download/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ml: 2 }}
              >
                Download
              </Button>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Authenticate ngrok using token from your dashboard" />
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<LaunchIcon />}
                href="https://dashboard.ngrok.com/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ ml: 2 }}
              >
                Open Dashboard
              </Button>
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Point ngrok to port 11434: ngrok http 11434"
                secondary="Run this command in your terminal"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Copy the ngrok HTTPS URL (e.g., https://xxxx.ngrok.io)" />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Paste the ngrok URL in ChessAgine settings" />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Start using ChessAgine with your Ollama models!" />
            </ListItem>
          </List>
        </>
      ) : (
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Visit the API keys page" />
          </ListItem>
          <ListItem sx={{ pl: 4 }}>
            <Button
              variant="outlined"
              size="small"
              color="success"
              startIcon={<LaunchIcon />}
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get API Key
            </Button>
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Create a new API key" />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Copy your API key"
              secondary={`Should start with: ${provider.keyPrefix}...`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Enter the key in ChessAgine settings" />
          </ListItem>
        </List>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="secondary">
          Available Models:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {provider.models.map((model) => (
            <Chip
              key={model}
              label={model}
              size="small"
              variant="outlined"

            />
          ))}
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button
          variant="text"
          size="small"
          color="success"
          startIcon={<InfoIcon />}
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Documentation
        </Button>
      </Box>
    </CardContent>
  </Card>
);