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
import {
  KnowledgeCard,
  getAllCards,
  saveCard,
  deleteCard,
  MAX_CONTENT_BYTES,
  MAX_CARDS,
  byteLengthOf,
} from "@/libs/knowledgecards/helper";

interface KnowledgeContextValue {
  cards: KnowledgeCard[];
  selectedIds: Set<string>;
  isLoading: boolean;
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
  /** Returns content of selected cards, formatted for injection */
  buildKnowledgeContext: () => string | null;
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllCards()
      .then((c) => {
        setCards(c);
        // Auto-select all on load
        setSelectedIds(new Set(c.map((card) => card.id)));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

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
          error: `Content exceeds the 8 KB limit (${(contentBytes / 1024).toFixed(1)} KB).`,
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
      await saveCard(card);
      setCards((prev) => [...prev, card]);
      setSelectedIds((prev) => new Set([...prev, card.id]));
      return {};
    },
    [cards]
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
          error: `Content exceeds the 8 KB limit (${(contentBytes / 1024).toFixed(1)} KB).`,
        };
      }

      const updated: KnowledgeCard = {
        ...existing,
        ...data,
        updatedAt: Date.now(),
        contentSize: contentBytes,
      };
      await saveCard(updated);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return {};
    },
    [cards]
  );

  const removeCard = useCallback(async (id: string) => {
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

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