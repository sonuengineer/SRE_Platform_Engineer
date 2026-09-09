"use client";

import * as React from "react";
import { Activity, ScrollText, GitBranch, Zap, Search } from "lucide-react";
import { Badge, Button, Card, CardBody, SectionHeading, Callout } from "@/components/ui";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mock metric series (healthy vs incident)
// ---------------------------------------------------------------------------
function wobble(base: number, amp: number, n: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const r = (s / 0x7fffffff - 0.5) * 2;
    out.push(Math.max(0, base + r * amp));
  }
  return out;
}

const N = 40;

interface MetricPanel {
  id: string;
  label: string;
  unit: string;
  color: string;
  healthy: number[];
  incident: number[];
  read: (arr: number[]) => string;
}

const METRICS: MetricPanel[] = [
  {
    id: "cpu",
    label: "CPU utilization",
    unit: "%",
    color: "#6ea8fe",
    healthy: wobble(42, 8, N, 11),
    incident: [...wobble(42, 8, N - 12, 11), ...wobble(88, 6, 12, 91)],
    read: (a) => a[a.length - 1].toFixed(0),
  },
  {
    id: "mem",
    label: "Memory",
    unit: "%",
    color: "#58a6ff",
    healthy: wobble(61, 4, N, 22),
    incident: wobble(64, 5, N, 22),
    read: (a) => a[a.length - 1].toFixed(0),
  },
  {
    id: "rps",
    label: "Request rate",
    unit: "req/s",
    color: "#3fb950",
    healthy: wobble(1200, 120, N, 33),
    incident: [...wobble(1200, 120, N - 12, 33), ...wobble(760, 90, 12, 77)],
    read: (a) => a[a.length - 1].toFixed(0),
  },
  {
    id: "err",
    label: "Error rate",
    unit: "%",
    color: "#f85149",
    healthy: wobble(0.4, 0.2, N, 44),
    incident: [...wobble(0.4, 0.2, N - 12, 44), ...wobble(11, 3, 12, 55)],
    read: (a) => a[a.length - 1].toFixed(1),
  },
  {
    id: "p99",
    label: "p99 latency",
    unit: "ms",
    color: "#d29922",
    healthy: wobble(180, 25, N, 66),
    incident: [...wobble(180, 25, N - 12, 66), ...wobble(1450, 120, 12, 88)],
    read: (a) => a[a.length - 1].toFixed(0),
  },
  {
    id: "sat",
    label: "Saturation (conn pool)",
    unit: "%",
    color: "#d29922",
    healthy: wobble(38, 6, N, 77),
    incident: [...wobble(38, 6, N - 12, 77), ...wobble(97, 2, 12, 99)],
    read: (a) => a[a.length - 1].toFixed(0),
  },
];

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------
type Level = "INFO" | "WARN" | "ERROR";
interface LogLine {
  ts: string;
  level: Level;
  svc: string;
  msg: string;
  incidentOnly?: boolean;
}

const LOGS: LogLine[] = [
  { ts: "12:00:01", level: "INFO", svc: "api", msg: "GET /orders 200 in 142ms trace=a1b2" },
  { ts: "12:00:02", level: "INFO", svc: "auth", msg: "token verified user=8831 trace=a1b2" },
  { ts: "12:00:03", level: "INFO", svc: "db", msg: "SELECT orders committed in 34ms trace=a1b2" },
  { ts: "12:00:05", level: "INFO", svc: "cache", msg: "hit key=user:8831 trace=a1b2" },
  { ts: "12:00:07", level: "WARN", svc: "db", msg: "connection pool 82% utilized" },
  { ts: "12:00:09", level: "INFO", svc: "api", msg: "GET /products 200 in 96ms trace=c3d4" },
  { ts: "12:00:12", level: "WARN", svc: "db", msg: "slow query 812ms SELECT * FROM line_items", incidentOnly: true },
  { ts: "12:00:13", level: "ERROR", svc: "db", msg: "pool exhausted: no connection available", incidentOnly: true },
  { ts: "12:00:14", level: "ERROR", svc: "api", msg: "GET /orders 503 upstream=db trace=e5f6", incidentOnly: true },
  { ts: "12:00:15", level: "ERROR", svc: "api", msg: "GET /orders 503 upstream=db trace=e7f8", incidentOnly: true },
  { ts: "12:00:16", level: "WARN", svc: "api", msg: "p99 latency 1.4s exceeds SLO 500ms", incidentOnly: true },
  { ts: "12:00:18", level: "ERROR", svc: "checkout", msg: "timeout calling db after 2000ms trace=f9a0", incidentOnly: true },
];

const levelColor: Record<Level, string> = {
  INFO: "text-fg-muted",
  WARN: "text-warn",
  ERROR: "text-bad",
};

// ---------------------------------------------------------------------------
// Trace spans (waterfall)
// ---------------------------------------------------------------------------
interface Span {
  id: string;
  svc: string;
  op: string;
  start: number; // ms from request start
  dur: number; // ms
  durIncident: number;
  color: string;
  detail: string;
}

const SPANS: Span[] = [
  {
    id: "api",
    svc: "api-gateway",
    op: "GET /orders",
    start: 0,
    dur: 210,
    durIncident: 1490,
    color: "#6ea8fe",
    detail: "Root span. Total wall-clock time the client observed. Its duration is the sum of downstream work plus its own overhead.",
  },
  {
    id: "auth",
    svc: "auth",
    op: "verifyToken",
    start: 8,
    dur: 22,
    durIncident: 24,
    color: "#58a6ff",
    detail: "JWT verification against the cached JWKS. Fast and cache-backed -- unaffected by the incident.",
  },
  {
    id: "db",
    svc: "db",
    op: "SELECT orders + line_items",
    start: 40,
    dur: 120,
    durIncident: 1400,
    color: "#f85149",
    detail: "The database query. In the incident this span balloons because the connection pool is saturated -- most of the time is spent WAITING for a free connection, not executing SQL. This is the bottleneck the p99 and error-rate panels are reflecting.",
  },
  {
    id: "cache",
    svc: "cache",
    op: "GET user profile",
    start: 165,
    dur: 12,
    durIncident: 14,
    color: "#3fb950",
    detail: "Redis lookup for the user profile. Sub-millisecond service time; a rounding error next to the db span.",
  },
];

export default function ObservabilityPage() {
  const [incident, setIncident] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [levelFilter, setLevelFilter] = React.useState<"ALL" | Level>("ALL");
  const [selectedSpan, setSelectedSpan] = React.useState<Span>(SPANS[2]);

  const traceTotal = incident
    ? Math.max(...SPANS.map((s) => s.start + s.durIncident))
    : Math.max(...SPANS.map((s) => s.start + s.dur));

  const visibleLogs = LOGS.filter((l) => (incident ? true : !l.incidentOnly))
    .filter((l) => levelFilter === "ALL" || l.level === levelFilter)
    .filter((l) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        l.msg.toLowerCase().includes(q) ||
        l.svc.toLowerCase().includes(q) ||
        l.level.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <SectionHeading sub="The three pillars of observability -- metrics, logs, and traces -- for one service. Toggle the incident to watch all three light up together.">
          Observability Lab
        </SectionHeading>
        <div className="flex items-center gap-2">
          <Badge tone="warn">SIMULATED</Badge>
          <Button
            variant={incident ? "danger" : "secondary"}
            size="sm"
            onClick={() => setIncident((v) => !v)}
          >
            <Zap className="h-4 w-4" />
            {incident ? "Incident: ON" : "Inject incident"}
          </Button>
        </div>
      </div>

      {incident && (
        <Callout tone="bad" title="Incident injected">
          Error rate and p99 latency spiked, request rate dropped, and connection-pool saturation hit ~97%. Correlate:
          the metrics tell you SOMETHING is wrong, the logs name the failing component (db pool exhausted), and the
          trace shows exactly WHERE the time goes (the db span).
        </Callout>
      )}

      {/* Metrics */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
          <Activity className="h-4 w-4 text-accent" /> Metrics
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {METRICS.map((m) => {
            const data = incident ? m.incident : m.healthy;
            const bad = incident && (m.id === "err" || m.id === "p99" || m.id === "sat" || m.id === "cpu");
            return (
              <div key={m.id} className="rounded-xl border border-border bg-bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-fg-faint">{m.label}</span>
                  {bad && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-bad" />}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-semibold" style={{ color: m.color }}>
                    {m.read(data)}
                  </span>
                  <span className="text-[11px] text-fg-faint">{m.unit}</span>
                </div>
                <div className="mt-1">
                  <Sparkline data={data} color={m.color} width={200} height={30} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Logs */}
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <ScrollText className="h-4 w-4 text-accent" /> Logs
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="filter (e.g. db, trace=e5f6)"
                  className="w-full rounded-lg border border-border bg-bg-soft py-1.5 pl-8 pr-2 text-xs text-fg placeholder:text-fg-faint focus:border-accent/50 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevelFilter(lv)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                      levelFilter === lv
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-fg-muted hover:text-fg"
                    )}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg bg-[#08090d] p-3 font-mono text-xs leading-relaxed">
              {visibleLogs.length === 0 ? (
                <div className="text-fg-faint">No log lines match the filter.</div>
              ) : (
                visibleLogs.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    <span className="text-fg-faint">{l.ts} </span>
                    <span className={cn("font-semibold", levelColor[l.level])}>{l.level.padEnd(5)} </span>
                    <span className="text-accent">{l.svc.padEnd(9)} </span>
                    <span className={levelColor[l.level]}>{l.msg}</span>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        {/* Trace */}
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <GitBranch className="h-4 w-4 text-accent" /> Trace -- GET /orders
              </div>
              <Badge tone="muted">total {traceTotal.toFixed(0)}ms</Badge>
            </div>
            <div className="space-y-1.5">
              {SPANS.map((sp) => {
                const dur = incident ? sp.durIncident : sp.dur;
                const leftPct = (sp.start / traceTotal) * 100;
                const widthPct = Math.max(1.5, (dur / traceTotal) * 100);
                const on = selectedSpan.id === sp.id;
                const slow = incident && sp.id === "db";
                return (
                  <button
                    key={sp.id}
                    onClick={() => setSelectedSpan(sp)}
                    className={cn(
                      "block w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                      on ? "border-accent/50 bg-accent/[0.06]" : "border-transparent hover:bg-bg-hover"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-fg-muted">
                        {sp.svc} <span className="text-fg-faint">{sp.op}</span>
                      </span>
                      <span className={cn("font-mono", slow ? "text-bad" : "text-fg-faint")}>
                        {dur.toFixed(0)}ms
                      </span>
                    </div>
                    <div className="mt-1 h-3 w-full rounded bg-bg-hover">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          marginLeft: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: slow ? "#f85149" : sp.color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border border-border bg-bg-soft p-3">
              <div className="text-xs font-semibold text-fg">
                {selectedSpan.svc} -- {selectedSpan.op}
              </div>
              <div className="mt-0.5 text-[11px] text-fg-faint">
                start +{selectedSpan.start}ms, duration{" "}
                {(incident ? selectedSpan.durIncident : selectedSpan.dur).toFixed(0)}ms
              </div>
              <p className="mt-2 text-xs leading-relaxed text-fg/90">{selectedSpan.detail}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
