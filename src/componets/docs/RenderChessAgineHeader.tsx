import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Chip,
} from "@mui/material";
import {
  Security as SecurityIcon,
  Star as StarIcon,
  Cloud as CloudIcon,
  Psychology as PsychologyIcon,
  Extension as ExtensionIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { PREMIUM_MODELS, FREE_TIER_MODELS } from "@/libs/agine/modelConstants";

export const renderHeader = () => (
  <>
    <Paper sx={{ p: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
        Welcome to ChessAgine
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Your AI-powered chess companion, brainstorm chess positions, review games,
        explore openings, and bouch ideas about chess!
      </Typography>
    </Paper>

    <Box
      display="grid"
      gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
      gap={3}
      mb={4}
    >
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CloudIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Free Plan
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            All chess tools are free. Agine Chat on free tier includes a curated free model
            chosen for reliable tool use, the random openrouter/free router, and support for
            your own Anthropic/Gemini/OpenRouter API key — no paid plan required.
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.75}>
            {FREE_TIER_MODELS.map((m) => (
              <Chip
                key={m}
                label={m}
                size="small"
                variant="outlined"
                sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderColor: "primary.main" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <StarIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Paid Tier
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Unlock premium models with more tool calls, extended chess
            context, and dedicated resources.
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.75}>
            {PREMIUM_MODELS.map((m) => (
              <Chip
                key={m}
                label={m}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>

    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          What's included
        </Typography>
        <List disablePadding>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ExtensionIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="All chess tools, free forever"
              secondary="Position analysis, game review, puzzles, play bot, opening explorer. No account needed."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <CloudIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Agine Chat with community models"
              secondary="Sign in and start chatting immediately, to chat with small LLMs about chess."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <PsychologyIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Use Premium models with paid tier"
              secondary="Stronger models, more tool calls per session, deeper chess context window, dedicated infrastructure."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LockIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Privacy & Security"
              secondary="Conversations are session-only. ChessAgine never stores any chat messages on servers."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <SecurityIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Open source"
              secondary="ChessAgine is FOSS, with transparent development."
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  </>
);