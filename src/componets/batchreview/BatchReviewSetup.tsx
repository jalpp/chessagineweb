import React, { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Insights as InsightsIcon,
  Person as PersonIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import {
  BATCH_LOCAL_DEPTH_DEFAULT,
  BatchReviewOptions,
} from "@/libs/batchreview/types";

interface BatchReviewSetupProps {
  /** Starts an Agine Analyzer run with the chosen options. */
  onStart: (options: BatchReviewOptions) => void;
  /** Disables the form while a run is in flight. */
  disabled: boolean;
}

const PERF_OPTIONS = ["bullet", "blitz", "rapid", "classical", "correspondence"];
const GAME_COUNT_PRESETS = [5, 10, 20, 50, 100, 200];

/**
 * Setup card for the Agine Analyzer: username + game count up front,
 * filters and engine depth tucked into a collapsible section.
 */
const BatchReviewSetup: React.FC<BatchReviewSetupProps> = ({
  onStart,
  disabled,
}) => {
  const [lichessUsername, setLichessUsername] = useLocalStorage(
    "lichess-username",
    ""
  );
  const [maxGames, setMaxGames] = useState(20);
  const [perfTypes, setPerfTypes] = useState<string[]>([]);
  const [ratedFilter, setRatedFilter] = useState<"both" | "rated" | "casual">(
    "both"
  );
  const [localDepth, setLocalDepth] = useState(BATCH_LOCAL_DEPTH_DEFAULT);

  const togglePerf = (perf: string) => {
    setPerfTypes((prev) =>
      prev.includes(perf) ? prev.filter((p) => p !== perf) : [...prev, perf]
    );
  };

  const handleStart = () => {
    onStart({
      username: lichessUsername.trim(),
      maxGames,
      perfTypes,
      rated: ratedFilter === "both" ? undefined : ratedFilter === "rated",
      localDepth,
    });
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: "16px" }}
    >
      <Stack spacing={3}>
        <TextField
          label="Lichess Username"
          variant="outlined"
          value={lichessUsername}
          onChange={(e) => setLichessUsername(e.target.value)}
          fullWidth
          disabled={disabled}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box>
          <Typography
            gutterBottom
            color="text.secondary"
            fontSize="0.8rem"
            fontWeight={600}
            sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            Games to analyze
          </Typography>
          <ToggleButtonGroup
            value={maxGames}
            exclusive
            onChange={(_, v) => v !== null && setMaxGames(v)}
            disabled={disabled}
            fullWidth
            size="small"
            color="primary"
          >
            {GAME_COUNT_PRESETS.map((count) => (
              <ToggleButton key={count} value={count} sx={{ fontWeight: 700 }}>
                {count}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Accordion
          disableGutters
          elevation={0}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: "10px !important",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <TuneIcon fontSize="small" color="action" />
              <Typography fontSize="0.9rem" fontWeight={600}>
                Filters & engine
              </Typography>
              {(perfTypes.length > 0 || ratedFilter !== "both") && (
                <Chip
                  label={`${perfTypes.length + (ratedFilter !== "both" ? 1 : 0)} active`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  gutterBottom
                  color="text.secondary"
                  fontSize="0.8rem"
                >
                  Time controls (none selected = all)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {PERF_OPTIONS.map((perf) => (
                    <Chip
                      key={perf}
                      label={perf}
                      color={perfTypes.includes(perf) ? "primary" : "default"}
                      variant={perfTypes.includes(perf) ? "filled" : "outlined"}
                      onClick={() => togglePerf(perf)}
                      disabled={disabled}
                      sx={{ textTransform: "capitalize" }}
                    />
                  ))}
                </Stack>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rated filter</InputLabel>
                  <Select
                    value={ratedFilter}
                    label="Rated filter"
                    onChange={(e) =>
                      setRatedFilter(
                        e.target.value as "both" | "rated" | "casual"
                      )
                    }
                    disabled={disabled}
                  >
                    <MenuItem value="both">Rated + Casual</MenuItem>
                    <MenuItem value="rated">Rated only</MenuItem>
                    <MenuItem value="casual">Casual only</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Local engine depth</InputLabel>
                  <Select
                    value={localDepth}
                    label="Local engine depth"
                    onChange={(e) => setLocalDepth(Number(e.target.value))}
                    disabled={disabled}
                  >
                    <MenuItem value={8}>8 — fastest</MenuItem>
                    <MenuItem value={10}>10 — fast</MenuItem>
                    <MenuItem value={12}>12 — balanced</MenuItem>
                    <MenuItem value={14}>14 — slower, sharper</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Typography variant="caption" color="text.secondary">
                Games that already have Lichess server analysis are reviewed
                instantly. Other games use ChessDB cloud evals first, with a
                shallow local Stockfish pass only for positions the cloud has
                never seen.
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Button
          variant="contained"
          size="large"
          startIcon={<InsightsIcon />}
          onClick={handleStart}
          disabled={disabled || !lichessUsername.trim()}
          sx={{ py: 1.4, fontWeight: 700, borderRadius: "10px" }}
        >
          Analyze My Games
        </Button>
      </Stack>
    </Paper>
  );
};

export default BatchReviewSetup;
