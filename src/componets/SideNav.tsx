"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  Tooltip,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import {
  FaChessPawn,
  FaChessBoard,
  FaPuzzlePiece,
  FaGear,
  FaBook,
  FaDiscord,
} from "react-icons/fa6";
import { useClerk } from "@clerk/nextjs";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ChatBubble, GitHub, SmartToy } from "@mui/icons-material";
import { useNavigation } from "@/context/NavigationContext";

// Lichess logo — served from local public assets
const LichessNavIcon = () => (
  <img
    src="/static/images/lichess-logo.png"
    alt="Lichess"
    width={18}
    height={18}
    style={{ display: "block", imageRendering: "crisp-edges" }}
  />
);

export const SIDEBAR_WIDTH = 64;

const navLinks = [
  { label: "Analyze Position", href: "/position",                              icon: <FaChessBoard size={18} />,   isExternal: false },
  { label: "Analyze Game",     href: "/game",                                  icon: <FaChessPawn  size={18} />,   isExternal: false },
  { label: "Play Bot",         href: "/play",                                  icon: <SmartToy sx={{ fontSize: 18 }} />, isExternal: false },
  { label: "Play on Lichess",  href: "/lichess-play",                          icon: <LichessNavIcon />,           isExternal: false },
  { label: "Agine Chat",       href: "/chat",                                  icon: <ChatBubble sx={{ fontSize: 18 }} />, isExternal: false },
  { label: "Puzzles",          href: "/puzzle",                                icon: <FaPuzzlePiece size={18} />,  isExternal: false },
  { label: "Settings",         href: "/setting",                               icon: <FaGear size={18} />,         isExternal: false },
  { label: "Docs",             href: "/docs",                                  icon: <FaBook size={18} />,         isExternal: false },
  { label: "GitHub",           href: "https://github.com/jalpp/chessagineweb", icon: <GitHub sx={{ fontSize: 18 }} />, isExternal: true },
  { label: "Discord",          href: "https://discord.gg/bCPwe6XWcH",          icon: <FaDiscord size={18} />,     isExternal: true  },
];


function NavItem({
  link,
  active,
  onClick,
  collapsed = true,
}: {
  link: (typeof navLinks)[0];
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}) {
  const item = (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? "center" : "flex-start",
        width: "100%",
        px: collapsed ? 0 : 2,
        py: 1,
        borderRadius: "10px",
        cursor: "pointer",
        color: active ? "primary.main" : "text.secondary",
        bgcolor: active ? "action.selected" : "transparent",
        transition: "all 0.15s ease",
        "&:hover": {
          bgcolor: "action.hover",
          color: "text.primary",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {link.icon}
      </Box>
      {!collapsed && (
        <Typography sx={{ fontSize: "13px", fontWeight: active ? 600 : 400 }}>
          {link.label}
        </Typography>
      )}
    </Box>
  );

  return collapsed ? (
    <Tooltip title={link.label} placement="right" arrow>
      {item}
    </Tooltip>
  ) : (
    item
  );
}


function DesktopSideNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: (href: string, isExternal: boolean) => void;
}) {

  const { openSignIn } = useClerk();

  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1.5,
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        zIndex: 100,
        overflowY: "auto",
        overflowX: "hidden",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >

      <Tooltip title="ChessAgine Home" placement="right" arrow>
        <Box
          onClick={() => onNavigate("/", false)}
          sx={{
            cursor: "pointer",
            mb: 2,
            "&:hover": { opacity: 0.75 },
            transition: "opacity 0.2s",
          }}
        >
          <Avatar
            src="/static/images/agineowl.png"
            alt="ChessAgine"
            sx={{ width: 36, height: 36, bgcolor: "transparent" }}
          >
            ♟
          </Avatar>
        </Box>
      </Tooltip>

      <Divider flexItem sx={{ mb: 1, width: "60%" }} />


      <Box sx={{ flex: 1, width: "100%", px: 0.75, display: "flex", flexDirection: "column", gap: 0.25 }}>
        {navLinks.map((link) => (
          <NavItem
            key={link.href}
            link={link}
            active={!link.isExternal && pathname === link.href}
            onClick={() => onNavigate(link.href, link.isExternal)}
            collapsed
          />
        ))}
      </Box>

      <Divider flexItem sx={{ mt: 1, mb: 1.5, width: "60%" }} />
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <Tooltip title="Sign In" placement="right" arrow>
          <Box
            onClick={() => openSignIn()}
            sx={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
              color: "text.secondary",
              "&:hover": { opacity: 0.75 },
              transition: "opacity 0.15s",
            }}
          >
            <Typography sx={{ fontSize: "9px", lineHeight: 1, color: "text.secondary" }}>Sign In</Typography>
          </Box>
        </Tooltip>
      </SignedOut>
    </Box>
  );
}

export default function SideNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const { startNavigation } = useNavigation();

  const handleNavigation = (href: string, isExternal: boolean = false) => {
    if (isExternal) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      // Don't trigger the loader if already on this page — usePageReady only
      // fires on mount, so navigating to the current route would spin forever.
      if (pathname !== href) {
        startNavigation();
        router.push(href);
      }
    }
    setDrawerOpen(false);
  };


  if (isMobile) {
    return (
      <>
        <AppBar position="static" sx={{ mb: 0 }}>
          <Toolbar sx={{ justifyContent: "space-between", px: 1.5 }}>
            <Box
              onClick={() => router.push("/")}
              sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            >
              <Avatar src="/static/images/agineowl.png" alt="ChessAgine" sx={{ width: 30, height: 30, bgcolor: "transparent" }}>♟</Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.01em", fontSize: "1rem" }}>
                ChessAgine
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SignedIn><UserButton /></SignedIn>
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 260, bgcolor: "background.paper", height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 2.5 }}>
              <Avatar src="/static/images/agineowl.png" alt="ChessAgine" sx={{ width: 34, height: 34, bgcolor: "transparent" }}>♟</Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>ChessAgine</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <List sx={{ flex: 1, px: 1 }}>
              {navLinks.map((link) => (
                <ListItem
                  key={link.href}
                  onClick={() => handleNavigation(link.href, link.isExternal)}
                  sx={{
                    borderRadius: "8px",
                    mb: 0.25,
                    cursor: "pointer",
                    color: pathname === link.href ? "primary.main" : "text.secondary",
                    bgcolor: pathname === link.href ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 36, fontSize: 18 }}>{link.icon}</ListItemIcon>
                  <Typography sx={{ fontSize: "13px", fontWeight: pathname === link.href ? 600 : 400 }}>
                    {link.label}
                  </Typography>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ mt: 1 }} />
            <SignedOut>
              <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1 }}>
                <Typography onClick={() => { openSignIn(); setDrawerOpen(false); }} sx={{ fontSize: "13px", cursor: "pointer", color: "primary.main" }}>Sign In</Typography>
                <Typography sx={{ color: "text.disabled" }}>/</Typography>
                <Typography onClick={() => { openSignUp(); setDrawerOpen(false); }} sx={{ fontSize: "13px", cursor: "pointer", color: "primary.main" }}>Sign Up</Typography>
              </Box>
            </SignedOut>
            <SignedIn>
              <Box sx={{ px: 2, py: 1.5 }}>
                <UserButton />
              </Box>
            </SignedIn>
          </Box>
        </Drawer>
      </>
    );
  }

  return (
    <DesktopSideNav pathname={pathname!!} onNavigate={handleNavigation} />
  );
}