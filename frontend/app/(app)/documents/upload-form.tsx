"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { documents, ApiError } from "@/lib/api";

interface Props {
  token: string;
}

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png";

export function UploadForm({ token }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | null) {
    setSelectedFile(file);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) {
      setError("Select a PDF, DOCX, JPG, or PNG file to continue.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    startTransition(async () => {
      try {
        const result = await documents.upload(token, formData);
        router.push(`/jobs/${result.job_id}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          return;
        }
        setError("Upload failed. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "hsl(var(--destructive) / 0.1)",
            color: "hsl(var(--destructive-foreground))",
            border: "1px solid hsl(var(--destructive) / 0.3)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        className="dropzone block w-full p-6 text-left"
        data-active={dragActive}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer.files?.[0] ?? null;
          handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
          Drop Zone
        </p>
        <h3 className="mt-3 text-2xl">Select a source document</h3>
        <p className="mt-2 text-sm leading-6" style={{ color: "hsl(var(--muted-foreground))" }}>
          Drag and drop a file here or click to browse. The backend validates the file type before it enters the queue.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {["PDF", "DOCX", "JPG", "PNG"].map((label) => (
            <span
              key={label}
              className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
            >
              {label}
            </span>
          ))}
        </div>
      </button>

      <div className="app-panel-muted p-4">
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "hsl(var(--muted-foreground))" }}>
          Selected File
        </p>
        <p className="mt-2 text-sm font-semibold">{selectedFile?.name ?? "Nothing selected yet"}</p>
      </div>

      <button type="submit" disabled={isPending} className="primary-button w-full disabled:opacity-60">
        {isPending ? "Uploading..." : "Upload And Translate"}
      </button>
    </form>
  );
}
