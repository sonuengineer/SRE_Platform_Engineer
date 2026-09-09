import type { Phase } from "./types";

// The full learning path. Lesson slugs referenced here resolve to authored
// content in src/content/lessons/* when available; otherwise they render as
// "coming soon" so the path stays honest while content is populated.

export const CURRICULUM: Phase[] = [
  {
    id: "cs-fundamentals",
    index: 1,
    title: "Computer Science Fundamentals",
    subtitle: "The mental primitives every production engineer reasons with.",
    skill: "backend",
    modules: [
      {
        id: "foundations",
        title: "Foundations",
        lessons: [
          "how-computers-run-code",
          "memory-stack-heap",
          "big-o-complexity",
          "data-structures-that-matter",
          "concurrency-vs-parallelism",
        ],
      },
    ],
  },
  {
    id: "python",
    index: 2,
    title: "Python",
    subtitle: "The language of Track A backends, tooling, and automation.",
    skill: "python",
    modules: [
      {
        id: "python-core",
        title: "Python Core",
        lessons: ["python-data-model", "python-async-await", "python-typing", "python-packaging"],
      },
    ],
  },
  {
    id: "js-ts",
    index: 3,
    title: "JavaScript + TypeScript",
    subtitle: "The language of Track B backends and the whole platform frontend.",
    skill: "typescript",
    modules: [
      {
        id: "ts-core",
        title: "TS Core",
        lessons: ["js-event-loop", "ts-type-system", "ts-async-patterns", "node-streams"],
      },
    ],
  },
  {
    id: "backend",
    index: 4,
    title: "Backend Engineering",
    subtitle: "The concepts that are identical across FastAPI and NestJS.",
    skill: "backend",
    modules: [
      {
        id: "http-layer",
        title: "The HTTP Layer",
        lessons: ["http-fundamentals", "rest-design", "status-codes", "idempotency"],
      },
      {
        id: "auth",
        title: "Auth & Sessions",
        lessons: ["authentication-dual", "jwt-vs-sessions", "oauth2-openid"],
      },
      {
        id: "resilience",
        title: "Resilience Patterns",
        lessons: ["caching-dual", "background-jobs-dual", "rate-limiting", "websockets-dual"],
      },
      {
        id: "dual-advanced",
        title: "Dual-track Deep Dives",
        lessons: ["transactions-dual", "observability-dual", "streaming-dual"],
      },
    ],
  },
  {
    id: "fastapi",
    index: 5,
    title: "FastAPI",
    subtitle: "Track A: production Python APIs.",
    skill: "python",
    modules: [
      {
        id: "fastapi-core",
        title: "FastAPI Core",
        lessons: ["fastapi-routing", "fastapi-dependency-injection", "fastapi-async", "fastapi-pydantic"],
      },
    ],
  },
  {
    id: "node-nest",
    index: 6,
    title: "Node.js + NestJS",
    subtitle: "Track B: production TypeScript APIs.",
    skill: "typescript",
    modules: [
      {
        id: "nest-core",
        title: "NestJS Core",
        lessons: ["nest-modules-providers", "nest-guards-interceptors", "node-event-loop-deep"],
      },
    ],
  },
  {
    id: "postgres",
    index: 7,
    title: "PostgreSQL",
    subtitle: "The default source of truth. Learn it deeply.",
    skill: "databases",
    modules: [
      {
        id: "pg-core",
        title: "Postgres Core",
        lessons: ["pg-indexes", "pg-transactions-mvcc", "pg-query-planning", "pg-connection-pooling", "n-plus-one"],
      },
    ],
  },
  {
    id: "redis",
    index: 8,
    title: "Redis",
    subtitle: "Caching, locks, queues, and the ways they bite you.",
    skill: "redis",
    modules: [
      {
        id: "redis-core",
        title: "Redis Core",
        lessons: ["redis-deep", "redis-eviction-ttl", "distributed-locks", "cache-invalidation"],
      },
    ],
  },
  {
    id: "kafka",
    index: 9,
    title: "Kafka / Messaging",
    subtitle: "Event-driven backends and the log abstraction.",
    skill: "kafka",
    modules: [
      {
        id: "kafka-core",
        title: "Kafka Core",
        lessons: ["kafka-fundamentals", "consumer-groups-lag", "delivery-semantics", "outbox-pattern"],
      },
    ],
  },
  {
    id: "linux",
    index: 10,
    title: "Linux",
    subtitle: "The machine your code actually runs on.",
    skill: "linux",
    modules: [
      {
        id: "linux-core",
        title: "Linux Core",
        lessons: ["linux-processes", "linux-filesystem", "linux-signals", "linux-observability-tools", "linux-permissions"],
      },
    ],
  },
  {
    id: "networking",
    index: 11,
    title: "Networking",
    subtitle: "How a request actually reaches your backend.",
    skill: "networking",
    modules: [
      {
        id: "net-core",
        title: "Networking Core",
        lessons: ["tcp", "dns", "tls-handshake", "http-lifecycle", "load-balancing"],
      },
    ],
  },
  {
    id: "docker",
    index: 12,
    title: "Docker",
    subtitle: "Packaging your app so it runs the same everywhere.",
    skill: "docker",
    modules: [
      {
        id: "docker-core",
        title: "Docker Core",
        lessons: ["docker-images-layers", "dockerfile-best-practices", "docker-networking", "docker-volumes"],
      },
    ],
  },
  {
    id: "aws",
    index: 13,
    title: "AWS",
    subtitle: "The cloud primitives you compose into systems.",
    skill: "cloud",
    modules: [
      {
        id: "aws-core",
        title: "AWS Core",
        lessons: ["aws-vpc-networking", "aws-ec2-compute", "aws-rds", "aws-s3", "aws-iam"],
      },
    ],
  },
  {
    id: "terraform",
    index: 14,
    title: "Terraform",
    subtitle: "Infrastructure as code and state management.",
    skill: "terraform",
    modules: [
      {
        id: "tf-core",
        title: "Terraform Core",
        lessons: ["terraform-fundamentals", "terraform-state", "terraform-modules"],
      },
    ],
  },
  {
    id: "cicd",
    index: 15,
    title: "CI/CD",
    subtitle: "From commit to production, automatically and safely.",
    skill: "cicd",
    modules: [
      {
        id: "cicd-core",
        title: "CI/CD Core",
        lessons: ["cicd-pipelines", "deployment-strategies", "gitops-argocd"],
      },
    ],
  },
  {
    id: "kubernetes",
    index: 16,
    title: "Kubernetes",
    subtitle: "The control plane that runs everything at scale.",
    skill: "kubernetes",
    modules: [
      {
        id: "k8s-core",
        title: "Kubernetes Core",
        lessons: ["k8s-architecture", "k8s-pods-deployments", "k8s-services-ingress", "k8s-crashloop", "k8s-resources-limits"],
      },
    ],
  },
  {
    id: "observability",
    index: 17,
    title: "Observability",
    subtitle: "Metrics, logs, traces, and the art of knowing what broke.",
    skill: "observability",
    modules: [
      {
        id: "o11y-core",
        title: "Observability Core",
        lessons: ["three-pillars", "prometheus-metrics", "distributed-tracing", "slo-sli-error-budgets"],
      },
    ],
  },
  {
    id: "sre",
    index: 18,
    title: "SRE",
    subtitle: "Reliability as an engineering discipline.",
    skill: "sre",
    modules: [
      {
        id: "sre-core",
        title: "SRE Core",
        lessons: ["sre-principles", "incident-response", "postmortems", "toil-automation", "capacity-planning"],
      },
    ],
  },
  {
    id: "distributed",
    index: 19,
    title: "Distributed Systems",
    subtitle: "The hard truths of running across many machines.",
    skill: "distributed",
    modules: [
      {
        id: "dist-core",
        title: "Distributed Core",
        lessons: ["cap-theorem", "consensus-raft", "consistency-models", "idempotency-retries", "sharding-partitioning"],
      },
    ],
  },
  {
    id: "platform",
    index: 20,
    title: "Platform Engineering",
    subtitle: "Building the paved road other engineers ship on.",
    skill: "platform",
    modules: [
      {
        id: "platform-core",
        title: "Platform Core",
        lessons: ["idp-concepts", "golden-paths", "developer-experience"],
      },
    ],
  },
  {
    id: "system-design",
    index: 21,
    title: "System Design",
    subtitle: "Composing everything into systems that scale.",
    skill: "systemdesign",
    modules: [
      {
        id: "sd-core",
        title: "System Design Core",
        lessons: ["system-design-framework", "scaling-reads-writes", "estimation-back-of-envelope"],
      },
    ],
  },
  {
    id: "capstone",
    index: 22,
    title: "Production Capstone",
    subtitle: "Operate a realistic large-scale system under failure.",
    skill: "sre",
    modules: [
      {
        id: "capstone-core",
        title: "Capstone",
        lessons: ["capstone-architecture", "capstone-operate-under-failure"],
      },
    ],
  },
];

export const PHASE_BY_ID: Record<string, Phase> = Object.fromEntries(
  CURRICULUM.map((p) => [p.id, p])
);

export function allCurriculumSlugs(): string[] {
  const out: string[] = [];
  for (const p of CURRICULUM) for (const m of p.modules) out.push(...m.lessons);
  return out;
}

export function phaseForSlug(slug: string): Phase | undefined {
  return CURRICULUM.find((p) => p.modules.some((m) => m.lessons.includes(slug)));
}
