import type { Lesson } from "../types";

export const infraLessons: Lesson[] = [
  {
    slug: "terraform-fundamentals",
    title: "Terraform Fundamentals",
    track: "shared",
    phase: "terraform",
    module: "tf-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Declarative infrastructure as code: how Terraform models desired state, diffs it against reality with plan/apply, builds a dependency graph, and stays idempotent -- and why that beats clicking around a cloud console.",
    prerequisites: ["aws-vpc-networking"],
    relatedConcepts: ["terraform-state", "terraform-modules", "aws-iam", "cicd-pipelines"],
    tags: ["terraform", "iac", "declarative", "hcl", "plan-apply", "providers"],

    why: `Provisioning cloud infrastructure by clicking through a console ("clickops") is fast for one resource and a disaster at scale: it is unrepeatable, undocumented, un-reviewable, and impossible to recreate in a second region or a fresh account. **Terraform lets you declare the infrastructure you want in code, then continuously reconcile the real world to match it.** The value is not "scripts that build things" -- it is a *reviewable, versioned, reproducible* description of your entire estate that a machine keeps true.`,

    intuition: `Think of Terraform as a **thermostat for infrastructure, not a remote control.** With clickops you press buttons (imperative: "create this instance now"). With Terraform you set a target -- "there should be one VPC, three subnets, and an RDS instance" (declarative) -- and Terraform figures out the difference between what exists and what you asked for, then makes only the changes needed to close the gap. Run it again with no changes and it does nothing. That is **idempotency**: the same config applied twice yields the same result.`,

    howItWorks: `- **You write HCL** (HashiCorp Configuration Language) describing **resources** ("aws_instance", "aws_s3_bucket") and their arguments. This is your *desired state*.
- **Providers** are plugins that translate HCL resources into API calls for a platform (AWS, GCP, Cloudflare, Datadog). You declare and version them in a "required_providers" block.
- **terraform plan** reads your config, reads the current **state** (Terraform's record of what it manages), refreshes it against the real API, and prints a diff: what it will create, update, or destroy. Nothing changes yet.
- **terraform apply** executes that plan, calling provider APIs to make reality match desired state, then records the result in state.
- **Terraform builds a dependency graph.** If a subnet references a VPC id, Terraform knows the VPC must exist first. It parallelizes independent resources and orders dependent ones automatically -- you almost never sequence things by hand.
- **Variables** parameterize configs (region, instance size); **outputs** expose values (an endpoint, an id) for humans or other modules.`,

    internals: `- **Terraform is declarative on the surface but graph-driven underneath.** It parses HCL into a DAG (directed acyclic graph) of resources, computes the order from references and explicit "depends_on", then walks the graph creating/updating nodes. Cycles are an error.
- **A plan is a diff between three things:** your config (desired), the state file (last-known), and a refresh of the real API (actual). Drift -- someone changed a resource by hand -- shows up as a plan that wants to "fix" it back.
- **Idempotency comes from resource-level reconciliation.** Each provider knows how to read a resource and compute the minimal change. Some changes are in-place updates; some force a destroy-and-recreate (shown as "-/+" in the plan) because the API cannot change that attribute live.
- **Providers version independently of Terraform core.** Pinning provider versions (with a lockfile, ".terraform.lock.hcl") is what makes builds reproducible across a team and CI.
- **"terraform plan" is safe and read-only** against your infra except for the refresh; "apply" is the only mutating step. That plan/apply split is the safety mechanism -- you review the diff before it happens.`,

    diagram: {
      title: "The Terraform plan/apply cycle",
      layers: [
        { id: "hcl", label: "HCL config", sub: "desired state: resources, variables, providers" },
        { id: "graph", label: "Dependency graph", sub: "core parses HCL into a DAG, orders by references" },
        { id: "plan", label: "terraform plan", sub: "diff config vs state vs real API -> create/update/destroy" },
        { id: "apply", label: "terraform apply", sub: "providers call platform APIs to reconcile" },
        { id: "state", label: "State", sub: "record of managed resources = source of mapping" },
      ],
      caption: "Declare desired state, review the diff, apply only the delta -- and it is idempotent.",
    },

    realWorld: `A team needs an identical staging environment to reproduce a production bug. With clickops this is a day of guessing which of 40 console settings matter. With Terraform they run "terraform apply" against a "staging.tfvars" file and get a byte-for-byte equivalent VPC, subnets, security groups, and RDS in twenty minutes -- then "terraform destroy" it that evening to save money. The infrastructure is now code you can diff, review in a pull request, and roll back like any other change.`,

    production: `- **Always run "terraform plan" and read the diff before "apply"** -- especially watch for "-/+" (forced replacement) on stateful resources like databases.
- **Pin provider and module versions** and commit the ".terraform.lock.hcl" lockfile so CI and every engineer resolve the same versions.
- **Run Terraform in CI**, not from laptops, so applies are reviewed, logged, and use a single set of credentials.
- **Never hand-edit resources Terraform manages** -- that creates drift the next plan will try to revert, sometimes destructively.
- **Use "-target" sparingly** (it bypasses the full graph and can leave state inconsistent); prefer fixing config.
- **Keep secrets out of HCL** -- inject via environment or a secrets manager, because anything in config (and state) is readable.`,

    commonMistakes: [
      "Running 'apply' without reading the plan -- and destroying a database via a forced '-/+' replacement.",
      "Editing cloud resources by hand after Terraform created them, causing drift the next plan reverts.",
      "Not pinning provider versions, so a new minor release changes behavior across the team.",
      "Committing secrets into .tf files (they end up in version control and in state).",
      "Treating Terraform as imperative scripts and manually sequencing resources instead of trusting the dependency graph.",
      "Using 'terraform apply -auto-approve' in interactive workflows, skipping the safety review.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| IaC (Terraform) vs clickops | Reviewable, reproducible, versioned | Learning curve; another tool to run |
| Declarative model | Idempotent, self-documenting desired state | Indirection; must understand the graph and plan output |
| Plan/apply split | Review the diff before mutating | Two steps; drift between plan and apply if world changes |
| Provider ecosystem | One tool for many platforms | Provider bugs/lag behind new cloud features |`,

    whenToUse: [
      "Provisioning and managing cloud infrastructure that must be reproducible across environments or accounts.",
      "Any infra you want reviewed in pull requests and rebuilt from scratch on demand.",
      "Multi-cloud or many-service estates where consistency and drift control matter.",
    ],
    whenNotToUse: [
      "Throwaway one-off experiments where the console is genuinely faster and nothing needs to persist.",
      "Application-level config that changes many times a day (use app deploy tooling, not infra apply).",
      "Managing per-request or highly dynamic state that a control plane (like Kubernetes) already reconciles.",
    ],

    code: [
      {
        label: "A minimal Terraform config (provider, variable, resource, output)",
        language: "hcl",
        code: `terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name"
}

# A resource: desired state for one S3 bucket.
resource "aws_s3_bucket" "assets" {
  bucket = var.bucket_name

  tags = {
    Environment = "staging"
    ManagedBy   = "terraform"
  }
}

# Block public access (a separate resource that depends on the bucket).
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Outputs expose values after apply.
output "bucket_arn" {
  value = aws_s3_bucket.assets.arn
}`,
      },
      {
        label: "The plan/apply workflow",
        language: "bash",
        code: `# Download providers and initialize the working dir (creates the lockfile).
terraform init

# Show the diff between desired config and real infrastructure. Read this.
terraform plan -var="bucket_name=my-app-assets-staging"

# Apply the reviewed plan; Terraform prints the same diff and asks to confirm.
terraform apply -var="bucket_name=my-app-assets-staging"

# Symbols in a plan:
#   +   create
#   ~   update in place
#   -   destroy
#   -/+ destroy then recreate (forced replacement -- dangerous on stateful resources)

# Tear it all down when finished.
terraform destroy -var="bucket_name=my-app-assets-staging"`,
      },
    ],

    memoryCard: {
      problem: "Provision infrastructure reproducibly and reviewably instead of clicking through a console.",
      mentalModel: "A thermostat for infra: declare the target, Terraform diffs reality and applies only the delta -- idempotently.",
      keyConcepts: [
        "declarative desired state vs imperative clickops",
        "providers translate HCL to API calls",
        "plan = diff (config vs state vs real), apply = reconcile",
        "dependency graph orders resources automatically",
        "idempotency: apply twice = same result",
      ],
      productionConnection: "Plan before apply, pin provider versions + lockfile, run in CI, never hand-edit managed resources, keep secrets out of HCL.",
      oneLiner: "Terraform is declarative IaC: write the desired state in HCL, review the plan diff, and apply reconciles reality to match -- idempotently.",
    },

    quiz: [
      {
        id: "tf-fund-q1",
        prompt: "What does 'terraform plan' actually do?",
        choices: [
          { text: "It creates all the resources immediately", correct: false },
          { text: "It computes and prints a diff of config vs state vs real infrastructure without changing anything", correct: true },
          { text: "It deletes the state file", correct: false },
          { text: "It only validates HCL syntax", correct: false },
        ],
        explanation: "plan refreshes state against the real API and shows what create/update/destroy actions apply would take. It is read-only except for the refresh -- the mutation happens in apply.",
      },
      {
        id: "tf-fund-q2",
        prompt: "Why is Terraform described as declarative and idempotent?",
        choices: [
          { text: "Because it runs commands in the order you type them", correct: false },
          { text: "You declare the desired end state, and applying the same config twice produces the same result with no extra changes", correct: true },
          { text: "Because it requires you to manually sequence every resource", correct: false },
          { text: "Because it never reads the current state", correct: false },
        ],
        explanation: "You describe what you want, not step-by-step how. Terraform reconciles reality to that target; a second apply with no config change is a no-op -- that is idempotency.",
      },
      {
        id: "tf-fund-q3",
        prompt: "You see '-/+' next to your RDS database in a plan. What does that mean and why care?",
        choices: [
          { text: "It will be updated safely in place", correct: false },
          { text: "It will be destroyed and recreated because an attribute cannot change live -- which can mean data loss", correct: true },
          { text: "It is a syntax warning only", correct: false },
          { text: "It means no change will occur", correct: false },
        ],
        explanation: "'-/+' is a forced replacement: destroy then recreate. On stateful resources like databases that can wipe data, so always read the plan before applying.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Provision and destroy an S3 bucket with Terraform",
      brief: "Write a tiny config, watch the plan diff, apply it, introduce drift, and observe how the next plan reacts.",
      steps: `1. Create a directory with a single "main.tf" declaring the AWS provider and one "aws_s3_bucket" resource (use the sample above).
2. Run "terraform init" and note the ".terraform.lock.hcl" lockfile that appears.
3. Run "terraform plan" and read every line of the diff. Confirm it shows a single "+ create".
4. Run "terraform apply" and confirm. Verify the bucket exists in the console.
5. Introduce drift: add a tag to the bucket by hand in the console.
6. Run "terraform plan" again. Observe that Terraform wants to remove the manual tag to match your config -- this is drift detection.
7. Run "terraform destroy" and confirm the resource is removed.`,
      successCriteria: [
        "Explain what init, plan, and apply each do differently",
        "Identify the create/update/destroy symbols in a plan",
        "Describe how drift appears in a subsequent plan",
      ],
    },
  },

  {
    slug: "terraform-state",
    title: "Terraform State",
    track: "shared",
    phase: "terraform",
    module: "tf-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "Why Terraform keeps a state file, what breaks without remote state and locking, how drift and sensitive data show up in state, and the sharp edges of import, state surgery, and workspaces.",
    prerequisites: ["terraform-fundamentals", "aws-vpc-networking"],
    relatedConcepts: ["terraform-modules", "aws-iam", "cicd-pipelines"],
    tags: ["terraform", "state", "backend", "locking", "drift", "import"],

    why: `Terraform config says *what you want*, but it also needs to know *which real resources it already created* -- otherwise every apply would try to recreate everything or destroy things it does not recognize. **State is Terraform's memory: a mapping from your config's logical names to real cloud resource ids.** Getting state wrong is how teams accidentally delete production, so understanding it is the difference between Terraform being safe and being a footgun.`,

    intuition: `State is the **answer key that maps "the bucket I called 'assets' in my config" to "the actual S3 bucket arn:aws:s3:::my-app-assets".** Without it, Terraform looking at your config and the cloud has no way to know that the bucket already exists and belongs to this config -- it can only see names, not identity. State is that identity ledger. And because a whole team edits infrastructure, the ledger must live somewhere shared and be **locked** so two people cannot scribble in it at once.`,

    howItWorks: `- **State is a JSON file** ("terraform.tfstate") recording every managed resource: its logical address, its real id, and its last-known attributes.
- **Local state** (a file on your laptop) works for solo experiments but fails a team: nobody else can see it, and two applies can corrupt it.
- **Remote state** stores that file in a shared **backend** (S3, GCS, Terraform Cloud). Everyone reads/writes the same authoritative state.
- **State locking** prevents concurrent writes. With the S3 backend, Terraform uses a **DynamoDB table** as a lock: whoever is applying holds the lock; others wait or fail fast instead of racing.
- **Drift** is when reality diverges from state (someone changed a resource by hand). "terraform plan" refreshes state against the API and surfaces drift as proposed changes.
- **terraform import** brings an *existing* unmanaged resource under Terraform by writing it into state (you still must write matching config).
- **Workspaces** let one config back multiple independent states (e.g. dev/staging/prod) -- a lightweight way to reuse config with separate state.`,

    internals: `- **State is the source of the config-to-reality mapping, not the source of truth for infra.** The cloud is the truth; state is Terraform's cache of identities and last-seen attributes. Refresh reconciles the two.
- **Sensitive data lands in state in plaintext.** A generated DB password, a private key, a "random_password" -- all stored in the state file. This is why the backend must be encrypted (S3 SSE) and access-controlled like a secret.
- **Locking is advisory but enforced by the backend.** DynamoDB provides a conditional-write lock; if a run dies mid-apply, the lock can be left stale and must be force-unlocked deliberately.
- **State surgery is real and dangerous.** "terraform state rm" makes Terraform forget a resource (it stays in the cloud, now unmanaged). "terraform state mv" renames/relocates an address (used when refactoring or moving into modules). Both edit the ledger directly -- a mistake can orphan or double-manage resources.
- **A corrupted or lost state file is catastrophic:** Terraform no longer knows what it owns and may try to recreate live resources. This is why remote state is versioned (S3 versioning) so you can roll back.
- **"terraform import" only writes state, not config.** If your HCL does not match the imported resource, the next plan shows spurious changes until you align them.`,

    diagram: {
      title: "Remote state with locking",
      layers: [
        { id: "engineers", label: "Engineers + CI", sub: "many actors run plan/apply" },
        { id: "backend", label: "Remote backend (S3)", sub: "single shared, versioned, encrypted state" },
        { id: "lock", label: "Lock (DynamoDB)", sub: "one writer at a time; others wait/fail" },
        { id: "state", label: "State file", sub: "maps config addresses -> real resource ids + attrs" },
        { id: "cloud", label: "Cloud APIs", sub: "actual resources = source of truth; refresh detects drift" },
      ],
      caption: "Shared encrypted state plus a lock keeps a whole team from corrupting the ledger.",
    },

    realWorld: `Two engineers run "terraform apply" on the same config within a minute of each other using local state passed around over Slack. The second apply overwrites the first's state, so Terraform loses track of a NAT gateway. The next plan wants to create a duplicate -- and later, a destroy removes the "unmanaged" original, dropping outbound internet for a subnet. Moving to an S3 backend with a DynamoDB lock would have made the second apply wait for the lock instead of racing, and S3 versioning would have let them recover the clobbered state.`,

    production: `- **Use a remote backend from day one for anything shared** (S3 + DynamoDB lock, or Terraform Cloud). Never pass "terraform.tfstate" around by hand.
- **Enable encryption and versioning on the state bucket** -- state contains secrets and losing it is catastrophic.
- **Lock down access to state like a secret** (IAM), because reading it reveals passwords and keys.
- **Treat drift as a signal:** investigate manual changes rather than blindly applying over them.
- **Do state surgery ("rm"/"mv") only with a fresh state backup and a clear plan**, ideally reviewed by a second person.
- **Use "terraform import" to adopt existing resources** instead of recreating them -- but reconcile config immediately so plans go clean.
- **Prefer separate state per environment** (workspaces or separate backends/keys) so a dev mistake cannot touch prod state.`,

    commonMistakes: [
      "Using local state on a team, leading to lost updates and corruption when two people apply.",
      "Leaving the state bucket unencrypted/public -- exposing the plaintext secrets stored in state.",
      "Running 'terraform state rm' on the wrong resource and orphaning live infrastructure.",
      "Force-unlocking a lock without confirming the other apply actually died, causing a real concurrent write.",
      "Importing a resource but not writing matching config, so every plan shows phantom changes.",
      "Assuming state is the source of truth -- it is a cache; the cloud is truth and drift is normal.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Local vs remote state | Local is zero-setup | No sharing, easy corruption, no locking |
| Remote state + lock | Safe concurrent teamwork, versioned recovery | Backend to provision and secure |
| Workspaces | Reuse one config for many envs | Shared config/blast-radius risk; easy to apply to the wrong one |
| Separate state per env | Strong isolation, small blast radius | More backends/keys to manage |
| State surgery (rm/mv) | Refactor without recreating | Direct ledger edits; a mistake orphans or double-manages |`,

    whenToUse: [
      "Any Terraform used by more than one person or by CI (remote state + locking is mandatory).",
      "Adopting pre-existing infrastructure into Terraform via import.",
      "Refactoring resource addresses or moving them into modules via 'terraform state mv'.",
    ],
    whenNotToUse: [
      "Reaching for state surgery when a config change would do the job more safely.",
      "Storing highly sensitive generated secrets in state without encryption and tight access control.",
      "Sharing local state files between people as a substitute for a real backend.",
    ],

    code: [
      {
        label: "S3 backend with DynamoDB locking",
        language: "hcl",
        code: `terraform {
  backend "s3" {
    bucket         = "acme-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "acme-terraform-locks"
  }
}

# The lock table and state bucket are usually provisioned once,
# in a separate bootstrap config, so this backend has somewhere to live.
# Bucket: versioning + SSE enabled. DynamoDB table: partition key "LockID" (string).`,
      },
      {
        label: "State inspection, import, and surgery (use with care)",
        language: "bash",
        code: `# List every resource Terraform currently tracks in state.
terraform state list

# Show the recorded attributes of one resource.
terraform state show aws_s3_bucket.assets

# Adopt an EXISTING unmanaged bucket into state (you must also write matching HCL).
terraform import aws_s3_bucket.legacy my-preexisting-bucket-name

# Rename/relocate a resource address (e.g. after refactoring into a module).
# This edits the ledger only; the real resource is untouched.
terraform state mv aws_s3_bucket.assets module.storage.aws_s3_bucket.assets

# Make Terraform FORGET a resource without deleting it in the cloud.
# The resource becomes unmanaged. Double-check the address first.
terraform state rm aws_s3_bucket.assets

# If a run died and left a stale lock (confirm nothing is actually running first):
terraform force-unlock <LOCK_ID>`,
      },
    ],

    memoryCard: {
      problem: "Terraform must remember which real resources belong to a config, safely, across a whole team.",
      mentalModel: "State is an answer key mapping config names to real resource ids; put it in a shared, locked, encrypted vault.",
      keyConcepts: [
        "state = config-to-reality identity mapping (a cache, not the truth)",
        "remote backend + DynamoDB lock for team safety",
        "sensitive data is stored in state in plaintext -> encrypt + restrict",
        "drift = reality diverging from state, surfaced by plan",
        "import adopts existing resources; state rm/mv are risky direct edits",
      ],
      productionConnection: "S3 backend with encryption, versioning, and a DynamoDB lock; treat state as a secret; back up before any state surgery.",
      oneLiner: "State is Terraform's memory of what it owns -- keep it remote, locked, encrypted, and never hand off local state or do blind 'state rm'.",
    },

    quiz: [
      {
        id: "tf-state-q1",
        prompt: "Why does Terraform need a state file at all?",
        choices: [
          { text: "To store your provider credentials", correct: false },
          { text: "To map logical config addresses to the real resource ids Terraform already created", correct: true },
          { text: "To cache downloaded provider plugins", correct: false },
          { text: "It does not; Terraform is stateless", correct: false },
        ],
        explanation: "Config only names resources logically. State records which real cloud resource each logical name maps to, so Terraform knows what already exists and what to change.",
      },
      {
        id: "tf-state-q2",
        prompt: "What does the DynamoDB table do in an S3 backend setup?",
        choices: [
          { text: "It stores the actual state file", correct: false },
          { text: "It provides a lock so only one apply writes state at a time", correct: true },
          { text: "It encrypts the state file", correct: false },
          { text: "It stores Terraform outputs for other configs", correct: false },
        ],
        explanation: "The S3 bucket holds the state; the DynamoDB table provides state locking so concurrent applies cannot race and corrupt the shared state.",
      },
      {
        id: "tf-state-q3",
        prompt: "What is the effect of 'terraform state rm aws_s3_bucket.assets'?",
        choices: [
          { text: "It deletes the bucket in AWS", correct: false },
          { text: "Terraform forgets the resource in state, but the bucket stays in AWS as unmanaged", correct: true },
          { text: "It renames the bucket", correct: false },
          { text: "It imports the bucket into state", correct: false },
        ],
        explanation: "'state rm' removes the resource from Terraform's ledger only. The real resource is untouched but now unmanaged -- a mistake here orphans live infrastructure.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Migrate to remote state and observe locking",
      brief: "Move a local-state config to an S3 backend with DynamoDB locking, then trigger a lock to see concurrency protection.",
      steps: `1. Start with a config that has local state and one applied resource. Run "terraform state list" to see it.
2. Provision (or reuse) an S3 bucket with versioning + encryption and a DynamoDB table with partition key "LockID".
3. Add a "backend \\"s3\\"" block pointing at that bucket/table, then run "terraform init" and choose to migrate state.
4. Confirm state now lives in S3 and "terraform state list" still shows your resource.
5. In one terminal start "terraform apply" and pause at the confirmation prompt (do not confirm).
6. In a second terminal run "terraform plan" and observe it waiting on or reporting the lock.
7. Cancel both. Inspect the lock item in DynamoDB, and if it is left stale, "terraform force-unlock <ID>" after confirming nothing is running.`,
      successCriteria: [
        "Successfully migrate local state to a remote S3 backend",
        "Demonstrate that a second run is blocked by the DynamoDB lock",
        "Explain why state must be encrypted and access-controlled",
      ],
    },
  },

  {
    slug: "terraform-modules",
    title: "Terraform Modules",
    track: "shared",
    phase: "terraform",
    module: "tf-core",
    difficulty: "advanced",
    estMinutes: 24,
    summary:
      "Packaging Terraform into reusable modules with clear inputs and outputs: root vs child modules, versioning and registries, composition, and knowing when a module is genuine reuse versus premature abstraction.",
    prerequisites: ["terraform-fundamentals", "terraform-state"],
    relatedConcepts: ["aws-vpc-networking", "aws-iam", "cicd-pipelines"],
    tags: ["terraform", "modules", "reuse", "dry", "composition", "registry"],

    why: `Copy-pasting the same VPC or database config into five environments means fixing every bug five times and letting them drift apart. **Modules package a set of resources behind a clean interface of inputs and outputs so you define infrastructure patterns once and instantiate them many times.** Done well, a module is your organization's paved road ("here is how we make a compliant, tagged, encrypted bucket"). Done badly, it is an over-abstracted maze that hides more than it helps.`,

    intuition: `A module is a **function for infrastructure.** It takes arguments (inputs/variables like "cidr_block" and "environment"), does work (declares resources), and returns values (outputs like "vpc_id"). Calling the module is like calling that function with different arguments to stamp out consistent copies. Your top-level config -- the **root module** -- is just the "main()" that wires child modules together. The same instincts from software apply: good functions have a small, clear signature; bad ones take twenty flags and do too much.`,

    howItWorks: `- **Every Terraform config is already a module** (the root module). A **child module** is a directory you call with a "module" block.
- **A module directory has three conventional files:** "variables.tf" (inputs), "main.tf" (resources), "outputs.tf" (returned values). The inputs and outputs are its public interface; internal resources are implementation detail.
- **You instantiate a module** with a "module" block, passing values for its variables and reading its outputs via "module.<name>.<output>".
- **Modules compose:** a root module can call a "network" module and a "database" module, passing the network's subnet outputs into the database module. Terraform's dependency graph threads through module boundaries.
- **Modules are sourced** from a local path, a Git URL, or a **registry** (the public Terraform Registry or a private one). Registry/Git sources support a **version** constraint so you pin exactly which module version you use.
- **DRY, but with judgment:** reuse the module for genuinely repeated patterns; do not wrap a single resource in a module just to feel organized.`,

    internals: `- **Module inputs/outputs are the whole contract.** Callers should depend only on documented variables and outputs, never on internal resource names -- otherwise refactoring the module breaks callers.
- **Versioning is what makes modules safe to share.** Pin "version = \\"~> 3.2\\"" so a new module release does not silently change everyone's infrastructure on the next apply. Registries enforce semantic versioning by tag.
- **Composition over configuration.** A small module that does one thing (a bucket, a security group) composed by the root beats a monolithic "everything" module with dozens of feature flags. Deeply nested modules make the plan hard to reason about and slow to refresh.
- **"count" and "for_each" on modules** let you stamp N copies (e.g. one subnet module per AZ), but for_each with stable keys is safer than count because count is index-based and reindexing destroys/recreates resources.
- **Over-abstraction is a real cost:** a module with 40 optional variables trying to cover every case becomes harder to use and understand than raw resources. If reading the module is harder than writing the resources, it is the wrong abstraction.
- **Module testing** exists (terraform validate, plan-based checks, and tools like Terratest that apply into a sandbox and assert, or the native "terraform test" framework). Untested shared modules propagate bugs to every consumer.`,

    diagram: {
      title: "Root module composing child modules",
      layers: [
        { id: "root", label: "Root module", sub: "main() -- wires everything, holds the backend" },
        { id: "network", label: "module.network", sub: "inputs: cidr, azs -> outputs: vpc_id, subnet_ids" },
        { id: "database", label: "module.database", sub: "inputs: subnet_ids, size -> outputs: endpoint" },
        { id: "registry", label: "Source + version", sub: "local path / Git / registry, pinned version" },
        { id: "interface", label: "variables.tf / outputs.tf", sub: "the public contract; resources are private" },
      ],
      caption: "A module is a function: clear inputs and outputs, composed by the root -- pin versions and keep the interface small.",
    },

    realWorld: `A platform team publishes a private "vpc" module encoding the company standard: three-tier subnets, flow logs, encrypted defaults, mandatory tags. Product teams call it with "module \\"vpc\\" { source = ...; version = \\"~> 4.1\\"; cidr = ... }" and get a compliant network in ten lines instead of two hundred. When security tightens the flow-log policy, the platform team ships v4.2; teams bump the version on their own schedule and get the fix -- consistently, without a company-wide copy-paste migration. That is the paved-road payoff of versioned modules.`,

    production: `- **Give modules a small, documented interface** -- a handful of meaningful inputs and outputs, not a flag for every attribute.
- **Always pin module versions** ("version = ...") from a registry or a Git tag, so upgrades are deliberate.
- **Version modules semantically** and keep a changelog; breaking input/output changes are major versions.
- **Prefer composition of small modules** over one mega-module with dozens of toggles.
- **Use "for_each" over "count"** for collections so adding/removing an item does not reindex and recreate unrelated resources.
- **Test shared modules** (validate + plan in CI, and apply-based tests in a sandbox account) before publishing a new version.
- **Do not modularize prematurely** -- extract a module once you have a genuine second use, not on speculation.`,

    commonMistakes: [
      "Wrapping a single resource in a module for no reuse -- pure indirection with no benefit.",
      "Not pinning module versions, so a new release changes everyone's infra on the next apply.",
      "Building a 40-variable mega-module that is harder to use than raw resources (over-abstraction).",
      "Depending on a module's internal resource names instead of its documented outputs.",
      "Using 'count' for collections, so removing a middle item reindexes and recreates the rest.",
      "Shipping shared modules with no tests, propagating a bug to every consumer.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Module reuse (DRY) | Fix once, consistency, paved road | Abstraction cost; harder to see what is created |
| Small composed modules | Easy to reason about, reusable | More wiring in the root |
| Mega-module w/ many flags | One entry point | Over-abstraction; hard to use and maintain |
| Pinned versions | Deliberate, safe upgrades | Must actively bump to get fixes |
| for_each vs count | Stable identity, safe add/remove | Slightly more syntax than count |`,

    whenToUse: [
      "A resource pattern is genuinely used more than once (multiple envs, teams, or AZs).",
      "Encoding organizational standards (compliant VPC, tagged/encrypted bucket) as a paved road.",
      "Composing infrastructure from independently versioned building blocks.",
    ],
    whenNotToUse: [
      "Speculatively modularizing before there is a real second use.",
      "A single resource where a module adds indirection but no reuse.",
      "When a module would need so many flags that raw resources are clearer.",
    ],

    code: [
      {
        label: "A child module (modules/bucket): variables, main, outputs",
        language: "hcl",
        code: `# modules/bucket/variables.tf
variable "name" {
  type        = string
  description = "Bucket name"
}

variable "environment" {
  type    = string
  default = "dev"
}

# modules/bucket/main.tf
resource "aws_s3_bucket" "this" {
  bucket = var.name
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = "Enabled"
  }
}

# modules/bucket/outputs.tf
output "arn" {
  value = aws_s3_bucket.this.arn
}

output "id" {
  value = aws_s3_bucket.this.id
}`,
      },
      {
        label: "Root module using it (local, registry, and for_each)",
        language: "hcl",
        code: `# Call a local child module.
module "assets" {
  source      = "./modules/bucket"
  name        = "acme-assets-staging"
  environment = "staging"
}

# Call a versioned module from the public registry (always pin the version).
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "acme-staging"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b"]
}

# Stamp out one bucket per environment with for_each (stable keys, safe add/remove).
module "logs" {
  source   = "./modules/bucket"
  for_each = toset(["dev", "staging", "prod"])

  name        = "acme-logs-\${each.key}"
  environment = each.key
}

# Read a module output.
output "assets_arn" {
  value = module.assets.arn
}`,
      },
    ],

    memoryCard: {
      problem: "Reuse infrastructure patterns consistently instead of copy-pasting and drifting across environments.",
      mentalModel: "A module is a function for infra: inputs (variables) -> resources -> outputs; the root module is main() composing them.",
      keyConcepts: [
        "root vs child modules",
        "inputs/outputs are the public contract",
        "pin versions from registries/Git",
        "composition of small modules > one mega-module",
        "for_each over count for stable identity",
      ],
      productionConnection: "Small documented interfaces, pinned semantic versions, composed small modules, tested before publish, extract only on real reuse.",
      oneLiner: "Modules are functions for infrastructure -- reuse via clear inputs/outputs and pinned versions, but do not abstract before there is real reuse.",
    },

    quiz: [
      {
        id: "tf-mod-q1",
        prompt: "What forms a module's public interface?",
        choices: [
          { text: "Its internal resource names", correct: false },
          { text: "Its input variables and its outputs", correct: true },
          { text: "Its provider block", correct: false },
          { text: "The state file", correct: false },
        ],
        explanation: "Callers should depend only on a module's documented inputs and outputs. Internal resources are implementation detail and may be refactored without breaking consumers.",
      },
      {
        id: "tf-mod-q2",
        prompt: "Why pin a module version like 'version = \"~> 5.8\"'?",
        choices: [
          { text: "To make init faster", correct: false },
          { text: "So a new module release does not silently change your infrastructure on the next apply", correct: true },
          { text: "It is required by HCL syntax", correct: false },
          { text: "To encrypt the module source", correct: false },
        ],
        explanation: "Without a pin you would pull whatever the latest version is, which could change behavior unexpectedly. Pinning makes upgrades deliberate and reviewable.",
      },
      {
        id: "tf-mod-q3",
        prompt: "When is creating a module the wrong choice?",
        choices: [
          { text: "When a pattern is reused across several environments", correct: false },
          { text: "When you wrap a single resource with no reuse, adding indirection but no benefit", correct: true },
          { text: "When encoding a company-standard compliant VPC", correct: false },
          { text: "When composing small building blocks", correct: false },
        ],
        explanation: "Modules pay off with genuine reuse. Wrapping one resource that is used once just hides it behind indirection -- premature abstraction with no upside.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Extract a reusable bucket module",
      brief: "Refactor duplicated resource blocks into a child module with inputs and outputs, then instantiate it multiple ways.",
      steps: `1. Start from a config that declares two nearly identical S3 buckets inline.
2. Create a "modules/bucket" directory with "variables.tf", "main.tf", and "outputs.tf" as in the sample.
3. Replace the inline buckets with two "module" blocks calling your child module with different "name"/"environment" inputs.
4. Run "terraform init" (to register the module) then "terraform plan"; confirm the plan is a no-op or a clean move, not a destroy/recreate. Use "terraform state mv" if addresses changed.
5. Add a third instance using "for_each = toset([...])" to stamp one bucket per environment.
6. Add a public registry module (e.g. terraform-aws-modules/vpc/aws) with a pinned "version" and read one of its outputs.
7. Reflect: which of these instantiations was worth a module, and where would a module have been over-abstraction?`,
      successCriteria: [
        "Move duplicated resources behind a module with clear inputs/outputs",
        "Use for_each to instantiate multiple copies safely",
        "Pin a registry module version and consume its output",
      ],
    },
  },

  {
    slug: "cicd-pipelines",
    title: "CI/CD Pipelines",
    track: "shared",
    phase: "cicd",
    module: "cicd-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "What CI, CD, and continuous deployment actually mean, the standard pipeline stages, why fast feedback and build-once-deploy-everywhere matter, and how caching, secrets, and flaky tests decide whether your pipeline helps or hurts.",
    prerequisites: ["docker-images-layers"],
    relatedConcepts: ["deployment-strategies", "gitops-argocd", "terraform-fundamentals", "k8s-pods-deployments"],
    tags: ["cicd", "pipeline", "automation", "artifacts", "github-actions", "testing"],

    why: `Manually testing, building, and shipping software is slow, inconsistent, and the source of most "it worked in dev" incidents. **A CI/CD pipeline automates the path from a commit to a deployable, verified artifact -- and optionally to production -- so every change goes through the same gates.** The point is not just automation; it is *fast, trustworthy feedback* on every change and a repeatable, auditable release process that a whole team can rely on.`,

    intuition: `Think of a pipeline as an **assembly line with quality gates.** A commit is raw material that moves station to station: lint, test, build, security scan, deploy. If it fails a station, the line stops and tells the author immediately -- while the change is still fresh in their head. **Continuous Integration** means everyone merges small changes often and the line runs on each merge. **Continuous Delivery** means the line always ends with an artifact that *could* ship at the push of a button. **Continuous Deployment** removes even that button -- passing the line ships to production automatically.`,

    howItWorks: `- **CI (Continuous Integration):** on every push/PR, automatically lint, run tests, and build. Catches breakage early and keeps main always green.
- **CD (Continuous Delivery):** every green build produces a deployable artifact and can be released to production with a manual approval.
- **Continuous Deployment:** same, but with no manual gate -- passing the pipeline deploys automatically.
- **Typical stages:** lint/format -> unit + integration tests -> build (compile / build a container image) -> security scan (dependencies, image, secrets) -> publish artifact -> deploy.
- **Fast feedback first:** cheap, fast checks (lint, unit tests) run before slow ones (integration, e2e) so failures surface in seconds, not after a 20-minute run.
- **Build once, deploy everywhere:** build a single immutable artifact (a tagged container image), then promote *that exact artifact* through staging to prod. You never rebuild per environment.
- **Pipeline as code:** the pipeline lives in the repo (e.g. ".github/workflows/*.yml"), versioned and reviewed like any other code.`,

    internals: `- **Artifact immutability is the linchpin.** If you rebuild for prod, you might get different dependency versions than you tested in staging. Building once and promoting the same digest guarantees "what you tested is what you ship."
- **Caching is what keeps pipelines fast.** Cache dependency downloads and Docker layers keyed on lockfiles; a cache hit turns a 6-minute install into seconds. A bad cache key (too broad) serves stale artifacts; too narrow never hits.
- **Flaky tests poison the pipeline.** A test that fails randomly trains people to hit "re-run" and ignore red, which erodes all trust in CI. Flaky tests must be quarantined and fixed, not retried forever.
- **Secrets never belong in the pipeline file.** They are injected at runtime from a secret store (GitHub/GitLab secrets, Vault, cloud secret manager) and masked in logs. A secret committed to a workflow file is a leak in git history.
- **Fail fast and parallelize.** Independent jobs (lint, unit tests, build) run in parallel; a fast lint failure should not wait behind slow e2e. Fan-out/fan-in stages keep total wall-clock low.
- **Least-privilege pipeline credentials:** the deploy job should use short-lived, scoped credentials (OIDC to the cloud) rather than long-lived static keys, because the pipeline is a high-value target.`,

    diagram: {
      title: "CI/CD pipeline stages",
      layers: [
        { id: "commit", label: "Commit / PR", sub: "trigger; small, frequent changes" },
        { id: "verify", label: "Lint + Test", sub: "fast feedback first; parallel jobs" },
        { id: "build", label: "Build artifact", sub: "one immutable image, tagged by digest" },
        { id: "scan", label: "Security scan", sub: "deps, image, secret scanning" },
        { id: "deploy", label: "Deliver / Deploy", sub: "promote the same artifact staging -> prod" },
      ],
      caption: "Fast checks first, build once, promote the same immutable artifact -- with secrets injected, not committed.",
    },

    realWorld: `A team rebuilt their container image separately for staging and production. Staging passed; production immediately crashed because a transitive dependency had published a new patch between the two builds, so prod ran code no one had tested. Switching to build-once-deploy-everywhere -- build a single image in CI, tag it by digest, and promote that exact digest from staging to prod -- eliminated the entire class of "it passed in staging" failures overnight.`,

    production: `- **Build the artifact once and promote it by immutable digest** through every environment; never rebuild per env.
- **Order stages fast-to-slow and run independent jobs in parallel** so red surfaces in seconds.
- **Cache dependencies and Docker layers** keyed on lockfiles; measure and keep pipeline time low.
- **Inject secrets from a secret store at runtime** and ensure they are masked in logs -- never in the workflow file.
- **Treat flaky tests as bugs:** quarantine and fix them; do not normalize re-running red.
- **Use short-lived, scoped deploy credentials** (OIDC) instead of static long-lived keys.
- **Keep the pipeline as code in the repo**, reviewed in PRs, so pipeline changes are auditable.`,

    commonMistakes: [
      "Rebuilding the artifact per environment instead of promoting one immutable build (untested code reaches prod).",
      "Running slow e2e tests before fast lint/unit checks, so failures take 20 minutes to surface.",
      "Hardcoding secrets in the workflow YAML, leaking them into git history.",
      "Tolerating flaky tests and normalizing 're-run until green', destroying trust in CI.",
      "No caching, so every run reinstalls all dependencies from scratch.",
      "Using long-lived static cloud keys in the pipeline instead of short-lived OIDC credentials.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Continuous Deployment vs Delivery | No manual gate, fastest flow | Requires deep automated test + rollback confidence |
| Build once / promote digest | What you tested is what ships | Artifact registry + promotion tooling |
| Aggressive caching | Fast pipelines | Stale-cache bugs if keys are wrong |
| Parallel jobs | Low wall-clock time | More runners/compute; orchestration complexity |
| Full security scanning | Catches vulns/secrets early | Slower pipeline; false positives to triage |`,

    whenToUse: [
      "Any team shipping software regularly that wants consistent, reviewed, automated releases.",
      "Projects where fast feedback on every change reduces integration pain.",
      "Anywhere you need an auditable, repeatable path from commit to production.",
    ],
    whenNotToUse: [
      "Continuous Deployment (no gate) when automated test coverage and rollback are not yet trustworthy.",
      "Tiny one-off scripts where the pipeline overhead exceeds the benefit.",
      "High-risk regulated changes that legitimately require a manual approval gate (use Delivery, not Deployment).",
    ],

    code: [
      {
        label: "GitHub Actions: lint/test, build-once, then deploy",
        language: "yaml",
        code: `name: ci-cd

on:
  push:
    branches: [main]
  pull_request:

# Least-privilege default; the deploy job requests OIDC below.
permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"          # cache deps keyed on package-lock.json
      - run: npm ci
      - run: npm run lint       # fast checks first
      - run: npm test

  build:
    needs: verify               # only build if verify passed
    runs-on: ubuntu-latest
    outputs:
      digest: \${{ steps.push.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        id: push
        with:
          push: true
          tags: ghcr.io/acme/app:\${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write           # short-lived OIDC credentials, not static keys
      contents: read
    steps:
      - name: Deploy the exact built image by digest
        env:
          IMAGE: ghcr.io/acme/app@\${{ needs.build.outputs.digest }}
        run: ./deploy.sh "$IMAGE"   # secrets injected from the secret store, masked in logs`,
      },
    ],

    memoryCard: {
      problem: "Automate the path from commit to a verified, deployable artifact (and optionally to prod) with consistent gates.",
      mentalModel: "An assembly line with quality gates: lint -> test -> build -> scan -> deploy, stopping fast on failure.",
      keyConcepts: [
        "CI (merge + verify) vs CD (deliverable) vs continuous deployment (auto-ship)",
        "fast feedback first, parallel jobs",
        "build once, promote the same immutable digest",
        "cache deps/layers; quarantine flaky tests",
        "secrets injected at runtime, never in the file; OIDC over static keys",
      ],
      productionConnection: "Build-once/promote-by-digest, fast-to-slow stages with caching, runtime-injected secrets, OIDC creds, and zero tolerance for flaky tests.",
      oneLiner: "CI/CD is an automated assembly line: verify every commit fast, build one immutable artifact, and promote that exact artifact to production.",
    },

    quiz: [
      {
        id: "cicd-pipe-q1",
        prompt: "What is the difference between Continuous Delivery and Continuous Deployment?",
        choices: [
          { text: "They are the same thing", correct: false },
          { text: "Delivery ends with a deployable artifact and a manual gate to ship; Deployment ships to prod automatically on green", correct: true },
          { text: "Delivery skips testing; Deployment adds testing", correct: false },
          { text: "Deployment only builds; Delivery only tests", correct: false },
        ],
        explanation: "Both keep main always releasable. Delivery requires a human to approve the production release; Deployment removes that gate so a passing pipeline ships automatically.",
      },
      {
        id: "cicd-pipe-q2",
        prompt: "Why is 'build once, deploy everywhere' important?",
        choices: [
          { text: "It makes the pipeline YAML shorter", correct: false },
          { text: "Promoting the same immutable artifact guarantees prod runs exactly what was tested in staging", correct: true },
          { text: "It avoids needing tests", correct: false },
          { text: "It only matters for compiled languages", correct: false },
        ],
        explanation: "Rebuilding per environment can pull different dependency versions than you tested. Building one immutable artifact and promoting its digest ensures what you tested is what ships.",
      },
      {
        id: "cicd-pipe-q3",
        prompt: "A test fails intermittently and people just re-run the pipeline. What is the right response?",
        choices: [
          { text: "Add automatic retries forever and move on", correct: false },
          { text: "Treat the flaky test as a bug: quarantine it and fix the flakiness, because re-running red erodes trust in CI", correct: true },
          { text: "Delete all tests", correct: false },
          { text: "Disable CI on that repo", correct: false },
        ],
        explanation: "Normalizing 're-run until green' teaches people to ignore red, undermining the whole point of CI. Flaky tests should be quarantined and fixed, not permanently retried.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Build a build-once-deploy-everywhere pipeline",
      brief: "Write a CI/CD workflow that verifies fast, builds one image, and promotes that exact digest to environments.",
      steps: `1. Add a workflow at ".github/workflows/ci-cd.yml" with a "verify" job running lint then tests, using dependency caching.
2. Add a "build" job with "needs: verify" that builds and pushes a single container image tagged by commit SHA, exporting the image digest as a job output.
3. Add a "deploy" job with "needs: build" that consumes the digest (not a rebuild) and deploys "app@<digest>".
4. Configure at least one secret in the repo secret store and reference it in the deploy step; confirm it is masked in logs.
5. Enable layer caching (cache-from/cache-to) and re-run to observe a faster build.
6. Deliberately break a lint rule and confirm the pipeline fails fast in "verify" before ever building.
7. Reflect: identify where you would add a manual approval gate to turn Continuous Deployment into Continuous Delivery.`,
      successCriteria: [
        "Stages run fast-to-slow with caching",
        "One image is built and promoted by digest, not rebuilt",
        "Secrets come from the store and are masked, never hardcoded",
      ],
    },
  },

  {
    slug: "deployment-strategies",
    title: "Deployment Strategies",
    track: "shared",
    phase: "cicd",
    module: "cicd-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "How to release new versions without taking users down: recreate vs rolling vs blue-green vs canary, health checks and automated rollback, decoupling deploy from release with feature flags, and zero-downtime database migrations.",
    prerequisites: ["cicd-pipelines", "k8s-architecture"],
    relatedConcepts: ["gitops-argocd", "k8s-pods-deployments", "cicd-pipelines"],
    tags: ["deployment", "canary", "blue-green", "rolling", "rollback", "migrations"],

    why: `Every deploy is a moment of risk: the new version might crash, be slow, or contain a bug that only shows under real traffic. **Deployment strategies control how much risk each release takes and how fast you can recover.** The naive approach -- stop the old version, start the new one -- means downtime on every deploy and a full-blast-radius outage if the new version is broken. Smarter strategies let you ship continuously while limiting who is exposed to a bad release and how quickly you can undo it.`,

    intuition: `Imagine replacing the engines on a plane. **Recreate** is landing, swapping engines, then taking off -- simple but you are grounded (downtime). **Rolling** swaps one engine at a time while flying -- no downtime, but for a moment old and new engines run together. **Blue-green** is having a second fully-fueled plane ready and instantly switching passengers over -- and switching back if it misbehaves. **Canary** is putting a few passengers on the new plane first, watching their flight, and only moving everyone once it looks safe. The strategies trade **speed, cost, and blast radius** differently.`,

    howItWorks: `- **Recreate:** kill all old instances, then start the new ones. Simple, but incurs downtime and a full-blast-radius risk if the new version is broken.
- **Rolling:** replace instances in batches (e.g. 25% at a time), waiting for each new batch to pass **readiness checks** before proceeding. No downtime; old and new run simultaneously during the roll.
- **Blue-green:** run two full environments (blue = current, green = new). Deploy to green, verify, then switch all traffic to green at once. Rollback is switching back to blue instantly.
- **Canary:** route a small slice of traffic (1-5%) to the new version, watch metrics (errors, latency), then progressively **shift traffic** (5 -> 25 -> 50 -> 100%) if healthy, or roll back if not.
- **Health checks gate everything:** readiness probes decide when an instance can take traffic; liveness restarts stuck instances. Progression waits on real health, not a timer.
- **Automated rollback:** tie progression to metrics (error rate, latency SLOs). If a canary breaches thresholds, the system automatically reverts traffic.
- **Feature flags decouple deploy from release:** ship code dark (behind a flag) and turn the feature on later, independently of the deploy -- and turn it off instantly without redeploying.
- **Zero-downtime DB migrations (expand/contract):** first expand the schema in a backward-compatible way, deploy code that works with both old and new, then contract (remove the old) once nothing uses it.`,

    internals: `- **Rolling requires backward/forward compatibility.** Because old and new run at once, the new version must tolerate old data/requests and vice versa -- especially true across the database.
- **Blue-green needs double the resources** during the switch and a data story: two environments sharing (or migrating) the same database is the hard part, not the app instances.
- **Canary needs real observability.** Without good metrics and enough traffic to be statistically meaningful, a 1% canary tells you nothing. Analysis must compare canary vs baseline, not just absolute numbers.
- **Traffic shifting happens at a layer that can weight backends:** a service mesh, load balancer, or ingress that splits by percentage. Sticky sessions complicate this.
- **Feature flags are why "deploy != release."** A deploy is moving code to prod; a release is exposing behavior to users. Decoupling them lets you deploy safely at any time and release under control -- but flags accumulate as tech debt if never cleaned up.
- **Expand/contract is non-negotiable for zero-downtime schema changes.** A destructive migration (drop/rename a column) run while old code still reads it causes errors. The pattern: add new (expand) -> backfill -> deploy code using new -> stop using old -> drop old (contract), each step reversible.
- **Rollback is the real design constraint.** A strategy is only as good as how fast and safely you can undo it; blue-green and canary shine here, recreate does not.`,

    diagram: {
      title: "From safest-simplest to safest-smartest",
      layers: [
        { id: "recreate", label: "Recreate", sub: "stop all old, start new -- downtime, full blast radius" },
        { id: "rolling", label: "Rolling", sub: "batch replace behind readiness -- no downtime, mixed versions" },
        { id: "bluegreen", label: "Blue-green", sub: "two envs, instant switch + instant rollback -- 2x cost" },
        { id: "canary", label: "Canary", sub: "shift 1->100% by metrics -- smallest blast radius, needs observability" },
        { id: "flags", label: "Feature flags", sub: "deploy != release; toggle without redeploy" },
      ],
      caption: "Pick by risk tolerance, cost, and how fast you must roll back -- and decouple deploy from release with flags.",
    },

    realWorld: `A payments service rolls out a new fraud model behind a canary: 2% of traffic goes to the new version. Within ninety seconds the canary's error rate crosses the SLO threshold and the automated analysis halts the rollout and shifts traffic back to the stable version -- 98% of users never saw the bug, and no human was paged for an emergency rollback. Had they used recreate, every user would have hit the broken model and the fix would have required a full redeploy under pressure.`,

    production: `- **Default to rolling for stateless services; use canary for high-risk or high-traffic changes** where blast radius matters.
- **Gate every progression on readiness probes and real metrics**, never on a fixed sleep.
- **Wire automated rollback to SLO breaches** (error rate, latency) so bad releases revert without a human in the loop.
- **Make all database migrations expand/contract** and deploy code that tolerates both schema versions during the transition.
- **Decouple deploy from release with feature flags**, and schedule flag cleanup so they do not rot into permanent branching.
- **Ensure backward/forward compatibility** for any strategy where old and new run concurrently (rolling, canary).
- **Budget for blue-green's double resources** and solve the shared-database question before adopting it.`,

    commonMistakes: [
      "Running a destructive DB migration (drop/rename) while old code still reads the column, causing errors mid-deploy.",
      "Progressing a rollout on a timer instead of on readiness checks and metrics.",
      "Canarying without enough traffic or metrics to draw a valid conclusion.",
      "Assuming rolling is safe without backward/forward compatibility between old and new versions.",
      "Never cleaning up feature flags, so the codebase rots into unmanaged branching.",
      "Choosing recreate for a user-facing service and accepting downtime plus full blast radius on every deploy.",
    ],

    tradeoffs: `| Strategy | Downtime | Blast radius | Cost | Rollback |
|---|---|---|---|---|
| Recreate | Yes | Full | Low | Redeploy old |
| Rolling | No | Partial (mixed versions) | Low | Roll back batches |
| Blue-green | No | Full on switch | High (2x) | Instant switch back |
| Canary | No | Tiny (small %) | Medium (mesh/obs) | Auto-revert traffic |`,

    whenToUse: [
      "Rolling: default for stateless services that tolerate mixed versions briefly.",
      "Blue-green: when you need instant switch and instant rollback and can afford double resources.",
      "Canary: high-risk or high-traffic changes where you want the smallest possible blast radius with metric-driven rollback.",
    ],
    whenNotToUse: [
      "Recreate for user-facing services where downtime is unacceptable.",
      "Canary without the observability/traffic to make the sample meaningful.",
      "Blue-green when you cannot solve the shared-database problem or afford double capacity.",
    ],

    code: [
      {
        label: "Kubernetes rolling update (RollingUpdate strategy + readiness)",
        language: "yaml",
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 8
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2          # up to 2 extra pods during the roll
      maxUnavailable: 0    # never drop below desired capacity (zero-downtime)
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: ghcr.io/acme/web@sha256:abc123   # promote by digest
          readinessProbe:                         # gates traffic + rollout progression
            httpGet: { path: /healthz, port: 8080 }
            initialDelaySeconds: 5
            periodSeconds: 5`,
      },
      {
        label: "Argo Rollouts canary with metric-driven progression",
        language: "yaml",
        code: `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 5            # send 5% of traffic to the new version
        - pause: { duration: 2m } # observe metrics
        - analysis:              # automated rollback if the query breaches SLO
            templates:
              - templateName: error-rate
        - setWeight: 25
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100         # full rollout only if every gate passed
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: ghcr.io/acme/web@sha256:def456`,
      },
    ],

    memoryCard: {
      problem: "Release new versions without downtime while limiting blast radius and enabling fast rollback.",
      mentalModel: "Swapping plane engines: recreate (land), rolling (one at a time), blue-green (second plane), canary (few passengers first).",
      keyConcepts: [
        "recreate vs rolling vs blue-green vs canary trade downtime/cost/blast radius",
        "readiness probes and metrics gate progression",
        "automated rollback on SLO breach",
        "feature flags: deploy != release",
        "expand/contract for zero-downtime DB migrations",
      ],
      productionConnection: "Rolling by default, canary for risky changes, metric-driven auto-rollback, flags to decouple release, and always expand/contract migrations.",
      oneLiner: "Deployment strategies trade downtime, cost, and blast radius -- canary and blue-green give safe, fast rollback, and flags let you deploy without releasing.",
    },

    quiz: [
      {
        id: "deploy-strat-q1",
        prompt: "What is the defining advantage of a canary deployment?",
        choices: [
          { text: "It requires no monitoring", correct: false },
          { text: "It exposes only a small percentage of traffic to the new version first, minimizing blast radius", correct: true },
          { text: "It always doubles your infrastructure cost", correct: false },
          { text: "It guarantees zero code bugs", correct: false },
        ],
        explanation: "Canary routes a small traffic slice to the new version and progresses based on metrics, so a bad release affects only a few users and can be auto-rolled-back.",
      },
      {
        id: "deploy-strat-q2",
        prompt: "During a rolling deploy, old and new versions run at the same time. What must be true?",
        choices: [
          { text: "The new version can ignore the database", correct: false },
          { text: "The versions must be backward/forward compatible, including with the database schema", correct: true },
          { text: "You must take downtime", correct: false },
          { text: "You must use blue-green instead", correct: false },
        ],
        explanation: "Because both versions serve traffic simultaneously, they must tolerate each other's data and requests -- which is exactly why destructive schema changes need expand/contract.",
      },
      {
        id: "deploy-strat-q3",
        prompt: "Why do feature flags mean 'deploy is not release'?",
        choices: [
          { text: "Because flags replace testing", correct: false },
          { text: "Code can be deployed to prod dark behind a flag and the feature turned on later, independently of the deploy", correct: true },
          { text: "Because flags make deploys slower", correct: false },
          { text: "Because flags store secrets", correct: false },
        ],
        explanation: "A deploy moves code to production; a release exposes behavior. Shipping behind a flag lets you deploy safely anytime and control exposure separately -- and disable instantly without a redeploy.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a safe rollout for a risky change",
      brief: "Plan a canary rollout with metric gates and an expand/contract migration for a schema change.",
      steps: `1. Take a service change that also renames a database column -- a classic zero-downtime hazard.
2. Write the expand step: add the new column, keep the old one, and backfill data; confirm old code still works.
3. Update the app to read/write the new column while tolerating the old, and plan to deploy this via a rolling or canary strategy.
4. Author an Argo Rollouts canary spec (use the sample) with steps 5% -> pause+analysis -> 25% -> 50% -> 100%.
5. Define the rollback trigger: an error-rate/latency threshold that halts progression and shifts traffic back.
6. Only after the new code is fully rolled out and nothing reads the old column, write the contract step: drop the old column.
7. Reflect: at which points is the change reversible, and where would a feature flag give you an even faster off switch than a rollback?`,
      successCriteria: [
        "Sequence an expand/contract migration that never breaks running code",
        "Define a canary with metric-gated progression and rollback",
        "Explain where deploy and release are decoupled",
      ],
    },
  },

  {
    slug: "gitops-argocd",
    title: "GitOps & Argo CD",
    track: "shared",
    phase: "cicd",
    module: "cicd-core",
    difficulty: "advanced",
    estMinutes: 26,
    summary:
      "Making Git the single source of truth for what runs in your cluster: pull-based reconciliation, drift detection and self-heal, Argo CD's Application model, secrets in GitOps, and rollback via git revert.",
    prerequisites: ["cicd-pipelines", "k8s-architecture"],
    relatedConcepts: ["deployment-strategies", "k8s-pods-deployments", "terraform-fundamentals"],
    tags: ["gitops", "argocd", "reconciliation", "declarative", "kubernetes", "drift"],

    why: `In a traditional CI/CD pipeline, the pipeline *pushes* changes into the cluster using powerful credentials, and what is actually running can silently drift from what anyone intended. **GitOps flips this: Git holds the declarative desired state, and an in-cluster agent continuously pulls and reconciles the cluster to match it.** The result is that your version control system is the single source of truth -- every change is a reviewed commit, the running state self-heals to match Git, and rollback is just "git revert".`,

    intuition: `Think of Git as the **master blueprint** and Argo CD as a **diligent builder living inside the cluster** who constantly compares the building to the blueprint and fixes any discrepancy. Nobody walks into the cluster and changes things directly; they change the blueprint (open a PR), and the builder makes reality follow. If someone sneaks in and moves a wall by hand (manual kubectl edit), the builder notices the drift and puts it back. To undo a change, you do not scramble in the cluster -- you revert the blueprint, and the builder rebuilds the old version.`,

    howItWorks: `- **Git is the single source of truth.** The desired state of the cluster (Kubernetes manifests, Helm/Kustomize) lives in a Git repo. Changes happen via pull request, reviewed and merged.
- **Pull vs push:** traditional CI *pushes* to the cluster with credentials that live in the pipeline. GitOps *pulls* -- an agent inside the cluster watches Git and applies changes, so no external system needs cluster admin credentials.
- **Reconciliation loop:** the agent continuously compares desired state (Git) against live state (cluster) and syncs any difference -- the same control-loop idea as Kubernetes itself, extended to your whole app config.
- **Drift detection and self-heal:** if the live cluster diverges from Git (manual change, failure), Argo CD flags it OutOfSync and (with self-heal on) reverts it back to what Git says.
- **Argo CD architecture:** you define an **Application** custom resource that points at a repo/path and a destination cluster/namespace. Argo CD renders the manifests, diffs them, and **syncs**. A dashboard shows sync/health status per resource.
- **Rollback = git revert.** To undo, revert the commit; Argo CD reconciles the cluster back to the previous desired state. History and audit come for free from Git.
- **Progressive delivery** integrates (e.g. Argo Rollouts) so canary/blue-green happens under the same GitOps model.`,

    internals: `- **Pull-based is a security win.** No CI system holds standing cluster-admin credentials; the agent runs inside the cluster with scoped permissions and reaches out to Git (read-only). This shrinks the attack surface dramatically.
- **Reconciliation is level-triggered**, like Kubernetes controllers: Argo CD does not depend on catching a webhook; it periodically compares Git to live and converges, so a missed event does not leave you inconsistent.
- **Self-heal is a double-edged sword.** It guarantees the cluster matches Git -- but it also means a legitimate emergency "kubectl edit" gets reverted unless you also change Git. The discipline is: change Git, not the cluster.
- **Secrets are the hard problem in GitOps** because you cannot commit plaintext secrets to Git. Solutions: **Sealed Secrets** (encrypt so only the in-cluster controller can decrypt; the encrypted blob is safe in Git) or an **external secrets operator** that syncs from Vault/cloud secret managers into the cluster -- Git holds only references, never the secret.
- **Sync waves and hooks** order multi-resource applies (CRDs before the resources that use them; run a migration job before the new pods). Health checks gate whether a sync is considered successful.
- **App-of-apps / ApplicationSets** let one Argo CD Application manage many others, scaling GitOps across many clusters/teams declaratively.
- **Drift status vs health status are different axes:** a resource can be InSync but Unhealthy (matches Git but crashing) or OutOfSync but Healthy (drifted but running) -- you watch both.`,

    diagram: {
      title: "GitOps pull-based reconciliation",
      layers: [
        { id: "git", label: "Git repo", sub: "single source of truth: manifests, reviewed via PR" },
        { id: "app", label: "Argo CD Application", sub: "points at repo/path -> destination cluster/ns" },
        { id: "reconcile", label: "Reconciliation loop", sub: "diff desired (Git) vs live (cluster)" },
        { id: "sync", label: "Sync + self-heal", sub: "apply diffs; revert manual drift back to Git" },
        { id: "secrets", label: "Secrets", sub: "sealed secrets / external operator -- never plaintext in Git" },
      ],
      caption: "An in-cluster agent pulls from Git and continuously reconciles -- rollback is git revert, and drift self-heals.",
    },

    realWorld: `An on-call engineer hotfixes a production incident with a direct "kubectl edit" to bump a replica count. It stops the bleeding -- but ten minutes later Argo CD's self-heal reverts it, because Git still says the old count, and the incident reopens. The lesson (and the GitOps discipline): the fix belongs in Git. They open a one-line PR bumping the replicas, merge it, and Argo CD syncs it permanently and audibly. Later, when the change turns out to be wrong, rolling back is a single "git revert" that Argo CD reconciles -- no cluster archaeology required.`,

    production: `- **Make Git the only way to change the cluster** -- treat manual kubectl changes as incidents, not workflows.
- **Turn on self-heal and drift detection** so the cluster cannot silently diverge from Git.
- **Never commit plaintext secrets;** use Sealed Secrets or an external secrets operator so Git holds only encrypted blobs or references.
- **Use pull-based agents (Argo CD/Flux)** so no CI system holds standing cluster-admin credentials.
- **Order dependent resources with sync waves/hooks** (CRDs and migrations before the workloads that need them).
- **Roll back with git revert**, not manual edits, so the audit trail stays intact.
- **Layer progressive delivery (Argo Rollouts) under GitOps** for metric-gated canary/blue-green with the same source of truth.`,

    commonMistakes: [
      "Making emergency changes with kubectl instead of Git -- self-heal reverts them and the fix is lost.",
      "Committing plaintext secrets to the Git repo (the whole point of GitOps makes this worse, not better).",
      "Keeping push-based pipelines with standing cluster-admin credentials, defeating the security benefit.",
      "Not ordering resources, so an app syncs before its CRD or before its migration job runs.",
      "Confusing sync status with health -- a resource can match Git yet be crashing.",
      "Disabling self-heal 'temporarily' and letting drift accumulate until Git no longer reflects reality.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| GitOps (pull) vs push CI/CD | Git is source of truth, no standing cluster creds, easy audit | Extra agent to run; discipline required (no manual edits) |
| Self-heal on | Cluster cannot silently drift | Emergency manual fixes get reverted unless Git is updated |
| Sealed Secrets | Encrypted secrets safe in Git | Key management; rotation complexity |
| External secrets operator | Secrets stay in Vault/cloud; Git holds refs | Another operator + secret store to run |
| Git revert rollback | Auditable, one command | Only as fast as reconcile + rollout |`,

    whenToUse: [
      "Managing Kubernetes application config declaratively with a reviewed, auditable change process.",
      "When you want the cluster to self-heal back to a known-good, version-controlled state.",
      "Multi-cluster/multi-team environments that need consistent, credential-safe delivery.",
    ],
    whenNotToUse: [
      "Very small setups where an Argo CD/Flux install is more machinery than the workload warrants.",
      "Workflows that genuinely require frequent imperative changes the team is not ready to route through Git.",
      "Non-declarative or non-Kubernetes systems that do not fit the reconcile-from-Git model well.",
    ],

    code: [
      {
        label: "Argo CD Application manifest with automated sync + self-heal",
        language: "yaml",
        code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/gitops-config.git
    targetRevision: main            # the branch/tag that is the source of truth
    path: apps/web/overlays/prod    # Kustomize/Helm path to render
  destination:
    server: https://kubernetes.default.svc
    namespace: web
  syncPolicy:
    automated:
      prune: true                   # delete resources removed from Git
      selfHeal: true                # revert manual drift back to Git
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        maxDuration: 3m`,
      },
      {
        label: "A Sealed Secret (safe to commit; only the in-cluster controller can decrypt)",
        language: "yaml",
        code: `apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: web
spec:
  encryptedData:
    # Encrypted with the cluster's public key; ciphertext is safe in Git.
    # The SealedSecrets controller decrypts it into a real Secret at apply time.
    DATABASE_URL: AgBy8h...encrypted-blob...==
  template:
    metadata:
      name: db-credentials
      namespace: web
    type: Opaque

# Alternative pattern: an external-secrets operator syncs from Vault/cloud
# secret managers, and Git only ever holds a reference, never the value.`,
      },
    ],

    memoryCard: {
      problem: "Make what runs in the cluster provably match version-controlled desired state, safely and auditably.",
      mentalModel: "Git is the master blueprint; an in-cluster builder (Argo CD) constantly reconciles reality to it and self-heals drift.",
      keyConcepts: [
        "Git = single source of truth, changed via PR",
        "pull-based reconciliation (no standing cluster creds)",
        "drift detection + self-heal",
        "Application CRD -> sync; sync vs health status",
        "secrets via sealed secrets / external operator; rollback via git revert",
      ],
      productionConnection: "Change only Git, self-heal on, encrypted/external secrets, pull-based agent, sync waves for ordering, and git revert for auditable rollback.",
      oneLiner: "GitOps makes Git the source of truth and an in-cluster agent continuously reconciles the cluster to it -- self-healing drift and rolling back with git revert.",
    },

    quiz: [
      {
        id: "gitops-q1",
        prompt: "What is the core difference between GitOps (pull) and traditional push-based CI/CD?",
        choices: [
          { text: "GitOps does not use Git", correct: false },
          { text: "An in-cluster agent pulls desired state from Git and reconciles, instead of a pipeline pushing changes with cluster credentials", correct: true },
          { text: "GitOps skips code review", correct: false },
          { text: "GitOps only works without Kubernetes", correct: false },
        ],
        explanation: "In GitOps the cluster runs an agent that pulls from Git and reconciles continuously, so no external pipeline needs standing cluster-admin credentials -- a security and consistency win.",
      },
      {
        id: "gitops-q2",
        prompt: "You fix an incident with a manual 'kubectl edit'. With Argo CD self-heal on, what happens?",
        choices: [
          { text: "The change is kept forever", correct: false },
          { text: "Argo CD detects drift and reverts the cluster back to what Git says, undoing your manual edit", correct: true },
          { text: "Argo CD deletes the whole namespace", correct: false },
          { text: "Git is automatically updated to match your edit", correct: false },
        ],
        explanation: "Self-heal enforces Git as the source of truth. A manual change that is not in Git is drift, and Argo CD reverts it. The correct fix is a commit/PR to Git.",
      },
      {
        id: "gitops-q3",
        prompt: "How do you handle secrets in GitOps without committing plaintext to Git?",
        choices: [
          { text: "Base64-encode them in the repo (that is encryption)", correct: false },
          { text: "Use Sealed Secrets or an external secrets operator so Git holds only encrypted blobs or references", correct: true },
          { text: "Store them in the Argo CD Application name", correct: false },
          { text: "You cannot use secrets with GitOps", correct: false },
        ],
        explanation: "Base64 is encoding, not encryption. Sealed Secrets encrypt so only the in-cluster controller can decrypt (safe in Git), or an external operator keeps secrets in Vault/cloud and Git holds only references.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Bootstrap a GitOps app and prove self-heal",
      brief: "Point Argo CD at a Git repo, sync an app, then cause drift and watch it heal -- and roll back with git revert.",
      steps: `1. Put a small Kubernetes manifest set (a Deployment + Service) in a Git repo under "apps/web".
2. Create an Argo CD "Application" (use the sample) pointing at that repo/path with "automated" sync, "prune", and "selfHeal" enabled.
3. Sync and confirm the app shows Synced + Healthy in the Argo CD dashboard.
4. Cause drift: "kubectl scale deployment web --replicas=5" directly in the cluster.
5. Watch Argo CD flag OutOfSync and self-heal it back to the replica count declared in Git.
6. Make a legitimate change the right way: open a PR bumping replicas in Git, merge, and watch Argo CD sync it permanently.
7. Roll back by reverting that commit ("git revert") and confirm Argo CD reconciles the cluster to the previous state. Then add a Sealed Secret and confirm it decrypts into a usable Secret.`,
      successCriteria: [
        "Demonstrate pull-based sync from Git to cluster",
        "Show drift being auto-healed back to Git",
        "Roll back via git revert and handle a secret without plaintext in Git",
      ],
    },
  },
];
