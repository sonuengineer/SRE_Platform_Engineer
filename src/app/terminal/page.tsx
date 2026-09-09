"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TerminalSquare, CheckCircle2, Circle, Target, Check, X, ArrowRight } from "lucide-react";
import { TERMINAL_SCENARIOS, TERMINAL_BY_ID, type TerminalScenario } from "@/content/terminal";
import { runCommand } from "@/lib/terminal";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Button, Card, CardBody, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function TerminalPage() {
  return (
    <React.Suspense fallback={<div className="py-16 text-center text-sm text-fg-faint">Loading terminal...</div>}>
      <TerminalInner />
    </React.Suspense>
  );
}

function TerminalInner() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("scenario");
  const [activeId, setActiveId] = React.useState<string>(
    (initialId && TERMINAL_BY_ID[initialId] ? initialId : TERMINAL_SCENARIOS[0].id)
  );
  const scenario = TERMINAL_BY_ID[activeId];

  const solvedSet = useStore((s) => s.terminalSolved);
  const hydrated = useHydrated();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeading sub="Investigate realistic scenarios in a simulated shell. Nothing fakes success -- you must read the output and diagnose.">
          Terminal Lab
        </SectionHeading>
        <Badge tone="warn">SIMULATED</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* Scenario list */}
        <div className="space-y-1.5">
          {TERMINAL_SCENARIOS.map((s) => {
            const solved = hydrated && solvedSet.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  activeId === s.id
                    ? "border-accent/50 bg-accent/10"
                    : "border-border hover:border-accent/40 hover:bg-bg-hover"
                )}
              >
                {solved ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-fg-faint" />
                )}
                <span className={cn("flex-1 truncate", activeId === s.id ? "text-fg" : "text-fg-muted")}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active scenario */}
        <TerminalScenarioView key={scenario.id} scenario={scenario} />
      </div>
    </div>
  );
}

function TerminalScenarioView({ scenario }: { scenario: TerminalScenario }) {
  const solveTerminal = useStore((s) => s.solveTerminal);
  const solved = useStore((s) => s.terminalSolved.includes(scenario.id));
  const hydrated = useHydrated();

  const [lines, setLines] = React.useState<{ prompt?: string; text: string }[]>([
    { text: `Connected to ${scenario.host}. Type 'help' for commands. Read the mission, investigate, then diagnose.` },
  ]);
  const [cwd, setCwd] = React.useState(scenario.cwd);
  const [input, setInput] = React.useState("");
  const [hist, setHist] = React.useState<string[]>([]);
  const [histPos, setHistPos] = React.useState(-1);

  const [answerId, setAnswerId] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  const promptStr = `${scenario.user}@${scenario.host}:${cwd}$`;

  const submit = () => {
    const line = input;
    const newLines = [...lines, { prompt: promptStr, text: line }];
    if (line.trim() === "clear") {
      setLines([]);
    } else {
      const res = runCommand(scenario, cwd, line);
      if (res.cleared) {
        setLines([]);
      } else {
        if (res.output) newLines.push({ text: res.output });
        setLines(newLines);
      }
      setCwd(res.cwd);
    }
    if (line.trim()) setHist((h) => [line, ...h]);
    setHistPos(-1);
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistPos((p) => {
        const np = Math.min(p + 1, hist.length - 1);
        if (hist[np] !== undefined) setInput(hist[np]);
        return np;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistPos((p) => {
        const np = Math.max(p - 1, -1);
        setInput(np === -1 ? "" : hist[np] ?? "");
        return np;
      });
    }
  };

  const checkAnswer = () => {
    setChecked(true);
    if (answerId === scenario.correctId) {
      solveTerminal(scenario.id);
    }
  };

  const correct = checked && answerId === scenario.correctId;

  return (
    <div className="space-y-4">
      {/* Mission */}
      <Card>
        <CardBody className="flex items-start gap-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fg">{scenario.title}</span>
              {hydrated && solved && (
                <Badge tone="good">
                  <CheckCircle2 className="h-3 w-3" /> Solved
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-fg-muted">{scenario.mission}</p>
          </div>
        </CardBody>
      </Card>

      {/* Terminal */}
      <div className="overflow-hidden rounded-xl border border-border bg-[#08090d]">
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
          <span className="ml-2 flex items-center gap-1.5 text-xs text-fg-faint">
            <TerminalSquare className="h-3.5 w-3.5" /> {scenario.user}@{scenario.host}
          </span>
        </div>
        <div
          ref={scrollRef}
          className="h-[320px] overflow-y-auto p-3 font-mono text-[0.8rem] leading-relaxed"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              {l.prompt && <span className="text-good">{l.prompt} </span>}
              <span className={l.prompt ? "text-fg" : "text-fg-muted"}>{l.text}</span>
            </div>
          ))}
          <div className="flex items-center">
            <span className="text-good">{promptStr}&nbsp;</span>
            <input
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              className="flex-1 bg-transparent text-fg outline-none"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-fg-faint">
        Try: <code className="text-accent">help</code>, <code className="text-accent">ls</code>,{" "}
        <code className="text-accent">cat</code>, <code className="text-accent">grep</code>, plus the
        diagnostic tools hinted in the mission.
      </p>

      {/* Diagnosis */}
      <Card>
        <CardBody>
          <div className="mb-3 text-sm font-semibold text-fg">Diagnosis: {scenario.question}</div>
          <div className="space-y-1.5">
            {scenario.choices.map((c) => {
              const isCorrect = checked && c.id === scenario.correctId;
              const isWrong = checked && answerId === c.id && c.id !== scenario.correctId;
              return (
                <button
                  key={c.id}
                  disabled={checked && correct}
                  onClick={() => setAnswerId(c.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isCorrect
                      ? "border-good/50 bg-good/10 text-fg"
                      : isWrong
                      ? "border-bad/50 bg-bad/10 text-fg"
                      : answerId === c.id
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

          <div className="mt-3 flex items-center gap-3">
            <Button variant="primary" size="sm" disabled={!answerId || (checked && correct)} onClick={checkAnswer}>
              Submit diagnosis
            </Button>
            {checked && (
              <span className={cn("text-sm font-medium", correct ? "text-good" : "text-bad")}>
                {correct ? "Correct! +40 XP" : "Not quite -- re-read the output and try again."}
              </span>
            )}
          </div>

          {checked && correct && (
            <div className="mt-3 rounded-lg border border-good/25 bg-good/5 px-3 py-2 text-sm text-fg/90 animate-fade-in">
              <div className="mb-1 font-semibold text-good">Explanation</div>
              {scenario.explanation}
              {scenario.relatedLessons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scenario.relatedLessons.map((s) => (
                    <Link key={s} href={`/learn/${s}`}>
                      <Badge tone="info" className="cursor-pointer">
                        {s} <ArrowRight className="h-3 w-3" />
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
