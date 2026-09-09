"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Siren,
  ArrowLeft,
  Lightbulb,
  ScrollText,
  TerminalSquare,
  Activity,
  Check,
  X,
  Circle,
  CheckSquare,
  Square,
} from "lucide-react";
import { INCIDENT_BY_ID, type Panel } from "@/content/incidents";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { Sparkline } from "@/components/ui/sparkline";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

const sevTone = { SEV1: "bad", SEV2: "warn", SEV3: "info" } as const;
const statusColor = { ok: "#3fb950", warn: "#d29922", crit: "#f85149" };

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const incident = INCIDENT_BY_ID[params.id];

  const recordIncident = useStore((s) => s.recordIncident);
  const result = useStore((s) => s.incidents[params.id]);
  const hydrated = useHydrated();

  const [hintsShown, setHintsShown] = React.useState(0);
  const [causeId, setCauseId] = React.useState<string | null>(null);
  const [actions, setActions] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [solved, setSolved] = React.useState(false);

  if (!incident) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-fg">Incident not found</h1>
        <Link href="/incidents">
          <Button variant="secondary" className="mt-4">
            <ArrowLeft className="h-4 w-4" /> Back to incidents
          </Button>
        </Link>
      </div>
    );
  }

  const toggleAction = (id: string) => {
    if (submitted) return;
    setActions((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const submit = () => {
    const rootCorrect = causeId === incident.rootCauseId;
    const correctSet = new Set(incident.correctActionIds);
    const selected = [...actions];
    const tp = selected.filter((a) => correctSet.has(a)).length;
    const fp = selected.filter((a) => !correctSet.has(a)).length;
    const size = correctSet.size || 1;
    const actionPct = Math.max(0, Math.min(1, tp / size - 0.5 * (fp / size)));

    let s = (rootCorrect ? 60 : 0) + Math.round(actionPct * 40) - hintsShown * 10;
    s = Math.max(0, Math.min(100, s));
    const didSolve = rootCorrect && actionPct >= 0.7;

    setScore(s);
    setSolved(didSolve);
    setSubmitted(true);
    recordIncident(incident.id, { score: s, hintsUsed: hintsShown, solved: didSolve });
  };

  const reset = () => {
    setSubmitted(false);
    setCauseId(null);
    setActions(new Set());
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <Link href="/incidents" className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Incident Lab
        </Link>
        {hydrated && result?.solved && <Badge tone="good">Best score: {result.bestScore}</Badge>}
      </div>

      {/* Header */}
      <div className="rounded-xl border border-bad/25 bg-bad/[0.04] p-5">
        <div className="flex items-center gap-2">
          <Siren className="h-5 w-5 text-bad" />
          <Badge tone={sevTone[incident.severity]}>{incident.severity}</Badge>
          <span className="text-sm text-fg-muted">{incident.service}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-fg">{incident.title}</h1>
        <p className="mt-1.5 text-fg-muted">{incident.symptom}</p>
      </div>

      {/* Dashboard */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
          <Activity className="h-4 w-4 text-accent" /> Dashboard
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {incident.dashboard.map((p) => (
            <PanelTile key={p.label} panel={p} />
          ))}
        </div>
      </div>

      {/* Logs + terminal */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <ScrollText className="h-4 w-4 text-accent" /> Logs
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg bg-[#08090d] p-3 font-mono text-xs leading-relaxed">
              {incident.logs.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap",
                    l.includes("ERROR") ? "text-bad" : l.includes("WARN") ? "text-warn" : "text-fg-muted"
                  )}
                >
                  {l}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <TerminalSquare className="h-4 w-4 text-accent" /> Terminal
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg bg-[#08090d] p-3 font-mono text-xs leading-relaxed">
              {incident.terminal && incident.terminal.length > 0 ? (
                incident.terminal.map((t, i) => (
                  <div key={i} className="mb-2">
                    <div className="text-good">$ {t.cmd}</div>
                    <div className="whitespace-pre-wrap text-fg-muted">{t.output}</div>
                  </div>
                ))
              ) : (
                <div className="text-fg-faint">No terminal output for this incident -- diagnose from the dashboard and logs.</div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Hints */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Lightbulb className="h-4 w-4 text-warn" /> Progressive hints
            </div>
            <span className="text-xs text-fg-faint">Each hint used: -10 to your score</span>
          </div>
          <div className="mt-3 space-y-2">
            {incident.hints.slice(0, hintsShown).map((h, i) => (
              <div key={i} className="rounded-lg border border-warn/25 bg-warn/5 px-3 py-2 text-sm text-fg/90 animate-fade-in">
                <span className="font-semibold text-warn">Hint {i + 1}: </span>
                {h}
              </div>
            ))}
          </div>
          {hintsShown < incident.hints.length && !submitted && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHintsShown((n) => n + 1)}>
              <Lightbulb className="h-3.5 w-3.5" /> Reveal hint {hintsShown + 1} of {incident.hints.length}
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Diagnosis */}
      <Card>
        <CardBody className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-fg">1. What is the root cause?</div>
            <div className="space-y-1.5">
              {incident.causeChoices.map((c) => {
                const isCorrect = submitted && c.id === incident.rootCauseId;
                const isWrong = submitted && causeId === c.id && c.id !== incident.rootCauseId;
                return (
                  <button
                    key={c.id}
                    disabled={submitted}
                    onClick={() => setCauseId(c.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      isCorrect
                        ? "border-good/50 bg-good/10 text-fg"
                        : isWrong
                        ? "border-bad/50 bg-bad/10 text-fg"
                        : causeId === c.id
                        ? "border-accent/50 bg-accent/10 text-fg"
                        : "border-border text-fg-muted hover:border-accent/40 hover:text-fg"
                    )}
                  >
                    {isCorrect ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                    ) : isWrong ? (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                    ) : (
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-faint" />
                    )}
                    <span>{c.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-fg">
              2. Which actions do you take? <span className="font-normal text-fg-faint">(select all that apply)</span>
            </div>
            <div className="space-y-1.5">
              {incident.actionChoices.map((a) => {
                const chosen = actions.has(a.id);
                const isCorrect = submitted && incident.correctActionIds.includes(a.id);
                const isWrong = submitted && chosen && !incident.correctActionIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    disabled={submitted}
                    onClick={() => toggleAction(a.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      isCorrect
                        ? "border-good/50 bg-good/10 text-fg"
                        : isWrong
                        ? "border-bad/50 bg-bad/10 text-fg"
                        : chosen
                        ? "border-accent/50 bg-accent/10 text-fg"
                        : "border-border text-fg-muted hover:border-accent/40 hover:text-fg"
                    )}
                  >
                    {chosen ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 shrink-0 text-fg-faint" />
                    )}
                    <span>{a.text}</span>
                    {submitted && isCorrect && !chosen && (
                      <span className="ml-auto text-[10px] text-good">(should select)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!submitted ? (
            <Button variant="primary" disabled={!causeId || actions.size === 0} onClick={submit}>
              Submit diagnosis
            </Button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold",
                    solved ? "bg-good/15 text-good" : score >= 50 ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad"
                  )}
                >
                  {score}
                </div>
                <div>
                  <div className={cn("font-semibold", solved ? "text-good" : "text-warn")}>
                    {solved ? "Incident resolved" : "Partial -- review the postmortem"}
                  </div>
                  <div className="text-xs text-fg-faint">
                    {hintsShown} hint{hintsShown === 1 ? "" : "s"} used. {solved ? "XP awarded." : "Retry for a higher score."}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
                  Retry
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-bg-soft p-4">
                <div className="mb-1 text-sm font-semibold text-fg">Postmortem</div>
                <Markdown>{incident.postmortem}</Markdown>
                {incident.relatedLessons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {incident.relatedLessons.map((s) => (
                      <Link key={s} href={`/learn/${s}`}>
                        <Badge tone="info" className="cursor-pointer">
                          {s}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function PanelTile({ panel }: { panel: Panel }) {
  const color = statusColor[panel.status];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card p-3">
      <div className="text-[11px] text-fg-faint">{panel.label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-xl font-semibold" style={{ color }}>
          {panel.value}
        </span>
        {panel.unit && <span className="text-[11px] text-fg-faint">{panel.unit}</span>}
      </div>
      <div className="mt-1">
        <Sparkline data={panel.spark} color={color} width={140} height={26} />
      </div>
    </div>
  );
}
