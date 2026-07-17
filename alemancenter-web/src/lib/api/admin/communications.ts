import { api, buildQuery } from "../client";
import { countryQuery } from "@/lib/country";
import type {
  AppNotification,
  CalendarEvent,
  ContactMessage,
  InternalMessage,
  LatestNotifications,
} from "../types";

function withCountry(params: Record<string, unknown> = {}) {
  return params.country ? { ...params, ...countryQuery(String(params.country)) } : params;
}

// ===== Calendar =====
// Mirrors services.EventInput in the Go backend: a single `event_date`
// (YYYY-MM-DD), not a start/end range.
export interface CalendarEventInput {
  title: string;
  description?: string;
  event_date: string;
}

export const adminCalendarApi = {
  databases: () => api.get<string[]>("/dashboard/calendar/databases"),
  // start/end are optional YYYY-MM-DD bounds the backend filters on.
  getEvents: (params: { country?: string; start?: string; end?: string } = {}) =>
    api.get<CalendarEvent[]>(`/dashboard/calendar/events${buildQuery(withCountry(params))}`),
  createEvent: (input: CalendarEventInput, params: { country?: string } = {}) =>
    api.post<CalendarEvent>(`/dashboard/calendar/events${buildQuery(withCountry(params))}`, input),
  updateEvent: (id: number | string, input: Partial<CalendarEventInput>, params: { country?: string } = {}) =>
    api.put<CalendarEvent>(`/dashboard/calendar/events/${id}${buildQuery(withCountry(params))}`, input),
  deleteEvent: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/calendar/events/${id}${buildQuery(withCountry(params))}`),
};

// ===== Internal messages =====
export const adminMessagesApi = {
  inbox: (params: { country?: string } = {}) =>
    api.get<InternalMessage[]>(`/dashboard/messages/inbox${buildQuery(withCountry(params))}`),
  sent: (params: { country?: string } = {}) =>
    api.get<InternalMessage[]>(`/dashboard/messages/sent${buildQuery(withCountry(params))}`),
  drafts: (params: { country?: string } = {}) =>
    api.get<InternalMessage[]>(`/dashboard/messages/drafts${buildQuery(withCountry(params))}`),
  send: (input: { recipient_id: number; subject: string; body: string }, params: { country?: string } = {}) =>
    api.post<InternalMessage>(`/dashboard/messages/send${buildQuery(withCountry(params))}`, input),
  saveDraft: (input: { recipient_id?: number; subject?: string; body?: string }, params: { country?: string } = {}) =>
    api.post<InternalMessage>(`/dashboard/messages/save-draft${buildQuery(withCountry(params))}`, input),
  get: (id: number | string, params: { country?: string } = {}) =>
    api.get<InternalMessage>(`/dashboard/messages/${id}${buildQuery(withCountry(params))}`),
  markAsRead: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/messages/${id}/read${buildQuery(withCountry(params))}`),
  toggleImportant: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/messages/${id}/important${buildQuery(withCountry(params))}`),
  delete: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/messages/${id}${buildQuery(withCountry(params))}`),
};

// ===== Contact messages (from the public contact form) =====
export const adminContactMessagesApi = {
  list: (params: { country?: string; page?: number; per_page?: number } = {}) =>
    api.get<ContactMessage[]>(`/dashboard/contact-messages${buildQuery(withCountry(params))}`),
  get: (id: number | string, params: { country?: string } = {}) =>
    api.get<ContactMessage>(`/dashboard/contact-messages/${id}${buildQuery(withCountry(params))}`),
  markAsRead: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/contact-messages/${id}/read${buildQuery(withCountry(params))}`),
  delete: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/contact-messages/${id}${buildQuery(withCountry(params))}`),
};

// ===== Notifications =====
// Mirrors the Go handler payloads. Title/message are stored inside data; the
// backend expects `type`, `title`, `message`, optional `action_url`, and either
// `target_user_id` (Create) or `role` (Broadcast).
export interface NotificationCreateInput {
  type?: string;
  title: string;
  message: string;
  action_url?: string;
  target_user_id?: number;
}

export interface NotificationBroadcastInput {
  type?: string;
  title: string;
  message: string;
  action_url?: string;
  /** Empty = all active users; otherwise a role name. */
  role?: string;
}

const DEFAULT_NOTIF_TYPE = "admin";

export const adminNotificationsApi = {
  latest: () => api.get<LatestNotifications>("/dashboard/notifications/latest"),
  list: (params: { unread?: 0 | 1; page?: number; per_page?: number } = {}) =>
    api.get<AppNotification[]>(`/dashboard/notifications${buildQuery(params as Record<string, unknown>)}`),
  create: (input: NotificationCreateInput) =>
    api.post<AppNotification>("/dashboard/notifications", { type: DEFAULT_NOTIF_TYPE, ...input }),
  broadcast: (input: NotificationBroadcastInput) =>
    api.post<{ message: string }>("/dashboard/notifications/broadcast", { type: DEFAULT_NOTIF_TYPE, ...input }),
  markAsRead: (id: string) => api.post<{ message: string }>(`/dashboard/notifications/${id}/read`),
  markAllRead: () => api.post<{ message: string }>("/dashboard/notifications/read-all"),
  bulkAction: (input: { ids: string[]; action: string }) =>
    api.post<{ message: string }>("/dashboard/notifications/bulk", input),
  delete: (id: string) => api.delete<{ message: string }>(`/dashboard/notifications/${id}`),
};
