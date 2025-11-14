import { Grid, Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { MODEL_RECOMMENDATIONS } from "@/libs/docs/helper";
import {
  Speed as SpeedIcon,
  AttachMoney as CostIcon,
} from "@mui/icons-material";

const getCostColor = (cost: string) => {
  switch (cost) {
    case "Free":
      return "success";
    case "Low":
      return "success";
    case "Medium":
      return "warning";
    case "High":
      return "error";
    default:
      return "default";
  }
};

const getPerformanceColor = (performance: string) => {
  switch (performance) {
    case "Good":
      return "info";
    case "Better":
      return "warning";
    case "Best":
      return "success";
    default:
      return "default";
  }
};

export const renderModelRecommendations = () => (
  <>
    <Typography variant="h4" gutterBottom color="primary.text">
      Model Recommendations
    </Typography>
    <Typography variant="body1" paragraph color="text.secondary">
      Choose the right model based on your use case, budget, and performance
      requirements.
    </Typography>

    <Grid container spacing={3}>
      {MODEL_RECOMMENDATIONS.map((rec, index) => (
        <Grid key={index}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6" color="primary.text">
                  {rec.provider}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Chip
                    label={rec.cost}
                    size="small"
                    color={getCostColor(rec.cost)}
                    icon={<CostIcon />}
                  />
                  <Chip
                    label={rec.performance}
                    size="small"
                    color={getPerformanceColor(rec.performance)}
                    icon={<SpeedIcon />}
                  />
                </Box>
              </Box>

              <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
              >
                {rec.model}
              </Typography>

              <Typography
                variant="subtitle2"
                gutterBottom
                color="text.secondary"
              >
                {rec.useCase}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {rec.reasoning}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </>
);
