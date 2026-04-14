"use client";

import { useState, useTransition } from "react";
import { GlossaryTerm, glossary as glossaryApi, ApiError } from "@/lib/api";

interface Props {
  terms: GlossaryTerm[];
  token: string;
  onRefresh: () => void;
}

export function GlossaryTable({ terms, token, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    source_term: string;
    target_term: string;
    domain: string;
  }>({
    source_term: "",
    target_term: "",
    domain: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startEdit(term: GlossaryTerm) {
    setEditingId(term.id);
    setEditValues({
      source_term: term.source_term,
      target_term: term.target_term,
      domain: term.domain ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  function saveEdit() {
    if (!editingId) return;
    startTransition(async () => {
      try {
        await glossaryApi.update(token, editingId, {
          source_term: editValues.source_term,
          target_term: editValues.target_term,
          domain: editValues.domain || undefined,
        });
        setEditingId(null);
        onRefresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Update failed.");
      }
    });
  }

  function deleteTerm(id: string) {
    startTransition(async () => {
      try {
        await glossaryApi.delete(token, id);
        onRefresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div>
      {error && (
        <div
          className="mb-4 rounded-md px-4 py-3 text-sm"
          style={{
            background: "hsl(var(--destructive) / 0.1)",
            color: "hsl(var(--destructive-foreground))",
            border: "1px solid hsl(var(--destructive) / 0.3)",
          }}
        >
          {error}
        </div>
      )}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "hsl(var(--muted))" }}>
              {["Source Term", "Target Term", "Domain", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "hsl(var(--card))" }}>
            {terms.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  No terms yet.
                </td>
              </tr>
            ) : (
              terms.map((term) => (
                <tr
                  key={term.id}
                  className="border-t"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <td className="px-4 py-3">
                    {editingId === term.id ? (
                      <input
                        value={editValues.source_term}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, source_term: e.target.value }))
                        }
                        className="w-full rounded px-2 py-1 text-sm outline-none"
                        style={{
                          background: "hsl(var(--input))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                    ) : (
                      <span style={{ color: "hsl(var(--foreground))" }}>{term.source_term}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === term.id ? (
                      <input
                        value={editValues.target_term}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, target_term: e.target.value }))
                        }
                        className="w-full rounded px-2 py-1 text-sm outline-none"
                        style={{
                          background: "hsl(var(--input))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                    ) : (
                      <span style={{ color: "hsl(var(--foreground))" }}>{term.target_term}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === term.id ? (
                      <input
                        value={editValues.domain}
                        onChange={(e) => setEditValues((v) => ({ ...v, domain: e.target.value }))}
                        className="w-full rounded px-2 py-1 text-sm outline-none"
                        placeholder="Optional"
                        style={{
                          background: "hsl(var(--input))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                    ) : (
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>
                        {term.domain ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === term.id ? (
                      <div className="flex gap-3">
                        <button
                          onClick={saveEdit}
                          disabled={isPending}
                          className="text-xs font-medium disabled:opacity-50"
                          style={{ color: "hsl(var(--primary))" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(term)}
                          className="text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTerm(term.id)}
                          disabled={isPending}
                          className="text-xs hover:text-red-400 transition-colors disabled:opacity-50"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
