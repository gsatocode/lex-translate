import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { documents, usage, type UsageJobResponse } from "@/lib/api";
import { formatCurrency, formatDate, formatTokens, truncateId } from "@/lib/format";

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

export default async function DashboardPage() {
  const token = await requireToken();

  const [docs, usageSummary, usageJobs] = await Promise.all([
    documents.list(token).catch(() => []),
    usage.summary(token).catch(() => null),
    usage.jobs(token).catch((): UsageJobResponse => ({ jobs: [] })),
  ]);

  const recentDocs = docs.slice(0, 4);
  const recentJobs = usageJobs.jobs.slice(0, 5);
  const activeJobs = usageJobs.jobs.filter(
    (job) => job.status !== "completed" && job.status !== "failed"
  );

  return (
    <div>
      {/* Page header */}
      <header
        className="border-b px-8 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="eyebrow">Operations Overview</span>
            <h1 className="mt-3 text-3xl">Dashboard</h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Health, throughput, and recent work at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/documents" className="primary-button">
              Upload Documents
            </Link>
            <Link href="/usage" className="secondary-button">
              Review Usage
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6 px-8 py-8">
        {/* Queue + Spend stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="app-panel p-5">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Queue Snapshot
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold">{activeJobs.length}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  active jobs in the pipeline
                </p>
              </div>
              <div className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                <p>{usageSummary?.completed_jobs ?? 0} completed</p>
                <p>{usageSummary?.total_jobs ?? 0} total</p>
              </div>
            </div>
          </div>

          <div className="app-panel p-5">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Portfolio Spend
            </p>
            <p className="mt-4 text-4xl font-semibold">
              {formatCurrency(usageSummary?.estimated_cost_usd ?? 0)}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {formatTokens(usageSummary?.total_tokens ?? 0)} tokens translated to date
            </p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Documents", value: docs.length, note: "Source files uploaded" },
            { label: "Jobs", value: usageSummary?.total_jobs ?? 0, note: "Tracked pipeline runs" },
            {
              label: "Completed",
              value: usageSummary?.completed_jobs ?? 0,
              note: "Finished outputs",
            },
            {
              label: "Tokens",
              value: formatTokens(usageSummary?.total_tokens ?? 0),
              note: "Usage across all jobs",
            },
          ].map((item) => (
            <article key={item.label} className="app-panel p-5">
              <p
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {item.note}
              </p>
            </article>
          ))}
        </div>

        {/* Recent docs + jobs */}
        <div className="grid gap-6 xl:grid-cols-2">
          <article className="app-panel">
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-base font-semibold" style={{ fontFamily: "inherit" }}>
                Recent Documents
              </h2>
              <Link href="/documents" className="ghost-button text-xs">
                View all
              </Link>
            </div>
            <div>
              {recentDocs.length === 0 ? (
                <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  No documents yet. Upload a file to start.
                </p>
              ) : (
                recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 border-b px-5 py-3 last:border-b-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.filename}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {doc.file_type.toUpperCase()} · {doc.source_lang ?? "Pending"} ·{" "}
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <span className="status-pill shrink-0" style={statusTone(doc.status)}>
                      {doc.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="app-panel">
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-base font-semibold" style={{ fontFamily: "inherit" }}>
                Pipeline Activity
              </h2>
              <Link href="/usage" className="ghost-button text-xs">
                View all
              </Link>
            </div>
            <div>
              {recentJobs.length === 0 ? (
                <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  No jobs yet. Upload a document to create one.
                </p>
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="flex items-center justify-between gap-4 border-b px-5 py-3 last:border-b-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Job {truncateId(job.job_id, 10)}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {formatDate(job.created_at)} · {formatTokens(job.tokens_used)} ·{" "}
                        {formatCurrency(job.estimated_cost_usd)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="status-pill" style={statusTone(job.status)}>
                        {job.status}
                      </span>
                      <Link
                        href={
                          job.status === "completed"
                            ? `/translations/${job.job_id}`
                            : `/jobs/${job.job_id}`
                        }
                        className="ghost-button text-xs"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
