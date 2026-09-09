import type { Lesson } from "../types";

export const backendLessons: Lesson[] = [
  {
    slug: "http-fundamentals",
    title: "HTTP Fundamentals",
    track: "shared",
    phase: "backend",
    module: "http-layer",
    difficulty: "core",
    estMinutes: 18,
    summary:
      "The request/response contract every backend speaks: methods, status codes, headers, statelessness, and why HTTP semantics are the interface you actually design.",
    prerequisites: ["tcp"],
    relatedConcepts: ["rest-design", "status-codes", "idempotency", "http-lifecycle"],
    tags: ["http", "rest", "methods", "headers", "stateless"],

    why: `Every API you build or operate speaks HTTP. Getting its **semantics** right -- methods, status codes, idempotency, caching headers -- is what makes an API predictable to clients, safe to retry, and cacheable by infrastructure you don't even control. HTTP is not "just transport"; it is the **contract**.`,

    intuition: `HTTP is a **stateless request/response conversation**: the client asks a complete question, the server gives a complete answer, and then they forget each other. Any "memory" (who you are, what's in your cart) must be carried explicitly in each request -- via tokens, cookies, or IDs. That statelessness is exactly what lets you run 50 identical backends behind a load balancer.`,

    howItWorks: `**Anatomy of a request:**
\`\`\`
POST /orders HTTP/1.1        <- method + path + version
Host: api.example.com        <- headers (routing, auth, content type)
Authorization: Bearer ...
Content-Type: application/json

{"item":"abc","qty":2}       <- body
\`\`\`
**Methods carry meaning:**
- \`GET\` -- read, **safe** (no side effects), cacheable.
- \`POST\` -- create / non-idempotent action.
- \`PUT\` -- replace, **idempotent**.
- \`PATCH\` -- partial update.
- \`DELETE\` -- remove, idempotent.

**Status codes are the API's vocabulary:** 2xx success, 3xx redirect, 4xx *you* messed up (client), 5xx *we* messed up (server). Getting these right lets clients, load balancers, and caches behave correctly automatically.

**Headers do the real work:** \`Content-Type\`, \`Authorization\`, \`Cache-Control\`, \`ETag\`, \`Idempotency-Key\`, \`Retry-After\`.`,

    internals: `- **Statelessness** is why horizontal scaling works: any backend can serve any request because all context is in the request.
- **Idempotency** (PUT/DELETE/GET produce the same result if repeated) is what makes retries safe -- crucial because networks *will* make you retry.
- **Conditional requests** (\`If-None-Match\` + \`ETag\`) let servers answer "nothing changed" with a cheap \`304\`, saving bandwidth.
- **Keep-alive** reuses the TCP connection across requests, amortising the handshake (see the TCP lesson).`,

    diagram: {
      title: "HTTP request lifecycle",
      layers: [
        { id: "req", label: "Request", sub: "method + path + headers + body" },
        { id: "route", label: "Routing", sub: "match path -> handler" },
        { id: "mw", label: "Middleware", sub: "auth, validation, logging" },
        { id: "handler", label: "Handler", sub: "business logic -> data layer" },
        { id: "resp", label: "Response", sub: "status code + headers + body" },
      ],
    },

    realWorld: `A mobile client times out and retries a \`POST /payments\`. Because POST isn't idempotent, the user is charged twice. The fix is an **\`Idempotency-Key\` header**: the server records the key, and a retry with the same key returns the original result instead of charging again. This is pure HTTP semantics -- no new infrastructure.`,

    production: `- **Return correct status codes** -- LBs retry 502/503, caches respect 200 vs 404, clients branch on 4xx vs 5xx.
- **Make writes idempotent** where clients might retry (idempotency keys for payments/orders).
- **Use \`Cache-Control\`/\`ETag\`** so CDNs and browsers offload your origin.
- **Never put secrets in URLs** (they land in logs and referrers); use headers.
- **Set \`Retry-After\` on 429/503** so clients back off instead of hammering you.`,

    commonMistakes: [
      "Returning 200 with an error body -- breaks client and infrastructure error handling.",
      "Using GET for actions with side effects (prefetchers and crawlers will trigger them).",
      "Non-idempotent writes with no idempotency key -> double charges on retry.",
      "Putting tokens/secrets in query strings where they get logged.",
      "Ignoring caching headers and overloading the origin for static-ish data.",
    ],

    tradeoffs: `| Decision | Benefit | Cost |
|---|---|---|
| Stateless | Trivial horizontal scaling | State must live in DB/cache/token |
| Rich status codes | Infra behaves correctly automatically | Discipline to map errors precisely |
| Caching headers | Massive origin offload | Cache invalidation complexity |`,

    whenToUse: ["Any client/server API over the web.", "When you want infra (LBs, CDNs, caches) to help you for free via correct semantics."],
    whenNotToUse: ["Ultra-low-latency streaming between services (consider gRPC/HTTP2 or a message bus).", "Long-lived bidirectional realtime (use WebSockets)."],

    memoryCard: {
      problem: "A universal, stateless request/response contract for client-server communication.",
      mentalModel: "A conversation where each question and answer is complete and self-contained; nobody remembers the last exchange.",
      keyConcepts: ["methods & their semantics", "status codes 2/3/4/5xx", "statelessness", "idempotency", "caching headers (ETag/Cache-Control)"],
      productionConnection: "Correct status codes + idempotency keys make your API safe to retry and cache; statelessness enables horizontal scale.",
      oneLiner: "HTTP semantics are the API contract -- get methods, status codes, and idempotency right and the whole stack cooperates.",
    },

    quiz: [
      {
        id: "http-q1",
        prompt: "Why does statelessness matter for scaling?",
        choices: [
          { text: "It makes requests smaller", correct: false },
          { text: "Any backend can serve any request because all context travels in the request", correct: true },
          { text: "It removes the need for a database", correct: false },
          { text: "It disables caching", correct: false },
        ],
        explanation: "With no per-connection server memory, you can put N identical backends behind a load balancer and route any request to any of them.",
      },
      {
        id: "http-q2",
        prompt: "A client retries a POST and the user is charged twice. Best fix?",
        choices: [
          { text: "Switch to GET", correct: false },
          { text: "Add an Idempotency-Key header so retries return the original result", correct: true },
          { text: "Return 200 with an error body", correct: false },
          { text: "Increase the timeout", correct: false },
        ],
        explanation: "POST isn't idempotent. An idempotency key lets the server detect the retry and return the first result instead of repeating the side effect.",
      },
    ],
  },

  {
    slug: "authentication-dual",
    title: "Authentication: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "auth",
    difficulty: "core",
    estMinutes: 30,
    summary:
      "The same auth concept implemented in both ecosystems: password hashing, JWT issue/verify, and a protected route -- in FastAPI (Track A) and NestJS (Track B).",
    prerequisites: ["http-fundamentals"],
    relatedConcepts: ["jwt-vs-sessions", "oauth2-openid", "caching-dual"],
    tags: ["auth", "jwt", "bcrypt", "fastapi", "nestjs", "dual-track"],

    why: `Authentication answers "who are you?" and authorization answers "what may you do?". Getting this wrong is the single highest-severity bug class in backend engineering. The **concept is identical across languages** -- hash passwords, issue a signed token, verify it on each request -- so learning it in both FastAPI and NestJS cements the idea rather than the syntax.`,

    intuition: `A JWT is a **tamper-evident wristband** from a concert. The venue (server) issues it, signs it so it can't be forged, and stamps an expiry. You wear it; on each door (request) the bouncer checks the signature and expiry -- **without calling head office**. That statelessness is the whole appeal, and also the whole danger: you can't easily un-issue a wristband before it expires.`,

    howItWorks: `**The flow is the same in both ecosystems:**
1. **Register:** hash the password with a slow, salted hash (bcrypt/argon2). Never store plaintext.
2. **Login:** verify the password; if valid, **issue a signed JWT** with a subject and expiry.
3. **Authenticated request:** client sends \`Authorization: Bearer <jwt>\`; middleware **verifies the signature + expiry** and attaches the user.
4. **Authorize:** check the user's roles/claims for the specific action.

The differences are only *where the framework hooks in*: FastAPI uses **dependencies**; NestJS uses **guards**.`,

    dualCode: [
      {
        concept: "Hash & verify a password",
        note: "Both use a slow salted hash. Never compare plaintext; never use fast hashes (md5/sha256) for passwords.",
        python: {
          label: "FastAPI (passlib + bcrypt)",
          language: "python",
          code: `from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(raw: str) -> str:
    return pwd.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    return pwd.verify(raw, hashed)`,
        },
        typescript: {
          label: "NestJS (bcrypt)",
          language: "typescript",
          code: `import * as bcrypt from 'bcrypt';

export async function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, 12); // cost factor 12
}

export async function verifyPassword(raw: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(raw, hashed);
}`,
        },
      },
      {
        concept: "Issue a JWT on login",
        python: {
          label: "FastAPI (python-jose)",
          language: "python",
          code: `from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET = "change-me"; ALGO = "HS256"

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)`,
        },
        typescript: {
          label: "NestJS (@nestjs/jwt)",
          language: "typescript",
          code: `// auth.service.ts
constructor(private jwt: JwtService) {}

async login(user: { id: string }) {
  const payload = { sub: user.id };
  return {
    access_token: await this.jwt.signAsync(payload, { expiresIn: '15m' }),
  };
}`,
        },
      },
      {
        concept: "Protect a route",
        note: "FastAPI: a dependency that runs before the handler. NestJS: a guard on the controller/route. Same idea, different hook.",
        python: {
          label: "FastAPI dependency",
          language: "python",
          code: `from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

oauth2 = OAuth2PasswordBearer(tokenUrl="login")

def current_user(token: str = Depends(oauth2)) -> str:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")

@app.get("/me")
def me(user_id: str = Depends(current_user)):
    return {"user_id": user_id}`,
        },
        typescript: {
          label: "NestJS guard",
          language: "typescript",
          code: `@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.split(' ')[1];
    try {
      req.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }
}

@UseGuards(JwtGuard)
@Get('me')
me(@Req() req) { return { userId: req.user.sub }; }`,
        },
      },
    ],

    internals: `- **Why slow hashes?** bcrypt/argon2 are deliberately expensive so an attacker who steals your DB can't brute-force millions of passwords per second. A fast hash (SHA-256) is catastrophic for passwords.
- **JWT = header.payload.signature**, base64url-encoded. The payload is **readable by anyone** -- it's signed, not encrypted. Never put secrets in it.
- **Signature** proves it was issued by someone holding the secret (HS256) or private key (RS256). Verification is local -> stateless.
- **Revocation is the hard part:** a stateless JWT is valid until it expires. Use **short access tokens + refresh tokens**, and a denylist for emergencies.`,

    diagram: {
      title: "JWT auth flow (identical across frameworks)",
      layers: [
        { id: "login", label: "POST /login", sub: "verify password (bcrypt/argon2)" },
        { id: "issue", label: "Issue JWT", sub: "signed, short expiry" },
        { id: "store", label: "Client stores token", sub: "sends Bearer on each request" },
        { id: "verify", label: "Dependency (FastAPI) / Guard (NestJS)", sub: "verify signature + expiry locally" },
        { id: "authz", label: "Authorize", sub: "check roles/claims for the action" },
      ],
    },

    realWorld: `A team stores JWTs in \`localStorage\` and sets a 30-day expiry "for convenience." An XSS bug leaks a token; because it's long-lived and can't be revoked, the attacker has a month of access. The correct posture: **short-lived access tokens (minutes), refresh tokens in httpOnly cookies, and a revocation path.**`,

    production: `- **Short access tokens (5-15m) + refresh tokens.** Never long-lived access tokens.
- **argon2id or bcrypt(cost>=12)** for passwords; never fast hashes.
- **Store refresh tokens in httpOnly, Secure, SameSite cookies**, not JS-readable storage.
- **Validate \`aud\`, \`iss\`, \`exp\`** on every verify -- not just the signature.
- **Rotate signing keys** (support multiple valid keys during rotation via \`kid\`).`,

    commonMistakes: [
      "Using a fast hash (md5/sha256) for passwords instead of bcrypt/argon2.",
      "Putting sensitive data in the JWT payload (it's readable by anyone).",
      "Long-lived access tokens with no revocation strategy.",
      "Storing tokens in localStorage (XSS-exfiltratable).",
      "Verifying the signature but not the expiry/audience/issuer.",
    ],

    tradeoffs: `| Approach | Benefit | Cost |
|---|---|---|
| Stateless JWT | No session store lookup; scales trivially | Hard to revoke before expiry |
| Server sessions | Instant revocation, opaque | Requires a shared session store |
| Short token + refresh | Balance of both | More moving parts |`,

    whenToUse: ["Stateless APIs and mobile clients where a session store lookup per request is undesirable.", "Cross-service auth where each service verifies locally."],
    whenNotToUse: ["When you need instant, reliable revocation (prefer opaque server sessions or add a denylist).", "Storing large or sensitive per-user state (that belongs server-side)."],

    memoryCard: {
      problem: "Prove who a caller is (and what they may do) on every stateless request, safely.",
      mentalModel: "A tamper-evident concert wristband: signed, time-stamped, checked at every door without calling head office.",
      keyConcepts: ["salted slow hashing (bcrypt/argon2)", "signed JWT (not encrypted)", "FastAPI dependency vs NestJS guard", "short token + refresh", "revocation is hard"],
      productionConnection: "Short access tokens + httpOnly refresh cookies + verify exp/aud/iss; same flow whether you write FastAPI or NestJS.",
      oneLiner: "Auth = hash passwords slowly, issue a signed short-lived token, verify it locally on each request; the hook differs (dependency vs guard), the concept does not.",
    },

    quiz: [
      {
        id: "auth-q1",
        prompt: "Why use bcrypt/argon2 instead of SHA-256 for passwords?",
        choices: [
          { text: "They produce shorter hashes", correct: false },
          { text: "They are deliberately slow and salted, making offline brute-force expensive", correct: true },
          { text: "They are reversible so you can recover passwords", correct: false },
          { text: "They don't need a salt", correct: false },
        ],
        explanation: "Password hashes must be slow and salted so a stolen database can't be brute-forced at millions of guesses per second. SHA-256 is far too fast.",
      },
      {
        id: "auth-q2",
        prompt: "What is the correct statement about a JWT payload?",
        choices: [
          { text: "It is encrypted and safe for secrets", correct: false },
          { text: "It is signed but readable by anyone, so never put secrets in it", correct: true },
          { text: "Only the server can read it", correct: false },
          { text: "It cannot contain an expiry", correct: false },
        ],
        explanation: "A standard JWT is signed (tamper-evident) but base64-encoded, not encrypted. Anyone can decode and read the claims.",
      },
      {
        id: "auth-q3",
        prompt: "In FastAPI vs NestJS, where does route protection hook in?",
        choices: [
          { text: "FastAPI: middleware only; NestJS: filters", correct: false },
          { text: "FastAPI: a dependency (Depends); NestJS: a guard (CanActivate)", correct: true },
          { text: "Both use decorators identical in name", correct: false },
          { text: "Neither supports route-level auth", correct: false },
        ],
        explanation: "The concept is identical -- verify the token before the handler runs. FastAPI expresses it as a dependency; NestJS expresses it as a guard.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Harden a JWT setup",
      brief: "Given a config with 30-day localStorage tokens and SHA-256 password hashing, list every change needed to make it production-safe.",
      steps: `1. Replace SHA-256 with argon2id/bcrypt(cost>=12).\n2. Cut access token TTL to ~15m; add refresh tokens.\n3. Move refresh token to httpOnly+Secure+SameSite cookie.\n4. Verify exp/aud/iss on every request.\n5. Add a revocation denylist + key rotation via kid.`,
      successCriteria: ["Slow salted hashing", "Short access token + refresh", "Tokens out of JS-readable storage", "Full claim validation"],
    },
  },

  {
    slug: "caching-dual",
    title: "Caching: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "resilience",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "The cache-aside pattern in both ecosystems, with the two hard problems: invalidation and stampedes -- FastAPI + Redis vs NestJS + Redis.",
    prerequisites: ["http-fundamentals", "redis-deep"],
    relatedConcepts: ["redis-deep", "cache-invalidation", "n-plus-one"],
    tags: ["cache", "redis", "cache-aside", "ttl", "fastapi", "nestjs", "dual-track"],

    why: `Databases are the expensive, contended, hard-to-scale part of most systems. **Caching exists to serve repeated reads from fast memory instead of hammering the database**, cutting latency from tens of milliseconds to sub-millisecond and shielding the DB from read load. But caching introduces the two hardest problems in computer science jokingly attributed to it: **invalidation** and **naming** -- and a third real one, **stampedes**.`,

    intuition: `A cache is a **notepad next to your desk**. Instead of walking to the archive (database) for the same fact repeatedly, you jot it down. Two dangers: the note goes **stale** (the archive changed and your note didn't), and when the note gets erased everyone stampedes the archive at once. Good caching is mostly about managing those two dangers, not about the lookup itself.`,

    howItWorks: `The dominant pattern is **cache-aside (lazy loading):**
1. Read from cache. **Hit** -> return it.
2. **Miss** -> read from DB, write it to cache with a **TTL**, return it.
3. On write/update -> **invalidate** (delete) the cache key so the next read repopulates.

The TTL is your safety net: even if invalidation is missed somewhere, staleness is bounded.`,

    dualCode: [
      {
        concept: "Cache-aside read",
        note: "Identical algorithm; only the client library and async style differ.",
        python: {
          label: "FastAPI + redis.asyncio",
          language: "python",
          code: `import json, redis.asyncio as redis
r = redis.from_url("redis://localhost")

async def get_user(user_id: str):
    key = f"user:{user_id}"
    cached = await r.get(key)
    if cached:
        return json.loads(cached)           # HIT
    user = await db.fetch_user(user_id)     # MISS -> DB
    await r.set(key, json.dumps(user), ex=300)  # TTL 5m
    return user

async def update_user(user_id: str, data):
    await db.update_user(user_id, data)
    await r.delete(f"user:{user_id}")       # invalidate`,
        },
        typescript: {
          label: "NestJS + ioredis",
          language: "typescript",
          code: `@Injectable()
export class UserService {
  constructor(@InjectRedis() private redis: Redis) {}

  async getUser(id: string) {
    const key = \`user:\${id}\`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);        // HIT
    const user = await this.db.fetchUser(id);     // MISS -> DB
    await this.redis.set(key, JSON.stringify(user), 'EX', 300);
    return user;
  }

  async updateUser(id: string, data: any) {
    await this.db.updateUser(id, data);
    await this.redis.del(\`user:\${id}\`);          // invalidate
  }
}`,
        },
      },
      {
        concept: "Stampede protection (single-flight lock)",
        note: "When a hot key expires, thousands of requests miss simultaneously and all hit the DB. A short lock lets one rebuild while others wait/serve stale.",
        python: {
          label: "FastAPI (SET NX lock)",
          language: "python",
          code: `async def get_hot(key):
    val = await r.get(key)
    if val: return json.loads(val)
    # only one worker rebuilds
    lock = await r.set(f"lock:{key}", "1", nx=True, ex=5)
    if lock:
        data = await db.expensive_query()
        await r.set(key, json.dumps(data), ex=300)
        return data
    await asyncio.sleep(0.05)   # brief wait, then re-read
    return await get_hot(key)`,
        },
        typescript: {
          label: "NestJS (SET NX lock)",
          language: "typescript",
          code: `async getHot(key: string) {
  const val = await this.redis.get(key);
  if (val) return JSON.parse(val);
  const lock = await this.redis.set('lock:' + key, '1', 'EX', 5, 'NX');
  if (lock) {
    const data = await this.db.expensiveQuery();
    await this.redis.set(key, JSON.stringify(data), 'EX', 300);
    return data;
  }
  await new Promise(r => setTimeout(r, 50)); // wait then retry
  return this.getHot(key);
}`,
        },
      },
    ],

    internals: `- **Cache-aside** keeps the cache and DB decoupled; the app owns consistency. Alternatives: **write-through** (write to cache+DB together) and **write-behind** (write cache, flush to DB async -- risky).
- **TTL is a correctness tool, not just memory management:** it bounds how stale data can get when invalidation is missed.
- **Stampede / dogpile:** a popular key expiring causes a synchronized flood of misses. Mitigations: single-flight locks, **jittered TTLs**, or **serve-stale-while-revalidate**.
- **Negative caching:** cache "not found" too, or a missing row triggers a DB hit on every request (cache penetration).`,

    diagram: {
      title: "Cache-aside read path",
      layers: [
        { id: "req", label: "Request", sub: "get user 42" },
        { id: "cache", label: "Cache lookup", sub: "hit -> return in <1ms" },
        { id: "miss", label: "Miss -> DB", sub: "fetch, then SET with TTL" },
        { id: "write", label: "On update", sub: "write DB, DELETE key" },
        { id: "ttl", label: "TTL expiry", sub: "bounds staleness; beware stampede" },
      ],
    },

    realWorld: `Your homepage caches a "trending products" query for 60s. At exactly the minute boundary the key expires and 5,000 concurrent requests all miss and all run the expensive query at once -- the DB CPU spikes to 100% and everything times out, every minute, like clockwork. The fix is a **single-flight lock + jittered TTL** so one request rebuilds while the rest serve slightly-stale data.`,

    production: `- **Always set a TTL** -- an unbounded cache is a memory leak and a staleness bomb.
- **Jitter TTLs** (e.g. 300s +/- random) so keys don't expire in lockstep.
- **Protect hot keys** with single-flight locks or stale-while-revalidate.
- **Cache misses too** (negative caching) to prevent penetration.
- **Decide your consistency budget:** how stale is acceptable? That sets your TTL and invalidation strategy.`,

    commonMistakes: [
      "No TTL -> unbounded memory growth and unbounded staleness.",
      "Synchronized TTLs causing periodic stampedes on hot keys.",
      "Forgetting to invalidate on write -> users see stale data indefinitely.",
      "Not caching negative results -> repeated DB hits for missing keys.",
      "Caching per-user data under a shared key (leaking data between users).",
    ],

    tradeoffs: `| Pattern | Benefit | Cost |
|---|---|---|
| Cache-aside | Simple, resilient (cache down != app down) | First read is a miss; app owns invalidation |
| Write-through | Cache always warm & consistent on write | Every write pays cache latency |
| Write-behind | Fast writes | Risk of data loss before flush |
| Long TTL | Fewer misses | More staleness |`,

    whenToUse: ["Read-heavy workloads with tolerable staleness (profiles, catalogs, config).", "Shielding an expensive query or a rate-limited downstream from repeated calls."],
    whenNotToUse: ["Data that must be strongly consistent per read (balances mid-transaction).", "Write-heavy data with low read reuse (caching just adds work)."],

    memoryCard: {
      problem: "Serve repeated reads from fast memory to cut latency and protect the database.",
      mentalModel: "A notepad next to your desk: fast, but can go stale, and everyone stampedes the archive when it's erased.",
      keyConcepts: ["cache-aside (read/miss/populate)", "TTL bounds staleness", "invalidate on write", "stampede + single-flight lock", "jittered TTL", "negative caching"],
      productionConnection: "Same algorithm in FastAPI+redis.asyncio and NestJS+ioredis; the hard parts are invalidation and stampedes, not the lookup.",
      oneLiner: "Cache-aside with a TTL turns hot reads sub-millisecond -- just budget for staleness and defend hot keys against stampedes.",
    },

    quiz: [
      {
        id: "cache-q1",
        prompt: "In cache-aside, when do you populate the cache?",
        choices: [
          { text: "On every write, before touching the DB", correct: false },
          { text: "On a read miss: fetch from DB, then store with a TTL", correct: true },
          { text: "Never; the DB writes to the cache", correct: false },
          { text: "Only at application startup", correct: false },
        ],
        explanation: "Cache-aside is lazy: reads populate on miss. Writes invalidate (delete) the key so the next read repopulates.",
      },
      {
        id: "cache-q2",
        prompt: "A hot key expires and the DB spikes every 60s. What's the fix?",
        choices: [
          { text: "Remove the TTL entirely", correct: false },
          { text: "Single-flight lock + jittered TTL so one request rebuilds while others serve stale", correct: true },
          { text: "Cache each request under a unique key", correct: false },
          { text: "Switch the DB to a bigger instance forever", correct: false },
        ],
        explanation: "That's a cache stampede. Let one request rebuild the key (single-flight) and jitter TTLs so keys don't all expire together.",
      },
    ],

    lab: {
      kind: "terminal",
      title: "Diagnose a cache stampede",
      brief: "DB CPU spikes on a fixed interval. Use metrics + redis TTLs to identify a synchronized expiry and prescribe jitter + single-flight.",
      scenarioId: "cache-stampede",
      successCriteria: ["Correlate DB spike with TTL boundary", "Recommend jitter + single-flight lock"],
    },
  },

  {
    slug: "background-jobs-dual",
    title: "Background Jobs: FastAPI vs NestJS",
    track: "shared",
    phase: "backend",
    module: "resilience",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Moving slow/unreliable work out of the request path with a queue + workers -- Celery (Track A) vs BullMQ (Track B) -- plus retries, idempotency, and dead-letter queues.",
    prerequisites: ["http-fundamentals", "redis-deep"],
    relatedConcepts: ["kafka-fundamentals", "outbox-pattern", "idempotency-retries"],
    tags: ["jobs", "queue", "celery", "bullmq", "workers", "dual-track"],

    why: `Some work is too slow (sending email, generating a report, calling a flaky third party) to do inside an HTTP request -- it blows your latency budget and couples the user's success to a dependency that might be down. **Background jobs move that work to a queue processed by separate workers**, so the request returns fast and the work happens reliably, with retries.`,

    intuition: `It's a **kitchen ticket rail**. The waiter (API) doesn't cook your meal at the table -- they clip a ticket to the rail (enqueue a job) and immediately go serve someone else. Cooks (workers) pull tickets and cook at their own pace. If a dish burns, they redo it (retry). If a ticket is impossible, it goes in the "problem" pile (dead-letter queue) instead of blocking the rail.`,

    howItWorks: `1. The API **enqueues a job** (a message describing the work) to a broker (Redis/RabbitMQ/Kafka) and returns immediately.
2. **Workers** (separate processes) pull jobs and execute them.
3. **Failures retry** with backoff. After N failures the job goes to a **dead-letter queue** for inspection.
4. Jobs should be **idempotent** because at-least-once delivery means a job can run more than once.`,

    dualCode: [
      {
        concept: "Define & enqueue a job",
        python: {
          label: "FastAPI + Celery",
          language: "python",
          code: `# tasks.py
from celery import Celery
celery = Celery("app", broker="redis://localhost")

@celery.task(bind=True, max_retries=5)
def send_welcome_email(self, user_id: str):
    try:
        email.send(user_id)
    except TransientError as e:
        raise self.retry(exc=e, countdown=2 ** self.request.retries)

# in the FastAPI route
@app.post("/signup")
def signup(u: SignUp):
    user = create_user(u)
    send_welcome_email.delay(user.id)   # enqueue, return now
    return {"id": user.id}`,
        },
        typescript: {
          label: "NestJS + BullMQ",
          language: "typescript",
          code: `// queue registration
BullModule.registerQueue({ name: 'email' });

// producer (in a service)
constructor(@InjectQueue('email') private q: Queue) {}
async signup(dto: SignUpDto) {
  const user = await this.users.create(dto);
  await this.q.add('welcome', { userId: user.id }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  });
  return { id: user.id };
}

// consumer
@Processor('email')
export class EmailProcessor {
  @Process('welcome')
  async handle(job: Job<{ userId: string }>) {
    await this.email.send(job.data.userId); // throw -> retry
  }
}`,
        },
      },
    ],

    internals: `- **Delivery semantics:** most brokers give **at-least-once** delivery -- a worker can crash after doing the work but before ACKing, so the job reruns. Design jobs to be **idempotent** (use a job/business key).
- **Backoff:** retry immediately and you hammer a struggling dependency; use **exponential backoff + jitter**.
- **Dead-letter queue (DLQ):** poison messages that always fail must be quarantined, or they block/loop forever.
- **Visibility timeout / heartbeats:** long jobs must signal they're alive or the broker re-delivers them, causing duplicates.
- **Backpressure:** if producers outpace workers, the queue grows unbounded -- you need to monitor **queue depth** and scale workers.`,

    diagram: {
      title: "Queue + workers",
      layers: [
        { id: "api", label: "API", sub: "enqueue job, return 202 immediately" },
        { id: "broker", label: "Broker (Redis/Rabbit/Kafka)", sub: "durable buffer, at-least-once" },
        { id: "worker", label: "Worker pool", sub: "pull + execute + ACK" },
        { id: "retry", label: "Retry w/ backoff", sub: "transient failures" },
        { id: "dlq", label: "Dead-letter queue", sub: "poison jobs quarantined" },
      ],
    },

    realWorld: `A signup flow sends the welcome email inline. The email provider has a 30s outage; every signup request hangs for 30s and then fails -- users can't sign up because *email* is down. After moving email to a queue, signups return in 50ms and the emails simply retry and drain once the provider recovers. **The queue decoupled the user's success from a flaky dependency.**`,

    production: `- **Make jobs idempotent** (dedupe by a business key) -- assume at-least-once.
- **Exponential backoff + jitter** on retries; cap attempts, then DLQ.
- **Monitor queue depth and job age**, not just worker CPU -- growing depth = under-provisioned workers.
- **Set visibility timeouts / heartbeats** longer than the slowest job.
- **Keep payloads small** -- store big blobs in object storage, pass a reference.`,

    commonMistakes: [
      "Doing slow/flaky work inline in the request instead of queuing it.",
      "Non-idempotent jobs that double-charge or double-send on redelivery.",
      "Immediate retries with no backoff that hammer a failing dependency.",
      "No dead-letter queue -> a poison message loops forever.",
      "Not monitoring queue depth -> silent unbounded backlog.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Async queue | Fast responses, resilient to dependency outages | Eventual completion; must handle duplicates |
| Inline | Simple, immediate result | Latency + coupling to dependency uptime |
| At-least-once | Never lose a job | Must design idempotent handlers |`,

    whenToUse: ["Slow work (emails, PDFs, video), calls to flaky/rate-limited third parties, fan-out, scheduled tasks."],
    whenNotToUse: ["Work whose result the user needs synchronously in the same request.", "Trivially fast, reliable operations where a queue is just overhead."],

    memoryCard: {
      problem: "Move slow or unreliable work out of the request path so responses stay fast and work completes reliably.",
      mentalModel: "A kitchen ticket rail: the waiter clips the order and moves on; cooks pull tickets and redo burnt dishes.",
      keyConcepts: ["enqueue + workers", "at-least-once -> idempotency", "exponential backoff + jitter", "dead-letter queue", "monitor queue depth"],
      productionConnection: "Celery (FastAPI) and BullMQ (NestJS) express the same pattern; decoupling from a flaky dependency is the point.",
      oneLiner: "A queue + idempotent workers turns slow, flaky work into fast responses plus reliable, retried background execution.",
    },

    quiz: [
      {
        id: "jobs-q1",
        prompt: "Why must background jobs usually be idempotent?",
        choices: [
          { text: "Because queues are always exactly-once", correct: false },
          { text: "Because at-least-once delivery means a job can run more than once (e.g. crash before ACK)", correct: true },
          { text: "To make them run faster", correct: false },
          { text: "Because workers never crash", correct: false },
        ],
        explanation: "Most brokers guarantee at-least-once. A worker can complete the work then crash before acknowledging, causing redelivery -- so handlers must tolerate running twice.",
      },
      {
        id: "jobs-q2",
        prompt: "What is a dead-letter queue for?",
        choices: [
          { text: "Jobs that succeeded", correct: false },
          { text: "Quarantining jobs that repeatedly fail so they stop blocking/looping", correct: true },
          { text: "Speeding up healthy jobs", correct: false },
          { text: "Storing completed job results", correct: false },
        ],
        explanation: "Poison messages that always fail are moved to a DLQ after N attempts so they can be inspected without blocking the main queue or retrying forever.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a reliable job pipeline",
      brief: "Signup emails must survive a provider outage without losing users. Specify the queue, retry policy, idempotency key, and DLQ.",
      steps: `1. Enqueue email on signup; return 202 immediately.\n2. Idempotency key = userId+template so redelivery doesn't double-send.\n3. attempts=5, exponential backoff + jitter.\n4. After 5 fails -> DLQ + alert.\n5. Alert on queue depth > threshold and job age > SLA.`,
      successCriteria: ["Request path decoupled from email uptime", "Idempotent handler", "Backoff + DLQ", "Depth/age monitoring"],
    },
  },
];
