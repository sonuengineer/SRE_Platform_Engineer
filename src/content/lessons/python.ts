import type { Lesson } from "../types";

export const pythonLessons: Lesson[] = [
  {
    slug: "python-data-model",
    title: "The Python Data Model",
    track: "python",
    phase: "python",
    module: "python-core",
    difficulty: "core",
    estMinutes: 28,
    summary:
      "The protocol layer that makes Python feel consistent -- dunder methods, everything-is-an-object, and how len(), for-loops, with, and + all dispatch to methods you can implement yourself.",
    prerequisites: [],
    relatedConcepts: ["python-typing", "python-async-await", "memory-stack-heap"],
    tags: ["python", "data-model", "dunder", "protocols", "objects", "iterators"],

    why: `Python looks like it has magic syntax -- \`len(x)\`, \`for i in x\`, \`a + b\`, \`with x:\`, \`x[key]\` -- but there is no magic. **Every piece of syntax is defined by a protocol: a set of special ('dunder') methods your objects can implement.** \`len(x)\` calls \`x.__len__()\`; \`a + b\` calls \`a.__add__(b)\`; the for-loop calls \`__iter__\` and \`__next__\`.

Understanding the data model is what turns Python from 'a language with quirks' into 'a language with one consistent rule: syntax dispatches to methods.' It is why your own classes can behave exactly like built-in types, why libraries feel Pythonic, and why 'everything is an object' is a literal, load-bearing fact, not a slogan. Master this and you stop memorizing behaviors and start deriving them.`,

    intuition: `Think of Python syntax as a **set of doorbells, and dunder methods as who answers the door.**

- Someone rings \`len(x)\` -> your \`__len__\` answers.
- Someone rings \`x + y\` -> your \`__add__\` answers.
- Someone rings \`for item in x\` -> your \`__iter__\` answers, then \`__next__\` keeps answering until it says 'done.'
- Someone rings \`with x:\` -> your \`__enter__\` and \`__exit__\` answer.

If your object installs the right doorbell answerer, it becomes indistinguishable from a built-in. This is **duck typing**: Python does not check your type; it checks whether you answer the doorbell. 'If it implements \`__iter__\`, it is iterable' -- regardless of what class it is.`,

    howItWorks: `### The core rule
Built-in functions and operators are thin wrappers that call dunder methods:
- \`len(x)\` -> \`x.__len__()\`
- \`x[k]\` -> \`x.__getitem__(k)\`; \`x[k] = v\` -> \`x.__setitem__(k, v)\`
- \`a + b\` -> \`a.__add__(b)\` (and \`b.__radd__(a)\` as fallback)
- \`str(x)\` / print -> \`x.__str__()\`; the REPL/debug repr -> \`x.__repr__()\`
- \`x == y\` -> \`x.__eq__(y)\`; hashing -> \`x.__hash__()\`
- \`for i in x\` -> \`iter(x)\` -> \`x.__iter__()\`, then repeated \`__next__()\` until \`StopIteration\`
- \`with x as y:\` -> \`x.__enter__()\` then \`x.__exit__(...)\`
- \`callable\` -> \`x()\` calls \`x.__call__(...)\`

### Objects all the way down
Everything -- integers, functions, classes, modules -- is an object with a type. \`type(x)\` gives the class; the class is itself an instance of a metaclass (\`type\`). Attribute access (\`x.attr\`) itself goes through \`__getattribute__\` / \`__getattr__\`.

### Protocols, not inheritance
You do not inherit from a base to be 'iterable' or 'a context manager.' You just implement the methods. This is why \`collections.abc\` defines protocols structurally and why third-party objects interoperate without sharing a base class.`,

    internals: `**\`__eq__\` and \`__hash__\` are a contract.** If two objects are equal they must hash equal, or they break in sets and dict keys. Define \`__eq__\` and Python sets \`__hash__\` to None (making instances unhashable) unless you also define \`__hash__\` -- a deliberate guardrail against a subtle bug.

**\`__repr__\` vs \`__str__\` matter operationally.** \`__repr__\` is for developers/logs and should be unambiguous (ideally reconstructable); \`__str__\` is the human-friendly form. In production, a good \`__repr__\` on your domain objects is the difference between a useful log line and \`<Order object at 0x7f...>\`.

**Iterators are stateful and single-pass.** \`__iter__\` returns an iterator; \`__next__\` advances it and raises \`StopIteration\` when done. A generator (\`yield\`) is the ergonomic way to build one -- it *is* an iterator, pausing and resuming with its local state preserved on the heap. This laziness is why you can iterate a huge or infinite stream without materializing it.

**\`__slots__\` changes memory layout.** By default each instance carries a \`__dict__\` (a hash map of attributes) -- flexible but memory-heavy. Declaring \`__slots__\` stores attributes in a fixed array-like layout, cutting per-instance memory dramatically for millions of objects, at the cost of dynamic attribute assignment.

**Operator dispatch has a fallback dance.** \`a + b\` tries \`a.__add__(b)\`; if that returns \`NotImplemented\`, Python tries \`b.__radd__(a)\`. This is how \`1 + your_object\` can work even though int does not know your type.`,

    diagram: {
      title: "Syntax dispatches to dunder methods",
      layers: [
        { id: "syntax", label: "Syntax / built-in", sub: "len(x), x+y, for..in, with x, x[k]" },
        { id: "protocol", label: "Protocol lookup", sub: "Python finds the dunder on the object's type" },
        { id: "dunder", label: "__len__ / __add__ / __iter__ / __enter__", sub: "your method actually runs" },
        { id: "duck", label: "Duck typing", sub: "has the method -> works; no base class required" },
        { id: "obj", label: "Everything is an object", sub: "ints, funcs, classes -- all have a type" },
      ],
      caption: "There is no magic syntax -- only method dispatch. Implement the protocol and your object behaves like a built-in.",
    },

    realWorld: `A team stores domain objects in a set to dedup them, and duplicates keep slipping through. The cause: they defined \`__eq__\` to compare by id field but never defined \`__hash__\`, so instances fell back to identity hashing -- two 'equal' objects landed in different buckets and never compared. Fixing it is a two-line \`__hash__\` returning \`hash(self.id)\`, restoring the eq/hash contract. Separately, their logs were full of \`<Customer object at 0x...>\`; adding a \`__repr__\` turned every log line and stack trace into something debuggable. Both are pure data-model fluency -- no framework involved.`,

    production: `- **Always give domain classes a useful \`__repr__\`.** It makes logs, tracebacks, and debugger output readable -- cheap, high-leverage observability.
- **Keep the \`__eq__\`/\`__hash__\` contract.** Equal objects must hash equal; make value objects immutable and hashable, entities compared by id.
- **Use generators for large/streaming data.** Implementing \`__iter__\` with \`yield\` processes huge datasets lazily instead of loading everything into memory.
- **Reach for context managers (\`__enter__\`/\`__exit__\`)** for anything with setup/teardown -- connections, files, locks, spans -- so cleanup runs even on exceptions.
- **Use \`__slots__\` for high-cardinality objects** (millions of instances) to cut memory, once the attribute set is stable.
- **Prefer protocols over isinstance checks.** Accept anything that behaves right (duck typing) rather than locking to concrete types.`,

    commonMistakes: [
      "Defining __eq__ without __hash__, breaking use in sets and dict keys (or making instances unhashable unexpectedly).",
      "Relying on __str__ for debugging when logs and the REPL use __repr__ -- leaving unhelpful default reprs everywhere.",
      "Materializing a whole dataset into a list when a generator (__iter__/yield) would stream it lazily.",
      "Forgetting that __exit__ runs on exceptions too -- and swallowing errors by returning True from it accidentally.",
      "Assuming operator support requires inheritance instead of just implementing __add__/__radd__ etc.",
      "Adding __slots__ and then being surprised you can no longer set arbitrary attributes.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Implement protocols (dunders) | Objects behave like built-ins; interoperable | Must honor contracts (eq/hash, iterator single-pass) |
| Generators (lazy __iter__) | Constant memory over huge/infinite streams | Single-pass; cannot index or re-iterate |
| __slots__ | Large per-instance memory savings | No dynamic attributes, some subclassing friction |
| Rich __repr__ everywhere | Great debuggability/observability | Small maintenance cost; risk of leaking sensitive data |
| Duck typing | Flexible, decoupled from concrete types | Errors surface later (at call), not at definition |`,

    whenToUse: [
      "Making your own classes usable with built-in syntax (len, iteration, indexing, +, with).",
      "Streaming large or infinite data lazily via generators / the iterator protocol.",
      "Encapsulating setup/teardown (connections, locks, transactions) with context managers.",
      "Value objects that go into sets/dicts -- implement eq + hash together.",
    ],
    whenNotToUse: [
      "Overloading operators in surprising ways (e.g. + that does not mean 'add') -- it hurts readability.",
      "__slots__ on classes that need dynamic attributes or heavy subclassing.",
      "Reimplementing container protocols by hand when subclassing collections.abc or using a dataclass is clearer.",
    ],

    code: [
      {
        label: "Making a class behave like a built-in container",
        language: "python",
        code: `class Deck:
    def __init__(self, cards):
        self._cards = list(cards)

    def __len__(self):              # enables len(deck)
        return len(self._cards)

    def __getitem__(self, i):       # enables deck[0], slicing, AND iteration
        return self._cards[i]

    def __repr__(self):             # debuggable logs and REPL output
        return f"Deck({self._cards!r})"

deck = Deck(["A", "K", "Q"])
print(len(deck))          # -> __len__  => 3
print(deck[0])            # -> __getitem__ => 'A'
for card in deck:         # Python falls back to __getitem__ from 0.. for iteration
    print(card)
print(deck)               # -> __repr__ => Deck(['A', 'K', 'Q'])`,
      },
      {
        label: "The eq/hash contract for a value object",
        language: "python",
        code: `class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        # Equal objects MUST hash equal, or sets/dicts break.
        return hash((self.x, self.y))

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

a, b = Point(1, 2), Point(1, 2)
print(a == b)               # True (value equality)
print(len({a, b}))          # 1  -- dedup works because eq + hash agree`,
      },
      {
        label: "A context manager and a lazy generator",
        language: "python",
        code: `# Context manager: __exit__ runs even if the body raises.
class Timer:
    def __enter__(self):
        import time
        self.t = time.perf_counter()
        return self
    def __exit__(self, exc_type, exc, tb):
        import time
        print(f"took {time.perf_counter() - self.t:.4f}s")
        return False            # do NOT suppress exceptions

with Timer():
    sum(range(1_000_000))

# Generator = an iterator built with yield; streams lazily, constant memory.
def read_lines_upper(path):
    with open(path) as f:
        for line in f:          # one line at a time, file never fully in RAM
            yield line.upper()`,
      },
    ],

    memoryCard: {
      problem: "Make objects work seamlessly with Python's syntax and built-ins instead of being second-class next to native types.",
      mentalModel: "Syntax is doorbells; dunder methods answer the door. len/+/for/with/[] all dispatch to __len__/__add__/__iter__/__enter__/__getitem__. Duck typing: if it answers, it works.",
      keyConcepts: ["dunder/protocol dispatch", "everything is an object", "iterator protocol + generators", "context managers (__enter__/__exit__)", "eq/hash contract", "__repr__ vs __str__", "__slots__"],
      productionConnection: "Rich __repr__ for observable logs; eq+hash for correct set/dict behavior; generators for streaming huge data; context managers for guaranteed cleanup; __slots__ to cut memory at scale.",
      oneLiner: "Python has no magic syntax -- every operator and built-in dispatches to a dunder method, so implementing the protocol makes your objects behave like built-ins.",
    },

    quiz: [
      {
        id: "pdm-q1",
        prompt: "What does `len(x)` actually do under the hood?",
        choices: [
          { text: "Reads a hidden length field the interpreter maintains", correct: false },
          { text: "Calls x.__len__() -- len is a thin wrapper over the protocol method", correct: true },
          { text: "Iterates x fully and counts", correct: false },
          { text: "Only works on built-in types", correct: false },
        ],
        explanation:
          "len(x) invokes x.__len__(). Any object implementing __len__ works with len(), which is why custom classes can behave like built-in containers. This method-dispatch pattern underlies all Python syntax.",
      },
      {
        id: "pdm-q2",
        prompt: "You define __eq__ on a class to compare by an id field but do not define __hash__. What breaks?",
        choices: [
          { text: "Nothing; Python derives __hash__ from __eq__", correct: false },
          { text: "Instances become unhashable (or use identity hashing), so equal objects fail to dedup in sets and dict keys", correct: true },
          { text: "Equality stops working", correct: false },
          { text: "The class cannot be instantiated", correct: false },
        ],
        explanation:
          "Defining __eq__ without __hash__ makes instances unhashable by default (Python sets __hash__ to None). Even if you keep identity hashing, equal objects can land in different buckets, so sets/dicts misbehave. Equal objects must hash equal.",
      },
      {
        id: "pdm-q3",
        prompt: "Why use a generator (yield) instead of returning a list when reading a huge file?",
        choices: [
          { text: "Generators are always faster", correct: false },
          { text: "A generator is a lazy iterator producing items one at a time, so memory stays constant instead of loading the whole file", correct: true },
          { text: "Lists cannot hold strings", correct: false },
          { text: "Generators can be indexed like lists", correct: false },
        ],
        explanation:
          "A generator implements the iterator protocol and yields values on demand, keeping only one item in memory at a time. This lets you process arbitrarily large or infinite streams in constant memory, unlike a materialized list.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Build a fully Pythonic class",
      brief: "Implement the container, equality, iteration, and context-manager protocols so a custom class behaves exactly like a built-in.",
      steps: `1. Create an Inventory class wrapping a dict; implement __len__, __getitem__, __setitem__, __contains__, and __repr__ so len(), inv[k], inv[k]=v, 'k in inv', and printing all work.\n2. Add __eq__ and __hash__ (value equality) and prove two equal inventories dedup in a set.\n3. Implement __iter__ with yield so 'for item in inventory' streams items lazily; confirm you can iterate without building a list.\n4. Write a context manager (class or contextlib.contextmanager) that opens/closes a resource and verify __exit__ runs even when the body raises.\n5. For each protocol, note which syntax it enables and one production use.`,
      successCriteria: [
        "Custom class supports len(), indexing, membership, iteration, and prints via __repr__",
        "eq + hash together give correct set/dict behavior",
        "Iteration is lazy via a generator",
        "Context manager cleans up on both success and exception",
      ],
    },
  },

  {
    slug: "python-async-await",
    title: "Python async/await",
    track: "python",
    phase: "python",
    module: "python-core",
    difficulty: "advanced",
    estMinutes: 30,
    summary:
      "Cooperative concurrency on a single thread -- coroutines, the event loop, await points, and how to serve thousands of I/O-bound requests without threads (and the traps that block everything).",
    prerequisites: ["concurrency-vs-parallelism", "python-data-model"],
    relatedConcepts: ["concurrency-vs-parallelism", "js-event-loop", "python-data-model"],
    tags: ["python", "asyncio", "async-await", "coroutines", "event-loop", "concurrency", "io-bound"],

    why: `Servers spend most of their time *waiting* -- for databases, APIs, disks. With one thread per request, waiting means an idle, memory-hungry thread doing nothing. **async/await lets a single thread juggle thousands of waiting operations by switching away whenever one blocks on I/O**, giving huge concurrency at a fraction of the memory and context-switch cost of threads.

This is the model behind modern Python web frameworks (FastAPI, aiohttp), high-throughput API clients, and anything that fans out to many services per request. But it comes with a sharp rule that trips everyone: async only helps *I/O-bound* work, and one badly placed blocking call freezes the entire loop. Understanding *why* is the difference between a service that scales and one that mysteriously stalls under load.`,

    intuition: `Picture **one very efficient receptionist** handling a busy office.

- A visitor arrives and needs a document faxed (I/O). The receptionist sends the fax request and, instead of standing idle waiting for it to return, immediately helps the next visitor.
- When a fax comes back, the receptionist picks that task back up where it left off.
- Crucially, the receptionist only switches at *natural pause points* -- when a task says 'I'm waiting now' (an \`await\`). They never get interrupted mid-sentence.

That is cooperative concurrency. One worker (thread), many overlapping tasks, switching only at \`await\` points. The danger: if one visitor monopolizes the desk with a long task that never pauses (a CPU-heavy loop with no \`await\`), *everyone else waits* -- because there is only one receptionist and they were never told to pause.`,

    howItWorks: `### The pieces
- **Coroutine:** an \`async def\` function. Calling it does not run it -- it returns a coroutine object that must be awaited or scheduled.
- **await:** suspends the current coroutine, handing control back to the event loop until the awaited thing (another coroutine, or an I/O future) is ready.
- **Event loop:** the single-threaded scheduler that runs ready coroutines, watches I/O for completion, and resumes coroutines when their awaited work finishes.
- **Task:** a coroutine wrapped so the loop runs it concurrently (\`asyncio.create_task\`). Awaiting a coroutine directly runs it inline; wrapping it in a task lets it progress alongside others.

### Concurrency, not parallelism
Everything runs on **one thread, one core**. You get concurrency by overlapping *waits*, not by using multiple cores. \`asyncio.gather(a(), b(), c())\` runs the three coroutines concurrently: total time approaches the *max* of their waits, not the sum.

### The critical rule
At an \`await\`, the loop can switch to other tasks. Between awaits, your code runs uninterrupted. So:
- A slow *I/O* call awaited properly (async DB driver, aiohttp) yields the loop -> great concurrency.
- A slow *blocking* call (synchronous \`requests\`, a CPU loop, \`time.sleep\`) does NOT yield -> it **blocks the entire event loop**, stalling every other task. This is the number-one async bug.`,

    internals: `**Coroutines are resumable generators under the hood.** \`await\` is built on the same suspend/resume machinery as \`yield\`. When a coroutine awaits, its frame (locals, position) is saved on the heap and the loop moves on; when the awaited I/O is ready, the loop resumes exactly where it paused. This is why a suspended task costs a small object, not an OS thread -- hence scaling to tens of thousands of concurrent tasks.

**The loop watches I/O with the OS, not by polling.** asyncio uses \`selectors\` (epoll/kqueue/IOCP) to ask the kernel 'tell me when any of these sockets is readable/writable.' The loop sleeps until the kernel signals readiness, then resumes the matching tasks. There is no busy-waiting; idle concurrency is nearly free.

**Blocking calls defeat all of this.** A synchronous network or file call, or \`time.sleep\`, does not go through the loop's selectors -- the single thread is genuinely stuck inside C code, and no other task can run. The fix is either an async-native library or offloading the blocking call to a thread/process pool via \`loop.run_in_executor\` / \`asyncio.to_thread\`.

**Unhandled task exceptions can vanish.** If you \`create_task\` and never await it, an exception inside can be swallowed until the task is garbage-collected, surfacing as a confusing 'Task exception was never retrieved' warning. Always gather or await tasks and handle their results.

**Cancellation is cooperative too.** Cancelling a task raises \`CancelledError\` at its next await point; cleanup must happen in \`finally\`/context managers. Timeouts (\`asyncio.timeout\`) are built on this.`,

    diagram: {
      title: "One thread, an event loop, many awaiting tasks",
      layers: [
        { id: "loop", label: "Event loop (single thread)", sub: "schedules ready tasks, watches I/O via epoll/kqueue" },
        { id: "await", label: "await = yield to the loop", sub: "task suspends; loop runs someone else" },
        { id: "io", label: "Kernel signals I/O ready", sub: "loop resumes the exact suspended frame" },
        { id: "gather", label: "gather/create_task", sub: "overlap waits: total ~ max, not sum" },
        { id: "block", label: "Blocking call = frozen loop", sub: "sync I/O / CPU loop starves every task -- offload it" },
      ],
      caption: "Concurrency comes from overlapping waits on one thread. A single blocking call breaks the whole model.",
    },

    realWorld: `A FastAPI endpoint is async but throughput collapses under load. The culprit: it calls a third-party SDK that uses the synchronous \`requests\` library. Every request blocks the single event-loop thread for the full network round trip, so 'concurrent' requests actually serialize -- the loop can serve only one at a time. Two fixes work: swap to an async HTTP client (aiohttp/httpx-async) so the call yields the loop, or wrap the blocking SDK call in \`await asyncio.to_thread(sdk.call, ...)\` so it runs off the loop. After the change, the same box handles orders of magnitude more concurrent requests -- no new hardware, just not blocking the loop.`,

    production: `- **Never block the event loop.** Audit for synchronous I/O (requests, sync DB drivers, open()), time.sleep, and CPU-heavy loops inside async code. Use async-native libraries or offload with asyncio.to_thread / run_in_executor.
- **Use gather for fan-out**, but bound it. Unlimited concurrent tasks exhaust file descriptors and downstream connection pools; cap with an asyncio.Semaphore.
- **Always set timeouts** on I/O (asyncio.timeout / per-call timeouts). A hung upstream must not pin a task forever.
- **Handle task exceptions.** Await/gather your tasks (consider return_exceptions or a TaskGroup) so failures are not silently swallowed.
- **Prefer asyncio.TaskGroup (3.11+)** for structured concurrency -- children are awaited and cancelled together on failure.
- **Keep CPU work out of the loop.** Offload to a process pool; the GIL plus a busy loop means CPU work starves everything.`,

    commonMistakes: [
      "Calling a synchronous/blocking function inside async code, freezing the entire event loop.",
      "Using time.sleep() instead of await asyncio.sleep(), blocking the loop.",
      "Awaiting coroutines one-by-one in a loop when they could run concurrently with gather/TaskGroup.",
      "Calling an async function without awaiting it -- getting a coroutine object that never runs (and a warning).",
      "create_task without ever awaiting it, so exceptions are swallowed.",
      "Expecting async to speed up CPU-bound work -- it will not; that needs processes.",
      "Unbounded gather over thousands of items, exhausting sockets and downstream pools.",
    ],

    tradeoffs: `| Aspect | async/await | Threads | Processes |
|---|---|---|---|
| Best for | High-concurrency I/O | I/O with blocking libs | CPU-bound work |
| Concurrency cost | Very cheap (small task object) | OS thread each (heavier) | Heaviest (separate memory) |
| Parallel CPU? | No (one core) | No in CPython (GIL) | Yes |
| Main danger | One blocking call freezes all | Races, locks, deadlocks | IPC/serialization overhead |

async is unbeatable for I/O concurrency and useless for CPU parallelism -- know which problem you have.`,

    whenToUse: [
      "I/O-bound services that fan out to many databases/APIs per request (web APIs, gateways, scrapers).",
      "Handling thousands of simultaneous connections (websockets, streaming) on limited cores.",
      "Overlapping independent awaits to turn sum-of-latencies into max-of-latencies.",
    ],
    whenNotToUse: [
      "CPU-bound work -- use multiprocessing; async cannot parallelize computation.",
      "Simple scripts or low-concurrency code where sync is clearer and fast enough.",
      "When your critical libraries are blocking-only and cannot be offloaded cleanly (threads may be simpler).",
    ],

    code: [
      {
        label: "gather: overlap waits (sum -> max)",
        language: "python",
        code: `import asyncio, time

async def fetch(name, seconds):
    await asyncio.sleep(seconds)     # yields the loop during the 'I/O' wait
    return name

async def main():
    start = time.perf_counter()
    # Concurrent: total ~ max(2,1,3) = 3s, NOT 2+1+3 = 6s.
    results = await asyncio.gather(fetch("a", 2), fetch("b", 1), fetch("c", 3))
    print(results, f"{time.perf_counter() - start:.2f}s")

asyncio.run(main())`,
      },
      {
        label: "The blocking-call trap and the fix",
        language: "python",
        code: `import asyncio, time

def blocking_io():
    time.sleep(2)          # synchronous: does NOT yield the loop
    return "done"

async def bad():
    # This freezes the ENTIRE event loop for 2s -- other tasks stall.
    return blocking_io()

async def good():
    # Offload to a thread so the loop stays free for other tasks.
    return await asyncio.to_thread(blocking_io)

async def main():
    # With good(), these overlap; with bad(), they serialize.
    await asyncio.gather(good(), good(), good())

asyncio.run(main())`,
      },
      {
        label: "Structured concurrency, timeouts, and bounded fan-out",
        language: "python",
        code: `import asyncio

async def fetch(client_sem, url):
    async with client_sem:                 # cap concurrency (protect pools/FDs)
        async with asyncio.timeout(5):     # never hang forever on a bad upstream
            await asyncio.sleep(0.1)       # stand-in for a real async request
            return f"ok:{url}"

async def main(urls):
    sem = asyncio.Semaphore(50)            # at most 50 in flight
    # TaskGroup (3.11+): children awaited together; one failure cancels the rest.
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(sem, u)) for u in urls]
    return [t.result() for t in tasks]

asyncio.run(main([f"/{i}" for i in range(1000)]))`,
      },
    ],

    memoryCard: {
      problem: "Serve thousands of I/O-bound operations concurrently without paying for a thread per waiting request.",
      mentalModel: "One efficient receptionist (thread) juggling many visitors, switching only at natural pause points (await). One visitor who never pauses (blocking call) freezes the whole desk.",
      keyConcepts: ["coroutine (async def)", "await = yield to the loop", "single-thread event loop", "gather/TaskGroup fan-out", "never block the loop", "asyncio.to_thread for blocking work", "timeouts & cancellation"],
      productionConnection: "Powers FastAPI/aiohttp; blocking calls (requests, sync DB, time.sleep, CPU loops) stall everything -- offload them; bound fan-out with a semaphore; always set timeouts and handle task exceptions.",
      oneLiner: "async/await overlaps I/O waits on a single thread for massive concurrency -- but one blocking call freezes the entire event loop and CPU work needs processes.",
    },

    quiz: [
      {
        id: "paa-q1",
        prompt: "Inside an async function you call the synchronous requests.get(). What is the effect under load?",
        choices: [
          { text: "It runs in parallel automatically", correct: false },
          { text: "It blocks the single event-loop thread for the whole request, serializing all other tasks", correct: true },
          { text: "It raises an exception because sync calls are forbidden", correct: false },
          { text: "It is fine; asyncio detects and offloads it", correct: false },
        ],
        explanation:
          "A synchronous call does not yield to the loop, so the one thread is stuck inside it and no other task can progress. Use an async client or offload via asyncio.to_thread / run_in_executor.",
      },
      {
        id: "paa-q2",
        prompt: "Three independent async network calls each take ~1s. How long does `await asyncio.gather(a(), b(), c())` take, and why?",
        choices: [
          { text: "~3s, because coroutines run one after another", correct: false },
          { text: "~1s, because the waits overlap on one thread -- total approaches the max, not the sum", correct: true },
          { text: "~1s, because gather uses three cores", correct: false },
          { text: "It depends on the number of CPU cores", correct: false },
        ],
        explanation:
          "gather schedules the coroutines concurrently. While each awaits its I/O, the loop advances the others, so the total time is roughly the longest single wait, not their sum. It is concurrency on one core, not parallelism.",
      },
      {
        id: "paa-q3",
        prompt: "Why does async NOT speed up a CPU-bound computation?",
        choices: [
          { text: "async only works on strings", correct: false },
          { text: "A CPU loop never hits an await, so it holds the single loop thread and cannot be parallelized across cores", correct: true },
          { text: "asyncio disables the CPU", correct: false },
          { text: "It does speed it up", correct: false },
        ],
        explanation:
          "async gains come from overlapping waits. CPU-bound code has no waits to overlap and never yields, so it blocks the loop; and being single-threaded, it cannot use multiple cores. CPU parallelism requires processes.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Diagnose and fix a stalled event loop",
      brief: "Build an async workload, prove a blocking call freezes it, and restore concurrency with offloading and bounded fan-out.",
      steps: `1. Write three coroutines using asyncio.sleep and run them with gather; confirm total time approaches the max wait.\n2. Replace one asyncio.sleep with time.sleep and re-run; observe that the tasks now serialize (the loop is blocked).\n3. Fix it with await asyncio.to_thread(...) and confirm concurrency returns.\n4. Fan out 1000 tasks with a Semaphore(50) and a per-task asyncio.timeout; confirm at most 50 run at once and slow tasks time out instead of hanging.\n5. create_task without awaiting a failing coroutine; observe the swallowed-exception warning, then fix it with a TaskGroup or gather.`,
      successCriteria: [
        "gather overlaps waits (total approaches max, not sum)",
        "You reproduce a frozen loop with a blocking call and fix it via to_thread",
        "Fan-out is bounded by a semaphore and protected by timeouts",
        "Task exceptions are surfaced, not swallowed",
      ],
    },
  },

  {
    slug: "python-typing",
    title: "Python Type Hints",
    track: "python",
    phase: "python",
    module: "python-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "Gradual, optional static typing for a dynamic language -- how hints catch bugs before runtime, document intent, and power tooling, while being erased at runtime (mostly).",
    prerequisites: ["python-data-model"],
    relatedConcepts: ["python-data-model", "ts-type-system", "python-packaging"],
    tags: ["python", "typing", "type-hints", "mypy", "static-analysis", "protocols", "generics"],

    why: `Python is dynamically typed: a variable can hold anything, and type errors surface only when the offending line runs -- often in production, far from the cause. **Type hints add an optional, static layer that a checker (mypy, pyright) verifies before you ship, turning a class of runtime crashes into editor squiggles.**

Beyond bug-catching, hints are the best documentation that cannot go stale (the checker enforces them), they power autocomplete and refactoring in editors, and they make large codebases navigable. The design is deliberately *gradual*: you can add hints file-by-file, and unhinted code still runs. Understanding what hints do -- and critically, what they do *not* do at runtime -- is essential to using them correctly instead of trusting them blindly.`,

    intuition: `Type hints are **labels on the pipes of your code, checked by an inspector who visits before you turn the water on.**

- You annotate what flows where: this function takes an \`int\` and returns a \`str\`.
- A separate inspector (mypy/pyright) walks the whole system and flags mismatched connections -- a \`str\` plugged into an \`int\` socket -- *before* runtime.
- But the labels are just paint. **At runtime, Python largely ignores them.** The water flows regardless of what the labels said; if you bypass the inspector, a wrong type still runs (and may crash later).

So hints are a *contract enforced at check time, not at run time.* They make intent explicit and let tooling catch violations early, but they are not runtime validation -- that is a common and costly misunderstanding.`,

    howItWorks: `### Basic annotations
\`\`\`python
def greet(name: str, times: int = 1) -> str:
    return f"hi {name} " * times

count: int = 0
names: list[str] = []
\`\`\`

### The vocabulary that matters
- **Containers:** \`list[int]\`, \`dict[str, float]\`, \`tuple[int, str]\`.
- **Optional / unions:** \`str | None\` (3.10+), or \`Optional[str]\`; \`int | str\` for either.
- **Any:** opts out of checking -- use sparingly; it is a hole in the type net.
- **Callable, Iterable, Sequence, Mapping:** accept behavior, not concrete types (structural, Pythonic).
- **Generics / TypeVar:** write functions/classes parametric over a type (\`def first(xs: list[T]) -> T\`).
- **Protocol:** structural typing -- 'anything with a \`.read()\` method' -- matching duck typing statically.
- **Literal, TypedDict, NewType, overload:** precise shapes for dict payloads, string enums, and multi-signature functions.

### The checker vs the interpreter
- Annotations are stored in \`__annotations__\` but **not enforced by CPython** at call time (aside from tools that opt in). Passing the wrong type does not raise from the hint itself.
- A **static checker** (mypy, pyright) reads the hints and reports mismatches in CI or your editor. This is where the value is.`,

    internals: `**Hints are (mostly) erased at runtime.** By default Python evaluates annotations into \`__annotations__\` but does no checking. Wrong types flow freely until they cause a real error elsewhere. This is why 'my code has type hints' is not the same as 'my inputs are validated' -- for untrusted input you still need runtime validation (e.g. pydantic), which *uses* hints to build validators but adds actual checks.

**\`from __future__ import annotations\` / string annotations** make annotations lazy (not evaluated at definition), avoiding import cycles and forward-reference issues -- important in large codebases. PEP 563/649 govern this evolution.

**Variance and generics have real rules.** A \`list[Dog]\` is not a \`list[Animal]\` (mutable containers are invariant) -- assuming otherwise is a classic checker error that reflects a genuine soundness issue (you could insert a Cat). Read-only containers (\`Sequence\`) are covariant. TypeVars can be bound or constrained to express these precisely.

**Protocols enable static duck typing.** Instead of requiring a base class, a \`Protocol\` says 'any object with these methods.' The checker verifies structurally, matching Python's runtime duck typing -- so you get static safety without forcing inheritance.

**gradual typing means \`Any\` is contagious.** Anything typed \`Any\` disables checking for expressions derived from it. Untyped third-party libraries introduce \`Any\` at the boundary; stubs (\`.pyi\`) or \`py.typed\` packages restore checking. Strict mode flags implicit \`Any\` so holes are visible.`,

    diagram: {
      title: "Hints are checked before runtime, erased at runtime",
      layers: [
        { id: "annot", label: "You annotate types", sub: "def f(x: int) -> str; names: list[str]" },
        { id: "check", label: "Static checker (mypy/pyright)", sub: "verifies the whole graph in CI/editor" },
        { id: "editor", label: "Tooling", sub: "autocomplete, refactors, go-to-definition" },
        { id: "runtime", label: "CPython runtime", sub: "stores annotations, does NOT enforce them" },
        { id: "validate", label: "Runtime validation (pydantic)", sub: "for untrusted input -- hints alone do not check" },
      ],
      caption: "Type hints are a check-time contract and documentation -- not runtime validation. Validate untrusted input separately.",
    },

    realWorld: `A payments module has a function that 'returns a user' but sometimes returns None when the user is missing; a caller does user.email and it crashes in production on the rare missing-user path. Annotating the return as \`User | None\` and running mypy in CI immediately flags every caller that accesses attributes without a None check -- surfacing the latent NoneType bug across the codebase before deploy, not after. Separately, an API endpoint trusted incoming JSON matched its TypedDict; but hints do not validate, so malformed input still slipped through -- the fix was pydantic to actually enforce the shape at runtime. Two lessons: hints catch caller mistakes statically, but untrusted input needs real validation.`,

    production: `- **Run a type checker in CI** (mypy or pyright) and fail the build on new errors. Hints without a checker are just comments.
- **Adopt gradually, then tighten.** Start with public function signatures; move toward strict mode to eliminate implicit Any over time.
- **Type Optionals honestly (X | None).** The checker then forces None handling, killing a huge share of AttributeError-on-None bugs.
- **Do not confuse hints with validation.** For untrusted input (HTTP bodies, config, external APIs) use pydantic/dataclasses-with-validators; hints are erased at runtime.
- **Use Protocols and abstract collections (Sequence/Mapping/Iterable)** to accept behavior, keeping functions flexible and Pythonic.
- **Publish py.typed and stubs** for shared libraries so downstream code keeps type coverage; avoid leaking Any across module boundaries.`,

    commonMistakes: [
      "Believing type hints validate input at runtime -- they are erased/ignored by CPython; wrong types still flow.",
      "Adding hints but never running a checker, so nothing is actually verified.",
      "Overusing Any, which silently disables checking for everything derived from it.",
      "Annotating a return as a concrete type when it can be None, then hitting AttributeError on the None path.",
      "Assuming list[Dog] is a list[Animal] (containers are invariant) and fighting the checker instead of understanding variance.",
      "Requiring concrete types (list) where Sequence/Iterable would accept more callers.",
    ],

    tradeoffs: `| Aspect | With type hints + checker | Without |
|---|---|---|
| Bug detection | Many type errors caught pre-runtime | Only at the crashing line, often in prod |
| Documentation | Enforced, cannot drift | Prose comments that rot |
| Tooling | Rich autocomplete/refactor | Limited, guess-based |
| Cost | Annotation effort, checker in CI, learning variance/generics | Faster to write, riskier at scale |
| Runtime safety | None extra (hints erased) -- still need validation | Same |

The trade is upfront annotation and tooling discipline for large-codebase safety and navigability -- with no free runtime validation.`,

    whenToUse: [
      "Shared libraries and large/long-lived codebases where signatures document contracts and prevent regressions.",
      "Public function/method boundaries and data models, where wrong types are most costly.",
      "Anywhere editor autocomplete and safe refactoring pay off (i.e. most professional code).",
    ],
    whenNotToUse: [
      "As a substitute for validating untrusted input (use pydantic/validators there).",
      "Tiny throwaway scripts where the checker overhead outweighs the benefit.",
      "Forcing precise types through highly dynamic metaprogramming where Any is honestly the right answer.",
    ],

    code: [
      {
        label: "Optional forces None handling; the checker catches it",
        language: "python",
        code: `def find_user(user_id: int) -> "User | None":
    return _db.get(user_id)          # may be None

u = find_user(42)
# mypy error: Item "None" of "User | None" has no attribute "email"
# print(u.email)

# Correct: the type forces you to handle the missing case.
if u is not None:
    print(u.email)                   # narrowed to User here`,
      },
      {
        label: "Generics and Protocols: accept behavior, not concrete types",
        language: "python",
        code: `from typing import TypeVar, Protocol
from collections.abc import Iterable

T = TypeVar("T")

def first(items: Iterable[T]) -> T:  # works for list, tuple, set, generator...
    for x in items:
        return x
    raise ValueError("empty")

reveal = first([1, 2, 3])            # inferred as int
name = first(("a", "b"))             # inferred as str

class Readable(Protocol):            # structural: anything with read() -> str
    def read(self) -> str: ...

def dump(src: Readable) -> int:      # accepts files, StringIO, custom objects
    return len(src.read())`,
      },
      {
        label: "Hints are NOT runtime validation -- validate untrusted input",
        language: "python",
        code: `from typing import TypedDict

class Payload(TypedDict):
    amount: int
    currency: str

def charge(p: Payload) -> None:
    ...

# At runtime nothing stops this -- hints are erased:
charge({"amount": "oops", "currency": 5})   # runs; no TypeError from the hint

# For untrusted input, use pydantic (uses hints to build REAL validators):
from pydantic import BaseModel

class ChargeModel(BaseModel):
    amount: int
    currency: str

ChargeModel(amount="oops", currency=5)      # raises ValidationError at runtime`,
      },
    ],

    memoryCard: {
      problem: "Catch type errors and document contracts in a dynamic language before they blow up at runtime -- without giving up Python's flexibility.",
      mentalModel: "Labels on pipes checked by an inspector before the water is turned on: mypy/pyright verify the labels statically, but at runtime CPython ignores them (the paint does not stop wrong water).",
      keyConcepts: ["gradual/optional typing", "X | None (Optional)", "generics/TypeVar", "Protocols = static duck typing", "Sequence/Iterable over concrete types", "hints erased at runtime", "Any is contagious"],
      productionConnection: "Run mypy/pyright in CI; Optional forces None handling (kills NoneType bugs); hints are not validation -- use pydantic for untrusted input; publish py.typed for libraries.",
      oneLiner: "Type hints are a gradual, check-time contract and great documentation -- verified statically by mypy/pyright but erased at runtime, so untrusted input still needs real validation.",
    },

    quiz: [
      {
        id: "pt-q1",
        prompt: "You annotate a function's argument as int but call it with a str, and never run a type checker. What happens?",
        choices: [
          { text: "Python raises a TypeError at the call because of the hint", correct: false },
          { text: "Nothing from the hint; CPython ignores annotations at runtime, so the str flows in and may crash later elsewhere", correct: true },
          { text: "The function silently converts the str to int", correct: false },
          { text: "The program refuses to start", correct: false },
        ],
        explanation:
          "Type hints are not enforced by the interpreter -- they are erased/ignored at runtime. Only a static checker (mypy/pyright) would flag the mismatch. Without one, the wrong type flows and any error appears later, if at all.",
      },
      {
        id: "pt-q2",
        prompt: "What is the practical benefit of annotating a return type as `User | None` instead of `User`?",
        choices: [
          { text: "It makes the function return faster", correct: false },
          { text: "The type checker forces every caller to handle the None case, eliminating a class of AttributeError-on-None bugs", correct: true },
          { text: "It automatically creates a default User", correct: false },
          { text: "It validates the User at runtime", correct: false },
        ],
        explanation:
          "Declaring the Optional makes the possibility of None explicit; the checker then errors on any caller that uses the value without a None check, catching latent NoneType bugs before runtime.",
      },
      {
        id: "pt-q3",
        prompt: "Why is a `Protocol` useful compared to requiring a specific base class?",
        choices: [
          { text: "It runs faster", correct: false },
          { text: "It enables structural (duck) typing: any object with the required methods is accepted, no inheritance required", correct: true },
          { text: "It validates types at runtime", correct: false },
          { text: "It only works with built-in types", correct: false },
        ],
        explanation:
          "A Protocol matches by structure -- any object implementing the declared methods satisfies it -- so you get static checking that mirrors Python's runtime duck typing, without forcing callers to inherit from a base class.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Make the checker earn its keep",
      brief: "Add hints to a small module, run mypy in strict-ish mode, and see it catch real bugs -- then prove hints are not runtime validation.",
      steps: `1. Write a module with a function that can return None; annotate it as X | None and add a caller that dereferences the result unguarded.\n2. Run mypy (or pyright) and confirm it flags the missing None check; fix it with narrowing.\n3. Introduce a wrong-type argument at a call site and confirm the checker catches it; then show that running the program without the checker does not raise from the hint.\n4. Replace a concrete list parameter with Iterable/Sequence and pass a tuple and a generator to show broader acceptance.\n5. Add a pydantic model for an 'untrusted input' path and demonstrate it raises ValidationError where the plain TypedDict did not.`,
      successCriteria: [
        "mypy/pyright flags a None-dereference and a wrong-type call before runtime",
        "You demonstrate the program still runs (no hint-based error) without the checker",
        "A function accepts multiple iterable types via Sequence/Iterable",
        "pydantic enforces a shape at runtime where hints alone did not",
      ],
    },
  },

  {
    slug: "python-packaging",
    title: "Python Packaging & Environments",
    track: "python",
    phase: "python",
    module: "python-core",
    difficulty: "core",
    estMinutes: 27,
    summary:
      "Why 'it works on my machine' happens and how to stop it -- virtual environments, pinning vs resolving, pyproject.toml, lockfiles, and reproducible builds from laptop to production.",
    prerequisites: [],
    relatedConcepts: ["python-typing", "how-computers-run-code"],
    tags: ["python", "packaging", "pip", "virtualenv", "pyproject", "lockfile", "dependencies", "reproducibility"],

    why: `The single most common way Python projects break is dependency chaos: two projects need different versions of the same library, an upgrade elsewhere silently changes your app, or a deploy pulls newer packages than you tested. **Packaging and environments exist to make 'the exact set of code that runs' explicit, isolated, and reproducible -- so the same versions run on your laptop, in CI, and in production.**

Get this wrong and you get the infamous 'works on my machine,' heisenbugs that appear only after a redeploy, and security incidents from unpinned transitive dependencies. Get it right and builds are deterministic, upgrades are deliberate, and onboarding is one command. This is unglamorous infrastructure that quietly determines whether your software is trustworthy.`,

    intuition: `Two problems, two tools:

- **Isolation (virtual environment):** without it, all projects share one global set of installed packages -- like every app on a machine sharing one toolbox, so upgrading a wrench for project A breaks project B. A **virtual environment is a private toolbox per project**: its own \`site-packages\`, its own versions, invisible to others.
- **Reproducibility (pinning + lockfile):** saying 'install requests' is like saying 'grab a wrench' -- you might get any size. Saying 'install requests==2.31.0 *and* every transitive dependency at these exact versions' (a **lockfile**) is grabbing the exact wrench you tested. The abstract dependency ('requests, roughly this range') and the concrete resolved set (the lockfile) are different things and you need both.`,

    howItWorks: `### Virtual environments
A venv is a directory with its own Python and \`site-packages\`. Activating it makes \`python\`/\`pip\` install into that directory instead of the global interpreter. One venv per project isolates versions.
\`\`\`
python -m venv .venv        # create
source .venv/bin/activate   # (or .venv\\Scripts\\activate on Windows)
pip install requests
\`\`\`

### Declaring dependencies: pyproject.toml
The modern standard (PEP 621) puts project metadata and *abstract* dependencies (with version ranges) in \`pyproject.toml\`:
\`\`\`toml
[project]
name = "myapp"
dependencies = ["requests>=2.31,<3", "pydantic>=2"]
\`\`\`
This says what you *depend on*, loosely -- not the exact resolved graph.

### Resolving vs pinning vs locking
- **Resolving:** the installer picks concrete versions satisfying all ranges (including transitive deps).
- **Pinning:** fixing exact versions (\`requests==2.31.0\`).
- **Locking:** recording the *entire resolved graph* with exact versions (and often hashes) in a **lockfile** (\`requirements.txt\` with pins, \`poetry.lock\`, \`uv.lock\`, \`Pipfile.lock\`). Installing from the lock is deterministic and byte-for-byte reproducible.

### The two-layer workflow
1. Declare loose ranges in \`pyproject.toml\`.
2. Resolve + lock to exact versions once.
3. Everyone (CI, prod) installs from the lockfile, not the ranges. Upgrades are a deliberate re-lock.`,

    internals: `**Transitive dependencies are the real danger.** You pin \`fastapi\`, but it pulls \`starlette\`, \`pydantic\`, \`anyio\`... If you only pin your direct deps, a fresh install can grab newer transitive versions than you tested -- the classic 'the code didn't change but the build broke.' A lockfile captures the *whole* graph, which is why it, not \`pyproject.toml\`, is the source of reproducibility.

**Dependency resolution is a constraint-satisfaction problem** and can be slow or fail: two packages demanding incompatible versions of a shared dependency is a genuine conflict (a 'diamond'). Modern resolvers (pip's backtracking resolver, uv, poetry) explore the graph; a resolution that works today can be impossible after an upgrade, which is why locking a known-good set matters.

**Wheels vs sdists.** A wheel (\`.whl\`) is a prebuilt binary package -- fast to install, no compiler needed. An sdist is source that may need a build step (C extensions), which is where 'no compiler on the box' failures come from. Pinning to versions with wheels for your platform avoids surprise build failures in production images.

**Hashes and supply chain.** Lockfiles can record artifact hashes so installs verify integrity -- defending against a compromised or swapped package. Unpinned installs are a supply-chain risk: a malicious new release of a transitive dep can land in your build automatically.

**The environment is more than packages.** The Python *version itself* is part of reproducibility (3.11 vs 3.12 can differ). Pin it too (via tooling like pyenv/uv or the base container image), or 'reproducible' is only half true.`,

    diagram: {
      title: "From loose intent to a reproducible install",
      layers: [
        { id: "declare", label: "pyproject.toml", sub: "abstract deps + ranges (what you depend on)" },
        { id: "resolve", label: "Resolver", sub: "solves ranges + transitive graph to exact versions" },
        { id: "lock", label: "Lockfile", sub: "full graph pinned (+ hashes) -- the reproducible truth" },
        { id: "venv", label: "Virtual environment", sub: "isolated per-project site-packages" },
        { id: "prod", label: "CI / production install", sub: "install from lock, not ranges -> same bytes everywhere" },
      ],
      caption: "Declare loosely, lock exactly, install from the lock. The lockfile -- not the ranges -- is what makes builds reproducible.",
    },

    realWorld: `A service passes CI on Monday and a redeploy on Friday crashes at import time -- no code changed. The requirements listed only direct dependencies without pins, so Friday's fresh install pulled a newer transitive package with a breaking change. The team was shipping a *different* dependency graph than they tested. The fix: generate a lockfile capturing every transitive version (and pin the Python version in the base image), and make CI and prod install strictly from the lock. Deploys became deterministic; upgrades became an explicit, reviewed re-lock instead of a silent roll of the dice. The virtual environment already isolated projects; the lockfile isolated them *across time*.`,

    production: `- **One virtual environment per project; never install into the global interpreter.** Isolation prevents cross-project version conflicts.
- **Commit a lockfile and install from it in CI and production.** Ranges in pyproject.toml are for humans; the lock is what actually ships.
- **Pin the Python version too** (base image / pyenv / uv), since interpreter version is part of reproducibility.
- **Use hashes in the lock** to verify artifact integrity and defend the supply chain.
- **Make upgrades deliberate:** bump ranges, re-lock, run tests, review the diff -- do not let unpinned transitive deps drift silently.
- **Prefer wheels for your platform** and multi-stage/slim container images so builds are fast and do not need a compiler at runtime.
- **Automate dependency updates with review** (Dependabot/Renovate) rather than never updating (security debt) or updating blindly.`,

    commonMistakes: [
      "Installing packages globally, so two projects fight over the same library version.",
      "Pinning only direct dependencies and letting transitive versions drift -- the 'code didn't change but it broke' bug.",
      "Treating pyproject.toml ranges as reproducible; they are not -- only a lockfile is.",
      "Forgetting to pin the Python version, so a different interpreter subtly changes behavior.",
      "Never updating dependencies (piling up security vulnerabilities) or updating blindly without re-testing.",
      "Committing a venv directory to git instead of the lockfile.",
      "Relying on sdists that need a compiler, then failing to build in a minimal production image.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Loose ranges only | Easy upgrades, flexible | Non-reproducible; silent drift |
| Full lockfile | Deterministic, reproducible builds | Must re-lock to upgrade; larger diffs |
| Global install | Nothing to set up | Cross-project conflicts, no isolation |
| Venv per project | Clean isolation | One env to manage per project |
| Pinned + hashed lock | Supply-chain integrity | Slightly more ceremony |

The core trade is **flexibility (ranges) vs reproducibility (locks)** -- mature setups get both by declaring loosely and locking exactly.`,

    whenToUse: [
      "Any project beyond a one-off script: create a venv and a lockfile from day one.",
      "Anything deployed: install from a committed lockfile in CI and production for deterministic builds.",
      "Shared libraries: declare loose ranges in pyproject.toml so downstream apps can resolve compatibly.",
    ],
    whenNotToUse: [
      "Throwaway one-file scripts with no dependencies (a venv may be overkill -- though still cheap).",
      "Publishing a library: do not force a rigid lockfile on consumers; ship ranges and let apps lock.",
      "Committing a venv or full site-packages to version control -- commit the lockfile instead.",
    ],

    code: [
      {
        label: "Create an isolated environment and install",
        language: "bash",
        code: `# One private toolbox per project.
python -m venv .venv

# Activate (POSIX shells):
source .venv/bin/activate
# Windows PowerShell:  .venv\\Scripts\\Activate.ps1

# Now pip installs into .venv, not the global interpreter.
python -m pip install --upgrade pip
python -m pip install "requests>=2.31,<3"

# Prove isolation: this path points inside .venv
python -c "import requests, sys; print(sys.prefix); print(requests.__version__)"`,
      },
      {
        label: "Declare loosely, then lock exactly",
        language: "toml",
        code: `# pyproject.toml -- ABSTRACT dependencies (what you depend on, loosely)
[project]
name = "myapp"
version = "0.1.0"
requires-python = ">=3.11"          # pin the interpreter range too
dependencies = [
    "requests>=2.31,<3",
    "pydantic>=2,<3",
]

# Then RESOLVE + LOCK to exact versions (whole transitive graph):
#   pip freeze > requirements.lock            # simple pin
#   uv lock        / poetry lock              # full graph + hashes
# CI and prod install from the LOCK, never from the ranges:
#   pip install --require-hashes -r requirements.lock`,
      },
      {
        label: "Reproducible install in a container",
        language: "dockerfile",
        code: `# Pin the interpreter version in the base image (part of reproducibility).
FROM python:3.11-slim

WORKDIR /app

# Install from the LOCKFILE first (better layer caching, deterministic set).
COPY requirements.lock .
RUN pip install --no-cache-dir --require-hashes -r requirements.lock

# Copy source after deps so code changes do not bust the dependency layer.
COPY . .

CMD ["python", "-m", "myapp"]`,
      },
    ],

    memoryCard: {
      problem: "Guarantee the exact same set of code (your deps + their deps + the interpreter) runs on every machine, killing 'works on my machine' and silent version drift.",
      mentalModel: "A private toolbox per project (venv) plus a receipt listing the exact tools you tested with (lockfile). Ranges say 'a wrench, roughly this size'; the lock says 'this exact wrench.'",
      keyConcepts: ["virtual environment isolation", "pyproject.toml abstract deps/ranges", "resolve vs pin vs lock", "lockfile = full transitive graph", "pin the Python version", "wheels vs sdists", "hashes for supply chain"],
      productionConnection: "Commit a lockfile and install from it in CI/prod for deterministic builds; pin the interpreter; use hashes; make upgrades a deliberate re-lock; slim images with prebuilt wheels.",
      oneLiner: "Isolate each project in a venv and record the entire resolved dependency graph in a lockfile -- declare loosely, lock exactly, install from the lock everywhere.",
    },

    quiz: [
      {
        id: "pp-q1",
        prompt: "Your app passes CI, then a later redeploy breaks with no code change. Requirements listed only direct dependencies without pins. What happened?",
        choices: [
          { text: "The Python interpreter randomly changed", correct: false },
          { text: "A fresh install resolved newer transitive dependency versions than you tested, changing behavior", correct: true },
          { text: "CI cached the wrong code", correct: false },
          { text: "Virtual environments expired", correct: false },
        ],
        explanation:
          "Without a lockfile capturing the full transitive graph, a later install can pick up newer versions of indirect dependencies. You shipped a different dependency graph than you tested -- the fix is a committed lockfile installed in CI and prod.",
      },
      {
        id: "pp-q2",
        prompt: "What is the difference between pyproject.toml dependencies and a lockfile?",
        choices: [
          { text: "They are the same thing in different formats", correct: false },
          { text: "pyproject.toml declares abstract dependencies (ranges); the lockfile records the exact resolved versions of the entire graph for reproducible installs", correct: true },
          { text: "The lockfile is only for the interpreter version", correct: false },
          { text: "pyproject.toml is generated from the lockfile", correct: false },
        ],
        explanation:
          "pyproject.toml states what you depend on, loosely (ranges). The lockfile is the concrete, fully resolved set -- every direct and transitive package pinned (often with hashes) -- and it is what makes installs deterministic across machines.",
      },
      {
        id: "pp-q3",
        prompt: "Why create a virtual environment instead of installing packages globally?",
        choices: [
          { text: "It makes packages install faster", correct: false },
          { text: "It isolates each project's dependencies so different projects can use different, non-conflicting versions", correct: true },
          { text: "It encrypts the packages", correct: false },
          { text: "It is required to run Python at all", correct: false },
        ],
        explanation:
          "A venv gives a project its own site-packages, so upgrading a library for one project cannot break another. Global installs force all projects to share one version set, causing conflicts.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Build a reproducible environment",
      brief: "Create an isolated environment, declare dependencies, produce a lockfile, and prove that installing from the lock is deterministic.",
      steps: `1. Create and activate a venv; confirm sys.prefix points inside it and that a globally-absent package is not importable until you install it.\n2. Write a pyproject.toml (or requirements.in) declaring 1-2 dependencies with version ranges.\n3. Resolve and generate a lockfile (pip freeze, or uv/poetry lock) capturing every transitive package at exact versions.\n4. Delete and recreate the venv, install strictly from the lockfile, and confirm identical versions -- including transitive ones.\n5. Bump a range, re-lock, diff the lockfile, and note which transitive versions changed -- demonstrating deliberate, reviewable upgrades.`,
      successCriteria: [
        "A per-project venv isolates dependencies from the global interpreter",
        "A lockfile captures the full transitive graph at exact versions",
        "Recreating the env from the lock yields identical versions",
        "An upgrade is a visible, reviewable lockfile diff, not silent drift",
      ],
    },
  },
];
