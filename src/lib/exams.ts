import { CURRICULUM } from "@/content/curriculum";
import { getLesson, isAuthored, ALL_LESSONS } from "@/content";
import type { QuizQuestion, SkillId } from "@/content/types";
import { hashString } from "@/lib/utils";
import type { SkillProgress } from "@/lib/gamification";

export const EXAM_SIZE = 10;
export const PASS_THRESHOLD = 0.7;

export interface PhaseExamMeta {
  phaseId: string;
  index: number;
  title: string;
  available: number; // number of quiz questions available
}

/** Authored lesson slugs within a phase. */
export function phaseAuthoredSlugs(phaseId: string): string[] {
  const phase = CURRICULUM.find((p) => p.id === phaseId);
  if (!phase) return [];
  return phase.modules.flatMap((m) => m.lessons).filter(isAuthored);
}

/** All quiz questions available in a phase (across its authored lessons). */
export function phaseQuestions(phaseId: string): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const slug of phaseAuthoredSlugs(phaseId)) {
    const l = getLesson(slug);
    if (l) out.push(...l.quiz);
  }
  return out;
}

export function examsIndex(): PhaseExamMeta[] {
  return CURRICULUM.map((p) => ({
    phaseId: p.id,
    index: p.index,
    title: p.title,
    available: phaseQuestions(p.id).length,
  })).filter((e) => e.available >= 4);
}

/** Deterministic sample of up to `size` questions, varied by `seed`. */
export function buildExam(phaseId: string, size = EXAM_SIZE, seed = 0): QuizQuestion[] {
  const all = phaseQuestions(phaseId);
  const ranked = all
    .map((q, i) => ({ q, k: hashString(`${q.id}:${seed}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.q);
  return ranked.slice(0, Math.min(size, ranked.length));
}

// ---- Role readiness --------------------------------------------------------

export interface RoleReadiness {
  role: string;
  score: number; // 0..100
  skills: SkillId[];
}

const ROLES: { role: string; skills: SkillId[] }[] = [
  { role: "Backend Engineer", skills: ["backend", "python", "typescript", "databases", "redis"] },
  { role: "Platform Engineer", skills: ["docker", "kubernetes", "cloud", "terraform", "cicd", "platform"] },
  { role: "Site Reliability Engineer", skills: ["linux", "networking", "observability", "sre", "distributed"] },
];

export function computeReadiness(skills: SkillProgress[]): RoleReadiness[] {
  const byId = Object.fromEntries(skills.map((s) => [s.id, s.pct]));
  return ROLES.map((r) => {
    const vals = r.skills.map((id) => byId[id] ?? 0);
    const score = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return { role: r.role, score, skills: r.skills };
  });
}

export function totalAuthoredQuestions(): number {
  return ALL_LESSONS.reduce((n, l) => n + l.quiz.length, 0);
}
