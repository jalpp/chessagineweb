"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  IconButton,
  Divider,
  Link,
} from "@mui/material";
import {
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useLocalStorage } from "usehooks-ts";
import { useAuth } from "@clerk/nextjs";
import LichessConnectButton from "@/componets/lichess/LichessConnectButton";

interface TokenFieldProps {
  label: string;
  description: React.ReactNode;
  storageKey: string;
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
}

const TokenField: React.FC<TokenFieldProps> = ({
  label,
  description,
  storageKey,
  placeholder = "Paste your token here",
  disabled = false,
  disabledReason,
}) => {
  const [savedToken, setSavedToken] = useLocalStorage<string>(storageKey, "");
  const [tempToken, setTempToken] = useState(savedToken);
  const [showToken, setShowToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setTempToken(savedToken);
  }, [savedToken]);

  const handleSave = () => {
    setSavedToken(tempToken.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleClear = () => {
    setTempToken("");
    setSavedToken("");
  };

  const isConfigured = !!savedToken;
  const hasChanges = tempToken.trim() !== savedToken;

  return (
    <Card variant="outlined" sx={{ mb: 2, opacity: disabled ? 0.65 : 1 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            {label}
          </Typography>
          {isConfigured && !disabled && (
            <Chip
              size="small"
              label="Connected"
              color="success"
              icon={<CheckCircleIcon />}
              variant="outlined"
            />
          )}
          {disabled && (
            <Chip
              size="small"
              label="Paid Only"
              color="default"
              icon={<LockIcon />}
              variant="outlined"
            />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          {description}
        </Typography>

        {disabled && disabledReason && (
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }} icon={<LockIcon fontSize="small" />}>
            <Typography variant="caption">{disabledReason}</Typography>
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="caption">Token saved successfully!</Typography>
          </Alert>
        )}

        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder={placeholder}
          value={tempToken}
          onChange={(e) => setTempToken(e.target.value)}
          disabled={disabled}
          type={showToken ? "text" : "password"}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowToken((v) => !v)}
                  disabled={disabled}
                  edge="end"
                >
                  {showToken ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5 }}
        />

        <Box display="flex" gap={1} justifyContent="flex-end">
          {isConfigured && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClear}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={disabled || !hasChanges}
          >
            Save
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

const IntegrationSettings: React.FC = () => {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  if (!isSignedIn) {
    return (
      <Alert severity="info">
        Please sign in to configure your API integrations.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        API Integrations
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Connect your personal accounts to unlock personalized chess analysis.
        Tokens are stored locally in your browser and sent securely with each request.
      </Typography>

      <Typography variant="overline" color="text.secondary" display="block" mb={1}>
        Free Features
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              Lichess Account
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Connect your Lichess account so Agine can access your studies and game history.{" "}
            <Link href="https://lichess.org" target="_blank" rel="noopener noreferrer" variant="caption">
              lichess.org
            </Link>
          </Typography>
          <LichessConnectButton />
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="overline" color="text.secondary">
          Paid Features
        </Typography>
        {!isPaidTier && (
          <Chip
            size="small"
            label="Upgrade"
            color="warning"
            icon={<StarIcon />}
            component="a"
            href="/pricing"
            clickable
            variant="outlined"
            sx={{ fontSize: "0.6rem", height: 18 }}
          />
        )}
      </Box>

      {!isPaidTier && (
        <Alert
          severity="warning"
          icon={<StarIcon />}
          sx={{ mb: 2 }}
          action={
            <Button color="warning" size="small" variant="outlined" href="/pricing">
              Upgrade
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            Unlock Paid Integrations
          </Typography>
          <Typography variant="caption">
            Upgrade to access ChessboardMagic repertoire integration and personal OpenRouter API keys.
          </Typography>
        </Alert>
      )}

      <TokenField
        label="ChessboardMagic API Token"
        storageKey="chessboardmagic-token"
        placeholder="enter your token"
        disabled={!isPaidTier}
        disabledReason="Upgrade to paid tier to connect your ChessboardMagic account."
        description={
          <>
            Connect your{" "}
            <Link
              href="https://www.chessboardmagic.com"
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
            >
              ChessboardMagic
            </Link>{" "}
            account so Agine can access your personal opening repertoires and game history.
          </>
        }
      />

      <TokenField
        label="OpenRouter API Key"
        storageKey="openrouter-token"
        placeholder="enter your token"
        disabled={!isPaidTier}
        disabledReason="Upgrade to paid tier to use your personal OpenRouter key."
        description={
          <>
            Provide your own{" "}
            <Link
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
            >
              OpenRouter API key
            </Link>{" "}
            to continue using your chosen model after your daily AgineCloud quota is hit.
            Your key is only used when the daily cap is reached.
          </>
        }
      />
    </Box>
  );
};

export default IntegrationSettings;