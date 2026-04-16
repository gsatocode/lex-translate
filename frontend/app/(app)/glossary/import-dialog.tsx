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
      <button type="button" onClick={() => setOpen(true)} className="secondary-button">
        Import JSON
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div
            className="w-full max-w-xl rounded-lg border bg-white p-6"
            style={{ borderColor: "var(--border)" }}
          >
            <h2 className="text-xl">Import Glossary Terms</h2>
            <p className="mb-4 mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Paste a JSON array. Each term needs{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">source_term</code> and{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">target_term</code>.{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">domain</code> is optional.
            </p>

            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={10}
              className="textarea-field w-full resize-none font-mono text-sm"
              placeholder={`[\n  {\n    "source_term": "force majeure",\n    "target_term": "force majeure",\n    "domain": "legal"\n  }\n]`}
            />

            {error && (
              <div
                className="mt-3 rounded border-l-4 px-4 py-3 text-sm"
                style={{
                  borderLeftColor: "var(--destructive)",
                  background: "#fef2f2",
                  color: "var(--destructive)",
                }}
              >
                {error}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="ghost-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || !json.trim()}
                className="primary-button disabled:opacity-60"
              >
                {isPending ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
