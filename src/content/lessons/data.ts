import type { Lesson } from "../types";

export const dataLessons: Lesson[] = [
  {
    slug: "redis-deep",
    title: "Redis (Deep)",
    track: "shared",
    phase: "redis",
    module: "redis-core",
    difficulty: "core",
    estMinutes: 28,
    summary:
      "Why an in-memory single-threaded data structure server is so fast, how it persists and replicates, its eviction/TTL model, and exactly when Redis is the wrong choice.",
    prerequisites: [],
    relatedConcepts: ["caching-dual", "distributed-locks", "cache-invalidation"],
    tags: ["redis", "cache", "in-memory", "eviction", "persistence", "replication"],

    why: `Disk and network are slow; RAM is ~100,000x faster than a disk seek. Many workloads repeatedly need the same small pieces of data (sessions, counters, hot rows, rate-limit state). **Redis exists to serve and mutate those pieces from memory in microseconds**, with rich data structures, so you don't rebuild a fast key-value+structures store yourself and don't melt your primary database with repeated reads.`,

    intuition: `Redis is a **whiteboard shared by all your servers**. It's blazing fast because it's in memory and does one thing at a time (single-threaded command execution -- no lock contention). But a whiteboard has limited space (RAM), can be wiped if the room loses power (unless you persist), and if you write nonsense to it, *every* server reads nonsense.`,

    howItWorks: `- **In-memory + single-threaded command loop:** each command runs to completion atomically, so \`INCR\`, \`SETNX\`, etc. are race-free without your own locks. This also means **one slow command (e.g. \`KEYS *\`) blocks everyone.**
- **Rich types:** strings, hashes, lists, sets, sorted sets (leaderboards!), streams, bitmaps, HyperLogLog. Choosing the right type is most of good Redis use.
- **TTL + eviction:** keys can expire; when memory fills, an **eviction policy** (e.g. \`allkeys-lru\`) decides what to drop.
- **Persistence:** **RDB** (periodic snapshots -- compact, but you can lose the last few minutes) and **AOF** (append every write -- durable, larger, slower). You can combine them.
- **Replication + Sentinel/Cluster:** async replicas for read scaling/failover; Cluster shards the keyspace across nodes.`,

    internals: `- **Async replication means a failover can lose recently-acknowledged writes** -- Redis is not a source of truth for money.
- **Eviction policies matter:** \`noeviction\` (errors when full), \`allkeys-lru\`, \`volatile-ttl\`, etc. The wrong one turns "cache full" into "app throwing errors."
- **Single-threaded means avoid O(N) commands on big keys** in production (\`KEYS\`, \`SMEMBERS\` on huge sets); use \`SCAN\`.
- **Pipelining** batches commands to cut round trips; **Lua scripts** run multiple ops atomically server-side.
- **maxmemory + policy** is the single most important production setting; without it Redis can OOM the box.`,

    diagram: {
      title: "Redis in a system",
      layers: [
        { id: "apps", label: "App servers", sub: "many, stateless" },
        { id: "redis", label: "Redis primary", sub: "in-memory, single-threaded, atomic ops" },
        { id: "repl", label: "Replicas (async)", sub: "read scaling + failover (may lag)" },
        { id: "persist", label: "RDB + AOF", sub: "snapshot + append log" },
        { id: "db", label: "Source of truth (Postgres)", sub: "Redis is a cache, not the DB" },
      ],
    },

    realWorld: `A team uses Redis as the *primary* store for wallet balances "because it's fast." A node fails over to a replica that was 800ms behind; several confirmed top-ups vanish. Redis did nothing wrong -- **async replication doesn't guarantee durability of the last writes.** Redis is superb for caching, sessions, rate limits, and leaderboards; it is the wrong system of record for money.`,

    production: `- **Always set \`maxmemory\` + an eviction policy** that matches intent (cache -> \`allkeys-lru\`).
- **Never run O(N) commands** (\`KEYS *\`) on production; use \`SCAN\`.
- **Treat Redis as a cache, not a database** unless you accept possible loss of recent writes.
- **Monitor \`used_memory\`, \`evicted_keys\`, \`keyspace_hits/misses\`, replication lag, and slowlog.**
- **Use the right data structure** -- a sorted set for a leaderboard beats sorting in the app.`,

    commonMistakes: [
      "Using Redis as the source of truth for critical data (async replication can lose writes).",
      "No maxmemory/eviction policy -> Redis OOMs the host or errors under load.",
      "Running KEYS * or big O(N) ops that block the single thread for everyone.",
      "Storing giant values/collections in one key (hot key, slow ops).",
      "Assuming a cache hit is free consistency -- stale data still needs TTL/invalidation.",
    ],

    tradeoffs: `| Property | Benefit | Cost |
|---|---|---|
| In-memory | Microsecond latency | Bounded by RAM; expensive per GB |
| Single-threaded | Atomic ops, no lock contention | One slow command blocks all |
| Async replication | Read scaling, fast failover | Possible loss of recent writes |
| RDB vs AOF | Compact vs durable | Snapshot loses minutes / AOF is larger+slower |`,

    whenToUse: ["Caching, sessions, rate limiting, counters, leaderboards, ephemeral queues, pub/sub, distributed locks (with care)."],
    whenNotToUse: ["System of record for data you cannot lose (money, orders).", "Datasets far larger than RAM.", "Complex queries/joins (that's the database's job)."],

    memoryCard: {
      problem: "Serve and mutate small, hot pieces of shared state in microseconds without hammering the database.",
      mentalModel: "A shared whiteboard: instant and visible to all servers, but limited, wipeable, and single-writer at a time.",
      keyConcepts: ["in-memory + single-threaded atomic ops", "rich data types", "TTL + eviction policy", "RDB vs AOF", "async replication (may lose writes)"],
      productionConnection: "Set maxmemory+policy, avoid O(N) commands, treat as a cache not a DB; monitor hit rate and eviction.",
      oneLiner: "Redis is a microsecond in-memory structure server -- perfect as a cache/coordination layer, wrong as your source of truth for critical data.",
    },

    quiz: [
      {
        id: "redis-q1",
        prompt: "Why can INCR and SETNX be used safely without your own locks?",
        choices: [
          { text: "Redis uses row-level locking", correct: false },
          { text: "Redis executes each command atomically on a single thread", correct: true },
          { text: "Because they run on replicas", correct: false },
          { text: "Because they use transactions by default", correct: false },
        ],
        explanation: "Redis runs commands one at a time on a single thread, so each command is atomic -- no interleaving, no need for external locks for single-command operations.",
      },
      {
        id: "redis-q2",
        prompt: "Why is Redis a poor system of record for wallet balances?",
        choices: [
          { text: "It can't store numbers", correct: false },
          { text: "Async replication + failover can lose recently acknowledged writes", correct: true },
          { text: "It has no TTL support", correct: false },
          { text: "It is too slow for money", correct: false },
        ],
        explanation: "Redis replication is asynchronous; a failover to a lagging replica can drop the last writes. That's unacceptable for money -- use a durable, transactional database.",
      },
      {
        id: "redis-q3",
        prompt: "What does running KEYS * on a large production Redis risk?",
        choices: [
          { text: "Nothing, it is optimized", correct: false },
          { text: "Blocking the single command thread and stalling all other clients", correct: true },
          { text: "Deleting all keys", correct: false },
          { text: "Triggering a failover", correct: false },
        ],
        explanation: "KEYS is O(N) and runs on the single command thread, so it blocks every other client for the scan's duration. Use SCAN, which is incremental.",
      },
    ],

    lab: {
      kind: "terminal",
      title: "Redis memory pressure",
      brief: "evicted_keys is climbing and hit rate is falling. Inspect INFO memory and decide between raising maxmemory, changing policy, or fixing key sizes.",
      scenarioId: "redis-eviction",
      successCriteria: ["Read used_memory vs maxmemory", "Correlate eviction with hit-rate drop", "Pick correct remedy"],
    },
  },

  {
    slug: "pg-indexes",
    title: "PostgreSQL Indexes",
    track: "shared",
    phase: "postgres",
    module: "pg-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "Why a B-tree index turns a table scan into a logarithmic lookup, how to read EXPLAIN, composite/covering indexes, and the write-side cost people forget.",
    prerequisites: [],
    relatedConcepts: ["pg-query-planning", "n-plus-one", "pg-transactions-mvcc"],
    tags: ["postgres", "index", "b-tree", "explain", "query", "performance"],

    why: `Without an index, finding rows means reading the **whole table** (a sequential scan): O(N). At a million rows that's fine occasionally and fatal on the hot path. **An index is a sorted, secondary structure that lets the database jump straight to matching rows** in O(log N), turning a 2-second query into a 2-millisecond one. Indexing is the single highest-leverage database skill.`,

    intuition: `An index is the **index at the back of a textbook**. To find every mention of "mutex," you don't read all 900 pages (sequential scan) -- you flip to the index, which is alphabetically sorted, find "mutex -> pp. 44, 210," and jump there. The cost: every time the book is edited, the back index must be updated too. Same with database indexes -- **fast reads, slower writes.**`,

    howItWorks: `- **B-tree (default):** a balanced sorted tree. Great for equality (\`=\`) and range (\`<\`, \`>\`, \`BETWEEN\`, \`ORDER BY\`, prefix \`LIKE 'abc%'\`). This is 95% of what you need.
- **Composite index \`(a, b)\`:** sorted by a, then b. Usable for filters on \`a\`, or \`a AND b\`, but **not for \`b\` alone** -- the leftmost-prefix rule.
- **Covering index (\`INCLUDE\`)**: stores extra columns so the query is answered from the index alone -- an **index-only scan**, no heap fetch.
- **Partial index:** \`WHERE status = 'active'\` -- smaller/faster when you only query a subset.
- **Other types:** GIN (JSONB, full-text, arrays), GiST (geo/ranges), BRIN (huge append-only tables), Hash (equality only).`,

    internals: `- **Read the planner with \`EXPLAIN (ANALYZE, BUFFERS)\`.** Look for **Seq Scan** on big tables (bad on hot paths), **Index Scan / Index Only Scan** (good), and the gap between **estimated vs actual rows** (bad stats -> bad plans; run \`ANALYZE\`).
- **The planner may ignore your index** if it thinks a seq scan is cheaper (e.g. the query returns most of the table, or stats are stale).
- **Write cost:** every INSERT/UPDATE/DELETE must update every index on the table. Over-indexing slows writes and bloats storage.
- **Index order matters for ORDER BY:** a \`(created_at DESC)\` index can serve \`ORDER BY created_at DESC LIMIT 20\` without a sort.
- **Functions break indexes:** \`WHERE lower(email) = ...\` won't use an index on \`email\` -- you need an expression index on \`lower(email)\`.`,

    diagram: {
      title: "Seq scan vs index scan",
      layers: [
        { id: "query", label: "SELECT ... WHERE email = ?", sub: "" },
        { id: "seq", label: "No index -> Seq Scan", sub: "read all N rows: O(N)" },
        { id: "btree", label: "B-tree index", sub: "descend sorted tree: O(log N)" },
        { id: "heap", label: "Heap fetch", sub: "index -> row location (skipped if covering)" },
        { id: "result", label: "Rows returned", sub: "ms instead of seconds" },
      ],
    },

    realWorld: `A dashboard query \`WHERE tenant_id = ? AND created_at > ?\` is slow. \`EXPLAIN ANALYZE\` shows a Seq Scan over 40M rows. Adding a composite index \`(tenant_id, created_at)\` -- leftmost column is the equality filter, second is the range -- drops it from 3.2s to 4ms. The order matters: \`(created_at, tenant_id)\` would be far worse for this query.`,

    production: `- **Index the columns in your WHERE/JOIN/ORDER BY on hot queries** -- verify with EXPLAIN ANALYZE, don't guess.
- **Composite index column order = equality columns first, then range/sort column.**
- **Use \`CREATE INDEX CONCURRENTLY\`** in production so you don't lock writes on a big table.
- **Drop unused indexes** (check \`pg_stat_user_indexes\`) -- they cost write performance for nothing.
- **Keep stats fresh** (autovacuum/ANALYZE) so the planner makes good choices.`,

    commonMistakes: [
      "Adding an index and never checking EXPLAIN to confirm it's used.",
      "Wrong composite order (range column before equality column).",
      "Wrapping the indexed column in a function (lower(), casts) so the index is ignored.",
      "Over-indexing: many redundant indexes that slow every write.",
      "Creating indexes without CONCURRENTLY and locking a big table in prod.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Add index | O(log N) reads, sorted scans | Slower writes, more storage |
| Composite (a,b) | Serves a and a+b filters | Useless for b alone; larger |
| Covering (INCLUDE) | Index-only scan, no heap fetch | Bigger index |
| Partial | Small, fast for a subset | Only helps matching queries |`,

    whenToUse: ["Columns filtered/joined/sorted on hot-path queries; foreign keys; uniqueness constraints."],
    whenNotToUse: ["Low-cardinality columns queried alone (a boolean) where a scan is as cheap.", "Write-heavy tables where an index's read benefit is rarely used.", "Tiny tables (the planner will seq-scan anyway)."],

    memoryCard: {
      problem: "Find matching rows without reading the entire table on every query.",
      mentalModel: "The alphabetical index at the back of a textbook: jump straight to the page, but re-index on every edit.",
      keyConcepts: ["B-tree = equality + range + sort", "leftmost-prefix rule for composites", "covering / index-only scan", "EXPLAIN ANALYZE", "write-side cost"],
      productionConnection: "Composite order = equality then range; verify with EXPLAIN; build CONCURRENTLY; drop unused indexes.",
      oneLiner: "An index trades slower writes for O(log N) reads -- put equality columns first, verify with EXPLAIN, and don't index blindly.",
    },

    quiz: [
      {
        id: "pg-q1",
        prompt: "For WHERE tenant_id = ? AND created_at > ?, which composite index is best?",
        choices: [
          { text: "(created_at, tenant_id)", correct: false },
          { text: "(tenant_id, created_at)", correct: true },
          { text: "(created_at) only", correct: false },
          { text: "No index; let it seq scan", correct: false },
        ],
        explanation: "Put the equality column (tenant_id) first so the tree narrows to one tenant, then the range column (created_at) is already sorted within it. The reverse order can't use the range efficiently after an equality.",
      },
      {
        id: "pg-q2",
        prompt: "Why might Postgres ignore an index you created?",
        choices: [
          { text: "Indexes are optional decorations", correct: false },
          { text: "The planner estimates a seq scan is cheaper (e.g. query returns most rows, or stats are stale)", correct: true },
          { text: "You must restart Postgres first", correct: false },
          { text: "Indexes only work on primary keys", correct: false },
        ],
        explanation: "The cost-based planner uses table statistics. If a query returns a large fraction of rows, or ANALYZE stats are stale, a sequential scan can genuinely be cheaper and the planner will choose it.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Fix a slow query with EXPLAIN",
      brief: "Given an EXPLAIN ANALYZE showing a Seq Scan on 40M rows for a tenant+time-range query, prescribe the index and predict the plan change.",
      steps: `1. Identify filter columns and their operators (equality vs range).\n2. Propose composite index: equality column(s) first, then range.\n3. Consider INCLUDE columns for an index-only scan.\n4. Note CREATE INDEX CONCURRENTLY to avoid locking.\n5. Predict: Seq Scan -> Index Scan, ms latency.`,
      successCriteria: ["Correct composite order", "Recognizes covering-index opportunity", "Uses CONCURRENTLY"],
    },
  },

  {
    slug: "kafka-fundamentals",
    title: "Kafka Fundamentals",
    track: "shared",
    phase: "kafka",
    module: "kafka-core",
    difficulty: "advanced",
    estMinutes: 30,
    summary:
      "Kafka as a distributed, replayable commit log: topics, partitions, offsets, consumer groups, ordering, and delivery semantics -- and why 'the log' is such a powerful abstraction.",
    prerequisites: ["background-jobs-dual"],
    relatedConcepts: ["consumer-groups-lag", "delivery-semantics", "outbox-pattern", "distributed"],
    tags: ["kafka", "log", "partitions", "offsets", "consumer-groups", "event-driven"],

    why: `Point-to-point integrations (service A calls B calls C) become an unmaintainable web as systems grow, and they couple producers to consumers' availability. **Kafka exists to decouple them via a durable, replayable log**: producers append events; any number of independent consumers read at their own pace, now or replayed from the past. It's the backbone of event-driven architectures, stream processing, and data pipelines.`,

    intuition: `Kafka is a **shared, append-only journal** that everyone can read from independently. Unlike a traditional queue (where reading removes the message), Kafka **keeps the events** and each reader just remembers *how far they've read* (their offset). New consumer? Start from the beginning and replay all of history. Bug in a consumer? Fix it and re-read. The log is the source of truth.`,

    howItWorks: `- **Topic:** a named stream of events (e.g. \`orders\`).
- **Partitions:** each topic is split into partitions for parallelism. **Ordering is guaranteed only within a partition**, not across the topic.
- **Key -> partition:** events with the same key (e.g. \`order_id\`) go to the same partition, so they stay ordered relative to each other.
- **Offset:** each event's position in a partition. Consumers commit offsets to track progress.
- **Consumer group:** a set of consumers that **split the partitions** among themselves for scale. Each partition is consumed by exactly one member of a group; add consumers up to the partition count to scale out.
- **Retention:** events persist for a configured time/size (or forever with compaction) -- enabling replay.`,

    internals: `- **Replication:** each partition has a leader and follower replicas across brokers; \`acks=all\` waits for in-sync replicas before acknowledging a write (durability vs latency trade-off).
- **Delivery semantics:** at-most-once (commit offset before processing -- may lose), at-least-once (process then commit -- may duplicate; the common default), exactly-once (transactions + idempotent producer -- more overhead).
- **Consumer lag** = latest offset minus committed offset: *the* health metric. Growing lag means consumers can't keep up.
- **Rebalancing:** when a consumer joins/leaves, partitions are reassigned -- briefly pausing consumption. Frequent rebalances (from slow processing / long GC) hurt throughput.
- **Partition count is hard to increase gracefully** (it changes key->partition mapping), so plan it up front.`,

    diagram: {
      title: "Topic, partitions, consumer group",
      layers: [
        { id: "prod", label: "Producers", sub: "append events (keyed)" },
        { id: "topic", label: "Topic: orders", sub: "split into partitions P0..P3" },
        { id: "order", label: "Ordering", sub: "guaranteed within a partition only" },
        { id: "group", label: "Consumer group", sub: "partitions split across members" },
        { id: "offset", label: "Offsets + retention", sub: "each consumer tracks position; replay possible" },
      ],
    },

    realWorld: `An \`orders\` topic uses \`order_id\` as the key, so all events for one order land in the same partition and stay ordered (created -> paid -> shipped). A new analytics team spins up a **separate consumer group** and replays 30 days of history to backfill their warehouse -- without affecting the existing fulfillment consumers at all. That independence and replayability is exactly what a traditional queue can't give you.`,

    production: `- **Choose partition count for peak parallelism** up front (consumers can't exceed partitions for scale).
- **Key events that must stay ordered** by the same key (e.g. entity id).
- **Monitor consumer lag** per group/partition -- alert before it becomes hours.
- **Default to at-least-once + idempotent consumers**; reach for exactly-once only when truly needed.
- **Tune \`acks\`, replication factor, and min.insync.replicas** for your durability needs.
- **Watch rebalance frequency**; long processing times trigger rebalances -- increase \`max.poll.interval\` or process faster.`,

    commonMistakes: [
      "Expecting global ordering across a topic (ordering is per-partition only).",
      "Too few partitions -> can't scale consumers; too many -> overhead and rebalance pain.",
      "Assuming exactly-once by default -- it's at-least-once; consumers must be idempotent.",
      "Ignoring consumer lag until it's hours behind.",
      "Slow consumer processing causing constant rebalances.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Log (vs queue) | Replay, many independent consumers | Consumers manage their own offsets |
| More partitions | More parallelism | More overhead, harder ordering, rebalances |
| acks=all | Durable writes | Higher write latency |
| Exactly-once | No duplicates | Throughput + complexity cost |`,

    whenToUse: ["Event-driven architectures, decoupling producers/consumers, stream processing, audit logs, replayable pipelines, fan-out to many consumers."],
    whenNotToUse: ["Simple task queues with one consumer (a queue is simpler).", "Request/response RPC (use HTTP/gRPC).", "Tiny systems where Kafka's operational weight isn't justified."],

    memoryCard: {
      problem: "Decouple producers from many independent consumers with a durable, replayable event stream.",
      mentalModel: "A shared append-only journal: events stay put; each reader just remembers how far they've read.",
      keyConcepts: ["topic + partitions", "ordering per-partition only", "key -> partition", "offsets + consumer groups", "consumer lag", "at-least-once by default"],
      productionConnection: "Key for ordering, size partitions for parallelism, monitor lag, make consumers idempotent.",
      oneLiner: "Kafka is a partitioned, replayable commit log -- ordering holds within a partition, consumers track offsets, and the log itself is the source of truth.",
    },

    quiz: [
      {
        id: "kafka-q1",
        prompt: "Kafka guarantees message ordering at what scope?",
        choices: [
          { text: "Across the entire topic", correct: false },
          { text: "Within a single partition only", correct: true },
          { text: "Across all topics with the same name", correct: false },
          { text: "Only for the first consumer", correct: false },
        ],
        explanation: "Ordering is guaranteed only within a partition. To keep related events ordered, give them the same key so they route to the same partition.",
      },
      {
        id: "kafka-q2",
        prompt: "What does growing consumer lag indicate?",
        choices: [
          { text: "The producers stopped", correct: false },
          { text: "Consumers are falling behind the rate of new events", correct: true },
          { text: "The topic was deleted", correct: false },
          { text: "Replication is complete", correct: false },
        ],
        explanation: "Lag = latest offset minus committed offset. Rising lag means consumption is slower than production -- scale consumers (up to partition count) or speed up processing.",
      },
      {
        id: "kafka-q3",
        prompt: "How does Kafka differ from a traditional queue for multiple consumers?",
        choices: [
          { text: "Reading a message deletes it for everyone", correct: false },
          { text: "Events are retained and each consumer group reads independently at its own offset, enabling replay", correct: true },
          { text: "Only one consumer can ever read a topic", correct: false },
          { text: "It cannot persist messages", correct: false },
        ],
        explanation: "Kafka retains events for the retention window; independent consumer groups each track their own offsets and can replay history -- unlike a queue where a read removes the message.",
      },
    ],

    lab: {
      kind: "terminal",
      title: "Consumer lag incident",
      brief: "A consumer group's lag is climbing into the millions. Investigate partition assignment, processing time, and rebalances to find the cause.",
      scenarioId: "kafka-lag",
      successCriteria: ["Read lag per partition", "Identify slow processing or too few consumers", "Recommend scaling/idempotency"],
    },
  },
];
