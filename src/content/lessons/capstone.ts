import type { Lesson } from "../types";

export const capstoneLessons: Lesson[] = [
  {
    slug: "capstone-architecture",
    title: "Capstone: The Full Architecture",
    track: "shared",
    phase: "capstone",
    module: "capstone-core",
    difficulty: "expert",
    estMinutes: 35,
    summary:
      "Assemble everything -- networking, load balancing, caching, databases, queues, workers, and object storage -- into one coherent, defensible production architecture, with every component justified by a requirement and a trade-off.",
    prerequisites: ["system-design-framework", "scaling-reads-writes", "sharding-partitioning", "load-balancing"],
    relatedConcepts: ["estimation-back-of-envelope", "consistency-models", "idempotency-retries", "slo-sli-error-budgets", "capstone-operate-under-failure"],
    tags: ["capstone", "architecture", "system-design", "end-to-end", "production", "trade-offs"],

    why: `Knowing each component in isolation -- TCP, load balancers, caches, Postgres, Kafka, workers, S3 -- is necessary but not sufficient. Real engineering is **composing them into one coherent system** where every piece has a job, the data flows make sense, and the whole thing survives failure and scales. The capstone exists to prove you can do that synthesis: take the framework, the estimates, and the individual building blocks, and produce a full architecture you can defend end to end.

This matters because the gap between "I know what a message queue is" and "I know exactly why *this* queue sits *here* absorbing *this* spike, at the cost of *this* eventual consistency" is the gap between a junior and a senior engineer. **A good architecture is not a pile of trendy components; it is a chain of justified trade-offs, each tied to a requirement.** The capstone forces you to make that chain explicit for the canonical production stack -- the one you will see, in some form, behind almost every large system: an edge layer, an entry layer, an application layer, a data layer, and an async layer.`,

    intuition: `Think of the full architecture as a **city's infrastructure**, where each layer does one job and hands off to the next.

- The **CDN** is the network of local corner shops -- most people get what they need nearby without ever going downtown.
- The **load balancer** is the traffic system at the city entrance, spreading arriving cars across roads and away from closed ones.
- The **API gateway** is the security checkpoint and directory -- checks your credentials, points you to the right district.
- The **services** are the districts, each specializing in one kind of work.
- The **cache (Redis)** is the info kiosk with the most-asked answers ready instantly; the **database (Postgres)** is the official records office, authoritative but slower.
- The **queue (Kafka)** is the postal system -- drop off a task and move on; it gets handled reliably later.
- The **workers** are the back-office staff processing that mail asynchronously.
- The **object storage (S3)** is the giant warehouse for bulky items (files, images, backups).

No single building runs the city; the *arrangement* does. The capstone is designing that arrangement so it flows, scales, and does not collapse when one district has a fire.`,

    howItWorks: `A production architecture is best understood as **layers, each solving a specific problem, connected by clear data flows.**

### The request path (synchronous)
1. **CDN / edge:** serves static assets and cacheable responses from locations near the user, absorbing the bulk of read traffic and cutting latency. Only cache-misses and dynamic requests continue.
2. **Load balancer:** spreads incoming connections across healthy application instances (health checks, draining), terminating TLS. Turns N instances into one virtual service.
3. **API gateway:** the single entry point for dynamic traffic -- authentication/authorization, rate limiting, routing to the right service, request shaping, and observability.
4. **Services (stateless):** the application logic, horizontally scalable behind the LB/gateway because they hold no local state.
5. **Data layer:**
   - **Cache (Redis):** absorbs hot reads (cache-aside), holds sessions/counters, protects the database.
   - **Database (Postgres):** the durable source of truth, with a primary for writes and read replicas for read scaling; sharded if writes exceed one node.

### The async path (decoupled)
6. **Message queue / log (Kafka):** the service publishes events instead of doing slow work inline -- fan-out, emails, indexing, analytics. Absorbs spikes, decouples producers from consumers.
7. **Workers:** consume from Kafka and do the heavy, deferrable work asynchronously (idempotently, since delivery is at-least-once).
8. **Object storage (S3):** stores large blobs -- uploads, images, exports, backups -- cheaply and durably, usually served back through the CDN.

### The unifying principle
**Each layer exists to protect or offload the next.** The CDN protects the LB; the cache protects the DB; the queue protects the request path from slow work. You justify each by a requirement (scale, latency, availability, decoupling) and accept its trade-off (staleness, eventual consistency, operational complexity).`,

    internals: `- **Stateless services are the linchpin.** Because they hold no local state, you can run many identical instances behind the LB, scale horizontally, and lose any one without losing data. All state lives in the data and async layers. This is what makes the whole horizontal-scaling story work.
- **Each layer offloads the next, in order of cost.** A CDN hit is ~free; a cache hit is cheap; a DB query is expensive; a cross-shard query is very expensive. The architecture is a funnel that keeps most traffic in the cheap layers.
- **Read path vs write path diverge (scaling reads/writes):** reads flow CDN -> cache -> replica; writes flow gateway -> service -> primary -> (event) -> Kafka -> workers. Design them separately.
- **The cache is a shield, not just a speedup.** Its most important job under load is protecting the database from being overwhelmed; a cache stampede on expiry can take down the DB, so use TTL jitter and request coalescing.
- **Kafka gives durability + replay + decoupling**, not just async. Because it is a durable log, a crashed worker can resume, and you can reprocess history. Consumers must be idempotent (at-least-once).
- **Consistency is chosen per domain (CAP/consistency models):** the ledger uses the strongly-consistent primary; the feed and search index are eventually consistent, updated via Kafka. Same system, different guarantees per data domain.
- **Every arrow is a failure boundary.** The DB can be down, the cache can be cold, Kafka can lag, S3 can throttle. A real architecture defines what happens at each boundary (covered in the operate-under-failure capstone).
- **Object storage + CDN is the standard blob pattern:** never stream large files through your services; store in S3, serve via CDN, keep only metadata in the DB.
- **Observability spans all layers:** metrics, logs, and traces at the edge, gateway, services, and workers -- you cannot operate what you cannot see, and SLOs are measured at the edge (closest to the user).`,

    diagram: {
      title: "The full production stack (request path + async path)",
      layers: [
        { id: "edge", label: "CDN / Edge", sub: "static + cacheable responses near users; absorbs most reads" },
        { id: "entry", label: "Load Balancer -> API Gateway", sub: "TLS term, health checks, authn/z, rate limit, routing" },
        { id: "app", label: "Stateless Services", sub: "horizontal scale; hold no local state" },
        { id: "data", label: "Redis + Postgres", sub: "cache shields the DB; primary for writes, replicas for reads, shard if needed" },
        { id: "async", label: "Kafka -> Workers -> S3", sub: "durable log decouples slow work; idempotent workers; blobs in object storage" },
      ],
      caption: "A funnel of layers, each protecting the next: CDN -> LB -> gateway -> services -> Redis/Postgres -> Kafka -> workers -> S3. Every arrow is a justified trade-off and a failure boundary.",
    },

    realWorld: `Design a photo-sharing backend end to end. Estimation (from the framework) says it is heavily read-heavy with petabytes of images, so the shape is dictated by numbers, not taste. **Upload (write path):** client -> CDN (miss, dynamic) -> LB -> API gateway (auth, rate limit) -> upload service, which streams the image to **S3** (never through the service's memory), writes metadata to **Postgres** (primary), and publishes a \`photo.uploaded\` event to **Kafka**. **Workers** consume it to generate thumbnails (stored back in S3), update the search index, and fan out to followers' feeds -- all async and idempotent, so a retry never double-processes. **View (read path):** client -> **CDN** serves the image and thumbnails directly (absorbing the vast majority of traffic); dynamic feed requests hit the LB -> gateway -> feed service -> **Redis** (hot feeds) -> **Postgres replica** on miss. The ledger of who-follows-whom is strongly consistent (primary); the feed and search index are eventually consistent (via Kafka). **Every component earns its place:** S3 for cheap durable blobs, CDN because 25 GB/s of egress cannot come from origin, Redis to shield the DB, Kafka to absorb fan-out spikes and decouple slow work. That justified chain is the deliverable.`,

    production: `- **Keep services stateless;** put all state in the data and async layers so you can scale and lose instances freely.
- **Make each layer protect the next:** CDN in front of the LB, cache in front of the DB, queue in front of slow work. Verify the cheap layers absorb most traffic.
- **Design the read and write paths separately** (they use different tools) and choose consistency per data domain (strong for money/relationships, eventual for feeds/search).
- **Store blobs in object storage and serve via CDN;** keep only metadata in the relational DB -- never stream large files through your services.
- **Publish events to a durable log (Kafka) for anything slow or fan-out-heavy** and make every consumer idempotent (at-least-once delivery).
- **Protect the cache path** (TTL jitter, request coalescing) so an expiry stampede cannot take down the database.
- **Instrument every layer** and measure SLOs at the edge; you operate what you can see.
- **Justify every component in the design doc with a requirement and a trade-off,** and name the failure behavior at each boundary (the operate-under-failure capstone builds on this).
- **Start with the simplest correct version** and add layers (cache, replicas, shards, queue) only when the estimated numbers force them.`,

    commonMistakes: [
      "Adding trendy components (Kafka, microservices, sharding) without a requirement forcing them -- an unjustified pile, not an architecture.",
      "Putting state in the services, breaking horizontal scaling and losing data when an instance dies.",
      "Streaming large files through application services instead of storing them in object storage and serving via CDN.",
      "Treating the cache as only a speedup and ignoring its role as a database shield (no stampede protection).",
      "Using the same consistency guarantee everywhere instead of choosing per data domain.",
      "Non-idempotent workers on an at-least-once queue, so retries duplicate side effects.",
      "Designing one generic path instead of separate read and write paths with their different tools.",
      "No observability across layers, so failures are invisible until users complain.",
    ],

    tradeoffs: `| Layer / choice | Buys you | Costs you |
|---|---|---|
| CDN / edge | Massive read offload, low global latency | Only cacheable content; invalidation to manage |
| Load balancer + gateway | HA, routing, auth, rate limit | Extra hops; a critical path to keep healthy |
| Stateless services | Free horizontal scaling | All state pushed to data/async layers |
| Redis cache | Cheap fast reads, DB shield | Staleness, invalidation, stampede risk |
| Postgres primary + replicas | Durable truth + read scaling | Replication lag; shard needed for write scale |
| Kafka + workers | Spike absorption, decoupling, replay | Eventual consistency, ordering, must be idempotent |
| S3 object storage | Cheap, durable blob storage | Higher latency than local; served via CDN |`,

    whenToUse: [
      "Designing or reviewing any large, read-heavy, blob-and-event-driven production system (social, media, marketplace, SaaS).",
      "Justifying an architecture end to end in a design doc or interview, component by component.",
      "Onboarding to an existing system: map it onto these layers to understand where each concern lives.",
    ],
    whenNotToUse: [
      "Small or early-stage systems where a monolith + one database is correct -- do not build the full stack prematurely.",
      "Workloads that are not read-heavy or blob/event-driven, where this canonical shape is a poor fit.",
      "As a checklist to include every layer regardless of need -- each must be justified by a requirement.",
    ],

    code: [
      {
        label: "Write path: durable truth + blob in S3 + event to Kafka",
        language: "typescript",
        code: `// Upload service: source of truth in Postgres, blob in S3, slow work deferred to Kafka.
async function uploadPhoto(userId: string, file: FileStream, idempotencyKey: string) {
  if (await seen(idempotencyKey)) return existingResult(idempotencyKey); // safe retries

  const s3Key = \`photos/\${userId}/\${uuid()}\`;
  await s3.putObject(s3Key, file);                       // blob NEVER lives in the DB or service memory
  const photoId = await db.primary.insertPhoto({ userId, s3Key }); // metadata -> durable truth

  await kafka.publish("photo.uploaded", {               // defer thumbnails, indexing, fan-out
    photoId, userId, s3Key, key: photoId,               // 'key' for consumer idempotency
  });
  await remember(idempotencyKey, { photoId });
  return { photoId };                                    // fast ack; heavy work happens async
}`,
      },
      {
        label: "Read path: CDN-first, then cache, then replica (funnel)",
        language: "typescript",
        code: `// Feed read: each layer offloads the next, cheapest first.
async function getFeed(userId: string): Promise<Feed> {
  // Images/thumbnails are served directly by the CDN from S3 URLs -- never through here.
  const cacheKey = "feed:" + userId;
  const hot = await redis.get(cacheKey);                 // Redis shields the database
  if (hot) return JSON.parse(hot);

  return singleFlight(cacheKey, async () => {            // coalesce misses -> no stampede
    const feed = await db.replica.getFeed(userId);       // reads go to a REPLICA (eventually consistent)
    const ttl = 60 + Math.floor(Math.random() * 30);    // TTL jitter avoids synchronized expiry
    await redis.set(cacheKey, JSON.stringify(feed), "EX", ttl);
    return feed;
  });
}`,
      },
    ],

    memoryCard: {
      problem: "Compose individual components into one coherent production system where every piece is justified and the whole scales and survives failure.",
      mentalModel: "A city's infrastructure: CDN corner-shops, LB traffic system, gateway checkpoint, service districts, Redis info-kiosk, Postgres records office, Kafka postal system, worker back-office, S3 warehouse -- each does one job and hands off.",
      keyConcepts: ["layered funnel: CDN->LB->gateway->services->Redis/Postgres->Kafka->workers->S3", "each layer protects/offloads the next", "stateless services enable horizontal scale", "separate read and write paths", "consistency per data domain", "idempotent workers, blobs in object storage + CDN"],
      productionConnection: "The canonical production stack behind most large systems; every component is chosen from an estimate and defended with a trade-off, and each arrow is a failure boundary.",
      oneLiner: "A production architecture is a funnel of layers -- CDN, LB, gateway, stateless services, cache, DB, queue, workers, object storage -- each protecting the next and each justified by a requirement and its trade-off.",
    },

    quiz: [
      {
        id: "cap-arch-q1",
        prompt: "Why are the application services in this architecture designed to be stateless?",
        choices: [
          { text: "To make them faster to compile", correct: false },
          { text: "So many identical instances can run behind the load balancer, scale horizontally, and be lost without losing data -- all state lives in the data/async layers", correct: true },
          { text: "Because stateless services do not need a database", correct: false },
          { text: "So they can cache everything locally", correct: false },
        ],
        explanation: "Statelessness is the linchpin of horizontal scaling: any instance can serve any request and can fail without data loss, because state is externalized to Redis, Postgres, Kafka, and S3.",
      },
      {
        id: "cap-arch-q2",
        prompt: "What is the unifying principle that justifies each layer (CDN, cache, queue)?",
        choices: [
          { text: "Each layer uses a different programming language", correct: false },
          { text: "Each layer exists to protect or offload the next, keeping most traffic in the cheaper layers", correct: true },
          { text: "Each layer is required by cloud providers", correct: false },
          { text: "Each layer stores a full copy of the database", correct: false },
        ],
        explanation: "The CDN offloads the LB, the cache shields the DB, and the queue keeps slow work off the request path. The architecture is a funnel that keeps most traffic in cheap layers and protects expensive ones.",
      },
      {
        id: "cap-arch-q3",
        prompt: "Why are large image files stored in S3 and served via the CDN rather than through the services?",
        choices: [
          { text: "S3 is the only place files can be stored", correct: false },
          { text: "Object storage is cheap and durable for blobs, and the CDN serves them at scale/low latency without streaming huge files through app services or the DB", correct: true },
          { text: "Because the database cannot store any binary data", correct: false },
          { text: "To avoid using a load balancer", correct: false },
        ],
        explanation: "Streaming large blobs through services wastes memory and bandwidth. The standard pattern is: store blobs in object storage, keep only metadata in the DB, and serve the blobs through the CDN.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design the full architecture for a given product",
      brief: "Pick a product (e.g. a video platform, a marketplace, or a chat app) and produce a complete, justified end-to-end architecture across all layers.",
      steps: `1. Run the framework: 2-3 core requirements + non-functional numbers, then estimate read/write QPS, storage, and bandwidth.\n2. Map the request (read) path: CDN -> LB -> gateway -> service -> Redis -> Postgres replica. State what each layer offloads.\n3. Map the write path: gateway -> service -> Postgres primary + S3 (for blobs) -> Kafka -> idempotent workers. State what is done async and why.\n4. Choose consistency per data domain (strong vs eventual) and justify each.\n5. For EVERY component, write one sentence: the requirement it satisfies and the trade-off you accept.\n6. Draw the final diagram and mark each arrow as a failure boundary (to be handled in the operate-under-failure capstone).`,
      successCriteria: [
        "Read and write paths mapped separately across all layers, driven by an estimate",
        "Every component justified with a requirement AND its trade-off (no unjustified boxes)",
        "Consistency chosen per data domain; blobs in object storage + CDN; workers idempotent",
      ],
    },
  },

  {
    slug: "capstone-operate-under-failure",
    title: "Capstone: Operate Under Failure",
    track: "shared",
    phase: "capstone",
    module: "capstone-core",
    difficulty: "expert",
    estMinutes: 35,
    summary:
      "Take the full architecture and make it survive reality: every dependency will fail, so define graceful degradation, timeouts, retries with budgets, circuit breakers, and fallbacks -- then operate an incident with SLOs, observability, and a blameless response.",
    prerequisites: ["capstone-architecture", "slo-sli-error-budgets", "idempotency-retries"],
    relatedConcepts: ["capstone-architecture", "load-balancing", "consensus-raft", "consistency-models", "incident-response"],
    tags: ["capstone", "resilience", "failure", "degradation", "circuit-breaker", "incident", "sre", "production"],

    why: `A design that only works when every component is healthy is not a production system -- it is a demo. In reality, **every dependency will fail**: the database will time out, the cache will go cold, Kafka will lag, a region will drop, a worker will crash mid-task. The question is never "will this fail?" but "what happens *when* it does?" A system that turns one dependency's failure into a total outage has a **blast radius** problem; a resilient one **degrades gracefully**, keeping the core experience alive while a non-critical part is broken.

This capstone exists because designing the happy path (the architecture capstone) is only half the job. The other half -- the half that defines whether you get paged at 3 a.m. -- is **designing the failure path**: timeouts so you fail fast, retries with budgets so you do not amplify outages, circuit breakers so you stop hammering a dead dependency, fallbacks so users see degraded rather than broken, and the operational muscle (SLOs, observability, incident response) to detect and recover. Senior engineers are hired for exactly this: making systems that bend instead of break, and operating them calmly when they do bend.`,

    intuition: `Think of a **modern airplane**, designed on the assumption that things *will* fail.

- It has **redundancy**: multiple engines, so losing one is survivable, not fatal (like N+1 capacity and replicas).
- It has **graceful degradation**: if a non-essential system fails, the plane keeps flying and lands safely; only the core function (staying airborne) is protected absolutely (like keeping checkout working while recommendations are down).
- It has **circuit breakers and fail-safes**: a malfunctioning component is isolated so it cannot cascade (like a circuit breaker cutting off a failing dependency).
- It has **instruments and alarms**: pilots see problems immediately and follow **checklists**, not improvisation (like observability and incident runbooks).
- And after any incident, there is a **blameless investigation** to improve the system, not to punish the pilot.

A resilient architecture is engineered like that airplane: it assumes failure, contains it, keeps the essential function alive, and is operable under stress. The capstone is turning the happy-path design into that airplane.`,

    howItWorks: `Operating under failure has two halves: **designing for failure** and **responding to failure.**

### Designing for failure (resilience patterns)
- **Timeouts everywhere:** never wait indefinitely on a dependency. A missing timeout turns one slow service into a system-wide hang (thread/connection exhaustion). Fail fast.
- **Retries -- but with a budget and backoff+jitter:** retry only idempotent, retryable errors; cap total retries (e.g. <10% of requests) so you do not amplify an outage into a cascade.
- **Circuit breakers:** after N consecutive failures, "open" the breaker and stop calling the dependency for a cooldown, returning a fast failure/fallback. This lets the dependency recover instead of being hammered. Then "half-open" to test recovery.
- **Graceful degradation / fallbacks:** when a non-critical dependency is down, serve a reduced experience -- stale cache, a default, or a disabled feature -- instead of an error. Protect the core journey absolutely; let the periphery degrade.
- **Bulkheads:** isolate resources (connection pools, thread pools) per dependency so one failing dependency cannot consume all resources and sink the rest.
- **Redundancy + N+1 capacity:** replicas, multi-AZ, and headroom so a single failure does not overload survivors (avoid the failover thundering herd).

### Responding to failure (operations)
- **Detect:** SLOs measured at the edge + burn-rate alerts tell you a real user-impacting problem is happening, before customers do.
- **Diagnose:** observability -- metrics, logs, and distributed traces across every layer -- to find *where* in the funnel it broke.
- **Mitigate first, fix later:** roll back, fail over, shed load, or flip a feature flag to restore service; root-cause afterward.
- **Blameless postmortem:** analyze the systemic causes, feed fixes back into the architecture and the golden path so the same failure cannot recur.`,

    internals: `- **Timeouts are the most under-appreciated resilience control.** Without them, a slow dependency exhausts the caller's threads/connections and the failure propagates upstream -- one slow DB can hang the whole stack. Set timeouts shorter than the caller's own timeout budget.
- **Retries are a double-edged sword.** They hide transient blips but, unbudgeted, multiply load during an incident (retry storms) and cascade. Only retry idempotent ops, with backoff+jitter and a hard budget/circuit breaker.
- **The circuit breaker is what stops a cascade.** Closed (normal) -> Open (failing fast after a threshold, giving the dependency room to recover) -> Half-open (probing). It converts "hammer a dying service and take it fully down" into "back off and degrade."
- **Graceful degradation is a product decision as much as technical:** decide in advance which features are core (must never fail) and which are sheddable (recommendations, analytics, non-critical enrichments). Under load you shed the periphery to protect the core.
- **Blast radius is the metric to minimize:** how much of the system does one failure take out? Bulkheads, per-dependency circuit breakers, and cell-based/multi-AZ isolation shrink it.
- **Failover is not free:** when a node dies its load lands on survivors instantly (thundering herd), and a promoted replica may serve slightly stale data. N+1 capacity and read-your-writes handling matter here.
- **You cannot operate what you cannot see.** The three pillars (metrics, logs, traces) plus SLO burn-rate alerts are the detection/diagnosis backbone; traces are what pinpoint which layer of the funnel failed.
- **Mitigate before you diagnose.** The incident goal is to stop user pain (roll back, fail over, feature-flag off) first; root cause and permanent fix come in the blameless postmortem, whose output updates the system so the failure class cannot recur.
- **Idempotency is what makes recovery safe:** replaying a Kafka backlog or retrying after a crash must not double-charge or double-send -- the operate-under-failure story depends on the idempotency capstone-level guarantee.`,

    diagram: {
      title: "Resilience patterns + the incident loop",
      layers: [
        { id: "timeout", label: "Timeouts + bulkheads", sub: "fail fast; isolate pools so one dep cannot sink the rest" },
        { id: "retry", label: "Budgeted retries + circuit breaker", sub: "backoff+jitter, idempotent only; open to let a dep recover" },
        { id: "degrade", label: "Graceful degradation", sub: "protect the core journey; shed/stale the periphery" },
        { id: "detect", label: "Detect: SLOs + burn-rate alerts", sub: "measured at the edge, before users complain" },
        { id: "respond", label: "Mitigate -> diagnose -> blameless postmortem", sub: "roll back/fail over first; feed fixes back in" },
      ],
      caption: "Assume failure: contain it with timeouts/breakers/degradation, then detect and mitigate fast -- the airplane, not the demo.",
    },

    realWorld: `The recommendations service in the photo app (from the architecture capstone) starts timing out under load. In a fragile design, the feed service calls it inline with no timeout, so feed threads pile up waiting, connections exhaust, and the *entire feed goes down* -- one non-critical feature took out the core experience. In the resilient design: the feed service calls recommendations with a **200 ms timeout**, wrapped in a **circuit breaker** that opens after repeated failures and, while open, **falls back to a non-personalized default feed from cache**. Users see a slightly less tailored feed -- degraded, not broken -- and the recommendations service, no longer hammered, recovers; the breaker half-opens, tests, and closes. Meanwhile a **burn-rate alert** fired on the recommendations SLO, on-call saw the exact failing span in a **trace**, confirmed the core feed was protected, and let the auto-recovery play out. **Same failure, opposite outcome, because the failure path was designed and operable.** The postmortem then adds a default-timeout lint rule to the golden path so no service ships without one.`,

    production: `- **Set a timeout on every remote call**, shorter than the caller's budget; never allow an unbounded wait. This is the single highest-leverage resilience control.
- **Budget retries and pair them with circuit breakers;** retry only idempotent, retryable errors with backoff+jitter. Unbudgeted retries cause cascades.
- **Wrap flaky/critical dependencies in circuit breakers** so a dying dependency gets room to recover instead of being hammered.
- **Decide the core vs sheddable features in advance** and implement graceful fallbacks (stale cache, defaults, disabled feature) so the core journey survives when the periphery fails.
- **Use bulkheads** (separate connection/thread pools per dependency) to contain blast radius.
- **Capacity-plan for N+1** across AZs so a single failure does not overload survivors; account for the failover thundering herd.
- **Measure SLOs at the edge and alert on burn rate;** wire metrics, logs, and distributed traces across every layer so you can find *where* it broke.
- **Practice incident response:** mitigate first (roll back / fail over / feature-flag / shed load), diagnose second, and run blameless postmortems whose fixes feed back into the architecture and golden paths.
- **Test failure deliberately** (chaos/game days): kill a dependency in staging and verify degradation works as designed, before production proves it for you.`,

    commonMistakes: [
      "No timeouts on remote calls, so one slow dependency exhausts threads/connections and hangs the whole system.",
      "Unbudgeted retries with no circuit breaker, turning a transient blip into a self-inflicted cascade (retry storm).",
      "Failing hard (500) when a non-critical dependency is down instead of degrading gracefully to a fallback.",
      "No distinction between core and sheddable features, so everything is treated as must-not-fail and nothing can be shed.",
      "Shared resource pools (no bulkheads), so one failing dependency starves every other call.",
      "Running survivors near capacity, so a single failover cascades (no N+1 headroom).",
      "Alerting on raw errors instead of SLO burn rate, and lacking traces to locate the failing layer.",
      "Diagnosing root cause during the incident instead of mitigating first; and running blameful postmortems that fix nothing.",
    ],

    tradeoffs: `| Pattern | Protects against | Cost / trade-off |
|---|---|---|
| Timeouts | Hangs, thread/connection exhaustion | May cut off a slow-but-valid response; must tune |
| Budgeted retries + jitter | Transient blips | Latency; cascades if unbudgeted |
| Circuit breaker | Hammering a dying dependency | Some requests fail fast during open state |
| Graceful degradation | Total outage from one feature | Reduced experience; more code paths |
| Bulkheads | Cross-dependency contagion | Lower resource utilization |
| N+1 / multi-AZ redundancy | Single-point failures | Extra cost/capacity |
| Blameless postmortems | Repeat incidents | Time investment; cultural discipline |`,

    whenToUse: [
      "Any production system with real users and dependencies that can fail (i.e. essentially all of them).",
      "Hardening a happy-path design before launch -- turning the architecture capstone into an operable system.",
      "During and after incidents: applying resilience patterns and running the detect/mitigate/postmortem loop.",
    ],
    whenNotToUse: [
      "Throwaway prototypes with no users, where full resilience engineering is premature.",
      "As a reason to over-engineer every trivial call with breakers and bulkheads regardless of criticality.",
      "As a substitute for fixing a chronically failing dependency -- patterns contain symptoms; the root cause still needs fixing.",
    ],

    code: [
      {
        label: "Resilient dependency call: timeout + circuit breaker + fallback",
        language: "typescript",
        code: `// Non-critical dependency (recommendations): protect the core feed no matter what.
async function getRecommendations(userId: string): Promise<Rec[]> {
  if (breaker.isOpen()) return fallbackRecs(userId);   // fast fail while dep recovers
  try {
    const recs = await withTimeout(recClient.get(userId), 200); // fail fast: bounded wait
    breaker.recordSuccess();
    return recs;
  } catch (err) {
    breaker.recordFailure();          // N failures in a window -> breaker opens
    return fallbackRecs(userId);      // graceful degradation: stale/default, not a 500
  }
}

// The CORE journey (feed) degrades gracefully -- it never hard-fails on a peripheral dep.
async function getFeed(userId: string): Promise<Feed> {
  const base = await getBaseFeed(userId);              // core: must succeed
  const recs = await getRecommendations(userId);      // peripheral: may be a fallback
  return merge(base, recs);
}`,
      },
      {
        label: "Circuit breaker state machine (closed -> open -> half-open)",
        language: "typescript",
        code: `class CircuitBreaker {
  private failures = 0;
  private state: "closed" | "open" | "half" = "closed";
  private openedAt = 0;
  constructor(private threshold = 5, private cooldownMs = 10_000) {}

  isOpen(): boolean {
    if (this.state === "open" && Date.now() - this.openedAt > this.cooldownMs) {
      this.state = "half";   // probe: allow one trial call to test recovery
    }
    return this.state === "open";
  }
  recordSuccess() { this.failures = 0; this.state = "closed"; } // recovered
  recordFailure() {
    this.failures++;
    if (this.failures >= this.threshold || this.state === "half") {
      this.state = "open";           // stop hammering the dependency
      this.openedAt = Date.now();    // let it recover for cooldownMs
    }
  }
}`,
      },
    ],

    memoryCard: {
      problem: "Every dependency will fail; a design that only works when all parts are healthy is a demo, not a production system.",
      mentalModel: "A modern airplane: assume failure, add redundancy, isolate faults (circuit breakers), keep the essential function alive (graceful degradation), and operate by instruments and checklists with blameless review.",
      keyConcepts: ["timeouts (fail fast)", "budgeted retries + backoff/jitter", "circuit breaker closed/open/half-open", "graceful degradation: protect core, shed periphery", "bulkheads + N+1 redundancy shrink blast radius", "SLO burn-rate alerts + traces; mitigate before diagnose; blameless postmortem"],
      productionConnection: "Every remote call has a timeout; flaky deps get breakers and fallbacks; SLOs at the edge drive alerts; incidents are mitigated first and closed with blameless postmortems that update the golden path.",
      oneLiner: "Assume every dependency fails: contain it with timeouts, budgeted retries, circuit breakers, and graceful degradation, then detect and mitigate fast so the system bends instead of breaks.",
    },

    quiz: [
      {
        id: "cap-fail-q1",
        prompt: "The recommendations service starts timing out. Why does a missing timeout on the calling feed service risk a total outage?",
        choices: [
          { text: "Timeouts make requests slower", correct: false },
          { text: "Without a timeout, feed threads/connections pile up waiting on the slow dependency and get exhausted, hanging the whole service", correct: true },
          { text: "The recommendations service will delete the feed data", correct: false },
          { text: "Timeouts are only needed for databases", correct: false },
        ],
        explanation: "An unbounded wait on a slow dependency ties up the caller's threads and connections until they are exhausted, so a single slow dependency propagates into a system-wide hang. Timeouts make you fail fast and contain it.",
      },
      {
        id: "cap-fail-q2",
        prompt: "What is the purpose of a circuit breaker opening after repeated failures?",
        choices: [
          { text: "To permanently disable the dependency", correct: false },
          { text: "To stop hammering a failing dependency for a cooldown -- giving it room to recover while callers fail fast or use a fallback", correct: true },
          { text: "To retry the request infinitely", correct: false },
          { text: "To increase load on the dependency", correct: false },
        ],
        explanation: "An open breaker returns fast failures/fallbacks instead of piling more requests onto a dying dependency, letting it recover. It later half-opens to probe recovery before closing.",
      },
      {
        id: "cap-fail-q3",
        prompt: "During an active incident, what should you do first?",
        choices: [
          { text: "Find the root cause before touching anything", correct: false },
          { text: "Mitigate to stop user pain (roll back, fail over, feature-flag, shed load); diagnose root cause afterward", correct: true },
          { text: "Write the postmortem", correct: false },
          { text: "Wait for the dependency to recover on its own", correct: false },
        ],
        explanation: "The incident priority is restoring service. Mitigate first (roll back, fail over, flip a flag, shed load), then diagnose and root-cause in a blameless postmortem whose fixes feed back into the system.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Harden the architecture and run a failure drill",
      brief: "Take the full architecture from the previous capstone and make it survive the failure of each layer, then walk through operating an incident.",
      steps: `1. For each dependency edge (CDN, LB, gateway, Redis, Postgres primary/replica, Kafka, workers, S3), write what happens when it fails and the resilience control (timeout, retry budget, circuit breaker, fallback, bulkhead, redundancy).\n2. Classify features as core (must never fail) vs sheddable, and define the graceful-degradation fallback for each sheddable dependency.\n3. Define detection: which SLIs/SLOs are measured at the edge and what burn-rate alerts fire.\n4. Pick one failure (e.g. Postgres primary down, or Redis cold, or a worker backlog) and write the incident timeline: detect -> mitigate (roll back / fail over / shed) -> diagnose (which trace/metric) -> recover.\n5. Write the blameless postmortem's systemic fix and how it feeds back into the golden path so the failure class cannot recur.`,
      successCriteria: [
        "Every dependency edge has a defined failure behavior and a matching resilience control",
        "Core vs sheddable features separated with concrete graceful-degradation fallbacks",
        "A full incident timeline (detect via SLO/trace -> mitigate first -> diagnose -> blameless postmortem feeding back a fix)",
      ],
    },
  },
];
