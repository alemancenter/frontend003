import { api, buildQuery } from "../client";
import { countryQuery } from "@/lib/country";

function withCountry(params: Record<string, unknown> = {}) {
  return params.country ? { ...params, ...countryQuery(String(params.country)) } : params;
}

// ===== General settings =====
export const adminSettingsApi = {
  getAll: (params: { country?: string } = {}) =>
    api.get<Record<string, string>>(`/dashboard/settings${buildQuery(withCountry(params))}`),
  update: (input: Record<string, string>, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/settings${buildQuery(withCountry(params))}`, input),
  updateRobots: (content: string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/settings/robots${buildQuery(withCountry(params))}`, { content }),
  testSmtp: (cfg: Record<string, string>) =>
    api.post<{ success: boolean; message?: string; error?: string }>(
      "/dashboard/settings/smtp/test",
      cfg
    ),
  sendTestEmail: (to: string, cfg: Record<string, string>) =>
    api.post<{ message: string }>("/dashboard/settings/smtp/send-test", {
      to,
      ...cfg,
    }),
  uploadFile: (key: string, file: File, params: { country?: string } = {}) => {
    const formData = new FormData();
    formData.append(key, file);
    return api.post<Record<string, string>>(
      `/dashboard/settings${buildQuery(withCountry(params))}`,
      formData,
      { isForm: true } as any
    );
  },
};

// ===== Sitemap =====
export const adminSitemapApi = {
  status: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/sitemap/status${buildQuery(withCountry({ ...params, database: params.country }))}`),
  generateAll: (params: { country?: string } = {}) =>
    api.post<{ message: string }>(
      `/dashboard/sitemap/generate${buildQuery(withCountry(params))}`,
      { database: params.country || "jo" },
    ),
  delete: (type: string, database: string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(
      `/dashboard/sitemap/delete/${type}/${database}${buildQuery(withCountry(params))}`,
    ),
};

// ===== Email bounce =====
export const adminEmailBounceApi = {
  listEvents: (params: Record<string, unknown> = {}) =>
    api.get<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }>(
      `/dashboard/settings/email-bounce/events${buildQuery(params)}`
    ),
  stats: () =>
    api.get<{
      user_statuses: { status: string; count: number }[];
      events_by_type: { bounce_type: string; count: number }[];
      total_events: number;
    }>("/dashboard/settings/email-bounce/stats"),
  markStatus: (emails: string[], bounceType: "hard_bounce" | "soft_bounce") =>
    api.post<{ message: string; updated: number }>(
      "/dashboard/settings/email-bounce/mark",
      { emails, bounce_type: bounceType }
    ),
  resetStatus: (emails: string[]) =>
    api.post<{ message: string; updated: number }>(
      "/dashboard/settings/email-bounce/reset",
      { emails }
    ),
  processNow: () =>
    api.post<{ message: string }>("/dashboard/settings/email-bounce/process-now"),
};

// ===== Email verification =====
export const adminEmailVerificationApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<{
      data: Record<string, unknown>[];
      pagination: { total: number; last_page: number; current_page: number };
    }>(`/dashboard/settings/email-verification/users${buildQuery(params)}`),
  stats: () =>
    api.get<{
      unverified: number;
      pending: number;
      reminder_1: number;
      reminder_2: number;
      reminder_3: number;
      exhausted: number;
      invalid: number;
      bounced: number;
      send_failed: number;
      ready_for_reminder: number;
    }>("/dashboard/settings/email-verification/stats"),
  sendReminders: (opts: { user_ids?: number[]; limit?: number; force?: boolean } = {}) =>
    api.post<{ message: string; sent?: number }>(
      "/dashboard/settings/email-verification/send-reminders",
      opts
    ),
  markInvalid: (ids: number[], reason = "Marked invalid by dashboard") =>
    api.post<{ message: string }>(
      "/dashboard/settings/email-verification/mark-invalid",
      { ids, reason }
    ),
  clearStatus: (ids: number[]) =>
    api.post<{ message: string }>(
      "/dashboard/settings/email-verification/clear-status",
      { ids }
    ),
  deleteFiltered: (filters: Record<string, unknown> = {}) =>
    api.post<{ message: string; deleted: number }>(
      "/dashboard/settings/email-verification/delete-filtered",
      filters
    ),
  deleteUsers: (ids: number[]) =>
    api.post<{ message: string }>(
      "/dashboard/settings/email-verification/delete-users",
      { ids }
    ),
};
