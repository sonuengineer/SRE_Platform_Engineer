import type { Lesson } from "../types";

export const networkingExtraLessons: Lesson[] = [
  {
    slug: "tls-handshake",
    title: "TLS Handshake",
    track: "shared",
    phase: "networking",
    module: "net-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "How two strangers on a hostile network agree on a shared secret, prove who they are, and switch to encrypted traffic -- and why the handshake, not the data, is where TLS latency and outages live.",
    prerequisites: ["tcp", "dns"],
    relatedConcepts: ["tcp", "dns", "http-lifecycle", "load-balancing", "http-fundamentals"],
    tags: ["tls", "ssl", "encryption", "certificates", "handshake", "sni", "alpn", "mtls", "networking"],

    why: `Every request you send crosses machines you do not control -- ISP routers, transit providers, coffee-shop Wi-Fi, cloud middleboxes. Any of them can **read** your traffic, **tamper** with it, or **impersonate** the server you think you are talking to.

**TLS exists to give you three guarantees over that hostile path:**

- **Confidentiality** -- eavesdroppers see ciphertext, not your data.
- **Integrity** -- if a byte is flipped in transit, the receiver detects it and drops the connection.
- **Authentication** -- you can prove the server is really \`api.example.com\` and not an impostor. (Optionally, the server can prove the client too -- mTLS.)

The hard part is not the encryption itself. It is that the two sides **start out sharing no secret** and are talking over a wire an attacker can watch. TLS is the protocol that lets them bootstrap a shared secret **in public** and bind it to a verified identity. Almost everything you operate -- HTTPS, gRPC, database connections, Kafka, service-mesh traffic -- rides on it.`,

    intuition: `Think of two people who have **never met**, standing in a crowded room where everyone can hear them, who need to agree on a secret password without anyone else learning it.

- First they agree, out loud, on a **math trick** (the key exchange) that lets each of them mix a private number with a public one so they both end up with the **same secret** -- but eavesdroppers who heard every word cannot reconstruct it. That is Diffie-Hellman.
- Before trusting the other side, one of them shows a **passport signed by an authority everyone already trusts** (the certificate, signed by a CA). You do not trust the stranger; you trust the passport office.
- Once both have the shared secret and the passport checks out, they stop shouting and switch to **whispering in a code only the two of them can read** (symmetric encryption).

The whole ceremony -- agree on the trick, show the passport, derive the secret -- is the **handshake**. It happens once per connection and costs round trips. After that, encrypting the actual data is cheap.`,

    howItWorks: `TLS runs **on top of an established TCP connection**. So before TLS even starts you have already paid 1 RTT for the TCP handshake. Then TLS negotiates.

### TLS 1.2 handshake (2 RTT before app data)
\`\`\`
Client                                Server
  | --- ClientHello ---------------->  |  versions, cipher list, SNI, ALPN, client random
  | <-- ServerHello ----------------   |  chosen cipher, server random
  | <-- Certificate ----------------   |  server's cert chain
  | <-- ServerKeyExchange ----------   |  DH params (for forward secrecy)
  | <-- ServerHelloDone ------------   |
  | --- ClientKeyExchange ---------->  |  client's DH share
  | --- ChangeCipherSpec ----------->  |  "switching to encrypted"
  | --- Finished ------------------->  |
  | <-- ChangeCipherSpec -----------   |
  | <-- Finished -------------------   |
  |          [ encrypted app data ]    |
\`\`\`
That is **two full round trips** of negotiation on top of the TCP RTT.

### TLS 1.3 handshake (1 RTT before app data)
TLS 1.3 removed legacy ciphers and folded the key exchange into the first message. The client **guesses** the key-share in \`ClientHello\`, so:
\`\`\`
Client                                Server
  | --- ClientHello + key_share ---->  |
  | <-- ServerHello + key_share -----  |
  |     <-- {Certificate, Finished}    |  (encrypted)
  | --- {Finished} ----------------->  |
  |          [ encrypted app data ]    |
\`\`\`
**One RTT.** If the client resumes a prior session it can even send **0-RTT** data in the very first flight (with caveats -- see internals).

### The key steps regardless of version
1. **Negotiate** protocol version and a **cipher suite** (which key-exchange, which symmetric cipher, which hash).
2. **Key exchange** -- both sides derive the same **shared secret** using ephemeral Diffie-Hellman (ECDHE), so recording the traffic today does not let an attacker decrypt it later even if the server key leaks (forward secrecy).
3. **Authenticate** -- the server sends its **certificate chain**; the client validates it against a trusted **root CA** and checks the name matches (SNI/hostname).
4. **Finish** -- both sides send a \`Finished\` message that is a MAC over the entire handshake, so any tampering with earlier messages is detected.
5. **Switch to symmetric** -- all further data is encrypted with the fast symmetric key (e.g. AES-GCM or ChaCha20-Poly1305).`,

    internals: `**Certificates and the chain of trust.** A cert binds a public key to a hostname and is **signed by a Certificate Authority (CA)**. Your OS/browser ships a list of trusted **root CAs**. The server usually presents a chain: leaf cert -> intermediate CA -> (root, already in your trust store). Validation walks the chain, checks each signature, checks validity dates, and checks that the leaf's Subject Alternative Name (SAN) matches the hostname you asked for. **A missing intermediate is the classic "works in my browser, fails in curl" bug** -- browsers sometimes cache intermediates; strict clients do not.

**Cipher suites.** A suite like \`TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256\` names: key exchange (ECDHE), authentication (RSA cert), bulk cipher (AES-128-GCM), and hash (SHA-256). TLS 1.3 shortened these dramatically and dropped everything without forward secrecy. **Prefer ECDHE** suites -- they give per-session ephemeral keys (forward secrecy); static-RSA key exchange does not.

**SNI (Server Name Indication).** TCP connects to an IP, but one IP often hosts many domains. The client puts the target hostname in \`ClientHello\` (\`server_name\`) so the server knows **which certificate to present** before encryption is set up. SNI is sent in cleartext in TLS 1.2 (Encrypted Client Hello is the fix). **SNI mismatch -> wrong cert -> validation failure.**

**ALPN (Application-Layer Protocol Negotiation).** Also in \`ClientHello\`: the client advertises \`h2\`, \`http/1.1\`, etc., and the server picks one. This is how HTTP/2 is negotiated **during** the TLS handshake with no extra round trip -- the protocol is decided before the first request.

**Session resumption.** Full handshakes are expensive, so TLS caches. Two mechanisms: **session IDs** (server-side state) and **session tickets** (a blob the server encrypts and the client stores, so the server stays stateless). On resume, the expensive key exchange is skipped -- a resumed TLS 1.3 handshake can be **0-RTT**.

**0-RTT caveats.** 0-RTT data is **replayable** -- an attacker who captures the first flight can resend it. Never put **non-idempotent** requests (a POST that charges a card) in 0-RTT. Servers must guard against replay.

**The Finished message** is a hash/MAC over the whole transcript. If a middlebox altered the ClientHello's cipher list to force a weak cipher (a downgrade attack), the Finished hashes will not match and the handshake aborts.`,

    diagram: {
      title: "TLS 1.3 handshake over TCP",
      layers: [
        { id: "tcp", label: "TCP established", sub: "1 RTT already spent on SYN/SYN-ACK/ACK" },
        { id: "hello", label: "ClientHello + key_share", sub: "versions, ciphers, SNI, ALPN, ephemeral DH share" },
        { id: "server", label: "ServerHello + Certificate", sub: "chosen cipher, server key_share, cert chain (encrypted)" },
        { id: "verify", label: "Validate chain + Finished", sub: "walk to trusted root, check SAN/dates, MAC transcript" },
        { id: "data", label: "Encrypted application data", sub: "symmetric AES-GCM / ChaCha20; ~1 RTT total for TLS 1.3" },
      ],
      caption: "TLS 1.3 adds ~1 RTT on top of TCP. Resumption/0-RTT removes even that. The handshake is the cost, not the encryption.",
    },

    realWorld: `Payments go down at 00:00 UTC and nobody deployed anything. Curl to the payment provider returns \`certificate has expired\`. The provider's leaf certificate lapsed at midnight and their auto-renewal job had been silently failing for weeks. Your app was healthy; the **trust check** failed. This is the single most common TLS outage: **an expired certificate**, and it always looks like the other side broke.

A second flavor: you add a new backend behind the load balancer, it works in Chrome, and fails in your Go service with \`x509: certificate signed by unknown authority\`. The server was configured to send only the leaf cert, not the intermediate. Browsers papered over it from cache; your strict client did not. The fix is to serve the **full chain**, not a bigger timeout.`,

    production: `- **Automate certificate rotation.** Use ACME (Let's Encrypt / cert-manager) or your cloud's managed certs. Alert on **days-to-expiry**, not on the outage. Expiry is the number one TLS incident and it is 100% preventable.
- **Terminate TLS at the load balancer / ingress** for public traffic so app servers do not each manage certs and CPU. Re-encrypt (or use mTLS) on the internal hop if the network is untrusted.
- **Use mTLS for service-to-service** in a zero-trust mesh (Istio/Linkerd, or SPIFFE identities). Both sides present certs; identity is cryptographic, not IP-based.
- **Prefer TLS 1.3** everywhere you can -- fewer round trips, only forward-secret ciphers, safer defaults. Disable TLS 1.0/1.1.
- **Reuse connections** so the handshake amortizes. HTTP keep-alive and connection pools turn a per-request 1-2 RTT tax into a one-time cost.
- **Serve the full chain** and test with a strict client (\`openssl s_client\`, \`curl\`), not just a browser.
- **Watch clock skew.** Cert validity is time-based; a server with a wrong clock rejects valid certs or accepts expired ones. Run NTP.
- **OCSP / revocation:** know how your clients check revocation (OCSP stapling lets the server attach a fresh signed "still valid" proof, avoiding a separate lookup that can stall the handshake).`,

    commonMistakes: [
      "Letting certificates expire -- the top cause of TLS outages, and entirely preventable with expiry alerts and ACME automation.",
      "Serving only the leaf cert and not the intermediate chain, so browsers work but strict clients fail with 'unknown authority'.",
      "Confusing encryption with authentication -- an encrypted connection to an impostor is still owned; the certificate check is what proves identity.",
      "Putting non-idempotent requests (POST that charges money) in TLS 1.3 0-RTT data, which is replayable.",
      "Assuming the handshake is free and opening a fresh TLS connection per request instead of pooling/keep-alive.",
      "Ignoring clock skew -- a wrong server clock breaks cert validity checks in both directions.",
      "SNI mismatch: connecting by IP or wrong hostname so the server returns the wrong cert and validation fails.",
    ],

    tradeoffs: `| Decision | Benefit | Cost |
|---|---|---|
| TLS 1.3 over 1.2 | 1 RTT vs 2 RTT, forward-secret only, simpler | Some legacy middleboxes/clients cannot negotiate it |
| 0-RTT resumption | Zero handshake latency on resume | Early data is replayable; unsafe for non-idempotent requests |
| Terminate TLS at LB | App servers skip cert/CPU burden | Internal hop is plaintext unless you re-encrypt |
| mTLS everywhere | Cryptographic service identity, zero-trust | Cert issuance/rotation for every workload; operational weight |
| OCSP stapling | Fresh revocation proof, no client-side lookup stall | Server must fetch and refresh the OCSP response |

When handshake latency dominates (many short connections across a WAN), the lever is **connection reuse and resumption**, not weaker crypto.`,

    whenToUse: [
      "Any traffic crossing a network you do not fully control -- which in practice is all public traffic and increasingly internal traffic too.",
      "Service-to-service auth where you want cryptographic identity instead of trusting IP/network position (mTLS).",
      "Anywhere you need confidentiality, integrity, and server authentication together -- HTTPS, gRPC, DB and broker connections.",
    ],
    whenNotToUse: [
      "Never skip TLS to 'save latency' on the public internet -- reuse connections and use TLS 1.3 instead.",
      "0-RTT early data for non-idempotent or security-sensitive requests (replay risk).",
      "Rolling your own TLS or custom crypto instead of a vetted library/terminator -- almost always a mistake.",
    ],

    code: [
      {
        label: "Inspect a server's certificate and negotiated handshake",
        language: "bash",
        code: `# Show the cert chain, negotiated protocol/cipher, and ALPN
openssl s_client -connect api.example.com:443 -servername api.example.com -alpn h2,http/1.1 </dev/null

# Just the expiry dates (the #1 outage cause)
echo | openssl s_client -connect api.example.com:443 -servername api.example.com 2>/dev/null \\
  | openssl x509 -noout -dates -subject -issuer

# Verify the full chain resolves to a trusted root (strict client behavior)
openssl s_client -connect api.example.com:443 -servername api.example.com -verify_return_error </dev/null

# Force a TLS version to test negotiation / legacy fallback
openssl s_client -connect api.example.com:443 -tls1_3 </dev/null
openssl s_client -connect api.example.com:443 -tls1_2 </dev/null`,
      },
      {
        label: "Measure the TLS handshake cost with curl timing",
        language: "bash",
        code: `# Separate DNS, TCP connect, and TLS handshake time. The gap between
# time_connect (TCP done) and time_appconnect (TLS done) IS the handshake cost.
curl -w '
  dns:        %{time_namelookup}s
  tcp:        %{time_connect}s
  tls:        %{time_appconnect}s
  ttfb:       %{time_starttransfer}s
  total:      %{time_total}s
  alpn/proto: %{http_version}
' -o /dev/null -s https://api.example.com/healthz`,
      },
    ],

    memoryCard: {
      problem: "Two strangers on a hostile network must agree on a shared secret and verify identity without anyone eavesdropping or impersonating.",
      mentalModel: "Agree on a math trick to bootstrap a secret in public, check a passport signed by an authority you already trust, then switch to whispering in code.",
      keyConcepts: ["confidentiality + integrity + authentication", "handshake RTT cost (1.2 = 2 RTT, 1.3 = 1 RTT, 0-RTT resume)", "certificate chain to a trusted root CA", "ECDHE key exchange + forward secrecy", "SNI selects the cert, ALPN selects the protocol", "session resumption / tickets"],
      productionConnection: "HTTP -> TLS -> TCP -> IP. Expired certs are the top outage; automate rotation, serve the full chain, reuse connections, prefer TLS 1.3.",
      oneLiner: "TLS bootstraps a verified shared secret over a hostile wire -- the handshake is the cost, and the expired cert is the outage.",
    },

    quiz: [
      {
        id: "tls-q1",
        prompt: "How does TLS 1.3 reduce handshake latency compared to TLS 1.2?",
        choices: [
          { text: "It skips certificate validation to save a round trip", correct: false },
          { text: "The client sends its key-share in the first message, so the exchange completes in 1 RTT instead of 2", correct: true },
          { text: "It uses UDP instead of TCP", correct: false },
          { text: "It disables encryption for the first request", correct: false },
        ],
        explanation:
          "TLS 1.3 folds the key exchange into ClientHello by having the client guess a key-share up front. That collapses the negotiation from two round trips (1.2) to one, and resumption can reach 0-RTT.",
      },
      {
        id: "tls-q2",
        prompt: "A request works in Chrome but fails in a strict client with 'certificate signed by unknown authority'. What is the most likely cause?",
        choices: [
          { text: "The symmetric cipher is too weak", correct: false },
          { text: "The server sends only the leaf certificate and omits the intermediate, so the chain to a trusted root cannot be built", correct: true },
          { text: "The client does not support TLS 1.3", correct: false },
          { text: "SNI is disabled on the client", correct: false },
        ],
        explanation:
          "Browsers often cache intermediate CAs and paper over a missing one; strict clients build the chain fresh. Serving the full chain (leaf + intermediate) fixes it.",
      },
      {
        id: "tls-q3",
        prompt: "Why should you not place a POST that charges a credit card into TLS 1.3 0-RTT early data?",
        choices: [
          { text: "0-RTT data is unencrypted", correct: false },
          { text: "0-RTT early data is replayable, so an attacker who captures it can resend the non-idempotent request", correct: true },
          { text: "0-RTT only works for GET requests at the protocol level", correct: false },
          { text: "It disables the certificate check", correct: false },
        ],
        explanation:
          "0-RTT data has no anti-replay guarantee at the TLS layer. Replaying an idempotent GET is harmless, but replaying a charge could double-bill. Restrict early data to idempotent, safe requests.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Dissect a real TLS handshake",
      brief:
        "Use openssl and curl to see the certificate chain, negotiated protocol, and the exact time the handshake costs -- then reason about where that latency comes from.",
      steps: `1. Pick a public HTTPS host you use (e.g. \`api.github.com\`).
2. Dump the chain and negotiated cipher:
   \`\`\`
   openssl s_client -connect api.github.com:443 -servername api.github.com -alpn h2,http/1.1 </dev/null
   \`\`\`
   Find: the negotiated **TLS version**, the **cipher suite**, the **ALPN protocol** chosen, and how many certs are in the chain.
3. Check expiry -- the number one outage:
   \`\`\`
   echo | openssl s_client -connect api.github.com:443 -servername api.github.com 2>/dev/null | openssl x509 -noout -dates -subject -issuer
   \`\`\`
4. Measure the handshake cost with curl timing:
   \`\`\`
   curl -w 'dns:%{time_namelookup} tcp:%{time_connect} tls:%{time_appconnect} total:%{time_total}\\n' -o /dev/null -s https://api.github.com
   \`\`\`
   The difference \`time_appconnect - time_connect\` is the **TLS handshake** alone.
5. Run the same curl a second time immediately. Note whether total time drops (connection/session reuse effects).
6. Deliberately break SNI: connect with the wrong \`-servername\` and observe the cert/name-mismatch failure.`,
      successCriteria: [
        "State the negotiated TLS version, cipher suite, and ALPN protocol for a real host.",
        "Report the certificate expiry date and identify how many certs are in the chain.",
        "Isolate the TLS handshake time from DNS and TCP using curl -w.",
        "Explain why an SNI mismatch produces a certificate error.",
      ],
    },
  },

  {
    slug: "http-lifecycle",
    title: "HTTP Request Lifecycle",
    track: "shared",
    phase: "networking",
    module: "net-core",
    difficulty: "advanced",
    estMinutes: 27,
    summary:
      "The full journey of one request from a URL in the address bar to a rendered response -- DNS, TCP, TLS, the HTTP exchange, load balancers, app, database, and back -- and exactly where latency, timeouts, and retries accumulate along the way.",
    prerequisites: ["dns", "tcp", "tls-handshake"],
    relatedConcepts: ["dns", "tcp", "tls-handshake", "load-balancing", "http-fundamentals"],
    tags: ["http", "http2", "http3", "keep-alive", "latency", "timeouts", "retries", "observability", "networking"],

    why: `"The API is slow" is the most common and least actionable report you will get. Slow **where**? A single HTTP request is not one thing -- it is a **pipeline of hops**, each with its own latency, its own timeout, and its own failure mode: name resolution, transport setup, encryption setup, the request itself, a load balancer, the app, a database, and the response all the way back.

**Understanding the full lifecycle is what turns "it's slow" into "the TLS handshake to the payment provider is adding 300ms because we open a fresh connection every call."** You cannot fix latency you cannot attribute, you cannot set sane timeouts without knowing what each hop costs, and you cannot retry safely without knowing which hops are idempotent. Every serious debugging session -- and every latency budget -- starts with this mental map.`,

    intuition: `Think of sending a courier to fetch a document from an office across the city.

1. **Look up the address** (DNS) -- where is the building?
2. **Drive there and get buzzed in** (TCP handshake) -- one round trip before you can even speak.
3. **Show ID at the security desk and get a sealed badge** (TLS handshake) -- another round trip, now the conversation is private.
4. **Hand over your request slip** (the HTTP request) -- method, path, headers, maybe a body.
5. **The receptionist routes you** (load balancer / reverse proxy) to whichever clerk is free.
6. **The clerk does the work** (your app), which may itself **phone the records room** (the database) -- more round trips.
7. **The document comes back** the whole way, hop by hop.

Every leg costs time. If you keep the courier's badge and the door propped open (**keep-alive / connection reuse**), the next errand skips steps 2 and 3 entirely. That single idea -- **reuse the expensive setup** -- is the biggest latency lever in the whole chain.`,

    howItWorks: `Here is the end-to-end path of \`GET https://api.example.com/orders/42\`, and what each hop costs.

### 1. DNS resolution
Resolve \`api.example.com\` -> IP. A cache hit is ~0ms; a cold lookup can be tens of ms and occasionally seconds. (See the DNS lesson -- TTLs and stale caches cause "half the fleet talks to the dead IP" bugs.)

### 2. TCP handshake -- 1 RTT
SYN / SYN-ACK / ACK before a single byte of your request moves. (See the TCP lesson.)

### 3. TLS handshake -- 1-2 RTT
TLS 1.3 adds ~1 RTT, TLS 1.2 ~2 RTT, on top of TCP. ALPN here decides whether you speak HTTP/1.1 or HTTP/2. (See the TLS lesson.)

**Steps 1-3 are pure setup.** On a 50ms RTT path a cold HTTPS connection can burn 150ms+ before the request even leaves -- which is why **connection reuse** dominates everything below.

### 4. HTTP request
\`\`\`
GET /orders/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer ...
Accept: application/json
\`\`\`
Request line + headers (+ optional body) go out. On a warm connection this is the first thing that happens.

### 5. Load balancer / reverse proxy
The request hits an L7 LB (ALB, nginx, Envoy). It terminates TLS, picks a healthy backend, may add headers (\`X-Forwarded-For\`, trace context), and forwards. It has **its own connection pool** to the backends and **its own timeouts**.

### 6. Application
Your handler runs: auth, validation, business logic. It may call **other services** and the **database** -- each of those is another DNS/TCP/(TLS)/request cycle unless pooled.

### 7. Database round trip
A query is at minimum 1 RTT to the DB plus execution time. N+1 query patterns turn one HTTP request into dozens of serial DB round trips -- a classic latency sink.

### 8. Response travels back
Status line + headers + body flow back through LB to client. \`time_starttransfer\` (TTFB) marks the first response byte; the body then streams.

### HTTP versions change the shape
- **HTTP/1.1:** one request at a time per connection. Keep-alive reuses the connection, but requests are **serialized** (head-of-line blocking at the HTTP layer). Browsers open ~6 connections per host to parallelize.
- **HTTP/2:** **multiplexes** many streams over **one** TCP connection with header compression. Removes HTTP-layer HoL blocking -- but a lost TCP segment still stalls all streams (TCP-layer HoL blocking remains).
- **HTTP/3:** runs over **QUIC (UDP)**, giving independent streams so one lost packet no longer blocks the others, plus a faster combined transport+TLS handshake.`,

    internals: `**Keep-alive and connection reuse.** After a response, HTTP/1.1 keeps the TCP+TLS connection open (\`Connection: keep-alive\`) so the next request skips steps 2-3. This is the single biggest win in the lifecycle: a warm request pays only steps 4-8. **Client connection pools** (HTTP clients, DB pools, gRPC channels) exist to hold these warm connections. Cold pools after a deploy cause a latency spike as every connection re-handshakes at once.

**Where latency accumulates.** \`curl -w\` gives you the exact breakdown:
- \`time_namelookup\` -- DNS
- \`time_connect\` -- through TCP handshake
- \`time_appconnect\` -- through TLS handshake
- \`time_starttransfer\` -- TTFB (server had the first byte ready)
- \`time_total\` -- last byte received

The **gaps between these** attribute latency: appconnect - connect = TLS; starttransfer - appconnect = server+network processing. This is how you turn "slow" into a hop.

**Timeouts exist at every hop and must nest correctly.** Client timeout > LB timeout > app timeout > DB timeout is the safe ordering. If the LB times out at 30s but the app runs 60s, the LB returns 504 while the app keeps burning resources on a request nobody is waiting for. **Separate connect timeouts from read timeouts** -- a connect timeout catches a dead host fast; a read timeout catches a hung backend. A single blanket timeout hides which failed.

**Retries and idempotency.** A timeout is ambiguous: the request may have succeeded and only the response was lost. Retrying a **GET/PUT/DELETE** (idempotent) is safe; retrying a **POST that charges a card** can double-charge. Use **idempotency keys** for unsafe operations, cap retries, and add **exponential backoff + jitter** so a blip does not become a retry storm that takes the backend down. Every retry also multiplies load -- 3 retries across 3 layers is 27x amplification in the worst case.

**Observability / trace context.** A single request touches many services. **W3C \`traceparent\` / \`tracecontext\`** headers propagate a trace ID end to end so a distributed tracer (OpenTelemetry) can reassemble the full waterfall and show you which hop ate the time. Without propagated context you are back to guessing.

**TCP-layer HoL blocking still bites HTTP/2** -- multiplexing removes the HTTP-layer serialization but all streams share one TCP connection, so a single lost segment stalls every stream. This is precisely why HTTP/3 moved to QUIC over UDP (see the TCP lesson).`,

    diagram: {
      title: "One HTTPS request, hop by hop",
      layers: [
        { id: "dns", label: "DNS resolve", sub: "name -> IP; cache hit ~0ms, cold lookup tens of ms" },
        { id: "setup", label: "TCP + TLS handshake", sub: "1 RTT + 1-2 RTT of pure setup; skipped on a warm connection" },
        { id: "lb", label: "Request -> LB / proxy", sub: "terminates TLS, picks healthy backend, adds trace headers, own timeout" },
        { id: "app", label: "App + downstream", sub: "handler logic; each DB / service call is another round trip" },
        { id: "resp", label: "Response back to client", sub: "TTFB (time_starttransfer) then body streams the whole way back" },
      ],
      caption: "Setup (DNS+TCP+TLS) can dwarf the request itself. Reuse connections and attribute latency per hop before optimizing.",
    },

    realWorld: `A checkout endpoint that used to take 120ms starts taking 900ms after moving the service to a new region. CPU is flat, the database is idle. \`curl -w\` shows \`time_appconnect\` is huge: the app now opens a fresh TLS connection to the payment provider on every call, and the provider is 200ms away, so each request pays TCP (1 RTT) + TLS (2 RTT) = ~600ms of setup before the actual API call. The fix is not a bigger instance -- it is an HTTP client with **keep-alive and a connection pool** so the handshake is paid once and reused. Same request, same code, 6x faster.

A second flavor: after a deploy, error rates spike for 30 seconds then recover. The connection pool was cold, so every request re-handshaked simultaneously and some tripped the read timeout. Pre-warming the pool (or a slower rollout) removes the spike. Both stories are the same lesson: **the expensive part of an HTTP request is the setup, and the whole game is reusing it.**`,

    production: `- **Reuse connections everywhere.** HTTP keep-alive, HTTP client pools, DB connection pools, gRPC channels. This is the highest-leverage latency fix in the entire stack. Configure max-idle and idle-timeout so pooled connections stay warm but do not go stale behind an LB.
- **Set explicit, layered timeouts** -- separate connect vs read timeouts, and make client > LB > app > DB so an outer layer never gives up while an inner one is still working (that leaks resources and returns confusing 504s).
- **Make retries safe:** only retry idempotent operations or use idempotency keys; cap attempts; use exponential backoff **with jitter**; consider a circuit breaker so a failing dependency does not get retry-stormed.
- **Propagate trace context** (\`traceparent\`) through every hop and adopt distributed tracing (OpenTelemetry) so a slow request shows you the exact hop, not just a total.
- **Prefer HTTP/2 for many small concurrent calls** (multiplexing) and evaluate **HTTP/3** where TCP head-of-line blocking on lossy networks hurts (mobile).
- **Instrument TTFB separately from total** -- rising TTFB points at the server/DB; rising total-minus-TTFB points at a large body or slow network.
- **Watch for N+1** -- one HTTP request fanning into many serial DB round trips is a top latency cause that never shows up as high CPU.`,

    commonMistakes: [
      "Opening a new connection per request instead of pooling -- paying DNS+TCP+TLS setup every single time.",
      "One blanket timeout instead of separate connect and read timeouts, so you cannot tell a dead host from a hung backend.",
      "Timeouts that do not nest (LB < app), so the LB returns 504 while the app keeps burning resources on an abandoned request.",
      "Retrying non-idempotent requests (POST/charge) after a timeout and double-processing, because a timeout does not mean the request failed.",
      "Retrying without backoff and jitter, turning a transient blip into a retry storm that takes the backend down.",
      "Reporting 'it's slow' without a per-hop breakdown (curl -w / tracing), so effort goes to the wrong layer.",
      "Assuming HTTP/2 removes all head-of-line blocking -- it removes it at the HTTP layer but TCP-layer HoL blocking remains.",
      "Ignoring N+1 database round trips inside a single HTTP handler.",
    ],

    tradeoffs: `| Decision | Benefit | Cost |
|---|---|---|
| Connection reuse / keep-alive | Skips DNS+TCP+TLS setup on warm requests | Stale pooled connections can hang behind an LB; needs idle tuning |
| HTTP/1.1 | Universally supported, simple | One request at a time per connection; HoL blocking; many sockets |
| HTTP/2 | Multiplexed streams, header compression, one connection | TCP-layer HoL blocking remains; one lost segment stalls all streams |
| HTTP/3 (QUIC/UDP) | Independent streams, faster handshake, no TCP HoL blocking | UDP sometimes blocked by middleboxes; newer, less ubiquitous |
| Aggressive retries | Rides out transient failures | Load amplification and retry storms without backoff/jitter/caps |

The recurring theme: **latency lives in setup and in serial round trips**, so reuse connections and parallelize/batch downstream calls before reaching for bigger hardware.`,

    whenToUse: [
      "Any time you debug latency -- map the request to hops and attribute the time per hop before optimizing.",
      "When setting timeouts and retry policy -- you need the per-hop cost and idempotency of each call.",
      "When choosing an HTTP version -- many concurrent small calls favor HTTP/2, lossy mobile networks favor HTTP/3.",
    ],
    whenNotToUse: [
      "Do not micro-optimize the request body or code path before confirming with curl -w / tracing that the app hop is actually where the time goes.",
      "Do not add retries to non-idempotent operations without idempotency keys.",
      "Do not reach for HTTP/3 where UDP is blocked or where TCP HoL blocking is not actually your bottleneck.",
    ],

    code: [
      {
        label: "Full per-hop timing breakdown with curl -w",
        language: "bash",
        code: `# Reusable timing template. Each field isolates one hop of the lifecycle.
# Save as ~/.curl-format.txt and use: curl -w '@~/.curl-format.txt' ...
cat > /tmp/curl-format.txt <<'EOF'
    dns_lookup:   %{time_namelookup}s
    tcp_connect:  %{time_connect}s
    tls_setup:    %{time_appconnect}s
    ttfb:         %{time_starttransfer}s
    total:        %{time_total}s
    http_version: %{http_version}
    http_code:    %{http_code}
    size:         %{size_download} bytes
EOF

curl -w '@/tmp/curl-format.txt' -o /dev/null -s https://api.example.com/orders/42

# Interpretation:
#   dns_lookup            = DNS hop
#   tcp_connect - dns     = TCP handshake
#   tls_setup - tcp       = TLS handshake
#   ttfb - tls_setup      = server + downstream processing (app + DB)
#   total - ttfb          = time to stream the response body`,
      },
      {
        label: "Prove connection reuse and propagate trace context",
        language: "bash",
        code: `# Second request on the SAME connection skips TCP+TLS setup -> lower total.
# --http2 negotiates HTTP/2 via ALPN during the TLS handshake.
curl --http2 -w 'total: %{time_total}s  proto: %{http_version}\\n' \\
     -o /dev/null -s https://api.example.com/health \\
     https://api.example.com/health

# Send a W3C trace context header so a distributed tracer can stitch the hops:
curl -H 'traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' \\
     -s https://api.example.com/orders/42 -o /dev/null

# See HTTP/3 negotiation (client + server must support QUIC):
curl --http3 -w 'proto: %{http_version}\\n' -o /dev/null -s https://api.example.com/`,
      },
    ],

    memoryCard: {
      problem: "One HTTP request is a pipeline of hops (DNS, TCP, TLS, request, LB, app, DB, response), and 'it's slow' is meaningless until you know which hop.",
      mentalModel: "A courier errand: look up the address, get buzzed in (TCP), badge at security (TLS), hand over the slip, get routed, the clerk phones the records room (DB), the document comes back -- keep the badge and door open to skip the setup next time.",
      keyConcepts: ["DNS -> TCP -> TLS -> request -> LB -> app -> DB -> response", "setup (handshakes) dwarfs the request; reuse connections", "curl -w attributes latency per hop", "layered nested timeouts (client > LB > app > DB)", "retries need idempotency + backoff + jitter", "HTTP/1.1 vs HTTP/2 vs HTTP/3 and where HoL blocking lives", "propagate trace context end to end"],
      productionConnection: "Reuse connections (pools/keep-alive), set separate connect/read timeouts that nest, retry only idempotent calls with backoff, and propagate traceparent so a slow request points at the exact hop.",
      oneLiner: "An HTTP request is a chain of hops whose cost is dominated by setup -- reuse connections, attribute latency per hop, and retry only what is idempotent.",
    },

    quiz: [
      {
        id: "http-life-q1",
        prompt: "A curl -w breakdown shows time_appconnect is far larger than time_connect on every request. What is the most likely fix?",
        choices: [
          { text: "Add more CPU to the application server", correct: false },
          { text: "Reuse connections (keep-alive / a connection pool) so the TLS handshake is paid once, not per request", correct: true },
          { text: "Increase the database timeout", correct: false },
          { text: "Switch the response body to a smaller format", correct: false },
        ],
        explanation:
          "The gap between time_connect and time_appconnect is the TLS handshake. Paying it on every request means connections are not being reused; pooling/keep-alive amortizes the handshake to a one-time cost.",
      },
      {
        id: "http-life-q2",
        prompt: "Why should client timeouts be larger than the load balancer timeout, which is larger than the app timeout?",
        choices: [
          { text: "So retries happen faster", correct: false },
          { text: "So an outer layer never gives up while an inner layer is still working, which would return a 504 and leak resources on an abandoned request", correct: true },
          { text: "Because TLS requires it", correct: false },
          { text: "To reduce DNS lookups", correct: false },
        ],
        explanation:
          "Timeouts must nest. If the LB times out before the app, the client gets a 504 while the app keeps burning resources doing work nobody is waiting for. The outer bound should always exceed the inner one.",
      },
      {
        id: "http-life-q3",
        prompt: "A request times out. Which is the safe assumption before retrying?",
        choices: [
          { text: "The request definitely failed, so retrying is always safe", correct: false },
          { text: "The request may have succeeded with only the response lost, so retrying a non-idempotent operation can double-process", correct: true },
          { text: "The connection is closed, so a retry cannot reach the server", correct: false },
          { text: "Timeouts only happen on GET requests", correct: false },
        ],
        explanation:
          "A timeout is ambiguous -- the server may have completed the work and only the response was lost. Retrying idempotent methods (GET/PUT/DELETE) is safe; unsafe operations (a POST that charges money) need idempotency keys to avoid double-processing.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Attribute latency across the request lifecycle",
      brief:
        "Use curl -w to break one HTTPS request into its hops, prove connection reuse, and reason about where a timeout should live.",
      steps: `1. Create the timing template:
   \`\`\`
   cat > /tmp/curl-format.txt <<'EOF'
       dns:   %{time_namelookup}s
       tcp:   %{time_connect}s
       tls:   %{time_appconnect}s
       ttfb:  %{time_starttransfer}s
       total: %{time_total}s
       proto: %{http_version}
   EOF
   \`\`\`
2. Run one cold request against a real HTTPS host and record each field:
   \`\`\`
   curl -w '@/tmp/curl-format.txt' -o /dev/null -s https://api.github.com
   \`\`\`
   Compute the hop costs: TCP = tcp - dns, TLS = tls - tcp, server = ttfb - tls, body = total - ttfb.
3. Run two requests on one command (reuse) and compare the second total to the first:
   \`\`\`
   curl -w 'total:%{time_total} proto:%{http_version}\\n' -o /dev/null -s https://api.github.com https://api.github.com
   \`\`\`
   The second should skip TCP+TLS setup -- explain why the total drops.
4. Try \`--http2\` and (if supported) \`--http3\` and note the negotiated \`http_version\`.
5. Given your measured hop costs, decide: if the app hop (ttfb - tls) is 40ms and the DB is one 10ms round trip, where would you set the read timeout, and why must it be smaller than the LB timeout?`,
      successCriteria: [
        "Produce a per-hop latency breakdown (DNS, TCP, TLS, server, body) for a real request.",
        "Demonstrate that a reused connection skips the TCP and TLS setup and explain why.",
        "Identify the negotiated HTTP version and what determined it (ALPN).",
        "Propose nested timeout values (app < LB < client) justified by the measured hop costs.",
      ],
    },
  },
];
