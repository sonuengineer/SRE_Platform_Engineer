"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Trophy, Lock, Zap, RotateCcw } from "lucide-react";
import { useStore, levelFromXp } from "@/lib/store";
import { computeAchievements, computeStats } from "@/lib/gamification";
import { useHydrated } from "@/components/hydrated";
import { Badge, Button, Card, CardBody, SectionHeading, StatTile } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function AchievementsPage() {
  const state = useStore();
  const resetAll = useStore((s) => s.resetAll);
  const hydrated = useHydrated();

  const achievements = computeAchievements(state);
  const stats = computeStats(state);
  const lvl = levelFromXp(state.xp);
  const earned = achievements.filter((a) => a.earned).length;

  const confirmReset = () => {
    if (window.confirm("Reset ALL progress (lessons, XP, streak, reviews, incidents)? This cannot be undone.")) {
      resetAll();
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading sub="Progress markers for a serious training platform -- earned by doing the work, not clicking buttons.">
        Achievements & Profile
      </SectionHeading>

      {/* Level card */}
      <Card className="border-accent/30">
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-2xl font-bold text-accent">
                {hydrated ? lvl.level : 1}
              </div>
              <div>
                <div className="text-lg font-semibold text-fg">{lvl.title}</div>
                <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                  <Zap className="h-4 w-4 text-accent" />
                  {hydrated ? state.xp : 0} XP
                </div>
                <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-bg-hover">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${hydrated ? Math.round(lvl.progress * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-fg-faint">
                  {hydrated ? `${lvl.intoLevel}/${lvl.levelSpan} to Lv ${lvl.level + 1}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-soft px-4 py-3">
              <Trophy className="h-5 w-5 text-warn" />
              <div>
                <div className="text-lg font-semibold text-fg">
                  {hydrated ? earned : 0}/{achievements.length}
                </div>
                <div className="text-[11px] text-fg-faint">achievements</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Lessons done" value={hydrated ? stats.lessonsCompleted : 0} sub={`of ${stats.lessonsAuthored} authored`} />
        <StatTile label="Quizzes passed" value={hydrated ? stats.quizzesPassed : 0} accent="#3fb950" />
        <StatTile label="Incidents solved" value={hydrated ? stats.incidentsSolved : 0} accent="#f85149" />
        <StatTile label="Cards reviewed" value={hydrated ? stats.cardsReviewed : 0} accent="#bc8cff" />
      </div>

      {/* Achievement grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => {
          const earnedNow = hydrated && a.earned;
          const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[a.icon] ?? Trophy;
          return (
            <Card key={a.id} className={cn("transition-colors", earnedNow ? "border-accent/40" : "opacity-70")}>
              <CardBody className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    earnedNow ? "bg-accent/15 text-accent" : "bg-bg-hover text-fg-faint"
                  )}
                >
                  {earnedNow ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", earnedNow ? "text-fg" : "text-fg-muted")}>
                      {a.title}
                    </span>
                    {earnedNow && <Badge tone="good">earned</Badge>}
                  </div>
                  <p className="text-xs text-fg-faint">{a.desc}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Danger zone */}
      <Card className="border-bad/20">
        <CardBody className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-fg">Reset progress</div>
            <p className="text-xs text-fg-muted">Clears all local data. Useful for starting fresh.</p>
          </div>
          <Button variant="danger" size="sm" onClick={confirmReset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
