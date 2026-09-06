"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Alert, Button } from "@mui/material";
import type { PuzzleData } from "@/libs/puzzle/helper";
import { FEED_BATCH_SIZE, shouldPrefetchMore, dedupePuzzlesById } from "@/libs/puzzle/feedQueue";
import { calculateNewUserRating, normalizeUserPuzzleRating } from "@/libs/puzzle/rating";
import { useSettings } from "@/context/SettingContext";
import PuzzleFeedCard from "./PuzzleFeedCard";

async function fetchOnePuzzle(ratingFrom: number, ratingTo: number): Promise<PuzzleData> {
  const params = new URLSearchParams();
  params.append("ratingFrom", String(Math.round(ratingFrom)));
  params.append("ratingTo", String(Math.round(ratingTo)));
  const res = await fetch(`/api/puzzle?${params}`);
  const result = await res.json();
  if (!result.success) throw new Error(result.error || "Failed to load puzzle");
  return result.data as PuzzleData;
}

async function fetchPuzzleBatch(
  count: number,
  ratingFrom: number,
  ratingTo: number,
): Promise<PuzzleData[]> {
  const settled = await Promise.allSettled(
    Array.from({ length: count }, () => fetchOnePuzzle(ratingFrom, ratingTo)),
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<PuzzleData> => r.status === "fulfilled")
    .map((r) => r.value);
}

export default function PuzzleScrollView() {
  const { userPuzzleRating, saveSettings } = useSettings();
  const safeUserPuzzleRating = normalizeUserPuzzleRating(userPuzzleRating);

  const [puzzles, setPuzzles] = useState<PuzzleData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fetchingMoreRef = useRef(false);
  const puzzlesRef = useRef<PuzzleData[]>([]);
  puzzlesRef.current = puzzles;

  const loadInitialBatch = useCallback(async () => {
    setLoadingInitial(true);
    setLoadError(false);
    try {
      const batch = await fetchPuzzleBatch(
        FEED_BATCH_SIZE,
        safeUserPuzzleRating,
        safeUserPuzzleRating + 500,
      );
      if (batch.length === 0) {
        setLoadError(true);
      } else {
        setPuzzles((prev) => dedupePuzzlesById(prev, batch));
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoadingInitial(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInitialBatch();
  }, [loadInitialBatch]);

  const fetchMore = useCallback(async () => {
    if (fetchingMoreRef.current) return;
    fetchingMoreRef.current = true;
    try {
      const batch = await fetchPuzzleBatch(
        FEED_BATCH_SIZE,
        safeUserPuzzleRating,
        safeUserPuzzleRating + 500,
      );
      if (batch.length > 0) {
        setPuzzles((prev) => dedupePuzzlesById(prev, batch));
      }
    } finally {
      fetchingMoreRef.current = false;
    }
  }, [userPuzzleRating]);

  useEffect(() => {
    if (puzzles.length === 0) return;
    if (shouldPrefetchMore(activeIndex, puzzles.length)) {
      fetchMore();
    }
  }, [activeIndex, puzzles.length, fetchMore]);

  // Track which puzzle is currently in view so the "next" scroll can target it
  // and so we know when to prefetch.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) setActiveIndex(index);
          }
        });
      },
      { root: container, threshold: [0.6] },
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [puzzles.length]);

  const handleSolved = useCallback(
    (index: number, success: boolean) => {
      const puzzle = puzzlesRef.current[index];
      if (!puzzle) return;
      const newRating = calculateNewUserRating(userPuzzleRating, puzzle.rating, success);
      saveSettings({ user_puzzle_rating: newRating });

      if (success) {
        setTimeout(() => {
          const next = sectionRefs.current[index + 1];
          next?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 900);
      }
    },
    [userPuzzleRating, saveSettings],
  );

  if (loadingInitial) {
    return (
      <Box sx={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (loadError || puzzles.length === 0) {
    return (
      <Box sx={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={loadInitialBatch}>
              Retry
            </Button>
          }
        >
          Failed to load puzzles. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "100dvh",
        width: "100%",
        overflowY: "auto",
        overscrollBehavior: "contain",
        // "proximity" (rather than "mandatory") lets a touch gesture aimed
        // at a piece resolve as a drag/tap on the board first, snapping
        // only once the gesture is clearly a scroll — "mandatory" is more
        // eager to claim any vertical touch movement as a page turn, which
        // made piece drags feel unreliable on mobile.
        scrollSnapType: "y proximity",
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
      }}
    >
      {puzzles.map((puzzle, index) => (
        <Box
          key={puzzle.lichessId}
          ref={(el: HTMLDivElement | null) => {
            sectionRefs.current[index] = el;
          }}
          data-index={index}
          sx={{ scrollSnapAlign: "start" }}
        >
          <PuzzleFeedCard
            puzzle={puzzle}
            active={index === activeIndex}
            onSolved={(success) => handleSolved(index, success)}
          />
        </Box>
      ))}
    </Box>
  );
}
