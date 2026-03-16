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
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { 
  FaChessPawn, 
  FaChessBoard, 
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
import { ChatBubble, GitHub, SmartToy } from "@mui/icons-material";

export default function NavBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

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
    { label: "Analyze Position", href: "/position",                            icon: <FaChessBoard />, isExternal: false },
    { label: "Analyze Game",     href: "/game",                                 icon: <FaChessPawn />,  isExternal: false },
    { label: "Play Bot",         href: "/play",                                 icon: <SmartToy />,     isExternal: false },
    { label: "Agine Chat",             href: "/chat",                                 icon: <ChatBubble />,     isExternal: false },
    { label: "Puzzles",          href: "/puzzle",                               icon: <FaPuzzlePiece />,isExternal: false },
    { label: "Settings",         href: "/setting",                              icon: <FaGear />,       isExternal: false },
    { label: "Docs",             href: "/docs",                                 icon: <FaBook />,       isExternal: false },
    { label: "Github",           href: "https://github.com/jalpp/chessagineweb",icon: <GitHub />,       isExternal: true  },
  ];

  return (
    <>
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, md: 3 } }}>

          {/* ── Logo ── */}
          <Box
            onClick={() => router.push("/")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              transition: "opacity 0.2s",
              "&:hover": { opacity: 0.8 },
            }}
          >
            <Avatar
              src="/static/images/agineowl.png"
              alt="ChessAgine"
              sx={{ width: 32, height: 32, bgcolor: "transparent" }}
            >
              {/* fallback chess pawn if image missing */}
              ♟
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
              ChessAgine
            </Typography>
          </Box>

          {/* ── Desktop nav links ── */}
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
                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1, display: { md: "none" } }} />

          {/* ── Auth / mobile menu ── */}
          {isMobile ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <IconButton
                color="inherit"
                onClick={toggleDrawer(true)}
                sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <SignedOut>
                <Button
                  color="inherit"
                  onClick={() => openSignIn()}
                  sx={{ textTransform: "none", fontSize: "0.95rem", px: 2.5 }}
                >
                  Sign In
                </Button>
                <Button
                  color="inherit"
                  onClick={() => openSignUp()}
                  sx={{ textTransform: "none", fontSize: "0.95rem", px: 2.5 }}
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
              bottom: 0, left: 0, right: 0,
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              },
            }}
          />
        )}
      </AppBar>

      {/* ── Mobile drawer ── */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 280, bgcolor: "#111", height: "100%", color: "white" }}
          role="presentation"
          onClick={toggleDrawer(false)}
        >
          {/* Drawer header with logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 2.5 }}>
            <Avatar
              src="/static/images/agineowl.png"
              alt="ChessAgine"
              sx={{ width: 36, height: 36, bgcolor: "transparent" }}
            >
              ♟
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "white" }}>
              ChessAgine
            </Typography>
          </Box>

          <Divider sx={{ bgcolor: "rgba(255,255,255,0.15)", mb: 1 }} />

          <List>
            {navLinks.map((link) => (
              <ListItem
                key={link.href}
                onClick={() => handleNavigation(link.href, link.isExternal)}
                sx={{
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText primary={link.label} />
              </ListItem>
            ))}

            <SignedOut>
              <Divider sx={{ my: 1, bgcolor: "rgba(255,255,255,0.15)" }} />
              <ListItem
                onClick={() => openSignIn()}
                sx={{ cursor: "pointer", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
              >
                <ListItemText primary="Sign In" />
              </ListItem>
              <ListItem
                onClick={() => openSignUp()}
                sx={{ cursor: "pointer", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
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