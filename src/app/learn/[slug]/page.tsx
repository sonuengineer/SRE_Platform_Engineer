"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  TerminalSquare,
  Highlighter,
} from "lucide-react";
import { getLesson, ALL_LESSONS, phaseForSlug, isAuthored } from "@/content";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { Markdown } from "@/components/ui/markdown";
import { Quiz } from "@/components/lesson/quiz";
import { StudyCoach } from "@/components/lesson/study-coach";
import { LessonBody } from "@/components/lesson/lesson-body";
import { LessonHighlighter } from "@/components/lesson/highlighter";
import { cn } from "@/lib/utils";

const difficultyTone = {
  intro: "good",
  core: "info",
  advanced: "warn",
  expert: "bad",
} as const;

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-fg">
        {Icon && <Icon className="h-5 w-5 text-accent" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function LessonPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const lesson = getLesson(slug);

  const hydrated = useHydrated();
  const progress = useStore((s) => s.progress[slug]);
  const note = useStore((s) => s.notes[slug] ?? "");
  const bookmarked = useStore((s) => s.bookmarks.includes(slug));
  const highlightCount = useStore((s) => (s.highlights[slug] ?? []).length);
  const visitLesson = useStore((s) => s.visitLesson);
  const completeLesson = useStore((s) => s.completeLesson);
  const recordQuiz = useStore((s) => s.recordQuiz);
  const setNote = useStore((s) => s.setNote);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const toggleNeedsRevision = useStore((s) => s.toggleNeedsRevision);

  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (lesson) visitLesson(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!lesson) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold text-fg">Lesson coming soon</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {isAuthored(slug)
            ? "This lesson exists but failed to load."
            : `"${slug}" is on the roadmap but not authored yet. The platform is populated progressively.`}
        </p>
        <Link href="/curriculum">
          <Button variant="secondary" className="mt-4">
            <ArrowLeft className="h-4 w-4" /> Back to curriculum
          </Button>
        </Link>
      </div>
    );
  }

  const phase = phaseForSlug(slug);
  const status = progress?.status ?? "not-started";
  const completed = status === "completed";
  const needsRevision = progress?.needsRevision ?? false;

  // prev/next among authored lessons
  const idx = ALL_LESSONS.findIndex((l) => l.slug === slug);
  const prev = idx > 0 ? ALL_LESSONS[idx - 1] : null;
  const next = idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null;

  return (
    <div className="pb-16">
      {/* Breadcrumb + actions */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-fg-faint">
          <Link href="/curriculum" className="hover:text-fg">
            Curriculum
          </Link>
          <span>/</span>
          <span>{phase ? `Phase ${phase.index}: ${phase.title}` : "Lesson"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleBookmark(slug)}
            className={cn("rounded-lg border border-border p-2 transition-colors hover:bg-bg-hover", bookmarked && "text-accent")}
            title="Bookmark"
          >
            {hydrated && bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button
            onClick={() => toggleNeedsRevision(slug)}
            className={cn("rounded-lg border border-border p-2 transition-colors hover:bg-bg-hover", needsRevision && "text-warn")}
            title="Needs revision"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={difficultyTone[lesson.difficulty]}>{lesson.difficulty}</Badge>
          <Badge tone="muted">
            <Clock className="h-3 w-3" /> {lesson.estMinutes} min
          </Badge>
          {lesson.track !== "shared" && <Badge tone="accent">{lesson.track}</Badge>}
          {hydrated && completed && (
            <Badge tone="good">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          )}
          {hydrated && needsRevision && (
            <Badge tone="warn">
              <RefreshCw className="h-3 w-3" /> Needs revision
            </Badge>
          )}
          {hydrated && highlightCount > 0 && (
            <Badge tone="accent">
              <Highlighter className="h-3 w-3" /> {highlightCount} highlight{highlightCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-fg">{lesson.title}</h1>
        <p className="mt-2 text-fg-muted">{lesson.summary}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-faint">
          <Highlighter className="h-3.5 w-3.5" />
          Tip: select any text below to highlight it. Click a highlight to remove it.
        </p>
      </header>

      <StudyCoach lesson={lesson} />

      <div className="mt-8 space-y-10">
        {/* Highlightable teaching content (memoized so highlights stay stable) */}
        <div ref={contentRef}>
          <LessonBody lesson={lesson} />
        </div>
        <LessonHighlighter slug={slug} targetRef={contentRef} />

        {/* Quiz */}
        <Section id="quiz" title="Quiz">
          <Quiz questions={lesson.quiz} onScore={(s) => recordQuiz(slug, s)} />
        </Section>

        {/* Lab */}
        {lesson.lab && (
          <Section id="lab" icon={TerminalSquare} title="Lab">
            <Card>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <TerminalSquare className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">{lesson.lab.title}</span>
                      <Badge tone="muted">{lesson.lab.kind}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{lesson.lab.brief}</p>
                    {lesson.lab.steps && (
                      <div className="mt-2">
                        <Markdown>{lesson.lab.steps}</Markdown>
                      </div>
                    )}
                    {lesson.lab.successCriteria && (
                      <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                        {lesson.lab.successCriteria.map((c, i) => (
                          <li key={i} className="flex gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-good" /> {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {lesson.lab.kind === "terminal" && lesson.lab.scenarioId && (
                      <Link href={`/terminal?scenario=${lesson.lab.scenarioId}`}>
                        <Button variant="primary" size="sm" className="mt-3">
                          <TerminalSquare className="h-4 w-4" /> Open in Terminal Lab
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Section>
        )}

        {/* Notes */}
        <Section id="notes" title="Your notes">
          <textarea
            value={hydrated ? note : ""}
            onChange={(e) => setNote(slug, e.target.value)}
            placeholder="Write personal notes here. They're saved automatically in your browser."
            className="min-h-[120px] w-full resize-y rounded-lg border border-border bg-bg-card p-3 text-sm text-fg outline-none placeholder:text-fg-faint focus:border-accent/50"
          />
        </Section>

        {/* Complete + nav */}
        <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant={completed ? "secondary" : "primary"}
            onClick={() => completeLesson(slug)}
            disabled={completed && hydrated}
          >
            {hydrated && completed ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" /> Mark as complete (+50 XP)
              </>
            )}
          </Button>

          <div className="flex gap-2">
            {prev && (
              <Button variant="ghost" size="sm" onClick={() => router.push(`/learn/${prev.slug}`)}>
                <ArrowLeft className="h-4 w-4" /> {prev.title}
              </Button>
            )}
            {next && (
              <Button variant="secondary" size="sm" onClick={() => router.push(`/learn/${next.slug}`)}>
                {next.title} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
