"use client";

import * as React from "react";
import Link from "next/link";
import { Brain, Eye, Check, RotateCcw, ArrowRight, Sparkles } from "lucide-react";
import { ALL_LESSONS, getLesson } from "@/content";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { isDue, nextIntervalLabel, type Rating } from "@/lib/srs";
import { Badge, Button, Card, CardBody, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

const RATINGS: { id: Rating; label: string; tone: string; key: string }[] = [
  { id: "again", label: "Again", tone: "border-bad/50 text-bad hover:bg-bad/10", key: "1" },
  { id: "hard", label: "Hard", tone: "border-warn/50 text-warn hover:bg-warn/10", key: "2" },
  { id: "good", label: "Good", tone: "border-good/50 text-good hover:bg-good/10", key: "3" },
  { id: "easy", label: "Easy", tone: "border-accent/50 text-accent hover:bg-accent/10", key: "4" },
];

export default function ReviewPage() {
  const srs = useStore((s) => s.srs);
  const reviewCard = useStore((s) => s.reviewCard);
  const hydrated = useHydrated();

  const [revealed, setRevealed] = React.useState(false);
  const [reviewedThisSession, setReviewedThisSession] = React.useState(0);

  // Snapshot the due queue once per mount so cards don't jump as we rate.
  const [queue, setQueue] = React.useState<string[]>([]);
  const [pos, setPos] = React.useState(0);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (hydrated && !initialized.current) {
      const due = ALL_LESSONS.filter((l) => srs[l.slug] && isDue(srs[l.slug])).map((l) => l.slug);
      setQueue(due);
      initialized.current = true;
    }
  }, [hydrated, srs]);

  const currentSlug = queue[pos];
  const lesson = currentSlug ? getLesson(currentSlug) : undefined;

  const rate = (r: Rating) => {
    if (!currentSlug) return;
    reviewCard(currentSlug, r);
    setReviewedThisSession((n) => n + 1);
    setRevealed(false);
    setPos((p) => p + 1);
  };

  // total cards in deck for context
  const deckSize = hydrated ? Object.keys(srs).length : 0;

  if (!hydrated) {
    return <div className="py-16 text-center text-sm text-fg-faint">Loading your deck...</div>;
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <Brain className="mx-auto h-10 w-10 text-fg-faint" />
        <h1 className="mt-4 text-xl font-semibold text-fg">No reviews due</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {deckSize === 0
            ? "Complete lessons to add their memory cards to your spaced-repetition deck."
            : `Your ${deckSize}-card deck is all caught up. Come back when cards are due.`}
        </p>
        <Link href="/curriculum">
          <Button variant="secondary" className="mt-4">
            Browse lessons <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  if (pos >= queue.length) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/15">
          <Check className="h-6 w-6 text-good" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-fg">Review complete</h1>
        <p className="mt-2 text-sm text-fg-muted">
          You reviewed {reviewedThisSession} card{reviewedThisSession === 1 ? "" : "s"}. Spacing has been updated.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              initialized.current = false;
              setPos(0);
              setReviewedThisSession(0);
            }}
          >
            <RotateCcw className="h-4 w-4" /> Refresh queue
          </Button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    // card exists in srs but lesson not authored; skip
    return (
      <div className="py-16 text-center">
        <Button variant="ghost" onClick={() => setPos((p) => p + 1)}>
          Skip <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const card = lesson.memoryCard;
  const state = srs[currentSlug];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <SectionHeading>Memory Review</SectionHeading>
        <Badge tone="accent">
          {pos + 1} / {queue.length}
        </Badge>
      </div>

      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(pos / queue.length) * 100}%` }}
        />
      </div>

      <Card className="min-h-[340px]">
        <CardBody className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-fg-faint">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> {lesson.title}
          </div>

          {/* Front */}
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-fg-faint">Recall this concept</div>
            <p className="mt-2 text-lg font-medium text-fg">{card.problem}</p>
            <p className="mt-2 text-sm text-fg-muted">
              Prompt: how would you explain <span className="text-fg">{lesson.title}</span> and why it matters?
            </p>
          </div>

          {!revealed ? (
            <div className="mt-auto pt-6">
              <Button variant="primary" className="w-full" onClick={() => setRevealed(true)}>
                <Eye className="h-4 w-4" /> Reveal answer
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3 animate-fade-in">
              <Row label="Mental model" value={card.mentalModel} />
              <div>
                <div className="text-[11px] uppercase tracking-wide text-fg-faint">Key concepts</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {card.keyConcepts.map((k) => (
                    <Badge key={k} tone="accent">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
              <Row label="Production connection" value={card.productionConnection} />
              <div className="rounded-lg border border-border bg-bg-soft px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-fg-faint">One-liner</div>
                <p className="mt-1 font-medium text-fg">&ldquo;{card.oneLiner}&rdquo;</p>
              </div>
              <Link href={`/learn/${lesson.slug}`} className="inline-block text-xs text-accent hover:underline">
                Open full lesson
              </Link>
            </div>
          )}
        </CardBody>
      </Card>

      {revealed && (
        <div className="mt-4 grid grid-cols-4 gap-2 animate-fade-in">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              onClick={() => rate(r.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border bg-bg-card py-2.5 text-sm font-medium transition-colors",
                r.tone
              )}
            >
              {r.label}
              <span className="text-[10px] text-fg-faint">{nextIntervalLabel(state, r.id)}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-xs text-fg-faint">
        Rate honestly -- the scheduler spaces cards you know and resurfaces ones you don&rsquo;t.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <p className="mt-1 text-sm text-fg/90">{value}</p>
    </div>
  );
}
