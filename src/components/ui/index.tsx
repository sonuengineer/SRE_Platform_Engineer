import * as React from "react";
import { cn } from "@/lib/utils";

// ---- Card ------------------------------------------------------------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-bg-card", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-fg", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

// ---- Badge -----------------------------------------------------------------
type BadgeTone = "default" | "accent" | "good" | "warn" | "bad" | "info" | "muted";
const badgeTones: Record<BadgeTone, string> = {
  default: "bg-bg-hover text-fg-muted border-border",
  accent: "bg-accent/15 text-accent border-accent/30",
  good: "bg-good/15 text-good border-good/30",
  warn: "bg-warn/15 text-warn border-warn/30",
  bad: "bg-bad/15 text-bad border-bad/30",
  info: "bg-info/15 text-info border-info/30",
  muted: "bg-transparent text-fg-faint border-border",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

// ---- Button ----------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-black hover:bg-accent/90 font-medium",
  secondary: "bg-bg-hover text-fg hover:bg-border border border-border",
  ghost: "text-fg-muted hover:text-fg hover:bg-bg-hover",
  danger: "bg-bad/90 text-white hover:bg-bad",
  outline: "border border-border text-fg hover:bg-bg-hover",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }
>(({ variant = "secondary", size = "md", className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

// ---- Progress bar ----------------------------------------------------------
export function ProgressBar({
  value,
  className,
  barClassName,
  color,
}: {
  value: number; // 0..100
  className?: string;
  barClassName?: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-bg-hover", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", barClassName)}
        style={{ width: `${v}%`, background: color ?? "var(--tw-gradient-from, #6ea8fe)" }}
      />
    </div>
  );
}

// ---- Segmented progress (blocky, terminal-ish) -----------------------------
export function BlockBar({ value, blocks = 14, color = "#6ea8fe" }: { value: number; blocks?: number; color?: string }) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * blocks);
  return (
    <span className="font-mono tracking-tighter text-sm">
      {Array.from({ length: blocks }).map((_, i) => (
        <span key={i} style={{ color: i < filled ? color : "#242a38" }}>
          {i < filled ? "█" : "░"}
        </span>
      ))}
    </span>
  );
}

// ---- Stat tile -------------------------------------------------------------
export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-fg-muted">{sub}</div>}
    </div>
  );
}

// ---- Section heading -------------------------------------------------------
export function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-fg">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-fg-muted">{sub}</p>}
    </div>
  );
}

// ---- Callout ---------------------------------------------------------------
export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "good" | "bad";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-info/30 bg-info/5",
    warn: "border-warn/30 bg-warn/5",
    good: "border-good/30 bg-good/5",
    bad: "border-bad/30 bg-bad/5",
  };
  const titleColor = { info: "text-info", warn: "text-warn", good: "text-good", bad: "text-bad" };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {title && <div className={cn("mb-1 font-semibold", titleColor[tone])}>{title}</div>}
      <div className="text-fg/90">{children}</div>
    </div>
  );
}
