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
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Glossary
          </h1>
          <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Manage translation terminology
          </p>
        </div>
        <ImportDialog token={token} onSuccess={refresh} />
      </div>

      <div
        className="rounded-lg p-5 mb-6"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>
          Add Term
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          {addError && (
            <p className="w-full text-xs" style={{ color: "hsl(var(--destructive-foreground))" }}>
              {addError}
            </p>
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
              className="flex-1 min-w-[140px] rounded-md px-3 py-2 text-sm outline-none"
              style={{
                background: "hsl(var(--input))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            />
          ))}
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            Add
          </button>
        </form>
      </div>

      <GlossaryTable terms={terms} token={token} onRefresh={refresh} />
    </div>
  );
}
