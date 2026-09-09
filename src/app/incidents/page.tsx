"use client";

import Link from "next/link";
import { Siren, CheckCircle2, ArrowRight } from "lucide-react";
import { INCIDENTS } from "@/content/incidents";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Card, CardBody, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

const sevTone = { SEV1: "bad", SEV2: "warn", SEV3: "info" } as const;

export default function IncidentsPage() {
  const incidents = useStore((s) => s.incidents);
  const hydrated = useHydrated();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeading sub="Diagnose real production incidents from dashboards, logs, and metrics. Hints cost points -- the platform scores your diagnosis.">
          Incident Lab
        </SectionHeading>
        <Badge tone="warn">SIMULATED</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {INCIDENTS.map((inc) => {
          const result = hydrated ? incidents[inc.id] : undefined;
          return (
            <Link key={inc.id} href={`/incidents/${inc.id}`}>
              <Card className="h-full transition-colors hover:border-bad/40">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        inc.severity === "SEV1" ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn"
                      )}
                    >
                      <Siren className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={sevTone[inc.severity]}>{inc.severity}</Badge>
                        <span className="text-xs text-fg-faint">{inc.service}</span>
                        {result?.solved && (
                          <Badge tone="good">
                            <CheckCircle2 className="h-3 w-3" /> {result.bestScore}
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-semibold text-fg">{inc.title}</h3>
                      <p className="mt-1 text-sm text-fg-muted line-clamp-2">{inc.symptom}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {inc.tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] text-fg-faint">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-fg-faint" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
