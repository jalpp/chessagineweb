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

export const renderFAQ = () => (
  <Box>
    <Typography
      variant="h4"
      gutterBottom
      color="primary.text"
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
          color="primary.text"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <CommunityIcon />
          About ChessAgine
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ChessAgine is designed to be your friendly AI chess companion, think
          of it as a knowledgeable chess buddy who is always available to chat,
          analyze positions, and help you explore the wonderful world of chess.
          It is NOT a formal coach with structured lessons, but rather a
          conversational partner that adapts to your curiosity and learning
          style.
        </Typography>
      </CardContent>
    </Card>

    {["general", "technical", "cost", "privacy"].map((category) => (
      <Box key={category} sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          color="primary.text"
          sx={{ textTransform: "capitalize", mb: 2 }}
        >
          {category === "general" && (
            <LearnIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          )}
          {category === "technical" && (
            <InfoIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          )}
          {category === "cost" && (
            <CostIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          )}
          {category === "privacy" && (
            <SecurityIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          )}
          {category} Questions
        </Typography>

        {FAQ_ITEMS.filter((item) => item.category === category).map(
          (faq, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body1" color="primary.text">
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )
        )}
      </Box>
    ))}

    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          color="primary.text"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <SupportIcon />
          Still Have Questions?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Can not find what you are looking for? Create an issue on ChessAgine Github
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<InfoIcon />}
          href="https://github.com/jalpp/chessagineweb/issues"
          target="_blank"
          sx={{ mr: 2 }}
        >
          Create GitHub Issue
        </Button>
      </CardContent>
    </Card>
  </Box>
);
