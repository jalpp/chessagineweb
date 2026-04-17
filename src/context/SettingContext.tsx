"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePersistedSettings } from "@/hooks/usePersistedStorage";

type SettingsContext = ReturnType<typeof usePersistedSettings>;

const Ctx = createContext<SettingsContext | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = usePersistedSettings();
  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}