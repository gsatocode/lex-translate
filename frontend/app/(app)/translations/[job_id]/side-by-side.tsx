"use client";

import { SideBySideEntry } from "@/lib/api";

interface Props {
  entries: SideBySideEntry[];
}

export function SideBySide({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="app-panel p-6">
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          No translation content is available for this job yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <article key={entry.chunk_index} className="app-panel overflow-hidden">
          <div
            className="flex items-center justify-between border-b px-5 py-3"
            style={{ borderColor: "hsl(var(--border))", background: "rgb(248 244 237 / 0.85)" }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Chunk {entry.chunk_index + 1}
            </span>
          </div>

          <div className="grid gap-px lg:grid-cols-2" style={{ background: "hsl(var(--border))" }}>
            <section className="bg-white/85 px-5 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Original
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7">{entry.original_text}</p>
            </section>
            <section className="bg-[rgb(247,242,233)] px-5 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Translation
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7">{entry.translated_text}</p>
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}
