import {
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
} from "@mui/material";
import { PROVIDERS } from "@/libs/docs/helper";
import { Key as KeyIcon, Info as InfoIcon } from "@mui/icons-material";

export const renderSupportedProvider = () => (
  <>
    <Typography variant="h4" gutterBottom color="primary.text">
      Supported Providers
    </Typography>
    <Typography variant="body1" paragraph color="text.secondary">
      ChessAgine supports the following AI providers. Click on any provider to
      learn more.
    </Typography>

    <Grid container spacing={3}>
      {Object.values(PROVIDERS).map((provider) => (
        <Grid key={provider.name}>
          <Card
            sx={{
              height: "100%",
              cursor: "pointer",
              "&:hover": {
                transform: "translateY(-2px)",
                transition: "transform 0.2s ease-in-out",
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary.text">
                {provider.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {provider.models.length} available models
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {provider.supportsRouting
                  ? "Supports OpenRouter"
                  : "No OpenRouter Support"}
              </Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {provider.name !== "Ollama" && provider.name !== "aginecloud"&& (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<KeyIcon />}
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get API Key
                  </Button>
                )}
                <Button
                  size="small"
                  variant="text"
                  color="success"
                  startIcon={<InfoIcon />}
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {provider.name} Docs
                </Button>
                {provider.supportsRouting && (
                  <Button
                    size="small"
                    variant="text"
                    color="success"
                    startIcon={<InfoIcon />}
                    href={"https://openrouter.ai/docs/quickstart"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OpenRouter Docs
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </>
);
