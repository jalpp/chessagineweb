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
    async (game: SavedGameReview): Promise<{ duplicate: boolean }> => {
      if (!isPaid) {
        setLocalGames((p) => [game, ...p]);
        return { duplicate: false };
      }

      // Encode PGN — this is the only form we send/store
      let pgnPacked = "";
      try {
        pgnPacked = await encodePGN(game.pgn, { tags: true, annotations: true });
      } catch {
        // If encoding fails we cannot proceed for paid users;
        // pgnPacked remains "" and the API will reject with 400.
      }

      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:              game.id,
          title:           game.title,
          pgnPacked,
          // pgnRaw intentionally omitted — server never stores it
          result:          game.gameInfo?.Result  ?? "",
          moveCount:       game.moves?.length     ?? 0,
          gameReview:      game.gameReview,
          gameReviewTheme: game.gameReviewTheme,
          moves:           game.moves,
          gameInfo:        game.gameInfo,
        }),
      });

      const json = await res.json();

      if (!json.duplicate) {
        // Optimistically add to local state with the original pgn intact
        setDbGames((p) => [game, ...p]);
      }

      return { duplicate: !!json.duplicate };
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