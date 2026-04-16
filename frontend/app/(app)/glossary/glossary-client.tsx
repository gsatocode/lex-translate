"use client";

import { useCallback, useState, useTransition } from "react";
import { glossary as glossaryApi, GlossaryTerm, ApiError } from "@/lib/api";
import { GlossaryTable } from "./glossary-table";
import { ImportDialog } from "./import-dialog";

interface Props {
  token: string;
  initialTerms: GlossaryTerm[];
}

export function GlossaryClient({ token, initialTerms }: Props) {
  const [terms, setTerms] = useState<GlossaryTerm[]>(initialTerms);
  const [addForm, setAddForm] = useState({ source_term: "", target_term: "", domain: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const fresh = await glossaryApi.list(token);
        setTerms(fresh);
      } catch {
        // silently fail
      }
    });
  }, [token]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.source_term || !addForm.target_term) {
      setAddError("Source and target terms are required.");
      return;
    }
    setAddError(null);
    startTransition(async () => {
      try {
        await glossaryApi.create(token, {
          source_term: addForm.source_term,
          target_term: addForm.target_term,
          domain: addForm.domain || undefined,
        });
        setAddForm({ source_term: "", target_term: "", domain: "" });
        refresh();
      } catch (err) {
        setAddError(err instanceof ApiError ? err.message : "Failed to add term.");
      }
    });
  }

  return (
    <div>
      {/* Page header */}
      <header
        className="border-b px-8 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="eyebrow">Terminology Control</span>
            <h1 className="mt-3 text-3xl">Glossary</h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Lock critical legal terms to your preferred phrasing across all translations.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-semibold">{terms.length}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                active terms
              </p>
            </div>
            <ImportDialog token={token} onSuccess={refresh} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6 px-8 py-8">
        {/* Add term form */}
        <section className="app-panel p-6">
          <div className="mb-4">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Add Term
            </p>
            <h2 className="mt-1.5 text-xl">Create A Controlled Translation Pair</h2>
          </div>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
            {addError && (
              <div
                className="w-full rounded border-l-4 px-4 py-3 text-sm"
                style={{
                  borderLeftColor: "var(--destructive)",
                  background: "#fef2f2",
                  color: "var(--destructive)",
                }}
              >
                {addError}
              </div>
            )}
            {[
              { name: "source_term", placeholder: "Source term" },
              { name: "target_term", placeholder: "Target term" },
              { name: "domain", placeholder: "Domain (optional)" },
            ].map(({ name, placeholder }) => (
              <input
                key={name}
                value={addForm[name as keyof typeof addForm]}
                onChange={(e) => setAddForm((f) => ({ ...f, [name]: e.target.value }))}
                placeholder={placeholder}
                className="field min-w-[180px] flex-1"
              />
            ))}
            <button
              type="submit"
              disabled={isPending}
              className="primary-button disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Add Term"}
            </button>
          </form>
        </section>

        <GlossaryTable terms={terms} token={token} onRefresh={refresh} />
      </div>
    </div>
  );
}
