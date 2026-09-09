"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Siren, Waypoints, Brain, ArrowRight, Compass } from "lucide-react";
import { search, type SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";

const QUICK_NAV = [
  { label: "Dashboard", href: "/", hint: "overview" },
  { label: "Curriculum", href: "/curriculum", hint: "22 phases" },
  { label: "Memory Review", href: "/review", hint: "spaced repetition" },
  { label: "Exams", href: "/exams", hint: "phase exams + readiness" },
  { label: "Challenges", href: "/challenges", hint: "graded code + SQL" },
  { label: "Code Lab", href: "/code-lab", hint: "run Python/JS/TS/SQL" },
  { label: "Terminal Lab", href: "/terminal", hint: "shell scenarios" },
  { label: "Incident Lab", href: "/incidents", hint: "production incidents" },
  { label: "System Design", href: "/system-design", hint: "design canvas" },
  { label: "Networking Visualizer", href: "/networking", hint: "request lifecycle" },
  { label: "Settings", href: "/settings", hint: "theme, daily goal, export" },
];

const kindIcon: Record<SearchResult["kind"], React.ComponentType<{ className?: string }>> = {
  lesson: BookOpen,
  memory: Brain,
  incident: Siren,
  design: Waypoints,
  concept: Compass,
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo(() => (q.trim() ? search(q, 12) : []), [q]);

  const items = React.useMemo(() => {
    if (q.trim()) {
      return results.map((r) => ({ label: r.title, sub: r.subtitle, href: r.href, kind: r.kind }));
    }
    return QUICK_NAV.map((n) => ({ label: n.label, sub: n.hint, href: n.href, kind: "concept" as const }));
  }, [q, results]);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  React.useEffect(() => setSel(0), [q]);

  const go = React.useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[sel];
      if (item) go(item.href);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-fg-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search lessons, incidents, designs, memory cards..."
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-faint"
          />
          <kbd className="hidden sm:block rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-faint">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-fg-faint">
              No results for &ldquo;{q}&rdquo;. Try &ldquo;CrashLoopBackOff&rdquo;, &ldquo;cache&rdquo;, or &ldquo;kafka&rdquo;.
            </div>
          )}
          {!q.trim() && (
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
              Jump to
            </div>
          )}
          {items.map((item, i) => {
            const Icon = kindIcon[item.kind];
            return (
              <button
                key={item.href + i}
                onMouseEnter={() => setSel(i)}
                onClick={() => go(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  sel === i ? "bg-accent/10" : "hover:bg-bg-hover"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", sel === i ? "text-accent" : "text-fg-faint")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-fg">{item.label}</div>
                  {item.sub && <div className="truncate text-xs text-fg-faint">{item.sub}</div>}
                </div>
                {sel === i && <ArrowRight className="h-3.5 w-3.5 text-accent" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
