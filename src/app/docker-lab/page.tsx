"use client";

import * as React from "react";
import { Layers, AlertTriangle, Lightbulb, HardDrive, FileCode } from "lucide-react";
import { Badge, Button, Card, CardBody, SectionHeading, Callout } from "@/components/ui";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Dockerfile parsing + layer model
// ---------------------------------------------------------------------------
const BAD_DOCKERFILE = `FROM python:3.11

WORKDIR /app

# BAD: copies the whole app before installing deps,
# so any code change busts the pip install cache below.
COPY . .

RUN pip install -r requirements.txt

EXPOSE 8000
CMD ["python", "app.py"]
`;

interface Layer {
  instruction: string; // FROM, RUN, COPY, ...
  arg: string;
  sizeMB: number;
  createsLayer: boolean; // FROM/RUN/COPY/ADD create filesystem layers
  cacheBusted: boolean; // rebuilds on a code change
  reason?: string;
}

// crude but illustrative base-image sizing
function baseImageSize(arg: string): number {
  const a = arg.toLowerCase();
  if (a.includes("alpine")) return 55;
  if (a.includes("slim")) return 130;
  if (a.includes("scratch")) return 0;
  if (a.includes("distroless")) return 25;
  if (a.includes("python")) return 1010;
  if (a.includes("node")) return 1090;
  if (a.includes("ubuntu")) return 78;
  if (a.includes("debian")) return 124;
  return 200;
}

function runSize(arg: string): number {
  const a = arg.toLowerCase();
  if (a.includes("pip install") || a.includes("npm install") || a.includes("npm ci")) return 240;
  if (a.includes("apt-get") || a.includes("apk add")) return 90;
  if (a.includes("build") || a.includes("make")) return 120;
  return 30;
}

function parseDockerfile(text: string): { layers: Layer[]; total: number; warnings: string[] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const layers: Layer[] = [];
  const warnings: string[] = [];

  let copyAllIndex = -1; // index in `layers` of a `COPY . .` (or COPY ./ )
  let installIndex = -1;

  for (const line of lines) {
    const sp = line.indexOf(" ");
    const instruction = (sp === -1 ? line : line.slice(0, sp)).toUpperCase();
    const arg = sp === -1 ? "" : line.slice(sp + 1).trim();

    let sizeMB = 0;
    let createsLayer = false;

    switch (instruction) {
      case "FROM":
        sizeMB = baseImageSize(arg);
        createsLayer = true;
        break;
      case "RUN":
        sizeMB = runSize(arg);
        createsLayer = true;
        break;
      case "COPY":
      case "ADD": {
        const isCopyAll = /^(\.|\.\/)\s+(\.|\.\/|\/app)/.test(arg) || arg.startsWith(". ");
        sizeMB = isCopyAll ? 45 : 6;
        createsLayer = true;
        if (isCopyAll && copyAllIndex === -1) copyAllIndex = layers.length;
        break;
      }
      default:
        // WORKDIR, EXPOSE, ENV, CMD, ENTRYPOINT, LABEL, USER -> metadata only
        sizeMB = 0;
        createsLayer = false;
    }

    if (
      instruction === "RUN" &&
      /(pip install|npm install|npm ci|yarn install|go mod download|bundle install)/i.test(arg)
    ) {
      if (installIndex === -1) installIndex = layers.length;
    }

    layers.push({ instruction, arg, sizeMB, createsLayer, cacheBusted: false });
  }

  // Cache-bust analysis: if a `COPY . .` appears BEFORE the dependency install,
  // then the install layer and everything after it rebuilds on any code change.
  const badOrder = copyAllIndex !== -1 && installIndex !== -1 && copyAllIndex < installIndex;
  if (badOrder) {
    for (let i = installIndex; i < layers.length; i++) {
      if (layers[i].createsLayer) {
        layers[i].cacheBusted = true;
        if (i === installIndex) layers[i].reason = "cache-busted by the earlier COPY . .";
      }
    }
    // the COPY . . itself also rebuilds on code change
    if (layers[copyAllIndex]) {
      layers[copyAllIndex].cacheBusted = true;
      layers[copyAllIndex].reason = "changes on every code edit";
    }
    warnings.push(
      "COPY . . runs before the dependency install. Any source-code change invalidates the copy layer, which busts the install layer and everything after it -- so every build re-installs all dependencies. Fix: copy ONLY the manifest (requirements.txt / package.json), run the install, THEN COPY . ."
    );
  }

  // Fat base image warning
  const from = layers.find((l) => l.instruction === "FROM");
  if (from && baseImageSize(from.arg) >= 1000) {
    warnings.push(
      `Base image "${from.arg}" is a full image (~${baseImageSize(from.arg)}MB). A -slim or -alpine variant can cut hundreds of MB.`
    );
  }

  // non-root
  if (!layers.some((l) => l.instruction === "USER")) {
    warnings.push("No USER instruction -- the container runs as root. Add a non-root USER for a smaller blast radius.");
  }

  // apt cache not cleaned
  if (layers.some((l) => l.instruction === "RUN" && /apt-get install/i.test(l.arg) && !/rm -rf \/var\/lib\/apt/i.test(l.arg))) {
    warnings.push("apt-get install without cleaning /var/lib/apt/lists in the same RUN leaves cache bloat in the layer.");
  }

  const total = layers.reduce((s, l) => s + l.sizeMB, 0);
  return { layers, total, warnings };
}

const HINTS = [
  "Order by change frequency: copy dependency manifests and install BEFORE copying source. Deps change rarely, code changes constantly -- keep the expensive install layer cached.",
  "Use a slim / alpine / distroless base. python:3.11-slim vs python:3.11 alone can save ~900MB.",
  "Add a .dockerignore (node_modules, .git, __pycache__, tests) so COPY . . does not drag junk into the image and invalidate cache needlessly.",
  "Use multi-stage builds: compile in a fat builder stage, COPY only the built artifact into a tiny runtime stage.",
  "Run as a non-root USER and combine related RUN commands (cleaning caches in the same layer) to shrink the final image.",
];

export default function DockerLabPage() {
  const [text, setText] = React.useState(BAD_DOCKERFILE);
  const { layers, total, warnings } = React.useMemo(() => parseDockerfile(text), [text]);

  const fsLayers = layers.filter((l) => l.createsLayer);
  const cachedCount = fsLayers.filter((l) => !l.cacheBusted).length;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <SectionHeading sub="Edit the Dockerfile and watch it parse into image layers live. The starter is deliberately bad -- fix the layer order and the base image to shrink builds.">
          Docker Lab
        </SectionHeading>
        <Badge tone="warn">SIMULATED</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor */}
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <FileCode className="h-4 w-4 text-accent" /> Dockerfile
              </div>
              <Button variant="ghost" size="sm" onClick={() => setText(BAD_DOCKERFILE)}>
                Reset to starter
              </Button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              rows={16}
              className="w-full resize-y rounded-lg border border-border bg-[#08090d] p-3 font-mono text-xs leading-relaxed text-fg focus:border-accent/50 focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-4 text-xs text-fg-faint">
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                est. image size:{" "}
                <span className={cn("font-mono font-semibold", total > 1200 ? "text-bad" : total > 400 ? "text-warn" : "text-good")}>
                  {total} MB
                </span>
              </span>
              <span>
                cached layers: <span className="font-mono text-fg">{cachedCount}/{fsLayers.length}</span>
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Layer visualization */}
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Layers className="h-4 w-4 text-accent" /> Layers (top = last)
            </div>
            <div className="space-y-1.5">
              {fsLayers.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-fg-faint">
                  No layer-creating instructions yet. Add a FROM.
                </div>
              )}
              {[...fsLayers].reverse().map((l, i) => {
                const widthPct = Math.max(6, Math.min(100, (l.sizeMB / Math.max(total, 1)) * 100));
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border px-3 py-2 transition-colors",
                      l.cacheBusted ? "border-bad/40 bg-bad/[0.06]" : "border-good/25 bg-good/[0.05]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-accent">{l.instruction}</span>{" "}
                        <span className="font-mono text-[11px] text-fg-muted">
                          {l.arg.length > 46 ? l.arg.slice(0, 46) + "..." : l.arg}
                        </span>
                      </div>
                      <Badge tone={l.cacheBusted ? "bad" : "good"}>
                        {l.cacheBusted ? "rebuild" : "cached"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-bg-hover">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${widthPct}%`, background: l.cacheBusted ? "#f85149" : "#3fb950" }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[11px] text-fg-faint">{l.sizeMB} MB</span>
                    </div>
                    {l.reason && <div className="mt-1 text-[10px] text-bad">{l.reason}</div>}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <Callout key={i} tone="warn" title={i === 0 ? "Layer cache problem" : "Warning"}>
              <span className="inline-flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <span>{w}</span>
              </span>
            </Callout>
          ))}
        </div>
      )}
      {warnings.length === 0 && (
        <Callout tone="good" title="No warnings">
          This Dockerfile orders layers by change frequency, uses a lean base, and runs as non-root. Dependency installs
          stay cached across code edits.
        </Callout>
      )}

      {/* Hints */}
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <Lightbulb className="h-4 w-4 text-warn" /> Optimization hints
          </div>
          <ul className="space-y-2">
            {HINTS.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-fg/90">
                <span className="mt-0.5 font-mono text-xs text-accent">{i + 1}.</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
