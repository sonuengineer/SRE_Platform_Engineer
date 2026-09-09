import { ALL_LESSONS } from "@/content";
import { INCIDENTS } from "@/content/incidents";
import { DESIGN_PROBLEMS } from "@/content/system-design";

export type SearchKind = "lesson" | "incident" | "design" | "memory" | "concept";

export interface SearchResult {
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  tags?: string[];
}

interface IndexEntry {
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  haystack: string;
  tags?: string[];
}

let INDEX: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];

  for (const l of ALL_LESSONS) {
    const tagStr = l.tags.join(" ");
    entries.push({
      kind: "lesson",
      title: l.title,
      subtitle: l.summary,
      href: `/learn/${l.slug}`,
      haystack: `${l.title} ${l.summary} ${tagStr} ${l.why}`.toLowerCase(),
      tags: l.tags,
    });
    // memory card as its own searchable entity
    entries.push({
      kind: "memory",
      title: `${l.title} - memory card`,
      subtitle: l.memoryCard.oneLiner,
      href: `/learn/${l.slug}#memory`,
      haystack: `${l.title} ${l.memoryCard.oneLiner} ${l.memoryCard.keyConcepts.join(" ")} ${tagStr}`.toLowerCase(),
      tags: l.tags,
    });
  }

  for (const inc of INCIDENTS) {
    entries.push({
      kind: "incident",
      title: inc.title,
      subtitle: inc.symptom,
      href: `/incidents/${inc.id}`,
      haystack: `${inc.title} ${inc.symptom} ${inc.tags.join(" ")}`.toLowerCase(),
      tags: inc.tags,
    });
  }

  for (const d of DESIGN_PROBLEMS) {
    entries.push({
      kind: "design",
      title: d.title,
      subtitle: d.prompt,
      href: `/system-design/${d.id}`,
      haystack: `${d.title} ${d.prompt} ${d.tags.join(" ")}`.toLowerCase(),
      tags: d.tags,
    });
  }

  return entries;
}

export function search(query: string, limit = 20): SearchResult[] {
  if (!INDEX) INDEX = buildIndex();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = [];
  for (const e of INDEX) {
    let score = 0;
    for (const t of terms) {
      if (e.title.toLowerCase().includes(t)) score += 5;
      if (e.tags?.some((tag) => tag.includes(t))) score += 3;
      if (e.haystack.includes(t)) score += 1;
    }
    // exact title/substring boost
    if (e.title.toLowerCase().includes(q)) score += 4;
    if (score > 0) {
      results.push({
        kind: e.kind,
        title: e.title,
        subtitle: e.subtitle,
        href: e.href,
        tags: e.tags,
        score,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
