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
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { useLocalStorage } from "usehooks-ts";
import { PROVIDERS } from "@/libs/docs/helper";
import { ApiSettings } from "@/libs/agine/helper";
import {
  PREMIUM_MODELS,
  BYO_ANTHROPIC_MODELS,
  BYO_GEMINI_MODELS,
  BYO_OPENROUTER_MODELS,
  BYO_MODELS,
} from "@/libs/agine/modelConstants";
import { useAuth } from "@clerk/nextjs";
import IntegrationSettings from "./IntegrationSetting";

export type AgineCloudModel =
  | "openrouter/free"
  | "qwen/qwen3.5-9b"
  | "meta-llama/llama-3.1-8b-instruct"
  | "google/gemini-3.1-pro-preview"
  | "nvidia/nemotron-3-super-120b-a12b"
  | "anthropic/claude-sonnet-4.6"
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001"
  | "gemini-2.5-pro-preview-05-06"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "openai/gpt-5.4";

export type ModelOnlySettings = Pick<ApiSettings, "model">;

const FREE_MODEL = "openrouter/free";

function getByoKeyLabel(model: string): string | null {
  if (BYO_ANTHROPIC_MODELS.includes(model)) return "Anthropic Key";
  if (BYO_GEMINI_MODELS.includes(model)) return "Gemini Key";
  if (BYO_OPENROUTER_MODELS.includes(model)) return "OpenRouter Key";
  return null;
}

const ModelSetting: React.FC = () => {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const [savedModel, setSavedModel] = useLocalStorage<string>("selected-model", FREE_MODEL);
  const [anthropicToken] = useLocalStorage<string>("anthropic-token", "");
  const [geminiToken] = useLocalStorage<string>("gemini-token", "");
  const [openrouterToken] = useLocalStorage<string>("openrouter-token", "");

  const [tempModel, setTempModel] = useState<string>(savedModel);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  // If user is downgraded to free and had a non-free model saved, reset it
  useEffect(() => {
    if (!isPaidTier && savedModel !== FREE_MODEL) {
      setSavedModel(FREE_MODEL);
    }
  }, [isPaidTier, savedModel, setSavedModel]);

  useEffect(() => {
    setTempModel(isPaidTier ? savedModel : FREE_MODEL);
  }, [savedModel, isPaidTier]);

  useEffect(() => {
    if (validationError) {
      const t = setTimeout(() => setValidationError(""), 5000);
      return () => clearTimeout(t);
    }
  }, [validationError]);

  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess]);

  const allModels = Object.entries(PROVIDERS).flatMap(([providerKey, config]) =>
    config.models.map((model) => ({ provider: providerKey, providerName: config.name, model }))
  );

  const isByoKeyConfigured = (model: string): boolean => {
    if (BYO_ANTHROPIC_MODELS.includes(model)) return !!anthropicToken;
    if (BYO_GEMINI_MODELS.includes(model)) return !!geminiToken;
    if (BYO_OPENROUTER_MODELS.includes(model)) return !!openrouterToken;
    return false;
  };

  /**
   * Locking rules:
   * - Free tier: every model except openrouter/free is locked
   * - Paid tier: BYO models are only usable if the relevant key is configured
   *              (they're selectable but saving is blocked without a key)
   */
  const isModelLocked = (model: string): boolean => {
    if (!isPaidTier) return model !== FREE_MODEL;
    return false; // paid users can select any model; key validation happens on save
  };

  const handleSave = () => {
    if (!tempModel) {
      setValidationError("Please select a model");
      return;
    }

    // Free tier hard-lock
    if (!isPaidTier && tempModel !== FREE_MODEL) {
      setValidationError("Free tier is limited to openrouter/free. Upgrade to access more models.");
      return;
    }

    // Paid tier — BYO models need their key configured
    if (isPaidTier && BYO_MODELS.includes(tempModel) && !isByoKeyConfigured(tempModel)) {
      setValidationError(
        `This model requires your own ${getByoKeyLabel(tempModel)}. Add it in the API Integrations section below.`
      );
      return;
    }

    setSavedModel(tempModel);
    setValidationError("");
    setSaveSuccess(true);
  };

  const handleReset = () => {
    setTempModel(isPaidTier ? FREE_MODEL : FREE_MODEL);
    setValidationError("");
  };

  if (!isSignedIn) {
    return <Alert severity="info">Please sign in to configure your model settings.</Alert>;
  }

  const selectedEntry = allModels.find((m) => m.model === tempModel);
  const isSelectedPremium = PREMIUM_MODELS.includes(tempModel);
  const isSelectedByo = BYO_MODELS.includes(tempModel);
  const selectedByoKeyLabel = getByoKeyLabel(tempModel);
  const selectedByoKeyConfigured = isSelectedByo && isByoKeyConfigured(tempModel);

  return (
    <Box>
      {validationError && (
        <Alert severity="error" sx={{ mb: 3 }}>{validationError}</Alert>
      )}

      {!isPaidTier && (
        <Alert
          severity="warning"
          icon={<StarIcon />}
          sx={{ mb: 3 }}
          action={
            <Button color="warning" size="small" variant="outlined" href="/pricing">
              Upgrade
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            Free Tier — openrouter/free Only
          </Typography>
          <Typography variant="caption">
            You currently have access to <strong>openrouter/free</strong> only. Upgrade to paid
            tier to unlock AgineCloud premium models (Claude Sonnet, Gemini, Qwen, Llama) and
            BYO-key models (Claude direct, Gemini direct, GPT-5.4).
          </Typography>
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6">Model Selection</Typography>
            {selectedEntry && (
              <Chip size="small" label={selectedEntry.providerName} variant="outlined" />
            )}
            {isSelectedPremium && isPaidTier && (
              <Chip size="small" label="Premium" color="primary" icon={<StarIcon />} />
            )}
            {isSelectedByo && isPaidTier && (
              <Chip
                size="small"
                label={selectedByoKeyConfigured ? "Key Set ✓" : "Needs Key"}
                color={selectedByoKeyConfigured ? "success" : "warning"}
                icon={<VpnKeyIcon />}
                variant="outlined"
              />
            )}
          </Box>

          <FormControl fullWidth>
            <InputLabel>AI Model</InputLabel>
            <Select
              value={tempModel}
              label="AI Model"
              onChange={(e) => {
                // Free users cannot change away from the free model
                if (!isPaidTier) return;
                setTempModel(e.target.value);
              }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
              renderValue={(value) => {
                const isPremium = PREMIUM_MODELS.includes(value);
                const isByo = BYO_MODELS.includes(value);
                const locked = isModelLocked(value);
                return (
                  <Box display="flex" alignItems="center" gap={1}>
                    {locked && <LockIcon fontSize="small" color="disabled" />}
                    {isPremium && isPaidTier && <StarIcon fontSize="small" color="primary" />}
                    {isByo && isPaidTier && <VpnKeyIcon fontSize="small" color="action" />}
                    <Typography variant="body2">{value}</Typography>
                  </Box>
                );
              }}
            >
              {Object.entries(PROVIDERS).map(([providerKey, config]) => [
                <MenuItem key={`header-${providerKey}`} disabled sx={{ opacity: "1 !important" }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, textTransform: "uppercase", opacity: 0.5 }}
                  >
                    {config.name}
                  </Typography>
                </MenuItem>,

                ...config.models.map((model) => {
                  const isPremium = PREMIUM_MODELS.includes(model);
                  const isByo = BYO_MODELS.includes(model);
                  const byoKeyLabel = getByoKeyLabel(model);
                  const byoConfigured = isByo && isByoKeyConfigured(model);
                  const locked = isModelLocked(model);

                  return (
                    <MenuItem
                      key={model}
                      value={model}
                      disabled={locked}
                      sx={{ pl: 3, opacity: locked ? 0.45 : 1, pointerEvents: "auto" }}
                    >
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        width="100%"
                        gap={1}
                      >
                        <Typography variant="body2">{model}</Typography>

                        {locked && (
                          <Chip
                            size="small"
                            label="Paid"
                            icon={<LockIcon />}
                            color="default"
                            variant="outlined"
                            component="a"
                            href="/pricing"
                            clickable
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            sx={{ fontSize: "0.65rem", height: 20 }}
                          />
                        )}
                        {!locked && isPremium && (
                          <Chip
                            size="small"
                            label="Premium"
                            icon={<StarIcon />}
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: "0.65rem", height: 20 }}
                          />
                        )}
                        {!locked && isByo && (
                          <Chip
                            size="small"
                            label={byoConfigured ? `${byoKeyLabel} ✓` : byoKeyLabel ?? "BYO Key"}
                            icon={<VpnKeyIcon />}
                            color={byoConfigured ? "success" : "default"}
                            variant="outlined"
                            sx={{ fontSize: "0.62rem", height: 20 }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  );
                }),
              ])}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
            {!isPaidTier
              ? "Free tier: only openrouter/free is available. Upgrade to unlock all models."
              : isSelectedByo
              ? selectedByoKeyConfigured
                ? `Using your own ${selectedByoKeyLabel} — no AgineCloud credits used.`
                : `Add your ${selectedByoKeyLabel} in API Integrations below to use this model.`
              : "You have access to all AgineCloud and BYO-key models."}
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