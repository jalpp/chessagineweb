import {
  Typography,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
} from "@mui/material";
import {
  Security as SecurityIcon,
  AttachMoney as CostIcon,
  Psychology as IntelligenceIcon,
  CheckCircle as CheckCircleIcon,
  SwapHorizontalCircleOutlined,
  
} from "@mui/icons-material";
import { purpleTheme } from "@/theme/theme";
import ConstructionIcon from '@mui/icons-material/Construction';


export const renderHeader = () => (
  <>
    <Paper
      sx={{
        p: 4,
        mb: 4,
        background: `linear-gradient(135deg, ${purpleTheme.primary} 0%, ${purpleTheme.secondary} 100%)`,
        color: purpleTheme.text.primary,
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        Welcome to ChessAgine
      </Typography>
      <Typography variant="h6">
        Your AI-powered chess companion with plug-and-play provider integration
      </Typography>
    </Paper>

    {/* Security Alert */}
    <Alert severity="warning" sx={{ mb: 4 }}>
      <AlertTitle>Important Security Information</AlertTitle>
      <Typography variant="body2">
        <strong>ChessAgine DOES NOT store your API keys on our servers.</strong>{" "}
        Your keys are only stored in your browser local storage and encrypted
        during transmission.
      </Typography>
      <Typography variant="body2">
        <SecurityIcon sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }} />
        <strong>
          Never share your API keys with anyone and rotate them regularly.
        </strong>{" "}
        Your API keys are accessible only to you, not to developers or other
        users.
      </Typography>
    </Alert>
    <Alert severity="warning" sx={{ mb: 4 }}>
      <AlertTitle>ChessAgine Cloud Beta</AlertTitle>
      <Typography variant="body2">
        <strong>ChessAgine Cloud is in Beta, if you experiece rate limits please try again at later time.</strong>{" "}
      </Typography>
    </Alert>

    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom color="primary.text">
          ChessAgine Settings
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: purpleTheme.success }} />
            </ListItemIcon>
            <ListItemText
              primary="Agine Cloud (beta)"
              secondary="Pick a open source model and start using ChessAgine for free! No API or local setup required!"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: purpleTheme.success }} />
            </ListItemIcon>
            <ListItemText
              primary="Ollama Support"
              secondary="No API keys required run models locally or connect via ngrok/cloud for instant access and use ChessAgine for 100% Free!"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SwapHorizontalCircleOutlined color="success" />
            </ListItemIcon>
            <ListItemText
              primary="OpenRouter Support"
              secondary="Use one single router to load funds and use multiple AI models via OpenRouter"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CostIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Cost Control"
              secondary="You pay only for what you use, directly to the provider or the router"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <IntelligenceIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Model Choice"
              secondary="Select any supported model based on your budget and needs"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Privacy & Security"
              secondary="Direct connection to providers without intermediary costs or risks"
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  </>
);
