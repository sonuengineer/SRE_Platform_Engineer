import type { Lesson } from "../types";

export const kafkaExtraLessons: Lesson[] = [
  {
    slug: "consumer-groups-lag",
    title: "Consumer Groups & Lag",
    track: "shared",
    phase: "kafka",
    module: "kafka-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "How consumer groups split partitions for parallel, fault-tolerant consumption, what rebalancing costs, and why consumer lag is the single most important health metric for a streaming system.",
    prerequisites: ["kafka-fundamentals"],
    relatedConcepts: ["delivery-semantics", "outbox-pattern", "distributed"],
    tags: ["kafka", "consumer-groups", "lag", "rebalance", "partitions", "offsets"],

    why: `A topic can produce far more events than one consumer can handle, and a single consumer is a single point of failure. **Consumer groups exist to scale consumption horizontally and survive consumer failure**: Kafka automatically divides a topic's partitions among the members of a group, so adding consumers adds throughput and losing one triggers automatic reassignment. But the same machinery that gives you elasticity -- rebalancing -- also pauses consumption, and the gap between what has been produced and what has been consumed (lag) is what tells you whether the whole system is keeping up.`,

    intuition: `A consumer group is a **team of workers pulling parcels off a set of conveyor belts (partitions)**. Kafka is the shift manager: it assigns each belt to exactly one worker so no parcel is handled twice within the team. If a worker calls in sick, the manager stops the line briefly and re-assigns that worker's belts to the others (a rebalance). **Lag** is simply how many parcels are still sitting on the belts unhandled -- if that pile grows every hour, your team is understaffed or too slow, no matter how fast any individual worker looks.`,

    howItWorks: `### Partition assignment
- A **consumer group** is identified by a \`group.id\`. Kafka assigns each partition of the subscribed topics to **exactly one** consumer in the group.
- **Parallelism is capped by partition count:** with 6 partitions and 10 consumers, 4 sit idle. With 3 consumers, each owns 2 partitions.
- Multiple **independent groups** each get the full stream -- that is how fan-out works (fulfillment and analytics both read every order).

### Offsets and progress
- Each consumer commits the **offset** it has processed per partition to the internal \`__consumer_offsets\` topic.
- On restart or reassignment, a consumer resumes from the last committed offset -- this is what makes consumption resumable and defines your delivery semantics.

### Rebalancing
- Triggered when a consumer **joins, leaves, or is deemed dead** (misses heartbeats or exceeds \`max.poll.interval.ms\`).
- During a classic (eager) rebalance, **all consumers stop and give up their partitions**, then get new assignments -- a stop-the-world pause. **Cooperative/incremental rebalancing** (newer default) reassigns only the moving partitions, shrinking the pause.

### Lag
- **Lag = log-end-offset (latest produced) minus committed offset (last processed)**, per partition.
- Rising lag means consumption is slower than production. Flat, low lag means you are keeping up.`,

    internals: `- **Two timeouts govern liveness:** \`session.timeout.ms\` (heartbeat thread -- detects a dead consumer) and \`max.poll.interval.ms\` (the app must call poll() again within this window or it is considered stuck and evicted). Slow message processing blows the second one and triggers endless rebalances.
- **Rebalance storms** are a classic outage: a consumer processes slowly, misses max.poll.interval, gets kicked, rejoins, everyone rebalances, throughput drops, processing gets slower -- a doom loop. Fix by processing faster, reducing \`max.poll.records\`, or raising the interval.
- **Static membership** (\`group.instance.id\`) lets a consumer restart without triggering a rebalance, valuable for rolling deploys.
- **Sticky / cooperative assignors** keep most partitions with their current owner across rebalances, avoiding needless cache/state loss.
- **Lag can lie if you only watch the aggregate:** one badly skewed partition (a hot key) can lag heavily while others are empty. Always inspect **per-partition** lag.
- **Committing offsets before processing = at-most-once (data loss risk); after = at-least-once (duplicate risk).** Where you commit is a correctness decision, not a performance tweak.`,

    diagram: {
      title: "Consumer group over partitions",
      layers: [
        { id: "topic", label: "Topic: orders (P0..P5)", sub: "6 partitions, latest offset per partition" },
        { id: "assign", label: "Group A: 3 consumers", sub: "each owns 2 partitions (parallelism <= 6)" },
        { id: "commit", label: "Commit offsets", sub: "per partition to __consumer_offsets" },
        { id: "rebalance", label: "Rebalance on join/leave/timeout", sub: "reassign partitions (cooperative = smaller pause)" },
        { id: "lag", label: "Lag = latest - committed", sub: "per-partition health signal" },
      ],
      caption: "Partitions cap parallelism; rebalances pause consumption; per-partition lag reveals the truth.",
    },

    realWorld: `An orders consumer group runs fine until a downstream API slows down, making each message take 8 seconds. With \`max.poll.records=500\` and \`max.poll.interval.ms=300000\`, a single poll of 500 messages now needs 4000 seconds -- far past the interval. Kafka concludes the consumer is stuck, evicts it, and the group rebalances; the reassigned partitions immediately hit the same wall, so the group thrashes and lag rockets into the millions. The real fix is not more consumers (partitions cap that) but reducing \`max.poll.records\` and speeding up or parallelizing the slow downstream call so each poll finishes within the interval.`,

    production: `- **Set partition count for peak parallelism up front** -- you cannot exceed it with more consumers, and increasing partitions later reshuffles key->partition mapping.
- **Alert on per-partition lag trend**, not just aggregate, and alert on lag *growth* rather than an absolute number.
- **Keep processing time well under \`max.poll.interval.ms\`;** tune \`max.poll.records\` down if each record is expensive.
- **Prefer cooperative rebalancing and static membership** to make deploys and scaling cheap.
- **Make consumers idempotent** so at-least-once redelivery after a rebalance is safe.
- **Watch rebalance frequency** as a first-class metric -- frequent rebalances almost always mean processing is too slow.`,

    commonMistakes: [
      "Adding more consumers than partitions and expecting more throughput -- the extras sit idle.",
      "Slow per-message processing that exceeds max.poll.interval.ms, causing rebalance storms.",
      "Watching only aggregate lag and missing a single hot/skewed partition that is far behind.",
      "Committing offsets before processing, silently dropping messages on any crash (at-most-once).",
      "Ignoring rebalance frequency until the group is thrashing and lag has exploded.",
    ],

    tradeoffs: `| Choice | Benefit | Cost / risk |
|---|---|---|
| More consumers | More parallelism (up to partition count) | No gain beyond partitions; idle consumers |
| Larger max.poll.records | Fewer round trips, higher throughput | Longer per-poll time -> risk of eviction |
| Cooperative rebalance | Small pause, keeps most assignments | Slightly more complex protocol |
| Static membership | No rebalance on restart | Must manage unique instance ids |`,

    whenToUse: [
      "Scaling consumption horizontally across partitions with automatic failover.",
      "Fan-out where independent teams each need the full stream (separate group.ids).",
      "Any streaming system that must expose a keeping-up signal via lag monitoring.",
    ],
    whenNotToUse: [
      "Expecting parallelism beyond the partition count (raise partitions instead).",
      "Long, unbounded per-message work that will always blow max.poll.interval (offload it).",
      "A single-consumer task where a simple queue is operationally lighter than a group.",
    ],

    memoryCard: {
      problem: "Consume a high-volume topic in parallel, survive consumer failure, and know if you are keeping up.",
      mentalModel: "A team pulling parcels off conveyor belts; the manager reassigns belts when a worker drops; the unhandled pile is lag.",
      keyConcepts: ["one partition -> one consumer per group", "parallelism capped by partitions", "rebalance = pause + reassign", "max.poll.interval vs session.timeout", "lag = latest - committed"],
      productionConnection: "Size partitions for peak, keep processing under max.poll.interval, use cooperative/static membership, alert on per-partition lag growth.",
      oneLiner: "Consumer groups split partitions for parallel, fault-tolerant reads -- watch per-partition lag and keep processing fast enough to avoid rebalance storms.",
    },

    quiz: [
      {
        id: "kex-cg-q1",
        prompt: "A topic has 6 partitions and you run 10 consumers in one group. What happens?",
        choices: [
          { text: "Each partition is shared by ~1.7 consumers", correct: false },
          { text: "6 consumers each own one partition; the other 4 sit idle", correct: true },
          { text: "Throughput increases 10x", correct: false },
          { text: "Kafka rejects the extra consumers", correct: false },
        ],
        explanation:
          "A partition is assigned to exactly one consumer within a group, so parallelism is capped by partition count. With 6 partitions and 10 consumers, 4 consumers have nothing to do until partitions are added.",
      },
      {
        id: "kex-cg-q2",
        prompt: "Consumer processing gets slow and the group starts rebalancing repeatedly. Most likely cause?",
        choices: [
          { text: "The producers increased acks", correct: false },
          { text: "Processing a poll batch exceeds max.poll.interval.ms, so consumers are evicted and the group thrashes", correct: true },
          { text: "The topic ran out of disk", correct: false },
          { text: "Offsets are stored on the wrong broker", correct: false },
        ],
        explanation:
          "If the app does not call poll() again within max.poll.interval.ms, Kafka treats the consumer as stuck and rebalances. Slow processing triggers this repeatedly. Reduce max.poll.records or speed up processing so each poll finishes in time.",
      },
      {
        id: "kex-cg-q3",
        prompt: "What exactly is consumer lag?",
        choices: [
          { text: "The network latency between broker and consumer", correct: false },
          { text: "The difference between the latest produced offset and the consumer's committed offset, per partition", correct: true },
          { text: "The time a rebalance takes", correct: false },
          { text: "The number of consumers in a group", correct: false },
        ],
        explanation:
          "Lag = log-end-offset minus committed offset for each partition. Rising lag means consumption is falling behind production. Always inspect per-partition lag, since one skewed partition can hide behind a healthy aggregate.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Diagnose runaway lag",
      brief:
        "A consumer group's lag is climbing into the millions and rebalances are frequent. Work through assignment, processing time, and timeouts to find and fix the cause.",
      steps: `1. Read lag per partition (not just aggregate) and note any skew toward one partition.\n2. Compare consumer count to partition count -- are consumers idle or overloaded?\n3. Measure per-poll processing time vs max.poll.interval.ms.\n4. If processing is slow, lower max.poll.records and/or parallelize the slow downstream call.\n5. Enable cooperative rebalancing and static membership to cut rebalance cost.\n6. Confirm consumers are idempotent so at-least-once redelivery is safe.`,
      successCriteria: [
        "Identify whether the bottleneck is partition count or processing speed",
        "Detect a skewed hot partition via per-partition lag",
        "Prescribe a fix that keeps each poll within max.poll.interval.ms",
      ],
    },
  },

  {
    slug: "delivery-semantics",
    title: "Delivery Semantics: At-least/at-most/exactly-once",
    track: "shared",
    phase: "kafka",
    module: "kafka-core",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "What at-most-once, at-least-once, and exactly-once really mean in Kafka, where the guarantee actually comes from (offset commit order, idempotent producers, transactions), and why idempotent consumers usually beat chasing exactly-once.",
    prerequisites: ["kafka-fundamentals", "consumer-groups-lag"],
    relatedConcepts: ["outbox-pattern", "consumer-groups-lag", "distributed"],
    tags: ["kafka", "delivery-semantics", "exactly-once", "idempotency", "transactions", "offsets"],

    why: `Networks and processes fail mid-operation: a producer may not learn its message was stored, a consumer may crash after handling a message but before recording that it did. **Delivery semantics define what happens to a message under those failures** -- is it possibly lost, possibly duplicated, or effectively processed once? This is the difference between a dropped payment, a double charge, and a correct ledger. Every event-driven system implicitly chooses one of these; the professional move is to choose deliberately and design the consumer around it.`,

    intuition: `Imagine **mailing a signed contract and waiting for a confirmation card back**. If you file the contract as sent the moment you drop it in the box (before any confirmation), you might file it as sent when it was actually lost -- that is **at-most-once** (never duplicated, sometimes lost). If you keep re-mailing until a confirmation arrives, the other side might receive two copies -- that is **at-least-once** (never lost, sometimes duplicated). **Exactly-once** is the fantasy of "received precisely one copy and both sides agree" -- achievable only with extra machinery, and even then it is really "effectively once" from the outside.`,

    howItWorks: `### The three guarantees
- **At-most-once:** commit the offset *before* processing. If you crash after committing but before finishing, the message is skipped -- **possible loss, no duplicates.** Rarely what you want.
- **At-least-once (the practical default):** process *first*, then commit the offset. A crash after processing but before commit means the message is redelivered -- **no loss, possible duplicates.** Consumers must tolerate duplicates.
- **Exactly-once:** each message affects the output state precisely once, achieved by combining an **idempotent producer** with **transactions** (or by making the consumer idempotent, which is often simpler).

### Producer side
- **Idempotent producer** (\`enable.idempotence=true\`, on by default in modern clients): the broker de-duplicates retries using a producer id + sequence number, so a retried send does not create a duplicate on the log.
- **acks=all** ensures the write is on all in-sync replicas before acknowledgement -- prevents loss on broker failover.

### Transactions (exactly-once processing)
- The **consume-transform-produce** loop can be wrapped in a Kafka transaction that atomically produces output records *and* commits the input offsets. Consumers reading downstream with \`isolation.level=read_committed\` never see aborted output.
- This gives exactly-once *within Kafka*. It does **not** extend to an external database automatically.

### The honest shortcut
Most systems get "effectively once" far more cheaply by staying at-least-once and making the consumer **idempotent** -- dedupe on a business key, or use upserts -- so a duplicate delivery is a no-op.`,

    internals: `- **Where you commit the offset is the entire at-most vs at-least decision** -- there is no third position. Auto-commit (\`enable.auto.commit=true\`) commits on a timer and can commit offsets for messages you have not finished processing, quietly giving you at-most-once behavior under crashes.
- **Idempotent producer prevents on-log duplicates from producer retries only** -- it does not prevent your application from sending the same logical event twice for its own reasons.
- **Kafka transactions cover Kafka-to-Kafka atomicity**, not Kafka-to-external-DB. Writing to Postgres and producing to Kafka in one atomic step needs the **outbox pattern**, not Kafka transactions.
- **Exactly-once has real cost:** transaction coordination, read_committed buffering, and lower throughput. Reserve it for pipelines where dedup at the consumer is genuinely impractical.
- **Idempotency keys** (a natural business id, or a producer-supplied uuid) let a consumer detect and drop repeats; this is the workhorse of correct at-least-once systems.
- **"Exactly-once" is always effectively-once at the boundary** -- the message may physically arrive multiple times; the *effect* is applied once. Design for the effect, not the wire.`,

    diagram: {
      title: "Commit order decides the guarantee",
      layers: [
        { id: "atmost", label: "Commit -> then process", sub: "at-most-once: crash loses the message" },
        { id: "atleast", label: "Process -> then commit", sub: "at-least-once: crash redelivers (dup)" },
        { id: "idem", label: "Idempotent consumer", sub: "dedupe on business key -> effectively once" },
        { id: "txn", label: "Transaction (EOS)", sub: "atomic produce + offset commit within Kafka" },
        { id: "outbox", label: "External DB? -> Outbox", sub: "Kafka txn does not cover Postgres" },
      ],
      caption: "Pick at-least-once + idempotency by default; reach for transactions only for Kafka-internal EOS.",
    },

    realWorld: `A billing consumer uses auto-commit and processes charges. During a deploy, a consumer is killed after auto-commit fired but before several charges finished -- those charges are silently skipped (accidental at-most-once) and customers are undercharged. The team switches to manual commit *after* processing (at-least-once) but now a redelivery during a rebalance double-charges someone. The durable fix is not Kafka transactions but idempotency: each charge carries a unique idempotency key, the payment processor rejects a repeat of the same key, and offsets are committed after a successful (or safely-deduped) charge. At-least-once plus an idempotency key gives correct, effectively-once billing without transactional overhead.`,

    production: `- **Default to at-least-once + idempotent consumers.** Commit offsets after processing; dedupe on a business/idempotency key or use upserts.
- **Disable auto-commit** for anything where correctness matters -- it decouples commit timing from processing and can silently lose or duplicate work.
- **Keep the idempotent producer and \`acks=all\` on** to prevent duplicates from retries and loss on failover.
- **Use Kafka transactions only for Kafka-to-Kafka** consume-transform-produce pipelines that truly need EOS, and set downstream readers to \`read_committed\`.
- **For Kafka-plus-database atomicity, use the outbox pattern**, not Kafka transactions.
- **Assume duplicates will happen** and test the consumer's dedup path -- it is cheaper and more robust than chasing perfect exactly-once.`,

    commonMistakes: [
      "Leaving auto-commit on and assuming at-least-once, then losing messages when a crash commits ahead of processing.",
      "Believing Kafka transactions make an external database write exactly-once (they only cover Kafka).",
      "Choosing exactly-once for the throughput hit when an idempotency key would have sufficed.",
      "Building at-least-once consumers that are not idempotent, so redelivery corrupts state.",
      "Committing offsets before processing to 'go faster', silently adopting at-most-once semantics.",
    ],

    tradeoffs: `| Guarantee | You get | You pay |
|---|---|---|
| At-most-once | No duplicates | Possible message loss |
| At-least-once | No loss | Duplicates -- consumer must be idempotent |
| Exactly-once (Kafka txn) | No loss, no dup within Kafka | Throughput + coordination cost; Kafka-only |
| At-least-once + idempotency key | Effectively once, simple | You maintain a dedup/upsert mechanism |`,

    whenToUse: [
      "At-least-once + idempotency for almost all real consumers -- the robust default.",
      "Kafka transactions for pure Kafka-to-Kafka stream processing needing exactly-once.",
      "At-most-once only for high-volume telemetry where an occasional dropped event is acceptable.",
    ],
    whenNotToUse: [
      "Exactly-once transactions when a simple idempotency key would do (avoid the overhead).",
      "Kafka transactions to atomically touch an external DB (use the outbox pattern).",
      "At-most-once for anything where losing a message causes incorrect results (payments, orders).",
    ],

    memoryCard: {
      problem: "Decide what happens to a message under producer/consumer failure: lost, duplicated, or effectively once.",
      mentalModel: "Mailing a contract: file-before-confirm risks loss (at-most), re-mail-until-confirmed risks duplicates (at-least).",
      keyConcepts: ["commit before vs after processing", "idempotent producer + acks=all", "Kafka transactions = EOS within Kafka only", "idempotency key -> effectively once", "outbox for external DB"],
      productionConnection: "At-least-once + idempotent consumers by default; disable auto-commit; transactions only for Kafka-internal EOS.",
      oneLiner: "Where you commit the offset picks at-most vs at-least once; make the consumer idempotent and you get effectively-once without the cost of transactions.",
    },

    quiz: [
      {
        id: "kex-ds-q1",
        prompt: "What is the practical default delivery semantic and what does it require of consumers?",
        choices: [
          { text: "At-most-once; consumers must retry", correct: false },
          { text: "At-least-once; consumers must be idempotent because messages can be redelivered", correct: true },
          { text: "Exactly-once; consumers need no special handling", correct: false },
          { text: "At-least-once; consumers must disable retries", correct: false },
        ],
        explanation:
          "Processing then committing yields at-least-once: a crash before commit redelivers the message. Consumers must therefore be idempotent (dedupe on a key or upsert) so a duplicate is harmless.",
      },
      {
        id: "kex-ds-q2",
        prompt: "You produce to Kafka and write to Postgres and need both to happen atomically. What do you use?",
        choices: [
          { text: "Kafka transactions -- they span external databases", correct: false },
          { text: "The outbox pattern -- Kafka transactions cover Kafka only, not an external DB", correct: true },
          { text: "acks=all on the producer", correct: false },
          { text: "At-most-once semantics", correct: false },
        ],
        explanation:
          "Kafka transactions give exactly-once within Kafka (atomic produce + offset commit). They do not make a Postgres write atomic with a Kafka produce. The outbox pattern writes the event to the DB in the same transaction, then relays it to Kafka.",
      },
      {
        id: "kex-ds-q3",
        prompt: "Why can leaving enable.auto.commit=true silently give at-most-once behavior?",
        choices: [
          { text: "Auto-commit disables acks", correct: false },
          { text: "It commits offsets on a timer, possibly for messages not yet fully processed; a crash then skips them", correct: true },
          { text: "It deletes messages after reading", correct: false },
          { text: "It forces exactly-once mode", correct: false },
        ],
        explanation:
          "Auto-commit fires periodically, decoupled from your processing. If it commits offsets for records you have not finished and you then crash, those records are skipped on restart -- effectively at-most-once. Disable it and commit after processing for at-least-once.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Pick and enforce a delivery guarantee",
      brief:
        "For a billing consumer, choose a delivery semantic and design the commit and dedup logic so charges are neither lost nor duplicated.",
      steps: `1. Disable enable.auto.commit; commit offsets explicitly after processing.\n2. Confirm the producer has enable.idempotence=true and acks=all.\n3. Attach a unique idempotency key to each charge (business id or uuid).\n4. Make the downstream (payment processor / DB) reject or upsert on a repeated key.\n5. Verify: killing the consumer after processing but before commit redelivers, and the dedup makes it a no-op.\n6. Decide whether Kafka transactions are needed (only if the pipeline is Kafka-to-Kafka EOS).`,
      successCriteria: [
        "Offsets are committed after processing (at-least-once)",
        "Duplicates are neutralized by an idempotency key or upsert",
        "External-DB atomicity is recognized as an outbox problem, not a Kafka-transaction one",
      ],
    },
  },

  {
    slug: "outbox-pattern",
    title: "The Outbox Pattern",
    track: "shared",
    phase: "kafka",
    module: "kafka-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "How to reliably publish an event whenever you commit a database change without the dual-write problem: write the event to an outbox table in the same transaction, then relay it to Kafka.",
    prerequisites: ["kafka-fundamentals", "delivery-semantics"],
    relatedConcepts: ["delivery-semantics", "consumer-groups-lag", "distributed"],
    tags: ["kafka", "outbox", "dual-write", "cdc", "transactional-messaging", "consistency"],

    why: `A service constantly needs to do two things together: persist a state change (save the order) and tell the rest of the system about it (publish an OrderPlaced event). Doing both means writing to two systems -- the database and Kafka -- with no shared transaction. **That "dual write" can partially fail**: the DB commit succeeds but the Kafka publish is lost, or the publish succeeds but the DB rolls back. Either way, the database and the event stream disagree. The outbox pattern exists to make the state change and the event **atomic**, so an event is published if and only if the change was committed.`,

    intuition: `The outbox pattern is the **outgoing-mail tray on your desk**. Instead of trying to hand a letter to the courier at the exact instant you file a document (two separate acts that can each fail), you file the document and drop the letter in your own outbox tray **in one motion** -- both live in your desk (the database). A separate mail clerk (the relay) later picks up whatever is in the tray and actually delivers it. If the clerk is slow or the courier is down, the letters wait safely in the tray; nothing is lost, and nothing is sent for a document you never actually filed.`,

    howItWorks: `### The dual-write problem
\`\`\`
tx: INSERT order            <-- committed
   produce OrderPlaced ...  <-- network fails here
\`\`\`
The order exists but no event was published. Reverse the order and you can publish an event for an order that then rolls back. There is no atomic bridge between a DB transaction and a Kafka send.

### The outbox solution
1. In the **same database transaction** as the business change, insert a row into an \`outbox\` table describing the event (aggregate id, type, payload, timestamp).
2. Commit. Now the state change and the event record are atomic -- both or neither.
3. A **relay process** reads new outbox rows and publishes them to Kafka, marking them sent (or deleting them) once the broker acknowledges.

### How the relay reads the outbox
- **Polling:** the relay periodically \`SELECT ... WHERE published = false\`, publishes, then marks rows published. Simple, works everywhere, adds a little latency.
- **Change Data Capture (CDC):** a tool like Debezium tails the database's write-ahead log and streams outbox inserts to Kafka with low latency and no polling load. More moving parts, much lower latency.

### Delivery guarantee
The relay is **at-least-once**: it may publish a row and crash before marking it sent, republishing on restart. Therefore **consumers must be idempotent** -- include an event id so they dedupe. The outbox fixes atomicity, not duplicates.`,

    internals: `- **Ordering:** publish outbox rows in insertion order (e.g. by an auto-increment id) and key Kafka messages by aggregate id so per-entity ordering is preserved through the relay.
- **The relay is at-least-once by nature** -- marking-as-sent and the Kafka ack cannot be one atomic step, so a crash between them causes a replay. Idempotent consumers are mandatory, not optional.
- **Outbox growth:** a polling relay must prune or archive sent rows, or the table bloats and the polling query slows. CDC typically consumes and lets you delete rows.
- **CDC vs polling trade:** CDC (Debezium) reads the WAL, so it captures every commit with minimal latency and no query load, but you run and operate a connector. Polling is trivial to build but adds latency and DB load.
- **Idempotency at the relay too:** including a stable event id lets both the relay and consumers deduplicate replays.
- **The outbox does not need Kafka transactions** -- that is the point. It replaces the impossible DB+Kafka atomic write with a single DB transaction plus an asynchronous, retryable relay.`,

    diagram: {
      title: "Business change + event, atomically",
      layers: [
        { id: "tx", label: "One DB transaction", sub: "INSERT order + INSERT outbox row" },
        { id: "commit", label: "Commit", sub: "state change and event record are atomic" },
        { id: "relay", label: "Relay (poll or CDC)", sub: "reads unsent outbox rows" },
        { id: "publish", label: "Publish to Kafka", sub: "keyed by aggregate id for ordering" },
        { id: "mark", label: "Mark sent / delete", sub: "at-least-once -> consumers dedupe on event id" },
      ],
      caption: "Write the event into the same transaction, then relay it -- atomicity solved, duplicates handled by idempotent consumers.",
    },

    realWorld: `An e-commerce service saves an order to Postgres and then calls the Kafka producer to emit OrderPlaced. During a broker hiccup the produce fails after the order commit, so fulfillment never hears about a paid order -- a customer is charged with nothing shipped, discovered only via a support ticket. Refactoring to the outbox pattern, the service inserts the order and an outbox row in one transaction; a Debezium connector tails the WAL and publishes the event reliably. Now a broker outage merely delays the event (it waits in the outbox) instead of losing it, and the order and its event can never disagree.`,

    production: `- **Insert the outbox row in the same transaction as the business change** -- this is the whole guarantee; never publish directly inside request handling.
- **Make consumers idempotent on the event id**, because the relay is at-least-once.
- **Key Kafka messages by aggregate id** and publish in outbox insertion order to preserve per-entity ordering.
- **Prefer CDC (Debezium) for low latency and no DB load** at scale; polling is fine for smaller systems -- just prune sent rows.
- **Monitor relay lag** (unsent outbox rows / age of oldest unsent row) the way you monitor consumer lag.
- **Never rely on a distributed transaction (2PC) across DB and Kafka** -- the outbox exists precisely to avoid that fragility.`,

    commonMistakes: [
      "Publishing to Kafka directly after the DB commit (the dual write) and losing events when the produce fails.",
      "Building the outbox but forgetting idempotent consumers, so the at-least-once relay causes duplicates.",
      "Never pruning sent outbox rows, letting the table and the polling query degrade over time.",
      "Losing per-entity ordering by publishing outbox rows out of order or without an aggregate key.",
      "Reaching for two-phase commit across the DB and broker instead of the simpler, more robust outbox.",
    ],

    tradeoffs: `| Choice | Benefit | Cost / risk |
|---|---|---|
| Direct dual write | Simple, no extra table | Events lost or phantom on partial failure |
| Outbox + polling relay | Atomic, easy to build | Added latency; must prune the table |
| Outbox + CDC (Debezium) | Low latency, no DB query load | Operate a connector; more infra |
| Two-phase commit (2PC) | Theoretical atomicity | Fragile, slow, poor Kafka support -- avoid |`,

    whenToUse: [
      "Any service that must publish an event whenever a database change commits, reliably.",
      "Microservices emitting domain events where the DB and event stream must never disagree.",
      "Replacing fragile dual writes or 2PC between a database and Kafka.",
    ],
    whenNotToUse: [
      "Pure Kafka-to-Kafka pipelines with no external DB (use Kafka transactions instead).",
      "Fire-and-forget events where occasional loss is genuinely acceptable (the overhead is unjustified).",
      "Systems that can tolerate reading events directly from the database rather than a stream.",
    ],

    memoryCard: {
      problem: "Publish an event exactly when a DB change commits, without an atomic bridge between the database and Kafka.",
      mentalModel: "An outgoing-mail tray: file the document and drop the letter in the tray in one motion; a clerk delivers later.",
      keyConcepts: ["dual-write problem", "outbox row in the same transaction", "relay via polling or CDC", "at-least-once relay -> idempotent consumers", "key by aggregate id for ordering"],
      productionConnection: "Insert the outbox row in the business transaction, relay with Debezium/CDC, dedupe on event id, monitor relay lag.",
      oneLiner: "Write the event to an outbox table inside the same DB transaction and relay it asynchronously -- atomic with the state change, with duplicates handled by idempotent consumers.",
    },

    quiz: [
      {
        id: "kex-ob-q1",
        prompt: "What core problem does the outbox pattern solve?",
        choices: [
          { text: "Consumer lag on a busy topic", correct: false },
          { text: "The dual-write problem: a DB commit and a Kafka publish cannot be made atomic directly", correct: true },
          { text: "Partition skew from a hot key", correct: false },
          { text: "Slow Dockerfile builds", correct: false },
        ],
        explanation:
          "There is no shared transaction across a database and Kafka, so a direct dual write can lose an event (or publish a phantom one) on partial failure. The outbox writes the event into the same DB transaction as the state change, then relays it asynchronously.",
      },
      {
        id: "kex-ob-q2",
        prompt: "Why must consumers of outbox-relayed events be idempotent?",
        choices: [
          { text: "Because the outbox table has no primary key", correct: false },
          { text: "The relay is at-least-once -- it can publish a row then crash before marking it sent, causing a replay", correct: true },
          { text: "Because CDC reorders every message", correct: false },
          { text: "Because Kafka deletes messages after one read", correct: false },
        ],
        explanation:
          "Marking a row as sent and receiving the Kafka ack are not one atomic step, so a crash in between republishes the row. The outbox guarantees atomicity with the state change, not exactly-once delivery -- consumers dedupe on the event id.",
      },
      {
        id: "kex-ob-q3",
        prompt: "How does a CDC-based relay (e.g. Debezium) differ from a polling relay?",
        choices: [
          { text: "CDC writes events without a database", correct: false },
          { text: "CDC tails the write-ahead log for low latency and no query load, at the cost of running a connector", correct: true },
          { text: "CDC guarantees exactly-once end to end", correct: false },
          { text: "Polling is always faster than CDC", correct: false },
        ],
        explanation:
          "CDC reads the DB's WAL, capturing every commit with minimal latency and without polling queries, but you operate a connector. Polling is trivial to build but adds latency and DB load and requires pruning sent rows.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design an outbox relay",
      brief:
        "Refactor a service that dual-writes (DB then Kafka) into the outbox pattern with a reliable relay and idempotent consumers.",
      steps: `1. Add an outbox table (id, aggregate_id, event_type, payload, created_at, published).\n2. In the business transaction, INSERT the domain change and the outbox row together; commit.\n3. Build a relay: read unpublished rows in id order, produce to Kafka keyed by aggregate_id, mark published on ack.\n4. Include a stable event id so consumers can dedupe (relay is at-least-once).\n5. Add pruning/archival of published rows (or switch to CDC to avoid polling load).\n6. Monitor the age/count of unpublished rows as relay lag.`,
      successCriteria: [
        "The state change and the outbox row are written in one transaction",
        "The relay publishes reliably and preserves per-aggregate ordering",
        "Consumers dedupe on the event id to absorb at-least-once replays",
      ],
    },
  },
];
