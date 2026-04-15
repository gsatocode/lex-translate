import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { usage as usageApi, type UsageJobResponse } from "@/lib/api";
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

export default async function UsagePage() {
  const token = await requireToken();
  const [summary, jobsData] = await Promise.all([
    usageApi.summary(token).catch(() => null),
    usageApi.jobs(token).catch((): UsageJobResponse => ({ jobs: [] })),
  ]);

  return (
    <div className="space-y-6">
      <section className="app-panel grid gap-6 p-8 md:grid-cols-[1.05fr_0.95fr] md:p-10">
        <div>
          <span className="eyebrow">Usage Analytics</span>
          <h1 className="mt-6 text-5xl leading-[0.92]">Operational visibility without leaving the product.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "hsl(var(--muted-foreground))" }}>
            Usage is now aligned with the backend contract: total jobs, completed jobs, token volume,
            cost, and per-job status all resolve against the live API.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Total Jobs", value: summary?.total_jobs ?? 0 },
            { label: "Completed Jobs", value: summary?.completed_jobs ?? 0 },
            { label: "Tokens", value: formatTokens(summary?.total_tokens ?? 0) },
            { label: "Estimated Cost", value: formatCurrency(summary?.estimated_cost_usd ?? 0) },
          ].map((item) => (
            <div key={item.label} className="app-panel-muted p-5">
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

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
                <td colSpan={6} className="py-10 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  No usage data yet.
                </td>
              </tr>
            ) : (
              jobsData.jobs.map((job) => (
                <tr key={job.job_id}>
                  <td>
                    <div>
                      <p className="text-sm font-semibold">{truncateId(job.job_id, 12)}</p>
                      <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Document {truncateId(job.document_id, 10)}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill border" style={statusTone(job.status)}>
                      {job.status}
                    </span>
                  </td>
                  <td>{formatTokens(job.tokens_used)}</td>
                  <td>{formatCurrency(job.estimated_cost_usd)}</td>
                  <td style={{ color: "hsl(var(--muted-foreground))" }}>{formatDate(job.created_at)}</td>
                  <td>
                    <Link
                      href={job.status === "completed" ? `/translations/${job.job_id}` : `/jobs/${job.job_id}`}
                      className="ghost-button px-0"
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
  );
}
