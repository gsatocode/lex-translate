import Link from "next/link";
import { requireToken } from "@/lib/auth";
import { documents, usage } from "@/lib/api";

export default async function DashboardPage() {
  const token = await requireToken();

  const [docs, usageSummary, usageJobs] = await Promise.all([
    documents.list(token).catch(() => [] as Awaited<ReturnType<typeof documents.list>>),
    usage.summary(token).catch(() => null),
    usage.jobs(token).catch(() => ({ jobs: [] as Awaited<ReturnType<typeof usage.jobs>>["jobs"] })),
  ]);

  const recentJobs = usageJobs.jobs.slice(0, 5);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Overview of your translation activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Documents", value: docs.length },
          { label: "Total Jobs", value: usageSummary?.total_jobs ?? 0 },
          { label: "Completed Jobs", value: usageSummary?.completed_jobs ?? 0 },
          {
            label: "Estimated Cost",
            value: usageSummary ? `$${usageSummary.estimated_cost_usd.toFixed(4)}` : "—",
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Recent Documents
            </h2>
            <Link href="/documents" className="text-xs" style={{ color: "hsl(var(--primary))" }}>
              View all
            </Link>
          </div>
          <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
            {docs.slice(0, 5).length === 0 ? (
              <p
                className="px-5 py-8 text-sm text-center"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                No documents yet.{" "}
                <Link href="/documents" style={{ color: "hsl(var(--primary))" }}>
                  Upload one
                </Link>
              </p>
            ) : (
              docs.slice(0, 5).map((doc) => (
                <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium truncate max-w-[200px]"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      {doc.filename}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        doc.status === "completed"
                          ? "hsl(142 76% 36% / 0.15)"
                          : "hsl(var(--muted))",
                      color:
                        doc.status === "completed"
                          ? "hsl(142 76% 56%)"
                          : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {doc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="rounded-lg"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Recent Jobs
            </h2>
            <Link href="/usage" className="text-xs" style={{ color: "hsl(var(--primary))" }}>
              View usage
            </Link>
          </div>
          <div>
            {recentJobs.length === 0 ? (
              <p
                className="px-5 py-8 text-sm text-center"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                No jobs yet.
              </p>
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job.job_id}
                  className="px-5 py-3 flex items-center justify-between border-b last:border-0"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div>
                    <p className="text-sm font-mono" style={{ color: "hsl(var(--foreground))" }}>
                      {job.job_id.slice(0, 8)}…
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {job.llm_provider}
                    </p>
                  </div>
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {job.total_tokens.toLocaleString()} tokens
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
