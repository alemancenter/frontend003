import { api, buildQuery } from "../client";
import { countryQuery } from "@/lib/country";

function withCountry(params: Record<string, unknown> = {}) {
  return params.country ? { ...params, ...countryQuery(String(params.country)) } : params;
}

// ─── Backend response shapes (mirror internal/handlers/contentaudit) ─────────

export interface AuditRun {
  id: number;
  status: string;
  triggered_by?: string;
  started_at?: string | null;
  finished_at?: string | null;
  findings_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface AdsenseItem {
  id: number;
  type: string;
  title: string;
  status: string;
  score: number;
  level: string;
  word_count?: number;
  char_count?: number;
  files_count?: number;
  should_index?: boolean;
  should_show_ads?: boolean;
  issues?: string[];
  url?: string;
}

export interface AdsenseSummary {
  total: number;
  ready: number;
  review: number;
  weak: number;
  no_index: number;
  ads_eligible: number;
}

export interface AdsenseReadiness {
  items: AdsenseItem[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number; filtered_total: number };
  summary?: AdsenseSummary;
}

export interface QualityBatch {
  id: string;
  status: string;
  mode?: string;
  model_strategy?: string;
  country_code?: string;
  content_type?: string;
  level?: string;
  source?: string;
  total_items?: number;
  processed_items?: number;
  successful_items?: number;
  failed_items?: number;
  pending_items?: number;
  progress?: number;
  cancel_requested?: boolean;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface ReviewQueueItem {
  id: number;
  decision_id: number;
  content_type: string;
  content_id: string;
  original_title: string;
  fixed_title: string;
  fix_summary?: string;
  status: string;
  score?: number;
  decision?: string;
  adsense_risk?: string;
  model?: string;
  created_at: string;
}

export interface ModelCostSummary {
  summary: {
    total_runs: number;
    success_runs: number;
    failed_runs: number;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
    avg_duration_ms: number;
  };
  models: {
    model: string;
    task_type?: string;
    model_strategy?: string;
    runs: number;
    failed_runs?: number;
    estimated_cost_usd: number;
  }[] | null;
}

export interface AdsenseReadinessParams {
  country?: string;
  page?: number;
  per_page?: number;
  level?: string;
  type?: string;
  q?: string;
}

// ===== Content audit (SEO/quality runs, AI review, AdSense readiness) =====
export const adminContentAuditApi = {
  runStart: (params: { country?: string } = {}) =>
    api.post<Record<string, unknown>>(`/dashboard/content-audit/run${buildQuery(withCountry(params))}`),
  listRuns: (params: { country?: string } = {}) =>
    api.get<AuditRun[]>(`/dashboard/content-audit/runs${buildQuery(withCountry(params))}`),
  showRun: (id: number | string, params: { country?: string } = {}) =>
    api.get<AuditRun>(`/dashboard/content-audit/runs/${id}${buildQuery(withCountry(params))}`),
  listFindings: (id: number | string, params: { country?: string } = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/content-audit/runs/${id}/findings${buildQuery(withCountry(params))}`),
  exportRunCsvUrl: (id: number | string, params: { country?: string } = {}) => `/api/dashboard/content-audit/runs/${id}/export${buildQuery(withCountry(params))}`,
  adsenseReadiness: (params: AdsenseReadinessParams = {}) =>
    api.get<AdsenseReadiness>(`/dashboard/content-audit/adsense-readiness${buildQuery(withCountry(params as Record<string, unknown>))}`),
  listQualityBatches: (params: { country?: string } = {}) =>
    api.get<QualityBatch[]>(`/dashboard/content-audit/ai/batch-jobs${buildQuery(withCountry(params))}`),
  showQualityBatch: (id: number | string, params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/content-audit/ai/batch-jobs/${id}${buildQuery(withCountry(params))}`),
  startQualityBatch: (input: Record<string, unknown>, params: { country?: string } = {}) => {
    const body = params.country ? { ...input, country_code: params.country, ...countryQuery(params.country) } : input;
    return api.post<Record<string, unknown>>(`/dashboard/content-audit/ai/batch-jobs${buildQuery(withCountry(params))}`, body);
  },
  cancelQualityBatch: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/content-audit/ai/batch-jobs/${id}/cancel${buildQuery(withCountry(params))}`),
  reviewQueue: (params: { country?: string } = {}) =>
    api.get<ReviewQueueItem[]>(`/dashboard/content-audit/ai/review-queue${buildQuery(withCountry(params))}`),
  modelCostSummary: (params: { country?: string } = {}) =>
    api.get<ModelCostSummary>(`/dashboard/content-audit/ai/model-costs${buildQuery(withCountry(params))}`),
  analyzeWithAI: (input: Record<string, unknown>) =>
    api.post<Record<string, unknown>>("/dashboard/content-audit/ai/analyze", input),
  showAIDecision: (id: number | string) =>
    api.get<Record<string, unknown>>(`/dashboard/content-audit/ai/decisions/${id}`),
  latestAIDecision: (type: string, contentId: number | string) =>
    api.get<Record<string, unknown>>(`/dashboard/content-audit/ai/decision/${type}/${contentId}`),
  createFixPreview: (input: Record<string, unknown>) =>
    api.post<Record<string, unknown>>("/dashboard/content-audit/ai/fix-preview", input),
  showFixPreview: (id: number | string) =>
    api.get<Record<string, unknown>>(`/dashboard/content-audit/ai/fix-preview/${id}`),
  // Backend expects `fix_preview_id` (not `preview_id`).
  applyFix: (input: { fix_preview_id: number | string; note?: string }) =>
    api.post<{ message: string }>("/dashboard/content-audit/ai/apply-fix", input),
  rejectFix: (input: { fix_preview_id: number | string; note?: string }) =>
    api.post<{ message: string }>("/dashboard/content-audit/ai/reject-fix", input),
};
