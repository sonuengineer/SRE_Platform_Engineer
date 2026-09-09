"use client";

import * as React from "react";
import { Sparkles, Lightbulb, HelpCircle, Target, BookOpen } from "lucide-react";
import type { Lesson } from "@/content/types";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Mode = "explain" | "hint" | "ask" | "challenge";

export function StudyCoach({ lesson }: { lesson: Lesson }) {
  const [mode, setMode] = React.useState<Mode>("explain");
  const [hintIdx, setHintIdx] = React.useState(0);

  const modes: { id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "explain", label: "Explain", icon: BookOpen },
    { id: "hint", label: "Hint", icon: Lightbulb },
    { id: "ask", label: "Ask me", icon: HelpCircle },
    { id: "challenge", label: "Challenge", icon: Target },
  ];

  return (
    <div className="rounded-xl border border-accent/25 bg-accent/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-fg">Study Coach</span>
        <span className="ml-auto text-[10px] text-fg-faint">
          Deterministic guidance from this lesson (no answers spoiled)
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                setHintIdx(0);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                mode === m.id
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border text-fg-muted hover:text-fg"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-fg/90">
        {mode === "explain" && (
          <div className="space-y-2">
            <p>
              <span className="font-semibold text-fg">In one line: </span>
              {lesson.memoryCard.oneLiner}
            </p>
            <p>
              <span className="font-semibold text-fg">Mental model: </span>
              {lesson.memoryCard.mentalModel}
            </p>
          </div>
        )}

        {mode === "hint" && (
          <div className="space-y-2">
            <p className="text-fg-muted">
              Key concept {Math.min(hintIdx + 1, lesson.memoryCard.keyConcepts.length)} of{" "}
              {lesson.memoryCard.keyConcepts.length}:
            </p>
            <p className="font-medium text-fg">{lesson.memoryCard.keyConcepts[hintIdx]}</p>
            {hintIdx < lesson.memoryCard.keyConcepts.length - 1 && (
              <Button size="sm" variant="ghost" onClick={() => setHintIdx((i) => i + 1)}>
                Next hint
              </Button>
            )}
          </div>
        )}

        {mode === "ask" && lesson.quiz[0] && (
          <div className="space-y-2">
            <p className="text-fg-muted">Try to answer this before scrolling to the quiz:</p>
            <p className="font-medium text-fg">{lesson.quiz[hintIdx % lesson.quiz.length].prompt}</p>
            <Button size="sm" variant="ghost" onClick={() => setHintIdx((i) => i + 1)}>
              Ask another
            </Button>
          </div>
        )}

        {mode === "challenge" && (
          <div className="space-y-2">
            <p className="text-fg-muted">Apply it:</p>
            <p className="font-medium text-fg">
              {lesson.lab?.brief ??
                `Explain "${lesson.title}" to a teammate using only the mental model and the production connection -- no jargon.`}
            </p>
            <p className="text-xs text-fg-faint">
              Production connection: {lesson.memoryCard.productionConnection}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
