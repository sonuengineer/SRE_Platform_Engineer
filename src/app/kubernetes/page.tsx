"use client";

import * as React from "react";
import {
  Boxes,
  Server,
  Database,
  CalendarClock,
  Cog,
  Network,
  Box,
  Skull,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Terminal,
} from "lucide-react";
import { Badge, Button, Card, CardBody, Callout, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Component explanations (k8s-architecture concept)
// ---------------------------------------------------------------------------
interface ComponentInfo {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  short: string;
  detail: string;
}

const CONTROL_PLANE: ComponentInfo[] = [
  {
    id: "apiserver",
    label: "kube-apiserver",
    icon: Network,
    short: "The single front door to the cluster.",
    detail:
      "Every read and write goes through the API server. kubectl, controllers, and kubelets all talk to it over REST. It validates and authenticates requests, then persists desired state to etcd. Nothing writes to etcd directly -- the API server is the only client, which keeps a single consistent view of the world.",
  },
  {
    id: "etcd",
    label: "etcd",
    icon: Database,
    short: "The source of truth (desired + observed state).",
    detail:
      "A distributed key-value store holding the entire cluster state: every object you create (Deployments, Pods, Services) plus their status. It is the source of truth. If etcd is lost and unbacked-up, the cluster's memory is gone. Back it up. Everything else in the control plane is a stateless reconciler on top of etcd.",
  },
  {
    id: "scheduler",
    label: "kube-scheduler",
    icon: CalendarClock,
    short: "Assigns unscheduled Pods to a suitable Node.",
    detail:
      "When a Pod exists with no node assigned, the scheduler picks one. It filters nodes that cannot fit the Pod (resource requests, taints, affinity) and then scores the survivors, binding the Pod to the best node. It does NOT start containers -- it only writes the node assignment. The kubelet on that node does the actual launching.",
  },
  {
    id: "controllers",
    label: "controller-manager",
    icon: Cog,
    short: "Runs the reconciliation loops.",
    detail:
      "A bundle of controllers, each running a reconciliation loop: observe current state, compare to desired state, take one step to close the gap, repeat. The Deployment controller ensures the ReplicaSet exists; the ReplicaSet controller ensures the right number of Pods exist. This control loop is THE core idea of Kubernetes -- declare what you want, and controllers continuously drive reality toward it.",
  },
];

const NODE_COMPONENT: ComponentInfo = {
  id: "kubelet",
  label: "kubelet",
  icon: Server,
  short: "The node agent that runs Pods.",
  detail:
    "One kubelet runs on every worker node. It watches the API server for Pods assigned to its node, then tells the container runtime to pull images and start containers. It reports Pod and node health back up. If the kubelet stops reporting, the node is marked NotReady and its Pods become candidates for rescheduling elsewhere.",
};

// ---------------------------------------------------------------------------
// Cluster / failure simulation model
// ---------------------------------------------------------------------------
interface PodModel {
  id: string;
  app: string;
}

interface NodeModel {
  id: string;
  ready: boolean;
  pods: PodModel[];
}

const DESIRED_REPLICAS = 6;

function initialNodes(): NodeModel[] {
  return [
    { id: "node-1", ready: true, pods: [{ id: "web-a1", app: "web" }, { id: "web-a2", app: "web" }] },
    { id: "node-2", ready: true, pods: [{ id: "web-b1", app: "web" }, { id: "web-b2", app: "web" }] },
    { id: "node-3", ready: true, pods: [{ id: "web-c1", app: "web" }, { id: "web-c2", app: "web" }] },
  ];
}

export default function KubernetesPage() {
  const [nodes, setNodes] = React.useState<NodeModel[]>(initialNodes);
  const [selected, setSelected] = React.useState<ComponentInfo>(CONTROL_PLANE[3]);
  const [phase, setPhase] = React.useState<"stable" | "failing" | "recovered">("stable");

  const readyPods = nodes
    .filter((n) => n.ready)
    .reduce((sum, n) => sum + n.pods.length, 0);

  const killNode2 = () => {
    // Step 1: mark node-2 NotReady, its pods become "lost" (drop out of actual count).
    setPhase("failing");
    setNodes((prev) =>
      prev.map((n) => (n.id === "node-2" ? { ...n, ready: false, pods: [] } : n))
    );
    // Step 2: the ReplicaSet controller notices actual < desired and reschedules
    // the two missing replicas onto healthy nodes.
    window.setTimeout(() => {
      setNodes((prev) => {
        const healthy = prev.filter((n) => n.ready);
        if (healthy.length === 0) return prev;
        const rescheduled: PodModel[] = [
          { id: "web-b1r", app: "web" },
          { id: "web-b2r", app: "web" },
        ];
        const next = prev.map((n) => ({ ...n, pods: [...n.pods] }));
        rescheduled.forEach((pod, i) => {
          const target = next.filter((n) => n.ready)[i % next.filter((n) => n.ready).length];
          target.pods.push(pod);
        });
        return next;
      });
      setPhase("recovered");
    }, 1200);
  };

  const reset = () => {
    setNodes(initialNodes());
    setPhase("stable");
  };

  const Icon = selected.icon;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <SectionHeading sub="Click any control-plane or node component to see what it does. Then kill a node and watch the controllers reconcile desired vs actual state.">
          Kubernetes Lab
        </SectionHeading>
        <Badge tone="warn">SIMULATED</Badge>
      </div>

      {/* Cluster diagram */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Control plane */}
          <Card className="border-accent/30">
            <CardBody>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Boxes className="h-4 w-4 text-accent" /> Control Plane
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONTROL_PLANE.map((c) => {
                  const CIcon = c.icon;
                  const on = selected.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        on
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-fg-muted hover:border-accent/40 hover:text-fg"
                      )}
                    >
                      <CIcon className="h-4 w-4" />
                      <span className="text-xs font-medium">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Worker nodes */}
          <div className="grid gap-3 sm:grid-cols-3">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  node.ready ? "border-border bg-bg-card" : "border-bad/40 bg-bad/[0.06]"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    onClick={() => setSelected(NODE_COMPONENT)}
                    className="flex items-center gap-1.5 text-sm font-medium text-fg hover:text-accent"
                  >
                    <Server className="h-4 w-4" />
                    {node.id}
                  </button>
                  <Badge tone={node.ready ? "good" : "bad"}>{node.ready ? "Ready" : "NotReady"}</Badge>
                </div>
                <div className="space-y-1.5">
                  {node.pods.length === 0 && (
                    <div className="rounded-md border border-dashed border-border px-2 py-3 text-center text-[11px] text-fg-faint">
                      {node.ready ? "no pods" : "pods evicted"}
                    </div>
                  )}
                  {node.pods.map((pod) => (
                    <div
                      key={pod.id}
                      className="flex animate-fade-in items-center gap-1.5 rounded-md border border-good/25 bg-good/[0.06] px-2 py-1.5 text-[11px]"
                    >
                      <Box className="h-3 w-3 text-good" />
                      <span className="font-mono text-fg-muted">{pod.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Reconcile controls */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="danger" size="sm" onClick={killNode2} disabled={phase !== "stable"}>
                  <Skull className="h-4 w-4" /> Kill node-2
                </Button>
                <Button variant="secondary" size="sm" onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
                <div className="ml-auto flex items-center gap-4 text-xs">
                  <span className="text-fg-faint">
                    desired replicas: <span className="font-mono text-fg">{DESIRED_REPLICAS}</span>
                  </span>
                  <span className="text-fg-faint">
                    actual (ready):{" "}
                    <span
                      className={cn(
                        "font-mono",
                        readyPods === DESIRED_REPLICAS ? "text-good" : "text-warn"
                      )}
                    >
                      {readyPods}
                    </span>
                  </span>
                </div>
              </div>
              {phase === "failing" && (
                <Callout tone="warn" title="Node lost">
                  node-2 stopped reporting to the API server and was marked NotReady. Its 2 Pods are gone, so actual
                  replicas ({readyPods}) is now below desired ({DESIRED_REPLICAS}). The ReplicaSet controller is about
                  to notice the gap.
                </Callout>
              )}
              {phase === "recovered" && (
                <Callout tone="good" title="Reconciled">
                  The controller observed actual &lt; desired and created 2 replacement Pods, which the scheduler placed
                  onto healthy nodes. Actual is back to {readyPods}/{DESIRED_REPLICAS}. This is the reconciliation loop:
                  you never told it how to recover -- you only declared how many Pods you wanted.
                </Callout>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Explanation panel */}
        <Card className="border-accent/30 h-fit">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-fg">{selected.label}</h2>
                <p className="text-xs text-fg-muted">{selected.short}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-fg/90">{selected.detail}</p>
          </CardBody>
        </Card>
      </div>

      <CrashLoopInvestigation />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PodCrashLoop investigation (stepper)
// ---------------------------------------------------------------------------
interface Step {
  cmd: string;
  output: string;
  note: string;
}

const CRASH_STEPS: Step[] = [
  {
    cmd: "kubectl get pods",
    output: `NAME                     READY   STATUS             RESTARTS   AGE
web-7d9f8c6b5-2xk4q      1/1     Running            0          6h
checkout-6c4b9d7f-abcde  0/1     CrashLoopBackOff   7          9m`,
    note: "checkout is restarting over and over (7 restarts in 9 minutes) and its readiness is 0/1. CrashLoopBackOff means the container keeps exiting shortly after start, so the kubelet backs off before retrying.",
  },
  {
    cmd: "kubectl describe pod checkout-6c4b9d7f-abcde",
    output: `State:          Waiting
  Reason:       CrashLoopBackOff
Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137
Limits:
  memory:       128Mi
Requests:
  memory:       128Mi
Events:
  Warning  BackOff  kubelet  Back-off restarting failed container`,
    note: "The Last State reason is OOMKilled with exit code 137. Exit 137 = 128 + 9, meaning the process was killed by SIGKILL -- here because it exceeded its 128Mi memory limit. This is a resource limit problem, not a config or probe problem.",
  },
  {
    cmd: "kubectl logs checkout-6c4b9d7f-abcde --previous",
    output: `[info] checkout service starting
[info] loading product catalog into cache...
[info] cache warm: 240k entries
<killed>`,
    note: "--previous shows logs from the CRASHED (prior) container, not the current restarting one. The service was loading the full catalog into an in-memory cache -- memory climbed past 128Mi and the kernel OOM killer terminated it mid-warmup.",
  },
];

function CrashLoopInvestigation() {
  const [step, setStep] = React.useState(0);
  const done = step === CRASH_STEPS.length - 1;
  const current = CRASH_STEPS[step];

  return (
    <div>
      <SectionHeading sub="Step through a real triage. Read the output, then advance to the next command.">
        <span className="inline-flex items-center gap-2">
          <Terminal className="h-4 w-4 text-accent" /> PodCrashLoop investigation
        </span>
      </SectionHeading>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-1.5">
            {CRASH_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-accent" : "bg-bg-hover"
                )}
              />
            ))}
          </div>

          <div className="rounded-lg bg-[#08090d] p-3 font-mono text-xs leading-relaxed">
            <div className="text-good">$ {current.cmd}</div>
            <pre className="mt-1 whitespace-pre-wrap text-fg-muted">{current.output}</pre>
          </div>

          <Callout tone="info" title={`Step ${step + 1} of ${CRASH_STEPS.length}`}>
            {current.note}
          </Callout>

          {done && (
            <Callout tone="bad" title="Diagnosis: OOMKilled (exit 137)">
              The checkout container exceeds its 128Mi memory limit while warming an in-memory catalog cache, so the
              kernel kills it (exit 137) and it enters CrashLoopBackOff. Fix: raise the memory limit to fit the working
              set, OR stop loading the whole catalog into memory (page it / use an external cache). Rule out the other
              families: a config error usually shows exit 1 with a stack trace in logs, and a failing liveness probe
              shows Reason: Error / probe-failed events rather than OOMKilled.
            </Callout>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStep((s) => Math.min(CRASH_STEPS.length - 1, s + 1))}
              disabled={done}
            >
              Next command <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
