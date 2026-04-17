"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useAuth } from "@clerk/nextjs";
import { encodePGN, decodePGN } from "pgnpack";
import type { SavedGameReview } from "@/componets/game/SaveGameReviewDialog";

export function useGameStorage() {
  const { isSignedIn, has } = useAuth();
  const isPaid = (has?.({ plan: "paid_tier" }) ?? false) && !!isSignedIn;

  const [localGames, setLocalGames] = useLocalStorage<SavedGameReview[]>("chess-game-review-history-v1", []);
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

  const saveGame = useCallback(async (game: SavedGameReview) => {
    if (!isPaid) { setLocalGames((p) => [game, ...p]); return; }

    let pgnPacked = "";
    try { pgnPacked = await encodePGN(game.pgn, { tags: true, annotations: true }); } catch { /* fallback */ }

    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...game, pgnPacked, pgnRaw: game.pgn }),
    });
    setDbGames((p) => [game, ...p]);
  }, [isPaid, setLocalGames]);

  const deleteGame = useCallback(async (id: string) => {
    if (!isPaid) { setLocalGames((p) => p.filter((g) => g.id !== id)); return; }
    await fetch(`/api/games?id=${id}`, { method: "DELETE" });
    setDbGames((p) => p.filter((g) => g.id !== id));
  }, [isPaid, setLocalGames]);

  const unpackPGN = useCallback(async (pgnPacked: string): Promise<string> => {
    try { return await decodePGN(pgnPacked); } catch { return ""; }
  }, []);

  return { games, loading, saveGame, deleteGame, unpackPGN, isPaid };
}