"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  Siren,
  TerminalSquare,
  Waypoints,
  ArrowRight,
  Flame,
  Target,
  AlertTriangle,
  CheckCircle2,
  Network,
} from "lucide-react";
import { useStore, levelFromXp } from "@/lib/store";
import { computeSkills, computeStats } from "@/lib/gamification";
import { useHydrated } from "@/components/hydrated";
import { ALL_LESSONS, getLesson, CURRICULUM, phaseForSlug } from "@/content";
import { isDue } from "@/lib/srs";
import { Card, CardBody, BlockBar, StatTile, SectionHeading, Badge, Button, ProgressBar } from "@/components/ui";
import { cn, todayISO } from "@/lib/utils";

export default function DashboardPage() {
  const state = useStore();
  const hydrated = useHydrated();

  const skills = computeSkills(state);
  const stats = computeStats(state);
  const lvl = levelFromXp(state.xp);

  const dueCards = React.useMemo(
    () => ALL_LESSONS.filter((l) => state.srs[l.slug] && isDue(state.srs[l.slug])),
    [state.srs]
  );

  // Continue: most recently visited in-progress authored lesson, else first not-completed authored.
  const continueLesson = React.useMemo(() => {
    const authored = ALL_LESSONS;
    const inProgress = authored
      .map((l) => ({ l, p: state.progress[l.slug] }))
      .filter((x) => x.p?.status === "in-progress")
      .sort((a, b) => (b.p?.lastVisited ?? "").localeCompare(a.p?.lastVisited ?? ""));
    if (inProgress.length) return inProgress[0].l;
    const notDone = authored.find((l) => state.progress[l.slug]?.status !== "completed");
    return notDone ?? authored[0];
  }, [state.progress]);

  const weakAreas = React.useMemo(
    () =>
      ALL_LESSONS.filter((l) => {
        const p = state.progress[l.slug];
        if (!p) return false;
        return p.needsRevision || (p.quizAttempts > 0 && (p.quizBest ?? 0) < 0.7);
      }).slice(0, 5),
    [state.progress]
  );

  const topSkills = [...skills].sort((a, b) => b.pct - a.pct).slice(0, 8);
  const continuePhase = phaseForSlug(continueLesson.slug);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-fg-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse-dot" />
            Engineering Lab
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-fg md:text-3xl">
            {greeting()}, engineer.
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Level {hydrated ? lvl.level : 1} &middot;{" "}
            <span className="text-accent">{lvl.title}</span> &middot;{" "}
            {hydrated ? stats.lessonsCompleted : 0} lessons completed
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/learn/${continueLesson.slug}`}>
            <Button variant="primary">
              Continue learning <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {hydrated && dueCards.length > 0 && (
            <Link href="/review">
              <Button variant="secondary">
                <Brain className="h-4 w-4" /> {dueCards.length} due
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Overall progress"
          value={hydrated ? `${stats.overallPct.toFixed(0)}%` : "0%"}
          sub={`${stats.lessonsCompleted}/${curriculumTotal()} lessons`}
          accent="#6ea8fe"
        />
        <StatTile
          label="Quiz accuracy"
          value={hydrated ? quizAccuracy(state) : "--"}
          sub={`${stats.quizzesPassed} quizzes passed`}
          accent="#3fb950"
        />
        <StatTile
          label="Labs solved"
          value={hydrated ? stats.terminalSolved + stats.incidentsSolved : 0}
          sub={`${stats.incidentsSolved} incidents, ${stats.terminalSolved} terminal`}
          accent="#f0a04b"
        />
        <StatTile
          label="Streak"
          value={hydrated ? state.streak.current : 0}
          sub={`longest ${hydrated ? state.streak.longest : 0} days`}
          accent="#d29922"
        />
      </div>

      {/* Skill profile + right column */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-fg">Skill Profile</h2>
              <p className="text-xs text-fg-faint">Progress across the production-engineering stack</p>
            </div>
            <Link href="/curriculum" className="text-xs text-accent hover:underline">
              View curriculum
            </Link>
          </div>
          <CardBody className="space-y-2.5">
            {topSkills.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm text-fg-muted truncate">{s.label}</div>
                <BlockBar value={hydrated ? s.pct : 0} color={s.color} />
                <div className="ml-auto w-16 text-right text-xs tabular-nums text-fg-faint">
                  {hydrated ? `${s.pct.toFixed(0)}%` : "0%"}
                </div>
                <div className="w-12 text-right text-[11px] tabular-nums text-fg-faint">
                  {s.completed}/{s.total}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Daily goal */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-xs text-fg-faint">
                <Target className="h-3.5 w-3.5" /> Today&rsquo;s goal
              </div>
              {(() => {
                const act = state.activity[todayISO()] ?? { lessons: 0, reviews: 0 };
                const gl = state.dailyGoal.lessons;
                const gr = state.dailyGoal.reviews;
                const lPct = gl > 0 ? Math.min(100, (act.lessons / gl) * 100) : 100;
                const rPct = gr > 0 ? Math.min(100, (act.reviews / gr) * 100) : 100;
                const done = act.lessons >= gl && act.reviews >= gr;
                return (
                  <div className="mt-2 space-y-2.5">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-fg-muted">Lessons</span>
                        <span className="tabular-nums text-fg-faint">
                          {hydrated ? act.lessons : 0}/{gl}
                        </span>
                      </div>
                      <ProgressBar value={hydrated ? lPct : 0} color="#6ea8fe" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-fg-muted">Reviews</span>
                        <span className="tabular-nums text-fg-faint">
                          {hydrated ? act.reviews : 0}/{gr}
                        </span>
                      </div>
                      <ProgressBar value={hydrated ? rPct : 0} color="#bc8cff" />
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className={cn("text-xs", done ? "text-good" : "text-fg-faint")}>
                        {hydrated && done ? "Goal complete for today" : "Keep going"}
                      </span>
                      <Link href="/settings" className="text-xs text-accent hover:underline">
                        Edit goal
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </CardBody>
          </Card>

          {/* Continue card */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-xs text-fg-faint">
                <Target className="h-3.5 w-3.5" /> You are here
              </div>
              <div className="mt-2 text-xs text-fg-faint">
                Phase {continuePhase?.index}: {continuePhase?.title}
              </div>
              <Link
                href={`/learn/${continueLesson.slug}`}
                className="mt-1 block text-lg font-semibold text-fg hover:text-accent"
              >
                {continueLesson.title}
              </Link>
              <p className="mt-1 text-xs text-fg-muted line-clamp-2">{continueLesson.summary}</p>
              <Link href={`/learn/${continueLesson.slug}`}>
                <Button variant="primary" size="sm" className="mt-3 w-full">
                  {state.progress[continueLesson.slug]?.status === "in-progress"
                    ? "Resume lesson"
                    : "Start lesson"}
                </Button>
              </Link>
            </CardBody>
          </Card>

          {/* Reviews */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 text-xs text-fg-faint">
                <Brain className="h-3.5 w-3.5" /> Memory reviews
              </div>
              {hydrated && dueCards.length > 0 ? (
                <>
                  <div className="mt-2 text-3xl font-semibold text-fg">{dueCards.length}</div>
                  <p className="text-xs text-fg-muted">concepts due for spaced repetition</p>
                  <Link href="/review">
                    <Button variant="secondary" size="sm" className="mt-3 w-full">
                      Start review
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-sm text-fg-muted">
                  {hydrated
                    ? "No reviews due. Complete lessons to build your deck."
                    : "Loading..."}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Weak areas */}
      {hydrated && weakAreas.length > 0 && (
        <div>
          <SectionHeading sub="Concepts you flagged or scored low on -- revisit these.">
            Weak Areas
          </SectionHeading>
          <div className="grid gap-2 md:grid-cols-2">
            {weakAreas.map((l) => {
              const p = state.progress[l.slug];
              return (
                <Link key={l.slug} href={`/learn/${l.slug}`}>
                  <Card className="transition-colors hover:border-warn/50">
                    <CardBody className="flex items-center gap-3 py-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-fg">{l.title}</div>
                        <div className="text-xs text-fg-faint">
                          {p?.needsRevision ? "Marked for revision" : `Quiz best ${Math.round((p?.quizBest ?? 0) * 100)}%`}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-fg-faint" />
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Learning path dependencies */}
      <div>
        <SectionHeading sub="The dependency chain from fundamentals to distributed systems.">
          Learning Path
        </SectionHeading>
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {["Networking", "Linux", "Docker", "Kubernetes", "Observability", "SRE", "Distributed Systems"].map(
                (step, i, arr) => (
                  <React.Fragment key={step}>
                    <span className="rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-fg-muted">
                      {step}
                    </span>
                    {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-fg-faint" />}
                  </React.Fragment>
                )
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lab shortcuts */}
      <div>
        <SectionHeading sub="Hands-on environments -- clearly separated from the reading.">
          Labs
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LabCard href="/terminal" icon={TerminalSquare} title="Terminal Lab" desc="Investigate real scenarios in a simulated shell." tone="#56d4bc" />
          <LabCard href="/incidents" icon={Siren} title="Incident Lab" desc="Diagnose production incidents from dashboards & logs." tone="#f85149" />
          <LabCard href="/system-design" icon={Waypoints} title="System Design" desc="Assemble architectures and get them evaluated." tone="#db61a2" />
          <LabCard href="/networking" icon={Network} title="Networking" desc="Click through the full request lifecycle." tone="#56d4bc" />
        </div>
      </div>

      {!hydrated && (
        <p className="text-center text-xs text-fg-faint">Loading your local progress...</p>
      )}
    </div>
  );
}

function LabCard({
  href,
  icon: Icon,
  title,
  desc,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  tone: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-accent/50">
        <CardBody>
          <Icon className="h-5 w-5" style={{ color: tone }} />
          <div className="mt-2 text-sm font-semibold text-fg">{title}</div>
          <p className="mt-1 text-xs text-fg-muted">{desc}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function curriculumTotal(): number {
  return CURRICULUM.reduce((n, p) => n + p.modules.reduce((m, mo) => m + mo.lessons.length, 0), 0);
}

function quizAccuracy(state: ReturnType<typeof useStore.getState>): string {
  const scored = Object.values(state.progress).filter((p) => p.quizAttempts > 0 && p.quizBest !== null);
  if (!scored.length) return "--";
  const avg = scored.reduce((s, p) => s + (p.quizBest ?? 0), 0) / scored.length;
  return `${Math.round(avg * 100)}%`;
}
