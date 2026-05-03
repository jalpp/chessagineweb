"use client";
import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Security as SecurityIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
  Groups as CommunityIcon,
  School as LearnIcon,
  AttachMoney as CostIcon,
  SupportAgent as SupportIcon,
} from "@mui/icons-material";
import { FAQ_ITEMS } from "@/libs/docs/helper";

const CATEGORIES = [
  {
    key: "general",
    label: "General Questions",
    Icon: LearnIcon,
  },
  {
    key: "technical",
    label: "Technical Questions",
    Icon: InfoIcon,
  },
  {
    key: "cost",
    label: "Plans & Pricing",
    Icon: CostIcon,
  },
  {
    key: "privacy",
    label: "Privacy & Security",
    Icon: SecurityIcon,
  },
] as const;

export const renderFAQ = () => (
  <Box>
    <Typography
      variant="h4"
      gutterBottom
      sx={{ display: "flex", alignItems: "center", gap: 1 }}
    >
      <HelpIcon />
      Frequently Asked Questions
    </Typography>

    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <CommunityIcon />
          About ChessAgine
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ChessAgine is your friendly AI chess companion, a knowledgeable
          chess buddy who's always available to chat, analyze and brainstorm positions, and
          help you explore chess. It's not a formal coaching program; it's a
          conversational partner that adapts to your curiosity. All chess tools
          are free. Agine Chat gives you access to open souce AI
          models included, with stronger premium models available on the paid
          tier, with extended chess context.
        </Typography>
      </CardContent>
    </Card>

    {CATEGORIES.map(({ key, label, Icon }) => {
      const items = FAQ_ITEMS.filter((item) => item.category === key);
      if (!items.length) return null;
      return (
        <Box key={key} sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
          >
            <Icon fontSize="small" />
            {label}
          </Typography>

          {items.map((faq, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body1" fontWeight={500}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      );
    })}

  </Box>
);