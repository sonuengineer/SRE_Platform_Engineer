"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Brain,
  TerminalSquare,
  Siren,
  Network,
  Boxes,
  Waypoints,
  Trophy,
  Bookmark,
  FlaskConical,
  Ship,
  Activity,
  Container,
  Code2,
  ClipboardCheck,
  Swords,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Learn",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/curriculum", label: "Curriculum", icon: GraduationCap },
      { href: "/review", label: "Memory Review", icon: Brain },
      { href: "/exams", label: "Exams", icon: ClipboardCheck },
    ],
  },
  {
    label: "Labs",
    items: [
      { href: "/terminal", label: "Terminal Lab", icon: TerminalSquare },
      { href: "/code-lab", label: "Code Lab", icon: Code2 },
      { href: "/challenges", label: "Challenges", icon: Swords },
      { href: "/incidents", label: "Incident Lab", icon: Siren },
      { href: "/system-design", label: "System Design", icon: Waypoints },
      { href: "/kubernetes", label: "Kubernetes Lab", icon: Ship },
      { href: "/observability", label: "Observability", icon: Activity },
      { href: "/docker-lab", label: "Docker Lab", icon: Container },
      { href: "/networking", label: "Networking", icon: Network },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/projects", label: "Projects", icon: Boxes },
      { href: "/achievements", label: "Achievements", icon: Trophy },
      { href: "/bookmarks", label: "Bookmarks & Notes", icon: Bookmark },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-bg-soft">
      <Link href="/" className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 border border-accent/30">
          <FlaskConical className="h-4 w-4 text-accent" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-fg">Engineering Lab</div>
          <div className="text-[10px] text-fg-faint">Backend / Platform / SRE</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-fg-muted hover:bg-bg-hover hover:text-fg"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[10px] text-fg-faint">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-good" /> Local-first. Progress saved in your browser.
        </span>
      </div>
    </aside>
  );
}
