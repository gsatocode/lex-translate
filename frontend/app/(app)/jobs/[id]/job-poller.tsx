"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
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
  if (status === "completed") return true;
  if (status === "failed") return stageId === "queued" || stageId === currentStage;
  const currentIndex = STAGES.findIndex((s) => s.id === (currentStage ?? "queued"));
  const stageIndex = STAGES.findIndex((s) => s.id === stageId);
  return currentIndex >= stageIndex;
}

function statusTone(status: Job["status"]): React.CSSProperties {
  if (status === "completed")
    return { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" };
  if (status === "failed")
    return { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" };
  return {
    background: "var(--accent-surface)",
    color: "var(--accent)",
    border: "1px solid #bfdbfe",
  };
}

export function JobPoller({ jobId, token, initialJob }: Props) {
  const router = useRouter();
  const [job, setJob] = useState<Job>(initialJob);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(job.status)) {
      if (job.status === "completed") {
        const timeout = window.setTimeout(() => router.replace(`/translations/${jobId}`), 900);
        return () => window.clearTimeout(timeout);
      }
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const updated = await jobsApi.get(token, jobId);
        setJob(updated);
      } catch {
        // keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [job.status, jobId, router, token]);

  const progress = job.progress ?? 0;

  return (
    <div>
      {/* Page header */}
      <header
        className="border-b px-8 py-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="eyebrow">Live Processing</span>
            <h1 className="mt-3 text-3xl">Job Tracking</h1>
            <p className="mt-1 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              {jobId}
            </p>
          </div>
          <div className="text-right">
            <span className="status-pill" style={statusTone(job.status)}>
              {job.status}
            </span>
            <p className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              Started {formatDateTime(job.started_at ?? job.created_at)}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6 px-8 py-8">
        {/* Progress */}
        <section className="app-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Progress
              </p>
              <h2 className="mt-1.5 text-xl" style={{ fontFamily: "inherit" }}>
                {labelForStage(job.current_stage)}
              </h2>
            </div>
            <p className="text-2xl font-semibold">{progress}%</p>
          </div>

          <div className="progress-track mt-5 h-2">
            <div
              className="progress-fill h-full"
              data-tone={job.status === "failed" ? "danger" : undefined}
              style={{ width: `${progress}%` }}
            />
          </div>

          {job.error_message && (
            <div
              className="mt-5 rounded border-l-4 px-4 py-3 text-sm"
              style={{
                borderLeftColor: "var(--destructive)",
                background: "#fef2f2",
                color: "var(--destructive)",
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
        </section>

        {/* Pipeline stages */}
        <section className="app-panel p-6">
          <p
            className="mb-4 text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Pipeline Stages
          </p>
          <div className="space-y-2">
            {STAGES.map((stage) => {
              const active =
                stage.id === (job.current_stage ?? "queued") ||
                (stage.id === "completed" && job.status === "completed");
              const done = isStageDone(stage.id, job.current_stage, job.status);
              const failed = job.status === "failed" && stage.id === job.current_stage;

              return (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 rounded border px-4 py-3"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    background: active ? "var(--accent-surface)" : "var(--surface)",
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{
                      color: failed
                        ? "var(--destructive)"
                        : done
                          ? "var(--success)"
                          : "var(--text-disabled)",
                    }}
                  >
                    {failed ? (
                      <XCircle size={16} />
                    ) : done ? (
                      <CheckCircle2 size={16} />
                    ) : active ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{stage.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {failed ? "Failed" : active ? "Running" : done ? "Complete" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {!TERMINAL_STATUSES.has(job.status) && (
            <p className="mt-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              Polling every 2s · Redirects automatically when complete.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
