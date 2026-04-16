"use client";

import { useState } from "react";
import { translations, ApiError } from "@/lib/api";

interface Props {
  jobId: string;
  token: string;
}

export function DownloadBar({ jobId, token }: Props) {
  const [loading, setLoading] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(format: "pdf" | "docx") {
    setError(null);
    setLoading(format);
    try {
      const { url } = await translations.download(token, jobId, format);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
      style={{ background: "#f9fafb", borderColor: "var(--border)" }}
    >
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Download Output
        </p>
        {error && (
          <p className="mt-1 text-xs" style={{ color: "var(--destructive)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {(["pdf", "docx"] as const).map((format) => (
          <button
            key={format}
            type="button"
            disabled={loading !== null}
            onClick={() => handleDownload(format)}
            className={
              format === "pdf"
                ? "primary-button disabled:opacity-60"
                : "secondary-button disabled:opacity-60"
            }
          >
            {loading === format ? "Preparing..." : `Download ${format.toUpperCase()}`}
          </button>
        ))}
      </div>
    </div>
  );
}
