import type { AppState } from "./store";
import { levelFromXp } from "./store";
import { CURRICULUM } from "@/content/curriculum";
import { SKILLS } from "@/content/skills";
import { ALL_LESSONS } from "@/content";
import type { SkillId } from "@/content/types";

// ---- Skill percentages -----------------------------------------------------

export interface SkillProgress {
  id: SkillId;
  label: string;
  color: string;
  completed: number;
  total: number;
  pct: number; // 0..100
}

function slugsForSkill(skill: SkillId): string[] {
  const out: string[] = [];
  for (const p of CURRICULUM) {
    if (p.skill !== skill) continue;
    for (const m of p.modules) out.push(...m.lessons);
  }
  return out;
}

export function computeSkills(state: AppState): SkillProgress[] {
  return SKILLS.map((s) => {
    const slugs = slugsForSkill(s.id);
    const total = slugs.length;
    const completed = slugs.filter((sl) => state.progress[sl]?.status === "completed").length;
    return {
      id: s.id,
      label: s.label,
      color: s.color,
      completed,
      total,
      pct: total > 0 ? (completed / total) * 100 : 0,
    };
  });
}

// ---- Aggregate stats -------------------------------------------------------

export interface Stats {
  lessonsCompleted: number;
  lessonsAuthored: number;
  quizzesPassed: number;
  cardsReviewed: number;
  incidentsSolved: number;
  designsSubmitted: number;
  terminalSolved: number;
  bookmarks: number;
  needsRevision: number;
  overallPct: number;
}

export function computeStats(state: AppState): Stats {
  const progress = Object.values(state.progress);
  const lessonsCompleted = progress.filter((p) => p.status === "completed").length;
  const quizzesPassed = progress.filter((p) => (p.quizBest ?? 0) >= 0.7).length;
  const cardsReviewed = Object.values(state.srs).filter((s) => s.lastReviewed).length;
  const incidentsSolved = Object.values(state.incidents).filter((i) => i.solved).length;
  const designsSubmitted = Object.values(state.designs).filter((d) => d.submissions > 0).length;
  const needsRevision = progress.filter((p) => p.needsRevision).length;

  // overall progress across the whole curriculum
  const totalCurriculum = CURRICULUM.reduce(
    (n, p) => n + p.modules.reduce((mn, m) => mn + m.lessons.length, 0),
    0
  );

  return {
    lessonsCompleted,
    lessonsAuthored: ALL_LESSONS.length,
    quizzesPassed,
    cardsReviewed,
    incidentsSolved,
    designsSubmitted,
    terminalSolved: state.terminalSolved.length,
    bookmarks: state.bookmarks.length,
    needsRevision,
    overallPct: totalCurriculum > 0 ? (lessonsCompleted / totalCurriculum) * 100 : 0,
  };
}

// ---- Achievements ----------------------------------------------------------

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string; // lucide icon name
  earned: boolean;
}

export function computeAchievements(state: AppState): Achievement[] {
  const s = computeStats(state);
  const lvl = levelFromXp(state.xp);

  const list: Achievement[] = [
    { id: "first-lesson", title: "First Contact", desc: "Complete your first lesson", icon: "Rocket", earned: s.lessonsCompleted >= 1 },
    { id: "five-lessons", title: "Getting Serious", desc: "Complete 5 lessons", icon: "BookOpen", earned: s.lessonsCompleted >= 5 },
    { id: "quiz-ace", title: "Quiz Ace", desc: "Pass 3 quizzes", icon: "Brain", earned: s.quizzesPassed >= 3 },
    { id: "reviewer", title: "Spaced Learner", desc: "Review 10 memory cards", icon: "Repeat", earned: s.cardsReviewed >= 10 },
    { id: "streak-3", title: "Consistency", desc: "3-day learning streak", icon: "Flame", earned: state.streak.current >= 3 },
    { id: "streak-7", title: "On a Roll", desc: "7-day learning streak", icon: "Flame", earned: state.streak.current >= 7 },
    { id: "first-incident", title: "Firefighter", desc: "Resolve your first incident", icon: "Siren", earned: s.incidentsSolved >= 1 },
    { id: "three-incidents", title: "Incident Commander", desc: "Resolve 3 incidents", icon: "ShieldAlert", earned: s.incidentsSolved >= 3 },
    { id: "terminal", title: "Shell Access", desc: "Solve a terminal scenario", icon: "Terminal", earned: s.terminalSolved >= 1 },
    { id: "architect", title: "Architect", desc: "Submit a system design", icon: "Network", earned: s.designsSubmitted >= 1 },
    { id: "level-5", title: "Junior Engineer", desc: "Reach level 4", icon: "TrendingUp", earned: lvl.level >= 4 },
    { id: "level-backend", title: "Backend Engineer", desc: "Reach level 7", icon: "Server", earned: lvl.level >= 7 },
  ];
  return list;
}
