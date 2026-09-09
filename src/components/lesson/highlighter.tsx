"use client";

import * as React from "react";
import { Highlighter as HighlighterIcon } from "lucide-react";
import { useStore } from "@/lib/store";

const SKIP_TAGS = new Set(["PRE", "CODE", "MARK", "BUTTON", "TEXTAREA", "INPUT", "SVG", "A"]);

function shouldSkip(node: Node): boolean {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.dataset && el.dataset.noHighlight === "true") return true;
    el = el.parentElement;
  }
  return false;
}

/** Remove all previously injected highlight marks (unwrap them). */
function unwrap(root: HTMLElement) {
  root.querySelectorAll("mark.user-hl").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
    parent.normalize();
  });
}

/** Wrap every occurrence of `text` under root with a <mark class="user-hl" data-hl-id>. */
function wrap(root: HTMLElement, text: string, id: string) {
  if (!text) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.includes(text)) return NodeFilter.FILTER_REJECT;
      if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    targets.push(n as Text);
    n = walker.nextNode();
  }
  for (const textNode of targets) {
    let rest = textNode.nodeValue ?? "";
    const frag = document.createDocumentFragment();
    let idx = rest.indexOf(text);
    if (idx === -1) continue;
    while (idx !== -1) {
      if (idx > 0) frag.appendChild(document.createTextNode(rest.slice(0, idx)));
      const mark = document.createElement("mark");
      mark.className = "user-hl";
      mark.dataset.hlId = id;
      mark.title = "Click to remove highlight";
      mark.textContent = text;
      frag.appendChild(mark);
      rest = rest.slice(idx + text.length);
      idx = rest.indexOf(text);
    }
    if (rest) frag.appendChild(document.createTextNode(rest));
    textNode.parentNode?.replaceChild(frag, textNode);
  }
}

interface Toolbar {
  x: number;
  y: number;
  text: string;
}

export function LessonHighlighter({
  slug,
  targetRef,
}: {
  slug: string;
  targetRef: React.RefObject<HTMLElement>;
}) {
  const highlights = useStore((s) => s.highlights[slug]);
  const addHighlight = useStore((s) => s.addHighlight);
  const removeHighlight = useStore((s) => s.removeHighlight);
  const [toolbar, setToolbar] = React.useState<Toolbar | null>(null);

  // Re-apply highlights to the DOM after every render (cheap; keeps marks in sync).
  React.useEffect(() => {
    const root = targetRef.current;
    if (!root) return;
    unwrap(root);
    for (const h of highlights ?? []) wrap(root, h.text, h.id);
  });

  // Click on a mark removes that highlight (event delegation on the content root).
  React.useEffect(() => {
    const root = targetRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t && t.tagName === "MARK" && t.classList.contains("user-hl")) {
        const id = t.dataset.hlId;
        if (id) {
          e.preventDefault();
          removeHighlight(slug, id);
        }
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [slug, targetRef, removeHighlight]);

  // Show the "Highlight" toolbar when the user selects text inside the content.
  React.useEffect(() => {
    const root = targetRef.current;
    if (!root) return;
    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const text = sel.toString().trim();
      if (text.length < 3) {
        setToolbar(null);
        return;
      }
      // selection must be inside the content root
      if (!root.contains(range.commonAncestorContainer)) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top - 8, text });
    };
    const onDown = (e: MouseEvent) => {
      // clicking the toolbar shouldn't dismiss it
      const el = e.target as HTMLElement;
      if (el && el.closest?.("[data-hl-toolbar]")) return;
      setToolbar(null);
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, [targetRef]);

  const commit = () => {
    if (toolbar) {
      addHighlight(slug, toolbar.text);
      setToolbar(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!toolbar) return null;
  return (
    <button
      data-hl-toolbar="true"
      onMouseDown={(e) => e.preventDefault()}
      onClick={commit}
      style={{
        position: "fixed",
        left: toolbar.x,
        top: toolbar.y,
        transform: "translate(-50%, -100%)",
        zIndex: 60,
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/50 bg-bg-card px-2.5 py-1.5 text-xs font-medium text-accent shadow-xl animate-fade-in hover:bg-accent/15"
    >
      <HighlighterIcon className="h-3.5 w-3.5" />
      Highlight
    </button>
  );
}
