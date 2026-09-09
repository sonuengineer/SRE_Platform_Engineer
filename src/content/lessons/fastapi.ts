import type { Lesson } from "../types";

export const fastapiLessons: Lesson[] = [
  {
    slug: "fastapi-routing",
    title: "FastAPI Routing",
    track: "python",
    phase: "fastapi",
    module: "fastapi-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "How FastAPI turns typed function signatures into routes, request parsing, validation, and OpenAPI docs -- path/query/body params, path operations, and APIRouter structure.",
    prerequisites: ["http-fundamentals", "rest-design"],
    relatedConcepts: ["fastapi-pydantic", "fastapi-dependency-injection", "rest-design", "status-codes"],
    tags: ["fastapi", "routing", "path-operations", "openapi", "python", "type-hints"],

    why: `Most web frameworks make you write routing, request parsing, validation, and documentation as four separate chores that drift out of sync. FastAPI's core idea is that **your type-annotated function signature is the single source of truth** for all of them. Declaring \`item_id: int\` in the path both parses and validates the value, and simultaneously generates the OpenAPI schema and interactive docs.

This matters in production because the biggest source of API bugs is the gap between what the code accepts, what it validates, and what the docs claim. FastAPI collapses that gap: if it is in the signature, it is parsed, validated, and documented consistently -- for free.`,

    intuition: `Think of a FastAPI route as a **form with typed fields, and FastAPI as the clerk who checks the form before it reaches you**.

You describe the fields you need -- "an integer id from the URL, an optional \`q\` search string, and a JSON body shaped like this model." The clerk (FastAPI) intercepts every incoming request, pulls each value from the right place (path, query string, or body), checks the types, and rejects malformed input with a clear 422 *before your handler ever runs*. By the time your function executes, every argument is already the correct, validated Python type. You never write \`int(request.args["id"])\` or hand-check for missing fields.`,

    howItWorks: `### Path operations
A "path operation" is a function decorated with an HTTP method + path:
\`\`\`python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
\`\`\`
FastAPI infers where each parameter comes from by its **declaration**:
- **Path parameter:** the name appears in the path (\`{item_id}\`) -> taken from the URL and cast to the annotated type.
- **Query parameter:** a scalar with a default that is not in the path (\`q\`) -> taken from the query string; a default makes it optional.
- **Request body:** a parameter typed as a Pydantic model -> parsed from the JSON body.

### Declaring the response and status
\`\`\`python
@app.post("/items", status_code=201, response_model=ItemOut)
def create_item(item: ItemIn):
    return service.create(item)
\`\`\`
\`response_model\` filters and validates the *output* (hiding fields like password hashes), and \`status_code\` sets the success code.

### Structuring with APIRouter
Large apps split routes into routers and mount them with a shared prefix and tags:
\`\`\`python
from fastapi import APIRouter
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}")
def get_user(user_id: int): ...

app.include_router(router)
\`\`\``,

    internals: `- **Routing is order-sensitive.** FastAPI matches routes top-to-bottom, so a fixed path like \`/users/me\` must be declared *before* the dynamic \`/users/{user_id}\`, or "me" gets captured as an id and fails validation.
- **Parameter source resolution is by convention, but you can be explicit** with \`Path()\`, \`Query()\`, and \`Body()\` to add validation (\`gt\`, \`max_length\`), metadata, and to force a scalar into the body.
- **Validation happens before your handler runs.** A bad type yields an automatic 422 with a structured error listing exactly which field failed and why -- you write none of that.
- **The OpenAPI schema is generated from the same signatures**, and the \`/docs\` (Swagger UI) and \`/redoc\` pages render it live. There is no separate spec to maintain.
- **\`response_model\` runs on the way out**, so it both documents and enforces the response shape and can strip fields the model omits -- a common way to avoid leaking internal fields.
- **Under the hood FastAPI is Starlette (ASGI) for the web layer + Pydantic for validation.** Routes are ASGI-native, which is why async handlers are first-class (see the async lesson).`,

    diagram: {
      title: "Request to typed handler pipeline",
      layers: [
        { id: "req", label: "Incoming request", sub: "path + query + JSON body" },
        { id: "match", label: "Route match", sub: "top-to-bottom; static before dynamic" },
        { id: "extract", label: "Extract by declaration", sub: "path/query/body -> function params" },
        { id: "validate", label: "Validate + coerce", sub: "Pydantic; bad input -> auto 422" },
        { id: "handler", label: "Handler runs", sub: "args already correct types; response_model on exit" },
      ],
      caption: "The typed signature drives parsing, validation, and OpenAPI docs from one declaration.",
    },

    realWorld: `A team migrates a Flask API where every handler starts with a block of \`request.args.get(...)\`, manual \`int()\` casts wrapped in try/except, and hand-written 400 responses -- and the Swagger doc is a separate YAML file that is perpetually out of date. Rewriting the same endpoints in FastAPI, those boilerplate blocks vanish: the parameters are declared once in the signature, validation errors become consistent structured 422s automatically, and the interactive docs regenerate from the code so they can never drift. The bug class "docs say one thing, code accepts another" simply disappears because there is only one source of truth.`,

    production: `- **Declare static routes before dynamic ones** (\`/users/me\` before \`/users/{id}\`) to avoid capture bugs.
- **Always use a \`response_model\`** (or a typed return) so you never accidentally leak internal fields like password hashes or soft-deleted rows.
- **Set explicit \`status_code\`** on creates (201) and no-content operations (204) rather than defaulting everything to 200.
- **Group routes with \`APIRouter\`** by domain, with \`prefix\` and \`tags\`, so the codebase and the generated docs stay organized.
- **Add validation constraints in the signature** (\`Query(max_length=50)\`, \`Path(gt=0)\`) instead of hand-checking inside handlers.
- **Keep the generated OpenAPI as your contract** -- generate client SDKs from it rather than writing them by hand.`,

    commonMistakes: [
      "Declaring /users/{id} before /users/me, so 'me' is captured as an id and 422s.",
      "Returning ORM objects directly with no response_model, leaking internal or sensitive fields.",
      "Doing manual request parsing and int() casting inside handlers instead of typed parameters.",
      "Defaulting every endpoint to 200 instead of 201/204 where appropriate.",
      "Putting all routes in one file instead of splitting into APIRouters, making docs and code unmanageable.",
      "Assuming a query param is required when giving it a default (which makes it optional) or vice versa.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Type-driven routing | Parsing + validation + docs from one source | Requires disciplined type annotations |
| response_model on output | Prevents field leaks, documents responses | Small serialization overhead |
| APIRouter split | Organized, scalable codebase | A little more wiring than one file |
| Implicit param sources | Concise signatures | Must know the path/query/body rules |`,

    whenToUse: [
      "Building typed REST/JSON APIs in Python where validation and docs must stay in sync.",
      "Services that benefit from auto-generated OpenAPI and client SDKs.",
      "Any endpoint where input validation and clear error responses matter (most of them).",
    ],
    whenNotToUse: [
      "Serving primarily server-rendered HTML pages (a full templating framework may fit better).",
      "Trivial one-off scripts where a framework is overkill.",
    ],

    memoryCard: {
      problem: "Keep request parsing, validation, and documentation consistent instead of writing them three times and letting them drift.",
      mentalModel: "A clerk checking a typed form before it reaches you: values are extracted, validated, and coerced from your signature before the handler runs.",
      keyConcepts: ["path vs query vs body by declaration", "auto 422 on bad input", "response_model filters output", "static routes before dynamic", "OpenAPI generated from signatures"],
      productionConnection: "One typed signature drives parsing, validation, and live docs -- eliminating the doc-vs-code drift that causes API bugs.",
      oneLiner: "FastAPI turns your type-annotated function signature into the route, the validator, and the OpenAPI docs -- all from one declaration.",
    },

    code: [
      {
        label: "Path, query, and body in one route",
        language: "python",
        code: `from fastapi import FastAPI, Path, Query
from pydantic import BaseModel

app = FastAPI()

class ItemIn(BaseModel):
    name: str
    price: float

class ItemOut(BaseModel):
    id: int
    name: str
    price: float

# static route BEFORE dynamic route
@app.get("/items/featured")
def featured():
    return {"featured": True}

@app.get("/items/{item_id}")
def read_item(
    item_id: int = Path(gt=0),                 # path param, must be > 0
    q: str | None = Query(default=None, max_length=50),  # optional query
):
    return {"item_id": item_id, "q": q}

@app.post("/items", status_code=201, response_model=ItemOut)
def create_item(item: ItemIn):                 # JSON body -> validated model
    return {"id": 1, **item.model_dump()}`,
      },
      {
        label: "Splitting routes with APIRouter",
        language: "python",
        code: `from fastapi import APIRouter, FastAPI

users = APIRouter(prefix="/users", tags=["users"])

@users.get("/me")
def me():
    return {"user": "current"}

@users.get("/{user_id}")
def get_user(user_id: int):
    return {"user_id": user_id}

app = FastAPI()
app.include_router(users)   # routes now live under /users/*`,
      },
    ],

    quiz: [
      {
        id: "fr-q1",
        prompt: "How does FastAPI decide that a parameter comes from the request body rather than the query string?",
        choices: [
          { text: "Any parameter without a default is a body parameter", correct: false },
          { text: "A parameter annotated as a Pydantic model is read from the JSON body", correct: true },
          { text: "You must pass source=body to every parameter", correct: false },
          { text: "Only POST requests can have parameters", correct: false },
        ],
        explanation: "FastAPI infers the source from the declaration: names in the path are path params, scalars are query params, and parameters typed as Pydantic models are parsed from the JSON body.",
      },
      {
        id: "fr-q2",
        prompt: "Why must /users/me be declared before /users/{user_id}?",
        choices: [
          { text: "FastAPI sorts routes alphabetically", correct: false },
          { text: "Routes match top-to-bottom, so the dynamic route would capture 'me' as an id first", correct: true },
          { text: "Static routes are faster only if declared last", correct: false },
          { text: "It is not required; order never matters", correct: false },
        ],
        explanation: "FastAPI matches routes in declaration order. If the dynamic /users/{user_id} comes first, 'me' is captured as user_id and fails int validation, so the static route must precede it.",
      },
      {
        id: "fr-q3",
        prompt: "What does response_model do?",
        choices: [
          { text: "It validates the incoming request body", correct: false },
          { text: "It validates and filters the response, and documents the output shape (e.g. hiding internal fields)", correct: true },
          { text: "It sets the HTTP status code", correct: false },
          { text: "It disables OpenAPI generation", correct: false },
        ],
        explanation: "response_model applies on the way out: it enforces and documents the response schema and strips any fields not in the model, which is the standard way to avoid leaking sensitive or internal data.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Build a typed CRUD router",
      brief: "Implement a /products APIRouter with list, read-one, and create, using typed parameters, a response_model, and correct status codes.",
      steps: `1. Define ProductIn and ProductOut Pydantic models (ProductOut excludes any internal fields).\n2. Create an APIRouter with prefix /products and tag 'products'.\n3. Add GET / with an optional query filter and a limit constrained via Query.\n4. Add GET /{product_id} with a Path constraint (gt=0), placing any static route before it.\n5. Add POST / returning 201 with response_model=ProductOut.\n6. Include the router and confirm the endpoints appear in /docs.`,
      successCriteria: [
        "Parameters are typed and sourced correctly (path/query/body)",
        "response_model hides internal fields",
        "Create returns 201, not 200",
        "Static routes precede dynamic ones",
        "Endpoints render in the generated OpenAPI docs",
      ],
    },
  },

  {
    slug: "fastapi-dependency-injection",
    title: "FastAPI Dependency Injection",
    track: "python",
    phase: "fastapi",
    module: "fastapi-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "FastAPI's Depends() system: declaring reusable, testable dependencies for DB sessions, auth, and config -- with caching, sub-dependencies, yield-based cleanup, and easy overrides in tests.",
    prerequisites: ["fastapi-routing"],
    relatedConcepts: ["fastapi-routing", "authentication-dual", "fastapi-async", "jwt-vs-sessions"],
    tags: ["fastapi", "dependency-injection", "depends", "testing", "python", "yield"],

    why: `Cross-cutting concerns -- opening a database session, authenticating the caller, reading config, enforcing permissions -- are needed by many endpoints. Copy-pasting that setup into every handler is repetitive, error-prone (easy to forget cleanup), and murder to test. **FastAPI's dependency injection lets you declare each concern once as a function and inject it wherever needed**, with automatic execution, caching within a request, and guaranteed cleanup.

The payoff is not just DRY code -- it is **testability**. Because dependencies are declared, not hard-wired, you can swap a real database or auth check for a fake one in tests with a single override, without touching the endpoint code.`,

    intuition: `Dependency injection is a **"just ask for what you need" kitchen**.

A chef (your handler) does not walk to the pantry, unlock it, fetch ingredients, and remember to lock it again. They just write "needs: prepped onions, a hot pan" on the ticket, and the kitchen (FastAPI) supplies exactly those, already prepared, and cleans up the pan afterward. The chef focuses on cooking, not logistics.

In FastAPI you write \`db: Session = Depends(get_db)\` -- "this handler needs a database session" -- and FastAPI runs \`get_db\`, hands you the ready session, and (with a \`yield\`-based dependency) closes it after the response, whether the handler succeeded or raised.`,

    howItWorks: `### A dependency is just a callable
\`\`\`python
from fastapi import Depends

def pagination(skip: int = 0, limit: int = 20) -> dict:
    return {"skip": skip, "limit": limit}

@app.get("/items")
def list_items(page: dict = Depends(pagination)):
    return page
\`\`\`
FastAPI calls \`pagination\`, resolving *its* parameters from the request too (they become query params), then injects the result.

### yield-based dependencies for setup + teardown
\`\`\`python
def get_db():
    db = SessionLocal()
    try:
        yield db            # value injected into the handler
    finally:
        db.close()          # runs after the response, even on error
\`\`\`
Code before \`yield\` is setup; code after runs as teardown -- the DI equivalent of a context manager.

### Sub-dependencies and reuse
Dependencies can depend on other dependencies. \`current_user\` can depend on \`get_db\` and a token dependency; FastAPI resolves the whole graph.

### Caching within a request
By default, if the same dependency is requested multiple times in one request, it runs **once** and the result is reused (\`use_cache=True\`). So \`get_db\` shared by a handler and its sub-dependencies yields one session, not several.

### Router- and app-level dependencies
You can attach dependencies to a whole \`APIRouter\` or the app (e.g. an auth guard on every admin route) via \`dependencies=[Depends(...)]\`.`,

    internals: `- **Resolution is a graph, not a list.** FastAPI builds a dependency tree, resolves leaves first, and injects results upward -- so a dependency that needs a DB session and a token gets both resolved before it runs.
- **Per-request caching by default** means the same dependency called from several places in one request executes once; pass \`use_cache=False\` if you deliberately need a fresh call.
- **yield dependencies are true setup/teardown:** the teardown after \`yield\` runs after the response is sent, and importantly *even if the handler raised*, which is why they are the correct place to close DB sessions and release resources.
- **Dependencies can be sync or async**, and FastAPI runs sync ones in a threadpool so they do not block the event loop (relevant for the async lesson).
- **\`app.dependency_overrides\`** is the killer testing feature: replace \`get_db\` with a fixture returning a test session, or \`current_user\` with a fake admin, in one line -- no monkeypatching endpoint internals.
- **A dependency's own parameters are resolved from the request**, so a dependency can itself declare query/path/header params (this is how \`OAuth2PasswordBearer\` pulls the token from the Authorization header).
- **Router/app-level dependencies** run for every route in scope even when the handler does not use the returned value -- ideal for enforcement (auth, rate checks) via side effects/exceptions.`,

    diagram: {
      title: "Dependency resolution graph for one request",
      layers: [
        { id: "req", label: "Request arrives", sub: "handler declares Depends(...)" },
        { id: "graph", label: "Build dependency graph", sub: "sub-deps resolved leaves-first" },
        { id: "setup", label: "Run setup (pre-yield)", sub: "open DB session, verify token" },
        { id: "handler", label: "Inject + run handler", sub: "cached within request; args ready" },
        { id: "teardown", label: "Teardown (post-yield)", sub: "close session even on error" },
      ],
      caption: "Depends turns setup/auth/config into declared, cached, auto-cleaned, and easily-overridable inputs.",
    },

    realWorld: `A service tests are slow and flaky because every endpoint opens a real database connection and calls the real auth provider, so the test suite needs a live DB and network. By refactoring the DB session and \`current_user\` into \`Depends\` dependencies, the test setup uses \`app.dependency_overrides[get_db] = fake_db\` and \`app.dependency_overrides[current_user] = lambda: User(id=1, role="admin")\`. Suddenly the same endpoint code runs against an in-memory fake with a fake admin user -- tests are fast, deterministic, and need no external services. The endpoints did not change at all; only the injected dependencies did. That override capability is the entire reason to prefer DI over inline setup.`,

    production: `- **Put DB sessions behind a yield dependency** so cleanup is guaranteed even when a handler raises.
- **Model auth as a dependency** (\`current_user = Depends(...)\`) and attach it router-wide for protected areas via \`dependencies=[...]\`.
- **Rely on per-request caching** so a session or the current user is resolved once and shared across sub-dependencies.
- **Use \`app.dependency_overrides\` in tests** to swap real DB/auth/config for fakes without changing endpoint code.
- **Keep dependencies small and single-purpose** (one for pagination, one for the session, one for auth) so they compose.
- **Prefer sync dependencies only when the work is truly blocking** and let FastAPI threadpool them; otherwise make them async to avoid tying up the pool (see the async lesson).`,

    commonMistakes: [
      "Opening and closing DB sessions manually inside handlers instead of a yield dependency, leaking connections on errors.",
      "Not using dependency_overrides in tests, forcing a real DB and network and producing slow, flaky suites.",
      "Assuming a dependency runs multiple times per request when caching means it runs once (or vice versa).",
      "Putting teardown before yield or forgetting the try/finally, so cleanup is skipped when the handler raises.",
      "Cramming many concerns into one giant dependency instead of small composable ones.",
      "Doing blocking I/O in an async dependency (or heavy CPU work), stalling the event loop.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Depends() DI | Reusable, testable, auto-cleanup | Indirection; must learn resolution rules |
| yield dependency | Guaranteed teardown even on error | Slightly more ceremony than a plain return |
| Per-request caching | One session/user shared across sub-deps | Surprising if you expected repeated calls |
| Router-level dependency | Enforce auth once for a whole area | Runs on every route, even ones that do not need the value |`,

    whenToUse: [
      "DB sessions, auth/current-user, config, and permission checks shared across endpoints.",
      "Anything you want to be able to fake or override cleanly in tests.",
      "Enforcing a cross-cutting rule (auth) across a whole router via dependencies=[...].",
    ],
    whenNotToUse: [
      "One-off logic used by a single handler with no cleanup needs (a plain function call is fine).",
      "Pure business logic that has nothing to do with the request lifecycle.",
    ],

    memoryCard: {
      problem: "Reuse cross-cutting setup (DB session, auth, config) across endpoints with guaranteed cleanup and easy testing.",
      mentalModel: "A kitchen where the chef just asks for prepped ingredients: FastAPI supplies them ready and cleans up after.",
      keyConcepts: ["Depends() declares needs", "yield = setup + teardown", "sub-dependency graph", "per-request caching", "dependency_overrides for tests", "router-level dependencies"],
      productionConnection: "yield dependencies close DB sessions safely on error, and dependency_overrides swap real DB/auth for fakes in tests without touching handlers.",
      oneLiner: "FastAPI DI turns setup, auth, and config into declared, cached, auto-cleaned inputs that you can override in one line for tests.",
    },

    code: [
      {
        label: "yield DB session + auth as dependencies",
        language: "python",
        code: `from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

app = FastAPI()
oauth2 = OAuth2PasswordBearer(tokenUrl="login")
SECRET = "change-me"; ALGO = "HS256"

def get_db():
    db = SessionLocal()          # your session factory
    try:
        yield db                 # injected value
    finally:
        db.close()               # runs after response, even on error

def current_user(
    token: str = Depends(oauth2),
    db=Depends(get_db),          # sub-dependency, cached this request
):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    user = db.get_user(payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown user")
    return user

@app.get("/me")
def me(user=Depends(current_user)):
    return {"id": user.id, "role": user.role}`,
      },
      {
        label: "Overriding dependencies in tests",
        language: "python",
        code: `from fastapi.testclient import TestClient

# a fake session and a fake admin user for tests
def fake_db():
    yield FakeDB()

def fake_user():
    return User(id=1, role="admin")

app.dependency_overrides[get_db] = fake_db
app.dependency_overrides[current_user] = fake_user

client = TestClient(app)

def test_me_returns_admin():
    resp = client.get("/me")            # no real DB or auth needed
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"`,
      },
    ],

    quiz: [
      {
        id: "di-q1",
        prompt: "In a yield-based dependency like get_db, when does the code after 'yield' run?",
        choices: [
          { text: "Before the handler starts", correct: false },
          { text: "After the response is produced -- including when the handler raised an exception", correct: true },
          { text: "Only if the handler returns successfully", correct: false },
          { text: "It never runs automatically", correct: false },
        ],
        explanation: "The pre-yield code is setup and the post-yield code is teardown that runs after the response, even if the handler raised -- which is exactly why yield dependencies are the safe place to close DB sessions.",
      },
      {
        id: "di-q2",
        prompt: "A handler and one of its sub-dependencies both Depend on get_db. How many sessions are created for that request by default?",
        choices: [
          { text: "One per Depends call, so two", correct: false },
          { text: "One, because dependencies are cached per request by default", correct: true },
          { text: "Zero until the handler explicitly opens one", correct: false },
          { text: "It depends on the number of query parameters", correct: false },
        ],
        explanation: "FastAPI caches dependency results within a single request (use_cache=True by default), so get_db runs once and both the handler and the sub-dependency share the same session.",
      },
      {
        id: "di-q3",
        prompt: "What makes FastAPI dependencies especially easy to test?",
        choices: [
          { text: "They cannot be tested; you must mock the whole app", correct: false },
          { text: "app.dependency_overrides lets you replace any dependency (DB, auth) with a fake without changing endpoint code", correct: true },
          { text: "Tests automatically skip all dependencies", correct: false },
          { text: "Dependencies run only in production", correct: false },
        ],
        explanation: "Because dependencies are declared rather than hard-wired, dependency_overrides swaps a real dependency for a fake in one line, so endpoints run against in-memory fakes with no external services and no code changes.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Refactor inline setup into dependencies",
      brief: "An endpoint opens a DB session and decodes a JWT inline. Extract both into dependencies and add test overrides.",
      steps: `1. Move session creation into a yield dependency get_db with try/finally cleanup.\n2. Create a current_user dependency that depends on the token and get_db.\n3. Update the handler to inject both via Depends instead of doing setup inline.\n4. Attach current_user router-wide with dependencies=[...] for a protected area.\n5. In tests, override get_db and current_user with fakes via app.dependency_overrides.\n6. Verify the endpoint works with no real DB or auth in tests.`,
      successCriteria: [
        "DB session cleanup is guaranteed via a yield dependency",
        "Auth is a reusable dependency, not inline code",
        "The dependency graph resolves and caches per request",
        "Tests override dependencies with fakes",
        "No external DB or network is needed to test the endpoint",
      ],
    },
  },

  {
    slug: "fastapi-async",
    title: "FastAPI Async & Concurrency",
    track: "python",
    phase: "fastapi",
    module: "fastapi-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "How FastAPI's ASGI event loop achieves high concurrency for I/O-bound work, when to use async def vs def, the fatal mistake of blocking the loop, and how to handle CPU-bound work.",
    prerequisites: ["fastapi-routing", "fastapi-dependency-injection"],
    relatedConcepts: ["fastapi-dependency-injection", "tcp", "background-jobs-dual", "caching-dual"],
    tags: ["fastapi", "async", "asyncio", "event-loop", "concurrency", "python", "asgi"],

    why: `A typical API handler spends most of its wall-clock time *waiting* -- for a database query, an HTTP call to another service, a Redis read. In a traditional thread-per-request model, each waiting request pins a whole OS thread doing nothing, so you need many expensive threads to handle many concurrent waits. **FastAPI runs on an async event loop (ASGI), which lets a single thread juggle thousands of in-flight requests by switching to other work whenever one is waiting on I/O.**

The result is dramatically higher concurrency for I/O-bound workloads on the same hardware. But this power comes with a sharp edge: **one blocking call in an async handler freezes the entire event loop**, stalling every other request. Understanding when to use \`async def\` vs \`def\` -- and never blocking the loop -- is the single most important FastAPI performance skill.`,

    intuition: `Picture a **single waiter serving many tables**.

A synchronous, blocking waiter takes your order, then stands frozen at your table until your food is cooked before serving anyone else. To serve 50 tables you would need 50 waiters (threads).

An async waiter takes your order, sends it to the kitchen, and *immediately* moves to the next table while your food cooks. When any dish is ready, they deliver it. One waiter fluidly serves all 50 tables because the bottleneck is waiting, not working. That is the event loop: it never idles on a wait; it switches to whatever is ready.

But if that one async waiter ever stops to personally chop vegetables for ten minutes (a blocking / CPU-bound call), *every* table waits, because there is only one waiter. That is why blocking the event loop is catastrophic.`,

    howItWorks: `### async def vs def in FastAPI
FastAPI supports both, and treats them differently:
- **\`async def\` handler:** runs *on the event loop*. Inside it you must use \`await\` for I/O with async libraries (\`httpx\`, \`asyncpg\`, \`redis.asyncio\`). While awaiting, the loop serves other requests.
- **\`def\` (sync) handler:** FastAPI runs it in an **external threadpool** so a blocking call inside it does not freeze the loop. This is the safe choice when your only DB/HTTP client is synchronous.

\`\`\`python
@app.get("/async")
async def a():
    async with httpx.AsyncClient() as c:
        r = await c.get("https://api.example.com")   # loop free during wait
    return r.json()

@app.get("/sync")
def b():
    return requests.get("https://api.example.com").json()  # runs in threadpool
\`\`\`

### The fatal mistake
Calling a **blocking** function inside an \`async def\` handler:
\`\`\`python
@app.get("/bad")
async def bad():
    time.sleep(5)          # BLOCKS THE ENTIRE EVENT LOOP for 5s
    return {"ok": True}
\`\`\`
This freezes every concurrent request for 5 seconds. Use \`await asyncio.sleep(5)\` (async) or move the work off the loop.

### Concurrency within a handler
\`asyncio.gather\` fires independent awaits at once:
\`\`\`python
users, orders = await asyncio.gather(fetch_users(), fetch_orders())
\`\`\`

### CPU-bound work
The event loop is for I/O. For CPU-heavy work (image processing, ML inference), offload to a threadpool (\`run_in_executor\` / \`anyio.to_thread\`) or a process pool, or push it to a background worker (Celery).`,

    internals: `- **The event loop is single-threaded per worker.** Concurrency comes from cooperative multitasking: a coroutine yields control at every \`await\`, letting the loop run others. Nothing preempts a coroutine, so a coroutine that never awaits (blocks) monopolizes the loop.
- **Why \`def\` handlers are safe:** FastAPI dispatches sync handlers (and sync dependencies) to a threadpool via AnyIO, so their blocking calls consume a thread, not the loop. But the threadpool is bounded, so a flood of slow sync handlers can exhaust it -- async I/O scales further.
- **You must use async-native drivers to benefit:** \`await asyncpg\`/\`redis.asyncio\`/\`httpx.AsyncClient\`. Putting a *blocking* driver (\`psycopg2\`, \`requests\`) inside an \`async def\` blocks the loop -- worse than a plain sync handler, because sync handlers at least get threadpooled.
- **CPU-bound work blocks the loop regardless of async syntax**, because it never awaits. The GIL also means threads do not give true CPU parallelism; use processes or a worker queue for CPU-heavy tasks.
- **Deployment is ASGI:** run under Uvicorn/Gunicorn with multiple worker processes to use multiple cores; each worker has its own loop. Concurrency within a worker is async; parallelism across cores is multiple workers.
- **Backpressure still matters:** high concurrency means you can accept far more in-flight work than your database can handle -- pair async handlers with connection pooling and limits, or you just move the bottleneck.`,

    diagram: {
      title: "Event loop vs blocking call",
      layers: [
        { id: "loop", label: "Single event loop", sub: "one thread per worker" },
        { id: "await", label: "await on I/O", sub: "coroutine yields; loop serves others" },
        { id: "many", label: "Thousands concurrent", sub: "cheap in-flight waits, not threads" },
        { id: "block", label: "Blocking call in async", sub: "freezes the loop -> all requests stall" },
        { id: "offload", label: "CPU/blocking work", sub: "threadpool / process / worker queue" },
      ],
      caption: "Concurrency is free while you await I/O; it collapses the instant you block the single loop.",
    },

    realWorld: `A team ports a handler to \`async def\` for "performance" but keeps using the synchronous \`requests\` library and \`psycopg2\` inside it. Under load, latency gets *worse* than before: every blocking DB and HTTP call inside the async handler freezes the single event loop, so requests queue behind each other instead of overlapping. Throughput craters. The fix is either (a) revert those handlers to plain \`def\` so FastAPI threadpools the blocking calls, or (b) switch to async drivers (\`httpx\`, \`asyncpg\`) and \`await\` them. The lesson: \`async def\` only helps if everything inside it is actually awaited -- a blocking call in an async handler is the worst of both worlds.`,

    production: `- **Use \`async def\` only with async-native drivers** (httpx, asyncpg, redis.asyncio) and \`await\` all I/O; otherwise use plain \`def\` and let FastAPI threadpool it.
- **Never call blocking functions (time.sleep, requests, blocking DB drivers) inside an async handler** -- it freezes the whole loop.
- **Offload CPU-bound work** (image/ML/crypto) to a threadpool, process pool, or a background worker queue -- never run it inline on the loop.
- **Use \`asyncio.gather\`** to run independent I/O calls concurrently within one request.
- **Run multiple worker processes** (Uvicorn/Gunicorn) to use all CPU cores; async gives concurrency per worker, processes give parallelism across cores.
- **Pair high concurrency with connection pooling and limits** so you do not just relocate the bottleneck onto the database.
- **Watch event-loop lag / p99 latency** as your signal that something is blocking the loop.`,

    commonMistakes: [
      "Using async def but calling blocking libraries (requests, psycopg2, time.sleep) inside, freezing the event loop.",
      "Running CPU-bound work inline in an async handler, monopolizing the single loop.",
      "Believing async def is always faster -- it only helps for awaited I/O with async drivers.",
      "Forgetting that a def handler is threadpooled, so a flood of slow sync handlers exhausts the bounded pool.",
      "Running one worker process and wondering why CPU cores sit idle (async is concurrency, not parallelism).",
      "Scaling concurrency without pooling/limiting DB connections, just moving the bottleneck downstream.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| async def + async drivers | Huge concurrency for I/O on one thread | Requires fully async stack; blocking = disaster |
| def (sync) handler | Safe with blocking libraries (threadpooled) | Bounded threadpool caps concurrency |
| asyncio.gather | Concurrent I/O within a request | Must ensure calls are truly independent |
| Multiple workers | Uses all CPU cores | More memory; shared state must be external |
| Offload CPU work | Keeps the loop responsive | Extra infrastructure (pool/worker queue) |`,

    whenToUse: [
      "I/O-bound handlers using async drivers (DB, HTTP, cache) where you want high concurrency.",
      "Fanning out several independent I/O calls concurrently within one request.",
      "High-throughput APIs where thread-per-request would be too memory-heavy.",
    ],
    whenNotToUse: [
      "Handlers whose only clients are blocking/synchronous -- prefer plain def so FastAPI threadpools them.",
      "CPU-bound work inline -- offload to a process pool or background worker instead.",
    ],

    memoryCard: {
      problem: "Handle many concurrent, mostly-waiting (I/O-bound) requests without one thread per request -- without freezing everything.",
      mentalModel: "One waiter serving many tables: never idle on a wait, but if they stop to chop vegetables (block), every table waits.",
      keyConcepts: ["single event loop per worker", "async def + await for I/O", "def handlers get threadpooled", "blocking call freezes the loop", "gather for concurrent I/O", "offload CPU work"],
      productionConnection: "async def only helps with async drivers; a blocking library inside it stalls all requests -- the classic 'async made it slower' bug.",
      oneLiner: "FastAPI's event loop gives massive I/O concurrency on one thread -- as long as you await everything and never block the loop with sync or CPU-bound calls.",
    },

    code: [
      {
        label: "Correct async I/O with concurrency",
        language: "python",
        code: `import asyncio, httpx
from fastapi import FastAPI

app = FastAPI()

async def fetch(client: httpx.AsyncClient, url: str):
    r = await client.get(url)         # loop is free while awaiting
    return r.json()

@app.get("/dashboard")
async def dashboard():
    async with httpx.AsyncClient() as client:
        # run independent I/O concurrently
        users, orders = await asyncio.gather(
            fetch(client, "https://svc/users"),
            fetch(client, "https://svc/orders"),
        )
    return {"users": users, "orders": orders}`,
      },
      {
        label: "Blocking the loop (wrong) vs offloading (right)",
        language: "python",
        code: `import asyncio, time
from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

app = FastAPI()

# WRONG: freezes the entire event loop for 3 seconds
@app.get("/bad")
async def bad():
    time.sleep(3)                    # blocking call on the loop!
    return {"ok": True}

# RIGHT (I/O wait): non-blocking sleep yields to the loop
@app.get("/good-io")
async def good_io():
    await asyncio.sleep(3)
    return {"ok": True}

# RIGHT (CPU/blocking work): offload to a threadpool
def heavy_cpu(n: int) -> int:
    return sum(i * i for i in range(n))   # blocking work

@app.get("/good-cpu")
async def good_cpu():
    result = await run_in_threadpool(heavy_cpu, 10_000_000)
    return {"result": result}`,
      },
    ],

    quiz: [
      {
        id: "fa-q1",
        prompt: "What happens if you call a blocking function like time.sleep(5) inside an async def handler?",
        choices: [
          { text: "Only that one request waits; others are unaffected", correct: false },
          { text: "The entire event loop is frozen for 5 seconds, stalling all concurrent requests", correct: true },
          { text: "FastAPI automatically moves it to a threadpool", correct: false },
          { text: "It raises an exception immediately", correct: false },
        ],
        explanation: "An async handler runs on the single event loop and only yields control at await. A blocking call never awaits, so it monopolizes the loop and freezes every other in-flight request until it returns.",
      },
      {
        id: "fa-q2",
        prompt: "You must use the synchronous psycopg2 driver. What is the safest way to write the handler?",
        choices: [
          { text: "async def and call psycopg2 directly", correct: false },
          { text: "Plain def handler, so FastAPI runs it in a threadpool and the blocking call does not freeze the loop", correct: true },
          { text: "async def with time.sleep around the query", correct: false },
          { text: "It cannot be done in FastAPI", correct: false },
        ],
        explanation: "FastAPI dispatches sync (def) handlers to a threadpool, so a blocking driver consumes a thread rather than the event loop. Putting a blocking driver inside async def would instead freeze the loop.",
      },
      {
        id: "fa-q3",
        prompt: "How do you correctly handle CPU-bound work in a FastAPI async app?",
        choices: [
          { text: "Run it inline in the async handler; the loop parallelizes it", correct: false },
          { text: "Offload it to a threadpool/process pool or a background worker, so it does not block the loop", correct: true },
          { text: "Wrap it in await to make it non-blocking", correct: false },
          { text: "CPU work is always fine because of the GIL", correct: false },
        ],
        explanation: "CPU-bound code never awaits, so it blocks the single loop regardless of async syntax. Offload it (run_in_threadpool/process pool/worker queue); note the GIL means true CPU parallelism needs processes.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Diagnose and fix a stalled async service",
      brief: "An async FastAPI service has terrible p99 latency under load. Find what is blocking the event loop and fix it.",
      steps: `1. Identify handlers declared async def that call blocking libraries (requests, psycopg2, time.sleep) or do CPU-heavy work.\n2. For each, decide: convert to an async driver + await, or revert to plain def (threadpooled).\n3. Replace any inline CPU-bound work with run_in_threadpool / a process pool / a worker queue.\n4. Use asyncio.gather to run independent I/O calls concurrently where applicable.\n5. Confirm multiple worker processes are configured to use all cores.\n6. Add connection pooling/limits so higher concurrency does not overwhelm the DB.`,
      successCriteria: [
        "No blocking calls remain inside async handlers",
        "CPU-bound work is offloaded off the loop",
        "Independent I/O is run concurrently",
        "Multiple workers use all CPU cores",
        "Downstream (DB) is pooled/limited to absorb the concurrency",
      ],
    },
  },

  {
    slug: "fastapi-pydantic",
    title: "FastAPI + Pydantic Validation",
    track: "python",
    phase: "fastapi",
    module: "fastapi-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Pydantic as FastAPI's validation engine: declaring models, field constraints and validators, parsing/coercion vs strictness, separate input/output models, and settings management.",
    prerequisites: ["fastapi-routing"],
    relatedConcepts: ["fastapi-routing", "fastapi-dependency-injection", "rest-design", "status-codes"],
    tags: ["fastapi", "pydantic", "validation", "models", "python", "serialization"],

    why: `Every byte of input from the outside world is untrusted: wrong types, missing fields, out-of-range values, injection attempts. Validating it by hand in each handler is tedious and inconsistent, and the moment your validation and your documentation disagree you have a bug. **Pydantic is the validation engine that lets you declare the exact shape of your data as a typed Python class, and it parses, coerces, validates, and serializes to and from that shape** -- and FastAPI wires it into every request and response.

This turns "trust nothing, check everything" from scattered defensive code into a single declarative model. The model *is* the contract: it validates input, shapes output, and generates the JSON schema in the docs, all at once.`,

    intuition: `A Pydantic model is a **bouncer with a precise guest list**.

The guest list says exactly who may enter: "name must be a non-empty string, age must be an integer between 0 and 120, email must look like an email." Anyone who does not match is turned away at the door with a specific reason ("age must be <= 120"), and they never get inside your business logic. Everyone who does get in is guaranteed to match the list, so your code downstream can stop second-guessing the data -- it is already the right type and within range.

Better still, the bouncer will politely *coerce* borderline cases where it is safe: the string \`"42"\` from a query string becomes the integer \`42\`, so you deal in real Python types, not raw strings.`,

    howItWorks: `### Declaring a model
\`\`\`python
from pydantic import BaseModel, Field, EmailStr

class UserIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    age: int = Field(ge=0, le=120)
    email: EmailStr
    bio: str | None = None            # optional
\`\`\`
FastAPI uses this as a request body: invalid input yields an automatic **422** with a per-field error list.

### Constraints and custom validators
- **Field constraints:** \`min_length\`, \`max_length\`, \`ge\`/\`le\`/\`gt\`/\`lt\`, \`pattern\`.
- **Custom validators** (Pydantic v2) run logic across one or more fields:
\`\`\`python
from pydantic import field_validator, model_validator

class Signup(BaseModel):
    password: str
    confirm: str

    @field_validator("password")
    @classmethod
    def strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password too short")
        return v

    @model_validator(mode="after")
    def match(self):
        if self.password != self.confirm:
            raise ValueError("passwords do not match")
        return self
\`\`\`

### Parsing/coercion vs strict
By default Pydantic coerces compatible types (\`"42"\` -> \`42\`). Use \`Strict\` types or \`model_config = ConfigDict(strict=True)\` when you want to reject loose input.

### Separate input and output models
Use one model for what clients may send and another for what you return -- never expose fields like \`password_hash\`:
\`\`\`python
class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr        # no password field ever
\`\`\`

### Settings management
\`pydantic-settings\` validates environment/config the same way, so bad config fails fast at startup instead of at 3am.`,

    internals: `- **Pydantic v2 is Rust-backed (pydantic-core),** so validation is fast enough to run on every request without being the bottleneck.
- **Coercion is deliberate and lax by default** because web input arrives as strings (query params, form data); \`"42"\` becoming \`42\` is a feature. Reach for strict mode when silent coercion would hide bugs (e.g. internal service-to-service payloads).
- **Validation errors are structured**, listing each failing field, its location (body/query/path), and a message -- FastAPI returns them as a 422 so clients can map errors to form fields.
- **Input vs output separation is a security control**, not just tidiness: a single shared model risks accepting fields clients should not set (mass assignment) or returning fields you should not expose. Distinct \`...In\` / \`...Out\` models close both holes.
- **\`model_validate\` / \`model_dump\`** are the parse-in / serialize-out entry points; \`from_attributes=True\` (formerly \`orm_mode\`) lets a model read directly from ORM objects.
- **Validators can transform, not just check** (normalize an email to lowercase, strip whitespace), so the data entering your system is canonical.
- **Failing config fast:** validating settings at startup converts a whole class of runtime "missing/invalid env var" incidents into an immediate, obvious boot failure.`,

    diagram: {
      title: "Validation and serialization boundary",
      layers: [
        { id: "raw", label: "Raw untrusted input", sub: "JSON body / query / form (all strings)" },
        { id: "parse", label: "Parse + coerce", sub: "'42' -> 42; types normalized" },
        { id: "validate", label: "Validate", sub: "field constraints + custom validators -> 422 on fail" },
        { id: "logic", label: "Business logic", sub: "receives guaranteed-valid typed objects" },
        { id: "out", label: "Serialize via output model", sub: "hide internal fields; stable JSON contract" },
      ],
      caption: "Models form the trust boundary: nothing invalid reaches your logic, nothing internal leaks out.",
    },

    realWorld: `An endpoint accepts \`UserUpdate\` and passes it straight to the ORM. Because the same model is used for input and output, it includes an \`is_admin\` field -- and a curious user simply adds \`"is_admin": true\` to their profile-update request and escalates to admin (a classic mass-assignment vulnerability). The fix is two models: a \`UserUpdateIn\` that only contains user-settable fields (name, bio, email) and a \`UserOut\` for responses. Now \`is_admin\` is not even accepted from the client, and the response model guarantees you never leak the password hash. Separate input/output Pydantic models turned a privilege-escalation bug into an impossibility at the type level.`,

    production: `- **Use distinct input and output models** (...In / ...Out) to prevent mass-assignment on the way in and field leaks on the way out.
- **Push constraints into the model** (Field(ge=, max_length=, pattern=)) rather than hand-checking in handlers.
- **Use custom validators** for cross-field rules (passwords match) and normalization (lowercase emails, strip whitespace).
- **Choose coercion vs strict deliberately:** lax for web input, strict for internal/service payloads where silent coercion hides bugs.
- **Validate configuration with pydantic-settings** so bad or missing env vars fail loudly at startup, not in production traffic.
- **Never return raw ORM objects;** map to an output model (from_attributes) so the response contract is explicit and safe.
- **Let the automatic 422 be your error contract** -- its structured per-field errors are more useful than ad-hoc messages.`,

    commonMistakes: [
      "Sharing one model for input and output, enabling mass assignment (is_admin) and leaking internal fields.",
      "Returning ORM objects directly instead of an output model, exposing password hashes or soft-delete flags.",
      "Hand-validating inside handlers instead of declaring constraints on the model.",
      "Assuming strict typing when Pydantic coerces by default (or vice versa), causing surprising accepted/rejected values.",
      "Not validating config, so a missing/invalid env var surfaces as a runtime failure under load.",
      "Putting business logic in validators that should just validate, making models hard to reason about.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Declarative model validation | Consistent, documented, one source of truth | Must model your data explicitly |
| Lax coercion (default) | Handles string web input smoothly | Can silently accept unintended values |
| Strict mode | Catches type mismatches early | Rejects otherwise-harmless coercions |
| Separate In/Out models | Blocks mass assignment + field leaks | More classes to maintain |
| Custom validators | Cross-field + normalization rules | Logic in models can grow unwieldy |`,

    whenToUse: [
      "Validating and coercing all external input (request bodies, query/form data).",
      "Shaping and securing responses via output models.",
      "Validating environment/configuration so bad config fails fast at startup.",
    ],
    whenNotToUse: [
      "Purely internal, already-trusted, already-typed data where validation adds no safety.",
      "Extremely hot paths where you have measured Pydantic as the bottleneck (rare with v2) and can validate once at the boundary instead.",
    ],

    memoryCard: {
      problem: "Turn untrusted external input into guaranteed-valid typed objects, and shape safe outputs, without scattered manual checks.",
      mentalModel: "A bouncer with a precise guest list: rejects anything off-list with a reason, coerces safe borderline cases, lets only valid data inside.",
      keyConcepts: ["BaseModel + Field constraints", "coercion vs strict", "field/model validators", "separate In/Out models", "automatic 422", "pydantic-settings for config"],
      productionConnection: "Distinct input/output models block mass assignment and field leaks; validated settings make bad config a loud startup failure.",
      oneLiner: "Pydantic makes your data model the contract -- it validates and coerces input, shapes safe output, and generates the docs, all from one typed class.",
    },

    code: [
      {
        label: "Input/output models with constraints and validators",
        language: "python",
        code: `from fastapi import FastAPI
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator

app = FastAPI()

class UserCreate(BaseModel):                 # what the client may send
    name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    confirm: str

    @field_validator("email")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.lower()                     # normalize

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm:
            raise ValueError("passwords do not match")
        return self

class UserOut(BaseModel):                     # what we return -- no password
    id: int
    name: str
    email: EmailStr

@app.post("/users", status_code=201, response_model=UserOut)
def create_user(payload: UserCreate):
    # payload is fully validated + normalized here
    return {"id": 1, "name": payload.name, "email": payload.email}`,
      },
      {
        label: "Validated settings via pydantic-settings",
        language: "python",
        code: `from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = Field(min_length=16)     # too-short secret fails at boot
    max_page_size: int = Field(default=100, le=1000)

    class Config:
        env_file = ".env"

# Instantiating validates all env/config immediately.
# A missing DATABASE_URL or short JWT_SECRET crashes at startup,
# not at 3am under production traffic.
settings = Settings()`,
      },
    ],

    quiz: [
      {
        id: "pd-q1",
        prompt: "By default, what does Pydantic do with the value \"42\" for a field typed as int?",
        choices: [
          { text: "Rejects it because it is a string", correct: false },
          { text: "Coerces it to the integer 42 (lax coercion is the default)", correct: true },
          { text: "Silently drops the field", correct: false },
          { text: "Stores it as the string '42'", correct: false },
        ],
        explanation: "Pydantic coerces compatible types by default, which suits web input where everything arrives as strings. Use strict mode/types when you want to reject such coercion.",
      },
      {
        id: "pd-q2",
        prompt: "Why use separate input and output models instead of one shared model?",
        choices: [
          { text: "It is required by FastAPI", correct: false },
          { text: "It prevents mass assignment (accepting fields like is_admin) and prevents leaking internal fields (like password_hash)", correct: true },
          { text: "It makes validation faster", correct: false },
          { text: "It removes the need for a response_model", correct: false },
        ],
        explanation: "A shared model can both accept fields the client should not set and return fields you should not expose. Distinct In/Out models make privilege escalation and data leaks impossible at the type level.",
      },
      {
        id: "pd-q3",
        prompt: "What is the benefit of validating configuration with pydantic-settings?",
        choices: [
          { text: "It encrypts environment variables", correct: false },
          { text: "Invalid or missing config fails loudly at startup instead of causing a runtime failure later", correct: true },
          { text: "It removes the need for a .env file", correct: false },
          { text: "It disables all other validation", correct: false },
        ],
        explanation: "Validating settings at boot turns 'missing/invalid env var' from a 3am production incident into an immediate, obvious startup crash you catch before deploying.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Model a secure signup endpoint",
      brief: "Design Pydantic models for a signup endpoint that prevents mass assignment, leaks nothing sensitive, and validates config at startup.",
      steps: `1. Define UserCreate with constraints (name length, EmailStr, min-length password) and a confirm field.\n2. Add a field_validator to normalize the email and a model_validator to check passwords match.\n3. Define UserOut with only safe fields (id, name, email) and use it as response_model.\n4. Ensure no client-settable privileged field (is_admin) exists on the input model.\n5. Add a Settings model (pydantic-settings) validating database_url and a min-length jwt_secret.\n6. Confirm invalid input returns a structured 422 and bad config fails at startup.`,
      successCriteria: [
        "Input model rejects invalid/malformed fields with 422",
        "No privileged field is accepted from the client",
        "Output model exposes no sensitive fields",
        "Cross-field validation (password match) works",
        "Missing/invalid config fails at startup",
      ],
    },
  },
];
