"use client";

import * as React from "react";
import type { DualCode } from "@/content/types";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";

export function DualCodeBlock({ dual }: { dual: DualCode }) {
  const hasPy = !!dual.python;
  const hasTs = !!dual.typescript;
  const [tab, setTab] = React.useState<"python" | "typescript">(hasPy ? "python" : "typescript");

  return (
    <div className="rounded-xl border border-border bg-bg-soft p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-fg">{dual.concept}</span>
        <div className="flex rounded-lg border border-border bg-bg-card p-0.5">
          {hasPy && (
            <button
              onClick={() => setTab("python")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                tab === "python" ? "bg-accent/15 text-accent" : "text-fg-faint hover:text-fg"
              )}
            >
              FastAPI / Python
            </button>
          )}
          {hasTs && (
            <button
              onClick={() => setTab("typescript")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                tab === "typescript" ? "bg-accent/15 text-accent" : "text-fg-faint hover:text-fg"
              )}
            >
              NestJS / TypeScript
            </button>
          )}
        </div>
      </div>
      {tab === "python" && dual.python && <CodeBlock sample={dual.python} />}
      {tab === "typescript" && dual.typescript && <CodeBlock sample={dual.typescript} />}
      {dual.note && <p className="mt-2 text-xs italic text-fg-faint">{dual.note}</p>}
    </div>
  );
}
