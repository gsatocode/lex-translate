const SERVER_API_BASE = process.env.API_BASE ?? "http://localhost:8000/api/v1";
const CLIENT_API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

const API_BASE = typeof window === "undefined" ? SERVER_API_BASE : CLIENT_API_BASE;

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
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(init.body instanceof FormData) && init.body !== undefined) {
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
      // Ignore parse failure and fall back to the status code.
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

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
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: LoginPayload) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: "queued" | "processing" | "completed" | "failed" | "pending";
  source_lang: string | null;
  created_at: string;
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

export interface Job {
  id: string;
  document_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "pending";
  current_stage: string | null;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface JobChunk {
  id: string;
  chunk_index: number;
  original_text: string;
  translated_text: string;
  source_lang: string | null;
  tokens_used: number | null;
  llm_provider: string | null;
  created_at: string;
}

export const jobs = {
  get: (token: string, id: string) => request<Job>(`/jobs/${id}`, { token }),
  chunks: (token: string, id: string) => request<JobChunk[]>(`/jobs/${id}/chunks`, { token }),
};

export interface TranslationChunk {
  chunk_index: number;
  original_text: string;
  translated_text: string;
  source_lang: string | null;
  tokens_used: number | null;
  llm_provider: string | null;
}

export interface TranslationResponse {
  job_id: string;
  status: Job["status"];
  chunks: TranslationChunk[];
}

export interface SideBySideEntry {
  chunk_index: number;
  original_text: string;
  translated_text: string;
}

export interface SideBySideResponse {
  job_id: string;
  entries: SideBySideEntry[];
}

export interface DownloadResponse {
  job_id: string;
  url: string;
  expires_in: number;
}

export interface ValidationIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | string | null;
  chunk_index: number | null;
}

export interface ValidationResponse {
  job_id: string;
  passed: boolean;
  issues: ValidationIssue[];
  created_at: string;
}

export const translations = {
  get: (token: string, jobId: string) =>
    request<TranslationResponse>(`/translations/${jobId}`, { token }),
  sideBySide: (token: string, jobId: string) =>
    request<SideBySideResponse>(`/translations/${jobId}/sidebyside`, { token }),
  download: (token: string, jobId: string, format: "pdf" | "docx") =>
    request<DownloadResponse>(`/translations/${jobId}/download?format=${format}`, { token }),
  validation: (token: string, jobId: string) =>
    request<ValidationResponse>(`/translations/${jobId}/validation`, { token }),
};

export interface GlossaryTerm {
  id: string;
  source_term: string;
  target_term: string;
  domain: string;
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

export interface GlossaryImportResponse {
  imported: number;
  skipped: number;
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
    request<GlossaryImportResponse>("/glossary/import", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
};

export interface UsageSummary {
  total_jobs: number;
  completed_jobs: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface UsageJob {
  job_id: string;
  document_id: string;
  status: Job["status"];
  tokens_used: number;
  estimated_cost_usd: number;
  created_at: string;
}

export interface UsageJobResponse {
  jobs: UsageJob[];
}

export const usage = {
  summary: (token: string) => request<UsageSummary>("/usage", { token }),
  jobs: (token: string) => request<UsageJobResponse>("/usage/jobs", { token }),
};
