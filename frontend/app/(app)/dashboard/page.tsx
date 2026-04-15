import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { documents, usage, type UsageJobResponse } from "@/lib/api";
import { formatCurrency, formatDate, formatTokens, truncateId } from "@/lib/format";

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

export default async function DashboardPage() {
  const token = await requireToken();

  const [docs, usageSummary, usageJobs] = await Promise.all([
    documents.list(token).catch(() => []),
    usage.summary(token).catch(() => null),
    usage.jobs(token).catch((): UsageJobResponse => ({ jobs: [] })),
  ]);

  const recentDocs = docs.slice(0, 4);
  const recentJobs = usageJobs.jobs.slice(0, 5);
  const activeJobs = usageJobs.jobs.filter((job) => job.status !== "completed" && job.status !== "failed");

  return (
    <div className="space-y-6">
      <section className="app-panel grid gap-8 overflow-hidden p-8 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <div>
          <span className="eyebrow">Operations Overview</span>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[0.92]">
            Keep the translation pipeline visible from intake to final download.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "hsl(var(--muted-foreground))" }}>
            The backend is now driving the interface directly: queued uploads, live job progress,
            validation output, and per-job usage all come from the same contract.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/documents" className="primary-button">
              Upload Documents
            </Link>
            <Link href="/usage" className="secondary-button">
              Review Usage
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Queue Snapshot
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold">{activeJobs.length}</p>
                <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  active jobs moving through the pipeline
                </p>
              </div>
              <div className="text-right text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                <p>{usageSummary?.completed_jobs ?? 0} completed</p>
                <p>{usageSummary?.total_jobs ?? 0} total</p>
              </div>
            </div>
          </div>

          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Spend
            </p>
            <p className="mt-4 text-4xl font-semibold">
              {formatCurrency(usageSummary?.estimated_cost_usd ?? 0)}
            </p>
            <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {formatTokens(usageSummary?.total_tokens ?? 0)} translated tokens tracked so far
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Documents", value: docs.length, note: "Source files uploaded" },
          { label: "Jobs", value: usageSummary?.total_jobs ?? 0, note: "Tracked pipeline runs" },
          { label: "Completed", value: usageSummary?.completed_jobs ?? 0, note: "Finished outputs available" },
          {
            label: "Tokens",
            value: formatTokens(usageSummary?.total_tokens ?? 0),
            note: "Usage recorded across all jobs",
          },
        ].map((item) => (
          <article key={item.label} className="app-panel metric-card p-5">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              {item.label}
            </p>
            <p className="mt-3 text-4xl font-semibold">{item.value}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
              {item.note}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <article className="app-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Recent Documents
              </p>
              <h2 className="mt-2 text-2xl">Latest intake</h2>
            </div>
            <Link href="/documents" className="secondary-button">
              Open Documents
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentDocs.length === 0 ? (
              <div className="app-panel-muted p-5">
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  No documents yet. Upload a file to start the translation workflow.
                </p>
              </div>
            ) : (
              recentDocs.map((doc) => (
                <div key={doc.id} className="app-panel-muted flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{doc.filename}</p>
                    <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {doc.file_type.toUpperCase()} - {doc.source_lang ?? "Language pending"} - {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <span className="status-pill border" style={statusTone(doc.status)}>
                    {doc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="app-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Recent Jobs
              </p>
              <h2 className="mt-2 text-2xl">Pipeline activity</h2>
            </div>
            <Link href="/usage" className="secondary-button">
              View Usage
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentJobs.length === 0 ? (
              <div className="app-panel-muted p-5">
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  No jobs yet. Upload a document to generate your first queue item.
                </p>
              </div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.job_id} className="app-panel-muted p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Job {truncateId(job.job_id, 10)}</p>
                      <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Created {formatDate(job.created_at)} - {formatTokens(job.tokens_used)} tokens -{" "}
                        {formatCurrency(job.estimated_cost_usd)}
                      </p>
                    </div>
                    <span className="status-pill border" style={statusTone(job.status)}>
                      {job.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={job.status === "completed" ? `/translations/${job.job_id}` : `/jobs/${job.job_id}`}
                      className="ghost-button px-0"
                    >
                      {job.status === "completed" ? "Open Translation" : "Open Live Job"}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
