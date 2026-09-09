import type { Lesson } from "../types";

export const backendExtraLessons: Lesson[] = [
  {
    slug: "rest-design",
    title: "REST API Design",
    track: "shared",
    phase: "backend",
    module: "http-layer",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Designing resource-oriented APIs that clients can predict without reading your code: nouns not verbs, correct method semantics, pagination, versioning, and error shape.",
    prerequisites: ["http-fundamentals"],
    relatedConcepts: ["status-codes", "idempotency", "http-fundamentals", "oauth2-openid"],
    tags: ["rest", "api-design", "resources", "pagination", "versioning"],

    why: `An API is a contract that outlives the code behind it. Mobile apps, partner integrations, and internal services all bake your URLs, methods, and response shapes into their own releases -- and you cannot force them to redeploy. **REST design exists to make that contract predictable**: if a client knows the resource model and HTTP semantics, it can guess most of your endpoints correctly and integrate without reading your source.

Bad API design is expensive because it is permanent. A verb-in-the-URL, a 200-with-error-body, or an unversioned breaking change becomes load-bearing the moment a client ships it. REST is a discipline for making the API self-consistent so infrastructure (caches, proxies, retries) and humans both behave correctly by default.`,

    intuition: `Think of your API as a **filing cabinet, not a remote-control panel**.

A remote control has one button per action: "chargeCustomer", "sendEmail", "deactivateAccount". Every new feature needs a new button, and the client must learn each one individually.

A filing cabinet instead exposes **things** (drawers and folders: customers, orders, invoices) and a small, fixed set of **operations** you can do to any thing: look at it (GET), file a new one (POST), replace it (PUT), amend it (PATCH), shred it (DELETE). Once you know the drawers and the five operations, you can predict the whole cabinet. That is REST: model your domain as resources (nouns), and let the uniform HTTP methods (verbs) act on them.`,

    howItWorks: `### 1. Resources are nouns; methods are the verbs
\`\`\`
GET    /orders            list orders (collection)
POST   /orders            create an order
GET    /orders/42         read one order
PUT    /orders/42         replace order 42 (idempotent)
PATCH  /orders/42         partially update order 42
DELETE /orders/42         delete order 42 (idempotent)
GET    /orders/42/items   sub-resource: items of order 42
\`\`\`
Never \`POST /createOrder\` or \`GET /getOrder?id=42\` -- the method already carries the verb.

### 2. Use the right method for its semantics
- **GET** is safe (no side effects) and cacheable. A GET must never mutate state -- prefetchers and crawlers will call it.
- **POST** creates or triggers non-idempotent actions.
- **PUT** replaces the whole resource and is idempotent (same call twice = same state).
- **PATCH** applies a partial change.
- **DELETE** removes and is idempotent (deleting twice ends in the same state).

### 3. Collections need pagination, filtering, sorting
Never return an unbounded list. Use cursor pagination for large or changing datasets:
\`\`\`
GET /orders?status=paid&sort=-created_at&limit=50&cursor=eyJpZCI6MTB9
\`\`\`

### 4. Consistent error shape
Every error returns the same JSON envelope so clients parse errors once, not per-endpoint.

### 5. Versioning
Put the major version in the path (\`/v1/orders\`) or an \`Accept\` header. Add fields freely (non-breaking); removing/renaming fields or changing types is breaking and needs a new version.`,

    internals: `- **HATEOAS** (hypermedia links in responses) is the strict Richardson-maturity-model peak of REST, but most successful APIs stop at "level 2": resources + correct methods + status codes. Pragmatic REST is the norm; full HATEOAS is rare because clients rarely follow links dynamically.
- **Offset pagination (\`?page=3\`) vs cursor pagination:** offset is easy but breaks under inserts (items shift pages) and gets slow on large offsets (the DB still scans skipped rows). Cursor pagination encodes "start after this key" and stays stable and fast.
- **PUT vs PATCH and partial updates:** PUT semantics say the body is the entire new representation -- omitted fields should be cleared. PATCH sends only the delta. Sending a partial body to PUT and expecting a merge is a common contract violation.
- **Idempotency and safety are HTTP-level guarantees clients rely on for retries.** A misbehaving GET that mutates state silently breaks caching and retry logic across the entire stack.
- **Content negotiation:** \`Accept\` and \`Content-Type\` let one URL serve JSON, CSV, or a versioned schema. Most teams keep it simple with JSON only.`,

    diagram: {
      title: "Resource-oriented request routing",
      layers: [
        { id: "client", label: "Client", sub: "knows resources + HTTP verbs" },
        { id: "url", label: "URL = resource path", sub: "/v1/orders/42/items (nouns)" },
        { id: "method", label: "HTTP method = action", sub: "GET/POST/PUT/PATCH/DELETE" },
        { id: "handler", label: "Handler", sub: "maps (resource, verb) -> business logic" },
        { id: "resp", label: "Uniform response", sub: "status code + consistent JSON shape" },
      ],
      caption: "A predictable API = stable resource nouns crossed with a fixed set of HTTP verbs.",
    },

    realWorld: `A partner integrates against \`GET /account/{id}/getBalance\` and \`POST /account/{id}/doTransfer\`. Six months later you add "freeze account" and "list transactions" -- each needs a brand new bespoke endpoint the partner must learn and code against individually, and every one has a slightly different error format because they were written by different people. Integration takes weeks and every edge case is a support ticket.

Contrast with a resource model: \`/accounts/{id}\`, \`/accounts/{id}/transactions\`, \`/transfers\`. The partner already knows how to list, read, and create because the pattern is uniform, and a shared error envelope means they wrote error handling once. The design paid for itself the first time you added a feature.`,

    production: `- **Model nouns, put verbs in the HTTP method.** If you feel the urge to name an action in the URL (\`/orders/42/cancel\`), consider it a state change: \`PATCH /orders/42 {"status":"cancelled"}\` or a sub-resource \`POST /orders/42/cancellations\`.
- **Paginate every collection** with cursor pagination; never return unbounded arrays.
- **Ship one error envelope** across all endpoints (code, message, details, request id) so clients and dashboards parse errors uniformly.
- **Version from day one** (\`/v1\`). Add fields freely; never remove or repurpose a field within a version.
- **Return the created resource (or its Location header) on POST**, so clients do not need a second round trip.
- **Document with OpenAPI** and generate clients from it -- the spec becomes the contract.`,

    commonMistakes: [
      "Putting verbs in URLs (/createOrder, /getUser) instead of using HTTP methods on resource nouns.",
      "Using GET for actions with side effects -- crawlers and prefetchers will trigger them.",
      "Returning unbounded collections with no pagination, then falling over when a customer has 100k rows.",
      "Making a breaking change (renaming/removing a field) inside an existing version instead of cutting a new one.",
      "A different error shape per endpoint, forcing clients to write bespoke error parsing everywhere.",
      "Using offset pagination on large, mutating datasets and getting duplicate/skipped rows plus slow deep pages.",
    ],

    tradeoffs: `| Decision | Benefit | Cost |
|---|---|---|
| Resource-oriented (nouns) | Predictable, uniform, self-documenting | Some actions feel awkward to model as state |
| Cursor pagination | Stable + fast on large data | Cannot jump to arbitrary page N |
| Offset pagination | Simple, jump to any page | Breaks under inserts; slow deep offsets |
| Path versioning (/v1) | Explicit, cache-friendly, easy to route | URL churn on major bumps |
| Full HATEOAS | Discoverable, decoupled | High effort, clients rarely use links |`,

    whenToUse: [
      "Public or partner-facing APIs where predictability and stability matter most.",
      "CRUD-shaped domains that map cleanly onto resources and collections.",
      "When you want caches, proxies, and retry logic to work correctly via standard HTTP semantics.",
    ],
    whenNotToUse: [
      "High-throughput internal RPC between services where gRPC's schema + streaming fit better.",
      "Highly relational data where clients need flexible field selection (GraphQL may fit better).",
      "Real-time bidirectional communication (use WebSockets or SSE).",
    ],

    memoryCard: {
      problem: "Make an API predictable and stable so clients can integrate without reading your code.",
      mentalModel: "A filing cabinet of nouns (resources) with five fixed operations (HTTP verbs), not a remote control of one-off buttons.",
      keyConcepts: ["resources are nouns, methods are verbs", "GET is safe, PUT/DELETE idempotent", "cursor pagination", "consistent error envelope", "additive-only versioning"],
      productionConnection: "Uniform resource design + one error shape + path versioning makes integrations fast and lets HTTP infra help you for free.",
      oneLiner: "REST models your domain as resource nouns acted on by a fixed set of HTTP verbs, so the whole API is predictable.",
    },

    quiz: [
      {
        id: "rest-q1",
        prompt: "Which endpoint best follows REST conventions for cancelling order 42?",
        choices: [
          { text: "GET /orders/42/cancel", correct: false },
          { text: "POST /cancelOrder?id=42", correct: false },
          { text: "PATCH /orders/42 with a status change (or POST /orders/42/cancellations)", correct: true },
          { text: "DELETE /cancel/42", correct: false },
        ],
        explanation: "Cancellation is a state change on the order resource. Model it as a PATCH to the resource or a sub-resource POST -- never a verb in the URL, and never a mutating GET.",
      },
      {
        id: "rest-q2",
        prompt: "Why is cursor pagination preferred over offset pagination for large, frequently changing collections?",
        choices: [
          { text: "It lets clients jump directly to any page number", correct: false },
          { text: "It stays stable when rows are inserted and stays fast at deep positions", correct: true },
          { text: "It requires no database index", correct: false },
          { text: "It returns more rows per request", correct: false },
        ],
        explanation: "Offset pagination shifts items across pages when rows are inserted and forces the DB to scan skipped rows on deep offsets. Cursor pagination says 'start after this key', which is both stable and index-friendly.",
      },
      {
        id: "rest-q3",
        prompt: "Which change can you safely make WITHIN an existing API version?",
        choices: [
          { text: "Rename an existing response field", correct: false },
          { text: "Change a field's type from string to number", correct: false },
          { text: "Add a new optional response field", correct: true },
          { text: "Remove a deprecated field", correct: false },
        ],
        explanation: "Adding fields is backward compatible -- old clients ignore them. Renaming, retyping, or removing fields breaks existing clients and requires a new major version.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Redesign an RPC-style API into REST",
      brief: "You inherit endpoints /getUser, /updateUserEmail, /listUserOrders, /createOrder, /cancelOrder. Redesign them as a resource-oriented API.",
      steps: `1. Identify the resources (nouns): users, orders (and order state).\n2. Map each RPC call to a (resource, HTTP method) pair.\n3. Design the collection endpoint for orders with cursor pagination and a status filter.\n4. Define one error envelope shape used by every endpoint.\n5. Decide how "cancel order" is modelled (PATCH status vs sub-resource) and justify it.\n6. Add a version prefix and note which future changes would be breaking.`,
      successCriteria: [
        "No verbs remain in any URL",
        "GET endpoints are side-effect free",
        "Collections are paginated with a cursor",
        "A single consistent error shape is defined",
        "A versioning strategy and breaking-change policy are stated",
      ],
    },
  },

  {
    slug: "status-codes",
    title: "HTTP Status Codes",
    track: "shared",
    phase: "backend",
    module: "http-layer",
    difficulty: "core",
    estMinutes: 20,
    summary:
      "Status codes are the machine-readable half of your API. Getting the 2xx/3xx/4xx/5xx classes right lets load balancers, caches, and clients behave correctly without reading your body.",
    prerequisites: ["http-fundamentals"],
    relatedConcepts: ["rest-design", "idempotency", "http-fundamentals", "rate-limiting"],
    tags: ["http", "status-codes", "errors", "4xx", "5xx", "retries"],

    why: `A status code is a promise to every piece of infrastructure between you and the client. A load balancer decides whether to retry based on it. A CDN decides whether to cache based on it. A client library decides whether to raise an exception, retry with backoff, or refresh a token based on it. **The status code is the machine-readable summary of what happened; the body is just for humans and debugging.**

Get it wrong -- return 200 for an error, or 500 for a validation failure -- and the whole stack misbehaves: caches store errors, clients retry things they should not, alerting pages you for user typos, and dashboards report false success rates.`,

    intuition: `Status codes are a **triage color code**, like a hospital emergency room.

You do not read the patient's full chart at the door -- you read the tag. Green (2xx): fine, proceed. Yellow (3xx): go somewhere else first (redirect). Blue (4xx): the patient did something wrong -- wrong form, no ID, not allowed in -- and repeating the same request will not help. Red (5xx): *we* failed -- our equipment broke -- and trying again might work once we recover.

The single most important distinction is **4xx (your fault, do not blindly retry) vs 5xx (our fault, a retry may succeed)**. That one bit drives retry logic, alerting, and error budgets across the entire system.`,

    howItWorks: `### The five classes
- **1xx** informational (rare: 100 Continue, 101 Switching Protocols for WebSocket upgrade).
- **2xx success:** 200 OK, 201 Created (return a Location header), 202 Accepted (async, work queued), 204 No Content.
- **3xx redirect:** 301/308 permanent, 302/307 temporary, **304 Not Modified** (conditional GET cache hit).
- **4xx client error:** the request is wrong; retrying it unchanged will fail again.
- **5xx server error:** we failed; the request may be fine.

### The 4xx codes that actually matter
\`\`\`
400 Bad Request       malformed / invalid input
401 Unauthorized      not authenticated (no/invalid credentials)
403 Forbidden         authenticated but not allowed
404 Not Found         resource does not exist (or hidden)
405 Method Not Allowed wrong verb for this resource
409 Conflict          state conflict (version mismatch, duplicate)
422 Unprocessable     syntactically valid but semantically invalid
429 Too Many Requests rate limited (send Retry-After)
\`\`\`

### The 5xx codes
\`\`\`
500 Internal Server Error  unhandled bug on our side
502 Bad Gateway            upstream returned garbage
503 Service Unavailable     overloaded / down (send Retry-After)
504 Gateway Timeout         upstream did not answer in time
\`\`\`

### 401 vs 403 -- the classic confusion
**401 = who are you?** (not authenticated -- fix your credentials). **403 = I know who you are, and no** (authenticated but lacks permission -- retrying with the same identity is pointless).`,

    internals: `- **Retry semantics are keyed off the class.** Well-behaved clients and LBs retry 502/503/504 (transient) and often not 500 (a bug retries into the same bug). They must NOT retry non-idempotent 4xx. This is why correct codes matter for correctness, not just tidiness.
- **429 and 503 should carry \`Retry-After\`** (seconds or an HTTP date) so clients back off deterministically instead of hammering.
- **304 Not Modified** is a performance feature: with \`ETag\`/\`If-None-Match\` the server returns an empty 304 and the client reuses its cached body, saving bandwidth.
- **201 Created should return a \`Location\` header** pointing at the new resource; 202 Accepted signals async work with (ideally) a status URL to poll.
- **Caches key off status:** many caches store 200/301/404 by default. Returning 200 with an error body means caches may serve the error to everyone.
- **Do not leak existence via codes carelessly:** returning 403 vs 404 for a resource the user cannot see can reveal that it exists. Some APIs deliberately return 404 for "forbidden and hidden".`,

    diagram: {
      title: "Status code decision flow",
      layers: [
        { id: "recv", label: "Request received", sub: "parse + authenticate + authorize" },
        { id: "client", label: "Client's fault? -> 4xx", sub: "400/401/403/404/409/422/429 (do not retry as-is)" },
        { id: "success", label: "Succeeded? -> 2xx", sub: "200/201/202/204" },
        { id: "redir", label: "Elsewhere? -> 3xx", sub: "301/307/304 conditional" },
        { id: "server", label: "Our fault? -> 5xx", sub: "500/502/503/504 (transient may retry)" },
      ],
      caption: "The 4xx vs 5xx split is the one bit that drives retries, alerts, and error budgets.",
    },

    realWorld: `An upstream input-validation error returns \`200 OK\` with \`{"success": false}\` in the body. Consequences cascade: the load balancer counts it as success so your SLO dashboard shows 99.99% while users are failing; the CDN caches the "success" and serves the same broken payload to everyone; the client library, seeing 200, does not raise and silently proceeds with garbage data. The single-line fix -- return \`422\` (or \`400\`) -- makes the dashboards honest, stops the cache from poisoning, and makes the client raise. Correct status codes are observability and correctness, not decoration.`,

    production: `- **Map errors to precise codes:** validation -> 400/422, auth -> 401, permission -> 403, missing -> 404, conflict -> 409, rate limit -> 429, our bug -> 500, dependency down -> 503.
- **Never return 200 with an error body.** It blinds monitoring, poisons caches, and defeats client error handling.
- **Send \`Retry-After\` on 429 and 503** so clients back off instead of retrying instantly.
- **Reserve 5xx for genuine server failures.** A user typo is not a 500 -- do not page on-call for 4xx spikes the way you do for 5xx.
- **Return a consistent error body alongside the code** (code, message, request id) for humans, while the status code drives machines.
- **Alert and compute error budgets on 5xx rate**, not raw error count, so client mistakes do not corrupt your reliability signal.`,

    commonMistakes: [
      "Returning 200 OK with {success:false} -- caches store it, monitoring shows false success, clients do not raise.",
      "Using 500 for validation errors -- pages on-call for user typos and pollutes the error budget.",
      "Confusing 401 (not authenticated) with 403 (authenticated but forbidden).",
      "Omitting Retry-After on 429/503, so clients retry instantly and worsen overload.",
      "Retrying non-idempotent requests that returned 4xx, or retrying 500s straight into the same bug.",
      "Using 404 when 400/422 is meant (or vice versa), confusing clients about whether to fix input or the URL.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Precise status codes | Infra + clients behave correctly automatically | Discipline to map every error path |
| 403 vs 404 for hidden resources | 403 is honest | 403 leaks existence; 404 hides it but confuses |
| 422 vs 400 for validation | 422 distinguishes semantic from syntactic errors | Some clients/tools treat only 400 specially |
| Retry-After on 429/503 | Deterministic backoff | Requires estimating a sane delay |`,

    whenToUse: [
      "Every HTTP response -- the status code is not optional metadata, it is the primary signal.",
      "When you want LBs, CDNs, and client libraries to make correct decisions without parsing your body.",
      "When building retry/backoff logic that depends on distinguishing transient from permanent failure.",
    ],
    whenNotToUse: [
      "As a place to encode fine-grained business error detail -- put that in the body's error code, not a nonstandard status.",
      "Inventing custom numeric codes (e.g. 499 outside its known use, or 6xx) that infra will not understand.",
    ],

    memoryCard: {
      problem: "Communicate what happened in a machine-readable way so infra and clients behave correctly.",
      mentalModel: "An ER triage tag: 2xx green, 3xx go elsewhere, 4xx your fault, 5xx our fault -- read the tag, not the chart.",
      keyConcepts: ["2xx/3xx/4xx/5xx classes", "4xx (do not retry) vs 5xx (may retry)", "401 vs 403", "429/503 + Retry-After", "304 conditional GET"],
      productionConnection: "Correct codes make dashboards honest, keep caches clean, drive sane retries, and stop on-call being paged for user typos.",
      oneLiner: "The status code is the machine-readable verdict -- especially the 4xx-vs-5xx bit that governs retries, caching, and alerting.",
    },

    quiz: [
      {
        id: "sc-q1",
        prompt: "A client sends valid JSON but with an email that fails a business rule. Which status code fits best?",
        choices: [
          { text: "500 Internal Server Error", correct: false },
          { text: "422 Unprocessable Entity (or 400)", correct: true },
          { text: "200 OK with an error body", correct: false },
          { text: "403 Forbidden", correct: false },
        ],
        explanation: "The request is syntactically valid but semantically invalid, so it is a client error: 422 (or 400). It is not a server fault (not 5xx), not a permission issue (not 403), and must not be a 200.",
      },
      {
        id: "sc-q2",
        prompt: "What is the difference between 401 and 403?",
        choices: [
          { text: "401 means the server is down; 403 means it is overloaded", correct: false },
          { text: "401 means not authenticated (fix credentials); 403 means authenticated but not permitted", correct: true },
          { text: "They are interchangeable", correct: false },
          { text: "401 is for GET, 403 is for POST", correct: false },
        ],
        explanation: "401 says 'who are you?' -- authentication failed or is missing. 403 says 'I know who you are and you may not do this' -- retrying with the same identity is futile.",
      },
      {
        id: "sc-q3",
        prompt: "Why is returning 200 with {success:false} for errors harmful in production?",
        choices: [
          { text: "It is slower to serialize", correct: false },
          { text: "Caches may store it, monitoring counts it as success, and clients do not raise on it", correct: true },
          { text: "It uses more bandwidth than a 4xx", correct: false },
          { text: "HTTP forbids a body on 200", correct: false },
        ],
        explanation: "A 200 tells every machine in the path that everything worked: CDNs cache it, SLO dashboards count it as success, and client libraries do not throw. The error becomes invisible to infrastructure.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Audit an API's status code usage",
      brief: "Given an endpoint that returns 200 for validation errors, 500 for missing resources, and 403 for unauthenticated users, correct every mapping.",
      steps: `1. List each failure path the endpoint can produce.\n2. Assign the correct class (4xx client vs 5xx server) to each.\n3. Pick the precise code (400/401/403/404/409/422/429 or 500/503).\n4. Add Retry-After to any 429/503 responses.\n5. Define a shared error body and confirm the status code, not the body, drives client/LB behaviour.\n6. State which codes on-call alerting should page on (5xx) vs ignore (4xx).`,
      successCriteria: [
        "Validation errors return 4xx, not 200 or 500",
        "Missing resources return 404, not 500",
        "Unauthenticated returns 401, forbidden returns 403",
        "429/503 include Retry-After",
        "Alerting is scoped to 5xx",
      ],
    },
  },

  {
    slug: "idempotency",
    title: "Idempotency",
    track: "shared",
    phase: "backend",
    module: "http-layer",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Why networks force you to retry, why retries cause duplicate side effects, and how idempotency keys let you make a retry a no-op -- so a payment is charged exactly once.",
    prerequisites: ["http-fundamentals", "status-codes"],
    relatedConcepts: ["rest-design", "status-codes", "rate-limiting", "background-jobs-dual"],
    tags: ["idempotency", "retries", "exactly-once", "payments", "reliability"],

    why: `Networks are unreliable in a specific, cruel way: a request can succeed on the server while the *response* is lost. The client, seeing a timeout, cannot tell "it failed" from "it worked but I never heard back", so it retries. If the operation has a side effect -- charging a card, shipping an order, sending an email -- the naive result is that it happens twice.

**Idempotency exists to make retries safe.** An idempotent operation produces the same end state whether you apply it once or a hundred times. This is the foundation of reliable distributed systems: because you cannot prevent retries, you must make them harmless.`,

    intuition: `Idempotency is a **light switch, not a doorbell**.

Flip a light switch to "on" ten times and the light is still just on -- the end state does not depend on how many times you flipped it. That is idempotent. A doorbell is the opposite: press it ten times and it rings ten times. That is a non-idempotent side effect.

Most reads and full replacements are naturally switch-like. The dangerous operations are the doorbells: "create a payment", "send an email", "add one to the balance". The trick is to give each doorbell press a unique ticket (an **idempotency key**) so the server can recognise "I already handled this exact press" and just return the original result instead of ringing again.`,

    howItWorks: `### Which HTTP methods are idempotent by definition
- **GET, PUT, DELETE, HEAD are idempotent.** GET is also *safe* (no side effects at all). PUT replaces to a fixed state; DELETE ends in "gone" no matter how many times you call it.
- **POST and PATCH are NOT idempotent by default** -- that is where the danger lives.

### Making POST idempotent with an idempotency key
1. The client generates a unique key (a UUID) for the logical operation and sends it: \`Idempotency-Key: 7f3a...\`.
2. On first receipt, the server records the key (with the request fingerprint), performs the side effect, stores the response, and returns it.
3. On a retry with the **same key**, the server finds the stored result and returns it **without repeating the side effect**.

\`\`\`
POST /payments  Idempotency-Key: 7f3a-...
  -> server: key unseen -> charge card -> store (key -> 201, body) -> return 201
POST /payments  Idempotency-Key: 7f3a-...   (retry after timeout)
  -> server: key seen   -> return the stored 201, DO NOT charge again
\`\`\`

### Handling the in-flight race
Two retries can arrive concurrently. Use a unique DB constraint on the key or a lock so the second one waits (or gets a 409) rather than double-charging. Store the key result inside the same transaction as the side effect.`,

    internals: `- **Idempotency vs exactly-once:** true exactly-once delivery is impossible over an unreliable network. What you actually build is **at-least-once delivery + idempotent processing**, which yields *effectively* exactly-once results. Idempotency is the practical substitute for a guarantee you cannot have.
- **The key must scope the whole operation, and requests with the same key but a different body should be rejected** (usually 422/409) -- otherwise a client bug could reuse a key for a different charge.
- **Storage and TTL:** idempotency records are typically kept in a fast store (Redis/Postgres) with a TTL (e.g. 24-72h) long enough to outlive all client retries but not forever.
- **Atomicity is the crux:** the side effect and the "I recorded this key" must commit together. If you charge the card, then crash before saving the key, the retry charges again. Put both in one transaction, or use the payment provider's own idempotency support.
- **Natural idempotency is cheaper:** designing operations as "set balance to X" (idempotent) instead of "add Y to balance" (not) avoids the whole problem where the domain allows it.
- **DELETE returning 404 on the second call** is a subtlety: the state is idempotent (still gone) even though the status code differs; clients should treat 404-after-delete as success.`,

    diagram: {
      title: "Idempotency-key request handling",
      layers: [
        { id: "client", label: "Client", sub: "generates unique key, retries on timeout" },
        { id: "lookup", label: "Key lookup", sub: "seen this key before?" },
        { id: "first", label: "First time", sub: "do side effect + store (key -> result) atomically" },
        { id: "retry", label: "Retry (same key)", sub: "return stored result, skip side effect" },
        { id: "outcome", label: "Effect happens once", sub: "at-least-once delivery, exactly-once result" },
      ],
      caption: "The key turns an unavoidable retry into a safe no-op that replays the original response.",
    },

    realWorld: `A checkout does \`POST /charges\`. The charge succeeds in Stripe, but the response is lost to a mobile network blip. The app times out and auto-retries, and the customer is charged twice -- a refund, a support ticket, and an angry review. The fix is one header: the client sends the same \`Idempotency-Key\` on both attempts (Stripe supports this natively). The second call recognises the key and returns the original charge object without creating a new one. The customer is charged exactly once despite the retry. No new infrastructure -- just HTTP semantics done right.`,

    production: `- **Require an Idempotency-Key on every unsafe write clients might retry** (payments, orders, transfers, provisioning).
- **Store the key + response atomically with the side effect** -- same transaction, or use the downstream provider's idempotency support.
- **Reject same-key-different-body** with 409/422 so a client bug cannot reuse a key for a different operation.
- **Set a TTL** (24-72h) on idempotency records -- long enough to cover all realistic retries.
- **Prefer naturally idempotent designs** ("set status to shipped", "PUT the full resource") over increment/append where the domain allows.
- **Make background jobs idempotent too** -- at-least-once brokers redeliver, so dedupe by a business key.
- **Return the same status code and body on replay** so the client cannot distinguish the retry from the original.`,

    commonMistakes: [
      "Assuming a POST that timed out failed -- it may have succeeded, and blind retry double-applies it.",
      "Doing the side effect and saving the idempotency key in separate transactions, so a crash between them re-charges on retry.",
      "Accepting the same key with a different body, letting one key cover two different operations.",
      "Using increment-style writes ('add 10') where a retry double-counts, instead of set-style writes.",
      "No TTL (records grow forever) or too-short TTL (retry outlives the record and re-executes).",
      "Treating at-least-once delivery as exactly-once and skipping idempotent handlers entirely.",
    ],

    tradeoffs: `| Approach | Benefit | Cost |
|---|---|---|
| Idempotency keys on writes | Safe retries, exactly-once effect | Must store keys atomically; extra state + TTL |
| Naturally idempotent design (set, not add) | No key needed | Not always expressible in the domain |
| At-least-once + idempotent processing | Achievable, robust | Requires disciplined dedupe everywhere |
| Trusting the network (no dedupe) | Zero effort | Double charges, duplicate side effects |`,

    whenToUse: [
      "Any unsafe write a client, load balancer, or job broker might retry (payments, orders, transfers).",
      "Message/job handlers behind at-least-once brokers that can redeliver.",
      "Public APIs where you cannot control client retry behaviour.",
    ],
    whenNotToUse: [
      "Naturally safe reads (GET) -- they are already idempotent and need no key.",
      "Operations where duplicate execution is genuinely harmless and dedup overhead is not worth it.",
    ],

    memoryCard: {
      problem: "Retries are unavoidable (lost responses), but they can double-apply side effects like charges.",
      mentalModel: "A light switch, not a doorbell: applying the operation N times lands on the same state; a key makes a retry a no-op.",
      keyConcepts: ["safe vs idempotent methods", "Idempotency-Key header", "store key + effect atomically", "at-least-once + idempotent = effectively exactly-once", "reject same-key-different-body"],
      productionConnection: "Payments and job handlers use idempotency keys (Stripe supports it natively) so a timed-out retry replays the original result instead of charging twice.",
      oneLiner: "Idempotency makes applying an operation many times equivalent to once, so unavoidable retries stop causing duplicate side effects.",
    },

    quiz: [
      {
        id: "idem-q1",
        prompt: "A POST /payments times out. What should a well-designed client do?",
        choices: [
          { text: "Assume it failed and retry with a fresh request (no key)", correct: false },
          { text: "Retry with the SAME Idempotency-Key so the server replays the original result if it already succeeded", correct: true },
          { text: "Switch the request to a GET", correct: false },
          { text: "Never retry -- give up immediately", correct: false },
        ],
        explanation: "A timeout is ambiguous: the charge may have succeeded with the response lost. Retrying with the same idempotency key lets the server recognise the duplicate and return the original result without charging again.",
      },
      {
        id: "idem-q2",
        prompt: "Why must the side effect and the idempotency-key record be committed atomically?",
        choices: [
          { text: "To make the request faster", correct: false },
          { text: "Otherwise a crash between the two lets a retry re-execute the side effect", correct: true },
          { text: "Because HTTP requires it", correct: false },
          { text: "To reduce the size of the key", correct: false },
        ],
        explanation: "If you charge the card and then crash before saving the key, the retry finds no key and charges again. Committing the effect and the key together closes that window.",
      },
      {
        id: "idem-q3",
        prompt: "Which operation is naturally idempotent?",
        choices: [
          { text: "POST /charges (create a new charge)", correct: false },
          { text: "PATCH /balance {add: 10}", correct: false },
          { text: "PUT /orders/42 {status: 'shipped'} (set to a fixed state)", correct: true },
          { text: "POST /emails (send an email)", correct: false },
        ],
        explanation: "Setting a resource to a fixed state via PUT is idempotent -- repeating it lands on the same state. Creating charges, adding to a balance, and sending emails are all doorbell-style side effects that repeat.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Add idempotency to a payments endpoint",
      brief: "POST /charges double-charges customers on client retries. Design an idempotency-key mechanism that makes retries safe.",
      steps: `1. Define the Idempotency-Key header contract and how the client generates it.\n2. Choose a store (e.g. Postgres table or Redis) with a unique constraint on the key and a TTL.\n3. Write the flow: lookup key -> if seen return stored response; if new, charge + store result in one transaction.\n4. Handle concurrent retries with the same key (unique constraint / lock).\n5. Decide the response when the same key arrives with a different body (reject 409/422).\n6. State the TTL and justify it against realistic retry windows.`,
      successCriteria: [
        "A retry with the same key charges exactly once",
        "Side effect and key record commit atomically",
        "Concurrent duplicate keys do not double-charge",
        "Same key + different body is rejected",
        "Idempotency records expire via TTL",
      ],
    },
  },

  {
    slug: "jwt-vs-sessions",
    title: "JWT vs Server Sessions",
    track: "shared",
    phase: "backend",
    module: "auth",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "The core auth trade-off: stateless self-contained tokens (JWT) that scale but resist revocation, versus opaque server sessions that revoke instantly but need a shared store.",
    prerequisites: ["http-fundamentals", "authentication-dual"],
    relatedConcepts: ["authentication-dual", "oauth2-openid", "rate-limiting", "redis-deep"],
    tags: ["auth", "jwt", "sessions", "revocation", "stateless", "cookies"],

    why: `Once a user logs in, every subsequent request must re-prove who they are without asking for the password again. There are two fundamentally different answers, and choosing wrong causes either a security incident or a scaling headache.

**Server sessions** store the truth on the server and hand the client an opaque ID. **JWTs** put the truth *inside* a signed token the client carries. The difference is where the state lives -- and that one decision determines how you scale, how fast you can revoke access, and what happens when a token leaks. This is one of the most consequential and most misunderstood choices in backend auth.`,

    intuition: `Compare a **coat-check ticket** to a **festival wristband**.

A coat-check ticket (server session) is just a number. It means nothing on its own -- the attendant looks it up in their ledger to find your coat. If they lose the ledger, or cross out your number, your ticket is instantly worthless. Revocation is trivial, but every check requires the attendant and the ledger.

A festival wristband (JWT) has your access level printed on it and a tamper-proof seal. Any guard can verify it on the spot without calling anyone. Fast and scalable -- but if you need to ban someone before the festival ends, you cannot un-print the wristband; you have to check a separate banned-list at every gate, which defeats the point.`,

    howItWorks: `### Server sessions (stateful)
1. On login, the server creates a session record (user id, expiry, roles) in a shared store (Redis/DB) and returns an opaque **session ID** in an httpOnly cookie.
2. On each request, the server looks up the session ID in the store to get the user.
3. **Logout / ban = delete the record.** Instantly effective everywhere.

\`\`\`
login  -> store[sid] = {user:42, exp}; Set-Cookie: sid=opaque; HttpOnly
request-> lookup store[sid] -> user 42
logout -> del store[sid]  (immediately invalid)
\`\`\`

### JWT (stateless)
1. On login, the server signs a token containing the claims (sub, exp, roles) and returns it.
2. On each request, the server **verifies the signature and expiry locally** -- no lookup.
3. There is no server record to delete, so the token is valid until it expires.

\`\`\`
login  -> token = sign({sub:42, exp, roles})
request-> verify(token) locally -> trust claims
logout -> ??? token still valid until exp (this is the hard part)
\`\`\`

### The hybrid that most real systems use
**Short-lived access JWT (5-15 min) + long-lived refresh token stored server-side.** You get JWT's stateless speed for the common case, and revocation via the refresh token: revoke the refresh token and the user is locked out within one access-token lifetime.`,

    internals: `- **Where the state lives is the whole distinction.** Sessions = state on server (lookup per request). JWT = state in the token (verify per request, no lookup). Everything else follows from that.
- **Revocation asymmetry:** deleting a session is instant and global. A JWT cannot be un-issued; your only options are (a) wait for expiry, (b) keep a denylist (which reintroduces a per-request store lookup, partly defeating statelessness), or (c) short TTLs + refresh rotation.
- **JWT payloads are signed, not encrypted** -- readable by anyone. Never put secrets in them. Sessions expose nothing because the ID is opaque.
- **Cost model:** sessions add a store read to every request (fast with Redis, but a dependency and a scaling axis). JWT verification is CPU-only (HMAC/RSA) with no I/O -- great for high fan-out and cross-service auth.
- **Token size:** a JWT rides in every request header; fat claims inflate every request. A session ID is tiny.
- **The alg:none / weak-secret pitfalls** make JWT easy to misimplement; sessions have a smaller footgun surface.
- **Refresh token rotation** (issue a new refresh token on each use, invalidate the old) detects token theft: if a stolen refresh token is used, the legitimate one breaks and you can force re-login.`,

    diagram: {
      title: "Where does the auth state live?",
      layers: [
        { id: "login", label: "Login", sub: "verify password once" },
        { id: "session", label: "Session path", sub: "store record -> opaque cookie -> lookup per request" },
        { id: "jwt", label: "JWT path", sub: "sign claims -> token -> verify locally per request" },
        { id: "revoke", label: "Revocation", sub: "session: delete record (instant) | JWT: wait/denylist" },
        { id: "hybrid", label: "Hybrid (common)", sub: "short JWT + server-side refresh token" },
      ],
      caption: "Sessions keep truth on the server (easy revoke, needs a store); JWTs carry truth (scales, hard to revoke).",
    },

    realWorld: `A company issues 24-hour JWTs with no revocation path because "JWTs are stateless and scale". An employee is fired at 9am; IT disables their account, but their in-flight JWT keeps working until it expires that evening -- a full workday of access after termination, and no button exists to stop it. The postmortem forces a redesign: cut access tokens to 15 minutes, add server-side refresh tokens, and revoke the refresh token on offboarding. Now disabling the account locks them out within 15 minutes. The lesson: **if you need reliable revocation, pure long-lived JWTs are the wrong tool** -- use short tokens + refresh, or sessions.`,

    production: `- **Use httpOnly + Secure + SameSite cookies** for whichever credential the browser holds (session ID or refresh token) -- never localStorage (XSS-exfiltratable).
- **If you pick JWT, keep access tokens short (5-15m) and add server-side refresh tokens** so you have a revocation lever.
- **If you need instant, reliable revocation** (banking, admin, offboarding), prefer server sessions or a hybrid -- not bare long-lived JWTs.
- **Rotate refresh tokens** on each use to detect theft.
- **Back sessions with Redis** (fast, TTL-native) and treat the store's availability as part of your auth SLO.
- **Always validate exp/iss/aud and pin the algorithm** when verifying JWTs; never accept alg:none.
- **Keep JWT claims minimal** -- they ride on every request and are publicly readable.`,

    commonMistakes: [
      "Long-lived JWTs with no revocation strategy -- a fired user or leaked token stays valid for hours.",
      "Storing JWTs or refresh tokens in localStorage where XSS can steal them.",
      "Adding a JWT denylist and pretending you are still stateless -- you reintroduced a per-request store lookup.",
      "Putting sensitive data in a JWT payload (it is signed, not encrypted, and readable by anyone).",
      "Accepting alg:none or an unpinned algorithm, letting attackers forge tokens.",
      "Ignoring that server sessions make Redis a hard dependency on the auth critical path.",
    ],

    tradeoffs: `| Property | Server sessions | JWT (stateless) |
|---|---|---|
| Where state lives | Server store (Redis/DB) | Inside the token |
| Per-request cost | Store lookup (I/O) | Signature verify (CPU only) |
| Revocation | Instant (delete record) | Hard (wait for exp / denylist) |
| Horizontal scale | Needs shared session store | Trivial (no shared state) |
| Cross-service auth | Awkward (share the store) | Natural (each service verifies) |
| Payload privacy | Opaque ID reveals nothing | Claims readable by anyone |
| Request size | Tiny cookie | Full token on every request |`,

    whenToUse: [
      "JWT: stateless APIs, mobile clients, and cross-service auth where a per-request store lookup is undesirable.",
      "Sessions: web apps that need instant, reliable revocation and already run a shared store.",
      "Hybrid (short JWT + refresh): the pragmatic default for most modern apps wanting both scale and revocation.",
    ],
    whenNotToUse: [
      "Pure long-lived JWTs when you need dependable, immediate revocation (offboarding, banking, admin).",
      "Server sessions when you have no shared store and need to scale statelessly across many services.",
      "Putting large or sensitive per-user state in a JWT (that belongs server-side).",
    ],

    memoryCard: {
      problem: "Re-prove a logged-in user's identity on every request, balancing scale against revocation.",
      mentalModel: "Coat-check ticket (session: look it up, easy to cancel) vs festival wristband (JWT: self-verifying, hard to un-issue).",
      keyConcepts: ["state on server vs in token", "lookup cost vs verify cost", "instant revoke vs hard revoke", "signed != encrypted", "short JWT + refresh hybrid"],
      productionConnection: "Most apps use short-lived access JWTs + server-side refresh tokens in httpOnly cookies to get stateless speed with a revocation lever.",
      oneLiner: "Sessions keep the truth on the server (easy to revoke, needs a store); JWTs carry the truth (scale freely, but hard to revoke) -- so most systems combine short JWTs with server-side refresh tokens.",
    },

    quiz: [
      {
        id: "jvs-q1",
        prompt: "What is the fundamental difference between server sessions and JWTs?",
        choices: [
          { text: "JWTs are encrypted; sessions are not", correct: false },
          { text: "Sessions keep auth state on the server (lookup per request); JWTs carry the state in the signed token (verify locally)", correct: true },
          { text: "Sessions only work over HTTPS; JWTs work over HTTP", correct: false },
          { text: "JWTs cannot expire", correct: false },
        ],
        explanation: "The distinction is where the state lives. A session ID is opaque and requires a server-side lookup; a JWT contains the claims and is verified locally by signature, needing no lookup.",
      },
      {
        id: "jvs-q2",
        prompt: "Why is instant revocation hard with pure long-lived JWTs?",
        choices: [
          { text: "JWTs are stored in a database that is slow to update", correct: false },
          { text: "There is no server-side record to delete, so a valid token stays valid until it expires", correct: true },
          { text: "The signature cannot be verified after issuance", correct: false },
          { text: "JWTs do not include an expiry", correct: false },
        ],
        explanation: "A JWT is self-contained and verified locally, so there is nothing on the server to remove. Without a denylist or short TTL, it remains valid until exp -- which is exactly why long-lived JWTs are dangerous for offboarding.",
      },
      {
        id: "jvs-q3",
        prompt: "What is the common hybrid that balances scale and revocation?",
        choices: [
          { text: "Long-lived JWTs stored in localStorage", correct: false },
          { text: "Short-lived access JWTs plus server-side refresh tokens", correct: true },
          { text: "Sessions with the session ID embedded in the URL", correct: false },
          { text: "Two JWTs signed with the same key", correct: false },
        ],
        explanation: "Short access tokens give stateless verification for the common case, while a revocable server-side refresh token bounds how long access survives after you revoke -- typically one access-token lifetime.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Choose and harden an auth strategy",
      brief: "You are building an internal admin tool that must lock out fired employees within minutes. Decide session vs JWT vs hybrid and specify the design.",
      steps: `1. State the revocation requirement (lockout within minutes) and what it rules out.\n2. Choose session, pure JWT, or hybrid and justify against scale + revocation.\n3. Specify token/cookie storage (httpOnly+Secure+SameSite) and TTLs.\n4. Define the revocation path (delete session, or revoke refresh token).\n5. If using JWT, list the verify-time checks (exp/iss/aud, pinned algorithm).\n6. Note the store dependency (Redis) and its impact on the auth SLO.`,
      successCriteria: [
        "Revocation requirement drives the choice",
        "Credentials live in httpOnly cookies, not localStorage",
        "TTLs bound post-revocation access",
        "A concrete revocation mechanism is defined",
        "JWT verification pins the algorithm and validates claims",
      ],
    },
  },

  {
    slug: "oauth2-openid",
    title: "OAuth2 & OpenID Connect",
    track: "shared",
    phase: "backend",
    module: "auth",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "Delegated authorization (OAuth2) and identity on top of it (OIDC): the authorization-code + PKCE flow, why access/ID/refresh tokens differ, and the mistakes that cause breaches.",
    prerequisites: ["authentication-dual", "jwt-vs-sessions"],
    relatedConcepts: ["jwt-vs-sessions", "authentication-dual", "rest-design", "status-codes"],
    tags: ["oauth2", "oidc", "pkce", "authorization-code", "sso", "delegation"],

    why: `You want "Sign in with Google" or "let this app read my calendar" without ever handing the third-party app your Google password. That is the problem OAuth2 solves: **delegated authorization** -- granting an application limited access to your resources on another service, scoped and revocable, without sharing credentials.

OAuth2 alone answers "what may this app do?" but not "who is the user?". **OpenID Connect (OIDC)** is a thin identity layer on top of OAuth2 that adds a standard way to prove identity (the ID token). Together they power virtually all modern SSO and social login. Getting the flow wrong is a direct path to account takeover, so understanding it is not optional for backend engineers.`,

    intuition: `OAuth2 is a **hotel key-card system**.

You (the resource owner) do not give the valet (a third-party app) your master key (password). Instead you go to the front desk (the authorization server), prove who you are, and say "issue this valet a card that only opens the parking garage (a scope), valid for today (expiry)". The valet gets a limited card (access token). The garage door (resource server) trusts cards from the front desk without knowing anything about you. You can cancel the card anytime without changing your master key.

OIDC adds one thing: alongside the garage card, the front desk also hands over a **signed ID badge with your photo** (the ID token) so the valet can confirm *who* authorised them, not just *what* they can open.`,

    howItWorks: `### The four roles
- **Resource owner** -- the user.
- **Client** -- the app wanting access.
- **Authorization server** -- issues tokens (Google, Okta, Auth0).
- **Resource server** -- the API holding the data, validates the access token.

### Authorization Code flow with PKCE (the one to use)
\`\`\`
1. App redirects user to authz server with client_id, scope,
   redirect_uri, state, and a PKCE code_challenge.
2. User logs in + consents at the authz server (never at the app).
3. Authz server redirects back with a one-time authorization CODE.
4. App exchanges CODE + code_verifier (PKCE) at the token endpoint
   -> receives access_token (+ id_token for OIDC, + refresh_token).
5. App calls the resource server with the access_token.
\`\`\`

### The three token types
- **Access token** -- authorizes API calls (scoped, short-lived). Often opaque or a JWT.
- **ID token (OIDC only)** -- a JWT *about the user* (sub, email, name); proves identity to the client. Never send it to APIs as authorization.
- **Refresh token** -- long-lived, exchanged for new access tokens; kept secret server-side.

### PKCE and state
- **PKCE** (Proof Key for Code Exchange): the app sends a hashed \`code_challenge\` up front and the raw \`code_verifier\` at exchange, so a stolen authorization code is useless without the verifier. Mandatory for public clients (SPAs, mobile).
- **state** parameter: a random value echoed back to defend against CSRF on the callback.`,

    internals: `- **Why the code flow, not implicit?** The deprecated implicit flow returned the token directly in the redirect URL, where it leaked into logs, history, and referrers. The code flow keeps the token exchange on a back channel; PKCE secures the front-channel code even without a client secret.
- **Access token vs ID token confusion is a top mistake:** the ID token is for the *client* to learn who logged in; the access token is for calling *APIs*. Sending an ID token to an API, or using an access token to identify a user, are both wrong and sometimes exploitable.
- **Validating an OIDC ID token** means: verify signature against the provider's JWKS, check \`iss\`, \`aud\` (must equal your client_id), \`exp\`, and the \`nonce\` you sent. Skipping \`aud\`/\`nonce\` enables token replay/confused-deputy attacks.
- **Scopes are coarse authorization**, not fine-grained permissions; the resource server still enforces its own rules.
- **redirect_uri must be exact-matched** against a registered allowlist; open redirects here are a classic account-takeover vector.
- **Refresh token rotation + reuse detection**: rotate on each use and revoke the whole chain if an old one is replayed (signals theft).
- **JWKS + kid** let the provider rotate signing keys; your validator fetches and caches the public keys and picks the right one by \`kid\`.`,

    diagram: {
      title: "Authorization Code + PKCE flow",
      layers: [
        { id: "redirect", label: "1. Redirect to authz server", sub: "client_id, scope, state, code_challenge" },
        { id: "consent", label: "2. User authenticates + consents", sub: "at the authz server, not the app" },
        { id: "code", label: "3. Redirect back with CODE", sub: "one-time authorization code + state" },
        { id: "exchange", label: "4. Exchange code + code_verifier", sub: "back channel -> access + id + refresh tokens" },
        { id: "call", label: "5. Call resource server", sub: "Bearer access_token; validate ID token separately" },
      ],
      caption: "The user authenticates at the authorization server; the app never sees the password, only scoped tokens.",
    },

    realWorld: `A single-page app implements social login with the old implicit flow, so the access token lands directly in the browser URL after redirect. It ends up in browser history, server logs, and any analytics that capture the referrer -- and an XSS bug can read it straight from the address bar. Attackers harvest tokens and impersonate users. The remediation is to switch to the **authorization code flow with PKCE**: the code (not the token) comes back in the URL, and it is worthless without the \`code_verifier\` held only by the app. This is exactly why the OAuth2 Security BCP deprecates implicit and mandates PKCE for public clients.`,

    production: `- **Always use Authorization Code + PKCE**; never the implicit flow. PKCE is mandatory for SPAs and mobile.
- **Validate ID tokens fully:** signature via JWKS, plus iss, aud (= your client_id), exp, and nonce.
- **Exact-match redirect_uri** against a registered allowlist -- no wildcards, no open redirects.
- **Use state for CSRF protection** on the callback and reject mismatches.
- **Keep refresh tokens server-side / in httpOnly cookies**, rotate them, and detect reuse.
- **Do not confuse tokens:** ID token identifies the user to the client; access token authorizes API calls. Never swap them.
- **Request least-privilege scopes** and re-verify authorization at the resource server -- scopes are not a substitute for your own access control.`,

    commonMistakes: [
      "Using the deprecated implicit flow, leaking access tokens into URLs, logs, and history.",
      "Skipping PKCE on a public client, so a stolen authorization code is directly usable.",
      "Sending the ID token to APIs as authorization, or using the access token to identify the user.",
      "Not validating aud/iss/nonce on the ID token, enabling token replay or confused-deputy attacks.",
      "Wildcard or loosely matched redirect_uri, opening an account-takeover vector.",
      "Treating OAuth2 scopes as full authorization and skipping resource-server permission checks.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| OAuth2/OIDC (delegated) | No password sharing, scoped + revocable, SSO | Complex flow, many footguns |
| Roll-your-own auth | Full control, simpler mental model | You own every security edge case |
| Authorization Code + PKCE | Secure for public + confidential clients | Extra round trip + PKCE bookkeeping |
| Implicit flow (legacy) | One fewer round trip | Token in URL -- deprecated, insecure |`,

    whenToUse: [
      "Social login / SSO where users authenticate via Google, Okta, Azure AD, etc.",
      "Letting a third-party app access a user's resources with scoped, revocable permission.",
      "Delegated access between your own services via an identity provider.",
    ],
    whenNotToUse: [
      "A simple single-app login with your own user table where OAuth2's complexity adds no value (plain sessions/JWT may suffice).",
      "Machine-to-machine with no user present (use the client-credentials grant, not the full user flow).",
    ],

    memoryCard: {
      problem: "Let an app access a user's resources (or log them in) without sharing the user's password.",
      mentalModel: "A hotel front desk issuing a scoped, time-limited key card (access token) plus a photo ID badge (OIDC ID token) instead of the master key.",
      keyConcepts: ["4 roles (owner/client/authz/resource)", "authorization code + PKCE", "access vs ID vs refresh tokens", "validate iss/aud/exp/nonce", "state for CSRF"],
      productionConnection: "Modern SSO uses the code+PKCE flow; validate ID tokens fully, exact-match redirect_uri, and keep refresh tokens server-side and rotated.",
      oneLiner: "OAuth2 delegates scoped access via tokens without sharing passwords, and OIDC layers on a verifiable ID token -- use the authorization-code + PKCE flow and validate everything.",
    },

    quiz: [
      {
        id: "oauth-q1",
        prompt: "What problem does PKCE solve in the authorization code flow?",
        choices: [
          { text: "It encrypts the access token in transit", correct: false },
          { text: "It makes a stolen authorization code useless without the matching code_verifier", correct: true },
          { text: "It removes the need for HTTPS", correct: false },
          { text: "It lets the client skip user consent", correct: false },
        ],
        explanation: "PKCE binds the front-channel code to a secret (code_verifier) held only by the legitimate client. An attacker who intercepts the code cannot exchange it without the verifier, protecting public clients that have no client secret.",
      },
      {
        id: "oauth-q2",
        prompt: "What is the correct use of an OIDC ID token?",
        choices: [
          { text: "Send it to resource-server APIs as the authorization credential", correct: false },
          { text: "It tells the client who the user is; validate its signature, iss, aud, exp, and nonce", correct: true },
          { text: "Use it as a refresh token to get new access tokens", correct: false },
          { text: "Store it and never validate it", correct: false },
        ],
        explanation: "The ID token is identity information for the client. It must be fully validated (JWKS signature, iss, aud=your client_id, exp, nonce). API authorization uses the access token, not the ID token.",
      },
      {
        id: "oauth-q3",
        prompt: "Why is the implicit flow deprecated in favour of authorization code + PKCE?",
        choices: [
          { text: "It was too slow", correct: false },
          { text: "It returned tokens directly in the redirect URL, where they leak into logs, history, and referrers", correct: true },
          { text: "It did not support scopes", correct: false },
          { text: "It required a client secret in the browser", correct: false },
        ],
        explanation: "Implicit put the access token in the URL fragment, exposing it to browser history, logs, and XSS. The code flow returns only a short-lived code, and PKCE secures even that for public clients.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Add 'Sign in with Google' securely",
      brief: "Design an OIDC login for an SPA + backend. Specify the flow, tokens, and every validation step needed to be secure.",
      steps: `1. Choose the grant (Authorization Code + PKCE) and justify it for a public client.\n2. List the authorization request params: client_id, scope, redirect_uri, state, code_challenge.\n3. Describe the code exchange and which tokens you receive (access, id, refresh).\n4. Enumerate the ID token validation checks (signature/JWKS, iss, aud, exp, nonce).\n5. Decide where each token is stored and how refresh tokens are rotated.\n6. State how you enforce authorization at the resource server beyond scopes.`,
      successCriteria: [
        "Uses authorization code + PKCE, not implicit",
        "state and nonce are used and verified",
        "ID token is fully validated (iss/aud/exp/nonce + signature)",
        "redirect_uri is exact-matched",
        "Refresh tokens are server-side and rotated",
      ],
    },
  },

  {
    slug: "rate-limiting",
    title: "Rate Limiting",
    track: "shared",
    phase: "backend",
    module: "resilience",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Protecting a service from overload and abuse by capping request rates: token bucket vs sliding window, where to enforce it, distributed counters, and the 429 + Retry-After contract.",
    prerequisites: ["http-fundamentals", "status-codes"],
    relatedConcepts: ["status-codes", "load-balancing", "redis-deep", "idempotency"],
    tags: ["rate-limiting", "token-bucket", "sliding-window", "429", "throttling", "resilience"],

    why: `Every service has a finite capacity, and demand does not respect it. A buggy client in a retry loop, a scraper, a credential-stuffing attack, or one tenant's traffic spike can consume all your resources and take down the service for everyone. **Rate limiting exists to cap how much any single caller can consume**, so one abusive or misbehaving source cannot degrade the whole system.

It is both a **reliability** tool (protect capacity, enforce fairness across tenants) and a **security** tool (blunt brute-force, scraping, and denial-of-service). Without it, your worst-behaved client sets your reliability.`,

    intuition: `A rate limiter is the **bouncer with a clicker at a club door**.

The club holds a fixed number of people (capacity). The bouncer lets people in at a controlled pace and, once the room is full or the pace is exceeded, holds the rest outside with "not right now, come back in a bit" (a 429 with Retry-After). The point is not to be unfriendly -- it is to keep the club from becoming a dangerous crush that ruins the night for everyone inside.

The **token bucket** refinement: imagine the bouncer hands out tokens that refill slowly. You can spend a burst of saved-up tokens to enter quickly after a quiet spell, but sustained entry is capped at the refill rate. That is how you allow short bursts while bounding the long-run average.`,

    howItWorks: `### Common algorithms
- **Token bucket:** a bucket holds up to N tokens, refilled at R tokens/sec. Each request spends a token; empty bucket -> reject. Allows bursts up to N, average rate R. Most widely used.
- **Leaky bucket:** requests queue and drain at a fixed rate; smooths bursts into a steady stream.
- **Fixed window:** count requests per calendar window (e.g. per minute). Simple, but a burst straddling the boundary can allow ~2x the limit.
- **Sliding window (log or counter):** counts over a rolling window; smoother and more accurate than fixed window, at higher cost.

### Where to enforce it
- **Edge / API gateway / load balancer** -- cheapest, stops abuse before it touches your app.
- **Per-service (middleware)** -- protects specific expensive endpoints.
- **Per-resource** -- e.g. login attempts per account to stop brute force.

### The client contract
On limit, return **429 Too Many Requests** with a **\`Retry-After\`** header (and often \`X-RateLimit-Limit/Remaining/Reset\`) so well-behaved clients back off deterministically instead of hammering.`,

    internals: `- **Distributed rate limiting is the hard part.** With many app instances, a local in-memory counter lets each instance allow the full limit, so N instances allow N x limit. You need a **shared counter** (usually Redis) -- e.g. INCR with EXPIRE, or an atomic token-bucket Lua script -- so the limit is global.
- **Atomicity matters:** naive GET-then-SET on a shared counter races under concurrency and over-admits. Use atomic operations (Redis INCR, or a Lua script that checks-and-decrements in one step).
- **Fixed-window boundary bug:** two bursts on either side of the window edge can pass 2x the limit within a rolling minute. Sliding-window counters approximate the rolling rate to avoid this.
- **Choosing the key** defines fairness: per-API-key, per-user, per-IP, or per-tenant. Per-IP alone is weak (NAT, proxies) and can punish shared networks.
- **Fail-open vs fail-closed:** if the rate-limit store (Redis) is down, do you allow all traffic (risk overload) or block it (risk outage)? Usually fail-open with alerting, since a limiter outage should not become a service outage.
- **Cost-based limiting:** not all requests are equal; some limiters charge more tokens for expensive endpoints.
- **Rate limiting composes with retries and idempotency:** a 429 should trigger backoff, and retried writes still need idempotency keys.`,

    diagram: {
      title: "Token-bucket rate limiting at the edge",
      layers: [
        { id: "req", label: "Incoming request", sub: "keyed by API key / user / IP" },
        { id: "bucket", label: "Token bucket", sub: "capacity N, refill R/sec (shared in Redis)" },
        { id: "check", label: "Token available?", sub: "atomic check-and-decrement" },
        { id: "allow", label: "Yes -> forward", sub: "request proceeds to service" },
        { id: "reject", label: "No -> 429 + Retry-After", sub: "client backs off deterministically" },
      ],
      caption: "A shared bucket enforces a global limit across all instances and tells rejected clients exactly when to retry.",
    },

    realWorld: `A partner's integration has a bug: on any error it retries immediately in a tight loop. One afternoon their credentials start failing and the loop sends 40,000 requests/second at your login endpoint. With no rate limit, your auth service and its database saturate and every customer's logins start failing -- the buggy partner has caused a full outage. After adding a per-API-key token-bucket limit at the gateway (say 100 req/s, burst 200) backed by Redis, the same runaway loop simply gets 429s with Retry-After; your capacity is protected and every other customer is unaffected. The rate limiter converted a company-wide outage into one partner's throttling.`,

    production: `- **Enforce at the edge/gateway first** so abuse never reaches your app, and add per-endpoint limits for expensive routes.
- **Use a shared, atomic counter (Redis INCR+EXPIRE or a Lua token bucket)** so the limit is global across instances, not per-instance.
- **Return 429 with Retry-After** and rate-limit headers so clients back off correctly.
- **Choose the right key** (API key / user / tenant), not just IP, to be fair behind NAT and proxies.
- **Allow bursts** (token bucket) rather than a hard per-second cliff, to tolerate normal spiky traffic.
- **Decide fail-open vs fail-closed** for a limiter-store outage -- usually fail-open with alerting.
- **Apply stricter limits to sensitive endpoints** (login, password reset, OTP) to blunt brute force.`,

    commonMistakes: [
      "Per-instance in-memory counters that let N app instances collectively allow N x the intended limit.",
      "Non-atomic GET-then-SET on a shared counter, racing under load and over-admitting.",
      "Fixed windows whose boundary lets a burst pass ~2x the limit within a rolling window.",
      "Returning 503 or 500 instead of 429, or omitting Retry-After so clients retry instantly.",
      "Keying only on IP, punishing shared networks and being trivially bypassed by rotating IPs.",
      "Fail-closed on limiter-store outage, turning a Redis blip into a full service outage.",
    ],

    tradeoffs: `| Algorithm | Benefit | Cost |
|---|---|---|
| Token bucket | Allows bursts, simple, bounds average | Two params to tune (size + refill) |
| Leaky bucket | Smooths traffic to a steady rate | Adds queueing latency |
| Fixed window | Trivial to implement | Boundary burst allows ~2x |
| Sliding window | Accurate rolling limit | More memory/CPU per check |
| Local counter | Zero shared-store dependency | Not a global limit across instances |
| Shared (Redis) counter | True global limit | Adds a dependency + atomicity concerns |`,

    whenToUse: [
      "Any public API or endpoint that can be abused, scraped, or overwhelmed.",
      "Multi-tenant systems needing fairness so one tenant cannot starve others.",
      "Sensitive endpoints (login, OTP, password reset) to blunt brute force.",
    ],
    whenNotToUse: [
      "Purely internal, trusted, capacity-planned traffic where a limiter adds latency and complexity for no threat.",
      "As a substitute for actual capacity or autoscaling -- limiting protects capacity, it does not add it.",
    ],

    memoryCard: {
      problem: "Stop one abusive or buggy caller from consuming all capacity and degrading the service for everyone.",
      mentalModel: "A bouncer with a clicker: admit at a controlled pace, allow short bursts (token bucket), hold the rest outside with 'come back in N seconds'.",
      keyConcepts: ["token bucket vs sliding window", "enforce at the edge", "shared atomic counter (Redis)", "429 + Retry-After", "key by API key/user, not just IP", "fail-open vs fail-closed"],
      productionConnection: "A Redis-backed token bucket at the gateway turns a runaway client into a throttled one instead of a company-wide outage.",
      oneLiner: "Rate limiting caps per-caller consumption -- ideally a shared token bucket at the edge that returns 429 + Retry-After -- so one bad actor cannot take down the service.",
    },

    quiz: [
      {
        id: "rl-q1",
        prompt: "Why does a per-instance in-memory rate limit fail when you run 10 app replicas?",
        choices: [
          { text: "In-memory counters are too slow", correct: false },
          { text: "Each replica enforces the limit independently, so the cluster allows up to 10x the intended limit", correct: true },
          { text: "Memory is cleared on every request", correct: false },
          { text: "It returns the wrong status code", correct: false },
        ],
        explanation: "A local counter only sees its own instance's traffic. With 10 replicas, each admits the full limit, so the aggregate is 10x. A shared, atomic counter (e.g. Redis) is needed for a true global limit.",
      },
      {
        id: "rl-q2",
        prompt: "What does the token bucket algorithm allow that a strict per-second cap does not?",
        choices: [
          { text: "Unlimited requests", correct: false },
          { text: "Short bursts up to the bucket size while still bounding the long-run average rate", correct: true },
          { text: "Skipping the 429 response", correct: false },
          { text: "Per-IP keying only", correct: false },
        ],
        explanation: "Tokens accumulate up to the bucket capacity during quiet periods, so a client can burst quickly, but sustained throughput is capped at the refill rate -- tolerating normal spiky traffic without exceeding the average.",
      },
      {
        id: "rl-q3",
        prompt: "What should a service return when a client exceeds its rate limit?",
        choices: [
          { text: "500 Internal Server Error", correct: false },
          { text: "429 Too Many Requests with a Retry-After header", correct: true },
          { text: "200 OK with an empty body", correct: false },
          { text: "403 Forbidden", correct: false },
        ],
        explanation: "429 is the standard rate-limit code, and Retry-After tells the client exactly how long to wait, enabling deterministic backoff instead of instant retries that worsen the overload.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a distributed rate limiter",
      brief: "Your API runs 8 replicas behind a gateway and needs a global limit of 100 req/s per API key with small bursts. Design it.",
      steps: `1. Choose an algorithm (token bucket) and its parameters (capacity + refill rate).\n2. Decide the enforcement point (gateway vs middleware) and the limit key (API key).\n3. Design the shared counter in Redis and make the check-and-decrement atomic (INCR+EXPIRE or Lua).\n4. Define the response: 429 + Retry-After + rate-limit headers.\n5. Decide fail-open vs fail-closed if Redis is unavailable, with alerting.\n6. Add a stricter limit for the login endpoint and justify it.`,
      successCriteria: [
        "Limit is global across all 8 replicas via a shared store",
        "Counter updates are atomic (no race over-admits)",
        "Bursts are allowed but the average is bounded",
        "Rejections return 429 + Retry-After",
        "A fail-open/closed decision is stated with alerting",
      ],
    },
  },

  {
    slug: "websockets-dual",
    title: "WebSockets: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "resilience",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "Full-duplex, persistent connections for real-time apps -- the same chat/notification pattern in FastAPI and NestJS -- plus the operational reality of stateful connections at scale.",
    prerequisites: ["http-fundamentals", "tcp", "load-balancing"],
    relatedConcepts: ["tcp", "load-balancing", "redis-deep", "background-jobs-dual"],
    tags: ["websockets", "realtime", "full-duplex", "fastapi", "nestjs", "dual-track", "scaling"],

    why: `HTTP is request/response: the client asks, the server answers, and the connection is done. That is a terrible fit for anything where the **server needs to push to the client** -- chat messages, live notifications, presence, dashboards, collaborative editing, price tickers. Polling ("any updates? any updates now?") wastes requests and adds latency.

**WebSockets provide a single, long-lived, full-duplex TCP connection** over which both sides can send messages at any time. They turn "the client must keep asking" into "either side speaks when it has something to say" -- the foundation of real-time features. The concept is identical across ecosystems; FastAPI and NestJS just expose different decorators and lifecycles.`,

    intuition: `HTTP is like **sending letters**: you mail a question, wait, and get a letter back; to hear anything new you must mail another letter. A WebSocket is like **keeping a phone line open**: once connected, either side can talk the instant they have something to say, with no re-dialling.

The catch is that an open phone line is **stateful** -- it belongs to one specific server, it consumes resources while idle, and if it drops you have to redial and figure out what you missed. That statefulness is exactly what makes WebSockets powerful and also what makes them operationally harder than stateless HTTP.`,

    howItWorks: `### The upgrade handshake
A WebSocket starts as a normal HTTP request with an \`Upgrade: websocket\` header. The server responds \`101 Switching Protocols\`, and from then on the same TCP connection carries bidirectional WebSocket frames instead of HTTP.
\`\`\`
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
      -> 101 Switching Protocols   (now full-duplex, persistent)
\`\`\`

### The lifecycle both frameworks model
1. **connect** -- authenticate, register the connection (often join a room/topic).
2. **message** -- receive from client / push to client at any time.
3. **disconnect** -- clean up, remove from rooms, update presence.

### Rooms and broadcast
Real apps group connections (a chat room, a document, a user's devices) and broadcast a message to everyone in the group.

### The framework difference (superficial)
- **FastAPI:** \`@app.websocket("/ws")\` async handler; you manage a connection registry yourself (or via a library).
- **NestJS:** \`@WebSocketGateway\` class with \`@SubscribeMessage\` handlers, built on Socket.IO or ws, with rooms and lifecycle hooks provided.

The hard parts -- auth, backpressure, and scaling across instances -- are the same in both.`,

    dualCode: [
      {
        concept: "A connection manager + echo/broadcast endpoint",
        note: "FastAPI gives you the raw WebSocket and you keep your own registry; NestJS provides a gateway class with lifecycle hooks. Same concept: accept, track, handle messages, clean up on disconnect.",
        python: {
          label: "FastAPI (starlette websockets)",
          language: "python",
          code: `from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active.remove(ws)

    async def broadcast(self, message: str) -> None:
        for ws in self.active:
            await ws.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            await manager.broadcast(f"user says: {data}")
    except WebSocketDisconnect:
        manager.disconnect(ws)
        await manager.broadcast("a user left")`,
        },
        typescript: {
          label: "NestJS (@WebSocketGateway)",
          language: "typescript",
          code: `import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    // authenticate via client.handshake.auth.token here
    client.join('lobby');
  }

  handleDisconnect(client: Socket) {
    this.server.to('lobby').emit('message', 'a user left');
  }

  @SubscribeMessage('message')
  onMessage(@MessageBody() data: string) {
    // broadcast to everyone in the room
    this.server.to('lobby').emit('message', 'user says: ' + data);
  }
}`,
        },
      },
      {
        concept: "Authenticating the connection at handshake",
        note: "You cannot rely on per-request auth middleware -- there is one long-lived connection. Verify a token at connect time and reject before accepting.",
        python: {
          label: "FastAPI (verify token on connect)",
          language: "python",
          code: `from fastapi import WebSocket, status
from jose import jwt, JWTError

SECRET = "change-me"; ALGO = "HS256"

@app.websocket("/ws")
async def ws_auth(ws: WebSocket):
    token = ws.query_params.get("token")
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
    except JWTError:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await ws.accept()
    await ws.send_text(f"welcome {payload['sub']}")`,
        },
        typescript: {
          label: "NestJS (verify token in handleConnection)",
          language: "typescript",
          code: `import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class AuthGateway implements OnGatewayConnection {
  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    try {
      const payload = await this.jwt.verifyAsync(token);
      client.data.userId = payload.sub;
      client.emit('welcome', payload.sub);
    } catch {
      client.disconnect(true); // reject bad token
    }
  }
}`,
        },
      },
    ],

    internals: `- **Scaling breaks the naive registry.** An in-memory connection list only knows connections on *that* instance. With multiple instances behind a load balancer, a broadcast reaches only the users on the same box. The fix is a **pub/sub backplane** (Redis pub/sub, or Socket.IO's Redis adapter): each instance publishes messages to Redis and subscribes to deliver to its own local connections. NestJS + Redis adapter and FastAPI + Redis pub/sub solve the identical problem.
- **Sticky sessions / connection affinity:** because the connection is stateful and pinned to one instance, the load balancer must keep a client on the same backend (or the handshake/upgrade must be allowed and long timeouts configured). L7 LBs need explicit WebSocket support and long idle timeouts.
- **Backpressure:** a slow client that cannot drain messages will make the server's send buffer grow unboundedly. You must bound per-connection queues and drop or disconnect slow consumers.
- **Heartbeats (ping/pong):** TCP can silently die (NAT timeouts, half-open connections). Periodic ping/pong detects dead peers so you can reap them instead of leaking connections.
- **Reconnection + missed messages:** when a connection drops, the client reconnects, but messages sent while disconnected are gone unless you add sequence numbers / a replay buffer / durable delivery.
- **Resource cost:** each connection holds a file descriptor and memory; tens of thousands of idle connections is a real capacity concern, unlike stateless HTTP.
- **Alternatives:** for server-to-client-only streams, **Server-Sent Events (SSE)** are simpler (one-way, auto-reconnect, plain HTTP). Use WebSockets when you genuinely need bidirectional.`,

    diagram: {
      title: "WebSocket connection with a Redis backplane",
      layers: [
        { id: "handshake", label: "HTTP Upgrade -> 101", sub: "auth at connect; persistent full-duplex TCP" },
        { id: "instance", label: "App instance", sub: "holds local connections + rooms" },
        { id: "backplane", label: "Redis pub/sub backplane", sub: "fan-out across all instances" },
        { id: "broadcast", label: "Broadcast", sub: "publish -> every instance delivers to its locals" },
        { id: "lifecycle", label: "Heartbeats + cleanup", sub: "ping/pong, reap dead, handle reconnect" },
      ],
      caption: "Without a backplane, a broadcast only reaches users on the same instance -- the classic multi-node WebSocket bug.",
    },

    realWorld: `A chat app works perfectly in development on a single process. In production it runs 4 instances behind a load balancer, and users report that they only see messages from *some* people. The cause: each instance keeps its own in-memory connection list, so a broadcast only reaches the users connected to that same instance -- the other three-quarters never get the message. The fix is a **Redis pub/sub backplane** (or Socket.IO's Redis adapter in NestJS): every instance publishes each message to Redis and every instance delivers to its own local sockets, so a broadcast reaches all users regardless of which box they landed on. This is the single most common WebSocket production surprise.`,

    production: `- **Authenticate at the handshake**, not per-message -- verify a token on connect and reject bad ones before accepting.
- **Use a Redis (or equivalent) pub/sub backplane** so broadcasts fan out across all instances; an in-memory registry does not scale past one node.
- **Configure the load balancer for WebSockets:** allow the Upgrade, set long idle timeouts, and use connection affinity where needed.
- **Send heartbeats (ping/pong)** to detect and reap dead connections and avoid leaks.
- **Bound per-connection send buffers** and disconnect slow consumers to prevent memory blowup (backpressure).
- **Plan reconnection + missed-message delivery** (sequence numbers, replay buffer, or a durable queue) -- WebSockets alone do not guarantee delivery across drops.
- **Consider SSE instead** when you only need server-to-client streaming -- it is simpler and reconnects automatically.`,

    commonMistakes: [
      "Keeping an in-memory connection registry, so broadcasts only reach users on the same instance in a multi-node deployment.",
      "Trying to authenticate per-message instead of verifying a token once at the handshake.",
      "Not configuring the load balancer for the Upgrade / long idle timeouts, so connections drop or never establish.",
      "Ignoring backpressure -- a slow client makes the server's send buffer grow until it runs out of memory.",
      "No heartbeats, so dead (half-open) connections leak file descriptors and memory.",
      "Assuming WebSockets guarantee delivery -- messages sent during a disconnect are lost without a replay mechanism.",
      "Using WebSockets when one-way SSE would be simpler and sufficient.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| WebSockets | Full-duplex, low-latency push, one connection | Stateful, harder to scale, needs backplane + affinity |
| HTTP polling | Simple, stateless, cache-friendly | High latency + wasted requests |
| Server-Sent Events (SSE) | Simple, auto-reconnect, plain HTTP | One-way only (server -> client) |
| In-memory registry | Trivial on one node | Breaks broadcasts across instances |
| Redis backplane | Scales broadcast across nodes | Extra dependency + operational surface |`,

    whenToUse: [
      "Real-time, bidirectional features: chat, live collaboration, multiplayer, presence.",
      "Low-latency server push where polling would be wasteful or too slow.",
      "When both client and server need to send messages independently at any time.",
    ],
    whenNotToUse: [
      "One-way server-to-client streaming where SSE is simpler (notifications, live feeds).",
      "Infrequent updates where polling or long-polling is adequate and stateless is preferable.",
      "Simple request/response APIs -- do not pay statefulness cost for no real-time need.",
    ],

    memoryCard: {
      problem: "Let the server push to clients (and both sides talk anytime) for real-time features, which HTTP request/response cannot do.",
      mentalModel: "An open phone line vs mailing letters: either side speaks instantly, but the line is stateful and pinned to one server.",
      keyConcepts: ["HTTP Upgrade -> 101", "connect/message/disconnect lifecycle", "rooms + broadcast", "auth at handshake", "Redis pub/sub backplane for multi-node", "heartbeats + backpressure"],
      productionConnection: "FastAPI and NestJS model the same lifecycle; the real work is auth at connect, a Redis backplane so broadcasts reach all instances, heartbeats, and backpressure.",
      oneLiner: "WebSockets give a persistent full-duplex connection for real-time push -- easy on one node, but multi-node needs a pub/sub backplane, handshake auth, heartbeats, and backpressure.",
    },

    quiz: [
      {
        id: "ws-q1",
        prompt: "A chat app runs 4 instances behind a load balancer and users only see some messages. What is the cause and fix?",
        choices: [
          { text: "The database is too slow; add an index", correct: false },
          { text: "Each instance has its own in-memory connection list, so broadcasts miss users on other instances; add a Redis pub/sub backplane", correct: true },
          { text: "WebSockets do not support broadcasting; switch to polling", correct: false },
          { text: "The 101 status code is wrong; use 200", correct: false },
        ],
        explanation: "An in-memory registry only knows the connections on its own instance. A broadcast reaches only those users. A pub/sub backplane (Redis / Socket.IO Redis adapter) lets every instance publish and deliver to its own local sockets, reaching everyone.",
      },
      {
        id: "ws-q2",
        prompt: "How should you authenticate a WebSocket connection?",
        choices: [
          { text: "Run normal HTTP auth middleware on every frame", correct: false },
          { text: "Verify a token once at the handshake/connect and reject invalid ones before accepting", correct: true },
          { text: "WebSockets cannot be authenticated", correct: false },
          { text: "Only after the first message is received", correct: false },
        ],
        explanation: "There is a single long-lived connection, not a series of requests, so you authenticate at connect time (e.g. a token in the handshake) and close the socket if it is invalid, rather than re-authenticating per message.",
      },
      {
        id: "ws-q3",
        prompt: "Why do WebSocket deployments need heartbeats (ping/pong)?",
        choices: [
          { text: "To encrypt the messages", correct: false },
          { text: "To detect silently-dead (half-open) connections so they can be reaped instead of leaking resources", correct: true },
          { text: "To increase throughput", correct: false },
          { text: "To satisfy the HTTP spec", correct: false },
        ],
        explanation: "TCP connections can die silently (NAT timeouts, network drops) without a clean close. Periodic ping/pong reveals dead peers so the server can clean up file descriptors and memory instead of leaking them.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Scale a WebSocket chat to multiple instances",
      brief: "A single-process chat works but broadcasts break when scaled to 3 instances behind an LB. Design the multi-node solution.",
      steps: `1. Explain why the in-memory registry breaks broadcasts across instances.\n2. Introduce a Redis pub/sub backplane: describe publish-on-send and subscribe-and-deliver-to-locals.\n3. Configure the load balancer for WebSockets (Upgrade support, long idle timeout, affinity).\n4. Add handshake authentication that rejects bad tokens before accept.\n5. Add heartbeats and per-connection backpressure handling.\n6. Describe reconnection + missed-message handling (sequence numbers or replay).`,
      successCriteria: [
        "Broadcasts reach users across all instances via a backplane",
        "Connections are authenticated at the handshake",
        "LB is configured for the Upgrade and long-lived connections",
        "Heartbeats reap dead connections",
        "Backpressure and reconnection are addressed",
      ],
    },
  },
];
