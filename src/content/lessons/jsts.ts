import type { Lesson } from "../types";

export const jstsLessons: Lesson[] = [
  {
    slug: "js-event-loop",
    title: "The JavaScript Event Loop",
    track: "typescript",
    phase: "js-ts",
    module: "ts-core",
    difficulty: "core",
    estMinutes: 28,
    summary:
      "How a single-threaded language handles thousands of concurrent operations -- the call stack, task and microtask queues, and why the ordering rules explain most async surprises.",
    prerequisites: [],
    relatedConcepts: ["ts-async-patterns", "node-streams", "concurrency-vs-parallelism"],
    tags: ["javascript", "event-loop", "async", "microtasks", "concurrency", "node", "browser"],

    why: `JavaScript runs your code on a **single thread**, yet servers built on it handle tens of thousands of simultaneous connections and browsers stay responsive while fetching data. That apparent contradiction is resolved by one mechanism: **the event loop, which lets one thread stay busy by never blocking on I/O and instead reacting to completed work via queues.**

If you do not understand the event loop, async JavaScript is a source of endless confusion: why \`setTimeout(fn, 0)\` does not run immediately, why a Promise callback jumps ahead of a timer, why one heavy synchronous function freezes the entire page or stalls every request on the server. Every one of those is a direct consequence of the loop's rules. Understanding it turns 'async is weird' into 'async is predictable.'`,

    intuition: `Imagine **one worker at a desk (the single thread) with two inboxes.**

- The worker can only do one thing at a time -- whatever is currently on the desk (the **call stack**).
- Slow jobs (a network request, a timer) are handed off to helpers (the browser/Node platform) so the worker is not stuck waiting.
- When a helper finishes, it drops a callback into an **inbox** for the worker to pick up when the desk is clear.
- There are two inboxes with a priority rule: the **microtask inbox** (Promise callbacks) is fully emptied before the worker touches even one item from the **task inbox** (timers, I/O callbacks).

So the flow is: finish everything on the desk -> empty the entire microtask inbox -> take exactly one task -> repeat. That single priority rule -- microtasks drain completely between tasks -- explains almost every ordering puzzle in async JS.`,

    howItWorks: `### The pieces
- **Call stack:** where the currently-running function (and its callers) live. JavaScript runs stack-to-empty synchronously.
- **Web/Node APIs:** timers, network, fs, etc. run *outside* the JS thread. When done, they enqueue a callback.
- **Task queue (macrotasks):** callbacks from timers, I/O, events. One is taken per loop iteration.
- **Microtask queue:** Promise \`.then\`/\`await\` continuations and queueMicrotask. **Drained completely** after each task and after the current stack empties.

### One iteration of the loop
1. Run the current call stack to completion (synchronous code).
2. Drain the **entire** microtask queue (and any microtasks they schedule).
3. Render (in browsers, roughly here).
4. Take **one** task from the task queue and run it (back to step 1).

### The ordering that trips everyone
\`\`\`js
console.log("A");
setTimeout(() => console.log("B (task)"), 0);
Promise.resolve().then(() => console.log("C (microtask)"));
console.log("D");
// Output: A, D, C, B
\`\`\`
Sync first (A, D), then all microtasks (C), then the timer task (B) -- even with a 0ms delay.

### await is just microtasks
\`await x\` splits the function: everything after the await becomes a microtask continuation that resumes once \`x\` settles. It does not block the thread; it yields control back to the loop.`,

    internals: `**Microtask starvation is real.** Because the loop drains the *entire* microtask queue before the next task, a microtask that keeps scheduling more microtasks can starve timers and I/O indefinitely -- the page or server appears frozen while burning CPU. This is why an accidental recursive Promise chain is worse than a slow loop.

**Blocking the thread blocks everything.** There is one call stack. A long synchronous computation (a big JSON parse, a tight loop, sync crypto) holds the stack, so no tasks or microtasks run, no I/O callbacks fire, and in the browser the UI cannot even repaint. On a Node server this means one request's CPU work stalls *all* other requests. The fix is to break up work, offload to a Worker/worker_thread, or move CPU work off the event-loop thread.

**Node vs browser differ in detail.** Node's libuv loop has phases (timers, pending callbacks, poll, check, close) and adds \`process.nextTick\` (which runs even before other microtasks) and \`setImmediate\` (the 'check' phase). Browsers add rendering and \`requestAnimationFrame\`. The core rule -- microtasks between tasks -- holds in both, but exact task ordering (setTimeout vs setImmediate) is environment-specific.

**Timers are a minimum, not a guarantee.** \`setTimeout(fn, 0)\` means 'run fn as a task no sooner than now,' but it waits behind the current stack and all microtasks, plus timer clamping. Never rely on timers for precise timing.

**The loop enables concurrency, not parallelism.** All JS runs on one core; concurrency comes from overlapping *waits* (I/O handled by the platform), exactly like Python's asyncio. CPU parallelism requires Workers/worker_threads (separate threads with their own loops).`,

    diagram: {
      title: "One thread, one loop, two queues",
      layers: [
        { id: "stack", label: "Call stack", sub: "runs synchronous code to completion" },
        { id: "apis", label: "Web/Node APIs", sub: "timers, network, fs run off-thread, then enqueue" },
        { id: "micro", label: "Microtask queue (Promises)", sub: "drained COMPLETELY between tasks" },
        { id: "task", label: "Task queue (timers, I/O)", sub: "exactly ONE taken per loop iteration" },
        { id: "block", label: "Blocking = frozen everything", sub: "one long sync call stalls all tasks + UI/requests" },
      ],
      caption: "Run the stack, drain all microtasks, take one task, repeat. Microtask priority explains nearly every async ordering puzzle.",
    },

    realWorld: `A Node API endpoint synchronously parses and transforms a large uploaded JSON payload on the request path. Under light traffic it is fine; under load, p99 latency spikes for *every* endpoint, not just the upload -- because that synchronous work holds the single event-loop thread, so all other requests queue behind it. Health checks even start failing. Nothing is 'slow' in the usual sense; the loop is simply blocked. The fix is to stream/parse incrementally, offload the heavy transform to a worker_thread, or push it to a background job -- keeping the event-loop thread free to service other requests. This is the defining operational lesson of the event loop: never do heavy CPU work on it.`,

    production: `- **Never block the event loop.** Audit for synchronous CPU work (large JSON.parse, sync crypto, big loops) on the request/UI path; offload to worker_threads/Workers or background jobs.
- **Beware microtask floods.** A runaway Promise chain can starve timers and I/O; ensure recursive async work yields to tasks periodically.
- **Do not trust timer precision.** setTimeout is a floor, delayed by the stack, microtasks, and clamping; use it for coarse scheduling only.
- **Batch and yield in long loops.** Break large synchronous processing into chunks that yield to the loop (e.g. await a macrotask) so I/O and rendering can proceed.
- **Understand your environment's ordering** (Node phases, process.nextTick vs setImmediate) when debugging subtle sequencing, but rely on the microtask-before-task rule as the invariant.
- **Use worker_threads for CPU parallelism** in Node; the main loop is for I/O orchestration, not number crunching.`,

    commonMistakes: [
      "Expecting setTimeout(fn, 0) to run immediately -- it waits behind the current stack and all microtasks.",
      "Assuming a timer callback runs before a Promise callback scheduled earlier -- microtasks always drain first.",
      "Doing heavy synchronous CPU work on the event-loop thread, freezing the UI or stalling all server requests.",
      "Creating an accidental infinite/recursive microtask chain that starves tasks and I/O.",
      "Believing the event loop gives parallelism -- it is single-threaded concurrency; CPU parallelism needs Workers.",
      "Relying on setTimeout for precise timing or animation instead of requestAnimationFrame / proper scheduling.",
    ],

    tradeoffs: `| Property | The event loop gives you | The cost |
|---|---|---|
| Single thread | No data races on shared memory, simple model | One blocking call freezes everything |
| Non-blocking I/O | Huge I/O concurrency on few resources | CPU-bound work must be offloaded |
| Microtask priority | Predictable Promise ordering, fast continuations | Microtask floods can starve tasks/I/O |
| Cooperative scheduling | Cheap concurrency, no thread overhead | You must yield; nothing preempts you |

The model trades away CPU parallelism (on one thread) for enormous, cheap I/O concurrency and a race-free single-threaded mental model.`,

    whenToUse: [
      "Reasoning about the exact order async callbacks run (Promises vs timers vs I/O).",
      "Diagnosing UI jank or server-wide latency spikes caused by a blocked thread.",
      "Designing I/O-heavy servers that must handle many concurrent connections on few cores.",
    ],
    whenNotToUse: [
      "Doing CPU-bound number crunching on the main thread -- offload to Workers/worker_threads.",
      "Relying on the loop for precise real-time timing guarantees.",
      "Assuming it removes the need to think about long synchronous work -- it does not.",
    ],

    code: [
      {
        label: "Ordering: sync, then microtasks, then tasks",
        language: "javascript",
        code: `console.log("1: sync start");

setTimeout(() => console.log("4: timer task"), 0);   // task queue

Promise.resolve().then(() => console.log("3: promise microtask")); // microtask

console.log("2: sync end");

// Output order:
// 1: sync start
// 2: sync end          (all synchronous code first)
// 3: promise microtask (entire microtask queue drains next)
// 4: timer task        (one task, even with 0ms, runs last)`,
      },
      {
        label: "await is microtask scheduling, not blocking",
        language: "javascript",
        code: `async function demo() {
  console.log("A");
  await null;               // suspends; the rest becomes a microtask continuation
  console.log("C");         // runs after the current stack + as a microtask
}

console.log("start");
demo();
console.log("B");           // runs before C, because await yielded control

// Output: start, A, B, C
// The thread was never blocked; await handed control back to the loop.`,
      },
      {
        label: "Blocking the loop vs yielding to it",
        language: "javascript",
        code: `// BAD: a tight synchronous loop holds the single thread; timers/I/O/UI stall.
function blockingSum(n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += i;   // nothing else can run meanwhile
  return total;
}

// BETTER: chunk the work and yield to the loop so other tasks can run.
async function chunkedSum(n, chunk = 1_000_000) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += i;
    if (i % chunk === 0) {
      // Yield a macrotask so timers, I/O callbacks, and rendering can proceed.
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return total;
}
// For real CPU-bound work, prefer a Worker/worker_thread over chunking.`,
      },
    ],

    memoryCard: {
      problem: "Let a single thread handle massive I/O concurrency without blocking, while keeping async callback order predictable.",
      mentalModel: "One worker with two inboxes: drain the whole microtask inbox (Promises) between taking single items from the task inbox (timers/I/O). Slow work is handed to helpers who drop callbacks in the inboxes.",
      keyConcepts: ["single-threaded call stack", "task vs microtask queue", "microtasks drain fully between tasks", "await = microtask continuation", "blocking freezes everything", "concurrency not parallelism"],
      productionConnection: "Never do heavy CPU on the loop (it stalls all requests/UI); offload to worker_threads/Workers; setTimeout is a floor not a guarantee; watch for microtask starvation.",
      oneLiner: "The event loop runs the stack, drains all microtasks, then takes one task -- giving one thread huge I/O concurrency, as long as you never block it.",
    },

    quiz: [
      {
        id: "jel-q1",
        prompt: "What is the output order of: console.log('A'); setTimeout(()=>console.log('B'),0); Promise.resolve().then(()=>console.log('C')); console.log('D');",
        choices: [
          { text: "A, B, C, D", correct: false },
          { text: "A, D, C, B", correct: true },
          { text: "A, D, B, C", correct: false },
          { text: "A, C, D, B", correct: false },
        ],
        explanation:
          "Synchronous code runs first (A, D). Then the entire microtask queue drains (C, the Promise callback). Only then is one task taken from the task queue (B, the timer) -- even with a 0ms delay, because tasks run after microtasks.",
      },
      {
        id: "jel-q2",
        prompt: "On a Node server, why does one request doing a large synchronous JSON.parse slow down ALL other requests?",
        choices: [
          { text: "JSON.parse locks a database", correct: false },
          { text: "It holds the single event-loop thread, so no other tasks, microtasks, or I/O callbacks can run until it finishes", correct: true },
          { text: "Node spawns a thread per parse and runs out", correct: false },
          { text: "It triggers garbage collection for every request", correct: false },
        ],
        explanation:
          "JavaScript is single-threaded. A long synchronous operation occupies the call stack, so the loop cannot process any other request's callbacks until it completes. Heavy CPU work must be offloaded to worker_threads or a background job.",
      },
      {
        id: "jel-q3",
        prompt: "What does `await somePromise` actually do to the thread?",
        choices: [
          { text: "Blocks the thread until the promise resolves", correct: false },
          { text: "Suspends the function and schedules the code after it as a microtask continuation, yielding control back to the event loop", correct: true },
          { text: "Spawns a new thread to wait", correct: false },
          { text: "Converts the function to run in parallel", correct: false },
        ],
        explanation:
          "await does not block. It pauses the async function, returns control to the loop so other work runs, and resumes the remainder as a microtask once the awaited promise settles -- single-threaded cooperative concurrency.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Prove the queue ordering and unblock the loop",
      brief: "Demonstrate microtask-vs-task priority, then show and fix a blocked event loop.",
      steps: `1. Write a script mixing console.log, setTimeout(0), Promise.resolve().then, and queueMicrotask; predict the output, then run it and confirm the sync -> microtask -> task order.\n2. Add an async function with an await between logs and confirm the post-await code runs as a microtask (after surrounding sync code).\n3. Write a tight synchronous loop and, alongside it, a setTimeout that should fire 'soon'; observe the timer is delayed until the loop finishes (the loop is blocked).\n4. Rewrite the loop to yield periodically (await a setTimeout(0)) and confirm the timer/I/O now interleaves.\n5. In one sentence, explain why the fix works in terms of tasks and the single thread.`,
      successCriteria: [
        "You correctly predict and explain sync -> microtask -> task ordering",
        "You show await scheduling a microtask continuation without blocking",
        "You reproduce a blocked loop delaying a timer",
        "You unblock it by yielding to the loop (or note a Worker as the real fix)",
      ],
    },
  },

  {
    slug: "ts-type-system",
    title: "The TypeScript Type System",
    track: "typescript",
    phase: "js-ts",
    module: "ts-core",
    difficulty: "core",
    estMinutes: 30,
    summary:
      "A structural, compile-time type layer over JavaScript -- how it catches bugs before runtime, narrows types with control flow, and why 'types are erased' is the fact that governs everything.",
    prerequisites: [],
    relatedConcepts: ["ts-async-patterns", "python-typing", "js-event-loop"],
    tags: ["typescript", "types", "structural-typing", "narrowing", "generics", "type-erasure"],

    why: `JavaScript will happily let you call \`.toUpperCase()\` on \`undefined\`, add a number to an object, or misspell a property -- and only tell you at runtime, in production. **TypeScript adds a compile-time type layer that catches these errors before the code ever runs, while compiling down to plain JavaScript that browsers and Node execute unchanged.**

The payoff is enormous on any codebase past trivial size: refactors become safe (rename a field and every misuse lights up), APIs become self-documenting, and whole categories of bugs (null access, wrong shapes, typos) disappear before review. But TypeScript has one defining characteristic that explains its power and its limits: **types exist only at compile time and are completely erased at runtime.** Internalize that and everything -- from why you still need runtime validation to how narrowing works -- follows logically.`,

    intuition: `TypeScript is a **spell-checker and contract-checker that reads your whole program before you run it, then disappears.**

- You describe the shapes data should have (\`{ id: number; name: string }\`).
- The compiler traces those shapes through every function and flags mismatches -- a \`string\` where a \`number\` was promised, a property that might be \`undefined\`, a typo'd field.
- Then it **strips all the types out** and emits ordinary JavaScript. At runtime, there is no TypeScript left -- no type checks, no enforcement.

And it is **structural, not nominal**: two types are compatible if they have the same shape, regardless of their names -- 'if it has the shape of a Duck, it is a Duck.' This matches JavaScript's duck-typed nature and is why TypeScript feels flexible rather than bureaucratic.`,

    howItWorks: `### The core building blocks
- **Primitives & literals:** \`string\`, \`number\`, \`boolean\`, and literal types (\`"GET" | "POST"\`).
- **Objects & interfaces:** describe shapes; \`interface\` and \`type\` are largely interchangeable for objects.
- **Unions & intersections:** \`A | B\` (either) and \`A & B\` (both combined).
- **Optional / null:** \`prop?: T\` and \`T | undefined\`; with \`strictNullChecks\`, null/undefined are not silently assignable.
- **Generics:** parametric types, \`function first<T>(xs: T[]): T\`, for reusable, type-safe abstractions.

### Structural typing
Compatibility is by shape. A value with \`{ id: number; name: string; extra: boolean }\` is assignable to \`{ id: number; name: string }\` -- it has at least the required members. Names do not matter; structure does.

### Narrowing (control-flow analysis)
The compiler tracks how checks refine a type within a branch:
\`\`\`ts
function f(x: string | number) {
  if (typeof x === "string") {
    x.toUpperCase();   // x is narrowed to string here
  } else {
    x.toFixed(2);      // x is number here
  }
}
\`\`\`
\`typeof\`, \`instanceof\`, truthiness, \`in\`, and equality checks all narrow. Discriminated unions (a shared literal 'tag' field) make this precise and exhaustive.

### Erasure and compilation
\`tsc\` type-checks, then emits JavaScript with all type annotations removed. The runtime behavior is identical to hand-written JS -- types never affect execution.`,

    internals: `**Type erasure is the master fact.** Because types vanish at compile time, you cannot check them at runtime the way you check values. \`if (x is User)\` does not exist; you check *properties* (\`if ("email" in x)\`) or use a **user-defined type guard** (\`function isUser(x): x is User\`). Crucially, TypeScript cannot protect you from data arriving at runtime in the wrong shape -- an API returning unexpected JSON typed as \`User\` will happily crash later. **You still need runtime validation (zod, io-ts) at trust boundaries.**

**Structural typing has surprising edges.** Excess-property checks fire on object literals assigned directly (to catch typos) but not on values passed through variables -- a deliberate looseness. And two unrelated interfaces with identical shapes are interchangeable, which is powerful but can let a 'Meters' number stand in for a 'Dollars' number unless you use branded types.

**\`any\` vs \`unknown\` is a safety fork.** \`any\` disables checking and is contagious -- it silently spreads and defeats the whole point. \`unknown\` is the safe top type: you can hold anything but must narrow before using it. Prefer \`unknown\` at boundaries and forbid \`any\` in strict codebases.

**Strict mode is where the value lives.** With \`strict\` (especially \`strictNullChecks\`), \`undefined\`/\`null\` must be handled explicitly -- eliminating the 'cannot read property of undefined' class of bugs. Non-strict TypeScript catches far less.

**Advanced tools are compile-time metaprogramming.** Conditional types, mapped types, and template literal types let you derive types from other types (e.g. \`Partial<T>\`, \`Record<K,V>\`). Powerful for library authors, but they are still erased -- pure compile-time computation with zero runtime footprint.`,

    diagram: {
      title: "Compile-time checking, runtime erasure",
      layers: [
        { id: "annot", label: "You annotate shapes", sub: "interfaces, unions, generics -- structural" },
        { id: "check", label: "tsc type-checks", sub: "traces shapes, narrows by control flow, flags mismatches" },
        { id: "narrow", label: "Narrowing", sub: "typeof/instanceof/in/guards refine types per branch" },
        { id: "erase", label: "Erasure -> plain JS", sub: "all types stripped; runtime behavior unchanged" },
        { id: "validate", label: "Runtime validation (zod)", sub: "needed at trust boundaries -- types cannot check runtime data" },
      ],
      caption: "TypeScript is a compile-time contract checker that disappears at runtime -- so untrusted data still needs real validation.",
    },

    realWorld: `A frontend types its API response as an interface and accesses \`response.user.email\` throughout. In production, a backend change occasionally returns \`user: null\`, and the app throws 'cannot read property email of null' -- because the type annotation was a *claim*, not a runtime check, and it was wrong. Two fixes combine: model the type honestly as \`User | null\` so the compiler forces null handling at every access, and validate the response at the boundary with zod so bad shapes are caught with a clear error instead of a deep crash. This is the quintessential TypeScript lesson: types catch *your* mistakes at compile time, but they do not validate *the world's* data at runtime.`,

    production: `- **Turn on strict mode** (especially strictNullChecks). It converts a huge share of runtime null/undefined crashes into compile errors.
- **Validate at trust boundaries with a runtime validator** (zod, io-ts) -- API responses, form input, config, message payloads. Types are erased and cannot check runtime data.
- **Ban \`any\`; prefer \`unknown\` at boundaries** and narrow explicitly. any is contagious and silently disables safety.
- **Model states with discriminated unions** ({ status: 'loading' } | { status: 'error'; error } | { status: 'ok'; data }) so impossible states are unrepresentable and switch handling is exhaustive.
- **Let inference work; annotate boundaries.** Over-annotating internals is noise; annotate public function signatures and exported types.
- **Use type guards and \`x is T\`** for runtime-shaped checks instead of pretending runtime type checks exist.
- **Treat type errors in CI as build failures**, and keep dependencies' types (@types / bundled) up to date.`,

    commonMistakes: [
      "Believing types are checked at runtime -- they are fully erased; wrong-shaped runtime data still crashes.",
      "Typing external data (API/JSON) as a concrete type without runtime validation, so bad shapes slip through.",
      "Using any to silence errors, which spreads and disables checking everywhere it flows.",
      "Running without strict/strictNullChecks and getting a fraction of the safety.",
      "Assuming nominal typing -- two identically-shaped types are interchangeable (structural), which can mix up semantically different values.",
      "Casting with `as` to force a type instead of narrowing or validating, hiding real mismatches.",
      "Over-annotating where inference is better, adding noise and drift.",
    ],

    tradeoffs: `| Aspect | TypeScript gives you | The cost |
|---|---|---|
| Compile-time checking | Bugs caught before runtime, safe refactors | Build step, annotation effort, learning curve |
| Structural typing | Flexible, matches JS duck typing | Identically-shaped types interchangeable (semantic mixups) |
| Erasure | Zero runtime overhead, plain JS output | No runtime type safety -- must validate boundaries |
| Strict mode | Kills null/undefined bug class | More upfront work handling nullability |
| Advanced types | Powerful reusable abstractions | Complexity; can become unreadable |

The essential trade: **compile-time safety and tooling for a build step and the discipline to remember types do not exist at runtime.**`,

    whenToUse: [
      "Any JavaScript codebase past trivial size -- especially team, long-lived, or refactor-heavy projects.",
      "Modeling domain state precisely (discriminated unions) to make illegal states unrepresentable.",
      "Library/API boundaries where self-documenting, checked contracts prevent misuse.",
    ],
    whenNotToUse: [
      "As a replacement for runtime validation of untrusted input (use zod/io-ts there).",
      "Tiny throwaway scripts where the build step is not worth it.",
      "Forcing extremely complex conditional/mapped types where a simpler design would do -- readability suffers.",
    ],

    code: [
      {
        label: "Narrowing and discriminated unions",
        language: "typescript",
        code: `type Result =
  | { status: "ok"; data: string }
  | { status: "error"; message: string };

function handle(r: Result): string {
  switch (r.status) {              // the 'status' literal discriminates the union
    case "ok":
      return r.data;              // narrowed: 'data' exists here
    case "error":
      return r.message;          // narrowed: 'message' exists here
  }
  // Exhaustiveness: if a new variant is added and unhandled, this errors.
  const _exhaustive: never = r;
  return _exhaustive;
}`,
      },
      {
        label: "Types are erased: validate untrusted data at runtime",
        language: "typescript",
        code: `interface User { id: number; email: string; }

// This is a CLAIM, not a check. If the API lies, it compiles but crashes later.
async function getUserUnsafe(): Promise<User> {
  const res = await fetch("/api/user");
  return (await res.json()) as User;   // 'as' asserts -- no runtime verification
}

// Safe: validate at the boundary (zod). The parsed value is typed AND checked.
import { z } from "zod";
const UserSchema = z.object({ id: z.number(), email: z.string().email() });

async function getUser(): Promise<z.infer<typeof UserSchema>> {
  const res = await fetch("/api/user");
  return UserSchema.parse(await res.json());  // throws a clear error on bad data
}`,
      },
      {
        label: "unknown vs any, and a user-defined type guard",
        language: "typescript",
        code: `// any disables checking (dangerous, contagious):
function bad(x: any) {
  x.foo.bar();          // compiles; may explode at runtime
}

// unknown forces you to narrow before use (safe):
function good(x: unknown) {
  // x.toUpperCase();   // error: Object is of type 'unknown'
  if (typeof x === "string") {
    return x.toUpperCase();   // narrowed to string
  }
}

// A type guard bridges runtime checks to compile-time narrowing:
interface Dog { bark(): void; }
function isDog(x: unknown): x is Dog {
  return typeof x === "object" && x !== null && "bark" in x;
}
function speak(x: unknown) {
  if (isDog(x)) x.bark();     // x is Dog inside this branch
}`,
      },
    ],

    memoryCard: {
      problem: "Catch shape/null/typo bugs in JavaScript before runtime and make large codebases safe to refactor -- without changing runtime behavior.",
      mentalModel: "A spell-checker and contract-checker that reads the whole program, flags mismatches by shape (structural typing), narrows types per branch, then erases itself into plain JavaScript.",
      keyConcepts: ["structural typing", "unions/intersections/generics", "narrowing (typeof/instanceof/in/guards)", "discriminated unions", "any vs unknown", "strict / strictNullChecks", "type erasure at runtime"],
      productionConnection: "Enable strict mode; validate untrusted data with zod/io-ts (types are erased); ban any; model state with discriminated unions; treat type errors as build failures.",
      oneLiner: "TypeScript is a structural, compile-time contract checker that catches bugs before runtime and then erases entirely -- so you still validate real data at the boundaries.",
    },

    quiz: [
      {
        id: "tts-q1",
        prompt: "You type an API response as `User` and access `.email`. In production it sometimes crashes with 'cannot read property email of null'. Why did TypeScript not prevent this?",
        choices: [
          { text: "TypeScript has a bug", correct: false },
          { text: "Types are erased at runtime and were merely an unchecked claim; the actual data violated the declared type and TS cannot validate runtime data", correct: true },
          { text: "The email field was misspelled", correct: false },
          { text: "You forgot to compile", correct: false },
        ],
        explanation:
          "A type annotation on external data is an assertion, not a runtime check. Types are erased when compiled to JavaScript, so if the real response differs from the declared shape, nothing catches it at runtime. Validate at the boundary (e.g. zod) and model nullability honestly.",
      },
      {
        id: "tts-q2",
        prompt: "What does it mean that TypeScript uses structural typing?",
        choices: [
          { text: "Types must be declared with the same name to be compatible", correct: false },
          { text: "Two types are compatible if they have the same shape (members), regardless of their declared names", correct: true },
          { text: "Only classes can be typed", correct: false },
          { text: "Types are checked at runtime by structure", correct: false },
        ],
        explanation:
          "Compatibility is determined by structure, not name. A value is assignable to a type if it has at least the required members. This matches JavaScript's duck typing and is why differently-named but identically-shaped types are interchangeable.",
      },
      {
        id: "tts-q3",
        prompt: "Why prefer `unknown` over `any` for a value of uncertain type?",
        choices: [
          { text: "unknown is faster at runtime", correct: false },
          { text: "unknown forces you to narrow (check) the type before using it, whereas any disables all checking and spreads silently", correct: true },
          { text: "any cannot hold objects", correct: false },
          { text: "There is no difference", correct: false },
        ],
        explanation:
          "any opts out of type checking entirely and is contagious, defeating the point of TypeScript. unknown can hold any value but requires narrowing (typeof, guards) before you operate on it, preserving safety at trust boundaries.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Make the compiler catch real bugs",
      brief: "Use strict mode, narrowing, and boundary validation to turn runtime crashes into compile errors -- and see where types stop.",
      steps: `1. Enable strict (or at least strictNullChecks) in tsconfig; annotate a value as X | null and confirm the compiler forces a null check before use.\n2. Build a discriminated union (status: 'loading' | 'error' | 'ok') and write an exhaustive switch with a never assignment; add a variant and watch the compiler flag the unhandled case.\n3. Type an external JSON value with \`as\` and show it compiles despite wrong data; then replace it with a zod schema and show it throws on bad input.\n4. Replace an \`any\` with \`unknown\` and add a user-defined type guard to narrow it safely.\n5. Write one sentence explaining, using the word 'erasure', why step 3's zod is necessary.`,
      successCriteria: [
        "strictNullChecks forces handling of null/undefined at compile time",
        "An exhaustive discriminated-union switch flags a new unhandled variant",
        "zod validation catches bad runtime data that the type annotation did not",
        "unknown + a type guard replaces an unsafe any",
      ],
    },
  },

  {
    slug: "ts-async-patterns",
    title: "TypeScript Async Patterns",
    track: "typescript",
    phase: "js-ts",
    module: "ts-core",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "Composing asynchronous work correctly and type-safely -- Promises, async/await, concurrency with Promise.all/allSettled/race, error handling, cancellation, and the sequential-vs-parallel traps.",
    prerequisites: ["js-event-loop", "ts-type-system"],
    relatedConcepts: ["js-event-loop", "ts-type-system", "node-streams", "python-async-await"],
    tags: ["typescript", "async", "promises", "concurrency", "error-handling", "cancellation"],

    why: `Almost everything a real app does is asynchronous -- fetch data, query a database, call another service, read a file. Doing this *correctly* is where most subtle bugs live: forgotten awaits, sequential calls that should have been parallel, one failure taking down a whole batch, promises that never resolve, and errors that silently vanish. **Mastering async patterns is what separates code that works in the demo from code that is fast, resilient, and debuggable under real load.**

TypeScript adds a second dimension: the types must flow correctly through async boundaries (\`Promise<T>\`, awaited values, error types) or you lose the safety you adopted TypeScript for. This lesson is about writing async code that is both *correct in behavior* and *sound in types* -- the combination that production demands.`,

    intuition: `A Promise is an **IOU for a value that is not ready yet.** It is in one of three states: pending (still working), fulfilled (here is your value), or rejected (it failed). \`await\` is 'wait for this IOU to be paid, then hand me the value -- and if it failed, throw.'

The key mental split is **sequential vs concurrent**:

- \`await a(); await b();\` is like mailing one letter, waiting for the reply, *then* mailing the next -- fine if b depends on a, wasteful if they are independent.
- \`await Promise.all([a(), b()])\` is mailing both letters at once and waiting for both replies -- the total wait is the *slowest* one, not the sum.

The most common async performance bug is awaiting independent operations one after another (accidental sequential) when they could all be in flight together (concurrent). Recognizing which you have is the core skill.`,

    howItWorks: `### async/await over Promises
An \`async\` function always returns a \`Promise<T>\`. \`await\` unwraps a \`Promise<T>\` into \`T\` (or throws on rejection). \`try/catch\` around \`await\` handles rejections like synchronous exceptions.

### The concurrency combinators
- **Promise.all([...])** -- run all concurrently; resolves with an array of results; **rejects immediately if any one rejects** (fail-fast). Use when you need every result and want to abort on first failure.
- **Promise.allSettled([...])** -- run all concurrently; always resolves with a per-item \`{status, value|reason}\`; nothing is lost to one failure. Use for batch jobs where partial success is acceptable.
- **Promise.race([...])** -- resolves/rejects with the *first* to settle. Used for timeouts and 'fastest wins.'
- **Promise.any([...])** -- resolves with the first *fulfilled* (ignores rejections until all fail).

### Sequential vs parallel
\`\`\`ts
// Sequential (slow if independent): total = a + b + c
const x = await getA(); const y = await getB(); const z = await getC();

// Concurrent (fast): total = max(a, b, c)
const [x, y, z] = await Promise.all([getA(), getB(), getC()]);
\`\`\`

### Typing async
\`Promise.all\` preserves a *tuple* of types, so \`[x, y, z]\` are individually typed. Errors, however, are typed \`unknown\` in \`catch\` (you must narrow). Model expected failures in the return type (a Result union) rather than only throwing.`,

    internals: `**A forgotten await is a silent, dangerous bug.** Omitting \`await\` on a Promise-returning call means the code continues before the work finishes; the returned Promise (and any error inside it) is dropped. In TypeScript, \`no-floating-promises\` lint catches this -- essential, because an unhandled rejection can crash Node or silently lose data. Returning a Promise from a function you forgot to await also breaks error propagation.

**Fail-fast vs partial success is a design decision, not a default.** \`Promise.all\` rejecting on the first failure is correct when results are interdependent, but catastrophic for a batch of independent tasks where you wanted the successes -- there, \`allSettled\` is right. Choosing wrong turns one flaky item into a total failure (or hides failures you needed to see).

**Cancellation is not built into Promises.** A Promise cannot be cancelled once started; the ecosystem uses \`AbortController\`/\`AbortSignal\` to *signal* cancellation to abort-aware APIs (fetch, many libraries). Without it, a 'cancelled' request still runs to completion in the background, wasting resources. Timeouts are typically \`Promise.race\` against a timer that aborts the signal.

**Unbounded concurrency exhausts resources.** \`Promise.all(items.map(fetchThing))\` over thousands of items opens thousands of simultaneous connections, exhausting sockets, memory, or downstream pools. Production code bounds concurrency (a pool/semaphore, e.g. p-limit) to a safe width.

**Errors are \`unknown\` in catch (with useUnknownInCatchVariables).** You cannot assume \`err.message\` exists; narrow first (\`err instanceof Error\`). Sound async error handling requires this discipline, or you reintroduce the any-style unsafety TypeScript removed.

**await in a loop is often the accidental-sequential trap.** \`for (const x of xs) { await f(x); }\` runs strictly one at a time. If order/dependency does not require it, collect the promises and \`Promise.all\` (bounded) them instead.`,

    diagram: {
      title: "Sequential vs concurrent, and how failures compose",
      layers: [
        { id: "promise", label: "Promise<T>", sub: "pending -> fulfilled(T) | rejected; await unwraps or throws" },
        { id: "seq", label: "Sequential await", sub: "a then b then c -- total = sum (only if dependent)" },
        { id: "all", label: "Promise.all", sub: "concurrent, tuple-typed, fail-fast on first rejection" },
        { id: "settled", label: "Promise.allSettled / any / race", sub: "partial success / first success / first settle (timeouts)" },
        { id: "control", label: "AbortSignal + bounded pool", sub: "cancellation and capped concurrency for resilience" },
      ],
      caption: "Pick the combinator by your failure and dependency needs; bound concurrency and support cancellation for production resilience.",
    },

    realWorld: `A dashboard loads six independent widgets, each fetching from a different endpoint, with \`await\` on each in sequence -- so it takes the *sum* of six round trips and feels sluggish. Switching to \`Promise.all\` fires all six concurrently, cutting load time to the slowest single request. But then one flaky endpoint starts failing and \`Promise.all\`'s fail-fast behavior blanks the *entire* dashboard -- so the team moves to \`Promise.allSettled\`, rendering the five that succeeded and showing an inline error for the one that failed. Finally, they add per-request timeouts via \`AbortController\` so a hung endpoint cannot stall the whole page. Three patterns, three real improvements -- all invisible in a naive first version.`,

    production: `- **Parallelize independent work with Promise.all; keep sequential only for true dependencies.** The accidental-sequential loop is the most common async slowness.
- **Choose all vs allSettled deliberately:** fail-fast for interdependent results, allSettled for batch/partial-success workloads so one bad item does not sink the rest.
- **Bound concurrency** (p-limit / a semaphore) for large fan-outs; unbounded Promise.all over thousands of items exhausts sockets and downstream pools.
- **Always support timeouts and cancellation** via AbortController/AbortSignal; a hung upstream must not pin resources forever.
- **Never leave floating promises.** Enable no-floating-promises; await or explicitly handle every Promise so errors propagate and data is not lost.
- **Narrow errors (unknown) before use** (err instanceof Error); model expected failures in the return type (Result union) rather than relying solely on throws.
- **Return early with typed error results** for expected conditions; reserve throwing for exceptional cases.`,

    commonMistakes: [
      "Awaiting independent operations sequentially instead of running them concurrently with Promise.all -- summing latencies needlessly.",
      "Using Promise.all for a batch of independent tasks, so one failure aborts all the successful ones (should be allSettled).",
      "Forgetting await, so code proceeds early and the promise's errors are silently dropped (floating promise).",
      "Unbounded Promise.all over thousands of items, exhausting connections/memory/downstream pools.",
      "No timeout or cancellation, so a hung request stalls the operation indefinitely.",
      "Treating the catch error as a known type (err.message) without narrowing unknown.",
      "await inside a loop for independent work (accidental sequential) when a bounded Promise.all would be far faster.",
    ],

    tradeoffs: `| Combinator | Behavior | Use when | Watch out for |
|---|---|---|---|
| await sequentially | one after another | b depends on a | sums latency if independent |
| Promise.all | concurrent, fail-fast | need all results, abort on error | one failure kills the batch |
| Promise.allSettled | concurrent, never rejects | batch with partial success | must inspect each status |
| Promise.race | first to settle wins | timeouts, fastest-wins | losers still run unless aborted |
| Promise.any | first success wins | redundant sources | ignores errors until all fail |

The recurring trade: **speed (concurrency) vs resource safety (bounded, cancellable) vs failure semantics (fail-fast vs partial).**`,

    whenToUse: [
      "Fetching multiple independent resources -> Promise.all (or bounded pool) for concurrency.",
      "Batch/fan-out where partial success is acceptable -> Promise.allSettled.",
      "Enforcing timeouts or 'first response wins' -> Promise.race / Promise.any with AbortController.",
      "Any I/O that could hang -> add cancellation via AbortSignal.",
    ],
    whenNotToUse: [
      "Promise.all when tasks are independent and you need the successes despite failures (use allSettled).",
      "Unbounded concurrency for very large collections (bound it with a pool/semaphore).",
      "Sequential await when operations are independent (it needlessly serializes).",
      "Throwing for routine, expected outcomes where a typed Result union is clearer.",
    ],

    code: [
      {
        label: "Sequential vs concurrent, with preserved tuple types",
        language: "typescript",
        code: `declare function getUser(): Promise<{ id: number }>;
declare function getPosts(): Promise<string[]>;
declare function getStats(): Promise<{ views: number }>;

// SLOW: independent calls awaited one-by-one -> sum of three round trips.
async function slow() {
  const user = await getUser();
  const posts = await getPosts();
  const stats = await getStats();
  return { user, posts, stats };
}

// FAST: concurrent -> total is the slowest single call. Types are preserved:
// user: {id:number}, posts: string[], stats: {views:number}
async function fast() {
  const [user, posts, stats] = await Promise.all([
    getUser(), getPosts(), getStats(),
  ]);
  return { user, posts, stats };
}`,
      },
      {
        label: "allSettled for partial success + typed error narrowing",
        language: "typescript",
        code: `async function loadWidgets(urls: string[]) {
  const results = await Promise.allSettled(urls.map((u) => fetch(u)));

  const ok: Response[] = [];
  const failed: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      ok.push(r.value);                 // narrowed to fulfilled
    } else {
      // reason is 'unknown' -- narrow before use.
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      failed.push(\`\${urls[i]}: \${msg}\`);
    }
  }
  return { ok, failed };                // render successes, surface failures
}`,
      },
      {
        label: "Timeout + cancellation with AbortController, and a bounded pool",
        language: "typescript",
        code: `// Per-request timeout via AbortController: a hung upstream cannot pin us.
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });   // abort rejects the fetch
  } finally {
    clearTimeout(timer);
  }
}

// Bounded concurrency: never open thousands of sockets at once.
async function mapPool<T, R>(
  items: T[], width: number, fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: width }, worker));
  return results;
}`,
      },
    ],

    memoryCard: {
      problem: "Compose asynchronous work so it is fast (concurrent), resilient (handles failures, timeouts, cancellation), and type-safe across async boundaries.",
      mentalModel: "A Promise is an IOU (pending/fulfilled/rejected). Sequential await = mail one letter, wait, then the next (sum). Promise.all = mail all at once, wait for the slowest (max). Pick the combinator by your failure and dependency needs.",
      keyConcepts: ["Promise states & await", "sequential vs concurrent (sum vs max)", "all (fail-fast) vs allSettled (partial)", "race/any (timeouts, fastest)", "AbortController cancellation", "bounded concurrency", "errors are unknown in catch"],
      productionConnection: "Parallelize independent work; allSettled for batches; bound fan-out with a pool; add AbortSignal timeouts; forbid floating promises; narrow unknown errors.",
      oneLiner: "Run independent async work concurrently and choose combinators by failure semantics -- while bounding concurrency, supporting cancellation, and keeping types and errors sound.",
    },

    quiz: [
      {
        id: "tap-q1",
        prompt: "You have three independent API calls awaited one after another. What is the fix and its effect?",
        choices: [
          { text: "Nothing; sequential is required for correctness", correct: false },
          { text: "Run them with Promise.all so they execute concurrently, making total time the slowest single call instead of the sum", correct: true },
          { text: "Wrap each in a separate thread", correct: false },
          { text: "Use Promise.race to speed them up", correct: false },
        ],
        explanation:
          "Independent operations awaited sequentially sum their latencies. Promise.all fires them concurrently on the single-threaded event loop, so total time approaches the longest individual call. race would only give you the first to settle, not all results.",
      },
      {
        id: "tap-q2",
        prompt: "A batch job runs 100 independent tasks with Promise.all. One task fails. What happens, and what should you likely use instead?",
        choices: [
          { text: "Only the failed task is lost; use Promise.all again", correct: false },
          { text: "Promise.all rejects immediately (fail-fast), discarding the other results; use Promise.allSettled to keep the successes and record failures", correct: true },
          { text: "Promise.all retries the failed task automatically", correct: false },
          { text: "All tasks are cancelled and restarted", correct: false },
        ],
        explanation:
          "Promise.all is fail-fast: the first rejection rejects the whole thing, so successful results are not returned. For independent batch work where partial success matters, Promise.allSettled always resolves with per-item status so you keep successes and surface failures.",
      },
      {
        id: "tap-q3",
        prompt: "Why is a forgotten `await` on a Promise-returning call dangerous?",
        choices: [
          { text: "It makes the function synchronous", correct: false },
          { text: "Execution continues before the work finishes and the returned promise's errors are dropped (a floating promise), so failures vanish and data can be lost", correct: true },
          { text: "It doubles memory usage", correct: false },
          { text: "It has no effect", correct: false },
        ],
        explanation:
          "Without await, the code proceeds without waiting and nothing handles the promise's rejection, so errors are silently swallowed (and in Node can crash the process as an unhandled rejection). The no-floating-promises lint rule catches this.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Turn slow, fragile async into fast, resilient async",
      brief: "Refactor sequential calls to concurrent, choose the right failure semantics, and add timeouts, cancellation, and bounded concurrency.",
      steps: `1. Start with three independent async calls awaited sequentially; measure the time, then convert to Promise.all and confirm it drops to the slowest call while preserving each result's type.\n2. Make one call fail; observe Promise.all blanking everything, then switch to Promise.allSettled to keep successes and record the failure (narrowing the unknown reason).\n3. Add a per-call timeout using AbortController + Promise (or fetch signal); prove a hung call is aborted instead of hanging forever.\n4. Fan out over a large list and show unbounded Promise.all opening too many connections; replace it with a bounded pool (width N) and confirm at most N run at once.\n5. Enable/emulate no-floating-promises: introduce a missing await, see the error vanish, then fix it and confirm the error now propagates.`,
      successCriteria: [
        "Independent calls run concurrently (total approaches max, not sum) with types preserved",
        "allSettled yields partial success where all would have failed everything",
        "A hung call is cancelled via AbortController/timeout",
        "Large fan-out is bounded to a safe concurrency width",
        "A floating promise is identified and fixed so errors propagate",
      ],
    },
  },

  {
    slug: "node-streams",
    title: "Node.js Streams",
    track: "typescript",
    phase: "js-ts",
    module: "ts-core",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "Processing data piece-by-piece instead of all at once -- readable/writable/transform streams, backpressure, piping, and why streaming is how Node handles files and payloads bigger than memory.",
    prerequisites: ["js-event-loop", "ts-async-patterns"],
    relatedConcepts: ["js-event-loop", "ts-async-patterns", "concurrency-vs-parallelism"],
    tags: ["nodejs", "streams", "backpressure", "pipe", "transform", "memory", "io"],

    why: `The naive way to handle data -- read the whole file, transform it, write it out -- falls apart the moment the data is bigger than memory, or when you want results before the input finishes arriving. **Streams let Node process data in small chunks as it flows, using bounded memory regardless of total size, and starting work before all the input has arrived.**

This is not a niche optimization; it is how Node does I/O at scale. Serving a multi-gigabyte file, proxying an upload, parsing a huge CSV, compressing a response on the fly, piping a database export -- all of these must stream or they will OOM the process. And streams introduce the single most important concept in I/O plumbing: **backpressure**, the mechanism that stops a fast producer from overwhelming a slow consumer. Understanding streams is understanding how data actually moves through a Node service.`,

    intuition: `A stream is a **conveyor belt for data**, and the whole point is you never have to hold the entire load at once.

- A **Readable** stream is the source dropping items onto the belt (a file being read, an incoming HTTP request body).
- A **Writable** stream is the destination taking items off (a file being written, an HTTP response).
- A **Transform** stream sits on the belt and changes items as they pass (compress, encrypt, parse).
- **Piping** connects them: \`source.pipe(transform).pipe(destination)\`.

**Backpressure** is the belt's safety mechanism: if the destination cannot keep up, it signals 'slow down,' and the source pauses instead of piling data into memory. Without backpressure, a fast reader feeding a slow writer would buffer everything -- exactly the OOM you were trying to avoid. Piping handles backpressure for you automatically; doing it manually is where bugs creep in.`,

    howItWorks: `### The four stream types
- **Readable:** produces data (fs.createReadStream, an HTTP request, process.stdin). Emits 'data' chunks (or is read via async iteration).
- **Writable:** consumes data (fs.createWriteStream, an HTTP response, process.stdout). \`write()\` returns \`false\` when its buffer is full.
- **Duplex:** both readable and writable (a TCP socket).
- **Transform:** a duplex that maps input chunks to output chunks (zlib.createGzip, a parser).

### Piping and backpressure
\`\`\`ts
readable.pipe(transform).pipe(writable);
\`\`\`
\`pipe\` wires them and manages **backpressure**: when the writable's internal buffer fills (write() returns false), pipe **pauses** the readable until the writable drains, then resumes. Memory stays bounded to the buffer size (the 'highWaterMark'), no matter how big the source is.

### The modern, safe way: pipeline
\`stream.pipeline(a, b, c, cb)\` (or the promise form) pipes *and* propagates errors and cleans up all streams if any fails -- fixing the classic bug where a plain \`.pipe()\` chain leaks resources on error.
\`\`\`ts
import { pipeline } from "node:stream/promises";
await pipeline(readStream, gzip, writeStream);
\`\`\`

### Async iteration
Modern Node lets you consume a readable with \`for await (const chunk of readable)\`, giving natural, backpressure-respecting, try/catch-friendly code.`,

    internals: `**Backpressure is the load-bearing concept.** Each stream has an internal buffer bounded by \`highWaterMark\`. \`writable.write(chunk)\` returns \`false\` when the buffer exceeds that threshold; a correct producer must then *stop* and wait for the \`'drain'\` event before writing more. \`pipe\`/\`pipeline\` implement exactly this handshake. Ignore it -- e.g. writing in a tight loop without checking the return value -- and Node buffers unboundedly in memory, defeating streaming and risking OOM.

**Object mode vs binary mode.** By default streams carry Buffers/strings (byte chunks). In \`objectMode\`, each item is an arbitrary object -- useful for record pipelines (parse CSV -> objects -> transform -> DB). The highWaterMark then counts objects, not bytes.

**Chunk boundaries are arbitrary.** A readable does not respect logical boundaries: a line, JSON object, or multibyte character can be split across two chunks. Naive per-chunk parsing corrupts data; you need a Transform that buffers partial data across chunks (or a proper parser). This is a frequent, subtle bug.

**Errors do not propagate through plain pipe().** \`a.pipe(b).pipe(c)\` does not forward errors or destroy upstream streams on failure, leaking file descriptors and sockets. \`stream.pipeline\` was added precisely to propagate errors and destroy every stream on failure -- it should be the default choice.

**Streams sit on the event loop.** Chunk processing is scheduled as I/O/callbacks; a slow synchronous transform still blocks the single thread (see the event loop). Keep per-chunk work light or offload heavy CPU transforms to worker_threads.

**Web Streams vs Node streams.** Node now also supports the WHATWG Web Streams API (ReadableStream/WritableStream/TransformStream) for cross-runtime compatibility (browsers, Deno, edge). Same concepts -- chunks, backpressure, transforms -- different API surface.`,

    diagram: {
      title: "Data flows in bounded chunks with backpressure",
      layers: [
        { id: "read", label: "Readable (source)", sub: "file/request/stdin -> emits chunks, bounded buffer" },
        { id: "transform", label: "Transform", sub: "gzip/parse/encrypt each chunk as it passes" },
        { id: "write", label: "Writable (sink)", sub: "file/response -> write() returns false when full" },
        { id: "backpressure", label: "Backpressure", sub: "sink says 'slow down'; source pauses -> memory stays bounded" },
        { id: "pipeline", label: "stream.pipeline", sub: "pipes + propagates errors + destroys all on failure" },
      ],
      caption: "Streaming processes data larger than memory by moving bounded chunks; backpressure keeps a fast source from drowning a slow sink.",
    },

    realWorld: `An endpoint exports a large database table as CSV by building the entire result in a string and sending it at the end. It works in staging with small tables and OOM-kills the process in production with millions of rows -- the whole export lived in memory at once. The fix is a streaming pipeline: a readable query cursor -> a Transform that formats each row as CSV -> the HTTP response, wired with \`stream.pipeline\`. Memory now stays flat regardless of table size, the client starts receiving bytes immediately (better time-to-first-byte), and backpressure means a slow client naturally throttles the database read instead of buffering gigabytes. Same feature, constant memory -- the defining win of streaming.`,

    production: `- **Stream anything potentially large:** file serving/uploads, DB exports, big payloads, log processing. Never buffer an unbounded body fully into memory.
- **Use stream.pipeline (promise form), not raw .pipe() chains**, so errors propagate and every stream is destroyed on failure (no leaked file descriptors/sockets).
- **Respect backpressure.** Rely on pipe/pipeline; if writing manually, honor write()'s false return and the 'drain' event. Never write in a tight loop ignoring the return value.
- **Handle chunk boundaries correctly.** Do not assume a chunk equals a logical unit; buffer partial data across chunks or use a real parser.
- **Keep per-chunk work light and non-blocking**; offload heavy CPU transforms to worker_threads so a slow transform does not stall the event loop.
- **Set timeouts and handle client disconnects** on network streams; a slow/dead consumer must not pin resources forever.
- **Consider objectMode for record pipelines** and Web Streams when you need cross-runtime portability.`,

    commonMistakes: [
      "Reading an entire large file/payload into memory instead of streaming it, causing OOM at scale.",
      "Ignoring backpressure -- writing in a loop without checking write()'s return, buffering unboundedly.",
      "Using plain .pipe() chains that do not propagate errors, leaking file descriptors/sockets on failure (use pipeline).",
      "Assuming each chunk is a complete logical unit (line/JSON/char), corrupting data split across chunk boundaries.",
      "Doing heavy synchronous CPU work in a Transform, blocking the single event-loop thread.",
      "Forgetting to handle stream 'error' events, causing unhandled exceptions or silent hangs.",
      "Not handling client disconnects/timeouts on network streams, pinning resources.",
    ],

    tradeoffs: `| Approach | Benefit | Cost |
|---|---|---|
| Buffer whole payload | Simple code, random access to full data | Memory grows with size -> OOM; high time-to-first-byte |
| Streaming (chunks) | Bounded memory, early output, backpressure | More complex; must handle boundaries, errors, backpressure |
| Raw .pipe() | Terse | No error propagation / cleanup on failure |
| stream.pipeline | Errors + cleanup handled | Slightly more ceremony |
| objectMode | Natural record pipelines | Per-object overhead vs raw bytes |

The core trade: **simplicity of buffering everything vs the bounded-memory, early-output scalability of streaming -- at the cost of handling backpressure, boundaries, and errors correctly.**`,

    whenToUse: [
      "Any data that may exceed memory: file serving/uploads, DB exports, large HTTP bodies, log/CSV processing.",
      "On-the-fly transforms: compression, encryption, parsing, transcoding as data flows.",
      "When you want to start producing output before all input has arrived (low time-to-first-byte).",
      "Connecting a fast producer to a slower consumer where backpressure must throttle the source.",
    ],
    whenNotToUse: [
      "Small payloads that comfortably fit in memory, where buffering is simpler and fast enough.",
      "When you need random access to the whole dataset at once (streaming is sequential).",
      "Heavy CPU-bound transforms on the main thread without offloading (they block the event loop).",
    ],

    code: [
      {
        label: "Stream + transform with pipeline (errors handled, memory bounded)",
        language: "typescript",
        code: `import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";

// Gzip a file of ANY size using constant memory. pipeline propagates errors
// and destroys every stream if any step fails (no leaked file descriptors).
async function gzipFile(src: string, dest: string): Promise<void> {
  await pipeline(
    createReadStream(src),   // Readable: source in bounded chunks
    createGzip(),            // Transform: compress each chunk as it passes
    createWriteStream(dest), // Writable: sink; backpressure throttles the source
  );
}`,
      },
      {
        label: "Consume a readable safely with async iteration",
        language: "typescript",
        code: `import { createReadStream } from "node:fs";

// for-await respects backpressure and integrates with try/catch.
async function countBytes(path: string): Promise<number> {
  let total = 0;
  const stream = createReadStream(path, { highWaterMark: 64 * 1024 });
  try {
    for await (const chunk of stream) {   // one bounded chunk at a time
      total += (chunk as Buffer).length;
    }
  } catch (err) {
    // stream errors surface here instead of as unhandled 'error' events
    throw err;
  }
  return total;
}`,
      },
      {
        label: "A Transform that respects chunk boundaries (line splitting)",
        language: "typescript",
        code: `import { Transform } from "node:stream";

// Chunks do NOT align with lines; a line can be split across two chunks.
// Buffer the partial remainder across chunks instead of parsing per-chunk.
function splitLines(): Transform {
  let remainder = "";
  return new Transform({
    readableObjectMode: true,          // emit line strings, not bytes
    transform(chunk, _enc, cb) {
      const text = remainder + chunk.toString("utf8");
      const lines = text.split("\\n");
      remainder = lines.pop() ?? "";   // keep the incomplete last piece
      for (const line of lines) this.push(line);
      cb();
    },
    flush(cb) {                         // emit whatever is left at the end
      if (remainder) this.push(remainder);
      cb();
    },
  });
}`,
      },
    ],

    memoryCard: {
      problem: "Process data larger than memory (or arriving over time) without buffering it all -- and stop a fast producer from overwhelming a slow consumer.",
      mentalModel: "A conveyor belt: Readable drops chunks on, Transform changes them mid-belt, Writable takes them off. Backpressure lets the sink say 'slow down' so the belt never piles up in memory.",
      keyConcepts: ["Readable/Writable/Duplex/Transform", "piping", "backpressure (write() false + drain)", "stream.pipeline for errors+cleanup", "chunk boundaries are arbitrary", "objectMode", "async iteration"],
      productionConnection: "Stream files/exports/large bodies for constant memory; use pipeline (not raw pipe) so errors propagate; respect backpressure; handle chunk boundaries; keep transforms non-blocking.",
      oneLiner: "Streams move data in bounded chunks with backpressure, letting Node handle payloads bigger than memory -- use stream.pipeline so errors and cleanup are handled correctly.",
    },

    quiz: [
      {
        id: "ns-q1",
        prompt: "An endpoint builds a huge DB export as one big string then sends it, and OOMs in production. What is the streaming fix and its main benefit?",
        choices: [
          { text: "Increase the server's memory limit", correct: false },
          { text: "Pipe a row-producing readable through a Transform into the response so memory stays bounded regardless of dataset size", correct: true },
          { text: "Compress the string before sending", correct: false },
          { text: "Use Promise.all over the rows", correct: false },
        ],
        explanation:
          "Buffering the entire export holds it all in memory at once. Streaming the query through a Transform to the response processes bounded chunks, keeping memory flat no matter how large the table, and also improves time-to-first-byte.",
      },
      {
        id: "ns-q2",
        prompt: "What problem does backpressure solve, and how does pipe/pipeline implement it?",
        choices: [
          { text: "It encrypts data in transit", correct: false },
          { text: "It prevents a fast source from overwhelming a slow sink: when write() returns false, the readable is paused until the writable drains, keeping memory bounded", correct: true },
          { text: "It retries failed chunks automatically", correct: false },
          { text: "It parallelizes the stream across cores", correct: false },
        ],
        explanation:
          "Backpressure stops unbounded buffering. When the writable's buffer is full (write() returns false), pipe/pipeline pauses the readable and resumes it on the 'drain' event, so total memory stays near the highWaterMark rather than growing with the data.",
      },
      {
        id: "ns-q3",
        prompt: "Why prefer stream.pipeline over a raw a.pipe(b).pipe(c) chain?",
        choices: [
          { text: "pipeline is faster at copying bytes", correct: false },
          { text: "pipeline propagates errors and destroys all streams on failure, whereas raw .pipe() does not, leaking file descriptors/sockets on error", correct: true },
          { text: "pipeline enables parallelism", correct: false },
          { text: "There is no difference", correct: false },
        ],
        explanation:
          "Plain .pipe() does not forward errors or clean up upstream streams when one fails, leaking resources. stream.pipeline was designed to propagate errors and destroy every stream in the chain on failure, making it the safe default.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Build a memory-bounded streaming pipeline",
      brief: "Prove that streaming keeps memory flat, demonstrate backpressure, and handle errors and chunk boundaries correctly.",
      steps: `1. Generate a large file (hundreds of MB). Read it fully into memory and observe RSS spike; then process it with a stream and observe memory stays flat.\n2. Build a pipeline: createReadStream -> createGzip -> createWriteStream using stream.pipeline (promise form); confirm it compresses a file larger than memory.\n3. Introduce an error mid-pipeline (e.g. an unwritable destination) and show pipeline rejects and cleans up, versus a raw .pipe() chain that leaks/hangs.\n4. Write a Transform that splits lines and prove it handles a line split across two chunk boundaries (buffer the remainder).\n5. Demonstrate backpressure: pipe to a deliberately slow writable and observe the readable pausing (memory stays bounded) instead of buffering everything.`,
      successCriteria: [
        "Streaming processes a file larger than available memory with flat RSS",
        "A pipeline compresses via a Transform using stream.pipeline",
        "An error propagates and cleans up (pipeline) where raw pipe would leak",
        "A Transform correctly handles data split across chunk boundaries",
        "Backpressure is observed throttling the source to a slow sink",
      ],
    },
  },
];
