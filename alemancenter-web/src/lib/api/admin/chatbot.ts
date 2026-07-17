import { api, buildQuery } from "../client";
import type { AdminPaginatedResponse } from "./content";

// Mirrors models.ChatMessage in the Go backend.
export interface ChatMessage {
  id: number;
  session_id: number;
  role: string;
  message: string;
  intent?: string;
  confidence?: number;
  source_type?: string;
  ip_address?: string;
  created_at: string;
}

// Mirrors models.ChatSession (Messages preloaded on list, full on detail).
export interface ChatSession {
  id: number;
  user_id?: number | null;
  guest_id?: string;
  country_code?: string;
  status?: string;
  last_intent?: string;
  current_intent?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  messages?: ChatMessage[];
}

// Mirrors models.ChatKnowledgeBase.
export interface ChatKnowledge {
  id: number;
  title: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string;
  country_code?: string;
  is_active?: boolean;
  priority?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChatKnowledgeInput {
  title: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string;
  country_code?: string;
  is_active?: boolean;
  priority?: number;
}

export const adminChatbotApi = {
  sessions: (params: { limit?: number; country?: string } = {}) =>
    api.get<ChatSession[]>(`/dashboard/chatbot/sessions${buildQuery(params)}`),
  // Paginated variant (page/per_page) with total meta for the dashboard table.
  sessionsWithMeta: (params: { page?: number; per_page?: number; country?: string } = {}) =>
    api.get<AdminPaginatedResponse<ChatSession>>(
      `/dashboard/chatbot/sessions${buildQuery(params)}`,
      { raw: true },
    ),
  session: (id: number | string, params: { country?: string } = {}) =>
    api.get<ChatSession>(`/dashboard/chatbot/sessions/${id}${buildQuery(params)}`),
  bulkDeleteSessions: (ids: number[], params: { country?: string } = {}) =>
    api.post<{ deleted: number }>(
      `/dashboard/chatbot/sessions/bulk-delete${buildQuery(params)}`,
      { ids },
    ),
  // One request returns all selected conversations, training-shaped, so large
  // exports don't fan out into hundreds of per-session requests.
  exportSessions: (ids: number[], params: { country?: string } = {}) =>
    api.post<{ conversations: { session_id: number; messages: { role: string; content: string }[] }[] }>(
      `/dashboard/chatbot/sessions/export${buildQuery(params)}`,
      { ids },
    ),
  knowledge: (params: { limit?: number; country?: string } = {}) =>
    api.get<ChatKnowledge[]>(`/dashboard/chatbot/knowledge${buildQuery(params)}`),
  createKnowledge: (input: ChatKnowledgeInput) =>
    api.post<ChatKnowledge>("/dashboard/chatbot/knowledge", input),
  updateKnowledge: (id: number | string, input: Partial<ChatKnowledgeInput>) =>
    api.put<ChatKnowledge>(`/dashboard/chatbot/knowledge/${id}`, input),
  deleteKnowledge: (id: number | string) =>
    api.delete<{ message: string }>(`/dashboard/chatbot/knowledge/${id}`),
};
