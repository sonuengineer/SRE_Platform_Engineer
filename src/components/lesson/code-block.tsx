"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import type { CodeSample } from "@/content/types";

export function CodeBlock({ sample }: { sample: CodeSample }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(sample.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#0b0d13]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs text-fg-muted">{sample.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-fg-faint">{sample.language}</span>
          <button onClick={copy} className="text-fg-faint transition-colors hover:text-fg" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-[0.82rem] leading-relaxed">
        <code className="font-mono text-fg/90">{sample.code}</code>
      </pre>
    </div>
  );
}
