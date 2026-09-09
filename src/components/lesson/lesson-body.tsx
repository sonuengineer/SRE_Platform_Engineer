"use client";

import * as React from "react";
import Link from "next/link";
import { Lightbulb, AlertTriangle, Scale, ThumbsUp, ThumbsDown, Brain } from "lucide-react";
import type { Lesson } from "@/content/types";
import { getLesson, isAuthored } from "@/content";
import { Badge, Callout } from "@/components/ui";
import { Markdown } from "@/components/ui/markdown";
import { FlowDiagram } from "@/components/ui/flow-diagram";
import { CodeBlock } from "@/components/lesson/code-block";
import { DualCodeBlock } from "@/components/lesson/dual-code";

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

function MemRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <p className="mt-1 text-sm text-fg/90">{value}</p>
    </div>
  );
}

// Memoized so it does not re-render on store changes -- this keeps the DOM
// stable so injected highlight <mark>s persist without fighting React.
function LessonBodyInner({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-10">
      <Section id="why" icon={Lightbulb} title="Why it exists">
        <Markdown>{lesson.why}</Markdown>
      </Section>

      <Section id="intuition" title="Intuition">
        <Markdown>{lesson.intuition}</Markdown>
      </Section>

      <Section id="how" title="How it works">
        <Markdown>{lesson.howItWorks}</Markdown>
      </Section>

      {lesson.diagram && (
        <Section id="diagram" title="Visual">
          <FlowDiagram diagram={lesson.diagram} />
        </Section>
      )}

      {lesson.internals && (
        <Section id="internals" title="Internals">
          <Markdown>{lesson.internals}</Markdown>
        </Section>
      )}

      {lesson.dualCode && lesson.dualCode.length > 0 && (
        <Section id="dual" title="FastAPI vs NestJS">
          <div className="space-y-4">
            {lesson.dualCode.map((d, i) => (
              <DualCodeBlock key={i} dual={d} />
            ))}
          </div>
        </Section>
      )}

      {lesson.code && lesson.code.length > 0 && (
        <Section id="code" title="Code">
          <div className="space-y-4">
            {lesson.code.map((c, i) => (
              <CodeBlock key={i} sample={c} />
            ))}
          </div>
        </Section>
      )}

      {lesson.realWorld && (
        <Section id="real-world" title="Real-world example">
          <Callout tone="info">
            <Markdown>{lesson.realWorld}</Markdown>
          </Callout>
        </Section>
      )}

      {lesson.production && (
        <Section id="production" title="Production usage">
          <Markdown>{lesson.production}</Markdown>
        </Section>
      )}

      {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
        <Section id="mistakes" icon={AlertTriangle} title="Common mistakes">
          <ul className="space-y-2">
            {lesson.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-sm text-fg/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {lesson.tradeoffs && (
        <Section id="tradeoffs" icon={Scale} title="Trade-offs">
          <Markdown>{lesson.tradeoffs}</Markdown>
        </Section>
      )}

      {(lesson.whenToUse || lesson.whenNotToUse) && (
        <Section id="when" title="When to use / when not">
          <div className="grid gap-4 md:grid-cols-2">
            {lesson.whenToUse && (
              <div className="rounded-lg border border-good/25 bg-good/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-good">
                  <ThumbsUp className="h-4 w-4" /> When to use
                </div>
                <ul className="space-y-1.5 text-sm text-fg/90">
                  {lesson.whenToUse.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-good">+</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.whenNotToUse && (
              <div className="rounded-lg border border-bad/25 bg-bad/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-bad">
                  <ThumbsDown className="h-4 w-4" /> When NOT to use
                </div>
                <ul className="space-y-1.5 text-sm text-fg/90">
                  {lesson.whenNotToUse.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-bad">-</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section id="memory" icon={Brain} title="Memory card">
        <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] to-transparent p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <MemRow label="Problem" value={lesson.memoryCard.problem} />
            <MemRow label="Mental model" value={lesson.memoryCard.mentalModel} />
            <div data-no-highlight="true">
              <div className="text-[11px] uppercase tracking-wide text-fg-faint">Key concepts</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {lesson.memoryCard.keyConcepts.map((k) => (
                  <Badge key={k} tone="accent">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
            <MemRow label="Production connection" value={lesson.memoryCard.productionConnection} />
          </div>
          <div className="mt-4 rounded-lg border border-border bg-bg-card px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-fg-faint">One-line memory</div>
            <p className="mt-1 font-medium text-fg">&ldquo;{lesson.memoryCard.oneLiner}&rdquo;</p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-fg-muted" data-no-highlight="true">
            <Brain className="h-3.5 w-3.5 text-accent" />
            Complete the lesson to add this card to your spaced-repetition deck.
            <Link href="/review" className="ml-auto text-accent hover:underline">
              Go to review
            </Link>
          </div>
        </div>
      </Section>

      {lesson.relatedConcepts.length > 0 && (
        <Section id="related" title="Related concepts">
          <div className="flex flex-wrap gap-2" data-no-highlight="true">
            {lesson.relatedConcepts.map((r) =>
              isAuthored(r) ? (
                <Link key={r} href={`/learn/${r}`}>
                  <Badge tone="info" className="cursor-pointer hover:bg-info/25">
                    {getLesson(r)?.title ?? r}
                  </Badge>
                </Link>
              ) : (
                <Badge key={r} tone="muted">
                  {r}
                </Badge>
              )
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

export const LessonBody = React.memo(LessonBodyInner);
