"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Stack,
  Typography,
  Select,
  MenuItem,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip,
  Divider,
} from "@mui/material";
import { Chess } from "chess.js";
import { getAllPresetsFens } from "@/libs/agine/fenhelper";
import { FenPreset, cohortColors } from "@/libs/agine/fenhelper";

interface FenSelectorProps {
  value: string;
  onChange: (fen: string) => void;
  disabled?: boolean;
}

export const FenSelector: React.FC<FenSelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const [customFen, setCustomFen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);

  const allPresets = useMemo(() => {
    return getAllPresetsFens();
  }, []);

  const cohortOptions = useMemo(() => Object.keys(cohortColors), []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allPresets.map((p) => p.category));
    const dojoCategories = new Set(
      allPresets
        .filter((p) => p.category === "dojo")
        .map((p) => p.dojoCategory || "")
    );
    return {
      main: Array.from(cats),
      dojo: Array.from(dojoCategories),
    };
  }, [allPresets]);

  // Filter presets based on category and search
  const filteredPresets = useMemo(() => {
    return allPresets.filter((preset) => {
      const matchesCategory =
        selectedCategory === "all" ||
        preset.category === selectedCategory ||
        (preset.category === "dojo" &&
          preset.dojoCategory === selectedCategory);

      const matchesSearch =
        !searchText ||
        preset.name.toLowerCase().includes(searchText.toLowerCase()) ||
        preset.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        preset.requirementName
          ?.toLowerCase()
          .includes(searchText.toLowerCase());

      const matchesCohort =
        !selectedCohort ||
        !preset.cohorts ||
        preset.cohorts.includes(selectedCohort);

      return matchesCategory && matchesSearch && matchesCohort;
    });
  }, [allPresets, selectedCategory, searchText, selectedCohort]);

  // Group presets by category
  const groupedPresets = useMemo(() => {
    const groups: Record<string, FenPreset[]> = {};
    filteredPresets.forEach((preset) => {
      const key =
        preset.category === "dojo"
          ? preset.dojoCategory || "dojo"
          : preset.category;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(preset);
    });
    return groups;
  }, [filteredPresets]);

  const validateAndSetFen = (fen: string) => {
    try {
      const game = new Chess();
      if (fen === "startpos") {
        onChange(game.fen());
        setError(null);
        return;
      }

      onChange(fen);
      setError(null);
    } catch {
      setError("Invalid FEN string");
    }
  };

  const handlePresetSelect = (preset: FenPreset | null) => {
    if (preset) {
      validateAndSetFen(preset.fen);
      setSearchText("");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" fontWeight={600}>
        Starting Position
      </Typography>

      {/* Category Filter */}
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Category</InputLabel>
        <Select
          label="Filter by Category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={disabled}
        >
          <MenuItem value="all">All Categories</MenuItem>
          <Divider />
          <MenuItem value="opening">Openings</MenuItem>
          <MenuItem value="endgame">Endgames</MenuItem>
          {categories.dojo.length > 0 && <Divider />}
          {categories.dojo.map((cat) => (
            <MenuItem key={cat} value={cat}>
              Dojo: {cat}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Search and Select Position */}
      <Autocomplete
        options={filteredPresets}
        groupBy={(option) =>
          option.category === "dojo"
            ? `Dojo - ${option.dojoCategory}`
            : option.category.charAt(0).toUpperCase() + option.category.slice(1)
        }
        getOptionLabel={(option) => option.name}
        disabled={disabled}
        onChange={(_, value) => handlePresetSelect(value)}
        inputValue={searchText}
        onInputChange={(_, value) => setSearchText(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Positions"
            placeholder="Search by name or description..."
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box sx={{ width: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {option.name}
                </Typography>
                {option.category === "dojo" && option.result && (
                  <Chip
                    label={option.result}
                    size="small"
                    color={option.result === "Win" ? "success" : "default"}
                  />
                )}
              </Box>
              {option.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {option.description || "n/a"}
                </Typography>
              )}
              {option.category === "dojo" && option.timeControl && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Time: {option.timeControl || "unlimited"}
                </Typography>
              )}
            </Box>
          </li>
        )}
      />

      <Autocomplete
        options={cohortOptions}
        value={selectedCohort}
        onChange={(_, value) => setSelectedCohort(value)}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Filter by Rating Cohort"
            placeholder="Select a rating band"
            size="small"
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option}>
            <Chip
              label={option}
              size="small"
              sx={{
                backgroundColor: cohortColors[option],
                color: "#000",
                fontWeight: 600,
              }}
            />
          </li>
        )}
      
      />

      {/* Statistics */}
      {filteredPresets.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={`${filteredPresets.length} positions`}
            size="small"
            variant="outlined"
          />
          {Object.entries(groupedPresets).map(([category, presets]) => (
            <Chip
              key={category}
              label={`${category}: ${presets.length}`}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      <Divider>OR</Divider>

      {/* Custom FEN */}
      <TextField
        label="Custom FEN"
        placeholder="Paste a FEN string here"
        value={customFen}
        disabled={disabled}
        onChange={(e) => {
          setCustomFen(e.target.value);
          validateAndSetFen(e.target.value);
        }}
        multiline
        minRows={2}
        fullWidth
        error={!!error}
        helperText={error || "Enter a custom FEN position"}
      />

      {value && (
        <Alert severity="info">
          Game will start from the selected position.
        </Alert>
      )}
    </Stack>
  );
};
