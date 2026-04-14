const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { detail?: string };
      message = err.detail ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  org_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const auth = {
  register: (data: RegisterPayload) =>
    request<{ id: string; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: LoginPayload) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Documents ────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  file_size?: number;
}

export interface UploadResponse {
  document_id: string;
  job_id: string;
}

export const documents = {
  list: (token: string) => request<Document[]>("/documents", { token }),
  get: (token: string, id: string) => request<Document>(`/documents/${id}`, { token }),
  upload: (token: string, formData: FormData) =>
    request<UploadResponse>("/documents/upload", {
      method: "POST",
      body: formData,
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE", token }),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  document_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  current_stage?: string;
  progress?: number;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface Chunk {
  id: string;
  chunk_index: number;
  status: string;
  source_text?: string;
}

export const jobs = {
  get: (token: string, id: string) => request<Job>(`/jobs/${id}`, { token }),
  chunks: (token: string, id: string) => request<Chunk[]>(`/jobs/${id}/chunks`, { token }),
};

// ─── Translations ─────────────────────────────────────────────────────────────

export interface TranslationChunk {
  chunk_index: number;
  source_text: string;
  translated_text: string;
}

export interface SideBySideEntry {
  original_text: string;
  translated_text: string;
}

export interface SideBySideResponse {
  entries: SideBySideEntry[];
}

export interface DownloadResponse {
  url: string;
  expires_in: number;
}

export interface ValidationIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ValidationResponse {
  passed: boolean;
  issues: ValidationIssue[];
}

export const translations = {
  get: (token: string, jobId: string) =>
    request<{ chunks: TranslationChunk[] }>(`/translations/${jobId}`, { token }),
  sideBySide: (token: string, jobId: string) =>
    request<SideBySideResponse>(`/translations/${jobId}/sidebyside`, { token }),
  download: (token: string, jobId: string, format: "pdf" | "docx") =>
    request<DownloadResponse>(`/translations/${jobId}/download?format=${format}`, { token }),
  validation: (token: string, jobId: string) =>
    request<ValidationResponse>(`/translations/${jobId}/validation`, { token }),
};

// ─── Glossary ─────────────────────────────────────────────────────────────────

export interface GlossaryTerm {
  id: string;
  source_term: string;
  target_term: string;
  domain?: string;
  created_at: string;
}

export interface CreateTermPayload {
  source_term: string;
  target_term: string;
  domain?: string;
}

export interface ImportTermsPayload {
  terms: CreateTermPayload[];
}

export const glossary = {
  list: (token: string) => request<GlossaryTerm[]>("/glossary", { token }),
  create: (token: string, data: CreateTermPayload) =>
    request<GlossaryTerm>("/glossary", { method: "POST", body: JSON.stringify(data), token }),
  update: (token: string, id: string, data: Partial<CreateTermPayload>) =>
    request<GlossaryTerm>(`/glossary/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  delete: (token: string, id: string) =>
    request<void>(`/glossary/${id}`, { method: "DELETE", token }),
  import: (token: string, data: ImportTermsPayload) =>
    request<GlossaryTerm[]>("/glossary/import", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
};

// ─── Usage ────────────────────────────────────────────────────────────────────

export interface UsageSummary {
  total_jobs: number;
  completed_jobs: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface UsageJob {
  job_id: string;
  total_tokens: number;
  llm_provider: string;
}

export const usage = {
  summary: (token: string) => request<UsageSummary>("/usage", { token }),
  jobs: (token: string) => request<{ jobs: UsageJob[] }>("/usage/jobs", { token }),
};
