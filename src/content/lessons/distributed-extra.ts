import type { Lesson } from "../types";

export const distributedExtraLessons: Lesson[] = [
  {
    slug: "consensus-raft",
    title: "Consensus & Raft",
    track: "shared",
    phase: "distributed",
    module: "dist-core",
    difficulty: "expert",
    estMinutes: 28,
    summary:
      "How a group of unreliable machines agrees on a single, ordered sequence of operations -- the foundation under etcd, Consul, and every leader election you rely on.",
    prerequisites: ["cap-theorem"],
    relatedConcepts: ["consistency-models", "cap-theorem", "sharding-partitioning", "idempotency-retries"],
    tags: ["consensus", "raft", "leader-election", "replication", "distributed", "quorum"],

    why: `The moment you replicate state across machines to survive failure, you create a new problem: **which copy is the truth?** If two nodes both think they are in charge and both accept writes, you get split brain -- two divergent histories that can never be safely merged. Money is double-spent, locks are held twice, configuration flaps.

**Consensus exists to let a group of unreliable machines agree on a single, ordered log of operations, even while some of them crash or the network drops messages.** Raft is the algorithm most systems use because it was explicitly designed to be *understandable* (its predecessor, Paxos, is notoriously hard to reason about). When you run etcd, Consul, CockroachDB, or a Kafka controller quorum, you are running Raft or a close cousin. Understanding it is what separates "the cluster is down and I do not know why" from "we lost quorum, here is the fix."`,

    intuition: `Think of a **committee that must keep one shared notebook perfectly in sync**, where members can fall asleep at any moment and messages between them can get lost.

- To avoid chaos, the committee elects **one leader** who alone writes to the notebook. Everyone else copies from the leader.
- The leader only counts an entry as "official" (committed) once **a majority** of members have written it down. A majority guarantees any future majority overlaps by at least one member who remembers the entry.
- If the leader falls asleep, the others notice (no heartbeat), wait a random moment so they do not all shout at once, and hold an **election** for a new leader.
- A candidate wins only if a **majority** votes for it, and members refuse to vote for anyone whose notebook is behind their own. That rule is what stops a stale node from becoming leader and erasing committed history.

The whole trick is "majority overlap": any two majorities of an odd-sized group share at least one member, so committed knowledge can never be lost as long as a majority survives.`,

    howItWorks: `Raft breaks consensus into three sub-problems: **leader election, log replication, and safety.**

### 1. Roles and terms
Every node is a **follower**, **candidate**, or **leader**. Time is divided into **terms** -- monotonically increasing numbers that act as a logical clock. Each term has at most one leader. A higher term always wins; seeing a higher term forces any node back to follower.

### 2. Leader election
Followers expect periodic **heartbeats** from the leader. If a follower's randomized **election timeout** (e.g. 150-300ms) elapses with no heartbeat, it becomes a candidate, increments the term, votes for itself, and requests votes. It wins with a **majority**. Randomized timeouts make simultaneous candidacies (split votes) rare; a split vote just triggers a new randomized round.

### 3. Log replication
Clients send commands to the leader. The leader appends the command to its log and sends **AppendEntries** to followers. Once a **majority** have persisted the entry, the leader marks it **committed** and applies it to the state machine, then tells followers to apply it too. Every replica applies the same commands in the same order, so every replica reaches the same state -- this is **replicated state machine** semantics.

### 4. Safety
The **Election Restriction** guarantees a node cannot win an election unless its log is at least as up to date as the majority that elects it. Combined with majority commit, this means **a committed entry is present in every future leader's log** -- it can never be lost or reordered.`,

    internals: `- **Quorum math:** commit needs \`floor(N/2) + 1\` nodes. A 3-node cluster tolerates 1 failure; 5 tolerates 2. **Even-sized clusters are wasteful** -- 4 nodes still only tolerate 1 failure but cost more, so run odd sizes.
- **Why odd:** any two majorities of an odd cluster overlap, so the node holding a committed entry is guaranteed to be in the next election's majority.
- **Log matching property:** if two logs share an entry at the same index and term, all preceding entries are identical. Followers reject AppendEntries that do not line up, and the leader walks \`nextIndex\` backward to find the point of agreement, then overwrites the follower's divergent tail.
- **Persistence before ack:** currentTerm, votedFor, and log entries must be flushed to stable storage before responding, or a crash-restart could violate safety (e.g. vote twice in one term).
- **Split brain is prevented, not ignored:** an isolated old leader can still accept client requests, but it can never reach a majority to commit them, so those writes never become official. When it rejoins and sees a higher term, it steps down and its uncommitted tail is discarded.
- **Read consistency:** a naive read from the leader can be stale if it was just deposed. Raft uses **lease reads** or a **read-index** (confirm leadership via a heartbeat round) to serve linearizable reads.
- **Membership changes** use joint consensus (two overlapping configurations) so the cluster never has two disjoint majorities mid-reconfiguration.`,

    diagram: {
      title: "Raft: leader replicates to a majority before commit",
      layers: [
        { id: "client", label: "Client", sub: "sends command to the leader only" },
        { id: "leader", label: "Leader (term N)", sub: "appends entry, sends AppendEntries" },
        { id: "quorum", label: "Majority persists entry", sub: "floor(N/2)+1 acks -> committed" },
        { id: "apply", label: "Apply to state machine", sub: "all replicas apply in the same order" },
        { id: "election", label: "Leader dies -> election", sub: "randomized timeout, majority vote, log-up-to-date wins" },
      ],
      caption: "Nothing is official until a majority has it; majority overlap is why committed history survives leader changes.",
    },

    realWorld: `Your Kubernetes cluster suddenly refuses all API writes -- \`kubectl apply\` hangs, but reads sometimes work. The control plane's etcd is a 3-node Raft cluster, and one node's disk filled up while a second was down for patching. With only one healthy node, etcd **cannot form a majority (2 of 3)**, so it stops committing writes to stay consistent (CP by design). The API server can still serve cached reads but cannot accept changes. The fix is not "restart the API server" -- it is "restore a second etcd member so quorum returns." This is why on-call runbooks for etcd/Consul/ZooKeeper always start with "how many members are healthy?" -- quorum loss is the single most common cause of a mysteriously frozen control plane.`,

    production: `- **Run odd-sized clusters (3 or 5).** 3 for most; 5 when you need to tolerate 2 simultaneous failures. Beyond 5, write latency suffers because every commit waits on more nodes.
- **Spread members across failure domains** (AZs), but beware cross-region latency: every commit costs a round trip to the slowest node in the majority.
- **Monitor quorum health and leader elections.** Frequent elections ("leader flapping") signal disk latency, GC pauses, or network jitter starving heartbeats -- tune election timeouts above your p99 heartbeat RTT.
- **Protect the disk.** Raft fsyncs on the commit path; a slow or full disk stalls the whole cluster. Give etcd its own fast disk.
- **Do backups and understand disaster recovery.** If you lose quorum permanently, you restore from a snapshot -- know that procedure before the incident.
- **Never run 2-node "HA."** It tolerates zero failures (majority of 2 is 2) and doubles your split-brain risk.`,

    commonMistakes: [
      "Running an even number of nodes (e.g. 4), which adds cost without adding fault tolerance over 3.",
      "Treating a 2-node cluster as highly available -- it cannot tolerate a single failure and is worse than 1 node for availability.",
      "Assuming reads from the leader are always fresh; a just-deposed leader can serve stale data without read-index/lease reads.",
      "Confusing quorum loss (frozen writes, working reads) with a total outage, and restarting the wrong component.",
      "Putting Raft members on slow or shared disks, causing fsync stalls that trigger endless leader elections.",
      "Placing all members far apart for 'geo-redundancy' and being surprised by high write latency (every commit waits on the majority).",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| More nodes (5 vs 3) | Tolerate more simultaneous failures | Higher write latency (larger majority) |
| Odd cluster size | Maximum fault tolerance per node | Must plan membership carefully |
| Leader-based (Raft) | Simple mental model, strong ordering | Leader is a throughput bottleneck; election gaps cause brief write unavailability |
| Linearizable reads | Always fresh | Extra round trip (read-index) or lease complexity |
| CP behavior on partition | No split brain, no lost writes | Minority side is unavailable for writes |`,

    whenToUse: [
      "Coordination and metadata that must be strongly consistent: service discovery, leader election, distributed locks, config, schedulers.",
      "Systems where a single agreed-upon ordered log of operations is the source of truth (etcd, Consul, controller quorums).",
      "Anywhere split brain would cause correctness disasters (double-spends, duplicate locks).",
    ],
    whenNotToUse: [
      "High-throughput, high-availability data that can tolerate eventual consistency (use AP stores like Cassandra/Dynamo instead).",
      "Cross-region low-latency writes where paying a majority round trip per commit is unacceptable.",
      "Storing large volumes of data -- consensus logs are for coordination and metadata, not bulk storage.",
    ],

    code: [
      {
        label: "Raft node state (the fields that must survive a crash)",
        language: "typescript",
        code: `// Persistent state -- MUST be flushed to disk before responding to RPCs.
interface PersistentState {
  currentTerm: number;    // latest term this node has seen
  votedFor: string | null; // candidate voted for in currentTerm (prevents double-voting)
  log: LogEntry[];        // replicated commands; index + term identify each entry
}

// Volatile state -- safe to lose on restart, rebuilt from the log.
interface VolatileState {
  commitIndex: number;    // highest entry known committed (majority-persisted)
  lastApplied: number;    // highest entry applied to the state machine
}

// Leader-only volatile state -- one entry per follower.
interface LeaderState {
  nextIndex: Record<string, number>;  // next log index to send each follower
  matchIndex: Record<string, number>; // highest index known replicated on each follower
}

interface LogEntry { term: number; index: number; command: unknown; }`,
      },
      {
        label: "Commit rule: an entry is committed once a majority has it",
        language: "typescript",
        code: `function tryAdvanceCommitIndex(
  leader: LeaderState,
  log: LogEntry[],
  currentTerm: number,
  peerCount: number,
): number {
  const majority = Math.floor((peerCount + 1) / 2) + 1; // include self
  // Find the highest index replicated on a majority, from the CURRENT term.
  for (let idx = log.length - 1; idx >= 0; idx--) {
    if (log[idx].term !== currentTerm) break; // safety: only commit current-term entries directly
    const replicas =
      1 + Object.values(leader.matchIndex).filter((m) => m >= idx).length;
    if (replicas >= majority) return idx; // committed
  }
  return -1;
}`,
      },
    ],

    memoryCard: {
      problem: "Get unreliable, occasionally-crashing machines to agree on one ordered log of operations without split brain.",
      mentalModel: "A committee with a single leader writing one shared notebook; an entry is official only once a majority has copied it.",
      keyConcepts: ["leader election + terms", "majority quorum = floor(N/2)+1", "replicated state machine", "log matching + election restriction", "quorum loss freezes writes", "read-index/lease for fresh reads"],
      productionConnection: "etcd/Consul/CockroachDB run Raft; odd cluster sizes, fast disks, and quorum monitoring keep control planes writable.",
      oneLiner: "Raft elects one leader and commits an entry only when a majority stores it, so committed history survives any minority failure.",
    },

    quiz: [
      {
        id: "raft-q1",
        prompt: "A 5-node Raft cluster loses 3 nodes. What happens to writes?",
        choices: [
          { text: "Writes continue; the 2 survivors form a new majority", correct: false },
          { text: "Writes stop, because no majority (3 of 5) can be formed to commit entries", correct: true },
          { text: "The cluster automatically shrinks to a 2-node majority", correct: false },
          { text: "Writes continue but reads stop", correct: false },
        ],
        explanation: "A 5-node cluster needs 3 nodes for a majority. With only 2 survivors it cannot commit, so it stops accepting writes to avoid split brain. It tolerates at most 2 failures.",
      },
      {
        id: "raft-q2",
        prompt: "Why does Raft require a candidate's log to be at least as up to date as the majority that elects it?",
        choices: [
          { text: "To make elections faster", correct: false },
          { text: "So a committed entry is guaranteed to survive in every future leader, preventing lost writes", correct: true },
          { text: "To reduce network traffic during heartbeats", correct: false },
          { text: "Because followers cannot store logs", correct: false },
        ],
        explanation: "The election restriction ensures any new leader already holds every committed entry. Since commits require a majority and majorities overlap, a stale node cannot win and erase committed history.",
      },
      {
        id: "raft-q3",
        prompt: "Why are odd cluster sizes (3, 5) preferred over even ones (4)?",
        choices: [
          { text: "Odd sizes use less memory", correct: false },
          { text: "A 4-node cluster tolerates the same 1 failure as 3 but costs more; odd sizes maximize fault tolerance per node", correct: true },
          { text: "Even clusters cannot elect a leader at all", correct: false },
          { text: "Odd sizes have no leader elections", correct: false },
        ],
        explanation: "Fault tolerance is floor(N/2). N=3 and N=4 both tolerate 1 failure; N=5 tolerates 2. The extra node in an even cluster adds latency and cost without more tolerance.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Reason about quorum and failure tolerance",
      brief: "For clusters of size 1, 2, 3, 4, and 5, compute the majority size and how many failures each tolerates, then explain a frozen-write incident.",
      steps: `1. For each N, compute majority = floor(N/2)+1 and tolerance = N - majority.\n2. Tabulate: which sizes are wasteful (same tolerance as the smaller odd size)?\n3. Explain why a 2-node cluster is worse than a 1-node cluster for availability.\n4. Scenario: a 3-node etcd loses 2 members. Predict read behavior vs write behavior.\n5. State the recovery action (restore a member to regain majority) and why restarting the API server does not help.`,
      successCriteria: [
        "Correct majority/tolerance table for N=1..5",
        "Identifies even sizes as wasteful",
        "Explains that quorum loss freezes writes while cached reads may still work",
      ],
    },
  },

  {
    slug: "consistency-models",
    title: "Consistency Models",
    track: "shared",
    phase: "distributed",
    module: "dist-core",
    difficulty: "expert",
    estMinutes: 26,
    summary:
      "The precise contract about what a read is allowed to return -- from linearizable (single-copy illusion) down to eventual -- and how to pick the weakest model your correctness actually needs.",
    prerequisites: ["cap-theorem"],
    relatedConcepts: ["cap-theorem", "consensus-raft", "sharding-partitioning", "idempotency-retries"],
    tags: ["consistency", "linearizability", "eventual", "causal", "read-your-writes", "distributed"],

    why: `"Is the data consistent?" is a meaningless question until you define *what a read is promised to return*. **A consistency model is that promise** -- a precise contract between the storage system and the application about which values a read may legally observe, given the writes that happened before it.

Getting this wrong is the source of maddening bugs: a user updates their profile, refreshes, and sees the old value; a bank shows a deposit on one screen and not another; two services read the same key and disagree. **Stronger models make these bugs impossible but cost latency and availability; weaker models are fast and highly available but push correctness work onto you.** Choosing the *weakest model your correctness actually requires* is one of the highest-leverage design decisions in a distributed system.`,

    intuition: `Imagine a **shared whiteboard copied into several rooms**, with a courier syncing changes between them.

- **Linearizable:** there is effectively one whiteboard. The instant you write, everyone everywhere sees it. Feels like a single machine -- but the courier must run and be confirmed before your write "counts," which is slow.
- **Sequential:** everyone sees writes in the *same order*, but not necessarily the instant they happen. Two people agree on the story; they might be a little behind.
- **Causal:** if write B was made after seeing write A, no one ever sees B without A. Cause always precedes effect, but unrelated writes can appear in any order.
- **Read-your-writes:** you always see your own edits, even if others lag. (Your room's copy is updated first.)
- **Eventual:** if everyone stops writing, all rooms converge -- eventually. Until then, any room may show stale or out-of-order values.

The models form a ladder. Higher rungs are easier to program against; lower rungs are cheaper and stay available during trouble.`,

    howItWorks: `Consistency models are a spectrum from **strong** to **weak**:

### Strong
- **Linearizability (single-object):** every operation appears to take effect atomically at some instant between its call and return, consistent with real time. Once a write returns, all later reads see it (or a newer value). This is CAP's "C."
- **Serializability (multi-object, transactional):** transactions appear to execute in *some* serial order. **Strict serializability** = serializable + linearizable real-time order.

### Intermediate
- **Sequential consistency:** all nodes see operations in one common order that respects each client's own program order -- but not necessarily wall-clock order.
- **Causal consistency:** operations that are causally related (one could have influenced the other) are seen in the same order by all; concurrent operations may be ordered differently per node. Often the sweet spot: preserves cause/effect without global coordination.

### Client-centric (session) guarantees
- **Read-your-writes**, **monotonic reads** (never go backward in time), **monotonic writes**, **writes-follow-reads**. Cheap, and often exactly what users perceive as "correct."

### Weak
- **Eventual consistency:** replicas converge if writes stop. No ordering or recency promise in the meantime. Conflicts are resolved by strategies like **last-write-wins** (can lose data) or **CRDTs / merge functions** (mathematically convergent).`,

    internals: `- **Linearizability is per-object; serializability is per-transaction.** They are orthogonal: you can have one without the other. "Strict serializability" is both, and is the gold standard (and the most expensive).
- **The cost of strong consistency is coordination.** Linearizable writes typically need a consensus round (Raft/Paxos) or a quorum with real-time ordering, i.e. a majority round trip per operation -- exactly PACELC's "else -> Consistency costs Latency."
- **Quorum tuning:** with N replicas, if read quorum R + write quorum W > N, a read overlaps every write and you get strong reads. \`R=W=1\` is fast but eventual; \`R+W>N\` (e.g. QUORUM in Cassandra) is strong. This is the per-operation knob CAP hints at.
- **Read-your-writes is often faked cheaply** by routing a user to the same replica or by remembering the last write timestamp and reading a replica at least that fresh -- far cheaper than global linearizability.
- **Eventual consistency needs conflict resolution.** Last-write-wins silently drops concurrent updates; **CRDTs** (counters, sets, sequences) merge deterministically without coordination and are how collaborative apps and shopping carts stay both available and correct.
- **Anomalies to name in review:** stale read, non-monotonic read (time going backward), lost update, causal violation (seeing a reply before the message).`,

    diagram: {
      title: "The consistency ladder (strong -> weak)",
      layers: [
        { id: "lin", label: "Linearizable / strict serializable", sub: "single-copy illusion, real-time order; needs consensus/quorum" },
        { id: "seq", label: "Sequential / serializable", sub: "one agreed order, not necessarily real-time" },
        { id: "causal", label: "Causal", sub: "cause precedes effect; concurrent ops may reorder" },
        { id: "session", label: "Session guarantees", sub: "read-your-writes, monotonic reads -- cheap, user-perceived correctness" },
        { id: "eventual", label: "Eventual", sub: "converges if writes stop; fast, HA, needs conflict resolution" },
      ],
      caption: "Pick the lowest rung that still makes your correctness bugs impossible; every rung up costs latency or availability.",
    },

    realWorld: `A social app stores posts in an eventually-consistent, multi-region store for availability. A user edits their display name, then immediately loads their profile page served from a nearby read replica that has not yet received the write -- they see the *old* name and file a bug: "your app lost my change." The data was never lost; the read simply raced the replication. The fix is not full linearizability (which would add a cross-region round trip to every read) but a **read-your-writes session guarantee**: after a write, route that user's reads to the primary (or a replica confirmed to be at least as fresh) for a short window. **The right model here is a targeted session guarantee, not global strong consistency** -- cheaper, and it fixes exactly what the user perceives.`,

    production: `- **Default to the weakest model that keeps you correct**, then strengthen specific operations. Global strong consistency by default is a common, expensive mistake.
- **Use strong/linearizable for uniqueness, balances, inventory, locks, leader metadata.** Use consensus or \`R+W>N\` quorums there.
- **Use session guarantees (read-your-writes, monotonic reads) to fix the vast majority of "it showed me stale data" user complaints** without paying for linearizability.
- **For high-availability collaborative or counter-like data, use CRDTs or explicit merge functions** instead of last-write-wins, which silently drops updates.
- **Make the model explicit in design docs and per-endpoint.** "This read is eventually consistent, up to ~500ms stale" is a real, reviewable contract.
- **Tune read/write quorums per query** where the store allows (Cassandra ONE vs QUORUM, Dynamo eventual vs strong reads).`,

    commonMistakes: [
      "Asking 'is it consistent?' without specifying the model -- the question is undefined without a contract.",
      "Confusing linearizability (single-object real-time) with serializability (transaction ordering); they are orthogonal.",
      "Reaching for global strong consistency when a cheap read-your-writes session guarantee would fix the actual bug.",
      "Using last-write-wins and silently losing concurrent updates instead of a CRDT or merge function.",
      "Assuming a read replica is current; replication lag means replicas are eventually consistent by default.",
      "Setting R=W=1 for correctness-critical data and being surprised by lost updates and stale reads.",
    ],

    tradeoffs: `| Model | Benefit | Cost |
|---|---|---|
| Linearizable | Single-copy illusion; simplest to reason about | Coordination/quorum round trip per op; unavailable under partition (CP) |
| Serializable txns | Correct multi-object invariants | Contention, aborts, latency |
| Causal | Preserves cause/effect without global order | More metadata; concurrent ops still ambiguous |
| Session guarantees | Fixes user-perceived staleness cheaply | Only per-session; not global truth |
| Eventual | Fast, highly available, partition-tolerant | Stale reads, needs conflict resolution, complex to reason about |`,

    whenToUse: [
      "Linearizable/serializable: money, inventory, uniqueness constraints, locks, coordination metadata.",
      "Causal: messaging, comment threads, social graphs where cause-before-effect must hold.",
      "Session guarantees: user-facing reads right after that user's own write.",
      "Eventual + CRDT: collaborative editing, counters, carts, telemetry -- availability over freshness.",
    ],
    whenNotToUse: [
      "Do not use eventual consistency for balances, inventory, or uniqueness -- silent corruption.",
      "Do not pay for global linearizability on tolerant, high-read data (needless latency).",
      "Do not rely on last-write-wins where concurrent updates carry independent information.",
    ],

    code: [
      {
        label: "Read-your-writes via a per-session freshness token",
        language: "typescript",
        code: `// After a write, the store returns the log position (version) of that write.
// The client caches it and demands reads be at least that fresh.
async function updateProfile(userId: string, name: string) {
  const { version } = await store.write(userId, { name });
  session.set("minVersion:" + userId, version); // remember our own write
}

async function readProfile(userId: string) {
  const minVersion = session.get("minVersion:" + userId);
  // Route to a replica whose applied version >= minVersion, else the primary.
  return store.read(userId, { atLeastVersion: minVersion });
  // Cheap: no global coordination, yet the user always sees their own edit.
}`,
      },
      {
        label: "Quorum rule for strong reads without full linearizability",
        language: "typescript",
        code: `// Dynamo/Cassandra-style tunable consistency.
// If read quorum R + write quorum W > N, every read set overlaps every write set,
// so a read is guaranteed to observe the latest acknowledged write.
function isStronglyConsistent(N: number, R: number, W: number): boolean {
  return R + W > N && W > N / 2; // W > N/2 also prevents two conflicting writes committing
}

isStronglyConsistent(3, 2, 2); // true  -> QUORUM reads+writes on 3 replicas
isStronglyConsistent(3, 1, 1); // false -> fast but eventually consistent`,
      },
    ],

    memoryCard: {
      problem: "Define precisely what values a read is allowed to return, so distributed reads are correct and reasoned-about, not accidental.",
      mentalModel: "A whiteboard copied into several rooms with a courier syncing; the model is how fresh and ordered each room's copy is promised to be.",
      keyConcepts: ["linearizable vs serializable (orthogonal)", "causal consistency", "session guarantees (read-your-writes, monotonic reads)", "eventual + CRDT/merge", "R+W>N for strong reads", "pick the weakest correct model"],
      productionConnection: "Strong for money/locks, session guarantees to fix stale-read complaints, CRDTs for available collaborative data; tune quorums per query.",
      oneLiner: "A consistency model is the contract for what a read may return; choose the weakest one that still makes your correctness bugs impossible.",
    },

    quiz: [
      {
        id: "cons-q1",
        prompt: "A user updates their name, refreshes, and sees the old name from a lagging replica. What is the cheapest correct fix?",
        choices: [
          { text: "Make every read in the system linearizable", correct: false },
          { text: "A read-your-writes session guarantee: serve that user's reads from a replica at least as fresh as their write", correct: true },
          { text: "Disable all read replicas", correct: false },
          { text: "Switch the database to last-write-wins", correct: false },
        ],
        explanation: "The user only needs to see their own write. A session guarantee (route to primary or a sufficiently-fresh replica after a write) fixes the perceived bug without the cost of global linearizability.",
      },
      {
        id: "cons-q2",
        prompt: "How do linearizability and serializability relate?",
        choices: [
          { text: "They are the same thing", correct: false },
          { text: "They are orthogonal: linearizability is single-object real-time order, serializability is transaction ordering; strict serializability is both", correct: true },
          { text: "Serializability is weaker than eventual consistency", correct: false },
          { text: "Linearizability only applies to SQL", correct: false },
        ],
        explanation: "Linearizability concerns a single object appearing to change atomically in real time; serializability concerns transactions appearing to run in some serial order. Strict serializability combines both and is the strongest (and costliest) model.",
      },
      {
        id: "cons-q3",
        prompt: "Why is last-write-wins risky for eventually-consistent data?",
        choices: [
          { text: "It is too slow", correct: false },
          { text: "Concurrent updates carrying independent information are silently dropped in favor of one 'winner'", correct: true },
          { text: "It requires linearizability to work", correct: false },
          { text: "It only works on a single node", correct: false },
        ],
        explanation: "LWW picks one write and discards the others, so two concurrent edits that each added distinct data lose information. CRDTs or explicit merge functions converge without dropping updates.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Assign a consistency model per data domain",
      brief: "Given account balance, shopping cart, chat messages, user profile name, and analytics events, pick the weakest sufficient consistency model for each and justify it.",
      steps: `1. For each domain, ask: what user-visible bug appears if a read is stale or two writes conflict?\n2. Balance/inventory/uniqueness -> linearizable/serializable (correctness critical).\n3. Chat messages -> causal (must not see a reply before its message).\n4. Profile name -> eventual + read-your-writes session guarantee.\n5. Cart -> eventual + CRDT/merge; analytics -> eventual.\n6. For any strong choice, state the quorum (R+W>N) or consensus needed and the latency cost.`,
      successCriteria: [
        "Each domain mapped to the weakest sufficient model",
        "Justified by the specific anomaly it prevents",
        "Names quorum/consensus cost for the strong choices and a session guarantee for profile",
      ],
    },
  },

  {
    slug: "idempotency-retries",
    title: "Idempotency & Safe Retries",
    track: "shared",
    phase: "distributed",
    module: "dist-core",
    difficulty: "advanced",
    estMinutes: 24,
    summary:
      "Networks fail ambiguously, so clients retry -- and retries duplicate side effects unless operations are idempotent. Idempotency keys, dedup, and retry budgets are how you avoid double charges and cascades.",
    prerequisites: [],
    relatedConcepts: ["consistency-models", "consensus-raft", "load-balancing", "sharding-partitioning"],
    tags: ["idempotency", "retries", "exactly-once", "backoff", "distributed", "reliability"],

    why: `In a distributed system, a request that fails is fundamentally **ambiguous**: did the server never receive it, receive it but crash before replying, or process it fully and only the *response* got lost? The client cannot tell. Its only safe options are to retry (risking a duplicate) or give up (risking a lost operation).

**Idempotency is what makes retrying safe.** An idempotent operation produces the same result whether it is applied once or many times, so the client can retry freely without fear of double-charging a card, sending two shipments, or creating two accounts. Without it, every retry -- and retries are unavoidable -- becomes a potential correctness disaster. This is the practical foundation of "exactly-once" behavior, which in reality is "at-least-once delivery plus idempotent processing."`,

    intuition: `Think of an **elevator call button**. Pressing it once calls the elevator. Pressing it ten times, impatiently, still just calls the elevator once -- the extra presses have no additional effect. That is idempotency: repeating the action does not repeat the effect.

Now contrast a **vending machine that charges you each press**. Retrying because you were not sure it worked charges you twice. That operation is *not* idempotent, and retrying is dangerous.

The engineering goal is to turn dangerous vending-machine operations into safe elevator-button ones: attach a unique **idempotency key** to the request so the server recognizes "I have already done this exact operation" and returns the original result instead of doing it again.`,

    howItWorks: `### Idempotency by HTTP method (the default contract)
- **GET, PUT, DELETE are idempotent by definition.** \`PUT /users/42 {name}\` sets a value; doing it twice leaves the same value. \`DELETE\` twice leaves the resource gone.
- **POST is generally *not* idempotent** -- it creates/appends. Retrying "POST /charges" can charge twice.

### Making non-idempotent operations safe: idempotency keys
1. The client generates a **unique key** (e.g. a UUID) per logical operation and sends it (e.g. \`Idempotency-Key\` header).
2. On first receipt, the server processes the request, **stores the result keyed by that key**, and returns it.
3. On any retry with the same key, the server **returns the stored result without re-executing** the side effect.
This is how Stripe, payment APIs, and message consumers achieve safe retries.

### Retry policy
- **Only retry idempotent operations** (or POSTs carrying an idempotency key).
- **Only retry retryable errors:** timeouts, 502/503/504, connection resets. Never retry 400/422 (the request itself is wrong).
- **Exponential backoff with jitter** so retries spread out instead of synchronizing into a thundering herd.
- **Retry budgets and circuit breakers** cap total retry volume so retries cannot amplify an outage.`,

    internals: `- **"Exactly-once" is a myth at the network layer.** You get **at-least-once delivery** (retries) or **at-most-once** (no retries). "Exactly-once *processing*" is achieved by at-least-once delivery + idempotent handlers (dedup on a key). Kafka's exactly-once is producer idempotence + transactional offsets doing exactly this.
- **Idempotency-key storage needs a TTL and must be durable.** Store \`(key -> result, status)\` in a fast, consistent store (often Redis or a DB row with a unique constraint). The unique constraint itself is a natural dedup: a duplicate insert fails, and you return the existing record.
- **Race conditions:** two retries can arrive concurrently before the first finishes. Handle with an atomic "insert key as in-progress" (unique constraint) so the second caller waits or receives a 409/"in progress" rather than double-executing.
- **Scope the key to the operation, not the client.** The key must capture "this specific charge," so a client that legitimately wants to charge twice uses two keys.
- **Backoff without jitter still synchronizes.** If all clients back off 1s, 2s, 4s, they retry in lockstep and re-spike the server. Full jitter (\`random(0, base * 2^attempt)\`) is the standard fix.
- **Retry amplification** is a top cause of cascading failure: N layers each retrying 3x turns 1 request into 3^N. Budget retries per layer and prefer retrying at a single layer.`,

    diagram: {
      title: "Safe retry with an idempotency key",
      layers: [
        { id: "call", label: "Client sends op + key", sub: "Idempotency-Key: uuid-123 (POST /charges)" },
        { id: "ambiguous", label: "Timeout -- outcome unknown", sub: "did it succeed? response lost? never arrived?" },
        { id: "retry", label: "Client retries same key", sub: "exponential backoff + jitter" },
        { id: "dedup", label: "Server dedups on key", sub: "found stored result -> return it, do NOT re-charge" },
        { id: "budget", label: "Retry budget + breaker", sub: "cap total retries so a blip does not cascade" },
      ],
      caption: "The key turns an ambiguous, dangerous retry into a safe, deterministic one -- the practical basis of exactly-once.",
    },

    realWorld: `A checkout service calls the payment API. The payment succeeds, but the response is lost to a network blip, so the checkout service times out and retries. Without idempotency, the customer is **charged twice** and support is flooded. The fix Stripe and every serious payment API ship: the checkout service generates one \`Idempotency-Key\` per order attempt. The first call charges the card and stores the result under that key; the retry presents the same key, and the payment API returns the *original* charge without touching the card again. The customer is charged exactly once despite the ambiguous failure. **The retry did not become safe by luck -- it became safe because the operation was made idempotent.**`,

    production: `- **Make write endpoints idempotent by design.** Accept an \`Idempotency-Key\` for any operation with side effects (payments, sending email/SMS, creating resources).
- **Use a durable dedup store** with a unique constraint (DB row or Redis SETNX) and a sensible TTL (e.g. 24h) as the source of truth for "already done."
- **Retry only retryable errors, only idempotent ops, with exponential backoff + full jitter.** Never retry 4xx-that-means-bad-request.
- **Set retry budgets and circuit breakers** so retries are capped (e.g. retries <= 10% of requests) and cannot amplify an incident.
- **Prefer retrying at one layer.** Multi-layer retries multiply load geometrically; disable retries in inner layers or set aggressive budgets.
- **Make consumers idempotent** in queue/stream processing (Kafka, SQS): dedup on a message id so at-least-once delivery yields exactly-once effects.
- **Cap total attempts and total time**, then dead-letter. Infinite retries turn transient failures into permanent load.`,

    commonMistakes: [
      "Retrying non-idempotent POSTs without an idempotency key -- double charges, duplicate resources.",
      "Retrying 400/422 errors: the request is malformed, so every retry fails identically and wastes capacity.",
      "Exponential backoff without jitter, causing synchronized retry storms (thundering herd).",
      "Retrying at every layer of the stack, multiplying one request into 3^N and amplifying outages.",
      "Believing the network provides 'exactly-once' delivery; it provides at-least-once, and you add idempotency.",
      "Scoping the idempotency key to the client/session instead of the specific operation, blocking legitimate repeat operations or failing to dedup.",
      "Storing dedup keys with no TTL (unbounded growth) or in a non-durable place (lost on restart).",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Idempotency keys | Safe retries, no duplicate side effects | Durable dedup store + TTL to maintain; race handling |
| At-least-once + retries | No lost operations | Duplicates unless handlers are idempotent |
| At-most-once (no retry) | No duplicates | Lost operations on failure |
| Exponential backoff + jitter | Avoids retry storms | Slower worst-case recovery |
| Retry budget + breaker | Prevents amplification/cascade | Some transient failures surface to the user |`,

    whenToUse: [
      "Any write with real side effects that a client might retry: payments, notifications, resource creation, provisioning.",
      "Queue/stream consumers that receive at-least-once delivery and must not double-apply.",
      "Client libraries and gateways adding automatic retries to remote calls.",
    ],
    whenNotToUse: [
      "Pure reads (GET) -- already idempotent; no key needed.",
      "Operations where a duplicate is genuinely fine and dedup storage is not worth it (idempotent by nature).",
      "As a substitute for fixing a systematically failing dependency -- retries mask, they do not cure.",
    ],

    code: [
      {
        label: "Idempotent charge endpoint with a dedup key",
        language: "typescript",
        code: `async function charge(req: { key: string; amount: number; card: string }) {
  // Atomically claim the key. Unique constraint on 'key' does the dedup.
  const existing = await db.idempotency.findByKey(req.key);
  if (existing) {
    if (existing.status === "succeeded") return existing.result; // safe retry: return original
    if (existing.status === "in_progress") throw new HttpError(409, "in progress");
  }
  // Insert as in_progress; if a concurrent retry raced us, this INSERT fails -> treat as duplicate.
  await db.idempotency.insert({ key: req.key, status: "in_progress" });

  const result = await paymentGateway.charge(req.amount, req.card); // the real side effect, once
  await db.idempotency.update(req.key, { status: "succeeded", result, ttl: "24h" });
  return result;
}`,
      },
      {
        label: "Retry with exponential backoff + full jitter (retryable errors only)",
        language: "typescript",
        code: `async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = isTimeout(err) || is5xx(err); // never retry 4xx bad-request
      if (!retryable || attempt >= maxAttempts - 1) throw err;
      const base = 100; // ms
      const cap = base * 2 ** attempt;
      const delay = Math.random() * cap; // full jitter: random(0, cap)
      await sleep(delay);
    }
  }
}`,
      },
    ],

    memoryCard: {
      problem: "Failed requests are ambiguous, so clients must retry -- but retries duplicate side effects unless the operation is idempotent.",
      mentalModel: "An elevator button: pressing it many times still calls the elevator once. Turn vending-machine operations into elevator buttons with idempotency keys.",
      keyConcepts: ["ambiguous failure -> retry", "idempotency key + durable dedup", "at-least-once + idempotent = exactly-once", "retry only retryable + idempotent ops", "backoff with full jitter", "retry budgets / circuit breakers"],
      productionConnection: "Payment and messaging APIs accept an Idempotency-Key backed by a unique-constraint dedup store; retries use jittered backoff and budgets to avoid cascades.",
      oneLiner: "Idempotency makes retries safe: the same operation applied once or many times yields one effect, turning at-least-once delivery into exactly-once results.",
    },

    quiz: [
      {
        id: "idem-q1",
        prompt: "A payment request times out with an unknown outcome. What makes it safe to retry?",
        choices: [
          { text: "The network guarantees exactly-once delivery", correct: false },
          { text: "An idempotency key so the server dedups and returns the original result instead of charging again", correct: true },
          { text: "Retrying only during off-peak hours", correct: false },
          { text: "Switching from POST to GET", correct: false },
        ],
        explanation: "The failure is ambiguous, so a retry may hit an already-processed request. An idempotency key lets the server recognize the duplicate and return the stored result, preventing a double charge.",
      },
      {
        id: "idem-q2",
        prompt: "Why add jitter to exponential backoff?",
        choices: [
          { text: "It makes retries faster on average", correct: false },
          { text: "It desynchronizes clients so they do not all retry at the same instant and re-spike the server", correct: true },
          { text: "It guarantees the request eventually succeeds", correct: false },
          { text: "It is required by HTTP", correct: false },
        ],
        explanation: "Pure exponential backoff makes many clients retry in lockstep (1s, 2s, 4s), creating synchronized thundering herds. Random jitter spreads retries out and smooths load.",
      },
      {
        id: "idem-q3",
        prompt: "What does 'exactly-once processing' actually rely on in practice?",
        choices: [
          { text: "A network that never drops packets", correct: false },
          { text: "At-least-once delivery combined with idempotent handlers that dedup on a key", correct: true },
          { text: "Disabling all retries", correct: false },
          { text: "Using only GET requests", correct: false },
        ],
        explanation: "Networks provide at-least-once (with retries) or at-most-once delivery. Exactly-once effects come from delivering at-least-once and making the handler idempotent so duplicates are absorbed.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a safe retry path for a payment API",
      brief: "Given a checkout -> payment call that can fail ambiguously, design the idempotency and retry strategy end to end.",
      steps: `1. Define the idempotency key scope (one key per order attempt) and where the client generates it.\n2. Design the server dedup store: schema, unique constraint, statuses (in_progress/succeeded/failed), TTL.\n3. Handle the concurrent-retry race (atomic claim -> 409 or wait).\n4. Specify which errors are retryable vs terminal, and the backoff+jitter formula.\n5. Set a retry budget and circuit-breaker threshold; decide the dead-letter behavior after max attempts.\n6. State how this yields exactly-once charging despite at-least-once delivery.`,
      successCriteria: [
        "Idempotency key scoped to the operation with a durable dedup store and TTL",
        "Retries limited to retryable errors with backoff + jitter and a budget",
        "Concurrent-retry race handled atomically; explains exactly-once outcome",
      ],
    },
  },

  {
    slug: "sharding-partitioning",
    title: "Sharding & Partitioning",
    track: "shared",
    phase: "distributed",
    module: "dist-core",
    difficulty: "expert",
    estMinutes: 27,
    summary:
      "Splitting one dataset across many nodes to scale beyond a single machine -- choosing a partition key, avoiding hot shards, and paying the price of cross-shard queries and rebalancing.",
    prerequisites: ["consistency-models"],
    relatedConcepts: ["consistency-models", "consensus-raft", "cap-theorem", "load-balancing"],
    tags: ["sharding", "partitioning", "consistent-hashing", "hot-shard", "rebalancing", "distributed"],

    why: `A single database node has hard ceilings: disk size, memory, write throughput, and IOPS. Vertical scaling (a bigger box) buys time but hits physics and cost walls fast. **Sharding (horizontal partitioning) exists to break through the single-node ceiling** by splitting one logical dataset across many nodes, each owning a subset, so total capacity and throughput scale with the number of nodes.

But sharding is not free -- it is arguably the most consequential and hardest-to-reverse decision in a data-heavy system. **The choice of partition key determines whether your load spreads evenly or piles onto one hot node, whether common queries stay on one shard or fan out expensively, and how painful it is to add capacity later.** Pick it well and you scale smoothly for years; pick it badly and you inherit hot shards, cross-shard joins, and agonizing migrations.`,

    intuition: `Imagine a **library that has outgrown one building**. You split the collection across several branches. The crucial decision is *how* you split:

- **By first letter of author (range partitioning):** easy to find a range of authors, but the "S" branch (Smith, Silva, Singh...) is mobbed while "X" sits empty -- a **hot shard**.
- **By a hash of the ISBN (hash partitioning):** every branch gets a roughly equal, random share, so load is even -- but "give me all books by author S" now means visiting *every* branch (a **scatter-gather** query).

There is no split that is simultaneously perfectly balanced *and* keeps every query on one branch. **The partition key is you deciding which queries are cheap and which are expensive, and where the load lands.** Sharding well is choosing that trade-off deliberately for your actual access patterns.`,

    howItWorks: `### Partitioning strategies
- **Range partitioning:** contiguous key ranges per shard (A-F, G-M...). Great for range scans; prone to hot shards if keys are skewed or monotonically increasing (e.g. timestamps all hit the newest shard).
- **Hash partitioning:** shard = \`hash(key) mod N\`. Even distribution, but destroys range locality and, critically, **changing N reshuffles almost every key**.
- **Consistent hashing:** keys and nodes are placed on a hash ring; a key belongs to the next node clockwise. Adding/removing a node only moves the keys between it and its neighbor (~1/N of data), not everything. **Virtual nodes** smooth out imbalance. This is how Cassandra, DynamoDB, and Redis Cluster (via hash slots) rebalance gracefully.
- **Directory/lookup-based:** a metadata service maps key -> shard. Maximum flexibility (arbitrary placement, easy rebalancing) at the cost of a lookup and a component to keep available.

### The partition key is everything
The key decides **distribution** (even vs hot) and **query locality** (single-shard vs scatter-gather). Choose a high-cardinality key aligned with your most frequent access pattern so hot queries stay on one shard while load stays even.

### Cross-shard operations
Queries that span shards require **scatter-gather** (query all, merge results) and cannot use a single-shard transaction. Cross-shard transactions need distributed protocols (2PC/consensus) that are slow and complex -- avoid them by co-locating related data under the same key.`,

    internals: `- **Hot shards (hotspots)** come from low-cardinality or skewed keys (e.g. \`country\`, \`tenant_id\` with one giant tenant) or monotonic keys (auto-increment IDs, timestamps -> all writes hit the newest range). Mitigations: hash the key, add a salt/prefix to spread a hot key, or split the hot tenant onto dedicated shards.
- **\`hash(key) mod N\` is a trap:** increasing N from 4 to 5 remaps ~80% of keys, forcing a massive data move. Consistent hashing exists precisely to bound movement to ~1/N.
- **Virtual nodes (vnodes):** each physical node owns many small ring segments, so load is even and rebalancing on node add/remove is smooth and parallelizable.
- **Rebalancing** must be online and throttled -- moving TBs of data while serving traffic can saturate disk/network. Systems move partitions as units and update routing atomically.
- **Rebalancing safety** requires care around consistency: reads/writes during a move must not be lost or double-applied (route to old owner until handoff completes, then flip).
- **Secondary indexes across shards** are hard: a local index is fast but only covers one shard; a global index is a distributed structure needing its own partitioning and consistency handling.
- **Co-location:** partition related entities by the same key (e.g. all of a user's data by \`user_id\`) so per-user transactions and joins stay single-shard.`,

    diagram: {
      title: "Partition key routes each request to one shard",
      layers: [
        { id: "key", label: "Partition key chosen", sub: "high cardinality, aligned to access pattern" },
        { id: "route", label: "Router / consistent hash ring", sub: "hash(key) -> owning shard (via vnodes)" },
        { id: "shards", label: "Shards own disjoint subsets", sub: "capacity + throughput scale with node count" },
        { id: "hot", label: "Watch for hot shards", sub: "skewed/monotonic keys pile onto one node" },
        { id: "cross", label: "Cross-shard = scatter-gather", sub: "fan-out queries + no cheap distributed txns" },
      ],
      caption: "A good partition key keeps hot queries single-shard and load even; a bad one creates hotspots and expensive fan-out.",
    },

    realWorld: `A multi-tenant SaaS shards its database by \`tenant_id\` using \`hash(tenant_id) mod N\`. It works great until one enterprise customer grows to 40% of all traffic -- that tenant's shard becomes a **hot shard**, running at 100% CPU while others idle, and no amount of adding nodes helps because that one key always lands on one shard. Worse, when they try to add capacity, \`mod N\` reshuffles nearly the entire dataset, forcing a multi-day migration. The redesign: switch to **consistent hashing with virtual nodes** (bounded data movement on scale-out) and **sub-partition the whale tenant** by a composite key (\`tenant_id + entity_id\`) so its load spreads across shards. **The original mistake was not the tool but the partition key** -- it assumed uniform tenant size, and skew broke it.`,

    production: `- **Choose the partition key deliberately, up front** -- it is the hardest thing to change later. Pick high cardinality aligned with your dominant access pattern.
- **Prefer consistent hashing (with vnodes) over \`hash mod N\`** so adding capacity moves ~1/N of data, not everything.
- **Design so your hot queries are single-shard.** Co-locate related data under the same key; treat cross-shard scatter-gather as the expensive path to avoid.
- **Actively watch for hot shards** (per-shard CPU, QPS, storage). Skewed tenants and monotonic keys are the usual culprits; salt or sub-partition them.
- **Avoid cross-shard transactions.** If you truly need them, understand the 2PC/consensus cost; usually a better data model removes the need.
- **Plan rebalancing before you need it:** online, throttled partition moves with atomic routing updates, tested under load.
- **Keep a routing/metadata layer that is highly available** -- if clients cannot find the right shard, everything is down.`,

    commonMistakes: [
      "Choosing a low-cardinality or skewed partition key (country, one-giant-tenant), creating permanent hot shards.",
      "Partitioning on a monotonic key (auto-increment ID or timestamp) so all writes stampede the newest shard.",
      "Using hash(key) mod N and discovering that adding a node reshuffles nearly all data.",
      "Designing common queries to fan out across all shards (scatter-gather) instead of co-locating data.",
      "Assuming tenants/users are uniform in size; skew is the norm and breaks naive sharding.",
      "Reaching for cross-shard distributed transactions instead of modeling data so operations stay single-shard.",
      "Not monitoring per-shard load, so a hot shard is discovered only when it melts down.",
    ],

    tradeoffs: `| Strategy | Benefit | Cost |
|---|---|---|
| Range partitioning | Efficient range scans, ordered data | Hot shards from skew/monotonic keys |
| Hash (mod N) | Even distribution | No range locality; scale-out reshuffles almost everything |
| Consistent hashing + vnodes | Even load, ~1/N movement on scale-out | More complex; still no range scans |
| Directory-based | Flexible placement, easy rebalancing | Extra lookup + a component to keep available |
| Co-locate by key (single-shard) | Cheap local transactions/joins | Risk of hot shard if the key is skewed |`,

    whenToUse: [
      "Datasets or write throughput that exceed a single node's capacity ceiling.",
      "Multi-tenant systems where per-tenant data can be co-located under a tenant/user key (with skew handling).",
      "High-scale key-value / wide-column workloads where consistent hashing spreads load evenly.",
    ],
    whenNotToUse: [
      "Data that still fits comfortably on one node -- sharding adds permanent complexity; scale vertically or add read replicas first.",
      "Workloads dominated by cross-entity queries that would become scatter-gather across every shard.",
      "When strong cross-entity transactions are central and cannot be modeled into single-shard operations.",
    ],

    code: [
      {
        label: "Consistent hashing with virtual nodes (bounded rebalancing)",
        language: "typescript",
        code: `// Place each physical node at many points on a hash ring (virtual nodes),
// so load is even and adding a node moves only ~1/N of keys.
class HashRing {
  private ring = new Map<number, string>(); // hash point -> node id
  private points: number[] = [];            // sorted hash points

  addNode(node: string, vnodes = 150) {
    for (let i = 0; i < vnodes; i++) {
      const h = hash(node + "#" + i);
      this.ring.set(h, node);
      this.points.push(h);
    }
    this.points.sort((a, b) => a - b);
  }

  // A key belongs to the first node clockwise from hash(key).
  getNode(key: string): string {
    const h = hash(key);
    const p = this.points.find((x) => x >= h) ?? this.points[0]; // wrap around
    return this.ring.get(p)!;
  }
}
// Contrast: shard = hash(key) % N remaps ~ (N-1)/N of keys when N changes -- avoid for scale-out.`,
      },
      {
        label: "Choosing a partition key: salt a monotonic key to avoid a hot shard",
        language: "typescript",
        code: `// BAD: timestamp-ordered key -> every new write hits the newest range/shard.
const badKey = \`\${Date.now()}:\${eventId}\`;

// BETTER: prefix with a bucket so writes spread across shards,
// while still allowing time-range reads by fanning out over buckets.
const BUCKETS = 16;
function partitionKey(userId: string, eventId: string): string {
  const bucket = hash(userId) % BUCKETS;      // spreads load evenly
  return \`\${bucket}:\${userId}:\${eventId}\`;  // co-locates one user's events in a bucket
}
// Trade-off: a "recent events across all users" query must scatter over BUCKETS shards.`,
      },
    ],

    memoryCard: {
      problem: "One node cannot hold or serve the whole dataset; split it across many nodes without creating hotspots or expensive cross-shard queries.",
      mentalModel: "A library split into branches: how you split (by author range vs hashed ISBN) decides which queries are cheap and where the crowd goes.",
      keyConcepts: ["partition key decides distribution + query locality", "range vs hash vs consistent hashing", "hash mod N reshuffles on scale-out", "vnodes smooth load", "hot shards from skew/monotonic keys", "cross-shard = scatter-gather, avoid distributed txns"],
      productionConnection: "Consistent hashing with vnodes (Cassandra/Dynamo/Redis Cluster) bounds rebalancing; co-locate by key for single-shard ops; monitor per-shard load and salt hot keys.",
      oneLiner: "Sharding scales past one node by splitting data on a partition key -- and that key choice decides your hotspots, query cost, and how hard growth will be.",
    },

    quiz: [
      {
        id: "shard-q1",
        prompt: "Why is 'shard = hash(key) mod N' problematic when you add a node?",
        choices: [
          { text: "It stops the database from accepting writes", correct: false },
          { text: "Changing N remaps most keys, forcing a massive data reshuffle", correct: true },
          { text: "It makes all queries scatter-gather", correct: false },
          { text: "Hashing is too slow at scale", correct: false },
        ],
        explanation: "With mod N, going from N to N+1 changes the destination of nearly all keys, so scaling out moves almost the entire dataset. Consistent hashing bounds movement to about 1/N.",
      },
      {
        id: "shard-q2",
        prompt: "A single enterprise tenant becomes 40% of traffic and its shard melts. What is the root cause?",
        choices: [
          { text: "Too few replicas", correct: false },
          { text: "A skewed partition key (tenant_id) so one hot key always lands on one shard", correct: true },
          { text: "The disk is too small", correct: false },
          { text: "Consistent hashing is broken", correct: false },
        ],
        explanation: "Partitioning by tenant_id assumes uniform tenant size. A whale tenant is a single hot key, so its load concentrates on one shard regardless of node count. Sub-partition the whale (composite key) to spread it.",
      },
      {
        id: "shard-q3",
        prompt: "What is the cost of choosing a partition key that spreads load evenly via hashing?",
        choices: [
          { text: "You lose range locality, so range scans and 'all records for X' queries become scatter-gather across shards", correct: true },
          { text: "Writes stop being durable", correct: false },
          { text: "The data can no longer be replicated", correct: false },
          { text: "Consistency becomes impossible", correct: false },
        ],
        explanation: "Hashing distributes keys randomly, which balances load but destroys ordering/locality. Queries that need a range or all rows for a value must fan out to every shard and merge results.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Choose a partition key and stress-test it for skew",
      brief: "For a multi-tenant analytics store, pick a partition key, then check it against distribution, query locality, hot shards, and rebalancing cost.",
      steps: `1. List the top 3 access patterns (e.g. per-tenant dashboard, recent events, per-user timeline).\n2. Propose a partition key and predict which patterns stay single-shard vs become scatter-gather.\n3. Stress-test for skew: assume one tenant is 40% of load -- does your key create a hot shard? If so, add a salt/composite key.\n4. Choose range vs hash vs consistent hashing; justify against scale-out (how much data moves when you add a node?).\n5. Sketch the rebalancing plan: online, throttled, atomic routing flip.`,
      successCriteria: [
        "Partition key aligned to the dominant access pattern with stated single-shard vs scatter-gather queries",
        "Skew/hot-shard handled via salt or sub-partitioning",
        "Consistent hashing (or justified alternative) chosen with bounded scale-out movement and a rebalancing plan",
      ],
    },
  },
];
