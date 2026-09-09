"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Globe, Server, Shield, Send, Network, Cpu, Route, ArrowRight } from "lucide-react";
import { Badge, Button, Card, CardBody, SectionHeading } from "@/components/ui";
import { isAuthored } from "@/content";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  latency: string;
  short: string;
  detail: string;
  lesson?: string;
}

const STAGES: Stage[] = [
  {
    id: "browser",
    label: "Browser",
    icon: Globe,
    latency: "0ms",
    short: "The client initiates a request to https://api.example.com/orders.",
    detail:
      "The browser parses the URL, checks its own caches (HTTP cache, connection pool), and if it has no reusable connection it must resolve the hostname to an IP before anything else can happen.",
  },
  {
    id: "dns",
    label: "DNS",
    icon: Route,
    latency: "~1-40ms",
    short: "Resolve api.example.com to an IP address.",
    detail:
      "The OS stub resolver checks its cache; on a miss it asks a recursive resolver, which walks root -> TLD -> authoritative servers and caches the answer for the record's TTL. If DNS is slow or the record is stale, the ENTIRE request is delayed before a single packet reaches your backend.",
    lesson: "dns",
  },
  {
    id: "tcp",
    label: "TCP handshake",
    icon: Send,
    latency: "~1 RTT",
    short: "Establish a reliable connection (SYN, SYN-ACK, ACK).",
    detail:
      "A three-way handshake exchanges initial sequence numbers and confirms both directions work. This costs one full round trip BEFORE any application data flows -- which is why reusing connections (keep-alive, pooling) is one of the biggest latency wins available.",
    lesson: "tcp",
  },
  {
    id: "tls",
    label: "TLS handshake",
    icon: Shield,
    latency: "~1-2 RTT",
    short: "Negotiate encryption and authenticate the server.",
    detail:
      "The client and server agree on a cipher, the server proves its identity with a certificate, and they derive session keys. TLS 1.3 cuts this to ~1 RTT (and 0-RTT for resumption). Combined with TCP, a fresh HTTPS connection can cost 2-3 RTT before data -- brutal across regions.",
  },
  {
    id: "http",
    label: "HTTP request",
    icon: Network,
    latency: "~0ms send",
    short: "Send GET /orders with headers and (maybe) a body.",
    detail:
      "Now the actual request travels: method, path, headers (Host, Authorization, Content-Type), and body. Correct HTTP semantics here -- methods, status codes, idempotency, caching headers -- let every downstream component (LB, CDN, cache) behave correctly for free.",
    lesson: "http-fundamentals",
  },
  {
    id: "lb",
    label: "Load Balancer",
    icon: Cpu,
    latency: "~1-5ms",
    short: "Route the request to a healthy backend.",
    detail:
      "An L7 load balancer terminates TLS, inspects the request, and forwards it to a healthy backend (least-connections, etc.). It runs health checks, can retry idempotent requests, and drains connections during deploys. Its health-check quality effectively defines your availability.",
    lesson: "load-balancing",
  },
  {
    id: "backend",
    label: "Backend",
    icon: Server,
    latency: "app-dependent",
    short: "Your API server processes the request and responds.",
    detail:
      "The application runs middleware (auth, validation), executes business logic, hits the cache/database, and returns a status code + body. The response then travels back up the same chain. Everything you optimize (caching, indexes, pooling) lives here and in how it talks to its own dependencies.",
    lesson: "http-fundamentals",
  },
];

export default function NetworkingPage() {
  const [active, setActive] = React.useState<string>("dns");
  const stage = STAGES.find((s) => s.id === active)!;
  const Icon = stage.icon;

  return (
    <div className="space-y-6">
      <SectionHeading sub="Click each layer to see exactly what happens when a request travels from browser to backend -- and where the latency hides.">
        Networking Visualizer
      </SectionHeading>

      <Card>
        <CardBody>
          <div className="text-xs text-fg-faint">Request path</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {STAGES.map((s, i) => {
              const on = active === s.id;
              const SIcon = s.icon;
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      on
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-fg-muted hover:border-accent/40 hover:text-fg"
                    )}
                  >
                    <SIcon className="h-4 w-4" />
                    {s.label}
                  </button>
                  {i < STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-fg-faint" />}
                </React.Fragment>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card className="border-accent/30">
        <CardBody>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-fg">{stage.label}</h2>
                <Badge tone="muted">latency: {stage.latency}</Badge>
              </div>
              <p className="text-sm text-fg-muted">{stage.short}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-fg/90">{stage.detail}</p>
          {stage.lesson && isAuthored(stage.lesson) && (
            <Link href={`/learn/${stage.lesson}`}>
              <Button variant="secondary" size="sm" className="mt-4">
                Study this concept <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="mb-2 text-sm font-semibold text-fg">The big lesson</div>
          <p className="text-sm text-fg-muted">
            Before your backend does <span className="text-fg">any</span> work, a request can spend multiple round
            trips on DNS, TCP, and TLS. Across regions each RTT is ~100-200ms. That is why{" "}
            <span className="text-fg">connection reuse</span> and{" "}
            <span className="text-fg">moving compute closer to users/data</span> are the two most powerful latency
            levers -- often far more than optimizing the code itself.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
