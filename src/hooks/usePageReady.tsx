"use client";

/**
 * usePageReady — call this at the top of every page component.
 * On mount it signals NavigationContext that the page is ready,
 * which hides the PageLoader.
 *
 * Usage:
 *   export default function MyPage() {
 *     usePageReady();
 *     ...
 *   }
 */

import { useEffect } from "react";
import { useNavigation } from "@/context/NavigationContext";

export function usePageReady() {
  const { endNavigation } = useNavigation();
  useEffect(() => {

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        endNavigation();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [endNavigation]);
}