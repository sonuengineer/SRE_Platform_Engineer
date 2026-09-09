// Production incident simulations. Each is investigable: symptoms, a dashboard,
// logs, and a terminal snapshot -- then the learner diagnoses root cause + fix.
// The platform evaluates the diagnosis. Hints are progressive (cost points).

export type Severity = "SEV1" | "SEV2" | "SEV3";

export interface Panel {
  label: string;
  value: string;
  unit?: string;
  status: "ok" | "warn" | "crit";
  spark: number[]; // last N samples, drawn as a sparkline
}

export interface Choice {
  id: string;
  text: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  service: string;
  symptom: string;
  tags: string[];

  dashboard: Panel[];
  logs: string[];
  terminal?: { cmd: string; output: string }[];

  hints: string[]; // progressive; each costs points

  causeChoices: Choice[];
  rootCauseId: string;

  actionChoices: Choice[];
  correctActionIds: string[];

  postmortem: string; // markdown
  relatedLessons: string[];
}

export const INCIDENTS: Incident[] = [
  {
    id: "api-500-spike",
    title: "API returning 500s after a deploy",
    severity: "SEV1",
    service: "checkout-api",
    symptom:
      "Error rate jumped from 0.1% to 34% within two minutes of the 14:02 deploy. Users can't complete checkout.",
    tags: ["500", "deploy", "rollback", "exceptions", "api"],
    dashboard: [
      { label: "Error rate", value: "34", unit: "%", status: "crit", spark: [0, 0, 1, 1, 33, 34, 34, 35] },
      { label: "p99 latency", value: "180", unit: "ms", status: "ok", spark: [175, 178, 180, 179, 181, 180, 178, 180] },
      { label: "Requests/s", value: "1.2k", status: "ok", spark: [1200, 1210, 1190, 1205, 1198, 1202, 1200, 1199] },
      { label: "CPU", value: "41", unit: "%", status: "ok", spark: [40, 42, 41, 43, 40, 41, 42, 41] },
      { label: "DB connections", value: "22", unit: "/100", status: "ok", spark: [20, 21, 22, 22, 23, 22, 21, 22] },
    ],
    logs: [
      "14:02:11 INFO  deploy: rolling out checkout-api v1.9.0",
      "14:02:44 ERROR handler /checkout: KeyError: 'shipping_zone'",
      "14:02:44 ERROR   File \"checkout.py\", line 88, in calculate_total",
      "14:02:45 ERROR handler /checkout: KeyError: 'shipping_zone'",
      "14:02:46 ERROR handler /checkout: KeyError: 'shipping_zone'  (x2200 in 60s)",
      "14:03:01 INFO  /health still 200 OK",
    ],
    terminal: [
      { cmd: "kubectl rollout history deploy/checkout-api", output: "REVISION  CHANGE-CAUSE\n7         v1.8.3\n8         v1.9.0  <-- current (14:02)" },
      { cmd: "git log --oneline -3 v1.9.0", output: "a1c9f2 feat: use new shipping_zone field\n77bd10 refactor: pricing\n0f9e21 chore: bump deps" },
    ],
    hints: [
      "The error rate spiked at the exact minute of a deploy. What changed at 14:02?",
      "Latency, CPU, and DB are all healthy -- this is not a resource problem. Look at the logs.",
      "The logs show the same exception repeating: KeyError 'shipping_zone'. The new code reads a field that isn't present on existing requests/data.",
      "Fastest mitigation is almost never a forward-fix under SEV1. What does rollout history let you do?",
    ],
    causeChoices: [
      { id: "c1", text: "Database connection pool exhausted" },
      { id: "c2", text: "New deploy (v1.9.0) reads a field 'shipping_zone' that is missing, throwing unhandled KeyError" },
      { id: "c3", text: "CPU saturation from a traffic spike" },
      { id: "c4", text: "Downstream payment provider is down" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Roll back to v1.8.3 immediately to stop the bleeding" },
      { id: "a2", text: "Scale up replicas to handle the load" },
      { id: "a3", text: "After rollback, fix the code to default/validate 'shipping_zone' and add a test" },
      { id: "a4", text: "Restart the database" },
      { id: "a5", text: "Add error handling and a backfill/migration for the missing field before re-deploying" },
    ],
    correctActionIds: ["a1", "a3", "a5"],
    postmortem: `**Root cause:** v1.9.0 introduced code that unconditionally read \`shipping_zone\` from the request/order, but existing in-flight data didn't always include it, raising an unhandled \`KeyError\` -> HTTP 500 on the checkout path.

**Why healthy signals misled:** CPU, latency, and DB were all normal because this was a *logic* failure, not a *resource* failure. The tell was the tight correlation with the deploy timestamp and the repeating identical exception.

**Correct response order:** (1) **roll back** to stop user impact -- mitigate before you fully understand; (2) reproduce and **fix the code** with defaulting/validation + a regression test; (3) if the field is genuinely required, **backfill/migrate** and add a compatibility path before re-deploying.

**Prevention:** contract tests for new required fields, canary deploys with automatic error-rate rollback, and defensive parsing of external inputs.`,
    relatedLessons: ["http-fundamentals", "deployment-strategies", "incident-response"],
  },

  {
    id: "db-pool-exhaustion",
    title: "Database connection pool exhaustion",
    severity: "SEV1",
    service: "orders-api",
    symptom:
      "Requests are timing out. Latency is climbing and many requests never reach the database. No deploy happened.",
    tags: ["database", "connections", "pool", "timeout", "latency", "postgres"],
    dashboard: [
      { label: "p99 latency", value: "9.8", unit: "s", status: "crit", spark: [0.2, 0.3, 1.2, 3.4, 6.1, 8.0, 9.5, 9.8] },
      { label: "Error rate", value: "18", unit: "%", status: "crit", spark: [0, 1, 3, 6, 10, 14, 17, 18] },
      { label: "DB connections", value: "100", unit: "/100", status: "crit", spark: [40, 55, 72, 88, 96, 100, 100, 100] },
      { label: "DB CPU", value: "35", unit: "%", status: "ok", spark: [30, 32, 34, 35, 33, 35, 34, 35] },
      { label: "Active queries", value: "97", status: "warn", spark: [10, 20, 45, 70, 90, 96, 97, 97] },
    ],
    logs: [
      "10:41 WARN  pool: waiting for connection (waiters=42)",
      "10:41 ERROR could not get connection from pool within 5000ms",
      "10:42 WARN  slow query 8100ms: SELECT * FROM orders WHERE user_id=$1  (no index? seq scan)",
      "10:42 ERROR could not get connection from pool within 5000ms (x900)",
    ],
    terminal: [
      { cmd: "psql -c \"select count(*), state from pg_stat_activity group by state\"", output: " count | state\n-------+---------------------\n    3  | idle\n   94  | active\n    3  | idle in transaction" },
      { cmd: "psql -c \"select query, now()-query_start as dur from pg_stat_activity where state='active' order by dur desc limit 3\"", output: "SELECT * FROM orders WHERE user_id=$1 | 00:00:08.4\nSELECT * FROM orders WHERE user_id=$1 | 00:00:08.1\nSELECT * FROM orders WHERE user_id=$1 | 00:00:07.9" },
    ],
    hints: [
      "DB CPU is low but connections are pinned at the max. The DB isn't overloaded -- something is holding connections.",
      "Look at active queries: many identical slow SELECTs, each ~8s. What makes a single query take 8 seconds on a table?",
      "A query doing a sequential scan holds its connection for the whole 8s. Enough concurrent slow queries and the pool is fully occupied -> everyone else waits and times out.",
      "There are two fixes: relieve the immediate saturation, and remove the reason each query is slow.",
    ],
    causeChoices: [
      { id: "c1", text: "The database server ran out of CPU" },
      { id: "c2", text: "A slow (unindexed) query holds each connection ~8s; concurrency exhausts the pool so new requests wait and time out" },
      { id: "c3", text: "A bad deploy introduced a bug" },
      { id: "c4", text: "Network partition between app and DB" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Add the missing index on orders(user_id) to make the query fast and release connections quickly" },
      { id: "a2", text: "Kill the longest-running queries to immediately free connections" },
      { id: "a3", text: "Blindly raise the pool/max_connections to 1000" },
      { id: "a4", text: "Add a statement_timeout so runaway queries can't pin connections indefinitely" },
      { id: "a5", text: "Restart the app servers repeatedly" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a query \`SELECT * FROM orders WHERE user_id = $1\` had no index on \`user_id\`, so each execution did a sequential scan taking ~8s. Each slow query **holds a pooled connection for its entire duration**. Under normal traffic, concurrent slow queries occupied all 100 connections; every other request then blocked waiting for a connection and timed out.

**Why DB CPU looked fine:** sequential scans are I/O- and time-bound here, and the bottleneck was *connection occupancy*, not raw CPU. The pool -- not the database -- was the exhausted resource.

**Correct response:** (1) **kill the longest queries** to free connections and restore service; (2) **add the index** so the query returns in milliseconds and releases its connection quickly; (3) add a **statement_timeout** so a single pathological query can never pin a connection forever.

**Why NOT just raise the pool:** more connections against slow queries only moves the bottleneck to the database and can overwhelm it. Fix the slow query; don't feed it more concurrency.`,
    relatedLessons: ["pg-indexes", "pg-connection-pooling", "tcp"],
  },

  {
    id: "memory-leak-oom",
    title: "Memory leak causing OOMKills",
    severity: "SEV2",
    service: "image-worker",
    symptom:
      "Pods are being OOMKilled and restarting every ~40 minutes. Memory climbs steadily and never comes back down.",
    tags: ["memory", "leak", "oom", "kubernetes", "137"],
    dashboard: [
      { label: "Memory / limit", value: "512", unit: "/512Mi", status: "crit", spark: [180, 240, 300, 360, 420, 470, 505, 512] },
      { label: "Restarts (1h)", value: "3", status: "crit", spark: [0, 0, 1, 1, 2, 2, 3, 3] },
      { label: "CPU", value: "55", unit: "%", status: "ok", spark: [50, 52, 55, 54, 56, 55, 53, 55] },
      { label: "GC pause", value: "12", unit: "ms", status: "ok", spark: [10, 11, 12, 11, 13, 12, 11, 12] },
      { label: "Throughput", value: "310", unit: "img/s", status: "warn", spark: [400, 390, 360, 340, 330, 320, 315, 310] },
    ],
    logs: [
      "12:00 INFO  worker started, processing image queue",
      "12:38 WARN  memory usage 470Mi / 512Mi",
      "12:41 ERROR OOMKilled (exit 137)",
      "12:41 INFO  restart #3; memory reset to 180Mi",
      "12:41 INFO  cache size = 41,203 entries (never evicted)",
    ],
    terminal: [
      { cmd: "kubectl describe pod image-worker-xy | grep -A2 'Last State'", output: "Last State:  Terminated\n  Reason:    OOMKilled\n  Exit Code: 137" },
      { cmd: "heap-profile top", output: "1. thumbnail_cache dict  388 MB  (grows every request, no eviction)\n2. PIL buffers            41 MB\n3. rest                   30 MB" },
    ],
    hints: [
      "Exit code 137 with Reason OOMKilled means the container exceeded its memory limit and was SIGKILLed.",
      "Memory climbs steadily and resets only on restart -- a sawtooth. That's a leak (or unbounded growth), not a spike.",
      "The heap profile points at 'thumbnail_cache' growing every request with no eviction. An unbounded in-process cache is a classic leak.",
      "Two levers: bound the cache (LRU + max size) or move it to Redis; a bigger limit only delays the OOM.",
    ],
    causeChoices: [
      { id: "c1", text: "CPU throttling causing crashes" },
      { id: "c2", text: "An in-process thumbnail cache grows unbounded (no eviction), exhausting the memory limit -> OOMKilled" },
      { id: "c3", text: "A traffic spike overloaded the workers" },
      { id: "c4", text: "The garbage collector is disabled" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Bound the cache with an LRU policy and a max size" },
      { id: "a2", text: "Move the cache to Redis with a TTL so worker memory stays flat" },
      { id: "a3", text: "Just raise the memory limit to 4Gi and move on" },
      { id: "a4", text: "Add a memory-usage alert well before the limit to catch regressions early" },
      { id: "a5", text: "Disable the garbage collector to save CPU" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** an in-process \`thumbnail_cache\` accumulated an entry per processed image and **never evicted**. Memory grew monotonically until it hit the 512Mi limit; the kernel OOMKilled the container (exit 137), which reset memory -- producing the ~40-minute sawtooth.

**Why a bigger limit is not the fix:** unbounded growth will exhaust *any* limit; raising it only lengthens the interval between OOMKills. The problem is the missing bound, not the ceiling.

**Correct response:** bound the cache (**LRU + max size**) or externalize it to **Redis with a TTL** so worker memory stays flat; add a **memory alert** at ~80% of limit to catch future regressions before users do.

**Prevention:** treat every in-process cache as needing an eviction policy from day one; load-test for memory growth, not just latency.`,
    relatedLessons: ["k8s-crashloop", "redis-deep", "k8s-resources-limits"],
  },

  {
    id: "redis-outage",
    title: "Redis outage takes down the API",
    severity: "SEV1",
    service: "profile-api",
    symptom:
      "The whole API is failing even though the database is healthy. Errors began the instant the Redis node became unreachable.",
    tags: ["redis", "cache", "outage", "resilience", "fallback"],
    dashboard: [
      { label: "Error rate", value: "71", unit: "%", status: "crit", spark: [0, 0, 70, 71, 71, 72, 71, 71] },
      { label: "Redis up", value: "DOWN", status: "crit", spark: [1, 1, 0, 0, 0, 0, 0, 0] },
      { label: "DB CPU", value: "22", unit: "%", status: "ok", spark: [20, 22, 21, 23, 22, 22, 21, 22] },
      { label: "p99 latency", value: "5.0", unit: "s", status: "crit", spark: [0.1, 0.1, 5, 5, 5, 5, 5, 5] },
      { label: "Cache hit rate", value: "0", unit: "%", status: "crit", spark: [92, 90, 0, 0, 0, 0, 0, 0] },
    ],
    logs: [
      "09:15 ERROR redis: connection refused (10.0.3.4:6379)",
      "09:15 ERROR get_profile: unhandled RedisConnectionError propagated to handler -> 500",
      "09:15 INFO  timeout waiting on redis GET after 5000ms (blocking the request)",
      "09:16 INFO  postgres healthy, 22% cpu, replicas ok",
    ],
    hints: [
      "The database is healthy but the API is down. What sits between the request and the DB and just went to zero hit rate?",
      "Redis is unreachable AND every request errors. That means Redis is on the critical path with no fallback.",
      "A cache should be an optimization, not a hard dependency. What should happen on a cache error -- fail the request, or fall back to the database?",
      "There are two problems: Redis has no HA, and the app treats a cache miss/error as fatal instead of falling through to the source of truth.",
    ],
    causeChoices: [
      { id: "c1", text: "The database is overloaded" },
      { id: "c2", text: "Redis is a hard dependency: on a Redis error the code throws instead of falling back to the DB, so the cache outage becomes a full outage" },
      { id: "c3", text: "A bad deploy broke the API" },
      { id: "c4", text: "DNS resolution failed for the database" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Wrap cache reads so a Redis error falls back to the database (degrade, don't fail)" },
      { id: "a2", text: "Set short Redis timeouts + a circuit breaker so a dead cache doesn't block requests for 5s" },
      { id: "a3", text: "Run Redis in HA (replica + Sentinel/Cluster) so a single node failure isn't total" },
      { id: "a4", text: "Delete the cache entirely and only ever use the database" },
      { id: "a5", text: "Restart every app pod and hope Redis comes back" },
    ],
    correctActionIds: ["a1", "a2", "a3"],
    postmortem: `**Root cause:** the profile API used Redis as a **hard dependency**. When the Redis node became unreachable, cache reads raised an exception that propagated to the handler as a 500, and a 5s blocking timeout made every request slow before failing. A component that was supposed to be an *optimization* became a *single point of failure*.

**The principle:** a cache should **degrade gracefully**. On a cache miss or error, fall through to the source of truth (the database was healthy the whole time). The DB would have taken more load, but the service would have stayed up.

**Correct response:** (1) make cache reads **fall back to the DB** on error; (2) use **short timeouts + a circuit breaker** so a dead cache fails fast instead of blocking; (3) run **Redis in HA** so a single node loss isn't catastrophic.

**Prevention:** chaos-test dependency failures; classify every dependency as hard vs soft and enforce soft-dependency fallbacks in code review.`,
    relatedLessons: ["redis-deep", "caching-dual", "load-balancing"],
  },

  {
    id: "kafka-consumer-lag",
    title: "Kafka consumer lag exploding",
    severity: "SEV2",
    service: "notifications-consumer",
    symptom:
      "Notifications are arriving hours late. Consumer lag is growing into the millions and never recovering, though producers are normal.",
    tags: ["kafka", "lag", "consumer", "throughput", "rebalance"],
    dashboard: [
      { label: "Consumer lag", value: "4.2M", status: "crit", spark: [10000, 200000, 800000, 1600000, 2600000, 3400000, 3900000, 4200000] },
      { label: "Produce rate", value: "12k", unit: "/s", status: "ok", spark: [12000, 11900, 12100, 12000, 11950, 12050, 12000, 12000] },
      { label: "Consume rate", value: "3k", unit: "/s", status: "warn", spark: [11000, 9000, 6000, 4000, 3500, 3200, 3000, 3000] },
      { label: "Partitions", value: "6", status: "ok", spark: [6, 6, 6, 6, 6, 6, 6, 6] },
      { label: "Consumers", value: "2", status: "warn", spark: [6, 6, 4, 3, 2, 2, 2, 2] },
      { label: "Rebalances/10m", value: "9", status: "crit", spark: [0, 1, 3, 5, 7, 8, 9, 9] },
    ],
    logs: [
      "08:00 INFO  processing event, avg 340ms per message (calls slow email API synchronously)",
      "08:12 WARN  consumer group rebalancing (member left: max.poll.interval exceeded)",
      "08:12 WARN  4 consumers -> 2 (others kicked for slow processing)",
      "08:20 WARN  lag growing: produce 12k/s, consume 3k/s",
    ],
    hints: [
      "Producers are steady at 12k/s but consumers only manage 3k/s. Consumption can't keep up -- lag is the symptom, not the cause.",
      "Each message takes ~340ms because it calls a slow email API synchronously. At 340ms/message a single consumer does ~3/s per thread.",
      "Slow processing exceeds max.poll.interval, so Kafka thinks the consumer died and rebalances -- kicking members and making things worse (a rebalance storm).",
      "Fixes: make per-message processing fast (async/batch the slow call), and/or add consumers up to the partition count (6). You can't scale consumers beyond partitions.",
    ],
    causeChoices: [
      { id: "c1", text: "Producers are sending too fast due to a bug" },
      { id: "c2", text: "Slow synchronous per-message processing caps throughput and triggers rebalances; consumers can't keep up with produce rate" },
      { id: "c3", text: "The topic was deleted" },
      { id: "c4", text: "Network partition to the brokers" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Make the slow email call async/batched so per-message time drops dramatically" },
      { id: "a2", text: "Scale consumers up toward the partition count (6) to parallelize" },
      { id: "a3", text: "Increase max.poll.interval / reduce max.poll.records so slow batches don't trigger rebalances" },
      { id: "a4", text: "Add 50 consumers to a 6-partition topic" },
      { id: "a5", text: "Delete the backlog by resetting offsets to latest, silently dropping millions of notifications" },
    ],
    correctActionIds: ["a1", "a2", "a3"],
    postmortem: `**Root cause:** each message triggered a **synchronous ~340ms call to a slow email API**, capping single-consumer throughput at roughly 3 messages/second per thread. Because processing a batch sometimes exceeded \`max.poll.interval.ms\`, Kafka considered consumers dead and **rebalanced repeatedly**, kicking members and dropping effective consumers from 6 to 2 -- a feedback loop that made consumption even slower while producers held steady at 12k/s. Lag grew without bound.

**Key facts:** ordering/parallelism in Kafka is bounded by **partition count** -- you can't scale consumers in a group beyond the number of partitions (6 here). And lag is a *symptom*; the cause was per-message latency plus rebalance thrash.

**Correct response:** (1) **speed up per-message processing** (batch/async the email call) so throughput rises; (2) **scale consumers up to 6** to use all partitions; (3) **tune max.poll settings** so legitimately slow batches don't trigger rebalances.

**Never** reset offsets to latest to "fix" lag -- that silently discards unprocessed events.`,
    relatedLessons: ["kafka-fundamentals", "background-jobs-dual", "consumer-groups-lag"],
  },

  {
    id: "disk-full",
    title: "Disk full on the primary node",
    severity: "SEV2",
    service: "api-node-1",
    symptom:
      "Writes are failing with 'No space left on device'. The service degraded gradually over days, then hard-failed this morning.",
    tags: ["disk", "linux", "logs", "df", "du", "storage"],
    dashboard: [
      { label: "Disk usage", value: "100", unit: "%", status: "crit", spark: [78, 82, 87, 91, 95, 98, 99, 100] },
      { label: "Inodes", value: "61", unit: "%", status: "ok", spark: [58, 59, 60, 60, 61, 61, 61, 61] },
      { label: "Write errors/s", value: "240", status: "crit", spark: [0, 0, 0, 2, 20, 90, 200, 240] },
      { label: "CPU", value: "30", unit: "%", status: "ok", spark: [28, 30, 29, 31, 30, 30, 29, 30] },
    ],
    logs: [
      "06:10 ERROR write failed: [Errno 28] No space left on device",
      "06:10 ERROR could not rotate log: disk full",
      "06:11 ERROR postgres: could not extend file: No space left on device",
    ],
    terminal: [
      { cmd: "df -h /", output: "Filesystem  Size  Used Avail Use% Mounted on\n/dev/nvme0n1  100G  100G   0G  100% /" },
      { cmd: "du -xh / | sort -rh | head -5", output: "78G  /var/log/app\n61G  /var/log/app/debug.log\n12G  /var/lib/postgresql\n4G   /usr\n2G   /home" },
      { cmd: "ls -lh /var/log/app/debug.log", output: "-rw-r--r-- 1 app app 61G Jan 12 06:10 /var/log/app/debug.log" },
    ],
    hints: [
      "df shows the filesystem is 100% full but inodes are fine -- so it's a few huge files, not millions of tiny ones.",
      "du points at /var/log/app -- 78G of logs, with a single debug.log at 61G.",
      "A debug log was left at DEBUG level in production with no rotation, growing until it filled the disk and blocked all writes (including Postgres).",
      "Immediate: reclaim space safely (truncate/rotate the log, don't just rm an open file). Durable: set log level + rotation + a disk-usage alert.",
    ],
    causeChoices: [
      { id: "c1", text: "The database grew too large" },
      { id: "c2", text: "An unrotated DEBUG-level application log (debug.log) grew to 61G and filled the disk, failing all writes including Postgres" },
      { id: "c3", text: "Inode exhaustion from many small files" },
      { id: "c4", text: "A memory leak" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Truncate/rotate the runaway log to reclaim space immediately (safely, since the process holds the file open)" },
      { id: "a2", text: "Set the app log level back to INFO/WARN in production" },
      { id: "a3", text: "Configure log rotation (logrotate / size-based) with retention" },
      { id: "a4", text: "Add a disk-usage alert at ~80% so this is caught days earlier" },
      { id: "a5", text: "Delete the Postgres data directory to free space" },
    ],
    correctActionIds: ["a1", "a2", "a3", "a4"],
    postmortem: `**Root cause:** the application was accidentally shipped with **DEBUG logging enabled and no log rotation**. \`/var/log/app/debug.log\` grew to 61G over several days until the root filesystem hit 100%. Once full, *every* write failed with \`ENOSPC\` -- including Postgres trying to extend its files -- turning a slow leak into a hard outage.

**Reading the signals:** \`df -h\` showed 100% space but healthy **inodes**, so the culprit was a small number of huge files, not many tiny ones. \`du -xh | sort -rh\` pinpointed the single 61G log in seconds. This df->du workflow is the standard disk-full runbook.

**Correct response:** (1) **reclaim space safely** -- truncate/rotate the log (\`: > debug.log\` or logrotate), *not* \`rm\` on a file the process holds open (space isn't freed until the fd closes); (2) **lower the log level**; (3) **configure rotation + retention**; (4) **alert at 80%** disk so it's caught days before impact.

**Prevention:** production log level as config with a safe default, rotation on by default, and disk-usage SLO alerts.`,
    relatedLessons: ["linux-observability-tools", "linux-filesystem", "three-pillars"],
  },

  {
    id: "api-502-gateway",
    title: "502 Bad Gateway from the load balancer",
    severity: "SEV1",
    service: "web-gateway",
    symptom:
      "Users get intermittent 502 Bad Gateway. The LB is up and returning quickly, but a growing share of requests never get a valid response from the backends.",
    tags: ["502", "load-balancer", "upstream", "timeout", "health-check", "keepalive"],
    dashboard: [
      { label: "502 rate", value: "46", unit: "%", status: "crit", spark: [0, 1, 8, 20, 33, 41, 45, 46] },
      { label: "Healthy backends", value: "2", unit: "/8", status: "crit", spark: [8, 8, 7, 5, 4, 3, 2, 2] },
      { label: "Backend p99", value: "31", unit: "s", status: "crit", spark: [0.3, 0.4, 5, 12, 22, 28, 30, 31] },
      { label: "LB p99 (to client)", value: "60", unit: "ms", status: "ok", spark: [55, 58, 60, 59, 61, 60, 58, 60] },
      { label: "Backend CPU", value: "97", unit: "%", status: "crit", spark: [60, 72, 84, 91, 95, 96, 97, 97] },
    ],
    logs: [
      "11:20 ERROR nginx: upstream timed out (110: Connection timed out) while reading response header from upstream",
      "11:20 ERROR nginx: 502 Bad Gateway, upstream: \"http://10.0.4.11:8080/orders\"",
      "11:21 WARN  lb: marking 10.0.4.12:8080 as unhealthy (health check timeout)",
      "11:21 ERROR nginx: no live upstreams while connecting to upstream",
      "11:22 WARN  backend: request queue depth 812, worker threads exhausted",
    ],
    terminal: [
      { cmd: "curl -sS -o /dev/null -w '%{http_code}\\n' http://10.0.4.11:8080/orders", output: "502" },
      { cmd: "kubectl get pods -l app=orders -o wide | head", output: "NAME             READY  STATUS    RESTARTS  AGE\norders-7f9-2ab   1/1    Running   0         3h\norders-7f9-9cd   1/1    Running   0         3h\n# pods are Running but not serving within the LB timeout" },
      { cmd: "kubectl exec orders-7f9-2ab -- ss -s", output: "Total: 4102\nTCP:   3990 (estab 3901, closed 40, timewait 12)\n# connection count far above the worker pool (200 threads)" },
    ],
    hints: [
      "A 502 means the LB reached the backend but the backend gave no valid response in time. The LB is the messenger, not the culprit.",
      "The LB's own latency to the client is fine, but backend p99 is 31s and backend CPU is pinned at 97%. The backends are overwhelmed, not the LB.",
      "As backends slow past the health-check timeout, the LB marks them unhealthy and removes them -- concentrating traffic on the survivors, which then also fall over. That is a cascading capacity failure.",
      "You need to both relieve the survivors (shed load / add capacity) and stop the death spiral (right-size timeouts and health checks, add connection limits).",
    ],
    causeChoices: [
      { id: "c1", text: "The load balancer software crashed" },
      { id: "c2", text: "Backends are saturated (CPU 97%, deep request queues); they exceed the LB upstream/health-check timeout, get ejected, and remaining backends cascade into a full 502 storm" },
      { id: "c3", text: "DNS for the LB failed to resolve" },
      { id: "c4", text: "A bad TLS certificate on the client side" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Shed load at the edge (rate limit / return 503 with retry-after) to let backends recover" },
      { id: "a2", text: "Scale out backend replicas to add real capacity" },
      { id: "a3", text: "Restart the load balancer to clear the 502s" },
      { id: "a4", text: "Tune LB upstream + health-check timeouts and add per-backend max connection limits so a slow node degrades instead of being ejected" },
      { id: "a5", text: "Add a circuit breaker / concurrency limit at the backend so overload sheds gracefully instead of queueing to death" },
    ],
    correctActionIds: ["a1", "a2", "a4", "a5"],
    postmortem: `**Root cause:** the backends became saturated (CPU pinned at 97%, request queues in the hundreds). Responses started taking longer than the LB's upstream read timeout, so the LB returned **502 Bad Gateway** -- it connected to the backend but never got a valid response in time. Worse, health checks also timed out, so the LB **ejected** slow-but-alive backends, concentrating traffic on the remaining nodes and driving them over the edge too: a **cascading capacity failure**.

**Why the LB looked innocent:** the LB's latency to clients was fine. A 502 is almost always an *upstream* problem -- the LB is reporting that the backend failed it, not that the LB failed. Read 502 as "backend unhealthy/slow," not "LB broken."

**Correct response:** (1) **shed load** at the edge (rate limit / 503 + retry-after) to give backends breathing room; (2) **add real capacity** by scaling replicas; (3) **tune timeouts and health checks** and add **per-backend connection limits** so a slow node degrades gracefully instead of being ejected; (4) add a **concurrency limit / circuit breaker** so overload sheds cleanly rather than queueing to death.

**Prevention:** load-test to find the saturation point, set health checks that distinguish "slow" from "dead," and always keep headroom so losing a node doesn't cascade.`,
    relatedLessons: ["load-balancing", "http-fundamentals", "tcp", "slo-sli-error-budgets"],
  },

  {
    id: "cpu-spike",
    title: "Runaway CPU pinning every core",
    severity: "SEV2",
    service: "search-api",
    symptom:
      "CPU is pinned at 100% across all cores. Latency has exploded and throughput collapsed, but request volume is normal and there was no deploy.",
    tags: ["cpu", "regex", "hot-loop", "backtracking", "profiling", "redos"],
    dashboard: [
      { label: "CPU", value: "100", unit: "%", status: "crit", spark: [45, 48, 62, 88, 99, 100, 100, 100] },
      { label: "p99 latency", value: "14", unit: "s", status: "crit", spark: [0.2, 0.3, 1.5, 5, 9, 12, 13, 14] },
      { label: "Throughput", value: "90", unit: "req/s", status: "crit", spark: [1200, 1100, 800, 400, 200, 120, 95, 90] },
      { label: "Requests/s (in)", value: "1.2k", status: "ok", spark: [1200, 1210, 1190, 1205, 1198, 1202, 1200, 1199] },
      { label: "Memory", value: "48", unit: "%", status: "ok", spark: [46, 47, 48, 47, 49, 48, 47, 48] },
    ],
    logs: [
      "13:05 INFO  new search filter deployed to config (regex validation for 'title')",
      "13:31 WARN  request /search took 12100ms (thread pinned)",
      "13:31 WARN  event loop / worker blocked for 11.8s",
      "13:32 INFO  offending input title=\"aaaaaaaaaaaaaaaaaaaaaaaa!\"",
    ],
    terminal: [
      { cmd: "top -H -p $(pgrep -f search-api) | head -8", output: "  PID USER  %CPU  COMMAND\n 4412 app   99.7  search-api {worker-3}\n 4410 app   99.5  search-api {worker-1}\n 4411 app   99.6  search-api {worker-2}\n# all worker threads pegged" },
      { cmd: "py-spy dump --pid 4412", output: "Thread 4412 (active):\n  _validate_title (validators.py:52)\n  re.match (re/__init__.py)\n  # stuck inside a single regex evaluation" },
      { cmd: "grep -n 'compile' validators.py", output: "51: TITLE_RE = re.compile(r'^(a+)+$')  # catastrophic backtracking" },
    ],
    hints: [
      "CPU is at 100% but incoming request rate is normal. The work per request suddenly got enormous -- something is burning CPU inside the request, not more requests arriving.",
      "A thread profiler (py-spy/perf) is the fastest way to see WHAT the CPU is doing. Point it at a pinned thread.",
      "The profile shows threads stuck inside a single regex match. The pattern (a+)+ against a long 'aaaa...' input is classic catastrophic backtracking (ReDoS) -- exponential time on one input.",
      "Fix the pattern (or use a linear-time engine / input length cap), and add a per-request CPU/time guard so no single request can pin a worker.",
    ],
    causeChoices: [
      { id: "c1", text: "A traffic spike overwhelmed the servers" },
      { id: "c2", text: "A vulnerable regex ((a+)+) causes catastrophic backtracking (ReDoS) on certain inputs, pinning worker threads at 100% CPU for many seconds each" },
      { id: "c3", text: "A memory leak triggered heavy garbage collection" },
      { id: "c4", text: "The database is slow and blocking threads" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Replace the vulnerable regex with a safe/linear pattern (or a non-backtracking engine like RE2)" },
      { id: "a2", text: "Cap input length and add a validation timeout so a single input can't run for seconds" },
      { id: "a3", text: "Just add more CPU cores / bigger instances" },
      { id: "a4", text: "Add a per-request CPU/time budget so no request can pin a worker indefinitely" },
      { id: "a5", text: "Block the specific malicious IP and consider it resolved" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a config change added the regex \`^(a+)+$\` to validate the \`title\` field. That pattern has **catastrophic backtracking**: on an input like \`"aaaa...!"\` the engine explores exponentially many ways to split the repeated group, taking many seconds of pure CPU for a single input. This is a **ReDoS** -- one crafted (or even accidental) input pins a worker thread at 100% CPU, and enough of them peg every core while incoming volume stays flat.

**Reading the signals:** CPU at 100% with *normal* request rate and *flat* memory pointed away from "more traffic" and away from "memory/GC." A **thread profiler** (py-spy/perf) is the decisive tool -- it showed the threads stuck inside a single \`re.match\`, and the pattern was the smoking gun.

**Correct response:** (1) **fix the pattern** -- rewrite it to be linear or run it on a non-backtracking engine (RE2); (2) **cap input length and add a validation timeout** so no single input can run for seconds; (3) add a **per-request time/CPU budget** so one pathological request can never monopolize a worker.

**Prevention:** lint/scan regexes for backtracking risk, never build patterns from untrusted input, and treat any user-supplied string hitting a regex as a potential ReDoS vector.`,
    relatedLessons: ["linux-observability-tools", "http-fundamentals", "three-pillars"],
  },

  {
    id: "dns-failure",
    title: "DNS resolution failure breaks a dependency",
    severity: "SEV1",
    service: "payments-api",
    symptom:
      "Payments are failing. The app can't reach the payment provider -- but the provider's status page is green and the network is otherwise fine.",
    tags: ["dns", "resolution", "resolver", "ttl", "nxdomain", "dependency"],
    dashboard: [
      { label: "Payment success", value: "3", unit: "%", status: "crit", spark: [99, 99, 40, 12, 6, 4, 3, 3] },
      { label: "DNS errors/s", value: "410", status: "crit", spark: [0, 0, 60, 180, 300, 380, 405, 410] },
      { label: "Resolver latency", value: "5.0", unit: "s", status: "crit", spark: [0.01, 0.01, 1.2, 3, 5, 5, 5, 5] },
      { label: "Provider status", value: "UP", status: "ok", spark: [1, 1, 1, 1, 1, 1, 1, 1] },
      { label: "App CPU", value: "24", unit: "%", status: "ok", spark: [22, 24, 23, 25, 24, 24, 23, 24] },
    ],
    logs: [
      "15:40 ERROR payments: getaddrinfo failed for api.paymentprovider.com (EAI_AGAIN: temporary failure in name resolution)",
      "15:40 ERROR connect ENOTFOUND api.paymentprovider.com",
      "15:41 WARN  dns lookup timed out after 5000ms",
      "15:41 INFO  reachability: ping 8.8.8.8 OK (network up), curl https://1.1.1.1 OK",
    ],
    terminal: [
      { cmd: "dig api.paymentprovider.com +short", output: ";; connection timed out; no servers could be reached" },
      { cmd: "cat /etc/resolv.conf", output: "nameserver 10.0.0.2\n# internal resolver -- is it alive?" },
      { cmd: "dig @1.1.1.1 api.paymentprovider.com +short", output: "104.18.32.14\n104.18.33.14\n# public resolver answers fine -> our resolver is the problem" },
      { cmd: "nc -vz -u 10.0.0.2 53", output: "nc: connect to 10.0.0.2 port 53 (udp) timed out" },
    ],
    hints: [
      "The provider is up and general internet reachability works (ping/curl to IPs succeed). So it isn't the provider or the network path -- what step happens before you can connect by hostname?",
      "The errors are getaddrinfo / EAI_AGAIN / ENOTFOUND -- those are name-resolution failures, not connection or TLS failures.",
      "Querying the configured internal resolver (10.0.0.2) times out, but a public resolver (1.1.1.1) resolves the name instantly. The dependency is fine; your resolver is dead.",
      "Immediate: restore resolution (failover to a healthy resolver / restart the resolver). Durable: redundant resolvers, sane caching/TTL handling, and don't let a single resolver be a SPOF.",
    ],
    causeChoices: [
      { id: "c1", text: "The payment provider is down" },
      { id: "c2", text: "The internal DNS resolver (10.0.0.2) is unreachable, so hostname lookups fail (EAI_AGAIN/ENOTFOUND) even though the network and the provider are healthy" },
      { id: "c3", text: "TLS certificate expired on the provider" },
      { id: "c4", text: "The database connection pool is exhausted" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Fail over to a healthy/secondary resolver (update resolv.conf) or restart the dead resolver to restore lookups" },
      { id: "a2", text: "Configure multiple redundant nameservers so a single resolver failure isn't total" },
      { id: "a3", text: "Hardcode the provider's current IPs in /etc/hosts permanently and skip DNS forever" },
      { id: "a4", text: "Run a local caching resolver (with sane TTLs) on each host to survive upstream resolver blips" },
      { id: "a5", text: "Restart the payment provider integration and hope it reconnects" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** the internal DNS resolver (\`10.0.0.2\`) became unreachable. Every outbound call that resolves a hostname -- including \`api.paymentprovider.com\` -- failed at the **name-resolution** step with \`EAI_AGAIN\`/\`ENOTFOUND\`, so payments couldn't even open a connection. The provider was healthy the whole time; DNS was the broken link.

**Reading the signals:** general reachability to raw IPs worked (\`ping 8.8.8.8\`, \`curl 1.1.1.1\`), so the network path was fine. The errors were specifically *resolution* errors. The decisive test: \`dig @1.1.1.1\` resolved the name instantly while the configured resolver timed out -- proving the name is valid and the resolver is the fault.

**Correct response:** (1) **restore resolution** by failing over to a healthy resolver (or restarting the dead one); (2) configure **multiple redundant nameservers** so one dead resolver isn't total; (3) run a **local caching resolver** with sane TTLs on each host so brief upstream resolver blips don't take down every dependency at once.

**Why NOT hardcode /etc/hosts permanently:** provider IPs change; static entries silently break later and bypass health-based routing. Use it only as a momentary bridge, never as the fix.

**Prevention:** treat DNS as a tier-0 dependency -- redundant resolvers, monitoring on resolver health, and local caching to smooth transient failures.`,
    relatedLessons: ["dns", "tcp", "load-balancing"],
  },

  {
    id: "k8s-pod-crash",
    title: "Pod never becomes Ready (readiness + ImagePullBackOff)",
    severity: "SEV2",
    service: "coupon-service",
    symptom:
      "A new rollout is stuck. The Deployment shows pods that never reach Ready, so the new version gets no traffic and the rollout hangs indefinitely.",
    tags: ["kubernetes", "readiness", "imagepullbackoff", "rollout", "probe", "pending"],
    dashboard: [
      { label: "Ready replicas", value: "0", unit: "/4", status: "crit", spark: [4, 3, 2, 1, 0, 0, 0, 0] },
      { label: "Restarts (10m)", value: "0", status: "ok", spark: [0, 0, 0, 0, 0, 0, 0, 0] },
      { label: "Readiness pass %", value: "0", unit: "%", status: "crit", spark: [100, 80, 40, 10, 0, 0, 0, 0] },
      { label: "Rollout age", value: "22", unit: "min", status: "warn", spark: [1, 4, 8, 12, 16, 20, 22, 22] },
      { label: "Serving version", value: "old", status: "warn", spark: [1, 1, 1, 1, 1, 1, 1, 1] },
    ],
    logs: [
      "16:00 INFO  deploy: rolling out coupon-service v2.4.0 (maxUnavailable=25%)",
      "16:01 WARN  Failed to pull image \"registry.internal/coupon:v2.4.0\": ImagePullBackOff (manifest unknown)",
      "16:03 WARN  Readiness probe failed: HTTP GET /ready returned 503 (dependency check: config not loaded)",
      "16:05 INFO  Deployment coupon-service: 0/4 updated replicas available; rollout paused by maxUnavailable",
    ],
    terminal: [
      { cmd: "kubectl get pods -l app=coupon", output: "NAME              READY  STATUS             RESTARTS  AGE\ncoupon-v240-a1x   0/1    ImagePullBackOff   0         21m\ncoupon-v240-b2y   0/1    Running            0         21m  # running but not ready\ncoupon-v240-c3z   0/1    ImagePullBackOff   0         21m" },
      { cmd: "kubectl describe pod coupon-v240-a1x | grep -A3 Events", output: "Events:\n  Warning  Failed   kubelet  Failed to pull image \"registry.internal/coupon:v2.4.0\": manifest unknown\n  Warning  Failed   kubelet  Error: ImagePullBackOff" },
      { cmd: "kubectl exec coupon-v240-b2y -- curl -s localhost:8080/ready", output: "{\"status\":\"not_ready\",\"reason\":\"config map coupon-config not mounted\"}" },
    ],
    hints: [
      "Notice the pods are NOT crashlooping (0 restarts) -- this is different from an OOM/crash. They simply never become Ready, so the Service sends them no traffic.",
      "Two distinct failures are visible: some pods are ImagePullBackOff (can't even start the container) and one is Running but failing its readiness probe.",
      "ImagePullBackOff 'manifest unknown' means the image tag v2.4.0 doesn't exist in the registry (bad/absent tag). The readiness 503 means the app started but a dependency (its ConfigMap) isn't present, so /ready correctly reports not-ready.",
      "Fix the real causes: push/pin a valid image tag, and provide the missing config so /ready passes. Because old pods keep serving, roll back the rollout to stop the hang while you fix it.",
    ],
    causeChoices: [
      { id: "c1", text: "The pods are OOMKilled and crashlooping" },
      { id: "c2", text: "The rollout can't produce Ready pods: the image tag v2.4.0 is missing from the registry (ImagePullBackOff) and pods that do start fail readiness because a required ConfigMap isn't mounted" },
      { id: "c3", text: "The cluster is out of CPU/memory to schedule pods" },
      { id: "c4", text: "A network partition to the API server" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Roll back the Deployment to the previous working revision so the rollout stops hanging (old pods still serve)" },
      { id: "a2", text: "Push/pin a valid, existing image tag (fix the bad v2.4.0 reference) in the registry" },
      { id: "a3", text: "Delete the readiness probe so pods report Ready immediately" },
      { id: "a4", text: "Add the missing ConfigMap/mount so the app's /ready dependency check passes" },
      { id: "a5", text: "Add a canary/gate that fails the rollout fast on ImagePull or readiness errors instead of hanging for 20+ min" },
    ],
    correctActionIds: ["a1", "a2", "a4", "a5"],
    postmortem: `**Root cause:** the v2.4.0 rollout could never produce **Ready** pods, for two independent reasons. First, some pods hit **ImagePullBackOff** with "manifest unknown" -- the image tag \`v2.4.0\` did not exist in the registry (the build/push never completed or was tagged wrong). Second, the pods that did start failed their **readiness probe** (503) because a required **ConfigMap** wasn't mounted, so \`/ready\` correctly reported not-ready. Because the pods were never Ready, the Service routed no traffic to them and the Deployment stalled under \`maxUnavailable\`.

**Why this is NOT a crashloop/OOM:** restart count is **zero**. The containers weren't dying -- they either never pulled, or ran but honestly reported themselves not-ready. The readiness probe did its job: it kept a mis-configured pod out of rotation instead of serving errors.

**Correct response:** (1) **roll back** to the previous revision so the stuck rollout stops (the old, healthy pods keep serving the whole time); (2) **fix the image** -- push/pin a valid existing tag; (3) **supply the missing ConfigMap** so the readiness dependency check passes; (4) add a **rollout gate/canary** that fails fast on ImagePull/readiness errors instead of hanging for 20+ minutes.

**Prevention:** verify the image exists before rollout (immutable, digest-pinned tags), keep readiness probes honest (they should reflect real dependency health), and set \`progressDeadlineSeconds\` so a doomed rollout auto-fails quickly.`,
    relatedLessons: ["k8s-architecture", "k8s-crashloop", "deployment-strategies"],
  },

  {
    id: "k8s-node-failure",
    title: "Node goes NotReady, pods reschedule under pressure",
    severity: "SEV2",
    service: "cluster / orders-api",
    symptom:
      "A worker node dropped to NotReady. Its pods are being evicted and rescheduled, but the cluster is near capacity so some pods are stuck Pending and latency is climbing.",
    tags: ["kubernetes", "node", "notready", "eviction", "scheduling", "capacity", "pending"],
    dashboard: [
      { label: "Nodes Ready", value: "5", unit: "/6", status: "crit", spark: [6, 6, 6, 5, 5, 5, 5, 5] },
      { label: "Pending pods", value: "7", status: "crit", spark: [0, 0, 2, 5, 7, 7, 6, 7] },
      { label: "Cluster CPU alloc", value: "94", unit: "%", status: "crit", spark: [72, 74, 78, 85, 90, 93, 94, 94] },
      { label: "p99 latency", value: "2.4", unit: "s", status: "warn", spark: [0.3, 0.4, 0.6, 1.1, 1.8, 2.2, 2.4, 2.4] },
      { label: "Evicted pods", value: "9", status: "warn", spark: [0, 0, 3, 6, 9, 9, 9, 9] },
    ],
    logs: [
      "02:10 WARN  node ip-10-0-2-31 status NotReady (Kubelet stopped posting node status)",
      "02:15 INFO  node-controller: node ip-10-0-2-31 NotReady > 5m, tainting node.kubernetes.io/unreachable:NoExecute",
      "02:15 INFO  evicting pods from ip-10-0-2-31 (9 pods)",
      "02:16 WARN  0/5 nodes are available: 5 Insufficient cpu -- pod orders-api-7 unschedulable (Pending)",
    ],
    terminal: [
      { cmd: "kubectl get nodes", output: "NAME             STATUS     ROLES   AGE   VERSION\nip-10-0-2-11     Ready      worker  40d   v1.29\nip-10-0-2-31     NotReady   worker  40d   v1.29\nip-10-0-2-42     Ready      worker  40d   v1.29" },
      { cmd: "kubectl describe node ip-10-0-2-31 | grep -A2 Conditions", output: "Conditions:\n  Type             Status   Reason\n  Ready            Unknown  NodeStatusUnknown (kubelet not posting)" },
      { cmd: "kubectl get pods --field-selector=status.phase=Pending | head", output: "NAME            READY  STATUS    AGE\norders-api-7    0/1    Pending   3m\norders-api-9    0/1    Pending   3m\n# Insufficient cpu: no node has room" },
    ],
    hints: [
      "One node is NotReady -- the kubelet stopped posting status. Kubernetes waits, then taints the node and evicts its pods so they can be rescheduled elsewhere. That part is working as designed.",
      "The real pain is capacity: cluster CPU allocation was already ~94%. When a whole node's worth of pods needs a new home, there isn't room, so pods sit Pending.",
      "This is why you keep headroom / N+1 capacity: losing one node should be absorbable. Running clusters near 100% means any node loss becomes an outage.",
      "Immediate: add capacity (scale the node group / cluster-autoscaler) so Pending pods schedule; also confirm PodDisruptionBudgets and requests are set so eviction and scheduling behave.",
    ],
    causeChoices: [
      { id: "c1", text: "A bad application deploy is crashing pods" },
      { id: "c2", text: "A node went NotReady and its pods were evicted, but the cluster was already near capacity (~94% CPU), so rescheduled pods can't fit and sit Pending -- a capacity/headroom failure" },
      { id: "c3", text: "The container image is missing from the registry" },
      { id: "c4", text: "DNS resolution failed inside the cluster" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Add capacity (scale the node group / enable cluster-autoscaler) so evicted pods have somewhere to schedule" },
      { id: "a2", text: "Cordon and investigate the NotReady node; replace it if the kubelet/host is truly dead" },
      { id: "a3", text: "Force-delete the Pending pods to make the alert go away" },
      { id: "a4", text: "Set/right-size resource requests + PodDisruptionBudgets and run with N+1 node headroom so a single node loss is absorbable" },
      { id: "a5", text: "Disable the node-eviction controller so pods never move" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** worker node \`ip-10-0-2-31\` went **NotReady** -- its kubelet stopped posting status (host/kubelet failure). Kubernetes behaved correctly: after the grace period it tainted the node \`unreachable:NoExecute\` and **evicted** the node's 9 pods to reschedule them. The actual incident was **capacity**: the cluster was already running at ~94% CPU allocation, so a full node's worth of pods had nowhere to land and several sat **Pending** ("Insufficient cpu"), while surviving nodes absorbed extra load and latency climbed.

**The lesson -- headroom:** node failure is expected and routine. What turns it into an outage is running with no spare capacity. With **N+1 headroom**, losing one node is absorbed silently; at 94% utilization, losing one node guarantees Pending pods.

**Correct response:** (1) **add capacity** (scale the node group / cluster-autoscaler) so evicted pods schedule; (2) **cordon and investigate** the NotReady node, replacing it if the host/kubelet is dead; (3) ensure **resource requests + PodDisruptionBudgets** are set and run with **N+1 headroom** so a single node loss is absorbable.

**Prevention:** capacity planning with explicit headroom, cluster-autoscaler with buffer, correct pod requests (so the scheduler packs realistically), and PDBs so voluntary disruptions never take out a whole service.`,
    relatedLessons: ["k8s-architecture", "k8s-resources-limits", "slo-sli-error-budgets"],
  },

  {
    id: "network-latency",
    title: "Cross-AZ latency with retries amplifying load",
    severity: "SEV2",
    service: "inventory-api",
    symptom:
      "Latency jumped across a set of services. No single component is broken, but tail latency is high and load on downstreams is mysteriously inflated.",
    tags: ["network", "latency", "cross-az", "retries", "retry-storm", "timeout"],
    dashboard: [
      { label: "Cross-AZ RTT", value: "58", unit: "ms", status: "crit", spark: [1.2, 1.3, 8, 22, 40, 52, 57, 58] },
      { label: "p99 latency", value: "4.1", unit: "s", status: "crit", spark: [0.2, 0.3, 0.8, 1.6, 2.8, 3.6, 4.0, 4.1] },
      { label: "Downstream QPS", value: "3.3x", status: "crit", spark: [1, 1, 1.4, 2.0, 2.6, 3.0, 3.2, 3.3] },
      { label: "Retry rate", value: "61", unit: "%", status: "crit", spark: [2, 3, 12, 28, 44, 55, 60, 61] },
      { label: "Error rate", value: "9", unit: "%", status: "warn", spark: [0.2, 0.3, 1, 3, 6, 8, 9, 9] },
    ],
    logs: [
      "04:20 WARN  call to inventory-db (us-east-1b) rtt 55ms (baseline 1.2ms)",
      "04:21 WARN  request timed out at 800ms, retrying (attempt 2/3)",
      "04:21 WARN  request timed out at 800ms, retrying (attempt 3/3)",
      "04:22 WARN  downstream QPS 3.3x baseline while inbound QPS flat -- retries amplifying load",
    ],
    terminal: [
      { cmd: "ping -c 3 inventory-db.us-east-1b.internal", output: "64 bytes: time=57.2 ms\n64 bytes: time=58.9 ms\n64 bytes: time=56.4 ms\n# baseline is ~1ms same-AZ" },
      { cmd: "mtr --report -c 5 inventory-db.us-east-1b.internal | tail -4", output: "  5. az-interlink-gw   0.0%   40.1ms\n  6. az-interlink-gw   0.0%   55.8ms  <- latency injected here (cross-AZ link degraded)\n  7. inventory-db       0.0%   57.2ms" },
      { cmd: "grep -c 'retrying' app.log", output: "48211  # huge retry volume" },
    ],
    hints: [
      "Inbound request rate is flat, but downstream QPS is 3.3x baseline. Where are the extra requests coming from if not from users?",
      "Cross-AZ RTT went from ~1ms to ~58ms. Requests now exceed the 800ms timeout, so the client retries -- and each retry is another request on an already-slow link.",
      "That is a retry storm: a latency blip makes clients time out and retry, the retries pile more load on the slow dependency, which gets slower, causing more timeouts. It is self-amplifying.",
      "Two things must change: fix/route around the degraded cross-AZ link, and make retries safe (budgets, backoff+jitter, circuit breaker) so a latency blip can't amplify into an overload.",
    ],
    causeChoices: [
      { id: "c1", text: "A memory leak is slowing the servers" },
      { id: "c2", text: "A degraded cross-AZ network link raised RTT past the client timeout; aggressive retries then amplified load (retry storm), inflating downstream QPS and making latency worse" },
      { id: "c3", text: "The database ran out of connections" },
      { id: "c4", text: "A bad deploy introduced slow code" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Route traffic away from the degraded AZ / pin services to same-AZ dependencies to cut RTT" },
      { id: "a2", text: "Add a retry budget + exponential backoff with jitter and a circuit breaker so retries can't amplify load" },
      { id: "a3", text: "Increase the client timeout to 30s and keep retrying aggressively" },
      { id: "a4", text: "Right-size timeouts to the real dependency SLO and cap retries (e.g. 1 retry, only on idempotent calls)" },
      { id: "a5", text: "Restart all app servers repeatedly until latency drops" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a **cross-AZ network link degraded**, raising RTT to \`inventory-db\` from ~1ms (same-AZ) to ~58ms. Requests began exceeding the client's 800ms timeout, so clients **retried** -- up to 3 attempts each. Because inbound user traffic was flat but each request now generated multiple downstream calls, **downstream QPS rose to 3.3x** baseline. The extra load made the already-slow dependency slower, causing more timeouts and more retries: a self-amplifying **retry storm**.

**Reading the signals:** the tell was flat inbound QPS but inflated downstream QPS and a 60%+ retry rate. \`mtr\` localized the added latency to the AZ interlink hop -- no single service was "broken," the *network between* them was degraded, and the retry policy turned a latency blip into an overload.

**Correct response:** (1) **route around the degraded AZ** (shift traffic, prefer same-AZ dependencies) to cut RTT; (2) make retries safe -- **retry budget + exponential backoff with jitter + circuit breaker** so retries can't multiply load; (3) **right-size timeouts** to the dependency's real SLO and **cap retries** (typically 1, only for idempotent operations).

**Prevention:** design retries defensively from the start (budgets, jitter, breakers), be deliberate about cross-AZ calls (they add latency and cost), and alert on retry rate as a leading indicator of amplification.`,
    relatedLessons: ["tcp", "load-balancing", "slo-sli-error-budgets", "cap-theorem"],
  },

  {
    id: "traffic-spike",
    title: "Flash traffic spike outruns autoscaling",
    severity: "SEV1",
    service: "storefront-api",
    symptom:
      "A flash sale drove a 12x traffic surge in under a minute. Autoscaling is spinning up capacity but can't catch up in time, and users are seeing errors and timeouts.",
    tags: ["traffic-spike", "autoscaling", "load-shedding", "rate-limit", "thundering-herd", "flash-sale"],
    dashboard: [
      { label: "Requests/s", value: "58k", status: "crit", spark: [4800, 5000, 12000, 30000, 46000, 54000, 57000, 58000] },
      { label: "Error rate", value: "38", unit: "%", status: "crit", spark: [0.2, 0.3, 5, 18, 30, 36, 38, 38] },
      { label: "Ready replicas", value: "9", unit: "/40", status: "warn", spark: [8, 8, 8, 9, 9, 9, 9, 9] },
      { label: "Autoscale target", value: "40", unit: "replicas", status: "warn", spark: [8, 8, 20, 40, 40, 40, 40, 40] },
      { label: "p99 latency", value: "8.7", unit: "s", status: "crit", spark: [0.2, 0.3, 2, 5, 7, 8.2, 8.6, 8.7] },
    ],
    logs: [
      "10:00 INFO  marketing: flash sale started",
      "10:00 WARN  requests/s 4.8k -> 58k in 55s (12x)",
      "10:00 INFO  HPA scaling storefront-api 8 -> 40 (target CPU exceeded)",
      "10:01 WARN  pods 8 ready, 32 pending/starting (image pull + warmup ~90s each)",
      "10:01 ERROR upstream overloaded: shedding requests (503) -- no rate limit configured until now",
    ],
    terminal: [
      { cmd: "kubectl get hpa storefront-api", output: "NAME             REFERENCE   TARGETS   MINPODS  MAXPODS  REPLICAS\nstorefront-api   Deployment  310%/60%  8        40       40" },
      { cmd: "kubectl get pods -l app=storefront | grep -c Running", output: "9  # only 9 of 40 serving; the rest still starting" },
      { cmd: "kubectl describe pod storefront-xyz | grep -A1 Events | tail", output: "Normal  Pulling  kubelet  Pulling image (cold start ~70s)\nNormal  Started  kubelet  Started container 88s after schedule" },
    ],
    hints: [
      "This isn't a bug -- the system is simply receiving far more load than it has capacity for, right now. Autoscaling reacted, but scaling takes time (pod startup ~90s) while the spike arrived in seconds.",
      "During the gap between 'spike arrives' and 'capacity is ready', something has to give. Serving everything slowly and failing means everyone gets a bad experience.",
      "The tool for the gap is graceful load shedding: protect the capacity you have by rejecting or queuing excess quickly (429/503 with retry-after) so accepted requests succeed, rather than letting overload melt everything.",
      "Longer term: pre-scale for known events, keep warm capacity, speed up pod startup, and put a rate limiter in front so a surge can't outrun your ability to protect the backends.",
    ],
    causeChoices: [
      { id: "c1", text: "A memory leak caused the errors" },
      { id: "c2", text: "A sudden 12x flash-traffic spike exceeded current capacity; autoscaling can't add ready pods fast enough (slow cold start), and with no load shedding the overload degrades all requests" },
      { id: "c3", text: "The database schema changed" },
      { id: "c4", text: "A downstream provider went down" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Turn on load shedding / a rate limiter at the edge (429/503 + retry-after) so accepted requests succeed while capacity catches up" },
      { id: "a2", text: "Pre-scale and keep warm capacity ahead of known events (scheduled scaling) instead of relying only on reactive HPA" },
      { id: "a3", text: "Raise timeouts to 60s so slow requests eventually complete" },
      { id: "a4", text: "Speed up scaling: faster/pre-pulled images, smaller warmup, higher max replicas and burst headroom" },
      { id: "a5", text: "Disable autoscaling and run a fixed small pod count" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a flash sale drove a **12x traffic surge in ~55 seconds**. The HPA reacted and set a target of 40 replicas, but pods take ~90s to become Ready (image pull + warmup), so only ~9 were serving while 58k req/s arrived. With **no load shedding**, the system tried to serve everything, overloaded the ready pods, and pushed error rate to 38% and p99 to nearly 9s -- degrading *all* requests instead of protecting a serviceable subset.

**The key idea -- autoscaling is not instant:** reactive scaling always lags a sharp spike because startup takes time. The correct pattern is to **bridge the gap with load shedding**: protect the capacity you have. Rejecting or queuing excess quickly (**429/503 + retry-after**) lets the requests you *do* accept succeed, which is far better than everyone timing out.

**Correct response:** (1) **shed load / rate limit at the edge** so accepted requests succeed while capacity ramps; (2) **pre-scale with warm capacity** ahead of known events (scheduled scaling), not just reactive HPA; (3) **make scaling faster** -- pre-pulled/slim images, shorter warmup, higher max replicas and burst headroom.

**Prevention:** capacity plan for known events, keep a warm buffer, always have a load-shedding/rate-limit layer as a backstop, and treat graceful degradation as a first-class design goal.`,
    relatedLessons: ["rate-limiting", "load-balancing", "k8s-resources-limits", "slo-sli-error-budgets"],
  },

  {
    id: "db-slow-query",
    title: "Query plan regression from stale statistics",
    severity: "SEV2",
    service: "reporting-api",
    symptom:
      "A previously fast endpoint got 50x slower overnight. No deploy, no schema change, no traffic change -- the same query just suddenly runs a bad plan.",
    tags: ["database", "query-plan", "statistics", "analyze", "seq-scan", "postgres", "regression"],
    dashboard: [
      { label: "p99 latency", value: "7.2", unit: "s", status: "crit", spark: [0.14, 0.15, 0.15, 3.1, 6.0, 7.0, 7.1, 7.2] },
      { label: "Rows scanned/query", value: "18M", status: "crit", spark: [900, 900, 950, 6000000, 12000000, 17000000, 18000000, 18000000] },
      { label: "Buffer cache hit", value: "62", unit: "%", status: "warn", spark: [99, 99, 99, 84, 71, 65, 62, 62] },
      { label: "DB CPU", value: "88", unit: "%", status: "crit", spark: [30, 31, 32, 60, 78, 85, 88, 88] },
      { label: "Requests/s", value: "310", status: "ok", spark: [305, 308, 310, 309, 311, 310, 308, 310] },
    ],
    logs: [
      "01:30 INFO  nightly bulk import loaded 40M rows into events",
      "03:05 WARN  slow query 7100ms: SELECT ... FROM events WHERE tenant_id=$1 AND created_at > $2",
      "03:05 INFO  plan: Seq Scan on events (was: Index Scan using events_tenant_created_idx)",
      "03:06 WARN  planner row estimate 12 (actual 18,000,000) -- estimate wildly off",
    ],
    terminal: [
      { cmd: "psql -c \"EXPLAIN ANALYZE SELECT count(*) FROM events WHERE tenant_id=$1 AND created_at > now()-interval '1 day'\"", output: "Seq Scan on events  (cost=0..900k rows=12 width=0) (actual rows=18000000 time=7100ms)\n  Filter: (tenant_id = 42 AND created_at > ...)\nPlanning Time: 0.3 ms\nExecution Time: 7104 ms" },
      { cmd: "psql -c \"select last_analyze, last_autoanalyze, n_mod_since_analyze from pg_stat_user_tables where relname='events'\"", output: " last_analyze | last_autoanalyze | n_mod_since_analyze\n--------------+------------------+--------------------\n (null)       | 2 days ago       | 40000000" },
      { cmd: "psql -c \"select indexrelname, idx_scan from pg_stat_user_indexes where relname='events'\"", output: " events_tenant_created_idx | 0   # index exists but planner stopped using it" },
    ],
    hints: [
      "Nothing in the app changed, and the index still exists. But the query switched from an Index Scan to a Seq Scan overnight. What makes the planner change its mind?",
      "EXPLAIN shows the planner estimated 12 rows but actually got 18 million. When estimates are that wrong, the planner picks a terrible plan.",
      "pg_stat_user_tables shows 40M modifications since the last analyze and no recent ANALYZE. The nightly bulk import invalidated the table statistics, so the planner is working from stale data.",
      "Immediate: refresh statistics (ANALYZE) so the planner sees reality and reverts to the index. Durable: autovacuum/autoanalyze tuning after bulk loads, and consider a statement_timeout guard. This is distinct from a missing index -- the index exists; the STATISTICS were stale.",
    ],
    causeChoices: [
      { id: "c1", text: "The index on events(tenant_id, created_at) was dropped" },
      { id: "c2", text: "A nightly bulk import left table statistics stale; the planner grossly under-estimated rows (12 vs 18M) and switched from Index Scan to a Seq Scan -- a plan regression, not a missing index" },
      { id: "c3", text: "The connection pool is exhausted" },
      { id: "c4", text: "A bad deploy changed the query" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Run ANALYZE (refresh statistics) on the events table so the planner reverts to the index scan" },
      { id: "a2", text: "Tune autovacuum/autoanalyze thresholds and run ANALYZE as the last step of the nightly bulk import" },
      { id: "a3", text: "Drop and recreate the index that already exists" },
      { id: "a4", text: "Add a statement_timeout so a pathological plan can't run for 7s and pin the DB" },
      { id: "a5", text: "Raise the connection pool size to handle the slow queries" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a nightly bulk import loaded 40M rows into \`events\`. That invalidated the table's **statistics** (\`n_mod_since_analyze = 40M\`, no recent ANALYZE), so the query planner's row estimates were wildly wrong -- it estimated **12 rows when the real answer was 18,000,000**. With such a bad estimate, the planner concluded a **Seq Scan** was cheaper than the existing index and stopped using \`events_tenant_created_idx\`. Same query, same schema, same index -- a **plan regression** driven purely by stale stats.

**Why this is DISTINCT from a missing index:** the index exists and is valid (\`idx_scan = 0\` shows the planner simply chose not to use it). Recreating the index does nothing; the fix is to give the planner accurate statistics. EXPLAIN ANALYZE's estimated-vs-actual row gap is the definitive tell.

**Correct response:** (1) run **ANALYZE** on \`events\` immediately so the planner sees reality and reverts to the index scan; (2) **tune autovacuum/autoanalyze** and run **ANALYZE as the final step of the bulk import** so stats are never left stale after a big load; (3) add a **statement_timeout** so a pathological plan can't pin the DB for seconds.

**Prevention:** always ANALYZE after bulk loads, monitor \`n_mod_since_analyze\` and planner estimate accuracy, and treat sudden plan flips (index -> seq scan) as a statistics problem first.`,
    relatedLessons: ["pg-indexes", "pg-connection-pooling", "linux-observability-tools"],
  },

  {
    id: "cert-expiration",
    title: "Expired TLS certificate breaks all clients",
    severity: "SEV1",
    service: "api.example.com",
    symptom:
      "Every client suddenly fails to connect with certificate errors at the same instant. Browsers show a security warning; API clients throw TLS handshake failures. The servers themselves are healthy.",
    tags: ["tls", "certificate", "expiration", "handshake", "ssl", "https"],
    dashboard: [
      { label: "TLS handshake fails", value: "100", unit: "%", status: "crit", spark: [0, 0, 0, 100, 100, 100, 100, 100] },
      { label: "Successful requests", value: "0", unit: "%", status: "crit", spark: [100, 100, 100, 0, 0, 0, 0, 0] },
      { label: "Cert valid days", value: "-0.1", unit: "d", status: "crit", spark: [7, 5, 3, 1, 0.5, 0.1, 0, -0.1] },
      { label: "Backend health", value: "OK", status: "ok", spark: [1, 1, 1, 1, 1, 1, 1, 1] },
      { label: "App CPU", value: "26", unit: "%", status: "ok", spark: [24, 26, 25, 27, 26, 26, 25, 26] },
    ],
    logs: [
      "00:00 ERROR tls: handshake failure -- certificate has expired (notAfter=2026-09-09T00:00:00Z)",
      "00:00 ERROR clients: SSL_ERROR_EXPIRED / CERTIFICATE_VERIFY_FAILED",
      "00:00 INFO  backend /health 200 OK (plaintext, internal) -- app is fine",
      "00:01 WARN  cert renewal job last ran 89 days ago (manual, missed)",
    ],
    terminal: [
      { cmd: "echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates", output: "notBefore=Jun 11 00:00:00 2026 GMT\nnotAfter=Sep  9 00:00:00 2026 GMT   <- expired today" },
      { cmd: "curl -sS https://api.example.com/ping", output: "curl: (60) SSL certificate problem: certificate has expired" },
      { cmd: "openssl x509 -enddate -noout -in /etc/ssl/api.crt", output: "notAfter=Sep  9 00:00:00 2026 GMT" },
    ],
    hints: [
      "Everything broke at the exact same instant for every client, worldwide, while the servers stayed healthy. What kind of failure is time-triggered rather than load- or code-triggered?",
      "The errors are all TLS/SSL handshake failures -- CERTIFICATE_VERIFY_FAILED, certificate has expired. The connection can't even be established securely.",
      "openssl shows notAfter is today's date -- the certificate expired. The renewal job last ran 89 days ago and was missed. A cert that isn't renewed hard-fails the moment it expires.",
      "Immediate: issue/deploy a new certificate now and reload the servers. Durable: automate renewal (ACME/cert-manager) and alert well before expiry so this is never a surprise.",
    ],
    causeChoices: [
      { id: "c1", text: "A DDoS attack is blocking connections" },
      { id: "c2", text: "The TLS certificate expired (notAfter reached), so every client's handshake fails with a certificate error even though the servers are healthy" },
      { id: "c3", text: "The load balancer crashed" },
      { id: "c4", text: "A bad deploy broke the API" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Issue and deploy a new valid certificate, then reload the servers/LB to restore handshakes" },
      { id: "a2", text: "Automate renewal with ACME / cert-manager so certs rotate well before expiry" },
      { id: "a3", text: "Tell clients to disable certificate verification as a workaround" },
      { id: "a4", text: "Add expiry monitoring/alerting (e.g. warn at 30/14/7 days) so a cert never expires silently" },
      { id: "a5", text: "Restart the backend application servers" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** the TLS certificate for \`api.example.com\` reached its \`notAfter\` date and **expired**. From that instant, every client's TLS **handshake failed** with a certificate error (\`CERTIFICATE_VERIFY_FAILED\` / "certificate has expired"), so no secure connection could be established -- even though the application servers behind TLS were perfectly healthy. The renewal was a manual job that had been missed for 89 days.

**Reading the signals:** the failure was **time-triggered, global, and simultaneous** -- every client broke at the same instant regardless of location or load, while backend health stayed green. That signature (nothing wrong internally, everything wrong at the TLS layer, at a precise time) points straight at certificate expiry. \`openssl x509 -dates\` confirms it in one command.

**Correct response:** (1) **issue and deploy a new certificate** and reload the servers/LB to restore handshakes -- this is the only real mitigation; (2) **automate renewal** with ACME/cert-manager so certificates rotate automatically well before expiry; (3) add **expiry monitoring/alerting** (warn at 30/14/7 days) so a cert can never expire unnoticed.

**Never** tell clients to disable certificate verification -- that trades an outage for a security hole and trains bad habits.

**Prevention:** automated renewal is the fix; alerting is the safety net. Track expiry of every cert (including intermediates and internal mTLS) centrally.`,
    relatedLessons: ["tls-handshake", "dns", "http-fundamentals"],
  },

  {
    id: "lb-failure",
    title: "Shallow health check keeps dead backends in rotation",
    severity: "SEV1",
    service: "checkout-lb",
    symptom:
      "About a third of requests fail, seemingly at random. The load balancer reports all backends healthy, yet users keep hitting errors on retry.",
    tags: ["load-balancer", "health-check", "rotation", "shallow-check", "routing", "5xx"],
    dashboard: [
      { label: "Error rate", value: "33", unit: "%", status: "crit", spark: [0.2, 0.3, 12, 22, 30, 32, 33, 33] },
      { label: "Backends 'healthy'", value: "6", unit: "/6", status: "warn", spark: [6, 6, 6, 6, 6, 6, 6, 6] },
      { label: "Actually serving", value: "4", unit: "/6", status: "crit", spark: [6, 6, 5, 4, 4, 4, 4, 4] },
      { label: "Health-check pass", value: "100", unit: "%", status: "warn", spark: [100, 100, 100, 100, 100, 100, 100, 100] },
      { label: "p99 latency", value: "210", unit: "ms", status: "ok", spark: [190, 200, 205, 208, 210, 209, 210, 210] },
    ],
    logs: [
      "09:30 INFO  lb health check GET /healthz -> 200 for all 6 backends (checks process is up only)",
      "09:31 ERROR backend-3 /checkout: 500 (db driver not initialized) -- but /healthz still 200",
      "09:31 ERROR backend-5 /checkout: 500 (config not loaded) -- but /healthz still 200",
      "09:32 WARN  lb keeping backend-3, backend-5 in rotation (shallow check passes)",
    ],
    terminal: [
      { cmd: "for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w \"b$i:%{http_code} \" http://backend-$i:8080/checkout; done", output: "b1:200 b2:200 b3:500 b4:200 b5:500 b6:200   # 2 of 6 return 500 on real traffic" },
      { cmd: "curl -s http://backend-3:8080/healthz", output: "200 OK  # health check only verifies the process is listening" },
      { cmd: "curl -s http://backend-3:8080/checkout", output: "500 Internal Server Error: database driver not initialized" },
    ],
    hints: [
      "The LB says every backend is healthy, yet a fixed fraction (~1/3, i.e. 2 of 6) of requests fail. If bad backends stayed in rotation, what fraction of round-robin traffic would hit them?",
      "Curl each backend's real endpoint directly: backends 3 and 5 return 500 on /checkout, but their /healthz still returns 200.",
      "The health check is shallow -- it only checks that the process is listening, not that the app can actually serve (DB driver, config). So broken-but-listening backends stay in rotation and take their share of traffic.",
      "Fix: make the health check deep enough to reflect real readiness (dependency checks), so the LB ejects backends that can't serve. Then remediate the two bad backends.",
    ],
    causeChoices: [
      { id: "c1", text: "The load balancer itself is failing" },
      { id: "c2", text: "The health check is too shallow (only checks the process is up), so backends that are listening but can't actually serve (DB driver/config not loaded) stay in rotation and fail their share of requests" },
      { id: "c3", text: "A DNS problem is misrouting traffic" },
      { id: "c4", text: "The database is completely down" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Make the health check deep -- verify real readiness (DB/driver/config), so the LB ejects backends that can't serve" },
      { id: "a2", text: "Remediate the two bad backends (restart/redeploy so DB driver + config initialize) to restore full capacity" },
      { id: "a3", text: "Remove the health check entirely so nothing gets ejected" },
      { id: "a4", text: "Add outlier detection / passive health checks so backends returning 5xx on real traffic are pulled from rotation" },
      { id: "a5", text: "Route all traffic to a single backend to avoid the bad ones" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** the load balancer's health check was **shallow** -- \`GET /healthz\` only confirmed the process was listening, not that the app could actually serve requests. Two backends (3 and 5) had come up with an uninitialized DB driver / unloaded config, so they returned **500 on real traffic** but happily returned **200 on /healthz**. The LB therefore kept them in rotation, and with 2 of 6 backends broken under round-robin, roughly **1/3 of requests failed** -- the exact error rate observed.

**Reading the signals:** the paradox -- "all backends healthy" yet a *stable* one-third failure rate -- is the classic signature of dead backends left in rotation. The fraction of failures matches the fraction of bad backends. Curling the real endpoint vs the health endpoint exposes the gap immediately.

**Correct response:** (1) make the health check **deep enough to reflect real readiness** (check DB connectivity/driver/config), so the LB **ejects** backends that can't serve; (2) **remediate the two bad backends** (restart/redeploy so dependencies initialize) to restore capacity; (3) add **passive health checks / outlier detection** so any backend returning 5xx on real traffic is pulled automatically, independent of the active probe.

**Why a shallow check is dangerous:** "process is up" is not "service is working." A health check must exercise the code path that matters, or it will confidently keep broken nodes serving users.

**Prevention:** health/readiness endpoints should assert real dependency health; combine active probes with passive outlier detection; alert on the divergence between "healthy backends" and actual success rate.`,
    relatedLessons: ["load-balancing", "k8s-crashloop", "http-fundamentals", "slo-sli-error-budgets"],
  },

  {
    id: "region-failure",
    title: "Full region outage requires failover",
    severity: "SEV1",
    service: "global-platform",
    symptom:
      "An entire cloud region (us-east-1) went dark. Everything hosted there is unreachable at once -- compute, database primary, and cache. Traffic must move to the standby region.",
    tags: ["region", "outage", "failover", "multi-region", "disaster-recovery", "dns", "rpo-rto"],
    dashboard: [
      { label: "us-east-1 reachable", value: "DOWN", status: "crit", spark: [1, 1, 1, 0, 0, 0, 0, 0] },
      { label: "Global success", value: "8", unit: "%", status: "crit", spark: [99, 99, 60, 20, 10, 8, 8, 8] },
      { label: "us-west-2 healthy", value: "UP", status: "ok", spark: [1, 1, 1, 1, 1, 1, 1, 1] },
      { label: "Replica lag (was)", value: "4", unit: "s", status: "warn", spark: [1, 1, 2, 4, 4, 4, 4, 4] },
      { label: "DNS failover TTL", value: "300", unit: "s", status: "warn", spark: [300, 300, 300, 300, 300, 300, 300, 300] },
    ],
    logs: [
      "07:00 ERROR cloud provider: us-east-1 region-wide connectivity/API failure",
      "07:00 ERROR all us-east-1 services unreachable (compute, rds-primary, elasticache)",
      "07:01 INFO  us-west-2 standby healthy; async DB replica present (lag ~4s at cutover)",
      "07:02 WARN  DNS TTL 300s means clients take up to 5m to pick up the failover record",
    ],
    terminal: [
      { cmd: "aws ec2 describe-regions --region us-east-1", output: "Could not connect to the endpoint URL (region unavailable)" },
      { cmd: "dig api.example.com +short", output: "203.0.113.10  # still pointing at us-east-1 (TTL 300)" },
      { cmd: "curl -s https://api-us-west-2.example.com/health", output: "{\"status\":\"ok\",\"region\":\"us-west-2\",\"role\":\"standby\"}" },
      { cmd: "psql -h replica-west -c \"select pg_last_wal_replay_lsn()\"", output: " pg_last_wal_replay_lsn\n------------------------\n 2/A3F91C8  # replica caught up to ~4s before outage" },
    ],
    hints: [
      "This isn't a bug in your code -- an entire region failed at the infrastructure level. Everything in that region is gone at once. The only recovery is to serve from somewhere else.",
      "The standby region (us-west-2) is healthy and has an async DB replica. Failing over means promoting that replica to primary and steering traffic there.",
      "Two things gate your recovery time: how fast you can promote the standby (RTO) and how much recent data the async replica may be missing (RPO -- ~4s of writes here). And DNS TTL of 300s delays how fast clients follow the switch.",
      "Execute the failover (promote replica, point traffic at us-west-2), then reconcile the small window of possibly-lost writes. Longer term: lower failover TTLs, rehearse DR, and consider active-active to shrink RTO/RPO.",
    ],
    causeChoices: [
      { id: "c1", text: "A bad application deploy took down the service" },
      { id: "c2", text: "A full region (us-east-1) outage made all its resources (compute, DB primary, cache) unreachable at once; recovery requires failing over to the healthy standby region" },
      { id: "c3", text: "The database ran out of connections" },
      { id: "c4", text: "An expired TLS certificate" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Promote the us-west-2 replica to primary and steer traffic to the standby region (execute the failover runbook)" },
      { id: "a2", text: "Update DNS / global routing to point at us-west-2, accepting TTL-bounded propagation delay" },
      { id: "a3", text: "Wait for us-east-1 to come back rather than failing over" },
      { id: "a4", text: "After cutover, reconcile the ~4s window of writes the async replica may have missed (RPO handling)" },
      { id: "a5", text: "Lower failover DNS TTLs and rehearse DR / move toward active-active to cut RTO/RPO for next time" },
    ],
    correctActionIds: ["a1", "a2", "a4", "a5"],
    postmortem: `**Root cause:** a **region-wide outage** of \`us-east-1\` (a cloud-provider infrastructure failure) made *everything* hosted there unreachable simultaneously -- compute, the RDS primary, and the cache. No amount of in-region redundancy helps when the whole region is gone; the only recovery is to serve from another region.

**The failover, and its two costs:** the standby \`us-west-2\` was healthy with an **async DB replica** lagging ~4s at cutover. Recovery is gated by two things: **RTO** (how quickly you can promote the standby and redirect traffic) and **RPO** (how much recent data the async replica was missing -- roughly 4s of writes here). A **DNS TTL of 300s** further delayed how fast clients followed the switch.

**Correct response:** (1) **promote the us-west-2 replica** to primary and execute the failover runbook; (2) **redirect traffic** (DNS/global routing) to us-west-2, accepting TTL-bounded propagation; (3) after cutover, **reconcile the ~4s window** of writes the async replica may have missed (RPO handling -- from queues/logs where possible); (4) afterward, **lower failover TTLs, rehearse DR, and move toward active-active** to shrink RTO/RPO next time.

**Why NOT just wait:** betting recovery on a provider fixing a region outage on your timeline is not a plan. If you've paid for a standby, use it -- but only if failover is rehearsed and the data-reconciliation story is understood.

**Prevention:** multi-region architecture with tested failover, explicit RTO/RPO targets, low failover TTLs (or health-based global routing), and regular DR game-days so the runbook actually works under pressure.`,
    relatedLessons: ["cap-theorem", "dns", "load-balancing", "slo-sli-error-budgets"],
  },

  {
    id: "connection-leak",
    title: "Leaked DB connections slowly exhaust the pool",
    severity: "SEV2",
    service: "billing-api",
    symptom:
      "Over several hours the service degrades: latency creeps up and connection-pool timeouts appear, then vanish after each deploy/restart -- only to return hours later. No traffic change, no bad query.",
    tags: ["database", "connections", "pool", "leak", "postgres", "resource"],
    dashboard: [
      { label: "DB connections", value: "100", unit: "/100", status: "crit", spark: [42, 55, 66, 78, 87, 94, 99, 100] },
      { label: "Idle in transaction", value: "71", status: "crit", spark: [3, 12, 24, 38, 50, 61, 68, 71] },
      { label: "p99 latency", value: "6.2", unit: "s", status: "crit", spark: [0.2, 0.3, 0.5, 1.1, 2.4, 4.0, 5.5, 6.2] },
      { label: "DB CPU", value: "19", unit: "%", status: "ok", spark: [18, 19, 18, 20, 19, 19, 18, 19] },
      { label: "Pool wait timeouts/s", value: "88", status: "crit", spark: [0, 0, 0, 1, 8, 30, 66, 88] },
    ],
    logs: [
      "01:00 INFO  billing-api restarted (deploy), pool connections in use = 4",
      "03:40 WARN  pool: in-use connections 78/100 and climbing (no traffic increase)",
      "05:10 WARN  pg_stat_activity: 71 sessions 'idle in transaction' older than 20m",
      "05:12 ERROR could not acquire connection from pool within 5000ms (x340)",
      "05:12 INFO  code path /invoice/preview: opens connection, early-returns on cache hit without releasing",
    ],
    terminal: [
      { cmd: "psql -c \"select count(*), state from pg_stat_activity group by state\"", output: " count | state\n-------+---------------------\n    2  | active\n   27  | idle\n   71  | idle in transaction" },
      { cmd: "psql -c \"select now()-xact_start as age, query from pg_stat_activity where state='idle in transaction' order by age desc limit 3\"", output: "     age      |            query\n--------------+------------------------------\n 00:41:12     | SELECT price FROM plans WHERE id=$1\n 00:39:50     | SELECT price FROM plans WHERE id=$1\n 00:37:03     | SELECT price FROM plans WHERE id=$1" },
      { cmd: "grep -n 'getConnection\\|release\\|return' src/invoice/preview.js", output: "22: const conn = await pool.getConnection();\n27:   if (cache.has(key)) return cached;   // <-- returns WITHOUT conn.release()\n34: await conn.release();" },
    ],
    hints: [
      "The pool climbs to 100 and stays there, but DB CPU is low and there's no slow query. Connections are being taken and never given back.",
      "Notice the sawtooth: a restart resets in-use connections to a handful, then they climb again over hours. That is a leak, not load.",
      "pg_stat_activity shows dozens of sessions 'idle in transaction' for 40+ minutes -- connections checked out of the pool but sitting doing nothing. Something acquires a connection and never releases it.",
      "The tell is a code path that returns early (cache hit) before calling release(). The fix is to guarantee release on every path (finally/using), plus a leak/idle timeout as a safety net.",
    ],
    causeChoices: [
      { id: "c1", text: "A slow unindexed query holds each connection for seconds" },
      { id: "c2", text: "A code path acquires a pool connection and returns early (e.g. on a cache hit) without releasing it, so connections leak and the pool is exhausted over hours" },
      { id: "c3", text: "The database server ran out of CPU" },
      { id: "c4", text: "A traffic spike doubled request volume" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Wrap connection use in try/finally (or a using/scoped helper) so release() runs on every code path, including early returns and exceptions" },
      { id: "a2", text: "Restart the service to reclaim leaked connections and buy time while the fix ships" },
      { id: "a3", text: "Raise max_connections to 1000 so the leak takes longer to bite" },
      { id: "a4", text: "Set idle_in_transaction_session_timeout and a pool leak-detection timeout so orphaned connections are reclaimed automatically" },
      { id: "a5", text: "Delete the cache so the early-return path never executes" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** the \`/invoice/preview\` handler called \`pool.getConnection()\` at the top, but on a **cache hit it returned early -- before \`conn.release()\`**. Every cache hit leaked one connection. With no traffic change, leaked connections accumulated over hours until all 100 were checked out and sitting **idle in transaction**; new requests then blocked waiting for a connection and timed out.

**Reading the signals:** DB CPU was low and there was no slow query, so the database itself was healthy -- the *pool* was the exhausted resource. The **sawtooth** (reset on each restart, climb over hours) is the signature of a leak rather than load. \`pg_stat_activity\` made it concrete: dozens of long-lived 'idle in transaction' sessions doing nothing.

**Correct response:** (1) **guarantee release on every path** with try/finally or a scoped helper so early returns and exceptions can't skip it; (2) **restart** to reclaim the leaked connections immediately while the fix ships; (3) add **idle_in_transaction_session_timeout** plus a **pool leak-detection timeout** so an orphaned connection is reclaimed automatically instead of pinned forever.

**Why NOT just raise max_connections:** a leak exhausts any ceiling -- a bigger pool only lengthens the time-to-failure. Fix the missing release; the timeout is a safety net, not the cure.

**Prevention:** prefer APIs that scope acquisition automatically (context managers / RAII), lint for acquire-without-release, and alert on 'idle in transaction' age and pool utilization trend, not just instantaneous value.`,
    relatedLessons: ["pg-connection-pooling", "pg-transactions-mvcc", "three-pillars"],
  },

  {
    id: "db-deadlock",
    title: "Transactions deadlock from inconsistent lock ordering",
    severity: "SEV2",
    service: "wallet-api",
    symptom:
      "A rising share of transfer requests fail with 'deadlock detected' and get rolled back. It started after a feature added a second write in one code path, and worsens as concurrency grows.",
    tags: ["database", "deadlock", "locking", "transactions", "postgres", "concurrency"],
    dashboard: [
      { label: "Deadlocks/min", value: "142", status: "crit", spark: [0, 1, 6, 22, 55, 98, 130, 142] },
      { label: "Transfer error rate", value: "9", unit: "%", status: "crit", spark: [0, 0, 1, 2, 4, 6, 8, 9] },
      { label: "Rollbacks/s", value: "24", status: "warn", spark: [1, 1, 3, 6, 12, 18, 22, 24] },
      { label: "DB CPU", value: "44", unit: "%", status: "ok", spark: [40, 42, 44, 45, 43, 44, 45, 44] },
      { label: "Lock waits", value: "310", status: "crit", spark: [5, 20, 60, 120, 200, 260, 300, 310] },
    ],
    logs: [
      "20:02 INFO  deploy: transfer path now also updates 'accounts.updated_at' in same txn",
      "20:31 ERROR deadlock detected",
      "20:31 DETAIL Process 8841 waits for ShareLock on transaction 5502; blocked by process 8830.",
      "20:31 DETAIL Process 8830 waits for ShareLock on transaction 5511; blocked by process 8841.",
      "20:31 HINT  See server log for query details. (transfer A->B vs B->A)",
    ],
    terminal: [
      { cmd: "psql -c \"select deadlocks from pg_stat_database where datname='wallet'\"", output: " deadlocks\n-----------\n     3187" },
      { cmd: "grep -n 'UPDATE accounts' src/transfer.js", output: "40: await tx.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2',[amt, fromId]);\n41: await tx.query('UPDATE accounts SET balance=balance+$1 WHERE id=$2',[amt, toId]);\n// locks rows in the order (fromId, toId) -- opposite for a reverse transfer" },
      { cmd: "psql -c \"select pid, wait_event_type, query from pg_stat_activity where wait_event_type='Lock'\"", output: " 8830 | Lock | UPDATE accounts SET balance=balance+$1 WHERE id=$2\n 8841 | Lock | UPDATE accounts SET balance=balance-$1 WHERE id=$2" },
    ],
    hints: [
      "This is not a resource problem -- DB CPU is fine. The database is aborting one transaction in each pair on purpose to break a cycle.",
      "A deadlock is a cycle: txn 1 holds lock A and wants B, while txn 2 holds B and wants A. Neither can proceed, so the DB kills one.",
      "The transfer code locks the two account rows in the order (fromId, toId). A transfer A->B and a simultaneous B->A grab the same two rows in opposite orders -- the classic recipe for a deadlock.",
      "Fix: make every transaction acquire locks in a consistent global order (e.g. always lock the lower account id first). Keep transactions short, and retry on deadlock since it's a transient, expected error.",
    ],
    causeChoices: [
      { id: "c1", text: "The database is overloaded and killing queries to shed load" },
      { id: "c2", text: "Two transactions lock the same two account rows in opposite orders (A->B vs B->A), forming a cycle; the DB detects the deadlock and aborts one transaction" },
      { id: "c3", text: "A missing index makes queries slow" },
      { id: "c4", text: "The connection pool is exhausted" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Acquire row locks in a consistent global order (e.g. always update the lower account id first) so no cycle can form" },
      { id: "a2", text: "Add a bounded retry-with-backoff on deadlock, since a deadlock is a transient, safe-to-retry error" },
      { id: "a3", text: "Set the isolation level to SERIALIZABLE and assume that removes deadlocks" },
      { id: "a4", text: "Keep the transaction short and lock only what's needed, reducing the window for a cycle" },
      { id: "a5", text: "Disable deadlock detection so transactions stop being aborted" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** the transfer path updated the two account rows in the order they appeared in the request -- \`fromId\` then \`toId\`. A transfer **A -> B** running concurrently with a transfer **B -> A** therefore locked the same two rows in **opposite orders**: one txn held A and waited for B, the other held B and waited for A. That cycle is a **deadlock**, and Postgres broke it by aborting one transaction with "deadlock detected." The recent feature that added a second write in the same transaction widened the window, so the rate climbed with concurrency.

**Reading the signals:** DB CPU was healthy -- this was a *correctness/concurrency* failure, not a resource one. The log's two mirrored "waits for ShareLock ... blocked by" lines describe the cycle directly, and \`pg_stat_activity\` showed both PIDs stuck on \`Lock\` with the mirrored UPDATEs.

**Correct response:** (1) impose a **consistent global lock order** -- always touch the lower account id first (or \`SELECT ... FOR UPDATE\` both rows in sorted order up front) so a cycle is impossible; (2) add a **bounded retry with backoff**, since a deadlock is a transient, safe-to-retry abort (the losing txn did no partial work); (3) **keep transactions short** and lock only what's needed to shrink the window.

**Why SERIALIZABLE isn't the fix:** stricter isolation can produce *more* serialization failures, not fewer deadlocks. Consistent ordering plus retry is the durable pattern.

**Prevention:** codify lock-ordering rules for multi-row writes, review any transaction that touches more than one row of the same table, and monitor \`pg_stat_database.deadlocks\` as a leading indicator.`,
    relatedLessons: ["pg-transactions-mvcc", "pg-connection-pooling", "slo-sli-error-budgets"],
  },

  {
    id: "clock-skew",
    title: "Clock drift on a node breaks tokens, TTLs, and certs",
    severity: "SEV2",
    service: "auth-gateway",
    symptom:
      "One node in the fleet rejects valid JWTs as expired, serves stale cache entries, and intermittently fails TLS handshakes. Requests routed to other nodes are fine.",
    tags: ["clock", "ntp", "time", "jwt", "tls", "cache", "ttl"],
    dashboard: [
      { label: "Clock offset (node-3)", value: "+312", unit: "s", status: "crit", spark: [0, 2, 20, 80, 160, 240, 300, 312] },
      { label: "JWT 'expired' rejects/s", value: "260", status: "crit", spark: [0, 1, 10, 60, 140, 210, 250, 260] },
      { label: "Error rate (node-3)", value: "38", unit: "%", status: "crit", spark: [0, 1, 5, 14, 24, 32, 37, 38] },
      { label: "Error rate (other nodes)", value: "0.2", unit: "%", status: "ok", spark: [0.2, 0.1, 0.2, 0.2, 0.1, 0.2, 0.2, 0.2] },
      { label: "TLS handshake fails/s", value: "17", status: "warn", spark: [0, 0, 1, 3, 7, 12, 15, 17] },
    ],
    logs: [
      "11:00 ERROR jwt: token expired (exp=1700000000, now=1700000312) -- 'now' is 312s ahead of real time",
      "11:00 WARN  cache: entry TTL computed as already-expired, forcing recompute on every read",
      "11:01 ERROR tls: certificate is not yet valid / handshake failed (notBefore in the future relative to local clock)",
      "11:02 INFO  affected requests all served by node-3; other nodes unaffected",
      "11:03 WARN  chronyd: not synchronized; last offset +312.4s",
    ],
    terminal: [
      { cmd: "chronyc tracking", output: "Reference ID    : 00000000 (unsynchronised)\nStratum         : 0\nSystem time     : 312.418 seconds fast of NTP time\nLeap status     : Not synchronised" },
      { cmd: "date -u; ssh node-1 date -u", output: "Mon 11 00:05:12 UTC 2026   # node-3 local\nMon 11 00:00:00 UTC 2026   # node-1 local (correct)" },
      { cmd: "systemctl status chronyd", output: "chronyd.service - NTP client\n   Active: failed (Result: exit-code)\n   Note: outbound udp/123 blocked by a recent firewall change" },
    ],
    hints: [
      "Only one node is failing, and it fails three unrelated-looking things at once: token expiry, cache TTLs, and TLS validity. What single thing do all three depend on?",
      "All three -- JWT exp, cache TTL, TLS notBefore/notAfter -- are time comparisons. If a node's clock is wrong, every one of them misjudges 'now'.",
      "chronyc shows node-3 is 312s FAST and 'Not synchronised'. Its clock jumped ahead, so still-valid tokens look expired and not-yet-valid certs look invalid.",
      "Root cause is NTP sync failure (a firewall change blocked udp/123). Fix time sync on the node, then unblock NTP fleet-wide and alert on clock offset so drift is caught before it breaks anything.",
    ],
    causeChoices: [
      { id: "c1", text: "The JWT signing key was rotated incorrectly" },
      { id: "c2", text: "node-3's clock drifted +312s because NTP sync failed (blocked udp/123); every time-based check -- JWT exp, cache TTL, TLS validity -- now misjudges 'now'" },
      { id: "c3", text: "The TLS certificate actually expired" },
      { id: "c4", text: "The cache backend is down" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Restore time sync on node-3 (fix/restart NTP, step the clock back to correct time) so time-based checks pass" },
      { id: "a2", text: "Drain node-3 from the load balancer while its clock is wrong so it stops rejecting valid requests" },
      { id: "a3", text: "Extend all JWT and cert lifetimes to hours so skew stops mattering" },
      { id: "a4", text: "Fix the firewall rule so udp/123 (NTP) is allowed again fleet-wide, and monitor/alert on clock offset per node" },
      { id: "a5", text: "Disable JWT expiry validation entirely" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** node-3's system clock drifted **+312 seconds** ahead of real time because its NTP client (chronyd) could no longer sync -- a firewall change had blocked outbound **udp/123**. Every security/expiry check on that node is a comparison against the local clock: **JWT \`exp\`** (valid tokens looked expired), **cache TTLs** (entries computed as already-expired, forcing constant recompute), and **TLS validity** (\`notBefore\`/\`notAfter\` misjudged, so handshakes failed). One wrong clock broke three unrelated-seeming subsystems at once.

**Reading the signals:** the failure was **isolated to one node** while the rest of the fleet was clean -- a strong hint the problem is node-local, not a shared dependency. \`chronyc tracking\` ("312s fast", "Not synchronised") and a simple \`date\` comparison against a healthy node confirmed the skew immediately.

**Correct response:** (1) **restore time sync** on node-3 (repair/restart NTP and correct the clock) so checks pass again; (2) **drain node-3** from rotation while its clock is wrong so it stops rejecting valid traffic; (3) **fix the firewall** to re-allow udp/123 fleet-wide and add **per-node clock-offset monitoring/alerting** so drift is caught long before it causes rejections.

**Why NOT loosen expiry:** extending token/cert lifetimes or disabling \`exp\` validation trades a time bug for a security hole; the correct fix is accurate time, not weaker checks. Some jitter tolerance (a few seconds of allowed skew) is reasonable, minutes of blind trust is not.

**Prevention:** treat accurate time as infrastructure -- redundant NTP sources, alerting on offset and sync state, and change-review that flags firewall edits touching NTP/DNS/time ports.`,
    relatedLessons: ["tls-handshake", "dns", "three-pillars"],
  },

  {
    id: "thundering-herd-restart",
    title: "Cold-cache stampede after a fleet restart",
    severity: "SEV1",
    service: "feed-api",
    symptom:
      "Right after a rolling restart, every client reconnects at once and the caches are empty, so a flood of identical cache-miss queries hammers the database and the whole service browns out for a few minutes.",
    tags: ["thundering-herd", "cache", "stampede", "restart", "cold-cache", "reconnect"],
    dashboard: [
      { label: "Cache hit rate", value: "4", unit: "%", status: "crit", spark: [95, 94, 3, 4, 4, 6, 20, 55] },
      { label: "DB QPS", value: "48k", status: "crit", spark: [6000, 6100, 47000, 48000, 46000, 30000, 14000, 8000] },
      { label: "DB CPU", value: "99", unit: "%", status: "crit", spark: [30, 31, 98, 99, 99, 92, 70, 45] },
      { label: "New connections/s", value: "12k", status: "crit", spark: [200, 210, 12000, 9000, 3000, 1200, 500, 300] },
      { label: "p99 latency", value: "8.1", unit: "s", status: "crit", spark: [0.1, 0.1, 8.1, 7.8, 6.9, 3.2, 1.1, 0.4] },
    ],
    logs: [
      "22:00 INFO  rolling restart of feed-api complete (all pods fresh, caches empty)",
      "22:00 WARN  50k+ clients reconnecting simultaneously (no reconnect jitter)",
      "22:00 WARN  cache MISS storm: 47,000 identical 'SELECT ... FROM feed WHERE user_id=$1' in 10s",
      "22:00 ERROR db: too many connections; requests queueing; p99 8s",
      "22:01 INFO  same key recomputed by thousands of concurrent requests (no single-flight)",
    ],
    terminal: [
      { cmd: "redis-cli info stats | grep keyspace", output: "keyspace_hits:2140\nkeyspace_misses:46110   # caches were wiped by the restart" },
      { cmd: "psql -c \"select count(*) from pg_stat_activity where state='active'\"", output: " count\n-------\n   100   # every DB slot busy on identical queries" },
      { cmd: "grep -n 'cache.get\\|singleflight\\|lock' src/feed.js", output: "18: let v = await cache.get(key);\n19: if (v) return v;\n20: v = await db.query(...);   // no single-flight: N concurrent misses all hit the DB\n21: await cache.set(key, v, 60);" },
    ],
    hints: [
      "The DB spike is a transient burst that starts exactly at the restart and decays as caches warm. It's not a leak or a bad query -- it's a synchronized surge.",
      "Two synchronized things happen at once: every client reconnects simultaneously, and every cache is empty. Both aim a wall of identical work at the database at the same instant.",
      "With no single-flight, thousands of concurrent requests for the same key all miss and all query the DB -- recomputing the identical value in parallel. That's a cache stampede on top of a reconnect storm.",
      "Spread the load in time (reconnect backoff with jitter, staggered/partial restarts) and collapse duplicate work (single-flight/request coalescing, and warm or stagger cache expiry) so a cold start doesn't stampede the DB.",
    ],
    causeChoices: [
      { id: "c1", text: "A memory leak crashed the database" },
      { id: "c2", text: "After the restart, synchronized client reconnects plus empty caches produced a stampede of identical cache-miss queries (no jitter, no single-flight) that saturated the DB" },
      { id: "c3", text: "A bad deploy introduced a slow query" },
      { id: "c4", text: "The load balancer failed" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Add single-flight / request coalescing so concurrent misses for the same key trigger one DB query, not thousands" },
      { id: "a2", text: "Give clients reconnect backoff with jitter so they don't all reconnect at the same instant" },
      { id: "a3", text: "Restart everything again immediately and hope the caches warm faster" },
      { id: "a4", text: "Restart in smaller staggered batches (and pre-warm / stagger cache expiry) so caches are never all cold at once" },
      { id: "a5", text: "Permanently 10x the database instance so it can absorb any stampede" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a rolling restart left **every cache empty at the same instant**, and every client **reconnected simultaneously** (no backoff jitter). The result was a **thundering herd**: tens of thousands of identical cache-miss queries hit the database in seconds. Because the code had **no single-flight**, thousands of concurrent requests for the *same* key each independently missed and each queried the DB, recomputing identical values in parallel. The DB hit 100% CPU and every connection slot, and the service browned out until caches naturally re-warmed.

**Reading the signals:** the spike was **transient and self-healing**, starting exactly at the restart and decaying as hit rate climbed back -- the signature of a cold-start surge, not a leak or a bad query. Redis stats (misses far exceeding hits) confirmed the caches had been wiped.

**Correct response:** (1) **collapse duplicate work** with single-flight / request coalescing so N concurrent misses for a key become one backend call; (2) **de-synchronize reconnects** with backoff + jitter so clients don't arrive in lockstep; (3) **stagger restarts in small batches** and **pre-warm or jitter cache expiry** so all caches are never cold simultaneously.

**Why NOT just upsize the DB:** provisioning for the peak of an avoidable synchronized burst is wasteful and still fragile -- the correct fix is to *spread the load in time* and *deduplicate it*, not to brute-force the spike.

**Prevention:** jittered TTLs, single-flight around expensive recomputes, staggered/partial rollouts, and load-testing the cold-start path -- not just steady state.`,
    relatedLessons: ["caching-dual", "redis-deep", "load-balancing"],
  },

  {
    id: "autoscaler-flapping",
    title: "Autoscaler flapping on a noisy metric",
    severity: "SEV2",
    service: "checkout-worker",
    symptom:
      "The HPA scales the deployment up and down every couple of minutes. Pods are constantly starting and terminating, causing churn, dropped in-flight work, and unstable latency -- even though real demand is roughly flat.",
    tags: ["kubernetes", "hpa", "autoscaling", "flapping", "metric", "churn"],
    dashboard: [
      { label: "Replica count", value: "3->14", status: "crit", spark: [4, 14, 3, 13, 4, 15, 3, 14] },
      { label: "Scale events/10m", value: "22", status: "crit", spark: [1, 3, 8, 14, 18, 20, 21, 22] },
      { label: "Metric: CPU (scrape)", value: "88", unit: "%", status: "warn", spark: [20, 88, 22, 90, 25, 86, 21, 88] },
      { label: "Pod churn/10m", value: "63", status: "crit", spark: [4, 10, 22, 38, 50, 58, 61, 63] },
      { label: "Real throughput", value: "1.0k", unit: "req/s", status: "ok", spark: [1000, 1010, 990, 1005, 995, 1002, 1000, 998] },
    ],
    logs: [
      "09:00 INFO  hpa/checkout-worker: current CPU 88% > target 60% -> scale 3->14",
      "09:02 INFO  hpa/checkout-worker: current CPU 22% < target 60% -> scale 14->3",
      "09:04 INFO  hpa/checkout-worker: current CPU 90% > target 60% -> scale 3->13",
      "09:04 WARN  metric source: CPU sampled at container start includes JVM/warmup spike; new pods read ~90% for ~60s then settle to ~30%",
      "09:05 WARN  no stabilizationWindow / no cooldown configured on this HPA",
    ],
    hints: [
      "Real throughput is flat, yet replicas oscillate between 3 and 14 every few minutes. Demand isn't changing -- the scaling signal is.",
      "The scaling metric (CPU) swings wildly between scrapes, but actual request rate is steady. The metric is misleading the autoscaler.",
      "Fresh pods read ~90% CPU during warmup for ~60s, then settle to ~30%. The HPA scales up on the warmup spike, then the average drops and it scales back down -- a feedback loop with no damping.",
      "Two fixes: stop the metric from lying (scale on a stable signal like requests-per-pod / steady-state CPU, exclude warmup) and damp the loop (stabilization window / cooldown, min-max bounds) so it can't oscillate.",
    ],
    causeChoices: [
      { id: "c1", text: "A traffic spike is genuinely driving demand up and down" },
      { id: "c2", text: "The HPA scales on a noisy metric (CPU inflated by pod warmup) with no stabilization window, so warmup spikes trigger scale-up, the average then drops, and it scales down -- oscillating despite flat real demand" },
      { id: "c3", text: "The cluster is out of capacity" },
      { id: "c4", text: "A bad deploy broke the workers" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Add an HPA stabilization window / scale-down cooldown so it can't react to transient spikes and thrash" },
      { id: "a2", text: "Scale on a stable, demand-proportional metric (e.g. requests-per-pod or queue depth) instead of raw instantaneous CPU" },
      { id: "a3", text: "Turn off autoscaling entirely and pin replicas forever" },
      { id: "a4", text: "Exclude the warmup period from the metric (readiness gating / longer averaging window) so new-pod CPU spikes don't drive scaling" },
      { id: "a5", text: "Set maxReplicas to 500 so it always has room to scale" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** the HPA scaled on **raw CPU**, but freshly started pods spike to ~90% CPU during JVM/warmup for about a minute before settling to ~30%. With **no stabilization window or cooldown**, the autoscaler saw the warmup spike, scaled **up**; the extra (still-warming) pods then dragged the *average* metric around, and moments later it scaled **down** -- a self-reinforcing oscillation. Real throughput was flat the entire time, so this was pure control-loop instability, not demand.

**Reading the signals:** the decisive contrast is **flat real throughput** against **oscillating replica count and scale events**. When the output swings but the true input is steady, suspect the *signal* and the *controller*, not the workload. The logs even name the mechanism: warmup-inflated CPU on new pods plus no cooldown.

**Correct response:** (1) add a **stabilization window / scale-down cooldown** so the HPA ignores transient spikes and can't thrash; (2) scale on a **stable, demand-proportional metric** -- requests-per-pod or queue depth -- rather than instantaneous CPU; (3) **exclude warmup** from the metric (readiness gating and/or a longer averaging window) so a new pod's startup spike doesn't feed the loop.

**Why NOT disable autoscaling or set maxReplicas huge:** pinning replicas throws away elasticity and over-provisions; a giant max just gives the broken loop more room to churn. The fix is a trustworthy signal plus a damped controller.

**Prevention:** choose scaling metrics that track real demand, always set stabilization windows and sane min/max bounds, and load-test the scaling behavior (including cold starts), not just steady-state capacity.`,
    relatedLessons: ["k8s-resources-limits", "slo-sli-error-budgets", "load-balancing"],
  },

  {
    id: "secret-rotation-outage",
    title: "Rotated DB credential not propagated to one service",
    severity: "SEV1",
    service: "reporting-api",
    symptom:
      "One service suddenly can't authenticate to the database -- 'password authentication failed' -- while every other service using the same database is completely healthy. It began at the top of the hour.",
    tags: ["secrets", "rotation", "credentials", "auth", "vault", "config"],
    dashboard: [
      { label: "DB auth failures/s", value: "180", status: "crit", spark: [0, 0, 0, 175, 180, 182, 179, 180] },
      { label: "reporting-api success", value: "0", unit: "%", status: "crit", spark: [99, 99, 99, 2, 0, 0, 0, 0] },
      { label: "Other services success", value: "99.9", unit: "%", status: "ok", spark: [99.9, 99.9, 99.9, 99.9, 99.9, 99.9, 99.9, 99.9] },
      { label: "DB CPU", value: "21", unit: "%", status: "ok", spark: [20, 21, 20, 22, 21, 21, 20, 21] },
      { label: "Secret version (in use)", value: "v7", status: "crit", spark: [7, 7, 7, 7, 7, 7, 7, 7] },
    ],
    logs: [
      "12:00 INFO  secrets-manager: rotated db password for role 'reporting' -> version v8 (v7 revoked)",
      "12:00 ERROR reporting-api: FATAL 28P01 password authentication failed for user 'reporting'",
      "12:00 WARN  reporting-api loaded DB_PASSWORD at boot 3 days ago; never re-read secret (cached v7)",
      "12:01 INFO  other services fetch the secret per-connection or got restarted; they use v8 and are fine",
      "12:02 ERROR reporting-api: retrying with same (stale) credential, failing identically",
    ],
    terminal: [
      { cmd: "vault kv get -field=version secret/db/reporting", output: "8   # current version is v8; v7 was revoked at 12:00" },
      { cmd: "kubectl exec reporting-api-abc -- printenv DB_PASSWORD | sha256sum", output: "b91c...   # matches the sha of v7 (stale), not v8" },
      { cmd: "psql \"host=db user=reporting password=$(vault kv get -field=password secret/db/reporting)\" -c 'select 1'", output: " ?column?\n----------\n        1   # v8 works fine -- the credential is valid, the app is just using the old one" },
    ],
    hints: [
      "Only one service is failing, and every other service on the same database is healthy. So the database and the network are fine -- something specific to this service changed.",
      "The error is 'password authentication failed' (28P01), and it began exactly when a credential rotation happened at 12:00.",
      "The service read DB_PASSWORD once at boot (3 days ago) and cached it. Rotation revoked the old password (v7) and issued v8, but this service never re-read the secret -- so it keeps presenting the dead credential.",
      "Immediate: get v8 to the service (restart to reload, or trigger a secret refresh). Durable: make rotation propagate before revoke (overlap window), and have apps fetch/refresh secrets instead of caching one at boot.",
    ],
    causeChoices: [
      { id: "c1", text: "The database is down or overloaded" },
      { id: "c2", text: "A credential rotation issued v8 and revoked v7, but reporting-api cached the password at boot and never re-read it, so it keeps authenticating with the now-revoked credential" },
      { id: "c3", text: "The database user 'reporting' was deleted" },
      { id: "c4", text: "A network partition to the database" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Restart/redeploy reporting-api (or trigger its secret refresh) so it loads the current password (v8)" },
      { id: "a2", text: "Change the rotation process to propagate the new secret to all consumers BEFORE revoking the old one (overlap window)" },
      { id: "a3", text: "Roll the database password back to v7 permanently and stop rotating credentials" },
      { id: "a4", text: "Make the app fetch/refresh the secret at runtime (short-lived cache or on-auth-failure re-read) instead of caching one value at boot" },
      { id: "a5", text: "Grant reporting-api superuser so auth stops mattering" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a scheduled **credential rotation** issued a new DB password (**v8**) for the \`reporting\` role and **revoked the old one (v7)** at 12:00. Most consumers fetched the secret per-connection or were restarted and picked up v8 -- but **reporting-api had read \`DB_PASSWORD\` once at boot (3 days earlier) and cached it**. It kept presenting the revoked v7 credential and got \`28P01 password authentication failed\` on every connection. The credential itself was valid; the *distribution* of the new secret to this one consumer failed.

**Reading the signals:** the blast radius was **one service** while every other service on the *same database* stayed at 99.9% -- ruling out the DB, the network, and the user. Timing (started exactly at the rotation) plus the error code (auth failure, not timeout) pointed straight at credentials. Comparing the in-use secret hash to the current version confirmed the app was on the stale value.

**Correct response:** (1) **reload the secret** on reporting-api (restart/redeploy or trigger a refresh) so it uses v8 and service is restored; (2) fix the **rotation ordering** so the new secret is **propagated to all consumers before the old one is revoked** (a make-before-break overlap window); (3) make apps **fetch/refresh secrets at runtime** (short-lived cache, or re-read on auth failure) instead of caching a single value at boot.

**Why NOT roll back / stop rotating:** reverting to v7 or abandoning rotation trades a distribution bug for a standing security risk. Rotation is correct; the propagation and consumption pattern is what needed fixing.

**Prevention:** overlapping validity windows during rotation, secret-version drift alerts (in-use vs current), and treating "does every consumer refresh?" as a required step in the rotation runbook.`,
    relatedLessons: ["tls-handshake", "pg-connection-pooling", "three-pillars"],
  },

  {
    id: "cdn-cache-poisoning",
    title: "Bad cache key serves wrong content globally",
    severity: "SEV1",
    service: "cdn / web-frontend",
    symptom:
      "Users worldwide start seeing content meant for someone else -- wrong language, another user's cached dashboard fragment, stale pricing. The origin is serving correct responses, but the CDN keeps returning the wrong cached object.",
    tags: ["cdn", "cache", "cache-key", "vary", "poisoning", "stale"],
    dashboard: [
      { label: "Wrong-content reports/min", value: "540", status: "crit", spark: [0, 2, 40, 160, 320, 460, 520, 540] },
      { label: "CDN hit rate", value: "97", unit: "%", status: "warn", spark: [80, 82, 95, 97, 97, 97, 97, 97] },
      { label: "Origin error rate", value: "0.1", unit: "%", status: "ok", spark: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] },
      { label: "Distinct keys/URL", value: "1", status: "crit", spark: [6, 6, 4, 2, 1, 1, 1, 1] },
      { label: "Stale-served ratio", value: "high", status: "crit", spark: [1, 1, 2, 4, 6, 8, 9, 9] },
    ],
    logs: [
      "14:00 INFO  cdn config deploy: simplified cache key to just the path (dropped Accept-Language + auth-aware Vary)",
      "14:05 WARN  many users share one cache entry per URL now (key no longer varies by language/user context)",
      "14:06 ERROR /dashboard fragment cached from user A served to users B,C,D (personalized, should never be shared)",
      "14:07 WARN  origin Cache-Control on personalized responses missing 'private'/'no-store'",
      "14:08 INFO  origin responses are correct; the wrong object is coming from the CDN cache",
    ],
    terminal: [
      { cmd: "curl -sI https://example.com/dashboard -H 'Accept-Language: fr' | grep -i 'x-cache\\|content-language\\|vary'", output: "x-cache: HIT\ncontent-language: en    # requested fr, got en -- key no longer varies by language\nvary: (none)" },
      { cmd: "curl -sI https://example.com/dashboard -H 'Cookie: session=B' | grep -i 'x-cache\\|cache-control'", output: "x-cache: HIT\ncache-control: max-age=300   # personalized page served from a shared cache entry, no 'private'" },
      { cmd: "diff <(curl -s origin/dashboard -H 'Cookie: session=B') <(curl -s https://example.com/dashboard -H 'Cookie: session=B')", output: "< user: B\n> user: A   # CDN is serving A's cached copy to B" },
    ],
    hints: [
      "Origin responses are correct, yet users get the wrong content. So the bug is in what the CDN stores/returns, not in what the app generates.",
      "A CDN decides 'same request?' by its cache key. If the key is too coarse, different requests collapse onto one cached object and everyone gets whichever response got cached first.",
      "A config change dropped Accept-Language and auth/user context from the cache key (and Vary). Now one entry per URL is shared across languages and users -- so personalized/localized content leaks and goes stale globally.",
      "Immediate: revert the cache-key/Vary change and purge poisoned entries. Durable: never cache personalized responses in a shared cache (Cache-Control: private/no-store), and include the right dimensions (language, auth) in the key/Vary.",
    ],
    causeChoices: [
      { id: "c1", text: "The origin application is generating wrong responses" },
      { id: "c2", text: "A CDN config change made the cache key too coarse (dropped Accept-Language and user/auth context and Vary), so one shared cache entry per URL serves the wrong/stale content to everyone -- while origin stays correct" },
      { id: "c3", text: "The database is returning wrong rows" },
      { id: "c4", text: "A DDoS attack is altering responses" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Revert the cache-key/Vary change so entries vary by the right dimensions (language, auth context) again" },
      { id: "a2", text: "Purge/invalidate the poisoned cache entries so bad objects stop being served" },
      { id: "a3", text: "Turn the CDN off entirely and serve everything from origin forever" },
      { id: "a4", text: "Mark personalized responses Cache-Control: private/no-store so a shared cache can never store per-user content" },
      { id: "a5", text: "Lower TTLs to 1s so wrong content only lasts a second" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** a CDN config change **simplified the cache key to just the URL path**, dropping \`Accept-Language\` and user/auth context (and the corresponding \`Vary\`). The CDN identifies "the same request" by its cache key, so collapsing the key made **one shared cache entry per URL**. Whatever response happened to be cached first was then served to everyone: French users got English, and -- worse -- **personalized dashboard fragments from one user were served to others**, because those personalized responses also lacked \`Cache-Control: private\`. The origin was serving correct, per-request responses the whole time; the wrong object came purely from the CDN.

**Reading the signals:** **origin error rate ~0** while wrong-content reports exploded is the key contrast -- the app is fine, the *cache* is wrong. Response headers made it concrete: \`x-cache: HIT\` with \`content-language: en\` for a French request, and a diff showing user A's body returned to user B.

**Correct response:** (1) **revert the cache-key / Vary change** so entries vary by the dimensions that actually change the response (language, auth); (2) **purge the poisoned entries** so bad objects stop being served immediately; (3) mark **personalized responses \`private\`/\`no-store\`** so a shared edge cache can never store per-user content in the first place.

**Why NOT disable the CDN or set TTL=1s:** killing the CDN drops your capacity and latency protection, and a 1s TTL still serves wrong content (just briefly) and hammers origin. The fix is a *correct* cache key plus not caching private data in a shared tier.

**Prevention:** treat cache-key and \`Vary\` as security-sensitive config (review + staged rollout), default personalized responses to \`private\`, and add canaries that assert language/user isolation through the CDN, not just at origin.`,
    relatedLessons: ["caching-dual", "http-fundamentals", "load-balancing"],
  },

  {
    id: "backpressure-queue-overflow",
    title: "Producers outpace consumers; queue overflows",
    severity: "SEV1",
    service: "ingest-pipeline",
    symptom:
      "An upstream burst makes producers enqueue far faster than consumers can drain. The in-memory queue grows without bound, broker memory balloons, end-to-end latency explodes, and eventually messages are dropped or the process OOMs.",
    tags: ["backpressure", "queue", "overflow", "throughput", "memory", "flow-control"],
    dashboard: [
      { label: "Queue depth", value: "3.4M", status: "crit", spark: [1000, 20000, 120000, 500000, 1200000, 2200000, 3000000, 3400000] },
      { label: "Enqueue rate", value: "60k", unit: "/s", status: "crit", spark: [12000, 30000, 55000, 60000, 61000, 60000, 60000, 60000] },
      { label: "Dequeue rate", value: "18k", unit: "/s", status: "warn", spark: [12000, 15000, 17000, 18000, 18000, 18000, 18000, 18000] },
      { label: "Broker memory", value: "94", unit: "%", status: "crit", spark: [30, 40, 55, 68, 80, 88, 92, 94] },
      { label: "End-to-end p99", value: "42", unit: "s", status: "crit", spark: [0.2, 0.5, 2, 8, 20, 32, 39, 42] },
    ],
    logs: [
      "18:00 WARN  upstream burst: enqueue 60k/s vs steady dequeue 18k/s (consumers maxed out)",
      "18:05 WARN  queue depth 1.2M and rising; broker heap 80%",
      "18:09 ERROR broker: memory high-watermark reached; publishers should be throttled but producers ignore backpressure",
      "18:10 ERROR dropping/rejecting messages to protect broker (data loss beginning)",
      "18:11 INFO  producers have no rate limit / no bounded queue -- they push as fast as they can",
    ],
    terminal: [
      { cmd: "redis-cli llen ingest:queue", output: "(integer) 3421904" },
      { cmd: "kubectl top pod -l role=consumer", output: "NAME             CPU     MEM\nconsumer-1       990m    410Mi   # pegged at CPU limit, can't go faster\nconsumer-2       988m    404Mi\nconsumer-3       991m    398Mi" },
      { cmd: "grep -n 'publish\\|maxLen\\|blockWhenFull\\|rateLimit' src/producer.js", output: "14: await queue.publish(msg);   // fire-and-forget, no bound, no backpressure\n// no maxLen on the queue, no blocking/rejection when full, no producer rate limit" },
    ],
    hints: [
      "Enqueue is ~60k/s but dequeue is stuck at ~18k/s. The gap between the two rates is exactly what piles up in the queue every second.",
      "Consumers are pegged at their CPU limit -- they physically cannot drain faster. The queue is just the place the imbalance accumulates; it is not the root problem.",
      "There is no backpressure: producers publish fire-and-forget with no bound, no blocking when full, and no rate limit. So an imbalance grows without limit until memory runs out and messages get dropped.",
      "Fix both ends: apply backpressure (bounded queue that blocks/rejects producers, or producer rate limiting) so the system pushes back instead of piling up, and raise real drain capacity (scale/parallelize consumers, batch). Shedding load deliberately beats OOMing.",
    ],
    causeChoices: [
      { id: "c1", text: "A bug is duplicating every message" },
      { id: "c2", text: "Producers enqueue far faster than consumers can drain, and there is no backpressure (unbounded queue, no producer rate limit), so the queue grows without bound until memory is exhausted and messages are dropped" },
      { id: "c3", text: "The broker crashed on its own" },
      { id: "c4", text: "The network between producers and broker is down" },
    ],
    rootCauseId: "c2",
    actionChoices: [
      { id: "a1", text: "Apply backpressure: bound the queue so it blocks or rejects producers when full (and/or rate-limit producers) instead of accepting unlimited work" },
      { id: "a2", text: "Scale out / parallelize consumers and batch processing to raise the real drain rate toward the enqueue rate" },
      { id: "a3", text: "Just keep growing the queue / add more memory so it never fills" },
      { id: "a4", text: "Deliberately shed or sample lower-priority messages under overload so critical ones still flow, rather than OOMing and losing everything" },
      { id: "a5", text: "Restart the broker whenever memory gets high" },
    ],
    correctActionIds: ["a1", "a2", "a4"],
    postmortem: `**Root cause:** an upstream burst pushed the **enqueue rate (~60k/s) far above the sustainable dequeue rate (~18k/s)**, and the pipeline had **no backpressure** -- producers published fire-and-forget into an **unbounded queue** with no rate limit and no "block/reject when full." The per-second imbalance (~42k messages) accumulated in memory until the broker hit its high-water mark, end-to-end latency blew out to tens of seconds, and the system began **dropping messages** (data loss) or risking OOM. The queue wasn't the bug; it was where an unmanaged rate mismatch piled up.

**Reading the signals:** the two rate panels tell the whole story -- enqueue high and flat, dequeue pinned at a ceiling -- and \`kubectl top\` shows consumers **maxed at their CPU limit**, so they physically cannot drain faster. Rising queue depth + rising broker memory + exploding latency together are the classic backpressure-overflow signature.

**Correct response:** (1) **apply backpressure** -- bound the queue so it **blocks or rejects producers** when full (or rate-limit producers), so the system pushes back instead of hoarding work; (2) **raise real drain capacity** -- scale/parallelize consumers and batch processing so dequeue approaches enqueue; (3) under sustained overload, **deliberately shed or sample** lower-priority messages so critical traffic keeps flowing, rather than OOMing and losing everything indiscriminately.

**Why NOT just add memory:** an unbounded queue with a persistent rate mismatch will exhaust *any* amount of memory -- more buffer only delays the overflow and lengthens the latency tail. Flow control, not a bigger buffer, is the fix.

**Prevention:** design every producer/consumer boundary with a **bounded queue and an explicit overflow policy** (block, reject, or shed), monitor enqueue-vs-dequeue rate and queue-depth trend as leading indicators, and load-test the overload path so the system degrades on purpose instead of collapsing.`,
    relatedLessons: ["kafka-fundamentals", "background-jobs-dual", "slo-sli-error-budgets"],
  },
];

export const INCIDENT_BY_ID: Record<string, Incident> = Object.fromEntries(
  INCIDENTS.map((i) => [i.id, i])
);
