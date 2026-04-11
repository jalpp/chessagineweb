"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import {
  startLichessOAuth,
  getLichessToken,
  getLichessUsername,
  clearLichessCredentials,
  revokeLichessToken,
} from "@/lib/lichessOAuth";

export default function LichessConnectButton() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Read from localStorage on mount (client-only)
  useEffect(() => {
    setToken(getLichessToken());
    setUsername(getLichessUsername());
  }, []);

  // Also listen for storage changes from the callback page
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lichess-token" || e.key === "lichess-username") {
        setToken(getLichessToken());
        setUsername(getLichessUsername());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    try {
      await startLichessOAuth(); // redirects away, so loading stays true
    } catch (err) {
      setError("Failed to start Lichess OAuth. Please try again.");
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError("");
    try {
      if (token) {
        await revokeLichessToken(token);
      }
      clearLichessCredentials();
      // Also clear from Clerk metadata
      await fetch("/api/lichess/sync-metadata", { method: "DELETE" }).catch(
        () => {}
      );
      setToken("");
      setUsername("");
    } catch (err) {
      setError("Failed to disconnect. Token cleared locally.");
      clearLichessCredentials();
      setToken("");
      setUsername("");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !!token && !!username;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
          <Typography variant="caption">{error}</Typography>
        </Alert>
      )}

      {isConnected ? (
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Chip
            icon={<CheckCircleIcon />}
            label={`Connected as ${username}`}
            color="success"
            variant="outlined"
            size="small"
            component="a"
            href={`https://lichess.org/@/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            clickable
          />
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={
              loading ? (
                <CircularProgress size={14} />
              ) : (
                <LinkOffIcon fontSize="small" />
              )
            }
            onClick={handleDisconnect}
            disabled={loading}
          >
            Disconnect
          </Button>
        </Box>
      ) : (
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={
            loading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <LinkIcon fontSize="small" />
            )
          }
          onClick={handleConnect}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          {loading ? "Redirecting to Lichess…" : "Connect with Lichess"}
        </Button>
      )}
    </Box>
  );
}