"use client";

import { SideBySideEntry } from "@/lib/api";

interface Props {
  entries: SideBySideEntry[];
}

export function SideBySide({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
        No translation content available.
      </p>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "hsl(var(--border))" }}>
      {entries.map((entry, i) => (
        <div
          key={i}
          className="grid grid-cols-2 divide-x"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div className="px-5 py-4">
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "hsl(var(--foreground))" }}
            >
              {entry.original_text}
            </p>
          </div>
          <div className="px-5 py-4" style={{ background: "hsl(var(--muted) / 0.3)" }}>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "hsl(var(--foreground))" }}
            >
              {entry.translated_text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
