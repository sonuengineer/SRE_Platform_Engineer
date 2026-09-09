import type { Lesson } from "../types";

export const observabilityLessons: Lesson[] = [
  {
    slug: "three-pillars",
    title: "The Three Pillars",
    track: "shared",
    phase: "observability",
    module: "o11y-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Metrics, logs, and traces are three complementary lenses on a running system. Each is good at a different question -- and knowing which to reach for (and how to correlate them) is the shift from monitoring known problems to debugging unknown ones.",
    prerequisites: ["http-lifecycle"],
    relatedConcepts: ["prometheus-metrics", "distributed-tracing", "slo-sli-error-budgets", "sre-principles"],
    tags: ["observability", "metrics", "logs", "traces", "monitoring", "cardinality"],

    why: `When a service misbehaves at 3am, "is it up?" is rarely the real question. The real questions are "why is p99 latency 4x normal?" and "which of the 40 downstream calls is slow, for which users?" -- questions you did not think to ask in advance. **Monitoring answers questions you predicted; observability lets you ask new questions of a system after it is already running, without shipping new code.** You get there by emitting the right telemetry in three forms, each strong where the others are weak.`,

    intuition: `Think of debugging a system like investigating a city.
- **Metrics** are the dashboards on the wall: aggregate numbers over time -- traffic volume, error rate, average speed. Cheap to keep forever, great for "is something wrong and roughly where," useless for "what happened to *this one* car."
- **Logs** are the individual incident reports: discrete, timestamped events with detail. Great for "what exactly happened here," expensive at volume, hard to aggregate.
- **Traces** are the GPS breadcrumb trail of a single trip across every road and intersection: they show the *path and timing* of one request as it fans out across services.

You start at the dashboard (metrics: something is wrong), zoom to the trip that was slow (traces: which service ate the time), then read the incident report for that stop (logs: the exact error). The magic is a shared **trace ID** stitching all three together.`,

    howItWorks: `**Metrics** are numeric measurements aggregated over time and stored as time series. A counter of requests, a gauge of queue depth, a histogram of latencies. They are pre-aggregated, so a month of data is tiny and queries are fast. The cost model is driven by **cardinality** (unique label combinations), not by request volume.

**Logs** are discrete event records. **Structured logging** (JSON key/value, not free-form strings) is the difference between grep-and-pray and queryable data: \`{"level":"error","user_id":"u_912","route":"/checkout","latency_ms":812,"trace_id":"abc123"}\`. Cost scales with volume and retention; high-traffic services can generate terabytes/day.

**Traces** capture the causal, timed path of a single request across service boundaries. Each unit of work is a **span**; spans link into a tree via parent/child relationships, all sharing one **trace ID**. Traces answer "where did the time go across services," which metrics (too aggregate) and logs (no cross-service structure) cannot.

**Correlation is the point.** Emit the same trace ID into your logs, attach it to spans, and expose exemplar links from metrics to traces. Then one click takes you dashboard -> slow trace -> the exact log line -- instead of three disconnected tools.`,

    internals: `- **Cardinality is the hidden cost of metrics.** A time series is uniquely identified by its name plus its label set. Adding a label like \`user_id\` (millions of values) or \`request_id\` (unbounded) multiplies series count and can OOM your metrics backend. Keep metric labels low-cardinality (route, method, status_class); put high-cardinality data in logs/traces instead.
- **Logs are high-cardinality by nature** -- that is exactly why per-request identifiers belong there, not in metrics.
- **Sampling differs by pillar.** Metrics are aggregate (no per-event sampling needed). Traces are almost always sampled (keeping 100% is expensive); logs may be sampled or level-filtered.
- **The convergence trend:** OpenTelemetry (OTel) is unifying instrumentation so you emit one stream and route metrics, logs, and traces from shared context. Structured logs can carry \`trace_id\`/\`span_id\` automatically when the tracing SDK is active.
- **"Wide events" school of thought:** some argue for one very wide structured event per request (dozens of fields) as a superset that can synthesize the other pillars -- a hint that the three pillars are three *views*, not three fundamentally different data types.`,

    diagram: {
      title: "Three lenses on one request",
      layers: [
        { id: "metrics", label: "Metrics", sub: "aggregate numbers over time -- cheap, is-it-broken" },
        { id: "traces", label: "Traces", sub: "one request across services -- where did time go" },
        { id: "logs", label: "Logs", sub: "discrete detailed events -- what exactly happened" },
        { id: "correlate", label: "Trace ID correlation", sub: "same id in all three -> one-click pivot" },
        { id: "o11y", label: "Observability", sub: "ask new questions of a live system" },
      ],
      caption: "Metrics find the problem, traces localize it across services, logs explain it -- correlated by a shared trace ID.",
    },

    realWorld: `Checkout p99 latency alerts fire. The **metric** dashboard shows the spike started at 14:02 and is concentrated on \`route=/checkout\`, \`status_class=5xx\`. You click a latency exemplar into a **trace** and see the request spent 3.1s inside \`payments-svc\`, specifically in a call to a third-party fraud API. You pivot on that span's \`trace_id\` into the **logs** and find \`{"level":"error","svc":"payments","msg":"fraud API timeout","trace_id":"abc123","upstream":"fraud-vendor"}\`. Three tools, one trace ID, five minutes to root cause -- versus an hour of guessing if the pillars were disconnected.`,

    production: `- **Emit structured logs (JSON) from day one** and always include \`trace_id\` and \`span_id\`.
- **Guard metric cardinality**: never put user IDs, request IDs, emails, or full URLs in metric labels. Bound label values.
- **Sample traces**, but keep enough of the interesting ones (errors, slow requests) via tail sampling.
- **Wire correlation deliberately**: exemplars from metrics to traces, trace IDs in logs -- the pivot is worthless if it is manual copy/paste.
- **Budget for it**: logs and traces cost real money at scale. Set retention tiers (hot 7-14d, cold/archive beyond) and drop debug logs in prod by default.`,

    commonMistakes: [
      "Putting high-cardinality data (user_id, request_id, full URL) into metric labels -- cardinality explosion that OOMs the metrics backend.",
      "Free-form string logs instead of structured JSON -- unqueryable at scale.",
      "Treating the three pillars as interchangeable instead of complementary (e.g. trying to compute p99 from logs, or debug one request from a metric).",
      "No shared trace ID, so you cannot pivot between tools -- three silos instead of one investigation.",
      "Keeping 100% of traces and all debug logs in prod -- an eye-watering bill for data nobody reads.",
    ],

    tradeoffs: `| Pillar | Best at | Weak at | Cost driver |
|---|---|---|---|
| Metrics | Trends, alerting, cheap long retention | Per-request detail, high-cardinality dims | Cardinality (label combos) |
| Logs | Exact detail of a single event | Aggregation, cross-service structure | Volume x retention |
| Traces | Latency across services, causal path | Long-term trends, aggregate counts | Sampling rate x span count |`,

    whenToUse: [
      "Metrics: alerting, SLOs, dashboards, capacity trends -- anything aggregate and long-lived.",
      "Logs: forensic detail on a specific event, error context, audit trails.",
      "Traces: latency debugging across a distributed request path.",
    ],
    whenNotToUse: [
      "Metrics for per-request or per-user debugging (that is logs/traces).",
      "Logs to compute aggregate percentiles at scale (that is metrics/histograms).",
      "Traces as your only signal for slow trends or alerting (too sampled/aggregate-unfriendly).",
    ],

    memoryCard: {
      problem: "Debug a live system by asking questions you did not predict in advance, across many services.",
      mentalModel: "City investigation: metrics are the wall dashboards, logs are incident reports, traces are the GPS trail of one trip -- stitched by a shared trace ID.",
      keyConcepts: ["metrics = aggregate/cheap", "logs = discrete/detailed", "traces = cross-service path", "cardinality is the metrics cost", "correlate via trace_id"],
      productionConnection: "Structured JSON logs with trace_id, bounded metric labels, sampled traces, and deliberate metrics->traces->logs correlation.",
      oneLiner: "Metrics tell you something is wrong, traces tell you where across services, logs tell you exactly what -- correlated by one trace ID.",
    },

    quiz: [
      {
        id: "tp-q1",
        prompt: "You need to debug why one specific user's request was slow across five microservices. Which pillar is the primary tool?",
        choices: [
          { text: "Metrics -- read the p99 latency gauge", correct: false },
          { text: "Traces -- follow the request's span tree across services", correct: true },
          { text: "Logs -- grep every service's log file", correct: false },
          { text: "None -- this is impossible to debug", correct: false },
        ],
        explanation: "Traces capture the causal, timed path of a single request across service boundaries via a shared trace ID, so they directly show where the time went. Metrics are too aggregate and raw logs lack cross-service structure.",
      },
      {
        id: "tp-q2",
        prompt: "Why is putting user_id as a metric label dangerous?",
        choices: [
          { text: "It makes queries case-sensitive", correct: false },
          { text: "Each unique value creates a new time series -- cardinality explosion can OOM the metrics backend", correct: true },
          { text: "Metrics cannot store strings at all", correct: false },
          { text: "It violates GDPR automatically", correct: false },
        ],
        explanation: "A time series is identified by name plus label set. A high-cardinality label like user_id multiplies the number of series into the millions, blowing up memory and storage. High-cardinality identifiers belong in logs/traces.",
      },
      {
        id: "tp-q3",
        prompt: "What best captures the difference between monitoring and observability?",
        choices: [
          { text: "Monitoring uses logs; observability uses metrics", correct: false },
          { text: "Monitoring answers predicted questions (known unknowns); observability lets you ask new questions of a live system (unknown unknowns)", correct: true },
          { text: "Observability is just monitoring with a nicer dashboard", correct: false },
          { text: "Monitoring is for prod, observability is for dev", correct: false },
        ],
        explanation: "Monitoring is built around dashboards and alerts for failure modes you anticipated. Observability is the property that you can explore and explain novel behavior after the fact, without shipping new instrumentation.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Map an incident to the three pillars",
      brief: "Given a checkout latency spike, write the exact query/step you would run in each pillar, in order, and the trace ID pivot between them.",
      steps: `1. Metrics: query error rate + p99 latency by route/status_class to confirm scope and start time.\n2. Trace: click a latency exemplar (or find a slow trace) to see which service span dominated.\n3. Logs: pivot on that span's trace_id to read the exact error line.\n4. State one high-cardinality field you must keep OUT of metrics but IN logs.\n5. Note how correlation (shared trace_id) turns three tools into one investigation.`,
      successCriteria: ["Correct pillar per step", "Uses trace_id to pivot", "Identifies a high-cardinality field for logs not metrics"],
    },
  },

  {
    slug: "prometheus-metrics",
    title: "Prometheus & Metrics",
    track: "shared",
    phase: "observability",
    module: "o11y-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "Prometheus pulls numeric time series labeled by dimensions, exposes them through PromQL, and gives you the RED/USE playbooks for what to measure. The hard parts are cardinality control and using histograms (not averages) for latency.",
    prerequisites: ["three-pillars"],
    relatedConcepts: ["slo-sli-error-budgets", "distributed-tracing", "sre-principles", "incident-response"],
    tags: ["prometheus", "metrics", "promql", "histogram", "red-method", "use-method", "cardinality"],

    why: `You cannot alert on, graph, or SLO a system you are not measuring numerically. **Prometheus is the de-facto standard for that numeric layer** because its pull model, dimensional data model, and query language (PromQL) let you slice "requests per second by route and status" and compute "p99 latency" cheaply and consistently. Get the model right and dashboards, SLOs, and alerts all fall out of the same data. Get it wrong -- especially cardinality -- and you take down your own monitoring during the incident you most need it.`,

    intuition: `Imagine every service exposing a little \`/metrics\` web page of current counters, like an odometer and a set of dials. Prometheus is a robot that **visits each page every 15 seconds and writes down the numbers** (the pull model). Over time it has a table of (metric name + labels) -> a stream of timestamped values. PromQL is how you ask that table questions: "how fast is this odometer climbing?" (\`rate\`), "what latency were 99% of requests under?" (\`histogram_quantile\`), "sum that across all pods" (aggregation). You almost never care about a raw counter's value -- you care about its *rate of change* and how it *aggregates*.`,

    howItWorks: `**Pull model:** Prometheus scrapes targets' HTTP \`/metrics\` endpoints on an interval. Targets are discovered (static config, Kubernetes SD, Consul, etc.). Pull means Prometheus controls load, detects "target down" for free, and needs no push credentials from every app. Short-lived batch jobs that die before a scrape use a **Pushgateway**.

**Data model:** every sample is \`metric_name{label1="a",label2="b"} value @timestamp\`. Labels are the dimensions you slice by. The unique set of label combinations for a metric is its cardinality.

**The four metric types:**
- **Counter** -- monotonically increasing (resets to 0 on restart). Requests served, bytes sent. You query its \`rate()\`, never its raw value.
- **Gauge** -- goes up and down. Queue depth, temperature, in-flight requests, memory used.
- **Histogram** -- samples observations into cumulative buckets (\`_bucket{le="0.1"}\`, \`le="0.5"\`, ...) plus \`_sum\` and \`_count\`. Aggregatable across instances; quantiles computed at query time.
- **Summary** -- computes quantiles client-side into a \`{quantile="0.99"}\` series. Cheap to read but **not aggregatable across instances** (you cannot average pre-computed percentiles).

**PromQL basics:**
- \`rate(http_requests_total[5m])\` -- per-second average increase of a counter over 5m (handles resets).
- \`histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))\` -- p99 latency from histogram buckets.
- Aggregation: \`sum by (route) (rate(...))\`, \`avg\`, \`max\`, \`count\`, \`topk\`.

**RED method** (for request-driven services): **R**ate, **E**rrors, **D**uration. **USE method** (for resources): **U**tilization, **S**aturation, **E**rrors. RED tells you the service is hurting; USE tells you which resource is the cause.`,

    internals: `- **Why rate() not the raw counter:** counters reset to 0 on process restart. \`rate()\`/\`increase()\` detect resets and extrapolate over the range, so restarts do not look like a giant negative spike. Always graph the rate.
- **Why histograms beat averages for latency:** an average hides the tail. If 99 requests take 10ms and one takes 5s, the mean is ~60ms -- looks fine, but a user waited 5s. Histograms preserve the distribution so you can compute p50/p95/p99 and see the tail that hurts users.
- **Histogram vs summary:** histograms are aggregatable (sum buckets across pods, then compute the quantile) but quantile accuracy depends on bucket boundaries you chose up front. Summaries give exact client-side quantiles but cannot be aggregated -- averaging two p99s is mathematically meaningless. Prefer histograms in distributed systems.
- **Cardinality explosion:** total series = product of label value counts. \`route\` (20) x \`status\` (5) x \`method\` (4) = 400 -- fine. Add \`user_id\` (1M) and you have 400M series; Prometheus holds active series in memory, so this OOMs the server. Bound every label.
- **Recording rules** pre-compute expensive/frequent PromQL into new series on a schedule, so dashboards and alerts read cheap. **Alerting rules** evaluate a PromQL expression and, when true \`for\` a duration, fire an alert to Alertmanager (which handles routing, grouping, silencing).
- **Scraping/exporters:** apps expose metrics via a client library; for systems you cannot modify (node OS, Postgres, Redis) you run an **exporter** that translates their stats into the Prometheus format.`,

    diagram: {
      title: "Prometheus scrape-and-query pipeline",
      layers: [
        { id: "targets", label: "Targets + exporters", sub: "expose /metrics (counter/gauge/histogram/summary)" },
        { id: "scrape", label: "Prometheus pull", sub: "scrape every ~15s, store time series" },
        { id: "rules", label: "Recording + alerting rules", sub: "precompute series; evaluate alert exprs" },
        { id: "promql", label: "PromQL", sub: "rate, histogram_quantile, sum by (...)" },
        { id: "consumers", label: "Dashboards + Alertmanager", sub: "Grafana panels, paging/routing" },
      ],
      caption: "Pull-scrape into time series, PromQL to query, rules to precompute/alert, Grafana + Alertmanager to consume.",
    },

    realWorld: `A team graphs \`avg(http_request_duration_seconds)\` and it sits at a calm 80ms all week. Users complain the app is "sometimes unbearably slow." Switching to \`histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))\` reveals p99 spiking to 6s every few minutes -- garbage-collection pauses invisible in the mean. Separately, an engineer adds \`customer_id\` as a label "just to slice by tenant." Series count jumps from 50k to 12M overnight and Prometheus OOM-kills mid-incident. Both are textbook: use histograms for latency, and never label by an unbounded dimension.`,

    production: `- **Instrument every service with RED**; instrument every resource with USE.
- **Use histograms for latency**, with buckets chosen around your SLO thresholds (e.g. le=0.1, 0.3, 0.5, 1, 2.5).
- **Audit cardinality**: alert on \`prometheus_tsdb_head_series\` growth; forbid user/request/email/URL labels in review.
- **Precompute hot queries with recording rules** so dashboards and burn-rate alerts stay fast.
- **Alert on symptoms (RED / SLO burn rate), page on user pain**, ticket on slow degradation -- route via Alertmanager with grouping and silences.
- **Run exporters** (node_exporter, postgres_exporter, etc.) for infra you cannot instrument directly.`,

    commonMistakes: [
      "Graphing averages for latency instead of histogram quantiles -- the tail (p99) that hurts users is invisible in the mean.",
      "Reading a counter's raw value instead of its rate() -- restarts create fake negative cliffs.",
      "Adding an unbounded label (user_id, request_id, email, full URL) -- cardinality explosion OOMs Prometheus.",
      "Using summaries where you need cross-instance aggregation -- you cannot average pre-computed quantiles.",
      "Alerting on every metric threshold instead of RED symptoms / SLO burn rate -- alert fatigue and ignored pages.",
      "Choosing histogram buckets unrelated to your SLO, so quantile estimates are inaccurate where it matters.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Histogram for latency | Aggregatable, query-time quantiles, sees the tail | Bucket boundaries fixed up front; more series |
| Summary for latency | Exact client-side quantiles, few series | Not aggregatable across instances |
| More labels (dimensions) | Finer slicing | Cardinality cost; can OOM the server |
| Recording rules | Fast dashboards/alerts | Extra config; precomputed series to maintain |
| Pull model | Prometheus controls load, free up/down detection | Short-lived jobs need Pushgateway |`,

    whenToUse: [
      "Numeric time-series monitoring: rates, errors, latencies, resource utilization.",
      "SLO measurement and multi-window burn-rate alerting.",
      "Any request service (RED) or resource (USE) you need to graph and alert on.",
    ],
    whenNotToUse: [
      "Per-request or per-user forensic detail (use logs/traces -- do not encode it in labels).",
      "Very high-cardinality event analytics (use a logs/events store, not Prometheus).",
      "Precise event-by-event billing/audit records (metrics are sampled/aggregated, not a ledger).",
    ],

    code: [
      {
        label: "PromQL: RED metrics (rate, errors, duration)",
        language: "promql",
        code: `# Rate: requests per second by route (last 5m)
sum by (route) (rate(http_requests_total[5m]))

# Errors: 5xx error ratio by route
sum by (route) (rate(http_requests_total{status_class="5xx"}[5m]))
  /
sum by (route) (rate(http_requests_total[5m]))

# Duration: p99 latency from a histogram (aggregate buckets, then quantile)
histogram_quantile(
  0.99,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))
)`,
      },
      {
        label: "PromQL: recording rule + alerting rule",
        language: "yaml",
        code: `groups:
  - name: red.rules
    interval: 30s
    rules:
      # Recording rule: precompute the expensive p99 so dashboards/alerts are cheap
      - record: job:http_request_duration_seconds:p99
        expr: |
          histogram_quantile(
            0.99,
            sum by (le, job) (rate(http_request_duration_seconds_bucket[5m]))
          )
  - name: red.alerts
    rules:
      # Alerting rule: page if p99 stays above 1s for 10 minutes
      - alert: HighP99Latency
        expr: job:http_request_duration_seconds:p99 > 1
        for: 10m
        labels: { severity: page }
        annotations:
          summary: "p99 latency above 1s on {{ $labels.job }}"`,
      },
      {
        label: "USE method (resource saturation)",
        language: "promql",
        code: `# Utilization: CPU busy fraction per node
1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

# Saturation: run-queue / load pressure (work waiting)
node_load1 / count by (instance) (node_cpu_seconds_total{mode="idle"})

# Errors: NIC receive errors per second
rate(node_network_receive_errs_total[5m])`,
      },
    ],

    memoryCard: {
      problem: "Measure a system numerically so you can graph, SLO, and alert -- without blowing up your own monitoring.",
      mentalModel: "A robot visiting each service's odometer page every 15s; you ask about rates and distributions, not raw values.",
      keyConcepts: ["pull scrape + labels", "counter/gauge/histogram/summary", "rate() + histogram_quantile()", "RED (services) + USE (resources)", "cardinality = product of label values"],
      productionConnection: "Histograms bucketed around SLOs, RED/USE coverage, recording rules for speed, burn-rate alerts via Alertmanager, strict cardinality review.",
      oneLiner: "Prometheus pulls labeled time series; use rate() and histogram_quantile() with RED/USE, and never let cardinality explode.",
    },

    quiz: [
      {
        id: "pm-q1",
        prompt: "Why compute p99 latency from a histogram instead of graphing the average?",
        choices: [
          { text: "Averages are slower to query", correct: false },
          { text: "The average hides the tail -- a few very slow requests that users feel are invisible in the mean", correct: true },
          { text: "Prometheus cannot compute averages", correct: false },
          { text: "Histograms use less storage than averages", correct: false },
        ],
        explanation: "A mean smooths over outliers: 99 fast requests and 1 five-second request still average to a healthy-looking number. Histograms preserve the distribution so you can see p95/p99 -- the tail latency users actually experience.",
      },
      {
        id: "pm-q2",
        prompt: "Which metric type should you use for latency in a distributed service where you aggregate across many instances?",
        choices: [
          { text: "Summary -- it gives exact quantiles per instance", correct: false },
          { text: "Histogram -- buckets are aggregatable, so you sum across instances then compute the quantile", correct: true },
          { text: "Counter -- rate() gives you the percentile", correct: false },
          { text: "Gauge -- set it to the current latency", correct: false },
        ],
        explanation: "Summaries compute quantiles client-side and cannot be aggregated (averaging two p99s is meaningless). Histogram buckets sum across instances, and histogram_quantile computes the percentile from the aggregate at query time.",
      },
      {
        id: "pm-q3",
        prompt: "What does the RED method tell you to measure for a request-driven service?",
        choices: [
          { text: "Reads, Edits, Deletes", correct: false },
          { text: "Rate, Errors, Duration", correct: true },
          { text: "Reliability, Efficiency, Durability", correct: false },
          { text: "Requests, Endpoints, Databases", correct: false },
        ],
        explanation: "RED = Rate (throughput), Errors (failure rate), Duration (latency distribution). It is the standard service-health triplet; USE (Utilization, Saturation, Errors) is its counterpart for resources.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Write RED PromQL and catch a cardinality bug",
      brief: "For an HTTP service, write the three RED queries, then diagnose why adding one label took Prometheus down.",
      steps: `1. Rate: sum by (route) (rate(http_requests_total[5m])).\n2. Errors: 5xx rate divided by total rate, by route.\n3. Duration: histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))).\n4. A dev added label user_id; explain the series-count math (product of label values) and why it OOMs.\n5. Propose the fix: move user_id to logs/traces, keep only bounded labels on metrics.`,
      successCriteria: ["Correct rate() usage", "p99 via histogram_quantile with le aggregation", "Explains cardinality = product of label values", "Moves high-cardinality data off metrics"],
    },
  },

  {
    slug: "distributed-tracing",
    title: "Distributed Tracing",
    track: "shared",
    phase: "observability",
    module: "o11y-core",
    difficulty: "advanced",
    estMinutes: 25,
    summary:
      "A trace is the timed, causal tree of one request as it crosses services. Propagated trace context (W3C traceparent) links parent/child spans; OpenTelemetry standardizes instrumentation; sampling controls the cost of keeping it all.",
    prerequisites: ["three-pillars", "http-lifecycle"],
    relatedConcepts: ["prometheus-metrics", "slo-sli-error-budgets", "incident-response", "sre-principles"],
    tags: ["tracing", "opentelemetry", "spans", "traceparent", "sampling", "observability"],

    why: `In a monolith, a slow request is one stack trace away. In microservices, a single click fans out to 20 services and 40 network calls -- and "the request was slow" tells you nothing about *which hop* ate the time or *why*. **Distributed tracing reconstructs the end-to-end journey of one request across process boundaries**, so instead of correlating timestamps across a dozen log files by hand, you see a single waterfall: this service took 2ms, that one 3.1s, and here is the exact span that blocked.`,

    intuition: `A trace is a **tree of timed work**. The whole request is the tree; each unit of work (an HTTP handler, a DB query, an outbound call) is a **span** with a start time, duration, and attributes. When service A calls service B, A creates a span and passes its identity along in an HTTP header; B's span records A's span as its **parent**. Rendered as a waterfall, the tree makes latency obvious: the longest bar is your bottleneck, and gaps between bars are queueing or network time. The invariant that makes it work: **the trace ID travels with the request** so every service, in every process, tags its spans with the same ID.`,

    howItWorks: `**Spans and traces:** a **span** = one operation (name, start, duration, status, key/value attributes, events). A **trace** = all spans sharing one **trace ID**, linked into a tree by parent span IDs. The first span (no parent) is the **root**.

**Context propagation:** the trace ID and current span ID must cross the network with the request. The **W3C Trace Context** standard defines the \`traceparent\` HTTP header:
\`traceparent: 00-\${trace_id}-\${parent_span_id}-\${flags}\`
The four dash-separated fields are version, 16-byte trace ID, 8-byte parent span ID, and trace flags (e.g. the sampled bit). The receiving service parses it, makes its span a child, and forwards an updated header to the next hop. Without propagation you get disconnected single-service spans, not a trace.

**OpenTelemetry (OTel):** the vendor-neutral standard -- APIs, SDKs, semantic conventions, and the Collector -- for generating and exporting traces (and metrics/logs). Auto-instrumentation hooks common frameworks (HTTP servers/clients, DB drivers) so you get spans without hand-writing them; manual spans cover custom business logic.

**Sampling** (you rarely keep 100%):
- **Head-based:** decide at the root, before you know the outcome (e.g. keep 1%). Cheap and simple, but you throw away most errors/slow requests along with the boring ones.
- **Tail-based:** buffer all spans of a trace, then decide *after* it completes -- keep it if it errored or was slow, drop routine successes. Far more useful data, but needs a Collector holding spans in memory until the trace finishes.

Sampling decisions propagate via the \`traceparent\` flags so every service in a trace agrees to keep or drop it.`,

    internals: `- **traceparent format precisely:** \`00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01\`. Fields: version \`00\`; trace-id (32 hex = 16 bytes, must be non-zero); parent-id / current span-id (16 hex = 8 bytes); trace-flags \`01\` = sampled. A companion \`tracestate\` header carries vendor-specific key/values.
- **Spans nest but also branch:** parallel downstream calls become sibling child spans; gaps between a parent and its children reveal serialization vs. concurrency.
- **Instrumentation overhead is real but modest:** creating spans and attributes costs CPU/memory; the bigger cost is *exporting and storing* them, which is why sampling exists. Async batch exporters and the Collector keep the hot path fast.
- **Traces vs logs:** a log is a point-in-time event; a span is a duration with parent/child structure. Traces answer "where did the time go across services," which unstructured logs cannot. Best practice is to stamp \`trace_id\`/\`span_id\` into structured logs so you can pivot from a span to its logs.
- **Clock skew** across hosts can make child spans appear to start before parents; good backends account for this, but do not over-trust sub-millisecond cross-host timing.
- **Sampling and correctness:** because most traces are dropped, traces are for *debugging exemplars*, not for computing exact rates -- use metrics for counts/percentiles, traces for the anatomy of individual requests.`,

    diagram: {
      title: "One request, a tree of spans across services",
      layers: [
        { id: "root", label: "Root span (gateway)", sub: "trace_id created, no parent" },
        { id: "propagate", label: "traceparent header", sub: "00-<trace_id>-<span_id>-<flags> forwarded" },
        { id: "children", label: "Child spans (svcs, DB)", sub: "each parented, same trace_id" },
        { id: "sampling", label: "Sampling decision", sub: "head (upfront) vs tail (keep errors/slow)" },
        { id: "waterfall", label: "Waterfall + correlation", sub: "longest bar = bottleneck; pivot to logs via trace_id" },
      ],
      caption: "The trace ID rides the traceparent header across services; spans form a waterfall that localizes latency.",
    },

    realWorld: `A search endpoint's p99 is 4s but every individual service dashboard looks healthy. A single trace tells the story: the gateway span is 4s, and inside it, three downstream calls that *should* run in parallel are actually sequential -- each waits for the prior to finish because of a misplaced \`await\`. No metric showed this; the waterfall made the serialization obvious at a glance. With tail-based sampling the team had kept exactly the slow traces and dropped the millions of fast ones, so the storage bill stayed sane while the useful evidence survived.`,

    production: `- **Adopt OpenTelemetry** for vendor-neutral instrumentation; lean on auto-instrumentation, add manual spans for critical business logic.
- **Propagate W3C traceparent everywhere**, including through queues and background jobs, or the trace breaks at the boundary.
- **Use tail-based sampling** to keep errors and slow traces while dropping routine ones; run an OTel Collector to do it centrally.
- **Stamp trace_id/span_id into structured logs** so you can pivot span -> logs in one click.
- **Watch overhead**: batch/async export, cap attribute sizes, and keep the sampling rate honest -- traces are exemplars, not a source of exact counts (that is metrics).`,

    commonMistakes: [
      "Not propagating context (dropping the traceparent header across a hop, queue, or thread) -- the trace fragments into disconnected single-service spans.",
      "Head sampling at a low rate and then wondering why you have no traces for the errors you care about (tail sampling keeps the interesting ones).",
      "Using traces to compute exact request rates/percentiles -- sampling makes them statistically wrong; that is what metrics are for.",
      "Putting huge payloads or secrets into span attributes -- cost and security blowup.",
      "Instrumenting everything at 100% and paying an enormous storage bill for traces nobody reads.",
      "No trace_id in logs, so you cannot pivot from a slow span to its error line.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Head sampling | Simple, cheap, decide once at root | Drops most errors/slow traces blindly |
| Tail sampling | Keeps errors + slow traces, drops noise | Needs Collector buffering; more infra |
| 100% retention | Every trace available | Very high storage/export cost |
| Auto-instrumentation | Fast coverage of frameworks | Generic spans; misses custom logic |
| Manual spans | Precise business-level detail | Engineering effort to add/maintain |`,

    whenToUse: [
      "Debugging latency across a multi-service request path.",
      "Finding serialization, fan-out, and retry-storm problems no single-service view reveals.",
      "Understanding dependencies and the critical path of a distributed request.",
    ],
    whenNotToUse: [
      "Computing exact request rates or percentiles (sampled -- use metrics).",
      "Simple single-process apps where a stack trace already localizes the problem.",
      "As a substitute for structured logs when you need full per-event detail.",
    ],

    code: [
      {
        label: "OpenTelemetry manual span (Node/TypeScript)",
        language: "typescript",
        code: `import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("checkout-svc");

async function chargeCard(order: Order) {
  // Child span nests under whatever span is active in the current context.
  return tracer.startActiveSpan("charge_card", async (span) => {
    span.setAttribute("order.id", order.id);
    span.setAttribute("payment.provider", "stripe");
    try {
      const result = await paymentClient.charge(order);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      // Record the failure ON the span so the trace shows where it broke.
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
}`,
      },
      {
        label: "W3C trace context on the wire",
        language: "http",
        code: `POST /v1/charge HTTP/1.1
Host: payments-svc
Content-Type: application/json

# version-traceid(16B/32hex)-parentspanid(8B/16hex)-flags(01=sampled)
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
# optional vendor-specific state
tracestate: rojo=00f067aa0ba902b7,congo=t61rcWkgMzE

# The receiver parses traceparent, creates a CHILD span (new span id,
# SAME trace id), and forwards an updated traceparent to the next hop.`,
      },
    ],

    memoryCard: {
      problem: "Find where a single request spent its time as it fans out across many services.",
      mentalModel: "A tree of timed spans; the trace ID rides an HTTP header (traceparent) so every service tags its work with the same id, forming a waterfall.",
      keyConcepts: ["span (timed op) + trace (tree)", "W3C traceparent propagation", "parent/child + root span", "head vs tail sampling", "OpenTelemetry + Collector"],
      productionConnection: "OTel auto+manual instrumentation, traceparent propagated everywhere, tail sampling to keep errors/slow, trace_id in structured logs.",
      oneLiner: "A trace is the timed span-tree of one request; traceparent propagates the trace ID across services and sampling decides which traces to keep.",
    },

    quiz: [
      {
        id: "dt-q1",
        prompt: "What is the role of the W3C traceparent header?",
        choices: [
          { text: "It authenticates the request between services", correct: false },
          { text: "It carries the trace ID and parent span ID across the network so downstream spans join the same trace", correct: true },
          { text: "It compresses the request body", correct: false },
          { text: "It tells Prometheus which metric to increment", correct: false },
        ],
        explanation: "traceparent (version-traceid-parentspanid-flags) propagates trace context across service boundaries. The receiver makes its span a child with the same trace ID, so spans across processes stitch into one trace. Without it, the trace fragments.",
      },
      {
        id: "dt-q2",
        prompt: "Why prefer tail-based sampling over head-based sampling?",
        choices: [
          { text: "It is cheaper because it decides earlier", correct: false },
          { text: "It decides after the trace completes, so it can keep errored/slow traces and drop routine ones", correct: true },
          { text: "It keeps 100% of traces with no cost", correct: false },
          { text: "It avoids needing a Collector", correct: false },
        ],
        explanation: "Head sampling decides at the root before the outcome is known, so a low rate discards most errors. Tail sampling buffers the whole trace and keeps the interesting ones (errors, high latency), giving far more useful data -- at the cost of Collector buffering.",
      },
      {
        id: "dt-q3",
        prompt: "Why should you NOT use sampled traces to compute exact request rates or p99 latency?",
        choices: [
          { text: "Traces do not record durations", correct: false },
          { text: "Sampling keeps only a subset of requests, so counts/percentiles derived from them are statistically skewed -- use metrics instead", correct: true },
          { text: "Traces are stored as strings", correct: false },
          { text: "PromQL cannot read traces", correct: false },
        ],
        explanation: "Because most traces are dropped by sampling, they are debugging exemplars for individual requests, not a complete population. Exact rates and percentiles come from metrics (e.g. Prometheus histograms), which aggregate all requests.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Trace a slow request end to end",
      brief: "Given a 4s search request across a gateway and three services, use spans, propagation, and sampling to localize the bottleneck.",
      steps: `1. Identify the root span (gateway, no parent) and its total duration.\n2. Read the traceparent format: 00-<trace_id>-<span_id>-<flags>; confirm each child shares the trace_id.\n3. In the waterfall, find the longest bar and whether siblings run sequentially vs in parallel.\n4. Choose a sampling strategy that keeps this slow trace (tail) and explain why head sampling might have dropped it.\n5. Pivot from the slow span to logs using trace_id to read the exact error.`,
      successCriteria: ["Finds root span + bottleneck bar", "Reads traceparent fields correctly", "Justifies tail sampling for the slow trace", "Pivots span->logs via trace_id"],
    },
  },
];
