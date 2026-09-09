import type { Lesson } from "../types";

export const redisExtraLessons: Lesson[] = [
  {
    slug: "redis-eviction-ttl",
    title: "Redis Eviction & TTL",
    track: "shared",
    phase: "redis",
    module: "redis-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "How Redis expires keys lazily and actively, what happens when memory fills, and why choosing the wrong maxmemory policy turns a full cache into an outage.",
    prerequisites: ["redis-deep"],
    relatedConcepts: ["cache-invalidation", "distributed-locks", "caching-dual"],
    tags: ["redis", "ttl", "eviction", "maxmemory", "lru", "lfu"],

    why: `Memory is finite and every cached key competes for the same fixed RAM. If you never remove anything, Redis eventually fills up -- and what it does at that moment is entirely determined by settings most teams never touch. **Eviction and TTL exist to bound memory and keep the working set hot**: TTL removes stale data on a schedule you choose, and eviction decides who gets sacrificed when memory is full. Get this wrong and "the cache is full" silently becomes "every write throws an error" or "the box gets OOM-killed."`,

    intuition: `Think of Redis memory as a **small fridge shared by the whole office**. TTL is the "use by" date you write on each item -- past that date it gets thrown out whether or not anyone wanted it. Eviction is what happens when the fridge is full and someone still wants to add lunch: either you refuse the new item (noeviction), or you throw out whatever has been sitting untouched the longest (LRU) or is least popular overall (LFU). The default behavior of a brand-new fridge is often "refuse new items" -- which surprises people who assumed it would just make room.`,

    howItWorks: `### Two ways a key with a TTL disappears
- **Lazy expiration:** when you access a key, Redis checks if it is expired and deletes it then. Cheap, but a key nobody touches keeps occupying memory forever.
- **Active expiration:** a background cycle samples a handful of keys with TTLs ~10 times/second and deletes the expired ones. This bounds how much dead data lingers without scanning everything.

### When memory hits maxmemory
Redis consults \`maxmemory-policy\` before accepting a write that would exceed the limit:
- **noeviction** (historical default): reject writes with an error, reads still work.
- **allkeys-lru / allkeys-lfu:** evict from *all* keys by least-recently-used or least-frequently-used.
- **volatile-lru / volatile-lfu / volatile-ttl / volatile-random:** evict only among keys that *have* a TTL set.
- **allkeys-random / volatile-random:** evict at random (cheap, rarely what you want).

### LRU vs LFU
- **LRU** favors recently touched keys -- good for time-local access.
- **LFU** (Redis 4+) tracks approximate access frequency, so a key hammered all day survives a one-off scan that would evict it under LRU. Better for skewed, long-lived hot sets.

Redis uses **approximate** LRU/LFU: it samples \`maxmemory-samples\` keys and evicts the best candidate, trading perfect accuracy for speed.`,

    internals: `- **Setting a TTL costs a little memory** (the expiry is stored per key) but is almost always worth it -- keys without a TTL are invisible to \`volatile-*\` policies and can pin memory forever.
- **allkeys-lru is the safe default for a pure cache.** \`volatile-lru\` only evicts keys with TTLs, so if most of your keys have no TTL you can still hit "out of memory" errors even though the box is full of evictable-looking data.
- **Eviction is synchronous on the command that triggers it** -- a write that forces eviction pays for finding and deleting victims, so heavy eviction shows up as latency.
- **Expired-but-not-yet-collected keys still count toward memory** until lazy or active expiration removes them; a flood of same-TTL keys can create a collection spike.
- **maxmemory counts the dataset plus overhead** (buffers, replication backlog, client output buffers). Set it below the box's physical RAM (commonly ~75%) so those buffers do not push the process into the OOM killer.
- **On replicas, keys are not independently expired** -- the primary sends explicit DEL/UNLINK so replicas stay consistent; a replica will serve a logically-expired key until told otherwise if reads are served stale.`,

    diagram: {
      title: "Write path when memory is full",
      layers: [
        { id: "write", label: "Incoming write (SET)", sub: "would exceed maxmemory" },
        { id: "check", label: "used_memory >= maxmemory?", sub: "checked before accepting" },
        { id: "policy", label: "Consult maxmemory-policy", sub: "noeviction / allkeys-lru / volatile-* ..." },
        { id: "evict", label: "Sample + evict victims", sub: "approximate LRU/LFU over maxmemory-samples" },
        { id: "result", label: "Accept write OR return error", sub: "noeviction -> OOM command error" },
      ],
      caption: "The policy decides between making room and refusing the write. Choose it deliberately.",
    },

    realWorld: `A team runs Redis purely as a cache but left the default \`maxmemory-policy noeviction\`. Traffic grows, memory fills, and suddenly every \`SET\` returns "OOM command not allowed when used memory > maxmemory." The application, which treated cache writes as best-effort, now throws 500s on the write path even though reads are fine. The dataset was 100% disposable -- switching to \`allkeys-lru\` and setting a sane \`maxmemory\` turned a hard outage into invisible, automatic eviction. No code change, just a policy that matched intent.`,

    production: `- **Always set \`maxmemory\` explicitly**, below physical RAM, to leave headroom for buffers and forks.
- **Match the policy to the role:** pure cache -> \`allkeys-lru\` (or \`allkeys-lfu\` for skewed hot sets); mixed cache+durable keys -> \`volatile-lru\` and make sure the durable keys have *no* TTL.
- **Give cached keys a TTL** even under LRU -- it caps staleness and lets active expiration reclaim memory proactively.
- **Monitor \`evicted_keys\`, \`expired_keys\`, \`used_memory\` vs \`maxmemory\`, and hit rate.** Rising evictions with a falling hit rate means the working set no longer fits.
- **Prefer \`UNLINK\` over \`DEL\`** for large keys so freeing happens on a background thread instead of blocking.
- **Avoid identical TTLs on huge batches** to prevent synchronized expiry spikes -- add jitter.`,

    commonMistakes: [
      "Leaving the policy at noeviction on a pure cache, so a full cache errors on writes instead of evicting.",
      "Using volatile-lru while most keys have no TTL -- Redis runs out of evictable candidates and errors anyway.",
      "Setting maxmemory equal to (or above) physical RAM, leaving no room for buffers/fork and inviting the OOM killer.",
      "Never setting TTLs, so lazy expiration never runs and dead keys pin memory until eviction.",
      "Assigning the same TTL to a large batch of keys, causing a synchronized expiry and latency spike.",
    ],

    tradeoffs: `| Policy | Best for | Cost / risk |
|---|---|---|
| noeviction | Durable data you must never silently drop | Writes error when full -- outage for a cache |
| allkeys-lru | General-purpose cache | May evict a rarely-but-critically-used key |
| allkeys-lfu | Skewed, long-lived hot sets | Slightly more per-key bookkeeping |
| volatile-ttl | Mixed store, expire soonest-to-die first | Useless if durable keys also carry TTLs |`,

    whenToUse: [
      "Any Redis instance acting as a cache -- set maxmemory + an allkeys eviction policy.",
      "Bounding staleness of cached data with TTLs so entries refresh on a known cadence.",
      "Keeping a hot working set resident with LFU when access is highly skewed.",
    ],
    whenNotToUse: [
      "As durability control for a system of record -- eviction can drop data silently; use a real database.",
      "volatile-* policies when your durable and cacheable keys are not cleanly separated by TTL.",
      "Relying on TTL alone for correctness of derived data (you still need explicit invalidation on change).",
    ],

    memoryCard: {
      problem: "Bound Redis memory and keep the hot working set resident without erroring when full.",
      mentalModel: "A shared office fridge: 'use by' dates (TTL) and a rule for what to toss when it is full (eviction).",
      keyConcepts: ["lazy vs active expiration", "maxmemory + maxmemory-policy", "LRU vs LFU (approximate)", "allkeys vs volatile", "noeviction = writes error"],
      productionConnection: "Cache -> allkeys-lru with maxmemory below RAM; give keys TTLs; watch evicted_keys and hit rate.",
      oneLiner: "TTL removes keys on schedule and eviction decides who dies when memory is full -- pick allkeys-lru for a cache, never leave it on noeviction.",
    },

    quiz: [
      {
        id: "rex-ttl-q1",
        prompt: "Your pure-cache Redis returns 'OOM command not allowed' on writes. Most likely cause?",
        choices: [
          { text: "The disk is full", correct: false },
          { text: "maxmemory-policy is noeviction, so a full instance refuses writes instead of evicting", correct: true },
          { text: "Replication lag exceeded the threshold", correct: false },
          { text: "TTLs are too short", correct: false },
        ],
        explanation:
          "With noeviction, once used memory reaches maxmemory Redis rejects writes rather than making room. For a disposable cache, switch to allkeys-lru (or allkeys-lfu) so it evicts automatically.",
      },
      {
        id: "rex-ttl-q2",
        prompt: "How does Redis remove keys whose TTL has passed?",
        choices: [
          { text: "Only by scanning the entire keyspace once per minute", correct: false },
          { text: "Lazily on access, plus an active background cycle that samples keys with TTLs", correct: true },
          { text: "Immediately at the exact expiry instant via a per-key timer", correct: false },
          { text: "Never -- expired keys stay until manually deleted", correct: false },
        ],
        explanation:
          "Redis expires lazily (checked when a key is accessed) and actively (a background cycle samples TTL-bearing keys ~10x/sec). There is no per-key timer, so a key nobody touches lingers until the active cycle collects it.",
      },
      {
        id: "rex-ttl-q3",
        prompt: "Why might volatile-lru still return OOM errors on a full instance?",
        choices: [
          { text: "volatile-lru is not a real policy", correct: false },
          { text: "It can only evict keys that have a TTL; if most keys have none, there are no eligible victims", correct: true },
          { text: "It evicts too slowly to keep up", correct: false },
          { text: "It disables writes by design", correct: false },
        ],
        explanation:
          "volatile-* policies only consider keys with an expiry set. If your keys mostly lack TTLs, Redis runs out of evictable candidates and falls back to erroring -- use allkeys-lru for a pure cache.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Choose the right eviction policy",
      brief:
        "Given a Redis instance nearing maxmemory with a mix of TTL and non-TTL keys, diagnose the eviction behavior and pick a policy that matches intent.",
      steps: `1. Run INFO memory and note used_memory, maxmemory, and maxmemory_policy.\n2. Sample keys and check how many carry a TTL (TTL key returns -1 for none).\n3. Read INFO stats for evicted_keys, expired_keys, keyspace_hits/misses.\n4. Decide role: pure cache -> allkeys-lru/lfu; mixed -> separate durable keys (no TTL) and use volatile-lru.\n5. Set maxmemory below physical RAM and apply the policy; add TTL jitter to large batches.`,
      successCriteria: [
        "Correctly identify whether keys are evictable under the current policy",
        "Pick allkeys-lru/lfu for a pure cache",
        "Set maxmemory with headroom below physical RAM",
      ],
    },
  },

  {
    slug: "distributed-locks",
    title: "Distributed Locks with Redis",
    track: "shared",
    phase: "redis",
    module: "redis-core",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "How to build a mutual-exclusion lock across processes with SET NX PX, why the fencing token matters, and why a Redis lock is a coordination hint -- not a safety guarantee.",
    prerequisites: ["redis-deep"],
    relatedConcepts: ["redis-eviction-ttl", "cache-invalidation", "distributed"],
    tags: ["redis", "locks", "concurrency", "redlock", "fencing", "mutual-exclusion"],

    why: `Some work must happen once at a time across a fleet: run a nightly job on exactly one worker, stop two requests from double-charging a card, serialize edits to one resource. Within a single process a mutex suffices, but across many processes and machines there is no shared memory. **A distributed lock gives that mutual exclusion across the network** using a store all the nodes can reach. Redis is a common choice because acquiring and releasing a lock is a single fast atomic operation -- but the network makes correctness far subtler than a local mutex.`,

    intuition: `A distributed lock is a **single bathroom key hung on a hook in a shared hallway**. Whoever grabs the key gets exclusive use; everyone else waits. The problem: what if someone takes the key and never comes back (crashes)? So the key **self-expires** -- after N minutes it magically returns to the hook (the TTL). But now a new problem: if the first person is just *slow* (a long GC pause), the key can return to the hook and a second person grabs it while the first still thinks they hold it. Now two people believe they have exclusive access. The lock alone cannot prevent this -- you need a **fencing token** so the shared resource can reject the stale holder.`,

    howItWorks: `### Acquire: one atomic command
\`\`\`
SET lock:resource <unique-token> NX PX 30000
\`\`\`
- **NX** = set only if the key does not exist (so only one caller wins).
- **PX 30000** = auto-expire in 30s so a crashed holder cannot deadlock everyone.
- **<unique-token>** = a random value unique to this acquirer, used to release safely.

### Release: only if you still own it
You must not blindly \`DEL\` -- your lock may have expired and been re-acquired by someone else. Release atomically with a Lua script that checks the token first:
\`\`\`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
\`\`\`

### Fencing tokens (the part people skip)
Each successful acquire also returns a **monotonically increasing token** (e.g. from \`INCR lock:resource:fence\`). The caller passes that token to the protected resource on every write. The resource remembers the highest token it has seen and **rejects any write with a lower token** -- so a stale holder whose lock already expired cannot corrupt state even if it wakes up and acts.

### Single-node vs Redlock
The above targets a single Redis. **Redlock** tries to acquire the lock on a majority of N independent Redis nodes to survive one node failing; it is more robust to node loss but more complex and still debated for strict safety.`,

    internals: `- **The TTL is a bet on maximum work duration.** Too short and the lock expires mid-work (two holders); too long and a crashed holder blocks everyone for that duration. There is no universally safe value -- fencing tokens exist because you cannot win this bet reliably.
- **Clock and pause hazards:** a GC pause, a VM freeze, or slow I/O can make the holder stall past the TTL without knowing. Redis has no way to tell "slow" from "dead," so it releases the lock. Only the *resource* checking a fencing token can catch the resulting overlap.
- **Never release without checking ownership** -- a plain DEL can delete a lock a different worker now holds, silently breaking mutual exclusion.
- **Redlock's safety is contested:** it assumes bounded clock drift and process pauses; critics show that under large pauses it can still grant two holders. Use fencing tokens regardless of single-node vs Redlock.
- **Lock renewal (watchdog):** long jobs can periodically extend the TTL while alive, but renewal races with expiry, so it reduces -- not eliminates -- the overlap window.
- **A Redis lock is a liveness/efficiency tool, not a correctness primitive.** If double execution would be catastrophic, make the operation idempotent and/or fence it; do not trust the lock alone.`,

    diagram: {
      title: "Acquire, work, release with fencing",
      layers: [
        { id: "acq", label: "SET lock NX PX 30000", sub: "atomic: only one winner, auto-expiry" },
        { id: "fence", label: "INCR fence token", sub: "monotonic token returned to holder" },
        { id: "work", label: "Do the protected work", sub: "pass token to the resource on each write" },
        { id: "guard", label: "Resource rejects stale token", sub: "highest-token-wins guards against overlap" },
        { id: "rel", label: "Lua: DEL if token matches", sub: "release only if you still own it" },
      ],
      caption: "The lock provides mutual exclusion most of the time; the fencing token provides correctness always.",
    },

    realWorld: `A payments service uses a Redis lock so only one worker processes a given payout. One worker acquires the lock, then suffers a 40-second stop-the-world GC pause. The 30s TTL expires; a second worker acquires the lock and processes the payout. The first worker wakes up, still believing it holds the lock, and processes it again -- a double payout. The lock worked exactly as designed; the flaw was trusting it as a correctness guarantee. Adding a fencing token (the payout ledger rejects any write with a token lower than the highest it has seen) makes the stale worker's second attempt fail harmlessly.`,

    production: `- **Acquire with a single \`SET NX PX\`** carrying a unique token; never use SETNX + separate EXPIRE (not atomic -- a crash between them leaks a permanent lock).
- **Release with a Lua compare-and-delete**, never a bare DEL.
- **Add a fencing token** and enforce it at the protected resource whenever double execution is unsafe.
- **Size the TTL above your worst-case work time**, and consider a renewal watchdog for long jobs -- but still fence.
- **Make the protected operation idempotent** so an accidental double run is a no-op, not a disaster.
- **Prefer a stronger primitive** (a database unique constraint, a transactional queue, or ZooKeeper/etcd) when strict correctness matters more than speed.`,

    commonMistakes: [
      "Releasing a lock with DEL instead of a token-checked Lua script, deleting someone else's lock.",
      "Using SETNX then EXPIRE as two commands -- a crash in between leaves a lock with no TTL forever.",
      "Trusting the TTL to bound work time and skipping fencing tokens, so a GC pause yields two holders.",
      "Treating a Redis lock as a correctness guarantee for money/inventory instead of a coordination hint.",
      "Picking a TTL shorter than the real task duration, causing the lock to expire mid-work under load.",
    ],

    tradeoffs: `| Approach | Benefit | Cost / risk |
|---|---|---|
| Single-node SET NX PX | Simple, fast, one round trip | A single Redis failure loses the lock |
| Redlock (majority of N) | Survives one node failing | Complex; safety contested under pauses/clock skew |
| Fencing token | Makes overlap harmless | Requires the resource to validate tokens |
| DB unique constraint / etcd | Strong correctness | Slower, more coupling than a cache lock |`,

    whenToUse: [
      "Best-effort mutual exclusion where an occasional overlap is tolerable (dedupe a cron across workers).",
      "Reducing wasted duplicate work when combined with idempotent operations.",
      "Coordinating access to a resource that can itself validate a fencing token.",
    ],
    whenNotToUse: [
      "Guaranteeing exactly-once execution of financially critical work without a fencing token or idempotency.",
      "Situations demanding strict consensus -- use etcd/ZooKeeper or a database transaction instead.",
      "As a substitute for making the underlying operation idempotent.",
    ],

    memoryCard: {
      problem: "Mutual exclusion across processes and machines that have no shared memory.",
      mentalModel: "A single self-expiring bathroom key on a shared hook -- slow holders can still collide, so fence the resource.",
      keyConcepts: ["SET NX PX = atomic acquire + auto-expiry", "unique token + Lua compare-and-delete release", "fencing token = correctness", "TTL is a bet on work duration", "Redlock vs single node"],
      productionConnection: "Acquire with SET NX PX, release with token-checked Lua, add a fencing token, and make the operation idempotent.",
      oneLiner: "A Redis lock gives cheap mutual exclusion most of the time -- only a fencing token (or idempotency) gives correctness when a holder stalls past its TTL.",
    },

    quiz: [
      {
        id: "rex-lock-q1",
        prompt: "Why release a Redis lock with a Lua compare-and-delete instead of a plain DEL?",
        choices: [
          { text: "DEL is slower than Lua", correct: false },
          { text: "Your lock may have expired and been re-acquired; DEL would delete someone else's lock", correct: true },
          { text: "DEL cannot operate on string keys", correct: false },
          { text: "Lua scripts bypass the TTL", correct: false },
        ],
        explanation:
          "If your lock TTL expired and another worker acquired it, a bare DEL would remove their lock. Checking that the stored token still equals yours before deleting (atomically, in Lua) prevents releasing a lock you no longer own.",
      },
      {
        id: "rex-lock-q2",
        prompt: "A lock holder suffers a GC pause longer than the TTL. What actually prevents data corruption?",
        choices: [
          { text: "The TTL guarantees only one holder at a time", correct: false },
          { text: "A fencing token the resource validates, rejecting writes from the stale holder", correct: true },
          { text: "Redis detects the pause and refuses to release the lock", correct: false },
          { text: "The unique acquire token in the lock value", correct: false },
        ],
        explanation:
          "Once the TTL expires another worker can acquire the lock, so two holders can overlap. Redis cannot distinguish slow from dead. Only a monotonic fencing token, checked by the protected resource, makes the stale holder's writes harmless.",
      },
      {
        id: "rex-lock-q3",
        prompt: "Why is SETNX followed by a separate EXPIRE unsafe for locking?",
        choices: [
          { text: "EXPIRE resets the value", correct: false },
          { text: "The two commands are not atomic -- a crash between them leaves a lock with no expiry, deadlocking forever", correct: true },
          { text: "SETNX cannot store random tokens", correct: false },
          { text: "EXPIRE only works on hashes", correct: false },
        ],
        explanation:
          "If the process crashes after SETNX but before EXPIRE, the lock exists with no TTL and blocks everyone permanently. SET key val NX PX ms sets the value and expiry in one atomic command.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Build a safe lock with fencing",
      brief:
        "Design acquire/release for a Redis lock protecting a once-only job, then add a fencing token so a stalled holder cannot cause double execution.",
      steps: `1. Acquire: SET lock:job <randomToken> NX PX <ttl>. Confirm only one caller succeeds.\n2. On acquire, INCR lock:job:fence and capture the returned token.\n3. Pass the fence token to the protected resource on every write.\n4. Have the resource store the highest token seen and reject lower tokens.\n5. Release: run a Lua script that DELs only if GET equals your random token.\n6. Add idempotency so a rejected/retried run is a safe no-op.`,
      successCriteria: [
        "Acquire and release are each a single atomic operation",
        "Release checks ownership before deleting",
        "The resource rejects writes carrying a stale fencing token",
      ],
    },
  },

  {
    slug: "cache-invalidation",
    title: "Cache Invalidation",
    track: "shared",
    phase: "redis",
    module: "redis-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "Why keeping a cache consistent with its source of truth is genuinely hard: the common patterns (cache-aside, write-through, write-behind), the races that cause stale reads, and how TTL, stampedes, and versioned keys fit in.",
    prerequisites: ["redis-deep"],
    relatedConcepts: ["redis-eviction-ttl", "distributed-locks", "caching-dual"],
    tags: ["redis", "cache", "invalidation", "consistency", "stampede", "cache-aside"],

    why: `A cache is a second, faster copy of data that already lives somewhere authoritative. The moment the source changes, the copy is wrong -- and serving wrong data can be worse than serving slow data (a stale price, a deleted post reappearing, an old permission). **Cache invalidation is the discipline of removing or refreshing stale copies at the right time.** It is famously hard because the update to the database and the update/deletion in the cache are two separate operations that can interleave, fail independently, or race across many concurrent requests.`,

    intuition: `Picture a **whiteboard summary of a document that lives in a filing cabinet**. The whiteboard is fast to read, but every time someone edits the real document you must also erase the whiteboard -- and if you erase it and rewrite it in the wrong order relative to the edit, the board can end up showing an *older* version than the cabinet. That ordering trap is the heart of cache invalidation: it is not "when do I update the cache," it is "in what order, and what happens if two people edit at once."`,

    howItWorks: `### Cache-aside (lazy, the most common)
The application owns the cache. On read: check cache; on miss, load from DB, store in cache, return. On write: update the DB, then **delete** the cache entry (do not try to update it in place -- deletion is safer under races). Next read repopulates.

### Write-through
Writes go through the cache, which synchronously writes to the DB. The cache is always populated and consistent on write, at the cost of write latency and caching data that may never be read.

### Write-behind (write-back)
Writes hit the cache and are flushed to the DB asynchronously. Fast writes, but a crash can lose not-yet-flushed data -- only for tolerant workloads.

### The invalidation race
Even cache-aside has a classic race:
\`\`\`
Reader: cache miss -> reads OLD value from DB
Writer: writes NEW value to DB -> deletes cache key
Reader: writes the OLD value it read into the cache
\`\`\`
Now the cache holds the old value with no pending invalidation. Mitigations: short TTLs to bound the damage, delete-after-write plus a second delayed delete, or versioned keys so a stale write targets a dead key.

### TTL as a safety net
A TTL guarantees staleness is *bounded* even if an explicit invalidation is missed or lost. TTL and explicit invalidation are complementary, not alternatives.`,

    internals: `- **Delete, do not update, on write** in cache-aside. Two concurrent writers updating the cache can reorder and leave the older value resident; deletion converts that into a miss that reloads fresh.
- **The read-modify-write race above cannot be fully closed by cache-aside alone** -- it needs bounded TTLs, versioned keys (embed a version/updated_at in the key so stale writes land on an abandoned key), or transactional invalidation via a change stream.
- **Cache stampede / thundering herd:** when a hot key expires, thousands of concurrent requests all miss and hit the DB at once. Mitigate with a per-key lock so one request recomputes while others wait, request coalescing, or "early recompute" (refresh slightly before expiry).
- **Dogpile on rebuild:** related to stampede -- serving a stale value while a single background worker recomputes ("stale-while-revalidate") keeps latency flat.
- **Negative caching:** caching "not found" avoids repeatedly hammering the DB for missing keys, but must itself be invalidated when the row is created.
- **Distributed invalidation is best-effort:** if you must invalidate on many nodes/regions, use pub/sub or a change-data-capture stream; accept that propagation is eventually consistent and let TTL backstop it.`,

    diagram: {
      title: "Cache-aside read and write",
      layers: [
        { id: "read", label: "Read: check cache", sub: "hit -> return; miss -> load from DB then set" },
        { id: "write", label: "Write: update DB first", sub: "source of truth changes" },
        { id: "inval", label: "Then delete cache key", sub: "delete (not update) to avoid reorder races" },
        { id: "ttl", label: "TTL backstop", sub: "bounds staleness if a delete is missed" },
        { id: "stampede", label: "Guard on repopulate", sub: "per-key lock / stale-while-revalidate stops stampede" },
      ],
      caption: "Update the DB, then delete the key, and let TTL bound anything the delete misses.",
    },

    realWorld: `A product page caches the price with a 1-hour TTL and updates the cache in place on every price change. During a flash sale, two admins change the price within milliseconds; their cache updates arrive out of order and the cache sticks on the *higher* old price for up to an hour. Customers see the wrong price and checkout mismatches the cart. Two fixes together solve it: switch to delete-on-write (so the next read reloads the true price), and drop the TTL to a few minutes so even a missed delete self-heals quickly. Cache-aside plus deletion plus a short TTL is dramatically more robust than clever in-place updates.`,

    production: `- **Standardize on cache-aside with delete-on-write** for most read-heavy data; it is the simplest pattern that survives races.
- **Always attach a TTL**, even with explicit invalidation, so a missed or failed delete cannot leave permanently stale data.
- **Protect hot keys from stampede** with a per-key recompute lock or stale-while-revalidate; add TTL jitter so many keys do not expire together.
- **Version keys for critical data** (include updated_at or a version in the key) so stale writers cannot repopulate a live key.
- **Order operations deliberately:** write the DB first, then invalidate; if the invalidation can fail, log/retry it or rely on TTL.
- **For multi-region/multi-node**, propagate invalidations over pub/sub or CDC and treat propagation as eventually consistent.`,

    commonMistakes: [
      "Updating the cache in place on write instead of deleting it, allowing concurrent writers to leave a stale value resident.",
      "Relying only on explicit invalidation with no TTL, so a single missed delete strands stale data forever.",
      "Ignoring the read-repopulate race, where a slow reader writes back an old value after a writer already invalidated.",
      "No stampede protection, so a hot key expiring sends a thundering herd straight at the database.",
      "Giving a huge batch of keys the same TTL, causing synchronized expiry and a coordinated stampede.",
    ],

    tradeoffs: `| Pattern | Benefit | Cost / risk |
|---|---|---|
| Cache-aside + delete | Simple, race-tolerant, only caches read data | Read-repopulate race still needs TTL/versioning |
| Write-through | Cache always consistent on write | Higher write latency; caches unread data |
| Write-behind | Fast writes | Data loss on crash before flush |
| TTL only | Trivial, self-healing | Serves stale data up to the TTL window |`,

    whenToUse: [
      "Read-heavy data where a bounded window of staleness is acceptable -- use cache-aside + delete + TTL.",
      "Hot keys that need stampede protection via locking or stale-while-revalidate.",
      "Critical fields where versioned keys prevent stale repopulation.",
    ],
    whenNotToUse: [
      "Data that must be strictly consistent on every read (read from the source of truth or use transactional caching).",
      "Write-behind for data you cannot afford to lose on a crash.",
      "Caching at all when the source is already fast enough and staleness is unacceptable.",
    ],

    memoryCard: {
      problem: "Keep a fast cached copy consistent with its authoritative source despite concurrent writes and failures.",
      mentalModel: "A whiteboard summary of a filed document: edit the document, then erase the board -- and mind the order.",
      keyConcepts: ["cache-aside vs write-through vs write-behind", "delete-on-write, not update", "read-repopulate race", "TTL as backstop", "stampede / stale-while-revalidate", "versioned keys"],
      productionConnection: "Cache-aside + delete-on-write + a TTL + stampede protection covers the vast majority of real caches.",
      oneLiner: "Invalidate by deleting after the DB write, always keep a TTL backstop, and guard hot keys against stampedes -- clever in-place updates lose to races.",
    },

    quiz: [
      {
        id: "rex-inval-q1",
        prompt: "In cache-aside, why delete the cache key on write instead of updating it in place?",
        choices: [
          { text: "Deletion is faster than SET in Redis", correct: false },
          { text: "Concurrent in-place updates can reorder and leave the older value resident; deletion forces a fresh reload", correct: true },
          { text: "Redis cannot overwrite an existing key", correct: false },
          { text: "Updating in place bypasses the TTL", correct: false },
        ],
        explanation:
          "Two writers updating the cache can have their SETs arrive out of order relative to the DB writes, stranding an old value. Deleting the key turns the next read into a miss that reloads the current value from the source of truth.",
      },
      {
        id: "rex-inval-q2",
        prompt: "Why keep a TTL even when you explicitly invalidate on every write?",
        choices: [
          { text: "TTLs make reads faster", correct: false },
          { text: "It bounds staleness if an explicit invalidation is ever missed, delayed, or lost", correct: true },
          { text: "Explicit invalidation does not work in Redis", correct: false },
          { text: "TTLs prevent cache stampedes on their own", correct: false },
        ],
        explanation:
          "Explicit invalidation can fail (crash, network, bug). A TTL guarantees any stale entry self-heals within a bounded window, so the two mechanisms are complementary rather than redundant.",
      },
      {
        id: "rex-inval-q3",
        prompt: "A hot key expires and thousands of requests hit the DB at once. What is this and a fix?",
        choices: [
          { text: "Eviction; raise maxmemory", correct: false },
          { text: "A cache stampede; use a per-key recompute lock or stale-while-revalidate so one request rebuilds while others wait/serve stale", correct: true },
          { text: "Replication lag; add a replica", correct: false },
          { text: "A TTL bug; remove all TTLs", correct: false },
        ],
        explanation:
          "This is a cache stampede (thundering herd). Serialize the recompute with a lock, coalesce requests, serve a stale value while a single worker refreshes, and add TTL jitter so keys do not all expire together.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Harden a cache-aside path",
      brief:
        "Take a naive cache that updates in place with a long TTL and redesign it to survive write races and stampedes.",
      steps: `1. Switch writes to: update the DB, then DELETE the cache key (not SET).\n2. Attach a moderate TTL to every cached entry as a backstop, with per-key jitter.\n3. Add a per-key lock (SET NX) around repopulation so only one request rebuilds a missed hot key.\n4. Optionally serve the previous value (stale-while-revalidate) while the rebuild runs.\n5. For critical fields, embed updated_at/version in the key so a slow reader cannot repopulate a live key.`,
      successCriteria: [
        "Writes delete rather than update the cache entry",
        "Every entry has a TTL backstop with jitter",
        "Hot-key repopulation is serialized to prevent a stampede",
      ],
    },
  },
];
