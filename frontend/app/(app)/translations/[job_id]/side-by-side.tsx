"use client";

import { SideBySideEntry } from "@/lib/api";

interface Props {
  entries: SideBySideEntry[];
}

export function SideBySide({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="app-panel p-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No translation content available for this job.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <article
          key={entry.chunk_index}
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="border-b px-5 py-2.5"
            style={{ borderColor: "var(--border)", background: "#f9fafb" }}
          >
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Chunk {entry.chunk_index + 1}
            </span>
          </div>

          <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--border)" }}>
            <section className="bg-white px-5 py-5">
              <p
                className="mb-3 text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Original
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7">{entry.original_text}</p>
            </section>
            <section className="bg-[#f9fafb] px-5 py-5">
              <p
                className="mb-3 text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
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
