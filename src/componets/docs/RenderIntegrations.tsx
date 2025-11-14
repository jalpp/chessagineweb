import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
} from "@mui/material";
import { IntegrationItem } from "@/libs/docs/helper";
import {
  Search as SearchIcon,
  Storage as DatabaseIcon,
  Computer as EngineIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenIcon,
} from "@mui/icons-material";
import { FaGear } from "react-icons/fa6";


const INTEGRATIONS: IntegrationItem[] = [
  {
    name: "Web Search",
    description:
      "Access real-time chess information, recent tournament results, and player statistics",
    icon: <SearchIcon />,
    features: [
      "Latest tournament results and standings",
      "Current player ratings and statistics",
      "Recent chess news and developments",
      "Opening theory updates and trends",
    ],
    status: "Available",
  },
  {
    name: "Lichess Explorer",
    description:
      "Explore opening databases and master games directly within ChessAgine",
    icon: <DatabaseIcon />,
    features: [
      "Opening explorer with statistics",
      "Master game database access",
      "Position frequency analysis",
      "Variation popularity trends",
    ],
    status: "Available",
    link: "https://lichess.org/api",
  },
  {
    name: "Stockfish Engine",
    description: "Precise position evaluation and best move calculations",
    icon: <EngineIcon />,
    features: [
      "Accurate position evaluation",
      "Best move suggestions with depth",
      "Tactical mistake identification",
      "Engine line analysis",
    ],
    status: "Available",
  },
  {
    name: "ChessDB",
    description: "Access to comprehensive chess position databases",
    icon: <DatabaseIcon />,
    features: [
      "Position lookup in master games",
      "Historical game statistics",
      "Endgame tablebase access",
      "Position occurrence frequency",
    ],
    status: "Beta",
    link: "https://chessdb.cn/",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Available":
      return "success";
    case "Beta":
      return "warning";
    case "Coming Soon":
      return "info";
    default:
      return "default";
  }
};

export const renderIntegrations = () => (
  <Box>
    <Typography
      variant="h4"
      gutterBottom
      color="primary.text"
      sx={{ display: "flex", alignItems: "center", gap: 1 }}
    >
      <FaGear />
      ChessAgine Integrations
    </Typography>

    <Typography variant="body1" color="text.secondary" paragraph>
      ChessAgine connects with powerful chess tools and databases to enhance
      your experience. ChessAgine convets a general purpose LLM into a chess
      native helper buddy.
    </Typography>

    <Grid container spacing={3}>
      {INTEGRATIONS.map((integration, index) => (
        <Grid key={index}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {integration.icon}
                  <Typography variant="h6" color="primary.text">
                    {integration.name}
                  </Typography>
                </Box>
                <Chip
                  label={integration.status}
                  size="small"
                  color={getStatusColor(integration.status)}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                {integration.description}
              </Typography>

              <Typography variant="subtitle2" gutterBottom color="primary.text">
                Features:
              </Typography>
              <List dense>
                {integration.features.map((feature, featureIndex) => (
                  <ListItem key={featureIndex} sx={{ py: 0.5, pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckCircleIcon
                        sx={{ fontSize: 16 }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{
                        variant: "body2",
                        color: "text.secondary",
                      }}
                    />
                  </ListItem>
                ))}
              </List>

              {integration.link && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={<OpenIcon />}
                    href={integration.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn More
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary.text">
          How Integrations Work
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          ChessAgine seamlessly combines AI analysis with these powerful tools.
          When you ask about an opening, it might consult the Lichess database
          for statistics. When you need precise evaluation, it can use
          Stockfish. For recent tournament information, it searches the web. All
          of this happens automatically based on your questions and needs.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          <strong>Privacy Note:</strong> Integration data is processed in
          real-time and follows the same privacy principles as your AI
          conversations - no permanent storage by ChessAgine.
        </Typography>
      </CardContent>
    </Card>
  </Box>
);
