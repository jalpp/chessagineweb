"use client"
import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Info as InfoIcon,
  Language as LanguageIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { useLocalStorage } from 'usehooks-ts';
import { LANGUAGES, PROVIDERS } from '@/libs/docs/helper';


export interface ApiSettings {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  model: string;
  apiKey: string;
  language: string;
  isRouted: boolean;
  isCloud: boolean;
  ollamaBaseUrl?: string;
}


const ModelSetting: React.FC = () => {
  
  const defaultSettings: ApiSettings = {
    provider: 'ollama',
    model: 'gpt-oss:20b-cloud',
    apiKey: '',
    isCloud: true,
    isRouted: false,
    language: 'English',
  };

  
  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>('api-settings', defaultSettings);

  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [tempSettings, setTempSettings] = useState<ApiSettings>(() => ({
    ...defaultSettings,
    ...apiSettings,
  }));

  
  useEffect(() => {
    setTempSettings(({
      ...defaultSettings,
      ...apiSettings,
    }));
  }, [apiSettings]);

  
  const validateApiKey = (provider: string, apiKey: string): boolean => {
    if (!provider || !apiKey) return false;
    
    const config = PROVIDERS[provider];
    if (!config) return false;
    
    
    if (provider === 'ollama') return true;
    
   
    if (!config.keyPrefix) return true;
    
    return apiKey.startsWith(config.keyPrefix);
  };

  const handleProviderChange = (provider: string) => {
    const config = PROVIDERS[provider];
    const newSettings = {
      ...tempSettings,
      provider: provider as ApiSettings['provider'],
      model: config?.models[0] || '',
    };

    // Reset routing if switching to provider that doesn't support it
    if (provider === 'ollama') {
      newSettings.isRouted = false;
    }

    setTempSettings(newSettings);
    setValidationError('');
  };


  const handleSave = () => {
    
    if (!tempSettings.provider) {
      setValidationError('Please select a provider');
      return;
    }
    
    if (!tempSettings.model) {
      setValidationError('Please select a model');
      return;
    }
    
    
    if (tempSettings.provider !== 'ollama') {
      if (!tempSettings.apiKey) {
        setValidationError('Please enter an API key');
        return;
      }
      
      if (!validateApiKey(tempSettings.provider, tempSettings.apiKey)) {
        const config = PROVIDERS[tempSettings.provider];
        const expectedPrefix = config?.keyPrefix;
        const providerName = config?.name;
        if (expectedPrefix) {
          setValidationError(`Invalid API key format. ${providerName || 'This provider'} keys should start with "${expectedPrefix}"`);
        } else {
          setValidationError(`Invalid API key format for ${providerName || 'this provider'}`);
        }
        return;
      }
    }

   
    if (tempSettings.isRouted) {
      if (!tempSettings.apiKey) {
        setValidationError('Please enter an OpenRouter API key when routing is enabled');
        return;
      }
      
      if (!tempSettings.apiKey.startsWith('sk-or-')) {
        setValidationError('Invalid OpenRouter API key format. Keys should start with "sk-or-"');
        return;
      }
    }

    setApiSettings(tempSettings);
      
    setValidationError('');
    setSaveSuccess(true);
    
    
    setTimeout(() => setSaveSuccess(false), 3000);
  };

 
  const handleReset = () => {
    setTempSettings(defaultSettings);
    setValidationError('');
  };

  


  const getAvailableModels = () => {
    if (!tempSettings.provider) return [];
    return PROVIDERS[tempSettings.provider]?.models || [];
  };

  
  const currentProviderConfig = PROVIDERS[tempSettings.provider];


  const selectedLanguage = LANGUAGES.find(lang => lang.name === (tempSettings.language || 'English')) || LANGUAGES[0];

  const supportsRouting = currentProviderConfig?.supportsRouting || false;

  const colors = {
    background: { card: '#1a1a1a', input: '#2a2a2a' },
    text: { primary: '#ffffff', secondary: '#cccccc', accent: '#bb86fc' },
    primary: '#bb86fc',
    primaryDark: '#9965f4',
    secondary: '#03dac6',
    accent: '#cf6679',
  };

  return (
    <Box>
       
      {validationError && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            backgroundColor: '#d32f2f20',
            color: colors.text.primary,
          }}
        >
          {validationError}
        </Alert>
      )}

      <Card 
        variant="outlined" 
        sx={{ 
          mb: 3, 
          backgroundColor: colors.background.card,
          borderColor: `${colors.secondary}60`,
        }}
      >
        <CardContent>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ color: colors.text.accent }}
          >
            Provider Configuration
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel sx={{ color: colors.text.secondary }}>
              AI Provider
            </InputLabel>
            <Select
              value={tempSettings.provider || ''}
              label="AI Provider"
              onChange={(e) => handleProviderChange(e.target.value)}
              sx={{
                backgroundColor: colors.background.input,
                color: colors.text.primary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: `${colors.secondary}60`,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.secondary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: colors.background.input,
                    color: colors.text.primary,
                  },
                },
              }}
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
              <InputLabel sx={{ color: colors.text.secondary }}>
                Model
              </InputLabel>
              <Select
                value={tempSettings.model || ''}
                label="Model"
                onChange={(e) => setTempSettings({ ...tempSettings, model: e.target.value })}
                sx={{
                  backgroundColor: colors.background.input,
                  color: colors.text.primary,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${colors.secondary}60`,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.secondary,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.primary,
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: colors.background.input,
                      color: colors.text.primary,
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
                    onChange={(e) => setTempSettings({ ...tempSettings, isRouted: e.target.checked })}
                    sx={{
                      color: colors.text.secondary,
                      '&.Mui-checked': {
                        color: colors.primary,
                      },
                    }}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <SwapHorizIcon fontSize="small" sx={{ color: colors.text.accent }} />
                    <Typography sx={{ color: colors.text.primary }}>
                      Use OpenRouter
                    </Typography>
                    <Chip 
                      size="small" 
                      label="Optional"
                      sx={{
                        backgroundColor: `${colors.secondary}30`,
                        color: colors.text.primary,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                }
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: colors.text.secondary, 
                  ml: 4,
                  display: 'block',
                  fontStyle: 'italic'
                }}
              >
                Route {tempSettings.model} requests through OpenRouter for unified API access and better reliability.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card 
        variant="outlined" 
        sx={{ 
          mb: 3, 
          backgroundColor: colors.background.card,
          borderColor: `${colors.secondary}60`,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LanguageIcon sx={{ color: colors.text.accent }} />
            <Typography 
              variant="h6"
              sx={{ color: colors.text.accent }}
            >
              Output Language
            </Typography>
            {selectedLanguage && (
              <Chip 
                size="small" 
                label={`${selectedLanguage.flag} ${selectedLanguage.nativeName}`}
                sx={{
                  backgroundColor: `${colors.primary}30`,
                  color: colors.text.primary,
                  borderColor: colors.primary,
                }}
                variant="outlined"
              />
            )}
          </Box>
          
          <FormControl fullWidth>
            <InputLabel sx={{ color: colors.text.secondary }}>
              Preferred Language for AI Responses
            </InputLabel>
            <Select
              value={tempSettings.language || 'English'}
              label="Preferred Language for AI Responses"
              onChange={(e) => setTempSettings({ ...tempSettings, language: e.target.value })}
              sx={{
                backgroundColor: colors.background.input,
                color: colors.text.primary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: `${colors.secondary}60`,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.secondary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: colors.background.input,
                    color: colors.text.primary,
                    maxHeight: 400,
                  },
                },
              }}
            >
              {LANGUAGES.map((language) => (
                <MenuItem key={language.code} value={language.name}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      {language.flag}
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.text.primary }}>
                        {language.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: colors.text.secondary,
                          fontStyle: 'italic' 
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
              color: colors.text.secondary, 
              mt: 1, 
              display: 'block',
              fontStyle: 'italic'
            }}
          >
            The AI will attempt to respond in your selected language. Note that response quality may vary depending on the models training data for different languages.
          </Typography>
        </CardContent>
      </Card>

      {tempSettings.provider && currentProviderConfig && !tempSettings.provider.toLowerCase().includes("ollama") && !tempSettings.isRouted && (
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 3,
            backgroundColor: colors.background.card,
            borderColor: `${colors.secondary}60`,
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography 
                variant="h6"
                sx={{ color: colors.text.accent }}
              >
                API Key
              </Typography>
              <Chip 
                size="small" 
                label={currentProviderConfig.name}
                sx={{
                  backgroundColor: `${colors.secondary}30`,
                  color: colors.text.primary,
                  borderColor: colors.secondary,
                }}
                variant="outlined"
              />
            </Box>
            
            <TextField
              fullWidth
              label={`${currentProviderConfig.name} API Key`}
              type={showApiKey ? 'text' : 'password'}
              value={tempSettings.apiKey || ''}
              onChange={(e) => setTempSettings({ ...tempSettings, apiKey: e.target.value })}
              placeholder={`Enter your ${currentProviderConfig.name} API key...`}
              helperText={currentProviderConfig.keyPrefix ? `Should start with "${currentProviderConfig.keyPrefix}"` : 'Enter your API key'}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: colors.background.input,
                },
                '& .MuiInputLabel-root': {
                  color: colors.text.secondary,
                },
                '& .MuiOutlinedInput-root': {
                  color: colors.text.primary,
                  '& fieldset': {
                    borderColor: `${colors.secondary}60`,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.secondary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: colors.text.secondary,
                },
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                    sx={{ color: colors.text.secondary }}
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
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  color: colors.accent,
                  '&:hover': {
                    color: colors.text.accent,
                  }
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
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 3,
            backgroundColor: colors.background.card,
            borderColor: `${colors.primary}60`,
            boxShadow: `0 0 10px ${colors.primary}30`,
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SwapHorizIcon sx={{ color: colors.text.accent }} />
              <Typography 
                variant="h6"
                sx={{ color: colors.text.accent }}
              >
                OpenRouter API Key
              </Typography>
              <Chip 
                size="small" 
                label="Routing Enabled"
                sx={{
                  backgroundColor: `${colors.primary}30`,
                  color: colors.text.primary,
                  borderColor: colors.primary,
                }}
                variant="outlined"
              />
            </Box>
            
            <TextField
              fullWidth
              label="OpenRouter API Key"
              type={showOpenRouterKey ? 'text' : 'password'}
              value={tempSettings.apiKey || ''}
              onChange={(e) => setTempSettings({ ...tempSettings, apiKey: e.target.value })}
              placeholder="Enter your OpenRouter API key..."
              helperText='Should start with "sk-or-"'
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: colors.background.input,
                },
                '& .MuiInputLabel-root': {
                  color: colors.text.secondary,
                },
                '& .MuiOutlinedInput-root': {
                  color: colors.text.primary,
                  '& fieldset': {
                    borderColor: `${colors.primary}60`,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: colors.text.secondary,
                },
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    edge="end"
                    sx={{ color: colors.text.secondary }}
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
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  color: colors.accent,
                  '&:hover': {
                    color: colors.text.accent,
                  }
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
                backgroundColor: `${colors.primary}10`,
                color: colors.text.primary,
                '& .MuiAlert-icon': {
                  color: colors.primary,
                },
              }}
            >
              Your {currentProviderConfig.name} {tempSettings.model} requests will be routed through OpenRouter. 
              This provides unified API access and may offer better reliability and fallback options.
            </Alert>
          </CardContent>
        </Card>
      )}

      {tempSettings.provider.toLowerCase().includes("ollama") && (
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 3,
            backgroundColor: colors.background.card,
            borderColor: `${colors.secondary}60`,
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography 
                variant="h6"
                sx={{ color: colors.text.accent }}
              >
                Local LLM ngrok endpoint
              </Typography>
              <Chip 
                size="small" 
                label={currentProviderConfig.name}
                sx={{
                  backgroundColor: `${colors.secondary}30`,
                  color: colors.text.primary,
                  borderColor: colors.secondary,
                }}
                variant="outlined"
              />
            </Box>
            
            <TextField
              fullWidth
              type="text"
              value={tempSettings.ollamaBaseUrl || ''}
              onChange={(e) => setTempSettings({ ...tempSettings, ollamaBaseUrl: e.target.value.trim() })}
              placeholder="Enter your ngrok endpoint https:..."
              helperText="Enter your ngrok endpoint https:..."
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: colors.background.input,
                },
                '& .MuiInputLabel-root': {
                  color: colors.text.secondary,
                },
                '& .MuiOutlinedInput-root': {
                  color: colors.text.primary,
                  '& fieldset': {
                    borderColor: `${colors.secondary}60`,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.secondary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: colors.text.secondary,
                },
              }}
            />
            
            <Box mt={2}>
              <Link 
                href="https://www.chessagine.com/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  color: colors.accent,
                  '&:hover': {
                    color: colors.text.accent,
                  }
                }}
              >
                <InfoIcon fontSize="small" />
                Read the docs to start the ngrok server to connect to local LLM 
              </Link>
            </Box>
          </CardContent>
        </Card>
      )}

      {saveSuccess && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            backgroundColor: `${colors.secondary}20`,
            color: colors.text.primary,
            '& .MuiAlert-icon': {
              color: colors.accent,
            },
          }}
        >
          Settings saved successfully!
        </Alert>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button 
          variant="outlined" 
          onClick={handleReset}
          sx={{
            borderColor: colors.secondary,
            color: colors.text.secondary,
            '&:hover': {
              borderColor: colors.text.accent,
              backgroundColor: `${colors.secondary}20`,
            }
          }}
        >
          Reset
        </Button>
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!tempSettings.provider}
          sx={{
            backgroundColor: colors.primary,
            '&:hover': {
              backgroundColor: colors.primaryDark,
            },
            '&:disabled': {
              backgroundColor: `${colors.primary}50`,
              color: `${colors.text.primary}50`,
            }
          }}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default ModelSetting;