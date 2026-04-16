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
  const [editValues, setEditValues] = useState({
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
    <section className="space-y-3">
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Terms
        </p>
        <h2 className="mt-1.5 text-xl">Glossary Library</h2>
      </div>

      {error && (
        <div
          className="rounded border-l-4 px-4 py-3 text-sm"
          style={{
            borderLeftColor: "var(--destructive)",
            background: "#fef2f2",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      <div className="table-shell">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Source Term", "Target Term", "Domain", "Actions"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {terms.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No terms yet.
                </td>
              </tr>
            ) : (
              terms.map((term) => (
                <tr key={term.id}>
                  <td>
                    {editingId === term.id ? (
                      <input
                        value={editValues.source_term}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, source_term: e.target.value }))
                        }
                        className="field"
                      />
                    ) : (
                      term.source_term
                    )}
                  </td>
                  <td>
                    {editingId === term.id ? (
                      <input
                        value={editValues.target_term}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, target_term: e.target.value }))
                        }
                        className="field"
                      />
                    ) : (
                      term.target_term
                    )}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {editingId === term.id ? (
                      <input
                        value={editValues.domain}
                        onChange={(e) =>
                          setEditValues((v) => ({ ...v, domain: e.target.value }))
                        }
                        className="field"
                        placeholder="Optional"
                      />
                    ) : (
                      term.domain ?? "—"
                    )}
                  </td>
                  <td>
                    {editingId === term.id ? (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isPending}
                          className="text-xs font-medium disabled:opacity-50"
                          style={{ color: "var(--accent)" }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(term)}
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTerm(term.id)}
                          disabled={isPending}
                          className="text-xs disabled:opacity-50"
                          style={{ color: "var(--destructive)" }}
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
    </section>
  );
}
