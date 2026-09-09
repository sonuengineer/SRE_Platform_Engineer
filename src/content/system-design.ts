// Interactive system design problems. The learner assembles components on a
// canvas; the platform evaluates the design against requirements across the
// classic dimensions.

export type Dimension =
  | "Scalability"
  | "Availability"
  | "Reliability"
  | "Consistency"
  | "Cost"
  | "Security";

export interface DesignComponent {
  id: string;
  label: string;
  category: "edge" | "compute" | "data" | "async" | "storage" | "security";
  blurb: string;
}

// The shared palette available on every canvas.
export const COMPONENTS: DesignComponent[] = [
  { id: "client", label: "Client", category: "edge", blurb: "Browser / mobile app." },
  { id: "dns", label: "DNS", category: "edge", blurb: "Name resolution + coarse traffic steering." },
  { id: "cdn", label: "CDN", category: "edge", blurb: "Caches static/edge content close to users." },
  { id: "lb", label: "Load Balancer", category: "edge", blurb: "Spreads traffic across healthy backends." },
  { id: "apigw", label: "API Gateway", category: "edge", blurb: "Auth, routing, rate limiting at the edge." },
  { id: "api", label: "API Servers", category: "compute", blurb: "Stateless application servers." },
  { id: "worker", label: "Workers", category: "compute", blurb: "Process background jobs off the request path." },
  { id: "cache", label: "Redis Cache", category: "data", blurb: "Low-latency cache / counters / locks." },
  { id: "db", label: "SQL DB (Postgres)", category: "data", blurb: "Durable, transactional source of truth." },
  { id: "replica", label: "Read Replica", category: "data", blurb: "Scales reads; async lag." },
  { id: "nosql", label: "NoSQL / Wide-column", category: "data", blurb: "High write throughput, horizontal scale." },
  { id: "shard", label: "Sharding", category: "data", blurb: "Partition data across nodes for scale." },
  { id: "queue", label: "Kafka / Queue", category: "async", blurb: "Durable, decoupled event stream." },
  { id: "search", label: "Search Index", category: "data", blurb: "Full-text / inverted index (e.g. Elastic)." },
  { id: "blob", label: "Object Storage (S3)", category: "storage", blurb: "Cheap durable storage for large blobs." },
  { id: "ws", label: "WebSocket Gateway", category: "compute", blurb: "Persistent bidirectional connections." },
  { id: "ratelimit", label: "Rate Limiter", category: "security", blurb: "Protects backends from abuse/overload." },
];

export const COMPONENT_BY_ID: Record<string, DesignComponent> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c])
);

export interface Requirement {
  componentId: string;
  why: string;
  dimensions: Dimension[];
  weight: number; // relative importance
}

export interface DesignProblem {
  id: string;
  title: string;
  prompt: string;
  tags: string[];
  constraints: string[];
  requirements: Requirement[]; // components a strong design must include
  bonuses: Requirement[]; // nice-to-haves
  antipatterns?: { componentId: string; why: string }[]; // including these hurts
  modelSolution: string; // markdown
  relatedLessons: string[];
}

export const DESIGN_PROBLEMS: DesignProblem[] = [
  {
    id: "url-shortener",
    title: "URL Shortener",
    prompt:
      "Design a service like bit.ly: create short codes for long URLs and redirect billions of reads with very low latency. Read-heavy (100:1 read/write).",
    tags: ["url-shortener", "read-heavy", "cache", "cdn", "kv"],
    constraints: [
      "~100M new URLs/month, 10B redirects/month (read-heavy ~100:1)",
      "Redirect p99 < 50ms globally",
      "Short codes are permanent and must not collide",
    ],
    requirements: [
      { componentId: "lb", why: "Spread redirect traffic across many stateless servers.", dimensions: ["Scalability", "Availability"], weight: 2 },
      { componentId: "api", why: "Stateless servers do the code<->URL lookup.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "cache", why: "Redirects are extremely read-heavy; cache hot codes for sub-ms lookups and to shield the DB.", dimensions: ["Scalability", "Cost"], weight: 3 },
      { componentId: "db", why: "Durable store of code->URL mappings (source of truth).", dimensions: ["Reliability", "Consistency"], weight: 3 },
    ],
    bonuses: [
      { componentId: "cdn", why: "Edge-cache redirects close to users for global low latency.", dimensions: ["Scalability", "Availability"], weight: 2 },
      { componentId: "nosql", why: "A KV/wide-column store fits the simple lookup and scales writes horizontally.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "ratelimit", why: "Prevent abuse of the create endpoint.", dimensions: ["Security"], weight: 1 },
      { componentId: "replica", why: "Read replicas add read capacity for cache-miss traffic.", dimensions: ["Scalability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "queue", why: "A redirect is a synchronous read; a queue adds latency for no benefit on the hot path." },
    ],
    modelSolution: `**Key insight: this is a caching problem, not a compute problem.** 100:1 reads mean the redirect path must be dominated by cache/CDN hits, with the database only touched on cache misses.

**Write path (create):** validate URL -> generate a unique short code (base62 of an ID, or a hash with collision check) -> store code->URL in the durable DB -> return the short URL. Rate-limit this endpoint.

**Read path (redirect -- the hot path):** client -> CDN/edge cache -> LB -> stateless API -> **Redis cache** (hit returns in <1ms) -> on miss, read DB, populate cache, return a 301/302. Because mappings are immutable, cache TTLs can be long and invalidation is trivial.

**Scale & cost:** a wide-column/KV store handles the simple lookup at scale; read replicas absorb cache-miss reads. The CDN pushes redirect latency near users globally.

**Consistency:** short codes must be unique -- generate from a monotonic ID or check-and-set. A slightly stale cache is fine because mappings don't change.`,
    relatedLessons: ["caching-dual", "redis-deep", "load-balancing", "dns"],
  },

  {
    id: "chat-system",
    title: "Real-time Chat",
    prompt:
      "Design a real-time 1:1 and group chat: deliver messages with low latency, persist history, show presence, and handle users who are offline.",
    tags: ["chat", "websocket", "realtime", "fan-out", "messaging"],
    constraints: [
      "Millions of concurrent connections",
      "Message delivery p99 < 200ms when both online",
      "Full history persisted and searchable; offline users get messages on reconnect",
    ],
    requirements: [
      { componentId: "ws", why: "Persistent bidirectional connections are required for real-time push (polling doesn't scale).", dimensions: ["Scalability"], weight: 3 },
      { componentId: "lb", why: "Distribute millions of connections across gateway nodes.", dimensions: ["Scalability", "Availability"], weight: 2 },
      { componentId: "queue", why: "Decouple send from fan-out/delivery and buffer for offline users; durable message log.", dimensions: ["Reliability", "Scalability"], weight: 3 },
      { componentId: "db", why: "Persist message history durably.", dimensions: ["Reliability"], weight: 3 },
      { componentId: "cache", why: "Presence, online-user routing, and recent messages belong in fast memory.", dimensions: ["Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "nosql", why: "Wide-column store fits huge, append-heavy message history partitioned by conversation.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "search", why: "Message search over history.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "blob", why: "Store media attachments cheaply; send references over chat.", dimensions: ["Cost"], weight: 1 },
      { componentId: "apigw", why: "Auth + connection admission at the edge.", dimensions: ["Security"], weight: 1 },
    ],
    modelSolution: `**Two problems: the real-time transport and the durable history.**

**Transport:** clients hold **WebSocket** connections to a fleet of gateway nodes behind an LB. Because a sender and receiver may be on *different* gateway nodes, you need a way to route a message to whichever node holds the recipient's connection -- a **pub/sub / queue** layer (or a presence registry in Redis mapping user -> gateway).

**Delivery + offline:** the sender's message goes to a **durable queue/log**; a delivery service fans it out. If the recipient is online, push over their WebSocket; if offline, it's persisted and delivered on reconnect (the log guarantees no loss).

**History & presence:** persist every message to a **wide-column DB** partitioned by conversation id (append-heavy, ordered). Keep **presence and recent messages in Redis** for speed. Media goes to **object storage**; only a reference travels through chat.

**Ordering:** key the message log by conversation id so messages in a conversation stay ordered (per-partition ordering). Use client-generated message ids for idempotency/dedup.`,
    relatedLessons: ["websockets-dual", "kafka-fundamentals", "redis-deep", "load-balancing"],
  },

  {
    id: "notification-system",
    title: "Notification System",
    prompt:
      "Design a system that sends notifications across channels (push, email, SMS) reliably at high volume, respecting user preferences and rate limits, and surviving flaky third-party providers.",
    tags: ["notifications", "fan-out", "queue", "retries", "idempotency"],
    constraints: [
      "Bursty: a single event can fan out to millions of users",
      "Providers (APNs, email, SMS) are flaky and rate-limited",
      "No duplicate notifications; respect user opt-outs and quiet hours",
    ],
    requirements: [
      { componentId: "queue", why: "Absorb bursts and decouple producers from delivery; durable buffer for retries.", dimensions: ["Reliability", "Scalability"], weight: 3 },
      { componentId: "worker", why: "Workers drain the queue and call providers, retrying with backoff.", dimensions: ["Reliability", "Scalability"], weight: 3 },
      { componentId: "db", why: "Store user preferences, opt-outs, and a dedup/idempotency ledger.", dimensions: ["Consistency", "Reliability"], weight: 2 },
      { componentId: "cache", why: "Fast lookups of preferences and rate-limit counters.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "ratelimit", why: "Respect per-provider and per-user rate limits to avoid bans/spam.", dimensions: ["Reliability", "Security"], weight: 2 },
    ],
    bonuses: [
      { componentId: "api", why: "An ingestion API for services to submit notification requests.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "lb", why: "Scale the ingestion tier.", dimensions: ["Availability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "ws", why: "Sending email/SMS/push doesn't need persistent client connections; that's the provider's job." },
    ],
    modelSolution: `**This is a reliability + fan-out problem, and the queue is the heart of it.**

**Ingestion:** an API accepts a notification request (event + audience). It resolves the audience, checks **preferences/opt-outs** and **quiet hours**, and enqueues per-recipient, per-channel jobs. A **dedup/idempotency key** (event id + user + channel) prevents duplicates on retry.

**Delivery:** **workers** drain the **queue** and call the right provider (push/email/SMS). Providers are flaky and rate-limited, so: **exponential backoff + jitter**, a **rate limiter** per provider, and a **dead-letter queue** for messages that keep failing.

**Bursts:** a single event fanning out to millions is absorbed by the durable queue -- workers process at a sustainable rate instead of overwhelming providers (or your DB). Monitor **queue depth** to autoscale workers.

**Correctness:** the idempotency ledger + at-least-once delivery means "never lose, never duplicate." Respect opt-outs at enqueue *and* at send (preferences can change between).`,
    relatedLessons: ["background-jobs-dual", "kafka-fundamentals", "rate-limiting", "idempotency"],
  },

  {
    id: "news-feed",
    title: "Social News Feed",
    prompt:
      "Design a social feed (like Twitter/Instagram home timeline): users follow others and see a ranked, recent feed. Handle celebrities with millions of followers.",
    tags: ["feed", "fan-out", "cache", "celebrity-problem", "social"],
    constraints: [
      "Read-heavy home timeline; must load fast",
      "Some users have 100M+ followers (fan-out explosion)",
      "Feed should be reasonably fresh (seconds), not necessarily strongly consistent",
    ],
    requirements: [
      { componentId: "cache", why: "Precomputed timelines / hot feed data live in memory for fast reads.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "queue", why: "Fan-out-on-write pushes new posts into followers' feeds asynchronously.", dimensions: ["Scalability", "Reliability"], weight: 3 },
      { componentId: "worker", why: "Workers do the fan-out and feed materialization off the request path.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "db", why: "Durable store of posts and the social graph.", dimensions: ["Reliability"], weight: 2 },
      { componentId: "lb", why: "Scale the stateless read tier.", dimensions: ["Availability"], weight: 1 },
    ],
    bonuses: [
      { componentId: "nosql", why: "Wide-column store fits timelines and huge post volume.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "blob", why: "Photos/videos in object storage; feed holds references.", dimensions: ["Cost"], weight: 1 },
      { componentId: "cdn", why: "Serve media from the edge.", dimensions: ["Scalability"], weight: 1 },
    ],
    modelSolution: `**The core tension is fan-out-on-write vs fan-out-on-read, and the answer is a hybrid.**

**Fan-out-on-write (push):** when a normal user posts, **workers** push the post id into each follower's precomputed timeline in **Redis**. Reads are then trivial and fast -- just read your materialized feed. Great for the common case.

**The celebrity problem:** a user with 100M followers would generate 100M writes per post -- an unacceptable fan-out. For these high-fan-out accounts, switch to **fan-out-on-read (pull):** don't pre-push; instead, at read time, merge the viewer's precomputed feed with recent posts pulled from the (few) celebrities they follow. This **hybrid** keeps writes bounded and reads fast.

**Storage:** posts and the social graph in a durable/ wide-column DB; media in **object storage** behind a **CDN**; timelines cached in Redis.

**Consistency:** feeds are **eventually consistent** -- a few seconds of delay is fine, which is exactly what lets you do async fan-out and heavy caching (AP-leaning by choice).`,
    relatedLessons: ["caching-dual", "kafka-fundamentals", "cap-theorem", "redis-deep"],
  },

  {
    id: "payment-system",
    title: "Payment System",
    prompt:
      "Design a payment system that charges customers and records money movement. Correctness is paramount: no double-charges, no lost payments, and an auditable ledger, even across retries and partial failures.",
    tags: ["payments", "idempotency", "ledger", "consistency", "exactly-once", "correctness"],
    constraints: [
      "Money must never be double-charged or silently lost -- correctness over availability",
      "Every state change must be durable and auditable (immutable ledger)",
      "External payment providers are flaky; clients and networks retry",
    ],
    requirements: [
      { componentId: "api", why: "Stateless payment API that accepts charge requests with a client-supplied idempotency key.", dimensions: ["Reliability", "Consistency"], weight: 3 },
      { componentId: "db", why: "Transactional SQL store for the immutable ledger and idempotency records; ACID guarantees prevent double-entry and lost writes.", dimensions: ["Consistency", "Reliability"], weight: 3 },
      { componentId: "queue", why: "Durably decouple the charge intent from provider calls; enables reliable retries and exactly-once effects via the ledger.", dimensions: ["Reliability", "Consistency"], weight: 3 },
      { componentId: "worker", why: "Workers call the payment provider with retries/backoff and reconcile the result back into the ledger.", dimensions: ["Reliability"], weight: 2 },
      { componentId: "cache", why: "Fast lookup of idempotency keys / in-flight charge state to reject duplicates quickly.", dimensions: ["Consistency"], weight: 1 },
    ],
    bonuses: [
      { componentId: "lb", why: "Spread the stateless API tier and survive instance loss.", dimensions: ["Availability"], weight: 1 },
      { componentId: "apigw", why: "Auth, signature verification, and per-merchant rate limiting at the edge.", dimensions: ["Security"], weight: 2 },
      { componentId: "replica", why: "Read replicas serve reporting/reconciliation queries without touching the write path.", dimensions: ["Scalability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "nosql", why: "A store without multi-row ACID transactions makes an accurate double-entry ledger and atomic idempotency hard; eventual consistency is the wrong default when correctness is the whole point." },
      { componentId: "cdn", why: "Payments are dynamic, per-user, security-sensitive writes; caching them at the edge is meaningless and dangerous." },
    ],
    modelSolution: `**Key insight: this is a correctness problem, not a scale problem. Idempotency + a durable ledger are the whole game.**

**Idempotency:** every charge request carries a client-supplied **idempotency key**. The API records that key transactionally *before* doing anything. If the same key arrives again (client retry, network retry), you return the original result instead of charging twice. This is what makes "at-least-once" retries safe.

**The ledger:** money movement is recorded as **immutable, append-only double-entry rows** in a **transactional SQL DB**. State transitions (pending -> authorized -> captured / failed) are written in ACID transactions so you can never end up half-charged. The ledger is the source of truth and the audit trail.

**Reliable provider calls:** the charge intent goes onto a **durable queue**; **workers** call the (flaky) external provider with **backoff + retries**, then write the outcome back into the ledger keyed by the idempotency/charge id. Because effects are keyed and the ledger is transactional, retries converge to **exactly-once effect** even with at-least-once delivery.

**Trade-off (CAP):** this system deliberately favors **consistency over availability**. When in doubt, refuse or hold the payment rather than risk a double-charge. Reconciliation jobs compare the ledger against provider statements to catch any drift.`,
    relatedLessons: ["idempotency", "acid-transactions", "kafka-fundamentals", "cap-theorem"],
  },

  {
    id: "ecommerce-platform",
    title: "E-commerce Platform",
    prompt:
      "Design an e-commerce platform: browse a product catalog, add to cart, place orders, and manage inventory. Reads (browsing) vastly outnumber writes (orders), and different data has different consistency needs.",
    tags: ["ecommerce", "catalog", "cart", "orders", "inventory", "mixed-consistency"],
    constraints: [
      "Catalog browsing is extremely read-heavy and must be fast globally",
      "Orders and inventory must be correct: don't oversell the last item",
      "Cart is per-user, high-churn, and can tolerate slight staleness",
    ],
    requirements: [
      { componentId: "lb", why: "Spread heavy browse traffic across the stateless web/API tier.", dimensions: ["Scalability", "Availability"], weight: 2 },
      { componentId: "api", why: "Stateless services for catalog, cart, and checkout.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "cache", why: "Cache hot catalog data and hold high-churn cart state in fast memory.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "db", why: "Transactional SQL for orders and inventory -- ACID prevents overselling.", dimensions: ["Consistency", "Reliability"], weight: 3 },
      { componentId: "search", why: "Product search / faceted browse over the catalog.", dimensions: ["Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "cdn", why: "Serve product images and static catalog content from the edge.", dimensions: ["Scalability", "Cost"], weight: 2 },
      { componentId: "replica", why: "Read replicas absorb catalog/order-history reads away from the write primary.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "queue", why: "Async order fulfillment, email, and inventory events off the checkout path.", dimensions: ["Reliability", "Scalability"], weight: 2 },
      { componentId: "blob", why: "Store product images/media cheaply.", dimensions: ["Cost"], weight: 1 },
    ],
    modelSolution: `**Key insight: pick the consistency model per data type. One size does not fit all here.**

**Catalog (read-heavy, tolerant of staleness):** browsing dwarfs everything else, so serve it from **cache** and a **CDN** (images/static content), backed by **read replicas**. Product search/faceting goes through a **search index**. A few seconds of catalog staleness is fine, which is exactly what lets you cache aggressively.

**Cart (per-user, high-churn, soft consistency):** keep carts in **Redis** -- fast, cheap to update, and losing a stray cart update is not catastrophic. This keeps churn off the transactional DB.

**Orders + inventory (must be correct):** checkout writes to a **transactional SQL DB**. The critical rule is **don't oversell**: decrement inventory inside the same transaction that creates the order (or use a reservation/conditional update), so two shoppers can't both buy the last unit. This is a strong-consistency island inside an otherwise eventually-consistent system.

**Fulfillment (async):** after the order commits, emit an event to a **queue** so fulfillment, receipts, and inventory propagation happen off the checkout path -- keeping checkout fast and resilient.

**Trade-off:** browse for scale (AP-leaning, cached), checkout for correctness (CP, transactional). Being explicit about which is which is the whole design.`,
    relatedLessons: ["caching-dual", "pg-indexes", "acid-transactions", "cap-theorem"],
  },

  {
    id: "food-delivery",
    title: "Food Delivery",
    prompt:
      "Design a food-delivery platform: customers order from restaurants, the system matches orders to nearby couriers, and everyone tracks the delivery in real time with live location and status notifications.",
    tags: ["food-delivery", "real-time", "location", "matching", "notifications", "geo"],
    constraints: [
      "Live courier location updates stream continuously and must reach the customer with low latency",
      "Match each order to a suitable nearby courier quickly",
      "Order state (placed -> accepted -> picked up -> delivered) must be reliable; notifications on each change",
    ],
    requirements: [
      { componentId: "ws", why: "Persistent connections push live courier location and order-status updates to customers/couriers in real time.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "api", why: "Stateless services for ordering, matching, and status.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "cache", why: "Hold live courier locations and geo-indexes in memory for fast proximity matching.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "db", why: "Durable, transactional store for orders and their state transitions.", dimensions: ["Consistency", "Reliability"], weight: 3 },
      { componentId: "queue", why: "Decouple matching, notifications, and location fan-out; buffer high-rate location events.", dimensions: ["Reliability", "Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "worker", why: "Workers run the matching algorithm and dispatch notifications off the request path.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "lb", why: "Distribute API and WebSocket connections across nodes.", dimensions: ["Availability", "Scalability"], weight: 1 },
      { componentId: "nosql", why: "High-write store for the firehose of historical location pings.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "apigw", why: "Auth and rate limiting for mobile clients at the edge.", dimensions: ["Security"], weight: 1 },
    ],
    modelSolution: `**Key insight: separate the durable order lifecycle from the ephemeral real-time location stream. They have opposite requirements.**

**Real-time transport:** customers and couriers hold **WebSocket** connections (behind an LB) so the server can *push* live location and status without polling. Couriers stream location pings frequently; the system fans them out to the watching customer with low latency.

**Location + matching:** current courier locations live in **Redis** as a geo-index (e.g. geohash / sorted sets). To match an order, query the in-memory geo-index for couriers near the restaurant and pick the best candidate -- fast because it never touches the durable DB. **Workers** run the matching/dispatch logic.

**Durable order lifecycle:** the order and its state machine (placed -> accepted -> picked up -> delivered) live in a **transactional SQL DB**. State changes are the reliable, must-not-be-lost part -- distinct from the fire-hose of location pings, which are ephemeral and can be lossy.

**Decoupling + notifications:** a **queue** buffers the high-rate location events and decouples matching and notification fan-out from the request path. Each order-state change enqueues a notification. Optionally, raw historical location pings land in a **high-write NoSQL** store for analytics.

**Trade-off:** location data is best-effort and eventually consistent (drop a stale ping, no harm); order state is strongly consistent and durable. Designing them as two separate paths is the key move.`,
    relatedLessons: ["websockets-dual", "redis-deep", "kafka-fundamentals", "load-balancing"],
  },

  {
    id: "video-streaming",
    title: "Video Streaming",
    prompt:
      "Design a video-streaming platform (like YouTube/Netflix): creators upload videos, the system transcodes them into multiple resolutions, and millions of viewers stream them with low buffering worldwide.",
    tags: ["video", "cdn", "transcoding", "object-storage", "read-heavy", "streaming"],
    constraints: [
      "Massive read scale: millions of concurrent viewers, global",
      "Uploads are large; transcoding into multiple bitrates is heavy and async",
      "Playback must start fast and rarely buffer, worldwide",
    ],
    requirements: [
      { componentId: "blob", why: "Store raw uploads and transcoded renditions durably and cheaply -- object storage is the backbone.", dimensions: ["Scalability", "Cost"], weight: 3 },
      { componentId: "cdn", why: "Serve video segments from edge caches close to viewers -- this is what makes global low-buffer playback possible.", dimensions: ["Scalability", "Availability"], weight: 3 },
      { componentId: "queue", why: "Enqueue transcoding jobs; decouple heavy async processing from upload.", dimensions: ["Reliability", "Scalability"], weight: 3 },
      { componentId: "worker", why: "Transcoding workers convert uploads into multiple resolutions/bitrates off the request path.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "db", why: "Store video metadata, catalog, and upload/processing state.", dimensions: ["Reliability", "Consistency"], weight: 2 },
    ],
    bonuses: [
      { componentId: "api", why: "Stateless services for upload orchestration, metadata, and playback manifests.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "lb", why: "Spread API/control-plane traffic across servers.", dimensions: ["Availability"], weight: 1 },
      { componentId: "cache", why: "Cache hot metadata and playback manifests.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "search", why: "Search/discovery over the video catalog.", dimensions: ["Scalability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "db", why: "Storing the actual video bytes as blobs in the SQL DB is a classic mistake -- it does not scale, is expensive, and bypasses the CDN. Metadata belongs in the DB; media belongs in object storage." },
    ],
    modelSolution: `**Key insight: the read path is a CDN/object-storage problem, and transcoding is an async worker problem. The DB only holds metadata.**

**Upload + transcode (write path, async):** creators upload the raw file to **object storage** (often via a pre-signed URL, straight to blob storage). That triggers a **transcoding job** on a **queue**; **workers** convert the source into multiple resolutions/bitrates and segment it for adaptive streaming (HLS/DASH), writing every rendition back to **object storage**. Metadata and processing state go in the **SQL DB**. This is heavy and slow, so it must be off the request path.

**Playback (read path -- the scale challenge):** viewers fetch a small manifest, then pull video **segments through the CDN**. The CDN edge-caches segments close to users, so the vast majority of read traffic never reaches your origin -- this is what delivers global, low-buffer playback at millions-of-viewers scale. Adaptive bitrate lets the client drop resolution instead of buffering.

**Metadata vs media:** never store video bytes in the database. The DB holds catalog/metadata (searchable, small, transactional); **object storage** holds the (huge, immutable) media; the **CDN** serves it. Mixing these up is the canonical failure.

**Trade-off:** immutable media + long CDN TTLs make caching and invalidation trivial. You spend on storage and egress (CDN) to buy read scalability and low latency -- the right trade for a read-dominated system.`,
    relatedLessons: ["cdn-edge", "background-jobs-dual", "caching-dual", "kafka-fundamentals"],
  },

  {
    id: "ride-sharing",
    title: "Ride Sharing",
    prompt:
      "Design a ride-sharing service (like Uber/Lyft): riders request trips, the system matches them to nearby drivers using live location, tracks the trip in real time, and applies surge pricing when demand outstrips supply.",
    tags: ["ride-sharing", "geospatial", "matching", "real-time", "surge", "location"],
    constraints: [
      "Drivers stream live GPS continuously; matching must find nearby drivers in milliseconds",
      "Trip state and fares must be reliable and durable",
      "Surge pricing must react to real-time supply/demand imbalance per area",
    ],
    requirements: [
      { componentId: "ws", why: "Persistent connections stream driver/rider location and trip updates in real time.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "cache", why: "In-memory geospatial index of live driver locations for millisecond proximity matching and surge counters.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "api", why: "Stateless services for trip requests, matching, and pricing.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "db", why: "Durable, transactional store for trips, fares, and state transitions.", dimensions: ["Consistency", "Reliability"], weight: 3 },
      { componentId: "queue", why: "Buffer the location firehose and decouple matching, pricing, and notifications.", dimensions: ["Reliability", "Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "worker", why: "Workers run matching, surge computation, and trip post-processing off the request path.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "lb", why: "Distribute API and WebSocket connections across nodes.", dimensions: ["Availability", "Scalability"], weight: 1 },
      { componentId: "nosql", why: "High-write store for the stream of historical GPS traces.", dimensions: ["Scalability"], weight: 1 },
      { componentId: "apigw", why: "Auth and rate limiting for mobile clients.", dimensions: ["Security"], weight: 1 },
    ],
    modelSolution: `**Key insight: real-time geospatial matching lives in memory; the trip/fare record lives in a transactional DB. Keep the hot geo-path off durable storage.**

**Location + geospatial index:** drivers stream GPS over **WebSocket** connections. Current locations are kept in **Redis** as a **geospatial index** (geohash buckets / geo sorted sets). Matching a rider means querying the in-memory index for drivers within a radius -- millisecond lookups that never hit the durable DB. The location firehose is buffered through a **queue** so bursts don't overwhelm consumers.

**Matching + surge:** **workers** run the matching algorithm (nearest suitable drivers, ETA) and compute **surge pricing** per geographic cell from real-time supply/demand counters held in **Redis**. Surge is inherently a fast, approximate, in-memory computation over the same geo-index.

**Trip lifecycle (durable):** once a match is accepted, the trip and its state machine (requested -> matched -> in-progress -> completed) plus the final **fare** live in a **transactional SQL DB**. This is the must-not-be-lost, must-be-correct part -- clearly separated from the ephemeral location stream.

**Trade-off:** location and surge are best-effort and eventually consistent (a slightly stale driver position or surge multiplier is acceptable); trip and payment records are strongly consistent and durable. Optionally, raw GPS traces stream into a **high-write NoSQL** store for analytics. As with food delivery, the winning move is treating the real-time geo-plane and the durable transaction-plane as two separate systems.`,
    relatedLessons: ["websockets-dual", "redis-deep", "cap-theorem", "kafka-fundamentals"],
  },

  {
    id: "rate-limiter-service",
    title: "Distributed Rate Limiter",
    prompt:
      "Design a distributed rate limiter that enforces per-user and global request limits across a fleet of API servers. It must decide allow/deny in well under a millisecond and stay correct even as traffic and server count grow.",
    tags: ["rate-limiting", "distributed", "low-latency", "counters", "throttling"],
    constraints: [
      "Millions of requests/sec across many API nodes; decision must add < 1ms of latency",
      "Limits are both per-user (e.g. 100 req/min) and global (protect a downstream)",
      "Approximate correctness is acceptable; hard-failing open vs closed is a deliberate choice",
    ],
    requirements: [
      { componentId: "ratelimit", why: "The core enforcement component that decides allow/deny per request against configured limits.", dimensions: ["Security", "Reliability"], weight: 3 },
      { componentId: "cache", why: "A shared low-latency store (Redis) holds the counters/tokens so all API nodes see the same state; atomic ops keep it correct.", dimensions: ["Scalability", "Consistency"], weight: 3 },
      { componentId: "apigw", why: "Enforce limits at the edge/gateway so abusive traffic is rejected before it reaches expensive backends.", dimensions: ["Security", "Cost"], weight: 2 },
      { componentId: "api", why: "Stateless API servers consult the limiter on each request and serve the allowed traffic.", dimensions: ["Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "lb", why: "Spread request traffic across the API/gateway fleet.", dimensions: ["Availability", "Scalability"], weight: 1 },
      { componentId: "shard", why: "Partition counters across cache nodes by user key to avoid a single hot node at extreme scale.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "queue", why: "Asynchronously ship rate-limit events/metrics for monitoring and abuse analytics off the hot path.", dimensions: ["Reliability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "db", why: "Using a transactional SQL DB for per-request counter increments cannot sustain millions of ops/sec and adds far too much latency to the decision path." },
    ],
    modelSolution: `**Key insight: this is a shared-counter problem on the hot path. The whole game is keeping an accurate-enough counter in a fast, shared store with atomic updates.**

**Where it runs:** enforce at the **API gateway / edge** so rejected traffic never reaches your backends, and also expose the limiter to **stateless API servers**. Each incoming request maps to a key (user id, API key, or IP) plus optionally a global key protecting a downstream.

**Shared state:** the counters/tokens live in **Redis**, not in each node's memory -- otherwise N nodes would each allow the full limit and the effective limit would be N times too high. Use **atomic operations** (INCR with expiry, or a Lua script implementing a token-bucket / sliding-window) so concurrent nodes update the same counter without races.

**Algorithm choice (trade-off):** fixed-window is simplest but allows bursts at window edges; **sliding-window** and **token-bucket** smooth bursts at slightly more cost. Token-bucket is the common default: it allows short bursts up to the bucket size while capping the sustained rate.

**Scale:** shard counters by key across cache nodes so no single node is hot. Emit allow/deny events to a **queue** for monitoring and abuse analytics off the decision path.

**Fail-open vs fail-closed:** if the counter store is unreachable, decide deliberately -- fail-open (allow, prioritize availability) for user-facing traffic, or fail-closed (deny, prioritize protection) when shielding a fragile downstream. Because limits are approximate, a tiny amount of over/under-counting under failure is acceptable.`,
    relatedLessons: ["rate-limiting", "redis-deep", "load-balancing", "sharding"],
  },

  {
    id: "distributed-cache",
    title: "Distributed Cache",
    prompt:
      "Design a sharded distributed cache tier (like a managed Redis/Memcached fleet) that sits in front of a database to absorb read load. It must scale horizontally, survive node loss, handle hot keys, and keep cached data reasonably consistent with the source of truth.",
    tags: ["cache", "sharding", "hot-keys", "invalidation", "consistency"],
    constraints: [
      "Very high read QPS; the cache must shield the database from most reads",
      "Data is spread across many cache nodes; adding/removing nodes must not reshuffle everything",
      "A few keys can be extremely hot; stale reads are tolerable within a short TTL",
    ],
    requirements: [
      { componentId: "cache", why: "The in-memory cache nodes themselves -- the tier that serves the vast majority of reads at sub-millisecond latency.", dimensions: ["Scalability", "Cost"], weight: 3 },
      { componentId: "shard", why: "Consistent hashing partitions keys across cache nodes so the tier scales horizontally and adding a node moves minimal data.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "db", why: "The durable source of truth behind the cache; touched only on misses and writes.", dimensions: ["Reliability", "Consistency"], weight: 3 },
      { componentId: "api", why: "Application/service nodes read-through and write to the cache and DB.", dimensions: ["Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "replica", why: "Per-shard replicas provide failover and extra read capacity so losing a node does not lose the shard.", dimensions: ["Availability", "Reliability"], weight: 2 },
      { componentId: "lb", why: "Route/spread client requests across the cache fleet and its clients.", dimensions: ["Scalability", "Availability"], weight: 1 },
      { componentId: "queue", why: "Propagate invalidation events to keep multiple caches / regions in sync.", dimensions: ["Consistency"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "cdn", why: "A CDN caches static edge content by URL; it does not solve a per-key application data cache in front of a database. Different layer, different problem." },
    ],
    modelSolution: `**Key insight: sharding by consistent hashing is what makes the tier scale, and cache-invalidation is the hard part. Design for both up front.**

**Partitioning:** spread keys across cache nodes using **consistent hashing** (with virtual nodes) so that adding or removing a node only remaps a small slice of keys instead of reshuffling the whole keyspace. This is what lets the **sharded** cache scale horizontally.

**Read/write pattern:** the common choice is **cache-aside (lazy loading)** -- on a read, check the cache; on a miss, read the **DB**, populate the cache with a TTL, and return. On writes, update the DB and then invalidate (or update) the cache entry. Write-through and write-back are alternatives that trade freshness for latency/durability.

**Hot keys:** a single viral key can overwhelm the one shard that owns it. Mitigate by **replicating** the hot key to multiple nodes, adding a small client-side/local cache for the hottest keys, or key-splitting. Detecting hot keys and having a fallback path is essential.

**Availability:** give each shard **replicas** so a node failure fails over instead of dropping that slice of the keyspace and stampeding the DB. Guard against **cache stampede** on expiry with request coalescing / locks or staggered TTLs.

**Consistency (trade-off):** a cache is eventually consistent with the DB by design. Short TTLs bound staleness; a **queue** can broadcast invalidations across caches/regions. You trade a little staleness for a massive reduction in DB load -- accept and bound the staleness rather than pretend it is not there.`,
    relatedLessons: ["caching-dual", "redis-deep", "sharding", "cap-theorem"],
  },

  {
    id: "metrics-pipeline",
    title: "Metrics & Logs Pipeline",
    prompt:
      "Design a pipeline that ingests high-volume metrics and logs from thousands of services, buffers and processes them reliably, stores them cost-effectively, and lets engineers query and dashboard them with acceptable latency.",
    tags: ["observability", "metrics", "logs", "ingestion", "time-series", "pipeline"],
    constraints: [
      "Millions of events/sec, extremely bursty; ingest must never block or drop under spikes",
      "Data volume is huge and mostly written once, read occasionally -- storage cost matters a lot",
      "Recent data must be queryable within seconds; old data can be cheaper/slower to access",
    ],
    requirements: [
      { componentId: "queue", why: "A durable buffer (Kafka) absorbs bursty firehose ingest and decouples producers from processing so spikes never drop data or block services.", dimensions: ["Reliability", "Scalability"], weight: 3 },
      { componentId: "worker", why: "Consumers parse, aggregate/roll-up, and route events off the ingest path.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "nosql", why: "A high-write time-series/wide-column store holds the massive append-heavy metric stream and scales writes horizontally.", dimensions: ["Scalability", "Cost"], weight: 3 },
      { componentId: "api", why: "A stateless ingest tier accepts pushes from agents and a query tier serves dashboards.", dimensions: ["Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "search", why: "An inverted index enables full-text log search and ad-hoc filtering.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "blob", why: "Tier old/cold data to cheap object storage instead of keeping everything hot.", dimensions: ["Cost"], weight: 2 },
      { componentId: "lb", why: "Spread agent traffic across the ingest fleet.", dimensions: ["Availability", "Scalability"], weight: 1 },
      { componentId: "cache", why: "Cache recent aggregates / hot dashboard queries for fast reads.", dimensions: ["Scalability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "db", why: "A single transactional SQL DB cannot absorb millions of high-cardinality writes/sec; using it as the primary metric store will fall over. Time-series/wide-column stores exist for exactly this." },
    ],
    modelSolution: `**Key insight: the buffer is the shock absorber. A durable queue between ingest and storage is what makes bursty, high-volume ingest reliable.**

**Ingest:** agents/services push events to a stateless **ingest API** (behind an **LB**). The API does almost nothing except write to a **durable queue (Kafka)**. This decouples producers from downstream processing so a spike or a slow store never blocks the emitting services or drops data -- the queue absorbs the burst.

**Process:** **worker** consumers read from the queue and parse, validate, aggregate (roll up raw points into per-minute/per-hour summaries), and route data. Doing aggregation here shrinks what you store and speeds queries.

**Store (by access pattern and cost):** the append-heavy metric firehose lands in a **time-series / wide-column NoSQL** store built for high write throughput; logs additionally feed a **search index** for full-text queries. Old, rarely-read data is tiered down to cheap **object storage**. This hot/warm/cold tiering is the main cost lever -- keeping months of raw data in a hot store is prohibitively expensive.

**Query:** a query/dashboard tier reads recent aggregates (optionally via a **cache**) for sub-second dashboards and falls back to the columnar/cold store for historical scans.

**Trade-off:** this is a write-optimized, read-occasionally system. You favor cheap durable writes, accept eventual consistency and roll-up lossiness, and bound query latency by pre-aggregating and tiering -- the opposite set of choices from a transactional OLTP system.`,
    relatedLessons: ["kafka-fundamentals", "background-jobs-dual", "cap-theorem", "caching-dual"],
  },

  {
    id: "search-autocomplete",
    title: "Search Autocomplete",
    prompt:
      "Design a search autocomplete / typeahead service: as a user types a prefix, return the top-ranked completions within a few milliseconds. Read volume is enormous (a query per keystroke) and suggestions are ranked by popularity.",
    tags: ["autocomplete", "typeahead", "prefix-search", "low-latency", "ranking", "read-heavy"],
    constraints: [
      "A request fires on nearly every keystroke -- extreme read volume, p99 well under 100ms",
      "Suggestions ranked by popularity/relevance; the ranking data updates continuously but not instantly",
      "Prefix matching over a huge dictionary of terms/queries",
    ],
    requirements: [
      { componentId: "cache", why: "Precomputed top-K completions per prefix live in memory so the hot path is a single fast lookup, not a search each keystroke.", dimensions: ["Scalability"], weight: 3 },
      { componentId: "api", why: "Stateless typeahead servers serve prefix lookups; trivially horizontally scalable.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "lb", why: "Spread the enormous keystroke read volume across the stateless fleet.", dimensions: ["Scalability", "Availability"], weight: 2 },
      { componentId: "search", why: "An inverted/prefix index (or trie) provides prefix matching over the huge term dictionary for cache misses and long-tail prefixes.", dimensions: ["Scalability"], weight: 2 },
    ],
    bonuses: [
      { componentId: "cdn", why: "Edge-cache popular prefix responses close to users to cut latency and origin load further.", dimensions: ["Scalability", "Availability"], weight: 2 },
      { componentId: "queue", why: "Stream raw query logs into an async pipeline that recomputes popularity/ranking.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "worker", why: "Batch/stream workers aggregate query frequencies and rebuild the precomputed top-K suggestion structures.", dimensions: ["Scalability"], weight: 2 },
      { componentId: "nosql", why: "Store the large body of query-frequency data and the built suggestion structures.", dimensions: ["Scalability"], weight: 1 },
    ],
    antipatterns: [
      { componentId: "db", why: "Running a LIKE 'prefix%' query against a SQL DB on every keystroke does not scale and will not hit the latency target; autocomplete is a precomputed/indexed read problem, not an ad-hoc query problem." },
    ],
    modelSolution: `**Key insight: precompute the answer. Autocomplete is a read problem solved by serving precomputed top-K completions per prefix from memory, decoupled from an offline ranking pipeline.**

**Serving path (the hot path):** a keystroke hits a stateless **typeahead API** (behind an **LB**) that looks up the prefix and returns the **precomputed top-K completions from a cache** (or an in-memory trie). This is a single fast lookup -- no ranking or scanning happens at request time, which is what lets you meet a few-milliseconds p99 under keystroke-level volume. **CDN** edge-caching of popular prefixes cuts latency and origin load further.

**Index / matching:** prefix matching over a huge dictionary is done with a **trie** or an inverted/**search index**. Store the top-K suggestions at each prefix node so a lookup is O(prefix length), not a scan. For the long tail / cache misses, fall back to the search index.

**Ranking pipeline (offline, async):** raw queries stream through a **queue** into **workers** that aggregate query frequencies over time and periodically **rebuild the top-K structures**, persisted in a **NoSQL** store and pushed into the serving cache/trie. Ranking is thus eventually consistent -- popularity updates land after a batch/stream cycle, which is fine.

**Trade-off:** you deliberately separate the **fast, read-only serving plane** (precomputed, cached, possibly stale by minutes) from the **slow, write-heavy ranking plane** (aggregation, rebuild). Trading suggestion freshness for latency and scale is exactly the right call: nobody notices if a suggestion's rank is a few minutes stale, but everyone notices lag on every keystroke.`,
    relatedLessons: ["caching-dual", "cdn-edge", "kafka-fundamentals", "redis-deep"],
  },
];

export const DESIGN_BY_ID: Record<string, DesignProblem> = Object.fromEntries(
  DESIGN_PROBLEMS.map((d) => [d.id, d])
);
