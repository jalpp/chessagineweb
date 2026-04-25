"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useAuth } from "@clerk/nextjs";
import { encodePGN } from "pgnpack";
import type { SavedGameReview } from "@/componets/game/SaveGameReviewDialog";

export function useGameStorage() {
  const { isSignedIn, has } = useAuth();
  const isPaid = (has?.({ plan: "paid_tier" }) ?? false) && !!isSignedIn;

  const [localGames, setLocalGames] = useLocalStorage<SavedGameReview[]>(
    "chess-game-review-history-v1",
    []
  );
  const [dbGames, setDbGames] = useState<SavedGameReview[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch DB games on mount for paid users
  useEffect(() => {
    if (!isPaid) return;
    setLoading(true);
    fetch("/api/games")
      .then((r) => r.json())
      .then((docs: SavedGameReview[]) => setDbGames(docs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPaid]);

  const games = isPaid ? dbGames : localGames;

  const saveGame = useCallback(
    async (game: SavedGameReview): Promise<void> => {

      // ── Local storage (free users) ──────────────────────────────────────
      // Update-or-prepend: if a game with this id already exists, replace it
      // in-place so re-saving preserves the correct order and doesn't duplicate.
      if (!isPaid) {
        setLocalGames((prev) => {
          const idx = prev.findIndex((g) => g.id === game.id);
          if (idx !== -1) {
            // Replace existing entry (tree/annotations updated)
            const updated = [...prev];
            updated[idx] = game;
            return updated;
          }
          // New game — prepend
          return [game, ...prev];
        });
        return;
      }

      // ── DB (paid users) ─────────────────────────────────────────────────

      // 1. Encode PGN into compact binary form for storage
      let pgnPacked = "";
      try {
        pgnPacked = await encodePGN(game.pgn, { tags: true, annotations: true });
      } catch {
        // Encoding failed — the API will reject with 400; surface to caller
      }

      // 2. treeData is pre-serialized by game/page.tsx via serializeTree().
      //    We pass it straight through — no re-serialization here.
      const treeData = game.treeData ?? null;

      // 3. POST to the API.
      //    The server uses $setOnInsert for immutable fields and $set for
      //    treeData + title, so re-saving the same id correctly updates the tree.
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:              game.id,
          title:           game.title,
          pgnPacked,
          treeData,
          result:          game.gameInfo?.Result  ?? "",
          moveCount:       game.moves?.length     ?? 0,
          gameReview:      game.gameReview,
          gameReviewTheme: game.gameReviewTheme,
          moves:           game.moves,
          gameInfo:        game.gameInfo,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Save failed (${res.status})`);
      }

      // 4. Update optimistic local state — same update-or-prepend logic as
      //    local storage so the UI reflects the latest tree immediately.
      setDbGames((prev) => {
        const idx = prev.findIndex((g) => g.id === game.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = game;
          return updated;
        }
        return [game, ...prev];
      });
    },
    [isPaid, setLocalGames]
  );

  const deleteGame = useCallback(
    async (id: string) => {
      if (!isPaid) {
        setLocalGames((p) => p.filter((g) => g.id !== id));
        return;
      }
      await fetch(`/api/games?id=${id}`, { method: "DELETE" });
      setDbGames((p) => p.filter((g) => g.id !== id));
    },
    [isPaid, setLocalGames]
  );

  return { games, loading, saveGame, deleteGame, isPaid };
}