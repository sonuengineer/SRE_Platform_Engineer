"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { newSrsState, schedule, type Rating, type SrsState } from "./srs";
import { todayISO, addDays } from "./utils";

export type LessonStatus = "not-started" | "in-progress" | "completed";

export interface LessonProgress {
  status: LessonStatus;
  quizBest: number | null; // 0..1
  quizAttempts: number;
  completedAt: string | null;
  needsRevision: boolean;
  lastVisited: string | null;
}

export interface IncidentResult {
  solved: boolean;
  attempts: number;
  bestScore: number; // 0..100
  hintsUsed: number;
}

export interface DesignResult {
  bestScore: number; // 0..100
  submissions: number;
}

export interface HighlightItem {
  id: string;
  text: string;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface StreakState {
  current: number;
  longest: number;
  lastActive: string | null;
  history: string[]; // ISO days active
}

export interface AppState {
  _hasHydrated: boolean;

  progress: Record<string, LessonProgress>;
  notes: Record<string, string>;
  bookmarks: string[];
  highlights: Record<string, HighlightItem[]>; // key = lesson slug
  srs: Record<string, SrsState>; // key = lesson slug (one memory card per lesson)

  xp: number;
  streak: StreakState;

  incidents: Record<string, IncidentResult>;
  designs: Record<string, DesignResult>;
  terminalSolved: string[];

  // activity per ISO day, for the study plan / daily goal
  activity: Record<string, { lessons: number; reviews: number }>;
  exams: Record<string, { bestScore: number; attempts: number; passed: boolean }>; // key = phase id
  challenges: Record<string, { solved: boolean; attempts: number }>; // key = challenge id

  // preferences
  theme: "dark" | "light";
  dailyGoal: { lessons: number; reviews: number };

  // actions
  setHasHydrated: (v: boolean) => void;
  visitLesson: (slug: string) => void;
  completeLesson: (slug: string) => void;
  recordQuiz: (slug: string, score: number) => void;
  setNote: (slug: string, text: string) => void;
  toggleBookmark: (slug: string) => void;
  toggleNeedsRevision: (slug: string) => void;
  addHighlight: (slug: string, text: string) => void;
  removeHighlight: (slug: string, id: string) => void;
  ensureCard: (slug: string) => void;
  reviewCard: (slug: string, rating: Rating) => void;
  recordIncident: (id: string, r: { score: number; hintsUsed: number; solved: boolean }) => void;
  recordDesign: (id: string, score: number) => void;
  solveTerminal: (id: string) => void;
  recordExam: (phaseId: string, score: number, passed: boolean) => void;
  recordChallenge: (id: string, solved: boolean) => void;
  setTheme: (t: "dark" | "light") => void;
  setDailyGoal: (goal: { lessons: number; reviews: number }) => void;
  resetAll: () => void;
}

function bumpActivity(
  activity: Record<string, { lessons: number; reviews: number }>,
  field: "lessons" | "reviews"
): Record<string, { lessons: number; reviews: number }> {
  const today = todayISO();
  const cur = activity[today] ?? { lessons: 0, reviews: 0 };
  return { ...activity, [today]: { ...cur, [field]: cur[field] + 1 } };
}

function emptyProgress(): LessonProgress {
  return {
    status: "not-started",
    quizBest: null,
    quizAttempts: 0,
    completedAt: null,
    needsRevision: false,
    lastVisited: null,
  };
}

function touchStreak(s: StreakState): StreakState {
  const today = todayISO();
  if (s.lastActive === today) return s;
  let current = 1;
  if (s.lastActive && addDays(s.lastActive, 1) === today) {
    current = s.current + 1;
  }
  const history = s.history.includes(today) ? s.history : [...s.history, today];
  return {
    current,
    longest: Math.max(s.longest, current),
    lastActive: today,
    history: history.slice(-400),
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      progress: {},
      notes: {},
      bookmarks: [],
      highlights: {},
      srs: {},
      xp: 0,
      streak: { current: 0, longest: 0, lastActive: null, history: [] },
      incidents: {},
      designs: {},
      terminalSolved: [],
      activity: {},
      exams: {},
      challenges: {},
      theme: "dark",
      dailyGoal: { lessons: 1, reviews: 10 },

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      visitLesson: (slug) =>
        set((st) => {
          const cur = st.progress[slug] ?? emptyProgress();
          const next: LessonProgress = {
            ...cur,
            status: cur.status === "completed" ? "completed" : "in-progress",
            lastVisited: todayISO(),
          };
          return { progress: { ...st.progress, [slug]: next }, streak: touchStreak(st.streak) };
        }),

      completeLesson: (slug) =>
        set((st) => {
          const cur = st.progress[slug] ?? emptyProgress();
          const already = cur.status === "completed";
          const next: LessonProgress = {
            ...cur,
            status: "completed",
            completedAt: cur.completedAt ?? todayISO(),
          };
          const srs = st.srs[slug] ? st.srs : { ...st.srs, [slug]: newSrsState() };
          return {
            progress: { ...st.progress, [slug]: next },
            srs,
            xp: st.xp + (already ? 0 : 50),
            streak: touchStreak(st.streak),
            activity: already ? st.activity : bumpActivity(st.activity, "lessons"),
          };
        }),

      recordQuiz: (slug, score) =>
        set((st) => {
          const cur = st.progress[slug] ?? emptyProgress();
          const prevBest = cur.quizBest ?? 0;
          const isNewPass = score >= 0.7 && prevBest < 0.7;
          const perfectBonus = score >= 1 && (cur.quizBest ?? 0) < 1 ? 20 : 0;
          const next: LessonProgress = {
            ...cur,
            quizBest: Math.max(prevBest, score),
            quizAttempts: cur.quizAttempts + 1,
          };
          return {
            progress: { ...st.progress, [slug]: next },
            xp: st.xp + (isNewPass ? 30 : 0) + perfectBonus,
            streak: touchStreak(st.streak),
          };
        }),

      setNote: (slug, text) => set((st) => ({ notes: { ...st.notes, [slug]: text } })),

      toggleBookmark: (slug) =>
        set((st) => ({
          bookmarks: st.bookmarks.includes(slug)
            ? st.bookmarks.filter((s) => s !== slug)
            : [...st.bookmarks, slug],
        })),

      toggleNeedsRevision: (slug) =>
        set((st) => {
          const cur = st.progress[slug] ?? emptyProgress();
          return {
            progress: { ...st.progress, [slug]: { ...cur, needsRevision: !cur.needsRevision } },
          };
        }),

      addHighlight: (slug, text) =>
        set((st) => {
          const clean = text.trim();
          if (clean.length < 3) return {};
          const cur = st.highlights[slug] ?? [];
          if (cur.some((h) => h.text === clean)) return {}; // dedupe
          return {
            highlights: { ...st.highlights, [slug]: [...cur, { id: genId(), text: clean }] },
          };
        }),

      removeHighlight: (slug, id) =>
        set((st) => {
          const cur = st.highlights[slug] ?? [];
          return { highlights: { ...st.highlights, [slug]: cur.filter((h) => h.id !== id) } };
        }),

      ensureCard: (slug) =>
        set((st) => (st.srs[slug] ? {} : { srs: { ...st.srs, [slug]: newSrsState() } })),

      reviewCard: (slug, rating) =>
        set((st) => {
          const cur = st.srs[slug] ?? newSrsState();
          const gain = rating === "again" ? 1 : rating === "hard" ? 3 : 5;
          return {
            srs: { ...st.srs, [slug]: schedule(cur, rating) },
            xp: st.xp + gain,
            streak: touchStreak(st.streak),
            activity: bumpActivity(st.activity, "reviews"),
          };
        }),

      recordIncident: (id, r) =>
        set((st) => {
          const cur = st.incidents[id] ?? { solved: false, attempts: 0, bestScore: 0, hintsUsed: 0 };
          const improved = r.score > cur.bestScore;
          const firstSolve = r.solved && !cur.solved;
          const xpGain = firstSolve ? Math.max(20, r.score) : improved ? Math.round((r.score - cur.bestScore) / 2) : 0;
          return {
            incidents: {
              ...st.incidents,
              [id]: {
                solved: cur.solved || r.solved,
                attempts: cur.attempts + 1,
                bestScore: Math.max(cur.bestScore, r.score),
                hintsUsed: cur.hintsUsed + r.hintsUsed,
              },
            },
            xp: st.xp + xpGain,
            streak: touchStreak(st.streak),
          };
        }),

      recordDesign: (id, score) =>
        set((st) => {
          const cur = st.designs[id] ?? { bestScore: 0, submissions: 0 };
          const improved = score > cur.bestScore;
          return {
            designs: {
              ...st.designs,
              [id]: { bestScore: Math.max(cur.bestScore, score), submissions: cur.submissions + 1 },
            },
            xp: st.xp + (improved ? Math.round((score - cur.bestScore) / 2) : 0),
            streak: touchStreak(st.streak),
          };
        }),

      solveTerminal: (id) =>
        set((st) => {
          if (st.terminalSolved.includes(id)) return {};
          return {
            terminalSolved: [...st.terminalSolved, id],
            xp: st.xp + 40,
            streak: touchStreak(st.streak),
          };
        }),

      recordExam: (phaseId, score, passed) =>
        set((st) => {
          const cur = st.exams[phaseId] ?? { bestScore: 0, attempts: 0, passed: false };
          const firstPass = passed && !cur.passed;
          const improved = score > cur.bestScore;
          return {
            exams: {
              ...st.exams,
              [phaseId]: {
                bestScore: Math.max(cur.bestScore, score),
                attempts: cur.attempts + 1,
                passed: cur.passed || passed,
              },
            },
            xp: st.xp + (firstPass ? 60 : improved ? 10 : 0),
            streak: touchStreak(st.streak),
          };
        }),

      recordChallenge: (id, solved) =>
        set((st) => {
          const cur = st.challenges[id] ?? { solved: false, attempts: 0 };
          const firstSolve = solved && !cur.solved;
          return {
            challenges: {
              ...st.challenges,
              [id]: { solved: cur.solved || solved, attempts: cur.attempts + 1 },
            },
            xp: st.xp + (firstSolve ? 25 : 0),
            streak: touchStreak(st.streak),
          };
        }),

      setTheme: (t) => set({ theme: t }),
      setDailyGoal: (goal) =>
        set({
          dailyGoal: {
            lessons: Math.max(0, Math.round(goal.lessons)),
            reviews: Math.max(0, Math.round(goal.reviews)),
          },
        }),

      resetAll: () =>
        set({
          progress: {},
          notes: {},
          bookmarks: [],
          highlights: {},
          srs: {},
          xp: 0,
          streak: { current: 0, longest: 0, lastActive: null, history: [] },
          incidents: {},
          designs: {},
          terminalSolved: [],
        }),
    }),
    {
      name: "engineering-lab-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (st) => {
        const { _hasHydrated, setHasHydrated, ...rest } = st as AppState;
        return rest as AppState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ---- Level curve ----------------------------------------------------------

const LEVEL_THRESHOLDS: number[] = (() => {
  const t: number[] = [0];
  let step = 100;
  for (let i = 1; i < 40; i++) {
    t.push(t[i - 1] + step);
    step += 40;
  }
  return t;
})();

const TITLES: { level: number; title: string }[] = [
  { level: 1, title: "Intern" },
  { level: 4, title: "Junior Engineer" },
  { level: 7, title: "Backend Engineer" },
  { level: 11, title: "Senior Backend Engineer" },
  { level: 14, title: "Platform Engineer" },
  { level: 17, title: "Site Reliability Engineer" },
  { level: 21, title: "Staff Engineer" },
  { level: 25, title: "Distributed Systems Engineer" },
  { level: 30, title: "Principal Engineer" },
];

export function levelFromXp(xp: number): {
  level: number;
  title: string;
  intoLevel: number;
  levelSpan: number;
  progress: number;
  nextLevelXp: number;
} {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const base = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? base + 400;
  const intoLevel = xp - base;
  const levelSpan = next - base;
  let title = "Intern";
  for (const t of TITLES) if (level >= t.level) title = t.title;
  return {
    level,
    title,
    intoLevel,
    levelSpan,
    progress: levelSpan > 0 ? intoLevel / levelSpan : 1,
    nextLevelXp: next,
  };
}
