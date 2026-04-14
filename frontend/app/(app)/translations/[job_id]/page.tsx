import { requireToken } from "@/lib/auth";
import { translations as translationsApi, ApiError } from "@/lib/api";
import { notFound } from "next/navigation";
import { SideBySide } from "./side-by-side";
import { DownloadBar } from "./download-bar";

interface Props {
  params: Promise<{ job_id: string }>;
}

export default async function TranslationPage({ params }: Props) {
  const { job_id } = await params;
  const token = await requireToken();

  let sideBySide;
  let validation;

  try {
    [sideBySide, validation] = await Promise.all([
      translationsApi.sideBySide(token, job_id),
      translationsApi.validation(token, job_id),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Translation Result
          </h1>
          <p className="mt-1 font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            Job {job_id}
          </p>
        </div>
        <DownloadBar jobId={job_id} token={token} />
      </div>

      {validation && (
        <div
          className="mb-6 rounded-lg px-5 py-4"
          style={{
            background: validation.passed
              ? "hsl(142 76% 36% / 0.1)"
              : "hsl(var(--destructive) / 0.1)",
            border: `1px solid ${validation.passed ? "hsl(142 76% 36% / 0.3)" : "hsl(var(--destructive) / 0.3)"}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-sm font-medium"
              style={{
                color: validation.passed
                  ? "hsl(142 76% 56%)"
                  : "hsl(var(--destructive-foreground))",
              }}
            >
              {validation.passed ? "Validation Passed" : "Validation Issues Found"}
            </span>
          </div>
          {validation.issues.length > 0 && (
            <ul className="space-y-1">
              {validation.issues.map((issue, i) => (
                <li key={i} className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  [{issue.severity}] {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <div
          className="grid grid-cols-2 divide-x border-b"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))" }}
        >
          <div className="px-5 py-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Original
            </span>
          </div>
          <div className="px-5 py-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Translation
            </span>
          </div>
        </div>
        <SideBySide entries={sideBySide.entries} />
      </div>
    </div>
  );
}
