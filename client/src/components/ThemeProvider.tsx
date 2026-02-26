"use client";

import { useEffect } from "react";
import { useThemeStore, getInitialTheme } from "@/stores/theme-store";

/**
 * Syncs theme store with the value set by the inline script (localStorage or system).
 * Run once on mount so Nav and other consumers see the correct theme without a flash.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initial = getInitialTheme();
    useThemeStore.setState({ theme: initial });
  }, []);

  return <>{children}</>;
}
