"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, CheckCircle2, Circle, ChevronRight, Trophy } from "lucide-react";
import { isAuthored, getLesson } from "@/content";
import { Badge, Button, Card, CardBody, ProgressBar, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  n: number;
  title: string;
  level: string;
  goal: string;
  stack: string[];
  milestones: string[];
  relatedLessons: string[];
}

const PROJECTS: Project[] = [
  {
    id: "p1",
    n: 1,
    title: "Production REST API",
    level: "Foundational",
    goal: "Build a well-structured REST API with proper HTTP semantics, validation, error handling, and tests -- in both FastAPI and NestJS.",
    stack: ["FastAPI", "NestJS", "PostgreSQL"],
    milestones: [
      "CRUD resources with correct status codes and validation",
      "Pagination, filtering, and consistent error envelopes",
      "Idempotency keys on unsafe writes",
      "Integration tests + OpenAPI docs",
      "Dockerize with a multi-stage build",
    ],
    relatedLessons: ["http-fundamentals", "docker-images-layers"],
  },
  {
    id: "p2",
    n: 2,
    title: "Authentication Service",
    level: "Foundational",
    goal: "Implement secure auth: password hashing, short-lived JWTs, refresh tokens, and role-based authorization.",
    stack: ["FastAPI", "NestJS", "Redis", "PostgreSQL"],
    milestones: [
      "argon2/bcrypt password hashing",
      "Access + refresh token flow with rotation",
      "Refresh tokens in httpOnly cookies; revocation denylist",
      "RBAC guards/dependencies",
      "Rate limiting on auth endpoints",
    ],
    relatedLessons: ["authentication-dual", "redis-deep"],
  },
  {
    id: "p3",
    n: 3,
    title: "E-commerce Backend",
    level: "Intermediate",
    goal: "Model catalog, cart, orders, and inventory with correct consistency choices and caching.",
    stack: ["PostgreSQL", "Redis", "FastAPI/NestJS"],
    milestones: [
      "Transactional order placement with inventory decrement",
      "Cache-aside for catalog with invalidation",
      "Idempotent checkout",
      "Proper indexes verified with EXPLAIN",
      "Optimistic locking for concurrent stock updates",
    ],
    relatedLessons: ["caching-dual", "pg-indexes", "cap-theorem"],
  },
  {
    id: "p4",
    n: 4,
    title: "Event-driven Backend",
    level: "Intermediate",
    goal: "Decouple services with Kafka: publish domain events, consume them idempotently, and handle failures.",
    stack: ["Kafka", "Workers", "PostgreSQL"],
    milestones: [
      "Outbox pattern for reliable publishing",
      "Idempotent consumers keyed by event id",
      "Consumer lag monitoring",
      "Dead-letter handling + retries with backoff",
      "Replay a topic into a new consumer",
    ],
    relatedLessons: ["kafka-fundamentals", "background-jobs-dual"],
  },
  {
    id: "p5",
    n: 5,
    title: "Microservices System",
    level: "Advanced",
    goal: "Split the monolith into services with an API gateway, service-to-service auth, and resilience patterns.",
    stack: ["NestJS", "FastAPI", "Kafka", "Redis"],
    milestones: [
      "API gateway with routing + auth",
      "Circuit breakers + timeouts + retries with budgets",
      "Distributed tracing across services",
      "Graceful degradation on dependency failure",
      "Contract tests between services",
    ],
    relatedLessons: ["load-balancing", "redis-deep"],
  },
  {
    id: "p6",
    n: 6,
    title: "Kubernetes Deployment",
    level: "Advanced",
    goal: "Deploy the system to Kubernetes with proper probes, resource limits, and safe rollouts.",
    stack: ["Docker", "Kubernetes", "Helm"],
    milestones: [
      "Deployments with readiness/liveness/startup probes",
      "Resource requests/limits + HPA",
      "Rolling updates with connection draining",
      "ConfigMaps/Secrets wired correctly",
      "Survive a pod and a node failure",
    ],
    relatedLessons: ["k8s-architecture", "k8s-crashloop"],
  },
  {
    id: "p7",
    n: 7,
    title: "Observable Production Platform",
    level: "Advanced",
    goal: "Instrument everything: metrics, logs, traces, dashboards, SLOs, and burn-rate alerts.",
    stack: ["OpenTelemetry", "Prometheus", "Grafana"],
    milestones: [
      "RED metrics on every service",
      "Structured logs + trace correlation",
      "Distributed traces across the request path",
      "SLOs with error budgets",
      "Multi-window burn-rate alerts",
    ],
    relatedLessons: ["slo-sli-error-budgets"],
  },
  {
    id: "p8",
    n: 8,
    title: "Internal Developer Platform",
    level: "Expert",
    goal: "Build the paved road: golden-path templates, self-service environments, and CI/CD.",
    stack: ["Terraform", "GitOps", "CI/CD"],
    milestones: [
      "Service template that ships to prod in one command",
      "IaC modules for standard infra",
      "GitOps deployment (Argo CD)",
      "Self-service preview environments",
      "Guardrails: policy, cost, security scanning",
    ],
    relatedLessons: ["k8s-architecture"],
  },
  {
    id: "p9",
    n: 9,
    title: "Distributed System",
    level: "Expert",
    goal: "Build something genuinely distributed: partitioning, replication, and explicit consistency choices.",
    stack: ["PostgreSQL", "Kafka", "Redis"],
    milestones: [
      "Shard data with a clear partition key",
      "Replication with a defined consistency model",
      "Idempotency + exactly-once-effects on retries",
      "Handle partitions per CAP/PACELC reasoning",
      "Chaos test: kill nodes, verify behavior",
    ],
    relatedLessons: ["cap-theorem", "kafka-fundamentals"],
  },
  {
    id: "p10",
    n: 10,
    title: "Final Production System (Capstone)",
    level: "Capstone",
    goal: "Operate the full stack -- CDN, LB, gateway, FastAPI + Node services, Redis, Postgres, Kafka, workers, object storage -- on Kubernetes, with observability, and survive injected failures.",
    stack: ["Everything"],
    milestones: [
      "End-to-end architecture deployed via Terraform + GitOps",
      "Full observability stack wired up",
      "Load test to find the breaking point",
      "Run a game day: inject 3 failures and recover",
      "Write postmortems with prevention items",
    ],
    relatedLessons: ["slo-sli-error-budgets", "cap-theorem", "k8s-architecture"],
  },
];

function useLocalChecklist(projectId: string, count: number) {
  const key = `eng-lab-project-${projectId}`;
  const [done, setDone] = React.useState<boolean[]>(() => Array(count).fill(false));
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw) as boolean[];
        setDone(Array.from({ length: count }, (_, i) => arr[i] ?? false));
      }
    } catch {}
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, count]);

  const toggle = (i: number) => {
    setDone((prev) => {
      const n = [...prev];
      n[i] = !n[i];
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {}
      return n;
    });
  };
  return { done, toggle, ready };
}

export default function ProjectsPage() {
  const [openId, setOpenId] = React.useState<string | null>("p1");

  return (
    <div className="space-y-5">
      <SectionHeading sub="Ten progressively harder projects -- not toy CRUD. Each has milestones you can check off; progress is saved locally.">
        Project System
      </SectionHeading>

      <div className="space-y-3">
        {PROJECTS.map((p) => (
          <ProjectRow key={p.id} project={p} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
        ))}
      </div>
    </div>
  );
}

function ProjectRow({ project, open, onToggle }: { project: Project; open: boolean; onToggle: () => void }) {
  const { done, toggle, ready } = useLocalChecklist(project.id, project.milestones.length);
  const completed = done.filter(Boolean).length;
  const pct = (completed / project.milestones.length) * 100;
  const allDone = completed === project.milestones.length;

  return (
    <Card className={cn(open && "border-accent/40")}>
      <button onClick={onToggle} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-sm font-semibold text-accent">
          {allDone && ready ? <Trophy className="h-4 w-4" /> : project.n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-fg">{project.title}</h3>
            <Badge tone="muted">{project.level}</Badge>
          </div>
          <p className="truncate text-xs text-fg-muted">{project.goal}</p>
        </div>
        <div className="hidden w-32 shrink-0 sm:block">
          <ProgressBar value={ready ? pct : 0} color="#6ea8fe" />
          <div className="mt-1 text-right text-[11px] tabular-nums text-fg-faint">
            {completed}/{project.milestones.length}
          </div>
        </div>
        <ChevronRight className={cn("h-5 w-5 shrink-0 text-fg-faint transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <CardBody className="border-t border-border pt-4 animate-fade-in">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {project.stack.map((s) => (
              <Badge key={s} tone="accent">
                {s}
              </Badge>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <Boxes className="h-4 w-4 text-accent" /> Milestones
          </div>
          <div className="space-y-1.5">
            {project.milestones.map((m, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-2.5 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover"
              >
                {ready && done[i] ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-fg-faint" />
                )}
                <span className={cn(ready && done[i] ? "text-fg-muted line-through" : "text-fg/90")}>{m}</span>
              </button>
            ))}
          </div>
          {project.relatedLessons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs text-fg-faint">Study first:</span>
              {project.relatedLessons.filter(isAuthored).map((s) => (
                <Link key={s} href={`/learn/${s}`}>
                  <Badge tone="info" className="cursor-pointer">
                    {getLesson(s)?.title ?? s}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
