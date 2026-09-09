"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";

/** Applies the persisted theme to <html> after hydration. */
export function ThemeApplier() {
  const theme = useStore((s) => s.theme);
  const hydrated = useHydrated();
  React.useEffect(() => {
    if (!hydrated) return;
    const el = document.documentElement;
    el.classList.remove("light", "dark");
    el.classList.add(theme);
  }, [theme, hydrated]);
  return null;
}
