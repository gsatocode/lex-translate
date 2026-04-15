"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jobs as jobsApi, Job } from "@/lib/api";
import { formatDateTime, labelForStage } from "@/lib/format";

const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const POLL_INTERVAL_MS = 2000;

const STAGES = [
  { id: "queued", label: "Queued" },
  { id: "ocr", label: "OCR" },
  { id: "detect", label: "Language Detection" },
  { id: "chunk", label: "Chunking" },
  { id: "translate", label: "Translation" },
  { id: "validate", label: "Validation" },
  { id: "rebuild", label: "Rebuild" },
  { id: "completed", label: "Complete" },
];

interface Props {
  jobId: string;
  token: string;
  initialJob: Job;
}

function isStageDone(stageId: string, currentStage: string | null, status: Job["status"]) {
  if (status === "completed") {
    return true;
  }
  if (status === "failed") {
    return stageId === "queued" || stageId === currentStage;
  }

  const currentIndex = STAGES.findIndex((stage) => stage.id === (currentStage ?? "queued"));
  const stageIndex = STAGES.findIndex((stage) => stage.id === stageId);
  return currentIndex >= stageIndex;
}

export function JobPoller({ jobId, token, initialJob }: Props) {
  const router = useRouter();
  const [job, setJob] = useState<Job>(initialJob);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) {
      if (job.status === "completed") {
        const timeout = window.setTimeout(() => {
          router.replace(`/translations/${jobId}`);
        }, 900);
        return () => window.clearTimeout(timeout);
      }
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const updated = await jobsApi.get(token, jobId);
        setJob(updated);
      } catch {
        // Keep polling. Temporary network failures should not blow away the UI.
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [job.status, jobId, router, token]);

  const progress = job.progress ?? 0;

  return (
    <div className="space-y-6">
      <section className="app-panel grid gap-6 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div>
          <span className="eyebrow">Live Processing</span>
          <h1 className="mt-6 text-5xl leading-[0.92]">Track the job while the backend works.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "hsl(var(--muted-foreground))" }}>
            This page is polling the jobs API directly and will redirect to the translation review
            workspace as soon as the output becomes available.
          </p>
        </div>

        <div className="app-panel-muted p-5">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
            Job Identity
          </p>
          <p className="mt-3 break-all text-sm font-semibold">{jobId}</p>
          <div className="mt-4 grid gap-3 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            <p>Started: {formatDateTime(job.started_at ?? job.created_at)}</p>
            <p>Last state: {labelForStage(job.current_stage)}</p>
            <p>Status: {job.status}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="app-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Progress
              </p>
              <h2 className="mt-2 text-2xl">{labelForStage(job.current_stage)}</h2>
            </div>
            <span
              className="status-pill border"
              style={{
                background:
                  job.status === "completed"
                    ? "hsl(155 50% 34% / 0.12)"
                    : job.status === "failed"
                      ? "hsl(var(--destructive) / 0.12)"
                      : "hsl(var(--primary) / 0.1)",
                color:
                  job.status === "completed"
                    ? "hsl(155 50% 30%)"
                    : job.status === "failed"
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--primary))",
                borderColor:
                  job.status === "completed"
                    ? "hsl(155 50% 34% / 0.18)"
                    : job.status === "failed"
                      ? "hsl(var(--destructive) / 0.16)"
                      : "hsl(var(--primary) / 0.16)",
              }}
            >
              {job.status}
            </span>
          </div>

          <div className="mt-6 rounded-full bg-black/5 p-1">
            <div
              className="h-4 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background:
                  job.status === "failed"
                    ? "linear-gradient(135deg, hsl(var(--destructive)), hsl(5 84% 58%))"
                    : "linear-gradient(135deg, hsl(var(--primary)), hsl(212 72% 42%))",
              }}
            />
          </div>
          <p className="mt-3 text-right text-sm font-semibold">{progress}%</p>

          {job.error_message && (
            <div
              className="mt-5 rounded-2xl px-4 py-3 text-sm"
              style={{
                background: "hsl(var(--destructive) / 0.1)",
                color: "hsl(var(--destructive))",
                border: "1px solid hsl(var(--destructive) / 0.18)",
              }}
            >
              {job.error_message}
            </div>
          )}

          {job.status === "failed" && (
            <div className="mt-5">
              <Link href="/documents" className="secondary-button">
                Return To Documents
              </Link>
            </div>
          )}
        </article>

        <article className="app-panel p-6">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
            Pipeline Stages
          </p>
          <div className="mt-5 space-y-3">
            {STAGES.map((stage, index) => {
              const active = stage.id === (job.current_stage ?? "queued") || (stage.id === "completed" && job.status === "completed");
              const done = isStageDone(stage.id, job.current_stage, job.status);

              return (
                <div
                  key={stage.id}
                  className="flex items-center gap-4 rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: active ? "hsl(var(--primary) / 0.22)" : "hsl(var(--border))",
                    background: active ? "hsl(var(--primary) / 0.08)" : "rgb(255 255 255 / 0.48)",
                  }}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      background: done ? "hsl(var(--primary))" : "rgb(255 255 255 / 0.82)",
                      color: done ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {done ? "✓" : index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{stage.label}</p>
                    <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {active ? "Current stage" : done ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {!TERMINAL_STATUSES.has(job.status) && (
            <p className="mt-4 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Polling every 2 seconds. The screen will continue updating until the job finishes.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
