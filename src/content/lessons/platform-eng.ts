import type { Lesson } from "../types";

export const platformEngLessons: Lesson[] = [
  {
    slug: "idp-concepts",
    title: "Internal Developer Platforms",
    track: "shared",
    phase: "platform",
    module: "platform-core",
    difficulty: "advanced",
    estMinutes: 25,
    summary:
      "An IDP packages infrastructure, tooling, and best practices into self-service capabilities so product teams ship safely without waiting on ops -- reducing cognitive load, not adding a bureaucracy.",
    prerequisites: [],
    relatedConcepts: ["golden-paths", "developer-experience", "cicd-pipelines", "kubernetes-basics"],
    tags: ["platform-engineering", "idp", "self-service", "cognitive-load", "internal-platform"],

    why: `As organizations grow, the number of things a product engineer must know to ship safely explodes: Kubernetes, Terraform, CI/CD, secrets, networking, observability, security policy, cloud IAM. Expecting every team to master all of it (the maximalist "you build it, you run it" reading of DevOps) creates crushing **cognitive load**, inconsistent setups, and shipping that stalls on a shared ops team's ticket queue.

**An Internal Developer Platform (IDP) exists to package all that undifferentiated infrastructure work into self-service capabilities**, so a product team can provision an environment, deploy a service, and get logs and dashboards without filing a ticket or learning the entire stack. The platform team builds the paved road once; every product team drives on it. Done right, this is the single biggest lever on organizational shipping speed and reliability at scale -- it turns "wait three days for the infra team" into "self-serve in three minutes, safely."`,

    intuition: `Think of the difference between **assembling a car from raw parts** and **renting a well-maintained car with a full tank**.

Without a platform, every product team is handed raw parts -- an empty cloud account, some YAML, a wiki -- and told to build their own car, correctly, including brakes and airbags (security, backups, observability). Some do it well; many build something that looks fine until it crashes.

An IDP is the rental counter: you say "I need a service that talks to a database and emits metrics," and you drive off in a vehicle that already has working brakes, insurance, and a fuel gauge. **The platform is a product whose customers are your own developers**, and its job is to make the safe, compliant path also the easiest path -- so people take it not because they are forced to, but because it is genuinely faster.`,

    howItWorks: `An IDP is best understood through the **platform-as-a-product** lens, delivering a set of self-service capabilities.

### The capability planes (Team Topologies / CNCF framing)
- **Developer control plane:** how engineers interact -- a portal (e.g. Backstage), a CLI, or Git as the interface (declare intent in a repo).
- **Integration/orchestration plane:** the glue that turns declared intent into real resources -- pipelines, GitOps controllers, service catalogs, scaffolding/templates.
- **Resource plane:** the actual infrastructure -- Kubernetes clusters, databases, message queues, cloud services -- provisioned via IaC (Terraform, Crossplane, operators).
- **Monitoring/security plane:** observability, policy-as-code, secrets, and guardrails woven in by default, not bolted on.

### Core capabilities an IDP provides
- **Self-service provisioning** of environments, databases, queues.
- **Templated service creation** (scaffolding) so a new service starts with CI/CD, health checks, dashboards, and logging already wired up.
- **Golden paths** -- opinionated, supported ways to do common tasks (covered in its own lesson).
- **A service/software catalog** so ownership, docs, and dependencies are discoverable.

### The operating model
A dedicated **platform team** treats developers as customers, gathers requirements, measures adoption and satisfaction, and iterates -- rather than dictating from an ivory tower.`,

    internals: `- **Cognitive load is the real metric.** Team Topologies frames the platform's purpose as reducing the *extraneous* cognitive load on stream-aligned (product) teams so their capacity goes to the domain, not the plumbing.
- **Paved road, not a walled garden.** The platform should be the easiest path but allow escape hatches; teams with genuinely different needs must not be blocked. Mandatory-and-painful platforms get routed around ("shadow platforms").
- **Thin vs thick platforms:** a thin platform offers building blocks and lets teams compose; a thick, opinionated one offers turnkey golden paths. Most mature platforms are opinionated by default with escape hatches.
- **Abstraction leakage:** every abstraction leaks eventually (a pod won't schedule, a Terraform apply fails). A good IDP surfaces the underlying reality when needed instead of hiding failures behind a green checkmark.
- **Build vs buy vs assemble:** most IDPs assemble existing tools (Backstage, ArgoCD/Flux, Crossplane, Terraform, Vault) rather than building from scratch. The value is integration and opinion, not novel infra.
- **Adoption is voluntary in spirit:** you measure success by how many teams *choose* the platform and how satisfied they are, not by mandate compliance.
- **Platform-as-a-product means it has a roadmap, users, feedback loops, SLAs, and versioning** -- treat internal breakage of the platform like an outage for a paying customer.`,

    diagram: {
      title: "IDP: from developer intent to running infrastructure",
      layers: [
        { id: "dev", label: "Developer control plane", sub: "portal / CLI / Git -- declare what you need" },
        { id: "orch", label: "Orchestration plane", sub: "templates, pipelines, GitOps turn intent into resources" },
        { id: "resource", label: "Resource plane", sub: "K8s, DBs, queues provisioned via IaC" },
        { id: "guardrails", label: "Monitoring + security plane", sub: "observability, policy-as-code, secrets by default" },
        { id: "product", label: "Platform team (as a product)", sub: "developers are customers; measure adoption + satisfaction" },
      ],
      caption: "Product teams declare intent and get a safe, observable, compliant service without owning the whole stack.",
    },

    realWorld: `A 200-engineer company has a central ops team that is a bottleneck: every new service waits days for a cluster namespace, database, secrets, and monitoring, each set up slightly differently, some without backups. Incidents trace back to inconsistent, hand-rolled infra. They form a platform team that ships an IDP: a \`new-service\` template that scaffolds a repo with CI/CD, a Postgres provisioned via a self-service request, health checks, dashboards, and log shipping -- all wired up in minutes. Lead time for a new service drops from days to minutes, every service now has backups and dashboards by default, and the ops team stops being a ticket queue and becomes a product team improving the road. **The win was not a new tool; it was turning infrastructure into a self-service product and making the safe path the fast path.**`,

    production: `- **Run the platform as a product:** real roadmap, user research with developers, adoption and satisfaction metrics, and treat platform outages like customer-facing incidents.
- **Make the safe path the easy path.** If the compliant, observable, backed-up option is also the fastest, teams adopt it willingly -- no mandate needed.
- **Provide escape hatches.** Never hard-block a team with a legitimate edge case; a platform routed around is worse than none.
- **Bake in observability, security, and backups by default** via templates so teams get them without thinking.
- **Measure success by outcomes:** lead time for a new service, deployment frequency, adoption rate, developer satisfaction (DevEx) -- not by lines of platform code.
- **Assemble, do not reinvent.** Integrate Backstage/ArgoCD/Crossplane/Terraform/Vault; your value is opinion and integration.
- **Version and communicate changes.** Breaking the platform silently breaks every team on it.`,

    commonMistakes: [
      "Building the platform in an ivory tower without talking to the developers who must use it -- low adoption follows.",
      "Making the platform mandatory and painful, so teams build shadow platforms to route around it.",
      "Adding a portal and calling it a platform, without the underlying self-service provisioning and golden paths.",
      "Hiding failures behind a green UI so developers cannot debug when the abstraction leaks.",
      "No escape hatches, blocking legitimate edge cases and eroding trust.",
      "Measuring platform success by features shipped rather than developer outcomes (lead time, satisfaction).",
      "Treating the platform team as a cost center / ticket queue instead of a product team with users.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Opinionated (thick) platform | Turnkey golden paths, high consistency | Less flexibility; needs good escape hatches |
| Thin (building blocks) platform | Maximum flexibility | Higher cognitive load; less consistency |
| Self-service | Fast, no ticket queue | Upfront investment; must handle abuse/guardrails |
| Central ops (no platform) | Simple at small scale | Bottleneck and inconsistency as you grow |
| Mandate adoption | Fast rollout | Resentment, shadow platforms if it is painful |`,

    whenToUse: [
      "Growing orgs where cognitive load and an ops bottleneck are slowing many teams.",
      "When infrastructure setup is inconsistent across teams and causing incidents.",
      "When you want to standardize security, observability, and backups by default across services.",
    ],
    whenNotToUse: [
      "Tiny teams/startups where a lightweight setup and direct ownership are cheaper than building a platform.",
      "As a way to centralize control and slow teams down -- that is the opposite of the goal.",
      "When you would build a mandatory, inflexible platform with no escape hatches.",
    ],

    code: [
      {
        label: "Developer intent as a declarative manifest (Git as the control plane)",
        language: "yaml",
        code: `# The developer declares WHAT they need; the platform decides HOW.
apiVersion: platform.acme.io/v1
kind: Service
metadata:
  name: checkout-api
  team: payments        # ownership -> catalog, on-call routing
spec:
  runtime: node20
  resources:
    cpu: "500m"
    memory: "512Mi"
  dependencies:
    - kind: postgres    # platform provisions + wires connection secret
      size: small
      backup: daily     # backups on by default
    - kind: redis
      size: small
  observability:
    dashboards: true    # metrics/logs/traces wired automatically
    slo:
      availability: "99.9%"`,
      },
    ],

    memoryCard: {
      problem: "At scale, expecting every product team to master the whole infra stack creates crushing cognitive load, inconsistency, and an ops bottleneck.",
      mentalModel: "A car rental counter, not a pile of raw parts: developers declare intent and drive off in a safe, observable, compliant vehicle.",
      keyConcepts: ["platform-as-a-product", "self-service provisioning", "control/orchestration/resource/security planes", "reduce cognitive load", "paved road + escape hatches", "measure adoption + satisfaction"],
      productionConnection: "A platform team assembles Backstage/ArgoCD/Crossplane/Terraform/Vault into templated, self-service golden paths; success is lead time and DevEx, not features.",
      oneLiner: "An IDP turns infrastructure into a self-service product so product teams ship safely and fast without owning the whole stack.",
    },

    quiz: [
      {
        id: "idp-q1",
        prompt: "What is the primary purpose of an Internal Developer Platform?",
        choices: [
          { text: "To centralize control so ops approves every deploy", correct: false },
          { text: "To reduce product teams' cognitive load via self-service capabilities so they ship safely without owning the whole stack", correct: true },
          { text: "To replace developers with automation", correct: false },
          { text: "To force everyone onto one Kubernetes cluster", correct: false },
        ],
        explanation: "An IDP packages undifferentiated infrastructure into self-service golden paths, lowering the cognitive load on stream-aligned teams so they focus on their domain, not plumbing.",
      },
      {
        id: "idp-q2",
        prompt: "Why should an IDP be the easiest path rather than a mandatory one?",
        choices: [
          { text: "Mandates are illegal", correct: false },
          { text: "If the safe path is also the easiest, teams adopt it willingly; a mandatory painful platform gets routed around by shadow platforms", correct: true },
          { text: "Because platforms cannot be enforced technically", correct: false },
          { text: "Because developers never follow rules", correct: false },
        ],
        explanation: "Adoption is the real success metric. Making the compliant, observable path also the fastest earns voluntary adoption; forcing a painful platform pushes teams to build workarounds.",
      },
      {
        id: "idp-q3",
        prompt: "What does 'platform-as-a-product' imply for the platform team?",
        choices: [
          { text: "They sell the platform externally for revenue", correct: false },
          { text: "They treat developers as customers -- with a roadmap, user research, adoption/satisfaction metrics, and incident-grade reliability", correct: true },
          { text: "They only write documentation", correct: false },
          { text: "They own all product features too", correct: false },
        ],
        explanation: "Platform-as-a-product means the internal developers are customers: the team does user research, measures adoption and satisfaction, iterates on a roadmap, and treats platform breakage as an outage.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Scope a minimal viable IDP",
      brief: "For a 150-engineer org where new services take days to stand up inconsistently, define the first capabilities of an IDP and how you will measure success.",
      steps: `1. Interview (list) the top 3 pain points product teams hit when shipping a new service.\n2. Pick 2-3 highest-leverage self-service capabilities to build first (e.g. scaffolding template, DB provisioning, dashboards-by-default).\n3. Map each capability to a plane (control / orchestration / resource / security) and the existing tool you will assemble (Backstage, ArgoCD, Terraform, etc.).\n4. Define escape hatches for edge-case teams.\n5. Choose success metrics: lead time for a new service, adoption rate, developer satisfaction.`,
      successCriteria: [
        "2-3 concrete self-service capabilities tied to real pain points",
        "Each mapped to a plane and an assembled tool (not reinvented)",
        "Escape hatches and outcome-based success metrics defined",
      ],
    },
  },

  {
    slug: "golden-paths",
    title: "Golden Paths",
    track: "shared",
    phase: "platform",
    module: "platform-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "An opinionated, well-supported, paved route through the most common engineering tasks -- so the default way is the safe, fast, best-practice way, while still leaving escape hatches.",
    prerequisites: ["idp-concepts"],
    relatedConcepts: ["idp-concepts", "developer-experience", "cicd-pipelines"],
    tags: ["golden-path", "paved-road", "platform-engineering", "opinionated", "scaffolding"],

    why: `Given infinite freedom, engineers will solve the same problem -- how to build, test, deploy, secure, and observe a service -- in dozens of subtly different, often subtly broken ways. Each variation is a snowflake to operate, a new attack surface, and a fresh source of "works on my service, not yours." Freedom sounds good but produces sprawl, inconsistency, and high cognitive load.

**A golden path exists to make the recommended, best-practice way of doing a common task also the easiest and most supported way.** It is the paved road: opinionated defaults for the 80% case that already include CI/CD, security, observability, and standards, so an engineer starting a new service does not have to rediscover and re-solve every cross-cutting concern. The goal is not to remove choice but to make the good choice the default, so teams move fast *and* consistently. This is the concrete, day-to-day deliverable of a platform team.`,

    intuition: `Imagine a national park with a **paved, well-marked, well-lit trail to the summit** -- benches, signage, safety railings -- alongside the option to still go off-trail if you are an expert with a reason.

Most visitors take the paved trail because it is obviously the fastest and safest way up. They do not need to be forced; it is simply better. A few experienced climbers with special needs go off-trail, and that is allowed.

A golden path is that paved trail for engineering tasks. It is not a fence keeping you in (that would be a walled garden that people resent and route around). It is a genuinely superior default route -- so good that taking it is the obvious choice, while the escape hatch remains for the rare case that truly needs it. **Golden, not mandatory.**`,

    howItWorks: `### What a golden path actually is
A golden path is a **combination of tooling, code templates, and documentation** that guides an engineer through a common workflow with best practices baked in. Common golden paths:
- **Create a new service** -- scaffolds a repo with the standard structure, CI/CD, health/readiness endpoints, logging, metrics, tracing, and a Dockerfile already wired.
- **Deploy to production** -- an opinionated pipeline with tests, security scans, and progressive rollout.
- **Add a database / queue** -- self-service provisioning with backups and monitoring by default.

### The key properties
- **Opinionated:** it makes decisions for you (which framework layout, which pipeline, which observability stack) so you do not have to.
- **Well-supported:** the platform team maintains it, so following it means you get help and updates, not abandonment.
- **Covers cross-cutting concerns by default:** security, observability, and reliability come for free, not as an afterthought.
- **Has escape hatches:** you can deviate when justified, so the path guides without imprisoning.

### How it is delivered
Usually via **scaffolding/templating tools** (Backstage software templates, Cookiecutter, \`create-*\` generators) plus reusable pipeline definitions and shared libraries -- surfaced through the IDP's control plane.`,

    internals: `- **Golden path vs paved road vs walled garden:** "golden path" and "paved road" are near-synonyms (the recommended, supported route). A "walled garden" is the anti-pattern: a *mandatory* path with no exit, which breeds resentment and shadow tooling. The distinction is the escape hatch and the fact that people choose the path because it is better.
- **80/20 by design:** golden paths target the common cases. They are deliberately not universal; the long tail of unusual needs uses escape hatches, and that is healthy.
- **Templates drift:** a service scaffolded a year ago diverges from today's best practice. Mature platforms provide **template updates / renovate-style automation** to keep services on the current path, or they accept drift and re-onboard.
- **Opinion reduces cognitive load, but wrong opinion adds friction.** The opinion must reflect real, gathered best practice, not one architect's taste -- otherwise teams reject it.
- **Adoption is the scoreboard.** If most new work does not use the golden path, the path is wrong (too rigid, too slow, missing a case), not the engineers.
- **Golden paths encode organizational learning:** every incident postmortem that produces "we should always do X" should update the golden path so the next team gets X for free.`,

    diagram: {
      title: "The golden path (paved road) vs the alternatives",
      layers: [
        { id: "task", label: "Common task", sub: "e.g. create + deploy a new service" },
        { id: "golden", label: "Golden path", sub: "opinionated template: CI/CD + security + o11y baked in" },
        { id: "default", label: "Easiest = safest", sub: "best practice is the default, chosen willingly" },
        { id: "escape", label: "Escape hatch", sub: "deviate when justified -- guides, not imprisons" },
        { id: "walled", label: "Anti-pattern: walled garden", sub: "mandatory + no exit -> resentment, shadow tooling" },
      ],
      caption: "A golden path is a superior default with an exit -- not a fence. Adoption is voluntary because it is genuinely better.",
    },

    realWorld: `Before golden paths, spinning up a new microservice at a company meant copying a random existing repo, hoping its CI config was current, manually adding logging and metrics (often forgotten), and writing a bespoke deploy script. Half the services lacked tracing; several shipped without security scanning. The platform team introduces a \`backstage create service\` golden path: one command scaffolds a repo with the standard layout, a maintained CI/CD pipeline (tests + security scan + canary deploy), health checks, and dashboards pre-provisioned. New services now start production-ready in minutes and are consistent enough that on-call engineers can debug any of them the same way. Engineers adopt it not by mandate but because writing all that by hand was never fun. **The golden path turned tribal knowledge and copy-paste into a supported, one-command default.**`,

    production: `- **Build golden paths for the highest-frequency tasks first** (new service, deploy, add a datastore) -- that is where consistency pays off most.
- **Bake in cross-cutting concerns by default:** observability, security scanning, health checks, backups -- so following the path gives them for free.
- **Keep an escape hatch** and document when deviating is appropriate; never make the path a walled garden.
- **Maintain the templates.** Provide update automation (or a re-scaffold path) so services do not rot away from current best practice.
- **Feed postmortems back into the path.** When an incident yields "always do X," update the golden path so every future service inherits the fix.
- **Measure adoption.** If teams avoid the path, treat that as a product bug in the path, not a discipline problem in the teams.
- **Base the opinion on gathered best practice**, validated with real teams -- not a single person's preference.`,

    commonMistakes: [
      "Making the golden path mandatory with no escape hatch, turning it into a resented walled garden.",
      "Shipping a template once and never maintaining it, so services rot away from current best practice.",
      "Encoding one architect's personal taste instead of validated, gathered best practice.",
      "Trying to cover 100% of cases in one path instead of nailing the 80% and allowing escape hatches for the rest.",
      "Leaving cross-cutting concerns (observability, security) as optional add-ons instead of defaults on the path.",
      "Ignoring low adoption as a discipline problem instead of diagnosing the path as too slow or too rigid.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Opinionated golden path | Fast, consistent, best-practice defaults | Must maintain; wrong opinion adds friction |
| Full freedom (no path) | Max flexibility | Sprawl, inconsistency, high cognitive load |
| Walled garden (mandatory) | Uniformity | Resentment, shadow tooling, blocks edge cases |
| Template auto-update | Services stay current | Automation to build; risk of breaking changes |
| Escape hatches | Handles the long tail | Some divergence to operate |`,

    whenToUse: [
      "High-frequency, repeated engineering tasks (new service, deploy, provision a datastore).",
      "When inconsistency across services is causing operational pain or security gaps.",
      "To encode postmortem learnings so every future service inherits the fix by default.",
    ],
    whenNotToUse: [
      "Truly novel or one-off work that does not fit the common case (use the escape hatch).",
      "As a mandatory fence with no exit -- that is a walled garden anti-pattern.",
      "When you have not yet gathered real best practice and would just be encoding a guess.",
    ],

    code: [
      {
        label: "Scaffolding a golden-path service (one command, best practices baked in)",
        language: "bash",
        code: `# The golden path: one command produces a production-ready service.
$ backstage create --template service-golden-path --name checkout-api --team payments

# What it scaffolds -- so no one re-solves cross-cutting concerns by hand:
#   .github/workflows/ci.yaml   -> tests + lint + security scan + canary deploy
#   src/health.ts               -> /healthz and /readyz endpoints
#   observability/              -> metrics, structured logging, tracing wired up
#   Dockerfile                  -> hardened base image, non-root user
#   catalog-info.yaml           -> ownership + SLOs registered in the service catalog
#
# Escape hatch: teams with a genuine edge case can eject and customize any part.`,
      },
    ],

    memoryCard: {
      problem: "Unlimited freedom makes every team re-solve build/deploy/secure/observe differently, producing sprawl, inconsistency, and high cognitive load.",
      mentalModel: "A paved, well-lit trail to the summit that most people take because it is genuinely the best route -- with off-trail allowed for experts.",
      keyConcepts: ["opinionated + well-supported default", "cross-cutting concerns baked in", "golden != mandatory (has escape hatches)", "walled garden is the anti-pattern", "scaffolding/templates", "adoption is the scoreboard"],
      productionConnection: "Platform teams ship scaffolding templates and maintained pipelines (Backstage, create-* generators) so new services start production-ready; postmortems feed back into the path.",
      oneLiner: "A golden path makes the best-practice way the easiest way -- an opinionated, supported paved road with an escape hatch, not a fence.",
    },

    quiz: [
      {
        id: "gp-q1",
        prompt: "What distinguishes a golden path from a 'walled garden'?",
        choices: [
          { text: "A golden path is written in YAML", correct: false },
          { text: "A golden path is a superior, supported default with escape hatches; a walled garden is mandatory with no exit", correct: true },
          { text: "A walled garden is faster", correct: false },
          { text: "There is no difference", correct: false },
        ],
        explanation: "Both are opinionated, but a golden path is chosen because it is genuinely better and allows deviation when justified. A walled garden forces the path with no exit, breeding resentment and shadow tooling.",
      },
      {
        id: "gp-q2",
        prompt: "Why should cross-cutting concerns like observability and security be baked into the golden path by default?",
        choices: [
          { text: "To make the template larger", correct: false },
          { text: "So every service that follows the path gets them for free, instead of each team re-solving (and often forgetting) them", correct: true },
          { text: "Because they cannot be added later", correct: false },
          { text: "To force teams to read documentation", correct: false },
        ],
        explanation: "Baking in observability, security, and health checks means following the easy default path automatically yields best-practice, consistent services -- eliminating forgotten dashboards or missing security scans.",
      },
      {
        id: "gp-q3",
        prompt: "Adoption of a golden path is low. What is the healthiest interpretation?",
        choices: [
          { text: "Engineers are undisciplined and should be mandated onto it", correct: false },
          { text: "The path is likely a product bug -- too slow, too rigid, or missing a case -- and should be fixed", correct: true },
          { text: "Golden paths never work", correct: false },
          { text: "The metric is irrelevant", correct: false },
        ],
        explanation: "A golden path earns adoption by being better. Low adoption signals the path is too slow, too restrictive, or misses real needs -- treat it as feedback to improve the path, not as a discipline failure.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a golden path for creating a new service",
      brief: "Define the opinionated defaults, baked-in concerns, and escape hatches for a 'create a new service' golden path.",
      steps: `1. List the cross-cutting concerns a new service must have (CI/CD, health checks, logging, metrics, tracing, security scan, ownership metadata).\n2. Decide the opinionated defaults for each (which pipeline, which observability stack, which base image).\n3. Describe how it is delivered (scaffolding template + shared pipeline + catalog registration).\n4. Define at least two escape hatches for legitimate edge cases.\n5. Choose how you will keep scaffolded services current (auto-update vs re-scaffold) and how you will measure adoption.`,
      successCriteria: [
        "All key cross-cutting concerns baked into the default template",
        "Delivered via scaffolding with catalog registration, not manual steps",
        "Escape hatches defined and adoption + freshness measured (golden, not mandatory)",
      ],
    },
  },

  {
    slug: "developer-experience",
    title: "Developer Experience (DevEx)",
    track: "shared",
    phase: "platform",
    module: "platform-core",
    difficulty: "core",
    estMinutes: 23,
    summary:
      "The end-to-end experience of building software here -- feedback loops, cognitive load, and flow state -- and why measuring and improving it (DORA + SPACE) is a direct lever on delivery speed and quality.",
    prerequisites: ["idp-concepts"],
    relatedConcepts: ["idp-concepts", "golden-paths", "cicd-pipelines", "slo-sli-error-budgets"],
    tags: ["devex", "dora", "space", "feedback-loops", "cognitive-load", "flow", "platform-engineering"],

    why: `Every friction an engineer hits -- a 30-minute CI run, a flaky local setup, unclear ownership, waiting days for an environment -- is a tax paid on every change, forever. These frictions compound: they slow delivery, erode quality (people cut corners to escape the pain), and burn people out. Yet they are often invisible to leadership because no single one is a crisis; they are a death by a thousand papercuts.

**Developer Experience (DevEx) exists to name, measure, and systematically remove that friction**, treating the experience of building software as a first-class concern with the same rigor as customer experience. It matters because DevEx is not a "nice to have" morale project -- research (DORA, SPACE, the DX study) shows it is a *direct driver of delivery performance and business outcomes*: teams with better feedback loops, lower cognitive load, and more flow ship faster and more reliably. Platform engineering exists largely to improve DevEx; DevEx is how you know whether the platform is working.`,

    intuition: `Think about the difference between **cooking in a well-organized kitchen** and a chaotic one.

In the good kitchen, your tools are within reach, ingredients are prepped, the stove lights instantly, and you get immediate feedback (you can taste as you go). You enter flow and produce great food fast. In the chaotic kitchen, you hunt for a knife, the oven takes 20 minutes to preheat, and you cannot tell if the dish is working until it is served and it is too late. Same chef, wildly different output and morale.

Software has the same dynamic. **DevEx is the state of your kitchen.** The three ingredients that matter most: how quickly you get **feedback** (does the stove light now or in 20 minutes?), how much **cognitive load** you carry (are the tools organized or do you juggle everything in your head?), and how often you reach **flow** (uninterrupted focus vs constant context-switching). Improve those three and the same engineers produce more, better, happier.`,

    howItWorks: `### The three core dimensions of DevEx (the DX research framing)
- **Feedback loops:** how fast you learn whether something works -- local build/test time, CI duration, deploy time, time to see a change in an environment, code review turnaround. Fast loops keep you in flow; slow loops force context-switching.
- **Cognitive load:** how much you must hold in your head to get work done -- tooling complexity, unclear docs, tangled dependencies, undocumented ownership. High load slows everything and causes errors. (This is exactly what platforms and golden paths reduce.)
- **Flow state:** the ability to work with focus and minimal interruption -- few unplanned meetings, autonomy, minimal handoffs, and psychological safety.

### Measuring it
- **DORA metrics** (delivery performance): deployment frequency, lead time for changes, change failure rate, mean time to restore. Good outcome metrics for the delivery pipeline.
- **SPACE framework** (holistic): Satisfaction & well-being, Performance, Activity, Communication & collaboration, Efficiency & flow. It insists you never use a single metric -- combine perceptual (surveys) and system data across dimensions.
- **The key insight:** you need both *system metrics* (CI time, deploy frequency) and *perceptual metrics* (developer surveys), because much friction is only visible to the people feeling it.

### Improving it
Instrument the pipeline, survey developers, find the biggest friction (usually slow feedback loops or high cognitive load), fix it, and measure the change -- the same product loop a platform team runs.`,

    internals: `- **Never optimize a single metric.** Deploy frequency alone can be gamed; SPACE deliberately spans multiple dimensions and mixes perceptual with system data to avoid perverse incentives (e.g. gaming lead time by shrinking commits meaninglessly).
- **DORA is about the system's delivery capability; SPACE is broader (includes people).** They complement each other; DORA metrics fit inside SPACE's Performance/Efficiency dimensions.
- **Perceptual data is not soft.** How developers *feel* about friction is often a better leading indicator than system metrics, because they notice the papercuts instrumentation misses. Surveys are a legitimate, rigorous measurement.
- **Feedback loop length dominates.** A slow CI (say 30 min) does not cost 30 minutes -- it costs the context switch, the lost flow, and often a second run, easily an hour of effective productivity per change. Shortening loops is usually the highest-ROI DevEx work.
- **Cognitive load has intrinsic, extraneous, and germane parts** (Team Topologies borrows this). Platforms attack *extraneous* load (accidental complexity of tooling/infra) so more capacity goes to the domain problem.
- **DevEx is the outcome metric for platform engineering.** If you built a platform and DevEx (feedback loops, cognitive load, flow, satisfaction) did not improve, the platform is not working -- this is how the two topics connect.
- **Local developer experience counts too:** onboarding time, "time to first commit," and reproducible local/dev environments are high-leverage and frequently neglected.`,

    diagram: {
      title: "DevEx: three dimensions, measured, drive delivery",
      layers: [
        { id: "feedback", label: "Feedback loops", sub: "build/CI/deploy/review speed -> keep flow" },
        { id: "load", label: "Cognitive load", sub: "tooling/docs/ownership -- platforms cut extraneous load" },
        { id: "flow", label: "Flow state", sub: "focus, autonomy, few interruptions/handoffs" },
        { id: "measure", label: "Measure: DORA + SPACE", sub: "system + perceptual metrics, never one number" },
        { id: "outcome", label: "Outcome", sub: "faster, more reliable delivery; happier, retained engineers" },
      ],
      caption: "Fast feedback + low cognitive load + more flow, measured holistically, is a direct lever on delivery performance.",
    },

    realWorld: `An engineering org feels slow but cannot say why. A DevEx survey plus pipeline instrumentation reveals the culprit: CI takes 35 minutes and is flaky, so engineers batch changes, context-switch while waiting, and often re-run failed pipelines -- lead time for changes is days. The platform team treats this as a product problem: they parallelize the test suite, cache dependencies, and quarantine flaky tests, cutting CI to 6 minutes. Deployment frequency rises, lead time drops from days to hours, change failure rate falls (smaller, more frequent changes), and the next survey shows a jump in satisfaction. **They did not add headcount; they shortened a feedback loop and the whole delivery system sped up** -- exactly what DORA/SPACE predict and what DevEx work targets.`,

    production: `- **Measure with both system and perceptual data.** Instrument DORA metrics (deploy frequency, lead time, change failure rate, MTTR) and run regular developer surveys (SPACE). Never rely on one number.
- **Attack the longest feedback loop first.** Slow/flaky CI is the most common highest-ROI target; also code review latency and environment provisioning time.
- **Reduce extraneous cognitive load** via platforms and golden paths -- the direct connection between DevEx and platform engineering.
- **Protect flow:** reduce unplanned meetings and interruptions, minimize handoffs, and give teams autonomy over their tooling.
- **Track onboarding / time-to-first-commit** as a leading DevEx indicator; a painful onboarding predicts pervasive friction.
- **Treat DevEx as the success metric for the platform.** If platform investment does not move DevEx and DORA, re-evaluate the platform.
- **Beware gaming a single metric** -- optimize the balanced SPACE picture, not just lead time or deploy count.`,

    commonMistakes: [
      "Optimizing a single metric (e.g. deploy frequency) and getting gamed or perverse behavior instead of real improvement.",
      "Ignoring perceptual data (surveys), missing the papercuts that instrumentation cannot see.",
      "Treating DevEx as a morale/perks project rather than a driver of delivery performance and quality.",
      "Tolerating slow/flaky CI, the single most common and costly feedback-loop drag.",
      "Confusing activity (commits, hours) with productivity -- activity metrics alone are misleading.",
      "Building a platform and never checking whether DevEx actually improved.",
      "Neglecting onboarding and local-dev reproducibility, which quietly tax every new engineer.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Measure with surveys + system data | Sees both felt and instrumented friction | Survey fatigue if overdone; needs discipline |
| DORA metrics | Clear delivery-performance signal | Narrow; gameable if used alone |
| SPACE framework | Holistic, resists gaming | More effort to gather and interpret |
| Invest in feedback loops (faster CI) | High ROI, more flow | Engineering time to parallelize/cache |
| Reduce cognitive load via platform | Frees capacity for the domain | Upfront platform investment |`,

    whenToUse: [
      "When the org 'feels slow' and you need to locate and quantify the real friction.",
      "To justify and measure the impact of platform engineering investment.",
      "During scaling, where onboarding, feedback loops, and cognitive load degrade silently.",
    ],
    whenNotToUse: [
      "As a single vanity metric to rank or blame individuals (violates the SPACE principle).",
      "As an excuse to add perks without fixing the underlying feedback-loop and cognitive-load problems.",
      "Measuring so heavily that surveying itself becomes friction.",
    ],

    code: [
      {
        label: "DORA metrics as a quick delivery-performance snapshot",
        language: "typescript",
        code: `// The four DORA metrics -- a system-side view of delivery performance.
interface DoraSnapshot {
  deploymentFrequency: string; // e.g. "12/day"  (throughput)
  leadTimeForChanges: string;  // commit -> production, e.g. "3h"  (speed)
  changeFailureRate: number;   // fraction of deploys causing incidents, e.g. 0.05
  timeToRestore: string;       // MTTR after a failed change, e.g. "20m" (recovery)
}

// KEY: DORA is only the delivery-system view. Pair it with SPACE perceptual data
// (developer satisfaction, flow, cognitive load surveys) -- never optimize one number.
function isElite(d: DoraSnapshot): boolean {
  return d.changeFailureRate < 0.15; // illustrative; use the full balanced picture
}`,
      },
    ],

    memoryCard: {
      problem: "Invisible, compounding friction (slow CI, high cognitive load, constant interruptions) silently taxes every change, slowing delivery and burning people out.",
      mentalModel: "The state of your kitchen: organized tools, a stove that lights instantly, and tasting as you go (fast feedback) let the same chef produce more, better food.",
      keyConcepts: ["3 dimensions: feedback loops, cognitive load, flow", "DORA (delivery) + SPACE (holistic)", "system + perceptual metrics", "never optimize a single metric", "DevEx is the outcome metric for platforms", "shorten the longest feedback loop"],
      productionConnection: "Instrument DORA, survey with SPACE, attack slow/flaky CI and cognitive load (via platforms/golden paths), then confirm the platform actually improved DevEx.",
      oneLiner: "DevEx is the measurable end-to-end experience of building software -- fast feedback, low cognitive load, and flow -- and improving it directly speeds and stabilizes delivery.",
    },

    quiz: [
      {
        id: "devex-q1",
        prompt: "What are the three core dimensions of Developer Experience?",
        choices: [
          { text: "Salary, perks, and office location", correct: false },
          { text: "Feedback loops, cognitive load, and flow state", correct: true },
          { text: "CPU, memory, and disk", correct: false },
          { text: "Deploys, commits, and pull requests", correct: false },
        ],
        explanation: "The DX research framing centers on feedback loops (how fast you learn if something works), cognitive load (how much you must hold in your head), and flow state (focus with minimal interruption).",
      },
      {
        id: "devex-q2",
        prompt: "Why does the SPACE framework insist you never use a single metric?",
        choices: [
          { text: "Because metrics are always wrong", correct: false },
          { text: "A single metric is easily gamed and misses dimensions; SPACE combines perceptual and system data across multiple dimensions for a balanced, harder-to-game picture", correct: true },
          { text: "Because developers dislike being measured", correct: false },
          { text: "Because only survey data matters", correct: false },
        ],
        explanation: "Optimizing one number (e.g. deploy frequency) invites perverse incentives. SPACE spans Satisfaction, Performance, Activity, Communication, and Efficiency/flow, mixing surveys with system data.",
      },
      {
        id: "devex-q3",
        prompt: "How does DevEx relate to platform engineering?",
        choices: [
          { text: "They are unrelated", correct: false },
          { text: "Platforms exist largely to improve DevEx (reduce cognitive load, speed feedback), and DevEx metrics are how you tell whether the platform is working", correct: true },
          { text: "DevEx replaces platform engineering", correct: false },
          { text: "Platforms make DevEx worse", correct: false },
        ],
        explanation: "Platforms and golden paths cut extraneous cognitive load and shorten feedback loops -- the core of DevEx. DevEx and DORA metrics are the outcome measures that validate platform investment.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Diagnose and improve DevEx for a slow-feeling team",
      brief: "The team says shipping feels slow. Use DevEx thinking to find the friction, measure it, fix it, and confirm the improvement.",
      steps: `1. Gather both data types: instrument DORA (lead time, deploy frequency, change failure rate, MTTR) and run a short survey covering feedback loops, cognitive load, and flow.\n2. Identify the single biggest friction (often slow/flaky CI or long code-review latency).\n3. Propose a concrete fix (e.g. parallelize/caches tests, quarantine flaky tests) and predict which DORA metric it moves.\n4. Define before/after measurement, including a follow-up perceptual survey.\n5. Explain how this validates (or not) the platform team's investment, avoiding single-metric optimization.`,
      successCriteria: [
        "Uses both system (DORA) and perceptual (survey) data",
        "Targets the longest feedback loop / highest cognitive load with a concrete fix",
        "Defines balanced before/after measurement, not a single gamed metric",
      ],
    },
  },
];
