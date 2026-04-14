"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jobs as jobsApi, Job } from "@/lib/api";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const POLL_INTERVAL_MS = 2000;

interface Props {
  jobId: string;
  token: string;
  initialJob: Job;
}

export function JobPoller({ jobId, token, initialJob }: Props) {
  const router = useRouter();
  const [job, setJob] = useState<Job>(initialJob);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) {
      if (job.status === "completed") {
        router.push(`/translations/${jobId}`);
      }
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await jobsApi.get(token, jobId);
        setJob(updated);
        if (updated.status === "completed") {
          clearInterval(interval);
          router.push(`/translations/${jobId}`);
        } else if (updated.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        // silently retry
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [job.status, jobId, token, router]);

  const progress = job.progress ?? 0;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
          Translation Job
        </h1>
        <p className="mt-1 font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          {jobId}
        </p>
      </div>

      <div
        className="rounded-lg p-6"
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
            {job.current_stage ?? "Processing"}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background:
                job.status === "completed"
                  ? "hsl(142 76% 36% / 0.15)"
                  : job.status === "failed"
                    ? "hsl(var(--destructive) / 0.15)"
                    : "hsl(var(--primary) / 0.15)",
              color:
                job.status === "completed"
                  ? "hsl(142 76% 56%)"
                  : job.status === "failed"
                    ? "hsl(var(--destructive-foreground))"
                    : "hsl(var(--primary))",
            }}
          >
            {job.status}
          </span>
        </div>

        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "hsl(var(--muted))" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background:
                job.status === "failed" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
            }}
          />
        </div>

        <p className="mt-2 text-xs text-right" style={{ color: "hsl(var(--muted-foreground))" }}>
          {progress}%
        </p>

        {job.error_message && (
          <div
            className="mt-4 rounded-md px-4 py-3 text-sm"
            style={{
              background: "hsl(var(--destructive) / 0.1)",
              color: "hsl(var(--destructive-foreground))",
              border: "1px solid hsl(var(--destructive) / 0.3)",
            }}
          >
            {job.error_message}
          </div>
        )}

        {!TERMINAL_STATUSES.has(job.status) && (
          <p className="mt-4 text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
            Auto-updating every 2 seconds…
          </p>
        )}
      </div>
    </div>
  );
}
