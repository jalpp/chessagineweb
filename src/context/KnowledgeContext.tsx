// context/KnowledgeContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  KnowledgeCard,
  getAllCards,
  saveCard,
  deleteCard,
  MAX_CONTENT_BYTES,
  MAX_CARDS,
  byteLengthOf,
} from "@/libs/knowledgecards/helper";


async function apiGet(): Promise<KnowledgeCard[]> {
  const res = await fetch("/api/knowledge-cards");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiSave(card: KnowledgeCard): Promise<void> {
  const res = await fetch("/api/knowledge-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function apiUpdate(
  id: string,
  data: Partial<Pick<KnowledgeCard, "title" | "description" | "content">>
): Promise<void> {
  const res = await fetch("/api/knowledge-cards", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function apiDelete(id: string): Promise<void> {
  const res = await fetch(`/api/knowledge-cards?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}


interface KnowledgeContextValue {
  cards: KnowledgeCard[];
  selectedIds: Set<string>;
  isLoading: boolean;
  isPersisted: boolean;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  addCard: (data: {
    title: string;
    description: string;
    content: string;
  }) => Promise<{ error?: string }>;
  updateCard: (
    id: string,
    data: Partial<Pick<KnowledgeCard, "title" | "description" | "content">>
  ) => Promise<{ error?: string }>;
  removeCard: (id: string) => Promise<void>;
  buildKnowledgeContext: () => string | null;
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const { has, isLoaded: authLoaded } = useAuth();
  const isPaid = authLoaded ? (has?.({ plan: "paid_tier" }) ?? false) : false;

  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load cards from the appropriate backend once auth is resolved
  useEffect(() => {
    if (!authLoaded) return;

    setIsLoading(true);

    const load = isPaid ? apiGet() : getAllCards();

    load
      .then((c) => {
        setCards(c);
        setSelectedIds(new Set(c.map((card) => card.id)));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [authLoaded, isPaid]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setCards((c) => {
      setSelectedIds(new Set(c.map((card) => card.id)));
      return c;
    });
  }, []);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const addCard = useCallback(
    async (data: { title: string; description: string; content: string }) => {
      if (cards.length >= MAX_CARDS) {
        return { error: `Maximum of ${MAX_CARDS} knowledge cards allowed.` };
      }
      const contentBytes = byteLengthOf(data.content);
      if (contentBytes > MAX_CONTENT_BYTES) {
        return {
          error: `Content exceeds the 30 KB limit (${(contentBytes / 1024).toFixed(1)} KB).`,
        };
      }
      if (!data.title.trim()) return { error: "Title is required." };
      if (!data.content.trim()) return { error: "Content is required." };

      const card: KnowledgeCard = {
        id: crypto.randomUUID(),
        title: data.title.trim(),
        description: data.description.trim(),
        content: data.content.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        contentSize: contentBytes,
      };

      try {
        if (isPaid) {
          await apiSave(card);
        } else {
          await saveCard(card);
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to save card." };
      }

      setCards((prev) => [...prev, card]);
      setSelectedIds((prev) => new Set([...prev, card.id]));
      return {};
    },
    [cards, isPaid]
  );

  const updateCard = useCallback(
    async (
      id: string,
      data: Partial<Pick<KnowledgeCard, "title" | "description" | "content">>
    ) => {
      const existing = cards.find((c) => c.id === id);
      if (!existing) return { error: "Card not found." };

      const newContent = data.content ?? existing.content;
      const contentBytes = byteLengthOf(newContent);
      if (contentBytes > MAX_CONTENT_BYTES) {
        return {
          error: `Content exceeds the 30 KB limit (${(contentBytes / 1024).toFixed(1)} KB).`,
        };
      }

      const updated: KnowledgeCard = {
        ...existing,
        ...data,
        updatedAt: Date.now(),
        contentSize: contentBytes,
      };

      try {
        if (isPaid) {
          await apiUpdate(id, data);
        } else {
          await saveCard(updated);
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to update card." };
      }

      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return {};
    },
    [cards, isPaid]
  );

  const removeCard = useCallback(
    async (id: string) => {
      try {
        if (isPaid) {
          await apiDelete(id);
        } else {
          await deleteCard(id);
        }
      } catch (err) {
        console.error("Failed to delete card:", err);
      }
      setCards((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [isPaid]
  );

  const buildKnowledgeContext = useCallback((): string | null => {
    const selected = cards.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return null;
    return selected
      .map(
        (c) =>
          `### ${c.title}${c.description ? `\n${c.description}` : ""}\n\n${c.content}`
      )
      .join("\n\n---\n\n");
  }, [cards, selectedIds]);

  return (
    <KnowledgeContext.Provider
      value={{
        cards,
        selectedIds,
        isLoading,
        isPersisted: isPaid,
        toggleSelected,
        selectAll,
        deselectAll,
        addCard,
        updateCard,
        removeCard,
        buildKnowledgeContext,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error("useKnowledge must be used inside KnowledgeProvider");
  return ctx;
}