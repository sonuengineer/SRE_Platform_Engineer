import type { Lesson } from "../types";

export const dockerExtraLessons: Lesson[] = [
  {
    slug: "dockerfile-best-practices",
    title: "Dockerfile Best Practices",
    track: "shared",
    phase: "docker",
    module: "docker-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "How to write a Dockerfile that builds fast, ships small, and runs safely: layer ordering for cache hits, multi-stage builds, non-root users, pinned bases, and keeping secrets out of layers.",
    prerequisites: ["docker-images-layers"],
    relatedConcepts: ["docker-networking", "docker-volumes", "k8s-pods-deployments"],
    tags: ["docker", "dockerfile", "multi-stage", "cache", "security", "best-practices"],

    why: `The Dockerfile is the single artifact that decides how fast your CI runs, how big your image is, how quickly it pulls onto every node, and how much attack surface you ship to production. A careless one costs minutes per build, hundreds of megabytes per pull, and root-owned processes exposed to the internet. **Dockerfile discipline exists to convert those invisible costs into fast, small, reproducible, and secure images** -- and almost all of it comes from a handful of rules about ordering, staging, and least privilege.`,

    intuition: `Writing a Dockerfile is like **packing a shipping container that gets copied thousands of times**. You want to pack the heavy, rarely-changing things at the bottom (the base OS, dependencies) and the light, frequently-changing things on top (your code), so that changing your code only repacks the top -- not the whole container. And you want to unload the messy build tools before you seal it for shipping (multi-stage), so the container that actually sails is small and holds only what runs.`,

    howItWorks: `### 1. Order layers least- to most-frequently-changing
Copy dependency manifests and install *before* copying source, so a code change reuses the cached dependency layer:
\`\`\`
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
\`\`\`

### 2. Multi-stage builds
Build in a fat image with compilers/dev deps, then copy only the artifact into a slim runtime:
\`\`\`
FROM node:20 AS build
...build...
FROM node:20-slim
COPY --from=build /app/dist ./dist
\`\`\`
The final image contains no build toolchain -- smaller and less exploitable.

### 3. Pin the base image
Use a specific version (\`node:20.11-slim\`), never \`latest\`, so builds are reproducible and do not silently change.

### 4. Run as non-root
Create and switch to an unprivileged user so a container escape does not start as root:
\`\`\`
RUN useradd -m app
USER app
\`\`\`

### 5. Use .dockerignore
Exclude \`node_modules\`, \`.git\`, secrets, and build junk from the build context -- faster builds and no accidental leaks.

### 6. Keep secrets out of layers
Never \`COPY\` a secret then delete it; use \`--mount=type=secret\` build secrets, which never persist in a layer.`,

    internals: `- **Cache invalidation cascades:** changing one instruction invalidates it and every layer after it. \`COPY . .\` high up means any file change reinstalls all dependencies -- the single most common slow-build cause.
- **RUN chaining and cleanup:** each RUN is a layer, and files deleted in a later layer still occupy space in the earlier one. Combine \`apt-get update && apt-get install && rm -rf /var/lib/apt/lists/*\` in one RUN so the cleanup lands in the same layer.
- **Secrets persist in history:** a secret written in any layer stays retrievable in the image history even if a later layer removes it. BuildKit secret mounts avoid this by never committing the file to a layer.
- **Prefer COPY over ADD:** ADD has surprising behavior (auto-extract, remote URLs); COPY is explicit and predictable.
- **Distroless / slim / alpine trade-offs:** smaller base = faster pulls and less attack surface, but alpine's musl libc can break native modules and lacks a shell for debugging; distroless has no shell at all.
- **Set an explicit \`CMD\`/\`ENTRYPOINT\` and \`HEALTHCHECK\`**, and use exec form (\`["node","server.js"]\`) so signals (SIGTERM) reach the process for graceful shutdown.`,

    diagram: {
      title: "A well-ordered multi-stage Dockerfile",
      layers: [
        { id: "base", label: "Pinned slim base", sub: "node:20.11-slim (reproducible, small)" },
        { id: "deps", label: "Copy manifest + install", sub: "cached until dependencies change" },
        { id: "code", label: "Copy source + build", sub: "rebuilds on code change only" },
        { id: "runtime", label: "Fresh slim runtime stage", sub: "COPY --from=build only the artifact" },
        { id: "user", label: "Non-root USER + CMD", sub: "least privilege, exec-form entrypoint" },
      ],
      caption: "Deps below code for cache hits; a second stage drops the build toolchain from the shipped image.",
    },

    realWorld: `A team's Node image is 1.4GB and CI takes 7 minutes because the Dockerfile does \`COPY . .\` then \`npm install\` in a single \`node:20\` (full) base, running as root. Three changes fix it: reorder to copy \`package*.json\` and \`npm ci\` before the source (incremental builds drop to ~30s as the dependency layer caches), add a multi-stage build copying only \`dist\` and production deps into \`node:20-slim\` (image drops to ~180MB), and add a non-root \`USER\`. Same application, an order of magnitude faster and smaller, and no longer running as root in production.`,

    production: `- **Order instructions least- to most-frequently-changing;** copy manifests and install before source.
- **Use multi-stage builds** to ship only runtime artifacts, never compilers or dev dependencies.
- **Pin base image versions** and a specific digest for full reproducibility; avoid \`latest\`.
- **Run as a non-root user** and drop unneeded capabilities.
- **Add a \`.dockerignore\`** and use BuildKit secret mounts -- never bake secrets into layers.
- **Chain and clean package installs in one RUN**, and use exec-form CMD so SIGTERM reaches the app for graceful shutdown.`,

    commonMistakes: [
      "COPY . . before installing dependencies, so every code change busts the dependency cache.",
      "Using the full/latest base and skipping multi-stage, shipping a huge image full of build tools.",
      "Running the container process as root, widening the blast radius of any escape.",
      "Baking secrets into a layer (COPY then rm) -- they remain in image history forever.",
      "Separate apt-get update / install / cleanup across RUNs, so removed files still bloat earlier layers.",
    ],

    tradeoffs: `| Choice | Benefit | Cost / risk |
|---|---|---|
| Deps-before-code ordering | Fast incremental builds | Reordering cascades cache invalidation |
| Multi-stage build | Small, secure final image | Slightly more complex Dockerfile |
| Alpine/distroless base | Tiny, low attack surface | musl breakage; no shell to debug |
| Pinning to a digest | Fully reproducible | Manual updates for security patches |`,

    whenToUse: [
      "Every production Dockerfile -- these rules are the baseline, not an optimization.",
      "CI pipelines where build time and image size directly cost money and speed.",
      "Any image exposed to untrusted traffic (non-root + minimal base reduce blast radius).",
    ],
    whenNotToUse: [
      "Throwaway local experiments where build speed and size do not matter (still avoid baking secrets).",
      "Alpine/distroless when the app needs glibc or native modules that break under musl.",
      "Multi-stage when there is genuinely no build step and the base is already minimal.",
    ],

    memoryCard: {
      problem: "Produce a Docker image that builds fast, ships small, and runs with least privilege and reproducibly.",
      mentalModel: "Packing a container copied thousands of times: heavy/stable at the bottom, light/changing on top, unload the build tools before sealing.",
      keyConcepts: ["deps-before-code ordering", "multi-stage builds", "pinned base versions", "non-root USER", ".dockerignore + build secrets"],
      productionConnection: "Order least->most changing, multi-stage for small images, pin bases, run non-root, keep secrets out of layers.",
      oneLiner: "A good Dockerfile orders deps before code, uses multi-stage to drop the toolchain, pins the base, and runs non-root with no secrets in any layer.",
    },

    quiz: [
      {
        id: "dex-df-q1",
        prompt: "Why copy package.json and install dependencies before copying the rest of the source?",
        choices: [
          { text: "It makes the base image smaller", correct: false },
          { text: "So a code change reuses the cached dependency layer instead of reinstalling everything", correct: true },
          { text: "Because COPY . . cannot run before RUN", correct: false },
          { text: "It encrypts the dependencies", correct: false },
        ],
        explanation:
          "Layer caching reuses unchanged layers. Installing deps in an earlier layer means editing code (a later layer) does not invalidate the dependency install, turning multi-minute rebuilds into seconds.",
      },
      {
        id: "dex-df-q2",
        prompt: "What is the main benefit of a multi-stage build?",
        choices: [
          { text: "It allows using latest tags safely", correct: false },
          { text: "The final image contains only runtime artifacts, not the build toolchain -- smaller and less exploitable", correct: true },
          { text: "It runs the container as root automatically", correct: false },
          { text: "It disables layer caching", correct: false },
        ],
        explanation:
          "Multi-stage builds compile in a fat stage and copy only the resulting artifact into a slim runtime stage, so compilers and dev dependencies never ship to production -- reducing image size and attack surface.",
      },
      {
        id: "dex-df-q3",
        prompt: "Why is COPYing a secret and deleting it in a later layer unsafe?",
        choices: [
          { text: "It slows the build", correct: false },
          { text: "The secret persists in the image history/earlier layer even after deletion", correct: true },
          { text: "COPY cannot handle secret files", correct: false },
          { text: "Deleting files is not allowed in Docker", correct: false },
        ],
        explanation:
          "Each instruction is an immutable layer; a file added in one layer stays retrievable from image history even if a later layer removes it. Use BuildKit secret mounts (--mount=type=secret) so the secret is never committed to any layer.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Refactor a slow, fat Dockerfile",
      brief:
        "Given a 1.4GB image that rebuilds everything on each change and runs as root, apply best practices to make it fast, small, and safe.",
      steps: `1. Reorder: COPY manifest, install deps, then COPY source, then build.\n2. Add a second stage on a pinned slim base; COPY --from=build only the artifact + prod deps.\n3. Pin the base image to a specific version (and ideally a digest).\n4. Create and switch to a non-root USER; use exec-form CMD.\n5. Add a .dockerignore and move any secrets to BuildKit secret mounts.\n6. Chain package install + cleanup in one RUN.`,
      successCriteria: [
        "Dependency layer is cached across code changes",
        "Final image ships no build toolchain and is much smaller",
        "Container runs as non-root with no secrets in any layer",
      ],
    },
  },

  {
    slug: "docker-networking",
    title: "Docker Networking",
    track: "shared",
    phase: "docker",
    module: "docker-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "How containers get their own network namespace, how the default bridge, user-defined bridges, host, and none drivers differ, why container DNS matters, and the difference between exposing and publishing a port.",
    prerequisites: ["docker-images-layers"],
    relatedConcepts: ["dockerfile-best-practices", "docker-volumes", "k8s-services-ingress"],
    tags: ["docker", "networking", "bridge", "dns", "ports", "namespaces"],

    why: `A container that cannot talk to a database, another service, or the outside world is useless -- yet by default each container is isolated in its own network namespace with its own private IP. **Docker networking exists to connect containers to each other and to the host/internet safely and predictably.** The reason so many "connection refused" and "cannot resolve host" bugs happen is that people do not know which network their containers are on, how DNS resolves service names, or the difference between exposing a port and actually publishing it to the host.`,

    intuition: `Think of each container as an **apartment in a building, each with its own internal phone extension (private IP)**. By default they are on the building's shared internal line (the bridge network) and can dial each other -- but only if they are on the *same* line. A **user-defined network** is like a dedicated line for one team where everyone can also reach each other by name (built-in DNS), not just by extension. **Publishing a port** is installing an external phone line so people outside the building can call a specific apartment; **exposing** a port is just writing the extension on the door -- documentation, not a working outside line.`,

    howItWorks: `### Network drivers
- **bridge (default):** each container gets a private IP on a virtual bridge; the default bridge has no automatic name resolution between containers.
- **user-defined bridge:** the recommended default -- containers on it can reach each other **by container name** via Docker's embedded DNS, and it is isolated from other networks.
- **host:** the container shares the host's network stack directly (no isolation, no port mapping) -- fastest, least isolated.
- **none:** no networking at all.
- **overlay:** spans multiple hosts (Swarm/multi-host); the conceptual ancestor of Kubernetes pod networking.

### Container DNS
On a user-defined network, \`db\` resolves to the container named \`db\`. This is why Compose services talk to each other by service name -- Compose puts them on a shared user-defined network.

### Expose vs publish
- **EXPOSE / expose:** metadata only -- declares which port the app listens on. It does **not** open the port to the host.
- **Publish (\`-p 8080:80\`):** maps host port 8080 to container port 80, making the container reachable from outside. This is what actually lets external clients connect.

### Localhost is per-namespace
Inside a container, \`localhost\` means the container itself, not the host or another container. To reach the host, use the host's IP or \`host.docker.internal\` where supported; to reach another container, use its name on a shared network.`,

    internals: `- **Each container has its own network namespace:** its own interfaces, routing table, and \`localhost\`. This is why an app binding to \`127.0.0.1\` inside a container is unreachable from outside even if the port is published -- bind to \`0.0.0.0\`.
- **The default bridge lacks DNS between containers;** you must use \`--link\` (deprecated) or IPs. User-defined bridges add automatic name-based DNS -- always prefer them.
- **Publishing a port adds an iptables DNAT rule** on the host forwarding host:port to the container's IP:port; that is the mechanism behind \`-p\`.
- **Bridge networking uses NAT**, so outbound traffic appears to come from the host IP and inbound needs explicit publishing; host networking skips NAT entirely for performance.
- **Compose and Kubernetes both give a flat, name-resolvable network** so services find each other by name -- the same idea Docker's user-defined bridge introduces on one host.
- **Binding 0.0.0.0 vs 127.0.0.1 inside the container is a top cause of "port published but connection refused"** -- the app is only listening on the loopback interface of its own namespace.`,

    diagram: {
      title: "Container networking on one host",
      layers: [
        { id: "ns", label: "Per-container namespace", sub: "own IP, routes, and localhost" },
        { id: "bridge", label: "User-defined bridge", sub: "name-based DNS between containers" },
        { id: "dns", label: "Embedded DNS", sub: "'db' resolves to the db container" },
        { id: "publish", label: "Publish -p 8080:80", sub: "host:8080 DNAT -> container:80" },
        { id: "bind", label: "App binds 0.0.0.0", sub: "not 127.0.0.1, or it is unreachable" },
      ],
      caption: "Put containers on a user-defined network for name DNS; publish ports for external access; bind 0.0.0.0.",
    },

    realWorld: `A developer runs an API container with \`-p 8080:8080\` but requests to \`localhost:8080\` return connection refused. The app inside the container binds to \`127.0.0.1:8080\` -- the loopback of its own network namespace -- so nothing is listening on the interface the published port forwards to. Changing the app to bind \`0.0.0.0:8080\` fixes it instantly. Separately, the API cannot reach the database container by \`localhost\` (that is the API container itself); putting both on a user-defined network and connecting to the host \`db\` by name resolves it. Two classic networking mistakes, both about namespaces.`,

    production: `- **Use user-defined bridge networks** (or Compose, which creates them) so containers resolve each other by name and stay isolated from unrelated containers.
- **Bind services to \`0.0.0.0\` inside the container** so published ports actually reach them.
- **Publish only the ports you need**, and avoid exposing internal services to the host/internet.
- **Do not rely on the default bridge** for inter-container communication -- it has no DNS.
- **Prefer host networking only for performance-critical, trusted workloads** that do not need isolation or port mapping.
- **Remember \`localhost\` is per-container;** use service names on a shared network for service-to-service calls.`,

    commonMistakes: [
      "Binding the app to 127.0.0.1 inside the container, so a published port still refuses connections.",
      "Using localhost to reach another container instead of its name on a shared network.",
      "Relying on the default bridge and being surprised there is no name resolution between containers.",
      "Confusing EXPOSE (metadata) with publish (-p) and expecting the port to be reachable without -p.",
      "Publishing every port broadly, exposing internal-only services to the outside.",
    ],

    tradeoffs: `| Driver | Benefit | Cost / risk |
|---|---|---|
| Default bridge | Works out of the box | No DNS between containers |
| User-defined bridge | Name-based DNS, isolation | Must create/manage the network |
| host | Max performance, no NAT | No isolation, no port mapping |
| overlay | Multi-host networking | More complex, needs orchestrator |`,

    whenToUse: [
      "User-defined bridge (or Compose) for almost all multi-container apps on a single host.",
      "Publishing ports to expose a service to the host or external clients.",
      "Host networking for trusted, latency-sensitive workloads that need raw network speed.",
    ],
    whenNotToUse: [
      "The default bridge for service-to-service calls (no DNS -- use a user-defined network).",
      "Host networking where isolation matters or ports would collide with the host.",
      "Publishing internal-only services to 0.0.0.0 on the host without a firewall.",
    ],

    memoryCard: {
      problem: "Connect isolated containers to each other and to the host/internet predictably and safely.",
      mentalModel: "Apartments with private extensions: a user-defined line lets everyone dial by name; publishing installs an outside phone line.",
      keyConcepts: ["per-container network namespace", "bridge vs user-defined vs host vs none", "embedded DNS by container name", "expose (metadata) vs publish (-p)", "bind 0.0.0.0 not 127.0.0.1"],
      productionConnection: "Use user-defined networks for name DNS, publish only needed ports, and bind 0.0.0.0 so published ports work.",
      oneLiner: "Containers live in their own network namespace -- put them on a user-defined bridge for name DNS, publish ports for outside access, and bind 0.0.0.0.",
    },

    quiz: [
      {
        id: "dex-net-q1",
        prompt: "A container runs with -p 8080:8080 but connections are refused. The app binds 127.0.0.1:8080. Why?",
        choices: [
          { text: "Port 8080 is reserved by Docker", correct: false },
          { text: "127.0.0.1 is the container's own namespace loopback; the published port has nothing to forward to. Bind 0.0.0.0", correct: true },
          { text: "You must use EXPOSE as well", correct: false },
          { text: "Bridge networks block port 8080", correct: false },
        ],
        explanation:
          "Each container has its own network namespace and its own localhost. Binding to 127.0.0.1 means the app only listens on that internal loopback, so the published-port DNAT rule reaches nothing. Bind 0.0.0.0 to listen on all interfaces.",
      },
      {
        id: "dex-net-q2",
        prompt: "Why prefer a user-defined bridge over the default bridge for multi-container apps?",
        choices: [
          { text: "It is faster than host networking", correct: false },
          { text: "It provides embedded DNS so containers can reach each other by name, and isolates them", correct: true },
          { text: "It automatically publishes all ports", correct: false },
          { text: "It disables NAT", correct: false },
        ],
        explanation:
          "User-defined bridges give automatic name-based DNS between containers and network isolation. The default bridge has no inter-container DNS, forcing brittle IP-based or deprecated --link connections.",
      },
      {
        id: "dex-net-q3",
        prompt: "What is the difference between EXPOSE and publishing a port with -p?",
        choices: [
          { text: "They are identical", correct: false },
          { text: "EXPOSE is documentation/metadata; -p actually maps a host port to the container so it is reachable externally", correct: true },
          { text: "EXPOSE opens the port to the internet; -p is internal only", correct: false },
          { text: "-p only works with host networking", correct: false },
        ],
        explanation:
          "EXPOSE merely records which port the app listens on and does not open anything. Publishing with -p host:container adds the iptables DNAT rule that makes the container reachable from outside the host.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Wire up two containers correctly",
      brief:
        "Connect an API container and a database container so the API can reach the DB by name and external clients can reach the API.",
      steps: `1. Create a user-defined bridge network and attach both containers to it.\n2. Have the API connect to the DB using the DB's container name as the hostname (not localhost).\n3. Ensure the API process binds 0.0.0.0, not 127.0.0.1.\n4. Publish only the API port to the host (-p 8080:8080); leave the DB unpublished.\n5. Verify name resolution from inside the API container and external reachability of the API.`,
      successCriteria: [
        "API resolves the DB by container name on a shared user-defined network",
        "API binds 0.0.0.0 so the published port is reachable",
        "Only the intended port is published to the host",
      ],
    },
  },

  {
    slug: "docker-volumes",
    title: "Docker Volumes & Persistence",
    track: "shared",
    phase: "docker",
    module: "docker-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Why the container writable layer is ephemeral, how named volumes, bind mounts, and tmpfs differ, and how to persist and share data safely across container restarts and rebuilds.",
    prerequisites: ["docker-images-layers"],
    relatedConcepts: ["docker-networking", "dockerfile-best-practices", "k8s-pods-deployments"],
    tags: ["docker", "volumes", "persistence", "bind-mount", "storage", "state"],

    why: `Containers are designed to be disposable -- you stop, remove, and recreate them constantly. But real applications have data that must outlive the container: a database's files, uploaded user content, logs. **Every write inside a container goes to a thin writable layer that is destroyed when the container is removed**, so without a deliberate persistence mechanism that data simply vanishes on the next deploy. Volumes exist to store state *outside* the container's lifecycle so it survives restarts, rebuilds, and replacements.`,

    intuition: `A container's writable layer is like **writing on a hotel room's whiteboard**: convenient while you are there, but wiped the moment you check out (remove the container). A **volume** is like renting a **storage locker in the lobby** -- it stays put no matter how many times you check into a new room, and you can even share the same locker between rooms. A **bind mount** is like giving the room a **direct door into your own house**: whatever the container writes appears instantly in a folder on the host, and vice versa.`,

    howItWorks: `### The ephemeral writable layer
A running container = read-only image layers + one thin writable layer. Writes land there and are **discarded when the container is removed.** Anything you need to keep must live outside it.

### Three persistence mechanisms
- **Named volume** (\`docker volume create data\`, \`-v data:/var/lib/postgresql/data\`): Docker manages the storage location; the recommended way to persist container-owned data like databases. Survives container removal; portable across container recreations.
- **Bind mount** (\`-v /host/path:/container/path\`): maps a specific host directory into the container. Great for development (edit code on the host, see it live) and for host-specific files, but couples the container to the host's filesystem layout.
- **tmpfs mount:** stores data in host memory only -- fast and never written to disk, for sensitive or scratch data that should vanish on stop.

### Sharing and lifecycle
- A named volume can be mounted into **multiple containers** to share data.
- Removing a container does **not** remove its named volumes -- they persist until explicitly removed (\`docker volume rm\` / \`docker volume prune\`), which is both a feature and a source of orphaned storage.`,

    internals: `- **Named volumes vs bind mounts differ in ownership and portability:** volumes are managed by Docker (consistent location, easier backup, volume drivers for networked storage), while bind mounts depend on an exact host path and its permissions.
- **Volumes bypass the union filesystem** and write directly to the host storage, so they also avoid the copy-on-write overhead of the writable layer -- better performance for write-heavy workloads like databases.
- **Permissions/UID mismatches are a top bug:** the container process's UID may not match the host directory's owner on a bind mount, causing permission-denied errors -- align the user or fix ownership.
- **Do not store database data in the writable layer or a bind mount casually** -- databases expect specific filesystem semantics; a named volume is the safe default, and bind mounts over some host filesystems (e.g. certain network/desktop mounts) can corrupt DB files.
- **Anonymous volumes** (declared by \`VOLUME\` in a Dockerfile or a \`-v /path\` with no name) accumulate silently and are easy to orphan; prefer explicit named volumes.
- **Volumes are host-local by default** -- to share state across nodes you need a network volume driver or external storage (the same problem Kubernetes solves with PersistentVolumes).`,

    diagram: {
      title: "Where container data can live",
      layers: [
        { id: "writable", label: "Writable layer", sub: "ephemeral -- gone on container removal" },
        { id: "named", label: "Named volume", sub: "Docker-managed, survives, DB-safe default" },
        { id: "bind", label: "Bind mount", sub: "host dir <-> container, great for dev" },
        { id: "tmpfs", label: "tmpfs", sub: "in-memory only, vanishes on stop" },
        { id: "share", label: "Shared volume", sub: "one volume mounted into multiple containers" },
      ],
      caption: "Keep durable state in named volumes; use bind mounts for dev; never trust the writable layer.",
    },

    realWorld: `A team runs Postgres in a container with no volume. It works in testing, so they deploy it. On the first update they \`docker rm\` the old container and start a new image -- and every row is gone, because the database files lived in the now-discarded writable layer. The fix is a named volume mounted at the data directory (\`-v pgdata:/var/lib/postgresql/data\`); now recreating the container reattaches the same volume and the data persists across every deploy. The lesson people learn the hard way: if it is not in a volume, it does not survive.`,

    production: `- **Persist all durable state to named volumes;** never rely on the container writable layer.
- **Use bind mounts for development** (live code reload) and host-specific config, not for production database storage.
- **Watch UID/permission alignment** on bind mounts to avoid permission-denied errors.
- **Back up volumes** explicitly -- removing a container does not remove them, but nothing backs them up for you.
- **Prune orphaned/anonymous volumes** carefully; audit before \`docker volume prune\`.
- **For write-heavy databases, prefer named volumes** (they bypass copy-on-write and give better, safer I/O than the writable layer or fragile bind mounts).`,

    commonMistakes: [
      "Storing database or upload data in the container writable layer and losing it on the next docker rm.",
      "Using a bind mount for production DB files on a filesystem with incompatible semantics, risking corruption.",
      "Ignoring UID/ownership mismatches on bind mounts, causing permission-denied at runtime.",
      "Assuming named volumes are deleted with the container -- they persist and can silently accumulate.",
      "Relying on anonymous volumes and losing track of which volume holds which data.",
    ],

    tradeoffs: `| Mechanism | Benefit | Cost / risk |
|---|---|---|
| Writable layer | Zero setup | Ephemeral -- destroyed on removal |
| Named volume | Persistent, Docker-managed, DB-safe | Orphans if unpruned; host-local by default |
| Bind mount | Live host<->container, ideal for dev | Host-path coupling; permission/semantics issues |
| tmpfs | Fast, secret-safe, no disk | Lost on stop; consumes RAM |`,

    whenToUse: [
      "Named volumes for any data that must survive container removal -- databases, uploads, caches.",
      "Bind mounts for local development to edit code on the host and see it live in the container.",
      "tmpfs for sensitive scratch data that should never touch disk.",
    ],
    whenNotToUse: [
      "The writable layer for anything you need after the container is gone.",
      "Bind mounts for production database storage on fragile or networked host filesystems.",
      "Named volumes when you actually need cross-node shared storage (use a network volume driver).",
    ],

    memoryCard: {
      problem: "Keep data that must outlive a disposable container across restarts, rebuilds, and replacements.",
      mentalModel: "Writable layer = hotel whiteboard (wiped at checkout); named volume = lobby storage locker; bind mount = a door into your house.",
      keyConcepts: ["ephemeral writable layer", "named volume (managed, persistent)", "bind mount (host path)", "tmpfs (in-memory)", "volumes survive container removal"],
      productionConnection: "Durable state -> named volumes; dev -> bind mounts; back volumes up; watch UID/permissions.",
      oneLiner: "The container writable layer is thrown away on removal -- put anything durable in a named volume, use bind mounts for dev, and back volumes up yourself.",
    },

    quiz: [
      {
        id: "dex-vol-q1",
        prompt: "You run a database in a container with no volume, then docker rm it and recreate it. What happens to the data?",
        choices: [
          { text: "It is preserved in the base image", correct: false },
          { text: "It is lost -- the data lived in the writable layer, which is destroyed on removal", correct: true },
          { text: "Docker automatically backs it up", correct: false },
          { text: "It moves to a bind mount", correct: false },
        ],
        explanation:
          "Without a volume, writes go to the container's ephemeral writable layer, which is discarded when the container is removed. Durable data must be stored in a named volume mounted at the data directory.",
      },
      {
        id: "dex-vol-q2",
        prompt: "What is the key difference between a named volume and a bind mount?",
        choices: [
          { text: "Named volumes are always in memory", correct: false },
          { text: "A named volume is Docker-managed and portable; a bind mount maps a specific host directory into the container", correct: true },
          { text: "Bind mounts survive container removal but named volumes do not", correct: false },
          { text: "They are identical except in name", correct: false },
        ],
        explanation:
          "Named volumes are managed by Docker (consistent location, easier backup, volume drivers) and are the safe default for container-owned data. Bind mounts tie the container to an exact host path -- ideal for development, riskier for production DBs.",
      },
      {
        id: "dex-vol-q3",
        prompt: "Does removing a container also remove its named volumes?",
        choices: [
          { text: "Yes, always", correct: false },
          { text: "No -- named volumes persist until explicitly removed, which can orphan storage", correct: true },
          { text: "Only if the volume is empty", correct: false },
          { text: "Only bind mounts persist", correct: false },
        ],
        explanation:
          "Named volumes outlive the container by design, so data survives recreation. The flip side is that unused volumes accumulate; audit before docker volume prune and back volumes up explicitly.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Persist a database across recreation",
      brief:
        "Take a stateful container that loses data on removal and make its state survive container recreation using a named volume.",
      steps: `1. Identify the container's data directory (e.g. /var/lib/postgresql/data).\n2. Create a named volume and mount it at that path (-v pgdata:/var/lib/postgresql/data).\n3. Write data, then docker rm the container and recreate it with the same volume mount.\n4. Confirm the data is still present after recreation.\n5. Verify the volume persists independently (docker volume ls) and plan a backup.`,
      successCriteria: [
        "Data survives docker rm and container recreation",
        "State is stored in a named volume, not the writable layer",
        "A backup approach for the volume is identified",
      ],
    },
  },
];
