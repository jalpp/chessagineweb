"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  exchangeLichessCode,
  fetchLichessAccount,
  saveLichessCredentials,
} from "@/lib/lichessOAuth";
import { Box, CircularProgress, Typography, Alert, Button } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

type Status = "loading" | "success" | "error";

export default function LichessCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // Prevent double-execution in React Strict Mode (dev mounts effects twice)
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      if (error) {
        setErrorMsg(`Lichess declined: ${error}`);
        setStatus("error");
        return;
      }

      if (!code || !state) {
        setErrorMsg("Missing OAuth parameters in the callback URL.");
        setStatus("error");
        return;
      }

      try {
        // 1. Exchange code for token
        const { access_token } = await exchangeLichessCode(code, state);

        // 2. Fetch the Lichess account to get the username
        const account = await fetchLichessAccount(access_token);

        // 3. Persist in localStorage (keeps existing keys intact)
        saveLichessCredentials(access_token, account.username);
        setUsername(account.username);

        // 4. Optionally sync username to Clerk metadata (best-effort, not critical)
        try {
          await fetch("/api/lichess/sync-metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lichessUsername: account.username }),
          });
        } catch {
          // non-critical – localStorage is the source of truth for the UI
          console.warn("Could not sync lichessUsername to Clerk metadata");
        }

        setStatus("success");
      } catch (err) {
        console.error("[lichess/callback]", err);
        setErrorMsg(
          err instanceof Error ? err.message : "Unknown error during OAuth"
        );
        setStatus("error");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={3}
    >
      {status === "loading" && (
        <>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Connecting your Lichess account…
          </Typography>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircleIcon sx={{ fontSize: 56, color: "success.main" }} />
          <Typography variant="h6">
            Connected as{" "}
            <strong>
              <a
                href={`https://lichess.org/@/${username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {username}
              </a>
            </strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your Lichess token has been saved. You can close this tab or go back
            to settings.
          </Typography>
          <Button variant="contained" onClick={() => router.push("/setting")}>
            Back to settings
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <ErrorIcon sx={{ fontSize: 56, color: "error.main" }} />
          <Alert severity="error" sx={{ maxWidth: 480 }}>
            {errorMsg}
          </Alert>
          <Button variant="outlined" onClick={() => router.push("/setting")}>
            Back to settings
          </Button>
        </>
      )}
    </Box>
  );
}