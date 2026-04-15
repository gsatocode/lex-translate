import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireToken } from "@/lib/auth";
import { documents as docsApi, usage, type UsageJob, type UsageJobResponse } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { UploadForm } from "./upload-form";

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return {
        background: "hsl(155 50% 34% / 0.12)",
        color: "hsl(155 50% 30%)",
        borderColor: "hsl(155 50% 34% / 0.18)",
      };
    case "failed":
      return {
        background: "hsl(var(--destructive) / 0.12)",
        color: "hsl(var(--destructive))",
        borderColor: "hsl(var(--destructive) / 0.16)",
      };
    default:
      return {
        background: "hsl(var(--primary) / 0.1)",
        color: "hsl(var(--primary))",
        borderColor: "hsl(var(--primary) / 0.16)",
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

  const jobsByDocumentId = new Map<string, UsageJob>(jobsData.jobs.map((job) => [job.document_id, job]));

  return (
    <div className="space-y-6">
      <section className="app-panel grid gap-6 p-8 md:grid-cols-[0.95fr_1.05fr] md:p-10">
        <div>
          <span className="eyebrow">Document Intake</span>
          <h1 className="mt-6 text-5xl leading-[0.92]">Upload once, then watch the pipeline move.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "hsl(var(--muted-foreground))" }}>
            The document list is now connected to live job metadata, so each source file can lead
            directly to its active pipeline run or completed translation output.
          </p>
        </div>

        <div className="app-panel-muted p-5">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
            Supported Formats
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["PDF", "Text-layer PDF input"],
              ["DOCX", "Structured Word documents"],
              ["JPG", "Image OCR pipeline"],
              ["PNG", "Image OCR pipeline"],
            ].map(([label, copy]) => (
              <div key={label} className="rounded-2xl border bg-white/55 p-4" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <article className="app-panel p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              New Upload
            </p>
            <h2 className="mt-2 text-2xl">Start a translation job</h2>
          </div>
          <UploadForm token={token} />
        </article>

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
                  <td colSpan={5} className="py-10 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
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
                        <div>
                          <p className="text-sm font-semibold">{doc.filename}</p>
                          <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                            {doc.file_type.toUpperCase()} - uploaded {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="status-pill border" style={statusTone(job?.status ?? doc.status)}>
                          {job?.status ?? doc.status}
                        </span>
                      </td>
                      <td style={{ color: "hsl(var(--muted-foreground))" }}>
                        {doc.source_lang ? doc.source_lang.toUpperCase() : "Pending"}
                      </td>
                      <td style={{ color: "hsl(var(--muted-foreground))" }}>
                        {job ? formatCurrency(job.estimated_cost_usd) : "-"}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-3">
                          {destination && (
                            <Link href={destination} className="ghost-button px-0">
                              {job?.status === "completed" ? "Open Result" : "Open Job"}
                            </Link>
                          )}
                          <form
                            action={async () => {
                              "use server";
                              await deleteDocument(doc.id, token);
                            }}
                          >
                            <button type="submit" className="ghost-button px-0" style={{ color: "hsl(var(--destructive))" }}>
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
      </section>
    </div>
  );
}
