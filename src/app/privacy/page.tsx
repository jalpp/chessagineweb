"use client";
import { usePageReady } from "@/hooks/usePageReady";
import { Box, Container, Typography, Paper, Stack, Divider, Chip, useTheme, alpha } from "@mui/material";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";

const stored = [
  "Your email address (via Clerk authentication)",
  "Your application settings and preferences",
  "Your puzzle rating (stored in your browser's local storage and database when logged in)",
  "Anonymous usage analytics via Vercel Analytics (page views, feature usage, performance metrics)",
  "General country/region derived from your IP address for analytics purposes",
  "Browser type and version for compatibility and analytics",
];

const neverStored = [
  "Chat messages or conversation history",
  "API keys (OpenAI, Anthropic, Google, etc.), these live only in your browser",
  "Chess board positions or game data beyond your session if you have not saved yourself with paid tier",
  "Payment card details, handled entirely by our payment provider",
  "Passwords, authentication is fully delegated to a third-party provider",
];

const sections = [
  {
    title: "Who We Are",
    body: `ChessAgine is a chess analysis platform. This Privacy Policy explains how we collect, use, and protect your information when you use our service at chessagine.com.`,
  },
  {
    title: "Authentication",
    body: `Account creation and login are handled by a third-party authentication provider. It stores your email address and manages your authentication tokens securely. ChessAgine receives only the information needed to identify your account (user ID and email).`,
  },
  {
    title: "API Keys",
    body: `ChessAgine allows you to enter third-party API keys (e.g., OpenAI, Anthropic, Google Gemini, OpenRouter, Chessboardmagic). These keys are stored exclusively in your browser's local storage and are never transmitted to or stored on ChessAgine's servers. We have no visibility into your API keys. You can delete them at any time through the Settings page or by clearing your browser's local storage.`,
  },
  {
    title: "Analytics",
    body: `We use Vercel Analytics and Vercel Speed Insights to understand how the platform is used and to improve performance. This collects anonymous data including: pages visited, time spent, referrer URL, browser type, operating system, and general geographic region (country level). This data cannot be linked back to individual users. You can opt out by using a browser extension that blocks analytics scripts.`,
  },
  {
    title: "Cookies and Local Storage",
    body: `ChessAgine uses browser local storage and session storage to remember your settings, current game state, and puzzle rating between sessions. Authentication cookies are used for session management. We do not use advertising cookies or track you across other websites.`,
  },
  {
    title: "Data Sharing",
    body: `We do not sell your personal data. We do not share your data with advertisers. Data may be shared only with third-party providers required to operate the service (authentication, hosting, analytics, and payment processing for paid plans). All providers are bound by their own privacy policies.`,
  },
  {
    title: "Data Retention",
    body: `Account data is retained for as long as your account exists. You may request deletion of your account and associated data at any time by contacting us via Discord. Anonymous analytics data is retained per Vercel's standard retention policies.`,
  },
  {
    title: "Your Rights",
    body: `Depending on your jurisdiction, you may have rights including: access to your personal data, correction of inaccurate data, deletion of your data, and data portability. To exercise these rights, contact us via Discord. We will respond within 30 days.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the Service after changes constitutes acceptance of the updated policy. For significant changes, we will provide notice via Discord.`,
  },
];

export default function PrivacyPage() {
  usePageReady();
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const success = theme.palette.success.main;
  const error = theme.palette.error.main;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 4, md: 7 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: alpha(primary, 0.1), display: "flex",
            alignItems: "center", justifyContent: "center", color: primary,
          }}>
            <PrivacyTipIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.15, fontSize: { xs: "1.6rem", md: "2rem" } }}>
              Privacy Policy
            </Typography>
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4, ml: 7, lineHeight: 1.65 }}>
          Your privacy matters. Here&apos;s a plain-English summary of exactly what we collect and what we don&apos;t.
        </Typography>

        <Divider sx={{ mb: 4 }} />

        {/* At-a-glance summary */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 4 }}>
          {/* What we store */}
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 2,
            border: `1px solid ${alpha(success, 0.3)}`,
            bgcolor: alpha(success, 0.04),
          }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: success }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: success }}>
                What we store
              </Typography>
            </Stack>
            <Stack spacing={0.75}>
              {stored.map((item) => (
                <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
                  <Typography sx={{ color: success, fontSize: "0.7rem", mt: "3px", flexShrink: 0 }}>✓</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.5 }}>
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* What we NEVER store */}
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 2,
            border: `1px solid ${alpha(error, 0.25)}`,
            bgcolor: alpha(error, 0.03),
          }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <BlockIcon sx={{ fontSize: 18, color: error }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: error }}>
                What we NEVER store
              </Typography>
            </Stack>
            <Stack spacing={0.75}>
              {neverStored.map((item) => (
                <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
                  <Typography sx={{ color: error, fontSize: "0.7rem", mt: "3px", flexShrink: 0 }}>✗</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.5 }}>
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Box>

        {/* Key highlights */}
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 4 }}>
          {[
            "No chat message storage",
            "API keys stay in your browser",
            "No advertising",
            "No data selling",
            "Vercel Analytics only",
          ].map((label) => (
            <Chip key={label} label={label} size="small" sx={{
              fontSize: "0.7rem", height: 24,
              bgcolor: alpha(primary, 0.08),
              color: primary,
              border: `1px solid ${alpha(primary, 0.2)}`,
              fontWeight: 600,
            }} />
          ))}
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* Full policy sections */}
        <Stack spacing={3}>
          {sections.map((s) => (
            <Paper key={s.title} elevation={0} sx={{
              p: 3, borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
            }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: primary, fontSize: "0.95rem" }}>
                {s.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.75, fontSize: "0.87rem" }}>
                {s.body}
              </Typography>
            </Paper>
          ))}
        </Stack>

        <Box sx={{ mt: 5, p: 2.5, borderRadius: 2, bgcolor: alpha(primary, 0.06), border: `1px solid ${alpha(primary, 0.15)}`, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
            Questions about your privacy? Contact us on{" "}
            <Typography component="a" href="https://discord.gg/bCPwe6XWcH" target="_blank" rel="noopener noreferrer"
              sx={{ color: primary, fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
              Discord
            </Typography>.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}