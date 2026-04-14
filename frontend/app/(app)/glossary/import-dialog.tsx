"use client";

import { useState, useTransition } from "react";
import { glossary as glossaryApi, ApiError } from "@/lib/api";

interface Props {
  token: string;
  onSuccess: () => void;
}

export function ImportDialog({ token, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON.");
      return;
    }

    if (!Array.isArray(parsed)) {
      setError("JSON must be an array of terms.");
      return;
    }

    startTransition(async () => {
      try {
        await glossaryApi.import(token, {
          terms: parsed as Parameters<typeof glossaryApi.import>[1]["terms"],
        });
        setOpen(false);
        setJson("");
        onSuccess();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Import failed.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md text-sm font-medium transition-opacity"
        style={{
          background: "hsl(var(--secondary))",
          color: "hsl(var(--secondary-foreground))",
          border: "1px solid hsl(var(--border))",
        }}
      >
        Import JSON
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "hsl(0 0% 0% / 0.7)" }}
        >
          <div
            className="w-full max-w-lg rounded-lg p-6"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <h2
              className="text-base font-semibold mb-4"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Import Glossary Terms
            </h2>
            <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
              Paste a JSON array of terms. Each term must have <code>source_term</code> and{" "}
              <code>target_term</code>. <code>domain</code> is optional.
            </p>

            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={10}
              className="w-full rounded-md px-3 py-2 text-sm font-mono outline-none resize-none"
              style={{
                background: "hsl(var(--input))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
              placeholder={`[\n  {\n    "source_term": "force majeure",\n    "target_term": "force majeure",\n    "domain": "legal"\n  }\n]`}
            />

            {error && (
              <p className="mt-2 text-xs" style={{ color: "hsl(var(--destructive-foreground))" }}>
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 rounded-md text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isPending || !json.trim()}
                className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                {isPending ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
