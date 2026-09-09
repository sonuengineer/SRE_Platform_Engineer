"use client";

import Link from "next/link";
import { Bookmark, StickyNote, RefreshCw, ArrowRight, Highlighter, X } from "lucide-react";
import { ALL_LESSONS, getLesson } from "@/content";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/hydrated";
import { Badge, Card, CardBody, SectionHeading } from "@/components/ui";

export default function BookmarksPage() {
  const bookmarks = useStore((s) => s.bookmarks);
  const notes = useStore((s) => s.notes);
  const progress = useStore((s) => s.progress);
  const highlights = useStore((s) => s.highlights);
  const removeHighlight = useStore((s) => s.removeHighlight);
  const hydrated = useHydrated();

  const noteSlugs = Object.keys(notes).filter((s) => notes[s]?.trim());
  const revisionSlugs = ALL_LESSONS.filter((l) => progress[l.slug]?.needsRevision).map((l) => l.slug);
  const highlightSlugs = Object.keys(highlights).filter((s) => (highlights[s] ?? []).length > 0);
  const totalHighlights = highlightSlugs.reduce((n, s) => n + (highlights[s]?.length ?? 0), 0);

  return (
    <div className="space-y-8">
      <SectionHeading sub="Everything you've saved: bookmarks, personal notes, and concepts flagged for revision.">
        Bookmarks & Notes
      </SectionHeading>

      {!hydrated && <p className="text-sm text-fg-faint">Loading...</p>}

      {hydrated && (
        <>
          {/* Bookmarks */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Bookmark className="h-4 w-4 text-accent" /> Bookmarks ({bookmarks.length})
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-fg-faint">
                No bookmarks yet. Use the bookmark icon on any lesson to save it here.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {bookmarks.map((slug) => {
                  const l = getLesson(slug);
                  if (!l) return null;
                  return (
                    <Link key={slug} href={`/learn/${slug}`}>
                      <Card className="transition-colors hover:border-accent/50">
                        <CardBody className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-fg">{l.title}</div>
                            <div className="truncate text-xs text-fg-faint">{l.summary}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-fg-faint" />
                        </CardBody>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Needs revision */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <RefreshCw className="h-4 w-4 text-warn" /> Needs revision ({revisionSlugs.length})
            </div>
            {revisionSlugs.length === 0 ? (
              <p className="text-sm text-fg-faint">Nothing flagged. Mark lessons for revision from the lesson page.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {revisionSlugs.map((slug) => (
                  <Link key={slug} href={`/learn/${slug}`}>
                    <Badge tone="warn" className="cursor-pointer">
                      {getLesson(slug)?.title ?? slug}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <StickyNote className="h-4 w-4 text-good" /> Notes ({noteSlugs.length})
            </div>
            {noteSlugs.length === 0 ? (
              <p className="text-sm text-fg-faint">No notes yet. Write notes at the bottom of any lesson.</p>
            ) : (
              <div className="space-y-2">
                {noteSlugs.map((slug) => {
                  const l = getLesson(slug);
                  return (
                    <Card key={slug}>
                      <CardBody>
                        <Link href={`/learn/${slug}`} className="text-sm font-medium text-fg hover:text-accent">
                          {l?.title ?? slug}
                        </Link>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-fg-muted">{notes[slug]}</p>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Highlights */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Highlighter className="h-4 w-4 text-accent" /> Highlights ({totalHighlights})
            </div>
            {highlightSlugs.length === 0 ? (
              <p className="text-sm text-fg-faint">
                No highlights yet. On any lesson, select text and click &ldquo;Highlight&rdquo; to save it here.
              </p>
            ) : (
              <div className="space-y-2">
                {highlightSlugs.map((slug) => {
                  const l = getLesson(slug);
                  return (
                    <Card key={slug}>
                      <CardBody>
                        <Link href={`/learn/${slug}#why`} className="text-sm font-medium text-fg hover:text-accent">
                          {l?.title ?? slug}
                        </Link>
                        <ul className="mt-2 space-y-1.5">
                          {(highlights[slug] ?? []).map((h) => (
                            <li key={h.id} className="flex items-start gap-2 text-sm">
                              <span className="mt-0.5 h-3 w-1 shrink-0 rounded bg-accent/60" />
                              <span className="flex-1 text-fg-muted">{h.text}</span>
                              <button
                                onClick={() => removeHighlight(slug, h.id)}
                                className="shrink-0 text-fg-faint transition-colors hover:text-bad"
                                title="Remove highlight"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
