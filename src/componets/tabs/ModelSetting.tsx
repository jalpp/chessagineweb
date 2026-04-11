"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
} from "@mui/material";
import {
  Save as SaveIcon,
  Lock as LockIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useLocalStorage } from "usehooks-ts";
import { PROVIDERS } from "@/libs/docs/helper";
import { ApiSettings } from "@/libs/agine/helper";
import { useAuth } from "@clerk/nextjs";
import IntegrationSettings from "./IntegrationSetting";

export type AgineCloudModel =
  | "openrouter/free"
  | "qwen/qwen3.5-9b"
  | "meta-llama/llama-3.1-8b-instruct"
  | "google/gemini-3.1-pro-preview"
  | "nvidia/nemotron-3-super-120b-a12b"
  | "anthropic/claude-sonnet-4.6";

export type ModelOnlySettings = Pick<ApiSettings, "model">;

const DEFAULT_MODEL = "openrouter/free";

export const PREMIUM_MODELS: AgineCloudModel[] = [
  "google/gemini-3.1-pro-preview",
  "anthropic/claude-sonnet-4.6",
  "qwen/qwen3.5-9b",
  "nvidia/nemotron-3-super-120b-a12b",
  "meta-llama/llama-3.1-8b-instruct",
];

const ModelSetting: React.FC = () => {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const [savedModel, setSavedModel] = useLocalStorage<string>(
    "selected-model",
    DEFAULT_MODEL,
  );

  const [tempModel, setTempModel] = useState<string>(savedModel);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Sync tempModel when savedModel changes from localStorage
  useEffect(() => {
    setTempModel(savedModel);
  }, [savedModel]);

  // Auto-clear validation error after 5 seconds
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const allModels = Object.entries(PROVIDERS).flatMap(([providerKey, config]) =>
    config.models.map((model) => ({
      provider: providerKey,
      providerName: config.name,
      model,
    })),
  );

  const handleSave = () => {
    if (!tempModel) {
      setValidationError("Please select a model");
      return;
    }
    if (PREMIUM_MODELS.includes(tempModel as AgineCloudModel) && !isPaidTier) {
      setValidationError("This model requires a paid tier subscription.");
      return;
    }
    setSavedModel(tempModel);
    setValidationError("");
    setSaveSuccess(true);
  };

  const handleReset = () => {
    setTempModel(DEFAULT_MODEL);
    setValidationError("");
  };

  if (!isSignedIn) {
    return (
      <Alert severity="info">
        Please sign in to configure your model settings.
      </Alert>
    );
  }

  const selectedEntry = allModels.find((m) => m.model === tempModel);
  // Derived value - recalculated on every render
  const isSelectedPremium = PREMIUM_MODELS.includes(
    tempModel as AgineCloudModel,
  );

  return (
    <Box>
      {validationError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {validationError}
        </Alert>
      )}

      {!isPaidTier && (
        <Alert
          severity="warning"
          icon={<StarIcon />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="warning"
              size="small"
              variant="outlined"
              href="/pricing"
            >
              Upgrade
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            Unlock Premium Models
          </Typography>
          <Typography variant="caption">
            Upgrade to paid tier to access Gemini, Claude Sonnet, Qwen, and
            Llama running on dedicated resources.
          </Typography>
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6">Model Selection</Typography>
            {selectedEntry && (
              <Chip
                size="small"
                label={selectedEntry.providerName}
                variant="outlined"
              />
            )}
            {isSelectedPremium && isPaidTier && (
              <Chip
                size="small"
                label="Premium"
                color="primary"
                icon={<StarIcon />}
              />
            )}
          </Box>

          <FormControl fullWidth>
            <InputLabel>AI Model</InputLabel>
            <Select
              value={tempModel}
              label="AI Model"
              onChange={(e) => setTempModel(e.target.value)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
              renderValue={(value) => {
                const isPremium = PREMIUM_MODELS.includes(
                  value as AgineCloudModel,
                );
                return (
                  <Box display="flex" alignItems="center" gap={1}>
                    {isPremium && isPaidTier && (
                      <StarIcon fontSize="small" color="primary" />
                    )}
                    {isPremium && !isPaidTier && (
                      <LockIcon fontSize="small" color="disabled" />
                    )}
                    <Typography variant="body2">{value}</Typography>
                  </Box>
                );
              }}
            >
              {Object.entries(PROVIDERS).map(([providerKey, config]) => [
                // Provider group header — no value prop so it won't interfere with selection
                <MenuItem
                  key={`header-${providerKey}`}
                  disabled
                  sx={{ opacity: "1 !important" }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      textTransform: "uppercase",
                      opacity: 0.5,
                    }}
                  >
                    {config.name}
                  </Typography>
                </MenuItem>,

                ...config.models.map((model) => {
                  const isPremium = PREMIUM_MODELS.includes(
                    model as AgineCloudModel,
                  );
                  const isLocked = isPremium && !isPaidTier;

                  return (
                    <MenuItem
                      key={model}
                      value={model}
                      disabled={isLocked}
                      sx={{
                        pl: 3,
                        opacity: isLocked ? 0.55 : 1,
                        pointerEvents: "auto",
                      }}
                    >
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        width="100%"
                        gap={1}
                      >
                        <Typography variant="body2">{model}</Typography>

                        {isLocked && (
                          <Chip
                            size="small"
                            label="Paid"
                            icon={<LockIcon />}
                            color="default"
                            variant="outlined"
                            component="a"
                            href="/pricing"
                            clickable
                            onClick={(e: React.MouseEvent) =>
                              e.stopPropagation()
                            }
                            sx={{ fontSize: "0.65rem", height: 20 }}
                          />
                        )}

                        {isPremium && isPaidTier && (
                          <Chip
                            size="small"
                            label="Premium"
                            icon={<StarIcon />}
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: "0.65rem", height: 20 }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  );
                }),
              ])}
            </Select>
          </FormControl>

          <Typography
            variant="caption"
            sx={{ mt: 1, display: "block", fontStyle: "italic" }}
          >
            {isPaidTier
              ? "You have access to all models, including premium ones."
              : "Free models are available now. Upgrade for premium models."}
          </Typography>
        </CardContent>
      </Card>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Model saved successfully!
        </Alert>
      )}

      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={handleReset}>
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!tempModel}
        >
          Save
        </Button>
      </Box>
      <Divider sx={{ my: 4 }} />
      <IntegrationSettings />
    </Box>
  );
};

export default ModelSetting;
