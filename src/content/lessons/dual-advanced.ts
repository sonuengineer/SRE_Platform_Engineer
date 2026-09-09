import type { Lesson } from "../types";

export const dualAdvancedLessons: Lesson[] = [
  {
    slug: "transactions-dual",
    title: "Database Transactions: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "dual-advanced",
    difficulty: "advanced",
    estMinutes: 30,
    summary:
      "ACID transactions and atomic multi-step writes in both ecosystems: SQLAlchemy session/begin vs TypeORM/Prisma transactions, with rollback, isolation levels, and the canonical transfer-money-between-accounts example.",
    prerequisites: ["http-fundamentals"],
    relatedConcepts: ["acid", "isolation-levels", "outbox-pattern", "idempotency-retries"],
    tags: ["transactions", "acid", "sqlalchemy", "typeorm", "prisma", "isolation", "dual-track"],

    why: `Any operation that touches more than one row -- debit one account, credit another; create an order and decrement inventory -- must be **all-or-nothing**. Without a transaction, a crash between the two writes leaves your data in a state that never should have existed: money vanished, inventory sold twice. **Transactions are the mechanism that turns several writes into one indivisible unit**, and the concept is identical whether you write FastAPI with SQLAlchemy or NestJS with TypeORM/Prisma -- only the API surface differs.`,

    intuition: `A transaction is an **escrow envelope**. You put several changes inside, and nothing takes effect until you **seal it (commit)**. If anything goes wrong before sealing, you **tear up the envelope (rollback)** and it is as if nothing happened -- no half-written state ever becomes visible to anyone else. The database gives you four guarantees on that envelope, spelled **ACID**: Atomic (all or nothing), Consistent (rules hold before and after), Isolated (concurrent envelopes do not see each other's uncommitted contents), Durable (once sealed, it survives a crash).`,

    howItWorks: `**The atomic multi-step write, same in both ecosystems:**
1. **Begin** a transaction (open the envelope).
2. Perform every dependent write **inside** it -- debit account A, credit account B.
3. If all succeed -> **commit** (seal): every change becomes visible atomically.
4. If any step throws -> **rollback**: every change is discarded.

The classic example is a **money transfer**: subtract 100 from A, add 100 to B. If the process crashes after the debit but before the credit, a transaction guarantees the debit is rolled back -- the money is never destroyed.

The only difference across frameworks is *how you scope the transaction*: SQLAlchemy uses \`session.begin()\` / a context manager; TypeORM uses a \`QueryRunner\` or the \`transaction\` helper; Prisma uses \`prisma.$transaction\`.`,

    dualCode: [
      {
        concept: "Atomic transfer between two accounts",
        note: "Both wrap the two writes in one transaction. If the credit fails, the debit is rolled back -- money is never lost or duplicated.",
        python: {
          label: "FastAPI + SQLAlchemy (async)",
          language: "python",
          code: `from sqlalchemy.ext.asyncio import AsyncSession

async def transfer(db: AsyncSession, src: str, dst: str, amount: int):
    async with db.begin():                 # BEGIN; commit on exit, rollback on error
        a = await db.get(Account, src, with_for_update=True)
        b = await db.get(Account, dst, with_for_update=True)
        if a.balance < amount:
            raise ValueError("insufficient funds")  # -> rollback
        a.balance -= amount
        b.balance += amount
    # leaving the block commits atomically`,
        },
        typescript: {
          label: "NestJS + TypeORM (QueryRunner)",
          language: "typescript",
          code: `async transfer(src: string, dst: string, amount: number) {
  const qr = this.dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    const a = await qr.manager.findOne(Account, {
      where: { id: src }, lock: { mode: 'pessimistic_write' },
    });
    const b = await qr.manager.findOne(Account, {
      where: { id: dst }, lock: { mode: 'pessimistic_write' },
    });
    if (a.balance < amount) throw new Error('insufficient funds');
    a.balance -= amount; b.balance += amount;
    await qr.manager.save([a, b]);
    await qr.commitTransaction();          // seal
  } catch (e) {
    await qr.rollbackTransaction();        // discard
    throw e;
  } finally {
    await qr.release();
  }
}`,
        },
      },
      {
        concept: "Same transfer with Prisma (interactive transaction)",
        note: "Prisma's $transaction callback commits on return and rolls back if the callback throws -- the closest analogue to SQLAlchemy's context manager.",
        python: {
          label: "FastAPI + SQLAlchemy (explicit rollback)",
          language: "python",
          code: `async def transfer(db: AsyncSession, src, dst, amount):
    try:
        a = await db.get(Account, src, with_for_update=True)
        b = await db.get(Account, dst, with_for_update=True)
        if a.balance < amount:
            raise ValueError("insufficient funds")
        a.balance -= amount
        b.balance += amount
        await db.commit()
    except Exception:
        await db.rollback()   # never leave a half-applied transfer
        raise`,
        },
        typescript: {
          label: "NestJS + Prisma ($transaction)",
          language: "typescript",
          code: `async transfer(src: string, dst: string, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    const a = await tx.account.update({
      where: { id: src },
      data: { balance: { decrement: amount } },
    });
    if (a.balance < 0) throw new Error('insufficient funds'); // -> rollback
    await tx.account.update({
      where: { id: dst },
      data: { balance: { increment: amount } },
    });
  }); // returning commits; throwing rolls back the whole thing
}`,
        },
      },
      {
        concept: "Choosing an isolation level",
        note: "Serializable prevents anomalies (write skew) but retries on conflict; Read Committed is the common default. Match the level to the invariant you must protect.",
        python: {
          label: "FastAPI + SQLAlchemy",
          language: "python",
          code: `from sqlalchemy import text

async with db.begin():
    await db.execute(
        text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
    )
    # ... critical invariant-preserving writes ...
    # on a serialization failure (SQLSTATE 40001), retry the whole tx`,
        },
        typescript: {
          label: "NestJS + Prisma",
          language: "typescript",
          code: `import { Prisma } from '@prisma/client';

await this.prisma.$transaction(
  async (tx) => {
    // ... critical writes ...
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
);
// wrap in a retry loop: catch serialization conflicts and re-run`,
        },
      },
    ],

    internals: `- **ACID** is enforced by the database engine, not your framework: the ORM only opens/commits/rolls back the transaction.
- **Isolation levels** trade correctness for concurrency: *Read Uncommitted* (dirty reads) < *Read Committed* (default in Postgres) < *Repeatable Read* < *Serializable* (as if transactions ran one at a time). Higher levels prevent more anomalies but cause more conflicts/retries.
- **Locking:** \`SELECT ... FOR UPDATE\` (pessimistic) takes a row lock so no other transaction can modify it until you commit -- essential for the transfer example. **Optimistic locking** uses a version column and fails on conflict instead.
- **Write skew** is the sneaky anomaly Read Committed does not stop: two transactions read the same rows, each makes a decision, and together they violate an invariant. Serializable is the reliable fix.
- **A transaction holds locks until commit**, so a long transaction blocks others -- keep them short and never do network I/O (email, HTTP) inside one.`,

    diagram: {
      title: "Atomic transfer under a transaction",
      layers: [
        { id: "begin", label: "BEGIN", sub: "open the escrow envelope" },
        { id: "lock", label: "Lock rows", sub: "SELECT ... FOR UPDATE on A and B" },
        { id: "writes", label: "Debit A, credit B", sub: "both writes staged, not yet visible" },
        { id: "decision", label: "All succeed?", sub: "yes -> commit, no -> rollback" },
        { id: "commit", label: "COMMIT / ROLLBACK", sub: "atomic + durable, or as if nothing happened" },
      ],
      caption: "Every dependent write lives inside one envelope; other sessions see all of it or none of it, never a half-applied transfer.",
    },

    realWorld: `A payments team wraps the debit and credit in application code but not a transaction. A deploy restarts the pod between the two writes; the debit committed, the credit never ran. A customer's money simply disappeared, and it took a manual reconciliation job to find and refund it. Wrapping both writes in a single transaction would have made the crash a no-op: the debit rolls back on restart and the transfer is retried cleanly.`,

    production: `- **Keep transactions short.** They hold locks; long transactions cause lock contention and deadlocks.
- **Never do external I/O inside a transaction** (sending email, calling an API). Do the DB work, commit, then enqueue the side effect (see the outbox pattern).
- **Pick the isolation level per invariant.** Use Serializable for money/inventory invariants and add a retry loop for serialization failures (SQLSTATE 40001).
- **Lock the rows you mutate** (\`FOR UPDATE\`) to avoid lost updates under concurrency.
- **Handle deadlocks** by retrying with backoff -- the DB will abort one victim; that is normal, not a bug.`,

    commonMistakes: [
      "Doing multi-step writes without a transaction, so a crash leaves half-applied state.",
      "Holding a transaction open across network I/O (email/HTTP), causing long lock holds and timeouts.",
      "Reading-then-writing without a row lock, producing lost updates under concurrency.",
      "Assuming the default isolation level prevents write skew (it does not -- use Serializable).",
      "Catching the error but forgetting to roll back, leaking an open transaction and its locks.",
    ],

    tradeoffs: `| Decision | Benefit | Cost |
|---|---|---|
| Serializable isolation | Prevents all anomalies incl. write skew | More conflicts -> retries; lower throughput |
| Read Committed (default) | High concurrency, few retries | Susceptible to write skew / phantom reads |
| Pessimistic lock (FOR UPDATE) | No lost updates; simple to reason about | Locks block other writers; deadlock risk |
| Optimistic lock (version col) | No blocking; great for low contention | Must retry on conflict; extra column |`,

    whenToUse: ["Any operation that must write more than one row all-or-nothing (transfers, orders + inventory).", "Enforcing invariants across rows that concurrent requests could violate."],
    whenNotToUse: ["A single-row write that the database already makes atomic on its own.", "Long-running work involving external calls -- commit first, then do the side effect asynchronously."],

    memoryCard: {
      problem: "Turn several dependent writes into one indivisible, crash-safe unit so no half-applied state is ever visible.",
      mentalModel: "An escrow envelope: nothing takes effect until you seal it (commit); tear it up (rollback) and it is as if nothing happened.",
      keyConcepts: ["ACID guarantees", "begin/commit/rollback", "isolation levels", "FOR UPDATE row locking", "write skew -> Serializable"],
      productionConnection: "SQLAlchemy session.begin(), TypeORM QueryRunner, and Prisma $transaction all express the same envelope; keep them short and free of external I/O.",
      oneLiner: "Wrap dependent writes in one transaction so they commit together or not at all -- the transfer either fully happens or never did.",
    },

    quiz: [
      {
        id: "tx-q1",
        prompt: "A process crashes after debiting account A but before crediting B, inside a transaction. What happens?",
        choices: [
          { text: "A stays debited; the money is lost until manual repair", correct: false },
          { text: "The uncommitted transaction is rolled back, so the debit is undone -- as if nothing happened", correct: true },
          { text: "B is automatically credited on restart", correct: false },
          { text: "The database commits whatever was written so far", correct: false },
        ],
        explanation: "Atomicity means an uncommitted transaction is discarded on failure. The debit was never committed, so it is rolled back and no money is lost.",
      },
      {
        id: "tx-q2",
        prompt: "Two transactions read the same rows, each makes a decision, and together they break an invariant even though each looked fine. What prevents this?",
        choices: [
          { text: "Read Committed isolation", correct: false },
          { text: "Serializable isolation (with a retry on serialization failure)", correct: true },
          { text: "Removing the transaction entirely", correct: false },
          { text: "A larger connection pool", correct: false },
        ],
        explanation: "This is write skew. Read Committed does not stop it; Serializable makes transactions behave as if run one at a time, aborting one on conflict so you can retry.",
      },
      {
        id: "tx-q3",
        prompt: "Why should you avoid calling an external API (e.g. sending email) inside a database transaction?",
        choices: [
          { text: "External calls automatically commit the transaction", correct: false },
          { text: "The transaction holds locks for the duration, so slow I/O causes lock contention and timeouts", correct: true },
          { text: "APIs cannot be called from backend code at all", correct: false },
          { text: "It makes the transaction non-durable", correct: false },
        ],
        explanation: "A transaction holds its locks until commit. Doing slow network I/O inside it stretches lock hold time, blocking other writers and risking deadlocks. Commit first, then do the side effect.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Make a money transfer crash-safe",
      brief: "Given a transfer that debits A then credits B with two separate committed writes, rework it to be atomic and concurrency-safe.",
      steps: `1. Wrap both writes in a single transaction (session.begin / QueryRunner / $transaction).\n2. Lock both rows with SELECT ... FOR UPDATE (pessimistic_write) before mutating.\n3. Validate the balance inside the transaction; throw to trigger rollback on insufficient funds.\n4. Choose Serializable isolation for the money invariant and add a retry loop on SQLSTATE 40001.\n5. Move any email/notification out of the transaction -- commit first, then enqueue it.`,
      successCriteria: ["Both writes in one transaction", "Rows locked before mutation", "Rollback on failure leaves no half-applied state", "External I/O moved outside the transaction"],
    },
  },

  {
    slug: "observability-dual",
    title: "Observability: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "dual-advanced",
    difficulty: "advanced",
    estMinutes: 32,
    summary:
      "The three pillars -- structured logging, RED metrics, and OpenTelemetry tracing -- implemented in both ecosystems so you can answer 'is it broken, and where?' in production.",
    prerequisites: ["http-fundamentals"],
    relatedConcepts: ["red-metrics", "distributed-tracing", "slo-sli", "structured-logging"],
    tags: ["observability", "logging", "metrics", "tracing", "opentelemetry", "prometheus", "dual-track"],

    why: `In production you cannot attach a debugger. When latency spikes or errors climb, the only way to know **what is happening and where** is the telemetry you emitted ahead of time. Observability -- **structured logs, metrics, and traces** -- is what turns "the site feels slow" into "the checkout service's DB query p99 tripled after the 14:02 deploy." The instrumentation concept is identical in FastAPI and NestJS; only the middleware/interceptor hook differs.`,

    intuition: `Think of a hospital patient monitor. **Metrics** are the vital-sign lines -- request rate, error rate, latency -- always on, cheap, aggregate; they tell you *something is wrong*. **Traces** are the chart of one patient's journey through every department -- they tell you *where* the time or error occurred across services. **Logs** are the nurse's detailed notes at each step -- they tell you *why*. You need all three: metrics to detect, traces to localize, logs to explain.`,

    howItWorks: `**The three pillars, and what each answers:**
1. **Structured logs** (JSON, not printf strings): every log line is a queryable object with a level, message, and fields (\`request_id\`, \`user_id\`, \`trace_id\`). Answers *why*.
2. **RED metrics** for every request-serving service: **R**ate (requests/sec), **E**rrors (failed/sec), **D**uration (latency histogram). Answers *is it broken, how badly*.
3. **Distributed tracing** via **OpenTelemetry**: a request gets a \`trace_id\`; each hop (service, DB call) is a **span** with parent/child links. Answers *where*.

The key discipline: **propagate a correlation id** (trace id) through logs, metrics exemplars, and spans so you can pivot from a metric spike to the exact traces and their logs.`,

    dualCode: [
      {
        concept: "Structured (JSON) logging with request correlation",
        note: "Emit JSON with a request/trace id on every line so logs are queryable and joinable to traces. Never log secrets or PII.",
        python: {
          label: "FastAPI + structlog",
          language: "python",
          code: `import structlog, uuid
from fastapi import FastAPI, Request

structlog.configure(processors=[
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.processors.JSONRenderer(),
])
log = structlog.get_logger()
app = FastAPI()

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    slog = log.bind(request_id=rid, path=request.url.path)
    slog.info("request.start")
    resp = await call_next(request)
    slog.info("request.end", status=resp.status_code)
    return resp`,
        },
        typescript: {
          label: "NestJS + pino (nestjs-pino)",
          language: "typescript",
          code: `// main.ts
import { Logger } from 'nestjs-pino';
app.useLogger(app.get(Logger));

// logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const rid = req.headers['x-request-id'] ?? randomUUID();
    this.logger.assign({ request_id: rid, path: req.url });
    this.logger.info('request.start');
    const t0 = Date.now();
    return next.handle().pipe(
      tap(() => this.logger.info({ ms: Date.now() - t0 }, 'request.end')),
    );
  }
}`,
        },
      },
      {
        concept: "RED metrics (rate, errors, duration)",
        note: "Expose a Prometheus histogram for latency and a counter for requests labelled by route and status. Scrape /metrics.",
        python: {
          label: "FastAPI + prometheus_client",
          language: "python",
          code: `from prometheus_client import Counter, Histogram, make_asgi_app
import time

REQS = Counter("http_requests_total", "count", ["route", "status"])
LAT = Histogram("http_request_duration_seconds", "latency", ["route"])

@app.middleware("http")
async def metrics(request, call_next):
    t0 = time.perf_counter()
    resp = await call_next(request)
    route = request.scope.get("route").path if request.scope.get("route") else "unknown"
    LAT.labels(route).observe(time.perf_counter() - t0)
    REQS.labels(route, resp.status_code).inc()
    return resp

app.mount("/metrics", make_asgi_app())`,
        },
        typescript: {
          label: "NestJS + prom-client",
          language: "typescript",
          code: `import { Counter, Histogram, register } from 'prom-client';

const reqs = new Counter({
  name: 'http_requests_total', help: 'count',
  labelNames: ['route', 'status'],
});
const lat = new Histogram({
  name: 'http_request_duration_seconds', help: 'latency',
  labelNames: ['route'],
});

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const end = lat.startTimer({ route: req.route?.path ?? 'unknown' });
    return next.handle().pipe(finalize(() => {
      const res = ctx.switchToHttp().getResponse();
      end();
      reqs.inc({ route: req.route?.path ?? 'unknown', status: res.statusCode });
    }));
  }
}
// GET /metrics -> res.end(await register.metrics())`,
        },
      },
      {
        concept: "Distributed tracing with OpenTelemetry",
        note: "Auto-instrument the framework so every request becomes a span; add custom spans around expensive work. Export to an OTLP collector.",
        python: {
          label: "FastAPI + OpenTelemetry",
          language: "python",
          code: `from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
FastAPIInstrumentor.instrument_app(app)  # every request -> a span

tracer = trace.get_tracer(__name__)

@app.get("/report")
async def report():
    with tracer.start_as_current_span("build_report") as span:
        span.set_attribute("rows", 1000)
        return await expensive()`,
        },
        typescript: {
          label: "NestJS + OpenTelemetry (SDK)",
          language: "typescript",
          code: `// tracing.ts -- import BEFORE the app bootstraps
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()], // http, express, pg...
}).start();

// custom span in a service
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('reports');
async buildReport() {
  return tracer.startActiveSpan('build_report', async (span) => {
    span.setAttribute('rows', 1000);
    try { return await this.expensive(); }
    finally { span.end(); }
  });
}`,
        },
      },
    ],

    internals: `- **Structured logs** are objects, not strings: you query \`status:500 AND route:/checkout\` instead of grepping. High volume, so **sample** at scale and keep them at INFO+ in prod.
- **Metrics are aggregates:** a **histogram** stores latency in buckets so you can compute p50/p95/p99 across all requests cheaply. They are low-cardinality by design -- never label metrics with unbounded values (user ids), or you explode series count.
- **A trace is a tree of spans** sharing one \`trace_id\`; **context propagation** (W3C \`traceparent\` header) carries it across service boundaries. That is how you follow one request through five services.
- **Exemplars** link a metric bucket to a sample trace id, letting you jump from a latency spike directly to an example slow trace.
- **Cardinality is the cost model of observability:** logs cost by volume, metrics cost by unique label combinations, traces cost by span count x sampling rate.`,

    diagram: {
      title: "Three pillars, one correlation id",
      layers: [
        { id: "req", label: "Request in", sub: "assign/propagate trace_id" },
        { id: "metrics", label: "Metrics (RED)", sub: "rate, errors, duration -> detect" },
        { id: "traces", label: "Traces (spans)", sub: "per-hop timing -> localize" },
        { id: "logs", label: "Structured logs", sub: "JSON fields incl trace_id -> explain" },
        { id: "pivot", label: "Correlate", sub: "spike -> exemplar trace -> its logs" },
      ],
      caption: "Metrics detect, traces localize, logs explain -- all joined by one propagated trace id so you can pivot between them.",
    },

    realWorld: `Checkout latency alerts fire. The RED dashboard shows p99 duration tripled but rate and error count are flat -- so it is a slowness, not an outage. An exemplar links the slow bucket to a trace, which shows one span, a Postgres query, ballooned from 5ms to 400ms. The span's logs carry the query and \`request_id\`; the query lost its index in the 14:02 migration. Detect (metrics) -> localize (trace) -> explain (logs) took minutes instead of hours.`,

    production: `- **Log structured JSON with a propagated request/trace id** on every line; never log secrets, tokens, or PII.
- **Instrument RED for every service** and alert on symptoms (error rate, p99 latency), not causes (CPU) -- symptoms map to user pain and SLOs.
- **Keep metric cardinality bounded:** label by route/status, never by user id or raw path.
- **Auto-instrument with OpenTelemetry and sample traces** (e.g. tail-based, keeping all errors and slow traces) to control cost.
- **Wire exemplars** so a metric spike links to an example trace, and ensure trace context propagates across service boundaries (W3C traceparent).`,

    commonMistakes: [
      "Logging free-text strings you have to grep instead of structured JSON fields.",
      "Labelling metrics with unbounded values (user id, full URL) and exploding time series.",
      "Alerting on causes (CPU, memory) instead of user-facing symptoms (error rate, latency).",
      "Not propagating trace context across services, so traces stop at the first hop.",
      "Logging secrets, tokens, or PII into your log pipeline.",
    ],

    tradeoffs: `| Pillar | Strength | Cost / limit |
|---|---|---|
| Metrics | Cheap, always-on, great for alerting | Aggregate only -- cannot explain a single request |
| Traces | Pinpoint where time/errors occur per request | Sampling needed at scale; storage per span |
| Logs | Full detail / why | Highest volume; must sample and avoid PII |
| High cardinality | Rich slicing | Explodes metric series / cost |`,

    whenToUse: ["Any service running in production where you must detect and diagnose issues without a debugger.", "Distributed systems where a request crosses several services and you need to see the whole path."],
    whenNotToUse: ["A throwaway script or one-off job where the operational cost of full instrumentation is not justified.", "Adding high-cardinality labels to metrics -- use logs/traces for per-entity detail instead."],

    memoryCard: {
      problem: "Know what is happening in production and where, without a debugger, across services.",
      mentalModel: "A hospital monitor: metrics are the vital-sign lines (detect), traces are the patient's journey through departments (localize), logs are the nurse's notes (explain).",
      keyConcepts: ["structured JSON logs", "RED metrics (rate/errors/duration)", "OpenTelemetry spans + trace_id", "context propagation (traceparent)", "cardinality is the cost model"],
      productionConnection: "FastAPI middleware and NestJS interceptors emit the same three pillars; one propagated trace id lets you pivot spike -> trace -> logs.",
      oneLiner: "Emit structured logs, RED metrics, and OTel traces sharing one trace id so you can detect, localize, and explain incidents fast.",
    },

    quiz: [
      {
        id: "obs-q1",
        prompt: "Latency alerts fire but request rate and error count are flat. Which pillar tells you WHERE the time is being spent?",
        choices: [
          { text: "Metrics -- they show the per-span breakdown", correct: false },
          { text: "Traces -- the span tree localizes the slow hop (e.g. a specific DB query)", correct: true },
          { text: "Logs alone, by grepping for slow", correct: false },
          { text: "None; you must attach a debugger in production", correct: false },
        ],
        explanation: "Metrics detect that something is slow; a trace's span tree shows which hop (service or query) consumed the time, localizing the problem.",
      },
      {
        id: "obs-q2",
        prompt: "Why must you avoid labelling a Prometheus metric with the user id?",
        choices: [
          { text: "User ids are secret", correct: false },
          { text: "Unbounded label values explode the number of time series, blowing up cost and cardinality", correct: true },
          { text: "Metrics cannot have labels", correct: false },
          { text: "It makes logs unqueryable", correct: false },
        ],
        explanation: "Each unique label combination is a separate time series. An unbounded label like user id creates millions of series -- use logs or traces for per-entity detail.",
      },
      {
        id: "obs-q3",
        prompt: "What lets a single trace follow a request across multiple services?",
        choices: [
          { text: "Each service generating its own independent trace id", correct: false },
          { text: "Context propagation of the trace id via a header (W3C traceparent)", correct: true },
          { text: "Storing the request in a shared database", correct: false },
          { text: "Logging the same message in every service", correct: false },
        ],
        explanation: "The trace id is propagated in the traceparent header on outbound calls, so downstream spans attach to the same trace instead of starting a new one.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Instrument a service with the three pillars",
      brief: "Given a FastAPI or NestJS service that only prints plain-text logs, add structured logging, RED metrics, and tracing that correlate.",
      steps: `1. Replace print/console logs with structured JSON (structlog / pino) and bind a request id on every line.\n2. Add a middleware/interceptor exposing RED: a requests_total counter (labels route,status) and a latency histogram (label route) at /metrics.\n3. Auto-instrument with OpenTelemetry so each request is a span; add a custom span around one expensive operation.\n4. Propagate the request/trace id into log fields so logs join to traces.\n5. Verify: trigger a slow request, find the p99 spike in metrics, open its trace, and read the correlated log line.`,
      successCriteria: ["Logs are JSON with a request/trace id", "RED metrics exposed at /metrics with bounded labels", "Requests appear as OTel spans", "Metric spike -> trace -> logs pivot works end to end"],
    },
  },

  {
    slug: "streaming-dual",
    title: "Streaming & SSE: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "dual-advanced",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "Streaming responses and Server-Sent Events for long-running or incremental output -- FastAPI StreamingResponse/EventSourceResponse vs NestJS Sse/StreamableFile -- with backpressure, heartbeats, and reconnection.",
    prerequisites: ["http-fundamentals"],
    relatedConcepts: ["chunked-transfer", "websockets", "backpressure", "long-running-requests"],
    tags: ["streaming", "sse", "chunked", "fastapi", "nestjs", "realtime", "dual-track"],

    why: `Some responses are not a single small JSON object: a 2GB export, an LLM token stream, a live progress feed, or a dashboard that updates as events happen. Buffering the whole thing in memory before sending is slow, memory-hungry, and gives the user nothing until it is done. **Streaming sends the response incrementally -- byte by byte or event by event -- as it is produced**, cutting time-to-first-byte and memory to near constant. FastAPI and NestJS both express this; the primitives differ but the model is the same.`,

    intuition: `Streaming is a **conveyor belt** instead of a shipping container. A normal response packs everything into one box and ships it only when full; the recipient waits and you need a box big enough for the whole load. A stream puts each item on the belt the instant it is ready -- the recipient starts using the first items immediately, and you never hold more than one item at a time. **Server-Sent Events (SSE)** is that belt specialized for one-way server-to-client updates: a long-lived HTTP response over which the server keeps pushing named events.`,

    howItWorks: `**Two related techniques:**
1. **Streaming responses (chunked transfer):** instead of returning a full body, you return a generator/iterable. The framework sends each chunk with \`Transfer-Encoding: chunked\`, flushing as you yield. Ideal for large files or incremental computation.
2. **Server-Sent Events (SSE):** a streaming response with \`Content-Type: text/event-stream\`. Each message is \`data: ...\\n\\n\`, optionally with \`event:\` and \`id:\` lines. The browser's \`EventSource\` **auto-reconnects** and resumes from the last id. One-way, server -> client, over plain HTTP.

Key operational concerns for both: **backpressure** (stop producing if the client is slow), **heartbeats** (send a comment line periodically so proxies do not kill an idle connection), and **reconnection** (SSE handles this; raw streams do not).`,

    dualCode: [
      {
        concept: "Stream a large response incrementally (chunked)",
        note: "Return a generator so each chunk flushes as produced -- constant memory, low time-to-first-byte, no giant in-memory buffer.",
        python: {
          label: "FastAPI StreamingResponse",
          language: "python",
          code: `from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

async def rows():
    async for row in db.stream_export():   # never buffer the whole set
        yield (row.to_csv() + "\\n").encode()

@app.get("/export.csv")
async def export():
    return StreamingResponse(
        rows(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=export.csv"},
    )`,
        },
        typescript: {
          label: "NestJS StreamableFile / generator",
          language: "typescript",
          code: `import { Controller, Get, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';

@Controller()
export class ExportController {
  @Get('export.csv')
  export(): StreamableFile {
    const source = Readable.from((async function* () {
      for await (const row of db.streamExport()) {   // constant memory
        yield row.toCsv() + '\\n';
      }
    })());
    return new StreamableFile(source, {
      type: 'text/csv',
      disposition: 'attachment; filename="export.csv"',
    });
  }
}`,
        },
      },
      {
        concept: "Server-Sent Events (live progress feed)",
        note: "Content-Type text/event-stream; each yield is one event. The browser's EventSource reconnects automatically and resumes from the last id.",
        python: {
          label: "FastAPI SSE (StreamingResponse)",
          language: "python",
          code: `import asyncio, json
from fastapi.responses import StreamingResponse

async def progress_events(job_id: str):
    while True:
        p = await get_progress(job_id)
        yield f"id: {p.seq}\\nevent: progress\\ndata: {json.dumps(p.__dict__)}\\n\\n"
        if p.done:
            yield "event: done\\ndata: {}\\n\\n"
            return
        await asyncio.sleep(1)          # or: yield ": keep-alive\\n\\n" heartbeat

@app.get("/jobs/{job_id}/stream")
async def stream(job_id: str):
    return StreamingResponse(
        progress_events(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )`,
        },
        typescript: {
          label: "NestJS @Sse (RxJS Observable)",
          language: "typescript",
          code: `import { Controller, Sse, Param, MessageEvent } from '@nestjs/common';
import { interval, map, Observable } from 'rxjs';

@Controller('jobs')
export class JobsController {
  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    // emit once per second; NestJS formats each as an SSE frame
    return interval(1000).pipe(
      map((seq) => ({
        id: String(seq),
        type: 'progress',
        data: getProgress(id),      // object -> serialized to data:
      })),
    );
  }
}
// client: new EventSource('/jobs/42/stream') -- auto-reconnects`,
        },
      },
      {
        concept: "Heartbeats and client-disconnect handling",
        note: "Send a periodic comment so proxies keep the connection open, and stop producing when the client goes away to free resources (backpressure).",
        python: {
          label: "FastAPI (detect disconnect)",
          language: "python",
          code: `from fastapi import Request

async def events(request: Request):
    while True:
        if await request.is_disconnected():   # client gone -> stop work
            break
        data = await next_update()
        if data is None:
            yield ": heartbeat\\n\\n"           # keep proxies from timing out
        else:
            yield f"data: {data}\\n\\n"

@app.get("/feed")
async def feed(request: Request):
    return StreamingResponse(events(request), media_type="text/event-stream")`,
        },
        typescript: {
          label: "NestJS (heartbeat + cleanup)",
          language: "typescript",
          code: `@Sse('feed')
feed(): Observable<MessageEvent> {
  return new Observable((sub) => {
    const beat = setInterval(() => sub.next({ type: 'ping', data: {} }), 15000);
    const stop = source.subscribe({
      next: (d) => sub.next({ data: d }),
      complete: () => sub.complete(),
    });
    // teardown runs when the client disconnects -> free resources
    return () => { clearInterval(beat); stop.unsubscribe(); };
  });
}`,
        },
      },
    ],

    internals: `- **Chunked transfer encoding** lets the server send a body of unknown length as a sequence of size-prefixed chunks, flushing each without a \`Content-Length\`. That is what makes incremental sending possible.
- **SSE is just chunked text** with \`Content-Type: text/event-stream\` and a tiny framing (\`data:\`, \`event:\`, \`id:\`, blank line separates messages). No special protocol -- it rides ordinary HTTP.
- **Auto-reconnect + Last-Event-ID:** on drop, the browser reconnects and sends \`Last-Event-ID\`; if you honor it, the client resumes without gaps. This is SSE's headline advantage over a raw stream.
- **Backpressure:** if you produce faster than the client (or network) drains, memory grows. Async frameworks apply backpressure when you \`await\` the write; you must also stop generating when the client disconnects.
- **Proxy buffering** (nginx) will silently collect your whole stream and defeat it -- disable it (\`X-Accel-Buffering: no\`) and send heartbeats so idle connections are not reaped.`,

    diagram: {
      title: "Streaming / SSE lifecycle",
      layers: [
        { id: "open", label: "Client opens stream", sub: "GET, keeps connection open" },
        { id: "chunk", label: "Server yields chunks/events", sub: "flushed incrementally (chunked)" },
        { id: "beat", label: "Heartbeat + backpressure", sub: "keep-alive; slow client -> pause producing" },
        { id: "drop", label: "Disconnect", sub: "SSE reconnects w/ Last-Event-ID; stop work" },
        { id: "done", label: "Stream ends", sub: "final event / EOF; resources freed" },
      ],
      caption: "A single long-lived HTTP response over which the server flushes data as it is produced, with heartbeats and reconnection keeping it healthy.",
    },

    realWorld: `A reporting endpoint loads a million rows into a list, serializes to one JSON blob, and returns it. Under load the pods OOM-kill and users stare at a spinner for 40s before anything appears. Switching to a StreamingResponse that yields rows as CSV drops memory to near-constant and time-to-first-byte to milliseconds -- the browser downloads progressively. For the live job-progress UI, SSE replaced polling: one long-lived connection pushes updates and the browser reconnects for free on a blip.`,

    production: `- **Never buffer the whole payload** -- yield from a generator/stream so memory stays constant regardless of size.
- **Disable proxy buffering** for streams (nginx \`proxy_buffering off\` / \`X-Accel-Buffering: no\`) or the proxy will collect everything and kill the streaming benefit.
- **Send heartbeats** (SSE comment lines every 15-30s) so proxies and load balancers do not reap the idle connection.
- **Detect client disconnect and stop producing** -- otherwise a closed tab keeps a worker busy generating into the void.
- **Use SSE ids + honor Last-Event-ID** so reconnecting clients resume without gaps; prefer WebSockets only when you need bidirectional traffic.`,

    commonMistakes: [
      "Buffering the entire response in memory before sending, defeating the point of streaming.",
      "Leaving proxy buffering (nginx) on, so the stream is collected and delivered all at once.",
      "No heartbeats, so idle SSE connections get reaped by proxies/LBs after ~60s.",
      "Not detecting client disconnect, leaving a worker generating data nobody is reading.",
      "Reaching for WebSockets when one-way SSE (with free auto-reconnect) would do.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Streaming response | Constant memory, low time-to-first-byte | No easy random access; harder error handling mid-stream |
| SSE | Simple, one-way, auto-reconnect over plain HTTP | Server -> client only; text; limited concurrent conns per browser |
| WebSockets | Full bidirectional realtime | More infra/protocol complexity; no built-in reconnect/resume |
| Buffered response | Simple, cacheable, easy errors | High memory + latency for large/slow payloads |`,

    whenToUse: ["Large or unbounded payloads (exports, log tails) where buffering is too costly.", "One-way incremental output: progress feeds, dashboards, LLM token streams -- use SSE for auto-reconnect."],
    whenNotToUse: ["Small, fixed responses where buffering is simpler and cacheable.", "Bidirectional or low-latency two-way messaging (chat, games) -- use WebSockets instead."],

    memoryCard: {
      problem: "Deliver large or incremental output as it is produced instead of buffering the whole thing, keeping memory and time-to-first-byte low.",
      mentalModel: "A conveyor belt vs a shipping container: put each item on the belt the instant it is ready rather than waiting to fill one big box.",
      keyConcepts: ["chunked transfer encoding", "SSE (text/event-stream) framing", "auto-reconnect + Last-Event-ID", "backpressure + disconnect handling", "heartbeats + disable proxy buffering"],
      productionConnection: "FastAPI StreamingResponse and NestJS StreamableFile/@Sse express the same model; watch proxy buffering, heartbeats, and client disconnects in prod.",
      oneLiner: "Stream the body as you produce it (chunked), and use SSE for one-way live updates that reconnect for free -- never buffer the whole payload.",
    },

    quiz: [
      {
        id: "stream-q1",
        prompt: "Why return a generator/stream instead of building the full response in memory for a huge export?",
        choices: [
          { text: "It makes the response cacheable", correct: false },
          { text: "Chunks flush as produced, so memory stays near-constant and time-to-first-byte is low", correct: true },
          { text: "It changes the response to WebSocket automatically", correct: false },
          { text: "It compresses the data", correct: false },
        ],
        explanation: "Streaming uses chunked transfer to flush each piece as it is generated, so you never hold the whole payload in memory and the client gets bytes almost immediately.",
      },
      {
        id: "stream-q2",
        prompt: "What is SSE's headline advantage over a raw streaming response?",
        choices: [
          { text: "It is bidirectional like WebSockets", correct: false },
          { text: "The browser's EventSource auto-reconnects and resumes from Last-Event-ID", correct: true },
          { text: "It requires no HTTP connection", correct: false },
          { text: "It can send binary more efficiently", correct: false },
        ],
        explanation: "SSE defines message ids and the EventSource client automatically reconnects on drop, sending Last-Event-ID so the server can resume without gaps -- reconnection you would hand-roll otherwise.",
      },
      {
        id: "stream-q3",
        prompt: "Your SSE connections keep dying after about a minute behind nginx. Most likely cause?",
        choices: [
          { text: "The database is too slow", correct: false },
          { text: "Proxy buffering is on and/or there are no heartbeats, so idle connections are buffered/reaped", correct: true },
          { text: "SSE requires WebSocket upgrade headers", correct: false },
          { text: "The client is not sending cookies", correct: false },
        ],
        explanation: "nginx buffers responses by default and reaps idle connections. Disable proxy buffering (X-Accel-Buffering: no) and send periodic heartbeat comments to keep the connection alive.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Turn a buffered endpoint into a stream",
      brief: "A /export endpoint OOMs on large datasets and a /progress UI polls every 2s. Convert them to streaming and SSE.",
      steps: `1. Rewrite /export to return a StreamingResponse (FastAPI) or StreamableFile (NestJS) that yields rows from a DB cursor instead of loading all rows.\n2. Add Content-Disposition and confirm memory stays flat while a large export runs.\n3. Replace polling with an SSE endpoint (text/event-stream) that emits progress events with incrementing ids.\n4. Add a heartbeat comment every 15s and set X-Accel-Buffering: no (or nginx proxy_buffering off).\n5. Handle client disconnect (request.is_disconnected / Observable teardown) so producing stops when the client leaves.`,
      successCriteria: ["Export streams with near-constant memory", "Progress delivered via SSE, not polling", "Heartbeats + proxy buffering disabled keep connections alive", "Producing stops on client disconnect"],
    },
  },
];
