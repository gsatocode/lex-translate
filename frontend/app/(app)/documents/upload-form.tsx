"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { documents, ApiError } from "@/lib/api";

interface Props {
  token: string;
}

export function UploadForm({ token }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const result = await documents.upload(token, formData);
        router.push(`/jobs/${result.job_id}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Upload failed. Please try again.");
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: "hsl(var(--destructive) / 0.1)",
            color: "hsl(var(--destructive-foreground))",
            border: "1px solid hsl(var(--destructive) / 0.3)",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
        style={{ borderColor: "hsl(var(--border))" }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={() => setError(null)}
        />
        <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
          Click to select a file
        </p>
        <p className="mt-1 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          PDF, DOCX, DOC, or TXT
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-2 text-sm font-medium transition-opacity disabled:opacity-60"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
        }}
      >
        {isPending ? "Uploading…" : "Upload & Translate"}
      </button>
    </form>
  );
}
