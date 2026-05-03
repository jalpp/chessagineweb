"use client";

import {
  Box, Container, Typography, Stack, Divider,
  useTheme, alpha,
} from "@mui/material";
import { FaDiscord, FaGithub } from "react-icons/fa6";
import Link from "next/link";

export default function GlobalFooter() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  const legalLinks = [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Contact",          href: "https://discord.gg/bCPwe6XWcH", external: true },
  ];

  const communityLinks = [
    { icon: <FaGithub size={14} />, label: "GitHub", href: "https://github.com/jalpp/chessagineweb" },
    { icon: <FaDiscord size={14} />, label: "Discord", href: "https://discord.gg/bCPwe6XWcH" },
  ];

  return (
    <Box
      component="footer"
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        mt: "auto",
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        {/* Top row */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          {/* Brand */}
          <Stack direction="row" alignItems="center" spacing={1}>
           
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>ChessAgine</Typography>
            <Typography sx={{ color: "text.disabled", fontSize: "0.75rem" }}>
              Modern FOSS Chess analysis platform
            </Typography>
          </Stack>

          {/* Community links */}
          <Stack direction="row" spacing={1}>
            {communityLinks.map(({ icon, label, href }) => (
              <Box
                key={label}
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5,
                  px: 1.25, py: 0.5, borderRadius: 1.25,
                  border: `1px solid ${theme.palette.divider}`,
                  color: "text.secondary", fontSize: "0.73rem",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                }}
              >
                {icon} {label}
              </Box>
            ))}
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Bottom row */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Typography sx={{ fontSize: "0.7rem", color: "text.disabled" }}>
            © {new Date().getFullYear()} ChessAgine. Released under AGPL-3.0.
          </Typography>

          {/* Legal links */}
          <Stack direction="row" spacing={2} divider={
            <Typography sx={{ color: "text.disabled", fontSize: "0.7rem" }}>·</Typography>
          }>
            {legalLinks.map(({ label, href, external }) =>
              external ? (
                <Typography
                  key={label}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: "0.72rem", color: "text.secondary",
                    textDecoration: "none",
                    "&:hover": { color: primary },
                    transition: "color 0.15s ease",
                  }}
                >
                  {label}
                </Typography>
              ) : (
                <Typography
                  key={label}
                  component={Link}
                  href={href}
                  sx={{
                    fontSize: "0.72rem", color: "text.secondary",
                    textDecoration: "none",
                    "&:hover": { color: primary },
                    transition: "color 0.15s ease",
                  }}
                >
                  {label}
                </Typography>
              )
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}