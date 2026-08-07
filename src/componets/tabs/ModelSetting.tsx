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
  GIFT_MODEL,
} from "@/libs/agine/modelConstants";
import { useAuth } from "@clerk/nextjs";
import IntegrationSettings from "./IntegrationSetting";
import { useSettings } from "@/context/SettingContext";

export type AgineCloudModel =
  | "openrouter/free"
  | "qwen/qwen3-coder-next"
  | "meta-llama/llama-4-scout"
  | "google/gemini-3.1-pro-preview"
  | "nvidia/nemotron-3-super-120b-a12b"
  | "anthropic/claude-sonnet-5"
  | "claude-opus-4-8"
  | "claude-sonnet-5"
  | "claude-haiku-4-5-20251001"
  | "gemini-3.1-pro-preview"
  | "gemini-3.6-flash"
  | "gemini-3.5-flash-lite"
  | "openai/gpt-5.6-sol";

export type ModelOnlySettings = Pick<ApiSettings, "model">;

/** Default model for every signed-in user, free or paid tier: the free
 *  "gift" model — on by default, no key needed, no usage cap. */
const FREE_MODEL = GIFT_MODEL;

function getByoKeyLabel(model: string): string | null {
  if (BYO_ANTHROPIC_MODELS.includes(model)) return "Anthropic Key";
  if (BYO_GEMINI_MODELS.includes(model)) return "Gemini Key";
  if (BYO_OPENROUTER_MODELS.includes(model)) return "OpenRouter Key";
  return null;
}

const ModelSetting: React.FC = () => {
  const { isSignedIn, has } = useAuth();
  const isPaidTier = has?.({ plan: "paid_tier" }) ?? false;

  const { selectedModel: savedModel, saveSettings } = useSettings();
  const setSavedModel = (m: string) => saveSettings({ selected_model: m });
  const [anthropicToken] = useLocalStorage<string>("anthropic-token", "");
  const [geminiToken] = useLocalStorage<string>("gemini-token", "");
  const [openrouterToken] = useLocalStorage<string>("openrouter-token", "");

  const [tempModel, setTempModel] = useState<string>(savedModel);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");


  useEffect(() => {
    if (!isPaidTier && PREMIUM_MODELS.includes(savedModel)) {
      setSavedModel(FREE_MODEL);
    }
  }, [isPaidTier, savedModel, setSavedModel]);

  useEffect(() => {
    setTempModel(!isPaidTier && PREMIUM_MODELS.includes(savedModel) ? FREE_MODEL : savedModel);
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

  const isModelLocked = (model: string): boolean => {
    return PREMIUM_MODELS.includes(model) && !isPaidTier;
  };

  const handleSave = () => {
    if (!tempModel) {
      setValidationError("Please select a model");
      return;
    }


    if (PREMIUM_MODELS.includes(tempModel) && !isPaidTier) {
      setValidationError(
        "AgineCloud premium models require the paid tier. Upgrade at /pricing, or use a BYO-key model with your own API key."
      );
      return;
    }

 
    if (BYO_MODELS.includes(tempModel) && !isByoKeyConfigured(tempModel)) {
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
    setTempModel(FREE_MODEL);
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
          severity="info"
          icon={<StarIcon />}
          sx={{ mb: 3 }}
          action={
            <Button color="warning" size="small" variant="outlined" href="/pricing">
              Upgrade
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            Free Tier — Gift Model + Bring Your Own Key
          </Typography>
          <Typography variant="caption">
            You have <strong>{GIFT_MODEL}</strong> free, on us — a strong tool-calling coding
            model, unlimited, no cap — plus the random <strong>openrouter/free</strong> router.
            You can also bring your own Anthropic, Gemini, or OpenRouter key below to use those
            models directly. Upgrade to paid tier to unlock AgineCloud premium models (Claude
            Sonnet, Gemini, Nemotron, Llama, GPT-5.6) without needing your own key.
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
              onChange={(e) => setTempModel(e.target.value)}
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
            {tempModel === GIFT_MODEL
              ? "Free gift model — no cost, no daily cap, available on every tier."
              : isSelectedByo
              ? selectedByoKeyConfigured
                ? `Using your own ${selectedByoKeyLabel} — no AgineCloud credits used.`
                : `Add your ${selectedByoKeyLabel} in API Integrations below to use this model.`
              : !isPaidTier
              ? "Free tier: openrouter/free included. Upgrade to unlock AgineCloud premium models."
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