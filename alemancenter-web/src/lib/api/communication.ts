import { api, buildQuery } from "./client";
import type { CalendarEvent } from "./types";

export const communicationApi = {
  publicEvents: (params: { start?: string; end?: string; limit?: number } = {}) =>
    api.get<CalendarEvent[]>(`/home/calendar${buildQuery(params)}`, { skipAuth: true }),

  publicEventDetail: (id: number | string) =>
    api.get<CalendarEvent>(`/home/event/${id}`, { skipAuth: true }),

  chatbotSuggestions: () => api.get<string[]>("/chatbot/suggestions", { skipAuth: true }),

  // Backend session_id is a numeric (uint) field — must be sent as a number,
  // not a string, or BodyParser rejects the request with 400.
  chatbotMessage: (input: { message: string; session_id?: number }) =>
    api.post<ChatbotReply>("/chatbot/message", input, { skipAuth: true }),

  chatbotFeedback: (input: { message_id: number; rating: string; comment?: string }) =>
    api.post<{ message: string }>("/chatbot/feedback", input, { skipAuth: true }),
};

// A content match the assistant found (file / article / post) to show as a link.
export interface ChatbotLink {
  id: number;
  title: string;
  type: string; // "file" | "article" | "post"
  url: string;
  description?: string;
  grade?: string;
  subject?: string;
  semester?: string;
}

// The chatbot reply shape returned by the backend (field is `answer`, not `reply`).
export interface ChatbotReply {
  answer: string;
  session_id: number | string;
  message_id: number;
  intent?: string;
  step?: string;
  links?: ChatbotLink[];
  suggestions?: string[];
}
