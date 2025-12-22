import { Box } from "@mui/material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  grow?: boolean; // optional, defaults to false
}

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, grow = false } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      style={{
        height: grow ? "auto" : "100%",
        overflow: grow ? "visible" : "hidden",
      }}
    >
      {value === index && (
        <Box
          sx={{
            pt: 2,
            height: grow ? "auto" : "100%",
            overflow: grow ? "visible" : "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
}
