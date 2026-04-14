import { requireToken } from "@/lib/auth";
import { usage as usageApi } from "@/lib/api";

export default async function UsagePage() {
  const token = await requireToken();
  const [summary, jobsData] = await Promise.all([
    usageApi.summary(token).catch(() => null),
    usageApi
      .jobs(token)
      .catch(() => ({ jobs: [] as Awaited<ReturnType<typeof usageApi.jobs>>["jobs"] })),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          Usage
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Token consumption and cost analytics
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Jobs", value: summary?.total_jobs ?? 0 },
          { label: "Completed", value: summary?.completed_jobs ?? 0 },
          {
            label: "Total Tokens",
            value: summary ? summary.total_tokens.toLocaleString() : "—",
          },
          {
            label: "Estimated Cost",
            value: summary ? `$${summary.estimated_cost_usd.toFixed(4)}` : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg p-5"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Job Breakdown
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "hsl(var(--muted))" }}>
              {["Job ID", "Provider", "Tokens"].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "hsl(var(--card))" }}>
            {jobsData.jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-8 text-center"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  No job data yet.
                </td>
              </tr>
            ) : (
              jobsData.jobs.map((job) => (
                <tr
                  key={job.job_id}
                  className="border-t"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <td
                    className="px-5 py-3 font-mono text-xs"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {job.job_id}
                  </td>
                  <td className="px-5 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {job.llm_provider}
                  </td>
                  <td className="px-5 py-3" style={{ color: "hsl(var(--foreground))" }}>
                    {job.total_tokens.toLocaleString()}
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
