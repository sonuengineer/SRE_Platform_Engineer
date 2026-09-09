import type { Lesson } from "./types";
import { networkingLessons } from "./lessons/networking";
import { networkingExtraLessons } from "./lessons/networking-extra";
import { backendLessons } from "./lessons/backend";
import { dataLessons } from "./lessons/data";
import { platformLessons } from "./lessons/platform";
import { reliabilityLessons } from "./lessons/reliability";
import { linuxLessons } from "./lessons/linux";
import { postgresLessons } from "./lessons/postgres";
import { observabilityLessons } from "./lessons/observability";
import { infraLessons } from "./lessons/infra";
import { fundamentalsLessons } from "./lessons/fundamentals";
import { pythonLessons } from "./lessons/python";
import { jstsLessons } from "./lessons/jsts";
import { backendExtraLessons } from "./lessons/backend-extra";
import { fastapiLessons } from "./lessons/fastapi";
import { nestLessons } from "./lessons/nest";
import { redisExtraLessons } from "./lessons/redis-extra";
import { kafkaExtraLessons } from "./lessons/kafka-extra";
import { dockerExtraLessons } from "./lessons/docker-extra";
import { k8sExtraLessons } from "./lessons/k8s-extra";
import { awsLessons } from "./lessons/aws";
import { sreLessons } from "./lessons/sre";
import { distributedExtraLessons } from "./lessons/distributed-extra";
import { platformEngLessons } from "./lessons/platform-eng";
import { systemDesignLessons } from "./lessons/system-design-lessons";
import { capstoneLessons } from "./lessons/capstone";
import { dualAdvancedLessons } from "./lessons/dual-advanced";

export * from "./types";
export { CURRICULUM, PHASE_BY_ID, allCurriculumSlugs, phaseForSlug } from "./curriculum";
export { SKILLS, SKILL_MAP } from "./skills";

export const ALL_LESSONS: Lesson[] = [
  ...networkingLessons,
  ...networkingExtraLessons,
  ...backendLessons,
  ...dataLessons,
  ...platformLessons,
  ...reliabilityLessons,
  ...linuxLessons,
  ...postgresLessons,
  ...observabilityLessons,
  ...infraLessons,
  ...fundamentalsLessons,
  ...pythonLessons,
  ...jstsLessons,
  ...backendExtraLessons,
  ...fastapiLessons,
  ...nestLessons,
  ...redisExtraLessons,
  ...kafkaExtraLessons,
  ...dockerExtraLessons,
  ...k8sExtraLessons,
  ...awsLessons,
  ...sreLessons,
  ...distributedExtraLessons,
  ...platformEngLessons,
  ...systemDesignLessons,
  ...capstoneLessons,
  ...dualAdvancedLessons,
];

export const LESSON_BY_SLUG: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map((l) => [l.slug, l])
);

export function getLesson(slug: string): Lesson | undefined {
  return LESSON_BY_SLUG[slug];
}

export function isAuthored(slug: string): boolean {
  return slug in LESSON_BY_SLUG;
}

/** Total quiz questions across all authored lessons (for stats). */
export function totalQuizQuestions(): number {
  return ALL_LESSONS.reduce((n, l) => n + l.quiz.length, 0);
}
