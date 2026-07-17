import { api, buildQuery, getAccessToken, ApiError, API_BASE } from "./client";
import type { AdminPaginatedResponse } from "./admin/content";
import type {
  SubscriptionOrder,
  SubscriptionPlan,
  TeacherAIGeneration,
  TeacherAuditLog,
  TeacherDevice,
  TeacherLibraryItem,
  TeacherPremiumFile,
  TeacherSubscription,
} from "./types";

// The payment-settings endpoint returns the methods array directly (not wrapped
// in a `methods` object). Fields mirror the backend payment-method model.
export interface PaymentMethod {
  id: number;
  provider: string;
  display_name: string;
  instructions?: string;
  is_active?: boolean;
  sort_order?: number;
}

export type PaymentSettings = PaymentMethod[];

// The `me` endpoint returns a composite snapshot, NOT the subscription itself.
// The actual subscription (with status/dates/price) lives under `.subscription`.
export interface TeacherMeResult {
  plan?: SubscriptionPlan | null;
  subscription?: TeacherSubscription | null;
  profile?: Record<string, unknown> | null;
  subjects?: string[];
  orders?: SubscriptionOrder[];
  devices?: TeacherDevice[];
  usage?: Record<string, number>;
  has_active?: boolean;
  can_create_order?: boolean;
  plan_design?: Record<string, unknown> | null;
  access?: Record<string, unknown> | null;
}

// A row in the admin teachers directory. Comes from the `teacher_profiles` table
// with the related user preloaded — name/email live on `user`, not at the top level.
export interface TeacherDirectoryItem {
  id: number;
  user_id: number;
  subject?: string;
  subjects?: string; // JSON array string, e.g. '["رياضيات","علوم"]'
  school?: string;
  phone?: string;
  city?: string;
  created_at?: string;
  user?: { id: number; name?: string; email?: string; phone?: string } | null;
}

// Teacher access/entitlement snapshot. The backend key is `has_active`; we also
// expose `has_access` (normalized in `access()`) since existing consumers read it.
export interface TeacherAccessResult {
  has_active?: boolean;
  has_access?: boolean;
  permissions?: string[];
  allowed?: Record<string, boolean>;
  limits?: Record<string, number>;
  usage?: Record<string, number>;
  subscription?: TeacherSubscription;
}

export const teacherSubscriptionApi = {
  plan: () => api.get<SubscriptionPlan>("/teacher-subscription/plan", { skipAuth: true }),
  design: () => api.get<Record<string, unknown>>("/teacher-subscription/design", { skipAuth: true }),
  paymentSettings: () =>
    api.get<PaymentSettings>("/teacher-subscription/payment-settings", { skipAuth: true }),

  me: () => api.get<TeacherMeResult>("/teacher-subscription/me"),
  // The backend returns `has_active`; the frontend historically read `has_access`.
  // Normalize here so every consumer gets a reliable `has_access` flag regardless
  // of which key the API uses.
  access: async () => {
    const raw = await api.get<TeacherAccessResult>("/teacher-subscription/access");
    const hasAccess = Boolean(raw?.has_active ?? raw?.has_access);
    return { ...raw, has_active: hasAccess, has_access: hasAccess } as TeacherAccessResult;
  },
  workspace: () => api.get<Record<string, unknown>>("/teacher-subscription/workspace"),

  premiumFiles: (params: { category?: string; subject_id?: number; query?: string } = {}) =>
    api.get<TeacherPremiumFile[]>(`/teacher-subscription/files${buildQuery(params)}`),
  downloadPremiumFile: (id: number | string) =>
    `/teacher-subscription/premium-files/${id}/download`,

  library: () => api.get<TeacherLibraryItem[]>("/teacher-subscription/library"),
  saveLibraryItem: (input: { item_type: string; item_id?: number; title: string; source_type?: string; category?: string }) =>
    api.post<TeacherLibraryItem>("/teacher-subscription/library", input),

  downloads: () => api.get<Record<string, unknown>[]>("/teacher-subscription/downloads"),

  aiGenerations: () => api.get<TeacherAIGeneration[]>("/teacher-subscription/ai-generations"),
  generateAI: (input: { tool_type: string; prompt: string; title?: string }) =>
    api.post<TeacherAIGeneration>("/teacher-subscription/ai/generate", input),
  exportAI: (id: number | string) => `/teacher-subscription/ai-generations/${id}/export`,

  notifications: () => api.get<Record<string, unknown>[]>("/teacher-subscription/notifications"),

  createOrder: (input: {
    plan_id: number;
    payment_method: string;
    payer_name: string;
    phone: string;
    subjects?: string[];
    school?: string;
    city?: string;
    payment_reference?: string;
  }) => api.post<SubscriptionOrder>("/teacher-subscription/orders", input),
  createOrderWithProof: (formData: FormData) =>
    api.post<SubscriptionOrder>("/teacher-subscription/orders/with-proof", formData, { isForm: true }),

  myDevices: () => api.get<TeacherDevice[]>("/teacher-subscription/devices"),
  deactivateMyDevice: (id: number | string) =>
    api.delete<{ message: string }>(`/teacher-subscription/devices/${id}`),
};

// Admin (dashboard) endpoints for teacher subscriptions
export const teacherSubscriptionAdminApi = {
  dashboard: () => api.get<Record<string, unknown>>("/dashboard/teacher-subscriptions/dashboard"),
  financeReport: () => api.get<Record<string, unknown>>("/dashboard/teacher-subscriptions/reports/finance"),
  usageAnalytics: () => api.get<Record<string, unknown>>("/dashboard/teacher-subscriptions/reports/analytics"),
  runExpiryMaintenance: () =>
    api.post<{ expired: number; notices: number }>("/dashboard/teacher-subscriptions/maintenance/expire"),
  auditLogs: (params: { page?: number; per_page?: number; action?: string; entity_type?: string } = {}) =>
    api.get<TeacherAuditLog[]>(`/dashboard/teacher-subscriptions/audit-logs${buildQuery(params)}`),
  auditLogsWithMeta: (params: { page?: number; per_page?: number; action?: string; entity_type?: string } = {}) =>
    api.get<AdminPaginatedResponse<TeacherAuditLog>>(
      `/dashboard/teacher-subscriptions/audit-logs${buildQuery(params)}`,
      { raw: true },
    ),

  listPremiumFiles: (params: Record<string, unknown> = {}) =>
    api.get<TeacherPremiumFile[]>(`/dashboard/teacher-subscriptions/premium-files${buildQuery(params)}`),
  premiumFileDetail: (id: number | string) =>
    api.get<TeacherPremiumFile>(`/dashboard/teacher-subscriptions/premium-files/${id}/detail`),
  archivePremiumFile: (id: number | string, reason?: string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/premium-files/${id}/archive`, { reason }),
  uploadPremiumFile: (formData: FormData) =>
    api.post<TeacherPremiumFile>("/dashboard/teacher-subscriptions/premium-files/upload", formData, {
      isForm: true,
    }),
  updatePremiumFile: (id: number | string, input: Partial<TeacherPremiumFile>) =>
    api.post<TeacherPremiumFile>(`/dashboard/teacher-subscriptions/premium-files/${id}`, input),
  disablePremiumFile: (id: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/premium-files/${id}/disable`),

  listSubscriptions: (params: Record<string, unknown> = {}) =>
    api.get<TeacherSubscription[]>(`/dashboard/teacher-subscriptions/subscriptions${buildQuery(params)}`),
  cancelSubscription: (id: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/subscriptions/${id}/cancel`),
  renewSubscription: (id: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/subscriptions/${id}/renew`),
  reactivateSubscription: (id: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/subscriptions/${id}/reactivate`),
  updateSubscriptionDates: (
    id: number | string,
    input: { starts_at?: string; ends_at?: string; admin_note?: string },
  ) =>
    api.post<TeacherSubscription>(
      `/dashboard/teacher-subscriptions/subscriptions/${id}/dates`,
      input,
    ),

  listTeachers: (params: Record<string, unknown> = {}) =>
    api.get<TeacherDirectoryItem[]>(`/dashboard/teacher-subscriptions/teachers${buildQuery(params)}`),
  teacherDetail: (userId: number | string) =>
    api.get<Record<string, unknown>>(`/dashboard/teacher-subscriptions/teachers/${userId}/detail`),
  removeTeacherMembership: (userId: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/teachers/${userId}/remove-membership`),

  listDevices: (params: Record<string, unknown> = {}) =>
    api.get<TeacherDevice[]>(`/dashboard/teacher-subscriptions/devices${buildQuery(params)}`),
  deactivateDevice: (id: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/devices/${id}/deactivate`),
  deactivateTeacherDevice: (id: number | string, input: { user_id?: number; note?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/devices/${id}/deactivate`, input),

  listDownloads: (params: Record<string, unknown> = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/teacher-subscriptions/downloads${buildQuery(params)}`),
  listAIGenerations: (params: Record<string, unknown> = {}) =>
    api.get<TeacherAIGeneration[]>(`/dashboard/teacher-subscriptions/ai-generations${buildQuery(params)}`),

  listOrders: (params: Record<string, unknown> = {}) =>
    api.get<SubscriptionOrder[]>(`/dashboard/teacher-subscriptions/orders${buildQuery(params)}`),
  orderDetail: (id: number | string) =>
    api.get<Record<string, unknown>>(`/dashboard/teacher-subscriptions/orders/${id}`),
  // The proof endpoint streams a private file and requires the Bearer token
  // (kept in memory), so it can't be opened via a plain <a href>. Fetch it as a
  // blob with the auth header, then the caller opens an object URL.
  downloadOrderProof: async (id: number | string): Promise<Blob> => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}/dashboard/teacher-subscriptions/orders/${id}/proof`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new ApiError(res.status, res.status === 404 ? "لا يوجد إثبات دفع لهذا الطلب" : "تعذر فتح إثبات الدفع");
    }
    return res.blob();
  },
  approveOrder: (id: number | string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/orders/${id}/approve`),
  approveOrderWithNote: (id: number | string, admin_note = "") =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/orders/${id}/approve`, { admin_note }),
  rejectOrder: (id: number | string, reason?: string) =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/orders/${id}/reject`, { reason }),
  rejectOrderWithNote: (id: number | string, admin_note = "") =>
    api.post<{ message: string }>(`/dashboard/teacher-subscriptions/orders/${id}/reject`, { admin_note }),
};
