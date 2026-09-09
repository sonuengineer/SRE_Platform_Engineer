"use client";

import * as React from "react";
import { useStore } from "@/lib/store";

/** Returns true only after the persisted store has rehydrated on the client. */
export function useHydrated(): boolean {
  const hydrated = useStore((s) => s._hasHydrated);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted && hydrated;
}

/** Renders children only after hydration; shows a fallback otherwise. */
export function Hydrated({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const ready = useHydrated();
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
