import type { Lesson } from "../types";

export const awsLessons: Lesson[] = [
  {
    slug: "aws-vpc-networking",
    title: "AWS VPC & Networking",
    track: "shared",
    phase: "aws",
    module: "aws-core",
    difficulty: "core",
    estMinutes: 28,
    summary:
      "The software-defined network that isolates your AWS resources -- subnets, route tables, gateways, and security groups -- and the reachability failures that eat entire debugging afternoons.",
    prerequisites: ["tcp", "dns"],
    relatedConcepts: ["aws-ec2-compute", "aws-iam", "load-balancing"],
    tags: ["aws", "vpc", "networking", "subnet", "security-group"],

    why: `Every non-trivial AWS resource lives inside a network, and by default that network is *yours alone*. **A VPC (Virtual Private Cloud) is a logically isolated slice of AWS's network where you control the IP range, subnetting, routing, and firewalling.**

Without a VPC you would have no way to say "this database is only reachable from these app servers, and nothing on the public internet can touch it." The VPC is the boundary that makes multi-tenant cloud safe: your packets never mingle with another customer's, and *you* decide what can talk to what.

Almost every "why can't my app reach the database" incident on AWS bottoms out in VPC configuration -- a missing route, a closed security group, a subnet with no path to the internet. Understanding the VPC model is the difference between a five-minute fix and a five-hour one.`,

    intuition: `Think of a VPC as **a private office building you lease inside a giant shared campus.**

- The **building's address block** is the VPC CIDR (e.g. \`10.0.0.0/16\`) -- your private range of rooms.
- **Floors** are subnets. Some floors have a door to the street (public subnets); some are interior-only (private subnets).
- The **route table** is the building directory that says "to reach the street, go through the lobby (internet gateway); to reach the mail room, go down the hall."
- **Security groups** are bouncers at each room's door who check "who are you and what port do you want?" -- and they remember who they let in (stateful).
- **Network ACLs** are the guards at each floor's entrance, checking everyone in *and* out with a rigid list (stateless).

A packet that can't reach its destination is almost always stopped by a missing directory entry (route) or a bouncer (security group).`,

    howItWorks: `### 1. CIDR and subnets
You give the VPC a private CIDR block (\`10.0.0.0/16\` = 65k addresses). You carve it into **subnets**, each pinned to **one Availability Zone**. A subnet is "public" or "private" purely based on its **route table**, not a checkbox.

### 2. Route tables decide reachability
- A **public subnet** has a route \`0.0.0.0/0 -> Internet Gateway (IGW)\`.
- A **private subnet** routes \`0.0.0.0/0 -> NAT Gateway\` so instances can make *outbound* connections (pull packages, call APIs) but cannot receive unsolicited *inbound* traffic.
- Local VPC traffic (\`10.0.0.0/16 -> local\`) is always routable and cannot be removed.

### 3. Gateways
- **Internet Gateway (IGW):** the door to the public internet; needed for public IPs to work.
- **NAT Gateway:** lets private instances reach out without being reachable; managed, per-AZ, and it *costs money per hour and per GB*.
- **VPC Endpoints:** private routes to AWS services (S3, DynamoDB via Gateway endpoints; others via Interface endpoints) so traffic never leaves the AWS network.

### 4. Two firewalls, different models
- **Security Groups** are attached to an ENI (instance/LB). **Stateful**: if you allow inbound, the response is automatically allowed. Only "allow" rules; default-deny.
- **Network ACLs** are attached to a subnet. **Stateless**: you must allow both directions explicitly. Support "deny" rules; evaluated in numbered order.`,

    internals: `- **A subnet is one AZ.** To be highly available you need at least two subnets in two AZs; a single-subnet design dies with its AZ.
- **AWS reserves 5 IPs per subnet** (network, VPC router, DNS, future use, broadcast). A \`/28\` gives you 11 usable, not 16.
- **Security groups reference other security groups**, not just CIDRs. "Allow the app SG to reach the DB SG on 5432" is the idiomatic, self-documenting pattern -- IPs change, SG references don't.
- **NACL rules are evaluated lowest-number-first**, and the first match wins; a broad deny at rule 100 masks a narrow allow at rule 200.
- **NAT Gateways are AZ-scoped.** If your NAT lives in AZ-a and AZ-a fails, private instances in AZ-b lose internet unless you deployed a NAT per AZ (which is the recommended, if pricier, pattern).
- **DNS resolution inside a VPC** depends on \`enableDnsSupport\` and \`enableDnsHostnames\`; forget these and internal service names silently fail to resolve.
- **VPC peering is not transitive.** A peered to B and B peered to C does not let A reach C -- a Transit Gateway is the scalable answer.`,

    diagram: {
      title: "Anatomy of a two-AZ VPC",
      layers: [
        { id: "vpc", label: "VPC 10.0.0.0/16", sub: "isolated network, your CIDR" },
        { id: "public", label: "Public subnets (per AZ)", sub: "route 0.0.0.0/0 -> IGW; hosts LB + NAT" },
        { id: "private", label: "Private subnets (per AZ)", sub: "route 0.0.0.0/0 -> NAT; app + DB" },
        { id: "sg", label: "Security groups (stateful)", sub: "app SG -> db SG on 5432" },
        { id: "endpoints", label: "VPC endpoints", sub: "private path to S3/DynamoDB, no internet" },
      ],
      caption: "Public vs private is defined by the route table, not a flag. Two AZs = survives one AZ failure.",
    },

    realWorld: `Your app on an EC2 instance in a private subnet suddenly can't pull Docker images or call the Stripe API, but it *can* reach the database. Nothing in the app changed. The cause: the single NAT Gateway lived in AZ-a, AZ-a had a partial outage, and every private instance across all AZs routed its outbound traffic through that one dead NAT. Internal (VPC-local) traffic to the DB kept working because it never touched the NAT. The fix is architectural, not a code change: one NAT Gateway per AZ, each private subnet routing to its own AZ's NAT. This single decision is one of the most common resilience gaps in real AWS accounts.`,

    production: `- **Deploy across at least two AZs**, with a subnet per AZ per tier (public/app/data).
- **One NAT Gateway per AZ** for resilience; if cost matters more than HA in non-prod, one NAT is acceptable -- decide deliberately.
- **Use VPC Gateway Endpoints for S3 and DynamoDB** -- they are free and keep that traffic off the NAT, cutting both cost and blast radius.
- **Reference security groups, not CIDRs**, between your own tiers so rules survive scaling and IP churn.
- **Keep databases in private subnets with no route to the internet**; reach them via a bastion, SSM Session Manager, or a VPN.
- **Enable VPC Flow Logs** so "who tried to talk to what" is answerable during an incident.
- **Plan CIDRs to not overlap** across VPCs/accounts you might peer later; overlapping ranges block peering forever.`,

    commonMistakes: [
      "Assuming a subnet is public because it has a public IP -- without a 0.0.0.0/0 -> IGW route it is not reachable.",
      "Running a single NAT Gateway and losing all outbound traffic when its AZ fails.",
      "Using a Network ACL like a security group and forgetting NACLs are stateless (must allow return traffic explicitly).",
      "Hardcoding CIDRs in security group rules instead of referencing the peer security group.",
      "Sizing a subnet with a /28 and being surprised only 11 of 16 IPs are usable.",
      "Overlapping VPC CIDRs, then discovering you can never peer them.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Public subnet | Direct inbound/outbound internet | Larger attack surface; needs tight SGs |
| Private subnet + NAT | Outbound only, no inbound exposure | NAT hourly + per-GB charges |
| VPC Endpoint (Gateway) | Free, private, no NAT | Only S3 + DynamoDB; region-scoped |
| Security Group (stateful) | Simple, return traffic auto-allowed | Allow-only; no deny rules |
| Network ACL (stateless) | Subnet-wide deny rules | Must manage both directions manually |
| One NAT vs NAT-per-AZ | Cheaper vs resilient | Single point of failure vs higher cost |`,

    whenToUse: [
      "Any workload that needs network isolation, tiered access, or private data stores (i.e. essentially all of them).",
      "Multi-AZ designs where surviving a single AZ failure is required.",
      "Private connectivity to AWS services without traversing the internet (VPC endpoints).",
    ],
    whenNotToUse: [
      "Fully serverless stacks (some Lambda/API Gateway/S3 designs) where you can avoid managing a VPC at all -- adding one just to have one increases complexity and NAT cost.",
      "Do not put Lambda in a VPC unless it truly needs VPC-only resources; it adds cold-start and ENI management overhead.",
    ],

    code: [
      {
        label: "Security group: app tier may reach DB tier on 5432 (Terraform)",
        language: "hcl",
        code: `resource "aws_security_group" "db" {
  name   = "db-tier"
  vpc_id = aws_vpc.main.id
}

# Reference the app SG, not a CIDR -- survives scaling and IP churn.
resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
}`,
      },
      {
        label: "Diagnose reachability from an instance",
        language: "bash",
        code: `# Which route table serves this subnet, and does it have an internet path?
aws ec2 describe-route-tables \\
  --filters "Name=association.subnet-id,Values=subnet-0abc123" \\
  --query "RouteTables[].Routes"

# What is actually allowed in / out of the instance?
aws ec2 describe-security-groups --group-ids sg-0abc123 \\
  --query "SecurityGroups[].IpPermissions"

# From the instance: can we even leave the VPC?
curl -sS -m 5 https://checkip.amazonaws.com || echo "no outbound path (check NAT/route)"`,
      },
    ],

    memoryCard: {
      problem: "Isolate your AWS resources into a private, controllable network and decide precisely what can reach what.",
      mentalModel: "A private office building on a shared campus: floors are subnets, the directory is the route table, bouncers are security groups.",
      keyConcepts: ["VPC CIDR + subnets (one per AZ)", "route table defines public vs private", "IGW / NAT / VPC endpoints", "security groups (stateful) vs NACLs (stateless)", "SG references over CIDRs"],
      productionConnection: "Multi-AZ subnets, NAT-per-AZ, gateway endpoints for S3/DynamoDB, DBs in private subnets, and Flow Logs for incident forensics.",
      oneLiner: "A VPC is your private, software-defined AWS network where route tables decide reachability and security groups decide who talks to whom.",
    },

    quiz: [
      {
        id: "vpc-q1",
        prompt: "What actually makes a subnet 'public' in a VPC?",
        choices: [
          { text: "A checkbox labeled 'public' when creating it", correct: false },
          { text: "A route in its route table sending 0.0.0.0/0 to an Internet Gateway", correct: true },
          { text: "Assigning it a /24 CIDR", correct: false },
          { text: "Putting a database in it", correct: false },
        ],
        explanation: "Public vs private is purely a routing property: a subnet is public when its route table sends internet-bound traffic (0.0.0.0/0) to an Internet Gateway. There is no 'public' flag.",
      },
      {
        id: "vpc-q2",
        prompt: "How do security groups differ from network ACLs?",
        choices: [
          { text: "Security groups are stateless; NACLs are stateful", correct: false },
          { text: "Security groups are stateful (return traffic auto-allowed) and allow-only; NACLs are stateless and support deny rules", correct: true },
          { text: "They are identical, just named differently", correct: false },
          { text: "NACLs attach to instances; security groups attach to subnets", correct: false },
        ],
        explanation: "Security groups are stateful and only have allow rules, attached to ENIs. NACLs are stateless (you must allow both directions), support explicit deny, and attach to subnets.",
      },
      {
        id: "vpc-q3",
        prompt: "Private instances across all AZs lose internet access. What is the most likely single cause?",
        choices: [
          { text: "The Internet Gateway was detached", correct: false },
          { text: "A single shared NAT Gateway's AZ failed, and every private subnet routed outbound through it", correct: true },
          { text: "DNS TTL expired", correct: false },
          { text: "Security groups reset to default", correct: false },
        ],
        explanation: "A single NAT Gateway is AZ-scoped. If all private subnets route 0.0.0.0/0 to that one NAT and its AZ fails, outbound dies everywhere. The fix is one NAT per AZ.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a resilient two-AZ VPC",
      brief: "Lay out CIDRs, subnets, routing, and firewalling for a web + app + database stack that survives one AZ failure and keeps the database off the internet.",
      steps: `1. Pick a non-overlapping VPC CIDR (e.g. 10.20.0.0/16) and carve 6 subnets: public/app/data across 2 AZs.\n2. Public subnets route 0.0.0.0/0 -> IGW; place one NAT Gateway per AZ in the public subnets.\n3. App + data subnets route 0.0.0.0/0 -> their own AZ's NAT.\n4. Add a Gateway VPC Endpoint for S3 so backups skip the NAT.\n5. Security groups: LB SG -> app SG on 443/80; app SG -> db SG on 5432; nothing else inbound to db.\n6. Confirm the data subnets have NO route to the IGW.`,
      successCriteria: [
        "Two AZs with a subnet per tier per AZ",
        "One NAT Gateway per AZ (no single point of failure)",
        "Database subnets have no internet gateway route",
        "Security groups reference peer SGs, not CIDRs",
      ],
    },
  },

  {
    slug: "aws-ec2-compute",
    title: "EC2 & Compute",
    track: "shared",
    phase: "aws",
    module: "aws-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "Renting virtual machines by the second -- instance families, purchasing models, autoscaling, and the failure modes (noisy neighbors, credit exhaustion, spot reclamation) that turn cheap compute expensive.",
    prerequisites: ["aws-vpc-networking"],
    relatedConcepts: ["aws-iam", "aws-vpc-networking", "load-balancing"],
    tags: ["aws", "ec2", "compute", "autoscaling", "spot"],

    why: `Before cloud, adding capacity meant buying a server, racking it, and waiting weeks -- and if you over-bought, that money was gone. **EC2 exists to turn compute into an on-demand, per-second utility**: you launch a virtual machine in seconds, pay only while it runs, and destroy it when done.

That elasticity is the whole point of the cloud, but it comes with a bill that scales just as fast in the wrong direction. Most cloud cost overruns and a surprising number of performance incidents are EC2 decisions made without understanding instance families, purchasing models, or how AWS shares physical hardware among tenants. Knowing EC2 well is what keeps compute both fast and affordable.`,

    intuition: `EC2 is **renting a car instead of buying one.**

- You pick a **class** for the job: an economy car (\`t\`-family, burstable) for light errands, an SUV (\`m\`-family, balanced) for general use, a race car (\`c\`-family, compute) for track days, a moving van (\`r\`-family, memory) for hauling.
- **On-Demand** is renting by the day at the counter -- flexible, most expensive.
- **Reserved / Savings Plans** is a yearly lease -- big discount for commitment.
- **Spot** is taking a rental the agency needs to move off the lot -- up to 90% off, but they can demand it back with two minutes' notice.

And because it is a *shared* fleet, the burstable economy cars run on a credit system: drive gently and you bank credits; floor it constantly and you run out and get throttled to a crawl.`,

    howItWorks: `### Instance families
Named like \`m6i.large\`: family + generation + capability + size.
- **t (burstable):** cheap baseline CPU + CPU credits for bursts. Great for spiky, low-average workloads.
- **m (general):** balanced CPU:memory. The default safe choice.
- **c (compute):** high CPU per dollar for batch, encoding, gaming servers.
- **r / x (memory):** big RAM for caches, in-memory DBs, analytics.
- **Storage / GPU families** for I/O-heavy or ML workloads.

### Purchasing models
- **On-Demand:** no commitment, highest per-hour price. Baseline for unpredictable load.
- **Reserved Instances / Savings Plans:** commit 1-3 years for up to ~72% off. For steady baseline capacity.
- **Spot:** spare capacity at up to ~90% off, but AWS can reclaim it with a **2-minute warning**. For fault-tolerant, interruptible work.

### Auto Scaling Groups (ASG)
An ASG maintains a **desired count** of instances across AZs, replaces unhealthy ones, and scales on metrics (CPU, request count, or a custom target). Paired with a load balancer and a **launch template**, it turns "N servers" into a self-healing, elastic fleet.

### Storage
Root and data volumes are **EBS** (network-attached, persists independently of the instance). Some families offer **instance store** (physically attached, blazing fast, but *wiped* when the instance stops).`,

    internals: `- **Burstable credits are real and merciless.** A \`t3\` earns CPU credits at baseline; sustained load above baseline drains them, then you are throttled to baseline (or billed for surplus in unlimited mode). A CPU graph pinned at exactly ~20% is the signature of credit exhaustion, not a healthy plateau.
- **Noisy neighbors:** on shared tenancy your instance shares physical hardware; another tenant's spike can steal CPU (visible as \`%steal\` in \`top\`). Larger sizes and dedicated instances reduce this.
- **Spot interruption is a lifecycle event**, not a crash. AWS sends a 2-minute warning via instance metadata; well-behaved apps drain connections and checkpoint state in that window.
- **EBS is network storage.** Its throughput/IOPS are provisioned and can become the bottleneck; \`gp3\` lets you buy IOPS independent of size, unlike older \`gp2\`.
- **Instance store data does not survive a stop/start** (it can survive a reboot). Never put anything you can't lose on it.
- **Stopping an instance frees the compute** (you stop paying for it) but you keep paying for the EBS volume; **terminating** deletes the instance and, by default, its root volume.
- **The instance metadata service (IMDS)** at 169.254.169.254 hands out temporary IAM credentials; IMDSv2 (session-token based) exists specifically to block SSRF attacks that stole them from IMDSv1.`,

    diagram: {
      title: "Elastic EC2 fleet behind a load balancer",
      layers: [
        { id: "template", label: "Launch template", sub: "AMI + instance type + IAM role + user-data" },
        { id: "asg", label: "Auto Scaling Group", sub: "desired count across AZs, self-healing" },
        { id: "mix", label: "Capacity mix", sub: "On-Demand baseline + Spot for burst" },
        { id: "lb", label: "Load balancer + health checks", sub: "routes only to healthy instances" },
        { id: "ebs", label: "EBS volumes", sub: "persist independently of the instance" },
      ],
      caption: "A launch template + ASG + LB turns raw VMs into a self-healing, cost-mixed, elastic service.",
    },

    realWorld: `A team ships a new service on cheap \`t3.micro\` instances and it is fast in testing. Under real traffic it is snappy for 20 minutes each morning, then crawls -- every day, same pattern. CPU sits pinned at ~20%. It is not a code bug: the burstable instances earned credits overnight, spent them during the morning peak, then got throttled to baseline. The two candidate fixes are (a) switch to \`t3.unlimited\` and pay for surplus bursts, or (b) move to an \`m\`-family instance with no credit ceiling. The lesson: burstable instances are for *spiky, low-average* load, not for sustained daytime traffic -- picking the wrong family looks exactly like a mysterious performance regression.`,

    production: `- **Right-size from real metrics, not guesses.** Start with \`m\`-family, then move to \`c\` or \`r\` only when CPU or memory pressure proves it.
- **Reserve or use Savings Plans for your steady baseline**, and use On-Demand + Spot for the elastic layer on top.
- **Run stateless, interruptible workloads on Spot** with a diversified instance mix so one capacity pool drying up doesn't take you down.
- **Handle the Spot 2-minute warning:** drain the LB, checkpoint, exit cleanly.
- **Always attach an IAM role to instances** instead of baking access keys into the AMI or user-data.
- **Enforce IMDSv2** to prevent credential theft via SSRF.
- **Use gp3 EBS** and provision IOPS to the workload; monitor volume queue depth.
- **Bake AMIs (immutable) rather than configuring at boot** for fast, repeatable scaling.`,

    commonMistakes: [
      "Running sustained production load on burstable (t-family) instances and hitting credit throttling.",
      "Using Spot for stateful or non-interruptible work and losing data on reclamation.",
      "Baking long-lived AWS access keys into an AMI instead of attaching an IAM role.",
      "Storing important data on instance store, then losing it on a stop/start.",
      "Never buying Reserved/Savings Plans for obviously steady baseline capacity (pure On-Demand waste).",
      "Ignoring %steal and blaming the app for slowness caused by noisy neighbors.",
      "Leaving IMDSv1 enabled, exposing temporary credentials to SSRF.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| On-Demand | No commitment, instant | Highest per-hour price |
| Reserved / Savings Plan | Up to ~72% cheaper | 1-3 year commitment, less flexibility |
| Spot | Up to ~90% cheaper | Can be reclaimed with 2-min warning |
| Burstable (t) | Very cheap for spiky load | Throttled when credits run out |
| Larger/dedicated instance | Fewer noisy-neighbor effects | More expensive |
| Instance store | Fastest local disk | Data lost on stop/terminate |
| EBS | Durable, detachable | Network latency; provisioned IOPS cost |`,

    whenToUse: [
      "Long-running services, stateful workloads, or anything needing OS-level control and predictable performance.",
      "Batch/compute jobs that are interruption-tolerant (great Spot candidates).",
      "Workloads that don't fit serverless limits (long runtimes, big memory, custom kernels/GPUs).",
    ],
    whenNotToUse: [
      "Short, event-driven, spiky functions where Lambda removes all instance management.",
      "Simple containerized services where Fargate avoids managing the VM layer entirely.",
      "Sustained production CPU load on burstable instances (wrong family for the job).",
    ],

    code: [
      {
        label: "Launch a Spot instance with an IAM role and IMDSv2 required (AWS CLI)",
        language: "bash",
        code: `aws ec2 run-instances \\
  --image-id ami-0abc123 \\
  --instance-type c6i.large \\
  --iam-instance-profile Name=app-instance-role \\
  --instance-market-options '{"MarketType":"spot"}' \\
  --metadata-options 'HttpTokens=required,HttpEndpoint=enabled' \\
  --subnet-id subnet-0priv123 \\
  --security-group-ids sg-0app123`,
      },
      {
        label: "Detect and react to a Spot interruption notice (on-instance)",
        language: "bash",
        code: `# IMDSv2: get a session token first, then read the interruption metadata.
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \\
  -H "X-aws-ec2-metadata-token-ttl-seconds: 300")

while true; do
  action=$(curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" \\
    http://169.254.169.254/latest/meta-data/spot/instance-action)
  if [ -n "$action" ]; then
    echo "Spot reclaim incoming: $action -- draining and checkpointing"
    /opt/app/graceful-drain.sh
    break
  fi
  sleep 5
done`,
      },
    ],

    memoryCard: {
      problem: "Get on-demand virtual machines that scale in seconds without over-buying hardware or over-paying for it.",
      mentalModel: "Renting cars: pick the class for the job, and choose daily rate (On-Demand), lease (Reserved), or off-the-lot deal that can be recalled (Spot).",
      keyConcepts: ["instance families (t/m/c/r)", "On-Demand vs Reserved vs Spot", "Auto Scaling Groups + launch templates", "burstable CPU credits", "EBS vs instance store", "IMDSv2 + IAM roles"],
      productionConnection: "Reserved baseline + Spot burst, m-family default, IAM roles over keys, IMDSv2 enforced, and graceful handling of the Spot 2-minute warning.",
      oneLiner: "EC2 is per-second rented compute where the family sets performance and the purchasing model sets the bill -- pick both deliberately.",
    },

    quiz: [
      {
        id: "ec2-q1",
        prompt: "A service on t3 instances is fast for 20 minutes each morning then crawls, with CPU pinned near 20%. Why?",
        choices: [
          { text: "The load balancer is broken", correct: false },
          { text: "Burstable CPU credits are exhausted, throttling the instance to its baseline", correct: true },
          { text: "The EBS volume ran out of space", correct: false },
          { text: "DNS caching returned a stale IP", correct: false },
        ],
        explanation: "Burstable (t-family) instances earn CPU credits at a baseline rate and spend them to burst. Sustained load drains the credits, after which the instance is throttled to baseline -- exactly the 'pinned at ~20%' signature.",
      },
      {
        id: "ec2-q2",
        prompt: "What is the defining risk of Spot instances?",
        choices: [
          { text: "They cost more than On-Demand", correct: false },
          { text: "AWS can reclaim them with a 2-minute warning", correct: true },
          { text: "They cannot use EBS volumes", correct: false },
          { text: "They only run in a single AZ", correct: false },
        ],
        explanation: "Spot uses spare capacity at a deep discount, but AWS can reclaim it whenever it needs the capacity, giving only a 2-minute interruption notice. Use it for fault-tolerant, interruptible workloads.",
      },
      {
        id: "ec2-q3",
        prompt: "What is the recommended way for an EC2 app to call AWS APIs?",
        choices: [
          { text: "Bake a long-lived access key/secret into the AMI", correct: false },
          { text: "Attach an IAM role (instance profile) so the app gets rotating temporary credentials", correct: true },
          { text: "Store the root account password in user-data", correct: false },
          { text: "Hardcode credentials in an environment variable in the app config", correct: false },
        ],
        explanation: "Attaching an IAM role provides automatically rotated temporary credentials via the metadata service -- no static secrets to leak. Enforce IMDSv2 to protect those credentials from SSRF theft.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Choose a cost-effective, resilient compute plan",
      brief: "Given a web tier with a steady 4-instance baseline plus a spiky nightly batch job, design the instance families, purchasing mix, and scaling.",
      steps: `1. Web tier: pick m-family (balanced), size from expected CPU/memory; not burstable (sustained load).\n2. Cover the steady 4-instance baseline with a Compute Savings Plan or Reserved Instances.\n3. Put the elastic peak on top with On-Demand in an ASG scaling on request count.\n4. Nightly batch job is interruption-tolerant -> run on Spot with a diversified instance mix.\n5. Add Spot interruption handling (drain + checkpoint on the 2-minute notice).\n6. Attach an IAM role to all instances and require IMDSv2.`,
      successCriteria: [
        "Baseline covered by a commitment (Reserved/Savings Plan)",
        "Burst on On-Demand, batch on Spot with interruption handling",
        "No burstable instances used for sustained load",
        "IAM roles + IMDSv2 instead of static keys",
      ],
    },
  },

  {
    slug: "aws-rds",
    title: "RDS: Managed Databases",
    track: "shared",
    phase: "aws",
    module: "aws-core",
    difficulty: "core",
    estMinutes: 26,
    summary:
      "Managed relational databases -- AWS runs the engine, backups, patching, and failover; you keep the schema and queries. Understand Multi-AZ vs read replicas, failover behavior, and the connection-storm failure mode.",
    prerequisites: ["aws-vpc-networking"],
    relatedConcepts: ["aws-ec2-compute", "aws-iam", "cap-theorem"],
    tags: ["aws", "rds", "database", "multi-az", "replica"],

    why: `Running a production database yourself means owning backups, point-in-time recovery, minor and major version patching, replication, failover, storage growth, and 3am pager duty when the disk fills. That is a full-time specialty. **RDS exists to hand the undifferentiated operational toil of a relational database to AWS** while you keep control of the part that is actually your business: the schema, the queries, and the data.

The trap is assuming "managed" means "no responsibility." RDS removes the OS and engine ops, but connection management, failover behavior, replication lag, and cost are still very much yours to design. Most RDS incidents come from misunderstanding exactly where that line sits.`,

    intuition: `RDS is **hiring a hotel instead of owning a house.**

- Housekeeping, plumbing, and the fire alarm (backups, patching, monitoring) are handled for you.
- If a pipe bursts in your room at night, the hotel moves you to an identical room automatically (Multi-AZ failover) -- your address (endpoint) stays the same, you just briefly lose access during the move.
- Want more people reading the newspaper without disturbing your room? Open reading rooms (read replicas) that get a slightly delayed copy of the news (replication lag).
- But *what you do in the room* -- how you arrange furniture, how many guests you cram in (connections), what you order (queries) -- is still entirely on you, and you can absolutely trash the room yourself.`,

    howItWorks: `### The managed part
AWS runs the OS and DB engine (Postgres, MySQL, MariaDB, Oracle, SQL Server, or Aurora), and handles **automated backups, point-in-time recovery, minor version patching, storage autoscaling, and monitoring**. You interact through an **endpoint (DNS name)**, not an IP.

### Multi-AZ (high availability, NOT scaling)
A **synchronous standby** replica in another AZ. On primary failure, RDS **fails over by flipping the endpoint DNS to the standby**, typically in ~60-120 seconds. The standby serves *no* traffic normally -- it is purely for availability, not read scaling.

### Read replicas (scaling reads, NOT HA)
**Asynchronous** copies you can direct read traffic to, offloading the primary. They lag behind the primary (replication lag) and are *not* automatic failover targets in the plain-RDS model. Reads from a replica can be stale.

### Aurora (AWS's cloud-native engine)
Separates compute from a shared, distributed storage layer replicated 6 ways across 3 AZs. Failover is faster, replicas share storage (so lag is tiny), and it scales reads to 15 replicas. MySQL/Postgres-compatible.

### Backups and recovery
Automated daily snapshots + continuous transaction logs give **point-in-time recovery** to any second in the retention window. Manual snapshots persist until you delete them.`,

    internals: `- **Failover is a DNS change.** Clients that cache the resolved IP (or hold dead connections) keep hitting the old primary until they reconnect. Short DNS TTL and connection-pool validation matter; this is why apps often see errors for longer than the advertised failover time.
- **Multi-AZ standby is invisible for reads.** A common, expensive mistake is expecting Multi-AZ to also scale reads -- it does not; you need read replicas for that.
- **Replica lag is real and variable.** A read-after-write against a lagging replica can return stale data; route critical read-after-write to the primary.
- **Connection storms kill RDS.** Each connection costs memory; when the primary hiccups and hundreds of app instances all reconnect at once, the flood can knock the database over again. A **connection pooler (RDS Proxy or PgBouncer)** absorbs this.
- **Storage autoscaling has a ceiling and a cooldown**; a runaway write can still fill the disk faster than it grows, and a full disk stops writes entirely.
- **Major version upgrades are not automatic** and can require downtime and testing -- "managed" covers minor patches, not major migrations.
- **The maintenance window can cause a brief failover/restart**; schedule it for low traffic.`,

    diagram: {
      title: "RDS Multi-AZ + read replicas",
      layers: [
        { id: "app", label: "App tier (pooled)", sub: "connects to writer + reader endpoints" },
        { id: "primary", label: "Primary (writer)", sub: "all writes + consistent reads" },
        { id: "standby", label: "Multi-AZ standby", sub: "synchronous; failover target; serves no traffic" },
        { id: "replica", label: "Read replicas", sub: "asynchronous; scale reads; can be stale" },
        { id: "backup", label: "Backups + PITR", sub: "snapshots + tx logs -> point-in-time recovery" },
      ],
      caption: "Multi-AZ = availability (invisible standby). Read replicas = read scaling (visible, laggy). They solve different problems.",
    },

    realWorld: `An RDS Postgres primary has a brief AZ hiccup and Multi-AZ does its job: it fails over to the standby in about 90 seconds. But the application stays broken for ten minutes, not ninety seconds. Why? Every one of 200 app pods had a full connection pool of now-dead connections; when the endpoint flipped, all 200 pods slammed the new primary with reconnection attempts simultaneously -- a connection storm that overwhelmed the fresh database before it could stabilize. The database didn't cause the long outage; the reconnection stampede did. Fixing it meant putting **RDS Proxy** in front to pool and throttle connections, plus enabling pool connection validation so dead connections are detected fast. The lesson: managed failover handles the database, but your connection strategy handles the recovery.`,

    production: `- **Use Multi-AZ for any production database** -- it is the difference between a 90-second blip and a manual restore.
- **Put a connection pooler (RDS Proxy / PgBouncer) in front** to survive failovers and cap connections; databases have far lower connection ceilings than app fleets assume.
- **Route reads to replicas, but keep read-after-write on the primary** where staleness would break correctness.
- **Test failover deliberately** (reboot with failover) so you know your real recovery time, not the brochure number.
- **Set backup retention and verify restores** -- an untested backup is a hope, not a plan.
- **Alarm on replica lag, connection count, free storage, and CPU credits** (for burstable DB classes).
- **Schedule the maintenance window** for the lowest-traffic hour and expect a brief failover.
- **Consider Aurora** when you need fast failover, low replica lag, and higher read scale.`,

    commonMistakes: [
      "Expecting Multi-AZ to scale reads -- it does not; the standby serves no traffic.",
      "No connection pooler, so a failover triggers a connection storm that re-downs the database.",
      "Reading immediately after a write from a lagging replica and getting stale data.",
      "Assuming 'managed' means major version upgrades happen automatically and without downtime.",
      "Never testing a restore, then discovering during an incident the backup is unusable.",
      "Running the DB in a public subnet or with an over-broad security group.",
      "Ignoring free-storage alarms until a full disk halts all writes.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| Multi-AZ | Automatic failover, HA | Roughly 2x cost; no read scaling |
| Read replica | Scales reads, offloads primary | Async lag; not auto-failover (plain RDS) |
| Self-managed on EC2 | Full control, any extension | You own all the ops and 3am pages |
| Aurora | Fast failover, low lag, 15 replicas | Higher cost; AWS-specific engine |
| Larger instance class | More connections/throughput | Linear cost increase |
| Long backup retention | Deeper recovery window | More snapshot storage cost |`,

    whenToUse: [
      "Any relational workload where you want AWS to own backups, patching, and failover.",
      "Read-heavy apps that can offload to replicas (with staleness understood).",
      "Teams without dedicated DBAs who still need production-grade durability and HA.",
    ],
    whenNotToUse: [
      "Workloads needing OS-level DB tuning, unsupported extensions, or filesystem access -- self-manage on EC2.",
      "Extreme scale or exotic engines RDS doesn't offer.",
      "Simple key-value or high-write telemetry better served by DynamoDB or a purpose-built store.",
    ],

    code: [
      {
        label: "Create a Multi-AZ Postgres instance in private subnets (AWS CLI)",
        language: "bash",
        code: `aws rds create-db-instance \\
  --db-instance-identifier prod-orders \\
  --engine postgres \\
  --db-instance-class db.m6g.large \\
  --allocated-storage 100 --max-allocated-storage 500 \\
  --multi-az \\
  --db-subnet-group-name private-db-subnets \\
  --vpc-security-group-ids sg-0db123 \\
  --backup-retention-period 14 \\
  --storage-encrypted \\
  --no-publicly-accessible`,
      },
      {
        label: "Route reads to a replica but read-after-write to the primary (pseudo-config)",
        language: "yaml",
        code: `datasources:
  writer:
    host: prod-orders.cluster-xyz.rds.amazonaws.com   # primary / writer endpoint
    use_for: [writes, read_after_write, critical_reads]
  reader:
    host: prod-orders.cluster-ro-xyz.rds.amazonaws.com # reader endpoint (may lag)
    use_for: [reports, dashboards, non_critical_reads]

# Rule: if a request just wrote, its subsequent read MUST hit the writer,
# because the reader can be seconds behind (replication lag).`,
      },
    ],

    memoryCard: {
      problem: "Run a durable, highly-available relational database without owning backups, patching, replication, and failover.",
      mentalModel: "A hotel: housekeeping and emergencies handled for you, but how you use the room (connections, queries) is still your problem.",
      keyConcepts: ["managed engine + backups + PITR", "Multi-AZ = HA (synchronous, invisible standby)", "read replicas = scaling (async, laggy)", "failover is a DNS flip", "connection storms + RDS Proxy", "Aurora for fast failover"],
      productionConnection: "Multi-AZ + connection pooler + read-after-write on primary + tested restores + alarms on lag/connections/storage.",
      oneLiner: "RDS manages the database engine and failover, but Multi-AZ gives you availability, read replicas give you scale, and your connection strategy determines real recovery time.",
    },

    quiz: [
      {
        id: "rds-q1",
        prompt: "What does RDS Multi-AZ provide?",
        choices: [
          { text: "Read scaling by spreading reads across zones", correct: false },
          { text: "A synchronous standby in another AZ for automatic failover (availability, not read scaling)", correct: true },
          { text: "Cheaper storage", correct: false },
          { text: "Automatic major version upgrades", correct: false },
        ],
        explanation: "Multi-AZ maintains a synchronous standby that takes over on failure (endpoint DNS flips to it). It serves no read traffic -- for read scaling you need read replicas.",
      },
      {
        id: "rds-q2",
        prompt: "After a Multi-AZ failover completes in ~90 seconds, the app stays broken for ten minutes. Most likely cause?",
        choices: [
          { text: "The standby had no data", correct: false },
          { text: "A connection storm: many app instances reconnected at once and overwhelmed the new primary", correct: true },
          { text: "The backups were deleted", correct: false },
          { text: "RDS switched engines during failover", correct: false },
        ],
        explanation: "When the endpoint flips, every app instance's dead connections reconnect simultaneously. Without a pooler (RDS Proxy/PgBouncer) that stampede can re-overwhelm the fresh primary, extending the outage well past the failover time.",
      },
      {
        id: "rds-q3",
        prompt: "Why can reading immediately after a write from a read replica return stale data?",
        choices: [
          { text: "Read replicas are read-only forever", correct: false },
          { text: "Replicas apply changes asynchronously, so they can lag behind the primary", correct: true },
          { text: "The write was rejected", correct: false },
          { text: "Replicas use a different schema", correct: false },
        ],
        explanation: "Standard read replicas replicate asynchronously and can be seconds behind. A read-after-write against a lagging replica may not yet see the write, so route such reads to the primary.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Design a resilient RDS topology",
      brief: "For an order-management service (write-critical, read-heavy dashboards), design HA, read scaling, connection handling, and recovery.",
      steps: `1. Enable Multi-AZ on the primary for automatic failover.\n2. Add 1-2 read replicas and point dashboards/reports at the reader endpoint.\n3. Keep write and read-after-write traffic on the writer endpoint.\n4. Put RDS Proxy in front to pool connections and survive failovers without a storm.\n5. Set backup retention to 14 days and run a test point-in-time restore.\n6. Alarm on replica lag, connection count, and free storage; schedule maintenance off-peak.\n7. Run a deliberate failover test and record the real recovery time.`,
      successCriteria: [
        "Multi-AZ for HA and replicas for read scaling (not confused)",
        "Connection pooler in front to prevent connection storms",
        "Read-after-write routed to the primary",
        "A tested restore and failover, with alarms configured",
      ],
    },
  },

  {
    slug: "aws-s3",
    title: "S3: Object Storage",
    track: "shared",
    phase: "aws",
    module: "aws-core",
    difficulty: "core",
    estMinutes: 24,
    summary:
      "Effectively infinite, extremely durable object storage -- how it differs from a filesystem, its consistency and performance model, storage classes and lifecycle cost control, and the misconfigurations that leak data.",
    prerequisites: [],
    relatedConcepts: ["aws-iam", "aws-vpc-networking", "aws-rds"],
    tags: ["aws", "s3", "storage", "durability", "object-storage"],

    why: `Applications constantly need to store *blobs* -- images, videos, logs, backups, build artifacts, data-lake files -- that don't fit a relational database and are too big or too numerous for a local disk. Doing this yourself means buying disks, replicating them for durability, and growing capacity forever. **S3 exists to provide effectively infinite, extremely durable (11 nines) object storage as a simple HTTP API**, so you stop thinking about disks entirely.

S3 is also the backbone of the AWS ecosystem: data lakes, static sites, backups, logs, and analytics all land in S3. But its key/value, HTTP-based model behaves *nothing* like a filesystem, and the most famous cloud data breaches are simply S3 buckets left open. Understanding both its power and its footguns is essential.`,

    intuition: `S3 is **a colossal, hyper-organized coat check, not a filing cabinet.**

- You hand over an item (object) and get a ticket (key). Later you present the key and get the exact item back. There are **no folders** -- the "\`logs/2026/app.log\`" path is just a long ticket name; the slashes are cosmetic.
- The coat check keeps **multiple copies of every item across several buildings** (AZs), so losing one building loses nothing (11 nines of durability).
- You can't peek inside an item and change one sleeve -- you replace the whole coat (objects are immutable; you overwrite, not edit-in-place).
- Different cloakrooms cost different amounts: an instant-access one up front (Standard) vs a deep basement vault that takes hours to retrieve from but costs almost nothing (Glacier).`,

    howItWorks: `### The model
- **Buckets** are globally-named containers in a region. **Objects** are the data, addressed by a **key** (a flat string). It is a **key/value store over HTTP**, not a filesystem -- no true directories, no partial in-place edits, no append.
- **Durability is ~11 nines (99.999999999%)** by replicating each object across multiple AZs. **Availability** is lower (a few nines) and varies by storage class.
- **Consistency:** S3 now provides **strong read-after-write consistency** for new objects and overwrites -- a PUT is immediately readable. (Historically it was eventually consistent for overwrites, a classic source of bugs.)

### Storage classes (the cost dial)
- **Standard:** hot data, instant access, highest storage price.
- **Standard-IA / One Zone-IA:** infrequent access; cheaper storage, retrieval fee.
- **Glacier Instant / Flexible / Deep Archive:** archival; very cheap storage, retrieval latency from ms to hours.
- **Intelligent-Tiering:** S3 moves objects between tiers automatically based on access.

### Lifecycle policies
Rules that automatically transition objects to cheaper classes or delete them after N days -- the primary lever for controlling S3 cost at scale.

### Access and security
Access is denied by default. You grant it via **IAM policies, bucket policies, and Block Public Access**. **Server-side encryption** (SSE-S3 or SSE-KMS) is standard; **pre-signed URLs** grant temporary, scoped access to a single object without making the bucket public.`,

    internals: `- **Performance scales with key prefix distribution.** S3 partitions by key prefix; thousands of requests/sec per prefix are fine, and spreading keys across many prefixes multiplies throughput. Sequential/monotonic prefixes (like a timestamp front-loaded key) once created hotspots -- prefer high-entropy prefixes for very high request rates.
- **Listing is not free and not instant at scale.** \`LIST\` is paginated and O(objects); designing workflows around listing millions of keys is slow. Track keys in a database or use inventory reports instead.
- **Objects are immutable.** "Modifying" is a full re-PUT. **Versioning** keeps every overwrite/delete as a new version (protecting against accidental deletes), but every version costs storage until lifecycle-expired.
- **Deletes with versioning add delete markers**, not true removal; a bucket can keep growing in cost even as it "looks" empty.
- **Eventual vs strong consistency history matters** for old code/assumptions, but new writes are now strongly consistent.
- **Cross-region replication and multi-part upload** exist for large objects and geo-redundancy; multipart is required beyond 5 GB and recommended for large uploads to parallelize and resume.
- **Request cost is real:** you pay per request (PUT/GET/LIST) as well as per GB; chatty small-object workloads can be dominated by request charges, not storage.`,

    diagram: {
      title: "S3 object lifecycle and access",
      layers: [
        { id: "put", label: "PUT object", sub: "key/value over HTTP; strong read-after-write" },
        { id: "durable", label: "Replicated across AZs", sub: "~11 nines durability" },
        { id: "class", label: "Storage class", sub: "Standard -> IA -> Glacier via lifecycle" },
        { id: "access", label: "Access control", sub: "IAM + bucket policy + Block Public Access" },
        { id: "share", label: "Pre-signed URL", sub: "temporary scoped access, no public bucket" },
      ],
      caption: "S3 is a durable HTTP key/value store; lifecycle rules control cost and Block Public Access controls exposure.",
    },

    realWorld: `A data team dumps analytics exports into an S3 bucket every hour and never cleans up. Eighteen months later the AWS bill has a five-figure S3 line item, and versioning (enabled 'to be safe') means every overwritten export still exists as a prior version, plus delete markers -- the bucket holds terabytes of data nobody reads. The fix is not more engineering; it is a **lifecycle policy**: transition objects older than 30 days to Standard-IA, older than 90 days to Glacier, expire noncurrent versions after 30 days. The cost drops by an order of magnitude overnight. The lesson: S3 is so easy to write to that cost control has to be *designed in* via lifecycle rules, because nothing forces you to ever delete anything.`,

    production: `- **Enable Block Public Access at the account level** and grant access narrowly via IAM/bucket policies; default to private always.
- **Use lifecycle policies from day one** to transition and expire objects -- this is the main S3 cost lever.
- **Turn on versioning for critical buckets** (protects against accidental delete/overwrite), but expire noncurrent versions so cost doesn't balloon.
- **Enforce encryption** (SSE-KMS for sensitive data) and require TLS via bucket policy.
- **Share objects with pre-signed URLs**, not by opening the bucket.
- **Use a VPC Gateway Endpoint for S3** so app-to-S3 traffic stays private and off the NAT (free, and cheaper).
- **Spread keys across high-entropy prefixes** for very high request rates; avoid relying on LIST at scale.
- **Enable access logging / CloudTrail data events** so you can answer "who read this object" during an incident.`,

    commonMistakes: [
      "Leaving Block Public Access off / a permissive bucket policy -- the classic data-leak headline.",
      "Enabling versioning but never expiring noncurrent versions, so storage cost silently grows forever.",
      "Treating S3 like a filesystem -- expecting cheap LIST, appends, or in-place edits.",
      "No lifecycle policy, so cold data stays in expensive Standard indefinitely.",
      "Making a bucket public to share one file instead of using a pre-signed URL.",
      "Ignoring per-request costs on chatty small-object workloads.",
      "Front-loading monotonic key prefixes and creating throughput hotspots at very high rates.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| S3 Standard | Instant, hot access | Highest storage price |
| Standard-IA | Cheaper storage | Retrieval fee; min duration charge |
| Glacier Deep Archive | Cheapest storage | Hours to retrieve |
| Intelligent-Tiering | Auto cost optimization | Small per-object monitoring fee |
| Versioning on | Recover from bad deletes/overwrites | Every version costs storage |
| Pre-signed URL | Share without public bucket | Time-limited; must regenerate |
| Public bucket | Simple sharing | Massive data-leak risk |`,

    whenToUse: [
      "Blobs: images, video, logs, backups, artifacts, data-lake files.",
      "Static website hosting and asset delivery (often behind CloudFront).",
      "Durable landing zone for analytics and ML data.",
      "Anywhere you want effectively infinite, cheap, durable storage over HTTP.",
    ],
    whenNotToUse: [
      "Low-latency random reads/writes of structured data (use a database).",
      "Workloads needing POSIX filesystem semantics, appends, or file locking (use EFS/FSx).",
      "Frequently mutated small records (object immutability makes this expensive and awkward).",
    ],

    code: [
      {
        label: "Bucket policy: deny any non-TLS access (enforce encryption in transit)",
        language: "json",
        code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-app-data",
        "arn:aws:s3:::my-app-data/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}`,
      },
      {
        label: "Lifecycle policy: tier down then expire old versions (AWS CLI JSON)",
        language: "json",
        code: `{
  "Rules": [
    {
      "ID": "tier-and-expire",
      "Status": "Enabled",
      "Filter": { "Prefix": "exports/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" }
      ],
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    }
  ]
}`,
      },
    ],

    memoryCard: {
      problem: "Store effectively infinite, extremely durable blobs over HTTP without owning disks -- while controlling cost and exposure.",
      mentalModel: "A giant coat check: hand over an item, get a key; copies live in several buildings; no folders, no editing sleeves, just replace the coat.",
      keyConcepts: ["key/value over HTTP (not a filesystem)", "~11 nines durability across AZs", "strong read-after-write consistency", "storage classes + lifecycle policies", "Block Public Access + pre-signed URLs", "immutability + versioning cost"],
      productionConnection: "Block Public Access on, lifecycle rules from day one, versioning with noncurrent expiry, SSE-KMS, pre-signed URLs, and a VPC gateway endpoint.",
      oneLiner: "S3 is a durable HTTP key/value store, not a disk -- lifecycle rules control the cost and Block Public Access controls the leak.",
    },

    quiz: [
      {
        id: "s3-q1",
        prompt: "Which statement about S3 is correct?",
        choices: [
          { text: "S3 is a POSIX filesystem with real directories", correct: false },
          { text: "S3 is a key/value object store over HTTP; slashes in keys are cosmetic, not real folders", correct: true },
          { text: "You can append to and edit objects in place cheaply", correct: false },
          { text: "S3 stores one copy of each object in one AZ", correct: false },
        ],
        explanation: "S3 is a flat key/value store accessed over HTTP. There are no real directories (the '/' is part of the key), objects are immutable (you overwrite), and each object is replicated across multiple AZs for ~11 nines durability.",
      },
      {
        id: "s3-q2",
        prompt: "An S3 bill is exploding even though the app rarely reads old data. What is the first fix?",
        choices: [
          { text: "Delete the whole bucket", correct: false },
          { text: "Add lifecycle policies to transition cold data to cheaper classes and expire old versions", correct: true },
          { text: "Switch the region", correct: false },
          { text: "Turn off durability", correct: false },
        ],
        explanation: "Cost control in S3 is designed in via lifecycle policies: transition cold objects to IA/Glacier and expire noncurrent versions. Nothing deletes data automatically, so unbounded writes plus versioning grow cost forever without lifecycle rules.",
      },
      {
        id: "s3-q3",
        prompt: "You need to give a user temporary download access to one object without exposing the bucket. Best approach?",
        choices: [
          { text: "Make the bucket public", correct: false },
          { text: "Generate a time-limited pre-signed URL for that object", correct: true },
          { text: "Email them your IAM secret key", correct: false },
          { text: "Disable Block Public Access for a minute", correct: false },
        ],
        explanation: "A pre-signed URL grants temporary, scoped access to a single object using your credentials' permissions, expiring after a set time -- no need to make the bucket or object public.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Secure and cost-optimize an S3 bucket",
      brief: "Given a bucket receiving hourly exports that must stay private and not blow up the bill, configure security, cost control, and safe sharing.",
      steps: `1. Enable Block Public Access at the account and bucket level.\n2. Enforce SSE-KMS encryption and add a bucket policy denying non-TLS (aws:SecureTransport=false) access.\n3. Turn on versioning, then add a lifecycle rule expiring noncurrent versions after 30 days.\n4. Add lifecycle transitions: Standard-IA at 30 days, Glacier at 90 days for the exports/ prefix.\n5. Provide downloads via time-limited pre-signed URLs, not a public bucket.\n6. Add a VPC Gateway Endpoint for S3 so app traffic stays private and off the NAT.`,
      successCriteria: [
        "Block Public Access enabled; no public exposure",
        "Encryption enforced and TLS required",
        "Lifecycle rules transition and expire objects/versions",
        "Sharing done via pre-signed URLs",
      ],
    },
  },

  {
    slug: "aws-iam",
    title: "IAM: Identity & Access",
    track: "shared",
    phase: "aws",
    module: "aws-core",
    difficulty: "advanced",
    estMinutes: 28,
    summary:
      "The authorization brain of AWS -- who (principal) can do what (action) on which resource, under what conditions. Roles vs users, policy evaluation, least privilege, and the credential-leak failure modes.",
    prerequisites: ["aws-ec2-compute", "aws-s3"],
    relatedConcepts: ["aws-s3", "aws-ec2-compute", "aws-rds"],
    tags: ["aws", "iam", "security", "authorization", "least-privilege"],

    why: `Every single AWS API call -- launching an instance, reading an S3 object, deleting a database -- is checked against a permission system before it runs. **IAM (Identity and Access Management) is the authorization layer that decides which principal may perform which action on which resource, under which conditions.** It is the difference between a compromised app leaking one file and a compromised app deleting your entire account.

IAM is also where most real cloud security incidents live. Over-permissive policies, long-lived access keys committed to Git, and roles that can escalate their own privileges are the recurring root causes. Getting IAM right -- least privilege, roles over keys, conditions -- is the single highest-leverage security investment on AWS.`,

    intuition: `IAM is **a corporate building's badge-and-door-policy system.**

- A **principal** is the person or service holding a badge (a user, a role, an app).
- A **policy** is the rule printed on the door: "badges in the 'engineering' group may open doors 3-7 between 9am and 6pm, from the office network only."
- A **role** is a **temporary visitor badge you assume** -- it isn't tied to you permanently; you check it out, it expires, and it is far safer than a permanent key you carry forever (an access key).
- The guiding principle is **least privilege**: give each badge the fewest doors it needs. A contractor fixing the printer should not have a master key to the vault.
- And crucially: **an explicit "do not enter" sign (explicit Deny) always beats any "you may enter" (Allow).**`,

    howItWorks: `### The four questions of every request
IAM evaluates: **Principal** (who) + **Action** (what API call) + **Resource** (on what) + **Condition** (under what constraints). If the combination is allowed, the call proceeds.

### Identities
- **Root user:** the account owner; near-unlimited. Lock it away, enable MFA, and never use it day-to-day.
- **IAM users:** long-lived identities with passwords and/or access keys. Useful for humans without SSO, but access keys are a liability.
- **IAM roles:** identities *assumed temporarily*, yielding short-lived credentials via STS. The preferred mechanism for services, cross-account access, and federated humans.

### Policies
JSON documents of \`Effect\` (Allow/Deny), \`Action\`, \`Resource\`, and optional \`Condition\`. Types:
- **Identity-based** (attached to a user/group/role).
- **Resource-based** (attached to a resource, e.g. an S3 bucket policy, naming who may access it).

### Evaluation logic (memorize this)
1. **Default deny** -- everything is denied unless explicitly allowed.
2. An **explicit Allow** grants access.
3. An **explicit Deny anywhere overrides any Allow.**
So access = (an Allow exists) AND (no Deny matches). Deny always wins.`,

    internals: `- **Roles issue temporary credentials via STS** (access key + secret + session token) that auto-expire. This is why an EC2 instance role, a Lambda execution role, or an assumed cross-account role is far safer than a static access key -- a leaked temporary credential dies on its own.
- **The instance metadata service hands roles to EC2**; IMDSv2 exists to stop SSRF attacks from stealing those role credentials.
- **Trust policy vs permission policy:** a role has two policies -- the **trust policy** says *who may assume it*, the **permission policy** says *what it can then do*. Misreading which is which is a common failure.
- **Privilege escalation paths are subtle:** a principal allowed \`iam:PassRole\` or \`iam:CreatePolicyVersion\` or \`iam:AttachUserPolicy\` can grant itself more power. Auditing for these is essential -- "read-only plus PassRole" can be admin in disguise.
- **Wildcards are the enemy of least privilege:** \`"Action": "*"\` on \`"Resource": "*"\` is admin. Policies drift toward wildcards under deadline pressure.
- **Conditions are powerful guards:** restrict by source IP, MFA presence (\`aws:MultiFactorAuthPresent\`), VPC endpoint, or tag. They turn a broad grant into a scoped one.
- **Permissions boundaries and SCPs (in Organizations)** set a *maximum* -- even an Allow can't exceed the boundary. Use them to contain blast radius across teams.
- **IAM is eventually consistent and global;** newly created policies can take moments to apply everywhere.`,

    diagram: {
      title: "IAM request evaluation",
      layers: [
        { id: "principal", label: "Principal (who)", sub: "user / role / service" },
        { id: "request", label: "Action + Resource", sub: "e.g. s3:GetObject on bucket/key" },
        { id: "policies", label: "Applicable policies", sub: "identity-based + resource-based + boundary/SCP" },
        { id: "eval", label: "Evaluation", sub: "default deny -> explicit Allow -> explicit Deny wins" },
        { id: "sts", label: "Temporary creds (roles)", sub: "STS issues short-lived, auto-expiring credentials" },
      ],
      caption: "Access = an Allow exists AND no Deny matches. Roles give temporary credentials; prefer them over static keys.",
    },

    realWorld: `A developer commits an IAM user's long-lived access key to a public GitHub repo "just for a quick test." Within minutes, automated scanners find it. Because the key was attached to a policy with \`"Action": "*"\` (someone had granted admin "to save time"), the attacker spins up dozens of the largest GPU instances for crypto mining across every region, running up a six-figure bill before the anomaly alarms fire. Two IAM failures compounded: a **long-lived static key** (should have been a temporary role credential) and a **wildcard admin policy** (should have been least privilege). Had the app used an instance role with a scoped policy, there would have been no static key to leak and no admin power to abuse. This exact scenario is one of the most common serious AWS incidents.`,

    production: `- **Prefer roles over IAM users/access keys everywhere** -- EC2 instance roles, Lambda execution roles, IRSA for EKS, cross-account role assumption. Temporary credentials that expire beat static keys that leak.
- **Enforce least privilege:** start from zero, grant specific actions on specific resources, and add conditions.
- **Never use the root account** for daily work; enable MFA on it and store its credentials offline.
- **Enforce IMDSv2** on EC2 to protect role credentials from SSRF.
- **Use permissions boundaries and SCPs** to cap what any principal (or whole account) can do, containing blast radius.
- **Audit for privilege-escalation permissions** (iam:PassRole, iam:*PolicyVersion, iam:Attach*) and for wildcard policies.
- **Rotate any unavoidable access keys** and scan repos/CI for leaked secrets.
- **Use conditions** (MFA present, source VPC, source IP) to scope powerful actions.
- **Turn on CloudTrail** so every API call is attributable during an incident.`,

    commonMistakes: [
      "Using long-lived access keys instead of assumable roles with temporary credentials.",
      "Granting Action:* / Resource:* 'to save time' -- accidental account-wide admin.",
      "Committing access keys to Git or embedding them in AMIs/containers.",
      "Using the root account for everyday operations.",
      "Confusing a role's trust policy (who can assume) with its permission policy (what it can do).",
      "Ignoring privilege-escalation permissions like iam:PassRole that turn limited access into admin.",
      "Forgetting that an explicit Deny (or an SCP/boundary) overrides every Allow.",
      "Leaving IMDSv1 enabled, exposing role credentials to SSRF.",
    ],

    tradeoffs: `| Choice | Benefit | Cost |
|---|---|---|
| IAM role (temporary creds) | Auto-expiring, no static secret | Slightly more setup (trust policy) |
| IAM user access key | Simple for one-off scripts | Long-lived; a leak is durable damage |
| Broad policy (wildcards) | Fast to write, "just works" | Huge blast radius on compromise |
| Least-privilege policy | Small blast radius | More policies to maintain |
| Permissions boundary / SCP | Hard ceiling on power | More governance overhead |
| Conditions (MFA/IP/VPC) | Tightly scoped access | Can break legitimate edge cases if too strict |`,

    whenToUse: [
      "Always -- every AWS workload is authorized by IAM; the question is only how tightly.",
      "Roles for any service-to-AWS or cross-account access.",
      "Permissions boundaries/SCPs when delegating account or team autonomy safely.",
    ],
    whenNotToUse: [
      "Do not reach for long-lived access keys when a role would work (nearly always).",
      "Do not use IAM for application-level end-user authz (e.g. per-customer app permissions) -- that belongs in your app, not AWS IAM.",
      "Avoid wildcard policies except for tightly-controlled break-glass roles.",
    ],

    code: [
      {
        label: "Least-privilege policy: read one bucket prefix, TLS + MFA required",
        language: "json",
        code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadReportsOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::acme-reports",
        "arn:aws:s3:::acme-reports/finance/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "true" },
        "BoolIfExists": { "aws:MultiFactorAuthPresent": "true" }
      }
    }
  ]
}`,
      },
      {
        label: "Role trust policy: allow EC2 to assume this role (who, not what)",
        language: "json",
        code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
// This is the TRUST policy (who may assume the role).
// The role's permissions come from a SEPARATE permission policy.`,
      },
    ],

    memoryCard: {
      problem: "Control exactly which principal can perform which action on which AWS resource, under which conditions -- with the smallest possible blast radius.",
      mentalModel: "A building's badge system: temporary visitor badges (roles) over permanent keys (access keys), fewest doors each (least privilege), and a 'do not enter' sign that always wins (explicit Deny).",
      keyConcepts: ["principal + action + resource + condition", "roles (temporary STS creds) vs users (static keys)", "identity-based vs resource-based policies", "default deny -> Allow -> Deny wins", "least privilege + conditions", "privilege escalation via iam:PassRole"],
      productionConnection: "Roles over keys, least-privilege policies with conditions, permissions boundaries/SCPs, IMDSv2, no root for daily use, and CloudTrail for attribution.",
      oneLiner: "IAM decides who can do what to which resource -- use temporary roles, least privilege, and remember an explicit Deny always overrides any Allow.",
    },

    quiz: [
      {
        id: "iam-q1",
        prompt: "In IAM policy evaluation, what happens when one policy Allows an action and another Denies it?",
        choices: [
          { text: "The Allow wins because it was written first", correct: false },
          { text: "The explicit Deny always overrides the Allow", correct: true },
          { text: "The request is queued for manual review", correct: false },
          { text: "It depends on alphabetical order of the policies", correct: false },
        ],
        explanation: "IAM is default-deny; an explicit Allow grants access, but an explicit Deny anywhere (including an SCP or permissions boundary) always overrides any Allow. Access requires an Allow AND no matching Deny.",
      },
      {
        id: "iam-q2",
        prompt: "Why are IAM roles preferred over IAM user access keys for applications?",
        choices: [
          { text: "Roles are free and users cost money", correct: false },
          { text: "Roles provide short-lived, auto-expiring temporary credentials via STS, so a leak is self-limiting", correct: true },
          { text: "Roles bypass the need for any permissions", correct: false },
          { text: "Access keys don't work with S3", correct: false },
        ],
        explanation: "Roles issue temporary credentials that expire automatically, so there is no long-lived secret to leak and a compromised credential dies on its own. Static access keys, by contrast, remain valid until manually rotated.",
      },
      {
        id: "iam-q3",
        prompt: "A 'read-only' role also has iam:PassRole and iam:AttachUserPolicy. What is the concern?",
        choices: [
          { text: "None; those are harmless read permissions", correct: false },
          { text: "It is a privilege-escalation path -- the role can grant itself or others more power", correct: true },
          { text: "It will slow down API calls", correct: false },
          { text: "It disables CloudTrail", correct: false },
        ],
        explanation: "Permissions like iam:PassRole, iam:AttachUserPolicy, and iam:CreatePolicyVersion let a principal escalate privileges despite looking limited. 'Read-only plus PassRole' can effectively be admin, which is why these must be audited.",
      },
    ],

    lab: {
      kind: "instructions",
      title: "Lock down access with least privilege",
      brief: "An app on EC2 needs to read one S3 prefix and write to one DynamoDB table -- nothing more. Design the IAM setup with roles, least privilege, and safeguards.",
      steps: `1. Create an IAM role (not a user); attach it to the EC2 instance via an instance profile.\n2. Write a permission policy allowing only s3:GetObject/ListBucket on the specific bucket/prefix and dynamodb:PutItem/GetItem on the specific table ARN -- no wildcards.\n3. Add conditions: require aws:SecureTransport=true; optionally restrict to the app's source VPC endpoint.\n4. Write the role's trust policy allowing only ec2.amazonaws.com to assume it.\n5. Enforce IMDSv2 on the instance so the role credentials can't be stolen via SSRF.\n6. Audit that the policy grants no iam:* escalation actions and no Action:*/Resource:*.\n7. Confirm CloudTrail is on for attribution.`,
      successCriteria: [
        "Uses an assumable role, not static access keys",
        "Policy is least-privilege (specific actions + resource ARNs, no wildcards)",
        "Conditions applied (TLS, and/or source VPC)",
        "IMDSv2 enforced and no privilege-escalation actions granted",
      ],
    },
  },
];
