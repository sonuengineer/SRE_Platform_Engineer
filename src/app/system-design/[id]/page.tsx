"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, X, Gauge, CheckCircle2, XCircle, Eye, Boxes } from "lucide-react";
import {
  DESIGN_BY_ID,
  COMPONENTS,
  COMPONENT_BY_ID,
  type Dimension,
  type DesignProblem,
} from "@/content/system-design";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

const DIMENSIONS: Dimension[] = ["Scalability", "Availability", "Reliability", "Consistency", "Cost", "Security"];
const CATEGORY_LABEL: Record<string, string> = {
  edge: "Edge",
  compute: "Compute",
  data: "Data",
  async: "Async",
  storage: "Storage",
  security: "Security",
};

interface Evaluation {
  overall: number;
  dimensions: Record<Dimension, number>;
  metRequirements: string[];
  missedRequirements: string[];
  metBonuses: string[];
  presentAntipatterns: string[];
}

function evaluate(problem: DesignProblem, selected: Set<string>): Evaluation {
  const reqTotal = problem.requirements.reduce((n, r) => n + r.weight, 0) || 1;
  let reqGot = 0;
  const met: string[] = [];
  const missed: string[] = [];
  for (const r of problem.requirements) {
    if (selected.has(r.componentId)) {
      reqGot += r.weight;
      met.push(r.componentId);
    } else {
      missed.push(r.componentId);
    }
  }
  let bonusGot = 0;
  const metBonuses: string[] = [];
  for (const b of problem.bonuses) {
    if (selected.has(b.componentId)) {
      bonusGot += b.weight;
      metBonuses.push(b.componentId);
    }
  }
  const presentAntipatterns = (problem.antipatterns ?? [])
    .filter((a) => selected.has(a.componentId))
    .map((a) => a.componentId);

  const base = reqGot / reqTotal; // 0..1
  const penalty = presentAntipatterns.length * 10;
  const overall = Math.max(0, Math.min(100, Math.round(base * 85 + Math.min(15, bonusGot * 3) - penalty)));

  // per-dimension
  const dims = {} as Record<Dimension, number>;
  for (const dim of DIMENSIONS) {
    const reqs = [...problem.requirements, ...problem.bonuses].filter((r) => r.dimensions.includes(dim));
    if (reqs.length === 0) {
      dims[dim] = -1; // not applicable
      continue;
    }
    const total = reqs.reduce((n, r) => n + r.weight, 0);
    const got = reqs.filter((r) => selected.has(r.componentId)).reduce((n, r) => n + r.weight, 0);
    dims[dim] = Math.round((got / total) * 100);
  }

  return { overall, dimensions: dims, metRequirements: met, missedRequirements: missed, metBonuses, presentAntipatterns };
}

export default function DesignDetailPage() {
  const params = useParams<{ id: string }>();
  const problem = DESIGN_BY_ID[params.id];
  const recordDesign = useStore((s) => s.recordDesign);
  const best = useStore((s) => s.designs[params.id]?.bestScore ?? 0);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [evalResult, setEvalResult] = React.useState<Evaluation | null>(null);
  const [showModel, setShowModel] = React.useState(false);

  if (!problem) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-fg">Problem not found</h1>
        <Link href="/system-design">
          <Button variant="secondary" className="mt-4">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setEvalResult(null);
  };

  const runEval = () => {
    const r = evaluate(problem, selected);
    setEvalResult(r);
    recordDesign(problem.id, r.overall);
  };

  const byCategory = COMPONENTS.reduce<Record<string, typeof COMPONENTS>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <Link href="/system-design" className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> System Design Lab
        </Link>
        {best > 0 && <Badge tone={best >= 70 ? "good" : "warn"}>Best: {best}</Badge>}
      </div>

      <div className="rounded-xl border border-border bg-bg-soft p-5">
        <h1 className="text-2xl font-bold text-fg">{problem.title}</h1>
        <p className="mt-1.5 text-fg-muted">{problem.prompt}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {problem.constraints.map((c, i) => (
            <Badge key={i} tone="muted">
              {c}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Palette + canvas */}
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="mb-3 text-sm font-semibold text-fg">Component palette</div>
              <div className="space-y-3">
                {Object.entries(byCategory).map(([cat, comps]) => (
                  <div key={cat}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
                      {CATEGORY_LABEL[cat]}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {comps.map((c) => {
                        const on = selected.has(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggle(c.id)}
                            title={c.blurb}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                              on
                                ? "border-accent/50 bg-accent/15 text-accent"
                                : "border-border text-fg-muted hover:border-accent/40 hover:text-fg"
                            )}
                          >
                            {on ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Boxes className="h-4 w-4 text-accent" /> Your architecture ({selected.size})
              </div>
              {selected.size === 0 ? (
                <p className="text-sm text-fg-faint">
                  Add components from the palette to build your design, then evaluate it.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {[...selected].map((id, i) => (
                    <React.Fragment key={id}>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-hover px-2.5 py-1.5 text-sm text-fg">
                        {COMPONENT_BY_ID[id]?.label ?? id}
                        <button onClick={() => toggle(id)} className="text-fg-faint hover:text-bad">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                      {i < selected.size - 1 && <span className="text-fg-faint">+</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <Button variant="primary" className="mt-4" disabled={selected.size === 0} onClick={runEval}>
                <Gauge className="h-4 w-4" /> Evaluate design
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {evalResult ? (
            <>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold",
                        evalResult.overall >= 70
                          ? "bg-good/15 text-good"
                          : evalResult.overall >= 40
                          ? "bg-warn/15 text-warn"
                          : "bg-bad/15 text-bad"
                      )}
                    >
                      {evalResult.overall}
                    </div>
                    <div>
                      <div className="font-semibold text-fg">Overall score</div>
                      <div className="text-xs text-fg-faint">
                        {evalResult.overall >= 70
                          ? "Strong design"
                          : evalResult.overall >= 40
                          ? "Workable, but gaps remain"
                          : "Missing core components"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {DIMENSIONS.filter((d) => evalResult.dimensions[d] >= 0).map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <div className="w-24 text-xs text-fg-muted">{d}</div>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-hover">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${evalResult.dimensions[d]}%`,
                              background:
                                evalResult.dimensions[d] >= 70 ? "#3fb950" : evalResult.dimensions[d] >= 40 ? "#d29922" : "#f85149",
                            }}
                          />
                        </div>
                        <div className="w-8 text-right text-[11px] tabular-nums text-fg-faint">
                          {evalResult.dimensions[d]}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="space-y-3 text-sm">
                  {evalResult.metRequirements.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-good">
                        <CheckCircle2 className="h-4 w-4" /> Requirements met
                      </div>
                      <ul className="space-y-1">
                        {evalResult.metRequirements.map((id) => {
                          const r = problem.requirements.find((x) => x.componentId === id)!;
                          return (
                            <li key={id} className="text-xs text-fg-muted">
                              <span className="text-fg">{COMPONENT_BY_ID[id]?.label}</span> -- {r.why}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {evalResult.missedRequirements.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-bad">
                        <XCircle className="h-4 w-4" /> Missing requirements
                      </div>
                      <ul className="space-y-1">
                        {evalResult.missedRequirements.map((id) => {
                          const r = problem.requirements.find((x) => x.componentId === id)!;
                          return (
                            <li key={id} className="text-xs text-fg-muted">
                              <span className="text-fg">{COMPONENT_BY_ID[id]?.label}</span> -- {r.why}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {evalResult.presentAntipatterns.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-warn">
                        <XCircle className="h-4 w-4" /> Anti-patterns (hurt your score)
                      </div>
                      <ul className="space-y-1">
                        {evalResult.presentAntipatterns.map((id) => {
                          const a = problem.antipatterns!.find((x) => x.componentId === id)!;
                          return (
                            <li key={id} className="text-xs text-fg-muted">
                              <span className="text-fg">{COMPONENT_BY_ID[id]?.label}</span> -- {a.why}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </CardBody>
              </Card>

              <Button variant="secondary" className="w-full" onClick={() => setShowModel((s) => !s)}>
                <Eye className="h-4 w-4" /> {showModel ? "Hide" : "Reveal"} model solution
              </Button>
              {showModel && (
                <Card>
                  <CardBody>
                    <Markdown>{problem.modelSolution}</Markdown>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {problem.relatedLessons.map((s) => (
                        <Link key={s} href={`/learn/${s}`}>
                          <Badge tone="info" className="cursor-pointer">
                            {s}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardBody className="text-sm text-fg-muted">
                <div className="mb-2 font-medium text-fg">How scoring works</div>
                <ul className="space-y-1.5 text-xs">
                  <li>Include the components a strong design requires (weighted by importance).</li>
                  <li>Bonus components raise your ceiling; anti-patterns lower your score.</li>
                  <li>Each dimension (scalability, availability, ...) is scored from the relevant components.</li>
                  <li>Reveal the model solution after evaluating to compare your reasoning.</li>
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
