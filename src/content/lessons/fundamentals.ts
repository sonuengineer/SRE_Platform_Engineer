import type { Lesson } from "../types";

export const fundamentalsLessons: Lesson[] = [
  {
    slug: "how-computers-run-code",
    title: "How Computers Run Code",
    track: "shared",
    phase: "cs-fundamentals",
    module: "foundations",
    difficulty: "intro",
    estMinutes: 24,
    summary:
      "The path from source text to running instructions -- compilation vs interpretation, the CPU fetch-decode-execute loop, and why the same code performs wildly differently depending on how it is run.",
    prerequisites: [],
    relatedConcepts: ["memory-stack-heap", "big-o-complexity", "concurrency-vs-parallelism"],
    tags: ["compilation", "interpretation", "cpu", "bytecode", "jit", "fundamentals"],

    why: `You write text. The machine executes electrical signals. Between those two facts sits an entire industry.

**Understanding how code runs is what lets you reason about performance, debugging, and cost instead of guessing.** Why is Python slower than C for a tight loop? Why does the JVM get faster after a few seconds of running? Why does a syntax error surface immediately in one language but only when a line executes in another? Every one of these questions is answered by knowing what happens between "save file" and "instruction retired on the CPU."

If you treat the runtime as a black box, every performance problem looks like magic and every fix is a guess. Once you see the pipeline, the guessing stops.`,

    intuition: `Think of source code as a **recipe written in a human language**, and the CPU as a **cook who only understands one very terse dialect** (machine code).

There are two ways to bridge the gap:

- **Compilation** is hiring a translator to rewrite the entire recipe into the cook's dialect once, ahead of time. The cook then works fast because everything is already in their language.
- **Interpretation** is having a translator stand next to the cook and translate each step out loud as the cook reaches it. Flexible, but there is a translator in the hot path every single time.

Most modern runtimes are a hybrid: translate to a compact intermediate shorthand (bytecode) up front, then, for the steps the cook repeats thousands of times, quietly rewrite just those into the native dialect (a JIT). You get startup flexibility and steady-state speed.`,

    howItWorks: `### From text to execution
1. **Lexing / parsing.** Source text is tokenized and turned into an Abstract Syntax Tree (AST) -- a structured representation of your program. Syntax errors are caught here.
2. **Compilation or bytecode generation.** A compiler lowers the AST toward machine code (C, Rust, Go) or toward *bytecode* for a virtual machine (Python -> CPython bytecode, Java -> JVM bytecode).
3. **Execution.** Native code runs directly on the CPU. Bytecode is run by a *virtual machine* -- a program that loops over bytecode instructions.

### The CPU's core loop
At the bottom, hardware runs a **fetch-decode-execute** cycle billions of times per second:
- **Fetch** the next instruction from memory (address held in the program counter).
- **Decode** what it means (add, load, jump...).
- **Execute** it, update registers/memory, advance the program counter.

### The three broad models
- **Ahead-of-time (AOT) compiled:** C, Rust, Go. Fast startup, fast steady state, no runtime translator, but platform-specific binaries.
- **Interpreted / bytecode-VM:** CPython, Ruby. Portable, flexible, slower per instruction.
- **JIT-compiled:** JVM (HotSpot), V8 (JavaScript), PyPy. Start as bytecode, then compile hot paths to native code at runtime using profiling data.`,

    internals: `**Bytecode is a real, inspectable artifact.** In Python, \`dis.dis(fn)\` prints the bytecode; each opcode (LOAD_FAST, BINARY_ADD, RETURN_VALUE) is executed by a giant switch loop in the CPython evaluator. Every high-level line becomes several opcodes, and each opcode does pointer chasing and type checks -- that overhead is *why* pure-Python loops are slow.

**A JIT watches your program run.** It counts how often functions and loops execute. Once a method crosses a threshold ("hot"), the JIT compiles it to native code, often *speculating* on the types it has observed (e.g. "this variable has always been an int"). If the speculation is later violated, it *deoptimizes* -- falls back to the interpreter. This is why microbenchmarks must warm up before measuring, and why a rare type change can silently tank performance.

**The memory hierarchy dominates real speed.** A register access is sub-nanosecond; L1 cache a few cycles; main memory ~100ns; SSD microseconds. The CPU is almost never the bottleneck -- *waiting for memory* is. Cache-friendly access patterns can outrun a "faster" algorithm that thrashes the cache.

**Branch prediction and pipelining** mean the CPU is speculatively executing instructions ahead of the current one. A mispredicted branch costs a pipeline flush (~15-20 cycles). This is why sorted data can process faster than unsorted data through the same branch.`,

    diagram: {
      title: "From source code to a running instruction",
      layers: [
        { id: "src", label: "Source code", sub: "human-readable text you write" },
        { id: "ast", label: "Parser -> AST", sub: "tokens, tree, syntax errors caught here" },
        { id: "ir", label: "Compiler / bytecode", sub: "native machine code OR VM bytecode" },
        { id: "run", label: "CPU or VM", sub: "fetch-decode-execute; JIT compiles hot paths" },
        { id: "hw", label: "Registers + memory hierarchy", sub: "cache misses, not opcodes, set real speed" },
      ],
      caption: "The same algorithm can be 100x slower or faster depending only on which of these paths it takes.",
    },

    realWorld: `A team rewrites a data-processing script and it is "mysteriously" 40x slower than the C tool it replaced -- same algorithm. The difference is not the algorithm at all: the Python version executes millions of interpreter opcodes and boxes every integer on the heap, while the C version emits a handful of native instructions per element that stay in registers. The fix is not "optimize the Python loop" -- it is to push the hot loop into NumPy (vectorized C) so the interpreter is out of the inner loop entirely. Knowing *how code runs* tells you the loop is the problem, not the logic.`,

    production: `- **Match the runtime to the workload.** Startup-sensitive workloads (serverless, CLIs) hate long JIT warmup; long-running services love it. A JVM function in a cold Lambda pays warmup on every cold start.
- **Warm up before benchmarking JIT runtimes.** First-iteration numbers on the JVM or V8 measure the interpreter, not steady state.
- **Move hot loops out of the interpreter.** Vectorized libraries (NumPy), native extensions, or a compiled language for the hot path -- not micro-tweaks inside the interpreted loop.
- **Profile for cache behavior, not just instruction count.** A cache-friendly layout often beats a theoretically better algorithm.
- **Keep binaries reproducible.** AOT binaries are platform-specific; pin your target architecture in CI to avoid "works on my machine" builds.`,

    commonMistakes: [
      "Assuming 'the algorithm is O(n) so it must be fast' while ignoring that each step runs thousands of interpreter opcodes.",
      "Benchmarking a JIT runtime without warmup and concluding it is slow.",
      "Believing compiled always beats interpreted -- a JIT can beat naive C by specializing on runtime data.",
      "Ignoring the memory hierarchy: optimizing CPU work while the code stalls on cache misses.",
      "Treating a syntax error and a runtime error as the same class of bug -- they are caught in different phases.",
    ],

    tradeoffs: `| Execution model | Strength | Cost |
|---|---|---|
| AOT compiled (C/Rust/Go) | Fast startup + fast steady state, no runtime translator | Platform-specific binaries, slower dev loop |
| Interpreted / bytecode VM | Portable, flexible, fast iteration | Per-instruction overhead, higher CPU cost |
| JIT compiled (JVM/V8) | Near-native steady state from portable bytecode | Warmup latency, memory overhead, deopt cliffs |

The deep tradeoff is always **startup latency vs steady-state throughput vs portability** -- you cannot maximize all three.`,

    whenToUse: [
      "Reasoning about why two implementations of the same algorithm differ in speed.",
      "Choosing a language/runtime for a workload (serverless cold start vs long-lived service).",
      "Deciding where to push a hot loop (native extension, vectorization, or a compiled service).",
    ],
    whenNotToUse: [
      "Premature micro-optimization before profiling shows the runtime is actually the bottleneck.",
      "Rewriting in a compiled language when the real cost is I/O or a network round trip, not CPU.",
    ],

    code: [
      {
        label: "Inspect Python bytecode with dis",
        language: "python",
        code: `import dis

def add(a, b):
    return a + b

dis.dis(add)
# Each source line becomes several opcodes the CPython VM loops over:
#   LOAD_FAST   a
#   LOAD_FAST   b
#   BINARY_ADD
#   RETURN_VALUE
# The per-opcode dispatch + int boxing is why pure-Python loops are slow.`,
      },
      {
        label: "Why the runtime matters more than the algorithm",
        language: "python",
        code: `# Same O(n) sum, three speeds -- because of HOW it runs, not the algorithm.
import numpy as np

data = list(range(10_000_000))

# 1) Pure Python: millions of interpreter opcodes, boxed ints.
total = 0
for x in data:
    total += x

# 2) Built-in sum(): the loop runs in C, not the interpreter -- much faster.
total = sum(data)

# 3) NumPy: vectorized native SIMD code, no interpreter in the inner loop.
total = np.arange(10_000_000).sum()  # fastest by far`,
      },
    ],

    memoryCard: {
      problem: "Bridge the gap between human-readable source text and the terse machine instructions a CPU can execute.",
      mentalModel: "A recipe (source) reaching a cook who speaks only one dialect (machine code): translate it all up front (compile), translate step-by-step (interpret), or a hybrid that rewrites the repeated steps (JIT).",
      keyConcepts: ["parse -> AST", "compile vs interpret vs JIT", "bytecode + virtual machine", "fetch-decode-execute", "memory hierarchy / cache", "JIT warmup and deopt"],
      productionConnection: "Runtime choice sets cold-start latency vs steady-state throughput; hot loops belong outside the interpreter; profile for cache misses, not just opcode count.",
      oneLiner: "Code becomes an AST, then native code or bytecode, then CPU instructions -- and where it runs decides whether it is fast or slow.",
    },

    quiz: [
      {
        id: "hcrc-q1",
        prompt: "Why does a JIT-compiled runtime often report slow numbers on the very first iteration of a benchmark?",
        choices: [
          { text: "The garbage collector runs before every benchmark", correct: false },
          { text: "Early iterations run interpreted bytecode; the JIT only compiles a method to native code after it is seen to be hot", correct: true },
          { text: "The CPU is cold and must physically warm up", correct: false },
          { text: "The first iteration always allocates twice the memory", correct: false },
        ],
        explanation:
          "A JIT profiles execution and compiles hot methods to native code only after a threshold. Until then you are measuring the interpreter. That is why JIT benchmarks require warmup before recording steady-state numbers.",
      },
      {
        id: "hcrc-q2",
        prompt: "Two programs implement the identical O(n) algorithm but one is 40x slower. What is the most likely explanation?",
        choices: [
          { text: "One has a hidden O(n^2) bug", correct: false },
          { text: "Big-O is wrong for one of them", correct: false },
          { text: "The slow one pays heavy per-element runtime overhead (interpreter dispatch, boxing, cache misses) that Big-O ignores", correct: true },
          { text: "Slower hardware", correct: false },
        ],
        explanation:
          "Big-O describes growth, not constant factors. Interpreter opcode dispatch, heap-boxed values, and cache-unfriendly access can add a large constant multiplier while the asymptotic class is unchanged.",
      },
      {
        id: "hcrc-q3",
        prompt: "What is caught during parsing, before any line executes?",
        choices: [
          { text: "Dividing by zero", correct: false },
          { text: "Syntax errors -- malformed tokens or structure that cannot form a valid AST", correct: true },
          { text: "Calling a function that does not exist", correct: false },
          { text: "An index out of range", correct: false },
        ],
        explanation:
          "Parsing turns tokens into an AST and rejects structurally invalid source (syntax errors) before execution. Division by zero, missing names at runtime, and out-of-range indices are runtime errors surfaced only when that line runs.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "See the three execution models yourself",
      brief: "Measure how the same computation behaves under pure interpretation, a built-in C loop, and vectorized native code, and inspect the bytecode that explains the gap.",
      steps: `1. Write a Python script that sums range(10_000_000) three ways: a pure-Python for-loop, the built-in sum(), and numpy.arange(...).sum().\n2. Time each with time.perf_counter() and record the ratios.\n3. Run dis.dis() on a tiny function and count how many opcodes one '+' becomes.\n4. Explain in one sentence why sum() and numpy beat the for-loop even though all three are O(n).\n5. (Optional) Repeat the numpy timing twice in one process and note there is no JIT warmup -- numpy is already native.`,
      successCriteria: [
        "The three timings differ by large constant factors despite identical Big-O",
        "You can point to interpreter dispatch / boxing as the cause of the pure-Python slowness",
        "You can read a short bytecode disassembly and identify the opcodes",
      ],
    },
  },

  {
    slug: "memory-stack-heap",
    title: "Memory: Stack vs Heap",
    track: "shared",
    phase: "cs-fundamentals",
    module: "foundations",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "Where your data actually lives -- the fast, automatic stack vs the flexible, managed heap -- and why this split explains crashes, leaks, latency spikes, and most 'why is my object shared?' bugs.",
    prerequisites: ["how-computers-run-code"],
    relatedConcepts: ["how-computers-run-code", "data-structures-that-matter", "python-data-model"],
    tags: ["memory", "stack", "heap", "allocation", "gc", "pointers", "fundamentals"],

    why: `Every value your program touches has to live somewhere in memory, and *where* it lives changes its lifetime, its cost, and whether two variables secretly point at the same thing.

**The stack/heap split is the single mental model that explains stack overflows, memory leaks, use-after-free bugs, GC pauses, and the classic "I changed one list and the other one changed too."** Without it, these look like unrelated mysteries. With it, they are one story: automatic short-lived storage vs manually/GC-managed long-lived storage.

Even in "no pointers" languages like Python and JavaScript, this model is what tells you whether you are copying a value or sharing a reference.`,

    intuition: `Two kinds of storage:

- **The stack is a stack of trays in a cafeteria.** Every function call slaps a new tray on top holding its local variables; when the function returns, the tray is instantly removed. Last-in, first-out, dirt cheap, and automatic -- but tiny and strictly scoped to the call.
- **The heap is a giant warehouse with a clerk.** You ask for space of any size, you get back a locker number (a reference/pointer), and the space stays yours until someone (you, or a garbage collector) says it is free. Flexible and long-lived, but slower to allocate and something has to track ownership.

A local variable holding a big object usually lives as a *small reference on the stack pointing to the actual object in the heap*. The tray holds the locker number; the warehouse holds the contents.`,

    howItWorks: `### The stack
- Each function call pushes a **stack frame**: its parameters, local variables, return address.
- Allocation is just moving a pointer -- effectively free.
- On return, the frame is popped; all its locals vanish automatically.
- It is bounded (often ~1-8 MB). Unbounded recursion or huge local arrays cause a **stack overflow**.

### The heap
- Requested explicitly (\`malloc\`, \`new\`) or implicitly (any object literal in Python/JS).
- Lives independently of any call frame; you reach it through a **reference**.
- Must be reclaimed: manually (C \`free\`), by ownership rules (Rust), or by a **garbage collector** (Python, Java, Go, JS).

### Values vs references (the part that bites everyone)
- A variable holding a **primitive** (int, bool) often holds the value directly.
- A variable holding an **object/array/list** holds a *reference* to a heap allocation.
- Assigning \`b = a\` for an object copies the *reference*, not the object -- so \`a\` and \`b\` mutate the same heap data. This is aliasing, and it is the root of most "why did both change?" bugs.`,

    internals: `**Stack allocation is one instruction.** Reserving locals is typically a single subtract on the stack pointer. That is why stack data is fast and why value types (Go structs, Rust stack values, C locals) avoid allocation pressure entirely.

**Heap allocation is a data structure operation.** The allocator must find a free block of the right size, split/coalesce blocks, and update bookkeeping. Under fragmentation it gets slower and wastes space. This is why allocation-heavy hot loops are slow even when the work is trivial.

**Garbage collectors trade throughput/latency for safety.** Tracing GCs periodically walk reachable objects from roots (stack + globals) and reclaim the rest. Generational GCs exploit the fact that most objects die young. The cost is **GC pauses** -- stop-the-world moments that show up as latency spikes in p99, not p50. Reference-counting (CPython) reclaims immediately but cannot break reference cycles without a separate cycle collector.

**Escape analysis** lets some runtimes prove an object never leaves a function and allocate it on the stack instead of the heap, quietly erasing GC pressure. Knowing this exists explains why "just allocate less" is sometimes done for you and sometimes not.

**Dangling pointers / use-after-free** happen in manual-memory languages when you free heap memory but keep a reference to it. GC languages trade this class of bug away for pause time; Rust trades it away at compile time via ownership and borrowing.`,

    diagram: {
      title: "A local variable pointing into the heap",
      layers: [
        { id: "frame", label: "Stack frame (this call)", sub: "params, locals, return address -- auto-freed on return" },
        { id: "ref", label: "Local reference 'user'", sub: "small pointer value living on the stack" },
        { id: "obj", label: "Heap object {name, roles[]}", sub: "actual data, lives until unreachable" },
        { id: "gc", label: "Garbage collector / free", sub: "reclaims heap once no reference remains" },
        { id: "alias", label: "b = user (aliasing)", sub: "copies the reference -> both mutate same heap object" },
      ],
      caption: "The tray (stack) holds a locker number; the warehouse (heap) holds the contents. Copying the number is not copying the contents.",
    },

    realWorld: `A service leaks memory and OOM-restarts every few hours. There is no obvious bug -- objects are created and 'go out of scope' constantly. The cause: a module-level cache (a long-lived heap root) keeps appending request objects and never evicts. Because the cache is always reachable, the GC can never reclaim those objects. Nothing 'freed' them because *they were never unreachable*. The fix is a bounded cache (LRU / size cap), not more RAM. The stack/heap model is what tells you the leak is a reachability problem, not an allocation-count problem.`,

    production: `- **Bound anything long-lived.** Caches, queues, and connection pools are heap roots; unbounded growth is the most common production 'leak.' Use LRU/size caps and TTLs.
- **Watch p99, not just p50, for GC pauses.** A healthy average with a spiky tail often means stop-the-world collection. Tune generation sizes or reduce allocation churn.
- **Reduce allocation in hot loops.** Reuse buffers, prefer value types, and let escape analysis keep short-lived objects off the heap.
- **Never share a mutable default across calls.** (Python's mutable-default-argument trap is exactly aliasing a single heap object across every call.)
- **In manual-memory code, establish clear ownership.** Every allocation has exactly one owner responsible for freeing it -- the model Rust enforces at compile time.`,

    commonMistakes: [
      "Assuming b = a copies an object -- for objects/lists it copies the reference, so both alias the same heap data.",
      "Thinking 'out of scope' frees heap memory -- it only removes one reference; the object survives while any reference (a cache, a closure, a global) remains reachable.",
      "Deep unbounded recursion causing a stack overflow, then blaming the heap.",
      "Using a mutable default argument in Python, silently sharing one heap object across all calls.",
      "Diagnosing GC-pause latency spikes as network problems because they only appear in the tail.",
    ],

    tradeoffs: `| Storage / strategy | Strength | Cost |
|---|---|---|
| Stack allocation | Nearly free, auto-freed, cache-friendly | Tiny, fixed-size, strictly call-scoped |
| Heap allocation | Any size, outlives the call, shareable | Slower alloc, fragmentation, needs reclamation |
| Garbage collection | Safety: no use-after-free | Pause times, memory overhead, cycle handling |
| Manual free (C) | Full control, no pauses | Use-after-free, double-free, leaks |
| Ownership (Rust) | Safety with no GC pauses | Steeper mental model, compile-time friction |`,

    whenToUse: [
      "Reasoning about lifetimes: does this value need to outlive the function that created it? (heap) or not? (stack)",
      "Diagnosing leaks (find the long-lived root keeping objects reachable) and OOMs.",
      "Deciding between copying data and sharing a reference to it.",
    ],
    whenNotToUse: [
      "Over-optimizing allocation before profiling shows GC or allocation is the real cost.",
      "Forcing value semantics/copies everywhere 'to be safe' when a shared reference is correct and cheaper.",
    ],

    code: [
      {
        label: "Aliasing: reference copy vs value copy (Python)",
        language: "python",
        code: `a = [1, 2, 3]
b = a            # copies the REFERENCE -- b and a point to the same heap list
b.append(4)
print(a)         # [1, 2, 3, 4]  <- a changed too, because it is the same object

c = a.copy()     # now a distinct heap list
c.append(5)
print(a)         # [1, 2, 3, 4]  <- unaffected

# The classic mutable-default trap: one heap list shared across ALL calls.
def bad(item, bucket=[]):     # 'bucket' is created ONCE, at def time
    bucket.append(item)
    return bucket

print(bad(1))    # [1]
print(bad(2))    # [1, 2]  <- surprise: same heap object reused

def good(item, bucket=None):
    bucket = [] if bucket is None else bucket
    bucket.append(item)
    return bucket`,
      },
      {
        label: "Stack vs heap and unbounded recursion",
        language: "python",
        code: `import sys

# Each call pushes a stack frame. Unbounded recursion overflows the stack.
def depth(n):
    return depth(n + 1)   # no base case

try:
    depth(0)
except RecursionError as e:
    print("stack overflow (guarded):", e)

print("stack frame limit ~", sys.getrecursionlimit())

# The heap has no such tiny limit -- this list lives on the heap and can be huge,
# reached via a single reference on the stack.
big = list(range(10_000_000))  # object in heap; 'big' is a reference on the stack`,
      },
    ],

    memoryCard: {
      problem: "Decide where each value lives -- fast auto-managed short-lived storage vs flexible long-lived storage -- and track who can reach it.",
      mentalModel: "Stack = cafeteria trays stacked per call and cleared on return. Heap = a warehouse where you hold locker numbers (references); contents survive until nothing holds the number.",
      keyConcepts: ["stack frames (LIFO, auto-freed)", "heap allocation via references", "value vs reference / aliasing", "garbage collection & pauses", "leaks = still-reachable objects", "stack overflow vs OOM"],
      productionConnection: "Leaks are unbounded reachable roots (caches/queues), not failed frees; GC pauses live in p99; bound long-lived structures and reduce allocation in hot loops.",
      oneLiner: "The stack holds small, call-scoped values automatically; the heap holds long-lived, shareable objects reached by reference -- and reachability, not scope, decides when they die.",
    },

    quiz: [
      {
        id: "msh-q1",
        prompt: "In Python, after `a = [1,2]; b = a; b.append(3)`, what is `a`?",
        choices: [
          { text: "[1, 2] -- b is an independent copy", correct: false },
          { text: "[1, 2, 3] -- b and a reference the same heap list", correct: true },
          { text: "It raises an error", correct: false },
          { text: "[3] -- append replaces the list", correct: false },
        ],
        explanation:
          "Assigning an object copies the reference, not the object. Both names alias one heap list, so mutating through either name is visible through both. To copy the contents you need a.copy() or list(a).",
      },
      {
        id: "msh-q2",
        prompt: "A GC service leaks memory even though objects 'go out of scope'. Most likely cause?",
        choices: [
          { text: "The GC is disabled", correct: false },
          { text: "A long-lived root (e.g. an unbounded cache or global list) keeps the objects reachable, so the GC cannot reclaim them", correct: true },
          { text: "The heap is too small", correct: false },
          { text: "The stack overflowed", correct: false },
        ],
        explanation:
          "A tracing GC reclaims only unreachable objects. If a global cache, queue, or closure still references them, they remain reachable and are never freed. The fix is bounding the long-lived structure, not adding RAM.",
      },
      {
        id: "msh-q3",
        prompt: "Why do GC pauses often show up as p99 latency spikes rather than higher average latency?",
        choices: [
          { text: "GC only runs on the slowest requests", correct: false },
          { text: "Stop-the-world collection halts execution occasionally, affecting a small fraction of requests severely while most are untouched", correct: true },
          { text: "The average is computed incorrectly", correct: false },
          { text: "GC increases network latency", correct: false },
        ],
        explanation:
          "Collections are periodic and brief relative to total requests, so the mean barely moves, but any request unlucky enough to be in flight during a stop-the-world pause is delayed a lot -- exactly what the tail (p99) captures.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Reproduce aliasing, a leak, and a stack overflow",
      brief: "Build small demonstrations of the three classic memory bugs so the stack/heap model becomes concrete.",
      steps: `1. Aliasing: create a list, bind a second name to it, mutate through one name, and show the other changed. Then fix it with .copy().\n2. Mutable default: write the def bad(x, bucket=[]) trap, call it twice, and show the shared heap object. Fix it with the None sentinel.\n3. Leak: append request-like dicts to a module-level list in a loop and watch RSS grow (use tracemalloc or an OS monitor). Add an LRU/size cap and show it stabilize.\n4. Stack overflow: write unbounded recursion, catch RecursionError, and print sys.getrecursionlimit().\n5. Write one sentence for each explaining whether the problem is a stack, a heap-lifetime, or a reachability issue.`,
      successCriteria: [
        "You demonstrate reference aliasing and fix it with an explicit copy",
        "You show and fix the mutable-default-argument trap",
        "You show unbounded growth stabilizing after bounding a long-lived structure",
        "You trigger and handle a stack overflow via recursion",
      ],
    },
  },

  {
    slug: "big-o-complexity",
    title: "Big-O Complexity",
    track: "shared",
    phase: "cs-fundamentals",
    module: "foundations",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "How to predict whether code survives 100x more data -- growth rates, why constants and cache still matter, and how to spot the accidental O(n^2) that only appears in production.",
    prerequisites: ["how-computers-run-code", "data-structures-that-matter"],
    relatedConcepts: ["data-structures-that-matter", "how-computers-run-code", "memory-stack-heap"],
    tags: ["big-o", "complexity", "scalability", "algorithms", "performance", "fundamentals"],

    why: `Code that is fast on your laptop with 100 rows can fall over in production with 10 million. **Big-O is the language for predicting how cost grows with input size, before the data arrives to punish you.**

You cannot benchmark your way to this answer -- your test data is too small to reveal an O(n^2) that only bites at scale. Big-O lets you reason about scalability from the shape of the code. It is also the vocabulary every engineer uses to justify a data-structure choice: "we made lookups O(1) with a hash map" is a complete argument.

The failure Big-O prevents is the most expensive kind: an architecture that works in every test and dies on launch day.`,

    intuition: `Big-O answers one question: **if I make the input much bigger, how much more work happens?** It deliberately ignores constants and small inputs to expose the *shape* of growth.

- **O(1)** -- one lookup no matter the size. A hash-map get.
- **O(log n)** -- each step halves the problem. Binary search: doubling the data adds one step.
- **O(n)** -- proportional. Scan a list once.
- **O(n log n)** -- the good sorting bound; a scan that also does log-work per element.
- **O(n^2)** -- for each item, touch every item. A nested loop over the same data. Fine at 100, fatal at 1,000,000.
- **O(2^n) / O(n!)** -- combinatorial explosion; only tractable for tiny n.

The mental test: **"for each X, do I touch all the Xs again?"** If yes, you are probably at O(n^2). If you can jump straight to the answer, you are near O(1).`,

    howItWorks: `### Reading complexity off code
- A single loop over n items: **O(n)**.
- A loop inside a loop over the same n: **O(n^2)**.
- Halving the search space each step (binary search, balanced tree): **O(log n)**.
- Sort then scan: **O(n log n)** dominated by the sort.
- Hash-map lookup/insert: **O(1)** average.

### The rules that simplify it
- **Drop constants:** O(2n) and O(500n) are both O(n). Big-O is about growth, not exact counts.
- **Keep the dominant term:** O(n^2 + n) is O(n^2). The fastest-growing term wins at scale.
- **Nested loops multiply; sequential loops add:** two separate O(n) loops are O(n), not O(n^2).

### Best / average / worst
Complexity often depends on the input. Hash lookups are O(1) *average* but O(n) *worst case* under adversarial collisions. Quicksort is O(n log n) average but O(n^2) worst case. Production cares about the worst case an attacker or unlucky data can trigger.

### Time vs space
Big-O also describes **memory** growth. You frequently trade one for the other: a hash map turns an O(n^2) nested scan into O(n) time at the cost of O(n) extra space (memoization, dedup sets, indexes).`,

    internals: `**Big-O hides constants, and constants run production.** An O(n) linked-list traversal can be far slower than an O(n) array scan because the array is contiguous and cache-friendly while the list chases pointers across the heap (cache misses). For realistic n, a "worse" complexity with great cache behavior sometimes wins -- which is why practical code uses arrays over linked lists far more than textbooks imply.

**The crossover point matters.** An O(n log n) algorithm with a big constant can lose to an O(n^2) one for small n. This is why real sorts (Timsort, introsort) switch to insertion sort under a size threshold: below the crossover, the "worse" algorithm is actually faster.

**Amortized analysis** explains structures like dynamic arrays. A single append is usually O(1), but occasionally the array doubles and copies everything (O(n)). Averaged over many appends, it is **O(1) amortized** -- individual operations spike, but the aggregate is linear. Ignoring the occasional spike is how you get surprise latency tails.

**Adversarial worst cases are a security concern.** Hash-collision attacks (deliberately colliding keys) can push a hash map to O(n) per operation and O(n^2) overall -- a real denial-of-service vector, which is why languages randomize hash seeds.`,

    diagram: {
      title: "How cost grows with input size",
      layers: [
        { id: "o1", label: "O(1) / O(log n)", sub: "constant or halving -- scales effortlessly" },
        { id: "on", label: "O(n)", sub: "linear -- 100x data = 100x work" },
        { id: "onlogn", label: "O(n log n)", sub: "good sort bound -- the practical ceiling for 'process everything'" },
        { id: "on2", label: "O(n^2)", sub: "nested scan -- fine at 100, fatal at 1,000,000" },
        { id: "exp", label: "O(2^n) / O(n!)", sub: "combinatorial -- only tiny inputs are feasible" },
      ],
      caption: "Small-data benchmarks cannot distinguish these curves. Big-O predicts the divergence before it happens.",
    },

    realWorld: `A dashboard endpoint is snappy in staging and times out in production. The code loads all users, then for each user loops over all orders to find theirs -- a nested loop, O(users * orders). With 200 test users it is invisible; with 500,000 users and millions of orders it is billions of comparisons per request. The fix is to build a dictionary of orders keyed by user_id once (O(n)) and look up each user's orders in O(1), collapsing the endpoint from O(n*m) to O(n+m). Same feature, different growth curve -- and only Big-O reasoning (not the passing staging tests) predicted the cliff.`,

    production: `- **Estimate complexity against production data volume, not test volume.** Ask 'what is n at 100x scale?' before shipping.
- **Hunt nested loops over the same collection** in code review -- the classic accidental O(n^2). Replace the inner loop with a hash-map lookup.
- **Prefer hash maps / sets to turn membership and join logic from O(n) or O(n^2) into O(1)/O(n).**
- **Beware worst cases in adversarial paths.** Randomized hashing, bounded input sizes, and regex timeouts guard against complexity-based DoS.
- **Account for amortized spikes.** Dynamic-array resizes and rehashes cause occasional latency tails; pre-size structures when the count is known.
- **Do not micro-optimize an O(1) path.** Spend effort where growth, not a constant, is the problem.`,

    commonMistakes: [
      "Concluding code is fast because it passes on small test data -- the O(n^2) only appears at scale.",
      "A nested loop over the same collection (O(n^2)) hiding behind a helper function so it is not obvious.",
      "Treating O(1) hash operations as always O(1), ignoring the O(n) worst case under collisions.",
      "Optimizing constants (micro-tweaks) instead of the growth term (algorithm/data structure).",
      "Ignoring space complexity and blowing memory to save time (or vice versa) without noticing the trade.",
      "Forgetting cache behavior: an O(n) linked list can lose badly to an O(n) contiguous array.",
    ],

    tradeoffs: `| Approach | Time | Space | When it wins |
|---|---|---|---|
| Nested scan (brute force) | O(n^2) | O(1) | Tiny n, or one-off scripts |
| Sort then scan | O(n log n) | O(n) | Need order, or dedup/grouping |
| Hash-map index | O(n) | O(n) | Lookups, joins, dedup at scale |
| Binary search on sorted data | O(log n) | O(1) | Many lookups into a stable sorted set |

The recurring trade is **spend memory (an index/hash/cache) to cut time** -- almost every scaling fix is some version of this.`,

    whenToUse: [
      "Predicting whether an approach survives 10x-100x more data before you build it.",
      "Justifying a data-structure choice in design/review ('O(1) lookups via a hash map').",
      "Spotting the accidental O(n^2) that small-scale tests will never reveal.",
    ],
    whenNotToUse: [
      "Choosing between two O(n) options where constants/cache dominate -- there, benchmark instead.",
      "Optimizing code whose n is provably tiny and fixed forever.",
      "Trusting Big-O alone for real latency -- it ignores constants, cache, and I/O that often dominate.",
    ],

    code: [
      {
        label: "Turning O(n*m) into O(n+m) with a hash index",
        language: "python",
        code: `# Slow: for each user, scan ALL orders. O(users * orders).
def orders_per_user_slow(users, orders):
    result = {}
    for u in users:
        result[u["id"]] = [o for o in orders if o["user_id"] == u["id"]]
    return result

# Fast: build an index once (O(orders)), then look up each user (O(1)).
# Total: O(users + orders).
def orders_per_user_fast(users, orders):
    index = {}
    for o in orders:                       # O(orders)
        index.setdefault(o["user_id"], []).append(o)
    return {u["id"]: index.get(u["id"], []) for u in users}  # O(users)

# Same output; radically different growth curve at production scale.`,
      },
      {
        label: "Binary search: O(log n) beats a linear scan on sorted data",
        language: "python",
        code: `import bisect

data = list(range(0, 10_000_000, 2))  # sorted

# O(n): scans until found -- up to 5,000,000 comparisons.
def contains_linear(x):
    for v in data:
        if v == x:
            return True
    return False

# O(log n): ~23 comparisons for 10M elements. Doubling n adds ONE step.
def contains_binary(x):
    i = bisect.bisect_left(data, x)
    return i < len(data) and data[i] == x`,
      },
    ],

    memoryCard: {
      problem: "Predict how a program's cost grows as input grows, so you can tell whether it survives 100x more data before that data arrives.",
      mentalModel: "Ask 'for each item, do I touch all the items again?' Nested touch = O(n^2); jump straight to the answer = O(1); halve the problem each step = O(log n).",
      keyConcepts: ["O(1)/O(log n)/O(n)/O(n log n)/O(n^2)", "drop constants, keep dominant term", "best/average/worst case", "amortized analysis", "time vs space trade", "constants & cache still matter"],
      productionConnection: "Estimate n at production scale; kill accidental O(n^2) nested loops with hash indexes; guard adversarial worst cases (hash-collision DoS); expect amortized spikes in latency tails.",
      oneLiner: "Big-O describes growth, not speed -- it predicts the scaling cliff that small tests can never reveal, while constants and cache decide the rest.",
    },

    quiz: [
      {
        id: "bigo-q1",
        prompt: "An endpoint loops over every user and, inside, loops over every order to match them. What is its time complexity and the standard fix?",
        choices: [
          { text: "O(n), already optimal", correct: false },
          { text: "O(n log n); sort the orders", correct: false },
          { text: "O(users * orders); build a hash index of orders by user_id to make it O(users + orders)", correct: true },
          { text: "O(1); it uses a dictionary", correct: false },
        ],
        explanation:
          "A loop over one collection nested inside a loop over another is the product of the two sizes -- O(n*m). Indexing the inner collection in a hash map once turns each inner lookup into O(1), reducing the total to O(n+m).",
      },
      {
        id: "bigo-q2",
        prompt: "Why can code that passes all staging tests still have a fatal scaling bug?",
        choices: [
          { text: "Staging uses different hardware", correct: false },
          { text: "Test data is small, so an O(n^2) curve is indistinguishable from O(n) until n grows large in production", correct: true },
          { text: "Tests never run the real code", correct: false },
          { text: "Big-O is only theoretical", correct: false },
        ],
        explanation:
          "At small n, quadratic and linear costs look nearly identical. The divergence only appears at scale, so benchmarks on small data cannot catch it -- reasoning about growth (Big-O) can.",
      },
      {
        id: "bigo-q3",
        prompt: "Appending to a dynamic array is described as O(1) amortized. What does that mean?",
        choices: [
          { text: "Every append is exactly one operation", correct: false },
          { text: "Most appends are O(1), but occasional resizes copy everything (O(n)); averaged over many appends the cost per append is constant", correct: true },
          { text: "Appends are always O(n)", correct: false },
          { text: "It means O(log n) in practice", correct: false },
        ],
        explanation:
          "Dynamic arrays double capacity when full, an O(n) copy, but that happens rarely enough that the average per-append cost is O(1). The individual resize still causes a latency spike -- amortized analysis averages it away, but the tail is real.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Make the O(n^2) cliff visible",
      brief: "Empirically show that Big-O predicts a scaling cliff that small inputs hide, then fix it with an index.",
      steps: `1. Implement the O(users*orders) nested-loop join and the O(users+orders) hash-index version.\n2. Time both at n = 100, 1000, 10000, 100000 and record the numbers.\n3. Plot or tabulate the ratios: confirm the nested version's time grows roughly with n^2 while the index version grows roughly linearly.\n4. Note the input size where they are indistinguishable (the reason small tests miss the bug).\n5. Repeat with a membership test: list-based 'x in list' (O(n)) vs set-based 'x in set' (O(1)) inside a loop.`,
      successCriteria: [
        "Measured timings show quadratic vs linear growth as n increases",
        "You identify the small-n region where the two are indistinguishable",
        "You explain the fix as trading O(n) space for reduced time via a hash index",
      ],
    },
  },

  {
    slug: "data-structures-that-matter",
    title: "Data Structures That Matter",
    track: "shared",
    phase: "cs-fundamentals",
    module: "foundations",
    difficulty: "core",
    estMinutes: 28,
    summary:
      "The handful of structures that decide real performance -- arrays, hash maps, trees, heaps, queues, graphs -- and how each one's access pattern maps directly to a production problem.",
    prerequisites: ["big-o-complexity", "memory-stack-heap"],
    relatedConcepts: ["big-o-complexity", "memory-stack-heap", "how-computers-run-code"],
    tags: ["data-structures", "hash-map", "array", "tree", "heap", "queue", "graph", "fundamentals"],

    why: `Choosing the right data structure is usually a bigger performance decision than any code tweak. **A data structure is a contract about which operations are cheap and which are expensive -- pick the one whose cheap operations match what your code does most.**

Get it right and an O(n^2) feature becomes O(n) for free. Get it wrong and no amount of micro-optimization saves you. Nearly every real speedup ('we made lookups instant,' 'we deduped in one pass,' 'we always pull the highest-priority job') is a data-structure choice underneath.

You do not need dozens of structures. Six carry almost all real work, and knowing exactly which operation each one makes cheap is the whole game.`,

    intuition: `Match the structure to the question you ask most:

- **Array / list** -- a numbered row of lockers. Instant access by index, cheap to scan and append, expensive to insert/delete in the middle. Use when order and iteration matter.
- **Hash map (dict)** -- a coat check: hand over a key, get your item instantly, no matter how many items. Use for lookups by key, dedup, counting, caching.
- **Set** -- a hash map with keys only. 'Have I seen this?' in O(1). Dedup and membership.
- **Tree (balanced / B-tree)** -- a sorted filing cabinet with fast lookup *and* ordered traversal / range queries. This is what a database index is.
- **Heap (priority queue)** -- a bucket that always hands you the smallest/largest item next. Schedulers, top-K, timeouts.
- **Queue / stack** -- a pipe (FIFO) or a spring-loaded tray dispenser (LIFO). Work buffering, BFS, undo, call frames.
- **Graph** -- nodes and edges. Anything that is a network: dependencies, social connections, routes.`,

    howItWorks: `### The core six and their cheap operations
- **Array:** index access O(1), append amortized O(1), search O(n), middle insert/delete O(n). Contiguous memory = cache-friendly iteration.
- **Hash map:** insert/lookup/delete O(1) average (O(n) worst case under collisions). No ordering guarantee (unless it is an ordered dict). Costs extra memory for the table.
- **Set:** same as hash map, keys only. Membership and dedup in O(1).
- **Balanced tree (red-black / AVL) and B-tree:** lookup/insert/delete O(log n) *with sorted order* -- enables range scans and 'next larger key.' B-trees are tuned for disk/pages, which is why relational indexes use them.
- **Heap:** peek-min O(1), push/pop O(log n). Gives you the extreme element cheaply without fully sorting.
- **Graph (adjacency list):** store neighbors per node; traverse with BFS (shortest hops) or DFS (reachability, cycles), each O(V + E).

### How to choose
Write down the operation your code does **most often** and pick the structure that makes *that* O(1) or O(log n):
- Lookup by key -> hash map.
- 'Seen it?' / dedup -> set.
- Ordered lookups + ranges -> tree / B-tree index.
- 'Give me the most urgent next' -> heap.
- FIFO work buffer -> queue.
- Relationships / reachability -> graph.`,

    internals: `**Hash maps live and die by their hash function and load factor.** Keys are hashed to buckets; collisions are chained or probed. When the table gets too full (load factor threshold) it **resizes and rehashes everything** -- an O(n) spike, the reason lookups are O(1) *amortized*, not always. Bad hash distribution or adversarial keys degrade every operation to O(n); production runtimes randomize the hash seed to prevent collision-DoS.

**Arrays are fast because of the CPU, not just Big-O.** Contiguous memory means iterating an array prefetches beautifully into cache, while a linked list chases pointers across the heap and stalls on cache misses. Two O(n) traversals, wildly different real speed -- which is why 'array of structs' beats 'linked list of nodes' in practice far more than complexity alone suggests.

**Balanced trees vs B-trees is a memory-hierarchy story.** Binary trees are great in RAM. Databases use **B-trees/B+-trees** because they pack many keys per node to match a disk page, minimizing the number of slow disk reads per lookup -- the height stays tiny even for billions of rows. The structure is chosen to fit the storage medium.

**A heap is an implicit tree in an array.** Parent/child are index arithmetic (2i+1, 2i+2), so there are no pointers and it is cache-friendly. Push/pop 'sift' an element up or down in O(log n). This is what backs event loops' timer wheels and job schedulers.

**Graph traversal order changes the answer.** BFS (queue) finds fewest-hop paths; DFS (stack/recursion) is for reachability and cycle detection but can blow the stack on deep graphs. Choosing the wrong traversal gives a technically-correct-but-wrong-for-the-question result.`,

    diagram: {
      title: "Pick the structure by the operation you do most",
      layers: [
        { id: "array", label: "Array / list", sub: "index O(1), scan O(n) -- order & iteration" },
        { id: "map", label: "Hash map / set", sub: "lookup/dedup O(1) avg -- keyed access, counting" },
        { id: "tree", label: "Balanced tree / B-tree", sub: "O(log n) sorted -- ranges, DB indexes" },
        { id: "heap", label: "Heap (priority queue)", sub: "min/max O(1), pop O(log n) -- schedulers, top-K" },
        { id: "graph", label: "Queue / stack / graph", sub: "FIFO/LIFO buffers; BFS/DFS over networks" },
      ],
      caption: "The right structure makes your hottest operation O(1) or O(log n); the wrong one makes it O(n) or O(n^2).",
    },

    realWorld: `A feed service checks 'has this user already seen this post?' by scanning a Python list of seen ids -- O(n) per check, inside a loop over candidate posts, so O(n*m). As history grew, feed generation crawled. Swapping the list for a set turned each membership check into O(1) and collapsed the whole path to O(n+m); latency dropped from seconds to milliseconds with a one-line change. Separately, the ranking used repeated max()-scans to pick top posts; a heap made 'pull the next highest-scored post' O(log n) instead of O(n) each time. No new hardware -- just structures whose cheap operations matched the questions being asked.`,

    production: `- **Default to a hash map/set for lookups, membership, dedup, and counting.** The most common accidental O(n^2) is 'x in list' inside a loop; 'x in set' fixes it instantly.
- **Use a heap for top-K, schedulers, and timeouts** instead of re-sorting or re-scanning to find the extreme each time.
- **Understand that DB indexes are B-trees.** Range queries and ORDER BY are fast because of tree structure; a query that cannot use the index degrades to a full O(n) scan.
- **Prefer contiguous arrays for hot iteration** -- cache locality often beats a theoretically nicer linked structure.
- **Pre-size hash maps when the count is known** to avoid rehash spikes; be aware ordered vs unordered map guarantees differ across languages.
- **Bound queues** (backpressure). An unbounded in-memory queue is a memory leak waiting for a traffic spike.`,

    commonMistakes: [
      "Using 'item in list' (O(n)) for membership inside a loop instead of a set (O(1)) -- the classic accidental O(n^2).",
      "Re-sorting or scanning for the max/min every iteration instead of using a heap.",
      "Choosing a linked list for its O(1) middle-insert while paying cache-miss costs that make iteration slower than an array.",
      "Assuming hash-map lookups are always O(1), ignoring resize spikes and worst-case collisions.",
      "Writing a query that cannot use the B-tree index (leading wildcard, function on the column) and silently getting a full scan.",
      "Leaving in-memory queues unbounded, so a spike turns into an OOM.",
    ],

    tradeoffs: `| Structure | Cheap ops | Expensive ops | Best for |
|---|---|---|---|
| Array / list | index, scan, append | middle insert/delete, search | ordered data, iteration |
| Hash map / set | lookup, insert, dedup O(1) | ordered/range queries, extra memory | keyed access, membership, counting |
| Balanced/B-tree | lookup + range O(log n), ordered | more overhead than a hash map | indexes, sorted ranges |
| Heap | min/max peek, push/pop | arbitrary lookup, full sort | schedulers, top-K, timeouts |
| Queue / stack | push/pop at end(s) | random access | buffering, BFS/DFS |
| Graph (adj list) | neighbor traversal | dense storage, some global queries | networks, dependencies |`,

    whenToUse: [
      "Any keyed lookup, dedup, counting, or caching -> hash map / set.",
      "Sorted access, range queries, or 'next greater key' -> balanced tree / B-tree (and DB indexes).",
      "Repeatedly needing the most/least extreme element -> heap.",
      "Modeling relationships, dependencies, or routes -> graph with BFS/DFS.",
    ],
    whenNotToUse: [
      "A hash map when you need ordering or range scans (use a tree instead).",
      "A heap when you need arbitrary lookups, not just the extreme (heaps do not search well).",
      "A linked list when you mostly iterate -- an array's cache locality usually wins.",
      "An unbounded in-memory queue for anything that can spike (add backpressure or a broker).",
    ],

    code: [
      {
        label: "Membership: list O(n) vs set O(1)",
        language: "python",
        code: `seen_list = list(range(1_000_000))
seen_set = set(seen_list)

target = 999_999

# O(n): scans up to a million elements each call.
print(target in seen_list)

# O(1) average: one hash lookup regardless of size.
print(target in seen_set)

# Inside a loop over m candidates this is the difference between
# O(n*m) (list) and O(n+m) (set) -- often a seconds-to-millis change.`,
      },
      {
        label: "Heap: pull the top-K without sorting everything",
        language: "python",
        code: `import heapq

scores = [(7, "a"), (2, "b"), (9, "c"), (4, "d"), (5, "e")]

# Top 3 by score in O(n log k), not a full O(n log n) sort.
top3 = heapq.nlargest(3, scores)          # [(9,'c'), (7,'a'), (5,'e')]

# A live scheduler: always pop the smallest (most urgent) next in O(log n).
pq = []
heapq.heappush(pq, (3, "email"))
heapq.heappush(pq, (1, "page-oncall"))
heapq.heappush(pq, (2, "retry-job"))
while pq:
    priority, task = heapq.heappop(pq)     # 1, 2, 3 in order
    print(priority, task)`,
      },
      {
        label: "Counting and grouping with a hash map",
        language: "python",
        code: `from collections import Counter, defaultdict

words = "the cat the dog the cat".split()

# Counting: O(n) one pass, O(1) per update.
print(Counter(words))                      # {'the': 3, 'cat': 2, 'dog': 1}

# Grouping (bucket by key): O(n), each append O(1).
orders = [{"user": 1, "id": 10}, {"user": 2, "id": 11}, {"user": 1, "id": 12}]
by_user = defaultdict(list)
for o in orders:
    by_user[o["user"]].append(o["id"])
print(dict(by_user))                        # {1: [10, 12], 2: [11]}`,
      },
    ],

    memoryCard: {
      problem: "Store data so the operation you perform most often is cheap, instead of paying O(n) or O(n^2) for it.",
      mentalModel: "Each structure is a contract about which ops are cheap: array = index/scan, hash map = keyed lookup, tree = sorted ranges, heap = the extreme element, queue/stack = buffering, graph = relationships. Match the contract to your hottest operation.",
      keyConcepts: ["array (index O(1), cache-friendly)", "hash map/set (O(1) lookup/dedup)", "B-tree = DB index (O(log n), ranges)", "heap (min/max, top-K)", "queue/stack (FIFO/LIFO, BFS/DFS)", "graph (adjacency, traversal)"],
      productionConnection: "Set membership kills accidental O(n^2); heaps power schedulers/top-K; DB indexes are B-trees so ranges/ORDER BY are fast; bound queues for backpressure; arrays win on cache locality.",
      oneLiner: "Pick the structure whose cheap operations match what your code does most -- it is usually a bigger win than any code tweak.",
    },

    quiz: [
      {
        id: "dsm-q1",
        prompt: "Code repeatedly checks 'have I seen this id?' against a growing list, inside a loop over candidates. What is the fix?",
        choices: [
          { text: "Sort the list first", correct: false },
          { text: "Use a set for membership, turning each check from O(n) into O(1) and the loop from O(n*m) to O(n+m)", correct: true },
          { text: "Use a heap", correct: false },
          { text: "Nothing -- lists are already O(1) for membership", correct: false },
        ],
        explanation:
          "'x in list' is O(n). Doing it inside a loop makes it O(n*m). A set hashes keys for O(1) average membership, collapsing the whole path to O(n+m) with a near one-line change.",
      },
      {
        id: "dsm-q2",
        prompt: "Why do relational databases use B-trees for indexes instead of in-memory binary trees or hash maps?",
        choices: [
          { text: "Hash maps cannot store integers", correct: false },
          { text: "B-trees pack many keys per node to match disk pages (few slow disk reads) and keep data ordered for range queries and ORDER BY", correct: true },
          { text: "B-trees use less code", correct: false },
          { text: "Binary trees cannot be balanced", correct: false },
        ],
        explanation:
          "B-trees are shallow and page-aligned, minimizing disk I/O per lookup for huge datasets, and they keep keys sorted so range scans and ordered results are efficient -- something a hash index cannot do.",
      },
      {
        id: "dsm-q3",
        prompt: "You need to repeatedly pull the highest-priority task from a changing set. Which structure fits best?",
        choices: [
          { text: "A list you sort on every insert", correct: false },
          { text: "A hash map", correct: false },
          { text: "A heap (priority queue): peek-min/max O(1), push/pop O(log n)", correct: true },
          { text: "A stack", correct: false },
        ],
        explanation:
          "A heap gives the extreme element cheaply without fully sorting the collection: O(1) to peek and O(log n) to push/pop, ideal for schedulers, timeouts, and top-K, unlike a stack (LIFO) or a re-sorted list (O(n log n) each change).",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Choose the structure that fixes the hot path",
      brief: "Take three slow patterns and replace each with the structure whose cheap operation matches the question being asked.",
      steps: `1. Membership: build an O(n*m) loop using 'x in list' and rewrite it with a set; time both at growing sizes.\n2. Top-K: pick the top 5 of a large scored list via full sort vs heapq.nlargest; compare cost and explain why the heap is O(n log k).\n3. Grouping: turn an O(n^2) 'for each key, filter the list' into an O(n) single pass with a defaultdict(list) index.\n4. For each rewrite, state the operation you made cheap and its new Big-O.\n5. Note one case where you must NOT use a hash map (you need ordering/ranges) and name the structure you'd use instead.`,
      successCriteria: [
        "Each rewrite maps a hot operation to a structure that makes it O(1) or O(log n)",
        "Timings confirm the improved growth curve",
        "You can articulate when a tree/B-tree is required over a hash map",
      ],
    },
  },

  {
    slug: "concurrency-vs-parallelism",
    title: "Concurrency vs Parallelism",
    track: "shared",
    phase: "cs-fundamentals",
    module: "foundations",
    difficulty: "core",
    estMinutes: 27,
    summary:
      "Two ideas people constantly conflate -- dealing with many things at once (concurrency) vs doing many things at once (parallelism) -- and why picking the wrong one wastes CPUs or blocks on I/O.",
    prerequisites: ["how-computers-run-code", "memory-stack-heap"],
    relatedConcepts: ["how-computers-run-code", "memory-stack-heap", "python-async-await", "js-event-loop"],
    tags: ["concurrency", "parallelism", "threads", "async", "gil", "io-bound", "cpu-bound", "fundamentals"],

    why: `Almost every 'make it faster' question hinges on one distinction people blur: **concurrency is structuring a program to handle many tasks that overlap in time; parallelism is actually executing multiple tasks at the same instant on multiple cores.** They are not the same, and confusing them leads to the two classic failures: adding threads to a CPU-bound job that does not speed up, and blocking a whole server on one slow I/O call.

Getting this right tells you whether to reach for async, threads, or processes -- and why the answer depends entirely on whether your work is *waiting* (I/O-bound) or *computing* (CPU-bound). This one concept underpins async/await, event loops, worker pools, and the GIL.`,

    intuition: `A **chef in a kitchen**:

- **Concurrency** is one chef juggling several dishes: start the pasta boiling, and *while it boils* chop vegetables, then stir a sauce. One worker, but progress on many tasks by switching whenever one is *waiting*. The chef is never idle waiting on the pot.
- **Parallelism** is hiring four chefs who each cook a dish *simultaneously*. Real physical at-the-same-time work, requiring four stations (cores).

The key insight: **concurrency is about dealing with a lot at once; parallelism is about doing a lot at once.** A single-core machine can be highly concurrent (interleaving) but cannot be parallel (only one thing truly runs at a time). You use concurrency to stay busy during waiting; you use parallelism to burn through computation faster.`,

    howItWorks: `### The decisive question: I/O-bound or CPU-bound?
- **I/O-bound** work spends most of its time *waiting* -- for the network, disk, or database. The CPU is idle during the wait. Here **concurrency wins**: while one task waits, run another. Async/event loops or threads let one core serve thousands of waiting requests.
- **CPU-bound** work spends its time *computing* -- hashing, image processing, number crunching. There is no waiting to hide. Only **parallelism** (multiple cores) makes it faster.

### The three tools
- **Async / event loop (cooperative concurrency):** one thread, one core, tasks voluntarily yield at await points. Ideal for massive I/O concurrency with low overhead. No true parallelism.
- **Threads (preemptive concurrency):** the OS switches between threads; they share memory. Great for I/O; for CPU work they give real parallelism *only if the runtime allows it* (see the GIL).
- **Processes (parallelism):** separate memory, separate interpreters. The way to get true multi-core CPU parallelism in Python; higher overhead and no shared memory by default.

### The catch that trips everyone: the GIL
CPython's Global Interpreter Lock lets only one thread execute Python bytecode at a time. So Python threads give great I/O concurrency but **no CPU parallelism** -- CPU-bound Python must use multiprocessing (or native/vectorized code that releases the GIL). This is the single most misunderstood performance fact in Python.`,

    internals: `**Cooperative vs preemptive is a control question.** In async, a task keeps the core until it hits an \`await\`; if it never yields (a tight CPU loop with no await), it **blocks the entire event loop** and every other task starves. In threads, the OS forcibly preempts, so one greedy task cannot freeze the others -- but that preemption can happen mid-operation, which is exactly why threads need locks.

**Shared mutable state is where concurrency turns dangerous.** Two threads incrementing the same counter can interleave between read and write and lose updates -- a **race condition**. Fixes cost you: locks serialize access (reducing the parallelism you wanted) and can **deadlock** if acquired in inconsistent order. Async sidesteps much of this within one thread (no preemption between awaits) but still has logical races across await points.

**Processes trade memory for safety.** No shared address space means no data races, but you pay serialization (pickling) to pass data and cannot share large objects cheaply. This is why CPU-parallel pipelines chunk work and minimize cross-process data.

**Context switches are not free.** Thread switches involve the OS scheduler and cache disruption; spawning thousands of OS threads is far heavier than thousands of async tasks. Async scales to enormous I/O concurrency precisely because a task is cheap (a stack frame + state), not an OS thread.

**Amdahl's Law caps parallel speedup.** If 10% of a job is inherently serial, even infinite cores cap the speedup at 10x. Parallelism has diminishing returns; the serial fraction and coordination overhead set the ceiling.`,

    diagram: {
      title: "Match the tool to the bottleneck",
      layers: [
        { id: "q", label: "Is the work waiting or computing?", sub: "I/O-bound vs CPU-bound -- the decisive question" },
        { id: "async", label: "I/O-bound -> async / event loop", sub: "one core, thousands of waiting tasks, cheap" },
        { id: "threads", label: "I/O-bound (blocking libs) -> threads", sub: "preemptive; shared memory; needs locks" },
        { id: "procs", label: "CPU-bound -> processes / cores", sub: "true parallelism; bypasses the GIL" },
        { id: "cap", label: "Amdahl's Law caps speedup", sub: "the serial fraction limits parallel gains" },
      ],
      caption: "Concurrency hides waiting on one core; parallelism burns computation across many cores. Choose by the bottleneck.",
    },

    realWorld: `A Python service that calls three slow APIs per request is 'sped up' by adding a thread pool for CPU-heavy JSON post-processing -- and it barely moves, because the GIL prevents the CPU work from running in parallel across threads. Meanwhile the real win was ignored: the three API calls run sequentially and are pure I/O wait. Switching those calls to async (gather them concurrently) cut per-request latency from the sum of the three to the max of the three -- on a single core. The CPU post-processing, if it truly mattered, belonged in a process pool. The lesson: async for the I/O waiting, processes for the CPU crunching, and threads-for-CPU in Python is a trap.`,

    production: `- **Diagnose the bottleneck first.** Profile: is the process waiting (I/O-bound) or pegging a core (CPU-bound)? The answer picks the tool.
- **I/O-bound services: use async** (or thread pools for blocking libraries) to serve many concurrent requests on few cores.
- **CPU-bound work in Python: use processes** (multiprocessing / a task queue with worker processes) or push it into native/vectorized code that releases the GIL.
- **Never block the event loop.** A synchronous CPU-heavy or blocking call inside async freezes every other task; offload it to an executor.
- **Guard shared state.** Prefer immutable messages and queues over shared mutable memory; if you must share, use locks with a consistent acquisition order to avoid deadlock.
- **Bound concurrency.** Unbounded task/thread creation exhausts memory, file descriptors, and downstream connection pools; use semaphores and worker-pool sizing.`,

    commonMistakes: [
      "Adding Python threads to a CPU-bound job and expecting a speedup -- the GIL prevents parallel bytecode execution.",
      "Assuming concurrency implies parallelism -- one core can be highly concurrent yet never parallel.",
      "Running a blocking or CPU-heavy call inside an async event loop, starving every other task.",
      "Sharing mutable state across threads without locks (race conditions) -- or with inconsistent lock order (deadlock).",
      "Spawning thousands of OS threads for I/O instead of using cheap async tasks.",
      "Expecting linear speedup from more cores, ignoring Amdahl's Law and coordination overhead.",
    ],

    tradeoffs: `| Model | Best for | Parallel? | Main cost |
|---|---|---|---|
| Async / event loop | High-concurrency I/O | No (one core) | Blocks if a task never yields; no CPU gain |
| Threads | I/O with blocking libraries | Only if no GIL | Races, locks, deadlocks, context-switch cost |
| Processes | CPU-bound work | Yes (multi-core) | Memory duplication, IPC/serialization cost |
| Vectorized/native | CPU-bound numeric | Yes (releases GIL) | Requires suitable libraries/data layout |

The recurring trade: **concurrency is cheap but not parallel; parallelism is powerful but costs memory, coordination, and complexity.**`,

    whenToUse: [
      "Async/concurrency: serving many simultaneous I/O-bound requests (APIs, DB calls, network) on limited cores.",
      "Threads: I/O concurrency when you must use blocking libraries that predate async.",
      "Processes/parallelism: CPU-bound batch work -- hashing, encoding, ML inference, number crunching.",
    ],
    whenNotToUse: [
      "Threads for CPU-bound Python (the GIL blocks parallelism) -- use processes instead.",
      "Async for CPU-heavy work -- it will block the loop; offload to an executor/process pool.",
      "Parallelism when the work is mostly serial (Amdahl's Law) or dominated by coordination overhead.",
      "Any concurrency at all when a simple sequential program is fast enough -- concurrency adds real complexity and bug classes.",
    ],

    code: [
      {
        label: "I/O-bound: async runs waits concurrently on one core",
        language: "python",
        code: `import asyncio, time

async def call_api(name, seconds):
    await asyncio.sleep(seconds)   # simulates network wait (I/O)
    return name

async def main():
    start = time.perf_counter()
    # Sequential would take 1 + 1 + 1 = 3s.
    # gather runs the WAITS concurrently: total ~ max(1,1,1) = 1s, one core.
    results = await asyncio.gather(
        call_api("a", 1), call_api("b", 1), call_api("c", 1)
    )
    print(results, f"{time.perf_counter() - start:.2f}s")  # ~1.00s

asyncio.run(main())`,
      },
      {
        label: "CPU-bound: threads do NOT help (GIL), processes do",
        language: "python",
        code: `import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def crunch(n):                      # pure CPU work
    total = 0
    for i in range(n):
        total += i * i
    return total

WORK = [20_000_000] * 4

# Threads: GIL serializes Python bytecode -> ~no speedup for CPU work.
t = time.perf_counter()
with ThreadPoolExecutor(max_workers=4) as ex:
    list(ex.map(crunch, WORK))
print("threads:", round(time.perf_counter() - t, 2), "s")

# Processes: separate interpreters -> true multi-core parallelism.
t = time.perf_counter()
with ProcessPoolExecutor(max_workers=4) as ex:
    list(ex.map(crunch, WORK))
print("processes:", round(time.perf_counter() - t, 2), "s")  # noticeably faster`,
      },
      {
        label: "Race condition: shared mutable state without a lock",
        language: "python",
        code: `import threading

counter = 0
def bump():
    global counter
    for _ in range(100_000):
        counter += 1          # read-modify-write: NOT atomic; threads interleave

threads = [threading.Thread(target=bump) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)                # often < 400000 -- lost updates (a race)

# Fix: serialize the critical section with a lock (costs some concurrency).
lock = threading.Lock()
counter = 0
def bump_safe():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1`,
      },
    ],

    memoryCard: {
      problem: "Decide how to speed up work: overlap tasks that wait (concurrency) vs run tasks truly simultaneously on many cores (parallelism).",
      mentalModel: "One chef juggling dishes while things cook (concurrency, one core) vs four chefs cooking at once (parallelism, many cores). Concurrency hides waiting; parallelism adds compute.",
      keyConcepts: ["concurrency != parallelism", "I/O-bound vs CPU-bound", "async/event loop (cooperative)", "threads (preemptive, need locks)", "processes for true parallelism", "the GIL", "races/deadlocks", "Amdahl's Law"],
      productionConnection: "Profile the bottleneck; async for I/O waiting, processes for CPU crunching; never block the event loop; Python threads give no CPU parallelism; bound concurrency to protect memory and downstream pools.",
      oneLiner: "Concurrency is dealing with many things at once (great for I/O waiting); parallelism is doing many things at once (needed for CPU work) -- match the tool to whether you are waiting or computing.",
    },

    quiz: [
      {
        id: "cvp-q1",
        prompt: "A Python service is CPU-bound. You add a thread pool and see almost no speedup. Why?",
        choices: [
          { text: "Thread pools are always slow", correct: false },
          { text: "The GIL allows only one thread to execute Python bytecode at a time, so CPU-bound threads do not run in parallel", correct: true },
          { text: "The CPU has only one core available", correct: false },
          { text: "Threads cannot do arithmetic", correct: false },
        ],
        explanation:
          "CPython's Global Interpreter Lock serializes bytecode execution, so threads give concurrency for I/O but no parallelism for CPU work. CPU-bound Python needs multiple processes (or native code that releases the GIL).",
      },
      {
        id: "cvp-q2",
        prompt: "Three sequential network calls dominate request latency. What is the right fix, and on how many cores?",
        choices: [
          { text: "Use multiprocessing across many cores", correct: false },
          { text: "Run the calls concurrently with async on a single core, so total latency approaches the max of the three instead of their sum", correct: true },
          { text: "Add more RAM", correct: false },
          { text: "Nothing can be done; network calls are serial", correct: false },
        ],
        explanation:
          "Network calls are I/O-bound (mostly waiting). Concurrency, e.g. asyncio.gather, overlaps the waits on one core, turning sum-of-latencies into max-of-latencies. Parallelism/cores are unnecessary because the CPU is idle during the waits.",
      },
      {
        id: "cvp-q3",
        prompt: "What happens if you run a long CPU-heavy loop with no await inside an async event loop?",
        choices: [
          { text: "The event loop parallelizes it automatically", correct: false },
          { text: "It blocks the single event-loop thread, starving every other task until it finishes", correct: true },
          { text: "It moves to another core", correct: false },
          { text: "It raises an exception", correct: false },
        ],
        explanation:
          "Async is cooperative: a task holds the core until it awaits. A tight CPU loop never yields, so the whole loop freezes and all other tasks stall. Such work must be offloaded to a thread/process executor.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Prove the I/O vs CPU rule",
      brief: "Empirically show that async wins for I/O-bound work and only processes win for CPU-bound work in Python.",
      steps: `1. I/O-bound: write three asyncio.sleep-based 'API calls'; run them sequentially, then with asyncio.gather; confirm total time drops from the sum to the max.\n2. CPU-bound: write a pure-Python crunch function; run it across a ThreadPoolExecutor and a ProcessPoolExecutor with 4 workers; confirm threads barely help while processes scale.\n3. Race: run four threads incrementing a shared counter without a lock; observe lost updates; add a Lock and confirm the count is correct.\n4. Block-the-loop: put a tight CPU loop inside an async task and show other tasks stall; then offload it with loop.run_in_executor and show they no longer stall.\n5. Write one sentence per experiment naming the bottleneck (I/O vs CPU) and the correct tool.`,
      successCriteria: [
        "Async reduces I/O-bound total time from sum to max on one core",
        "Processes speed up CPU-bound work while threads do not (GIL demonstrated)",
        "You reproduce and fix a race condition with a lock",
        "You show a CPU loop blocking the event loop and fix it with an executor",
      ],
    },
  },
];
