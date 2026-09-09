"use client";

import * as React from "react";
import { Search, Flame, Zap, Sun, Moon } from "lucide-react";
import { useStore, levelFromXp } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak.current);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const hydrated = useHydrated();
  const lvl = levelFromXp(xp);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg-soft/80 px-4 backdrop-blur">
      <button
        onClick={onOpenPalette}
        className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-bg-card px-3 text-sm text-fg-faint transition-colors hover:border-accent/40 hover:text-fg-muted"
      >
        <Search className="h-4 w-4" />
        <span>Search everything...</span>
        <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-card text-fg-muted transition-colors hover:text-fg"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {hydrated && theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-2.5 py-1.5">
          <Flame className={streak > 0 ? "h-4 w-4 text-warn" : "h-4 w-4 text-fg-faint"} />
          <span className="text-sm font-medium text-fg tabular-nums">{hydrated ? streak : 0}</span>
          <span className="text-xs text-fg-faint">day{streak === 1 ? "" : "s"}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-bg-card px-2.5 py-1.5">
          <Zap className="h-4 w-4 text-accent" />
          <div className="leading-tight">
            <div className="text-xs font-medium text-fg">
              Lv {hydrated ? lvl.level : 1}{" "}
              <span className="text-fg-faint font-normal">{lvl.title}</span>
            </div>
            <div className="mt-0.5 h-1 w-24 overflow-hidden rounded-full bg-bg-hover">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${hydrated ? Math.round(lvl.progress * 100) : 0}%` }}
              />
            </div>
          </div>
          <span className="text-xs tabular-nums text-fg-faint">{hydrated ? xp : 0} XP</span>
        </div>
      </div>
    </header>
  );
}
