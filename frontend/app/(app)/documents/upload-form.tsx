"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { documents, ApiError } from "@/lib/api";

interface Props {
  token: string;
}

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,.tif,.tiff";

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
      setError("Select a PDF, DOCX, JPG, PNG, or TIFF file to continue.");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded border-l-4 px-4 py-3 text-sm"
          style={{
            borderLeftColor: "var(--destructive)",
            background: "#fef2f2",
            color: "var(--destructive)",
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
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Drop a file here or click to browse
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          Accepts PDF, DOCX, JPG, PNG, TIFF
        </p>
      </button>

      <div
        className="flex items-center justify-between rounded border px-4 py-3"
        style={{ borderColor: "var(--border)", background: "#f9fafb" }}
      >
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Selected file
          </p>
          <p className="mt-1 text-sm font-medium">
            {selectedFile?.name ?? "Nothing selected"}
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {selectedFile ? "Ready" : "Waiting"}
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="primary-button w-full disabled:opacity-60"
      >
        {isPending ? "Uploading..." : "Upload And Translate"}
      </button>
    </form>
  );
}
