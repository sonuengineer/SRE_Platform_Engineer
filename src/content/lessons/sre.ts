import type { Lesson } from "../types";

export const sreLessons: Lesson[] = [
  {
    slug: "sre-principles",
    title: "SRE Principles",
    track: "shared",
    phase: "sre",
    module: "sre-core",
    difficulty: "advanced",
    estMinutes: 24,
    summary:
      "The engineering discipline that treats operations as a software problem -- error budgets, eliminating toil, blameless culture, and measuring reliability instead of arguing about it.",
    prerequisites: ["slo-sli-error-budgets"],
    relatedConcepts: ["incident-response", "toil-automation", "postmortems", "capacity-planning"],
    tags: ["sre", "reliability", "error-budget", "toil", "culture"],

    why: `Traditional ops and dev are structurally at war: developers are rewarded for *shipping change*, operators are rewarded for *preventing change* (change causes outages). The result is a permanent tug-of-war, launches held hostage, and blame after every incident.

**Site Reliability Engineering exists to dissolve that conflict by making reliability a measurable, shared, engineered property instead of a feeling.** Google's insight was simple: have software engineers do operations, cap the amount of manual work they must do, and use data (error budgets) to decide when to ship versus when to stabilize. SRE is what lets a system scale to billions of requests without the operations headcount scaling linearly with it.`,

    intuition: `SRE is **treating your operations like a product to be engineered, not a fire to be fought.**

- You don't judge reliability by vibes ("it feels flaky lately"); you **measure** it (SLIs) and set a **target** (SLO).
- 100% reliability is the wrong goal -- it is impossibly expensive and users can't even tell. So you deliberately allow a little failure (the **error budget**) and *spend* it on shipping features.
- Repetitive manual work (**toil**) is treated as a bug in your operations: you automate it away so engineers do engineering, not button-clicking.
- When things break, you ask "what in the *system* allowed this?" not "who screwed up?" (**blameless culture**), because fear hides the real causes.

The whole philosophy: **hope is not a strategy; measurement and automation are.**`,

    howItWorks: `### The core tenets
- **Embrace risk, don't chase 100%.** Pick an SLO below 100% and treat the gap as a budget.
- **SLOs and error budgets drive decisions.** Budget remaining -> ship. Budget exhausted -> freeze and harden. This is the mechanism that ends the dev-vs-ops war.
- **Eliminate toil.** Toil is manual, repetitive, automatable, reactive work that scales with load and has no lasting value. SRE caps toil (Google's guideline: <=50% of time) so the rest goes to engineering.
- **Blamelessness.** Postmortems focus on systemic causes, never individuals, so people report honestly and the system actually improves.
- **Monitoring and observability.** You cannot operate what you cannot see; alert on symptoms (user pain / burn rate), not every internal cause.
- **Automate everything repeatable.** Releases, rollbacks, provisioning, failover -- if a human does it twice, script it.

### The error-budget contract
Product and SRE agree in advance: reliability is a budget. Velocity spends it, reliability work refills it, and a written policy dictates what happens when it runs out. This converts a political argument into arithmetic.`,

    internals: `- **SRE is a role AND a philosophy.** You can adopt the practices (SLOs, error budgets, blameless postmortems, toil budgets) without a dedicated SRE team -- the ideas matter more than the org chart.
- **The 50% toil cap is a control loop:** if SREs drown in toil, they can't build the automation that reduces toil, so the system degrades. The cap forces investment in engineering.
- **Error budgets align incentives structurally.** Developers now *want* reliability because blowing the budget freezes their launches; SREs now tolerate risk because there's headroom to spend. The conflict becomes cooperation.
- **Alert on symptoms, not causes.** A full disk isn't an incident if users feel nothing; page on the user-visible symptom (via burn rate) and diagnose the cause after. This is how you avoid alert fatigue that kills on-call.
- **Reliability has diminishing returns.** Each extra nine costs ~10x and, past the point users notice, buys nothing. Knowing when to *stop* improving reliability is as important as improving it.
- **Culture is load-bearing.** All the metrics fail if people are punished for honesty -- blamelessness is not softness, it is what makes the data trustworthy.`,

    diagram: {
      title: "The SRE operating loop",
      layers: [
        { id: "measure", label: "Measure (SLIs)", sub: "quantify user-facing reliability" },
        { id: "target", label: "Target (SLO + budget)", sub: "allow some failure on purpose" },
        { id: "decide", label: "Decide by budget", sub: "budget left -> ship; gone -> harden" },
        { id: "toil", label: "Cap & automate toil", sub: "<=50% toil; engineer the rest away" },
        { id: "learn", label: "Blameless learning", sub: "postmortems fix the system, not people" },
      ],
      caption: "Measure reliability, spend the budget deliberately, automate the toil, and learn without blame.",
    },

    realWorld: `Two teams share a service. Product complains SRE blocks every launch; SRE complains product ships reckless code at 2am. Both are right, and both are miserable. They adopt the error-budget contract: 99.9% SLO, and a written policy that non-critical deploys freeze when the budget is exhausted. Suddenly the dynamic flips. When the budget is healthy, SRE stops arguing and lets risky launches through -- there's room to spend. When a bad week burns the budget, product *itself* pauses features to fix reliability, because the policy is objective and pre-agreed, not SRE playing gatekeeper. The fights end not because anyone became nicer, but because the decision moved from opinion to arithmetic. That is the entire value of SRE distilled into one mechanism.`,

    production: `- **Adopt SLOs and error budgets first** -- they are the highest-leverage SRE practice and unlock everything else.
- **Write the error-budget policy down** and get product sign-off *before* an incident forces the conversation.
- **Track toil explicitly** and protect engineering time to reduce it; if toil creeps past ~50%, that's a staffing/automation alarm.
- **Alert on symptoms/burn rate**, not raw internal metrics, to keep on-call sustainable.
- **Make postmortems blameless and mandatory** for significant incidents; track their action items to completion.
- **Automate releases and rollbacks** so shipping is boring and reversible.
- **Don't over-invest in reliability** past what users can perceive -- spend the saved effort on features or on reducing toil.`,

    commonMistakes: [
      "Chasing 100% reliability -- infinitely expensive and invisible to users.",
      "Defining SLOs but no error-budget policy, so nothing changes when the budget is blown.",
      "Renaming the ops team 'SRE' without adopting error budgets, toil caps, or blameless culture.",
      "Alerting on every internal cause (full disk, high CPU) instead of user-visible symptoms -- alert fatigue.",
      "Letting toil consume all of SRE's time, leaving no room to automate it away.",
      "Blaming individuals in postmortems, which makes people hide the real causes.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Higher SLO (more nines) | Fewer user-visible failures | ~10x cost per nine; slower shipping |
| Error-budget policy | Ends dev-vs-ops fights objectively | Requires product buy-in and discipline |
| Automating toil | Frees engineers, fewer errors | Upfront engineering investment |
| Blameless culture | Honest reporting, real fixes | Feels 'soft' to blame-oriented orgs |
| Symptom-based alerting | Sustainable on-call | Needs good SLIs and burn-rate setup |`,

    whenToUse: [
      "Any service with real users where reliability and velocity must be balanced deliberately.",
      "Organizations where dev and ops are in conflict over shipping vs stability.",
      "Systems scaling faster than you can add operators (automation and SLOs are the leverage).",
    ],
    whenNotToUse: [
      "Throwaway prototypes or internal tools with no reliability stakes -- the overhead isn't worth it.",
      "As a rebranding exercise -- adopting the title without the practices delivers nothing.",
      "Where leadership won't honor an error-budget policy; the mechanism only works if the freeze is real.",
    ],

    memoryCard: {
      problem: "End the structural war between shipping features and keeping systems reliable, at a scale where you can't just add operators.",
      mentalModel: "Engineer your operations like a product: measure reliability, budget for failure, automate the toil, and learn without blame.",
      keyConcepts: ["embrace risk (SLO < 100%)", "error budgets drive ship-vs-harden", "cap and automate toil (<=50%)", "blameless postmortems", "alert on symptoms/burn rate", "diminishing returns of nines"],
      productionConnection: "SLOs + a written error-budget policy, tracked toil, symptom-based alerting, and mandatory blameless postmortems with followed-up actions.",
      oneLiner: "SRE makes reliability a measured, budgeted, automated engineering property -- so shipping vs stability becomes arithmetic, not argument.",
    },

    quiz: [
      {
        id: "sre-q1",
        prompt: "What is the core mechanism SRE uses to resolve the dev-vs-ops conflict over shipping vs stability?",
        choices: [
          { text: "Giving ops veto power over all deploys", correct: false },
          { text: "The error budget: budget remaining means ship, budget exhausted means freeze and harden", correct: true },
          { text: "Requiring 100% uptime from every service", correct: false },
          { text: "Letting developers deploy without any review", correct: false },
        ],
        explanation: "The error budget converts an emotional argument into arithmetic: when budget remains, risky launches are fine; when it's exhausted, a pre-agreed policy freezes features to restore reliability. Both sides' incentives align.",
      },
      {
        id: "sre-q2",
        prompt: "Why does SRE cap toil (e.g. at 50% of time)?",
        choices: [
          { text: "To make engineers work fewer hours", correct: false },
          { text: "So there is always time to build the automation that reduces toil, preventing a downward spiral", correct: true },
          { text: "Because toil is illegal", correct: false },
          { text: "To increase the number of manual runbooks", correct: false },
        ],
        explanation: "If toil consumes all available time, engineers can never build the automation that eliminates it, and operations degrade as load grows. Capping toil forces the engineering investment that keeps the system scalable.",
      },
      {
        id: "sre-q3",
        prompt: "Why does SRE alert on user-visible symptoms rather than every internal cause?",
        choices: [
          { text: "Internal metrics are impossible to collect", correct: false },
          { text: "Symptom/burn-rate alerts tie pages to real user pain and avoid alert fatigue that kills on-call", correct: true },
          { text: "Causes never matter", correct: false },
          { text: "It removes the need for postmortems", correct: false },
        ],
        explanation: "A full disk or high CPU isn't an incident if users feel nothing. Paging on user-visible symptoms (via burn rate) keeps alerts meaningful and sustainable; the cause is diagnosed after the page, not paged on directly.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Introduce SRE practices to a team",
      brief: "A team ships fast but fights ops constantly and drowns in manual work. Lay out the first three SRE practices to adopt and how they interlock.",
      steps: `1. Define 1-3 user-facing SLIs and a defensible SLO for the critical journey; measure at the edge.\n2. Compute the error budget and write a policy: budget exhausted -> freeze non-critical deploys until recovered (get product sign-off now).\n3. Inventory recurring manual work (toil); pick the top item and schedule automation, protecting engineering time.\n4. Switch alerting to burn-rate/symptom-based to cut noise.\n5. Make postmortems blameless and mandatory for significant incidents, with tracked action items.\n6. Review SLOs and toil quarterly.`,
      successCriteria: [
        "SLOs + a written, product-agreed error-budget policy",
        "Toil identified and an automation plan with protected time",
        "Symptom/burn-rate alerting adopted",
        "Blameless postmortems with tracked follow-through",
      ],
    },
  },

  {
    slug: "incident-response",
    title: "Incident Response",
    track: "shared",
    phase: "sre",
    module: "sre-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "The structured practice of detecting, coordinating, and resolving outages fast -- roles, severity, comms, and the discipline of stopping the bleeding before finding the root cause.",
    prerequisites: ["sre-principles"],
    relatedConcepts: ["postmortems", "sre-principles", "slo-sli-error-budgets", "toil-automation"],
    tags: ["sre", "incident", "on-call", "mitigation", "coordination"],

    why: `When a system breaks at scale, the damage is measured in minutes and the chaos is measured in confused humans. Without structure, an outage becomes ten engineers all logged into production, changing things at once, no one talking to customers, and no one actually in charge. **Incident response exists to impose calm, roles, and coordination on chaos so you resolve outages quickly and safely instead of making them worse.**

The core, counterintuitive discipline is this: **your first job is to stop the bleeding, not to understand the wound.** Teams that hunt for root cause while users are down stay down longer. A good incident process gets a designated leader coordinating, mitigates fast (rollback, failover, feature-flag off), *then* investigates. It is the difference between a 10-minute incident and a 2-hour one.`,

    intuition: `Incident response is **an emergency room, not a research lab.**

- A patient arrives bleeding. You **stabilize first** (stop the bleeding, restore the airway) -- you do not run a full diagnostic workup while they're crashing. Mitigation before root cause.
- Someone is clearly **in charge** (the Incident Commander) -- they don't do the procedures themselves; they direct, decide, and keep order. Without one, everyone treats and no one coordinates.
- There is a **triage severity**: a stubbed toe and a heart attack get very different responses. Severity sets who wakes up and how fast.
- Someone updates the **waiting family** (customer comms / status page) so panic doesn't fill the vacuum.

The lab work -- *why* did the patient collapse -- happens *after* they are stable. That is the postmortem.`,

    howItWorks: `### The lifecycle
**Detect -> Triage -> Coordinate -> Mitigate -> Resolve -> Learn.**
Detection comes from alerting (ideally symptom/burn-rate based) or customer reports. The clock starts here.

### Roles (separate the work)
- **Incident Commander (IC):** owns the incident. Coordinates, decides, delegates -- does *not* dig into logs themselves. The single point of accountability.
- **Operations / Responders:** the hands-on engineers investigating and applying fixes, directed by the IC.
- **Communications lead:** updates stakeholders, customers, and the status page so the IC isn't distracted by "any news?" pings.
- **Scribe:** timestamps every action and decision (the raw material for the postmortem).

### Severity levels
SEV1 (major user-facing outage, all-hands) down to SEV3/4 (minor, business hours). Severity determines escalation speed and who is paged.

### The golden rule: mitigate before diagnose
Restore service by the fastest safe means -- **roll back the deploy, fail over, disable the feature flag, shed load** -- *then* investigate root cause. Users care that it works again, not why it broke.

### Communication cadence
Regular, timestamped updates (even "still investigating") on a single channel prevent the vacuum that breeds duplicate effort and panic.`,

    internals: `- **Mitigation and diagnosis are different jobs, often in conflict.** The urge to understand delays the fix. Mature responders explicitly say "we'll root-cause later; right now, roll back."
- **The most common effective mitigation is 'undo the last change.'** A huge fraction of incidents correlate with a recent deploy or config change; rolling back first is usually faster than reasoning forward.
- **One coordinator prevents collisions.** Multiple people changing production simultaneously during an incident cause secondary outages. The IC serializes risky actions.
- **A single source of truth (one channel/bridge)** stops the fragmentation where fixes and findings scatter across DMs and no one has the full picture.
- **Declaring an incident early is cheap; declaring late is expensive.** Under-triage ("it's probably fine") is a classic failure that turns a small blip into a major outage.
- **On-call health is an SRE concern:** sustainable rotations, reasonable page volume (enabled by good SLIs), and follow-the-sun handoffs keep responders effective. Alert fatigue causes missed real incidents.
- **The scribe's timeline is gold.** Reconstructing "what did we do and when" after the fact is error-prone; capturing it live makes the postmortem accurate and blameless.`,

    diagram: {
      title: "Incident response flow",
      layers: [
        { id: "detect", label: "Detect + declare", sub: "alert/report -> declare early, set severity" },
        { id: "roles", label: "Assign roles", sub: "IC, responders, comms, scribe" },
        { id: "mitigate", label: "Mitigate first", sub: "rollback / failover / flag-off -- stop the bleeding" },
        { id: "comms", label: "Communicate", sub: "timestamped updates on one channel + status page" },
        { id: "resolve", label: "Resolve -> handoff to postmortem", sub: "service restored, then root-cause later" },
      ],
      caption: "Declare early, one commander, mitigate before diagnose, communicate on one channel -- then learn.",
    },

    realWorld: `A deploy at 2:14pm causes checkout errors to spike. The on-call engineer sees the alert and immediately starts reading application logs trying to understand *why* the new code fails -- twenty minutes pass, checkout is still broken, revenue is bleeding, and three more engineers have joined and are also poking at production, one of whom restarts a service and makes it worse. No one is talking to support, who are fielding angry customers blind. Contrast the mature version: the engineer declares a SEV1, an Incident Commander takes over and says "the deploy at 2:14 correlates -- roll it back now, investigate after," comms posts to the status page, and checkout is healthy by 2:22. Same bug, same team; the difference is entirely process. Mitigate first, coordinate under one leader, communicate -- and the incident is eight minutes instead of two hours.`,

    production: `- **Define severity levels and an on-call rotation** with clear escalation paths before you need them.
- **Assign an Incident Commander for anything non-trivial** -- the IC coordinates and decides, and does not personally debug.
- **Mitigate before you diagnose:** make rollback, failover, and feature-flag kill-switches fast and rehearsed.
- **Keep one source of truth** (a dedicated incident channel/bridge) and post timestamped updates on a cadence, even when there's no news.
- **Maintain a public/internal status page** and a comms lead so the IC stays focused.
- **Have a scribe capture the timeline live** for an accurate, blameless postmortem.
- **Declare early** -- under-triage is more dangerous than a false alarm.
- **Run incident drills / game days** so roles are muscle memory, not improvised at 2am.
- **Protect on-call health**: sustainable page volume (good SLIs), fair rotations, and handoffs.`,

    commonMistakes: [
      "Hunting for root cause while users are down instead of mitigating first (rollback/failover/flag-off).",
      "No designated Incident Commander -- everyone acts, no one coordinates.",
      "The IC diving into logs themselves and losing the coordination view.",
      "Multiple people changing production at once, causing secondary outages.",
      "Under-triaging ('probably fine') and declaring the incident too late.",
      "No customer/stakeholder communication, so a vacuum fills with panic and duplicate effort.",
      "No live timeline, making the postmortem inaccurate and defensive.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Mitigate first | Fastest recovery, less user pain | You may not yet know the cause |
| Root-cause first | Deeper immediate understanding | Prolongs the outage |
| Dedicated IC (not debugging) | Clear coordination | Uses a person 'just' to coordinate |
| Declare early | Contains blast radius | Occasional false alarm |
| Frequent comms updates | Reduces panic, aligns effort | Small overhead during the fire |
| Formal process | Consistent, fast response | Feels heavy for tiny incidents |`,

    whenToUse: [
      "Any user-facing outage or degradation above the smallest severity.",
      "Multi-team or ambiguous incidents where coordination is the bottleneck.",
      "Rehearsing (game days) so the process is reflexive before a real SEV1.",
    ],
    whenNotToUse: [
      "Trivial, single-owner issues with no user impact -- full IC ceremony is overkill (use a lightweight path).",
      "As a substitute for fixing the underlying reliability problems that keep causing incidents.",
      "To assign blame -- that corrupts the honest reporting the process depends on.",
    ],

    code: [
      {
        label: "Incident runbook: first 10 minutes (checklist)",
        language: "markdown",
        code: `## SEV1/SEV2 -- First 10 minutes

1. DECLARE. Open #incident-<date>, set severity, page the IC.
2. ASSIGN roles: IC (coordinates), Ops (fixes), Comms (updates), Scribe (timeline).
3. STABILIZE first -- ask "what changed recently?"
   - [ ] Recent deploy?  -> roll it back
   - [ ] Recent config/flag change? -> revert / kill the flag
   - [ ] Regional/AZ issue? -> fail over
   - [ ] Overload? -> shed load / scale out
4. COMMUNICATE: post status-page update + first internal update (timestamped).
5. Do NOT root-cause yet. Confirm the SLI recovers.
6. Only ONE person changes prod at a time, announced by the IC.
7. Post updates every ~15 min until resolved, even if "still investigating".
8. On recovery: schedule the blameless postmortem; hand the scribe timeline over.`,
      },
      {
        label: "Fast mitigation: automated rollback to previous release",
        language: "bash",
        code: `# Stop the bleeding: revert to the last known-good deployment.
# (Kubernetes example -- undo the rollout, then verify the SLI recovers.)

kubectl rollout undo deployment/checkout-api
kubectl rollout status deployment/checkout-api --timeout=120s

# Watch the user-facing error rate drop before declaring mitigated.
echo "Rolled back. Confirm checkout error-rate SLI recovers before root-causing."`,
      },
    ],

    memoryCard: {
      problem: "Resolve outages fast and safely by imposing coordination, roles, and communication on chaos.",
      mentalModel: "An emergency room: stabilize the patient before diagnosing, one person clearly in charge, triage by severity, keep the family informed.",
      keyConcepts: ["detect -> triage -> mitigate -> resolve -> learn", "Incident Commander coordinates (doesn't debug)", "mitigate before diagnose (rollback/failover/flag-off)", "severity levels", "one source of truth + timestamped comms", "live scribe timeline"],
      productionConnection: "Defined severities and on-call, a designated IC, rehearsed rollback/failover, a single incident channel + status page, and a live timeline feeding a blameless postmortem.",
      oneLiner: "Incident response is an ER: one commander, stop the bleeding before diagnosing, communicate on one channel -- then postmortem the cause.",
    },

    quiz: [
      {
        id: "ir-q1",
        prompt: "During a live outage, what should responders prioritize first?",
        choices: [
          { text: "Finding the exact root cause before doing anything", correct: false },
          { text: "Mitigating to restore service (rollback/failover/flag-off), then diagnosing", correct: true },
          { text: "Writing the postmortem", correct: false },
          { text: "Letting each engineer independently change production", correct: false },
        ],
        explanation: "The golden rule is mitigate before diagnose. Restoring service by the fastest safe means (often rolling back the last change) reduces user impact; root-cause analysis happens afterward in the postmortem.",
      },
      {
        id: "ir-q2",
        prompt: "What is the Incident Commander's primary job?",
        choices: [
          { text: "To personally debug and apply all the fixes", correct: false },
          { text: "To coordinate the response, make decisions, and delegate -- not to dig into logs themselves", correct: true },
          { text: "To write the code that caused the incident", correct: false },
          { text: "To assign blame to the responsible engineer", correct: false },
        ],
        explanation: "The IC is the single point of coordination and accountability. If the IC gets absorbed in debugging, no one is coordinating -- so they direct responders, decide on mitigations, and keep order instead of doing hands-on fixes.",
      },
      {
        id: "ir-q3",
        prompt: "Why is declaring an incident early better than waiting to be sure?",
        choices: [
          { text: "It looks more professional", correct: false },
          { text: "Under-triage lets a small blip grow into a major outage; declaring early is cheap and contains blast radius", correct: true },
          { text: "It avoids the need to ever mitigate", correct: false },
          { text: "It automatically fixes the bug", correct: false },
        ],
        explanation: "Waiting for certainty ('probably fine') is a classic failure that lets incidents grow. Declaring early costs little (an occasional false alarm) but ensures coordination and mitigation start before the damage spreads.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Run a mock SEV1",
      brief: "Given a checkout outage that began right after a 2:14pm deploy, walk through the first 15 minutes of a well-run incident.",
      steps: `1. Declare a SEV1, open a single incident channel, and page the IC.\n2. Assign roles: IC (coordinate), Ops (fix), Comms (status page + updates), Scribe (timeline).\n3. Correlate with recent changes -> roll back the 2:14pm deploy immediately (mitigate before diagnose).\n4. Post a status-page update and a first timestamped internal update.\n5. Confirm the checkout error-rate SLI recovers; only one person touches prod, announced by the IC.\n6. Continue ~15-min updates until resolved, then declare mitigated.\n7. Schedule a blameless postmortem and hand over the scribe's timeline.`,
      successCriteria: [
        "Incident declared early with severity and roles assigned",
        "Mitigated by rollback before root-causing",
        "Communicated on one channel with timestamped updates + status page",
        "Live timeline captured and postmortem scheduled",
      ],
    },
  },

  {
    slug: "postmortems",
    title: "Blameless Postmortems",
    track: "shared",
    phase: "sre",
    module: "sre-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Turning incidents into durable learning -- a written, blameless analysis that finds systemic causes and produces tracked fixes, so the same failure doesn't recur.",
    prerequisites: ["incident-response"],
    relatedConcepts: ["incident-response", "sre-principles", "toil-automation"],
    tags: ["sre", "postmortem", "blameless", "learning", "root-cause"],

    why: `An incident you don't learn from is an incident you will have again. But the natural human response to failure -- find who to blame -- actively destroys learning: blamed people hide information, defend themselves, and the real systemic causes stay invisible. **Blameless postmortems exist to convert failures into permanent organizational learning by making it safe to tell the whole truth.**

The premise is that good engineers make mistakes inside systems that *allowed* those mistakes to cause harm. The interesting, fixable question is never "why did Alice run the wrong command" but "why did the system let a single wrong command take down production, and why wasn't it caught?" A postmortem that fixes the system prevents a whole class of future incidents; one that blames a person prevents nothing.`,

    intuition: `A blameless postmortem is **an aviation crash investigation, not a courtroom trial.**

- Air-crash investigators assume the pilot was competent and trying their best. They ask **what in the system -- the instruments, the procedures, the training, the alarms -- allowed a normal human error to become a disaster.** They do not put the pilot on trial.
- Because investigators aren't hunting for someone to punish, everyone talks openly, and aviation gets *safer every year*.
- The output isn't "the pilot was bad"; it's "add a warning when the aircraft descends below X, change this checklist, retrain on this failure mode." **Systemic fixes, tracked to completion.**
- Imagine instead if every crash ended with firing the pilot: pilots would hide mistakes, and planes would keep falling for the same reasons. That is a blameful postmortem.`,

    howItWorks: `### What a postmortem contains
- **Summary:** what happened, user impact, duration, severity.
- **Timeline:** timestamped sequence (built from the incident scribe's notes) -- detection, actions, mitigation, resolution.
- **Impact:** who/what was affected, how much (requests failed, revenue, SLO budget burned).
- **Root cause(s):** the systemic contributing factors -- usually several, not one.
- **What went well / what went poorly / where we got lucky.**
- **Action items:** concrete, *owned*, and *tracked* fixes with due dates.

### Blameless means systemic
Language shifts from "who" to "what and why." Not "the engineer deployed bad config" but "a config change with no validation reached production and no canary caught it." You assume good intent and competence, then interrogate the system.

### Root cause is rarely singular
Use techniques like the **5 Whys** or contributing-factor analysis. A deploy broke prod because: it had a bug, *because* the test suite missed it, *because* the case wasn't covered, *because* there was no canary, *because* rollback was manual and slow. Each "because" is a fixable lever.

### Action items are the whole point
A postmortem with no tracked, owned, completed actions is theater. The value is the change it produces.`,

    internals: `- **Blamelessness is a design choice for honesty, not niceness.** Its purpose is to get the *accurate* story; fear produces edited stories, and you can't fix what you can't see. It is pragmatic, not soft.
- **Hindsight bias is the enemy.** After the fact, the cause looks obvious ("they should have known"). The discipline is to reconstruct what was *reasonable to know at the time* with the information and signals then available.
- **Second stories:** beyond the immediate trigger, ask what systemic conditions made the trigger possible -- the 'second story' is where the durable fixes live.
- **Not every incident needs one, but every significant one does.** Triggering criteria (SLO breach, user-visible outage, data loss, near-miss) keep it consistent without drowning the team.
- **Near-misses are free lessons.** The best orgs postmortem incidents that *almost* happened, learning without the damage.
- **Action-item follow-through is where most orgs fail.** Items get written and never done; tracking them like any other prioritized work (with owners and due dates) is what separates learning orgs from repeat-offenders.
- **Culture must be protected from above.** If leadership punishes people named in postmortems even once, the blameless contract collapses and everyone reverts to CYA.`,

    diagram: {
      title: "From incident to durable learning",
      layers: [
        { id: "timeline", label: "Timeline + impact", sub: "from the scribe: what happened, how bad" },
        { id: "why", label: "Systemic root causes", sub: "5 Whys / contributing factors, not a person" },
        { id: "reflect", label: "Went well / poorly / lucky", sub: "honest, blameless reflection" },
        { id: "actions", label: "Owned action items", sub: "concrete fixes with owners + due dates" },
        { id: "track", label: "Track to completion", sub: "prevent recurrence -- the whole point" },
      ],
      caption: "Assume competence, find systemic causes, and produce owned, tracked fixes -- learning, not blame.",
    },

    realWorld: `An engineer runs a database migration that locks a critical table and takes checkout down for 30 minutes. The blameful path: "the engineer was careless, add a rule that they get a warning." Nothing structural changes, and three months later a *different* engineer does the same thing. The blameless path asks why the *system* allowed it: migrations run directly against production with no review gate (fix: require migration review), there was no way to test the lock behavior on prod-scale data first (fix: a staging clone), the migration wasn't run in a transaction with a lock timeout (fix: enforce lock_timeout in the migration tooling), and rollback required manual intervention (fix: automated rollback). Four tracked action items later, that *entire class* of incident is prevented -- for everyone, not just the one engineer who happened to trip the wire first. The person was never the problem; the missing guardrails were.`,

    production: `- **Make postmortems blameless and mandatory** for incidents above a defined threshold (SLO breach, user impact, data loss, notable near-miss).
- **Write from the scribe's live timeline** so the record is accurate and defensible.
- **Interrogate the system, not the person** -- use 5 Whys / contributing-factor analysis to find multiple systemic causes.
- **Produce concrete, owned action items with due dates**, and track them like real prioritized work until done.
- **Guard against hindsight bias** -- judge decisions by what was knowable at the time.
- **Share postmortems widely** so other teams learn from failures they didn't experience.
- **Postmortem near-misses too** -- free lessons without the damage.
- **Protect the blameless culture from leadership** -- one public punishment and honest reporting dies.`,

    commonMistakes: [
      "Blaming an individual, which makes people hide the real causes.",
      "Stopping at the first 'root cause' instead of finding the multiple systemic contributors.",
      "Writing action items that no one owns and no one tracks -- postmortem theater.",
      "Judging past decisions with hindsight ('it was obvious') instead of what was knowable then.",
      "Only doing postmortems for huge incidents, missing cheap near-miss lessons.",
      "Treating the document as the deliverable rather than the prevented recurrence.",
      "Leadership punishing named individuals, collapsing the blameless contract.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Blameless | Honest data, systemic fixes | Feels like 'no accountability' to some |
| Blameful | Emotionally satisfying | Hides causes; incidents recur |
| Deep multi-cause analysis | Fixes whole failure classes | Takes real time to do well |
| Postmortem everything | Maximum learning | Team drowns in write-ups |
| Threshold-based | Sustainable, consistent | Some small lessons missed |
| Tracked action items | Actually prevents recurrence | Requires ongoing prioritization |`,

    whenToUse: [
      "Any significant incident: SLO breach, user-visible outage, data loss.",
      "Notable near-misses, to learn without the damage.",
      "Recurring low-grade issues where a pattern points at a systemic gap.",
    ],
    whenNotToUse: [
      "Trivial, no-impact blips (a threshold keeps this sane).",
      "As a disciplinary tool -- that destroys the honesty the process depends on.",
      "As a box-ticking document with no tracked follow-through (that's pure overhead).",
    ],

    code: [
      {
        label: "Postmortem template (markdown)",
        language: "markdown",
        code: `# Postmortem: <short title>   (SEV<n>, <date>)

## Summary
One paragraph: what broke, user impact, duration.

## Impact
Requests failed, users affected, revenue, error-budget burned.

## Timeline (all times UTC)
- 14:14  Deploy X shipped
- 14:16  Checkout error rate crosses SLO burn threshold (alert)
- 14:18  Incident declared, IC assigned
- 14:22  Rolled back deploy X -- error rate recovering
- 14:25  Mitigated; service healthy

## Root cause(s) -- systemic, not a person
Config change reached prod with no validation; no canary caught it;
rollback was manual (slow). (5 Whys -> multiple contributing factors.)

## What went well / poorly / where we got lucky

## Action items (owned + tracked)
- [ ] Add schema validation gate to deploy pipeline  -- @owner  -- due <date>
- [ ] Add automated canary + auto-rollback           -- @owner  -- due <date>
- [ ] Make rollback one command                      -- @owner  -- due <date>`,
      },
      {
        label: "5 Whys, applied",
        language: "text",
        code: `Problem: Checkout was down for 8 minutes.
1. Why? A deploy shipped broken config.
2. Why did broken config ship? No validation step in the pipeline.
3. Why was there no validation? It was never added; config was 'trusted'.
4. Why wasn't it caught after deploy? No canary stage compared error rates.
5. Why was recovery slow? Rollback was a manual, multi-step process.

=> Fixes: pipeline validation, canary + auto-rollback, one-command rollback.
Note: not one of these five is "the engineer was careless."`,
      },
    ],

    memoryCard: {
      problem: "Turn incidents into durable learning that prevents recurrence, without the blame that makes people hide the truth.",
      mentalModel: "An aviation crash investigation, not a courtroom: assume competence, find what the system allowed, and fix that -- so it never happens again.",
      keyConcepts: ["blameless = honest data, not niceness", "systemic root causes (5 Whys / contributing factors)", "guard against hindsight bias", "owned + tracked action items", "postmortem near-misses too", "share widely"],
      productionConnection: "Mandatory blameless postmortems above a threshold, built from the live timeline, producing owned action items tracked to completion, protected by leadership.",
      oneLiner: "A blameless postmortem finds what the system allowed (not who erred) and produces tracked fixes -- so the same failure can't recur.",
    },

    quiz: [
      {
        id: "pm-q1",
        prompt: "Why are postmortems made blameless?",
        choices: [
          { text: "To be nice to engineers and avoid hurt feelings", correct: false },
          { text: "So people report the full, accurate truth, exposing the systemic causes you can actually fix", correct: true },
          { text: "So no one is ever held accountable for anything", correct: false },
          { text: "To make the document shorter", correct: false },
        ],
        explanation: "Blamelessness is a pragmatic choice for honesty: fear produces edited stories. Removing blame lets people tell the whole truth, which surfaces the systemic causes -- the only things you can durably fix.",
      },
      {
        id: "pm-q2",
        prompt: "An engineer ran a command that took down prod. What is the correct blameless framing?",
        choices: [
          { text: "The engineer was careless and should be warned", correct: false },
          { text: "Why did the system allow one command to take down prod, and why wasn't it caught?", correct: true },
          { text: "Remove the engineer's production access permanently", correct: false },
          { text: "No analysis is needed; it was human error", correct: false },
        ],
        explanation: "The fixable question is systemic: what guardrails were missing that let a normal human error cause harm (no review gate, no lock timeout, no automated rollback)? Fixing those prevents the whole class of incident for everyone.",
      },
      {
        id: "pm-q3",
        prompt: "What most distinguishes a valuable postmortem from postmortem theater?",
        choices: [
          { text: "Its length and formatting", correct: false },
          { text: "Concrete, owned action items that are tracked to completion and prevent recurrence", correct: true },
          { text: "Naming the responsible individual", correct: false },
          { text: "Being written within an hour", correct: false },
        ],
        explanation: "The document is not the deliverable -- the prevented recurrence is. Owned, tracked action items that actually get done are what turn an incident into durable improvement rather than a filed report.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Write a blameless postmortem",
      brief: "A migration locked a table and took checkout down for 30 minutes. Produce a blameless postmortem that fixes the class of problem.",
      steps: `1. Fill summary, impact (requests failed, budget burned), and the timeline from the scribe's notes.\n2. Run 5 Whys to surface multiple systemic causes -- avoid naming the engineer; interrogate the system.\n3. Record what went well, what went poorly, and where you got lucky.\n4. Write concrete action items (migration review gate, staging clone for prod-scale testing, enforced lock_timeout, automated rollback), each with an owner and due date.\n5. Check for hindsight bias -- judge decisions by what was knowable at the time.\n6. Track the action items like prioritized work until done; share the doc widely.`,
      successCriteria: [
        "Systemic root causes (no individual blamed)",
        "Multiple contributing factors via 5 Whys",
        "Owned, tracked action items with due dates",
        "Guards against hindsight bias and is shared for learning",
      ],
    },
  },

  {
    slug: "toil-automation",
    title: "Toil & Automation",
    track: "shared",
    phase: "sre",
    module: "sre-core",
    difficulty: "core",
    estMinutes: 22,
    summary:
      "Identifying and eliminating the manual, repetitive operational work that scales with load -- why toil is a tax on reliability, and how to automate it away without over-engineering.",
    prerequisites: ["sre-principles"],
    relatedConcepts: ["sre-principles", "incident-response", "capacity-planning"],
    tags: ["sre", "toil", "automation", "efficiency", "operations"],

    why: `Some operational work makes your system better forever (building automation, improving architecture). Other work just keeps the lights on today and must be redone tomorrow -- restarting a stuck service, manually provisioning an account, hand-running a report. **The second kind is toil, and it is the silent killer of engineering teams because it grows linearly with your system's scale while producing no lasting value.**

If handling twice the traffic requires twice the manual interventions, you have a toil problem that will eventually consume all your people. SRE names toil explicitly and caps it so that engineers spend their time *building leverage* (automation that scales sub-linearly) instead of *being the leverage* (humans doing the same task forever). Eliminating toil is how a small team operates a huge system.`,

    intuition: `Toil is **bailing water out of a leaky boat by hand.**

- Every bucket you empty feels productive -- the boat stays afloat *right now*. But the water keeps coming, you can never stop, and if the leak gets worse (more scale) you need more people bailing.
- **Fixing the leak (automation) is the real engineering.** It's harder up front and doesn't feel as urgent as bailing, but afterward you never bail again.
- The trap: you're so busy bailing you never have time to fix the leak -- which is exactly why SRE *caps* bailing (the 50% toil budget) to force the fix.
- Not all manual work is toil: rescuing someone overboard once is a judgment call, not repetitive bailing. Toil is specifically the **repetitive, automatable, no-lasting-value** work.`,

    howItWorks: `### What counts as toil
Work is toil when it is:
- **Manual** -- a human runs it.
- **Repetitive** -- done over and over, not a one-off.
- **Automatable** -- a machine could do it (this is key: genuine judgment work isn't toil).
- **Reactive / interrupt-driven** -- responding to tickets and pages, not proactive.
- **Scales with load** -- grows as the service grows (the dangerous property).
- **No enduring value** -- the system is no better afterward than before.

Classic examples: manually restarting services, provisioning access by hand, applying the same config repeatedly, hand-generating routine reports, ticket-driven quota bumps.

### The toil budget
SRE caps toil (Google's guideline: **<=50% of an SRE's time**). The rest must go to engineering -- the automation and design work that *reduces* toil. This is a deliberate control loop against the death spiral where toil consumes everything.

### The automation ladder
1. **Document** the manual steps (a runbook).
2. **Script** the runbook (semi-automated).
3. **Self-service** it (others can run it without you).
4. **Fully automate** (no human in the loop; it just handles itself).
Move work up the ladder as its frequency and cost justify the investment.`,

    internals: `- **Toil is measured by its scaling property, not its unpleasantness.** A boring task done once is not toil; a task that must be repeated every time load grows is. The linear-with-scale property is what makes it existential.
- **The toil death spiral:** toil consumes time -> no time to automate -> more scale -> more toil -> ... The 50% cap exists precisely to break this loop before it starts.
- **Automate the frequent and the dangerous first.** Prioritize by frequency x cost x risk. A rare, low-risk task may be *cheaper to keep manual* than to automate -- automation itself has a cost and a maintenance burden.
- **Don't over-automate (the XKCD trap).** If automating a task takes longer than you'll ever spend doing it manually, it is net-negative. Estimate the payback period honestly.
- **Automation must be at least as safe as the human.** A script that does the wrong thing at machine speed is worse than a careful human; build in checks, dry-runs, and guardrails. Automated actions during incidents especially need safety rails.
- **Self-service is often the highest-leverage rung** -- turning "file a ticket, wait for an SRE" into "click a button" removes both the toil *and* the queue latency, and scales to everyone.
- **Track toil like a metric.** What isn't measured drifts; surveying where on-call and SRE time actually goes reveals the biggest automation wins.`,

    diagram: {
      title: "The toil elimination ladder",
      layers: [
        { id: "identify", label: "Identify toil", sub: "manual + repetitive + automatable + scales with load" },
        { id: "document", label: "Document (runbook)", sub: "capture the steps first" },
        { id: "script", label: "Script it", sub: "semi-automate the runbook" },
        { id: "selfservice", label: "Self-service", sub: "others run it without you -- kills the queue too" },
        { id: "automate", label: "Fully automate", sub: "no human in the loop; safe guardrails" },
      ],
      caption: "Move work up the ladder by frequency x cost x risk -- but don't automate what's cheaper to leave manual.",
    },

    realWorld: `An SRE team spends roughly two hours every day manually approving and provisioning developer access requests -- reading the ticket, checking the justification, creating the IAM role binding, closing the ticket. It never gets better; as the company hires, the requests grow, and soon it's half the team's day. That is textbook toil: manual, repetitive, automatable, reactive, scales with headcount, no lasting value. The fix isn't 'work faster' -- it's to climb the ladder: first script the provisioning, then build a **self-service** portal where a developer requests access, their manager approves in one click, and the role is granted automatically with an audit trail and an expiry. The two-hours-a-day disappears entirely, the developers get access in minutes instead of hours, and the SREs get their afternoons back to do actual engineering. One automation investment paid off for every future request. That is the whole economic case for attacking toil.`,

    production: `- **Measure where operational time actually goes** -- survey on-call/SRE time to find the biggest toil sinks.
- **Cap toil (aim <=50%)** and protect the remaining engineering time; rising toil is a staffing/automation alarm.
- **Prioritize automation by frequency x cost x risk** -- attack the frequent and the dangerous first.
- **Climb the ladder:** document -> script -> self-service -> fully automate; don't jump straight to full automation for rare tasks.
- **Prefer self-service** for cross-team requests -- it removes the toil and the queue latency at once.
- **Build guardrails into automation** (dry-run, validation, safe defaults, human confirm for destructive actions); machine-speed mistakes are worse than human ones.
- **Estimate payback before automating** -- if it costs more than it saves, leave it manual.
- **Maintain your automation** -- it is code with its own reliability; unmaintained scripts become their own incidents.`,

    commonMistakes: [
      "Treating toil as 'just the job' and never measuring or capping it -- the death spiral.",
      "Being too busy doing toil to ever build the automation that eliminates it.",
      "Over-automating rare tasks where the automation costs more than it saves.",
      "Building automation with no guardrails, so it does the wrong thing at machine speed.",
      "Automating without measuring, so you attack low-value toil and miss the big sinks.",
      "Full-automating straight away instead of the cheaper self-service rung.",
      "Letting automation rot -- unmaintained scripts become new sources of incidents.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Automate now | Eliminates recurring toil | Upfront engineering time + maintenance |
| Keep it manual | No build cost | Toil recurs and scales with load |
| Self-service | Removes toil AND queue latency | More design/UX effort up front |
| Full automation | No human in the loop | Needs strong guardrails; higher build cost |
| 50% toil cap | Forces engineering investment | Feels like 'not enough hands' short-term |
| Document only (runbook) | Cheap, immediate | Still manual; only a first rung |`,

    whenToUse: [
      "Any manual task that is repetitive, automatable, and scales with load.",
      "Cross-team request queues (access, quota, provisioning) -- prime self-service targets.",
      "Frequent or dangerous operations where automation cuts both time and risk.",
    ],
    whenNotToUse: [
      "Rare, one-off tasks where automation costs more than it will ever save.",
      "Genuine judgment/engineering work -- that isn't toil and shouldn't be blindly scripted.",
      "Destructive operations without adequate guardrails -- don't automate a foot-gun.",
    ],

    code: [
      {
        label: "Is it worth automating? (payback heuristic)",
        language: "text",
        code: `Automate when:  (time_per_run  x  runs_per_year)  >  (build_time + yearly_maintenance)

Example -- manual access provisioning:
  time_per_run       = 10 min
  runs_per_year      = 1500  (grows with hiring)
  manual cost/year   = 250 hours

  build self-service = 80 hours
  maintenance/year   = 20 hours

  => pays for itself in weeks, and the savings GROW as the company scales.

Counter-example -- a task done twice a year taking 5 min:
  manual cost/year   = 10 min  -> automating (hours of work) is net-negative. Leave it.`,
      },
      {
        label: "First rung: script a repetitive runbook step (with a dry-run guardrail)",
        language: "bash",
        code: `#!/usr/bin/env bash
# grant-readonly.sh -- semi-automate a repetitive access grant.
# Guardrail: default to dry-run; require --apply to actually change anything.
set -euo pipefail

user="$1"; bucket="$2"; apply="\${3:-}"

policy_arn="arn:aws:iam::123456789012:policy/readonly-\${bucket}"

if [ "$apply" != "--apply" ]; then
  echo "[DRY-RUN] would attach $policy_arn to $user (pass --apply to execute)"
  exit 0
fi

aws iam attach-user-policy --user-name "$user" --policy-arn "$policy_arn"
echo "Granted read-only on \${bucket} to \${user}"`,
      },
    ],

    memoryCard: {
      problem: "Stop manual, repetitive operational work from consuming the team as the system scales.",
      mentalModel: "Bailing water from a leaky boat: emptying buckets keeps you afloat now, but fixing the leak (automation) is the real work -- so cap the bailing to force the fix.",
      keyConcepts: ["toil = manual + repetitive + automatable + reactive + scales with load + no lasting value", "toil budget (<=50%)", "the toil death spiral", "automation ladder: document -> script -> self-service -> automate", "prioritize by frequency x cost x risk", "don't over-automate"],
      productionConnection: "Measure toil, cap it, attack the frequent/dangerous first via self-service and automation with guardrails, and check payback before building.",
      oneLiner: "Toil is manual work that scales with load and never gets better -- cap it, then climb the automation ladder to eliminate it (but only when it pays off).",
    },

    quiz: [
      {
        id: "toil-q1",
        prompt: "Which property makes toil especially dangerous?",
        choices: [
          { text: "It is unpleasant to do", correct: false },
          { text: "It scales linearly with load, so growth requires ever more manual work", correct: true },
          { text: "It only happens at night", correct: false },
          { text: "It requires deep judgment", correct: false },
        ],
        explanation: "Toil is defined by scaling with load: if twice the traffic means twice the manual interventions, it eventually consumes the whole team. Unpleasantness isn't the criterion, and judgment work is explicitly NOT toil.",
      },
      {
        id: "toil-q2",
        prompt: "Why does SRE cap toil at roughly 50% of time?",
        choices: [
          { text: "To limit working hours", correct: false },
          { text: "To guarantee time exists to build the automation that reduces toil, breaking the death spiral", correct: true },
          { text: "Because automation is always bad", correct: false },
          { text: "To increase the number of manual tickets", correct: false },
        ],
        explanation: "Without a cap, toil consumes all time, leaving none to automate it away, so it grows forever as load grows -- the death spiral. The 50% cap forces the engineering investment that keeps the system operable by a small team.",
      },
      {
        id: "toil-q3",
        prompt: "When is it correct to NOT automate a manual task?",
        choices: [
          { text: "Never -- always automate everything", correct: false },
          { text: "When the automation costs more to build and maintain than the task will ever cost done manually", correct: true },
          { text: "When the task is dangerous", correct: false },
          { text: "When many teams need it", correct: false },
        ],
        explanation: "Automation has a build and maintenance cost. For rare, cheap tasks, that cost can exceed the manual effort you'd ever spend -- automating is then net-negative. Estimate the payback before building.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Attack the biggest toil sink",
      brief: "Your SRE team spends ~2 hours/day manually provisioning developer access. Design the elimination plan without over-engineering.",
      steps: `1. Confirm it's toil: manual, repetitive, automatable, reactive, scales with hiring, no lasting value -- yes.\n2. Estimate payback: manual cost/year vs build + maintenance; confirm it clears the bar.\n3. Climb the ladder: document the steps -> script the provisioning (with a dry-run guardrail) -> build a self-service request+approve flow.\n4. Add guardrails: manager approval, least-privilege policy, audit log, and automatic expiry.\n5. Protect engineering time under the toil cap to actually build it.\n6. Measure the toil reduction afterward and pick the next biggest sink.`,
      successCriteria: [
        "Correctly classified as toil and payback justified",
        "Climbs the automation ladder to self-service (not just a one-off script)",
        "Guardrails: approval, least privilege, audit, expiry",
        "Toil measured before and after; next target identified",
      ],
    },
  },

  {
    slug: "capacity-planning",
    title: "Capacity Planning",
    track: "shared",
    phase: "sre",
    module: "sre-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "Ensuring you have enough resources to meet demand at your SLO -- forecasting growth, load testing to find real limits, planning for N-1 headroom, and balancing cost against the risk of running out.",
    prerequisites: ["sre-principles", "slo-sli-error-budgets"],
    relatedConcepts: ["sre-principles", "slo-sli-error-budgets", "toil-automation", "load-balancing"],
    tags: ["sre", "capacity", "scaling", "forecasting", "headroom"],

    why: `A system that is fast at 3am can fall over at the 8am peak, on Black Friday, or the moment a marketing campaign lands -- not because the code got worse, but because demand outgrew capacity. **Capacity planning exists to make sure you have enough resources to serve demand at your target reliability (SLO), before demand arrives, without wasting money on idle over-provisioning.**

It sits on a knife's edge between two failures: too little capacity and you have an outage at the worst possible moment (peak traffic); too much and you burn money on servers doing nothing. Good capacity planning turns "will we survive the launch?" from a nervous guess into a data-backed answer, and it is one of the clearest places where reliability and cost trade directly against each other.`,

    intuition: `Capacity planning is **stocking a store for the holiday rush.**

- You don't stock for a *quiet Tuesday* -- you'd sell out and turn customers away on the busiest day. You stock for your **peak**, plus a buffer.
- You **forecast** demand from past seasons and known events (a big sale, a new product), not from today's average.
- You keep a **safety margin** so that if one supplier fails (an AZ goes down), you can still serve everyone -- that's N-1 planning.
- But you don't stock *infinitely* -- unsold inventory is money frozen on shelves (idle servers). You balance the cost of stock against the cost of running out.
- And you actually **test the checkout lanes under simulated rush** (load testing) rather than assuming they'll cope -- because the real limit is rarely where you guessed.`,

    howItWorks: `### The inputs
- **Demand forecast:** projected load from historical trends + seasonality + known events (launches, sales, marketing). Plan for the *peak*, not the average.
- **Per-unit capacity:** how much load one instance/pod/shard can actually serve *while still meeting the SLO* -- discovered by **load testing**, not by guessing from CPU.
- **The SLO target:** capacity is defined as "enough to meet demand *at the SLO*." Serving requests slowly is still failing.

### Finding real limits (load testing)
Ramp synthetic load until the SLI degrades (latency climbs, errors appear). That inflection point -- not 100% CPU -- is your real per-unit ceiling. The bottleneck is often a connection pool, a lock, or a downstream dependency, not raw CPU.

### Headroom and N-1
Never plan to run at 100%. Keep headroom for:
- **Spikes** above forecast.
- **Failure (N-1 / N-2):** if one node/AZ dies, the survivors absorb its load. If you run at 80% and lose a third of capacity, the rest saturate and cascade. Plan so that *after* a failure you're still under the safe threshold.

### Provisioning strategy
- **Autoscaling** handles predictable, gradual variation -- but it has lag (boot time) and its own ceilings.
- **Pre-provisioning** covers known spikes autoscaling can't react to fast enough (a flash sale at a known minute).
- **Quotas and limits** (cloud service limits, DB connections) are hidden ceilings that cause outages even when your own capacity math is fine.`,

    internals: `- **The real limit is where the SLI breaks, not where CPU hits 100%.** A service can hold SLO at 90% CPU or fall over at 60% because a downstream dependency or lock saturates first. Load-test to find the true knee.
- **Autoscaling has lag.** Instances take time to boot and warm up; a sharp spike can breach SLO before new capacity arrives. For known spikes, pre-scale; for gradual growth, autoscale.
- **N-1 is non-negotiable for HA.** Running near capacity means a single failure cascades: the dead node's load lands on survivors instantly (thundering herd), pushing them over, which fails more nodes. Headroom absorbs the redistribution.
- **Hidden ceilings bite hardest:** cloud account limits (e.g. max instances, IP addresses), database max connections, NAT gateway throughput, third-party API rate limits. Your compute can be fine while a quota you forgot about causes the outage.
- **Bottlenecks move.** Fix the CPU limit and the next request reveals the database is now the ceiling. Capacity is a whole-system property; plan the critical path end to end.
- **Little's Law and queueing intuition:** as utilization approaches 100%, latency doesn't rise linearly -- it explodes. This is *why* you keep headroom; the last 10-20% of utilization costs enormous latency.
- **Cost vs risk is the core trade.** More headroom = more resilience and more idle spend. The right amount is set by how bad running out is (revenue at peak) versus the cost of the buffer -- often expressed via the SLO/error budget.`,

    diagram: {
      title: "Capacity planning inputs and headroom",
      layers: [
        { id: "forecast", label: "Forecast peak demand", sub: "trend + seasonality + known events" },
        { id: "loadtest", label: "Load test per-unit limit", sub: "where the SLI breaks, not 100% CPU" },
        { id: "headroom", label: "Add headroom", sub: "for spikes above forecast" },
        { id: "n1", label: "Plan N-1 / N-2", sub: "survive losing a node/AZ without cascade" },
        { id: "provision", label: "Provision", sub: "autoscale gradual + pre-scale known spikes; watch quotas" },
      ],
      caption: "Plan for peak (not average) at the SLO, with headroom for spikes and failure -- balanced against idle cost.",
    },

    realWorld: `A team runs four app nodes at a comfortable-looking 70% CPU at peak. During a routine deploy one node is briefly out, dropping capacity by 25% -- and the site falls over. The math they missed: with one node gone, the remaining three each had to absorb an extra third of the load, pushing them to ~93%, which is past the knee where latency explodes and requests start timing out; timeouts triggered client retries, which added *more* load, and the whole tier cascaded. Their capacity plan was for the *happy path*, not for N-1. The fix is to size for post-failure load: enough nodes that losing one still leaves the survivors under the safe threshold (say 65%), plus rehearsed load tests to know where that threshold truly is. Running 'at 70%' felt responsible and was actually one node-failure away from an outage the entire time.`,

    production: `- **Forecast for peak, not average**, incorporating seasonality and known events (launches, sales).
- **Load-test to find the real per-unit limit** -- the point where the SLI degrades, not where CPU hits 100%.
- **Always plan N-1 (or N-2)** so a single node/AZ failure leaves survivors under the safe threshold; don't run near capacity.
- **Use autoscaling for gradual variation and pre-scaling for known spikes** autoscaling is too slow to catch.
- **Track and raise hidden ceilings early:** cloud account limits, DB max connections, API rate limits, NAT throughput.
- **Plan the whole critical path** -- capacity moves to the next bottleneck once you relieve the first.
- **Keep headroom because latency explodes near 100% utilization** (queueing), not just to avoid hard failure.
- **Set headroom by cost vs risk**, informed by the SLO/error budget and the revenue at stake during peak.
- **Re-plan regularly** as growth and architecture change.`,

    commonMistakes: [
      "Planning for average load instead of peak, then falling over at the busiest moment.",
      "Treating 100% CPU as the limit instead of load-testing to where the SLI actually breaks.",
      "Running near capacity with no N-1 headroom, so one failure cascades.",
      "Trusting autoscaling for sharp, known spikes it's too slow to absorb.",
      "Forgetting hidden quotas (DB connections, account limits, API rate limits) that cap you first.",
      "Optimizing one bottleneck and being surprised when capacity just moves downstream.",
      "Over-provisioning permanently to feel safe, burning money on idle capacity.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| More headroom / N-1, N-2 | Survives failures + spikes | Idle capacity spend |
| Run near capacity | Cheap | One failure cascades; latency spikes |
| Autoscaling | Matches gradual demand, cost-efficient | Boot lag; misses sharp spikes; has ceilings |
| Pre-provisioning | Handles known spikes instantly | Pay for capacity before it's needed |
| Plan for peak | No outage at busiest time | Costlier than planning for average |
| Aggressive load testing | Know your real limits | Time + risk of testing in prod-like envs |`,

    whenToUse: [
      "Any service with variable or growing load where running out means an SLO-breaking outage.",
      "Ahead of known demand events (launches, sales, seasonal peaks).",
      "Designing for high availability where surviving a node/AZ failure is required (N-1).",
    ],
    whenNotToUse: [
      "Truly flat, tiny, non-critical workloads where over-provisioning a little is cheaper than the planning effort.",
      "As a substitute for fixing a genuine efficiency/architecture problem -- adding capacity to hide a leak is expensive and temporary.",
      "Where fully elastic serverless already absorbs variation within its own limits (still watch the quotas).",
    ],

    code: [
      {
        label: "Sizing for N-1 headroom (worked example)",
        language: "text",
        code: `Goal: stay under 65% CPU on the SURVIVORS after losing one node.

Peak total load        = 280 CPU-units
Per-node safe capacity = 100 units, target max 65% => 65 usable units/node

Naive (happy-path) sizing:
  280 / 65 = 4.3  -> 5 nodes, each ~56% at peak.  Looks fine.

But require N-1 (one node can fail at peak):
  after losing 1 node, (N-1) nodes must still carry 280 under 65 units each
  (N-1) x 65 >= 280  ->  N-1 >= 4.31  ->  N >= 5.31  ->  N = 6 nodes

=> Provision 6, not 5. With 6, losing one leaves 5 x 65 = 325 >= 280. Safe.
   Sizing for the happy path (5) would cascade on a single failure at peak.`,
      },
      {
        label: "Load test: ramp until the SLI breaks (k6)",
        language: "javascript",
        code: `import http from "k6/http";
import { check } from "k6";

// Ramp load and watch where p95 latency / errors cross the SLO --
// that inflection point is the REAL per-unit limit (not 100% CPU).
export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "2m", target: 300 },
    { duration: "2m", target: 600 },
    { duration: "2m", target: 1000 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // SLO: p95 under 500ms
    http_req_failed: ["rate<0.001"],  // SLO: <0.1% errors
  },
};

export default function () {
  const res = http.get("https://staging.example.com/checkout");
  check(res, { "status 200": (r) => r.status === 200 });
}`,
      },
    ],

    memoryCard: {
      problem: "Have enough resources to serve peak demand at the SLO -- before it arrives -- without over-paying for idle capacity.",
      mentalModel: "Stocking a store for the holiday rush: forecast the peak, keep a safety margin, test the checkout lanes under simulated load, and don't freeze cash in unsold inventory.",
      keyConcepts: ["plan for peak (not average) at the SLO", "real limit = where the SLI breaks, not 100% CPU", "headroom + N-1/N-2 to survive failure", "autoscale gradual, pre-scale known spikes", "hidden quotas/ceilings", "latency explodes near 100% utilization"],
      productionConnection: "Forecast peak, load-test the true per-unit limit, size for N-1, watch DB/account/API quotas, and balance headroom cost against peak revenue risk.",
      oneLiner: "Capacity planning ensures you can serve peak demand at your SLO with headroom to survive failures -- balancing the cost of idle capacity against the cost of running out.",
    },

    quiz: [
      {
        id: "cap-q1",
        prompt: "What determines a service's real per-unit capacity limit?",
        choices: [
          { text: "When CPU reaches exactly 100%", correct: false },
          { text: "The load level at which the SLI degrades (latency/errors cross the SLO)", correct: true },
          { text: "The number of cores installed", correct: false },
          { text: "The price of the instance", correct: false },
        ],
        explanation: "A service can breach its SLO well before 100% CPU (a downstream dependency, lock, or connection pool saturates first) or hold SLO past what you'd guess. Load-test to find the inflection point where the SLI breaks -- that's the true limit.",
      },
      {
        id: "cap-q2",
        prompt: "Four nodes run at 70% CPU at peak. Why can losing one node cause an outage?",
        choices: [
          { text: "Losing a node reduces the SLO", correct: false },
          { text: "The dead node's load redistributes onto survivors, pushing them past the knee where latency explodes, triggering retries and a cascade", correct: true },
          { text: "70% CPU is always safe", correct: false },
          { text: "Nodes cannot recover after a restart", correct: false },
        ],
        explanation: "With one of four nodes gone, each survivor absorbs an extra third of the load (to ~93%), past the utilization knee where latency spikes; timeouts cause retries that add more load and cascade. Sizing must ensure survivors stay under the safe threshold after N-1.",
      },
      {
        id: "cap-q3",
        prompt: "For a flash sale starting at a precise, known minute, why is autoscaling alone risky?",
        choices: [
          { text: "Autoscaling costs more than doing nothing", correct: false },
          { text: "Autoscaling has boot/warm-up lag, so a sharp spike can breach the SLO before new capacity arrives; pre-scale instead", correct: true },
          { text: "Autoscaling only works for databases", correct: false },
          { text: "Autoscaling ignores CPU entirely", correct: false },
        ],
        explanation: "Autoscaling reacts to load and instances take time to boot and warm up. A sudden, known spike can overwhelm current capacity before scaling catches up, so you pre-provision for known events and use autoscaling for gradual variation.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Plan capacity for a launch",
      brief: "A checkout service faces a product launch expected to triple peak traffic. Produce a capacity plan that holds the SLO and survives a node failure.",
      steps: `1. Forecast the launch peak (current peak x expected multiplier + marketing spike), not the average.\n2. Load-test staging to find the real per-unit limit -- the load where p95 latency / error rate crosses the SLO.\n3. Compute nodes needed for the forecast peak at a safe utilization threshold (well below the knee).\n4. Add N-1: ensure that after losing one node/AZ, survivors stay under the threshold (size up accordingly).\n5. Pre-provision for the known launch minute; keep autoscaling for the gradual tail.\n6. Check hidden ceilings: DB max connections, cloud account limits, downstream API rate limits, NAT throughput.\n7. Verify the whole critical path, then set a cost-vs-risk headroom informed by the error budget.`,
      successCriteria: [
        "Sized for forecast peak at the SLO, not average",
        "Per-unit limit found by load testing, not assumed at 100% CPU",
        "N-1 headroom so a single failure doesn't cascade",
        "Pre-provisioned for the known spike and hidden quotas checked",
      ],
    },
  },
];
