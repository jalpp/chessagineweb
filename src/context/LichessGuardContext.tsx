"use client";

/**
 * LichessGuardContext
 *
 * Provides a global navigation guard for the Lichess play page.
 * When a game is in progress, any navigation attempt from SideNav
 * or internal router.push calls is intercepted and a confirmation
 * modal is shown instead.
 *
 * Usage:
 *   - LichessPlayClient registers/unregisters its guard with useRegisterLichessGuard()
 *   - SideNav calls requestNavigation(href) instead of router.push() directly
 *   - The modal is rendered in layout (or LichessPlayClient itself)
 */

import React, {
  createContext, useCallback, useContext, useRef, useState, ReactNode,
} from "react";

interface LichessGuardContextType {
  /** True while a Lichess game is actively in progress */
  isGameActive: boolean;
  /** Pending href waiting for user confirmation */
  pendingHref: string | null;
  /**
   * Called by SideNav / any navigator.
   * If a game is active, shows the modal and returns false.
   * If no game is active, returns true (caller should proceed).
   */
  requestNavigation: (href: string) => boolean;
  /** Confirm the pending navigation (user clicked "Leave") */
  confirmNavigation: () => void;
  /** Cancel the pending navigation (user clicked "Stay") */
  cancelNavigation: () => void;
  /** LichessPlayClient calls this when a game starts */
  registerGuard: () => void;
  /** LichessPlayClient calls this when game ends or component unmounts */
  unregisterGuard: () => void;
}

const LichessGuardContext = createContext<LichessGuardContextType>({
  isGameActive: false,
  pendingHref: null,
  requestNavigation: () => true,
  confirmNavigation: () => {},
  cancelNavigation: () => {},
  registerGuard: () => {},
  unregisterGuard: () => {},
});

export function LichessGuardProvider({ children }: { children: ReactNode }) {
  const [isGameActive, setIsGameActive] = useState(false);
  const [pendingHref, setPendingHref]   = useState<string | null>(null);

  const registerGuard   = useCallback(() => setIsGameActive(true),  []);
  const unregisterGuard = useCallback(() => setIsGameActive(false), []);

  const requestNavigation = useCallback((href: string): boolean => {
    if (isGameActive) {
      setPendingHref(href);
      return false; // caller should NOT navigate
    }
    return true; // caller should proceed
  }, [isGameActive]);

  const confirmNavigation = useCallback(() => {
    setPendingHref(null);
    setIsGameActive(false);
  }, []);

  const cancelNavigation = useCallback(() => {
    setPendingHref(null);
  }, []);

  return (
    <LichessGuardContext.Provider value={{
      isGameActive, pendingHref,
      requestNavigation, confirmNavigation, cancelNavigation,
      registerGuard, unregisterGuard,
    }}>
      {children}
    </LichessGuardContext.Provider>
  );
}

export function useLichessGuard() {
  return useContext(LichessGuardContext);
}
