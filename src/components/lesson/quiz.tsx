"use client";

import * as React from "react";
import { Check, X, RotateCcw } from "lucide-react";
import type { QuizQuestion } from "@/content/types";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Quiz({
  questions,
  onScore,
}: {
  questions: QuizQuestion[];
  onScore: (score: number) => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const correctCount = questions.filter((q) => q.choices[answers[q.id]]?.correct).length;
  const score = questions.length ? correctCount / questions.length : 0;

  const submit = () => {
    setSubmitted(true);
    onScore(score);
  };
  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-lg border border-border bg-bg-card p-4">
          <div className="mb-3 flex gap-2 text-sm font-medium text-fg">
            <span className="text-fg-faint">{qi + 1}.</span>
            <span>{q.prompt}</span>
          </div>
          <div className="space-y-1.5">
            {q.choices.map((choice, ci) => {
              const selected = answers[q.id] === ci;
              const showCorrect = submitted && choice.correct;
              const showWrong = submitted && selected && !choice.correct;
              return (
                <button
                  key={ci}
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    showCorrect
                      ? "border-good/50 bg-good/10 text-fg"
                      : showWrong
                      ? "border-bad/50 bg-bad/10 text-fg"
                      : selected
                      ? "border-accent/50 bg-accent/10 text-fg"
                      : "border-border text-fg-muted hover:border-accent/40 hover:text-fg",
                    submitted && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                      showCorrect ? "border-good bg-good text-black" : showWrong ? "border-bad bg-bad text-white" : selected ? "border-accent" : "border-border"
                    )}
                  >
                    {showCorrect ? <Check className="h-3 w-3" /> : showWrong ? <X className="h-3 w-3" /> : ""}
                  </span>
                  <span className="flex-1">{choice.text}</span>
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className="mt-3 rounded-lg border border-border bg-bg-soft px-3 py-2 text-xs text-fg-muted animate-fade-in">
              <span className="font-semibold text-fg">Why: </span>
              {q.explanation}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        {!submitted ? (
          <Button variant="primary" disabled={!allAnswered} onClick={submit}>
            Check answers
          </Button>
        ) : (
          <>
            <Badge tone={score >= 0.7 ? "good" : "warn"}>
              Score: {correctCount}/{questions.length} ({Math.round(score * 100)}%)
            </Badge>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
            {score >= 0.7 ? (
              <span className="text-xs text-good">Passed -- +XP awarded on first pass.</span>
            ) : (
              <span className="text-xs text-warn">Below 70% -- review the explanations and retry.</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
