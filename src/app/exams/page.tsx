"use client";

import * as React from "react";
import { GraduationCap, ArrowLeft, CheckCircle2, RefreshCw, Award } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { computeSkills } from "@/lib/gamification";
import { examsIndex, buildExam, computeReadiness, EXAM_SIZE, PASS_THRESHOLD } from "@/lib/exams";
import { PHASE_BY_ID } from "@/content/curriculum";
import { Quiz } from "@/components/lesson/quiz";
import { Badge, Button, Card, CardBody, SectionHeading, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function ExamsPage() {
  const state = useStore();
  const recordExam = useStore((s) => s.recordExam);
  const hydrated = useHydrated();

  const [activePhase, setActivePhase] = React.useState<string | null>(null);
  const [seed, setSeed] = React.useState(1);

  const skills = computeSkills(state);
  const readiness = computeReadiness(skills);
  const index = examsIndex();

  if (activePhase) {
    const phase = PHASE_BY_ID[activePhase];
    const questions = buildExam(activePhase, EXAM_SIZE, seed);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActivePhase(null)}
            className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" /> All exams
          </button>
          <Button variant="ghost" size="sm" onClick={() => setSeed((s) => s + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> New question set
          </Button>
        </div>

        <div>
          <SectionHeading sub={`${questions.length} questions -- pass at ${Math.round(PASS_THRESHOLD * 100)}%. A fresh sample each attempt.`}>
            {phase?.title} Exam
          </SectionHeading>
        </div>

        <Quiz
          key={`${activePhase}-${seed}`}
          questions={questions}
          onScore={(score) => recordExam(activePhase, Math.round(score * 100), score >= PASS_THRESHOLD)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading sub="Test yourself with mixed exams per phase, and track your readiness for each role.">
        Exams & Readiness
      </SectionHeading>

      {/* Readiness */}
      <div className="grid gap-3 md:grid-cols-3">
        {readiness.map((r) => (
          <Card key={r.role}>
            <CardBody>
              <div className="flex items-center gap-2 text-xs text-fg-faint">
                <Award className="h-3.5 w-3.5" /> Role readiness
              </div>
              <div className="mt-1 text-sm font-semibold text-fg">{r.role}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-3xl font-bold"
                  style={{ color: r.score >= 70 ? "#3fb950" : r.score >= 40 ? "#d29922" : "#f85149" }}
                >
                  {hydrated ? r.score : 0}
                </span>
                <span className="text-xs text-fg-faint">/ 100</span>
              </div>
              <ProgressBar
                className="mt-2"
                value={hydrated ? r.score : 0}
                color={r.score >= 70 ? "#3fb950" : r.score >= 40 ? "#d29922" : "#f85149"}
              />
              <p className="mt-2 text-[11px] text-fg-faint">
                Based on your progress across {r.skills.length} skill areas.
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Exams list */}
      <div>
        <div className="mb-3 text-sm font-semibold text-fg">Phase exams</div>
        <div className="grid gap-2 md:grid-cols-2">
          {index.map((e) => {
            const res = hydrated ? state.exams[e.phaseId] : undefined;
            return (
              <Card key={e.phaseId} className="transition-colors hover:border-accent/40">
                <CardBody className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <GraduationCap className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-fg">
                        Phase {e.index}: {e.title}
                      </span>
                      {res?.passed && (
                        <Badge tone="good">
                          <CheckCircle2 className="h-3 w-3" /> Passed
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-fg-faint">
                      {e.available} questions available
                      {res ? ` -- best ${res.bestScore}%` : ""}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSeed((s) => s + 1);
                      setActivePhase(e.phaseId);
                    }}
                  >
                    {res ? "Retake" : "Start"}
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
