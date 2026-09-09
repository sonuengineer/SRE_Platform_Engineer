import type { Lesson } from "../types";

export const platformLessons: Lesson[] = [
  {
    slug: "docker-images-layers",
    title: "Docker Images & Layers",
    track: "shared",
    phase: "docker",
    module: "docker-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Why containers solved 'works on my machine', how the layered union filesystem makes images cacheable and small, and the Dockerfile ordering that makes or breaks build speed.",
    prerequisites: ["linux-processes"],
    relatedConcepts: ["dockerfile-best-practices", "docker-networking", "k8s-pods-deployments"],
    tags: ["docker", "images", "layers", "cache", "containers"],

    why: `"It works on my machine" happens because an app depends on a specific OS, libraries, and environment that differ in production. **A container image bundles the app with its entire userland filesystem** so it runs identically everywhere. Images are built in **layers** so they're cacheable, shareable, and small -- which is what makes CI/CD and Kubernetes practical at scale.`,

    intuition: `An image is like a **stack of transparent sheets** (layers). The base sheet is the OS; the next adds your runtime; the next your dependencies; the top your code. To build a similar image, Docker **reuses sheets it already drew** (cache). A running **container** is just this stack plus one thin writable sheet on top -- which is why containers start in milliseconds and why changes vanish when the container dies (unless you use a volume).`,

    howItWorks: `- **Each Dockerfile instruction (\`RUN\`, \`COPY\`, \`ADD\`) creates a layer** -- an immutable diff of the filesystem. Layers stack via a **union filesystem** (overlayfs).
- **Layer caching:** if an instruction and its inputs are unchanged, Docker reuses the cached layer and skips the work. **Order matters enormously.**
- **The killer rule:** copy dependency manifests and install deps *before* copying your source. Then a code change only busts the cheap top layers, not the expensive dependency install.
- **A container = image layers (read-only) + a writable layer.** Writes go to the top layer and are lost on removal unless persisted to a **volume**.
- **Multi-stage builds:** build in a fat image, copy only the artifact into a tiny runtime image -> small, secure final image.`,

    internals: `- **Images are content-addressed** by digest; identical layers are shared across images and pulled once.
- **Cache invalidation cascades:** changing one instruction invalidates it and *every* layer after it.
- **\`COPY . .\` early is the #1 mistake** -- any source change reinstalls all dependencies.
- **Smaller base images** (\`slim\`, \`alpine\`, distroless) mean faster pulls, less attack surface -- but alpine's musl libc can break some Python/Node native builds.
- **\`.dockerignore\`** keeps \`node_modules\`, \`.git\`, and secrets out of the build context (faster builds, no secret leaks into layers).
- **Secrets in layers persist** even if deleted in a later layer -- never \`COPY\` a secret then \`rm\` it; use build secrets.`,

    diagram: {
      title: "Image layers -> container",
      layers: [
        { id: "base", label: "Base OS layer", sub: "e.g. python:3.12-slim (cached, shared)" },
        { id: "deps", label: "Dependencies layer", sub: "COPY requirements + install (rebuild only when deps change)" },
        { id: "code", label: "App code layer", sub: "COPY . . (rebuilds on every code change)" },
        { id: "config", label: "CMD / ENV / EXPOSE", sub: "metadata" },
        { id: "writable", label: "Container writable layer", sub: "ephemeral; use a volume to persist" },
      ],
      caption: "Put slow-changing layers (deps) below fast-changing ones (code) to maximise cache hits.",
    },

    realWorld: `A CI build takes 6 minutes because the Dockerfile does \`COPY . .\` then \`pip install\`. Every one-line code change reinstalls all dependencies. Reordering to \`COPY requirements.txt\` -> \`pip install\` -> \`COPY . .\` drops incremental builds to 20 seconds: the dependency layer is cached and only the code layer rebuilds. Same image, 18x faster CI.`,

    production: `- **Order Dockerfile from least- to most-frequently-changing** (deps before code).
- **Use multi-stage builds** to ship a minimal runtime image.
- **Pin base image versions** (\`python:3.12.4-slim\`, not \`latest\`) for reproducibility.
- **Add a \`.dockerignore\`**; never bake secrets into layers.
- **Run as a non-root user** in the final image.
- **Persist state to volumes** -- never rely on the container's writable layer.`,

    commonMistakes: [
      "COPY . . before installing dependencies -> cache busts on every code change.",
      "Using :latest base tags -> non-reproducible builds.",
      "Baking secrets into layers (they persist even if rm'd later).",
      "Giant images from fat base + no multi-stage build -> slow pulls, big attack surface.",
      "Storing data in the container filesystem and losing it on restart.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Layer caching | Fast incremental builds | Cache invalidation cascades on reorder |
| Alpine/distroless base | Tiny, secure | musl/library incompatibilities, harder debugging |
| Multi-stage | Small final image | Slightly more complex Dockerfile |`,

    whenToUse: ["Packaging any app for consistent deployment across dev/CI/prod; anything you'll run on Kubernetes."],
    whenNotToUse: ["When you genuinely need full VM isolation/security boundaries (containers share the host kernel).", "Ultra-simple scripts where a container adds only overhead."],

    memoryCard: {
      problem: "Run an app identically everywhere by bundling it with its whole userland, cacheably and small.",
      mentalModel: "A stack of transparent sheets: reuse the ones already drawn; the running container adds one thin writable sheet on top.",
      keyConcepts: ["layers = filesystem diffs", "union filesystem", "cache order (deps before code)", "multi-stage builds", "ephemeral writable layer -> volumes"],
      productionConnection: "Order Dockerfile least->most changing, multi-stage for small images, pin versions, no secrets in layers, run non-root.",
      oneLiner: "A Docker image is cacheable stacked filesystem layers -- order the Dockerfile deps-before-code and your builds get dramatically faster.",
    },

    quiz: [
      {
        id: "docker-q1",
        prompt: "Why put `COPY requirements.txt` and install before `COPY . .`?",
        choices: [
          { text: "It makes the image smaller", correct: false },
          { text: "So a code change only rebuilds the cheap top layer, not the expensive dependency install", correct: true },
          { text: "Because COPY . . is not allowed early", correct: false },
          { text: "It encrypts the dependencies", correct: false },
        ],
        explanation: "Layer caching reuses unchanged layers. Installing deps in an earlier layer means a code change (a later layer) doesn't invalidate the dependency layer -- huge build-time savings.",
      },
      {
        id: "docker-q2",
        prompt: "Where do writes inside a running container go, and what happens on removal?",
        choices: [
          { text: "To the base image; they persist forever", correct: false },
          { text: "To a thin writable layer on top; they're lost on removal unless a volume is used", correct: true },
          { text: "Directly to the host root filesystem", correct: false },
          { text: "Nowhere; containers are read-only", correct: false },
        ],
        explanation: "A container adds one writable layer over the read-only image layers. That layer is discarded when the container is removed, so persistent data must live in a volume.",
      },
    ],

    lab: {
      kind: "terminal",
      title: "Debug a slow/broken build",
      brief: "A Dockerfile rebuilds everything on each change and the image is 1.2GB. Inspect layer ordering and prescribe fixes.",
      scenarioId: "docker-build",
      successCriteria: ["Spot COPY . . before install", "Recommend reorder + multi-stage + .dockerignore"],
    },
  },

  {
    slug: "k8s-architecture",
    title: "Kubernetes Architecture",
    track: "shared",
    phase: "kubernetes",
    module: "k8s-core",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "The control loop that runs everything: API server, etcd, scheduler, controllers, kubelet -- and the declarative 'desired state' model that makes it self-healing.",
    prerequisites: ["docker-images-layers", "linux-processes"],
    relatedConcepts: ["k8s-pods-deployments", "k8s-services-ingress", "k8s-crashloop"],
    tags: ["kubernetes", "control-plane", "etcd", "scheduler", "reconciliation"],

    why: `Running containers by hand across many machines is untenable: what restarts a crashed container, reschedules when a node dies, rolls out a new version safely, or wires up networking? **Kubernetes exists to be the control system that continuously drives the cluster toward a declared desired state**, so you say *what* you want and it figures out *how* to keep it true -- self-healing, rolling updates, and scaling included.`,

    intuition: `Kubernetes is a **thermostat, not a light switch**. You don't say "start 3 containers" (imperative); you declare "I want 3 replicas" (desired state) and Kubernetes' controllers continuously compare desired vs actual and act to close the gap -- forever. A pod dies? Actual is now 2, desired is 3, so it starts one. That endless **reconciliation loop** is the single most important idea in Kubernetes.`,

    howItWorks: `**Control plane (the brain):**
- **API server** -- the single front door; everything (kubectl, controllers, kubelets) talks to it. Validates and stores state.
- **etcd** -- the consistent key-value store holding the entire cluster state (the source of truth).
- **Scheduler** -- decides *which node* a new pod runs on (based on resources, affinity, taints).
- **Controller manager** -- runs the reconciliation loops (Deployment, ReplicaSet, Node controllers, etc.).

**Data plane (the muscle), on every node:**
- **kubelet** -- talks to the API server, starts/stops containers via the container runtime, reports health.
- **kube-proxy / CNI** -- wires up pod networking and Service routing.

**The flow:** \`kubectl apply\` -> API server -> stored in etcd -> controller notices desired != actual -> scheduler places pods -> kubelet runs them -> status reported back.`,

    internals: `- **Everything is a declarative object** reconciled by a controller; even Deployments are just controllers managing ReplicaSets managing Pods.
- **etcd is the crown jewels:** lose it and you lose cluster state. It uses Raft consensus, needs an odd number of members (quorum), and must be backed up.
- **The API server is the only thing that talks to etcd;** components watch the API server for changes (level-triggered, not edge-triggered -- they reconcile to current state, not to events).
- **Controllers are level-triggered:** they don't rely on catching every event; they periodically reconcile actual against desired, which makes the system robust to missed messages.
- **kubelet owns the node:** the control plane can be down and existing pods keep running; you just can't make changes.`,

    diagram: {
      title: "Kubernetes control loop",
      layers: [
        { id: "kubectl", label: "kubectl apply", sub: "declare desired state (YAML)" },
        { id: "api", label: "API server", sub: "validate -> persist" },
        { id: "etcd", label: "etcd", sub: "consistent store = source of truth" },
        { id: "ctrl", label: "Controllers + Scheduler", sub: "desired != actual -> act; place pods" },
        { id: "kubelet", label: "kubelet (each node)", sub: "run containers, report status" },
      ],
      caption: "Reconciliation never stops: controllers continuously drive actual toward desired.",
    },

    realWorld: `A node hosting 12 pods suddenly dies. Within seconds the node controller marks it NotReady; the ReplicaSet controllers see actual replicas dropped below desired and create replacements; the scheduler places them on healthy nodes; kubelets start them. No human acted. That self-healing is the reconciliation loop doing its job -- and it's also why "just kubectl delete pod" to fix something often does nothing lasting: the controller just recreates it to match desired state.`,

    production: `- **Back up etcd** and protect the control plane -- it's the source of truth.
- **Set resource requests/limits** so the scheduler can place pods sanely and one pod can't starve a node.
- **Use readiness + liveness probes** so reconciliation knows real health, not just "process running."
- **Change desired state, not pods directly** -- edit the Deployment; don't fight the controller.
- **Run control plane HA** (multiple API servers, odd etcd quorum).
- **Understand that control-plane downtime doesn't kill running pods** -- but it does freeze changes and self-healing.`,

    commonMistakes: [
      "Deleting pods to 'fix' things instead of changing the Deployment (controller just recreates them).",
      "No resource requests/limits -> scheduler misplaces pods, noisy-neighbor evictions.",
      "Treating liveness probes as readiness (killing pods that are merely warming up).",
      "Not backing up etcd.",
      "Thinking Kubernetes is imperative -- it's a reconciliation system.",
    ],

    tradeoffs: `| Property | Benefit | Cost |
|---|---|---|
| Declarative + reconciliation | Self-healing, auditable, GitOps-friendly | Steep learning curve; indirection |
| Powerful abstraction | Runs anything at scale | Operational complexity; easy to misconfigure |
| Control/data plane split | Nodes survive control-plane blips | More moving parts to run |`,

    whenToUse: ["Many services needing scaling, self-healing, rolling deploys, and consistent networking across a fleet."],
    whenNotToUse: ["A single small app (a PaaS or one VM is simpler).", "Teams without capacity to operate the complexity.", "Ultra-low-latency workloads where the networking overhead matters and you control the hardware."],

    memoryCard: {
      problem: "Continuously keep a fleet of containers in a declared desired state -- self-healing, scaling, and updating them.",
      mentalModel: "A thermostat: you set the target (3 replicas) and controllers endlessly drive actual toward it.",
      keyConcepts: ["desired state + reconciliation", "API server + etcd", "scheduler + controllers", "kubelet on each node", "level-triggered control loops"],
      productionConnection: "Change the Deployment (not pods), set requests/limits + probes, back up etcd, run HA control plane.",
      oneLiner: "Kubernetes is a reconciliation engine: declare desired state, and controllers continuously make the cluster match it.",
    },

    quiz: [
      {
        id: "k8sa-q1",
        prompt: "What is the core operating model of Kubernetes?",
        choices: [
          { text: "Imperative: you run commands that directly start containers", correct: false },
          { text: "Declarative: you set desired state and controllers reconcile actual toward it continuously", correct: true },
          { text: "Event-driven: it only acts when it catches an event", correct: false },
          { text: "Manual: an operator places every pod", correct: false },
        ],
        explanation: "You declare desired state; controllers run level-triggered reconciliation loops that continuously compare actual vs desired and act to close the gap -- giving self-healing.",
      },
      {
        id: "k8sa-q2",
        prompt: "You `kubectl delete pod` a misbehaving pod in a Deployment. What happens?",
        choices: [
          { text: "It's gone permanently", correct: false },
          { text: "The ReplicaSet controller sees replicas < desired and creates a replacement", correct: true },
          { text: "The whole Deployment is deleted", correct: false },
          { text: "The node reboots", correct: false },
        ],
        explanation: "Deleting a pod drops actual below desired, so the controller immediately recreates one. To change behavior, edit the Deployment (desired state), not the pod.",
      },
      {
        id: "k8sa-q3",
        prompt: "What does etcd hold, and why is it critical?",
        choices: [
          { text: "Container images", correct: false },
          { text: "The entire cluster state and desired config -- the source of truth", correct: true },
          { text: "Application logs", correct: false },
          { text: "Only network routes", correct: false },
        ],
        explanation: "etcd is the consistent (Raft-based) key-value store that holds all cluster state. Lose it without a backup and you lose the cluster's source of truth.",
      },
    ],

    lab: {
      kind: "diagram-explore",
      title: "Trace a kubectl apply",
      brief: "Follow a Deployment change from kubectl through the API server, etcd, controllers, scheduler, and kubelet.",
      successCriteria: ["Correctly order the components", "Explain reconciliation vs imperative"],
    },
  },

  {
    slug: "k8s-crashloop",
    title: "Debugging CrashLoopBackOff",
    track: "shared",
    phase: "kubernetes",
    module: "k8s-core",
    difficulty: "advanced",
    estMinutes: 22,
    summary:
      "The most common Kubernetes failure: what CrashLoopBackOff actually means, the decision tree to diagnose it, and the handful of root causes behind 90% of cases.",
    prerequisites: ["k8s-architecture", "k8s-pods-deployments"],
    relatedConcepts: ["k8s-resources-limits", "k8s-services-ingress", "incident-response"],
    tags: ["kubernetes", "crashloop", "debugging", "probes", "oomkilled"],

    why: `\`CrashLoopBackOff\` is the single most common thing you'll see go wrong on Kubernetes, and it panics people because the name sounds catastrophic. It's actually just Kubernetes telling you: **"your container keeps exiting, so I'm restarting it with increasing backoff delays."** Knowing the small set of root causes and a clean decision tree turns a scary status into a 3-minute fix.`,

    intuition: `Think of Kubernetes as **repeatedly trying to start a car that stalls immediately.** It cranks the engine (starts the container), the engine dies (container exits), so it waits a bit longer and tries again -- 10s, 20s, 40s (exponential backoff). \`CrashLoopBackOff\` isn't the disease; it's the *symptom*. Your job is to find *why the engine stalls*, and the answer is almost always in the logs or the events.`,

    howItWorks: `**The diagnosis decision tree:**
1. \`kubectl get pods\` -- confirm the status and restart count.
2. \`kubectl describe pod <name>\` -- read **Events** (image pull errors, probe failures, OOMKilled) and the **Last State / Reason / Exit Code**.
3. \`kubectl logs <name> --previous\` -- the logs of the *crashed* container (the \`--previous\` is key; the current one may not have started).
4. Map the signal:
   - **Exit code 1 / app stack trace** -> application/config error (missing env var, bad DB URL, failed migration).
   - **Reason: OOMKilled (exit 137)** -> memory limit too low or a leak.
   - **Liveness probe failing** -> probe misconfigured or app slow to start (needs a startup probe / higher \`initialDelaySeconds\`).
   - **CreateContainerConfigError** -> missing ConfigMap/Secret.
   - **ImagePullBackOff** (related) -> wrong image name/tag or registry auth.`,

    internals: `- **BackOff is exponential**, capped (~5 min). The pod isn't "stuck"; it's waiting between attempts.
- **Exit code 137 = 128 + 9 (SIGKILL)** -- almost always OOMKilled (check \`describe\` for the reason). Exit 143 = SIGTERM.
- **Liveness vs readiness confusion is a top cause:** a liveness probe that fires before a slow app finishes booting kills it in a loop. Use a **startup probe** for slow starters.
- **The container may crash before writing logs** -- then \`describe\` events and exit codes are your evidence, not \`logs\`.
- **A failed DB connection at boot** is the classic app-level cause: the app exits non-zero on startup, so it never becomes ready.`,

    diagram: {
      title: "CrashLoop diagnosis flow",
      layers: [
        { id: "get", label: "kubectl get pods", sub: "status + restarts" },
        { id: "describe", label: "kubectl describe pod", sub: "Events + Last State + exit code" },
        { id: "logs", label: "kubectl logs --previous", sub: "the crashed container's output" },
        { id: "classify", label: "Classify", sub: "OOMKilled / config / probe / app error" },
        { id: "fix", label: "Fix desired state", sub: "raise limits / fix env / add startup probe" },
      ],
    },

    realWorld: `A newly deployed pod is in \`CrashLoopBackOff\` with 7 restarts. \`kubectl describe\` shows \`Last State: Terminated, Reason: OOMKilled, Exit Code: 137\`. The memory limit was set to 128Mi but the JVM's heap alone wanted 256Mi. Raising the limit (and setting \`-Xmx\` appropriately) fixes it. Without reading the exit code you'd waste an hour suspecting the app -- the signal was right there in \`describe\`.`,

    production: `- **Always \`kubectl logs --previous\`** on a crashlooping pod -- the current attempt may have no logs.
- **Read the exit code and Reason in \`describe\`** before touching code (137 = OOM is the fast win).
- **Set realistic memory limits**; watch for OOMKilled after deploys.
- **Use startup probes for slow-booting apps** so liveness doesn't kill them mid-boot.
- **Validate ConfigMaps/Secrets exist** before rollout (CreateContainerConfigError).
- **Make apps fail loudly with clear startup errors** (bad DB URL, missing env) so logs point straight at the cause.`,

    commonMistakes: [
      "Forgetting `--previous` and reading empty logs from a container that never started.",
      "Assuming CrashLoopBackOff is a Kubernetes bug rather than your container exiting.",
      "Ignoring exit code 137 / OOMKilled and blaming the app logic.",
      "Liveness probe with too-short initialDelay killing a slow-starting app forever.",
      "Referencing a ConfigMap/Secret that doesn't exist yet.",
    ],

    tradeoffs: `| Signal | Likely cause | Fix |
|---|---|---|
| Exit 1 + stack trace | App/config error | Fix env/DB/migration |
| Exit 137 / OOMKilled | Memory limit too low or leak | Raise limit / fix leak |
| Liveness failing early | Probe too aggressive | Startup probe / raise initialDelay |
| CreateContainerConfigError | Missing Secret/ConfigMap | Create it |`,

    whenToUse: ["Every time a pod won't stay up -- this is the standard first-response runbook."],
    whenNotToUse: ["When the pod is Running but returning errors (that's a different investigation -- logs/traces, not CrashLoop)."],

    memoryCard: {
      problem: "A container keeps exiting, so Kubernetes restarts it with growing backoff -- and you must find why it exits.",
      mentalModel: "Repeatedly trying to start a car that stalls; CrashLoopBackOff is the symptom, not the disease.",
      keyConcepts: ["get -> describe -> logs --previous", "exit 137 = OOMKilled", "liveness vs startup probes", "config/secret errors", "app fails at boot"],
      productionConnection: "describe for exit code + Events first; logs --previous for the crash; then fix desired state (limits/env/probe).",
      oneLiner: "CrashLoopBackOff means your container keeps exiting -- describe the exit code, read the previous logs, and it's usually OOM, config, or a too-aggressive probe.",
    },

    quiz: [
      {
        id: "clb-q1",
        prompt: "A crashlooping pod shows empty `kubectl logs`. What's the fix?",
        choices: [
          { text: "Restart the whole cluster", correct: false },
          { text: "Use `kubectl logs <pod> --previous` to see the crashed container's output", correct: true },
          { text: "Delete etcd", correct: false },
          { text: "There are simply no logs ever", correct: false },
        ],
        explanation: "The current attempt may not have produced logs yet. `--previous` shows the output of the container instance that just crashed, which usually contains the error.",
      },
      {
        id: "clb-q2",
        prompt: "`describe` shows Reason: OOMKilled, Exit Code: 137. What happened?",
        choices: [
          { text: "The app called exit(137)", correct: false },
          { text: "The container exceeded its memory limit and was killed (128 + SIGKILL 9)", correct: true },
          { text: "The image failed to pull", correct: false },
          { text: "The liveness probe passed", correct: false },
        ],
        explanation: "Exit 137 = 128 + 9 (SIGKILL). With Reason OOMKilled, the container hit its memory limit. Raise the limit or fix the memory usage/leak.",
      },
      {
        id: "clb-q3",
        prompt: "A slow-booting app is killed repeatedly by its liveness probe. Best fix?",
        choices: [
          { text: "Remove all probes", correct: false },
          { text: "Add a startup probe (or raise initialDelaySeconds) so liveness waits until boot completes", correct: true },
          { text: "Lower the memory limit", correct: false },
          { text: "Switch to a different node", correct: false },
        ],
        explanation: "A liveness probe firing during a long boot kills the app in a loop. A startup probe gates liveness until the app has started, giving slow boots room without disabling health checks.",
      },
    ],

    lab: {
      kind: "terminal",
      title: "CrashLoopBackOff investigation",
      brief: "A pod is crashlooping after a deploy. Use get/describe/logs to classify the root cause and prescribe the fix.",
      scenarioId: "k8s-crashloop",
      successCriteria: ["Use describe for exit code + events", "Use logs --previous", "Correctly classify OOM vs config vs probe"],
    },
  },
];
