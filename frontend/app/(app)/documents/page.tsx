import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireToken } from "@/lib/auth";
import { documents as docsApi, usage, type UsageJob, type UsageJobResponse } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { UploadForm } from "./upload-form";

function statusTone(status: string): React.CSSProperties {
  switch (status) {
    case "completed":
      return { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" };
    case "failed":
      return { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" };
    default:
      return {
        background: "var(--accent-surface)",
        color: "var(--accent)",
        border: "1px solid #bfdbfe",
      };
  }
}

async function deleteDocument(id: string, token: string) {
  "use server";
  await docsApi.delete(token, id);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/usage");
}

export default async function DocumentsPage() {
  const token = await requireToken();
  const [docs, jobsData] = await Promise.all([
    docsApi.list(token).catch(() => []),
    usage.jobs(token).catch((): UsageJobResponse => ({ jobs: [] })),
  ]);

  const jobsByDocumentId = new Map<string, UsageJob>(
    jobsData.jobs.map((job) => [job.document_id, job])
  );

  return (
    <div>
      {/* Page header */}
      <header
        className="border-b px-8 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div>
          <span className="eyebrow">Document Intake</span>
          <h1 className="mt-3 text-3xl">Documents</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            Upload source files and track them through the translation pipeline.
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6 px-8 py-8">
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          {/* Upload panel */}
          <article className="app-panel p-6">
            <div className="mb-5">
              <p
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                New Upload
              </p>
              <h2 className="mt-1.5 text-xl">Start A Translation Job</h2>
            </div>
            <UploadForm token={token} />
          </article>

          {/* Documents table */}
          <article className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Language</th>
                  <th>Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => {
                    const job = jobsByDocumentId.get(doc.id);
                    const destination =
                      job?.status === "completed"
                        ? `/translations/${job.job_id}`
                        : job
                          ? `/jobs/${job.job_id}`
                          : null;

                    return (
                      <tr key={doc.id}>
                        <td>
                          <p className="text-sm font-medium">{doc.filename}</p>
                          <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {doc.file_type.toUpperCase()} · {formatDate(doc.created_at)}
                          </p>
                        </td>
                        <td>
                          <span
                            className="status-pill"
                            style={statusTone(job?.status ?? doc.status)}
                          >
                            {job?.status ?? doc.status}
                          </span>
                        </td>
                        <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {doc.source_lang ? doc.source_lang.toUpperCase() : "Pending"}
                        </td>
                        <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {job ? formatCurrency(job.estimated_cost_usd) : "—"}
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            {destination && (
                              <Link
                                href={destination}
                                className="ghost-button px-2 py-1 text-xs"
                              >
                                {job?.status === "completed" ? "Result" : "Job"}
                              </Link>
                            )}
                            <form
                              action={async () => {
                                "use server";
                                await deleteDocument(doc.id, token);
                              }}
                            >
                              <button
                                type="submit"
                                className="ghost-button px-2 py-1 text-xs"
                                style={{ color: "var(--destructive)" }}
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </article>
        </div>
      </div>
    </div>
  );
}
