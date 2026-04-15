import { notFound } from "next/navigation";
import { requireToken } from "@/lib/auth";
import { ApiError, translations as translationsApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { DownloadBar } from "./download-bar";
import { SideBySide } from "./side-by-side";

export default async function TranslationPage({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) {
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
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const issueCount = validation.issues.length;

  return (
    <div className="space-y-6">
      <section className="app-panel grid gap-6 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div>
          <span className="eyebrow">Translation Review</span>
          <h1 className="mt-6 text-5xl leading-[0.92]">Inspect the final translation before delivery.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "hsl(var(--muted-foreground))" }}>
            Validation details, side-by-side chunks, and format-specific downloads are all now fed
            from the stabilized backend contract.
          </p>
          <p className="mt-4 text-sm font-semibold">Job {job_id}</p>
        </div>

        <div className="space-y-4">
          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Summary
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-3xl font-semibold">{sideBySide.entries.length}</p>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  chunks
                </p>
              </div>
              <div>
                <p className="text-3xl font-semibold">{issueCount}</p>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  issues
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">{formatDateTime(validation.created_at)}</p>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  validated
                </p>
              </div>
            </div>
          </div>

          <DownloadBar jobId={job_id} token={token} />
        </div>
      </section>

      <section
        className="app-panel p-6"
        style={{
          borderColor: validation.passed ? "hsl(155 50% 34% / 0.2)" : "hsl(var(--destructive) / 0.2)",
          background: validation.passed
            ? "linear-gradient(180deg, rgb(240 250 245 / 0.95), rgb(255 255 255 / 0.8))"
            : "linear-gradient(180deg, rgb(255 245 243 / 0.95), rgb(255 255 255 / 0.8))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">{validation.passed ? "Validation Passed" : "Validation Issues"}</span>
            <h2 className="mt-4 text-2xl">
              {validation.passed
                ? "No blocking issues were found in the translated output."
                : "Review the flagged items before delivering the final file."}
            </h2>
          </div>
        </div>

        {validation.issues.length > 0 && (
          <div className="mt-5 grid gap-3">
            {validation.issues.map((issue, index) => (
              <div key={`${issue.type}-${index}`} className="rounded-2xl border bg-white/70 px-4 py-3" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-pill border" style={{ background: "white", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }}>
                    {issue.severity ?? "notice"}
                  </span>
                  <span className="text-sm font-semibold">{issue.type}</span>
                  {issue.chunk_index !== null && (
                    <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Chunk {issue.chunk_index + 1}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {issue.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <SideBySide entries={sideBySide.entries} />
    </div>
  );
}
