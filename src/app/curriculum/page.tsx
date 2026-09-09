"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, CircleDot, Lock, ChevronRight } from "lucide-react";
import { CURRICULUM, getLesson, isAuthored } from "@/content";
import { SKILL_MAP } from "@/content/skills";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Card, CardBody, Badge, ProgressBar, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function CurriculumPage() {
  const progress = useStore((s) => s.progress);
  const hydrated = useHydrated();
  const [openPhase, setOpenPhase] = React.useState<string | null>(CURRICULUM[0].id);

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading sub="22 phases from CS fundamentals to operating a distributed system in production.">
          Curriculum
        </SectionHeading>
      </div>

      <div className="space-y-3">
        {CURRICULUM.map((phase) => {
          const allSlugs = phase.modules.flatMap((m) => m.lessons);
          const completed = allSlugs.filter((s) => progress[s]?.status === "completed").length;
          const pct = allSlugs.length ? (completed / allSlugs.length) * 100 : 0;
          const authoredCount = allSlugs.filter(isAuthored).length;
          const skill = SKILL_MAP[phase.skill];
          const open = openPhase === phase.id;

          return (
            <Card key={phase.id} className={cn(open && "border-accent/40")}>
              <button
                onClick={() => setOpenPhase(open ? null : phase.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold"
                  style={{ borderColor: skill.color + "55", color: skill.color, background: skill.color + "11" }}
                >
                  {phase.index}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-fg">{phase.title}</h3>
                    <Badge tone="muted">{authoredCount} ready</Badge>
                    {authoredCount < allSlugs.length && (
                      <Badge tone="muted">{allSlugs.length - authoredCount} soon</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-fg-muted">{phase.subtitle}</p>
                </div>
                <div className="hidden w-40 shrink-0 sm:block">
                  <ProgressBar value={hydrated ? pct : 0} color={skill.color} />
                  <div className="mt-1 text-right text-[11px] tabular-nums text-fg-faint">
                    {completed}/{allSlugs.length}
                  </div>
                </div>
                <ChevronRight
                  className={cn("h-5 w-5 shrink-0 text-fg-faint transition-transform", open && "rotate-90")}
                />
              </button>

              {open && (
                <CardBody className="border-t border-border pt-4 animate-fade-in">
                  <div className="space-y-4">
                    {phase.modules.map((mod) => (
                      <div key={mod.id}>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-faint">
                          {mod.title}
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {mod.lessons.map((slug) => {
                            const authored = isAuthored(slug);
                            const lesson = getLesson(slug);
                            const status = progress[slug]?.status ?? "not-started";
                            const title = lesson?.title ?? prettifySlug(slug);
                            const Inner = (
                              <div
                                className={cn(
                                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                                  authored
                                    ? "border-border hover:border-accent/50 hover:bg-bg-hover"
                                    : "border-border/60 opacity-60"
                                )}
                              >
                                {!authored ? (
                                  <Lock className="h-4 w-4 shrink-0 text-fg-faint" />
                                ) : status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
                                ) : status === "in-progress" ? (
                                  <CircleDot className="h-4 w-4 shrink-0 text-accent" />
                                ) : (
                                  <Circle className="h-4 w-4 shrink-0 text-fg-faint" />
                                )}
                                <span className={cn("flex-1 truncate", authored ? "text-fg" : "text-fg-muted")}>
                                  {title}
                                </span>
                                {authored && lesson && (
                                  <span className="text-[10px] text-fg-faint">{lesson.estMinutes}m</span>
                                )}
                                {!authored && <span className="text-[10px] text-fg-faint">soon</span>}
                              </div>
                            );
                            return authored ? (
                              <Link key={slug} href={`/learn/${slug}`}>
                                {Inner}
                              </Link>
                            ) : (
                              <div key={slug} title="Content coming soon">
                                {Inner}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
