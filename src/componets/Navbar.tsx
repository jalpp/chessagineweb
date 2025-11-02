"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Avatar,
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

  // Public navigation links (available to everyone)
  const publicNavLinks = [
    { 
      label: "Docs", 
      href: "/docs", 
      icon: <FaBook />
    },
    {
      label: "Github",
      href: "https://github.com/jalpp/chessagineweb",
      icon: <GitHub/>
    },
    {
      label: "Discord",
      href: "https://discord.gg/3RpEnvmZwp",
      icon: <FaDiscord />,
    },
  ];

  const authNavLinks = [
    { 
      label: "Analyze Position", 
      href: "/position", 
      icon: <FaChessBoard />
    },
    { 
      label: "Analyze Game", 
      href: "/game", 
      icon: <FaChessPawn />
    },
    { 
      label: "Puzzles", 
      href: "/puzzle", 
      icon: <FaPuzzlePiece />
    },
    { 
      label: "Settings", 
      href: "/setting", 
      icon: <FaGear />
    },
  ];

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#111", mb: 3 }}>
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, md: 3 } }}>
          {/* Logo Section - Left */}
            <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              '&:hover': {
              opacity: 0.8,
              },
              transition: 'opacity 0.2s',
            }}
            onClick={handleLogoClick}
            >
            
            <Typography 
              variant="h6" 
              sx={{ 
              fontWeight: 700,
              letterSpacing: '-0.5px',
              display: { xs: 'none', sm: 'block' },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              }}
            >
              ChessAgine
            </Typography>
            </Box>
          
          {/* Navigation Links - Center/Left */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'left', gap: 0.5, ml: 4 }}>
              {/* Public links */}
              {publicNavLinks.map((link) => (
                <Button 
                  key={link.href} 
                  color="inherit" 
                  href={link.href}
                  startIcon={link.icon}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    px: 2,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}

              {/* Authenticated links */}
              <SignedIn>
                <Divider 
                  orientation="vertical" 
                  flexItem 
                  sx={{ 
                    mx: 1, 
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    height: '24px',
                    alignSelf: 'center',
                  }} 
                />
                {authNavLinks.map((link) => (
                  <Button 
                    key={link.href} 
                    color="inherit" 
                    href={link.href}
                    startIcon={link.icon}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      px: 2,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </SignedIn>
            </Box>
          )}

          {/* Spacer for mobile to push items to edges */}
          <Box sx={{ flexGrow: 1, display: { md: 'none' } }} />

          {/* Auth Section - Right */}
          {isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <IconButton 
                color="inherit" 
                onClick={toggleDrawer(true)}
                sx={{
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SignedOut>
                <Button 
                  color="inherit" 
                  onClick={handleSignIn}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    px: 2.5,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  color="inherit" 
                  onClick={handleSignUp}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    px: 2.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #653a8a 100%)',
                    },
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
            {/* Public navigation items */}
            {publicNavLinks.map((link) => (
              <ListItem
                key={link.href}
                component="a"
                href={link.href}
                sx={{
                  textDecoration: "none",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText primary={link.label} />
              </ListItem>
            ))}

            {/* Authenticated navigation items */}
            <SignedIn>
              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
              
              {authNavLinks.map((link) => (
                <ListItem
                  key={link.href}
                  component="a"
                  href={link.href}
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText primary={link.label} />
                </ListItem>
              ))}

              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
            </SignedIn>

            {/* Auth section for signed out users */}
            <SignedOut>
              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
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