"use client";

import Link from "next/link";
import { Waypoints, ArrowRight, Star } from "lucide-react";
import { DESIGN_PROBLEMS } from "@/content/system-design";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Card, CardBody, SectionHeading } from "@/components/ui";

export default function SystemDesignPage() {
  const designs = useStore((s) => s.designs);
  const hydrated = useHydrated();

  return (
    <div className="space-y-5">
      <SectionHeading sub="Assemble an architecture from real components. The platform evaluates it across scalability, availability, reliability, consistency, cost, and security.">
        System Design Lab
      </SectionHeading>

      <div className="grid gap-3 md:grid-cols-2">
        {DESIGN_PROBLEMS.map((d) => {
          const res = hydrated ? designs[d.id] : undefined;
          return (
            <Link key={d.id} href={`/system-design/${d.id}`}>
              <Card className="h-full transition-colors hover:border-accent/40">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Waypoints className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-fg">{d.title}</h3>
                        {res && res.bestScore > 0 && (
                          <Badge tone={res.bestScore >= 70 ? "good" : "warn"}>
                            <Star className="h-3 w-3" /> {res.bestScore}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-fg-muted line-clamp-2">{d.prompt}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.tags.slice(0, 4).map((t) => (
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
