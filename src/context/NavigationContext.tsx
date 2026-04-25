"use client";

import React, { createContext, useContext, useCallback, useRef, useState, ReactNode } from "react";

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  endNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: () => {},
  endNavigation: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const startNavigation = useCallback(() => setIsNavigating(true), []);
  const endNavigation = useCallback(() => setIsNavigating(false), []);
  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation, endNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}