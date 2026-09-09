"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { Diagram } from "@/content/types";
import { cn } from "@/lib/utils";

export function FlowDiagram({ diagram }: { diagram: Diagram }) {
  const [active, setActive] = React.useState<string | null>(null);
  return (
    <div className="rounded-xl border border-border bg-bg-soft p-5">
      <div className="mb-4 text-sm font-semibold text-fg">{diagram.title}</div>
      <div className="flex flex-col items-stretch gap-0">
        {diagram.layers.map((node, i) => (
          <React.Fragment key={node.id}>
            <button
              onClick={() => setActive(active === node.id ? null : node.id)}
              className={cn(
                "group mx-auto w-full max-w-md rounded-lg border px-4 py-3 text-left transition-all",
                active === node.id
                  ? "border-accent bg-accent/10"
                  : "border-border bg-bg-card hover:border-accent/50 hover:bg-bg-hover"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-fg">{node.label}</span>
                {node.sub && (
                  <span className="text-[11px] text-fg-faint group-hover:text-fg-muted">
                    {active === node.id ? "" : "click"}
                  </span>
                )}
              </div>
              {node.sub && active === node.id && (
                <div className="mt-1.5 text-xs text-fg-muted animate-fade-in">{node.sub}</div>
              )}
            </button>
            {i < diagram.layers.length - 1 && (
              <div className="flex justify-center py-1 text-fg-faint">
                <ChevronDown className="h-4 w-4" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {diagram.caption && (
        <p className="mt-4 text-center text-xs italic text-fg-faint">{diagram.caption}</p>
      )}
    </div>
  );
}
