"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  IconButton,
  Card,
  CardContent,
  Link,
  Chip,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Info as InfoIcon,
  Language as LanguageIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { useLocalStorage } from "usehooks-ts";
import { LANGUAGES, PROVIDERS } from "@/libs/docs/helper";
import { ApiSettings } from "@/libs/agine/helper";

const ModelSetting: React.FC = () => {
  const ollamaURL = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT;

  const defaultSettings: ApiSettings = {
    provider: "aginecloud",
    model: "openai/gpt-oss-20b",
    apiKey: "",
    ollamaBaseUrl: ollamaURL,
    isRouted: false,
    language: "English",
  };

  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>(
    "api-settings",
    defaultSettings,
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [tempSettings, setTempSettings] = useState<ApiSettings>(() => ({
    ...defaultSettings,
    ...apiSettings,
    // Always use env variable if present, override localStorage
    ollamaBaseUrl: ollamaURL || apiSettings.ollamaBaseUrl,
  }));

  useEffect(() => {
    const mergedSettings = {
      ...defaultSettings,
      ...apiSettings,
      // Always use env variable if present, override localStorage
      ollamaBaseUrl: ollamaURL || apiSettings.ollamaBaseUrl,
    };

    setTempSettings(mergedSettings);

    // If env variable exists and it's different from what's saved, update localStorage
    if (ollamaURL && apiSettings.ollamaBaseUrl !== ollamaURL) {
      setApiSettings({
        ...apiSettings,
        ollamaBaseUrl: ollamaURL,
      });
    }
  }, [apiSettings, ollamaURL]);

  const validateApiKey = (provider: string, apiKey: string): boolean => {
    if (!provider || !apiKey) return false;

    const config = PROVIDERS[provider];
    if (!config) return false;

    if (provider === "ollama") return true;

    if (!config.keyPrefix) return true;

    return apiKey.startsWith(config.keyPrefix);
  };

  const handleProviderChange = (provider: string) => {
    const config = PROVIDERS[provider];
    const newSettings = {
      ...tempSettings,
      provider: provider as ApiSettings["provider"],
      model: config?.models[0] || "",
    };

    // Reset routing if switching to provider that doesn't support it
    if (provider === "ollama") {
      newSettings.isRouted = false;
      // Ensure ollamaBaseUrl is set from env if available
      if (ollamaURL) {
        newSettings.ollamaBaseUrl = ollamaURL;
      }
    }

    setTempSettings(newSettings);
    setValidationError("");
  };

  const handleSave = () => {
    if (!tempSettings.provider) {
      setValidationError("Please select a provider");
      return;
    }

    if (!tempSettings.model) {
      setValidationError("Please select a model");
      return;
    }

    if (
      tempSettings.provider === "anthropic" ||
      tempSettings.provider === "google" ||
      tempSettings.provider === "openai"
    ) {
      if (!tempSettings.apiKey) {
        setValidationError("Please enter an API key");
        return;
      }

      if (
        !validateApiKey(tempSettings.provider, tempSettings.apiKey) &&
        !tempSettings.isRouted
      ) {
        const config = PROVIDERS[tempSettings.provider];
        const expectedPrefix = config?.keyPrefix;
        const providerName = config?.name;
        if (expectedPrefix) {
          setValidationError(
            `Invalid API key format. ${providerName || "This provider"} keys should start with "${expectedPrefix}"`,
          );
        } else {
          setValidationError(
            `Invalid API key format for ${providerName || "this provider"}`,
          );
        }
        return;
      }
    }

    if (tempSettings.isRouted) {
      if (!tempSettings.apiKey) {
        setValidationError(
          "Please enter an OpenRouter API key when routing is enabled",
        );
        return;
      }

      if (!tempSettings.apiKey.startsWith("sk-or-")) {
        setValidationError(
          'Invalid OpenRouter API key format. Keys should start with "sk-or-"',
        );
        return;
      }
    }

    // Ensure ollamaBaseUrl is always saved with env value if present
    const settingsToSave = {
      ...tempSettings,
      ollamaBaseUrl: ollamaURL || tempSettings.ollamaBaseUrl,
    };

    setApiSettings(settingsToSave);

    setValidationError("");
    setSaveSuccess(true);

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setTempSettings(defaultSettings);
    setValidationError("");
  };

  const getAvailableModels = () => {
    if (!tempSettings.provider) return [];
    return PROVIDERS[tempSettings.provider]?.models || [];
  };

  const currentProviderConfig = PROVIDERS[tempSettings.provider];

  const selectedLanguage =
    LANGUAGES.find(
      (lang) => lang.name === (tempSettings.language || "English"),
    ) || LANGUAGES[0];

  const supportsRouting = currentProviderConfig?.supportsRouting || false;

  return (
    <Box>
      {validationError && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
        >
          {validationError}
        </Alert>
      )}

      <Card
        variant="outlined"
        sx={{
          mb: 3,
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Provider Configuration
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>AI Provider</InputLabel>
            <Select
              value={tempSettings.provider || ""}
              label="AI Provider"
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              <MenuItem value="">
                <em>Select a provider</em>
              </MenuItem>
              {Object.entries(PROVIDERS).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Model Selection */}
          {tempSettings.provider && currentProviderConfig && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Model</InputLabel>
              <Select
                value={tempSettings.model || ""}
                label="Model"
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, model: e.target.value })
                }
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 400,
                    },
                  },
                }}
              >
                {getAvailableModels().map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {supportsRouting && (
            <Box mt={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempSettings.isRouted || false}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        isRouted: e.target.checked,
                      })
                    }
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <SwapHorizIcon fontSize="small" />
                    <Typography>Use OpenRouter</Typography>
                    <Chip size="small" label="Optional" />
                  </Box>
                }
              />
              <Typography
                variant="caption"
                sx={{
                  ml: 4,
                  display: "block",
                  fontStyle: "italic",
                }}
              >
                Route {tempSettings.model} requests through OpenRouter for
                unified API access and better reliability.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card
        variant="outlined"
        sx={{
          mb: 3,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LanguageIcon />
            <Typography variant="h6">Output Language</Typography>
            {selectedLanguage && (
              <Chip
                size="small"
                label={`${selectedLanguage.flag} ${selectedLanguage.nativeName}`}
                variant="outlined"
              />
            )}
          </Box>

          <FormControl fullWidth>
            <InputLabel>Preferred Language for AI Responses</InputLabel>
            <Select
              value={tempSettings.language || "English"}
              label="Preferred Language for AI Responses"
              onChange={(e) =>
                setTempSettings({ ...tempSettings, language: e.target.value })
              }
            >
              {LANGUAGES.map((language) => (
                <MenuItem key={language.code} value={language.name}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Typography sx={{ fontSize: "1.2rem" }}>
                      {language.flag}
                    </Typography>
                    <Box>
                      <Typography variant="body2">{language.name}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontStyle: "italic",
                        }}
                      >
                        {language.nativeName}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography
            variant="caption"
            sx={{
              mt: 1,
              display: "block",
              fontStyle: "italic",
            }}
          >
            The AI will attempt to respond in your selected language. Note that
            response quality may vary depending on the models training data for
            different languages.
          </Typography>
        </CardContent>
      </Card>

      {tempSettings.provider &&
        currentProviderConfig &&
        !tempSettings.provider.toLowerCase().includes("ollama") &&
        !tempSettings.provider.toLocaleLowerCase().includes("aginecloud") &&
        !tempSettings.isRouted && (
          <Card
            variant="outlined"
            sx={{
              mb: 3,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="h6">API Key</Typography>
                <Chip
                  size="small"
                  label={currentProviderConfig.name}
                  variant="outlined"
                />
              </Box>

              <TextField
                fullWidth
                label={`${currentProviderConfig.name} API Key`}
                type={showApiKey ? "text" : "password"}
                value={tempSettings.apiKey || ""}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, apiKey: e.target.value })
                }
                placeholder={`Enter your ${currentProviderConfig.name} API key...`}
                helperText={
                  currentProviderConfig.keyPrefix
                    ? `Should start with "${currentProviderConfig.keyPrefix}"`
                    : "Enter your API key"
                }
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />

              <Box mt={2}>
                <Link
                  href={currentProviderConfig.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <InfoIcon fontSize="small" />
                  Get your {currentProviderConfig.name} API key
                </Link>
              </Box>
            </CardContent>
          </Card>
        )}

      {tempSettings.isRouted && (
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SwapHorizIcon />
              <Typography variant="h6">OpenRouter API Key</Typography>
              <Chip size="small" label="Routing Enabled" variant="outlined" />
            </Box>

            <TextField
              fullWidth
              label="OpenRouter API Key"
              type={showOpenRouterKey ? "text" : "password"}
              value={tempSettings.apiKey || ""}
              onChange={(e) =>
                setTempSettings({ ...tempSettings, apiKey: e.target.value })
              }
              placeholder="Enter your OpenRouter API key..."
              helperText='Should start with "sk-or-"'
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    edge="end"
                  >
                    {showOpenRouterKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />

            <Box mt={2}>
              <Link
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <InfoIcon fontSize="small" />
                Get your OpenRouter API key
              </Link>
            </Box>

            <Alert
              severity="info"
              sx={{
                mt: 2,
              }}
            >
              Your {currentProviderConfig.name} {tempSettings.model} requests
              will be routed through OpenRouter. This provides unified API
              access and may offer better reliability and fallback options.
            </Alert>
          </CardContent>
        </Card>
      )}

      {tempSettings.provider.toLowerCase().includes("ollama") && (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="h6">
                {ollamaURL
                  ? "Local Ollama Connection"
                  : "Local LLM ngrok endpoint"}
              </Typography>
              <Chip
                size="small"
                label={currentProviderConfig.name}
                variant="outlined"
              />
              {ollamaURL && (
                <Chip
                  size="small"
                  label="Connected"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            {ollamaURL ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Connected to local Ollama API at: {ollamaURL}
              </Alert>
            ) : (
              <>
                <TextField
                  fullWidth
                  type="text"
                  value={tempSettings.ollamaBaseUrl || ""}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      ollamaBaseUrl: e.target.value.trim(),
                    })
                  }
                  placeholder="Enter your ngrok endpoint https:..."
                  helperText="Enter your ngrok endpoint https:..."
                />

                <Box mt={2}>
                  <Link
                    href="https://www.chessagine.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <InfoIcon fontSize="small" />
                    Read the docs to start the ngrok server to connect to local
                    LLM
                  </Link>
                </Box>
              </>
            )}

            {/* Model Setup Instructions */}
            {tempSettings.model && (
              <Box mt={3}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: 600 }}
                >
                  Setup Instructions
                </Typography>
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2" gutterBottom>
                    Make sure you have downloaded the model locally:
                  </Typography>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <code>ollama pull {tempSettings.model}</code>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: "block" }}
                  >
                    Run this command in your terminal to download the model
                    before using it.
                  </Typography>
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {saveSuccess && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
          }}
        >
          Settings saved successfully!
        </Alert>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={handleReset}>
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!tempSettings.provider}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default ModelSetting;
