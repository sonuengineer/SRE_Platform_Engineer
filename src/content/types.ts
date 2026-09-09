// Structured content types. Lessons are DATA, not hardcoded components.

export type Difficulty = "intro" | "core" | "advanced" | "expert";

export type TrackId = "python" | "typescript" | "shared";

export interface QuizChoice {
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: QuizChoice[];
  explanation: string;
}

export interface CodeSample {
  label: string;
  language: string;
  code: string;
}

/** A dual-ecosystem comparison (FastAPI vs NestJS etc.). */
export interface DualCode {
  concept: string;
  python?: CodeSample;
  typescript?: CodeSample;
  note?: string;
}

export interface MemoryCard {
  problem: string;
  mentalModel: string;
  keyConcepts: string[];
  productionConnection: string;
  oneLiner: string;
}

/** A single terminal-driven investigation attached to a lesson. */
export interface LessonLab {
  kind: "terminal" | "instructions" | "diagram-explore";
  title: string;
  brief: string;
  // For terminal labs: a scenario id resolved by the terminal engine.
  scenarioId?: string;
  // For instruction labs: markdown steps to run locally.
  steps?: string;
  successCriteria?: string[];
}

export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
}
export interface Diagram {
  title: string;
  // Simple layered/flow diagram rendered by <FlowDiagram/>.
  layers: DiagramNode[];
  caption?: string;
}

export interface Lesson {
  slug: string;
  title: string;
  track: TrackId;
  phase: string; // phase id
  module: string; // module id within phase
  difficulty: Difficulty;
  estMinutes: number;
  summary: string;
  prerequisites: string[]; // slugs
  relatedConcepts: string[]; // slugs or free text

  // Structured teaching sections. All markdown strings.
  why: string;
  intuition: string;
  howItWorks: string;
  internals?: string;
  realWorld?: string;
  production?: string;
  commonMistakes?: string[];
  tradeoffs?: string; // markdown table or prose
  whenToUse?: string[];
  whenNotToUse?: string[];

  diagram?: Diagram;
  code?: CodeSample[];
  dualCode?: DualCode[];

  memoryCard: MemoryCard;
  quiz: QuizQuestion[];
  lab?: LessonLab;
  tags: string[];
}

export interface Module {
  id: string;
  title: string;
  lessons: string[]; // lesson slugs
}

export interface Phase {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  skill: SkillId; // maps to a dashboard skill
  modules: Module[];
}

export type SkillId =
  | "backend"
  | "python"
  | "typescript"
  | "linux"
  | "networking"
  | "databases"
  | "redis"
  | "kafka"
  | "docker"
  | "kubernetes"
  | "cloud"
  | "terraform"
  | "cicd"
  | "observability"
  | "sre"
  | "distributed"
  | "platform"
  | "systemdesign";

export interface SkillMeta {
  id: SkillId;
  label: string;
  color: string;
}
