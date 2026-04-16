import { notFound } from "next/navigation";
import { requireToken } from "@/lib/auth";
import { ApiError, translations as translationsApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { DownloadBar } from "./download-bar";
import { SideBySide } from "./side-by-side";

export default async function TranslationPage({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) {
  const { job_id } = await params;
  const token = await requireToken();

  let sideBySide;
  let validation;

  try {
    [sideBySide, validation] = await Promise.all([
      translationsApi.sideBySide(token, job_id),
      translationsApi.validation(token, job_id),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const issueCount = validation.issues.length;

  return (
    <div>
      {/* Page header */}
      <header
        className="border-b px-8 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="eyebrow">Translation Review</span>
            <h1 className="mt-3 text-3xl">Inspect Translation</h1>
            <p className="mt-1 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              {job_id}
            </p>
          </div>
          <div className="flex items-start gap-6 text-right">
            <div>
              <p className="text-2xl font-semibold">{sideBySide.entries.length}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                chunks
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{issueCount}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                issues
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">{formatDateTime(validation.created_at)}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                validated
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6 px-8 py-8">
        {/* Downloads */}
        <DownloadBar jobId={job_id} token={token} />

        {/* Validation result */}
        <section
          className="rounded-lg border border-l-4 bg-white p-6"
          style={{
            borderLeftColor: validation.passed ? "var(--success)" : "var(--destructive)",
            borderColor: validation.passed ? "#bbf7d0" : "#fecaca",
          }}
        >
          <div>
            <span className="eyebrow">
              {validation.passed ? "Validation Passed" : "Validation Issues"}
            </span>
            <h2 className="mt-3 text-xl" style={{ fontFamily: "inherit" }}>
              {validation.passed
                ? "No blocking issues found."
                : "Review flagged items before delivery."}
            </h2>
          </div>

          {validation.issues.length > 0 && (
            <div className="mt-5 space-y-2">
              {validation.issues.map((issue, index) => (
                <div
                  key={`${issue.type}-${index}`}
                  className="rounded border bg-white px-4 py-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="status-pill"
                      style={{
                        background: "#f3f4f6",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {issue.severity ?? "notice"}
                    </span>
                    <span className="text-sm font-medium">{issue.type}</span>
                    {issue.chunk_index !== null && (
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Chunk {issue.chunk_index + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {issue.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <SideBySide entries={sideBySide.entries} />
      </div>
    </div>
  );
}
