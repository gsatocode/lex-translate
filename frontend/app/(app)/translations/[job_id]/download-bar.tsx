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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Download failed.");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error && (
        <span className="text-sm" style={{ color: "hsl(var(--destructive))" }}>
          {error}
        </span>
      )}
      {(["pdf", "docx"] as const).map((format) => (
        <button
          key={format}
          type="button"
          disabled={loading !== null}
          onClick={() => handleDownload(format)}
          className={format === "pdf" ? "primary-button disabled:opacity-60" : "secondary-button disabled:opacity-60"}
        >
          {loading === format ? "Preparing..." : `Download ${format.toUpperCase()}`}
        </button>
      ))}
    </div>
  );
}
