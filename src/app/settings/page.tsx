"use client";

import * as React from "react";
import { Sun, Moon, Download, Upload, RotateCcw, Target, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Button, Card, CardBody, SectionHeading, Callout } from "@/components/ui";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "engineering-lab-v1";

export default function SettingsPage() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const dailyGoal = useStore((s) => s.dailyGoal);
  const setDailyGoal = useStore((s) => s.setDailyGoal);
  const resetAll = useStore((s) => s.resetAll);
  const hydrated = useHydrated();

  const [lessons, setLessons] = React.useState(dailyGoal.lessons);
  const [reviews, setReviews] = React.useState(dailyGoal.reviews);
  const [saved, setSaved] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLessons(dailyGoal.lessons);
    setReviews(dailyGoal.reviews);
  }, [dailyGoal.lessons, dailyGoal.reviews]);

  const saveGoal = () => {
    setDailyGoal({ lessons, reviews });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const exportData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? "{}";
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `engineering-lab-progress-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setImportMsg("Export failed.");
    }
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        JSON.parse(text); // validate
        localStorage.setItem(STORAGE_KEY, text);
        setImportMsg("Imported. Reloading...");
        setTimeout(() => window.location.reload(), 700);
      } catch {
        setImportMsg("That file is not valid progress JSON.");
      }
    };
    reader.readAsText(file);
  };

  const confirmReset = () => {
    if (window.confirm("Reset ALL progress? This clears lessons, XP, streak, reviews, highlights, exams, and challenges. Cannot be undone.")) {
      resetAll();
      setImportMsg("Progress reset.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading sub="Preferences and your data. Everything is stored locally in this browser.">
        Settings
      </SectionHeading>

      {/* Theme */}
      <Card>
        <CardBody>
          <div className="text-sm font-semibold text-fg">Appearance</div>
          <p className="mt-0.5 text-xs text-fg-muted">Dark is the default. Light theme is easier in bright rooms.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                (!hydrated || theme === "dark") ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-fg-muted hover:text-fg"
              )}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                hydrated && theme === "light" ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-fg-muted hover:text-fg"
              )}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Daily goal */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Target className="h-4 w-4 text-accent" /> Daily study goal
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            Set how much you aim to do each day. Progress shows on the dashboard.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label className="text-xs text-fg-muted">
              Lessons / day
              <input
                type="number"
                min={0}
                max={50}
                value={lessons}
                onChange={(e) => setLessons(Number(e.target.value))}
                className="mt-1 block w-24 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg outline-none focus:border-accent/50"
              />
            </label>
            <label className="text-xs text-fg-muted">
              Reviews / day
              <input
                type="number"
                min={0}
                max={500}
                value={reviews}
                onChange={(e) => setReviews(Number(e.target.value))}
                className="mt-1 block w-24 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg outline-none focus:border-accent/50"
              />
            </label>
            <Button variant="primary" size="sm" onClick={saveGoal}>
              {saved ? <Check className="h-4 w-4" /> : null}
              {saved ? "Saved" : "Save goal"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Data */}
      <Card>
        <CardBody>
          <div className="text-sm font-semibold text-fg">Your data</div>
          <p className="mt-0.5 text-xs text-fg-muted">
            All progress lives in this browser only. Export a backup, or import it on another machine.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportData}>
              <Download className="h-4 w-4" /> Export progress (JSON)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import progress
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          </div>
          {importMsg && (
            <Callout tone="info" title="">
              {importMsg}
            </Callout>
          )}
        </CardBody>
      </Card>

      {/* Danger */}
      <Card className="border-bad/20">
        <CardBody className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-fg">Reset progress</div>
            <p className="text-xs text-fg-muted">Clears all local data. Consider exporting a backup first.</p>
          </div>
          <Button variant="danger" size="sm" onClick={confirmReset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
