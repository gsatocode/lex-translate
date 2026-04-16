import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { usage as usageApi, type UsageJobResponse } from "@/lib/api";
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

export default async function UsagePage() {
  const token = await requireToken();
  const [summary, jobsData] = await Promise.all([
    usageApi.summary(token).catch(() => null),
    usageApi.jobs(token).catch((): UsageJobResponse => ({ jobs: [] })),
  ]);

  return (
    <div>
      {/* Page header */}
      <header
        className="border-b px-8 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="eyebrow">Usage Analytics</span>
            <h1 className="mt-3 text-3xl">Usage</h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Cost, token volume, and job throughput across your organization.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {[
              { label: "Total Jobs", value: summary?.total_jobs ?? 0 },
              { label: "Completed", value: summary?.completed_jobs ?? 0 },
              { label: "Tokens", value: formatTokens(summary?.total_tokens ?? 0) },
              { label: "Est. Cost", value: formatCurrency(summary?.estimated_cost_usd ?? 0) },
            ].map((item) => (
              <div key={item.label} className="text-right">
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-8 py-8">
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Created</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {jobsData.jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No usage data yet.
                  </td>
                </tr>
              ) : (
                jobsData.jobs.map((job) => (
                  <tr key={job.job_id}>
                    <td>
                      <p className="text-sm font-medium">{truncateId(job.job_id, 12)}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        Doc {truncateId(job.document_id, 10)}
                      </p>
                    </td>
                    <td>
                      <span className="status-pill" style={statusTone(job.status)}>
                        {job.status}
                      </span>
                    </td>
                    <td className="text-sm">{formatTokens(job.tokens_used)}</td>
                    <td className="text-sm">{formatCurrency(job.estimated_cost_usd)}</td>
                    <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(job.created_at)}
                    </td>
                    <td>
                      <Link
                        href={
                          job.status === "completed"
                            ? `/translations/${job.job_id}`
                            : `/jobs/${job.job_id}`
                        }
                        className="ghost-button px-2 py-1 text-xs"
                      >
                        {job.status === "completed" ? "Translation" : "Job"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
