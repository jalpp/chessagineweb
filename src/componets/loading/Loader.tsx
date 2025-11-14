import { Box } from "@mui/material"
import {CircularProgress} from "@mui/material"

const Loader = () => {

    return (
        <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress  />
      </Box>
    )
}

export default Loader;