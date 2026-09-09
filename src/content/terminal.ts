// Terminal Lab scenarios. Each provides a small virtual filesystem plus canned
// outputs for diagnostic commands, a mission, and a diagnosis question the
// learner answers after investigating. Nothing fakes success -- outputs are
// realistic and the learner must interpret them.

export interface TerminalScenario {
  id: string;
  title: string;
  brief: string;
  mission: string;
  user: string;
  host: string;
  cwd: string;
  files: Record<string, string>; // absolute path -> contents
  commands: { match: string; output: string }[]; // prefix match, first wins
  question: string;
  choices: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  relatedLessons: string[];
}

const COMMON_FILES = {
  "/etc/hostname": "prod-api-1\n",
  "/etc/hosts": "127.0.0.1 localhost\n10.0.1.5 prod-api-1\n",
};

export const TERMINAL_SCENARIOS: TerminalScenario[] = [
  {
    id: "tcp-latency",
    title: "The slow API call",
    brief: "A single API call is slow. Find whether it's the handshake, the path, or the backend.",
    mission:
      "Users in Mumbai report the API feels sluggish. Use curl timing, ping, and ss to locate the bottleneck. Then answer: where is the latency?",
    user: "sre",
    host: "prod-api-1",
    cwd: "/home/sre",
    files: {
      ...COMMON_FILES,
      "/home/sre/notes.txt": "backend: db is in us-east-1\napi replicas just added in ap-south-1 (Mumbai)\n",
    },
    commands: [
      {
        match: "curl -w",
        output:
          "  time_namelookup:  0.004s\n  time_connect:     0.212s   <-- TCP handshake\n  time_appconnect:  0.415s   <-- TLS handshake\n  time_starttransfer: 0.430s\n  time_total:       0.436s\n(each new connection pays ~0.21s connect + ~0.20s TLS)",
      },
      { match: "ping db.internal", output: "64 bytes from db.internal: time=204 ms\n64 bytes from db.internal: time=207 ms\n64 bytes from db.internal: time=205 ms\n(avg RTT ~205ms -- cross-region us-east-1 <-> ap-south-1)" },
      { match: "ping", output: "64 bytes: time=1.1 ms\n64 bytes: time=1.0 ms  (local hop is fine)" },
      { match: "ss -ti", output: "State  Recv-Q Send-Q  Peer\nESTAB  0      0       db.internal:5432\n  rtt:205.3/12.1 cwnd:10 retrans:0/0  <-- high rtt, NO retransmits" },
      { match: "ss", output: "State  Recv-Q Send-Q  Local:Port  Peer\nESTAB  0      0       10.0.1.5:443  ...(many short-lived connections)" },
      { match: "dig", output: ";; ANSWER SECTION:\napi.example.com. 60 IN A 10.0.1.5\n;; Query time: 3 msec  (DNS is fast)" },
    ],
    question: "Where is the latency coming from?",
    choices: [
      { id: "q1", text: "Packet loss / retransmissions on the network" },
      { id: "q2", text: "DNS resolution is slow" },
      { id: "q3", text: "Cross-region RTT (~205ms) paid per new connection via TCP+TLS handshakes; the app opens a fresh connection per request" },
      { id: "q4", text: "The backend CPU is saturated" },
    ],
    correctId: "q3",
    explanation:
      "curl timing shows ~0.21s on connect + ~0.20s on TLS -- both handshakes -- while transfer is instant. ss shows rtt ~205ms with retrans 0/0 (no loss). DNS is 3ms. The API replicas are in Mumbai but the DB is in us-east-1, so every new connection crosses a ~205ms path and pays TCP+TLS handshakes. Fix: connection pooling / keep-alive (amortize handshakes) and/or move the DB closer. More CPU won't help.",
    relatedLessons: ["tcp", "dns", "tls-handshake"],
  },

  {
    id: "dns-debug",
    title: "Is it DNS? (it's always DNS)",
    brief: "A service intermittently fails to connect to a dependency. Decide if DNS is the cause.",
    mission:
      "payments-api intermittently can't reach billing.internal. Use dig and the resolver config to determine whether DNS is the problem.",
    user: "sre",
    host: "payments-api",
    cwd: "/home/sre",
    files: {
      ...COMMON_FILES,
      "/etc/resolv.conf": "nameserver 10.0.0.2\nnameserver 10.0.0.3\noptions timeout:5 attempts:2\n",
      "/var/log/payments/error.log":
        "ERROR dial billing.internal:443: i/o timeout\nERROR name resolution took 5001ms then failed\nINFO  retry succeeded after 5s\n",
    },
    commands: [
      { match: "dig billing.internal", output: ";; ANSWER SECTION:\nbilling.internal. 30 IN A 10.0.2.9\n;; Query time: 4210 msec   <-- 4.2 SECONDS (should be <10ms)\n;; SERVER: 10.0.0.2#53" },
      { match: "dig @10.0.0.3 billing.internal", output: ";; ANSWER SECTION:\nbilling.internal. 30 IN A 10.0.2.9\n;; Query time: 6 msec   <-- second resolver is fast" },
      { match: "dig", output: ";; Query time: 5 msec" },
      { match: "ping 10.0.2.9", output: "64 bytes from 10.0.2.9: time=0.8 ms  (the backend IP itself is reachable & fast)" },
      { match: "curl https://billing.internal", output: "curl: (28) Resolving timed out after 5001 milliseconds" },
    ],
    question: "What is causing the intermittent failures?",
    choices: [
      { id: "q1", text: "billing.internal is down" },
      { id: "q2", text: "The primary resolver (10.0.0.2) is slow/unhealthy: DNS queries take ~4.2s and hit the 5s timeout; the healthy secondary (10.0.0.3) resolves in 6ms" },
      { id: "q3", text: "The network to 10.0.2.9 is congested" },
      { id: "q4", text: "TLS certificate expired" },
    ],
    correctId: "q2",
    explanation:
      "The backend IP (10.0.2.9) pings in <1ms, so the service itself is fine. But `dig billing.internal` via the primary resolver 10.0.0.2 takes 4.2s -- right at the edge of the 5s resolver timeout -- while the secondary 10.0.0.3 answers in 6ms. Resolution, not the backend, is the bottleneck. Fix: repair/replace the unhealthy primary resolver, lower resolver timeout so failover is fast, and monitor resolution latency separately from backend latency.",
    relatedLessons: ["dns", "tcp"],
  },

  {
    id: "k8s-crashloop",
    title: "CrashLoopBackOff after deploy",
    brief: "A pod won't stay up after a deploy. Diagnose the root cause.",
    mission:
      "checkout-api-7d9 is in CrashLoopBackOff with 6 restarts. Use kubectl get/describe/logs to classify the cause, then answer.",
    user: "sre",
    host: "bastion",
    cwd: "/home/sre",
    files: { ...COMMON_FILES },
    commands: [
      { match: "kubectl get pods", output: "NAME               READY   STATUS             RESTARTS   AGE\ncheckout-api-7d9   0/1     CrashLoopBackOff   6          8m\ncheckout-api-7d8   1/1     Running            0          3h" },
      {
        match: "kubectl describe pod",
        output:
          "State:          Waiting\n  Reason:       CrashLoopBackOff\nLast State:     Terminated\n  Reason:       Error\n  Exit Code:    1\nEvents:\n  Warning  BackOff  restarting failed container\n  (no OOMKilled, image pulled OK)",
      },
      { match: "kubectl logs checkout-api-7d9 --previous", output: "Starting checkout-api v1.9.0\nTraceback (most recent call last):\n  File \"config.py\", line 21, in load\n    DATABASE_URL = os.environ['DATABASE_URL']\nKeyError: 'DATABASE_URL'\napp exited with code 1" },
      { match: "kubectl logs checkout-api-7d9", output: "(no logs yet -- container has not started this attempt)" },
      { match: "kubectl get configmap", output: "NAME             DATA   AGE\ncheckout-config  2      3h  (missing key: DATABASE_URL)" },
    ],
    question: "Why is the pod crashlooping?",
    choices: [
      { id: "q1", text: "OOMKilled -- memory limit too low" },
      { id: "q2", text: "The app exits with code 1 at boot because a required env var DATABASE_URL is missing from config -> unhandled KeyError" },
      { id: "q3", text: "The liveness probe fires too early" },
      { id: "q4", text: "The image failed to pull" },
    ],
    correctId: "q2",
    explanation:
      "describe shows Exit Code 1 (not 137/OOMKilled) and the image pulled fine. `logs --previous` reveals a KeyError on os.environ['DATABASE_URL'] at startup -- the app crashes immediately because a required env var is missing (the ConfigMap lacks DATABASE_URL). Fix: add the missing config key (or Secret), and make the app fail with a clear message / validate config at boot. Note that plain `logs` was empty because the current attempt hadn't started -- always use --previous on a crashlooper.",
    relatedLessons: ["k8s-crashloop", "k8s-architecture"],
  },

  {
    id: "redis-eviction",
    title: "Redis is evicting hot keys",
    brief: "Cache hit rate is falling and evictions are climbing. Find out why.",
    mission:
      "profile-api latency rose and DB load increased. Suspect the cache. Use redis-cli INFO to investigate memory and eviction.",
    user: "sre",
    host: "prod-api-1",
    cwd: "/home/sre",
    files: { ...COMMON_FILES },
    commands: [
      { match: "redis-cli info memory", output: "used_memory_human:2.00G\nmaxmemory_human:2.00G     <-- at the ceiling\nmaxmemory_policy:allkeys-lru" },
      { match: "redis-cli info stats", output: "keyspace_hits:120000\nkeyspace_misses:410000     <-- hit rate ~23% (was ~92%)\nevicted_keys:1840000       <-- climbing fast" },
      { match: "redis-cli --bigkeys", output: "Biggest string found 'session:blob' has 48 MB\n(thousands of oversized session blobs are filling memory)" },
      { match: "redis-cli dbsize", output: "(integer) 5100000" },
    ],
    question: "What's the root cause and best fix?",
    choices: [
      { id: "q1", text: "Redis is simply too small; raise maxmemory to 200G permanently and stop there" },
      { id: "q2", text: "Oversized session blobs (48MB each) fill memory, forcing LRU to evict hot cache keys; fix key sizes (store references, add TTLs) and right-size memory" },
      { id: "q3", text: "The eviction policy should be noeviction" },
      { id: "q4", text: "The database is the problem, not Redis" },
    ],
    correctId: "q2",
    explanation:
      "used_memory is pinned at maxmemory (2G) with allkeys-lru, so Redis evicts to make room; evicted_keys is climbing and hit rate collapsed from ~92% to ~23%, which pushed load onto the DB. --bigkeys shows 48MB session blobs bloating memory. The fix isn't just a bigger box: shrink the values (store a reference/id instead of a blob, add TTLs to sessions), then right-size maxmemory. noeviction would turn 'full' into hard errors -- worse.",
    relatedLessons: ["redis-deep", "caching-dual"],
  },

  {
    id: "cache-stampede",
    title: "The clockwork DB spike",
    brief: "The database CPU spikes on a fixed interval. Correlate with cache TTLs.",
    mission:
      "Every 5 minutes the DB CPU spikes to 100% for a few seconds and requests time out. Investigate the cache to explain the pattern.",
    user: "sre",
    host: "prod-api-1",
    cwd: "/home/sre",
    files: {
      ...COMMON_FILES,
      "/app/cache.py":
        "TTL = 300  # 5 minutes, fixed\n\ndef get_trending():\n    v = redis.get('trending')\n    if v: return v\n    data = db.expensive_query()   # ~2s, heavy\n    redis.set('trending', data, ex=TTL)  # same TTL for all workers\n    return data\n",
    },
    commands: [
      { match: "redis-cli ttl trending", output: "(integer) 2   <-- about to expire; all workers share this one key" },
      { match: "redis-cli get trending", output: "\"{...large payload...}\"" },
      { match: "grep -n TTL /app/cache.py", output: "1:TTL = 300  # 5 minutes, fixed\n6:    redis.set('trending', data, ex=TTL)" },
      { match: "dstat", output: "time      db_cpu\n12:00:00  30%\n12:05:00  100%   <-- spike aligns with TTL boundary\n12:10:00  100%\n12:05:03  32%" },
    ],
    question: "What causes the periodic DB spike?",
    choices: [
      { id: "q1", text: "A cron job runs every 5 minutes" },
      { id: "q2", text: "Cache stampede: the single hot 'trending' key expires every 300s and all workers miss simultaneously, all running the 2s expensive query at once" },
      { id: "q3", text: "The database needs more CPU" },
      { id: "q4", text: "Redis is down every 5 minutes" },
    ],
    correctId: "q2",
    explanation:
      "The DB spike aligns exactly with the 300s TTL boundary. One shared 'trending' key with a fixed TTL means every worker's cache misses at the same instant and they all run the 2s expensive_query concurrently -- a classic stampede/dogpile. Fix: a single-flight lock (SET NX) so one worker rebuilds while others serve stale, plus jittered TTLs so keys don't expire in lockstep. A bigger DB just delays the pain.",
    relatedLessons: ["caching-dual", "redis-deep"],
  },

  {
    id: "kafka-lag",
    title: "Consumer lag in the millions",
    brief: "A consumer group is falling behind. Find why it can't keep up.",
    mission:
      "notifications-consumer lag is climbing into the millions. Use the kafka tools to find the bottleneck and answer.",
    user: "sre",
    host: "bastion",
    cwd: "/home/sre",
    files: { ...COMMON_FILES },
    commands: [
      {
        match: "kafka-consumer-groups --describe",
        output:
          "TOPIC          PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG       CONSUMER-ID\nnotifications   0          1200000         2300000         1100000   c-1\nnotifications   1          1150000         2280000         1130000   c-2\nnotifications   2          0               2000000         2000000   (none)  <-- unassigned!\n... (6 partitions, only 2 consumers alive)",
      },
      { match: "kafka-topics --describe", output: "Topic: notifications  PartitionCount: 6  ReplicationFactor: 3" },
      { match: "grep -c rebalance /var/log/consumer.log", output: "9   <-- 9 rebalances in the last 10 minutes" },
      { match: "grep processing /var/log/consumer.log", output: "processed 1 msg in 340ms (synchronous call to email provider)\nprocessed 1 msg in 355ms\nWARN max.poll.interval exceeded -> leaving group" },
    ],
    question: "Why is lag exploding?",
    choices: [
      { id: "q1", text: "Producers have a bug and send too fast" },
      { id: "q2", text: "Slow synchronous processing (~340ms/msg) caps throughput and trips max.poll.interval, causing rebalances that drop consumers; only 2 of 6 partitions are actively consumed" },
      { id: "q3", text: "The topic has too few partitions" },
      { id: "q4", text: "Replication factor is too high" },
    ],
    correctId: "q2",
    explanation:
      "There are 6 partitions but only 2 live consumers (one partition is unassigned), and each message takes ~340ms because of a synchronous email call. That slow processing exceeds max.poll.interval, so members are kicked and the group rebalances repeatedly (9x/10m) -- a death spiral. Fix: make per-message processing fast (batch/async the email call), scale consumers up to 6 (the partition count), and tune max.poll settings so slow batches don't trigger rebalances. Never reset offsets to latest to hide lag.",
    relatedLessons: ["kafka-fundamentals", "background-jobs-dual"],
  },

  {
    id: "docker-build",
    title: "The 6-minute Docker build",
    brief: "Every code change triggers a full dependency reinstall. Fix the Dockerfile.",
    mission:
      "CI takes 6 minutes on every commit and the image is 1.2GB. Inspect the Dockerfile and image to find why.",
    user: "dev",
    host: "ci-runner",
    cwd: "/app",
    files: {
      ...COMMON_FILES,
      "/app/Dockerfile":
        "FROM python:3.12\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt\nCMD [\"python\", \"main.py\"]\n",
      "/app/.dockerignore": "(file is empty -- node_modules, .git, .venv all copied into context)",
    },
    commands: [
      { match: "cat Dockerfile", output: "FROM python:3.12\nWORKDIR /app\nCOPY . .                <-- copies ALL source before installing deps\nRUN pip install -r requirements.txt\nCMD [\"python\", \"main.py\"]" },
      { match: "docker history", output: "IMAGE  CREATED BY                         SIZE\n...    RUN pip install -r requirements    380MB\n...    COPY . .                           220MB\n...    FROM python:3.12 (full, not slim)  1.0GB" },
      { match: "docker build", output: "Step 3/5 COPY . . ---> cache MISS (source changed)\nStep 4/5 RUN pip install ---> cache MISS (reinstalling ALL deps)\n... 6m12s" },
    ],
    question: "Why does every build reinstall dependencies, and how do you fix it?",
    choices: [
      { id: "q1", text: "pip is slow; there's nothing to do" },
      { id: "q2", text: "COPY . . runs before pip install, so any code change busts the deps layer. Fix: COPY requirements.txt + install first, then COPY . .; use a slim base + multi-stage + .dockerignore" },
      { id: "q3", text: "The base image is corrupted" },
      { id: "q4", text: "CI needs more CPU" },
    ],
    correctId: "q2",
    explanation:
      "Because `COPY . .` precedes `pip install`, any source change invalidates that layer and every layer after it -- so pip reinstalls all dependencies on every commit. Reorder to copy requirements.txt and install deps first (a layer that only changes when deps change), then `COPY . .`. Also switch python:3.12 (1GB) to python:3.12-slim, use a multi-stage build, and add a real .dockerignore. Incremental builds drop from ~6m to seconds.",
    relatedLessons: ["docker-images-layers", "dockerfile-best-practices"],
  },

  {
    id: "cpu-hot-process",
    title: "The box is pegged at 100% CPU",
    brief: "Load average is through the roof. Find which process is burning the CPU.",
    mission:
      "prod-worker-3 is unresponsive and the load average is climbing. Something is pinning the CPU. Use top and ps to find the offender, then answer.",
    user: "sre",
    host: "prod-worker-3",
    cwd: "/home/sre",
    files: {
      ...COMMON_FILES,
      "/home/sre/notes.txt": "recent change: report-gen cron added last night\nnormal load avg on this box is ~1.5\n",
      "/etc/cron.d/reports": "*/2 * * * * appuser /usr/local/bin/report-gen --full-scan\n",
    },
    commands: [
      {
        match: "top",
        output:
          "top - 14:22:07 up 9 days,  3:11,  2 users,  load average: 31.40, 22.15, 12.02\nTasks: 214 total,   3 running, 211 sleeping\n%Cpu(s): 99.3 us,  0.5 sy,  0.0 ni,  0.0 id,  0.0 wa\nMiB Mem :  15884 total,   9210 free,   4102 used,   2572 buff/cache\n\n    PID USER      PR  NI    VIRT    RES  %CPU  %MEM     TIME+ COMMAND\n  20471 appuser   20   0  412300 118220 788.0   0.7  92:14.30 report-gen\n   1032 postgres  20   0  980440  84120   4.3   0.5   1:02.11 postgres\n    901 root      20   0   72240   9200   0.7   0.1   0:31.02 sshd\n(report-gen is eating ~8 cores of a 8-core box)",
      },
      { match: "ps -eo pid,ppid,%cpu,etime,cmd --sort=-%cpu", output: "  PID  PPID %CPU     ELAPSED CMD\n20471 20469 788  00:41:52 /usr/local/bin/report-gen --full-scan\n20469     1  0.0 00:41:53 /bin/sh -c /usr/local/bin/report-gen --full-scan\n 1032     1  4.3   9-03:10:44 postgres: main\n(report-gen has run 41 minutes and never exits -- a full-scan on every row)" },
      { match: "ps aux", output: "USER       PID %CPU %MEM    VSZ   RSS COMMAND\nappuser  20471  788  0.7 412300 118220 /usr/local/bin/report-gen --full-scan\npostgres  1032  4.3  0.5 980440  84120 postgres: main\nroot       901  0.7  0.1  72240  9200 sshd" },
      { match: "nproc", output: "8" },
      { match: "uptime", output: "14:22:19 up 9 days,  3:11,  2 users,  load average: 31.40, 22.15, 12.02" },
      { match: "cat /proc/loadavg", output: "31.40 22.15 12.02 3/214 20488" },
      { match: "free -m", output: "               total        used        free      shared  buff/cache   available\nMem:           15884        4102        9210          12        2572       11390\nSwap:           2047           0        2047   (memory and swap are fine)" },
    ],
    question: "What is pinning the CPU on this host?",
    choices: [
      { id: "q1", text: "The system is out of memory and thrashing on swap" },
      { id: "q2", text: "postgres is saturating the CPU under normal query load" },
      { id: "q3", text: "A runaway report-gen process (PID 20471, ~788% CPU, running 41 min) started by the new cron is monopolizing all 8 cores" },
      { id: "q4", text: "sshd is spinning and needs restarting" },
    ],
    correctId: "q3",
    explanation:
      "top shows %Cpu 99.3 us with idle at 0.0 and load average 31 on an 8-core box (nproc=8). One process, report-gen (PID 20471), sits at 788% CPU -- roughly 8 full cores -- while postgres and sshd are near idle. free -m shows plenty of RAM and zero swap used, so this is not a memory problem. ps shows report-gen has run 41 minutes without exiting, launched by the new --full-scan cron. Fix: kill the runaway job, then fix report-gen (index the scan / cap its concurrency / nice it) so the cron cannot starve the box again.",
    relatedLessons: ["linux-processes", "linux-observability-tools"],
  },

  {
    id: "disk-inodes",
    title: "Disk says it has room but writes fail",
    brief: "Applications report 'No space left on device' yet df shows free space. Explain it.",
    mission:
      "session-cache-1 is throwing 'No space left on device' on every write, but df -h shows the disk is only 61% full. Investigate the filesystem and answer.",
    user: "sre",
    host: "session-cache-1",
    cwd: "/var/lib/app",
    files: {
      ...COMMON_FILES,
      "/var/lib/app/README": "session files are written to /var/lib/app/sessions, one tiny file per session\ncleanup job was disabled during the incident 3 weeks ago\n",
    },
    commands: [
      { match: "df -h", output: "Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p1  200G  118G   82G  61% /\ntmpfs           7.8G     0  7.8G   0% /dev/shm\n(plenty of bytes free -- 82G available)" },
      {
        match: "df -i",
        output:
          "Filesystem       Inodes    IUsed   IFree IUse% Mounted on\n/dev/nvme0n1p1  13107200 13107198       2  100% /\ntmpfs            2036000       1 2035999    1% /dev/shm\n(root filesystem is at 100% INODES -- only 2 free)",
      },
      { match: "touch test.tmp", output: "touch: cannot touch 'test.tmp': No space left on device" },
      { match: "find /var/lib/app/sessions -type f | wc -l", output: "12904331   (12.9 million tiny session files)" },
      { match: "ls /var/lib/app/sessions", output: "sess_0000001a  sess_0000001b  sess_0000001c  sess_0000001d  ... (millions more)" },
      { match: "du -sh /var/lib/app/sessions", output: "9.4G\t/var/lib/app/sessions   (only 9.4G of bytes, but 12.9M inodes)" },
      { match: "ls -l /var/lib/app/sessions/sess_0000001a", output: "-rw-r--r-- 1 appuser appuser 220 Aug 18 03:11 /var/lib/app/sessions/sess_0000001a" },
    ],
    question: "Why do writes fail when df -h shows 82G free?",
    choices: [
      { id: "q1", text: "The disk is physically full; df -h is misreporting the used space" },
      { id: "q2", text: "The filesystem is out of inodes (df -i shows 100% IUse) -- 12.9M tiny session files exhausted the inode table even though only 9.4G of bytes are used" },
      { id: "q3", text: "The mount is read-only and needs remounting rw" },
      { id: "q4", text: "tmpfs on /dev/shm is full and blocking writes to /" },
    ],
    correctId: "q2",
    explanation:
      "df -h shows 61% byte usage with 82G free, so it is not a bytes problem. df -i tells the real story: IUse% on / is 100% with only 2 inodes free. Every file consumes one inode regardless of size, and 12.9M tiny 220-byte session files (found via find | wc -l) exhausted the inode table while using just 9.4G of space. That is why touch fails with 'No space left on device'. Fix: delete/rotate the old session files (the disabled cleanup job), re-enable cleanup, and consider fewer-larger files or a store that does not create one inode per session. Growing the disk in bytes would not help unless the filesystem is recreated with more inodes.",
    relatedLessons: ["linux-filesystem", "linux-observability-tools"],
  },

  {
    id: "port-in-use",
    title: "The service won't start -- address already in use",
    brief: "A restarted service fails to come up. Find what is holding its port.",
    mission:
      "After a deploy, api-gateway fails to start and the logs say 'address already in use'. It should listen on port 8080. Find what owns that port and answer.",
    user: "sre",
    host: "prod-api-2",
    cwd: "/home/sre",
    files: {
      ...COMMON_FILES,
      "/var/log/api-gateway/startup.log":
        "INFO  api-gateway v2.4.1 starting\nINFO  binding 0.0.0.0:8080\nFATAL listen tcp 0.0.0.0:8080: bind: address already in use\nexit status 1\n",
      "/etc/api-gateway/config.yaml": "listen: 0.0.0.0:8080\nworkers: 4\n",
    },
    commands: [
      {
        match: "ss -ltnp",
        output:
          "State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process\nLISTEN  0       128      0.0.0.0:22           0.0.0.0:*          users:((\"sshd\",pid=901,fd=3))\nLISTEN  0       511      0.0.0.0:8080         0.0.0.0:*          users:((\"api-gateway\",pid=15522,fd=7))\nLISTEN  0       128      127.0.0.1:9100       0.0.0.0:*          users:((\"node_exporter\",pid=780,fd=3))\n(0.0.0.0:8080 is already held by pid 15522)",
      },
      { match: "ss -ltn", output: "State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port\nLISTEN  0       128      0.0.0.0:22           0.0.0.0:*\nLISTEN  0       511      0.0.0.0:8080         0.0.0.0:*\nLISTEN  0       128      127.0.0.1:9100       0.0.0.0:*" },
      { match: "ps -p 15522 -o pid,etime,cmd", output: "  PID     ELAPSED CMD\n15522  02:47:19 /usr/bin/api-gateway --config /etc/api-gateway/config.yaml (v2.3.0)\n(an OLD v2.3.0 instance from before the deploy is still running)" },
      { match: "ps aux", output: "USER       PID %CPU %MEM COMMAND\nsvc      15522  1.2  2.1 /usr/bin/api-gateway --config /etc/api-gateway/config.yaml (v2.3.0)\nroot       901  0.0  0.1 sshd\nprom       780  0.1  0.4 node_exporter" },
      { match: "systemctl status api-gateway", output: "* api-gateway.service - API Gateway\n   Active: failed (Result: exit-code)\n   Process: 22110 ExecStart=/usr/bin/api-gateway ... (code=exited, status=1)\n   Main PID: 22110 (code=exited, status=1)\n   (the NEW unit failed; note the old pid 15522 is not managed by this unit)" },
      { match: "lsof -i :8080", output: "COMMAND     PID USER   FD   TYPE DEVICE NODE NAME\napi-gatew 15522  svc    7u  IPv4  ...  TCP *:8080 (LISTEN)" },
    ],
    question: "Why does the new api-gateway fail to bind port 8080?",
    choices: [
      { id: "q1", text: "The firewall is blocking port 8080" },
      { id: "q2", text: "An old v2.3.0 api-gateway instance (pid 15522) survived the deploy and is still LISTENing on 0.0.0.0:8080, so the new process cannot bind it" },
      { id: "q3", text: "The config points at the wrong port" },
      { id: "q4", text: "Port 8080 is a privileged port and the service lacks permission" },
    ],
    correctId: "q2",
    explanation:
      "ss -ltnp shows 0.0.0.0:8080 is already in LISTEN state, held by process api-gateway pid 15522. ps reveals that pid is an OLD v2.3.0 build that was never stopped during the deploy, and systemctl status shows the NEW unit (pid 22110) exited with status 1 -- the old process is not even managed by the current unit. Two processes cannot bind the same address, hence 'address already in use'. It is not a firewall or privilege issue (8080 is unprivileged, and the socket is bound, not blocked). Fix: stop/kill the orphaned old instance, then start the unit; harden the deploy so it reliably terminates the previous process (or use SO_REUSEPORT / socket handoff) before starting the new one.",
    relatedLessons: ["linux-processes", "linux-observability-tools", "tcp"],
  },

  {
    id: "oom-killer",
    title: "The process that vanished",
    brief: "A service disappears with no crash log of its own. Find out who killed it.",
    mission:
      "image-resizer keeps disappearing every so often with no stack trace in its own logs; it just stops. Check the kernel and system logs to find out what happened, then answer.",
    user: "sre",
    host: "media-worker-1",
    cwd: "/home/sre",
    files: {
      ...COMMON_FILES,
      "/var/log/image-resizer/app.log":
        "INFO  processing batch of 4000 images at 6000x6000\nINFO  loading all images into memory before encode\n(log ends abruptly -- no error, no shutdown message)\n",
    },
    commands: [
      {
        match: "dmesg",
        output:
          "[3391284.11] image-resizer invoked oom-killer: gfp_mask=0x100cca, order=0, oom_score_adj=0\n[3391284.12] Out of memory: Killed process 8842 (image-resizer) total-vm:9812004kB, anon-rss:7620112kB, file-rss:0kB\n[3391284.13] oom_reaper: reaped process 8842 (image-resizer), now anon-rss:0kB\n(the KERNEL killed image-resizer for using ~7.6G of RAM)",
      },
      {
        match: "journalctl -k",
        output:
          "kernel: image-resizer invoked oom-killer: gfp_mask=0x100cca, order=0\nkernel: Out of memory: Killed process 8842 (image-resizer) total-vm:9812004kB, anon-rss:7620112kB\nkernel: oom_reaper: reaped process 8842 (image-resizer)",
      },
      { match: "journalctl -u image-resizer", output: "systemd[1]: image-resizer.service: A process of this unit has been killed by the OOM killer.\nsystemd[1]: image-resizer.service: Main process exited, code=killed, status=9/KILL\nsystemd[1]: image-resizer.service: Failed with result 'oom-kill'.\nsystemd[1]: image-resizer.service: Scheduled restart, restart counter is at 5." },
      { match: "free -m", output: "               total        used        free      shared  buff/cache   available\nMem:            7820        6910         210          10         700         180\nSwap:              0           0           0   (no swap; only 7.8G RAM total)" },
      { match: "cat /proc/8842/status", output: "cat: /proc/8842/status: No such file or directory   (process 8842 no longer exists)" },
      { match: "grep -i oom /var/log/syslog", output: "kernel: Out of memory: Killed process 8842 (image-resizer) anon-rss:7620112kB\nkernel: image-resizer invoked oom-killer" },
    ],
    question: "Why does image-resizer keep disappearing?",
    choices: [
      { id: "q1", text: "The application has an unhandled exception that exits silently" },
      { id: "q2", text: "The kernel OOM killer is terminating it (SIGKILL, status 9): it allocated ~7.6G on a 7.8G box with no swap while loading a whole batch into memory" },
      { id: "q3", text: "systemd is stopping it because of a failed health check" },
      { id: "q4", text: "Someone is manually killing the process" },
    ],
    correctId: "q2",
    explanation:
      "The app log ends abruptly with no error because the process did not choose to exit -- it was killed. dmesg and journalctl -k show the kernel invoked the oom-killer and killed pid 8842 (image-resizer) with anon-rss ~7.6G; journalctl -u confirms systemd saw status=9/KILL with result 'oom-kill' and is restart-looping. free -m shows only 7.8G RAM and no swap, so loading a 4000-image batch at 6000x6000 into memory blows the limit. This is not an app exception, a health check, or a human. Fix: stream/tile the images instead of loading the whole batch, cap batch size / memory, set a sane cgroup MemoryMax with graceful handling, and add memory monitoring so it is caught before the kernel intervenes.",
    relatedLessons: ["linux-processes", "linux-signals", "linux-observability-tools"],
  },

  {
    id: "perm-denied",
    title: "Permission denied on a file that exists",
    brief: "A service cannot read a config file that is clearly present. Explain the failure.",
    mission:
      "After a config rotation, nginx fails to start with 'Permission denied' reading /etc/nginx/ssl/site.key -- but the file is right there. Investigate ownership and permissions, then answer.",
    user: "sre",
    host: "edge-1",
    cwd: "/etc/nginx",
    files: {
      ...COMMON_FILES,
      "/etc/nginx/nginx.conf": "user www-data;\nworker_processes auto;\nhttp {\n  server {\n    listen 443 ssl;\n    ssl_certificate     /etc/nginx/ssl/site.crt;\n    ssl_certificate_key /etc/nginx/ssl/site.key;\n  }\n}\n",
      "/etc/nginx/ssl/site.key": "-----BEGIN PRIVATE KEY-----\n(redacted)\n-----END PRIVATE KEY-----\n",
    },
    commands: [
      { match: "nginx -t", output: "nginx: [emerg] cannot load certificate key \"/etc/nginx/ssl/site.key\": PEM_read_bio_PrivateKey() failed (SSL: error:0200100D:system library:fopen:Permission denied)\nnginx: configuration file /etc/nginx/nginx.conf test failed" },
      {
        match: "ls -l /etc/nginx/ssl",
        output:
          "total 8\n-rw-r--r-- 1 root root 1533 Sep  9 02:00 site.crt\n-rw------- 1 root root 1704 Sep  9 02:00 site.key\n(site.key is 0600 and owned by root:root -- www-data cannot read it)",
      },
      { match: "ls -ld /etc/nginx/ssl", output: "drwx------ 2 root root 4096 Sep  9 02:00 /etc/nginx/ssl\n(the ssl directory itself is 0700 root:root -- www-data cannot even traverse it)" },
      { match: "id www-data", output: "uid=33(www-data) gid=33(www-data) groups=33(www-data)\n(not in the root group; no way to reach a root-only 0600 file)" },
      { match: "grep -n user /etc/nginx/nginx.conf", output: "1:user www-data;   (nginx workers drop to the www-data user)" },
      { match: "namei -l /etc/nginx/ssl/site.key", output: "f: /etc/nginx/ssl/site.key\ndrwxr-xr-x root root /\ndrwxr-xr-x root root etc\ndrwxr-xr-x root root nginx\ndrwx------ root root ssl        <-- blocks www-data here\n-rw------- root root site.key" },
    ],
    question: "Why can nginx not read site.key even though the file exists?",
    choices: [
      { id: "q1", text: "The key file is corrupt or in the wrong PEM format" },
      { id: "q2", text: "The nginx worker runs as www-data, but site.key is 0600 root:root inside a 0700 root:root directory, so www-data can neither traverse the dir nor read the file -- an ownership/permissions problem" },
      { id: "q3", text: "SELinux is enforcing and blocking the read" },
      { id: "q4", text: "The certificate has expired" },
    ],
    correctId: "q2",
    explanation:
      "The error is a plain fopen: Permission denied, not a parse/PEM error, so the key is valid -- access is the problem. nginx.conf sets 'user www-data', so workers run as uid 33. ls -l shows site.key is 0600 owned by root:root, and ls -ld shows the enclosing ssl directory is 0700 root:root; namei -l pinpoints the ssl directory as the first blocking component. id www-data confirms it is not in the root group, so it cannot traverse the 0700 dir or read the 0600 file. Fix: grant the service account access without exposing the key broadly -- e.g. chgrp the key to a group the worker is in and set 0640 plus 0750 on the directory (or keep the key readable only by the master process, which reads certs as root before dropping privileges). Loosening to world-readable on a private key would be a security mistake.",
    relatedLessons: ["linux-permissions", "linux-filesystem"],
  },
];

export const TERMINAL_BY_ID: Record<string, TerminalScenario> = Object.fromEntries(
  TERMINAL_SCENARIOS.map((s) => [s.id, s])
);
