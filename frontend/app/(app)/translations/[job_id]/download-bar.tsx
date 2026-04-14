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
    <div className="flex items-center gap-3">
      {error && (
        <span className="text-xs" style={{ color: "hsl(var(--destructive-foreground))" }}>
          {error}
        </span>
      )}
      {(["pdf", "docx"] as const).map((fmt) => (
        <button
          key={fmt}
          onClick={() => handleDownload(fmt)}
          disabled={loading !== null}
          className="px-4 py-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            background: "hsl(var(--secondary))",
            color: "hsl(var(--secondary-foreground))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          {loading === fmt ? "…" : `Download ${fmt.toUpperCase()}`}
        </button>
      ))}
    </div>
  );
}
