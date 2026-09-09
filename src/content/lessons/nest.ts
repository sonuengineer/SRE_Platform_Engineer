import type { Lesson } from "../types";

export const nestLessons: Lesson[] = [
  {
    slug: "nest-modules-providers",
    title: "NestJS Modules & Providers",
    track: "typescript",
    phase: "node-nest",
    module: "nest-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "How NestJS organizes an app into modules and wires classes together with dependency injection: providers, the DI container, provider scopes, and encapsulation via exports/imports.",
    prerequisites: ["http-fundamentals", "rest-design"],
    relatedConcepts: ["nest-guards-interceptors", "fastapi-dependency-injection", "authentication-dual", "rest-design"],
    tags: ["nestjs", "modules", "providers", "dependency-injection", "typescript", "architecture"],

    why: `As a Node backend grows, "just import the file you need" collapses into a tangle: circular imports, one class newing up another and hard-coding its dependencies, and no clear boundaries. **NestJS imposes a modular architecture with a dependency-injection container** so that classes declare what they need instead of constructing it, and features are grouped into modules with explicit public surfaces.

The payoff is the same as FastAPI's Depends but at application-architecture scale: **loose coupling and testability**. A service depends on an interface-shaped provider it receives via its constructor, so in tests you inject a fake, and in production Nest wires the real one -- without the service knowing or caring which.`,

    intuition: `Think of a NestJS app as a **company organized into departments (modules), with a central staffing office (the DI container)**.

Each department declares the roles it needs ("we need a PaymentsService and a Logger") rather than hiring and training those people itself. The staffing office keeps one shared instance of each role (a singleton) and hands it to whoever asks. Departments expose only certain roles to the rest of the company (exports) and keep the rest internal (encapsulation). If the Orders department needs the Payments department's service, it does not reach inside -- it imports the Payments module, which chooses what to make public.

You never write \`new PaymentsService(new Logger(), new StripeClient(...))\`. You declare a dependency in a constructor and the staffing office fills it in.`,

    howItWorks: `### The three building blocks
- **Provider:** any class Nest can inject -- typically a \`@Injectable()\` service. The DI container instantiates it once (by default) and shares it.
- **Module:** a \`@Module({...})\` class grouping related providers and controllers, declaring what it \`imports\`, \`provides\`, and \`exports\`.
- **Controller:** handles HTTP routes and delegates to services (kept thin).

\`\`\`typescript
@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}   // injected
  findOne(id: string) { return this.repo.byId(id); }
}

@Module({
  providers: [UsersService, UsersRepository],
  controllers: [UsersController],
  exports: [UsersService],   // make it available to importing modules
})
export class UsersModule {}
\`\`\`

### Wiring across modules
A module only sees providers it declares plus those \`exported\` by modules it \`imports\`:
\`\`\`typescript
@Module({
  imports: [UsersModule],          // gains access to exported UsersService
  providers: [OrdersService],
})
export class OrdersModule {}
\`\`\`

### Custom providers
Beyond \`useClass\`, you can bind a token to a value or a factory:
\`\`\`typescript
{ provide: 'CONFIG', useValue: { region: 'eu' } }
{ provide: PaymentGateway, useClass: StripeGateway }
{ provide: 'DB', useFactory: (cfg) => connect(cfg), inject: ['CONFIG'] }
\`\`\`
This is how you inject config, swap implementations, or build something asynchronously.

### Provider scope
Providers are **singletons** by default (one instance for the whole app). \`Scope.REQUEST\` creates one per request (needed for per-request state, at a performance cost); \`Scope.TRANSIENT\` creates a fresh one per injection.`,

    internals: `- **The DI container builds a dependency graph at startup** and instantiates providers in dependency order, so a missing or unexported provider is a *startup* error ("Nest can't resolve dependencies of X"), not a runtime surprise.
- **Encapsulation is enforced:** a provider is private to its module unless \`exported\`. Importing a module gives you only its exports -- this is what keeps large apps from becoming a global soup.
- **Default singleton scope** is why services are cheap and shareable, but it also means they must be **stateless** with respect to individual requests -- storing request data on a singleton leaks it across users.
- **Request-scoped providers cascade:** anything that depends on a request-scoped provider also becomes request-scoped, which can quietly turn much of your graph per-request and hurt performance. Prefer passing request data explicitly.
- **Custom providers use tokens** (a class or a string/symbol). Injecting by string token requires \`@Inject('TOKEN')\` in the constructor; injecting by class is automatic via TypeScript metadata.
- **\`useFactory\` + \`inject\`** enables async initialization (DB connections, config fetch) via \`forRootAsync\` patterns, which is how most Nest infra modules (TypeORM, config) are configured.
- **Circular dependencies** between providers/modules are resolvable with \`forwardRef\`, but usually signal a boundary that should be redrawn.`,

    diagram: {
      title: "Modules, providers, and the DI container",
      layers: [
        { id: "module", label: "@Module", sub: "groups providers + controllers; declares imports/exports" },
        { id: "container", label: "DI container", sub: "builds graph at startup; instantiates in order" },
        { id: "provide", label: "Provider (@Injectable)", sub: "singleton by default; injected via constructor" },
        { id: "export", label: "exports/imports", sub: "encapsulation: only exported providers are visible" },
        { id: "controller", label: "Controller", sub: "thin; delegates to injected services" },
      ],
      caption: "Classes declare dependencies; the container wires them -- so coupling is loose and tests can inject fakes.",
    },

    realWorld: `A team hard-codes \`new StripeGateway(process.env.STRIPE_KEY)\` inside their \`PaymentsService\`. Unit tests then hit the real Stripe API (slow, flaky, and occasionally charging test cards), and swapping to a different processor means editing the service. Refactoring to DI, they define \`{ provide: PaymentGateway, useClass: StripeGateway }\` and inject \`PaymentGateway\` into the service. Now tests bind \`{ provide: PaymentGateway, useClass: FakeGateway }\` in a test module -- no network, fully deterministic -- and switching processors is a one-line provider change. The service never mentions Stripe again. That decoupling is the entire reason Nest pushes DI so hard.`,

    production: `- **Keep controllers thin** and put logic in injectable services so it is reusable and testable.
- **Export only what other modules truly need**; keep the rest private to preserve encapsulation.
- **Treat singleton providers as stateless per request** -- never stash request/user data on them, or you leak it across users.
- **Avoid request scope unless necessary;** it cascades through the graph and costs performance. Pass request data explicitly instead.
- **Use custom providers (useValue/useFactory)** to inject config and to swap real implementations for fakes in tests.
- **Configure infra with forRootAsync + useFactory** so DB/config init is validated and awaited at startup.
- **Let unresolved dependencies fail at startup** -- fix the missing export/import rather than working around it.`,

    commonMistakes: [
      "Instantiating dependencies with 'new' inside a service instead of injecting them, defeating testability.",
      "Storing per-request or per-user state on a default singleton provider, leaking data across requests.",
      "Forgetting to export a provider, then getting a 'Nest can't resolve dependencies' error at startup.",
      "Overusing Scope.REQUEST, which cascades and turns much of the graph per-request, hurting performance.",
      "Putting business logic in controllers instead of injectable services.",
      "Creating circular module/provider dependencies instead of redrawing the boundary (reaching for forwardRef reflexively).",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| DI container | Loose coupling, testable, wired for you | Indirection; must learn provider/module rules |
| Singleton scope (default) | Cheap, shared, fast | Must stay stateless per request |
| Request scope | Safe per-request state | Cascades; per-request instantiation cost |
| Custom providers (factory/value) | Config injection, swappable impls, async init | More configuration to maintain |
| Strict module encapsulation | Clear boundaries in large apps | More explicit imports/exports wiring |`,

    whenToUse: [
      "Structuring any non-trivial Node/TypeScript backend into feature modules.",
      "Decoupling services from concrete implementations (payment gateways, repositories) for testability.",
      "Injecting configuration and building infra (DB, cache) via factories at startup.",
    ],
    whenNotToUse: [
      "A tiny script or single-endpoint service where a full module/DI structure is overkill.",
      "Request-scoped providers when you can simply pass request data as function arguments.",
    ],

    memoryCard: {
      problem: "Wire a growing backend's classes together with loose coupling and clear boundaries instead of hard-coded 'new' and tangled imports.",
      mentalModel: "A company of departments (modules) with a central staffing office (DI container) that hands out shared roles (providers) on request.",
      keyConcepts: ["provider = injectable class", "module groups + imports/exports", "constructor injection", "singleton by default (stay stateless)", "custom providers (useClass/useValue/useFactory)", "request scope cascades"],
      productionConnection: "Custom providers let tests inject fakes and let you swap implementations in one line; singletons must stay stateless to avoid cross-request leaks.",
      oneLiner: "NestJS groups features into modules and lets classes declare dependencies via a DI container, so wiring is automatic, coupling is loose, and tests can inject fakes.",
    },

    code: [
      {
        label: "Modules, injectable service, and cross-module use",
        language: "typescript",
        code: `import { Injectable, Module } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}   // injected
  findOne(id: string) {
    return this.repo.byId(id);
  }
}

@Module({
  providers: [UsersService, UsersRepository],
  exports: [UsersService],            // public surface of this module
})
export class UsersModule {}

@Injectable()
export class OrdersService {
  constructor(private readonly users: UsersService) {}     // from imported module
  async place(userId: string) {
    const user = await this.users.findOne(userId);
    // ... create order for user
    return { userId: user.id };
  }
}

@Module({
  imports: [UsersModule],             // gains exported UsersService
  providers: [OrdersService],
})
export class OrdersModule {}`,
      },
      {
        label: "Custom provider swapped for a fake in tests",
        language: "typescript",
        code: `import { Test } from '@nestjs/testing';

// production wiring: bind the abstract gateway to the real one
// { provide: PaymentGateway, useClass: StripeGateway }

class FakeGateway implements PaymentGateway {
  charge() { return Promise.resolve({ id: 'fake_ch_1', ok: true }); }
}

it('places an order without hitting Stripe', async () => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrdersService,
      { provide: PaymentGateway, useClass: FakeGateway },  // override
    ],
  }).compile();

  const orders = moduleRef.get(OrdersService);
  const result = await orders.checkout('user-1');
  expect(result.ok).toBe(true);      // deterministic, no network
});`,
      },
    ],

    quiz: [
      {
        id: "nm-q1",
        prompt: "By default, how many instances of an @Injectable() provider does Nest create for the whole app?",
        choices: [
          { text: "One per request", correct: false },
          { text: "One shared singleton for the entire application", correct: true },
          { text: "One per controller that uses it", correct: false },
          { text: "A new instance on every method call", correct: false },
        ],
        explanation: "Providers are singletons by default, which is why they are cheap and shareable -- and why they must be stateless per request, since storing request data on a singleton leaks it across users.",
      },
      {
        id: "nm-q2",
        prompt: "OrdersModule needs UsersService from UsersModule. What must be true?",
        choices: [
          { text: "OrdersModule imports the UsersService file directly", correct: false },
          { text: "UsersModule exports UsersService and OrdersModule imports UsersModule", correct: true },
          { text: "UsersService must be a global variable", correct: false },
          { text: "Both must be in the same file", correct: false },
        ],
        explanation: "Nest enforces encapsulation: a provider is only visible outside its module if exported, and the consuming module must import the providing module to receive its exports.",
      },
      {
        id: "nm-q3",
        prompt: "Why does DI make services easier to test?",
        choices: [
          { text: "It disables the service in tests", correct: false },
          { text: "Dependencies are injected, so a test module can bind a fake (useClass/useValue) without changing the service", correct: true },
          { text: "It runs tests faster by skipping the container", correct: false },
          { text: "It removes the need for assertions", correct: false },
        ],
        explanation: "Because a service receives its dependencies via the constructor rather than newing them up, a testing module can provide fake implementations for the same tokens, so the service runs against fakes with no code changes.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Structure a feature into a module with DI",
      brief: "Refactor a service that news up its own Stripe client into a Nest module with an injectable, swappable payment gateway.",
      steps: `1. Define a PaymentGateway abstraction and a StripeGateway implementation.\n2. Bind them with a custom provider { provide: PaymentGateway, useClass: StripeGateway }.\n3. Inject PaymentGateway into PaymentsService via the constructor (remove all 'new').\n4. Group them in a PaymentsModule and export what OrdersModule needs.\n5. Import PaymentsModule into OrdersModule and use the exported service.\n6. Write a test that overrides PaymentGateway with a FakeGateway (no network).`,
      successCriteria: [
        "No 'new' of dependencies inside services",
        "PaymentGateway is injected and swappable",
        "Modules export/import only what is needed",
        "A test runs against a fake gateway with no network",
        "Unresolved dependencies would fail at startup, not runtime",
      ],
    },
  },

  {
    slug: "nest-guards-interceptors",
    title: "NestJS Guards & Interceptors",
    track: "typescript",
    phase: "node-nest",
    module: "nest-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "NestJS's request lifecycle components for cross-cutting concerns: guards for authorization (can this request proceed?), interceptors for wrapping (logging, transform, cache), plus pipes and filters -- and the order they run in.",
    prerequisites: ["nest-modules-providers", "authentication-dual"],
    relatedConcepts: ["nest-modules-providers", "authentication-dual", "jwt-vs-sessions", "status-codes"],
    tags: ["nestjs", "guards", "interceptors", "pipes", "filters", "typescript", "middleware"],

    why: `Authentication, authorization, logging, response shaping, caching, and error formatting are needed by many routes and do not belong inside business logic. Scattering them into every controller method is repetitive and easy to get wrong (forget one auth check and you have a vulnerability). **NestJS provides dedicated, composable lifecycle components -- guards, interceptors, pipes, and filters -- that attach these concerns declaratively at the method, controller, or global level.**

The value is separation of concerns with guarantees: mark a controller with a guard and *every* route under it is protected, consistently, without a line of auth code in the handlers. Each component has a specific job and a defined position in the request pipeline, so you always know where a concern belongs.`,

    intuition: `Picture the request pipeline as **airport security stages, each with a distinct job**.

- A **guard** is the boarding-pass checkpoint: it makes a binary decision -- may this request proceed at all? If not, you are turned away (403) before reaching the gate. Guards are about *authorization*.
- A **pipe** is baggage inspection and tagging: it validates and transforms your inputs (parse and check the body/params) before they reach the handler.
- An **interceptor** is the flight-attendant who wraps your whole journey: it can do something *before* the handler runs (start a timer, check a cache) and *after* it returns (log the duration, reshape the response) -- it surrounds the handler.
- A **filter** is the lost-and-found desk: when something goes wrong (an exception), it catches it and produces a clean, consistent error response.

Each stage does one thing, and they run in a fixed order.`,

    howItWorks: `### The execution order (per request)
\`\`\`
Middleware -> Guards -> Interceptors (pre) -> Pipes -> Handler
           -> Interceptors (post) -> Exception filters (on error)
\`\`\`

### Guard -- can this proceed?
Returns \`true\`/\`false\` (or throws). Classic use: auth/roles.
\`\`\`typescript
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.split(' ')[1];
    req.user = await this.jwt.verifyAsync(token);  // throws -> 401
    return true;
  }
}
@UseGuards(JwtGuard)
@Get('me')
me(@Req() req) { return req.user; }
\`\`\`

### Interceptor -- wrap before/after
Uses RxJS to act on the response stream.
\`\`\`typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => console.log('took', Date.now() - start, 'ms')),
    );
  }
}
\`\`\`

### Pipe -- validate/transform input
\`ValidationPipe\` validates DTOs (class-validator); \`ParseIntPipe\` coerces a param.

### Filter -- format errors
\`@Catch()\` turns thrown exceptions into a consistent error body + status.

### Scope: method, controller, or global
Apply any of them with a decorator (\`@UseGuards\`) on a method/controller, or register globally (\`app.useGlobalGuards(...)\`) so they run everywhere.`,

    internals: `- **Order is not arbitrary and matters for security and correctness.** Guards run *before* interceptors and pipes, so an unauthorized request is rejected before you spend work parsing its body or running an interceptor's pre-logic. Never rely on a pipe or interceptor for authorization.
- **Guards get an \`ExecutionContext\`,** an abstraction over HTTP/WebSocket/RPC, so the same guard can protect different transports; \`switchToHttp()\` narrows it.
- **Interceptors are the only component that sees both sides** of the handler because they return an Observable; \`next.handle()\` is the handler's result stream, and operators after it run on the response -- ideal for timing, response envelopes, and caching.
- **\`@SetMetadata\` + \`Reflector\`** power declarative rules: a \`@Roles('admin')\` decorator stamps metadata that a RolesGuard reads via \`Reflector\` to decide access -- this is how role-based auth is expressed cleanly.
- **Pipes are also where DTO validation lives** (global \`ValidationPipe\` + class-validator/class-transformer), the NestJS analogue of FastAPI's Pydantic boundary.
- **Exception filters standardize error responses**; a global filter ensures every error, from anywhere, returns the same shape and correct status code -- the same discipline as the status-codes lesson.
- **Global vs scoped registration trade-off:** global guards/interceptors are consistent but run on every route (including public ones), so public routes need an opt-out (e.g. a \`@Public()\` metadata check inside the guard).`,

    diagram: {
      title: "NestJS request lifecycle",
      layers: [
        { id: "guard", label: "Guard", sub: "authorize: proceed or 401/403 (runs first)" },
        { id: "interceptor-pre", label: "Interceptor (pre)", sub: "start timer / cache check, before handler" },
        { id: "pipe", label: "Pipe", sub: "validate + transform inputs (DTOs)" },
        { id: "handler", label: "Handler", sub: "controller method -> service" },
        { id: "post", label: "Interceptor (post) / Filter", sub: "reshape/log response; filter formats errors" },
      ],
      caption: "Each component has one job and a fixed position; guards run first so unauthorized work is never done.",
    },

    realWorld: `A team implements authorization by calling a \`checkAdmin(req)\` helper at the top of each admin controller method. One new endpoint is added without the check, and it ships -- a privilege-escalation hole that a code review misses because the omission is invisible. Rewriting it as a \`RolesGuard\` driven by a \`@Roles('admin')\` decorator (or a controller-level \`@UseGuards(RolesGuard)\`) makes protection declarative: every route under the guard is checked automatically, and a new endpoint is protected by default. The vulnerability class "someone forgot the check" disappears because the check is attached to the boundary, not copy-pasted into each handler. Guards turn authorization from a per-method chore into an architectural guarantee.`,

    production: `- **Do authorization in guards, never in interceptors or pipes** -- guards run first and are the correct place to reject requests.
- **Prefer controller- or global-level guards** so protection is default-on; use a \`@Public()\` opt-out for genuinely open routes.
- **Use \`@Roles\`/\`@SetMetadata\` + \`Reflector\`** for clean role-based access instead of hard-coded checks.
- **Register a global ValidationPipe** (with whitelist/forbidNonWhitelisted) so unknown fields are stripped/rejected -- the Nest equivalent of strict DTO validation.
- **Use interceptors for cross-cutting response concerns** (timing, standard response envelope, caching) -- they are the only component that wraps both sides.
- **Register a global exception filter** so every error returns a consistent shape and correct status code.
- **Keep guards/interceptors fast and non-blocking** -- they run on the request hot path for every request in scope.`,

    commonMistakes: [
      "Doing authorization inside an interceptor or pipe instead of a guard, so it runs after work has already begun.",
      "Copy-pasting auth checks into each controller method, so a new endpoint silently ships unprotected.",
      "Applying a global guard without a @Public() opt-out, accidentally locking down health checks and login.",
      "Assuming interceptors run before guards -- guards always run first.",
      "Skipping a global ValidationPipe, letting unvalidated/unknown fields reach handlers.",
      "Not registering a global exception filter, producing inconsistent error shapes and wrong status codes.",
    ],

    tradeoffs: `| Component | Job | Watch out for |
|---|---|---|
| Guard | Authorize (proceed?) | Must run first; do not put auth elsewhere |
| Pipe | Validate/transform input | Not for auth; validation cost per request |
| Interceptor | Wrap before/after (log, transform, cache) | RxJS learning curve; runs on hot path |
| Filter | Format errors consistently | Global one needed or shapes diverge |
| Global scope | Consistent, default-on | Runs on public routes too (needs opt-out) |`,

    whenToUse: [
      "Guards: authentication/authorization and any 'may this request proceed?' decision.",
      "Interceptors: logging/timing, response envelopes, caching, and transforming results.",
      "Pipes: validating and coercing request inputs (DTOs, path params).",
      "Filters: turning exceptions into a consistent error contract.",
    ],
    whenNotToUse: [
      "Putting business logic in guards/interceptors -- it belongs in services.",
      "Using an interceptor for authorization (use a guard, which runs first).",
    ],

    memoryCard: {
      problem: "Attach cross-cutting concerns (auth, logging, validation, error shape) consistently without polluting business logic.",
      mentalModel: "Airport security stages: guard = boarding-pass check (proceed?), pipe = baggage inspection (validate input), interceptor = attendant wrapping the trip (before/after), filter = lost-and-found (errors).",
      keyConcepts: ["guards authorize (run first)", "interceptors wrap before+after via RxJS", "pipes validate/transform input", "filters format errors", "method/controller/global scope", "@Roles + Reflector metadata"],
      productionConnection: "Controller/global guards make authorization default-on so a new endpoint cannot ship unprotected; global ValidationPipe + exception filter standardize input and errors.",
      oneLiner: "NestJS guards, interceptors, pipes, and filters each own one cross-cutting concern in a fixed pipeline order -- with guards running first so unauthorized requests are rejected before any work.",
    },

    code: [
      {
        label: "Role-based guard with metadata + Reflector",
        language: "typescript",
        code: `import {
  CanActivate, ExecutionContext, Injectable,
  SetMetadata, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// decorator stamps required roles as metadata
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('roles', ctx.getHandler());
    if (!required) return true;                 // no @Roles -> open
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;                       // set by an auth guard earlier
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('insufficient role');
    }
    return true;
  }
}

@UseGuards(RolesGuard)
export class AdminController {
  @Roles('admin')
  @Get('metrics')
  metrics() { return { ok: true }; }             // admins only
}`,
      },
      {
        label: "Interceptor: timing + response envelope",
        language: "typescript",
        code: `import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const start = Date.now();                     // BEFORE handler
    return next.handle().pipe(
      tap(() => console.log('duration', Date.now() - start, 'ms')),
      map((data) => ({                            // AFTER handler
        data,
        meta: { tookMs: Date.now() - start },
      })),
    );
  }
}
// register globally: app.useGlobalInterceptors(new TransformInterceptor());`,
      },
    ],

    quiz: [
      {
        id: "gi-q1",
        prompt: "Which NestJS component should perform authorization, and why?",
        choices: [
          { text: "An interceptor, because it wraps the handler", correct: false },
          { text: "A guard, because guards run first and decide whether the request may proceed", correct: true },
          { text: "A pipe, because it validates input", correct: false },
          { text: "A filter, because it catches errors", correct: false },
        ],
        explanation: "Guards run before interceptors and pipes and return a boolean 'may this proceed?'. Doing auth in a guard rejects unauthorized requests before any parsing or handler work happens.",
      },
      {
        id: "gi-q2",
        prompt: "What is unique about interceptors compared to guards and pipes?",
        choices: [
          { text: "They only run on errors", correct: false },
          { text: "They can run logic both before and after the handler, by returning an Observable of the response", correct: true },
          { text: "They validate the request body", correct: false },
          { text: "They cannot be applied globally", correct: false },
        ],
        explanation: "Interceptors wrap the handler: code before next.handle() runs first, and RxJS operators after it run on the response stream -- ideal for timing, response envelopes, and caching.",
      },
      {
        id: "gi-q3",
        prompt: "Why is a controller-level or global guard better than a checkAdmin() call in each method?",
        choices: [
          { text: "It runs faster", correct: false },
          { text: "Protection becomes default-on, so a newly added route cannot silently ship without the check", correct: true },
          { text: "It removes the need for authentication", correct: false },
          { text: "It disables validation", correct: false },
        ],
        explanation: "Attaching the guard to the boundary means every route under it is protected automatically. A new endpoint is covered by default, eliminating the 'someone forgot the check' vulnerability class.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Secure and standardize a controller",
      brief: "Add declarative authorization, input validation, response shaping, and consistent errors to an admin controller.",
      steps: `1. Create a JwtGuard that verifies the token and attaches req.user (throws 401 on failure).\n2. Create a RolesGuard driven by a @Roles('admin') metadata decorator via Reflector.\n3. Apply both guards at the controller level so every route is protected by default.\n4. Register a global ValidationPipe (whitelist + forbidNonWhitelisted) for DTO validation.\n5. Add an interceptor that logs duration and wraps responses in a { data, meta } envelope.\n6. Register a global exception filter so all errors share one shape and correct status codes.`,
      successCriteria: [
        "Authorization is done in guards, applied at the controller/global level",
        "A new route under the controller is protected by default",
        "DTO validation runs via a global ValidationPipe",
        "Responses are consistently shaped via an interceptor",
        "Errors return a consistent body and correct status via a filter",
      ],
    },
  },

  {
    slug: "node-event-loop-deep",
    title: "Node.js Event Loop (Deep)",
    track: "typescript",
    phase: "node-nest",
    module: "nest-core",
    difficulty: "expert",
    estMinutes: 30,
    summary:
      "How Node's single-threaded event loop and libuv thread pool actually work: the phases, microtasks vs macrotasks, why blocking the loop is fatal, and how to handle CPU-bound work.",
    prerequisites: ["tcp", "fastapi-async"],
    relatedConcepts: ["fastapi-async", "nest-modules-providers", "background-jobs-dual", "rate-limiting"],
    tags: ["nodejs", "event-loop", "libuv", "microtasks", "concurrency", "typescript", "performance"],

    why: `Node.js runs your JavaScript on a **single thread**. That one fact explains both its strength -- effortless high concurrency for I/O-bound servers -- and its most dangerous failure mode -- one slow synchronous operation freezing the entire process, stalling every connected client at once. Every NestJS/Express service you operate lives or dies by this.

Understanding the event loop is what separates "my server is mysteriously slow under load" from "I know that JSON.parse of a 50MB payload is blocking the loop and starving every other request." It is the foundation for reasoning about latency, why \`async/await\` helps only for I/O, why CPU-bound work needs worker threads, and why a single tight loop can take down a whole box.`,

    intuition: `Node is a **single, extremely fast chef with an order rail and a team of prep cooks (the OS/libuv thread pool)**.

The chef (your JS thread) never waits at the stove. They read an order, kick off anything slow -- "put this in the oven" (a network call, a file read) -- by handing it to a prep cook, and immediately move to the next order. When a prep cook signals "done", a **callback** is placed on the rail and the chef handles it at the next opportunity. Because the chef never idles on a wait, one chef serves an enormous number of orders.

The catastrophe: if the chef ever decides to personally peel a mountain of potatoes (a CPU-heavy synchronous loop), they stop reading the rail entirely. Every order -- including ones that were nearly done -- waits until the potatoes are finished. There is only one chef. That is blocking the event loop.`,

    howItWorks: `### The loop phases (per iteration/"tick")
libuv runs the loop through ordered phases:
\`\`\`
timers        -> setTimeout / setInterval callbacks due now
pending       -> deferred system callbacks
poll          -> retrieve new I/O events; execute I/O callbacks (main wait)
check         -> setImmediate callbacks
close         -> 'close' event callbacks
\`\`\`
Between *every* callback, Node drains the **microtask queue**.

### Microtasks vs macrotasks -- the key ordering
- **Macrotasks:** timers, I/O callbacks, \`setImmediate\` -- scheduled into loop phases.
- **Microtasks:** resolved \`Promise\` \`.then\`/\`await\` continuations and \`queueMicrotask\`; and \`process.nextTick\` (highest priority).
- **Microtasks drain completely after each macrotask, before the loop continues.** So a Promise callback runs *before* a \`setTimeout(0)\` scheduled at the same time.
\`\`\`js
console.log('A');
setTimeout(() => console.log('timeout'), 0);   // macrotask
Promise.resolve().then(() => console.log('promise'));  // microtask
console.log('B');
// Output: A, B, promise, timeout
\`\`\`

### The libuv thread pool
JS is single-threaded, but Node offloads certain operations to a **libuv thread pool** (default 4 threads): file system I/O, DNS lookups, and crypto/zlib. Network I/O uses the OS's async facilities directly, not the pool. The pool size is tunable via \`UV_THREADPOOL_SIZE\`.

### CPU-bound work
CPU work runs on the JS thread and blocks the loop. Offload it to **worker threads** (\`worker_threads\`), a child process, or an external job queue.`,

    internals: `- **process.nextTick has higher priority than promise microtasks** and runs before the loop continues; abusing it (recursive nextTick) can starve the loop entirely because I/O never gets a turn.
- **Microtask starvation is real:** an ever-growing microtask queue (e.g. a promise chain that keeps scheduling more microtasks) prevents the loop from ever reaching the poll phase, so I/O callbacks never fire even though JS looks 'busy'.
- **The poll phase is where the loop usually waits** for I/O; if there are pending timers it will not block indefinitely, otherwise it can wait for events -- this is how an idle server sleeps efficiently.
- **Network vs file I/O differ:** network sockets use epoll/kqueue/IOCP (no thread pool), while \`fs\` calls consume a pool thread. Saturating the 4-thread pool with heavy file/crypto work serializes those operations even though the code looks async.
- **CPU-bound code defeats async entirely** -- \`await\` yields only at real async boundaries; a synchronous \`for\` loop crunching numbers never yields, so it blocks regardless of async syntax (the same lesson as FastAPI's loop, because both are single-loop models).
- **Worker threads have separate V8 isolates** and communicate via message passing (or SharedArrayBuffer); they are for CPU parallelism, not for making I/O faster.
- **Timer precision is not guaranteed:** \`setTimeout(fn, 0)\` runs on a future tick, not immediately, and can be delayed by a busy loop -- never rely on it for precise timing.
- **Blocking symptoms:** rising event-loop lag/delay, p99 latency spikes, and health checks timing out while CPU is pinned on one core.`,

    diagram: {
      title: "One tick of the event loop",
      layers: [
        { id: "timers", label: "timers phase", sub: "due setTimeout/setInterval callbacks" },
        { id: "poll", label: "poll phase", sub: "I/O callbacks; loop waits here for events" },
        { id: "check", label: "check phase", sub: "setImmediate callbacks" },
        { id: "micro", label: "microtask drain", sub: "nextTick then Promise callbacks after EACH callback" },
        { id: "block", label: "CPU-bound code", sub: "never yields -> whole loop frozen -> offload to workers" },
      ],
      caption: "Microtasks drain after every callback; a synchronous CPU loop freezes all phases and every client.",
    },

    realWorld: `A NestJS API works fine until someone adds an endpoint that synchronously parses and reshapes a large uploaded JSON file and runs a heavy in-memory sort on it. In production, whenever one user hits that endpoint, *every* other request across the whole process stalls for a second or two -- health checks flap, p99 latency spikes, and the load balancer starts marking the instance unhealthy, even though CPU on other cores is idle. The cause is a CPU-bound synchronous operation blocking the single event loop. The fix: move that work to a \`worker_thread\` (or a background job queue) so the main loop keeps serving requests while the heavy computation runs elsewhere. This is the number-one Node production incident, and it is invisible until you understand the single-threaded loop.`,

    production: `- **Never do heavy CPU-bound work on the main thread** -- offload to worker_threads, a child process, or a job queue so the loop keeps serving.
- **Beware large synchronous operations** (huge JSON.parse/stringify, big sorts, sync crypto, regex catastrophic backtracking) -- they block everything.
- **Never use \`fs.*Sync\`, \`execSync\`, or blocking loops in request handlers** on a server.
- **Understand the thread pool:** heavy \`fs\`/crypto/zlib work competes for the 4 libuv threads; tune \`UV_THREADPOOL_SIZE\` or offload if it saturates.
- **Monitor event-loop lag/delay** (e.g. via perf hooks) as a first-class metric -- rising lag means something is blocking.
- **Do not recurse with process.nextTick** or build unbounded microtask chains -- they starve I/O.
- **Scale across cores with the cluster module or multiple processes** (one loop per process); a single Node process uses one core for JS.
- **Chunk or stream large work** so long tasks yield back to the loop periodically instead of running to completion synchronously.`,

    commonMistakes: [
      "Running CPU-bound work (big parse/sort/crypto) on the main thread and freezing all requests.",
      "Using synchronous APIs (fs.readFileSync, execSync) inside request handlers on a server.",
      "Assuming async/await makes CPU-bound code non-blocking -- it only yields at real async boundaries.",
      "Starving the loop with recursive process.nextTick or unbounded microtask chains, so I/O never fires.",
      "Saturating the 4-thread libuv pool with heavy fs/crypto work and wondering why 'async' calls serialize.",
      "Running one Node process on a multi-core box and leaving cores idle (JS is one core per process).",
      "Relying on setTimeout(fn, 0) for precise or immediate execution.",
    ],

    tradeoffs: `| Approach | Benefit | Cost |
|---|---|---|
| Single-threaded event loop | Massive I/O concurrency, no lock complexity | One blocking op freezes everything |
| Worker threads | True CPU parallelism | Message-passing overhead; separate isolates |
| Child process / job queue | Isolation; survives crashes | More infrastructure + IPC |
| Larger UV_THREADPOOL_SIZE | More concurrent fs/crypto | More memory; not a fix for CPU-bound JS |
| Cluster / multiple processes | Uses all cores | Shared state must be externalized |`,

    whenToUse: [
      "Reasoning about latency and throughput of any Node/NestJS/Express service.",
      "Diagnosing 'the whole server got slow' incidents (event-loop blocking).",
      "Deciding where CPU-bound work should run (worker thread vs job queue).",
    ],
    whenNotToUse: [
      "As a place to run CPU-heavy computation -- that belongs off the main thread.",
      "Expecting parallelism from a single process -- use workers/cluster for multiple cores.",
    ],

    memoryCard: {
      problem: "Serve huge numbers of concurrent I/O-bound requests on one thread -- without one slow operation freezing every client.",
      mentalModel: "One fast chef with prep cooks (libuv): never idles on a wait, but if the chef peels potatoes (CPU work) every order stalls.",
      keyConcepts: ["single JS thread + libuv pool", "loop phases (timers/poll/check)", "microtasks drain after each callback", "nextTick > promises", "CPU work blocks the loop", "worker_threads for parallelism"],
      productionConnection: "The #1 Node incident is a CPU-bound sync op (big JSON/sort/crypto) freezing the loop and flapping health checks -- fix by offloading to worker threads or a queue.",
      oneLiner: "Node runs your JS on one event-loop thread offloading I/O to libuv -- so it scales I/O effortlessly but any CPU-bound synchronous work freezes the entire process.",
    },

    code: [
      {
        label: "Microtask vs macrotask ordering",
        language: "typescript",
        code: `console.log('1: sync start');

setTimeout(() => console.log('4: setTimeout (macrotask)'), 0);

Promise.resolve().then(() => console.log('3: promise (microtask)'));

queueMicrotask(() => console.log('3b: queueMicrotask'));

process.nextTick(() => console.log('2: nextTick (highest priority)'));

console.log('1b: sync end');

// Output order:
// 1: sync start
// 1b: sync end
// 2: nextTick (highest priority)
// 3: promise (microtask)
// 3b: queueMicrotask
// 4: setTimeout (macrotask)
// nextTick runs before other microtasks; all microtasks drain
// before the timer macrotask on the next tick.`,
      },
      {
        label: "Offloading CPU-bound work to a worker thread",
        language: "typescript",
        code: `// heavy.worker.ts
import { parentPort, workerData } from 'worker_threads';

function heavyCompute(n: number): number {
  let acc = 0;
  for (let i = 0; i < n; i++) acc += Math.sqrt(i);  // CPU-bound
  return acc;
}
parentPort?.postMessage(heavyCompute(workerData.n));

// service.ts -- keep the event loop free
import { Worker } from 'worker_threads';

export function computeOffThread(n: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./heavy.worker.js', { workerData: { n } });
    worker.once('message', resolve);       // loop stays responsive
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error('worker exit ' + code));
    });
  });
}
// Now: await computeOffThread(1e9) does NOT block the main loop.`,
      },
    ],

    quiz: [
      {
        id: "el-q1",
        prompt: "Given setTimeout(cb1, 0) and Promise.resolve().then(cb2) scheduled together, which runs first?",
        choices: [
          { text: "cb1, because setTimeout(0) means immediately", correct: false },
          { text: "cb2, because microtasks (promises) drain completely before the next macrotask (timer)", correct: true },
          { text: "They run in random order", correct: false },
          { text: "cb1, because timers have higher priority than promises", correct: false },
        ],
        explanation: "After the current synchronous code, Node drains all microtasks (promise callbacks) before moving to macrotasks like timers. So the promise callback runs before the setTimeout(0) callback.",
      },
      {
        id: "el-q2",
        prompt: "Why does a heavy synchronous for-loop crunching numbers freeze an entire Node server?",
        choices: [
          { text: "It uses too much memory", correct: false },
          { text: "JS runs on a single event-loop thread; a synchronous loop never yields, so no other callbacks or I/O can run until it finishes", correct: true },
          { text: "It triggers garbage collection on every iteration", correct: false },
          { text: "It blocks only the current request, not others", correct: false },
        ],
        explanation: "There is one JS thread. CPU-bound synchronous code never reaches an await/yield point, so the event loop cannot advance to any other callback or I/O event until the loop completes -- every client stalls.",
      },
      {
        id: "el-q3",
        prompt: "What is the correct way to run CPU-bound work in Node without blocking the loop?",
        choices: [
          { text: "Wrap it in async/await", correct: false },
          { text: "Offload it to a worker thread, child process, or job queue so it runs off the main event-loop thread", correct: true },
          { text: "Use process.nextTick to schedule it", correct: false },
          { text: "Increase UV_THREADPOOL_SIZE", correct: false },
        ],
        explanation: "async/await does not help CPU-bound code (it only yields at real async boundaries), and the libuv pool is for fs/crypto, not your JS. True CPU parallelism requires worker threads, a child process, or an external queue.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Find and fix event-loop blocking",
      brief: "A NestJS service stalls all requests whenever one endpoint runs. Diagnose the blocking and move the work off the loop.",
      steps: `1. Identify the blocking operation (large synchronous JSON.parse/sort/crypto or a *Sync fs call) in the handler.\n2. Explain why it freezes all concurrent requests given the single event-loop thread.\n3. Add event-loop delay monitoring (perf_hooks) to confirm the lag spikes during that endpoint.\n4. Move the CPU-bound work into a worker_thread (or a background job queue) and await the result.\n5. Replace any *Sync fs/exec calls with async equivalents.\n6. Verify other requests stay responsive while the heavy work runs, and cores are used via cluster/multiple processes.`,
      successCriteria: [
        "The blocking CPU-bound operation is identified",
        "Event-loop lag is measured and correlated to the endpoint",
        "Heavy work runs off the main thread (worker/queue)",
        "No synchronous fs/exec calls remain in handlers",
        "Concurrent requests stay responsive under load",
      ],
    },
  },
];
