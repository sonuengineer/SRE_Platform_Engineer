import type { SkillId, SkillMeta } from "./types";

export const SKILLS: SkillMeta[] = [
  { id: "backend", label: "Backend Engineering", color: "#6ea8fe" },
  { id: "python", label: "Python", color: "#4b8bbe" },
  { id: "typescript", label: "TypeScript / Node", color: "#3178c6" },
  { id: "databases", label: "Databases", color: "#f0a04b" },
  { id: "redis", label: "Redis / Caching", color: "#e0563b" },
  { id: "kafka", label: "Kafka / Messaging", color: "#8a63d2" },
  { id: "linux", label: "Linux", color: "#c9d1d9" },
  { id: "networking", label: "Networking", color: "#56d4bc" },
  { id: "docker", label: "Docker", color: "#2496ed" },
  { id: "kubernetes", label: "Kubernetes", color: "#326ce5" },
  { id: "cloud", label: "Cloud / AWS", color: "#ff9900" },
  { id: "terraform", label: "Terraform", color: "#7b42bc" },
  { id: "cicd", label: "CI/CD", color: "#4caf50" },
  { id: "observability", label: "Observability", color: "#e6a817" },
  { id: "sre", label: "SRE", color: "#f85149" },
  { id: "distributed", label: "Distributed Systems", color: "#bc8cff" },
  { id: "platform", label: "Platform Engineering", color: "#39c5cf" },
  { id: "systemdesign", label: "System Design", color: "#db61a2" },
];

export const SKILL_MAP: Record<SkillId, SkillMeta> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
) as Record<SkillId, SkillMeta>;
