import type { Lesson } from "../types";

export const postgresLessons: Lesson[] = [
  {
    slug: "pg-transactions-mvcc",
    title: "Transactions & MVCC",
    track: "shared",
    phase: "postgres",
    module: "pg-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "How Postgres gives every transaction a consistent snapshot without readers blocking writers -- via row versions (xmin/xmax) -- and the price you pay: dead tuples, bloat, VACUUM, and the ever-looming transaction ID wraparound.",
    prerequisites: ["pg-indexes"],
    relatedConcepts: ["pg-query-planning", "pg-connection-pooling", "n-plus-one", "caching-dual"],
    tags: ["postgres", "mvcc", "transactions", "acid", "isolation", "vacuum", "bloat"],

    why: `A database is useless if a half-finished transfer can be seen by another query, or if two people reading and writing the same rows constantly block each other. **Transactions give you all-or-nothing correctness (ACID); MVCC gives you concurrency without readers and writers fighting over locks.** The reason a Postgres SELECT almost never waits behind an UPDATE is MVCC. Understanding it is the difference between "the database is slow under load" being a mystery versus a diagnosis.`,

    intuition: `Think of MVCC as **version history on a shared document, like Google Docs revisions.** When you open the doc you get a *snapshot* -- a consistent view frozen at the moment you started reading. Someone else editing creates a *new version* of each paragraph they touch; your snapshot still points at the old versions, so you keep reading a coherent document while they write. Nobody waits on anybody. The catch: all those old paragraph versions pile up in the file, and someone (VACUUM) eventually has to sweep out the ones no live snapshot can see anymore.`,

    howItWorks: `- **ACID:** Atomicity (all-or-nothing), Consistency (constraints hold), Isolation (concurrent txns don't corrupt each other), Durability (committed data survives a crash, via the WAL / write-ahead log).
- **MVCC = Multi-Version Concurrency Control.** An UPDATE does **not** overwrite a row in place. It writes a **new row version (tuple)** and marks the old one as expired. A DELETE just marks a row expired. Readers and writers therefore touch different physical tuples -- so **readers never block writers and writers never block readers.**
- **Each tuple carries \`xmin\` (the txn id that created it) and \`xmax\` (the txn id that expired it).** A transaction sees a tuple if \`xmin\` is committed and visible to its snapshot, and \`xmax\` is not.
- **A snapshot** is essentially "which transaction ids were already committed when I started." That snapshot decides which tuple version each row resolves to.
- **Isolation levels** (weakest to strongest): \`READ COMMITTED\` (default -- a fresh snapshot per statement), \`REPEATABLE READ\` (one snapshot for the whole transaction), \`SERIALIZABLE\` (as if transactions ran one at a time, using SSI -- Serializable Snapshot Isolation).`,

    internals: `- **Dead tuples:** every UPDATE/DELETE leaves behind an old version that is still physically in the table (and in every index) until VACUUM removes it. High-churn tables accumulate these fast.
- **Bloat:** dead tuples that VACUUM hasn't reclaimed. A 1 GB table can bloat to 5 GB of mostly-dead space -- slower scans, wasted cache, wasted disk. VACUUM marks space reusable; only \`VACUUM FULL\` (which takes an exclusive lock and rewrites the table) actually shrinks the file.
- **VACUUM** removes dead tuples whose \`xmax\` is older than the oldest snapshot any live transaction could still need. **This is the crucial coupling: a single long-running transaction pins the oldest visible snapshot, so VACUUM cannot remove any tuple newer than that -- bloat grows across the whole database even on tables that transaction never touched.**
- **Autovacuum** is a background daemon that triggers VACUUM/ANALYZE when a table's dead-tuple ratio crosses a threshold (defaults ~20% changed). It also keeps table statistics fresh for the planner.
- **Transaction ID wraparound:** xids are 32-bit and cyclic. As they advance, old rows must be "frozen" (marked visible-to-everyone) before the counter laps them, or their data would appear to vanish. If freezing falls too far behind, Postgres forces an emergency anti-wraparound vacuum and, at the extreme, **refuses new writes to protect the data.** This has caused real, famous multi-hour outages.`,

    diagram: {
      title: "MVCC: one row, multiple versions",
      layers: [
        { id: "txn", label: "Transaction starts", sub: "acquires a snapshot (set of committed xids)" },
        { id: "update", label: "UPDATE writes a NEW tuple", sub: "old tuple gets xmax set; new tuple gets xmin" },
        { id: "visibility", label: "Visibility check", sub: "each reader resolves the version its snapshot can see" },
        { id: "dead", label: "Old versions = dead tuples", sub: "still in table + indexes, invisible but present" },
        { id: "vacuum", label: "VACUUM reclaims space", sub: "only versions no live snapshot needs; long txns block it" },
      ],
      caption: "Writers create versions instead of overwriting -- great for concurrency, but the cleanup (VACUUM) is the tax you must budget for.",
    },

    realWorld: `An analytics job opens a transaction, runs \`SELECT\` after \`SELECT\` for 45 minutes without committing. Meanwhile an unrelated high-churn \`sessions\` table is being updated thousands of times a second. Autovacuum runs but reclaims almost nothing, because the oldest snapshot (held by that idle analytics transaction) still could, in theory, need the old versions. \`sessions\` bloats from 200 MB to 6 GB, its queries slow to a crawl, and disk fills. The fix was not "tune VACUUM" -- it was **stop holding a transaction open for 45 minutes.** Set \`idle_in_transaction_session_timeout\` and don't wrap read-only report loops in one long transaction.`,

    production: `- **Monitor \`n_dead_tup\` and dead/live ratio** via \`pg_stat_user_tables\`; watch table/index bloat with a bloat-estimation query or \`pgstattuple\`.
- **Watch the oldest transaction:** \`SELECT max(age(backend_xid)), max(age(backend_xmin)) FROM pg_stat_activity;\` and hunt down anything in state \`idle in transaction\`.
- **Set \`idle_in_transaction_session_timeout\`** (e.g. a few minutes) so a forgotten open transaction can't pin snapshots forever.
- **Tune autovacuum per hot table** -- lower \`autovacuum_vacuum_scale_factor\` on high-churn tables so it kicks in sooner rather than waiting for 20% churn on a huge table.
- **Alarm on xid age:** \`SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;\` -- if it climbs toward 2 billion, wraparound protection is near and you must let vacuum catch up before it forces writes to stop.
- **Pick isolation deliberately:** default READ COMMITTED is fine for most OLTP; use REPEATABLE READ for multi-statement reports that must be self-consistent; use SERIALIZABLE when correctness of concurrent write logic matters (and handle serialization-failure retries).`,

    commonMistakes: [
      "Assuming UPDATE overwrites in place -- it creates a new version and leaves a dead tuple behind, so 'just updating a counter' still generates bloat.",
      "Holding a transaction (or 'idle in transaction' connection) open for minutes, which pins the oldest snapshot and starves VACUUM across the whole database.",
      "Reaching for VACUUM FULL to fix bloat on a live table -- it takes an ACCESS EXCLUSIVE lock and blocks all reads and writes; use pg_repack instead.",
      "Disabling autovacuum 'because it uses CPU' -- that trades a little steady I/O for eventual catastrophic bloat and wraparound risk.",
      "Expecting REPEATABLE READ or SERIALIZABLE to never fail -- they can raise serialization errors that the application must catch and retry.",
      "Ignoring datfrozenxid age until Postgres stops accepting writes to prevent wraparound.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| MVCC (versions) | Readers never block writers | Dead tuples, bloat, VACUUM overhead |
| READ COMMITTED | Fast, high concurrency, few conflicts | Non-repeatable reads within a txn |
| REPEATABLE READ | Stable snapshot for whole txn | Can abort with serialization failures |
| SERIALIZABLE | Correct as if serial execution | More aborts/retries, some overhead |
| Aggressive autovacuum | Low bloat, safe xid age | Ongoing background I/O and CPU |
| VACUUM FULL | Actually shrinks the file | ACCESS EXCLUSIVE lock, full downtime for that table |`,

    whenToUse: [
      "Any OLTP workload -- MVCC is not optional, it's how Postgres runs; the skill is tuning it.",
      "REPEATABLE READ for a report that issues many statements and must see one consistent point in time.",
      "SERIALIZABLE when concurrent transactions have read-then-write logic whose correctness depends on isolation (e.g. enforcing a business invariant across rows).",
    ],
    whenNotToUse: [
      "Do not use SERIALIZABLE blanket-wide on a hot path without retry logic -- serialization failures will surface as errors.",
      "Do not use long-lived transactions to 'keep a stable view' for interactive sessions -- you pin snapshots and block VACUUM.",
      "Do not use VACUUM FULL as routine maintenance on live tables -- reserve it for maintenance windows or use pg_repack online.",
    ],

    code: [
      {
        label: "Isolation levels and a manual transaction",
        language: "sql",
        code: `-- Default isolation is READ COMMITTED: each statement sees a fresh snapshot.
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- snapshot A for this statement
-- another txn commits an update here...
SELECT balance FROM accounts WHERE id = 1;  -- snapshot B: may differ (non-repeatable read)
COMMIT;

-- REPEATABLE READ: one snapshot for the whole transaction.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT sum(amount) FROM ledger;   -- both statements see the same frozen view
SELECT count(*)   FROM ledger;
COMMIT;

-- SERIALIZABLE: behaves as if transactions ran one after another.
-- The app MUST be ready to catch SQLSTATE 40001 and retry the whole txn.
BEGIN ISOLATION LEVEL SERIALIZABLE;
UPDATE seats SET taken = true WHERE id = 42 AND taken = false;
COMMIT;  -- may raise: ERROR: could not serialize access due to ...`,
      },
      {
        label: "Inspect MVCC internals and dead tuples",
        language: "sql",
        code: `-- See the hidden system columns that drive visibility.
SELECT ctid, xmin, xmax, * FROM accounts WHERE id = 1;
-- xmin = txn that created this version, xmax = txn that expired it (0 if live)

-- Dead tuples and last (auto)vacuum per table.
SELECT relname, n_live_tup, n_dead_tup,
       last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Find the oldest snapshot pinning VACUUM (hunt idle-in-transaction backends).
SELECT pid, state, age(backend_xmin) AS xmin_age, query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY xmin_age DESC NULLS LAST;`,
      },
      {
        label: "Wraparound / freeze health and safe cleanup",
        language: "sql",
        code: `-- How close is each database to transaction ID wraparound?
-- age() approaching ~2,000,000,000 is the danger zone.
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY xid_age DESC;

-- Manual maintenance (autovacuum normally handles this).
VACUUM (VERBOSE, ANALYZE) sessions;   -- reclaim dead space + refresh stats
-- VACUUM FULL rewrites and shrinks the table but takes an EXCLUSIVE lock:
-- VACUUM FULL sessions;   -- AVOID on live tables; prefer pg_repack

-- Guardrail: stop forgotten open transactions from starving VACUUM.
SET idle_in_transaction_session_timeout = '5min';`,
      },
    ],

    memoryCard: {
      problem: "Let many transactions read and write the same data concurrently without corrupting each other or blocking readers behind writers.",
      mentalModel: "Google Docs revision history: each writer creates a new version, every reader keeps its own consistent snapshot, and a janitor (VACUUM) sweeps out versions nobody can still see.",
      keyConcepts: [
        "ACID + WAL for durability",
        "MVCC: UPDATE writes a new tuple, marks old one dead (xmin/xmax)",
        "snapshots + isolation levels (read committed / repeatable read / serializable)",
        "dead tuples -> bloat -> VACUUM/autovacuum",
        "long transactions pin snapshots and starve VACUUM",
        "transaction ID wraparound and freezing",
      ],
      productionConnection: "Kill idle-in-transaction sessions, tune autovacuum on hot tables, monitor n_dead_tup and datfrozenxid age, and never routinely VACUUM FULL a live table.",
      oneLiner: "MVCC buys lock-free concurrency by versioning rows -- the bill comes due as dead tuples, bloat, and wraparound, all paid by VACUUM.",
    },

    quiz: [
      {
        id: "mvcc-q1",
        prompt: "In Postgres, what does an UPDATE physically do to the row it changes?",
        choices: [
          { text: "Overwrites the row in place and updates all indexes atomically", correct: false },
          { text: "Writes a new tuple version and marks the old one expired, leaving a dead tuple", correct: true },
          { text: "Locks the row so no reader can see it until commit", correct: false },
          { text: "Deletes the old row immediately and inserts the new one in the freed space", correct: false },
        ],
        explanation: "Under MVCC an UPDATE never overwrites in place. It creates a new tuple (new xmin) and sets xmax on the old one. The old version stays physically present until VACUUM can prove no live snapshot needs it -- that is why updates generate bloat.",
      },
      {
        id: "mvcc-q2",
        prompt: "A high-churn table is bloating badly even though autovacuum is running. What is the most likely cause?",
        choices: [
          { text: "The table has too many indexes", correct: false },
          { text: "A long-running or idle-in-transaction session is pinning an old snapshot, so VACUUM cannot remove newer dead tuples", correct: true },
          { text: "READ COMMITTED isolation is disabling VACUUM", correct: false },
          { text: "The WAL is full", correct: false },
        ],
        explanation: "VACUUM can only remove tuple versions older than the oldest snapshot any live transaction might need. One long or idle-in-transaction backend pins that snapshot, so dead tuples across the whole database (not just tables it touched) cannot be reclaimed.",
      },
      {
        id: "mvcc-q3",
        prompt: "Why does Postgres eventually refuse new writes if freezing falls too far behind?",
        choices: [
          { text: "To force a backup before the disk fills", correct: false },
          { text: "Because 32-bit transaction ids are cyclic; unfrozen old rows would appear to come from the future and data could be lost, so it protects itself from wraparound", correct: true },
          { text: "Because autovacuum is single-threaded and cannot keep up with commits", correct: false },
          { text: "Because SERIALIZABLE isolation blocks writes during vacuum", correct: false },
        ],
        explanation: "Transaction ids are 32-bit and wrap around. Old rows must be frozen (marked visible to all) before the counter laps them, or their xmin would look 'in the future' and they would vanish from view. If freezing lags near the 2-billion limit, Postgres stops accepting writes to prevent irreversible data loss until vacuum catches up.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Watch MVCC create bloat and see a long transaction block VACUUM",
      brief: "Reproduce dead tuples and prove that an open transaction starves VACUUM, using two psql sessions against a scratch table.",
      steps: `1. In session A, create a scratch table and fill it:
   \`\`\`sql
   CREATE TABLE churn (id int PRIMARY KEY, v int);
   INSERT INTO churn SELECT g, 0 FROM generate_series(1, 100000) g;
   \`\`\`
2. Churn it and check dead tuples:
   \`\`\`sql
   UPDATE churn SET v = v + 1;         -- creates 100k new versions
   SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'churn';
   \`\`\`
   You should see ~100k dead tuples.
3. In session B (a SECOND psql), open a transaction and leave it open:
   \`\`\`sql
   BEGIN;
   SELECT 1;   -- do NOT commit; this pins the oldest snapshot
   \`\`\`
4. Back in session A, churn again and try to reclaim:
   \`\`\`sql
   UPDATE churn SET v = v + 1;
   VACUUM churn;
   SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'churn';
   \`\`\`
   Note dead tuples barely drop -- VACUUM cannot remove versions session B might need.
5. In session B run \`COMMIT;\`, then in session A run \`VACUUM churn;\` again and re-check. Dead tuples should now fall. Clean up with \`DROP TABLE churn;\`.`,
      successCriteria: [
        "Observed dead tuple count rise after an UPDATE with no rows added",
        "Confirmed VACUUM could not reclaim space while session B held an open transaction",
        "Confirmed reclamation resumed after committing/closing the blocking transaction",
      ],
    },
  },

  {
    slug: "pg-query-planning",
    title: "Query Planning & EXPLAIN",
    track: "shared",
    phase: "postgres",
    module: "pg-core",
    difficulty: "advanced",
    estMinutes: 27,
    summary:
      "How the Postgres cost-based planner turns SQL into a plan tree, how to read EXPLAIN vs EXPLAIN ANALYZE, when it picks seq scan / index scan / bitmap heap scan and nested loop / hash / merge joins, and why 'the planner chose the wrong plan' is almost always stale statistics.",
    prerequisites: ["pg-indexes"],
    relatedConcepts: ["pg-transactions-mvcc", "n-plus-one", "pg-connection-pooling", "caching-dual"],
    tags: ["postgres", "explain", "planner", "query", "performance", "statistics", "joins"],

    why: `SQL is declarative: you say *what* you want, not *how* to get it. The **planner** decides the how -- which indexes, which join order, which algorithms. Get it right and a query is 2 ms; get it wrong and the same query is 20 seconds. **EXPLAIN is the single most important debugging tool in Postgres** because it shows you the planner's decisions and, with ANALYZE, whether its guesses matched reality. Tuning without EXPLAIN is guessing.`,

    intuition: `The planner is a **GPS routing engine.** You give it a destination (your query result); it estimates the cost of every route (scan and join strategies) using a map of the terrain (table statistics -- row counts, value distributions) and picks the cheapest estimated route. Just like a GPS with an outdated map will confidently send you down a closed road, the planner with **stale statistics will confidently pick a terrible plan.** EXPLAIN shows the chosen route; EXPLAIN ANALYZE actually drives it and reports how long each leg really took versus the estimate.`,

    howItWorks: `- **Cost model:** the planner assigns an abstract cost to each candidate plan based on estimated rows and per-operation constants (\`seq_page_cost\`, \`random_page_cost\`, \`cpu_tuple_cost\`, etc.). Lowest total cost wins. Costs are **not milliseconds** -- they are relative units.
- **EXPLAIN** shows the plan and *estimates* without running the query. **EXPLAIN ANALYZE** actually executes it and shows *actual* rows and time per node. **EXPLAIN (ANALYZE, BUFFERS)** adds how many pages came from cache (shared hit) vs disk (read) -- essential for real diagnosis.
- **Scan choices:**
  - **Seq Scan:** read the whole table. Cheapest when you need most of the rows or the table is tiny.
  - **Index Scan:** walk the index, fetch matching rows from the heap. Best for high selectivity (few matching rows).
  - **Index Only Scan:** answer entirely from the index (covering) -- no heap fetch.
  - **Bitmap Heap Scan:** build a bitmap of matching pages from one or more indexes, then read those pages in physical order. The planner's choice for a *medium* number of matches -- too many for a plain index scan, too few for a seq scan.
- **Join choices:**
  - **Nested Loop:** for each outer row, probe the inner (ideally via index). Great when the outer side is small.
  - **Hash Join:** build a hash table on one side, probe with the other. Great for large, unsorted, equality joins.
  - **Merge Join:** sort (or read sorted) both sides and zipper them. Great when inputs are already sorted or huge.
- **Statistics + ANALYZE:** the planner relies on stats (n_distinct, most-common-values, histograms) gathered by \`ANALYZE\` (run by autovacuum). Bad stats -> bad row estimates -> wrong plan.`,

    internals: `- **Read a plan tree inside-out and bottom-up.** The most indented nodes run first; their output feeds their parent. The top line is the final result.
- **The number that matters most: estimated rows vs actual rows.** \`(rows=10)\` estimated but \`(actual rows=2,000,000)\` means the planner is flying blind -- it likely chose a nested loop that is now looping two million times. This gap is the root cause of most 'why is this slow' incidents.
- **\`loops=N\`:** a node's actual time is *per loop*; total time is roughly time x loops. A nested loop with \`loops=500000\` on an inner index scan is death.
- **\`random_page_cost\`:** defaults to 4.0 (spinning-disk era). On SSDs, lowering it toward 1.1 makes the planner more willing to use index scans, often the single most impactful global setting on modern hardware.
- **\`work_mem\`:** hash joins and sorts that exceed \`work_mem\` spill to disk (\`external merge Disk\` in the plan) and slow down dramatically. Look for \'Sort Method: external merge\' or batches > 1 in a Hash node.
- **Extended statistics** (\`CREATE STATISTICS\`) fix correlated-column misestimates (e.g. city and postal_code are not independent).`,

    diagram: {
      title: "SQL to result: the planning pipeline",
      layers: [
        { id: "sql", label: "SQL query", sub: "declarative: what, not how" },
        { id: "stats", label: "Statistics (from ANALYZE)", sub: "row counts, MCVs, histograms -- the 'map'" },
        { id: "planner", label: "Cost-based planner", sub: "enumerate scans/joins, cost each, pick cheapest" },
        { id: "plan", label: "Plan tree", sub: "seq/index/bitmap scans + nested loop/hash/merge joins" },
        { id: "exec", label: "Executor", sub: "runs the tree; EXPLAIN ANALYZE reports actual vs estimate" },
      ],
      caption: "Everything hinges on the stats: a good plan is a cheap-to-execute tree, and a good tree depends on accurate row estimates.",
    },

    realWorld: `A report joining \`orders\` to \`customers\` was fast for months, then suddenly took 40 seconds after a big bulk import. \`EXPLAIN ANALYZE\` showed \`Nested Loop\` with the inner side estimated at \`rows=3\` but \`actual rows=180000\`, \`loops=90000\`. The bulk import had added millions of rows but autovacuum had not yet re-\`ANALYZE\`d, so the planner still believed the table was tiny and chose a nested loop that now looped forever. A single \`ANALYZE orders;\` restored accurate stats; the planner switched to a **Hash Join** and the query dropped back to 300 ms. The lesson: **after big data changes, refresh statistics before blaming the query.**`,

    production: `- **Always debug with \`EXPLAIN (ANALYZE, BUFFERS)\`**, not plain EXPLAIN -- you need actual rows/time and cache-vs-disk to know what really happened.
- **Hunt the estimate/actual gap first.** A large mismatch means stale or insufficient statistics; run \`ANALYZE\` (or add \`CREATE STATISTICS\` for correlated columns).
- **On SSDs, set \`random_page_cost\` around 1.1** so index scans are costed fairly.
- **Size \`work_mem\` for your workload** so big sorts/hashes stay in memory -- but remember it is per-operation per-connection, so total memory = work_mem x concurrent operations.
- **Watch for the wrong join at scale:** a nested loop with huge \`loops\` almost always wants to be a hash join once stats are correct.
- **Do not fight the planner with hints** (Postgres has none by design); fix the inputs -- stats, indexes, query shape.`,

    commonMistakes: [
      "Reading only plain EXPLAIN and trusting the estimates -- you never see that estimated rows=5 was actually 5 million.",
      "Ignoring the estimated-vs-actual row gap, which is the single strongest signal of a bad plan.",
      "Assuming 'cost' is milliseconds -- it is an abstract relative unit, not time.",
      "Leaving random_page_cost at 4.0 on SSDs, biasing the planner against perfectly good index scans.",
      "Setting work_mem huge globally and OOMing the server, forgetting it multiplies by concurrent sorts/hashes.",
      "Blaming the query when the real fix is ANALYZE after a bulk load or schema change.",
    ],

    tradeoffs: `| Access / join method | Best when | Bad when |
|---|---|---|
| Seq Scan | You need most of the table, or it is tiny | Highly selective filter on a big table |
| Index Scan | Few matching rows (high selectivity) | Query returns a large fraction of rows |
| Bitmap Heap Scan | Medium selectivity, multiple indexes | Very few or very many matches |
| Nested Loop join | Small outer side + indexed inner | Large loops count (mis-estimated rows) |
| Hash Join | Large equality join, unsorted inputs | Build side too big for work_mem (spills to disk) |
| Merge Join | Inputs already sorted or very large | Requires expensive sort of both sides |`,

    whenToUse: [
      "Reach for EXPLAIN ANALYZE the moment any query is slow or its performance changed unexpectedly.",
      "Run ANALYZE after bulk loads, large deletes, or schema/data-distribution changes.",
      "Use CREATE STATISTICS when filtering on columns that are correlated (planner assumes independence by default).",
    ],
    whenNotToUse: [
      "Do not run EXPLAIN ANALYZE on a destructive statement in production casually -- it actually executes; wrap it in a transaction you ROLLBACK for INSERT/UPDATE/DELETE.",
      "Do not micro-tune costs per query hoping for a fix when the real problem is stale stats or a missing index.",
      "Do not crank work_mem globally to force in-memory hashes without accounting for concurrency-driven total memory.",
    ],

    code: [
      {
        label: "EXPLAIN vs EXPLAIN ANALYZE",
        language: "sql",
        code: `-- Estimates only, does NOT run the query:
EXPLAIN
SELECT * FROM orders WHERE customer_id = 42;

-- Actually runs it; shows actual rows/time + cache vs disk pages:
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 42;

-- Safe way to ANALYZE a mutating statement (execution is rolled back):
BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
UPDATE orders SET status = 'shipped' WHERE id = 100;
ROLLBACK;`,
      },
      {
        label: "Reading a plan: the estimate-vs-actual trap",
        language: "sql",
        code: `EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > now() - interval '7 days';

-- BAD PLAN (stale stats -> planner thinks the table is tiny):
-- Nested Loop  (cost=0.42..85.10 rows=3 width=40)
--              (actual time=0.03..39514.882 rows=180000 loops=1)
--   ->  Seq Scan on orders o   (rows=3 est)  (actual rows=180000)
--   ->  Index Scan on customers c
--         Index Cond: (id = o.customer_id)
--         (actual time=0.4..0.4 rows=1 loops=180000)   <-- 180k loops!
-- Estimated rows=3 but actual rows=180000: classic misestimate.

-- FIX: refresh statistics, then re-check.
ANALYZE orders;
-- Now the planner correctly expects many rows and switches to:
-- Hash Join  (actual time=... rows=180000 loops=1)   <-- one pass, fast`,
      },
      {
        label: "Nudging the planner correctly (fix inputs, not hints)",
        language: "sql",
        code: `-- Modern SSD: make index scans costed fairly (default 4.0 is for HDDs).
SET random_page_cost = 1.1;

-- Give big sorts/hashes room so they stay in memory (per-op, per-connection!).
SET work_mem = '64MB';

-- Fix correlated-column misestimates (e.g. city and state are not independent).
CREATE STATISTICS orders_geo (dependencies)
  ON city, state FROM orders;
ANALYZE orders;

-- Force fresh stats and see the resulting plan change.
ANALYZE orders;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE city = 'Pune' AND state = 'MH';`,
      },
    ],

    memoryCard: {
      problem: "Turn declarative SQL into a fast execution strategy, and diagnose why a given query is slow.",
      mentalModel: "A GPS routing engine: it costs every route using a map (statistics) and picks the cheapest -- but an outdated map sends you down a closed road.",
      keyConcepts: [
        "cost-based planner; cost is a relative unit, not ms",
        "EXPLAIN (estimate) vs EXPLAIN ANALYZE (actual) + BUFFERS",
        "seq / index / index-only / bitmap heap scans",
        "nested loop vs hash vs merge joins",
        "estimated-rows vs actual-rows gap = the key signal",
        "statistics + ANALYZE; random_page_cost and work_mem",
      ],
      productionConnection: "Debug with EXPLAIN (ANALYZE, BUFFERS), chase the estimate/actual gap, ANALYZE after bulk loads, set random_page_cost ~1.1 on SSD.",
      oneLiner: "The planner picks the cheapest estimated plan from its statistics -- fix the stats and the 'wrong plan' fixes itself.",
    },

    quiz: [
      {
        id: "plan-q1",
        prompt: "What is the single strongest signal in EXPLAIN ANALYZE that the planner chose a bad plan?",
        choices: [
          { text: "A high total cost number", correct: false },
          { text: "A large gap between estimated rows and actual rows on a node", correct: true },
          { text: "The presence of a Seq Scan anywhere in the tree", correct: false },
          { text: "Any node with loops greater than 1", correct: false },
        ],
        explanation: "The planner's decisions flow from its row estimates. When estimated rows and actual rows diverge sharply, its costs were computed on wrong assumptions -- typically stale statistics -- and it likely picked a poor scan or join. Cost is relative, seq scans are often correct, and loops>1 is normal.",
      },
      {
        id: "plan-q2",
        prompt: "A query returns a MEDIUM fraction of a large table via a filter. Which scan does the planner typically choose?",
        choices: [
          { text: "Index Only Scan", correct: false },
          { text: "Bitmap Heap Scan", correct: true },
          { text: "Nested Loop", correct: false },
          { text: "Merge Join", correct: false },
        ],
        explanation: "A bitmap heap scan is the planner's answer for a medium number of matches: it collects matching page locations from the index into a bitmap, then reads those pages in physical order -- more efficient than many random single-row index fetches, but avoiding a full seq scan. Nested loop and merge join are join methods, not scans.",
      },
      {
        id: "plan-q3",
        prompt: "Why does EXPLAIN ANALYZE need to be wrapped in a transaction you ROLLBACK when used on an UPDATE?",
        choices: [
          { text: "Because ANALYZE locks the table exclusively", correct: false },
          { text: "Because EXPLAIN ANALYZE actually executes the statement, so the UPDATE would really modify data", correct: true },
          { text: "Because the planner cannot cost UPDATEs otherwise", correct: false },
          { text: "Because BUFFERS output requires a transaction", correct: false },
        ],
        explanation: "Unlike plain EXPLAIN, EXPLAIN ANALYZE runs the query to measure real timings. For a mutating statement that means the rows are genuinely changed. Wrapping it in BEGIN ... ROLLBACK lets you see the real plan and timings while discarding the effects.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Force a bad plan with stale stats, then fix it with ANALYZE",
      brief: "Create a table, bulk-load it without analyzing, watch the planner mis-estimate and pick a slow plan, then prove ANALYZE fixes it.",
      steps: `1. Build two tables:
   \`\`\`sql
   CREATE TABLE customers (id int PRIMARY KEY, name text);
   INSERT INTO customers SELECT g, 'c' || g FROM generate_series(1, 50000) g;
   CREATE TABLE orders (id serial PRIMARY KEY, customer_id int, created_at timestamptz DEFAULT now());
   \`\`\`
2. Disable autovacuum's help for the demo, then bulk-load orders WITHOUT analyzing:
   \`\`\`sql
   INSERT INTO orders (customer_id)
   SELECT (random()*49999)::int + 1 FROM generate_series(1, 500000);
   \`\`\`
3. Immediately inspect the plan (stats are still stale / empty):
   \`\`\`sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id;
   \`\`\`
   Note the estimated rows vs actual rows gap and the join method chosen.
4. Refresh statistics:
   \`\`\`sql
   ANALYZE orders; ANALYZE customers;
   \`\`\`
5. Re-run the same EXPLAIN ANALYZE. Compare: the estimated rows should now match reality and the plan (and time) should improve. Clean up with \`DROP TABLE orders, customers;\`.`,
      successCriteria: [
        "Captured a plan where estimated rows differed greatly from actual rows before ANALYZE",
        "Ran ANALYZE and saw the row estimates align with reality",
        "Observed the plan and/or execution time improve after fresh statistics",
      ],
    },
  },

  {
    slug: "pg-connection-pooling",
    title: "Connection Pooling",
    track: "shared",
    phase: "postgres",
    module: "pg-core",
    difficulty: "advanced",
    estMinutes: 24,
    summary:
      "Why every Postgres connection is a whole OS process that costs real memory, why hundreds of them melt the server, and how a pooler (PgBouncer) multiplexes thousands of clients onto a few backend connections -- plus the transaction-pooling gotcha that breaks prepared statements.",
    prerequisites: ["pg-transactions-mvcc"],
    relatedConcepts: ["pg-query-planning", "pg-indexes", "n-plus-one", "caching-dual"],
    tags: ["postgres", "pgbouncer", "connections", "pooling", "scaling", "performance"],

    why: `Postgres uses a **process per connection.** Each connection forks a backend OS process that holds its own memory (work_mem allocations, catalog caches, etc.). A few hundred connections can consume gigabytes of RAM and pile up context-switching overhead, and beyond that the server slows for everyone -- even if most connections are idle. Modern apps (many stateless instances, each with its own pool, plus serverless functions) can easily open thousands of connections. **A pooler is how you serve thousands of clients on a database that can only sanely run a couple hundred backends.**`,

    intuition: `Postgres backends are like **checkout lanes at a store, each staffed by a dedicated cashier who occupies floor space whether or not a customer is there.** You cannot open 5,000 lanes -- you run out of building. A pooler (PgBouncer) is the **host at the door with a small number of real lanes**, who lets a customer use a lane only for the moment they are actually checking out and then frees it for the next person. Thousands of shoppers, a handful of lanes, almost no waiting -- because nobody hogs a lane while just browsing.`,

    howItWorks: `- **Cost of a connection:** each is a forked backend process with per-process memory and startup cost (auth, fork, catalog load). Even idle, it consumes RAM and adds to the pool of things the scheduler and lock manager track.
- **\`max_connections\`:** a hard cap. Setting it huge does not help -- it just lets more heavy processes exist and can crash the box. Typical sane values are in the low hundreds, not thousands.
- **The C10k-shaped problem:** you want to serve 10k concurrent clients, but you cannot afford 10k backends. The answer is **multiplexing** -- many clients share a few backends because most are idle at any instant.
- **PgBouncer pooling modes:**
  - **Session pooling:** a client holds a backend for its entire connection lifetime. Safest (everything works), least sharing.
  - **Transaction pooling:** a backend is assigned only for the duration of a transaction, then returned to the pool. Huge multiplexing gains -- the standard for web apps. **But session-level state (server-side prepared statements, SET, LISTEN/NOTIFY, advisory locks, temp tables) can leak or break** because the next transaction may land on a different backend.
  - **Statement pooling:** backend returned after every single statement. Most aggressive; forbids multi-statement transactions.
- **Where to pool:** an **app-side pool** (e.g. the driver's pool, HikariCP, SQLAlchemy pool) limits one process's connections; an **external pooler** (PgBouncer/pgcat) sits in front of Postgres and multiplexes across *all* app instances. Large deployments use both: small per-instance pools feeding a shared PgBouncer.`,

    internals: `- **Pool sizing is not 'more is better.'** A classic starting formula for the *active* pool is \`connections = ((core_count * 2) + effective_spindle_count)\`. On an 8-core SSD box that is roughly 16-20. Past the point where the DB can actually run queries in parallel, extra connections only add contention and latency (thundering herd on locks and CPU).
- **Little's Law framing:** throughput = concurrency / latency. If each query takes 5 ms and you have 20 backends, you can push ~4000 queries/sec -- adding a 200th backend does not raise throughput, it raises latency and memory.
- **Transaction pooling + prepared statements:** a server-side \`PREPARE\` lives on one backend; under transaction pooling the next use may hit a different backend that never saw the prepare -> \`prepared statement "S_1" does not exist\`. Fixes: disable server-side prepared statements in the driver (\`prepareThreshold=0\`, asyncpg \`statement_cache_size=0\`), or use PgBouncer 1.21+ which supports prepared statements in transaction mode with \`max_prepared_statements\`.
- **Idle-in-transaction connections** are doubly harmful behind a pooler: they hold a backend out of the pool *and* pin an MVCC snapshot (see transactions lesson). Set \`idle_in_transaction_session_timeout\`.
- **PgBouncer is single-threaded** (like Redis) -- for very high throughput you run several instances or use a multi-threaded pooler (pgcat, Odyssey).`,

    diagram: {
      title: "Multiplexing thousands of clients onto a few backends",
      layers: [
        { id: "clients", label: "App instances / serverless fns", sub: "thousands of client connections, mostly idle" },
        { id: "apppool", label: "App-side pools", sub: "small pool per process (driver/ORM)" },
        { id: "pgb", label: "PgBouncer", sub: "transaction pooling: lend a backend per transaction" },
        { id: "backends", label: "Real Postgres backends", sub: "a few dozen processes -- the scarce resource" },
        { id: "pg", label: "PostgreSQL", sub: "max_connections bounded by RAM/CPU, not wishes" },
      ],
      caption: "Most clients are idle at any instant, so a small pool of real backends can serve a huge client population -- if you pool per transaction, not per session.",
    },

    realWorld: `A team scaled their API from 5 to 60 Kubernetes pods, each with a driver pool of 20. That is 1,200 attempted connections against a Postgres with \`max_connections = 200\`. Deploys started failing with \`FATAL: sorry, too many clients already\`, and even under the cap the DB was thrashing on memory. They dropped PgBouncer in front in **transaction** mode with a pool of 25 backends, shrank each pod's pool to 5, and served all 60 pods comfortably. One follow-up bug: their ORM used server-side prepared statements and threw \`prepared statement does not exist\` intermittently -- fixed by disabling the client-side prepared-statement cache (transaction pooling does not guarantee the same backend twice).`,

    production: `- **Put an external pooler (PgBouncer) in front of Postgres** for any app with many instances or serverless functions; use **transaction pooling** for web workloads.
- **Keep max_connections modest** (low hundreds) and let the pooler multiplex; do not 'fix' too-many-clients by raising it blindly.
- **Size the backend pool near the DB's real parallelism** (roughly cores x 2 for OLTP), not the number of clients.
- **When using transaction pooling, disable server-side prepared statements in the driver** (or use PgBouncer 1.21+ prepared-statement support) to avoid 'prepared statement does not exist'.
- **Set \`idle_in_transaction_session_timeout\`** so a stuck transaction cannot hold a pooled backend and pin snapshots.
- **Reserve a few superuser connections** (\`superuser_reserved_connections\`) so you can still get in when the pool is exhausted.`,

    commonMistakes: [
      "Raising max_connections to thousands instead of pooling -- each connection is a real process that costs memory and contention.",
      "Giving every app instance a large pool, so total connections far exceed max_connections and deploys fail with 'too many clients'.",
      "Using transaction pooling while relying on server-side prepared statements, SET, temp tables, or LISTEN/NOTIFY -- these break when the backend changes between statements.",
      "Assuming a bigger pool means more throughput; past the DB's parallelism it only adds latency and lock contention.",
      "Forgetting idle-in-transaction connections hold a pooled backend AND pin an MVCC snapshot.",
      "Running one PgBouncer (single-threaded) at very high throughput and saturating its single core.",
    ],

    tradeoffs: `| Pooling mode | Multiplexing | Compatibility |
|---|---|---|
| Session pooling | Low (one backend per client connection) | Full -- everything works, incl. prepared stmts, SET, temp tables |
| Transaction pooling | High (backend lent per transaction) | Breaks session-level state; needs prepared-stmt handling |
| Statement pooling | Highest | No multi-statement transactions at all |
| No pooler (direct) | None | Simple, but caps out fast and wastes RAM on idle backends |`,

    whenToUse: [
      "Any app with many stateless instances or serverless/lambda functions hitting one Postgres.",
      "Transaction pooling for typical stateless web APIs where each request is a short transaction.",
      "Session pooling when you genuinely need session state (LISTEN/NOTIFY, session-scoped temp tables, long-lived prepared statements).",
    ],
    whenNotToUse: [
      "Do not add transaction pooling if your app depends on session-level features without adapting the driver -- you will get intermittent 'prepared statement does not exist' and lost SET state.",
      "Do not bother with an external pooler for a single small app instance whose driver pool already stays well under max_connections.",
      "Do not use statement pooling for anything that runs multi-statement transactions.",
    ],

    code: [
      {
        label: "pgbouncer.ini (transaction pooling)",
        language: "ini",
        code: `[databases]
; clients connect to PgBouncer, which talks to the real Postgres
appdb = host=127.0.0.1 port=5432 dbname=appdb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; transaction pooling: lend a backend only for the duration of a transaction
pool_mode = transaction

; total real backend connections PgBouncer will open to Postgres (the scarce resource)
default_pool_size = 25
; hard cap on incoming client connections PgBouncer accepts (can be huge)
max_client_conn = 5000
; keep a couple spare warm backends
min_pool_size = 5
reserve_pool_size = 5

; PgBouncer 1.21+: allow server-side prepared statements under transaction mode
max_prepared_statements = 200

; kill transactions that go idle so they don't hold a pooled backend
idle_transaction_timeout = 60`,
      },
      {
        label: "App-side driver config for transaction pooling",
        language: "python",
        code: `# Python (asyncpg via SQLAlchemy) behind PgBouncer transaction pooling:
# server-side prepared statements MUST be disabled, because the next
# statement may land on a DIFFERENT backend that never saw the PREPARE.

from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    "postgresql+asyncpg://app@pgbouncer-host:6432/appdb",
    # keep each process's pool SMALL -- PgBouncer does the real multiplexing
    pool_size=5,
    max_overflow=0,
    connect_args={
        # asyncpg: turn off the prepared-statement cache
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# Symptom if you forget this under transaction pooling:
#   asyncpg.exceptions.InvalidSQLStatementNameError:
#   prepared statement "__asyncpg_stmt_1__" does not exist`,
      },
      {
        label: "Sizing math (why bigger is not better)",
        language: "python",
        code: `# Rough starting point for the ACTIVE backend pool (not client count):
#   pool = (core_count * 2) + effective_spindle_count
cores = 8
spindles = 1            # ~1 for SSD
pool = cores * 2 + spindles      # -> 17

# Little's Law: throughput = concurrency / latency
latency_s = 0.005                # 5 ms per query
qps_capacity = pool / latency_s  # -> ~3400 queries/sec

# Adding a 200th backend does NOT raise qps_capacity here; the DB can only
# run ~17 queries truly in parallel. Extra backends add memory + lock
# contention + context switches, RAISING latency. So:
#   max_client_conn (PgBouncer)   = huge   (e.g. 5000)   -- cheap, just sockets
#   default_pool_size (backends)  = ~pool  (e.g. 20)     -- the scarce resource
#   max_connections (Postgres)    = a bit above pool + reserve (e.g. 100)`,
      },
    ],

    memoryCard: {
      problem: "Serve thousands of application clients against a Postgres that can only sanely run a couple hundred process-per-connection backends.",
      mentalModel: "Checkout lanes staffed by dedicated cashiers: you cannot open 5,000 lanes, so a host (PgBouncer) lends a lane only during actual checkout (a transaction) and reclaims it instantly.",
      keyConcepts: [
        "process-per-connection: each connection is a memory-hungry OS process",
        "max_connections is bounded by RAM/CPU, not wishes",
        "PgBouncer session vs transaction vs statement pooling",
        "app-side pool vs external pooler (use both at scale)",
        "pool size ~ cores*2, not client count (Little's Law)",
        "transaction pooling breaks server-side prepared statements",
      ],
      productionConnection: "PgBouncer in transaction mode, small per-instance pools, backend pool near cores*2, disable driver prepared-statement cache, set idle timeouts.",
      oneLiner: "Postgres backends are expensive processes -- pool per transaction so a few dozen backends can serve thousands of mostly-idle clients.",
    },

    quiz: [
      {
        id: "pool-q1",
        prompt: "Why is raising max_connections to several thousand a poor way to support thousands of clients?",
        choices: [
          { text: "Postgres refuses values above 1000", correct: false },
          { text: "Each connection is a separate OS backend process consuming memory and adding contention, so thousands can exhaust RAM and slow the whole server", correct: true },
          { text: "It disables MVCC", correct: false },
          { text: "It forces every query into a sequential scan", correct: false },
        ],
        explanation: "Postgres uses a process per connection. Each backend holds per-process memory and adds scheduling and lock-manager overhead even when idle. Thousands of them exhaust RAM and degrade everyone. The right answer is a pooler that multiplexes many clients onto a few backends.",
      },
      {
        id: "pool-q2",
        prompt: "Under PgBouncer transaction pooling, why can server-side prepared statements throw 'prepared statement does not exist'?",
        choices: [
          { text: "Prepared statements are disabled in Postgres by default", correct: false },
          { text: "A backend is lent only for one transaction, so the next statement may run on a different backend that never saw the PREPARE", correct: true },
          { text: "Transaction pooling encrypts statement names", correct: false },
          { text: "Because ANALYZE clears the plan cache", correct: false },
        ],
        explanation: "In transaction pooling a physical backend is returned to the pool after each transaction, so subsequent work can land on a different backend. A server-side prepared statement lives on one specific backend, so a later reference may hit a backend that never prepared it. Fixes: disable the driver's prepared-statement cache, or use PgBouncer 1.21+ prepared-statement support.",
      },
      {
        id: "pool-q3",
        prompt: "On an 8-core SSD server, why does setting the backend pool to 500 instead of ~20 usually hurt?",
        choices: [
          { text: "Postgres caps parallel queries at 8 regardless of pool size", correct: false },
          { text: "The DB can only run a small number of queries truly in parallel, so extra backends add memory use, context switches, and lock contention -- raising latency without raising throughput", correct: true },
          { text: "A pool over 256 disables the query planner", correct: false },
          { text: "Larger pools force session pooling mode", correct: false },
        ],
        explanation: "Throughput equals concurrency divided by latency, but real parallelism is bounded by cores/IO. Past roughly cores*2 active backends, more connections only pile on memory, scheduling, and lock contention, which increases latency. The pool should track the DB's real parallelism, not the client count.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Prove connections are expensive and that a pooler multiplexes them",
      brief: "Measure how many backends your Postgres actually allows, exhaust them, then front it with PgBouncer transaction pooling and serve far more clients.",
      steps: `1. Check the real limits and current usage:
   \`\`\`sql
   SHOW max_connections;
   SELECT count(*) FROM pg_stat_activity;
   \`\`\`
2. Exhaust connections to see the failure mode. In a shell, open many idle psql sessions (adjust count to just over max_connections):
   \`\`\`bash
   for i in $(seq 1 210); do psql -h localhost -d appdb -c 'SELECT pg_sleep(60)' & done
   \`\`\`
   New connections should fail with \`FATAL: sorry, too many clients already\`. Kill them (\`kill %1 %2 ...\` or close the shell).
3. Install and configure PgBouncer with the pgbouncer.ini from this lesson (pool_mode = transaction, default_pool_size = 25, max_client_conn = 5000). Start it on port 6432.
4. Point clients at PgBouncer (port 6432 instead of 5432) and confirm many client connections map to few backends:
   \`\`\`sql
   -- run against Postgres directly (5432):
   SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE 'pgbouncer%';
   -- inspect the pooler itself (connect to the special 'pgbouncer' db on 6432):
   SHOW POOLS;
   \`\`\`
5. From an app or a loop, open 100+ short transactions through 6432 and confirm SHOW POOLS shows only ~25 server (backend) connections servicing them all.`,
      successCriteria: [
        "Confirmed max_connections and reproduced 'too many clients' by exceeding it directly",
        "Configured PgBouncer in transaction mode and routed clients through it",
        "Observed many client connections served by a small fixed number of backend connections (SHOW POOLS)",
      ],
    },
  },

  {
    slug: "n-plus-one",
    title: "The N+1 Query Problem",
    track: "shared",
    phase: "postgres",
    module: "pg-core",
    difficulty: "core",
    estMinutes: 20,
    summary:
      "The most common ORM performance bug: one query to fetch a list, then one more query per item to fetch its relation -- 1 + N round trips instead of 1 or 2. How ORMs cause it silently, how to detect it, and how to fix it with eager loading, JOINs, IN batching, or a DataLoader.",
    prerequisites: ["pg-indexes"],
    relatedConcepts: ["pg-query-planning", "pg-connection-pooling", "pg-transactions-mvcc", "caching-dual"],
    tags: ["postgres", "orm", "n+1", "query", "performance", "eager-loading", "dataloader"],

    why: `A page that loads a list of 50 orders and, for each, lazily fetches the customer runs **51 queries** instead of 1 or 2. Each query is a network round trip -- latency, not just CPU -- so at 1 ms per round trip that is 51 ms of pure waiting, and it grows linearly with the list. **N+1 is the number-one cause of 'the app is slow only in production' surprises**, because it is invisible in tests with tiny data and explodes when the list gets long.`,

    intuition: `Imagine ordering 50 items online and the warehouse **drives to your house 50 separate times, one box per trip**, plus one trip to bring the list. That is N+1. The fix is obvious once you see it: **bring everything in one truck** (a JOIN), or at least **batch the 50 boxes into one delivery** (an IN query). The waste was never the boxes -- it was the round trips.`,

    howItWorks: `- **The shape:** \`1\` query to load the parent list, then \`N\` queries -- one per row -- to load a related object. Total = \`1 + N\`.
- **Why ORMs cause it silently:** relationships are usually **lazy** by default. \`order.customer\` looks like a plain attribute access in code, but the first time you touch it the ORM fires a hidden \`SELECT\`. Put that access inside a loop over N orders and you have N hidden queries -- the code reads innocently.
- **The fixes, in order of preference:**
  - **Eager load with a JOIN** (\`JOIN\` / SQLAlchemy \`joinedload\` / Django \`select_related\`): fetch parents and their to-one relation in **one** query.
  - **Batch with IN** (SQLAlchemy \`selectinload\` / Django \`prefetch_related\`): one query for parents, then **one** query \`WHERE child.parent_id IN (...)\` for all children -- total **2** queries regardless of N. Best for to-many relations.
  - **DataLoader** (GraphQL/service layer): collect all the ids requested during a tick and issue a single batched \`IN\` query, also de-duplicating -- turns fan-out resolvers back into batches.
- **N+1 is not always the enemy:** if N is tiny and bounded (say, always <= 3), the extra queries are cheaper and simpler than a big JOIN that duplicates parent columns across every child row (over-fetching).`,

    internals: `- **The cost is dominated by round-trip latency, not query work.** 50 trivially fast queries can be far slower than one slightly heavier JOIN, because each carries fixed network + parse + plan overhead. This is why N+1 hurts most across a network hop and behind a pooler.
- **JOIN eager loading over-fetches for to-many relations:** joining a parent to 100 children repeats every parent column 100 times over the wire (a 'cartesian' blowup). That is exactly why \`selectinload\`/\`prefetch_related\` exist -- two clean queries beat one bloated join for collections.
- **IN-list batching has limits:** extremely large \`IN\` lists (tens of thousands of ids) can themselves be slow to parse/plan; chunk them, or use \`= ANY(ARRAY[...])\`, or a temp table / \`VALUES\` join for very large sets.
- **Detection is the hard part** because the code looks fine. Enable query logging or use an APM/ORM echo to *count* queries per request. A request whose query count scales with the size of a list is the signature.
- **DataLoader batches within a single event-loop tick** and caches per-request, so it also collapses duplicate lookups (the same customer requested by 10 orders becomes one fetch).`,

    diagram: {
      title: "N+1 vs a batched fetch",
      layers: [
        { id: "list", label: "1 query: load N parents", sub: "SELECT * FROM orders LIMIT 50" },
        { id: "nplus", label: "N+1: loop touches order.customer", sub: "fires SELECT ... customer per order -> 50 more queries" },
        { id: "join", label: "Fix A: JOIN eager load", sub: "1 query returns orders + customers together" },
        { id: "in", label: "Fix B: IN batch", sub: "2 queries: parents, then WHERE id IN (...) children" },
        { id: "loader", label: "Fix C: DataLoader", sub: "collect ids per tick -> one batched IN, de-duped" },
      ],
      caption: "The bug is round trips that scale with the list; every fix collapses N round trips into a constant number.",
    },

    realWorld: `An order-history endpoint was 40 ms in staging (5 test orders) and 1.8 s in production (150 orders per customer). APM traces showed 300+ near-identical \`SELECT * FROM customers WHERE id = ?\` per request -- classic N+1 from a lazy \`order.customer\` access inside the serializer loop. Switching the ORM query to eager-load the customer collapsed 300 queries into 1 JOIN; the endpoint dropped to 60 ms. Nothing about the database or indexes was wrong -- **the fix was to stop making one round trip per row.**`,

    production: `- **Instrument query counts per request** (ORM echo in dev, APM/tracing in prod). A count that grows with list size is the tell.
- **Default to eager loading known-needed relations:** \`select_related\`/\`joinedload\` for to-one, \`prefetch_related\`/\`selectinload\` for to-many.
- **Prefer IN-batching (2 queries) over a giant JOIN** when the relation is a collection, to avoid over-fetching parent columns.
- **Use a DataLoader in GraphQL / resolver-heavy code** so fan-out resolvers batch and de-duplicate automatically.
- **Add a guardrail test** that asserts an endpoint issues a bounded number of queries regardless of dataset size, so regressions are caught in CI.
- **Do not over-correct into a monster JOIN** that fetches columns you never use -- balance N+1 against over-fetching.`,

    commonMistakes: [
      "Accessing a lazy relation inside a loop (order.customer per order) and not realizing each access is a hidden SELECT.",
      "Only testing with a handful of rows, so N+1 never shows up until production data makes N large.",
      "Fixing every N+1 with a big JOIN, causing over-fetching (parent columns duplicated across many child rows).",
      "Batching with an IN list of tens of thousands of ids and hitting a new parse/plan bottleneck instead of chunking.",
      "Assuming an APM 'slow endpoint' is a slow query, when it is actually hundreds of fast queries adding up.",
      "Not adding a regression guard, so a later 'convenience' lazy access reintroduces the N+1.",
    ],

    tradeoffs: `| Approach | Queries | Downside |
|---|---|---|
| Lazy (N+1) | 1 + N | Round trips scale with list -- slow at scale |
| JOIN eager load | 1 | Over-fetches: parent columns duplicated per child |
| IN batch (selectinload) | 2 | Two round trips; huge IN lists need chunking |
| DataLoader | ~1 per relation per tick | Extra machinery; per-request caching semantics |
| Accept N+1 (tiny bounded N) | 1 + N (small) | Fine when N is small and known -- simplest |`,

    whenToUse: [
      "Eager load (JOIN) whenever you know you will need a to-one relation for every row in a list.",
      "IN-batch (selectinload/prefetch_related) for to-many relations to avoid join over-fetch.",
      "DataLoader in GraphQL or any resolver graph where the same entities are requested repeatedly across a request.",
    ],
    whenNotToUse: [
      "Do not eagerly JOIN a large to-many relation you rarely traverse -- you pay over-fetch on every request for nothing.",
      "Do not build DataLoader plumbing for a simple endpoint with a small, fixed N -- accepting a few extra queries is simpler.",
      "Do not batch with a single enormous IN list; chunk it or use a temp-table/VALUES join instead.",
    ],

    code: [
      {
        label: "The N+1 problem (SQL you actually emit)",
        language: "sql",
        code: `-- 1 query for the list:
SELECT id, customer_id, total FROM orders WHERE status = 'open' LIMIT 50;

-- then the ORM fires ONE of these PER ROW when you touch order.customer:
SELECT * FROM customers WHERE id = 1;
SELECT * FROM customers WHERE id = 2;
SELECT * FROM customers WHERE id = 3;
-- ... 50 times total -> 1 + 50 = 51 round trips.

-- FIX A -- JOIN eager load (1 query, best for to-one):
SELECT o.id, o.total, c.id AS c_id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'open'
LIMIT 50;

-- FIX B -- IN batch (2 queries, best for collections):
SELECT id, customer_id, total FROM orders WHERE status = 'open' LIMIT 50;
SELECT * FROM customers WHERE id IN (1, 2, 3, /* ...all 50 distinct ids... */);`,
      },
      {
        label: "ORM: cause and fix (SQLAlchemy / Django)",
        language: "python",
        code: `# --- SQLAlchemy ---
# BAD: lazy relation touched in a loop -> 1 + N queries
orders = session.query(Order).filter_by(status="open").all()   # 1 query
for o in orders:
    print(o.customer.name)   # each access fires a hidden SELECT -> N queries

# GOOD (to-one): JOIN eager load -> 1 query
from sqlalchemy.orm import joinedload
orders = (session.query(Order)
          .options(joinedload(Order.customer))
          .filter_by(status="open").all())

# GOOD (to-many): IN batch -> 2 queries, no over-fetch
from sqlalchemy.orm import selectinload
orders = (session.query(Order)
          .options(selectinload(Order.line_items))
          .filter_by(status="open").all())

# --- Django ORM ---
# BAD: qs = Order.objects.filter(status="open"); [o.customer.name for o in qs]
Order.objects.filter(status="open").select_related("customer")     # to-one, 1 query
Order.objects.filter(status="open").prefetch_related("line_items") # to-many, 2 queries`,
      },
      {
        label: "DataLoader: batch + dedupe (TypeScript, GraphQL)",
        language: "typescript",
        code: `import DataLoader from "dataloader";

// One batch function: given many ids collected during a tick,
// issue a SINGLE query and return results in the same order.
const customerLoader = new DataLoader<number, Customer>(async (ids) => {
  // ids might be [1, 2, 2, 3, 5] across many resolvers in this request
  const rows = await db.query(
    "SELECT * FROM customers WHERE id = ANY($1)",
    [ids as number[]],                       // one round trip for all ids
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id));      // preserve input order
});

// In a resolver, this LOOKS like N calls but batches into ONE query:
const resolvers = {
  Order: {
    customer: (order: Order) => customerLoader.load(order.customerId),
  },
};
// 50 orders -> 50 .load() calls -> 1 batched, de-duplicated SELECT.`,
      },
    ],

    memoryCard: {
      problem: "Loading a list and then a related object per item, issuing 1 + N queries where 1 or 2 would do.",
      mentalModel: "A warehouse that drives to your house once per item instead of loading one truck -- the waste is round trips, not the goods.",
      keyConcepts: [
        "1 + N shape: one list query, one per-row relation query",
        "ORM lazy relations make each access a hidden SELECT",
        "cost is round-trip latency, not query work",
        "fixes: JOIN eager load (1), IN batch (2), DataLoader",
        "JOIN over-fetches to-many; IN-batch avoids it",
        "small bounded N can be fine -- do not over-engineer",
      ],
      productionConnection: "Count queries per request in APM; default to select_related/joinedload and prefetch_related/selectinload; DataLoader in GraphQL; add a query-count regression test.",
      oneLiner: "N+1 turns one list into N+1 round trips -- collapse it with a JOIN, an IN batch, or a DataLoader.",
    },

    quiz: [
      {
        id: "nplus1-q1",
        prompt: "What makes the N+1 problem so easy to introduce with an ORM?",
        choices: [
          { text: "ORMs disable indexes by default", correct: false },
          { text: "Related objects are usually lazy, so touching order.customer in a loop silently fires one SELECT per iteration", correct: true },
          { text: "ORMs force every query to use SERIALIZABLE isolation", correct: false },
          { text: "ORMs cannot generate JOINs", correct: false },
        ],
        explanation: "ORM relationships default to lazy loading. Accessing a relation like order.customer looks like a plain attribute read but triggers a hidden query the first time. Inside a loop over N rows that becomes N hidden queries -- the code looks innocent, which is why the bug is so common.",
      },
      {
        id: "nplus1-q2",
        prompt: "For a to-MANY relation (order -> many line_items), why is IN-batch loading often better than a single JOIN?",
        choices: [
          { text: "JOINs cannot express to-many relations", correct: false },
          { text: "A JOIN duplicates every parent column across each child row (over-fetching); IN-batch fetches parents once and children once in 2 clean queries", correct: true },
          { text: "IN-batch always uses fewer total queries than a JOIN", correct: false },
          { text: "JOINs bypass the query planner", correct: false },
        ],
        explanation: "Joining a parent to many children repeats the parent's columns once per child row, wasting bandwidth (a cartesian-style blowup). Splitting into two queries -- parents, then children WHERE parent_id IN (...) -- avoids that duplication. That is exactly what selectinload/prefetch_related do.",
      },
      {
        id: "nplus1-q3",
        prompt: "Why is N+1 often invisible in tests but catastrophic in production?",
        choices: [
          { text: "Tests run against a faster database", correct: false },
          { text: "Test datasets are tiny so N is small; the cost scales linearly with list size, which only gets large with real production data", correct: true },
          { text: "Production disables the query cache", correct: false },
          { text: "ORMs behave differently in production mode", correct: false },
        ],
        explanation: "The total cost is roughly 1 + N round trips. With a handful of test rows N is tiny and the endpoint seems fine. In production the list grows to hundreds, so the per-row queries multiply and the endpoint suddenly becomes slow -- the classic 'only slow in prod' symptom.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Detect an N+1 by counting queries, then fix it",
      brief: "Turn on query logging, hit an endpoint that lazily loads a relation, watch the query count scale with the list, then eager-load and confirm it drops to a constant.",
      steps: `1. Enable query logging so you can COUNT queries per request:
   - SQLAlchemy: create the engine with \`echo=True\`.
   - Django: add the console logger for \`django.db.backends\` at DEBUG, or use django-debug-toolbar.
   - Or, in Postgres, set \`log_statement = 'all'\` temporarily and tail the log.
2. Seed enough data to make N large (e.g. 100 orders, each with a customer).
3. Hit the endpoint that iterates the list and accesses the relation (e.g. serializes \`order.customer.name\` for each order). Count the SELECTs in the log -- you should see roughly 1 + 100.
4. Apply an eager-loading fix:
   - to-one: \`joinedload(Order.customer)\` / \`select_related("customer")\`.
   - to-many: \`selectinload(Order.line_items)\` / \`prefetch_related("line_items")\`.
5. Hit the endpoint again and re-count. It should now be 1 (JOIN) or 2 (IN batch) queries regardless of how many orders there are. Optionally add a test that asserts the query count stays bounded as you increase the row count, to prevent regressions.`,
      successCriteria: [
        "Observed the query count grow to ~1 + N with lazy loading",
        "Applied eager loading (JOIN or IN batch) appropriate to the relation type",
        "Confirmed the query count dropped to a small constant independent of list size",
      ],
    },
  },
];
