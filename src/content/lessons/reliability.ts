import type { Lesson } from "../types";

export const reliabilityLessons: Lesson[] = [
  {
    slug: "slo-sli-error-budgets",
    title: "SLOs, SLIs & Error Budgets",
    track: "shared",
    phase: "observability",
    module: "o11y-core",
    difficulty: "advanced",
    estMinutes: 24,
    summary:
      "The core SRE contract: measure what users experience (SLI), set a target (SLO), and turn the gap to 100% into a budget you can spend on shipping features vs. stability.",
    prerequisites: ["three-pillars"],
    relatedConcepts: ["sre-principles", "prometheus-metrics", "incident-response"],
    tags: ["sre", "slo", "sli", "error-budget", "reliability"],

    why: `"Make it reliable" is unmeasurable and infinite -- 100% reliability is impossible and, past a point, not worth the cost. **SLOs exist to make reliability a concrete, negotiated target** so teams can make rational trade-offs between shipping features and improving stability, instead of arguing from feelings or reacting only after outages.`,

    intuition: `An **error budget is a spending account for unreliability.** If your SLO is 99.9% success, then 0.1% of requests are *allowed* to fail -- that 0.1% is your budget. Feature velocity spends it (risky launches, less testing); reliability work saves it. **Budget left over -> ship faster. Budget blown -> freeze features and fix stability.** It converts an emotional argument ("we need to move faster" vs "we need it stable") into arithmetic.`,

    howItWorks: `- **SLI (Indicator):** a *measured* number reflecting user experience, e.g. "fraction of HTTP requests served in <300ms with a 2xx/3xx status." Measure it as close to the user as possible.
- **SLO (Objective):** the *target* for the SLI over a window, e.g. "99.9% of requests succeed over 30 days."
- **Error budget:** \`100% - SLO\`. For 99.9% over 30 days that's ~43 minutes of "fully down" equivalent -- but really it's a request budget you can spend gradually.
- **The policy is the point:** decide *in advance* what happens when the budget is exhausted (e.g. no new feature deploys until you're back under SLO). That policy is what actually changes behavior.`,

    internals: `- **Nines and time:** 99.9% = ~43m/month; 99.99% = ~4.3m/month; 99.999% = ~26s/month. Each nine is ~10x the cost.
- **Good SLIs are ratios of good events / valid events** -- they degrade gracefully and are easy to reason about.
- **Measure from the user's side** (load balancer / client), not deep internals -- a healthy backend behind a broken LB is still an outage to users.
- **Burn rate** = how fast you're consuming budget. Alert on **fast burn** (page: you'll exhaust the budget in hours) and **slow burn** (ticket: trending bad) rather than on raw error spikes.
- **Don't SLO everything** -- pick the few user journeys that matter. Over-alerting is how on-call dies.`,

    diagram: {
      title: "SLI -> SLO -> error budget -> policy",
      layers: [
        { id: "sli", label: "SLI", sub: "measured: % requests fast + successful" },
        { id: "slo", label: "SLO", sub: "target: 99.9% over 30d" },
        { id: "budget", label: "Error budget", sub: "0.1% allowed to fail" },
        { id: "burn", label: "Burn rate alerts", sub: "fast burn -> page; slow burn -> ticket" },
        { id: "policy", label: "Policy", sub: "budget gone -> freeze features, fix reliability" },
      ],
      caption: "Reliability becomes a budget you spend on velocity or save for stability -- decided by policy, not vibes.",
    },

    realWorld: `A team is torn: product wants a risky redesign shipped fast; SRE wants more hardening. With an error budget, the argument dissolves: they check the burn -- 80% of this month's budget is still unspent, so they ship the redesign behind a feature flag with fast-burn alerts. Two weeks later a bad deploy burns 60% of the budget in an hour; the policy auto-freezes non-critical deploys until they're back under SLO. Decisions became data-driven, not political.`,

    production: `- **Pick 1-3 SLIs per critical user journey** (availability + latency usually).
- **Measure SLIs at the edge** (LB/gateway/client), not just internal health.
- **Alert on burn rate**, with multi-window (fast + slow) to catch both spikes and slow trends.
- **Write the error-budget policy down** and get product buy-in *before* you need it.
- **Review SLOs quarterly** -- too tight burns out on-call; too loose means users hurt before you notice.`,

    commonMistakes: [
      "Setting SLOs on internal metrics (CPU) instead of user-facing outcomes.",
      "Chasing 100% / adding a nine without justifying the ~10x cost.",
      "Alerting on raw error count instead of burn rate (noisy, misleading).",
      "Defining SLOs but no error-budget policy -- so nothing actually changes when it's blown.",
      "SLOs on everything -> alert fatigue and ignored pages.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Higher SLO (more nines) | Happier users | ~10x cost per nine; slower shipping |
| Lower SLO | More feature velocity | More user-visible failures |
| Burn-rate alerting | Catches real problems, less noise | More setup than a simple threshold |`,

    whenToUse: ["Any user-facing service where you must balance shipping speed against reliability; on-call alerting design."],
    whenNotToUse: ["Throwaway prototypes with no users.", "As a weapon to blame teams -- the budget is a shared decision tool, not a scoreboard."],

    memoryCard: {
      problem: "Make reliability a measurable, negotiable target so teams can rationally trade velocity against stability.",
      mentalModel: "An error budget is a spending account for failure: velocity spends it, reliability work saves it.",
      keyConcepts: ["SLI (measured) vs SLO (target)", "error budget = 100% - SLO", "burn rate + multi-window alerts", "error-budget policy", "measure at the edge"],
      productionConnection: "Few SLIs per journey, alert on burn rate, and a pre-agreed policy that freezes features when the budget is gone.",
      oneLiner: "SLIs measure user experience, an SLO sets the target, and the leftover error budget is what you spend on shipping vs. stability.",
    },

    quiz: [
      {
        id: "slo-q1",
        prompt: "What is an error budget?",
        choices: [
          { text: "The money spent on incidents", correct: false },
          { text: "The allowed amount of failure: 100% minus the SLO", correct: true },
          { text: "The number of engineers on call", correct: false },
          { text: "CPU headroom on the servers", correct: false },
        ],
        explanation: "If the SLO is 99.9%, then 0.1% of events are allowed to fail -- that 0.1% is the error budget, which you can spend on risk/velocity or save via reliability work.",
      },
      {
        id: "slo-q2",
        prompt: "Where should you measure an availability SLI?",
        choices: [
          { text: "Deep inside the database", correct: false },
          { text: "As close to the user as possible (edge/LB/client)", correct: true },
          { text: "Only on the CI server", correct: false },
          { text: "On the developer's laptop", correct: false },
        ],
        explanation: "SLIs should reflect what users experience. A healthy backend behind a broken load balancer is still an outage to users, so measure at the edge.",
      },
      {
        id: "slo-q3",
        prompt: "Why alert on burn rate instead of raw error count?",
        choices: [
          { text: "Burn rate is easier to compute", correct: false },
          { text: "It ties alerts to how fast you'll exhaust the budget, catching both fast spikes and slow trends with less noise", correct: true },
          { text: "Raw error count is always zero", correct: false },
          { text: "Burn rate ignores latency", correct: false },
        ],
        explanation: "Burn-rate alerting (multi-window) pages when you're on track to blow the budget quickly and files tickets on slow degradation -- more meaningful and less noisy than a raw threshold.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design an SLO + policy",
      brief: "For a checkout API, define the SLI, a defensible SLO, the resulting budget, burn-rate alerts, and the exhaustion policy.",
      steps: `1. SLI: fraction of checkout requests succeeding in <500ms at the gateway.\n2. SLO: e.g. 99.9% over 30d (justify vs cost).\n3. Budget = 0.1% of checkout requests.\n4. Alerts: fast-burn (2% budget in 1h -> page) + slow-burn (ticket).\n5. Policy: budget exhausted -> freeze non-critical deploys until recovered.`,
      successCriteria: ["User-facing SLI at the edge", "Justified SLO", "Burn-rate alerts", "Written exhaustion policy"],
    },
  },

  {
    slug: "cap-theorem",
    title: "CAP Theorem (and what it really means)",
    track: "shared",
    phase: "distributed",
    module: "dist-core",
    difficulty: "expert",
    estMinutes: 22,
    summary:
      "During a network partition you must choose consistency or availability -- but the real, everyday trade-off is the latency-vs-consistency spectrum (PACELC), not a binary.",
    prerequisites: [],
    relatedConcepts: ["consistency-models", "consensus-raft", "sharding-partitioning"],
    tags: ["cap", "consistency", "availability", "partition", "distributed", "pacelc"],

    why: `The moment your data lives on more than one machine, the network between them can fail or lag -- and you can't pretend otherwise. **CAP forces you to decide, in advance, what your system does during a partition**: refuse to serve (stay consistent) or serve possibly-stale data (stay available). Getting this decision wrong means either surprise downtime or surprise data corruption during the exact moments things are already going wrong.`,

    intuition: `Two bank tellers in different towns share your account, connected by a phone line. **The phone line drops (partition).** A customer at teller A wants to withdraw. Two choices:
- **CP (consistency):** teller A says "I can't confirm your balance with the other branch -- come back later." Correct, but *unavailable*.
- **AP (availability):** teller A lets the withdrawal happen and reconciles later. Available, but you might now be *overdrawn* (inconsistent).

There's no third option that is both perfectly consistent and available *while the line is down*. That's CAP.`,

    howItWorks: `**CAP:** during a **network partition (P)**, a distributed system must sacrifice either **Consistency (C)** -- every read sees the latest write -- or **Availability (A)** -- every request gets a (non-error) response.

- **CP systems** (e.g. etcd, ZooKeeper, most RDBMS with sync replication) refuse operations that can't guarantee consistency during a partition. They pick *correct over available*.
- **AP systems** (e.g. Cassandra, DynamoDB in some modes, DNS) keep serving, accepting temporary inconsistency, and reconcile later (eventual consistency).

**Critical nuance:** the choice **only applies during a partition.** When the network is healthy, you don't have to choose -- which is why the *everyday* question is different.`,

    internals: `- **PACELC extends CAP** with the part that matters daily: **if Partitioned, choose A or C; Else (normal operation), choose Latency or Consistency.** Even with no partition, stronger consistency (e.g. quorum reads/writes, synchronous replication) costs latency.
- **"Consistency" here is linearizability** (single-copy illusion), not the "C" in ACID -- a common source of confusion.
- **Availability in CAP is strict:** *every* non-failing node returns a non-error response. Real systems live on a spectrum, not the corners.
- **You choose per-operation, not per-system:** many databases let you pick consistency level per query (e.g. Cassandra \`ONE\` vs \`QUORUM\`; Dynamo strong vs eventual reads).
- **Partitions are rarer than latency**, which is why PACELC's "else" branch dominates real design decisions.`,

    diagram: {
      title: "CAP during a partition (and PACELC otherwise)",
      layers: [
        { id: "partition", label: "Partition happens", sub: "nodes can't talk" },
        { id: "cp", label: "CP: choose Consistency", sub: "reject writes/reads -> unavailable but correct" },
        { id: "ap", label: "AP: choose Availability", sub: "serve possibly-stale -> available, reconcile later" },
        { id: "else", label: "Else (no partition)", sub: "PACELC: trade Latency vs Consistency" },
        { id: "perop", label: "Per-operation choice", sub: "quorum vs one; strong vs eventual reads" },
      ],
      caption: "CAP is only the partition case; PACELC's latency-vs-consistency trade-off governs the other 99% of the time.",
    },

    realWorld: `A shopping cart uses an AP store: during a partition, both replicas accept "add to cart" and later merge -- worst case the user sees an item reappear, which is fine. The *payment ledger* uses a CP store: during a partition it refuses double-spends even if that means a checkout briefly errors. **Same company, opposite choices, because the cost of inconsistency differs wildly by domain.** That per-domain reasoning is the whole point of CAP.`,

    production: `- **Decide C-vs-A per data domain**, not once for the whole company (carts != ledgers).
- **Use CP systems for money, inventory, uniqueness, and coordination** (etcd, Postgres w/ sync replicas).
- **Use AP/eventually-consistent stores for high-availability, tolerant data** (feeds, sessions with fallback, telemetry).
- **Tune consistency per operation** where the store allows (quorum for critical reads, one for cheap reads).
- **Remember PACELC:** even without partitions, strong consistency costs latency -- don't pay for it where you don't need it.`,

    commonMistakes: [
      "Thinking you can have C, A, and P all at once (you can't, during a partition).",
      "Believing CAP applies all the time -- it's only about the partition case (use PACELC for the rest).",
      "Confusing CAP's 'C' (linearizability) with ACID's 'C' (constraints).",
      "Choosing AP for money/inventory and getting silent corruption.",
      "Paying for global strong consistency where eventual consistency would be fine (needless latency).",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| CP | Correctness during partitions | Unavailability during partitions |
| AP | Stays up during partitions | Temporary inconsistency / reconciliation logic |
| Strong (else branch) | Simple reasoning | Higher latency always |
| Eventual (else branch) | Low latency, high availability | Clients must tolerate staleness |`,

    whenToUse: ["Any time data is replicated across nodes/regions and you must define partition behavior and consistency levels."],
    whenNotToUse: ["Single-node systems with no replication (CAP doesn't bite -- but you also have no availability during that node's failure)."],

    memoryCard: {
      problem: "Decide what a replicated system does when the network between nodes fails or lags.",
      mentalModel: "Two bank tellers with a dropped phone line: refuse service (CP) or serve and reconcile later (AP).",
      keyConcepts: ["partition forces C-or-A", "CP vs AP systems", "PACELC: else -> latency vs consistency", "per-operation consistency", "CAP-C = linearizability"],
      productionConnection: "CP for money/coordination, AP for tolerant high-availability data; tune consistency per operation; PACELC governs the no-partition case.",
      oneLiner: "During a partition you must pick consistency or availability; the rest of the time it's a latency-vs-consistency trade-off (PACELC).",
    },

    quiz: [
      {
        id: "cap-q1",
        prompt: "CAP says that during a network partition you must sacrifice which?",
        choices: [
          { text: "Performance or cost", correct: false },
          { text: "Either consistency or availability", correct: true },
          { text: "Either durability or latency", correct: false },
          { text: "Nothing; you can keep all three", correct: false },
        ],
        explanation: "When nodes can't communicate (P), you either reject operations to stay consistent (CP) or serve possibly-stale data to stay available (AP). You cannot have both during the partition.",
      },
      {
        id: "cap-q2",
        prompt: "What does PACELC add that CAP misses?",
        choices: [
          { text: "It replaces availability with durability", correct: false },
          { text: "The everyday case: even without a partition, you trade latency vs consistency", correct: true },
          { text: "It proves you can have all three", correct: false },
          { text: "It only applies to SQL databases", correct: false },
        ],
        explanation: "PACELC: if Partitioned choose A or C; Else choose Latency or Consistency. Since partitions are rare, the 'else' latency-vs-consistency trade-off dominates real design.",
      },
      {
        id: "cap-q3",
        prompt: "Why might one company use CP for payments but AP for the shopping cart?",
        choices: [
          { text: "Payments are less important", correct: false },
          { text: "The cost of inconsistency differs: double-spends are unacceptable, a briefly odd cart is fine", correct: true },
          { text: "AP is always better", correct: false },
          { text: "CP systems can't store money", correct: false },
        ],
        explanation: "The right C-vs-A choice depends on the domain's tolerance for inconsistency. Ledgers need correctness (CP); carts can reconcile later and prioritize availability (AP).",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Classify data domains as CP or AP",
      brief: "Given payment ledger, shopping cart, user sessions, product catalog, and inventory counts, assign each CP or AP and justify with the cost of inconsistency.",
      steps: `1. For each domain, ask: what breaks if a read is stale or two writes conflict?\n2. Ledger, inventory, uniqueness -> CP (correctness critical).\n3. Cart, sessions, catalog, feeds -> AP (availability > perfect freshness).\n4. Note per-operation tuning where possible (quorum for critical reads).\n5. State the PACELC 'else' latency choice for each.`,
      successCriteria: ["Correct CP/AP assignment", "Justified by inconsistency cost", "Mentions per-operation tuning"],
    },
  },
];
