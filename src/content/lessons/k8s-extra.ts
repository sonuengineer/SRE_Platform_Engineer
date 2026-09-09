import type { Lesson } from "../types";

export const k8sExtraLessons: Lesson[] = [
  {
    slug: "k8s-pods-deployments",
    title: "Pods, ReplicaSets & Deployments",
    track: "shared",
    phase: "kubernetes",
    module: "k8s-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "The core workload objects: why the Pod (not the container) is the unit of scheduling, how ReplicaSets keep N copies alive, and how Deployments give you declarative rolling updates and rollbacks.",
    prerequisites: ["k8s-architecture", "docker-images-layers"],
    relatedConcepts: ["k8s-services-ingress", "k8s-resources-limits", "k8s-crashloop"],
    tags: ["kubernetes", "pods", "deployments", "replicaset", "rolling-update", "rollback"],

    why: `Running a container is easy; running it *reliably at scale* is not. You need something to restart it when it dies, keep a chosen number of copies alive, roll out a new version without downtime, and roll back instantly when the new version is bad. **Kubernetes layers three objects to provide exactly that** -- Pods (the runnable unit), ReplicaSets (keep N Pods alive), and Deployments (manage versioned rollouts of ReplicaSets). Understanding how they stack is the difference between fighting Kubernetes and letting it do the work.`,

    intuition: `Think of a restaurant kitchen. A **Pod** is a single cook -- possibly with a helper (a sidecar container) who shares the same station. A **ReplicaSet** is the shift rule "always keep 5 cooks working": if one walks out, hire another to get back to 5. A **Deployment** is the head chef managing a menu change: it doesn't fire all 5 cooks and hire 5 new ones at once (an outage); it swaps them in a few at a time (rolling update), tastes each new dish, and if the new menu is bad, brings the old cooks back (rollback). You talk to the head chef (the Deployment); the rest happens automatically.`,

    howItWorks: `### Pod -- the unit of scheduling
- A Pod is **one or more containers that share a network namespace (same IP/localhost) and can share volumes.** The container is *not* scheduled directly; the Pod is.
- Pods are **ephemeral and cattle, not pets:** they get a new IP each time, are never healed in place, and are replaced rather than repaired.
- Multi-container Pods are for tightly coupled helpers (a sidecar proxy, a log shipper), not for unrelated services.

### ReplicaSet -- keep N alive
- A ReplicaSet's one job: ensure exactly \`replicas\` matching Pods exist. Delete a Pod and it makes another; that is the reconciliation loop in action.
- You rarely create ReplicaSets directly -- Deployments own them.

### Deployment -- versioned rollouts
- A Deployment manages ReplicaSets to give **declarative updates.** Change the image and it creates a *new* ReplicaSet, scales it up while scaling the old one down (a **rolling update**), governed by \`maxSurge\` and \`maxUnavailable\`.
- **Rollback:** it keeps previous ReplicaSets, so \`kubectl rollout undo\` reverts to the last good version instantly.
- **Readiness probes gate the rollout:** new Pods only receive traffic once ready, so a broken new version does not take down the service.`,

    internals: `- **The Pod is the atomic scheduling and networking unit:** all containers in a Pod land on one node, share the Pod IP, and reach each other on \`localhost\`. This is why a sidecar can talk to the main container with no service discovery.
- **Deployment -> ReplicaSet -> Pod is a chain of controllers:** the Deployment controller manages ReplicaSets; each ReplicaSet manages Pods. Editing the Pod directly is futile -- the ReplicaSet recreates it to match its template.
- **Rolling update mechanics:** \`maxSurge\` (how many extra Pods above desired during rollout) and \`maxUnavailable\` (how many can be missing) trade rollout speed against capacity headroom. Zero maxUnavailable + some maxSurge = no capacity dip.
- **Rollout stalls on unready Pods:** if new Pods never pass readiness, the Deployment halts the rollout instead of destroying the old version -- a built-in safety valve (surfaced as \`progressDeadlineSeconds\`).
- **Revision history:** \`revisionHistoryLimit\` bounds how many old ReplicaSets are retained for rollback.
- **Deployments are for stateless apps;** stateful workloads needing stable identity/storage use StatefulSets, and node-daemons use DaemonSets -- same controller pattern, different guarantees.`,

    diagram: {
      title: "Deployment manages ReplicaSets manages Pods",
      layers: [
        { id: "deploy", label: "Deployment", sub: "desired image + replicas + rollout strategy" },
        { id: "rsnew", label: "New ReplicaSet", sub: "scaled up on image change (rolling)" },
        { id: "rsold", label: "Old ReplicaSet", sub: "scaled down; kept for rollback" },
        { id: "pods", label: "Pods", sub: "unit of scheduling; shared IP; ephemeral" },
        { id: "probe", label: "Readiness gate", sub: "traffic only to ready Pods; stalls bad rollouts" },
      ],
      caption: "Change the Deployment; it rolls a new ReplicaSet up and the old one down, gated by readiness, reversible by rollback.",
    },

    realWorld: `A team deploys a new version by editing the Deployment's image tag. Kubernetes creates a new ReplicaSet and starts replacing Pods a few at a time; the new build has a bad config and its Pods never pass readiness. Because readiness gates the rollout, the Deployment **stalls with the old Pods still serving** -- no outage. The team runs \`kubectl rollout undo\`, which scales the previous ReplicaSet back up, and traffic never noticed. Had they run raw Pods or deleted-and-recreated, that bad version would have taken the service down. The Deployment's versioned ReplicaSets plus readiness gating are what made the failure a non-event.`,

    production: `- **Deploy via Deployments, not raw Pods;** you get self-healing, rolling updates, and rollback for free.
- **Set readiness probes** so only healthy Pods receive traffic and bad rollouts stall instead of breaking the service.
- **Tune \`maxSurge\`/\`maxUnavailable\`** for your capacity: keep maxUnavailable low (even 0) on latency-sensitive services.
- **Change desired state (the Deployment), never patch Pods directly** -- the controller will just recreate them.
- **Keep enough revision history** to roll back, and prefer \`kubectl rollout undo\` over redeploying an old tag by hand.
- **Pair with a PodDisruptionBudget** so voluntary disruptions (node drains) do not drop below safe replica counts.`,

    commonMistakes: [
      "Editing or deleting Pods to fix an issue instead of changing the Deployment -- the ReplicaSet just recreates them.",
      "Omitting readiness probes, so a broken new version receives traffic and causes an outage instead of stalling.",
      "Setting maxUnavailable too high on a latency-sensitive service, dipping capacity during rollouts.",
      "Treating Pods as pets (relying on a stable IP or in-place state) when they are ephemeral and replaced.",
      "Using a Deployment for a stateful workload that actually needs a StatefulSet's stable identity/storage.",
    ],

    tradeoffs: `| Object | Gives you | Cost / limit |
|---|---|---|
| Pod | Runnable unit, shared net/volumes | Ephemeral; not self-healing alone |
| ReplicaSet | Keeps N Pods alive | No rollout/rollback logic |
| Deployment | Rolling updates + rollback | Stateless only; more abstraction |
| High maxSurge | Faster rollout | More transient resource usage |`,

    whenToUse: [
      "Any stateless service that needs multiple replicas, self-healing, and zero-downtime rollouts.",
      "Frequent deploys where instant rollback to the previous ReplicaSet matters.",
      "Multi-container Pods only for tightly coupled sidecars sharing the Pod's network/volumes.",
    ],
    whenNotToUse: [
      "Stateful apps needing stable network identity or per-Pod storage (use a StatefulSet).",
      "One-per-node agents like log/metric collectors (use a DaemonSet).",
      "One-off or scheduled batch work (use a Job/CronJob).",
    ],

    memoryCard: {
      problem: "Run a containerized app with multiple copies, self-healing, zero-downtime updates, and easy rollback.",
      mentalModel: "A kitchen: Pod = a cook, ReplicaSet = 'always keep 5 cooks', Deployment = head chef swapping the menu a few cooks at a time.",
      keyConcepts: ["Pod = scheduling unit (shared IP)", "ReplicaSet keeps N alive", "Deployment = rolling update + rollback", "readiness gates rollout", "change the Deployment, not Pods"],
      productionConnection: "Deploy via Deployments with readiness probes; tune maxSurge/maxUnavailable; roll back with rollout undo.",
      oneLiner: "Deployments manage ReplicaSets that keep N ephemeral Pods alive -- giving readiness-gated rolling updates and one-command rollback.",
    },

    quiz: [
      {
        id: "kex-pd-q1",
        prompt: "What is the actual unit Kubernetes schedules onto a node?",
        choices: [
          { text: "The individual container", correct: false },
          { text: "The Pod -- one or more containers sharing a network namespace and volumes", correct: true },
          { text: "The ReplicaSet", correct: false },
          { text: "The Deployment", correct: false },
        ],
        explanation:
          "Kubernetes schedules Pods, not containers. All containers in a Pod share the Pod's IP and localhost and land on the same node, which is why tightly coupled sidecars can talk over localhost.",
      },
      {
        id: "kex-pd-q2",
        prompt: "You change a Deployment's image. How does the update happen?",
        choices: [
          { text: "All Pods are deleted and recreated at once", correct: false },
          { text: "A new ReplicaSet is created and scaled up while the old one scales down (rolling update)", correct: true },
          { text: "The existing Pods are patched in place", correct: false },
          { text: "Nothing until you delete the old Pods manually", correct: false },
        ],
        explanation:
          "A Deployment creates a new ReplicaSet for the new template and shifts replicas from old to new gradually, governed by maxSurge/maxUnavailable and gated by readiness -- a rolling update with the old ReplicaSet retained for rollback.",
      },
      {
        id: "kex-pd-q3",
        prompt: "A new rollout's Pods never pass readiness. What does the Deployment do?",
        choices: [
          { text: "Deletes the old version and serves errors", correct: false },
          { text: "Stalls the rollout, keeping the old Pods serving, until you fix or roll back", correct: true },
          { text: "Reboots the nodes", correct: false },
          { text: "Ignores readiness and sends traffic anyway", correct: false },
        ],
        explanation:
          "Readiness gates the rollout: if new Pods are not ready, the Deployment does not scale down the old ReplicaSet past safe limits, so the service stays up. You then fix the config or run kubectl rollout undo.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Safe rollout and rollback",
      brief:
        "Roll out a new version via a Deployment, verify readiness gating protects the service, and practice rolling back a bad release.",
      steps: `1. Inspect the Deployment, its ReplicaSets, and Pods (get deploy/rs/pods).\n2. Confirm a readiness probe is defined; set maxUnavailable low and a small maxSurge.\n3. Update the image tag and watch the rolling update create a new ReplicaSet.\n4. Simulate a bad version whose Pods never become ready; confirm the rollout stalls without an outage.\n5. Run kubectl rollout undo and confirm traffic returns to the previous ReplicaSet.`,
      successCriteria: [
        "Rolling update shifts replicas from old to new ReplicaSet gradually",
        "A non-ready new version stalls the rollout instead of causing an outage",
        "Rollback restores the previous version via rollout undo",
      ],
    },
  },

  {
    slug: "k8s-services-ingress",
    title: "Services & Ingress",
    track: "shared",
    phase: "kubernetes",
    module: "k8s-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "How Kubernetes gives ephemeral Pods a stable address: ClusterIP, NodePort, and LoadBalancer Services, how Service DNS and endpoints work, and how Ingress adds HTTP routing and TLS at the edge.",
    prerequisites: ["k8s-pods-deployments", "load-balancing"],
    relatedConcepts: ["k8s-pods-deployments", "k8s-resources-limits", "load-balancing", "dns"],
    tags: ["kubernetes", "service", "ingress", "clusterip", "loadbalancer", "dns"],

    why: `Pods are ephemeral -- they die, get replaced, and get a new IP every time. Nothing can depend on a Pod's IP, so how does one service reliably reach another, or how does the internet reach your app? **Services give a stable virtual address and load-balance across the current healthy Pods**, and **Ingress adds HTTP-aware routing and TLS at the cluster edge** so many services can share one external entry point. Without these, Kubernetes networking is just a churn of unreachable IPs.`,

    intuition: `A Service is a **permanent phone number for a team whose individual members keep changing.** You call the number (the stable ClusterIP or DNS name); Kubernetes routes you to whichever team member (Pod) is currently on duty and healthy, and you never learn or care about their personal extensions. **Ingress** is the **building's front desk and switchboard**: one public address where callers arrive, and it routes \`/api\` to one team and \`/shop\` to another, handling the TLS "secure line" before passing the call inward.`,

    howItWorks: `### Service = stable virtual IP + load balancing
A Service selects Pods by **label** and gives them one stable address. It load-balances across the matching Pods' current **Endpoints** (kept up to date as Pods come and go).

### Service types
- **ClusterIP (default):** a virtual IP reachable only *inside* the cluster -- for service-to-service traffic.
- **NodePort:** opens the same port on every node; external clients hit \`nodeIP:nodePort\`. Simple, but crude.
- **LoadBalancer:** provisions an external cloud load balancer pointing at the Service -- the usual way to expose one service publicly.
- **ExternalName:** maps the Service to an external DNS name (a CNAME-style alias).

### Service DNS
Every Service gets a DNS name: \`myservice.mynamespace.svc.cluster.local\`. In-cluster clients just use \`myservice\` (same namespace). This is how apps find each other without hardcoding IPs.

### Ingress = HTTP routing at the edge
An **Ingress** resource defines HTTP(S) rules (host/path -> Service) and is realized by an **Ingress controller** (nginx, Traefik, cloud). One external IP + TLS termination can front many Services by host and path, instead of one LoadBalancer per service.`,

    internals: `- **ClusterIP is virtual -- no process listens on it.** kube-proxy programs iptables/IPVS rules on every node so packets to the ClusterIP are DNAT'd to a real Pod IP; the "load balancer" is distributed routing rules, not a box.
- **Endpoints (or EndpointSlices) are the live truth:** the Endpoints controller updates the set of ready Pod IPs behind a Service as Pods pass/fail readiness. **A Pod only joins Endpoints when its readiness probe passes** -- which is why readiness probes are essential for zero-downtime.
- **Service vs Ingress layer:** a Service is L4 (TCP/UDP, per-connection); Ingress is L7 (HTTP host/path routing, TLS, sometimes rewrites and auth). Use a Service for internal L4 reach and Ingress for external HTTP.
- **LoadBalancer per service is expensive;** Ingress consolidates many services behind one external LB/IP, which is the standard cost-saving pattern.
- **headless Service (\`clusterIP: None\`)** returns the Pod IPs directly via DNS instead of a virtual IP -- used by StatefulSets and clients that do their own load balancing.
- **kube-proxy modes (iptables vs IPVS)** affect performance at scale; IPVS handles large Service counts more efficiently.`,

    diagram: {
      title: "From client to Pod",
      layers: [
        { id: "ingress", label: "Ingress (L7)", sub: "host/path routing + TLS termination" },
        { id: "svc", label: "Service (ClusterIP)", sub: "stable virtual IP + DNS name" },
        { id: "ep", label: "Endpoints", sub: "current ready Pod IPs (readiness-gated)" },
        { id: "kubeproxy", label: "kube-proxy rules", sub: "iptables/IPVS DNAT to a real Pod" },
        { id: "pods", label: "Pods", sub: "ephemeral, selected by label" },
      ],
      caption: "Ingress routes HTTP to Services; Services give a stable name and load-balance across ready Pods.",
    },

    realWorld: `A frontend calls the backend by a Pod IP it discovered once. After a deploy the backend Pods are replaced with new IPs and every call fails. The fix is to call the backend's **Service DNS name** (\`backend\` in the same namespace); the Service tracks the current ready Pods and routes automatically. Separately, exposing three public services was costing three cloud load balancers. Consolidating them behind a single Ingress -- \`api.example.com\` and path rules to each Service, with TLS terminated at the Ingress -- cut it to one external IP and one certificate. Stable Service names plus an Ingress solved both a reliability and a cost problem.`,

    production: `- **Reach services by Service DNS name, never Pod IPs** -- Pods and their IPs are ephemeral.
- **Define readiness probes:** a Pod joins a Service's Endpoints only when ready, so probes are what make rollouts and scaling seamless.
- **Use ClusterIP for internal traffic; expose externally via Ingress (HTTP) or a LoadBalancer Service.**
- **Consolidate public HTTP behind one Ingress** with host/path rules and TLS termination instead of many LoadBalancers.
- **Terminate TLS at the Ingress** and manage certificates centrally (e.g. cert-manager).
- **Mind graceful shutdown:** combine readiness (drain traffic) with a preStop delay so in-flight requests finish before a Pod terminates.`,

    commonMistakes: [
      "Connecting to Pod IPs instead of a Service DNS name, breaking on every Pod replacement.",
      "Missing readiness probes, so Pods receive traffic before they are ready (or dead Pods stay in Endpoints).",
      "Provisioning a LoadBalancer per service instead of consolidating with one Ingress.",
      "Confusing NodePort/LoadBalancer (external) with ClusterIP (internal) and exposing internal services.",
      "Expecting Ingress to route non-HTTP traffic -- it is L7 HTTP(S); use a Service/LB for raw TCP/UDP.",
    ],

    tradeoffs: `| Type / layer | Best for | Cost / limit |
|---|---|---|
| ClusterIP | Internal service-to-service | Not reachable from outside |
| NodePort | Quick external access, dev | Crude; exposes a port on every node |
| LoadBalancer | Exposing one service publicly | One cloud LB (and cost) per service |
| Ingress (L7) | Many HTTP services, one entry + TLS | HTTP only; run an Ingress controller |`,

    whenToUse: [
      "ClusterIP + Service DNS for all internal service-to-service communication.",
      "Ingress to expose multiple HTTP services behind one IP with host/path routing and TLS.",
      "LoadBalancer Service for a single non-HTTP or standalone public endpoint.",
    ],
    whenNotToUse: [
      "Pod IPs for anything -- they change constantly.",
      "Ingress for raw TCP/UDP or non-HTTP protocols (use a Service/LoadBalancer).",
      "A LoadBalancer per service when an Ingress could consolidate them cheaply.",
    ],

    memoryCard: {
      problem: "Give ephemeral, IP-churning Pods a stable address, load-balance across them, and expose HTTP to the outside.",
      mentalModel: "Service = a permanent phone number for a team whose members change; Ingress = the building front desk routing and securing calls.",
      keyConcepts: ["Service = stable virtual IP + label selector", "ClusterIP/NodePort/LoadBalancer", "Endpoints = ready Pods (readiness-gated)", "Service DNS", "Ingress = L7 HTTP routing + TLS"],
      productionConnection: "Call services by DNS name, use readiness probes, expose HTTP via one Ingress with TLS instead of many LoadBalancers.",
      oneLiner: "Services give ephemeral Pods a stable name and load-balance across the ready ones; Ingress adds HTTP host/path routing and TLS at the edge.",
    },

    quiz: [
      {
        id: "kex-svc-q1",
        prompt: "Why should one service reach another by Service DNS name rather than Pod IP?",
        choices: [
          { text: "Pod IPs are slower to route", correct: false },
          { text: "Pods are ephemeral and get new IPs; the Service name is stable and load-balances across current ready Pods", correct: true },
          { text: "Pod IPs are blocked by kube-proxy", correct: false },
          { text: "DNS names encrypt the traffic", correct: false },
        ],
        explanation:
          "Pods are replaced constantly and get new IPs, so a hardcoded Pod IP breaks on the next deploy. A Service provides a stable virtual IP/DNS name and routes to the current set of ready Pods via its Endpoints.",
      },
      {
        id: "kex-svc-q2",
        prompt: "What determines whether a Pod receives traffic from its Service?",
        choices: [
          { text: "Whether the Pod is scheduled", correct: false },
          { text: "Whether it matches the label selector AND passes its readiness probe (so it is in Endpoints)", correct: true },
          { text: "Its position in the ReplicaSet", correct: false },
          { text: "The node's CPU usage", correct: false },
        ],
        explanation:
          "A Service selects Pods by label, but a Pod only enters the Service's Endpoints once its readiness probe passes. That readiness gating is what makes rollouts and scaling zero-downtime.",
      },
      {
        id: "kex-svc-q3",
        prompt: "Why front multiple HTTP services with a single Ingress instead of a LoadBalancer each?",
        choices: [
          { text: "Ingress is required for ClusterIP to work", correct: false },
          { text: "One Ingress consolidates host/path routing and TLS behind a single external IP, avoiding a cloud LB per service", correct: true },
          { text: "LoadBalancer Services cannot do TLS", correct: false },
          { text: "Ingress routes raw TCP more efficiently", correct: false },
        ],
        explanation:
          "An Ingress (L7) routes many services by host and path behind one external IP and terminates TLS centrally, replacing multiple costly per-service cloud load balancers. Ingress is HTTP-only; raw TCP/UDP still needs a Service/LB.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Expose an app end to end",
      brief:
        "Wire internal service-to-service traffic via ClusterIP and expose the app externally via an Ingress with TLS.",
      steps: `1. Create a ClusterIP Service selecting your app Pods by label; confirm its DNS name resolves in-cluster.\n2. Verify readiness probes so only ready Pods appear in the Endpoints.\n3. From another Pod, reach the app by Service name (not Pod IP).\n4. Define an Ingress with a host/path rule pointing to the Service and TLS configured.\n5. Confirm external requests route through the Ingress controller to the Service to a ready Pod.`,
      successCriteria: [
        "In-cluster clients reach the app by Service DNS name",
        "Only ready Pods appear in the Service Endpoints",
        "External HTTP(S) traffic routes via Ingress to the Service",
      ],
    },
  },

  {
    slug: "k8s-resources-limits",
    title: "Resource Requests & Limits",
    track: "shared",
    phase: "kubernetes",
    module: "k8s-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "How CPU/memory requests drive scheduling and limits enforce ceilings, the crucial difference between throttling CPU and OOM-killing memory, QoS classes and eviction order, and why the request/limit gap causes noisy neighbors.",
    prerequisites: ["k8s-pods-deployments", "k8s-architecture"],
    relatedConcepts: ["k8s-crashloop", "k8s-pods-deployments", "k8s-services-ingress"],
    tags: ["kubernetes", "resources", "requests", "limits", "oomkilled", "qos", "throttling"],

    why: `A node has finite CPU and memory shared by every Pod on it. Without guidance, the scheduler cannot place Pods sanely and one greedy Pod can starve its neighbors or crash the node. **Requests and limits are how you tell Kubernetes what each container needs and the most it may take** -- requests drive *where* Pods land and guarantee a floor; limits cap the ceiling. Getting them wrong produces the two most common cluster pathologies: mysterious latency (CPU throttling) and mysterious restarts (OOMKilled).`,

    intuition: `Think of a node as a **shared office with a fixed number of desks (CPU) and a fixed amount of storage space (memory).** A **request** is the desk space you reserve up front -- the scheduler only seats you on a floor that has room for your reservation, and that space is guaranteed to you. A **limit** is the maximum you are allowed to spread into. Crucially, the two resources behave differently at the ceiling: exceed your **CPU** limit and you are simply *slowed down* (throttled) -- annoying but survivable; exceed your **memory** limit and you are *evicted from the building* (the container is OOM-killed) -- because memory, unlike CPU, cannot be borrowed back a slice at a time.`,

    howItWorks: `### Requests -- scheduling and guarantees
- \`requests.cpu\` / \`requests.memory\` tell the **scheduler** how much to reserve. A Pod is placed only on a node whose unreserved capacity covers its requests. Requests are a **guaranteed floor.**

### Limits -- enforcement ceilings
- \`limits.cpu\` / \`limits.memory\` cap actual usage.
- **CPU is compressible:** exceeding the CPU limit causes **throttling** (the container is paused briefly and runs slower) -- no crash.
- **Memory is incompressible:** exceeding the memory limit causes an **OOMKill** (exit 137) -- the container is terminated and restarted.

### QoS classes (set implicitly by your requests/limits)
- **Guaranteed:** requests == limits for every resource -- last to be evicted under node pressure.
- **Burstable:** requests < limits -- can use spare capacity but is evicted before Guaranteed.
- **BestEffort:** no requests/limits -- first to be killed when the node runs low.

### Eviction under node pressure
When a node runs low on memory, the kubelet evicts Pods in order: **BestEffort first, then Burstable exceeding requests, Guaranteed last** -- so your requests directly determine survival priority.`,

    internals: `- **CPU throttling is invisible unless you look for it.** A container over its CPU limit is paused in short slices (CFS quota), showing up as latency spikes with no errors and no restarts -- notoriously hard to diagnose without the throttling metric.
- **Memory has no throttling -- only OOMKill.** There is no "run slower" for memory; cross the limit and the container dies with exit 137, Reason OOMKilled (the classic CrashLoop cause).
- **The request/limit gap creates noisy neighbors:** if requests are set far below limits, the scheduler packs many Pods believing there is room, but under load they all burst toward their limits and contend -- CPU throttling and memory pressure for everyone. Set requests close to real usage.
- **Overcommit is deliberate:** requests reserve capacity, but limits can sum above node capacity, betting not everyone peaks at once. Too aggressive and node pressure/eviction follows.
- **CPU limits are debated:** many teams set CPU *requests* but omit CPU *limits* to avoid throttling latency-sensitive services, relying on requests for fairness. Memory limits, by contrast, are almost always worth setting to bound blast radius.
- **Right-size from real data:** use historical usage (metrics/VPA recommendations) to set requests near the working set and limits with headroom, rather than guessing.`,

    diagram: {
      title: "Requests schedule, limits enforce",
      layers: [
        { id: "request", label: "Requests", sub: "scheduler reserves; guaranteed floor" },
        { id: "place", label: "Placement", sub: "Pod fits only where requests are free" },
        { id: "cpu", label: "Over CPU limit -> throttle", sub: "slower, no crash (compressible)" },
        { id: "mem", label: "Over memory limit -> OOMKill", sub: "exit 137, restarts (incompressible)" },
        { id: "qos", label: "QoS + eviction order", sub: "BestEffort -> Burstable -> Guaranteed" },
      ],
      caption: "Requests decide placement and survival priority; limits cap usage -- but CPU throttles while memory kills.",
    },

    realWorld: `A latency-sensitive API sees intermittent p99 spikes with zero errors and no restarts -- baffling, until someone checks the CPU throttling metric and finds the container is constantly hitting a tight CPU limit and being paused mid-request. Raising (or removing) the CPU limit and setting a realistic CPU *request* removes the throttling and the spikes vanish. On another service the opposite: pods restart every few hours with exit 137. That is memory, not CPU -- the limit was 256Mi but the working set grew to 400Mi, so the container is OOM-killed. Same conceptual family (resource ceilings), opposite symptoms, because CPU is compressible and memory is not.`,

    production: `- **Always set memory requests and limits** to bound blast radius; a runaway container should die alone, not take the node with it.
- **Set CPU requests** for fair scheduling; consider **omitting CPU limits** on latency-sensitive services to avoid throttling, while keeping requests honest.
- **Keep requests close to real usage** (from metrics) so the scheduler packs accurately and avoids noisy neighbors.
- **Aim for Guaranteed QoS on critical Pods** (requests == limits) so they are evicted last under node pressure.
- **Monitor CPU throttling and OOMKills as first-class signals** -- they explain latency spikes and restart loops respectively.
- **Use VPA recommendations / historical data to right-size** rather than copy-pasting arbitrary numbers.`,

    commonMistakes: [
      "Setting no requests/limits, landing Pods in BestEffort QoS -- first to be evicted and impossible to schedule sanely.",
      "Blaming the app for latency spikes that are actually CPU throttling from a tight CPU limit.",
      "Setting a memory limit below the real working set, causing recurring OOMKilled (exit 137) restarts.",
      "A huge gap between requests and limits, so the node overcommits and Pods contend under load (noisy neighbors).",
      "Ignoring QoS/eviction order, so critical Pods get evicted before disposable ones under node pressure.",
    ],

    tradeoffs: `| Choice | Benefit | Cost / risk |
|---|---|---|
| Requests == limits (Guaranteed) | Evicted last, predictable | No bursting into spare capacity |
| Requests << limits (Burstable) | Uses spare capacity | Noisy neighbors; earlier eviction |
| No CPU limit | No throttling latency | A container can hog CPU under contention |
| Tight memory limit | Small blast radius | OOMKill if the working set grows |`,

    whenToUse: [
      "Every production container -- set at least memory requests/limits and CPU requests.",
      "Guaranteed QoS (requests == limits) for critical, latency-sensitive workloads.",
      "Right-sizing from real usage metrics to pack nodes efficiently without contention.",
    ],
    whenNotToUse: [
      "Tight CPU limits on latency-sensitive services if throttling harms tail latency (favor requests).",
      "Large request/limit gaps that overcommit the node and invite noisy-neighbor contention.",
      "Skipping memory limits on untrusted or leak-prone workloads (bound the blast radius).",
    ],

    memoryCard: {
      problem: "Share a node's finite CPU/memory fairly so Pods schedule sanely and one greedy container cannot starve the rest.",
      mentalModel: "A shared office: requests reserve your desk space (guaranteed); over CPU you get slowed down, over memory you get evicted.",
      keyConcepts: ["requests schedule + guarantee", "limits cap usage", "CPU throttles (compressible)", "memory OOMKills (incompressible)", "QoS + eviction order"],
      productionConnection: "Set memory requests/limits and CPU requests; keep requests near real usage; monitor throttling and OOMKills.",
      oneLiner: "Requests decide placement and survival priority; limits cap usage -- but exceeding CPU only throttles while exceeding memory kills.",
    },

    quiz: [
      {
        id: "kex-rl-q1",
        prompt: "What happens when a container exceeds its CPU limit versus its memory limit?",
        choices: [
          { text: "Both cause the container to be killed", correct: false },
          { text: "CPU over-limit throttles (slows) the container; memory over-limit OOM-kills it (exit 137)", correct: true },
          { text: "Both just slow the container down", correct: false },
          { text: "CPU kills it; memory throttles it", correct: false },
        ],
        explanation:
          "CPU is compressible: exceeding the limit pauses the container in slices (throttling), no crash. Memory is incompressible: there is no throttling, so exceeding the limit terminates the container with exit 137 (OOMKilled).",
      },
      {
        id: "kex-rl-q2",
        prompt: "What do resource requests primarily control?",
        choices: [
          { text: "The maximum a container may use", correct: false },
          { text: "Scheduling placement (reserved capacity) and the guaranteed floor / eviction priority", correct: true },
          { text: "The container's restart policy", correct: false },
          { text: "Which Service routes to the Pod", correct: false },
        ],
        explanation:
          "Requests tell the scheduler how much to reserve, so a Pod only lands where its requests fit, and they form a guaranteed floor. They also set QoS and eviction order -- limits, not requests, cap the ceiling.",
      },
      {
        id: "kex-rl-q3",
        prompt: "An API has p99 latency spikes but no errors and no restarts. Likely resource cause?",
        choices: [
          { text: "Memory OOMKills", correct: false },
          { text: "CPU throttling from a tight CPU limit -- the container is paused mid-request", correct: true },
          { text: "The Service lost its Endpoints", correct: false },
          { text: "The node ran out of disk", correct: false },
        ],
        explanation:
          "Latency spikes with no errors or restarts point to CPU throttling: the container hits its CPU limit and is paused in short slices. Raise/remove the CPU limit and set a realistic request. OOMKilled would instead show restarts with exit 137.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Right-size requests and limits",
      brief:
        "Diagnose whether a workload's problem is CPU throttling or memory OOMKill, then set requests/limits and a QoS class that fit real usage.",
      steps: `1. Pull historical CPU and memory usage for the container (working set and peaks).\n2. For latency spikes with no restarts, check the CPU throttling metric; for exit-137 restarts, check memory vs limit.\n3. Set CPU requests near typical usage; decide whether to keep a CPU limit given throttling risk.\n4. Set memory requests and a memory limit above the real working set with headroom.\n5. For critical Pods, make requests == limits to reach Guaranteed QoS (evicted last).\n6. Re-observe throttling and OOMKill metrics after applying.`,
      successCriteria: [
        "Correctly distinguish CPU throttling from memory OOMKill by symptom",
        "Requests reflect real usage and drive sane scheduling",
        "Critical Pods reach an appropriate QoS class",
      ],
    },
  },
];
