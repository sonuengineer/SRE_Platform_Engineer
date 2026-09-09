"use client";

import * as React from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  ArrowLeft,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { CHALLENGES, type Challenge } from "@/content/challenges";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Button, Card, CardBody, SectionHeading } from "@/components/ui";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL?: string }) => Promise<PyInstance>;
    initSqlJs?: (config?: { locateFile?: (f: string) => string }) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}
type PyInstance = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const SQLJS_BASE = "https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/";

const langLabel: Record<Challenge["lang"], string> = {
  python: "Python",
  javascript: "JavaScript",
  sql: "SQL",
};
const diffTone = { easy: "good", medium: "warn", hard: "bad" } as const;

interface CaseResult {
  pass: boolean;
  label: string;
  detail?: string;
}
interface GradeResult {
  solved: boolean;
  cases: CaseResult[];
  error?: string;
}

export default function ChallengesPage() {
  const challenges = useStore((s) => s.challenges);
  const recordChallenge = useStore((s) => s.recordChallenge);
  const hydrated = useHydrated();

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | Challenge["lang"]>("all");

  const active = activeId ? CHALLENGES.find((c) => c.id === activeId) ?? null : null;

  if (active) {
    return (
      <ChallengeView
        challenge={active}
        result={hydrated ? challenges[active.id] : undefined}
        onBack={() => setActiveId(null)}
        onGraded={(solved) => recordChallenge(active.id, solved)}
      />
    );
  }

  const list = CHALLENGES.filter((c) => filter === "all" || c.lang === filter);
  const solvedCount = hydrated ? CHALLENGES.filter((c) => challenges[c.id]?.solved).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeading sub="Solve coding and SQL problems that are actually graded -- your code runs against hidden test cases in your browser.">
          Challenges
        </SectionHeading>
        <Badge tone="good">
          <Trophy className="h-3 w-3" /> {solvedCount}/{CHALLENGES.length} solved
        </Badge>
      </div>

      <div className="flex gap-1.5">
        {(["all", "python", "javascript", "sql"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : langLabel[f]}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {list.map((c) => {
          const res = hydrated ? challenges[c.id] : undefined;
          return (
            <Card key={c.id} className="transition-colors hover:border-accent/40">
              <CardBody className="flex items-center gap-3">
                {res?.solved ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-good" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-fg-faint" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg">{c.title}</span>
                    <Badge tone="muted">{langLabel[c.lang]}</Badge>
                    <Badge tone={diffTone[c.difficulty]}>{c.difficulty}</Badge>
                  </div>
                  <div className="text-xs text-fg-faint">
                    #{c.topic}
                    {res && res.attempts > 0 ? ` -- ${res.attempts} attempt${res.attempts === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setActiveId(c.id)}>
                  {res?.solved ? "Review" : "Solve"}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ChallengeView({
  challenge,
  result,
  onBack,
  onGraded,
}: {
  challenge: Challenge;
  result?: { solved: boolean; attempts: number };
  onBack: () => void;
  onGraded: (solved: boolean) => void;
}) {
  const [code, setCode] = React.useState(challenge.starter);
  const [running, setRunning] = React.useState(false);
  const [grade, setGrade] = React.useState<GradeResult | null>(null);
  const [rtStatus, setRtStatus] = React.useState<"idle" | "loading" | "ready" | "error">(
    challenge.lang === "javascript" ? "ready" : "idle"
  );

  const pyRef = React.useRef<PyInstance | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlRef = React.useRef<any>(null);
  const started = React.useRef(false);

  const ensureRuntime = React.useCallback(async () => {
    if (challenge.lang === "javascript") return;
    if (started.current) return;
    started.current = true;
    setRtStatus("loading");
    try {
      if (challenge.lang === "python") {
        if (!window.loadPyodide) await loadScriptOnce(PYODIDE_INDEX + "pyodide.js", "pyodide");
        pyRef.current = await window.loadPyodide!({ indexURL: PYODIDE_INDEX });
      } else {
        if (!window.initSqlJs) await loadScriptOnce(SQLJS_BASE + "sql-wasm.js", "sqljs");
        sqlRef.current = await window.initSqlJs!({ locateFile: (f: string) => SQLJS_BASE + f });
      }
      setRtStatus("ready");
    } catch (err) {
      started.current = false;
      setRtStatus("error");
      console.error("runtime load failed:", err);
    }
  }, [challenge.lang]);

  React.useEffect(() => {
    void ensureRuntime();
  }, [ensureRuntime]);

  const submit = async () => {
    setRunning(true);
    setGrade(null);
    try {
      let g: GradeResult;
      if (challenge.lang === "python") g = await gradePython(challenge, code, pyRef.current);
      else if (challenge.lang === "javascript") g = await gradeJs(challenge, code);
      else g = gradeSql(challenge, code, sqlRef.current);
      setGrade(g);
      if (!g.error) onGraded(g.solved);
    } finally {
      setRunning(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      const en = el.selectionEnd;
      setCode(code.slice(0, s) + "  " + code.slice(en));
      requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = s + 2));
    }
  };

  const disabled = running || rtStatus === "loading" || rtStatus === "error";

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> All challenges
        </button>
        {result?.solved && (
          <Badge tone="good">
            <CheckCircle2 className="h-3 w-3" /> Solved
          </Badge>
        )}
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-fg">{challenge.title}</h1>
          <Badge tone="muted">{langLabel[challenge.lang]}</Badge>
          <Badge tone={diffTone[challenge.difficulty]}>{challenge.difficulty}</Badge>
        </div>
        <Markdown>{challenge.prompt}</Markdown>
        {challenge.sqlSetup && (
          <details className="mt-2 rounded-lg border border-border bg-bg-soft p-3">
            <summary className="cursor-pointer text-xs font-medium text-fg-muted">
              Show schema &amp; seed data
            </summary>
            <pre className="mt-2 overflow-x-auto text-xs text-fg-muted">{challenge.sqlSetup}</pre>
          </details>
        )}
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-fg">Your solution</div>
            <div className="flex items-center gap-2">
              {rtStatus === "loading" && (
                <span className="flex items-center gap-1 text-xs text-warn">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading {langLabel[challenge.lang]}...
                </span>
              )}
              {rtStatus === "error" && (
                <span className="flex items-center gap-1 text-xs text-bad">
                  <AlertTriangle className="h-3.5 w-3.5" /> runtime failed (needs internet)
                </span>
              )}
              <Button variant="primary" size="sm" onClick={submit} disabled={disabled}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run tests
              </Button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            rows={14}
            className={cn(
              "w-full resize-y rounded-lg border border-border bg-[#08090d] p-3",
              "font-mono text-[0.8rem] leading-relaxed text-fg outline-none focus:border-accent/50"
            )}
          />
        </CardBody>
      </Card>

      {grade && (
        <Card className={grade.solved ? "border-good/40" : grade.error ? "border-bad/40" : "border-warn/40"}>
          <CardBody className="space-y-2">
            {grade.error ? (
              <div className="flex items-start gap-2 text-sm text-bad">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Your code did not run</div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-fg-muted">{grade.error}</pre>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold",
                    grade.solved ? "text-good" : "text-warn"
                  )}
                >
                  {grade.solved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {grade.cases.filter((c) => c.pass).length}/{grade.cases.length} tests passed
                  {grade.solved ? " -- solved! +XP on first solve." : " -- keep going."}
                </div>
                <div className="space-y-1">
                  {grade.cases.map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-1.5 text-xs",
                        c.pass ? "border-good/25 bg-good/5" : "border-bad/25 bg-bad/5"
                      )}
                    >
                      {c.pass ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" />
                      )}
                      <div className="min-w-0">
                        <div className="text-fg">{c.label}</div>
                        {c.detail && <div className="whitespace-pre-wrap text-fg-faint">{c.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ---- graders ---------------------------------------------------------------

async function gradePython(ch: Challenge, code: string, py: PyInstance | null): Promise<GradeResult> {
  if (!py) return { solved: false, cases: [], error: "Python runtime not ready (needs internet)." };
  const cases = ch.cases ?? [];
  const casesLiteral = JSON.stringify(JSON.stringify(cases)); // safe python str literal
  const harness = [
    code,
    "import json as __json",
    `__cases = __json.loads(${casesLiteral})`,
    "__res = []",
    "for __c in __cases:",
    "    try:",
    `        __g = ${ch.entry}(*__c["input"])`,
    '        __res.append(__g == __c["expected"])',
    "    except Exception as __e:",
    "        __res.append(False)",
    'print("__VERDICT__" + __json.dumps(__res))',
  ].join("\n");

  const out: string[] = [];
  const err: string[] = [];
  py.setStdout({ batched: (s) => out.push(s) });
  py.setStderr({ batched: (s) => err.push(s) });
  try {
    await py.runPythonAsync(harness);
  } catch (e) {
    return { solved: false, cases: [], error: cleanErr(e) || err.join("\n") };
  } finally {
    py.setStdout({ batched: () => {} });
    py.setStderr({ batched: () => {} });
  }
  const verdictLine = out.map((s) => s.trim()).find((s) => s.startsWith("__VERDICT__"));
  if (!verdictLine) {
    return { solved: false, cases: [], error: err.join("\n") || out.join("\n") || "No verdict produced." };
  }
  let bools: boolean[] = [];
  try {
    bools = JSON.parse(verdictLine.replace("__VERDICT__", ""));
  } catch {
    return { solved: false, cases: [], error: "Could not parse test verdict." };
  }
  return boolsToResult(cases, bools);
}

async function gradeJs(ch: Challenge, code: string): Promise<GradeResult> {
  const cases = ch.cases ?? [];
  const src = [
    code,
    `const __cases = ${JSON.stringify(cases)};`,
    "const __res = [];",
    "for (const __c of __cases) {",
    "  try {",
    `    const __g = await Promise.resolve(${ch.entry}(...__c.input));`,
    "    __res.push(JSON.stringify(__g) === JSON.stringify(__c.expected));",
    "  } catch (e) { __res.push(false); }",
    "}",
    "return __res;",
  ].join("\n");
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(`return (async () => {\n${src}\n})();`);
    const bools = (await fn()) as boolean[];
    return boolsToResult(cases, bools);
  } catch (e) {
    return { solved: false, cases: [], error: cleanErr(e) };
  }
}

function gradeSql(ch: Challenge, query: string, SQL: any): GradeResult {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!SQL) return { solved: false, cases: [], error: "SQLite runtime not ready (needs internet)." };
  const expected = ch.sqlExpected;
  if (!expected) return { solved: false, cases: [], error: "Challenge has no expected result." };
  const db = new SQL.Database();
  try {
    if (ch.sqlSetup) db.exec(ch.sqlSetup);
    const res = db.exec(query);
    if (!res || res.length === 0) {
      return {
        solved: false,
        cases: [{ pass: false, label: "Query returned no result set", detail: "Expected columns: " + expected.columns.join(", ") }],
      };
    }
    const last = res[res.length - 1] as { columns: string[]; values: unknown[][] };
    const colsMatch = arraysEqual(last.columns, expected.columns);
    const gotRows = normalizeRows(last.values, ch.orderMatters);
    const expRows = normalizeRows(expected.values as unknown[][], ch.orderMatters);
    const rowsMatch = JSON.stringify(gotRows) === JSON.stringify(expRows);
    const solved = colsMatch && rowsMatch;
    const cases: CaseResult[] = [
      {
        pass: colsMatch,
        label: colsMatch ? "Columns match" : "Columns do not match",
        detail: colsMatch ? undefined : `got: [${last.columns.join(", ")}]  expected: [${expected.columns.join(", ")}]`,
      },
      {
        pass: rowsMatch,
        label: rowsMatch ? `Rows match (${gotRows.length})` : "Rows do not match",
        detail: rowsMatch
          ? undefined
          : `got ${gotRows.length} row(s):\n${sqlTable(last.columns, last.values)}\n\nexpected ${expected.values.length} row(s):\n${sqlTable(expected.columns, expected.values as unknown[][])}`,
      },
    ];
    return { solved, cases };
  } catch (e) {
    return { solved: false, cases: [], error: "SQL error: " + cleanErr(e) };
  } finally {
    db.close();
  }
}

// ---- helpers ---------------------------------------------------------------

function boolsToResult(cases: { input: unknown[]; expected: unknown }[], bools: boolean[]): GradeResult {
  const results: CaseResult[] = cases.map((c, i) => ({
    pass: !!bools[i],
    label: `${short(JSON.stringify(c.input))} -> ${short(JSON.stringify(c.expected))}`,
  }));
  return { solved: results.length > 0 && results.every((r) => r.pass), cases: results };
}

function short(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) + "..." : s;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function normalizeRows(rows: unknown[][], orderMatters?: boolean): unknown[][] {
  const mapped = rows.map((r) => r.map((v) => (v === null || v === undefined ? null : v)));
  if (orderMatters) return mapped;
  return [...mapped].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
}

function sqlTable(columns: string[], values: unknown[][]): string {
  const cell = (v: unknown) => (v === null || v === undefined ? "NULL" : String(v));
  const header = columns.join(" | ");
  const rows = values.map((r) => r.map(cell).join(" | "));
  return [header, "-".repeat(header.length), ...rows].join("\n");
}

function cleanErr(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  return String(e);
}

function loadScriptOnce(src: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-code-lab="${key}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script load error")));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.dataset.codeLab = key;
    el.addEventListener("load", () => {
      el.dataset.loaded = "true";
      resolve();
    });
    el.addEventListener("error", () => reject(new Error("script load error")));
    document.head.appendChild(el);
  });
}
