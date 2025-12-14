"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  Divider,
  LinearProgress,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { 
  FaChessPawn, 
  FaChessBoard, 
  FaDiscord, 
  FaPuzzlePiece, 
  FaGear,
  FaBook
} from "react-icons/fa6";
import { useClerk } from "@clerk/nextjs";
import {
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { GitHub } from "@mui/icons-material";

export default function NavBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const handleSignIn = () => {
    openSignIn();
  };

  const handleSignUp = () => {
    openSignUp();
  };

  const handleLogoClick = () => {
    router.push("/");
  };

  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigation = async (href: string, isExternal: boolean = false) => {
    if (isExternal) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      setIsNavigating(true);
      router.push(href);
      
      setTimeout(() => setIsNavigating(false), 800);
    }
  };

  
  const navLinks = [
    { 
      label: "Analyze Position", 
      href: "/position", 
      icon: <FaChessBoard />,
      isExternal: false
    },
    { 
      label: "Analyze Game", 
      href: "/game", 
      icon: <FaChessPawn />,
      isExternal: false
    },
    { 
      label: "Puzzles", 
      href: "/puzzle", 
      icon: <FaPuzzlePiece />,
      isExternal: false
    },
    { 
      label: "Settings", 
      href: "/setting", 
      icon: <FaGear />,
      isExternal: false
    },
    { 
      label: "Docs", 
      href: "/docs", 
      icon: <FaBook />,
      isExternal: false
    },
    {
      label: "Github",
      href: "https://github.com/jalpp/chessagineweb",
      icon: <GitHub/>,
      isExternal: true
    },
    {
      label: "Discord",
      href: "https://discord.gg/NwZb6JJAkS",
      icon: <FaDiscord />,
      isExternal: true
    },
  ];

  return (
    <>
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
              transition: "opacity 0.2s",
            }}
            onClick={handleLogoClick}
          >
            <Typography variant="h6">
              ChessAgine
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 4 }}>
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  color="inherit"
                  onClick={() => handleNavigation(link.href, link.isExternal)}
                  startIcon={link.icon}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.95rem",
                    px: 2,
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1, display: { md: "none" } }} />

          {isMobile ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <IconButton
                color="inherit"
                onClick={toggleDrawer(true)}
                sx={{
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <SignedOut>
                <Button
                  color="inherit"
                  onClick={handleSignIn}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.95rem",
                    px: 2.5,
                  }}
                >
                  Sign In
                </Button>
                <Button
                  color="inherit"
                  onClick={handleSignUp}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.95rem",
                    px: 2.5,
                  }}
                >
                  Sign Up
                </Button>
              </SignedOut>

              <SignedIn>
                <UserButton />
              </SignedIn>
            </Box>
          )}
        </Toolbar>
        {/* Loading bar */}
        {isNavigating && (
          <LinearProgress
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              },
            }}
          />
        )}
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{
            width: 280,
            bgcolor: "#111",
            height: "100%",
            color: "white",
          }}
          role="presentation"
          onClick={toggleDrawer(false)}
        >
          <List>
            {/* All navigation items */}
            {navLinks.map((link) => (
              <ListItem
                key={link.href}
                onClick={() => handleNavigation(link.href, link.isExternal)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText primary={link.label} />
              </ListItem>
            ))}

            {/* Auth section for signed out users */}
            <SignedOut>
              <Divider sx={{ my: 1, bgcolor: "rgba(255, 255, 255, 0.3)" }} />
              <ListItem
                onClick={handleSignIn}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemText primary="Sign In" />
              </ListItem>
              <ListItem
                onClick={handleSignUp}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemText primary="Sign Up" />
              </ListItem>
            </SignedOut>
          </List>
        </Box>
      </Drawer>
    </>
  );
}