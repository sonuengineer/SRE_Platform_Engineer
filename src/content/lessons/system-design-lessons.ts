import type { Lesson } from "../types";

export const systemDesignLessons: Lesson[] = [
  {
    slug: "system-design-framework",
    title: "A System Design Framework",
    track: "shared",
    phase: "system-design",
    module: "sd-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "A repeatable interview- and real-world-ready process: clarify requirements, estimate scale, define APIs and data, sketch a high-level design, then deep-dive and address bottlenecks -- driven by trade-offs, not memorized diagrams.",
    prerequisites: [],
    relatedConcepts: ["estimation-back-of-envelope", "scaling-reads-writes", "load-balancing", "cap-theorem"],
    tags: ["system-design", "framework", "requirements", "api-design", "trade-offs", "architecture"],

    why: `A system design problem -- in an interview or a real design doc -- is deliberately open-ended: "design a URL shortener," "design a news feed." Faced with ambiguity, the common failure is to jump straight to drawing boxes ("we'll use Kafka and Cassandra") before understanding what is actually being built or how big it is. That produces designs that are over-engineered, under-specified, or solving the wrong problem.

**A system design framework exists to replace panic and pattern-matching with a disciplined process** that works on any problem: first understand the requirements and scale, then let those numbers and constraints drive the architecture. It matters because real architecture is not about knowing the trendiest components -- it is about **making defensible trade-offs for specific requirements**. The framework forces you to surface the requirements and constraints first, so every subsequent decision has a justification. It is the difference between "I used a queue because queues are cool" and "I used a queue because the write path must absorb 50x spikes and tolerate seconds of processing lag."`,

    intuition: `Think of an **architect designing a building**. A good architect never starts by choosing marble or picking a roof style. They start by asking: **who will use this, how many, for what, and what must never fail?** A hospital, a warehouse, and a house are all "buildings," but their requirements produce completely different structures. Only after understanding the requirements and load (number of occupants, weight to bear, safety codes) do they draw plans, and only then choose materials.

System design is identical. The components (databases, caches, queues) are your materials; the requirements and scale are your occupancy and load. **You derive the structure from the requirements, not the other way around.** Anyone who starts with "let's use microservices and Kafka" before knowing the load is choosing marble before knowing whether they are building a shed or a skyscraper.`,

    howItWorks: `A reliable framework has a clear order; each step feeds the next.

### Step 1 -- Clarify requirements (do NOT skip)
- **Functional requirements:** what the system must *do* (the core features). Scope aggressively: nail 2-3 core features, defer the rest.
- **Non-functional requirements:** how it must *behave* -- scale, latency, availability, consistency, durability. These drive the architecture far more than features do.
- Ask questions. Ambiguity is intentional; clarifying is the skill being tested.

### Step 2 -- Estimate scale (back-of-the-envelope)
Turn the requirements into numbers: users, QPS (read and write separately), data volume/growth, bandwidth. These numbers decide whether you need one box or a sharded fleet. (Its own lesson.)

### Step 3 -- Define the API and data model
- Sketch the key **API endpoints** (the contract).
- Sketch the **data model / schema** and, crucially, the **access patterns** -- which drive your storage choice (SQL vs NoSQL, indexes, partition key).

### Step 4 -- High-level design
Draw the major components and data flow: clients -> load balancer -> services -> data stores -> async workers. Keep it simple and correct first.

### Step 5 -- Deep dive + address bottlenecks
Now iterate: identify the bottleneck (usually the hot read path, the write path, or a single point of failure) and apply the right tool -- caching, replication, sharding, a queue, a CDN -- **justifying each with a trade-off** tied back to your requirements.`,

    internals: `- **Non-functional requirements dominate.** Two systems with identical features but "1k users, eventual consistency ok" vs "100M users, strong consistency, 99.99%" are utterly different architectures. Pin these numbers early.
- **Scope control is a scored skill.** Trying to design everything shows poor prioritization; explicitly saying "I'll focus on posting and reading the feed, and treat notifications as out of scope for now" is a strong signal.
- **Access patterns drive storage, not the other way around.** "How will this data be read?" (by id? by range? by user?) determines SQL vs NoSQL and your partition key far more than the data's shape does.
- **Read vs write ratio changes everything.** A read-heavy system (100:1) leans on caching, replicas, and CDNs; a write-heavy system leans on sharding, queues, and LSM-tree stores. Estimate them separately.
- **Start simple, then justify complexity.** A monolith + one database is the correct starting point for most problems; introduce a cache/queue/shard only when a specific number forces it. Premature microservices/Kafka is a classic anti-signal.
- **Every component is a trade-off.** A cache adds staleness and invalidation complexity; a queue adds eventual consistency and ordering concerns; sharding adds cross-shard query pain. Name the cost when you add the box.
- **Single points of failure and the bottleneck are what you deep-dive.** Interviewers (and reality) probe where the design breaks first under load.`,

    diagram: {
      title: "The system design process (requirements drive architecture)",
      layers: [
        { id: "req", label: "1. Clarify requirements", sub: "functional + non-functional; scope 2-3 core features" },
        { id: "scale", label: "2. Estimate scale", sub: "users, read/write QPS, data, bandwidth" },
        { id: "api", label: "3. API + data model", sub: "endpoints; schema driven by access patterns" },
        { id: "hld", label: "4. High-level design", sub: "clients -> LB -> services -> stores -> workers" },
        { id: "deep", label: "5. Deep dive + bottlenecks", sub: "cache/replicate/shard/queue -- each justified by a trade-off" },
      ],
      caption: "Numbers and requirements come first; components are chosen to satisfy them, each with its cost named.",
    },

    realWorld: `Asked to "design a URL shortener," a weak candidate immediately says "microservices, Kafka, Cassandra." A strong one runs the framework: (1) requirements -- shorten a URL, redirect, maybe analytics; reads vastly outnumber writes. (2) Scale -- say 100M new URLs/month (~40 writes/s) but 10B redirects/month (~4000 reads/s): heavily read-dominated. (3) API -- \`POST /urls\`, \`GET /{code}\`. Data -- a simple key-value \`code -> long_url\`; access is point lookup by code, so a KV store or an indexed table plus a cache fits. (4) High-level -- LB -> stateless service -> cache -> datastore, with the redirect served from cache. (5) Deep dive -- the read path is the bottleneck, so a CDN/cache in front handles the 4000 reads/s cheaply; the code-generation path needs uniqueness (counter or hash + collision check). **The winning answer was not more components -- it was deriving a simple design from the numbers and justifying each piece.**`,

    production: `- **Always clarify requirements first**, in a real design doc as much as an interview. Write the non-functional numbers (scale, latency, availability, consistency) at the top -- they justify everything below.
- **Estimate before architecting.** A back-of-the-envelope calc prevents both over- and under-engineering.
- **Let access patterns choose the storage.** Document how data is read and written before picking SQL/NoSQL and the partition key.
- **Start with the simplest correct design** (monolith + one DB) and add a cache/queue/shard only when a number demands it. Record the trigger ("added a cache because read QPS x latency exceeded DB capacity").
- **Name the trade-off for every component you add** so future readers know the cost you accepted.
- **Identify SPOFs and the primary bottleneck explicitly** and address them; that is where systems actually fail.
- **Keep a living design doc** with the requirements, the numbers, and the trade-offs -- it is the artifact that lets the next engineer reason about changes.`,

    commonMistakes: [
      "Jumping straight to components (Kafka/microservices/Cassandra) before clarifying requirements or estimating scale.",
      "Skipping the non-functional requirements, which actually drive the architecture.",
      "Choosing storage by data shape instead of by access patterns and read/write ratio.",
      "Over-engineering: microservices and streaming for a problem a monolith and one database would handle.",
      "Trying to design every feature instead of scoping to 2-3 core ones.",
      "Adding components without naming their cost (cache staleness, queue eventual consistency, shard fan-out).",
      "Never identifying the bottleneck or single points of failure, so the design collapses under real load.",
    ],

    tradeoffs: `| Decision | Benefit | Cost |
|---|---|---|
| Clarify + estimate first | Right-sized, justified design | Feels slower than jumping to boxes |
| Start simple (monolith + 1 DB) | Fast to build, easy to reason about | May need to evolve as load grows |
| Add a cache | Cheap, fast reads | Staleness + invalidation complexity |
| Add a queue | Absorbs spikes, decouples | Eventual consistency, ordering, extra ops |
| Shard early | Scales writes | Cross-shard queries, rebalancing pain |
| Microservices upfront | Team autonomy at scale | Huge complexity if premature |`,

    whenToUse: [
      "Any open-ended design problem -- system design interviews and real architecture/design docs.",
      "Evaluating whether a proposed architecture is right-sized for its actual requirements.",
      "Onboarding a new system: reconstruct requirements -> scale -> data -> components to understand it.",
    ],
    whenNotToUse: [
      "Trivial, well-bounded changes where the design is obvious and the framework is overhead.",
      "As a rigid script to recite -- it is a thinking tool; adapt the order to the problem.",
      "As a substitute for knowing the components; the framework organizes knowledge, it does not replace it.",
    ],

    code: [
      {
        label: "A requirements + estimate checklist to anchor any design",
        language: "markdown",
        code: `## 1. Functional requirements (scope to 2-3 core features)
- [ ] Core feature A (e.g. shorten URL)
- [ ] Core feature B (e.g. redirect)
- [ ] Out of scope (for now): analytics, custom domains

## 2. Non-functional requirements (these drive the architecture)
- Scale: ___ DAU, ___ read QPS, ___ write QPS (estimate separately)
- Latency: p99 < ___ ms
- Availability: ___ nines
- Consistency: strong | read-your-writes | eventual
- Durability: can we ever lose data?

## 3. API + data model
- Endpoints: POST /..., GET /...
- Access patterns: read by ___ , write by ___  -> choose storage + partition key

## 4. High-level design: clients -> LB -> service -> cache -> store -> workers
## 5. Bottleneck + SPOF: ___ ; mitigation: cache/replicate/shard/queue (+ its cost)`,
      },
    ],

    memoryCard: {
      problem: "Open-ended design problems tempt you to pick trendy components before understanding what you are building or how big it is.",
      mentalModel: "An architect: understand occupancy and load (requirements + scale) before drawing plans or choosing materials (components).",
      keyConcepts: ["clarify functional + non-functional", "estimate read/write scale", "access patterns drive storage", "high-level design then deep dive", "justify every component with a trade-off", "start simple, add complexity only when a number forces it"],
      productionConnection: "Real design docs lead with requirements and numbers, choose the simplest correct design, and record the trade-off behind each added cache/queue/shard.",
      oneLiner: "Derive the architecture from clarified requirements and estimated scale, justifying every component with a trade-off -- do not start by drawing boxes.",
    },

    quiz: [
      {
        id: "sdf-q1",
        prompt: "What is the correct first step when given an open-ended system design problem?",
        choices: [
          { text: "Choose the database and message queue", correct: false },
          { text: "Clarify functional and non-functional requirements by asking questions", correct: true },
          { text: "Draw the microservices diagram", correct: false },
          { text: "Pick a cloud provider", correct: false },
        ],
        explanation: "The problem is intentionally ambiguous. Clarifying requirements -- especially non-functional ones like scale, latency, and consistency -- is the skill being tested and drives every later decision.",
      },
      {
        id: "sdf-q2",
        prompt: "Why estimate scale (QPS, data volume) before choosing components?",
        choices: [
          { text: "To impress with math", correct: false },
          { text: "The numbers determine whether you need one box or a sharded fleet, preventing over- and under-engineering", correct: true },
          { text: "Because interviewers require exact figures", correct: false },
          { text: "Scale never affects the design", correct: false },
        ],
        explanation: "Back-of-the-envelope numbers reveal read/write ratios and data growth, which decide whether you need caching, replicas, sharding, or a queue -- so the architecture is right-sized.",
      },
      {
        id: "sdf-q3",
        prompt: "What primarily determines your choice of data store?",
        choices: [
          { text: "The most popular database this year", correct: false },
          { text: "The access patterns (how data is read and written) and the read/write ratio", correct: true },
          { text: "The programming language of the service", correct: false },
          { text: "The color of the diagram", correct: false },
        ],
        explanation: "Storage choice (SQL vs NoSQL, indexes, partition key) follows from how the data is accessed -- point lookups vs ranges, read-heavy vs write-heavy -- not from the data's shape or trends.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Run the framework on a design prompt",
      brief: "Take a prompt (e.g. 'design a pastebin' or 'design a rate limiter') and produce a right-sized design using the five-step framework.",
      steps: `1. Clarify: write 2-3 functional requirements and the non-functional numbers (scale, latency, availability, consistency).\n2. Estimate: read QPS and write QPS separately, plus data volume/growth.\n3. Define the API endpoints and the data model, stating the access patterns and the storage they imply.\n4. Draw the high-level design (clients -> LB -> service -> cache -> store -> workers).\n5. Identify the primary bottleneck and one SPOF; propose a mitigation and explicitly state its trade-off.`,
      successCriteria: [
        "Requirements (functional + non-functional numbers) written before any components",
        "Read/write scale estimated and used to justify the design",
        "Every added component (cache/queue/shard) justified with its trade-off; bottleneck + SPOF addressed",
      ],
    },
  },

  {
    slug: "scaling-reads-writes",
    title: "Scaling Reads and Writes",
    track: "shared",
    phase: "system-design",
    module: "sd-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "Reads and writes scale with completely different tools: reads via caching, replicas, and CDNs; writes via sharding, queues, and write-optimized stores. Diagnose the ratio first, then apply the matching lever.",
    prerequisites: ["system-design-framework"],
    relatedConcepts: ["system-design-framework", "sharding-partitioning", "consistency-models", "load-balancing"],
    tags: ["scaling", "read-heavy", "write-heavy", "caching", "replication", "sharding", "cqrs"],

    why: `When a system slows under load, the instinctive fix -- "add a bigger database" -- is usually wrong, because reads and writes hit different limits and are fixed by different tools. A read-heavy system chokes on serving the same data over and over; a write-heavy system chokes on durably persisting a flood of new data. Vertical scaling (a bigger box) helps both a little and neither for long.

**Understanding that reads and writes scale independently, with different techniques, is what lets you apply the right lever instead of guessing.** Most systems are dramatically read-heavy (often 100:1 or more), so caching and replicas frequently deliver order-of-magnitude wins cheaply. But when the write path is the bottleneck, no amount of caching helps -- you need sharding, queues, or write-optimized storage. Diagnosing the read/write ratio first, then reaching for the matching technique, is the core skill of scaling. Getting it wrong wastes money and leaves the real bottleneck untouched.`,

    intuition: `Picture a **popular library**.

**Scaling reads** is about the same few books being requested constantly. You do not build more printing presses -- you make **photocopies and put them everywhere**: a copy on every floor (caching), branch libraries with copies of the popular books (read replicas), and copies mailed to reading rooms near each town (CDN/edge). The original is untouched; you just serve copies close to readers.

**Scaling writes** is different: many people want to *contribute new books* at once. Photocopies do not help -- you must handle the incoming flood. You **split the collection so different branches accept new books for different subjects** (sharding by key), you let people **drop books in a return slot to be shelved later** instead of waiting (queues/async writes), and you use a **fast intake process** optimized for accepting, not browsing (write-optimized stores).

Reads = spread copies. Writes = split the work and buffer it. Different problems, different tools.`,

    howItWorks: `### First: diagnose the ratio
Measure read QPS vs write QPS separately. The techniques diverge completely, so this determines everything.

### Scaling reads (usually the easy, high-ROI side)
- **Caching:** keep hot data in memory (Redis/Memcached) or in-process. The single biggest read lever; a cache hit avoids the database entirely. Comes with staleness + invalidation cost.
- **Read replicas:** replicate the primary to N read-only copies and send reads there. Scales read throughput linearly-ish; introduces **replication lag** (replicas are eventually consistent).
- **CDN / edge caching:** serve static and cacheable content from locations near users, offloading origin and cutting latency.
- **Denormalization / precomputation:** compute expensive results ahead of time (e.g. a materialized feed) so reads are cheap lookups.

### Scaling writes (the harder side)
- **Sharding (horizontal partitioning):** split writes across nodes by a partition key so each node handles a fraction. The primary way to scale write throughput past one node. (Its own lesson.)
- **Asynchronous writes / queues:** accept the write into a durable queue (Kafka/SQS) and process it later, absorbing spikes and decoupling producers from the slower write path. Trades immediate consistency for throughput and resilience.
- **Write-optimized storage:** LSM-tree stores (Cassandra, RocksDB) turn random writes into fast sequential appends, handling high write volume far better than update-in-place B-trees.
- **Batching:** coalesce many small writes into fewer larger ones.

### CQRS: when read and write needs truly diverge
Separate the **write model** (optimized for consistency/ingest) from the **read model** (optimized, denormalized for queries), kept in sync asynchronously. Powerful when the two sides have opposite requirements -- at the cost of eventual consistency and more moving parts.`,

    internals: `- **Read/write ratio dictates the tool.** Read-heavy (100:1) -> caching + replicas + CDN win big. Write-heavy -> caching barely helps; you need sharding, queues, LSM stores.
- **Caching is the highest-ROI read lever but the hardest to get right.** "There are only two hard things: cache invalidation and naming things." Stale data and thundering-herd cache stampedes on expiry are the classic failures; use TTLs, request coalescing, and careful invalidation.
- **Read replicas cause replication lag**, so a read right after a write may be stale (breaks read-your-writes). Fix by reading the primary for that user briefly, or a session/freshness guarantee -- ties directly to consistency models.
- **Replicas do not scale writes at all** -- every write still goes to the primary and must be applied to every replica. To scale writes you must shard.
- **Queues turn writes asynchronous**, which means the caller gets a fast ack but the data is not yet durable in the final store -- you accept eventual consistency and must handle ordering, retries (idempotency!), and backpressure.
- **LSM vs B-tree:** LSM (log-structured merge) is append-optimized (great writes, compaction cost, possible read amplification); B-tree is update-in-place (great reads, slower random writes). The engine choice follows the workload.
- **CQRS is not free:** two models and an async sync path mean eventual consistency and operational complexity -- justified only when read and write requirements genuinely conflict.
- **Denormalization trades write cost + storage for cheap reads** -- you do work at write time (fan-out on write) so reads are trivial; the opposite (fan-out on read) keeps writes cheap but reads expensive. Choose by ratio.`,

    diagram: {
      title: "Different levers for reads vs writes",
      layers: [
        { id: "diagnose", label: "Diagnose read:write ratio", sub: "measure read QPS vs write QPS separately" },
        { id: "reads", label: "Scale READS", sub: "cache + read replicas + CDN + precompute" },
        { id: "lag", label: "Read cost: staleness/lag", sub: "replicas are eventually consistent; invalidation is hard" },
        { id: "writes", label: "Scale WRITES", sub: "shard + async queues + write-optimized (LSM) + batch" },
        { id: "cqrs", label: "CQRS (when they diverge)", sub: "separate read model from write model, synced async" },
      ],
      caption: "Reads scale by spreading copies; writes scale by splitting and buffering work. Diagnose the ratio, then pick the matching lever.",
    },

    realWorld: `A social feed API is falling over. The team's first instinct is a bigger database, which buys a week. Instrumentation shows the load is 200:1 read-to-write -- it is overwhelmingly read-heavy, dominated by users refreshing their feed. They add a **Redis cache** for hot feeds and **read replicas** for the rest, offloading ~95% of reads from the primary; latency and cost drop sharply. Months later, a viral growth spike makes the *write* path (fan-out of new posts to millions of followers) the new bottleneck -- and no amount of read caching helps. Now they shard the write path and move fan-out to an **async queue** with idempotent workers, absorbing the spike. **Same system, two different bottlenecks, two entirely different toolsets -- because reads and writes scale independently.** The lesson: measure the ratio, then reach for the matching lever.`,

    production: `- **Measure read vs write QPS first.** The bottleneck side decides the toolset; do not scale blindly.
- **For read-heavy systems, cache aggressively** (with TTLs and stampede protection) and add read replicas; put a CDN in front of cacheable content. This is usually the cheapest big win.
- **Expect and handle replication lag.** Route reads that must be fresh (read-your-writes) to the primary or a freshness-guaranteed replica.
- **Remember replicas do not scale writes** -- when the write path is the bottleneck, shard.
- **For write-heavy systems, buffer with durable queues** and process asynchronously; make consumers idempotent (retries are inevitable) and design for backpressure.
- **Match the storage engine to the workload:** write-optimized (LSM) for high ingest, read-optimized (B-tree/indexed) for query-heavy.
- **Reach for CQRS only when read and write requirements genuinely conflict** -- accept the eventual consistency and extra operational cost deliberately.
- **Use denormalization/precomputation** (fan-out on write) for read-heavy feeds; keep writes cheap (fan-out on read) when writes dominate.`,

    commonMistakes: [
      "Reaching for a bigger box (vertical scaling) as the default instead of diagnosing the read/write ratio.",
      "Adding read replicas and expecting them to help write throughput -- they do not; every write still hits the primary.",
      "Caching without invalidation strategy or stampede protection, causing stale data or expiry storms.",
      "Ignoring replication lag and serving stale reads right after a user's own write.",
      "Applying read techniques (caching/replicas) to a write-bound bottleneck, which cannot help.",
      "Introducing CQRS prematurely, paying eventual consistency and complexity costs with no need.",
      "Using async queues without idempotent consumers, so retries duplicate writes.",
    ],

    tradeoffs: `| Technique | Scales | Benefit | Cost |
|---|---|---|---|
| Caching | Reads | Huge read offload, low latency | Staleness, invalidation, stampedes |
| Read replicas | Reads | More read throughput | Replication lag (eventual); no write help |
| CDN / edge | Reads | Offload origin, low global latency | Only for cacheable content |
| Sharding | Writes | Write throughput past one node | Cross-shard queries, rebalancing |
| Async queue | Writes | Absorbs spikes, decouples | Eventual consistency, ordering, needs idempotency |
| Write-optimized (LSM) | Writes | Fast high-volume ingest | Compaction cost, read amplification |
| CQRS | Both (separately) | Each side independently optimal | Eventual consistency, two models to operate |`,

    whenToUse: [
      "Read-heavy: caching, read replicas, CDN, precomputation (most consumer systems).",
      "Write-heavy: sharding, async queues, write-optimized stores, batching (ingest/logging/high-volume writes).",
      "CQRS: when read and write workloads have genuinely conflicting requirements.",
    ],
    whenNotToUse: [
      "Do not add read-scaling tools to a write-bound bottleneck (they cannot help).",
      "Do not shard or adopt CQRS before a number forces it -- premature complexity.",
      "Do not rely on replicas for writes or for reads that must be strictly fresh.",
    ],

    code: [
      {
        label: "Read path: cache-aside with stampede protection",
        language: "typescript",
        code: `async function getFeed(userId: string): Promise<Feed> {
  const key = "feed:" + userId;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);          // cache hit -> never touches the DB

  // Cache miss: coalesce concurrent misses so one query fills the cache (anti-stampede).
  return singleFlight(key, async () => {
    const again = await redis.get(key);
    if (again) return JSON.parse(again);
    const feed = await db.readReplica.getFeed(userId); // reads go to a REPLICA, not primary
    await redis.set(key, JSON.stringify(feed), "EX", 60); // TTL bounds staleness
    return feed;
  });
}`,
      },
      {
        label: "Write path: absorb spikes with a durable queue + idempotent worker",
        language: "typescript",
        code: `// Producer: accept the write fast, defer the heavy work (fan-out) to a queue.
async function createPost(userId: string, post: Post) {
  const id = await db.posts.insert(post);        // durable write of the source of truth
  await queue.publish("fanout", { postId: id, userId, key: id }); // async fan-out
  return id;                                      // fast ack; followers updated eventually
}

// Consumer: at-least-once delivery means retries -> must be idempotent.
async function fanoutWorker(msg: { postId: string; userId: string; key: string }) {
  if (await alreadyProcessed(msg.key)) return;   // dedup on key: exactly-once effect
  const followers = await db.getFollowers(msg.userId);
  await db.batchInsertFeedEntries(followers, msg.postId); // batched write
  await markProcessed(msg.key);
}`,
      },
    ],

    memoryCard: {
      problem: "Systems slow under load, but reads and writes hit different limits and need different fixes; a bigger box helps neither for long.",
      mentalModel: "A library: scale reads by spreading photocopies (cache/replicas/CDN); scale writes by splitting branches and using a return slot (shard/queue/write-optimized).",
      keyConcepts: ["diagnose read:write ratio first", "reads: cache + replicas + CDN + precompute", "writes: shard + async queue + LSM + batch", "replicas cause lag and do not scale writes", "CQRS when needs diverge", "idempotent consumers for async writes"],
      productionConnection: "Read-heavy systems win with caching/replicas/CDN; write-heavy systems shard and buffer with durable queues plus idempotent workers; CQRS only when read/write requirements conflict.",
      oneLiner: "Reads scale by spreading copies (cache/replicas/CDN); writes scale by splitting and buffering (shard/queue/write-optimized) -- measure the ratio, then pick the matching lever.",
    },

    quiz: [
      {
        id: "srw-q1",
        prompt: "Your system is 200:1 read-to-write and falling over. What is the highest-ROI first move?",
        choices: [
          { text: "Shard the database", correct: false },
          { text: "Add caching (and read replicas) to offload the dominant read load", correct: true },
          { text: "Introduce CQRS", correct: false },
          { text: "Add a write queue", correct: false },
        ],
        explanation: "It is overwhelmingly read-heavy, so caching (a cache hit avoids the DB entirely) plus read replicas offloads the bottleneck cheaply. Sharding and queues target write bottlenecks, which is not the problem here.",
      },
      {
        id: "srw-q2",
        prompt: "Why don't read replicas help when the write path is the bottleneck?",
        choices: [
          { text: "Replicas are slower than the primary", correct: false },
          { text: "Every write still goes to the primary and must be applied to every replica; replicas only add read capacity", correct: true },
          { text: "Replicas cannot store writes at all", correct: false },
          { text: "Replicas increase write latency to zero", correct: false },
        ],
        explanation: "Replication scales reads by serving copies, but all writes flow through the primary and replicate outward, so replicas add write load rather than relieving it. To scale writes you must shard.",
      },
      {
        id: "srw-q3",
        prompt: "What must you ensure when moving writes to an asynchronous queue?",
        choices: [
          { text: "That the queue is read-only", correct: false },
          { text: "That consumers are idempotent, because at-least-once delivery means retries can duplicate the write", correct: true },
          { text: "That you disable all retries", correct: false },
          { text: "That reads also go through the queue", correct: false },
        ],
        explanation: "Durable queues deliver at-least-once, so a message can be processed more than once. Idempotent consumers (dedup on a key) ensure retries do not duplicate side effects -- exactly-once effect from at-least-once delivery.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Pick the right scaling lever for two bottlenecks",
      brief: "Given a service that first becomes read-bound and later write-bound, choose and justify the technique for each phase.",
      steps: `1. Phase 1: measure a 150:1 read:write ratio. List the read-scaling levers (cache, replicas, CDN, precompute) and pick the first two, naming each trade-off (staleness, lag).\n2. State how you will handle read-your-writes given replication lag.\n3. Phase 2: a spike makes fan-out (writes) the bottleneck. Explain why the read levers no longer help.\n4. Choose write-scaling levers (shard + async queue + batching) and justify them, including idempotent consumers.\n5. Decide whether CQRS is warranted and justify yes/no by whether read and write requirements truly diverge.`,
      successCriteria: [
        "Correctly applies read levers (cache/replicas/CDN) to the read-bound phase with trade-offs named",
        "Recognizes read levers cannot fix the write-bound phase and switches to shard/queue/batch with idempotency",
        "Makes a justified CQRS yes/no decision based on diverging requirements",
      ],
    },
  },

  {
    slug: "estimation-back-of-envelope",
    title: "Back-of-the-Envelope Estimation",
    track: "shared",
    phase: "system-design",
    module: "sd-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Rough, fast calculations of QPS, storage, and bandwidth from a few assumptions -- so you can right-size a design in minutes and know whether it fits on one box or needs a fleet. Order of magnitude, not precision.",
    prerequisites: ["system-design-framework"],
    relatedConcepts: ["system-design-framework", "scaling-reads-writes", "sharding-partitioning"],
    tags: ["estimation", "capacity-planning", "qps", "storage", "bandwidth", "system-design"],

    why: `You cannot choose an architecture without knowing its scale, but you rarely have exact numbers early -- and you do not need them. **Back-of-the-envelope estimation exists to turn a few reasonable assumptions into rough magnitudes for QPS, storage, and bandwidth**, fast enough to do in your head or on a napkin, so you can right-size a design before writing any code.

The value is in the **order of magnitude**, not precision. The difference between 10 QPS and 10,000 QPS is the difference between "one small server" and "a load-balanced, sharded fleet with caching" -- and getting that magnitude right steers every subsequent decision. Estimation prevents the two big failures: over-engineering (building for millions when you have thousands) and under-engineering (a design that silently cannot hold the load). In interviews it is a scored step; in real design docs it is what justifies the infrastructure spend. A senior engineer can sanity-check "will this fit on one box?" in two minutes -- that skill is estimation.`,

    intuition: `Estimation is like a **contractor eyeballing a job before quoting**. They do not measure every brick; they think "roughly this many square meters, at roughly this cost per meter, so roughly this total" -- and that rough number tells them whether it is a weekend job or a six-month project. Precision comes later; the estimate decides the *category* of the work.

The mental trick is **known anchors and round numbers**. You memorize a handful of reference points -- seconds in a day, bytes in common data types, latency of a memory read vs a disk read vs a network hop -- and then chain simple multiplications, rounding aggressively. "A million users, each does ten actions a day" becomes "ten million actions a day, over ~100,000 seconds, so ~100 QPS average." No calculator, no spreadsheet -- just anchors and multiplication to land the magnitude.`,

    howItWorks: `### The anchors worth memorizing
- **Time:** 1 day is ~86,400 s, so **~100,000 s/day** (round up). 1 month is ~2.5 million s. Rounding \`seconds/day\` to 10^5 makes "per day -> per second" a clean divide by 100,000.
- **Powers of 2 / data sizes:** 2^10 = ~1 thousand (KB), 2^20 = ~1 million (MB), 2^30 = ~1 billion (GB), 2^40 = TB. So a "byte per user for a billion users" ~ 1 GB.
- **Typical sizes:** a UUID ~16 bytes, a timestamp ~8 bytes, a short text row ~ hundreds of bytes to ~1 KB, an image ~ hundreds of KB to a few MB.
- **Latency numbers ("every engineer should know"):** memory read ~100 ns, SSD read ~100 us, network round trip within a datacenter ~0.5 ms, cross-continent ~100+ ms. These tell you where time goes.

### The standard chain
1. **QPS:** \`(daily active users x actions per user per day) / 100,000\` = average QPS. Then **peak QPS ~ 2x-10x average** (traffic is bursty), so multiply.
2. **Storage:** \`(new records per day x bytes per record) x retention days\` -- then account for indexes/replication (often x2-x5).
3. **Bandwidth:** \`QPS x average response size\` for egress; do the same for ingest.
4. **Memory (cache):** apply the 80/20 rule -- \`~20% of data (the hot set) x its size\` tells you if it fits in RAM.

### Round and sanity-check
Round every input to one significant figure, compute, then ask "does the magnitude make sense, and does it fit on one box or need a fleet?"`,

    internals: `- **Round early and aggressively.** Carrying precise figures wastes time and gives false confidence; one significant figure is the right resolution. The magnitude is the deliverable.
- **The 10^5 s/day trick** (86,400 rounded up to 100,000) makes daily->per-second a division by 100,000 you can do in your head, and the slight over-rounding conservatively lowers QPS a touch.
- **Average vs peak is the classic miss.** Sizing for average QPS guarantees you fall over at peak. Always convert to peak (x2-x10 depending on how bursty) before choosing capacity.
- **Read vs write separately** (ties to scaling): a 100:1 read:write ratio means your read estimate dominates capacity for caching/replicas while writes dominate storage growth.
- **Storage must include overhead:** indexes, replication factor (often 3x), and headroom. A naive "rows x bytes" underestimates real disk by several-fold.
- **The 80/20 (hot set) rule sizes caches:** roughly 20% of the data serves 80% of requests; estimating the hot set tells you if a cache fits in RAM and how big Redis must be.
- **Latency anchors reveal the bottleneck:** if a request does 5 sequential cross-DB round trips at 100 ms each, that is 500 ms regardless of CPU -- estimation of *where time goes* is as useful as estimation of *how much*.
- **The goal is a decision, not a number:** "~100 QPS, ~50 GB/year -> fits on one modest box with backups" or "~500k peak QPS, ~5 PB -> needs sharding, caching, CDN." That conclusion is the point.`,

    diagram: {
      title: "The estimation chain: assumptions -> magnitudes -> decision",
      layers: [
        { id: "assume", label: "Assumptions", sub: "DAU, actions/user/day, bytes/record, retention" },
        { id: "qps", label: "QPS", sub: "(DAU x actions)/1e5 = avg; peak ~ 2-10x avg" },
        { id: "storage", label: "Storage", sub: "records/day x bytes x retention x (index+replication)" },
        { id: "bw", label: "Bandwidth + cache", sub: "QPS x response size; hot set (~20%) for RAM" },
        { id: "decision", label: "Decision", sub: "one box vs sharded fleet + cache + CDN" },
      ],
      caption: "Chain rounded assumptions into QPS, storage, and bandwidth; the output is an architecture-sizing decision, not a precise figure.",
    },

    realWorld: `Designing a photo-sharing service, an engineer estimates in two minutes: 10M DAU, each uploads 1 photo/day and views 50. Writes = 10M/day / 1e5 = **100 write QPS** (peak ~500). Reads = 500M/day / 1e5 = **5,000 read QPS** (peak ~25,000) -- clearly read-heavy, so caching and a CDN are essential. Storage: 10M photos/day x ~1 MB = 10 TB/day, x 365 x ~1.5 (thumbnails/metadata) ~ **5+ PB/year** -- far beyond one box, so object storage (S3) plus sharded metadata. Bandwidth (egress): 25,000 peak read QPS x ~1 MB ~ **25 GB/s** at peak -- a CDN is mandatory to survive that. In minutes, with no code, the estimate has dictated the entire shape: object store, sharded metadata DB, aggressive caching, and a CDN. **The numbers designed the system.**`,

    production: `- **Memorize the anchors** (10^5 s/day, powers-of-2 data sizes, latency numbers) so you can estimate without tools -- in interviews and in real design reviews.
- **Always compute peak, not just average QPS** (x2-x10), and size capacity for peak with headroom.
- **Estimate read and write QPS separately** -- they drive different scaling tools and different parts of the cost.
- **Include storage overhead:** indexes, replication factor (often 3x), and growth/retention -- naive row math under-counts real disk badly.
- **Use the 80/20 hot-set rule to size caches** and decide whether the working set fits in RAM.
- **Round to one significant figure** and state your assumptions explicitly so reviewers can challenge them, not the arithmetic.
- **End every estimate with a decision:** does it fit on one box, or does it force sharding/caching/CDN? That conclusion is the point of the exercise.
- **Re-estimate as assumptions change;** a design doc's numbers are living, and a 10x growth assumption can flip the architecture.`,

    commonMistakes: [
      "Chasing precision instead of order of magnitude -- the magnitude is what changes the architecture.",
      "Sizing for average QPS and falling over at peak (forgetting the 2x-10x peak multiplier).",
      "Estimating reads and writes together, hiding a lopsided ratio that should drive the design.",
      "Ignoring storage overhead (indexes, 3x replication, retention), underestimating real disk by several-fold.",
      "Not memorizing anchors (seconds/day, data sizes, latency numbers), so estimation is slow or impossible.",
      "Producing a number but no decision -- the point is 'one box vs a fleet,' not the digits.",
      "Never revisiting estimates when growth assumptions change, leaving a design sized for the wrong scale.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Rough (1 sig fig) estimate | Fast, decides architecture magnitude | Not precise -- do not use for billing |
| Round seconds/day to 1e5 | Trivial mental math | Slightly under-counts QPS (usually fine/conservative) |
| Size for peak (x2-10) | Survives bursts | Some over-provisioning cost |
| Include replication/index overhead | Realistic storage | More assumptions to state |
| 80/20 hot-set caching | Right-sized cache | Assumption may not hold for uniform access |`,

    whenToUse: [
      "Early in any design (interview or real) to right-size the architecture before building.",
      "Sanity-checking a proposed design: 'will this fit on one box or need a fleet?'",
      "Capacity planning: how much RAM for the cache, how many shards, how much storage per year.",
    ],
    whenNotToUse: [
      "Final billing/procurement numbers -- use measured data and precise pricing, not a napkin.",
      "When real production metrics exist -- measure instead of estimate.",
      "Micro-optimizations where order-of-magnitude reasoning is too coarse to help.",
    ],

    code: [
      {
        label: "The estimation chain in code (assumptions -> QPS, storage, bandwidth)",
        language: "typescript",
        code: `// Order-of-magnitude estimate for a read-heavy service. Round aggressively.
const SEC_PER_DAY = 1e5;               // 86,400 rounded up -> clean mental math

const dau = 10_000_000;                // 10M daily active users
const writesPerUser = 1;              // e.g. 1 upload/day
const readsPerUser = 50;             // e.g. 50 views/day

const avgWriteQps = (dau * writesPerUser) / SEC_PER_DAY;  // 100
const avgReadQps  = (dau * readsPerUser)  / SEC_PER_DAY;  // 5,000
const peakFactor  = 5;                                     // traffic is bursty
const peakReadQps = avgReadQps * peakFactor;              // 25,000  -> needs cache + CDN

// Storage: records/day x bytes x retention x overhead(index+replication)
const bytesPerPhoto = 1e6;            // ~1 MB
const overhead = 1.5;                // thumbnails/metadata (photos in object store)
const storagePerYear = dau * writesPerUser * bytesPerPhoto * 365 * overhead; // ~5.5 PB

// Egress bandwidth at peak
const bytesPerRead = 1e6;
const peakEgress = peakReadQps * bytesPerRead; // ~25 GB/s -> CDN mandatory

// DECISION (the actual output): object storage + sharded metadata + cache + CDN.`,
      },
      {
        label: "Anchors worth memorizing",
        language: "text",
        code: `TIME
  1 day  ~ 86,400 s   -> round to 1e5 s  (per-day / 1e5 = per-second)
  1 month ~ 2.5e6 s

DATA SIZES (powers of 2, rounded)
  2^10 ~ 1 thousand  (1 KB)
  2^20 ~ 1 million   (1 MB)
  2^30 ~ 1 billion   (1 GB)
  2^40 ~ 1 trillion  (1 TB)
  UUID ~16 B | timestamp ~8 B | small row ~0.1-1 KB | image ~0.5-5 MB

LATENCY (know where time goes)
  memory read        ~100 ns
  SSD random read    ~100 us
  same-DC round trip ~0.5 ms
  cross-continent    ~100+ ms

RULES OF THUMB
  peak QPS ~ 2-10x average QPS
  storage overhead: indexes + ~3x replication + retention
  cache hot set ~ 20% of data serves ~80% of requests`,
      },
    ],

    memoryCard: {
      problem: "You must right-size an architecture before building, but exact numbers are unavailable and unnecessary early on.",
      mentalModel: "A contractor eyeballing a job: rough square-meters x cost/meter tells you weekend-job vs six-month-project. Anchors + round multiplication give the magnitude.",
      keyConcepts: ["order of magnitude, not precision", "1e5 s/day trick", "avg QPS then peak (x2-10)", "storage = records x bytes x retention x overhead", "80/20 hot set for cache size", "output is a decision: one box vs fleet"],
      productionConnection: "Design docs lead with estimated read/write QPS, storage, and bandwidth to justify caching, sharding, CDN, and infra spend; re-estimate as growth assumptions change.",
      oneLiner: "Chain a few rounded assumptions into QPS, storage, and bandwidth to decide, in minutes, whether a design fits on one box or needs a fleet.",
    },

    quiz: [
      {
        id: "est-q1",
        prompt: "10 million users each perform 10 actions per day. Roughly what is the average QPS?",
        choices: [
          { text: "~10 QPS", correct: false },
          { text: "~1,000 QPS", correct: true },
          { text: "~100,000 QPS", correct: false },
          { text: "~10 million QPS", correct: false },
        ],
        explanation: "10M x 10 = 100M actions/day. Dividing by ~100,000 s/day gives ~1,000 QPS average. (You would then multiply by a peak factor of 2-10x for capacity planning.)",
      },
      {
        id: "est-q2",
        prompt: "Why is order of magnitude the goal of back-of-the-envelope estimation, not precision?",
        choices: [
          { text: "Because precise math is impossible", correct: false },
          { text: "The magnitude (10 vs 10,000 QPS) is what changes the architecture; exact digits do not", correct: true },
          { text: "Because estimates are used for billing", correct: false },
          { text: "To make the calculation take longer", correct: false },
        ],
        explanation: "The difference between one small server and a sharded, cached fleet is decided by the order of magnitude. Chasing precision wastes time and adds false confidence without changing the design decision.",
      },
      {
        id: "est-q3",
        prompt: "Why must you convert average QPS to peak QPS when sizing capacity?",
        choices: [
          { text: "Peak QPS is always equal to average", correct: false },
          { text: "Traffic is bursty (peaks are ~2-10x average), so sizing for average means the system falls over at peak", correct: true },
          { text: "Peak QPS is only relevant for storage", correct: false },
          { text: "It reduces the estimate", correct: false },
        ],
        explanation: "Real traffic spikes well above average. Provisioning only for average capacity guarantees overload during peaks, so you multiply average by a peak factor (2-10x) and size for that with headroom.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Estimate a service on a napkin",
      brief: "Pick a service (e.g. a chat app or a URL shortener) and produce QPS, storage, and bandwidth estimates that lead to an architecture-sizing decision.",
      steps: `1. State assumptions: DAU, actions/user/day (split reads vs writes), bytes/record, retention.\n2. Compute average read QPS and write QPS using the 1e5 s/day trick, then multiply by a peak factor (2-10x).\n3. Compute yearly storage: records/day x bytes x retention x overhead (indexes + ~3x replication).\n4. Compute peak egress bandwidth (peak read QPS x response size).\n5. Conclude: does it fit on one box, or does it require caching, sharding, and/or a CDN? State the resulting components.`,
      successCriteria: [
        "Assumptions stated and read/write QPS estimated separately, with a peak multiplier applied",
        "Storage includes overhead (indexes + replication + retention); bandwidth computed at peak",
        "Ends with a concrete sizing decision (one box vs fleet + cache/CDN/shards)",
      ],
    },
  },
];
