import { api } from "../client";

// ===== AI content generation =====
export interface AIGenerateRequest {
  title: string;
  content_type?: "article" | "post";
  country_code?: string;
  grade_level?: string;
  subject_id?: string | number;
  semester_id?: string | number;
  category_id?: string | number;
}

export interface AIJobStatus {
  success: boolean;
  job_id: string;
  status: "pending" | "done" | "failed";
  content?: string;
  content_html?: string;
  error?: string;
}

export const adminAiApi = {
  generate: (input: AIGenerateRequest) =>
    api.post<{ job_id: string; status: string }>("/dashboard/ai/generate", input),
  status: (jobId: string) =>
    api.get<AIJobStatus>(`/dashboard/ai/status/${jobId}`),
};
