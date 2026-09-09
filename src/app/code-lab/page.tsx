"use client";

import * as React from "react";
import { Play, Trash2, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardBody, Callout, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

// All runtimes are loaded dynamically from a CDN at runtime -- none are npm
// dependencies. The CDN scripts attach globals to window.
declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL?: string }) => Promise<PyodideInstance>;
    // TypeScript compiler UMD build and sql.js are typed loosely on purpose.
    ts?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    initSqlJs?: (config?: { locateFile?: (f: string) => string }) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

type PyodideInstance = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

const PYODIDE_VERSION = "v0.26.4";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT = `${PYODIDE_INDEX}pyodide.js`;

const TS_SCRIPT = "https://cdn.jsdelivr.net/npm/typescript@5.6.3/lib/typescript.js";

const SQLJS_VERSION = "1.12.0";
const SQLJS_SCRIPT = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/sql-wasm.js`;
const SQLJS_BASE = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`;

type Lang = "python" | "javascript" | "typescript" | "sql";
type RtStatus = "idle" | "loading" | "ready" | "error";
type OutLine = { text: string; stream: "out" | "err" };

type Exercise = { id: string; title: string; note: string; code: string };

const LANGS: { id: Lang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "sql", label: "SQL" },
];

const PY_EXERCISES: Exercise[] = [
  {
    id: "py-fizzbuzz",
    title: "FizzBuzz",
    note: "Concept: loops, modulo, conditional branching.",
    code: [
      "# FizzBuzz 1..15",
      "for n in range(1, 16):",
      "    if n % 15 == 0:",
      '        print("FizzBuzz")',
      "    elif n % 3 == 0:",
      '        print("Fizz")',
      "    elif n % 5 == 0:",
      '        print("Buzz")',
      "    else:",
      "        print(n)",
      "",
    ].join("\n"),
  },
  {
    id: "py-comprehension",
    title: "List comprehension",
    note: "Concept: building lists declaratively with a filter.",
    code: [
      "# Squares of even numbers 0..9",
      "squares = [x * x for x in range(10) if x % 2 == 0]",
      "print(squares)",
      'print("sum:", sum(squares))',
      "",
    ].join("\n"),
  },
  {
    id: "py-class",
    title: "A simple class",
    note: "Concept: classes, __init__, methods, __repr__.",
    code: [
      "class Counter:",
      "    def __init__(self, start=0):",
      "        self.value = start",
      "",
      "    def bump(self, by=1):",
      "        self.value += by",
      "        return self.value",
      "",
      "    def __repr__(self):",
      '        return f"Counter(value={self.value})"',
      "",
      "c = Counter()",
      "c.bump()",
      "c.bump(5)",
      "print(c)",
      "",
    ].join("\n"),
  },
];

const JS_EXERCISES: Exercise[] = [
  {
    id: "js-reduce",
    title: "Array reduce",
    note: "Concept: folding an array into one accumulated value.",
    code: [
      "// Sum and max via reduce",
      "const nums = [4, 8, 15, 16, 23, 42];",
      "const total = nums.reduce((acc, n) => acc + n, 0);",
      "const max = nums.reduce((acc, n) => (n > acc ? n : acc), -Infinity);",
      'console.log("total:", total);',
      'console.log("max:", max);',
      "",
    ].join("\n"),
  },
  {
    id: "js-async",
    title: "async / await",
    note: "Concept: Promises and awaiting an async result.",
    code: [
      "function delay(ms, value) {",
      "  return new Promise((resolve) => setTimeout(() => resolve(value), ms));",
      "}",
      "",
      "async function main() {",
      '  console.log("start");',
      '  const v = await delay(10, "done");',
      '  console.log("resolved:", v);',
      "}",
      "",
      "await main();",
      "",
    ].join("\n"),
  },
  {
    id: "js-closure",
    title: "Closure",
    note: "Concept: a function that captures private state.",
    code: [
      "function makeCounter() {",
      "  let count = 0;",
      "  return () => (count += 1);",
      "}",
      "",
      "const next = makeCounter();",
      "console.log(next());",
      "console.log(next());",
      "console.log(next());",
      "",
    ].join("\n"),
  },
];

const TS_EXERCISES: Exercise[] = [
  {
    id: "ts-interface",
    title: "Interface + typed function",
    note: "Concept: types describe shape; they are erased at runtime after transpile.",
    code: [
      "interface User {",
      "  id: number;",
      "  name: string;",
      "  admin?: boolean;",
      "}",
      "",
      "function greet(u: User): string {",
      "  return `Hello ${u.name}` + (u.admin ? ' (admin)' : '');",
      "}",
      "",
      "const u: User = { id: 1, name: 'Ada', admin: true };",
      "console.log(greet(u));",
      "",
    ].join("\n"),
  },
  {
    id: "ts-generics",
    title: "Generics",
    note: "Concept: reusable, type-safe functions over any type.",
    code: [
      "function first<T>(arr: T[]): T | undefined {",
      "  return arr[0];",
      "}",
      "",
      "const a = first<number>([10, 20, 30]);",
      "const b = first<string>(['x', 'y']);",
      "console.log(a, b);",
      "",
    ].join("\n"),
  },
  {
    id: "ts-union",
    title: "Discriminated union",
    note: "Concept: model states so impossible states are unrepresentable.",
    code: [
      "type Result =",
      "  | { status: 'loading' }",
      "  | { status: 'ok'; data: number }",
      "  | { status: 'error'; message: string };",
      "",
      "function render(r: Result): string {",
      "  switch (r.status) {",
      "    case 'loading': return '...';",
      "    case 'ok': return 'value=' + r.data;",
      "    case 'error': return 'ERR: ' + r.message;",
      "  }",
      "}",
      "",
      "console.log(render({ status: 'ok', data: 42 }));",
      "console.log(render({ status: 'error', message: 'boom' }));",
      "",
    ].join("\n"),
  },
];

const SQL_EXERCISES: Exercise[] = [
  {
    id: "sql-basics",
    title: "Create, insert, select",
    note: "Concept: DDL + DML + a filtered query. A fresh in-memory SQLite DB per run.",
    code: [
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);",
      "INSERT INTO users (name, age) VALUES ('Ada', 36), ('Linus', 54), ('Grace', 41);",
      "",
      "SELECT name, age FROM users WHERE age > 40 ORDER BY age DESC;",
      "",
    ].join("\n"),
  },
  {
    id: "sql-aggregate",
    title: "Aggregation + GROUP BY",
    note: "Concept: COUNT/AVG with grouping -- the core of analytics queries.",
    code: [
      "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, amount REAL);",
      "INSERT INTO orders (customer, amount) VALUES",
      "  ('Ada', 120.0), ('Ada', 80.0), ('Linus', 200.0), ('Grace', 50.0), ('Grace', 50.0);",
      "",
      "SELECT customer, COUNT(*) AS n_orders, SUM(amount) AS total",
      "FROM orders",
      "GROUP BY customer",
      "ORDER BY total DESC;",
      "",
    ].join("\n"),
  },
  {
    id: "sql-join",
    title: "JOIN two tables",
    note: "Concept: relate rows across tables via a foreign key.",
    code: [
      "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);",
      "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL);",
      "INSERT INTO customers (name) VALUES ('Ada'), ('Linus');",
      "INSERT INTO orders (customer_id, amount) VALUES (1, 120.0), (1, 80.0), (2, 200.0);",
      "",
      "SELECT c.name, SUM(o.amount) AS spent",
      "FROM customers c",
      "JOIN orders o ON o.customer_id = c.id",
      "GROUP BY c.id",
      "ORDER BY spent DESC;",
      "",
    ].join("\n"),
  },
];

const EXERCISES: Record<Lang, Exercise[]> = {
  python: PY_EXERCISES,
  javascript: JS_EXERCISES,
  typescript: TS_EXERCISES,
  sql: SQL_EXERCISES,
};

export default function CodeLabPage() {
  const [lang, setLang] = React.useState<Lang>("python");
  const [code, setCode] = React.useState<string>(PY_EXERCISES[0].code);
  const [output, setOutput] = React.useState<OutLine[]>([]);
  const [running, setRunning] = React.useState(false);
  const [ranOnce, setRanOnce] = React.useState(false);

  // Per-runtime load status. JavaScript needs no runtime (always ready).
  const [status, setStatus] = React.useState<Record<"python" | "typescript" | "sql", RtStatus>>({
    python: "idle",
    typescript: "idle",
    sql: "idle",
  });

  const pyodideRef = React.useRef<PyodideInstance | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlModuleRef = React.useRef<any>(null);
  const started = React.useRef<Record<string, boolean>>({});

  const setRt = (rt: "python" | "typescript" | "sql", s: RtStatus) =>
    setStatus((prev) => ({ ...prev, [rt]: s }));

  // ---- runtime loaders ----------------------------------------------------

  const ensurePython = React.useCallback(() => {
    if (started.current.python) return;
    started.current.python = true;
    setRt("python", "loading");
    (async () => {
      try {
        if (!window.loadPyodide) await loadScriptOnce(PYODIDE_SCRIPT, "pyodide");
        if (!window.loadPyodide) throw new Error("loadPyodide undefined after script load");
        pyodideRef.current = await window.loadPyodide({ indexURL: PYODIDE_INDEX });
        setRt("python", "ready");
      } catch (err) {
        started.current.python = false;
        pyodideRef.current = null;
        setRt("python", "error");
        console.error("Pyodide failed to load:", err);
      }
    })();
  }, []);

  const ensureTypeScript = React.useCallback(() => {
    if (started.current.typescript) return;
    started.current.typescript = true;
    setRt("typescript", "loading");
    (async () => {
      try {
        if (!window.ts) await loadScriptOnce(TS_SCRIPT, "typescript");
        if (!window.ts) throw new Error("ts undefined after script load");
        setRt("typescript", "ready");
      } catch (err) {
        started.current.typescript = false;
        setRt("typescript", "error");
        console.error("TypeScript compiler failed to load:", err);
      }
    })();
  }, []);

  const ensureSql = React.useCallback(() => {
    if (started.current.sql) return;
    started.current.sql = true;
    setRt("sql", "loading");
    (async () => {
      try {
        if (!window.initSqlJs) await loadScriptOnce(SQLJS_SCRIPT, "sqljs");
        if (!window.initSqlJs) throw new Error("initSqlJs undefined after script load");
        sqlModuleRef.current = await window.initSqlJs({ locateFile: (f: string) => SQLJS_BASE + f });
        setRt("sql", "ready");
      } catch (err) {
        started.current.sql = false;
        sqlModuleRef.current = null;
        setRt("sql", "error");
        console.error("sql.js failed to load:", err);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (lang === "python") ensurePython();
    if (lang === "typescript") ensureTypeScript();
    if (lang === "sql") ensureSql();
  }, [lang, ensurePython, ensureTypeScript, ensureSql]);

  // ---- runners ------------------------------------------------------------

  const runPython = async () => {
    const py = pyodideRef.current;
    if (!py) {
      setOutput([{ stream: "err", text: "Python runtime is not ready (needs internet). Code was not run." }]);
      return;
    }
    const collected: OutLine[] = [];
    py.setStdout({ batched: (s) => collected.push({ stream: "out", text: s }) });
    py.setStderr({ batched: (s) => collected.push({ stream: "err", text: s }) });
    try {
      await py.runPythonAsync(code);
    } catch (err) {
      collected.push({ stream: "err", text: formatError(err) });
    } finally {
      py.setStdout({ batched: () => {} });
      py.setStderr({ batched: () => {} });
    }
    setOutput(collected.length ? collected : [{ stream: "out", text: "(no output)" }]);
  };

  const runJsSource = async (source: string) => {
    const collected: OutLine[] = [];
    const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
    const capture = (stream: "out" | "err") => (...args: unknown[]) =>
      collected.push({ stream, text: args.map(stringify).join(" ") });
    console.log = capture("out");
    console.info = capture("out");
    console.warn = capture("out");
    console.error = capture("err");
    try {
      const fn = new Function(`return (async () => {\n${source}\n})();`);
      await fn();
    } catch (err) {
      collected.push({ stream: "err", text: formatError(err) });
    } finally {
      console.log = orig.log;
      console.error = orig.error;
      console.warn = orig.warn;
      console.info = orig.info;
    }
    setOutput(collected.length ? collected : [{ stream: "out", text: "(no output)" }]);
  };

  const runTypeScript = async () => {
    const ts = window.ts;
    if (!ts) {
      setOutput([{ stream: "err", text: "TypeScript compiler is not ready (needs internet). Code was not run." }]);
      return;
    }
    let js: string;
    try {
      js = ts.transpileModule(code, {
        compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.None },
      }).outputText;
    } catch (err) {
      setOutput([{ stream: "err", text: "Transpile error: " + formatError(err) }]);
      return;
    }
    await runJsSource(js);
  };

  const runSql = async () => {
    const SQL = sqlModuleRef.current;
    if (!SQL) {
      setOutput([{ stream: "err", text: "SQLite (sql.js) is not ready (needs internet). Code was not run." }]);
      return;
    }
    // Fresh in-memory database per run for deterministic results.
    const db = new SQL.Database();
    const collected: OutLine[] = [];
    try {
      const results = db.exec(code); // Array<{ columns: string[]; values: unknown[][] }>
      if (!results || results.length === 0) {
        collected.push({ stream: "out", text: "OK -- statement(s) executed, no rows returned." });
      } else {
        results.forEach((res: { columns: string[]; values: unknown[][] }, i: number) => {
          if (results.length > 1) collected.push({ stream: "out", text: `-- result set ${i + 1} --` });
          collected.push({ stream: "out", text: formatSqlTable(res.columns, res.values) });
          collected.push({ stream: "out", text: `(${res.values.length} row${res.values.length === 1 ? "" : "s"})` });
        });
      }
    } catch (err) {
      collected.push({ stream: "err", text: "SQL error: " + formatError(err) });
    } finally {
      db.close();
    }
    setOutput(collected);
  };

  const run = async () => {
    setRunning(true);
    setRanOnce(true);
    try {
      if (lang === "python") await runPython();
      else if (lang === "javascript") await runJsSource(code);
      else if (lang === "typescript") await runTypeScript();
      else await runSql();
    } finally {
      setRunning(false);
    }
  };

  // ---- ui helpers ---------------------------------------------------------

  const selectLang = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    setOutput([]);
    setRanOnce(false);
    setCode(EXERCISES[next][0].code);
  };

  const loadExercise = (ex: Exercise) => {
    setCode(ex.code);
    setOutput([]);
    setRanOnce(false);
  };

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const insert = "  ";
      setCode(code.slice(0, start) + insert + code.slice(end));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + insert.length;
      });
    }
  };

  const rtOf = (l: Lang): RtStatus => (l === "javascript" ? "ready" : status[l]);
  const cur = rtOf(lang);
  const loading = cur === "loading";
  const errored = cur === "error";
  const runDisabled = running || loading || errored;

  const retry = () => {
    if (lang === "javascript") return;
    started.current[lang] = false;
    setRt(lang, "idle");
    if (lang === "python") ensurePython();
    else if (lang === "typescript") ensureTypeScript();
    else if (lang === "sql") ensureSql();
  };

  const langLabel = LANGS.find((l) => l.id === lang)!.label;
  const runtimeName: Record<Lang, string> = {
    javascript: "JavaScript (runs locally, offline)",
    python: "Python (Pyodide, from CDN)",
    typescript: "TypeScript (compiler from CDN, transpile-and-run)",
    sql: "SQLite (sql.js WASM, from CDN)",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeading sub="Write code and actually run it in your browser. Nothing here fakes execution.">
          Code Lab
        </SectionHeading>
        <Badge tone="good">REAL EXECUTION</Badge>
      </div>

      <Callout tone="info" title="What runs here vs. what does not">
        <span className="text-fg">Python, JavaScript, TypeScript, and SQL all execute live in your browser.</span>{" "}
        JavaScript runs offline; Python (Pyodide), the TypeScript compiler, and SQLite (sql.js) download
        their runtime from a CDN on first use, so they need internet once. TypeScript is transpiled and
        run (transpile-only -- type errors are not enforced here). SQL runs against a real in-memory SQLite
        database, recreated fresh on each run. Bash, Dockerfile, Terraform, and YAML are NOT executed here --
        practice those in the Terminal Lab or locally. We never fake output.
      </Callout>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-fg-faint">Language</div>
            <div className="grid grid-cols-2 gap-1.5">
              {LANGS.map((l) => (
                <Button
                  key={l.id}
                  variant={lang === l.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => selectLang(l.id)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-fg-faint">Starter exercises</div>
            <div className="space-y-1.5">
              {EXERCISES[lang].map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => loadExercise(ex)}
                  className={cn(
                    "w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-fg-muted transition-colors",
                    "hover:border-accent/40 hover:bg-bg-hover hover:text-fg"
                  )}
                >
                  <div className="font-medium text-fg">{ex.title}</div>
                  <div className="mt-0.5 text-xs text-fg-faint">{ex.note}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Runtime status */}
          <div className="rounded-lg border border-border bg-bg-card px-3 py-2.5 text-xs">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-fg-faint">Runtime status</div>
            {cur === "ready" ? (
              <div className="flex items-center gap-1.5 text-good">
                <CheckCircle2 className="h-3.5 w-3.5" /> {runtimeName[lang]}
              </div>
            ) : cur === "loading" ? (
              <div className="flex items-center gap-1.5 text-warn">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading {langLabel} runtime...
              </div>
            ) : cur === "error" ? (
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 text-bad">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{langLabel} runtime could not load (needs internet). Code was not run.</span>
                </div>
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : (
              <div className="text-fg-faint">{langLabel} runtime not started yet.</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-fg">Editor -- {langLabel}</div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={run} disabled={runDisabled}>
                    {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Run
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setOutput([]);
                      setRanOnce(false);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={onEditorKeyDown}
                spellCheck={false}
                rows={16}
                className={cn(
                  "w-full resize-y rounded-lg border border-border bg-[#08090d] p-3",
                  "font-mono text-[0.8rem] leading-relaxed text-fg outline-none focus:border-accent/50"
                )}
              />

              {loading && (
                <p className="text-xs text-warn">Run is disabled while the {langLabel} runtime loads...</p>
              )}
              {errored && (
                <p className="text-xs text-bad">
                  Run is disabled: the {langLabel} runtime could not load. Try Retry, or use JavaScript
                  (which runs offline).
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <div className="text-sm font-semibold text-fg">Output</div>
              <div
                className={cn(
                  "min-h-[120px] rounded-lg border border-border bg-[#08090d] p-3",
                  "overflow-x-auto whitespace-pre font-mono text-[0.8rem] leading-relaxed"
                )}
              >
                {output.length === 0 ? (
                  <span className="text-fg-faint">
                    {ranOnce ? "(no output)" : "Run your code to see output here."}
                  </span>
                ) : (
                  output.map((line, i) => (
                    <div key={i} className={line.stream === "err" ? "text-bad" : "text-fg"}>
                      {line.text}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

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

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || `${err.name}`;
  return String(err);
}

function formatSqlTable(columns: string[], values: unknown[][]): string {
  const cell = (v: unknown) => (v === null || v === undefined ? "NULL" : String(v));
  const widths = columns.map((c, i) =>
    Math.max(c.length, ...values.map((row) => cell(row[i]).length), 3)
  );
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
  const header = columns.map((c, i) => pad(c, widths[i])).join(" | ");
  const sep = widths.map((w) => "-".repeat(w)).join("-+-");
  const rows = values.map((row) => row.map((v, i) => pad(cell(v), widths[i])).join(" | "));
  return [header, sep, ...rows].join("\n");
}
