import type { Lesson } from "../types";

export const networkingLessons: Lesson[] = [
  {
    slug: "tcp",
    title: "TCP",
    track: "shared",
    phase: "networking",
    module: "net-core",
    difficulty: "core",
    estMinutes: 25,
    summary:
      "How a reliable, ordered byte stream is built on top of an unreliable packet network -- and why every backhaul of your latency budget lives here.",
    prerequisites: [],
    relatedConcepts: ["dns", "tls-handshake", "http-lifecycle", "load-balancing"],
    tags: ["tcp", "transport", "handshake", "congestion", "networking"],

    why: `Networks lose packets, reorder them, duplicate them, and delay them. Applications almost never want to deal with that. They want to write bytes on one end and read the **same bytes, in order, exactly once** on the other end.

**TCP exists to turn an unreliable packet network (IP) into a reliable, ordered, flow-controlled byte stream.** Before TCP, every application would have had to reinvent retransmission, ordering, and congestion control -- badly. TCP standardises the hard parts once, in the kernel.

HTTP, gRPC, PostgreSQL's wire protocol, Redis, Kafka -- almost everything you operate rides on TCP.`,

    intuition: `Think of a **phone call where both sides confirm every sentence**.

- You don't start talking until the other person picks up and you both say "can you hear me?" (the handshake).
- As you talk, the listener keeps nodding ("got it, got it") -- those are ACKs.
- If they stop nodding, you assume they missed the last thing and you repeat it (retransmission).
- If you talk faster than they can absorb, they say "slow down" (flow control).
- If the *phone line itself* is crackling and dropping words, you both instinctively slow down (congestion control).

That's TCP. A conversation with delivery confirmation, backpressure, and politeness about shared infrastructure.`,

    howItWorks: `A TCP connection has three phases: **setup, data transfer, teardown.**

### 1. The three-way handshake (setup)
\`\`\`
Client                         Server
  |  --- SYN (seq=x) --------->  |   "I want to talk, my seq starts at x"
  |  <-- SYN-ACK (seq=y,ack=x+1) |   "OK, my seq starts at y, I got your x"
  |  --- ACK (ack=y+1) -------->  |   "Got your y. We're connected."
\`\`\`
This exchanges **initial sequence numbers** and confirms both directions work. It also costs you **one full round trip (1 RTT) before any data flows** -- this is why connection reuse and keep-alive matter so much.

### 2. Reliable, ordered data transfer
- Every byte has a **sequence number**. The receiver ACKs the highest contiguous byte it has received.
- Data is sent in **segments**. If an ACK doesn't arrive before a timer (RTO) fires, the sender **retransmits**.
- Out-of-order segments are **buffered** and reassembled, so the application always reads bytes in order.

### 3. Flow control (don't overwhelm the receiver)
The receiver advertises a **window**: "I have room for N more bytes." The sender never has more than a window's worth of unacknowledged data in flight.

### 4. Congestion control (don't overwhelm the network)
Separate from flow control. The sender keeps a **congestion window (cwnd)** that grows slowly (slow start, then congestion avoidance) and **shrinks on packet loss**. This is why a lossy link kills throughput even when both endpoints are fast.

### 5. Teardown
A FIN/ACK exchange in each direction closes the connection gracefully. The initiator lingers in **TIME_WAIT** to absorb stray packets.`,

    internals: `**Sequence & ACK numbers** are 32-bit and wrap around; they identify byte offsets, not packets.

**RTO (retransmission timeout)** is derived from a smoothed estimate of RTT and its variance. Too aggressive and you retransmit needlessly; too slow and recovery stalls.

**Fast retransmit:** three duplicate ACKs for the same byte mean "I'm still missing the next segment" -- the sender resends immediately instead of waiting for the timer.

**Nagle's algorithm** batches small writes to avoid flooding the network with tiny packets. Combined with **delayed ACKs** it can add ~40ms of latency -- which is why latency-sensitive protocols set \`TCP_NODELAY\`.

**Head-of-line blocking:** because TCP guarantees order, one lost segment stalls delivery of everything behind it, even if those later bytes already arrived. This is a core reason **HTTP/3 abandoned TCP for QUIC (over UDP)**.

**Head-of-line blocking is a TCP property, not an HTTP one** -- HTTP/2 multiplexing still suffers from it because all streams share one TCP connection.`,

    diagram: {
      title: "TCP three-way handshake + data",
      layers: [
        { id: "syn", label: "SYN", sub: "client -> server: seq=x" },
        { id: "synack", label: "SYN-ACK", sub: "server -> client: seq=y, ack=x+1" },
        { id: "ack", label: "ACK", sub: "client -> server: ack=y+1  (1 RTT gone)" },
        { id: "data", label: "DATA + ACK", sub: "sequenced bytes, windowed, retransmitted on loss" },
        { id: "fin", label: "FIN / ACK", sub: "graceful teardown, then TIME_WAIT" },
      ],
      caption: "One RTT is spent before a single byte of application data moves. Reuse connections.",
    },

    realWorld: `You deploy a new API region in Mumbai but your database is still in Virginia. Each query now crosses ~200ms RTT. Because your ORM opens a fresh connection per request, **every request pays the TCP handshake (1 RTT) plus the TLS handshake (1-2 RTT) plus the query round trip** -- p99 latency explodes even though CPU is idle. The fix is connection pooling, not a bigger box. TCP is why "just move it closer" and "reuse connections" are the two most powerful latency levers you have.`,

    production: `- **Always reuse connections.** HTTP keep-alive, DB connection pools, gRPC channels. The handshake tax is per-connection, not per-request.
- **Watch \`ss -ti\`** for \`retrans\`, \`rtt\`, and \`cwnd\`. Rising retransmits = packet loss somewhere in the path.
- **TIME_WAIT exhaustion:** a busy client that opens/closes many short connections can run out of ephemeral ports. Pool connections; don't churn them.
- **Set \`TCP_NODELAY\`** for request/response protocols that send small messages and care about latency.
- **Tune keepalive** so dead peers behind load balancers get reaped instead of silently hanging.`,

    commonMistakes: [
      "Opening a new connection (and handshake) for every request instead of pooling.",
      "Blaming the application for latency that is actually cross-region RTT multiplied by handshakes.",
      "Confusing flow control (receiver-driven) with congestion control (network-driven).",
      "Assuming TCP guarantees delivery to the application -- it guarantees delivery to the kernel buffer; a crash after ACK can still lose data.",
      "Expecting HTTP/2 multiplexing to remove head-of-line blocking -- it only moves it up a layer; the TCP layer still stalls.",
    ],

    tradeoffs: `| Property | TCP gives you | The cost |
|---|---|---|
| Reliability | Retransmission, ordering | Latency on loss; head-of-line blocking |
| Ordering | In-order byte stream | One lost packet stalls everything behind it |
| Congestion control | Fair sharing of links | Throughput collapses on lossy/high-latency paths |
| Connection state | Multiplexing, flow control | Handshake cost; state to track (SYN floods, TIME_WAIT) |

When you can't accept head-of-line blocking or handshake latency, you drop to **UDP** and rebuild what you need (QUIC does exactly this).`,

    whenToUse: [
      "Anything that needs reliable, ordered delivery: HTTP APIs, databases, message brokers.",
      "Long-lived connections where handshake cost amortizes away.",
      "When you want the kernel to handle retransmission and congestion control for you.",
    ],
    whenNotToUse: [
      "Real-time media/gaming where a late packet is worse than a lost one (use UDP).",
      "When head-of-line blocking across independent streams is unacceptable (use QUIC/HTTP3).",
      "Ultra-high-fanout, tiny, fire-and-forget messages where connection state is too expensive.",
    ],

    memoryCard: {
      problem: "Reliable, ordered communication over an unreliable packet network.",
      mentalModel: "A phone call where both sides confirm every sentence and slow down if the line is bad.",
      keyConcepts: ["3-way handshake", "sequence numbers & ACKs", "retransmission", "flow control (window)", "congestion control (cwnd)", "head-of-line blocking"],
      productionConnection: "HTTP -> TLS -> TCP -> IP. One RTT is spent before any data; reuse connections.",
      oneLiner: "TCP gives applications a reliable, ordered byte stream -- at the cost of a handshake and head-of-line blocking.",
    },

    quiz: [
      {
        id: "tcp-q1",
        prompt: "Why does opening a new TCP connection for every HTTP request hurt latency so much across regions?",
        choices: [
          { text: "TCP encrypts every packet, which is slow", correct: false },
          { text: "Each connection pays a full round-trip handshake before any data flows", correct: true },
          { text: "TCP can only send one request per connection", correct: false },
          { text: "The kernel rate-limits new connections", correct: false },
        ],
        explanation:
          "The three-way handshake costs ~1 RTT before any application byte moves (plus 1-2 more RTT for TLS). Across a 200ms path that is pure overhead per request unless you reuse connections.",
      },
      {
        id: "tcp-q2",
        prompt: "What is head-of-line blocking in TCP?",
        choices: [
          { text: "The server refuses new connections when overloaded", correct: false },
          { text: "A lost segment stalls delivery of all later bytes that already arrived, because TCP must deliver in order", correct: true },
          { text: "The load balancer sends all traffic to one backend", correct: false },
          { text: "The first request in a pipeline always finishes last", correct: false },
        ],
        explanation:
          "Because TCP guarantees in-order delivery, a single missing segment holds back everything behind it in the buffer -- even independent HTTP/2 streams sharing the connection.",
      },
      {
        id: "tcp-q3",
        prompt: "Flow control and congestion control differ how?",
        choices: [
          { text: "They are two names for the same window", correct: false },
          { text: "Flow control protects the receiver; congestion control protects the network", correct: true },
          { text: "Flow control is TCP; congestion control is IP", correct: false },
          { text: "Congestion control only runs during the handshake", correct: false },
        ],
        explanation:
          "The receiver's advertised window is flow control (don't overwhelm me). The sender's congestion window reacts to loss in the path -- that's congestion control (don't overwhelm the shared network).",
      },
    ],

    lab: {
      kind: "terminal",
      title: "Investigate a slow connection",
      brief:
        "An API call is slow. Use ss, ping, and curl timing to determine whether the bottleneck is the handshake, the network path, or the backend.",
      scenarioId: "tcp-latency",
      successCriteria: [
        "Identify high RTT vs high retransmits vs slow backend",
        "Recommend connection reuse or moving closer",
      ],
    },
  },

  {
    slug: "dns",
    title: "DNS",
    track: "shared",
    phase: "networking",
    module: "net-core",
    difficulty: "core",
    estMinutes: 20,
    summary:
      "The distributed, cached name-to-address system that resolves before every connection -- and a top cause of confusing production outages.",
    prerequisites: [],
    relatedConcepts: ["tcp", "http-lifecycle", "load-balancing"],
    tags: ["dns", "resolution", "ttl", "caching", "networking"],

    why: `Humans and services use names (\`api.example.com\`); the network routes on IP addresses. Something has to translate, and it has to do so at massive scale, globally, with caching, without a single point of failure.

**DNS is the distributed database that maps names to records (mostly IP addresses).** It runs before *every* connection you make, which means when DNS is slow or wrong, *everything* looks broken -- and the cause is invisible unless you know to look.`,

    intuition: `DNS is a **chain of receptionists, each of whom remembers answers for a while.**

You ask your local resolver "where is api.example.com?". If it remembers (cache hit), you get an instant answer. If not, it walks the hierarchy: root -> \`.com\` -> \`example.com\`'s authoritative server -> the record. Then it **remembers the answer for TTL seconds**.

The catch: because everyone caches, a change you make doesn't take effect everywhere until every cache's TTL expires. DNS trades global consistency for scale and speed.`,

    howItWorks: `### Resolution flow (cache miss)
\`\`\`
app -> stub resolver (OS) -> recursive resolver (ISP/8.8.8.8)
        -> root server  ("ask .com")
        -> TLD server   ("ask example.com's NS")
        -> authoritative ("A record = 203.0.113.10, TTL 300")
\`\`\`
The recursive resolver does the walking and caches every step.

### Record types you actually use
- **A / AAAA** -- name -> IPv4 / IPv6.
- **CNAME** -- name -> another name (alias). Cannot coexist with other records at the same name.
- **NS** -- delegates a zone to authoritative servers.
- **MX** -- mail servers. **TXT** -- SPF/DKIM/verification. **SRV** -- service discovery.

### TTL is the whole game
Every record carries a **TTL**. Low TTL = faster propagation of changes but more query load. High TTL = cheaper and faster resolution but slow to change. Before a planned migration you *lower the TTL in advance* so the cutover is fast.`,

    internals: `- **Caching happens at many layers:** the OS stub resolver, the recursive resolver, sometimes the application/runtime (the JVM historically cached DNS *forever* by default -- a classic outage).
- **Negative caching:** NXDOMAIN (name doesn't exist) is also cached, so a typo or a not-yet-created record can "stick" as broken for a while.
- **DNS traditionally uses UDP (port 53)** for speed, falling back to TCP for large responses; DoT/DoH now tunnel it over TLS/HTTPS.
- **Round-robin / GeoDNS / weighted records** let DNS act as a coarse load balancer and traffic director, but it's coarse precisely *because of caching* -- you can't instantly drain a host via DNS.`,

    diagram: {
      title: "Recursive DNS resolution",
      layers: [
        { id: "app", label: "Application", sub: "getaddrinfo(\"api.example.com\")" },
        { id: "stub", label: "OS stub + cache", sub: "hit? return instantly" },
        { id: "recursive", label: "Recursive resolver", sub: "walks hierarchy, caches each step" },
        { id: "root", label: "Root -> TLD -> Authoritative", sub: "returns A record + TTL" },
        { id: "conn", label: "Now TCP/TLS/HTTP can begin", sub: "resolution happens before every new host" },
      ],
      caption: "Resolution precedes the connection. If this is slow, the whole request is slow.",
    },

    realWorld: `You update a load balancer and change the A record for \`api.example.com\`. Half your users hit the new IP immediately; the other half keep hitting the old (now-dead) one for up to the TTL. Support tickets say "the site is down" and "the site is fine" at the same time. The lesson: **DNS changes are eventually consistent, bounded by TTL.** Plan cutovers by lowering TTL first.`,

    production: `- **Lower TTL before planned migrations**, restore it after.
- **Beware runtime DNS caching** (old JVMs, some connection pools) that ignore TTL -- pin \`networkaddress.cache.ttl\`.
- **Monitor resolution latency**, not just backend latency. \`dig\` / \`nslookup\` timing tells you if DNS is the culprit.
- **Don't use DNS as a fast failover mechanism** -- caches make it slow. Use a load balancer or Anycast for instant failover.
- **Health-checked DNS (GeoDNS/weighted)** is great for coarse traffic steering, not for per-second decisions.`,

    commonMistakes: [
      "Expecting a DNS change to take effect instantly -- it's bounded by TTL and layered caches.",
      "Using DNS round-robin as your only load balancer and being surprised by uneven traffic.",
      "Forgetting negative caching: a mistyped record can stay 'broken' after you fix it.",
      "Runtimes caching DNS forever, so your app keeps calling a decommissioned IP.",
      "Putting a CNAME at the zone apex (not allowed) instead of an ALIAS/ANAME record.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| High TTL | Fewer queries, faster resolution | Slow to propagate changes |
| Low TTL | Fast cutovers | More query load, more resolver dependency |
| DNS load balancing | Simple, global | Coarse; caching prevents instant drain |
| Anycast | Instant failover, low latency | Operationally complex |`,

    whenToUse: [
      "Service discovery at human scale and coarse global traffic steering.",
      "Naming that must be stable while underlying IPs change.",
    ],
    whenNotToUse: [
      "Sub-second failover (caches make DNS too slow).",
      "Fine-grained per-request load balancing (use an L4/L7 balancer).",
    ],

    memoryCard: {
      problem: "Translate stable human/service names into routable IP addresses, globally and at scale.",
      mentalModel: "A chain of receptionists who each remember answers for TTL seconds.",
      keyConcepts: ["recursive vs authoritative", "A/CNAME/NS/MX records", "TTL", "layered caching", "negative caching", "eventual consistency"],
      productionConnection: "Runs before every new connection; lower TTL before migrations; don't use it for fast failover.",
      oneLiner: "DNS is an eventually-consistent, cached name->IP database whose TTLs govern how fast changes propagate.",
    },

    quiz: [
      {
        id: "dns-q1",
        prompt: "You change an A record and some users still hit the old IP. Why?",
        choices: [
          { text: "DNS is broken", correct: false },
          { text: "Caches hold the old record until its TTL expires", correct: true },
          { text: "You must restart the root servers", correct: false },
          { text: "A records cannot be changed", correct: false },
        ],
        explanation: "Resolvers and OS/runtime caches keep the old answer until its TTL elapses. DNS propagation is bounded by TTL.",
      },
      {
        id: "dns-q2",
        prompt: "Why is DNS a poor mechanism for instant failover?",
        choices: [
          { text: "It only supports IPv4", correct: false },
          { text: "Caching means clients keep using stale records for up to the TTL", correct: true },
          { text: "It requires TCP for every query", correct: false },
          { text: "Authoritative servers are always down", correct: false },
        ],
        explanation: "Even with a low TTL, layered caches delay propagation. For instant failover use a load balancer or Anycast.",
      },
    ],

    lab: {
      kind: "terminal",
      title: "Is it DNS?",
      brief: "A service intermittently fails to connect. Use dig and check TTLs to decide whether DNS resolution is the problem.",
      scenarioId: "dns-debug",
      successCriteria: ["Compare resolution latency to backend latency", "Identify stale/misconfigured record"],
    },
  },

  {
    slug: "load-balancing",
    title: "Load Balancing",
    track: "shared",
    phase: "networking",
    module: "net-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Spreading traffic across many backends for scale and availability -- L4 vs L7, algorithms, health checks, and the failure modes that surprise people.",
    prerequisites: ["tcp"],
    relatedConcepts: ["tcp", "dns", "http-lifecycle", "k8s-services-ingress"],
    tags: ["load-balancing", "l4", "l7", "health-checks", "availability"],

    why: `A single server has a ceiling: CPU, memory, connections, and a blast radius of exactly one. **Load balancing exists to (1) scale horizontally beyond one box and (2) survive the failure of any single box** by spreading requests across a pool and routing away from unhealthy members.

It's the component that turns "N servers" into "one virtual service."`,

    intuition: `A load balancer is the **host at a busy restaurant** deciding which table (server) gets the next party (request).

- A good host avoids seating everyone at one table (round robin / least connections).
- A good host stops seating tables where the waiter walked out (health checks).
- Some parties need the *same* waiter who knows their order (session affinity / sticky sessions).
- If the host themselves collapses, the whole restaurant stops -- so you need more than one host (HA pairs / Anycast).`,

    howItWorks: `### L4 vs L7 -- the key distinction
- **L4 (transport):** balances **TCP/UDP connections** by IP/port. It doesn't read the request. Fast, protocol-agnostic, cheap. Can't route by URL or do per-request retries.
- **L7 (application):** terminates the connection and reads **HTTP**. Can route by path/host/header, retry idempotent requests, do TLS termination, rate limiting, and observability. More work per request.

### Algorithms
- **Round robin** -- simple, ignores load.
- **Least connections** -- sends to the backend with fewest in-flight; better under uneven request costs.
- **Weighted** -- bigger boxes get more traffic; useful during canary/migration.
- **Consistent hashing** -- same key -> same backend, minimising cache churn when the pool changes.

### Health checks
The balancer probes each backend (\`GET /healthz\`). Failing members are removed; recovered ones are re-added. **The quality of your health check defines your availability** -- a shallow check (TCP connect) misses a backend that accepts connections but can't reach the DB.`,

    internals: `- **Connection draining / graceful shutdown:** on deploy, the balancer stops sending *new* requests to a backend but lets in-flight ones finish. Skip this and every deploy causes a burst of 502s.
- **The thundering herd on failover:** when a backend drops, its load lands on the survivors instantly. If they were near capacity, you get a cascading failure. Capacity plan for N-1.
- **Sticky sessions** pin a client to a backend (via cookie or hash). Convenient for in-memory session state, but it breaks even load distribution and complicates draining. Prefer stateless backends + shared session store.
- **Retries amplify outages:** an L7 balancer retrying failed requests can multiply load during an incident. Budget retries and use circuit breakers.`,

    diagram: {
      title: "L7 load balancer in the request path",
      layers: [
        { id: "client", label: "Clients", sub: "DNS -> LB virtual IP" },
        { id: "lb", label: "L7 Load Balancer", sub: "TLS term, routing, health checks, retries" },
        { id: "pool", label: "Backend pool", sub: "least-connections across healthy members" },
        { id: "drain", label: "Draining node", sub: "no new requests; finish in-flight" },
        { id: "db", label: "Shared state (DB/Redis)", sub: "keep backends stateless" },
      ],
      caption: "The balancer turns a pool of stateless backends into one resilient virtual service.",
    },

    realWorld: `During a deploy, users see a wave of 502s for ~10 seconds. Cause: pods were killed before the load balancer stopped routing to them -- no connection draining and no \`preStop\` delay. In-flight requests were cut. The fix isn't more servers; it's **graceful shutdown + readiness probes + draining** so the balancer removes a backend *before* it dies.`,

    production: `- **Deep health checks** (\`/healthz\` that verifies DB/cache reachability), but keep them cheap and fast.
- **Enable connection draining** and a \`preStop\` sleep so deploys don't drop in-flight requests.
- **Capacity plan for N-1** (or N-2) so a failover doesn't cascade.
- **Prefer stateless backends** + shared session store over sticky sessions.
- **Bound retries** and add circuit breakers so the LB doesn't amplify an outage.
- **Watch per-backend latency/error spread** -- one slow backend receiving equal traffic is a classic tail-latency source.`,

    commonMistakes: [
      "Shallow health checks (TCP connect only) that keep routing to a backend that can't serve.",
      "No connection draining -> 502 bursts on every deploy.",
      "Running backends at >50% so any failover cascades.",
      "Relying on sticky sessions instead of externalising session state.",
      "Unbounded retries that turn a small blip into a full outage.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| L4 | Fast, cheap, protocol-agnostic | No content routing, no per-request retry |
| L7 | Rich routing, retries, TLS, observability | More CPU per request, more to operate |
| Sticky sessions | Simple stateful backends | Uneven load, hard draining |
| Aggressive retries | Hide transient errors | Amplify real outages |`,

    whenToUse: [
      "Any service that must scale beyond one instance or survive an instance failure.",
      "L7 when you need path/host routing, TLS termination, or request-level retries.",
      "Consistent hashing when backends hold caches keyed by request.",
    ],
    whenNotToUse: [
      "As a substitute for fixing an overloaded backend -- balancing doesn't add capacity.",
      "Sticky sessions when you can externalise state instead.",
    ],

    memoryCard: {
      problem: "Turn many backends into one scalable, fault-tolerant virtual service.",
      mentalModel: "A restaurant host seating parties at healthy tables and refusing tables whose waiter left.",
      keyConcepts: ["L4 vs L7", "round-robin / least-conn / consistent hash", "health checks", "connection draining", "N-1 capacity", "retry amplification"],
      productionConnection: "Deep health checks + draining + readiness probes prevent deploy-time 502s; capacity plan for N-1.",
      oneLiner: "A load balancer spreads traffic across healthy backends -- and its health checks and draining define your real availability.",
    },

    quiz: [
      {
        id: "lb-q1",
        prompt: "What's the core difference between an L4 and an L7 load balancer?",
        choices: [
          { text: "L4 is faster because it uses UDP only", correct: false },
          { text: "L7 reads the application request (e.g. HTTP) and can route/retry by content; L4 balances raw connections", correct: true },
          { text: "L4 does TLS termination, L7 does not", correct: false },
          { text: "There is no real difference", correct: false },
        ],
        explanation: "L4 balances TCP/UDP connections without inspecting them. L7 terminates and reads the request, enabling path/header routing, retries, and TLS termination.",
      },
      {
        id: "lb-q2",
        prompt: "Deploys cause a burst of 502s. What's the most likely fix?",
        choices: [
          { text: "Add more CPU to each backend", correct: false },
          { text: "Enable connection draining / readiness probes so the LB stops routing to a pod before it dies", correct: true },
          { text: "Switch from L7 to L4", correct: false },
          { text: "Increase the DNS TTL", correct: false },
        ],
        explanation: "502s on deploy usually mean in-flight requests were cut. Draining + readiness + a preStop delay let the balancer remove a backend gracefully before it terminates.",
      },
      {
        id: "lb-q3",
        prompt: "Why can aggressive retries make an outage worse?",
        choices: [
          { text: "Retries use more DNS queries", correct: false },
          { text: "They multiply load onto already-struggling backends, causing a cascade", correct: true },
          { text: "Retries always hit a dead backend", correct: false },
          { text: "They disable health checks", correct: false },
        ],
        explanation: "When backends are failing, retrying every request multiplies traffic on the survivors. Bound retries and use circuit breakers to avoid amplification.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a resilient LB config",
      brief: "Given a 4-node pool at 70% CPU, decide health-check depth, draining, retry budget, and whether N-1 survives failover.",
      steps: `1. Compute post-failover load if one node dies (traffic / 3 nodes).\n2. Decide if the survivors stay under a safe CPU threshold (~80%).\n3. Choose a health check that verifies dependency reachability.\n4. Define a retry budget (e.g. 10% of requests) + circuit breaker.\n5. Write the graceful-shutdown sequence (readiness off -> drain -> terminate).`,
      successCriteria: ["N-1 keeps survivors under threshold", "Health check verifies dependencies", "Retries are bounded"],
    },
  },
];
