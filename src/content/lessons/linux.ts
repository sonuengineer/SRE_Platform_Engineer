import type { Lesson } from "../types";

export const linuxLessons: Lesson[] = [
  {
    slug: "linux-processes",
    title: "Linux Processes",
    track: "shared",
    phase: "linux",
    module: "linux-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "How Linux creates, tracks, and schedules processes: fork/exec, PID/PPID and the process tree, the R/S/D/Z/T states, zombies and orphans, PID 1, the cgroups and namespaces that make containers, and what load average actually measures.",
    prerequisites: [],
    relatedConcepts: ["linux-signals", "linux-observability-tools", "docker-images-layers", "k8s-crashloop"],
    tags: ["linux", "processes", "fork", "cgroups", "namespaces", "load-average"],

    why: `Almost every production incident is, at some level, about a process: one that died, one that is stuck, one eating all the CPU, or one that will not shut down cleanly. **A process is the unit the kernel schedules, isolates, and accounts resources against.** Containers are just processes wrapped in namespaces and cgroups -- so if you understand processes, you understand what Docker and Kubernetes are really doing under the hood. When you debug a crashloop, a memory leak, or a hung deploy, you are reasoning about process lifecycle.`,

    intuition: `Think of a process as a **running instance of a program with its own memory, file descriptors, and a numeric name (PID)**. New processes are born by **cloning their parent** (\`fork\`) and then optionally **replacing their own program** with a new one (\`exec\`). That is why every process has a **parent** (PPID) and the whole system forms a **tree** rooted at PID 1. A process is not always running -- it spends most of its life **asleep waiting** for something (disk, network, a timer). The scheduler only hands the CPU to processes that are actually runnable.`,

    howItWorks: `- **fork() then exec():** \`fork\` creates a near-identical child (copy-on-write memory), returning the child PID to the parent and 0 to the child. The child then usually calls \`exec\` to load a different program image, keeping the same PID. This "fork then exec" split is how shells launch commands.
- **PID / PPID:** every process has a unique PID and a PPID pointing at its parent. The tree is rooted at **PID 1** (init/systemd).
- **Process states** (the letter in \`ps\`/\`top\`):
  - **R** -- running or runnable (on a CPU or waiting for one).
  - **S** -- interruptible sleep (waiting on an event; the normal idle state).
  - **D** -- uninterruptible sleep, usually blocked on I/O; cannot be killed until it returns.
  - **Z** -- zombie: finished, but its exit status has not been reaped by the parent.
  - **T** -- stopped (by a signal like SIGSTOP, or under a debugger).
- **Reaping:** when a child exits, the kernel keeps a tiny record until the parent calls \`wait()\`. That record is the **zombie**. A well-behaved parent reaps promptly.
- **Scheduling:** the kernel time-slices runnable processes across CPUs; blocked (S/D) processes consume no CPU.`,

    internals: `- **Zombies vs orphans are opposites.** A **zombie** is a dead child whose parent has not reaped it -- it holds only a PID and exit status, no memory. Thousands of zombies exhaust the PID table. An **orphan** is a live child whose parent died first; it is **re-parented to PID 1**, which is expected to reap it when it exits.
- **PID 1 is special.** It has no parent to reap it, ignores signals it has no handler for, and is responsible for reaping orphans. In a container the app often IS PID 1 -- and most apps do not reap or handle signals like init does, which is the source of zombie buildup and slow shutdowns (fix with \`--init\` / a tini shim).
- **Namespaces = isolation.** PID, mount, network, UTS, IPC, and user namespaces let a process see its own private view of the system. A container's PID namespace is why its app sees itself as PID 1.
- **cgroups = accounting and limits.** Control groups cap and measure CPU, memory, and I/O for a set of processes. Kubernetes resource requests/limits are cgroup settings; an OOM kill is the memory cgroup enforcing its limit.
- **Load average is a runqueue measure, not a CPU-percent.** The three numbers are the 1/5/15-minute exponentially-weighted average of processes in state **R or D**. On Linux, uninterruptible I/O waiters (D) count too -- so a high load average can mean I/O saturation, not CPU saturation. Compare load to core count: load 8 on 8 cores is roughly full; load 8 on 2 cores is heavy contention.`,

    diagram: {
      title: "Process lifecycle and the tree",
      layers: [
        { id: "init", label: "PID 1 (init/systemd)", sub: "root of the tree; reaps orphans" },
        { id: "fork", label: "fork()", sub: "clone parent (copy-on-write), new PID" },
        { id: "exec", label: "exec()", sub: "replace program image, same PID" },
        { id: "run", label: "states R / S / D / T", sub: "runnable, sleeping, I/O-blocked, stopped" },
        { id: "exit", label: "exit -> wait() reaps", sub: "unreaped = zombie (Z)" },
      ],
      caption: "A process is forked, execs a program, cycles through run/sleep states, then must be reaped by its parent.",
    },

    realWorld: `A service in a container starts spawning child processes but never reaps them. Because the app is PID 1 and does no reaping, dead children pile up as **zombies**. \`ps aux\` shows hundreds of \`<defunct>\` entries; eventually the node hits the PID limit and cannot fork new processes -- unrelated deploys start failing with "resource temporarily unavailable". The fix is to run a proper init as PID 1 (\`docker run --init\`, or Kubernetes \`shareProcessNamespace\`/tini) so orphaned children are reaped.`,

    production: `- **Give containers a real init** (\`--init\`/tini) if your app forks children, so zombies are reaped and SIGTERM propagates.
- **Watch load average against core count**, and split "is it CPU or I/O?" using per-state counts -- high D-state means storage, not CPU.
- **Alert on process count / PID exhaustion**, not just CPU and memory.
- **A hung process in D state cannot be killed** even with SIGKILL until its I/O completes -- treat persistent D-state as a storage/driver problem, not an app bug.
- **Map Kubernetes limits to cgroups mentally:** throttling = CPU cgroup, OOMKilled = memory cgroup.`,

    commonMistakes: [
      "Reading load average as a CPU percentage -- it includes D-state I/O waiters and must be compared to core count.",
      "Trying to SIGKILL a D-state process and being surprised it will not die until I/O returns.",
      "Running an app directly as PID 1 in a container without an init, so zombies accumulate and signals are ignored.",
      "Confusing zombies (dead, unreaped) with orphans (alive, re-parented to PID 1).",
      "Assuming a high process/thread count is harmless -- PID tables and cgroup pids limits are finite.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| App as PID 1 (no init) | Simplest image, one process | No reaping, signals often ignored, slow/dirty shutdown |
| Init shim (tini/--init) | Reaps zombies, forwards signals | One extra process, tiny overhead |
| Many short-lived processes (fork per request) | Isolation, simplicity | fork/exec cost, PID churn, harder accounting |
| Long-lived worker pool | Low overhead, stable PIDs | Must handle leaks and stuck workers yourself |`,

    whenToUse: [
      "Debugging why a container will not stop, restarts, or shows <defunct> processes.",
      "Diagnosing whether a busy box is CPU-bound or I/O-bound via states and load average.",
    ],
    whenNotToUse: [
      "Reasoning about in-process concurrency (threads/async) -- that is a language runtime concern, not kernel process lifecycle.",
      "Pure application logic bugs unrelated to lifecycle, scheduling, or resource limits.",
    ],

    code: [
      {
        label: "Inspecting processes and their state",
        language: "bash",
        code: `# Full process list with state, CPU, memory
ps aux
# The STAT column: R running, S sleep, D uninterruptible I/O, Z zombie, T stopped

# Process tree (see parent/child relationships and PID 1)
ps -ejH        # or: pstree -p

# Find zombies
ps aux | awk '$8 ~ /Z/ { print }'

# Live view sorted by CPU / memory
top            # press 'P' for CPU, 'M' for memory
# htop is nicer if installed

# Load average and core count
uptime                 # 1/5/15-min load averages
nproc                  # number of cores to compare load against

# Show one process's PID, PPID, state
ps -o pid,ppid,stat,cmd -p 1234`,
      },
    ],

    memoryCard: {
      problem: "Create, track, isolate, and account for running programs -- and reason about the ones that hang, die, or refuse to leave.",
      mentalModel: "A tree rooted at PID 1: fork clones, exec replaces, states cycle run/sleep/blocked, and a dead child must be reaped or it lingers as a zombie.",
      keyConcepts: ["fork + exec", "PID/PPID and the tree", "states R/S/D/Z/T", "zombie (dead, unreaped) vs orphan (alive, re-parented to 1)", "cgroups (limits) + namespaces (isolation)", "load avg = R+D queue vs cores"],
      productionConnection: "Containers are processes in namespaces with cgroup limits; run a real init so zombies are reaped and SIGTERM works, and read load average against core count.",
      oneLiner: "A Linux process is a scheduled, isolated instance of a program in a PID tree -- and most prod pain is a process that died, hung in D, or was never reaped.",
    },

    quiz: [
      {
        id: "linux-proc-q1",
        prompt: "A container shows hundreds of processes in state Z. What is happening and what fixes it?",
        choices: [
          { text: "They are using too much CPU; add more cores", correct: false },
          { text: "They are zombies -- dead children never reaped by PID 1; run a proper init (tini/--init)", correct: true },
          { text: "They are stuck on disk I/O; replace the disk", correct: false },
          { text: "They are stopped by SIGSTOP; send SIGCONT", correct: false },
        ],
        explanation: "State Z is a zombie: a finished child whose exit status was never reaped. In a container the app is often PID 1 but does not reap, so dead children accumulate. Running a real init as PID 1 reaps them.",
      },
      {
        id: "linux-proc-q2",
        prompt: "A box has a 1-minute load average of 12 but top shows CPUs mostly idle. What is the most likely cause?",
        choices: [
          { text: "Load average is broken and should be ignored", correct: false },
          { text: "Many processes stuck in D (uninterruptible I/O) -- Linux counts them in load, so it is I/O saturation", correct: true },
          { text: "The kernel is miscounting cores", correct: false },
          { text: "There are too many zombie processes", correct: false },
        ],
        explanation: "On Linux, load average counts both R (runnable) and D (uninterruptible I/O) processes. High load with idle CPUs points to I/O-blocked processes, not CPU contention.",
      },
      {
        id: "linux-proc-q3",
        prompt: "What is the difference between exec() and fork()?",
        choices: [
          { text: "fork() replaces the current program; exec() creates a copy", correct: false },
          { text: "fork() clones the parent into a new process with a new PID; exec() replaces the current process's program image, keeping the PID", correct: true },
          { text: "They are aliases for the same syscall", correct: false },
          { text: "fork() runs in the kernel, exec() runs in userspace only", correct: false },
        ],
        explanation: "fork() creates a child copy (new PID, copy-on-write memory). exec() loads a different program into the current process, keeping the PID. Shells fork then exec to run commands.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Watch fork/exec, states, and a zombie in action",
      brief: "Use ps/top on your own machine to see the process tree, produce a zombie, and interpret load average.",
      steps: `1. Run \`pstree -p\` (or \`ps -ejH\`) and find PID 1 at the root of the tree. Note how your shell's PPID points back toward it.
2. In one terminal run \`sleep 300 &\`, then \`ps -o pid,ppid,stat,cmd -p <pid>\`. Confirm it is in state \`S\` (interruptible sleep) -- it consumes no CPU.
3. Create a zombie: run \`bash -c 'sleep 1 & exec sleep 30'\`. While it runs, in another terminal use \`ps aux | grep defunct\` to spot the \`<defunct>\` child whose parent has not reaped it.
4. Run \`uptime\` and \`nproc\`. Divide the 1-minute load by the core count -- above ~1.0 per core means saturation. Note whether it is plausibly CPU or I/O.
5. Optional: \`stress-ng --cpu 2 --timeout 20s\` (if installed) and watch load average climb in \`top\`, then fall after it exits.`,
      successCriteria: [
        "Identified PID 1 and traced a child's PPID up the tree.",
        "Observed a process in S state consuming no CPU.",
        "Spotted a <defunct> (zombie) process and explained why it exists.",
        "Interpreted load average relative to core count.",
      ],
    },
  },

  {
    slug: "linux-filesystem",
    title: "Linux Filesystem",
    track: "shared",
    phase: "linux",
    module: "linux-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Why everything is a file, how the VFS abstracts storage, the crucial split between inodes and filenames (hard vs soft links), the FHS layout and mount points, the page cache and buffered vs direct I/O, and the classic 'disk full but du shows nothing' open-fd trap.",
    prerequisites: ["linux-processes"],
    relatedConcepts: ["linux-processes", "linux-observability-tools", "linux-permissions", "docker-images-layers"],
    tags: ["linux", "filesystem", "inodes", "vfs", "page-cache", "mounts", "lsof"],

    why: `Storage problems are among the most confusing production incidents because the tools disagree: \`df\` says the disk is full, \`du\` says almost nothing is there, and deleting the "big file" frees nothing. **Understanding the filesystem -- inodes, links, mounts, the page cache, and open file descriptors -- turns these baffling symptoms into obvious diagnoses.** It also explains how containers layer filesystems and why volumes behave the way they do.`,

    intuition: `Linux exposes almost everything as a **file**: regular files, directories, devices (\`/dev/sda\`), sockets, pipes, even process info under \`/proc\`. This means one small set of operations (open, read, write, close) works on nearly everything. Underneath, the **VFS** (virtual filesystem) is a translation layer: your program says "read this file" and the VFS routes it to ext4, xfs, tmpfs, NFS, or an overlay -- without your program knowing or caring. A **filename is just a label pointing at an inode**; the inode is where the file actually lives.`,

    howItWorks: `- **Everything-is-a-file + VFS:** programs use the same syscalls regardless of the backing store. The VFS dispatches to the right filesystem driver.
- **Inodes vs filenames:** the **inode** holds the file's metadata (size, owner, permissions, timestamps) and pointers to its data blocks. A **directory entry** maps a name to an inode number. The name is not the file; the inode is.
- **Hard link:** a second directory entry pointing at the **same inode**. Both names are equal; the data survives until the last name is removed (link count hits 0). Cannot cross filesystems or link directories.
- **Soft (symbolic) link:** a tiny file whose contents are a **path** to another name. It can cross filesystems and point at directories, but breaks if the target is renamed/removed (dangling link).
- **FHS layout:** \`/etc\` config, \`/var\` variable data (logs), \`/tmp\` scratch, \`/usr\` programs, \`/home\` users, \`/proc\` and \`/sys\` kernel views, \`/dev\` devices.
- **Mount points:** filesystems are grafted onto directories. \`/\`, \`/var\`, and a data disk can be separate filesystems mounted at different paths -- each with its own free space and inode table.
- **Page cache:** the kernel caches file data in free RAM. Reads may be served from cache; writes go to cache first (buffered) and are flushed later.`,

    internals: `- **Two ways to run out of space.** \`df -h\` shows **block** usage; \`df -i\` shows **inode** usage. Millions of tiny files can exhaust **inodes** so you cannot create a new file even though \`df -h\` shows free gigabytes. Both are "disk full" but the fix differs.
- **The open-fd trap ("deleted but still using space").** Deleting a file only removes the **directory entry**. If a process still holds the file **open**, the inode and its blocks stay allocated until that fd closes. So \`df\` shows the space used, but \`du\` cannot find the file because it has no name. Classic case: rotating a log by \`rm\` while the app still writes to the old fd. Find it with \`lsof | grep deleted\`; fix by restarting/reopening the process (or truncating in place).
- **Buffered vs direct I/O.** Buffered writes hit the **page cache** and return fast; the kernel flushes dirty pages later (risking data loss on crash unless \`fsync\`). **Direct I/O** (\`O_DIRECT\`) bypasses the cache for databases that manage their own -- avoiding double-caching but losing the kernel's read cache.
- **df vs du disagree** for exactly two reasons: deleted-but-open files (df higher) and files under a mount point that is shadowed, or sparse/hard-linked files (du counts differently). Reconcile them deliberately.
- **tmpfs lives in RAM.** \`/dev/shm\` and often \`/tmp\` are memory-backed -- fast, but filling them eats RAM and can trigger OOM.`,

    diagram: {
      title: "Name -> inode -> blocks, and the caches",
      layers: [
        { id: "name", label: "Directory entry (filename)", sub: "just a label mapping name -> inode number" },
        { id: "inode", label: "Inode", sub: "metadata + block pointers; the real file" },
        { id: "links", label: "Hard link vs soft link", sub: "same inode vs a path-shaped pointer" },
        { id: "cache", label: "Page cache (RAM)", sub: "buffered reads/writes; flushed later" },
        { id: "fs", label: "VFS -> ext4/xfs/tmpfs/overlay", sub: "one API, many backends and mount points" },
      ],
      caption: "A filename points at an inode; deleting the name does not free blocks while an fd is open.",
    },

    realWorld: `PagerDuty fires: \`/var\` is 100% full and the service is throwing write errors. You run \`du -sh /var/log/*\` -- it adds up to 2GB on a 50GB disk. Everything looks fine, but \`df -h /var\` still says 100%. \`lsof +L1\` (or \`lsof | grep deleted\`) reveals the app holds a **48GB deleted log file** open: someone \`rm\`'d the log to "free space", but the process keeps writing to the old file descriptor, so the blocks are never released. Restarting the process (or using \`truncate\`/proper logrotate with \`copytruncate\`) instantly reclaims 48GB.`,

    production: `- **Alert on both \`df -h\` and \`df -i\`** -- inode exhaustion is invisible to block-based alerts.
- **Rotate logs properly** (logrotate with \`copytruncate\` or signal-based reopen), never a bare \`rm\` on a file an app has open.
- **Put \`/var\` (logs) and data volumes on separate mounts** so a runaway log cannot fill the root filesystem and wedge the whole box.
- **When df and du disagree, reach for \`lsof | grep deleted\` first** -- it is almost always an open deleted fd.
- **Let the page cache use free RAM** -- "low free memory" is usually healthy caching, not a leak; look at \`available\`, not \`free\`.`,

    commonMistakes: [
      "Freeing disk with `rm` on a file a running process still has open -- space is not reclaimed until the fd closes.",
      "Alerting only on `df -h` and getting blindsided by inode exhaustion (`df -i`).",
      "Assuming a symlink and a hard link behave the same -- hard links share an inode; symlinks break if the target moves.",
      "Reading `free`'s low 'free' number as a memory leak when it is just page cache doing its job.",
      "Putting logs on the root filesystem so a log flood takes down the whole host.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Hard link | No extra space, survives target rename | Same filesystem only, no directories, confusing link counts |
| Soft link | Crosses filesystems, links directories | Breaks if target moves (dangling) |
| Buffered I/O (page cache) | Fast, kernel-managed caching | Data loss on crash without fsync; double-caching for DBs |
| Direct I/O (O_DIRECT) | DB controls caching, no double cache | Loses kernel read cache, more complex, alignment rules |
| Separate mounts per role | Isolation of free space/inodes | More mounts to manage and size |`,

    whenToUse: [
      "Diagnosing 'disk full' when du and df disagree or writes fail with space available.",
      "Deciding link strategy, mount layout, or how a database should do I/O.",
    ],
    whenNotToUse: [
      "Pure in-memory data structures with no persistence concern.",
      "High-level object storage (S3) semantics -- those are not POSIX filesystems and these rules do not map cleanly.",
    ],

    code: [
      {
        label: "Diagnosing disk, inodes, and open files",
        language: "bash",
        code: `# Block usage per filesystem (the usual 'disk full')
df -h

# INODE usage -- can be full even when df -h shows free space
df -i

# What is using space in a directory (largest first)
du -sh /var/log/* | sort -rh | head

# THE classic: disk full, du shows nothing -> deleted-but-open files
lsof +L1                      # files with link count < 1 (i.e. deleted, still open)
lsof | grep '(deleted)'

# Inodes vs filenames
ls -li file        # first column is the inode number
ln  target hardlink   # hard link: same inode number
ln -s target symlink  # soft link: a path-shaped pointer

# See what is mounted where
mount | column -t
findmnt

# Reclaim space from a deleted-but-open log without restarting (truncate the live fd)
truncate -s 0 /proc/<pid>/fd/<fdnum>`,
      },
    ],

    memoryCard: {
      problem: "Read/write persistent data through one uniform API, and correctly diagnose the storage incidents where the tools seem to lie.",
      mentalModel: "A filename is a label pointing at an inode; the inode owns the blocks. Deleting the name does not free blocks while an fd holds it open.",
      keyConcepts: ["everything-is-a-file + VFS", "inode vs filename", "hard link (same inode) vs soft link (path)", "df -h (blocks) vs df -i (inodes)", "deleted-but-open fd", "page cache / buffered vs direct I/O"],
      productionConnection: "Alert on df AND df -i, rotate logs without bare rm, split /var onto its own mount, and reach for `lsof | grep deleted` when df and du disagree.",
      oneLiner: "Names point at inodes, inodes own blocks -- so a deleted file an app still has open keeps the disk full while du finds nothing.",
    },

    quiz: [
      {
        id: "linux-fs-q1",
        prompt: "`df -h` shows /var 100% full but `du -sh /var/*` sums to a fraction of that. Best first move?",
        choices: [
          { text: "Reformat the filesystem", correct: false },
          { text: "Run `lsof | grep deleted` -- a process likely holds a large deleted file open, so blocks are not freed", correct: true },
          { text: "Add swap space", correct: false },
          { text: "Increase the inode count", correct: false },
        ],
        explanation: "Deleting a file only removes its directory entry. If a process still has it open, the inode and blocks stay allocated (df sees them) but du cannot find it (no name). lsof reveals the deleted-but-open file.",
      },
      {
        id: "linux-fs-q2",
        prompt: "You cannot create a new file even though `df -h` shows 30GB free. What check explains it?",
        choices: [
          { text: "`free -m` -- you are out of RAM", correct: false },
          { text: "`df -i` -- you may be out of inodes despite free blocks", correct: true },
          { text: "`uptime` -- load average is too high", correct: false },
          { text: "`ps aux` -- too many processes", correct: false },
        ],
        explanation: "Every file needs an inode. Millions of tiny files can exhaust the inode table while plenty of block space remains. df -i shows inode usage; df -h only shows blocks.",
      },
      {
        id: "linux-fs-q3",
        prompt: "What is the key difference between a hard link and a symbolic link?",
        choices: [
          { text: "A hard link is faster; a symlink is slower", correct: false },
          { text: "A hard link is another name for the same inode; a symlink is a small file containing a path to another name", correct: true },
          { text: "A symlink shares the inode; a hard link stores a path", correct: false },
          { text: "There is no functional difference", correct: false },
        ],
        explanation: "A hard link is a second directory entry for the same inode (data survives until the last link is gone). A symlink stores a path to a target and breaks if the target is moved or removed.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Prove inodes, links, and the deleted-but-open trap",
      brief: "Create links, exhaust nothing but understand inodes, and reproduce the 'disk full but du empty' scenario safely.",
      steps: `1. Make a file and inspect its inode: \`echo hi > a.txt; ls -li a.txt\`. Note the inode number in the first column.
2. Hard-link it: \`ln a.txt b.txt; ls -li a.txt b.txt\`. Confirm both share the SAME inode number and the link count is 2.
3. Symlink it: \`ln -s a.txt c.txt; ls -li c.txt\`. Different inode; it stores the path. Now \`rm a.txt\` and confirm \`b.txt\` still works (hard link) but \`cat c.txt\` fails (dangling symlink).
4. Reproduce the open-fd trap: in one terminal \`( exec 3>/tmp/big; for i in $(seq 1 200000); do echo filler >&3; done; sleep 300 ) &\`. Then \`rm /tmp/big\`. Now compare \`du -sh /tmp/big\` (gone) with \`lsof | grep /tmp/big\` (still open, space held).
5. Reclaim without killing: find the pid/fd from lsof and run \`truncate -s 0 /proc/<pid>/fd/<fd>\`, or just end the background job. Confirm space returns.
6. Compare \`df -h .\` and \`df -i .\` to see the block vs inode views side by side.`,
      successCriteria: [
        "Showed a hard link sharing an inode and a symlink storing a path.",
        "Demonstrated a dangling symlink after removing the target.",
        "Reproduced a deleted-but-open file that df counts and du cannot find.",
        "Explained df -h vs df -i.",
      ],
    },
  },

  {
    slug: "linux-signals",
    title: "Linux Signals",
    track: "shared",
    phase: "linux",
    module: "linux-core",
    difficulty: "core",
    estMinutes: 20,
    summary:
      "How the kernel interrupts processes with signals: SIGTERM vs SIGKILL vs SIGINT vs SIGHUP vs SIGSTOP, signal handlers and graceful shutdown, why SIGKILL and SIGSTOP cannot be caught, the PID-1-in-a-container signal trap, and the SIGTERM-then-SIGKILL grace period every deploy relies on.",
    prerequisites: ["linux-processes"],
    relatedConcepts: ["linux-processes", "docker-images-layers", "k8s-pods-deployments", "k8s-crashloop"],
    tags: ["linux", "signals", "sigterm", "sigkill", "graceful-shutdown", "deploy"],

    why: `Every rolling deploy, autoscale-down, and \`kubectl delete pod\` works by **sending your process a signal and hoping it shuts down cleanly before time runs out**. If your app ignores or mishandles that signal, you drop in-flight requests, corrupt data mid-write, or hang for the full grace period and get hard-killed. Signals are the contract between the orchestrator and your process during the most dangerous moment: shutdown.`,

    intuition: `A signal is a **tiny asynchronous notification the kernel delivers to a process** -- like a tap on the shoulder saying "please stop", "you crashed", or "config changed, reload". For most signals the process can **install a handler** and decide what to do. The polite version is **SIGTERM**: "wind down when you can." The non-negotiable version is **SIGKILL**: the kernel removes the process immediately and it never runs another instruction. Graceful shutdown is simply: catch SIGTERM, stop taking new work, finish in-flight work, exit -- before someone loses patience and sends SIGKILL.`,

    howItWorks: `- **The important signals:**
  - **SIGTERM (15)** -- polite "please terminate". Catchable. The default \`kill\` signal and what orchestrators send first.
  - **SIGINT (2)** -- interrupt from the terminal (Ctrl+C). Catchable.
  - **SIGHUP (1)** -- terminal hangup; by convention repurposed to mean "reload config" for daemons.
  - **SIGSTOP (19) / SIGCONT (18)** -- pause and resume a process. SIGSTOP cannot be caught or ignored.
  - **SIGKILL (9)** -- immediate, uncatchable termination.
  - **SIGCHLD** -- sent to a parent when a child changes state (triggers reaping).
- **Handlers:** a process registers a function to run when a catchable signal arrives. It can clean up, then exit. If no handler is set, the kernel's default action applies (often terminate).
- **Graceful shutdown pattern:** on SIGTERM -> stop accepting new connections, drain/finish in-flight requests, flush and close resources, exit 0.
- **Sending signals:** \`kill -TERM <pid>\`, \`kill -9 <pid>\` (SIGKILL), \`killall <name>\`, or in shell scripts \`trap 'cleanup' TERM INT\`.`,

    internals: `- **Why SIGKILL and SIGSTOP cannot be caught.** They are handled entirely by the kernel, not the process. SIGKILL guarantees a stuck or malicious process can always be removed; SIGSTOP guarantees a process can always be paused. If they were catchable, a buggy handler could make a process unkillable. (Even SIGKILL cannot remove a process wedged in **D** state until its I/O returns.)
- **The PID-1 signal trap in containers.** The kernel does **not** apply default signal actions to PID 1 -- if PID 1 has no handler for a signal, that signal is simply **ignored**. So an app running as PID 1 that never installs a SIGTERM handler will not stop on SIGTERM at all; the orchestrator waits out the grace period and then SIGKILLs it -- slow, ungraceful shutdowns every deploy. A proper init (tini/\`--init\`) as PID 1 forwards signals to your app.
- **Signal-vs-shell-wrapper trap.** If your container entrypoint is \`sh -c "myapp"\`, the shell is PID 1 and may not forward SIGTERM to myapp. Use exec form (\`CMD ["myapp"]\`) or \`exec myapp\` so your app receives signals directly.
- **The grace period is two signals.** Orchestrators send **SIGTERM, wait N seconds, then SIGKILL**. Kubernetes default \`terminationGracePeriodSeconds\` is 30. Your drain must finish within that window or work is cut off.
- **Signals are not queued (mostly).** Standard signals are not reliably counted; multiple identical signals may coalesce into one delivery. Do not rely on receiving every one.`,

    diagram: {
      title: "The deploy shutdown handshake",
      layers: [
        { id: "term", label: "Orchestrator sends SIGTERM", sub: "polite: please wind down" },
        { id: "handler", label: "App's SIGTERM handler", sub: "stop new work, drain in-flight" },
        { id: "grace", label: "Grace period timer (e.g. 30s)", sub: "app should exit 0 within this window" },
        { id: "kill", label: "SIGKILL if still alive", sub: "uncatchable, immediate removal" },
        { id: "pid1", label: "PID 1 caveat", sub: "no handler on PID 1 => signal ignored; use init/exec form" },
      ],
      caption: "SIGTERM then (after the grace period) SIGKILL -- your handler must finish draining before the timer expires.",
    },

    realWorld: `A team notices every deploy drops a burst of 502s and takes ~30 seconds per pod to terminate. The Dockerfile uses \`CMD npm start\`, which runs as \`sh -c "npm start"\` -- so the **shell** is PID 1 and never forwards SIGTERM to Node. Kubernetes sends SIGTERM, nothing happens, and after the 30s grace period it SIGKILLs the pod mid-request. Switching to exec form (\`CMD ["node", "server.js"]\`) plus a real SIGTERM handler that stops the listener and drains connections makes shutdown clean and near-instant, and the 502s vanish.`,

    production: `- **Handle SIGTERM explicitly:** stop accepting new work, drain in-flight, flush, then exit 0. Do not ignore it.
- **Use exec form in Dockerfiles** (\`CMD ["app"]\`) or \`exec\` in entrypoint scripts so your process -- not a shell -- receives signals.
- **Run a real init** (\`--init\`/tini) when you must run under a shell or fork children, so signals propagate and zombies are reaped.
- **Fit your drain inside the grace period** (raise \`terminationGracePeriodSeconds\` if a request can legitimately take longer than 30s).
- **Combine with readiness gating:** flip readiness to false on SIGTERM so the load balancer stops sending traffic before you drain.
- **Never rely on SIGKILL for cleanup** -- it runs no handler; anything not flushed is lost.`,

    commonMistakes: [
      "Running the app under `sh -c`/shell form so the shell is PID 1 and never forwards SIGTERM.",
      "Not installing a SIGTERM handler, so the process is hard-killed every deploy and drops in-flight requests.",
      "Expecting cleanup code to run on SIGKILL -- it is uncatchable and runs nothing.",
      "Setting a grace period shorter than the longest legitimate in-flight request.",
      "Relying on receiving every signal -- standard signals can coalesce and are not queued.",
    ],

    tradeoffs: `| Signal | Catchable? | Typical use | Risk if misused |
|---|---|---|---|
| SIGTERM (15) | Yes | Polite shutdown; deploys | Ignored => hung shutdown then SIGKILL |
| SIGINT (2) | Yes | Ctrl+C interactive stop | Handler must be quick |
| SIGHUP (1) | Yes | Reload config for daemons | Wrong app treats it as terminate |
| SIGKILL (9) | No | Force-remove a stuck process | No cleanup; data loss / partial writes |
| SIGSTOP (19) | No | Pause a process | Process frozen, holds resources |`,

    whenToUse: [
      "Implementing or debugging graceful shutdown and zero-downtime deploys.",
      "Getting a stuck or runaway process to stop, or reloading a daemon's config without a restart.",
    ],
    whenNotToUse: [
      "Routine inter-process communication or passing data -- signals carry almost no payload; use sockets/pipes/queues.",
      "Coordinating fine-grained application state -- signals are async, coalescing, and unreliable for that.",
    ],

    code: [
      {
        label: "Sending signals and trapping them in a script",
        language: "bash",
        code: `# Send SIGTERM (default) -- polite shutdown
kill <pid>
kill -TERM <pid>

# Force kill -- uncatchable, no cleanup
kill -9 <pid>          # SIGKILL
kill -KILL <pid>       # same thing

# Reload config (by convention) for many daemons
kill -HUP <pid>

# Pause and resume
kill -STOP <pid>
kill -CONT <pid>

# By name
killall nginx
pkill -TERM -f myworker

# List signal names/numbers
kill -l

# Graceful shutdown in a shell script: trap SIGTERM/SIGINT
cleanup() { echo "draining..."; sleep 1; echo "done"; exit 0; }
trap cleanup TERM INT
echo "running as PID $$; send SIGTERM to test"
while true; do sleep 1; done`,
      },
    ],

    memoryCard: {
      problem: "Tell a running process to stop, reload, pause, or die -- cleanly during deploys, or forcibly when it is stuck.",
      mentalModel: "A tap on the shoulder from the kernel. SIGTERM = 'please wind down' (catchable); SIGKILL = the kernel removes you now (uncatchable). Deploys are SIGTERM, wait, SIGKILL.",
      keyConcepts: ["SIGTERM (polite) vs SIGKILL (forced, uncatchable)", "signal handlers + graceful drain", "SIGHUP=reload, SIGINT=Ctrl+C, SIGSTOP=pause", "PID 1 ignores unhandled signals", "grace period = SIGTERM then SIGKILL"],
      productionConnection: "Handle SIGTERM to drain, use exec form so your app (not a shell) is PID 1, run a real init, and fit the drain inside terminationGracePeriodSeconds.",
      oneLiner: "Deploys stop your app by sending SIGTERM then SIGKILL after a grace period -- catch SIGTERM and drain, or drop requests every rollout.",
    },

    quiz: [
      {
        id: "linux-sig-q1",
        prompt: "Every Kubernetes deploy drops in-flight requests and takes the full 30s grace period. The Dockerfile has `CMD npm start`. Most likely fix?",
        choices: [
          { text: "Increase CPU limits", correct: false },
          { text: "Use exec form (`CMD [\"node\",\"server.js\"]`) and add a SIGTERM handler so the app (not the shell) receives and acts on SIGTERM", correct: true },
          { text: "Send SIGKILL first instead of SIGTERM", correct: false },
          { text: "Disable readiness probes", correct: false },
        ],
        explanation: "`CMD npm start` runs via a shell that becomes PID 1 and often does not forward SIGTERM. Using exec form plus a real SIGTERM handler lets the app drain and exit quickly.",
      },
      {
        id: "linux-sig-q2",
        prompt: "Why can't a process run cleanup code when it receives SIGKILL?",
        choices: [
          { text: "SIGKILL is slower than SIGTERM so there is no time", correct: false },
          { text: "SIGKILL is handled by the kernel and cannot be caught or handled, so the process runs no more instructions", correct: true },
          { text: "SIGKILL only works on PID 1", correct: false },
          { text: "Cleanup handlers are disabled during deploys", correct: false },
        ],
        explanation: "SIGKILL (and SIGSTOP) are enforced by the kernel and cannot be caught, blocked, or handled. The process is removed immediately, so no handler or cleanup runs.",
      },
      {
        id: "linux-sig-q3",
        prompt: "An app running as PID 1 in a container completely ignores SIGTERM even though it has no handler. Why?",
        choices: [
          { text: "SIGTERM does not exist inside containers", correct: false },
          { text: "The kernel does not apply default signal actions to PID 1, so an unhandled signal is ignored", correct: true },
          { text: "Containers convert SIGTERM into SIGHUP", correct: false },
          { text: "The grace period was set to zero", correct: false },
        ],
        explanation: "PID 1 gets special treatment: the kernel will not apply default actions to it, so unhandled signals are dropped. Either install a handler or run a real init that forwards signals.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Trap SIGTERM and watch SIGKILL be uncatchable",
      brief: "Write a trap, send signals, and prove SIGKILL cannot be caught -- then connect it to container shutdown.",
      steps: `1. Save the script from the code sample as \`grace.sh\`, run \`bash grace.sh\`, and note the PID it prints.
2. From another terminal send \`kill -TERM <pid>\`. Watch it print "draining..." then "done" and exit cleanly -- that is a graceful shutdown.
3. Run it again and this time send \`kill -9 <pid>\` (SIGKILL). Confirm it dies instantly with NO "draining..." output -- the handler never ran.
4. Run it again and send \`kill -STOP <pid>\` then \`kill -CONT <pid>\`. Observe it freezes and resumes; note that SIGSTOP could not be trapped either.
5. Container tie-in: run \`docker run --rm --name t busybox sh -c "sleep 1000"\` in one terminal, then \`time docker stop t\` in another. Notice it waits ~10s (the default stop timeout) before SIGKILL because the shell does not forward SIGTERM. Repeat with \`docker run --rm --init --name t busybox sleep 1000\` and see it stop fast.`,
      successCriteria: [
        "Observed a SIGTERM handler drain and exit cleanly.",
        "Confirmed SIGKILL runs no handler (no drain output).",
        "Saw SIGSTOP/SIGCONT pause and resume without being trappable.",
        "Related the shell-as-PID-1 signal trap to slow container shutdown.",
      ],
    },
  },

  {
    slug: "linux-observability-tools",
    title: "Linux Observability Tools",
    track: "shared",
    phase: "linux",
    module: "linux-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "A working method for diagnosing a slow or sick Linux box: the USE method, the right tool per resource (CPU, memory, disk, network), Brendan Gregg's 60-second checklist, /proc as the source of truth, and strace/ltrace/perf for going deeper.",
    prerequisites: ["linux-processes", "linux-filesystem"],
    relatedConcepts: ["linux-processes", "linux-filesystem", "k8s-crashloop", "docker-images-layers"],
    tags: ["linux", "observability", "use-method", "strace", "perf", "proc", "performance"],

    why: `When a box or container is "slow", flailing between random commands wastes the outage. **A method turns panic into a checklist:** in 60 seconds you can localize the problem to CPU, memory, disk, or network, then drill in with the right tool. Systematic diagnosis is the difference between a five-minute fix and a two-hour guessing game -- and it is the core skill an SRE brings to an incident.`,

    intuition: `Think like a doctor doing triage. Every resource has three vital signs -- the **USE method**: **U**tilization (how busy), **S**aturation (how much queued/waiting), and **E**rrors. A resource that is 100% utilized may be fine if nothing is queued; the pain shows up as **saturation** (a growing queue). You sweep each resource -- CPU, memory, disk, network -- checking U/S/E, and the one with high saturation or errors is your suspect. Then you zoom in with a deeper tool.`,

    howItWorks: `- **USE method:** for every resource, check **Utilization, Saturation, Errors**. Saturation (queue depth / wait time) is usually the strongest pain signal.
- **Tools by resource:**
  - **CPU:** \`top\`/\`htop\` (per-process), \`mpstat -P ALL\` (per-core), \`uptime\` (load vs cores).
  - **Memory:** \`free -m\` (used vs available -- watch available, not free), \`vmstat 1\` (si/so = swap in/out; nonzero means memory pressure).
  - **Disk:** \`iostat -xz 1\` (%util, await, queue), \`iotop\` (per-process I/O).
  - **Network:** \`ss -s\` / \`ss -tan\` (sockets, states), \`iftop\`/\`nload\` (bandwidth), \`sar -n DEV 1\`.
- **The 60-second checklist** (Brendan Gregg): a fixed sequence to characterize a box fast -- see the code sample.
- **/proc is the source of truth:** most tools just read \`/proc\`. \`/proc/<pid>/status\`, \`/proc/<pid>/fd\`, \`/proc/loadavg\`, \`/proc/meminfo\` expose raw kernel state.
- **Go deeper:** \`strace\` traces **syscalls** (why is it blocked? what file/socket?), \`ltrace\` traces **library calls**, \`perf\` samples the CPU to build flame graphs of where time goes.`,

    internals: `- **Load average vs CPU utilization are different axes.** Load counts R+D processes (see the processes lesson); \`mpstat\` shows actual per-core busy time and \`%iowait\`. High \`%iowait\` + high load with idle-ish CPUs = disk-bound.
- **"free" memory is a trap.** Linux uses free RAM for the page cache, so \`free\` looks low by design. The number that matters is **available** (reclaimable cache + free). Real pressure shows as swap activity (\`si\`/\`so\` in vmstat) and the OOM killer in \`dmesg\`.
- **iostat's \`await\` and \`%util\`.** \`await\` is average I/O latency in ms; a spinning disk climbing past tens of ms under load, or \`%util\` pinned at 100%, means the disk is the bottleneck. On SSD/NVMe \`%util\` is less meaningful -- lean on latency and queue depth.
- **strace has real cost.** It stops the process on every syscall (ptrace), which can slow a hot process by 10-100x -- use \`-f\` for children, \`-c\` for a summary, \`-p <pid>\` to attach briefly, and get off it fast in production. \`perf\` (sampling) is far lower overhead for CPU profiling.
- **ss replaced netstat.** \`ss -tan\` shows TCP socket states; a pile of \`CLOSE-WAIT\` means your app is not closing sockets, \`TIME-WAIT\` floods point at high connection churn, \`SYN-RECV\` backlog hints at SYN issues.`,

    diagram: {
      title: "Triage flow: method to root cause",
      layers: [
        { id: "use", label: "USE method", sub: "Utilization / Saturation / Errors per resource" },
        { id: "60s", label: "60-second sweep", sub: "uptime, dmesg, vmstat, mpstat, iostat, free, ss" },
        { id: "resource", label: "Localize the resource", sub: "CPU vs memory vs disk vs network" },
        { id: "proc", label: "/proc for raw state", sub: "per-pid fds, status, limits" },
        { id: "deep", label: "strace / ltrace / perf", sub: "syscalls, libcalls, CPU flame graph" },
      ],
      caption: "Sweep every resource for saturation and errors, localize, then drill into the suspect with a deep tool.",
    },

    realWorld: `An API's p99 latency triples. The 60-second sweep: \`uptime\` shows load 14 on 4 cores; \`mpstat\` shows CPUs only ~30% busy but \`%iowait\` at 40%; \`iostat -xz 1\` shows the data disk at 100% \`%util\` with \`await\` over 80ms; \`iotop\` fingers a rogue backup job hammering the same volume. No CPU, no memory issue -- it was disk saturation caused by a co-located batch job. Moving the backup off-peak restores p99. The method found it in under two minutes; guessing would have chased the app code.`,

    production: `- **Standardize on the USE method and a 60-second checklist** so anyone on-call diagnoses the same way under stress.
- **Alert on saturation, not just utilization** (run-queue length, iostat await, swap activity, socket backlog) -- utilization alone hides the pain.
- **Watch \`available\` memory and swap I/O**, not the scary-looking low \`free\` number.
- **Keep strace out of the hot path** -- attach briefly with \`-p\`, prefer \`perf\` for CPU profiling; both need the right capabilities in containers.
- **Read /proc directly** when tools are missing in a minimal container image (\`cat /proc/<pid>/status\`, \`ls /proc/<pid>/fd\`).
- **Correlate with dmesg** for OOM kills, disk errors, and network drops the userspace tools do not surface.`,

    commonMistakes: [
      "Reading `free`'s low 'free' number as a leak instead of looking at 'available' and swap activity.",
      "Confusing high load average with high CPU -- it can be disk (D-state / %iowait) instead.",
      "Running strace on a hot production process and slowing it 10-100x.",
      "Alerting only on utilization and missing saturation (the real pain signal).",
      "Using deprecated netstat habits instead of ss, and ignoring socket states like CLOSE-WAIT.",
    ],

    tradeoffs: `| Tool | Strength | Cost / caveat |
|---|---|---|
| top/htop | Instant per-process overview | Coarse; snapshots, not history |
| vmstat/mpstat/iostat | Cheap per-resource time series | Must know how to read the columns |
| strace/ltrace | Exact syscall/libcall visibility | Huge slowdown (ptrace); dangerous in hot path |
| perf | Low-overhead CPU sampling, flame graphs | Needs privileges/symbols; interpretation skill |
| /proc directly | Always available, ground truth | Raw and verbose; no aggregation |`,

    whenToUse: [
      "Any 'the box/container is slow' or latency-spike incident where you must localize the bottleneck fast.",
      "Deep-diving a single process's syscalls, library calls, or CPU hotspots.",
    ],
    whenNotToUse: [
      "Distributed, cross-service latency problems -- reach for tracing/metrics/APM, not host tools first.",
      "Continuous production profiling of hot paths with strace (use sampling/perf or eBPF instead).",
    ],

    code: [
      {
        label: "Brendan Gregg's 60-second Linux triage checklist",
        language: "bash",
        code: `# 1. Load averages -- trend and vs core count
uptime

# 2. Kernel errors -- OOM kills, disk/network errors
dmesg | tail

# 3. Overall system time series (run for a few seconds)
vmstat 1
#   procs r (runnable) / b (blocked), si/so (swap), us/sy/id/wa (cpu breakdown)

# 4. Per-CPU balance -- is one core pinned?
mpstat -P ALL 1

# 5. Per-process CPU/mem over time
pidstat 1

# 6. Disk I/O -- await (latency) and %util
iostat -xz 1

# 7. Memory -- watch 'available', not 'free'
free -m

# 8. Network throughput per interface
sar -n DEV 1

# 9. TCP stats and socket states
sar -n TCP,ETCP 1
ss -s
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c   # count states

# 10. Interactive top for the obvious hog
top`,
      },
      {
        label: "Going deeper: /proc, strace, perf",
        language: "bash",
        code: `# Raw kernel truth for one process
cat /proc/<pid>/status          # state, threads, memory, uid
ls -l /proc/<pid>/fd            # open file descriptors (incl. sockets, deleted files)
cat /proc/<pid>/limits          # ulimits actually in effect

# Why is it stuck? Trace syscalls (attach briefly!)
strace -p <pid> -f              # follow children too
strace -c -p <pid>              # summary counts instead of full stream
strace -e trace=network -p <pid>

# Library calls (e.g. is it in a slow malloc / libssl call?)
ltrace -p <pid>

# CPU profiling with low overhead -> flame graph input
perf top                        # live hottest functions
perf record -F 99 -p <pid> -g -- sleep 10
perf report`,
      },
    ],

    memoryCard: {
      problem: "Localize why a Linux host or container is slow -- fast, methodically, under incident pressure.",
      mentalModel: "Triage like a doctor: check Utilization/Saturation/Errors for each resource (CPU/mem/disk/net), find the saturated one, then drill in with strace/perf.",
      keyConcepts: ["USE method (saturation is the pain signal)", "60-second checklist", "tools per resource: top/mpstat, free/vmstat, iostat/iotop, ss/iftop", "'available' not 'free' memory", "/proc = ground truth", "strace (syscalls, costly) vs perf (sampling, cheap)"],
      productionConnection: "Alert on saturation not just utilization, keep strace off the hot path, read /proc in minimal images, and correlate with dmesg for OOM/disk errors.",
      oneLiner: "Sweep CPU/memory/disk/network for saturation and errors, localize the sick resource, then drill in with /proc, strace, or perf.",
    },

    quiz: [
      {
        id: "linux-obs-q1",
        prompt: "Load is 14 on a 4-core box, but mpstat shows CPUs only 30% busy with 40% %iowait. What is the bottleneck?",
        choices: [
          { text: "CPU -- add more cores", correct: false },
          { text: "Disk I/O -- processes are blocked in D state waiting on storage; confirm with iostat await/%util", correct: true },
          { text: "Memory -- add RAM", correct: false },
          { text: "Network -- check bandwidth", correct: false },
        ],
        explanation: "High load with mostly-idle CPUs and high %iowait means processes are blocked on I/O (D state), which Linux counts in load. iostat's await/%util confirms disk saturation.",
      },
      {
        id: "linux-obs-q2",
        prompt: "In the USE method, which signal is usually the strongest indicator of pain?",
        choices: [
          { text: "Utilization -- how busy the resource is", correct: false },
          { text: "Saturation -- the queue of work waiting on the resource", correct: true },
          { text: "The number of processes", correct: false },
          { text: "Uptime", correct: false },
        ],
        explanation: "A resource can be 100% utilized and still fine if nothing is queued. Saturation (growing queue / wait time) is where users feel the pain, so it is the strongest USE signal.",
      },
      {
        id: "linux-obs-q3",
        prompt: "Why avoid running strace on a hot production process, and what is a lower-overhead alternative for CPU profiling?",
        choices: [
          { text: "strace deletes files; use rm instead", correct: false },
          { text: "strace stops the process on every syscall (ptrace) and can slow it 10-100x; use perf sampling instead", correct: true },
          { text: "strace requires root but perf does not", correct: false },
          { text: "There is no difference; both are equally cheap", correct: false },
        ],
        explanation: "strace uses ptrace and intercepts every syscall, adding massive overhead. perf samples the CPU periodically at far lower cost, making it safer for profiling hot processes.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Run the 60-second checklist against a stressed box",
      brief: "Induce load, then triage with the checklist and localize the resource -- CPU vs disk.",
      steps: `1. Baseline: run \`uptime\`, \`free -m\`, \`vmstat 1\` (a few lines), \`mpstat -P ALL 1\`, \`iostat -xz 1\`. Note the idle values.
2. Induce CPU load: \`stress-ng --cpu 4 --timeout 30s\` (or a busy loop). Re-run \`uptime\`, \`mpstat -P ALL 1\`, \`top\`. Confirm load rises AND CPUs show high user time (not iowait). That is CPU saturation.
3. Induce disk load: \`stress-ng --hdd 2 --timeout 30s\` (or \`dd if=/dev/zero of=/tmp/f bs=1M count=4000 oflag=direct\`). Re-run \`iostat -xz 1\` and watch \`await\` and \`%util\` climb; \`vmstat\` \`wa\` rises. That is disk saturation -- CPU may look idle.
4. Check memory framing: run \`free -m\` and identify \`available\` vs \`free\`; run \`vmstat 1\` and confirm \`si\`/\`so\` stay 0 (no swap = no memory pressure) even when cache is high.
5. Inspect a process via /proc: pick a PID from \`top\`, then \`cat /proc/<pid>/status\` and \`ls /proc/<pid>/fd\`. Optionally \`strace -c -p <pid>\` for a few seconds to see its top syscalls, then detach.
6. Clean up \`/tmp/f\` if you created it.`,
      successCriteria: [
        "Distinguished CPU saturation (high user %) from disk saturation (high %util/await, high %iowait).",
        "Explained available vs free memory and confirmed no swap pressure.",
        "Read raw process state from /proc.",
        "Used the checklist in order rather than guessing.",
      ],
    },
  },

  {
    slug: "linux-permissions",
    title: "Linux Permissions",
    track: "shared",
    phase: "linux",
    module: "linux-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "The Unix permission model that decides who can do what: users and groups, rwx for user/group/other, octal notation, chmod/chown, the setuid/setgid/sticky special bits, umask defaults, why 777 is dangerous, and how capabilities and container volume ownership refine or complicate root.",
    prerequisites: ["linux-filesystem"],
    relatedConcepts: ["linux-filesystem", "linux-processes", "docker-images-layers", "k8s-pods-deployments"],
    tags: ["linux", "permissions", "chmod", "setuid", "capabilities", "security", "containers"],

    why: `Permission bugs are a top cause of both **outages** ("permission denied" on a config, log, or socket after a deploy) and **breaches** (a world-writable file or an unnecessary setuid binary becomes a privilege-escalation path). In containers the pain is amplified: a volume owned by the wrong UID means your app cannot write its data, and running as root inside a container is a real risk if the container is ever escaped. **Getting permissions right is baseline production security and reliability.**`,

    intuition: `Every file carries three permission triplets -- for the **owner (user)**, the **group**, and **everyone else (other)** -- each granting some mix of **read (r)**, **write (w)**, and **execute (x)**. When a process touches a file, the kernel checks: are you the owner? then the owner bits apply. In the owning group? group bits. Otherwise? other bits. That is the whole core model. **Octal notation** is just those bits as numbers: r=4, w=2, x=1, summed per triplet -- so \`rwxr-x---\` is \`750\`.`,

    howItWorks: `- **Identity:** each process runs as a **UID** and belongs to one or more **GIDs**. Files store an owner UID and a group GID.
- **The nine bits:** \`rwx\` for user, \`rwx\` for group, \`rwx\` for other. \`ls -l\` shows them as e.g. \`-rwxr-x---\`.
- **Octal:** r=4, w=2, x=1. Add per triplet: \`755\` = rwx / r-x / r-x; \`644\` = rw- / r-- / r--; \`600\` = rw- / --- / ---.
- **On directories the bits mean something different:** \`x\` = may enter/traverse, \`r\` = may list names, \`w\` = may create/delete entries. You often need \`x\` without \`r\`.
- **Changing them:** \`chmod\` sets bits (\`chmod 640 file\`, \`chmod u+x file\`); \`chown user:group file\` sets ownership (needs root); \`chgrp\` sets group.
- **Special bits:**
  - **setuid (4xxx)** on an executable -> it runs as the file's **owner** (e.g. \`passwd\` runs as root).
  - **setgid (2xxx)** on an executable -> runs as the file's group; on a **directory** -> new files inherit the directory's group (great for shared dirs).
  - **sticky (1xxx)** on a directory -> only the file's owner can delete their files (that is why \`/tmp\` is \`1777\`).
- **umask:** subtracts default permissions from new files. A umask of \`022\` yields \`644\` files and \`755\` dirs (removes group/other write).`,

    internals: `- **setuid is a controlled privilege escalation and a classic attack surface.** A setuid-root binary runs as root regardless of who launches it; a bug in one is a direct root exploit. Audit them (\`find / -perm -4000\`) and prefer capabilities. Modern mounts often use \`nosuid\` to neuter them.
- **Capabilities split "root" into ~40 pieces.** Instead of all-or-nothing root, a process can hold just \`CAP_NET_BIND_SERVICE\` (bind ports < 1024) or \`CAP_NET_ADMIN\`, dropping the rest. This is how you run a service that needs one root power without giving it everything -- and how containers should be hardened (drop all, add back the few needed).
- **Why 777 is dangerous.** \`777\` makes a file world-writable and world-executable: any user (or any compromised process) can modify it. On a script or a web-upload directory that is remote code execution waiting to happen, and it silently disables setgid-based group inheritance intentions. "Fixing" a permission error with \`chmod 777\` trades an outage for a vulnerability.
- **root inside a container is (usually) real root on the host** for shared resources unless you use **user namespaces** (which remap container UID 0 to an unprivileged host UID). Running as non-root plus dropped capabilities plus a read-only rootfs is the hardened baseline.
- **The container volume-ownership trap.** A bind-mounted or PVC volume keeps its **host/UID ownership**; if your container process runs as UID 1000 but the volume is owned by root, writes fail with EACCES. Fix with matching \`USER\`/\`runAsUser\`, an \`fsGroup\` (Kubernetes), or chowning the volume -- not with 777.`,

    diagram: {
      title: "How a permission check resolves",
      layers: [
        { id: "id", label: "Process UID + GIDs", sub: "who is asking" },
        { id: "owner", label: "Is it the file owner?", sub: "yes -> apply user rwx bits" },
        { id: "group", label: "In the owning group?", sub: "yes -> apply group rwx bits" },
        { id: "other", label: "Otherwise", sub: "apply other rwx bits" },
        { id: "special", label: "Special bits + capabilities", sub: "setuid/setgid/sticky, dropped caps refine root" },
      ],
      caption: "The kernel picks the FIRST matching class (user, then group, then other) -- not the most permissive.",
    },

    realWorld: `After moving logs to a mounted volume, a service crashes on start with \`Permission denied\` writing \`/data/app.log\`. \`ls -ln /data\` shows the directory owned by UID 0 (root), but the container runs as UID 1000 (a hardened non-root image). A junior engineer "fixes" it with \`chmod -R 777 /data\` and the service starts -- but now every process and any attacker who lands in the container can rewrite the logs, and an auditor flags it. The correct fix is to set \`fsGroup: 1000\` (Kubernetes) or chown the volume to 1000, keeping least privilege intact.`,

    production: `- **Run containers as a non-root user** (\`USER 1000\` / \`runAsUser\`), drop all capabilities and add back only what is needed, and use a read-only root filesystem where possible.
- **Never reach for 777.** Diagnose the actual owner/group mismatch and fix ownership or the specific bit. \`750\`/\`640\` are sane defaults for app files.
- **Match volume ownership to the container UID** with \`fsGroup\`, \`chown\`, or an init step -- do not paper over it with world-writable perms.
- **Audit setuid binaries** (\`find / -perm -4000\`) and prefer capabilities to setuid-root; mount untrusted filesystems \`nosuid\`.
- **Keep umask restrictive** (022 or 027) so new files are not accidentally group/world writable.
- **Use setgid on shared directories** so a team's files inherit the right group automatically.`,

    commonMistakes: [
      "Using `chmod 777` to fix a 'permission denied' error, turning an outage into a security hole.",
      "Running the container as root instead of a dedicated non-root UID.",
      "Forgetting a directory needs `x` (traverse) even when you only want to read files inside it.",
      "Ignoring container volume ownership (UID mismatch) so the app cannot write to its own mount.",
      "Leaving unnecessary setuid-root binaries around instead of using fine-grained capabilities.",
    ],

    tradeoffs: `| Choice | Benefit | Cost / risk |
|---|---|---|
| chmod 777 | Instantly clears 'permission denied' | World-writable/executable -> privilege escalation, RCE |
| Run container as root | Nothing fails on permissions | Full host power if container is escaped |
| Non-root + drop caps + add needed | Least privilege, hardened | Must diagnose exactly which caps/UIDs are needed |
| setuid-root binary | Grants a specific privileged action | Any bug is a root exploit; large attack surface |
| Capabilities | One root power, not all | More setup; some tools still assume full root |`,

    whenToUse: [
      "Diagnosing 'permission denied' on files, sockets, or mounted volumes.",
      "Hardening a service or container image to least privilege (non-root, dropped caps).",
    ],
    whenNotToUse: [
      "Fine-grained, per-user access control inside an application -- use app-level authz, not filesystem bits.",
      "Cross-host or object-store (S3/IAM) authorization -- that is a different, policy-based model.",
    ],

    code: [
      {
        label: "Reading and setting permissions and ownership",
        language: "bash",
        code: `# Read permissions -- and show numeric UID/GID
ls -l  file
ls -ln file        # -n shows numeric owner/group (crucial in containers)

# Symbolic vs octal chmod
chmod u+x script.sh          # add execute for owner
chmod 640 secret.conf        # rw- r-- ---  (owner rw, group r, other none)
chmod 755 /usr/local/bin/app # rwx r-x r-x

# Change ownership (needs root)
chown appuser:appgroup file
chown -R 1000:1000 /data     # fix a volume for a non-root container UID

# Special bits
chmod 4755 /usr/bin/mybin    # setuid  -> runs as file owner
chmod 2775 /srv/shared       # setgid dir -> new files inherit the group
chmod 1777 /tmp              # sticky   -> only owner can delete their files

# Defaults for new files
umask               # show current mask (022 -> files 644, dirs 755)
umask 027           # tighter: no permissions for 'other'

# Security audits
find / -perm -4000 -type f 2>/dev/null   # all setuid binaries
find / -perm -0002 -type f 2>/dev/null   # world-writable files

# Capabilities (fine-grained root)
getcap /usr/bin/ping
setcap cap_net_bind_service=+ep ./myserver   # bind port < 1024 without root`,
      },
    ],

    memoryCard: {
      problem: "Decide who can read, write, or run each file -- enforcing both least-privilege security and the access an app needs to run.",
      mentalModel: "Three triplets (user/group/other) of rwx; the kernel applies the FIRST matching class. Octal = r4 w2 x1 summed per triplet.",
      keyConcepts: ["user/group/other rwx", "octal (750, 644, 600)", "chmod/chown/umask", "setuid/setgid/sticky", "capabilities split root", "777 is dangerous", "container UID + volume ownership"],
      productionConnection: "Run non-root with dropped caps, fix volume ownership with fsGroup/chown (never 777), audit setuid binaries, and keep umask restrictive.",
      oneLiner: "Permissions are three rwx triplets checked owner-then-group-then-other -- fix the real owner/UID mismatch, never paper over it with chmod 777.",
    },

    quiz: [
      {
        id: "linux-perm-q1",
        prompt: "A container app (UID 1000) gets 'permission denied' writing to a mounted volume owned by root. Best fix?",
        choices: [
          { text: "chmod -R 777 the volume", correct: false },
          { text: "Match ownership to the container UID via fsGroup/chown (e.g. chown 1000:1000), keeping least privilege", correct: true },
          { text: "Run the container as root", correct: false },
          { text: "Delete the volume", correct: false },
        ],
        explanation: "The problem is a UID/ownership mismatch. Setting the volume's owner (or fsGroup) to the container's UID grants exactly the needed access. 777 or running as root work but create security risk.",
      },
      {
        id: "linux-perm-q2",
        prompt: "What does octal 750 mean?",
        choices: [
          { text: "rwx for everyone", correct: false },
          { text: "rwx for owner, r-x for group, no access for other", correct: true },
          { text: "rw- for owner, rw- for group, r-- for other", correct: false },
          { text: "Only root can access it", correct: false },
        ],
        explanation: "r=4, w=2, x=1. 7=rwx (owner), 5=r-x (group), 0=--- (other). So 750 is full access for the owner, read+execute for the group, nothing for everyone else.",
      },
      {
        id: "linux-perm-q3",
        prompt: "Why prefer Linux capabilities over a setuid-root binary for a service that only needs to bind port 80?",
        choices: [
          { text: "Capabilities are faster at runtime", correct: false },
          { text: "You can grant just CAP_NET_BIND_SERVICE instead of full root, drastically shrinking the attack surface", correct: true },
          { text: "setuid does not work in containers at all", correct: false },
          { text: "Capabilities disable the need for a UID", correct: false },
        ],
        explanation: "A setuid-root binary runs as full root, so any bug is a root exploit. Capabilities split root into pieces, so you grant only CAP_NET_BIND_SERVICE and keep the rest dropped -- least privilege.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Read octal, set bits, and see the container UID trap",
      brief: "Translate rwx to octal, exercise chmod/umask/special bits, and reproduce the volume-ownership problem.",
      steps: `1. Create a file and read it: \`touch f; ls -l f\`. Translate the shown \`rw-rw-r--\` (or similar) into octal in your head, then verify by changing it: \`chmod 640 f; ls -l f\` -> should read \`-rw-r-----\`.
2. Directory traverse vs read: \`mkdir d; echo hi > d/x; chmod 711 d\`. As a non-owner (or via a subshell), confirm you can \`cat d/x\` if you know the name (x = traverse) but \`ls d\` fails (no r).
3. Sticky bit: inspect \`ls -ld /tmp\` and note the trailing \`t\` (\`1777\`). Explain why that stops other users deleting your files.
4. umask: run \`umask\`, then \`touch new1; ls -l new1\`. Change it: \`umask 027; touch new2; ls -l new2\` and compare -- other loses all permissions.
5. Container UID trap (if Docker is available): \`docker run --rm -u 1000 -v "$PWD/vol:/data" busybox sh -c 'touch /data/test'\` after \`mkdir vol\` owned by your user. Now \`sudo chown root:root vol\` and rerun -- observe the EACCES. Fix with \`sudo chown 1000:1000 vol\` and rerun successfully. Never reach for chmod 777.
6. Optional audit: \`find /usr/bin -perm -4000 -type f\` to list setuid binaries on your system.`,
      successCriteria: [
        "Converted rwx to octal and back with chmod.",
        "Demonstrated directory x (traverse) vs r (list).",
        "Explained the sticky bit on /tmp.",
        "Reproduced and correctly fixed a container volume UID mismatch without using 777.",
      ],
    },
  },
];
