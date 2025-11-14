import { Box, Typography } from "@mui/material"


const Warning = () => {
    return (
        <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Typography variant="h6" >
          Please sign in to view this page.
        </Typography>
      </Box>
    )
}

export default Warning